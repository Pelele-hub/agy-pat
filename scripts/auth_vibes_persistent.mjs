// scripts/auth_vibes_persistent.mjs - Robust Persistent Login with On-Screen Confirmation Button
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const PROFILE_DIR = path.join(CONFIG_DIR, 'vibes_chrome_profile');

[CONFIG_DIR, PROFILE_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const STORAGE_STATE_PATH = path.join(CONFIG_DIR, 'vibes_storage_state.json');
const COOKIES_JSON_PATH = path.join(CONFIG_DIR, 'vibes_cookies.json');

async function main() {
  console.log('================================================================');
  console.log(' VIBES.AI PERSISTENT LOGIN & SESSION CAPTURER');
  console.log(' Profile Directory:', PROFILE_DIR);
  console.log('================================================================\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: null,
    args: ['--start-maximized']
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://vibes.ai', { waitUntil: 'domcontentloaded' });

  // Function to inject floating banner with "I Am Logged In" button
  async function injectHelperBanner() {
    try {
      await page.evaluate(() => {
        if (document.getElementById('agy-login-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'agy-login-banner';
        banner.style.position = 'fixed';
        banner.style.top = '16px';
        banner.style.right = '16px';
        banner.style.zIndex = '99999999';
        banner.style.backgroundColor = '#18191a';
        banner.style.border = '2px solid #22c55e';
        banner.style.borderRadius = '12px';
        banner.style.padding = '14px 20px';
        banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.8)';
        banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        banner.style.color = '#ffffff';
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.gap = '14px';

        banner.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #22c55e;">Vibes.ai Studio Link</div>
            <div style="font-size: 12px; color: #a1a1aa;">Log in with Meta, then click:</div>
          </div>
          <button id="agy-save-btn" style="
            background-color: #22c55e;
            color: #000000;
            font-weight: 700;
            font-size: 13px;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
          ">✅ I'm Logged In - Save</button>
        `;

        document.body.appendChild(banner);

        document.getElementById('agy-save-btn').onclick = () => {
          window.__antigravity_saved = true;
          banner.innerHTML = `<span style="color: #22c55e; font-weight: bold; font-size: 14px;">🎉 Saved! Capturing session tokens...</span>`;
        };
      });
    } catch (e) {}
  }

  // Inject banner initially and on navigation
  await injectHelperBanner();
  page.on('load', injectHelperBanner);

  console.log('[Browser Ready] Injected on-screen confirmation button.');
  console.log('[Action Required] Once logged in on the screen, click the green "I\'m Logged In - Save" button at the top right.\n');

  // Wait for user to click button OR wait up to 4 minutes
  const startTime = Date.now();
  while (Date.now() - startTime < 4 * 60 * 1000) {
    await page.waitForTimeout(1500);
    await injectHelperBanner();

    const clicked = await page.evaluate(() => window.__antigravity_saved === true).catch(() => false);
    if (clicked) {
      console.log('[User Clicked] Button clicked! Extracting session...');
      break;
    }
  }

  // Capture everything
  await page.waitForTimeout(2000);
  const cookies = await context.cookies();
  const currentUrl = page.url();

  console.log(`[Captured] Current URL: ${currentUrl}`);
  console.log(`[Captured] Total Cookies: ${cookies.length}`);
  console.log('[Captured] Cookie Names:', cookies.map(c => c.name));

  await context.storageState({ path: STORAGE_STATE_PATH });
  fs.writeFileSync(COOKIES_JSON_PATH, JSON.stringify(cookies, null, 2), 'utf-8');

  console.log('\n================================================================');
  console.log(' SESSION SUCCESSFULLY CAPTURED & PERSISTED!');
  console.log(` Storage State: ${STORAGE_STATE_PATH}`);
  console.log(` Profile Saved: ${PROFILE_DIR}`);
  console.log('================================================================\n');

  await page.waitForTimeout(2000);
  await context.close();
  console.log('[Closed] Browser context closed cleanly.');
}

main().catch(err => {
  console.error('[Error in persistent login]:', err);
  process.exit(1);
});
