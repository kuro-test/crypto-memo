require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

// 檢查 API Key 是否正確讀取
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ 未讀取到 API Key，請確認 .env 是否正確設置！");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

async function translateContent(content) {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const prompt = `請將以下英文內容翻譯成繁體中文：\n${content}`;
    const result = await chatSession.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error("❌ 翻譯失敗:", error.message);
    return null;
  }
}

async function generateSummary(translatedContent) {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const prompt = `請幫我總結以下內容的重點摘要（300字以內）：\n\n${translatedContent}`;
    const result = await chatSession.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error("❌ 摘要生成失敗:", error.message);
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    // 讀取原始 JSON 檔案
    const rawData = fs.readFileSync(__dirname + '/newsTest.json', 'utf8');
    const newsData = JSON.parse(rawData);

    // 翻譯每篇新聞
    for (const news of newsData) {
      console.log(`\n🔄 開始翻譯第 ${news.id} 篇新聞...`);
      
      console.log("🔄 開始翻譯標題...");
      const translatedTitle = await translateContent(news.title);
      
      console.log("🔄 開始翻譯簡介...");
      const translatedContent = await translateContent(news.content);
      
      console.log("🔄 開始翻譯文章內容...");
      const translatedDetail = await translateContent(news.contentDetail);
      
      // 按照順序添加翻譯內容
      news.titleZh = translatedTitle ? translatedTitle.replace(/\n$/, '') : null;
      news.contentZh = translatedContent ? translatedContent.replace(/\n$/, '') : null;
      news.detailZh = translatedDetail ? translatedDetail.replace(/\n$/, '') : null;
      
      // 生成摘要
      console.log("🔄 開始生成摘要...");
      const summary = await generateSummary(news.detailZh);
      news.summaryZh = summary ? summary.split('。').join('。\n') : null;

      console.log(`✅ 第 ${news.id} 篇新聞翻譯完成！`);
      
      // 如果不是最後一篇，等待 30 秒再處理下一篇
      if (news.id < newsData.length) {
        console.log("\n⏳ 等待 30 秒後開始下一篇...");
        await delay(30000);
      }
    }

    // 寫入新的 JSON 檔案
    fs.writeFileSync(
      __dirname + '/newsTestTranslate.json',
      JSON.stringify(newsData, null, 2),
      'utf8'
    );

    console.log("\n✅ 全部新聞翻譯及摘要完成！已產生 newsTestTranslate.json");
  } catch (error) {
    console.error("❌ 處理過程發生錯誤:", error.message);
  }
}

run();