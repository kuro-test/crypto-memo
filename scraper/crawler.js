const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const baseUrl = 'https://www.coindesk.com/';
const targetUrl = `${baseUrl}/latest-crypto-news`;

async function newsCatch(count) {
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

    const time = $('div.Noto_Sans_xs_Sans-400-xs.flex.gap-4.text-charcoal-600.flex-col.md\\:block span').map((i, el) => $(el).text().trim()).get().join(' ');
    const author = $('div.uppercase.Noto_Sans_xs_Sans-600-xs').text().trim();

    const contentDetail = [];
    $('div.py-8.mt-4.mb-8.border-y.border-solid.border-charcoal-50 h4, div.py-8.mt-4.mb-8.border-y.border-solid.border-charcoal-50 ul.unordered-list li, p, ul.unordered-list li, li[data-immersive-translate-walked]').each((i, el) => {
      if ($(el).is('p') && ($(el).closest('div.flex.flex-col').length || $(el).closest('div.column').length)) {
        return;
      }
      if ($(el).is('li')) {
        contentDetail.push(`• ${$(el).text().trim()}`);
      } else {
        contentDetail.push($(el).text().trim());
      }
    });

    return { time, author, contentDetail };
  } catch (error) {
    console.error(`An error occurred while fetching the news:${index + 1} ${url}`, error.message);
    return { time: 'N/A', author: 'N/A', contentDetail: [] };
  }
}

async function makeJson(news) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const filename = `news${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(news, null, 2), 'utf-8');
  console.log(`News data has been saved to ${filename}`);
}

async function newsCatchMain(count) {
  const news = await newsCatch(count);
  const response = await axios.get(targetUrl);
  const $ = cheerio.load(response.data);

  const categories = $('a.Noto_Sans.text-charcoal-600.text-xs.uppercase');
  const title = $('h2[class*="font-Noto_Sans"]');
  const content = $('p.font-Noto_Serif.text-color-charcoal-600.mb-4');
  const timeAgo = $('span.Noto_Sans_xs_Sans-400-xs');

  for (let i = 0; i < count; i++) {
    news[i] = {
      id: i + 1,
      url: news[i].url,
      categories: categories.eq(i).text().trim(),
      title: title.eq(i).text().trim(),
      content: content.eq(i).text().trim(),
      timeago: timeAgo.eq(i).text().trim(),
      ...news[i]
    };
  }

  await makeJson(news);
}

newsCatchMain(10);
