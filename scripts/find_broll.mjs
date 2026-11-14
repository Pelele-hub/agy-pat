import { chromium } from 'playwright';

async function findVideos() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const queries = ['ocean night waves', 'candle dark moody', 'misty mountains night'];
  const results = {};

  for (const q of queries) {
    const url = `https://www.pexels.com/search/videos/${encodeURIComponent(q)}/?orientation=portrait`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/video/"]'))
        .map(a => a.href)
        .filter(h => !h.includes('/search/'));
    });
    results[q] = links.slice(0, 3);
  }

  console.log('Results:', JSON.stringify(results, null, 2));
  await browser.close();
}

findVideos().catch(console.error);
