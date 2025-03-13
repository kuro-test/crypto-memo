require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 基本設定
const baseUrl = 'https://www.coindesk.com/';
const targetUrl = `${baseUrl}/latest-crypto-news`;

// Gemini API 設定
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

// 延遲函數
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 爬蟲相關函數
async function fetchNewsLinks(count) {
  try {
    const response = await axios.get(targetUrl);
    const $ = cheerio.load(response.data);

    const newsLinks = [];
    $('a.text-color-charcoal-900.mb-4.hover\\:underline').each((i, el) => {
      if (newsLinks.length >= count) return false;
      const relativeLink = $(el).attr('href');
      if (relativeLink) {
        newsLinks.push(baseUrl + relativeLink);
      }
    });

    const newsDetails = [];
    for (let i = 0; i < count && i < newsLinks.length; i++) {
      const detail = await newsDetail(newsLinks[i], i);
      newsDetails.push({ url: newsLinks[i], ...detail });
    }

    return newsDetails;
  } catch (error) {
    console.error('取得新聞連結時發生錯誤:', error);
  }
}

async function newsDetail(url, index) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const time = $('div.font-metadata.flex.gap-4.text-charcoal-600.flex-col.md\\:block span').map((i, el) => $(el).text().trim()).get().join(' ');
    const author = $('div.font-metadata.uppercase').text().trim();

    let contentDetail = '';
    $('div.py-8.mt-4.mb-8.border-y.border-solid.border-charcoal-50 h4, div.py-8.mt-4.mb-8.border-y.border-solid.border-charcoal-50 ul.unordered-list li, p, ul.unordered-list li, li[data-immersive-translate-walked]').each((i, el) => {
      if ($(el).closest('div.flex.flex-col').length || 
          $(el).closest('div.flexclear.flex-col').length || 
          $(el).closest('div.column').length) {
        return;
      }
      
      if ($(el).is('li')) {
        contentDetail += `• ${$(el).text().trim()}\n`;
      } else {
        contentDetail += `${$(el).text().trim()}\n`;
      }
    });

    return { time, author, contentDetail };
  } catch (error) {
    console.error(`爬取第 ${index + 1} 篇新聞時發生錯誤: ${url}`, error.message);
    return { time: 'N/A', author: 'N/A', contentDetail: '' };
  }
}

// 翻譯相關函數
async function translateContent(content) {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const prompt = `Translate the following English content into Traditional Chinese using the best possible option. Do not answer any questions other than the translation itself：\n${content}`;
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

// 主要執行函數
async function scraperTranslate(count) {
  try {
    console.log(`🔄 開始爬取 ${count} 篇新聞...`);
    const news = await fetchNewsLinks(count);
    const response = await axios.get(targetUrl);
    const $ = cheerio.load(response.data);

    const categories = $('p.mb-4 > a.font-title.text-charcoal-600.uppercase');
    const title = $('h2.font-headline-xs.font-normal');
    const content = $('p.font-body.text-charcoal-600.mb-4');
    const timeAgo = $('span.font-metadata.text-color-charcoal-600.uppercase');

    const newsData = [];
    for (let i = 0; i < count; i++) {
      newsData[i] = {
        id: i + 1,
        url: news[i].url,
        categories: categories.eq(i).text().trim(),
        title: title.eq(i).text().trim(),
        content: content.eq(i).text().trim(),
        timeago: timeAgo.eq(i).text().trim(),
        ...news[i]
      };
    }

    console.log("✅ 新聞爬取完成！開始翻譯...");

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
      
      console.log("🔄 開始生成摘要...");
      const summary = await generateSummary(news.detailZh);
      news.summaryZh = summary ? summary.split('。').join('。\n') : null;

      console.log(`✅ 第 ${news.id} 篇新聞翻譯完成！`);
      
      if (news.id < newsData.length) {
        console.log("\n⏳ 等待 10 秒後開始下一篇...");
        await delay(10000);
      }
    }

    // 儲存結果
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const filename = path.join(__dirname, `news${timestamp}.json`);
    
    fs.writeFileSync(filename, JSON.stringify(newsData, null, 2), 'utf-8');
    console.log(`\n✅ 全部完成！已產生 ${filename}`);
  } catch (error) {
    console.error("❌ 處理過程發生錯誤:", error.message);
  }
}

// 執行程式
scraperTranslate(10);