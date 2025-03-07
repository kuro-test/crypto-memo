const axios = require('axios');
const cheerio = require('cheerio');

const baseUrl = 'https://www.coindesk.com/';
const targetUrl = `${baseUrl}/latest-crypto-news`;

axios.get(targetUrl)
  .then(response => {
    const html = response.data;
    const $ = cheerio.load(html);

    // 選取包含時間資訊的 <span> 元素
    const spans = $('div.font-metadata.flex.gap-4.text-charcoal-600.flex-col.md\\:block span');
    console.log('匹配到的 span 數量：', spans.length);  // 預期是 2 個

    const time = spans
      .map((i, el) => $(el).text().trim())
      .get()
      .join(' ');
    console.log('time:', time);
  })
  .catch(err => {
    console.error('抓取網頁時發生錯誤：', err);
  });


