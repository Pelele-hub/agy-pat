import { chromium } from 'playwright';
import path from 'path';

async function testArabic() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 350 } });
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0; padding: 0;
            width: 1080px; height: 350px;
            background: transparent;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Amiri Quran', serif;
          }
          .verse {
            color: #FFFFFF;
            font-size: 54px;
            text-align: center;
            line-height: 1.7;
            padding: 0 40px;
            text-shadow: 0 3px 18px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85);
            filter: drop-shadow(0 0 6px rgba(0,0,0,0.9));
          }
        </style>
      </head>
      <body>
        <div class="verse">يُدَبِّرُ ٱلْأَمْرَ مِنَ ٱلسَّمَآءِ إِلَى ٱلْأَرْضِ ثُمَّ يَعْرُجُ إِلَيْهِ</div>
      </body>
    </html>
  `;
  await page.setContent(html);
  await page.waitForTimeout(1200);
  const out = 'C:/Users/majji/quran_video_studio/reference_analysis/test_playwright_arabic.png';
  await page.screenshot({ path: out, omitBackground: true });
  console.log('Saved:', out);
  await browser.close();
}

testArabic().catch(console.error);
