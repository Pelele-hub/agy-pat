// scripts/test_google_flow_session.mjs - Verify Google Flow Session and Save State
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const PROFILE_DIR = path.join(CONFIG_DIR, 'google_chrome_profile');
const STORAGE_STATE_PATH = path.join(CONFIG_DIR, 'google_flow_storage_state.json');
const COOKIES_JSON_PATH = path.join(CONFIG_DIR, 'google_flow_cookies.json');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  console.log('Testing Google Flow session from:', PROFILE_DIR);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ]
  });

  const cookies = await context.cookies();
  console.log(`Total cookies found in profile: ${cookies.length}`);
  const googleCookies = cookies.filter(c => c.domain.includes('google'));
  console.log(`Google cookies: ${googleCookies.length}`);

  // Save storage state
  await context.storageState({ path: STORAGE_STATE_PATH });
  fs.writeFileSync(COOKIES_JSON_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
  console.log(`Storage state saved to ${STORAGE_STATE_PATH}`);

  const page = context.pages()[0] || await context.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  console.log('Navigating to https://flow.google.com...');
  await page.goto('https://flow.google.com', { waitUntil: 'networkidle', timeout: 30000 });

  const currentUrl = page.url();
  const title = await page.title();
  console.log(`Current URL: ${currentUrl}`);
  console.log(`Page Title: ${title}`);

  const screenshotPath = path.join(ROOT_DIR, 'output', 'flow_session_check.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Check for PRO badge or New project button
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasPro = pageText.includes('PRO') || pageText.includes('Pro');
  const hasNewProject = pageText.includes('New project') || pageText.includes('Nouveau projet') || pageText.includes('Créer');
  console.log(`Has PRO badge: ${hasPro}`);
  console.log(`Has New Project button: ${hasNewProject}`);

  await context.close();
  console.log('Session test completed.');
}

main().catch(err => {
  console.error('Error testing session:', err);
  process.exit(1);
});
