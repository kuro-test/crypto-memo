# Crypto Memo 加密貨幣備忘錄

## 📝 專案簡介
Crypto Memo 是一個專為加密貨幣愛好者和投資者設計的應用程式，提供即時的市場資訊、分析工具和個人化追蹤功能。通過整合多來源的市場數據，幫助用戶做出更明智的投資決策。

## 🛠️ 技術架構

### 前端 (Frontend)
- 基於 React 19 和 Vite 6 的現代化前端應用
- 使用 Tailwind CSS 4 進行樣式設計
- Chart.js 和 react-chartjs-2 實現數據可視化
- 支援拖放功能 (DnD Kit) 實現自定義介面
- 採用 ESLint 確保代碼品質

### 後端 (Backend)
- Node.js + Express 伺服器
- 網路爬蟲系統 (使用 Axios 和 Cheerio)
- 整合 Google Generative AI 進行數據分析
- PostgreSQL 資料庫存儲歷史數據
- JSON 文件儲存用戶設置和快取數據

## 🚀 安裝與啟動

### 系統需求
- Node.js (18.x 或更高版本)
- npm 或 yarn
- PostgreSQL 資料庫 (可選)
- 現代瀏覽器 (Chrome, Firefox, Safari, Edge)

### 安裝步驟

1. 克隆儲存庫
```bash
git clone https://github.com/您的用戶名/crypto-memo.git
cd crypto-memo
```

2. 安裝根目錄依賴
```bash
npm install
```

3. 安裝並啟動前端
```bash
cd frontend
npm install
npm run dev
```

4. 安裝並啟動後端
```bash
cd backend
npm install
npm run dev
```

5. 使用以下命令同時啟動前後端 (在根目錄執行)
```bash
npm run dev
```

### 生產環境部署
```bash
npm run start
```
此命令會建構前端並啟動生產版本的應用。

## 🔍 主要功能

- **即時市場監控**：即時顯示加密貨幣價格、交易量和市值變化
- **資訊聚合**：整合多來源的加密貨幣新聞和行情分析
- **數據可視化**：通過圖表和儀表板清晰展示市場趨勢
- **個人化追蹤**：自定義關注的加密貨幣和指標
- **市場指數分析**：提供替代幣指數和整體市場健康度評估
- **智能分析**：利用 Google AI 提供的智能分析和預測

## 📂 專案結構
crypto-memo/
├── frontend/ # 前端專案目錄
│ ├── src/ # 源代碼
│ │ ├── assets/ # 靜態資源
│ │ ├── utils/ # 工具函數
│ │ ├── App.jsx # 主應用組件
│ │ ├── GaugeChart.jsx # 儀表板圖表組件
│ │ ├── AltcoinIndex.jsx # 替代幣指數組件
│ │ └── api.js # API 請求處理
│ ├── public/ # 公共資源
│ └── package.json # 前端依賴配置
│
├── backend/ # 後端專案目錄
│ ├── scraper/ # 爬蟲模組
│ │ ├── combinedIndex.js # 指數計算
│ │ └── scraperTranslate.js # 翻譯功能
│ ├── database/ # 資料庫相關
│ │ ├── index.json # 指數數據
│ │ ├── news.json # 新聞資料
│ │ └── user.json # 用戶設置
│ └── index.js # 後端主程式
│
└── package.json # 根目錄配置和腳本