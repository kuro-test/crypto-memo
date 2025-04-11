
# Crypto Memo

Crypto Memo 是一個專為加密貨幣愛好者設計的應用程式，提供即時的加密貨幣新聞、市場指數（如比特幣恐懼貪婪指數和山寨幣月份指數）以及個人筆記管理功能。用戶可以瀏覽最新新聞、查看市場情緒指標，並記錄自己的投資想法與分析。後端爬蟲程式負責從多個來源抓取新聞和指數數據，並將其翻譯為繁體中文以提升閱讀體驗。

## 功能特性

- **新聞瀏覽**：展示來自 CoinDesk 等來源的最新加密貨幣新聞，支援繁體中文翻譯、摘要生成和詳細內容查看。
- **市場指數**：
  - **比特幣恐懼貪婪指數**：以半圓圖表形式展示市場情緒（極度恐懼到極度貪婪）。
  - **山寨幣月份指數**：顯示山寨幣相對於比特幣的表現，幫助用戶判斷市場趨勢。
- **筆記管理**：允許用戶創建、編輯和刪除筆記，支援將新聞或指數數據快速添加到筆記中，實現本地與伺服器同步。
- **移動端優化**：支援觸控操作和滑動刪除筆記，確保良好的移動端體驗。
- **API 健康檢查**：自動檢測 API 可用性，並在必要時切換至備用伺服器。
- **多語言支持**：新聞和指數數據翻譯成繁體中文，界面元素也支援中文化。

## 技術棧

### 前端
- **React**：用於構建用戶界面，搭配 React Hooks 管理狀態。
- **Chart.js / react-chartjs-2**：用於渲染比特幣恐懼貪婪指數的半圓圖表。
- **axios**：處理 HTTP 請求，與後端 API 交互。
- **@dnd-kit/core**：支援拖放功能（目前用於筆記管理）。
- **Tailwind CSS**：用於快速構建響應式和美觀的界面。

### 後端
- **Node.js**：運行爬蟲和伺服器程式。
- **Express**：用於提供 API 服務。
- **axios**：用於發送 HTTP 請求以抓取網頁數據。
- **cheerio**：解析 HTML 內容，提取新聞和指數數據。
- **GoogleGenerativeAI**：透過 Gemini API 進行新聞翻譯和摘要生成。
- **fs**：將爬取的數據存儲為 JSON 文件。

### 數據存儲
- **Local Storage / Session Storage**：用於前端臨時存儲筆記和同步狀態。
- **JSON 文件**：後端將新聞和指數數據存儲於 `database/news.json` 和 `database/index.json`。
- **伺服器數據庫**：用於儲存用戶筆記和帳戶資訊。

## 專案結構

```
crypto-memo/
├── client/                   # 前端 React 應用程式
│   ├── src/
│   │   ├── App.jsx           # 主應用程式組件
│   │   ├── GaugeChart.jsx    # 比特幣恐懼貪婪指數組件
│   │   ├── AltcoinIndex.jsx  # 山寨幣月份指數組件
│   │   ├── api.js            # 爬蟲 API 客戶端接口
│   │   ├── utils/
│   │   │   └── logger.js     # 日誌工具
│   │   └── index.css         # 全局樣式
├── server/                   # 後端爬蟲和伺服器程式
│   ├── database/             # 數據存儲目錄
│   │   ├── news.json         # 爬取的新聞數據
│   │   └── index.json        # 爬取的指數數據
│   ├── newsScraper.js        # 新聞爬蟲程式
│   └── combinedIndex.js      # 指數爬蟲程式
├── .env                      # 環境變數文件（包含 Gemini API Key）
├── package.json              # 專案依賴和腳本
└── README.md                 # 本文件
```

## 安裝與使用

### 先決條件
- **Node.js**：版本 >= 16.x
- **npm** 或 **yarn**：用於管理依賴
- **Google Gemini API Key**：用於新聞翻譯和摘要生成

### 安裝步驟

1. **克隆專案**
   ```bash
   git clone https://github.com/your-username/crypto-memo.git
   cd crypto-memo
   ```

2. **設置環境變數**
   在專案根目錄下創建 `.env` 文件，添加以下內容：
   ```plaintext
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **安裝前端依賴**
   ```bash
   cd client
   npm install
   ```

4. **安裝後端依賴**
   ```bash
   cd ../server
   npm install
   ```

### 運行專案

1. **啟動前端（開發模式）**
   ```bash
   cd client
   npm start
   ```
   前端將運行在 `http://localhost:3000`。

2. **運行新聞爬蟲**
   ```bash
   cd server
   node newsScraper.js [count]
   ```
   - `[count]`：指定爬取的新聞數量（預設為 10）。
   - 爬取的數據將存儲在 `database/news.json`。

3. **運行指數爬蟲**
   ```bash
   cd server
   node combinedIndex.js
   ```
   - 爬取的指數數據將存儲在 `database/index.json`。

4. **啟動後端伺服器（假設存在）**
   如果有獨立的 Express 伺服器，運行：
   ```bash
   cd server
   node index.js
   ```
   確保伺服器運行在預設的 `http://localhost:3000` 或配置的生產環境 URL。

### 部署

- **前端**：使用 Vercel、Netlify 或其他靜態託管服務部署 `client/build` 目錄。
- **後端**：部署到 Railway、Heroku 或其他 Node.js 支援的平台，確保環境變數正確配置。
- **資料同步**：確保前端與後端 API 的 URL 一致，推薦使用 `https://crypto-memo-production.up.railway.app` 作為生產環境 API。

## 使用說明

1. **登入**：
   - 輸入帳號和密碼進行登入，登入狀態將儲存在本地。
   - 如果 API 不可用，應用程式會顯示錯誤畫面並提供重試選項。

2. **新聞瀏覽**：
   - 主頁顯示最新新聞列表，點擊新聞標題查看詳細內容。
   - 可選擇將新聞的簡介、摘要、詳細內容、原文或出處添加到筆記。

3. **市場指數**：
   - 查看比特幣恐懼貪婪指數（圖表展示）和山寨幣月份指數（數值展示）。
   - 點擊「+」按鈕將當前指數數據保存到筆記。

4. **筆記管理**：
   - 在側邊欄輸入快速筆記或點擊「新增」打開完整筆記編輯器。
   - 支援滑動刪除筆記（移動端）或點擊刪除按鈕（桌面端）。
   - 筆記自動同步到伺服器，同時儲存在本地以支援離線使用。

## 注意事項

- **API 限制**：Gemini API 有使用配額，請確保 API Key 有效且未超出限制。
- **數據更新**：新聞和指數數據依賴爬蟲程式定期運行，建議設置定時任務（例如 cron job）以保持數據新鮮。
- **同步問題**：如果筆記同步失敗，應用程式會將數據儲存在本地並在下次連線時重試。
- **移動端體驗**：確保在移動設備上測試觸控操作（如滑動刪除和點擊添加按鈕）。

## 未來改進

- **即時新聞更新**：透過 WebSocket 或 EventSource 實現新聞的即時推送。
- **更多指數**：新增其他市場指數，如 DeFi 指數或穩定幣市場份額。
- **用戶認證**：實現更安全的身份驗證機制（如 JWT 或 OAuth）。
- **離線模式**：增強離線筆記編輯功能，支援更複雜的離線同步邏輯。
- **多語言支持**：支援更多語言的翻譯和界面本地化。

## 貢獻

歡迎提交問題報告或 Pull Request！請遵循以下步驟：
1. Fork 本倉庫。
2. 創建你的功能分支（`git checkout -b feature/YourFeature`）。
3. 提交你的更改（`git commit -m 'Add YourFeature'`）。
4. 推送到分支（`git push origin feature/YourFeature`）。
5. 開啟一個 Pull Request。

## 授權

本專案採用 [MIT 授權](LICENSE)。
