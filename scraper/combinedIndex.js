const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 明確指定 .env 檔案路徑
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fetchFearAndGreedIndex() {
    // 檢查 API 金鑰
    const apiKey = process.env.CMC_API_KEY;
    if (!apiKey) {
        console.error(`❌ 錯誤：找不到 CMC API 金鑰`);
        console.error(`預期路徑：${path.join(__dirname, '.env')}`);
        throw new Error("API 金鑰未設定");
    }

    try {
        const response = await axios.get(
            "https://pro-api.coinmarketcap.com/v3/fear-and-greed/historical",
            {
                headers: {
                    'X-CMC_PRO_API_KEY': apiKey,
                    'Accept': 'application/json'
                },
                params: { limit: 1 }
            }
        );

        if (response.data?.data?.[0]) {
            return {
                id: "fear&greed",
                data: response.data.data[0]
            };
        }
    } catch (error) {
        console.error("❌ 恐懼貪婪指數獲取失敗:", error.message);
        return null;
    }
}

async function fetchAltcoinMonthIndex() {
    try {
        const response = await axios.get('https://www.blockchaincenter.net/en/altcoin-season-index/');
        const $ = cheerio.load(response.data);
        
        const monthSection = $('h3:contains("Altcoin Month Index")').closest('.col-12');
        const indexValue = monthSection.find('div[style*="font-size:88px"][style*="color:#345C99"]').text().trim();
        const title = monthSection.find('h3.text-center').text().trim();
        const status = monthSection.find('div.text-center.m-3').clone().children().remove().end().text().trim();
        const tooltip = "If 75% of the Top 50 coins performed better than Bitcoin over the last 30 days it is Altcoin Month";

        if (indexValue) {
            return {
                id: "altcoin-index",
                data: {
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    value: indexValue,
                    status: status,
                    title: title,
                    tooltip: tooltip
                }
            };
        }
    } catch (error) {
        console.error("❌ 山寨幣月指數獲取失敗:", error.message);
        return null;
    }
}

async function combineAndSaveIndexes() {
    try {
        console.log("🔄 開始檢查環境設定...");
        console.log(`📂 env 檔案路徑: ${path.join(__dirname, '.env')}`);
        
        // 先檢查 API 金鑰是否存在
        if (!process.env.CMC_API_KEY) {
            console.error("❌ 錯誤：找不到 CMC API 金鑰");
            console.error(`請確認檔案 ${path.join(__dirname, '.env')} 是否存在並包含 CMC_API_KEY`);
            return;
        }

        console.log("🔄 開始獲取指數資料...");
        
        const [fearGreedData, altcoinData] = await Promise.all([
            fetchFearAndGreedIndex(),
            fetchAltcoinMonthIndex()
        ]);

        const combinedData = [
            fearGreedData,
            altcoinData
        ].filter(Boolean); // 移除 null 值

        if (combinedData.length > 0) {
            const filePath = path.join(__dirname, '..', 'frontend', 'public', 'index.json');
            fs.writeFileSync(filePath, JSON.stringify(combinedData, null, 2), 'utf-8');
            console.log("✅ 資料已儲存至:", filePath);
        } else {
            console.error("❌ 沒有可用的指數資料");
        }

    } catch (error) {
        console.error("❌ 程序執行失敗:", error.message);
    }
}

// 執行程式
combineAndSaveIndexes();