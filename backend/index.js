// backend/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// 配置 CORS 允許指定來源訪問
const corsOptions = {
  origin: ['https://crypto-memo.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// middleware
app.use(express.json());
app.use(cors(corsOptions)); // 應用自定義 CORS 設置

// CORS 請求預檢驗
app.options('*', cors(corsOptions));

// 添加安全中間件，再次驗證來源
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://crypto-memo.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'];
  
  // 如果請求沒有 origin 標頭（可能是直接從瀏覽器地址欄或API工具訪問）
  if (!origin) {
    // 允許本地訪問 API 接口進行測試
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
      return next();
    }
    return res.status(403).json({ error: '訪問被拒絕: 未授權的來源' });
  }
  
  // 檢查是否來自允許的源
  if (!allowedOrigins.includes(origin)) {
    return res.status(403).json({ 
      error: '訪問被拒絕: 只有特定網站可以訪問此 API' 
    });
  }
  next();
});

// 讀取 index.json 文件
app.get('/api/index', (req, res) => {
  const indexPath = path.join(__dirname, 'database', 'newsData', 'index.json');
  
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('讀取 index.json 時發生錯誤:', err);
      return res.status(500).json({ error: '無法讀取指數數據' });
    }
    
    try {
      // 將 JSON 字串解析為物件後回傳
      const indexData = JSON.parse(data);
      res.json(indexData);
    } catch (parseErr) {
      console.error('解析 index.json 時發生錯誤:', parseErr);
      res.status(500).json({ error: '指數數據格式錯誤' });
    }
  });
});

// 讀取 news.json 文件
app.get('/api/news', (req, res) => {
  const newsPath = path.join(__dirname, 'database', 'newsData', 'news.json');
  
  fs.readFile(newsPath, 'utf8', (err, data) => {
    if (err) {
      console.error('讀取 news.json 時發生錯誤:', err);
      return res.status(500).json({ error: '無法讀取新聞數據' });
    }
    
    try {
      // 將 JSON 字串解析為物件後回傳
      const newsData = JSON.parse(data);
      res.json(newsData);
    } catch (parseErr) {
      console.error('解析 news.json 時發生錯誤:', parseErr);
      res.status(500).json({ error: '新聞數據格式錯誤' });
    }
  });
});

// 處理根路徑請求
app.get('/', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://crypto-memo.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'];
  
  if (!origin && (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
    res.send('API 服務器運行中。本地開發模式啟用。');
  } else if (allowedOrigins.includes(origin)) {
    res.send('API 服務器運行中，已授權訪問。');
  } else {
    res.status(403).send('訪問被拒絕: 只有特定網站可以訪問此 API');
  }
});

// 添加 404 路由處理
app.use((req, res) => {
  res.status(404).json({ error: '找不到請求的資源' });
});

// 啟動 server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`允許以下來源訪問:`);
  console.log(`- https://crypto-memo.vercel.app`);
  console.log(`- http://localhost:5173`);
  console.log(`- http://127.0.0.1:5173`);
  console.log(`可用端點:`);
  console.log(`- http://localhost:${PORT}/api/index`);
  console.log(`- http://localhost:${PORT}/api/news`);
});
