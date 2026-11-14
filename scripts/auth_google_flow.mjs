// scripts/auth_google_flow.mjs - Launch Google Flow (Veo) with System Chrome & Capture Session
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const PROFILE_DIR = path.join(CONFIG_DIR, 'google_chrome_profile');

[CONFIG_DIR, PROFILE_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const STORAGE_STATE_PATH = path.join(CONFIG_DIR, 'google_flow_storage_state.json');
const COOKIES_JSON_PATH = path.join(CONFIG_DIR, 'google_flow_cookies.json');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  console.log('================================================================');
  console.log(' GOOGLE FLOW (VEO) LOGIN & SESSION CAPTURER');
  console.log(' Profile Directory:', PROFILE_DIR);
  console.log(' Using Official System Chrome:', CHROME_PATH);
  console.log('================================================================\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: false,
    viewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://flow.google.com', { waitUntil: 'domcontentloaded' });

  // Inject helper banner
  async function injectHelperBanner() {
    try {
      await page.evaluate(() => {
        if (document.getElementById('agy-google-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'agy-google-banner';
        banner.style.position = 'fixed';
        banner.style.top = '16px';
        banner.style.right = '16px';
        banner.style.zIndex = '99999999';
        banner.style.backgroundColor = '#18191a';
        banner.style.border = '2px solid #3b82f6';
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
            <div style="font-weight: 700; font-size: 14px; color: #3b82f6;">Google Flow (Veo) Link</div>
            <div style="font-size: 12px; color: #a1a1aa;">Sign in with your Google Pro account, then click:</div>
          </div>
          <button id="agy-google-save-btn" style="
            background-color: #3b82f6;
            color: #ffffff;
            font-weight: 700;
            font-size: 13px;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
          ">✅ I'm Logged In - Save</button>
        `;

        document.body.appendChild(banner);

        document.getElementById('agy-google-save-btn').onclick = () => {
          window.__antigravity_google_saved = true;
          banner.innerHTML = `<span style="color: #3b82f6; font-weight: bold; font-size: 14px;">🎉 Saved! Capturing Google Veo session...</span>`;
        };
      });
    } catch (e) {}
  }

  await injectHelperBanner();
  page.on('load', injectHelperBanner);

  console.log('[Browser Ready] Navigated to https://flow.google.com');
  console.log('[Action Required] Sign in with your Google Pro account and click "I\'m Logged In - Save" at the top right.\n');

  // Wait for user click up to 15 minutes
  const startTime = Date.now();
  const maxWait = 15 * 60 * 1000;
  while (Date.now() - startTime < maxWait) {
    await page.waitForTimeout(2000);
    await injectHelperBanner();

    const clicked = await page.evaluate(() => window.__antigravity_google_saved === true).catch(() => false);
    if (clicked) {
      console.log('[User Clicked] Button clicked! Capturing Google Flow session...');
      break;
    }
  }

  await page.waitForTimeout(2000);
  const cookies = await context.cookies();
  const currentUrl = page.url();

  console.log(`[Captured] Current URL: ${currentUrl}`);
  console.log(`[Captured] Total Cookies: ${cookies.length}`);

  await context.storageState({ path: STORAGE_STATE_PATH });
  fs.writeFileSync(COOKIES_JSON_PATH, JSON.stringify(cookies, null, 2), 'utf-8');

  console.log('\n================================================================');
  console.log(' GOOGLE FLOW SESSION CAPTURED & PERSISTED!');
  console.log(` Storage State: ${STORAGE_STATE_PATH}`);
  console.log(` Profile Saved: ${PROFILE_DIR}`);
  console.log('================================================================\n');

  await page.waitForTimeout(2000);
  await context.close();
  console.log('[Closed] Browser context closed cleanly.');
}

main().catch(err => {
  console.error('[Error in Google Flow auth]:', err);
  process.exit(1);
});
