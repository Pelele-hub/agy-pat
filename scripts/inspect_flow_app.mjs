// scripts/inspect_flow_app.mjs
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://flow.google.com/about', { waitUntil: 'domcontentloaded' });
  const scripts = await page.$$eval('script[src]', els => els.map(e => e.src));
  console.log('Scripts found:', scripts.length);
  scripts.forEach(s => console.log('Script:', s));
  await browser.close();
}

main().catch(console.error);
