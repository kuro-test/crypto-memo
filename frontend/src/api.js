import axios from 'axios';

// API 基礎 URL
const getApiBaseUrl = () => {
  // 檢查當前環境
  if (process.env.NODE_ENV === 'production') {
    return 'https://crypto-memo-production.up.railway.app';
  }
  
  // 開發環境下，先用變數存儲嘗試的端點
  const LOCAL_API = 'http://localhost:3000';
  const RAILWAY_API = 'https://crypto-memo-production.up.railway.app';
  
  // 優先使用本地API
  return LOCAL_API;
};

// 創建可自動切換API的請求函數
const makeRequest = async (url, options = {}) => {
  try {
    // 先嘗試本地API
    const response = await axios.get(`http://localhost:3000${url}`, { 
      ...options, 
      timeout: 2000 // 縮短超時時間，以便快速切換
    });
    return response;
  } catch (error) {
    console.log("本地API連接失敗，切換到Railway API...");
    // 如果本地失敗，使用Railway API
    return axios.get(`https://crypto-memo-production.up.railway.app${url}`, options);
  }
};

// 創建爬蟲工具對象
const scrape = {
  // 爬取新聞 API - 非實時版本
  news: async (count) => {
    try {
      const endpoint = count 
        ? `/api/scrape/news/${count}` 
        : '/api/scrape/news';
      
      const response = await makeRequest(endpoint);
      console.log('✅ 爬蟲執行成功:', response.data.message);
      return response.data;
    } catch (error) {
      console.error('❌ 爬蟲執行失敗:', error);
      throw error;
    }
  },
  
  // 爬取新聞 API - 實時日誌版本
  newsStream: (count) => {
    console.log(`🚀 開始連接爬蟲日誌流，爬取 ${count || 10} 篇新聞...`);
    
    const endpoint = count 
      ? `/api/scrape/news/stream/${count}` 
      : '/api/scrape/news/stream';
    
    // 先嘗試使用本地API
    let eventSource = new EventSource(`http://localhost:3000${endpoint}`);
    let isConnected = false;
    
    // 設置連接超時
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        console.log("本地API連接超時，切換到Railway API...");
        eventSource.close();
        // 切換到Railway API
        eventSource = new EventSource(`https://crypto-memo-production.up.railway.app${endpoint}`);
        setupEventHandlers(eventSource);
      }
    }, 3000);
    
    // 設置事件處理器
    function setupEventHandlers(es) {
      es.onopen = () => {
        isConnected = true;
        clearTimeout(connectionTimeout);
      };
      
      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // 根據消息類型不同顯示不同樣式
        switch (data.type) {
          case 'start':
            console.log(`%c${data.message}`, 'color: blue; font-weight: bold');
            break;
          case 'log':
            // 移除多餘的換行符，保持輸出整潔
            console.log(data.message.replace(/\n$/, ''));
            break;
          case 'error':
            console.error(data.message);
            break;
          case 'end':
            console.log(`%c${data.message}`, 'color: green; font-weight: bold');
            es.close();
            break;
        }
      };
      
      // 處理連接錯誤
      es.onerror = (error) => {
        if (!isConnected) {
          console.log("嘗試連接本地API失敗，切換到Railway API...");
          es.close();
          // 切換到Railway API
          eventSource = new EventSource(`https://crypto-memo-production.up.railway.app${endpoint}`);
          setupEventHandlers(eventSource);
        } else {
          console.error('❌ 爬蟲日誌流連接錯誤:', error);
          es.close();
        }
      };
    }
    
    // 設置本地API的事件處理器
    setupEventHandlers(eventSource);
    
    // 返回一個可用來手動關閉連接的對象
    return {
      close: () => {
        clearTimeout(connectionTimeout);
        eventSource.close();
      }
    };
  },
  
  // 爬取指數 API - 非實時版本
  index: async () => {
    try {
      const response = await makeRequest('/api/scrape/index');
      console.log('✅ 爬蟲執行成功:', response.data.message);
      return response.data;
    } catch (error) {
      console.error('❌ 爬蟲執行失敗:', error);
      throw error;
    }
  },
  
  // 爬取指數 API - 實時日誌版本
  indexStream: () => {
    console.log('🚀 開始連接爬蟲日誌流，爬取加密貨幣指數...');
    
    // 先嘗試使用本地API
    let eventSource = new EventSource(`http://localhost:3000/api/scrape/index/stream`);
    let isConnected = false;
    
    // 設置連接超時
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        console.log("本地API連接超時，切換到Railway API...");
        eventSource.close();
        // 切換到Railway API
        eventSource = new EventSource(`https://crypto-memo-production.up.railway.app/api/scrape/index/stream`);
        setupEventHandlers(eventSource);
      }
    }, 3000);
    
    // 設置事件處理器
    function setupEventHandlers(es) {
      es.onopen = () => {
        isConnected = true;
        clearTimeout(connectionTimeout);
      };
      
      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // 根據消息類型不同顯示不同樣式
        switch (data.type) {
          case 'start':
            console.log(`%c${data.message}`, 'color: blue; font-weight: bold');
            break;
          case 'log':
            // 移除多餘的換行符，保持輸出整潔
            console.log(data.message.replace(/\n$/, ''));
            break;
          case 'error':
            console.error(data.message);
            break;
          case 'end':
            console.log(`%c${data.message}`, 'color: green; font-weight: bold');
            es.close();
            break;
        }
      };
      
      // 處理連接錯誤
      es.onerror = (error) => {
        if (!isConnected) {
          console.log("嘗試連接本地API失敗，切換到Railway API...");
          es.close();
          // 切換到Railway API
          eventSource = new EventSource(`https://crypto-memo-production.up.railway.app/api/scrape/index/stream`);
          setupEventHandlers(eventSource);
        } else {
          console.error('❌ 爬蟲日誌流連接錯誤:', error);
          es.close();
        }
      };
    }
    
    // 設置本地API的事件處理器
    setupEventHandlers(eventSource);
    
    // 返回一個可用來手動關閉連接的對象
    return {
      close: () => {
        clearTimeout(connectionTimeout);
        eventSource.close();
      }
    };
  }
};

export { scrape }; 