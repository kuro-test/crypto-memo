// 全局日誌控制
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

// API 端點配置
export const API_CONFIG = {
  LOCAL: 'http://localhost:3000',
  PROD: 'https://crypto-memo-production.up.railway.app',
  isUsingProd: false
};

// 獲取當前 API 端點
export function getApiEndpoint() {
  return API_CONFIG.isUsingProd ? API_CONFIG.PROD : API_CONFIG.LOCAL;
}

// 切換到生產環境
export function switchToProd() {
  API_CONFIG.isUsingProd = true;
}

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

// 移除舊的函數
export const conditionalLog = () => {};
export const conditionalError = () => {}; 