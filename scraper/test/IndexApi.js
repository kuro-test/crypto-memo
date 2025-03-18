const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fetchFearAndGreedIndex() {
  // 先檢查 API 金鑰
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) {
    console.error("❌ 找不到 API 金鑰，請確認 .env 檔案設定");
    return;
  }
  try {
    console.log("🔄 正在發送 API 請求...");
    
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v3/fear-and-greed/historical",
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        params: {
          limit: 1
        }
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const latestData = response.data.data[0];
      console.log("📊 獲取最新指數:", latestData);

      const indexData = {
        id: "fear&greed",
        data: latestData
      };

      // 儲存至 frontend/public 資料夾
      const filePath = path.join(__dirname, '..', 'frontend', 'public', 'index.json');
      fs.writeFileSync(filePath, JSON.stringify(indexData, null, 2), 'utf-8');
      console.log("✅ 資料已儲存至:", filePath);
    } else {
      throw new Error("API 回應格式不符預期");
    }
  } catch (error) {
    console.error("❌ API 請求失敗:");
    if (error.response) {
      console.error("📌 錯誤狀態:", error.response.status);
      console.error("📌 錯誤資料:", error.response.data);
      console.error("📌 請求標頭:", error.config.headers);
    } else {
      console.error("📌 錯誤訊息:", error.message);
    }
  }
}

// 執行程式
fetchFearAndGreedIndex();



