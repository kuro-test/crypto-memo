const axios = require('axios');
const cheerio = require('cheerio');

async function testAltcoinMonthIndex() {
    try {
        console.log("🔄 開始測試爬蟲...");
        
        const response = await axios.get('https://www.blockchaincenter.net/en/altcoin-season-index/');
        const $ = cheerio.load(response.data);
        
        // 使用標題文字來定位正確的區塊
        const monthSection = $('h3:contains("Altcoin Month Index")').closest('.col-12');
        
        // 抓取所需資訊
        const indexValue = monthSection.find('div[style*="font-size:88px"][style*="color:#345C99"]').text().trim();
        const title = monthSection.find('h3.text-center').text().trim();
        const status = monthSection.find('div.text-center.m-3').clone().children().remove().end().text().trim();
        const tooltip = "If 75% of the Top 50 coins performed better than Bitcoin over the last 30 days it is Altcoin Month";
        
        // 輸出除錯資訊
        console.log("🔍 目標元素：", {
            標題: title,
            值: indexValue,
            狀態: status,
            提示: tooltip
        });
        
        if (indexValue) {
            console.log("\n✅ 爬蟲成功！");
            
            // 建立 Unix Timestamp
            const timestamp = Math.floor(Date.now() / 1000);
            
            // 儲存結果
            const indexData = {
                id: "altcoin-month",
                data: {
                    timestamp: timestamp.toString(),
                    value: indexValue,
                    status: status,
                    title: title,
                    tooltip: tooltip
                }
            };
            
            console.log("\n📝 資料結構：", indexData);
            console.log("\n⏰ 時間戳記轉換對照：");
            console.log(`Unix Timestamp: ${timestamp}`);
            console.log(`日期時間: ${new Date(timestamp * 1000).toLocaleString("zh-TW")}`);
        } else {
            console.error("\n❌ 沒有找到指數值");
        }

    } catch (error) {
        console.error("❌ 爬蟲失敗：", error.message);
    }
}

// 執行測試
testAltcoinMonthIndex();