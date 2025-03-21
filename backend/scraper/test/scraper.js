const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://www.coindesk.com/';
const targetUrl = `${baseUrl}/latest-crypto-news`;

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
    console.error('An error occurred while fetching the news:', error);
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
      // 排除特定 div 標籤內的內容
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
    console.error(`An error occurred while fetching the news:${index + 1} ${url}`, error.message);
    return { time: 'N/A', author: 'N/A', contentDetail: '' };
  }
}

async function makeJson(news) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
   // 取得 scraper.js 所在的目錄路徑
  const scraperDir = path.dirname(__filename);
   // 組合完整的檔案路徑
  const filename = path.join(scraperDir, `news${timestamp}.json`);
  try {
    fs.writeFileSync(filename, JSON.stringify(news, null, 2), 'utf-8');
    console.log(`✅ 新聞資料已儲存至 ${filename}`);
  } catch (error) {
    console.error(`❌ 儲存 JSON 檔案時發生錯誤:`, error.message);
  }
}

async function newsCatch(count, makeJsonFile = false) {
  const news = await fetchNewsLinks(count);
  const response = await axios.get(targetUrl);
  const $ = cheerio.load(response.data);

  const categories = $('p.mb-4 > a.font-title.text-charcoal-600.uppercase');
  const title = $('h2.font-headline-xs.font-normal');
  const content = $('p.font-body.text-charcoal-600.mb-4');
  const timeAgo = $('span.font-metadata.text-color-charcoal-600.uppercase');

  const newsCatchData = [];
  for (let i = 0; i < count; i++) {
    newsCatchData[i] = {
      id: i + 1,
      url: news[i].url,
      categories: categories.eq(i).text().trim(),
      title: title.eq(i).text().trim(),
      content: content.eq(i).text().trim(),
      timeago: timeAgo.eq(i).text().trim(),
      ...news[i]
    };
  }

  if (makeJsonFile) {
    await makeJson(newsCatchData);
  }

  return newsCatchData;
}

newsCatch(10,true);
