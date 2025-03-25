// 全局日誌控制
const loggedMessages = new Set();
const DEBUG = false; // 設為 false 可完全禁用開發日誌

export function conditionalLog(message, ...args) {
  // 創建一個唯一的消息標識符
  let messageKey = message;
  
  // 如果有額外參數，將它們加入到標識符中
  if (args.length > 0) {
    messageKey += JSON.stringify(args);
  }
  
  // 如果禁用了調試或者已經記錄過該消息，則不輸出
  if (!DEBUG && loggedMessages.has(messageKey)) return;
  
  // 記錄這條消息已經輸出過
  loggedMessages.add(messageKey);
  
  // 使用標準 console.log 並傳遞所有參數
  console.log(message, ...args);
}

export function conditionalError(message, ...args) {
  let messageKey = message;
  
  if (args.length > 0) {
    messageKey += JSON.stringify(args);
  }
  
  // 錯誤默認始終輸出，但仍然避免重複
  if (loggedMessages.has(messageKey)) return;
  
  loggedMessages.add(messageKey);
  console.error(message, ...args);
} 