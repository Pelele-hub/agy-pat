// scripts/test_playwright_flow_u1.mjs - Test Account u/1
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const PROFILE_DIR = path.join(CONFIG_DIR, 'google_chrome_profile');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function run() {
  console.log('[Autonomous Flow] Launching Playwright with /u/1/...');
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });

  const page = context.pages()[0] || await context.newPage();
  console.log('[Autonomous Flow] Navigating to https://flow.google.com/u/1/...');
  await page.goto('https://flow.google.com/u/1/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  console.log('[Autonomous Flow] Current URL:', page.url());
  const screenshotPath = path.join(ROOT_DIR, 'output', 'flow_u1_check.png');
  await page.screenshot({ path: screenshotPath });
  console.log('[Autonomous Flow] Screenshot saved to:', screenshotPath);

  // Check what buttons / elements exist
  const info = await page.evaluate(() => {
    return {
      title: document.title,
      url: location.href,
      textPreview: document.body.innerText.slice(0, 500),
      buttons: Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(Boolean).slice(0, 20)
    };
  });

  console.log('[Autonomous Flow] Page Info:', JSON.stringify(info, null, 2));

  await context.close();
}

run().catch(console.error);
