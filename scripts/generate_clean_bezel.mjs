import { chromium } from 'playwright';
import path from 'path';

async function generateCleanBezel() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  const cleanBezelHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0; padding: 0;
            width: 1080px; height: 1920px;
            background: transparent;
            overflow: hidden;
          }
          .bezel {
            width: 1080px;
            height: 1920px;
            position: absolute;
            top: 0; left: 0;
            box-sizing: border-box;
            border-radius: 46px;
            box-shadow: 0 0 0 38px #000000;
          }
          .vignette {
            position: absolute;
            top: 0; left: 0;
            width: 1080px; height: 1920px;
            border-radius: 46px;
            box-shadow: inset 0 0 110px rgba(0, 0, 0, 0.60);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="bezel"></div>
        <div class="vignette"></div>
      </body>
    </html>
  `;
  await page.setContent(cleanBezelHtml);
  const outPath = 'C:/Users/majji/quran_video_studio/assets/overlays/phone_frame_clean.png';
  await page.screenshot({ path: outPath, omitBackground: true });
  console.log('Generated clean bezel overlay (NO WATERMARKS):', outPath);
  await browser.close();
}

generateCleanBezel().catch(console.error);
