const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 移除 bitcoinFear.js 的引入
// const { scrapeBitcoinFearGreedIndex } = require('./bitcoinFear');

// 整合 bitcoinFear.js 的功能到 combinedIndex.js 中
async function fetchFearAndGreedIndex() {
    try {
        console.log('🔄 開始抓取比特幣恐懼與貪婪指數...');
        
        // 發送 HTTP 請求獲取網頁內容
        const response = await axios.get('https://www.btcfans.com/zh-tw/tools/fear_greed');
        
        // 使用 cheerio 載入 HTML
        const $ = cheerio.load(response.data);
        
        // 抓取情緒和指數
        const emotion = $('#FearIndex .text').text().trim();
        const value = parseInt($('#FearIndex .point').text().trim());
        const updateTime = $('#FearIndex .time').text().replace('更新時間：', '').trim();
        
        // 檢查數據是否有效
        if (!emotion || isNaN(value)) {
            throw new Error('無法正確抓取恐懼貪婪指數數據');
        }
        
        console.log('✅ 比特幣恐懼與貪婪指數抓取成功!');
        
        // 創建格式化的數據對象
        return {
            id: "fear&greed",
            data: {
                timestamp: Math.floor(Date.now() / 1000).toString(),
                value: value,
                value_classification: emotion
            }
        };
    } catch (error) {
        console.error("❌ 恐懼貪婪指數獲取失敗:", error.message);
        return null;
    }
}

async function fetchAltcoinMonthIndex() {
    try {
        console.log('🔄 開始抓取山寨幣月份指數...');
        
        const response = await axios.get('https://www.blockchaincenter.net/en/altcoin-season-index/');
        const $ = cheerio.load(response.data);
        
        const monthSection = $('h3:contains("Altcoin Month Index")').closest('.col-12');
        const indexValue = monthSection.find('div[style*="font-size:88px"][style*="color:#345C99"]').text().trim();
        const title = monthSection.find('h3.text-center').text().trim();
        const status = monthSection.find('div.text-center.m-3').clone().children().remove().end().text().trim();
        const tooltip = "If 75% of the Top 50 coins performed better than Bitcoin over the last 30 days it is Altcoin Month";

        if (indexValue) {
            console.log('✅ 山寨幣月份指數抓取成功!');
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
        } else {
            throw new Error("無法抓取山寨幣月份指數數據");
        }
    } catch (error) {
        console.error("❌ 山寨幣月指數獲取失敗:", error.message);
        return null;
    }
}

async function combineAndSaveIndexes() {
    try {
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
            // 定義前端和後端的文件路徑
            const frontendFilePath = path.join(__dirname, '..', '..', 'frontend', 'public', 'index.json');
            const backendFilePath = path.join(__dirname, '..', 'database', 'newsdata', 'index.json');
            
            // 確保後端目錄存在，但不輸出日誌
            const backendDirPath = path.dirname(backendFilePath);
            if (!fs.existsSync(backendDirPath)) {
                fs.mkdirSync(backendDirPath, { recursive: true });
            }
            
            // 儲存到前端路徑
            try {
                fs.writeFileSync(frontendFilePath, JSON.stringify(combinedData, null, 2), 'utf-8');
                console.log("✅ 資料已儲存至前端:", frontendFilePath);
            } catch (error) {
                console.error(`❌ 儲存到前端路徑失敗: ${error.message}`);
            }
            
            // 儲存到後端路徑
            try {
                fs.writeFileSync(backendFilePath, JSON.stringify(combinedData, null, 2), 'utf-8');
                console.log("✅ 資料已儲存至後端:", backendFilePath);
            } catch (error) {
                console.error(`❌ 儲存到後端路徑失敗: ${error.message}`);
            }
        } else {
            console.error("❌ 沒有可用的指數資料");
        }

    } catch (error) {
        console.error("❌ 程序執行失敗:", error.message);
    }
}

// 執行程式
combineAndSaveIndexes();