import { chromium } from 'playwright';
import path from 'path';

async function testDownload() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Navigating to video page...');
  await page.goto('https://www.pexels.com/video/flashing-light-at-night-12771795/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Clicking Free Download button...');
  const [ download ] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('a[href*="/download/video/"]')
  ]);

  const savePath = 'C:/Users/majji/quran_video_studio/assets/visuals/broll/pexels_downloaded.mp4';
  await download.saveAs(savePath);
  console.log('Downloaded successfully to:', savePath);

  await browser.close();
}

testDownload().catch(console.error);
