import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const mediaUrls = [];
  page.on('response', res => {
    const u = res.url();
    if (u.includes('.mp4') || u.includes('video-files') || u.includes('pexels.com/download/video/')) {
      mediaUrls.push(u);
    }
  });

  console.log('Navigating...');
  await page.goto('https://www.pexels.com/video/flashing-light-at-night-12771795/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const ldJson = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => {
        try { return JSON.parse(s.innerText); } catch(e) { return null; }
      });
    const downloadAnchors = Array.from(document.querySelectorAll('a'))
      .filter(a => a.href.includes('/download/video/') || a.href.includes('video-files') || (a.innerText || '').toLowerCase().includes('download'))
      .map(a => ({ text: a.innerText, href: a.href }));
    return { ldJson, downloadAnchors };
  });

  console.log('Intercepted media:', mediaUrls);
  console.log('Download anchors:', info.downloadAnchors);
  console.log('LD JSON:', JSON.stringify(info.ldJson, null, 2));

  await browser.close();
}

main().catch(console.error);
