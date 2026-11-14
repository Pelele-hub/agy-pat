// scripts/auth_vibes.mjs - Interactive Vibes.ai Login & Session Capturer
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const STORAGE_STATE_PATH = path.join(CONFIG_DIR, 'vibes_storage_state.json');
const COOKIES_JSON_PATH = path.join(CONFIG_DIR, 'vibes_cookies.json');

async function runLogin() {
  console.log('================================================================');
  console.log(' VIBES.AI INTERACTIVE LOGIN & SESSION CAPTURE');
  console.log(' Opening browser window... Please log in with your Meta account.');
  console.log(' The script will automatically detect and save your session!');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();
  await page.goto('https://vibes.ai', { waitUntil: 'domcontentloaded' });

  console.log('[Browser Ready] Navigated to https://vibes.ai');
  console.log('[Waiting for login...] Waiting for user to complete login in the opened browser window...\n');

  // Monitor cookies and page state until login is detected
  let authenticated = false;
  const maxWaitMs = 5 * 60 * 1000; // 5 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await page.waitForTimeout(3000);

    const cookies = await context.cookies();
    const cookieNames = cookies.map(c => c.name);

    // Look for key session indicators
    const hasMetaSession = cookies.some(c => c.name.toLowerCase().includes('meta_session') || c.name.toLowerCase().includes('session'));
    const hasAuthCookie = cookies.some(c => c.name === 'c_user' || c.name === 'datr' || c.name === 'meta_session');
    const currentUrl = page.url();

    // Check if user is logged in
    if (hasMetaSession || (cookies.length >= 5 && (currentUrl.includes('/create') || currentUrl.includes('/feed') || currentUrl.includes('/home') || hasAuthCookie))) {
      console.log(`[Session Detected!] Found ${cookies.length} cookies:`, cookieNames);
      
      // Save full storage state (cookies + localStorage)
      await context.storageState({ path: STORAGE_STATE_PATH });
      fs.writeFileSync(COOKIES_JSON_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
      
      console.log(`\n================================================================`);
      console.log(' LOGIN SUCCESSFUL! Session state captured.');
      console.log(` Storage State: ${STORAGE_STATE_PATH}`);
      console.log(` Cookies Saved: ${COOKIES_JSON_PATH}`);
      console.log('================================================================\n');

      authenticated = true;
      break;
    }
  }

  if (!authenticated) {
    // If timeout, still save whatever cookies are present before closing
    const cookies = await context.cookies();
    if (cookies.length > 0) {
      await context.storageState({ path: STORAGE_STATE_PATH });
      fs.writeFileSync(COOKIES_JSON_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
      console.log(`[Timeout/Partial] Saved ${cookies.length} captured cookies to ${COOKIES_JSON_PATH}`);
    }
  }

  // Keep open for 3 seconds so user sees it succeeded
  await page.waitForTimeout(3000);
  await browser.close();
  console.log('[Browser Closed] Authentication capture process completed.');
}

runLogin().catch(err => {
  console.error('[Error during login capture]:', err);
  process.exit(1);
});
