// scripts/create_extension_icons.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT_DIR, 'chrome_extension', 'icons');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 128, height: 128 });

  await page.setContent(`
    <html>
      <body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:128px;height:128px;">
        <div style="width:128px;height:128px;border-radius:28px;background:linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 16px rgba(0,0,0,0.3);">
          <span style="font-size:68px;color:#ffffff;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🌙</span>
        </div>
      </body>
    </html>
  `);

  await page.screenshot({ path: path.join(ICONS_DIR, 'icon128.png'), omitBackground: true });

  await page.setViewportSize({ width: 48, height: 48 });
  await page.setContent(`
    <html>
      <body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:48px;height:48px;">
        <div style="width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:26px;color:#ffffff;line-height:1;">🌙</span>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(ICONS_DIR, 'icon48.png'), omitBackground: true });

  await page.setViewportSize({ width: 16, height: 16 });
  await page.setContent(`
    <html>
      <body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:16px;height:16px;">
        <div style="width:16px;height:16px;border-radius:4px;background:#3b82f6;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:10px;color:#ffffff;line-height:1;">🌙</span>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(ICONS_DIR, 'icon16.png'), omitBackground: true });

  await browser.close();
  console.log('Icons generated successfully in', ICONS_DIR);
}

main().catch(console.error);
