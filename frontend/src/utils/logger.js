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
  isUsingProd: false,
  preferLocal: true, // 新增優先本地選項
  
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
    tryBothEnvs = true,
    isRetry = false,
    envOverride = null
  } = options;
  
  // 決定嘗試順序
  let envSequence = [];
  
  if (envOverride === 'LOCAL') {
    envSequence = [API_CONFIG.LOCAL];
  } else if (envOverride === 'PROD') {
    envSequence = [API_CONFIG.PROD];
  } else {
    if (API_CONFIG.preferLocal) {
      envSequence = [API_CONFIG.LOCAL, API_CONFIG.PROD]; // 先本地後生產
    } else {
      envSequence = [API_CONFIG.PROD, API_CONFIG.LOCAL]; // 先生產後本地
    }
    
    if (isRetry) {
      envSequence = [envSequence[1]];
    }
    
    if (!tryBothEnvs) {
      envSequence = [API_CONFIG.getBaseUrl()];
    }
  }
  
  let lastError = null;
  
  for (const baseUrl of envSequence) {
    try {
      console.log(`正在嘗試使用 ${baseUrl} 環境發送 ${method} 請求到 ${endpoint}`);
      
      // GET 請求：使用純淨的 fetch，不添加額外標頭
      if (method === 'GET') {
        try {
          // 避免添加任何可能導致 CORS 問題的標頭
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            credentials: 'omit' // 不發送 cookie
          });
          
          if (response.ok) {
            const responseData = await response.json();
            
            API_CONFIG.isUsingProd = baseUrl === API_CONFIG.PROD;
            
            if (successLogType) {
              log(successLogType, baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL');
            }
            
            console.log(`✅ 成功連接到 ${baseUrl} 環境 (使用簡單 fetch)`);
            
            return { 
              success: true, 
              data: responseData, 
              env: baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL' 
            };
          } else {
            throw new Error(`HTTP 錯誤: ${response.status}`);
          }
        } catch (fetchError) {
          console.warn(`使用簡單 fetch 請求失敗: ${fetchError.message}`);
          // 不需要回退到 axios，繼續嘗試下一個環境
          throw fetchError;
        }
      } 
      // POST 請求：只使用必要的標頭
      else if (method === 'POST') {
        try {
          const fetchOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
              // 不添加任何其他標頭
            },
            credentials: 'omit',
            body: JSON.stringify(data)
          };
          
          const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
          
          if (response.ok) {
            const responseData = await response.json();
            
            API_CONFIG.isUsingProd = baseUrl === API_CONFIG.PROD;
            
            if (successLogType) {
              log(successLogType, baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL');
            }
            
            console.log(`✅ 成功連接到 ${baseUrl} 環境 (使用簡單 fetch POST)`);
            
            return { 
              success: true, 
              data: responseData, 
              env: baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL' 
            };
          } else {
            throw new Error(`HTTP 錯誤: ${response.status}`);
          }
        } catch (fetchPostError) {
          console.warn(`使用簡單 fetch POST 請求失敗: ${fetchPostError.message}`);
          throw fetchPostError;
        }
      }
    } catch (error) {
      lastError = error;
      console.warn(`❌ 無法連接到 ${baseUrl} 環境: ${error.message}`);
      continue;
    }
  }
  
  if (errorLogType) {
    log(errorLogType, lastError?.message || '未知錯誤');
  }
  
  return { 
    success: false, 
    error: lastError?.message || '所有 API 端點嘗試失敗',
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
export async function syncNotesToServer(forcedSync = false) {
  console.log('開始嘗試同步筆記到服務器...');
  
  try {
    // 從本地存儲獲取用戶 ID 和筆記
    const userId = localStorage.getItem('userId');
    const notesString = localStorage.getItem('memos');
    
    if (!userId) {
      console.warn('無法同步筆記：找不到用戶ID');
      return false;
    }
    
    if (!notesString) {
      console.warn('無法同步筆記：找不到筆記數據');
      return false;
    }
    
    // 解析筆記數據
    let notes;
    try {
      notes = JSON.parse(notesString);
      console.log(`準備同步 ${notes.length} 條筆記`);
    } catch (parseError) {
      console.error('解析筆記數據失敗:', parseError);
      return false;
    }
    
    // 使用 callApi 函數發送請求
    const result = await callApi({
      endpoint: '/api/notes/save',
      method: 'POST',
      data: { userId, notes },
      timeout: 8000,
      successLogType: LOG_TYPES.NOTES_SYNC_SUCCESS,
      errorLogType: LOG_TYPES.NOTES_SYNC_ERROR,
      tryBothEnvs: true
    });
    
    if (result.success) {
      console.log(`✅ 筆記同步成功! 環境: ${result.env}`);
      return true;
    } else {
      console.error(`❌ 筆記同步失敗: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('同步筆記時發生錯誤:', error);
    return false;
  }
}

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
  
  // 添加登出和同步筆記功能到全局範圍
  window.logout = logout;
  window.syncNotes = () => syncNotesToServer(true);
  window.autoSyncNotes = autoSyncNotes;
} 