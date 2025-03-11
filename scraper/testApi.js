require('dotenv').config({ path: __dirname + '/.env' });

const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

// 檢查 API Key 是否正確讀取
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ 未讀取到 API Key，請確認 .env 是否正確設置！");
  process.exit(1);
}

console.log("✅ 使用的 API Key:", apiKey);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function run() {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // `await` 只能在 `async function` 內使用
    const result = await chatSession.sendMessage("請用繁體中文回答：想要成為後端工程師需要具備什麼技能？");
    console.log("✅ AI 回應:", result.response.text());
  } catch (error) {
    console.error("❌ API 請求失敗:", error.message);
  }
}

// 確保 `run()` 在 async 環境內運行
run();