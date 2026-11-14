// scripts/test_playwright_flow.mjs - Test Autonomous Flow Creation
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
  console.log('[Autonomous Flow] Launching Playwright with saved profile...');
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: false, // Visible so we can inspect
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });

  const page = context.pages()[0] || await context.newPage();
  console.log('[Autonomous Flow] Navigating to https://flow.google.com...');
  await page.goto('https://flow.google.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  console.log('[Autonomous Flow] Current URL:', page.url());

  // Click 'New project' / 'Nouveau projet' if on /about or dashboard
  if (!page.url().includes('/project/')) {
    console.log('[Autonomous Flow] Finding New project button...');
    const btn = await page.$('button:has-text("New project"), button:has-text("Nouveau projet"), a:has-text("New project"), a:has-text("Nouveau projet")');
    if (btn) {
      console.log('[Autonomous Flow] Clicking New project button...');
      await btn.click();
      await page.waitForTimeout(5000);
    }
  }

  console.log('[Autonomous Flow] Project Page URL:', page.url());
  const screenshotPath = path.join(ROOT_DIR, 'output', 'flow_project_check.png');
  await page.screenshot({ path: screenshotPath });
  console.log('[Autonomous Flow] Screenshot saved to:', screenshotPath);

  // Inspect editor elements
  const info = await page.evaluate(() => {
    const editors = Array.from(document.querySelectorAll('[data-slate-editor="true"], .ProseMirror, [contenteditable="true"], div[role="textbox"]'));
    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      type: b.type,
      aria: b.getAttribute('aria-label')
    })).filter(b => b.text || b.aria);

    return {
      editorsCount: editors.length,
      editorTags: editors.map(e => e.tagName + '.' + e.className),
      buttonsCount: buttons.length,
      buttons: buttons.slice(0, 15)
    };
  });

  console.log('[Autonomous Flow] Page Inspection:', JSON.stringify(info, null, 2));

  await context.close();
}

run().catch(console.error);
