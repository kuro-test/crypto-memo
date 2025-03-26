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

// 通用的API請求函數，支持自動切換和重試
export async function callApi(options) {
  const { 
    endpoint,           // API端點，例如 '/api/index'
    method = 'GET',     // 請求方法
    data = null,        // 請求數據
    timeout = 5000,     // 超時時間
    headers = {},       // 自定義標頭
    successLogType,     // 成功日誌類型
    errorLogType,       // 錯誤日誌類型
    tryBothEnvs = true, // 是否嘗試兩個環境
    isRetry = false,    // 是否為重試請求
    envOverride = null  // 可選，強制指定使用的環境
  } = options;
  
  // 決定嘗試順序
  let envSequence = [];
  
  // 如果指定了環境，則只使用該環境
  if (envOverride === 'LOCAL') {
    envSequence = [API_CONFIG.LOCAL];
  } else if (envOverride === 'PROD') {
    envSequence = [API_CONFIG.PROD];
  } else {
    // 根據優先設置決定嘗試順序
    if (API_CONFIG.preferLocal) {
      envSequence = [API_CONFIG.LOCAL, API_CONFIG.PROD]; // 先本地後生產
    } else {
      envSequence = [API_CONFIG.PROD, API_CONFIG.LOCAL]; // 先生產後本地
    }
    
    // 如果是重試請求，且僅嘗試第二個環境
    if (isRetry) {
      envSequence = [envSequence[1]];
    }
    
    // 如果不需要嘗試兩個環境，只使用當前環境
    if (!tryBothEnvs) {
      envSequence = [API_CONFIG.getBaseUrl()];
    }
  }
  
  // 遍歷環境序列依次嘗試
  let lastError = null;
  
  for (const baseUrl of envSequence) {
    try {
      // 輸出當前正在嘗試的環境（僅開發模式）
      if (process.env.NODE_ENV === 'development') {
        console.log(`正在嘗試使用 ${baseUrl} 環境發送 ${method} 請求到 ${endpoint}`);
      }
      
      const response = await axios({
        url: `${baseUrl}${endpoint}`,
        method,
        data: method !== 'GET' ? data : null,
        params: method === 'GET' ? data : null,
        timeout,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      // 請求成功，更新當前環境設置
      API_CONFIG.isUsingProd = baseUrl === API_CONFIG.PROD;
      
      // 記錄成功日誌
      if (successLogType) {
        log(successLogType, baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL');
      }
      
      // 輸出連接成功信息（僅開發模式）
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ 成功連接到 ${baseUrl} 環境`);
      }
      
      return { 
        success: true, 
        data: response.data, 
        env: baseUrl === API_CONFIG.PROD ? 'PROD' : 'LOCAL' 
      };
    } catch (error) {
      lastError = error;
      
      // 輸出連接失敗信息（僅開發模式）
      if (process.env.NODE_ENV === 'development') {
        console.warn(`❌ 無法連接到 ${baseUrl} 環境: ${error.message}`);
      }
      
      // 繼續嘗試下一個環境
      continue;
    }
  }
  
  // 所有嘗試都失敗
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
} 