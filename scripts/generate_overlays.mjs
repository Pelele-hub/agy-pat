import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OVERLAYS_DIR = path.join(ROOT_DIR, 'assets', 'overlays');

if (!fs.existsSync(OVERLAYS_DIR)) {
  fs.mkdirSync(OVERLAYS_DIR, { recursive: true });
}

async function generateAssets() {
  console.log('[Overlays] Launching Playwright to render vector graphics...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  // 1. Phone Frame Mask (Transparent center, black rounded border with smooth radius)
  const phoneMaskHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; width: 1080px; height: 1920px; background: transparent; overflow: hidden; }
          .bezel {
            width: 1080px;
            height: 1920px;
            position: absolute;
            top: 0; left: 0;
            box-sizing: border-box;
            border-radius: 46px;
            box-shadow: 0 0 0 40px #000000;
          }
          /* Subtle vignette around edges */
          .vignette {
            position: absolute;
            top: 0; left: 0;
            width: 1080px; height: 1920px;
            border-radius: 46px;
            box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.65);
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
  await page.setContent(phoneMaskHtml);
  const maskPath = path.join(OVERLAYS_DIR, 'phone_frame_mask.png');
  await page.screenshot({ path: maskPath, omitBackground: true });
  console.log(`[Overlays] Rendered: ${maskPath}`);

  // 2. Full HUD Overlay: Top-Left "BLUE NIGHT" logo & Bottom-Center Instagram/Facebook social pill
  const hudHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 1080px;
            height: 1920px;
            background: transparent;
            overflow: hidden;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }

          /* Top Left Blue Night Badge */
          .logo-badge {
            position: absolute;
            top: 60px;
            left: 56px;
            padding: 8px 18px 10px 18px;
            border: 2px solid rgba(80, 160, 255, 0.85);
            border-radius: 8px;
            background: rgba(10, 20, 35, 0.45);
            backdrop-filter: blur(8px);
            box-shadow: 0 0 15px rgba(45, 130, 255, 0.35), inset 0 0 10px rgba(45, 130, 255, 0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .logo-text-top {
            font-family: 'Montserrat', sans-serif;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 3px;
            line-height: 1.0;
            color: #FFFFFF;
            text-shadow: 0 0 10px rgba(100, 180, 255, 0.9);
          }
          .logo-text-bot {
            font-family: 'Montserrat', sans-serif;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 3px;
            line-height: 1.0;
            margin-top: 3px;
            color: #60B0FF;
            text-shadow: 0 0 12px rgba(80, 160, 255, 0.9);
          }

          /* Bottom Center Social Pill Badge */
          .social-pill {
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px 20px;
            border-radius: 20px;
            background: rgba(15, 20, 28, 0.55);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
          }
          .social-icon {
            width: 20px;
            height: 20px;
            fill: #FFFFFF;
          }
          .social-handle {
            color: #FFFFFF;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
          }
        </style>
      </head>
      <body>
        <div class="logo-badge">
          <div class="logo-text-top">BLUE</div>
          <div class="logo-text-bot">NIGHT</div>
        </div>

        <div class="social-pill">
          <!-- Instagram / Meta Icon SVG -->
          <svg class="social-icon" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span class="social-handle">ibluenight22</span>
        </div>
      </body>
    </html>
  `;
  await page.setContent(hudHtml);
  // Wait for Google font to render cleanly
  await page.waitForTimeout(1000);
  const hudPath = path.join(OVERLAYS_DIR, 'branding_hud.png');
  await page.screenshot({ path: hudPath, omitBackground: true });
  console.log(`[Overlays] Rendered: ${hudPath}`);

  await browser.close();
  console.log('[Overlays] Generation completed.');
}

generateAssets().catch(err => {
  console.error('[Overlays] Error:', err);
  process.exit(1);
});
