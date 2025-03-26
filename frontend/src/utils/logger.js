// 全局日誌控制和API管理
import axios from 'axios'; // 導入 axios 庫

const loggedMessages = new Set();

// 定義標準日誌格式
export const LOG_TYPES = {
  API_SUCCESS: "✅ 成功連接 API",
  LOGIN_SUCCESS: "✅ 用戶登入成功",
  FEAR_GREED_SUCCESS: "✅ 成功獲取最新恐懼貪婪指數",
  ALTCOIN_SUCCESS: "✅ 成功獲取最新山寨幣指數",
  NEWS_SUCCESS: "✅ 成功獲取新聞數據",
  NOTES_SYNC_SUCCESS: "✅ 成功同步筆記",
  
  API_ERROR: "❌ API 連接失敗",
  LOGIN_ERROR: "❌ 登入失敗",
  FEAR_GREED_ERROR: "❌ 無法獲取恐懼貪婪指數資料",
  ALTCOIN_ERROR: "❌ 無法獲取山寨幣月份指數資料",
  NEWS_ERROR: "❌ 無法獲取新聞數據",
  NOTES_SYNC_ERROR: "❌ 筆記同步失敗"
};

// API 端點配置與管理
export const API_CONFIG = {
  LOCAL: 'http://localhost:3000',
  PROD: 'https://crypto-memo-production.up.railway.app',
  isUsingProd: true, // 將默認值設為 true，使用生產環境
  preferLocal: false, // 修改為默認不優先使用本地
  
  // 獲取當前環境名稱
  getCurrentEnv() {
    return this.isUsingProd ? 'PROD' : 'LOCAL';
  },
  
  // 獲取當前API基礎URL
  getBaseUrl() {
    return this.isUsingProd ? this.PROD : this.LOCAL;
  },
  
  // 切換到本地環境
  switchToLocal() {
    this.isUsingProd = false;
    console.log(`已切換到本地環境 (${this.LOCAL})`);
    return this.LOCAL;
  },
  
  // 切換到生產環境
  switchToProd() {
    this.isUsingProd = true;
    console.log(`已切換到生產環境 (${this.PROD})`);
    return this.PROD;
  },
  
  // 切換環境
  toggleEnv() {
    return this.isUsingProd ? this.switchToLocal() : this.switchToProd();
  },
  
  // 設置是否優先使用本地環境
  setPreferLocal(value) {
    this.preferLocal = value === true;
    console.log(`已${this.preferLocal ? '啟用' : '禁用'}優先使用本地環境`);
    return this.preferLocal;
  },
  
  // 切換優先使用本地設置
  togglePreferLocal() {
    return this.setPreferLocal(!this.preferLocal);
  }
};

// 創建一個專門用於獲取新聞的函數
export async function fetchNewsData() {
  console.log('嘗試獲取新聞數據...');
  
  // 定義要嘗試的 API URL
  const apiUrls = [
    API_CONFIG.getBaseUrl(), // 先使用當前設置的環境
    API_CONFIG.PROD,         // 然後嘗試生產環境
    API_CONFIG.LOCAL         // 最後嘗試本地環境
  ];
  
  // 去重複
  const uniqueUrls = [...new Set(apiUrls)];
  
  for (const baseUrl of uniqueUrls) {
    try {
      console.log(`嘗試從 ${baseUrl}/api/news 獲取新聞...`);
      
      // 使用純 fetch，不加任何額外標頭，避免 CORS 問題
      const response = await fetch(`${baseUrl}/api/news`, {
        method: 'GET',
        // 不添加任何自定義標頭
        credentials: 'omit' // 不發送 cookie，避免 CORS 問題
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 成功從 ${baseUrl} 獲取新聞數據`);
        
        // 成功獲取數據後，更新當前使用的環境
        if (baseUrl === API_CONFIG.PROD) {
          API_CONFIG.switchToProd();
        } else if (baseUrl === API_CONFIG.LOCAL) {
          API_CONFIG.switchToLocal();
        }
        
        return { success: true, data };
      } else {
        console.warn(`從 ${baseUrl} 獲取新聞失敗: HTTP 狀態 ${response.status}`);
      }
    } catch (error) {
      console.warn(`從 ${baseUrl} 獲取新聞失敗: ${error.message}`);
      // 如果出錯，繼續嘗試下一個 URL
    }
  }
  
  // 如果所有嘗試都失敗，返回一個空數據和錯誤訊息
  console.error('所有獲取新聞嘗試都失敗');
  return { 
    success: false, 
    data: [{
      id: 1,
      titleZh: "無法連接到新聞服務",
      contentZh: "目前無法獲取最新新聞，請稍後再試。",
      timeago: "剛才",
      timestamp: Date.now()
    }]
  };
}

// 修改標準的 callApi 函數，對 GET 請求採用更簡單的方式避免 CORS 問題
export async function callApi(options) {
  const { 
    endpoint,
    method = 'GET',
    data = null,
    timeout = 10000,
    headers = {},
    successLogType,
    errorLogType,
    tryBothEnvs = false, // 預設不嘗試兩個環境，只用當前環境
    isRetry = false,
    envOverride = null
  } = options;
  
  // 決定嘗試順序，預設只使用生產環境
  let envSequence = [API_CONFIG.PROD];
  
  // 只在特殊情況下嘗試本地環境
  if (envOverride === 'LOCAL') {
    envSequence = [API_CONFIG.LOCAL];
  } else if (tryBothEnvs) {
    envSequence = [API_CONFIG.PROD, API_CONFIG.LOCAL];
  }
  
  let lastError = null;
  
  for (const baseUrl of envSequence) {
    try {
      // 減少日誌輸出，不輸出每次請求的嘗試訊息
      
      // GET 請求：使用純淨的 fetch，不添加額外標頭
      if (method === 'GET') {
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            credentials: 'omit'
          });
          
          if (response.ok) {
            const responseData = await response.json();
            
            API_CONFIG.isUsingProd = baseUrl === API_CONFIG.PROD;
            
            if (successLogType) {
              // 輸出成功日誌，但避免輸出連接成功的訊息
              // log(successLogType, baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL');
            }
            
            return { 
              success: true, 
              data: responseData, 
              env: baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL' 
            };
          } else {
            throw new Error(`HTTP 錯誤: ${response.status}`);
          }
        } catch (fetchError) {
          // 不輸出警告訊息
          throw fetchError;
        }
      } 
      // POST 請求處理類似，減少日誌輸出
      else if (method === 'POST') {
        try {
          const fetchOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'omit',
            body: JSON.stringify(data)
          };
          
          const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
          
          if (response.ok) {
            const responseData = await response.json();
            
            API_CONFIG.isUsingProd = baseUrl === API_CONFIG.PROD;
            
            if (successLogType) {
              // 輸出成功日誌，但避免輸出連接成功的訊息
              // log(successLogType, baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL');
            }
            
            return { 
              success: true, 
              data: responseData, 
              env: baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL' 
            };
          } else {
            throw new Error(`HTTP 錯誤: ${response.status}`);
          }
        } catch (fetchPostError) {
          // 不輸出警告訊息
          throw fetchPostError;
        }
      }
    } catch (error) {
      lastError = error;
      // 不輸出連接失敗的警告訊息
      continue;
    }
  }
  
  if (errorLogType) {
    // 可以保留錯誤日誌，但格式更簡潔
    // log(errorLogType, '請求失敗');
  }
  
  return { 
    success: false, 
    error: lastError?.message || '請求失敗',
    env: API_CONFIG.getCurrentEnv()
  };
}

// 標準化日誌函數
export function log(type, ...args) {
  // 創建一個唯一的消息標識符，包含消息類型和所有參數
  const messageKey = `${type}${args.length > 0 ? ':' + args.join(' ') : ''}`;
  
  // 如果已經記錄過該消息，則不輸出
  if (loggedMessages.has(messageKey)) return;
  
  // 記錄這條消息已經輸出過
  loggedMessages.add(messageKey);
  
  // 輸出日誌
  if (type.startsWith('❌')) {
    // 只在開發環境輸出錯誤
    if (process.env.NODE_ENV === 'development') {
      console.error(messageKey);
    }
  } else {
    console.log(messageKey);
  }
}

// 清除已記錄的消息（用於需要重置的情況）
export function clearLoggedMessages() {
  loggedMessages.clear();
}

// 同步筆記到服務器
export const syncNotesToServer = async (forceSync = false, urgent = false) => {
  console.log(`執行筆記同步 (強制: ${forceSync}, 緊急: ${urgent})`);
  
  try {
    // 保存同步嘗試資訊
    const now = Date.now();
    localStorage.setItem('lastSyncAttempt', now.toString());
    
    // 從localStorage獲取筆記和用戶ID
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('無法同步筆記: 未找到用戶ID');
      return false;
    }
    
    // 獲取本地存儲的筆記
    let notesToSync = [];
    try {
      const savedMemos = localStorage.getItem('memos');
      if (savedMemos) {
        notesToSync = JSON.parse(savedMemos);
      } else {
        console.warn('無可同步的筆記：本地存儲為空');
      }
    } catch (e) {
      console.error('解析本地筆記出錯', e);
      // 設置同步失敗標記
      localStorage.setItem('syncFailed', 'true');
      localStorage.setItem('syncFailReason', 'PARSE_ERROR');
      return false;
    }
    
    // 確保每個筆記都有lastModified屬性
    notesToSync = notesToSync.map(note => {
      if (!note.lastModified) {
        return { ...note, lastModified: now };
      }
      return note;
    });
    
    // 獲取被刪除的筆記
    let deletedNotes = [];
    try {
      const deletedNotesStr = sessionStorage.getItem('deletedNotes');
      if (deletedNotesStr) {
        deletedNotes = JSON.parse(deletedNotesStr);
        console.log(`找到 ${deletedNotes.length} 個待刪除的筆記`);
      }
    } catch (e) {
      console.error('讀取刪除筆記列表失敗', e);
    }
    
    // 設置同步狀態
    localStorage.setItem('isSyncing', 'true');
    
    // 在本地保存一份同步前的備份
    try {
      sessionStorage.setItem('preSyncBackup', JSON.stringify({
        notes: notesToSync,
        deletedNotes,
        timestamp: now
      }));
    } catch (e) {
      console.warn('無法創建同步前備份', e);
    }
    
    // 發起API請求
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/notes/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        notes: notesToSync,
        deletedNotes,
        forceFullSync: forceSync,
        immediateSync: urgent,
        urgent: urgent,
        lastSyncTime: localStorage.getItem('lastSyncTime') || '0'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 筆記同步成功，筆記數: ${notesToSync.length}`);
      
      // 更新同步狀態
      localStorage.setItem('lastSyncTime', now.toString());
      localStorage.setItem('lastSuccessfulSync', now.toString());
      localStorage.removeItem('isSyncing');
      localStorage.removeItem('syncFailed');
      localStorage.removeItem('syncFailReason');
      localStorage.removeItem('needsSync');
      
      // 如果有刪除操作，清除會話存儲中的刪除記錄
      if (deletedNotes.length > 0) {
        sessionStorage.removeItem('deletedNotes');
      }
      
      // 通過獲取最新的筆記來確認同步成功
      try {
        const latestResponse = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/user/notes?userId=${userId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          if (latestData.success && Array.isArray(latestData.notes)) {
            console.log(`✓ 同步後確認: 伺服器有 ${latestData.notes.length} 條筆記`);
            
            // 這裡可以添加進一步的一致性檢查
          }
        }
      } catch (confirmError) {
        console.warn('同步後確認失敗，但同步本身成功', confirmError);
      }
      
      return true;
    } else {
      console.error('同步失敗: 伺服器返回失敗狀態', result);
      localStorage.setItem('syncFailed', 'true');
      localStorage.setItem('syncFailReason', 'SERVER_REJECTED');
      localStorage.removeItem('isSyncing');
      localStorage.setItem('needsSync', 'true');
      return false;
    }
  } catch (error) {
    console.error('同步過程中出錯', error);
    localStorage.setItem('syncFailed', 'true');
    localStorage.setItem('syncFailReason', error.message || 'UNKNOWN_ERROR');
    localStorage.removeItem('isSyncing');
    localStorage.setItem('needsSync', 'true');
    return false;
  }
};

// 修改登出函數，在登出前同步筆記
export async function logout() {
  try {
    console.log('正在登出，嘗試先同步筆記...');
    
    // 嘗試同步筆記到服務器
    await syncNotesToServer(true);
    
    // 等待一小段時間確保同步完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 清除本地儲存的用戶數據
    localStorage.removeItem('userData');
    localStorage.removeItem('userId');
    localStorage.removeItem('userNotes'); // 舊的 key
    localStorage.removeItem('memos');     // 新的 key
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    
    // 清除其他可能存在的應用程式狀態
    sessionStorage.clear();
    
    // 記錄登出動作
    console.log('✅ 用戶已成功登出，筆記已同步');
    
    // 將網址設為根路徑，回到登入頁面
    window.location.href = '/';
    
    return true;
  } catch (error) {
    console.error('❌ 登出過程中發生錯誤:', error);
    
    // 即使同步失敗，仍然嘗試登出
    localStorage.removeItem('userData');
    localStorage.removeItem('userId');
    localStorage.removeItem('userNotes');
    localStorage.removeItem('memos');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    sessionStorage.clear();
    window.location.href = '/';
    
    return false;
  }
}

// 修改 autoSyncNotes 函數，使用正確的 localStorage key
export async function autoSyncNotes() {
  // 使用正確的 key
  if (localStorage.getItem('memos')) {
    return await syncNotesToServer(false);
  }
  return false;
}

// 為了保持向後兼容性，保留舊函數但指向新函數
export const getApiEndpoint = () => API_CONFIG.getBaseUrl();
export const switchToProd = () => API_CONFIG.switchToProd();
export const conditionalLog = () => {};
export const conditionalError = () => {};

// 將API切換功能暴露到全局範圍（方便在控制台切換）
if (typeof window !== 'undefined') {
  window.API_CONFIG = API_CONFIG;
  
  // 添加便捷方法，方便在控制台使用
  window.useLocal = () => API_CONFIG.switchToLocal();
  window.useProd = () => API_CONFIG.switchToProd();
  window.toggleEnv = () => API_CONFIG.toggleEnv();
  window.preferLocal = (value) => API_CONFIG.setPreferLocal(value);
  
  // 新增簡便的切換命令
  window.to = {
    dev: () => API_CONFIG.switchToLocal(),
    prod: () => API_CONFIG.switchToProd()
  };
  
  // 添加登出和同步筆記功能到全局範圍
  window.logout = logout;
  window.syncNotes = () => syncNotesToServer(true);
  window.autoSyncNotes = autoSyncNotes;
} 