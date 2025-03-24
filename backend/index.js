// backend/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT =  process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(cors());

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
  res.send('API 服務器運行中。請使用 /api/index 或 /api/news 端點。');
});

// 啟動 server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`可用端點:`);
  console.log(`- http://localhost:${PORT}/api/index`);
  console.log(`- http://localhost:${PORT}/api/news`);
});
