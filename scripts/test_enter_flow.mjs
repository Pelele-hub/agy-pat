// scripts/test_enter_flow.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PROFILE_DIR = path.join(ROOT_DIR, 'config', 'google_chrome_profile');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function run() {
  console.log('[Test] Launching Chrome with dedicated profile...');
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
  });

  const page = context.pages()[0] || await context.newPage();
  console.log('[Test] Going to https://flow.google.com...');
  await page.goto('https://flow.google.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  console.log('[Test] Current URL:', page.url());

  // Click 'Créer avec Google Flow' or 'Essayer dans Google Flow' or 'New project'
  const btn = await page.$('button:has-text("Créer avec Google"), button:has-text("Essayer"), a:has-text("Créer avec Google"), button:has-text("New project"), a:has-text("New project")');
  if (btn) {
    console.log('[Test] Found button! Clicking it...');
    await btn.click();
    await page.waitForTimeout(6000);
  } else {
    console.log('[Test] No button found, checking all buttons...');
    const allBtns = await page.$$eval('button, a', els => els.map(e => ({ text: e.innerText.trim(), href: e.href })).filter(e => e.text));
    console.log(allBtns.slice(0, 10));
  }

  console.log('[Test] URL after click:', page.url());
  const screenshotPath = path.join(ROOT_DIR, 'output', 'flow_after_click.png');
  await page.screenshot({ path: screenshotPath });
  console.log('[Test] Screenshot saved to:', screenshotPath);

  // Check if we are inside project editor or projects list
  const state = await page.evaluate(() => {
    return {
      url: location.href,
      title: document.title,
      hasSlate: !!document.querySelector('[data-slate-editor="true"], .ProseMirror, [contenteditable="true"]'),
      bodySnippet: document.body.innerText.slice(0, 300)
    };
  });

  console.log('[Test] State:', JSON.stringify(state, null, 2));

  await context.close();
}

run().catch(console.error);
