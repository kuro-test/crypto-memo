// backend/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const app = express();
const
 PORT = process.env.PORT || 3000;

// 配置 CORS 允許指定來源訪問
const corsOptions = {
  origin: ['https://crypto-memo.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',  // 添加這些常用標頭
    'Pragma'          // 添加這些常用標頭
  ],
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

// 讀取 index.json 文件 - 只使用新路徑
app.get('/api/index', (req, res) => {
  // 只嘗試新路徑
  const possiblePaths = [
    path.join(__dirname, 'database', 'index.json'),     // 本地路徑
    '/app/database/index.json',                         // 部署路徑
  ];
  
  let foundPath = null;
  
  // 找到第一個存在的路徑
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      console.log(`找到 index.json 檔案在: ${p}`);
      break;
    }
  }
  
  // 如果沒有找到檔案，創建一個
  if (!foundPath) {
    console.log('未找到 index.json 檔案，嘗試創建新檔案');
    
    // 決定要使用哪個路徑來創建檔案
    const createPath = process.env.NODE_ENV === 'production' 
      ? '/app/database/index.json'
      : path.join(__dirname, 'database', 'index.json');
    
    // 確保目錄存在
    const createDir = path.dirname(createPath);
    if (!fs.existsSync(createDir)) {
      try {
        fs.mkdirSync(createDir, { recursive: true });
        console.log(`已創建目錄: ${createDir}`);
      } catch (dirError) {
        console.error(`創建目錄失敗: ${dirError.message}`);
        return res.status(500).json({ error: '無法創建資料目錄' });
      }
    }
    
    // 創建空的指數數據檔案
    try {
      const emptyIndexData = [
        {
          id: "fear&greed",
          data: {
            timestamp: Math.floor(Date.now() / 1000).toString(),
            value: "50",
            value_classification: "中性"
          }
        },
        {
          id: "altcoin-index",
          data: {
            timestamp: Math.floor(Date.now() / 1000).toString(),
            value: "50",
            status: "It is not Altcoin Month!",
            title: "Altcoin Month Index",
            tooltip: "If 75% of the Top 50 coins performed better than Bitcoin over the last 30 days it is Altcoin Month"
          }
        }
      ];
      
      fs.writeFileSync(createPath, JSON.stringify(emptyIndexData, null, 2), 'utf8');
      console.log(`已創建新的 index.json 檔案在: ${createPath}`);
      foundPath = createPath;
    } catch (createError) {
      console.error(`創建 index.json 檔案失敗: ${createError.message}`);
      return res.status(500).json({ error: '無法創建指數數據檔案' });
    }
  }
  
  // 使用找到或新創建的路徑讀取檔案
  fs.readFile(foundPath, 'utf8', (err, data) => {
    if (err) {
      console.error('讀取 index.json 時發生錯誤:', err);
      return res.status(500).json({ error: '無法讀取指數數據' });
    }
    
    try {
      // 將 JSON 字串解析為物件後回傳
      const indexData = JSON.parse(data);
      console.log(`成功讀取指數數據`);
      res.json(indexData);
    } catch (parseErr) {
      console.error('解析 index.json 時發生錯誤:', parseErr);
      res.status(500).json({ error: '指數數據格式錯誤' });
    }
  });
});

// 讀取 news.json 文件 - 只使用新路徑
app.get('/api/news', (req, res) => {
  // 只嘗試新路徑
  const possiblePaths = [
    path.join(__dirname, 'database', 'news.json'),      // 本地路徑
    '/app/database/news.json',                          // 部署路徑
  ];
  
  let foundPath = null;
  
  // 找到第一個存在的路徑
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      console.log(`找到 news.json 檔案在: ${p}`);
      break;
    }
  }
  
  // 如果沒有找到檔案，創建一個
  if (!foundPath) {
    console.log('未找到 news.json 檔案，嘗試創建新檔案');
    
    // 決定要使用哪個路徑來創建檔案
    const createPath = process.env.NODE_ENV === 'production' 
      ? '/app/database/news.json'
      : path.join(__dirname, 'database', 'news.json');
    
    // 確保目錄存在
    const createDir = path.dirname(createPath);
    if (!fs.existsSync(createDir)) {
      try {
        fs.mkdirSync(createDir, { recursive: true });
        console.log(`已創建目錄: ${createDir}`);
      } catch (dirError) {
        console.error(`創建目錄失敗: ${dirError.message}`);
        return res.status(500).json({ error: '無法創建資料目錄' });
      }
    }
    
    // 創建空的新聞數據檔案
    try {
      const emptyNewsData = [
        { timestamp: Date.now() },
        {
          id: 1,
          title: "Welcome to Crypto Memo",
          titleZh: "歡迎使用 Crypto Memo",
          content: "Please use the scraper to fetch the latest crypto news.",
          contentZh: "請使用爬蟲功能獲取最新的加密貨幣新聞。",
          timeago: "Just now",
          summaryZh: "這是一個預設的歡迎消息。請使用爬蟲功能來獲取真實的新聞數據。",
          detailZh: "Crypto Memo 是一個加密貨幣新聞和指數跟踪工具。\n\n您可以爬取最新的加密貨幣新聞並將它們翻譯成中文。此外，您還可以跟踪比特幣恐懼與貪婪指數以及山寨幣月份指數。\n\n使用左側的筆記功能來保存重要信息。"
        }
      ];
      
      fs.writeFileSync(createPath, JSON.stringify(emptyNewsData, null, 2), 'utf8');
      console.log(`已創建新的 news.json 檔案在: ${createPath}`);
      foundPath = createPath;
    } catch (createError) {
      console.error(`創建 news.json 檔案失敗: ${createError.message}`);
      return res.status(500).json({ error: '無法創建新聞數據檔案' });
    }
  }
  
  // 使用找到或新創建的路徑讀取檔案
  fs.readFile(foundPath, 'utf8', (err, data) => {
    if (err) {
      console.error('讀取 news.json 時發生錯誤:', err);
      return res.status(500).json({ error: '無法讀取新聞數據' });
    }
    
    try {
      // 將 JSON 字串解析為物件後回傳
      const newsData = JSON.parse(data);
      console.log(`成功讀取新聞數據，有 ${newsData.length || 0} 條記錄`);
      res.json(newsData);
    } catch (parseErr) {
      console.error('解析 news.json 時發生錯誤:', parseErr);
      res.status(500).json({ error: '新聞數據格式錯誤' });
    }
  });
});

// 爬取新聞的 SSE API 端點
app.get('/api/scrape/news/stream/:count?', (req, res) => {
  // 設置 SSE 響應頭
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 獲取參數，默認為 10
  const count = req.params.count || 10;
  
  // 取得 scraperTranslate.js 絕對路徑
  const scraperPath = path.join(__dirname, 'scraper', 'scraperTranslate.js');
  
  // 發送初始消息
  res.write(`data: ${JSON.stringify({ type: 'start', message: `開始執行爬蟲程序，爬取 ${count} 篇新聞...\n` })}\n\n`);
  
  // 使用 spawn 代替 exec 以獲取實時輸出
  const scraper = spawn('node', [scraperPath, count]);
  
  // 處理標準輸出
  scraper.stdout.on('data', (data) => {
    const message = data.toString();
    console.log(message);
    // 發送日誌到客戶端
    res.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
  });
  
  // 處理標準錯誤
  scraper.stderr.on('data', (data) => {
    const message = data.toString();
    console.error(message);
    // 發送錯誤日誌到客戶端
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  });
  
  // 處理進程結束
  scraper.on('close', (code) => {
    const message = `爬蟲進程已結束，退出碼 ${code}`;
    console.log(message);
    // 發送完成消息到客戶端
    res.write(`data: ${JSON.stringify({ type: 'end', message, code })}\n\n`);
    res.end();
  });
  
  // 處理客戶端斷開連接
  req.on('close', () => {
    if (!scraper.killed) {
      scraper.kill();
      console.log('客戶端已斷開連接，終止爬蟲進程');
    }
  });
});

// 爬取指數的 SSE API 端點
app.get('/api/scrape/index/stream', (req, res) => {
  // 設置 SSE 響應頭
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 取得 combinedIndex.js 絕對路徑
  const indexScraperPath = path.join(__dirname, 'scraper', 'combinedIndex.js');
  
  // 發送初始消息
  res.write(`data: ${JSON.stringify({ type: 'start', message: '開始執行爬蟲程序，爬取加密貨幣指數...\n' })}\n\n`);
  
  // 使用 spawn 代替 exec 以獲取實時輸出
  const indexScraper = spawn('node', [indexScraperPath]);
  
  // 處理標準輸出
  indexScraper.stdout.on('data', (data) => {
    const message = data.toString();
    console.log(message);
    // 發送日誌到客戶端
    res.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
  });
  
  // 處理標準錯誤
  indexScraper.stderr.on('data', (data) => {
    const message = data.toString();
    console.error(message);
    // 發送錯誤日誌到客戶端
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  });
  
  // 處理進程結束
  indexScraper.on('close', (code) => {
    const message = `爬蟲進程已結束，退出碼 ${code}`;
    console.log(message);
    // 發送完成消息到客戶端
    res.write(`data: ${JSON.stringify({ type: 'end', message, code })}\n\n`);
    res.end();
  });
  
  // 處理客戶端斷開連接
  req.on('close', () => {
    if (!indexScraper.killed) {
      indexScraper.kill();
      console.log('客戶端已斷開連接，終止爬蟲進程');
    }
  });
});

// 讀取或建立 user.json 檔案
app.get('/api/users', (req, res) => {
  // 嘗試新路徑
  const possiblePaths = [
    path.join(__dirname, 'database', 'user.json'),      // 本地路徑
    '/app/database/user.json',                          // 部署路徑
  ];
  
  let foundPath = null;
  
  // 找到第一個存在的路徑
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      console.log(`找到 user.json 檔案在: ${p}`);
      break;
    }
  }
  
  // 如果沒有找到檔案，創建一個
  if (!foundPath) {
    console.log('未找到 user.json 檔案，嘗試創建新檔案');
    
    // 決定要使用哪個路徑來創建檔案
    const createPath = process.env.NODE_ENV === 'production' 
      ? '/app/database/user.json'
      : path.join(__dirname, 'database', 'user.json');
    
    // 確保目錄存在
    const createDir = path.dirname(createPath);
    if (!fs.existsSync(createDir)) {
      try {
        fs.mkdirSync(createDir, { recursive: true });
        console.log(`已創建目錄: ${createDir}`);
      } catch (dirError) {
        console.error(`創建目錄失敗: ${dirError.message}`);
        return res.status(500).json({ error: '無法創建資料目錄' });
      }
    }
    
    // 創建默認的用戶數據檔案
    try {
      const defaultUsers = [
        {
          "id": "test",
          "password": "test",
          "control": "true",
          "note": [
            {
              "timestamp": Date.now(),
              "title": "歡迎使用 Crypto Memo",
              "content": "這是一個預設的歡迎筆記。您可以添加自己的筆記，它們會顯示在這裡。"
            }
          ]
        }
      ];
      
      fs.writeFileSync(createPath, JSON.stringify(defaultUsers, null, 2), 'utf8');
      console.log(`已創建新的 user.json 檔案在: ${createPath}`);
      foundPath = createPath;
    } catch (createError) {
      console.error(`創建 user.json 檔案失敗: ${createError.message}`);
      return res.status(500).json({ error: '無法創建用戶數據檔案' });
    }
  }
  
  // 使用找到或新創建的路徑讀取檔案
  fs.readFile(foundPath, 'utf8', (err, data) => {
    if (err) {
      console.error('讀取 user.json 時發生錯誤:', err);
      return res.status(500).json({ error: '無法讀取用戶數據' });
    }
    
    try {
      // 將 JSON 字串解析為物件後回傳
      const userData = JSON.parse(data);
      console.log(`成功讀取用戶數據，有 ${userData.length || 0} 個用戶`);
      res.json(userData);
    } catch (parseErr) {
      console.error('解析 user.json 時發生錯誤:', parseErr);
      res.status(500).json({ error: '用戶數據格式錯誤' });
    }
  });
});

// 登入 API
app.post('/api/login', express.json(), (req, res) => {
  const { id, password } = req.body;
  
  if (!id || !password) {
    return res.status(400).json({ error: '帳號和密碼不能為空' });
  }
  
  // 嘗試讀取 user.json
  const possiblePaths = [
    path.join(__dirname, 'database', 'user.json'),      // 本地路徑
    '/app/database/user.json',                          // 部署路徑
  ];
  
  let foundPath = null;
  
  // 找到第一個存在的路徑
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }
  
  if (!foundPath) {
    return res.status(500).json({ error: '用戶數據檔案不存在' });
  }
  
  fs.readFile(foundPath, 'utf8', (err, data) => {
    if (err) {
      console.error('讀取 user.json 時發生錯誤:', err);
      return res.status(500).json({ error: '無法讀取用戶數據' });
    }
    
    try {
      const users = JSON.parse(data);
      const user = users.find(u => u.id === id && u.password === password);
      
      if (user) {
        // 登入成功
        console.log(`用戶 ${id} 登入成功`);
        res.json({ 
          success: true, 
          id: user.id, 
          control: user.control,
          note: user.note || []
        });
      } else {
        // 登入失敗
        console.log(`用戶 ${id} 登入失敗: 帳號或密碼不正確`);
        res.status(401).json({ error: '帳號或密碼不正確' });
      }
    } catch (parseErr) {
      console.error('解析 user.json 時發生錯誤:', parseErr);
      res.status(500).json({ error: '用戶數據格式錯誤' });
    }
  });
});

// 儲存筆記 API
app.post('/api/notes/save', express.json(), (req, res) => {
  const { userId, notes } = req.body;
  
  if (!userId || !notes) {
    return res.status(400).json({ error: '用戶ID和筆記不能為空' });
  }
  
  // 嘗試讀取 user.json
  const possiblePaths = [
    path.join(__dirname, 'database', 'user.json'),      // 本地路徑
    '/app/database/user.json',                          // 部署路徑
  ];
  
  let foundPath = null;
  
  // 找到第一個存在的路徑
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }
  
  if (!foundPath) {
    return res.status(500).json({ error: '用戶數據檔案不存在' });
  }
  
  fs.readFile(foundPath, 'utf8', (err, data) => {
    if (err) {
      console.error('讀取 user.json 時發生錯誤:', err);
      return res.status(500).json({ error: '無法讀取用戶數據' });
    }
    
    try {
      const users = JSON.parse(data);
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({ error: '找不到該用戶' });
      }
      
      // 更新用戶的筆記
      users[userIndex].note = notes;
      
      // 寫回檔案
      fs.writeFile(foundPath, JSON.stringify(users, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('寫入 user.json 時發生錯誤:', writeErr);
          return res.status(500).json({ error: '無法儲存筆記' });
        }
        
        console.log(`用戶 ${userId} 筆記儲存成功`);
        res.json({ success: true });
      });
    } catch (parseErr) {
      console.error('解析 user.json 時發生錯誤:', parseErr);
      res.status(500).json({ error: '用戶數據格式錯誤' });
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

// 新增診斷端點以檢查文件系統
app.get('/api/debug/files', (req, res) => {
  const diagnostics = {
    currentDirectory: __dirname,
    paths: {
      // 檢查 news.json
      news: [
        { path: path.join(__dirname, 'database', 'news.json') },     // 本地路徑
        { path: '/app/database/news.json' }                          // 部署路徑
      ],
      // 檢查 index.json
      index: [
        { path: path.join(__dirname, 'database', 'index.json') },    // 本地路徑
        { path: '/app/database/index.json' }                         // 部署路徑
      ]
    }
  };
  
  // 檢查每個路徑的存在情況與大小
  ['news', 'index'].forEach(fileType => {
    diagnostics.paths[fileType].forEach(item => {
      try {
        if (fs.existsSync(item.path)) {
          const stats = fs.statSync(item.path);
          item.exists = true;
          item.size = stats.size;
          item.isFile = stats.isFile();
          
          if (stats.isFile() && stats.size < 100000) { // 只讀取小於 100KB 的檔案預覽
            try {
              const content = fs.readFileSync(item.path, 'utf8');
              item.preview = content.substring(0, 150) + '...';
            } catch (readErr) {
              item.readError = readErr.message;
            }
          }
        } else {
          item.exists = false;
        }
      } catch (err) {
        item.exists = false;
        item.error = err.message;
      }
    });
  });
  
  // 檢查目錄結構
  try {
    // 檢查 __dirname 的目錄結構
    if (fs.existsSync(__dirname)) {
      diagnostics.dirContents = {
        root: fs.readdirSync(__dirname)
      };
      
      // 檢查數據庫目錄
      const dbDirPaths = [
        path.join(__dirname, 'database'),
        '/app/database'
      ];
      
      dbDirPaths.forEach(dbPath => {
        if (fs.existsSync(dbPath)) {
          diagnostics.dirContents[`db_${dbPath}`] = fs.readdirSync(dbPath);
        }
      });
    }
  } catch (err) {
    diagnostics.dirError = err.message;
  }
  
  res.json(diagnostics);
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
  console.log(`- http://localhost:${PORT}/api/scrape/news/stream/:count?`);
  console.log(`- http://localhost:${PORT}/api/scrape/index/stream`);
  console.log(`- http://localhost:${PORT}/api/users`);
  console.log(`- http://localhost:${PORT}/api/login`);
  console.log(`- http://localhost:${PORT}/api/notes/save`);
});
