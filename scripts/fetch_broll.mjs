import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BROLL_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'broll');

if (!fs.existsSync(BROLL_DIR)) {
  fs.mkdirSync(BROLL_DIR, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

export async function fetchBrollVideo(theme = 'night sky', filename = 'broll_active.mp4') {
  const destPath = path.join(BROLL_DIR, filename);
  console.log(`[B-Roll] Fetching 1080x1920 vertical cinematic footage for theme: "${theme}"...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 1600 }
  });
  const page = await context.newPage();

  // Also intercept direct media responses
  const interceptedUrls = [];
  page.on('response', res => {
    const u = res.url();
    if (u.includes('.mp4') && u.includes('video-files')) {
      interceptedUrls.push(u);
    }
  });

  try {
    const encodedTheme = encodeURIComponent(theme);
    const searchUrl = `https://www.pexels.com/search/videos/${encodedTheme}/?orientation=portrait`;
    console.log(`[B-Roll] Searching ${searchUrl}...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Dismiss cookies if needed
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 1500 }).catch(() => {});
    } catch (e) {}

    const videoPageLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/video/"]'));
      return [...new Set(anchors.map(a => a.href))].filter(h => !h.includes('/search/'));
    });

    if (videoPageLinks.length === 0) {
      throw new Error(`No video results found on Pexels for theme: ${theme}`);
    }

    console.log(`[B-Roll] Discovered ${videoPageLinks.length} candidate video pages.`);
    const targetVideoPage = videoPageLinks[0];
    console.log(`[B-Roll] Visiting candidate video: ${targetVideoPage}`);

    await page.goto(targetVideoPage, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Extract contentUrl from LD+JSON schema
    const directUrl = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        try {
          const json = JSON.parse(s.innerText);
          if (json['@type'] === 'VideoObject' && json.contentUrl) {
            return json.contentUrl;
          }
        } catch (e) {}
      }
      return null;
    });

    const finalVideoUrl = directUrl || interceptedUrls[0];
    if (!finalVideoUrl) {
      throw new Error('Failed to extract direct MP4 URL from Pexels video page.');
    }

    console.log(`[B-Roll] Direct MP4 Stream: ${finalVideoUrl}`);
    console.log(`[B-Roll] Downloading to: ${destPath}...`);
    await downloadFile(finalVideoUrl, destPath);
    console.log(`[B-Roll] Download completed successfully.`);

    await browser.close();
    return destPath;
  } catch (err) {
    await browser.close();
    console.error(`[B-Roll] Error:`, err.message);
    throw err;
  }
}

// CLI execution test
if (process.argv[1] && process.argv[1].endsWith('fetch_broll.mjs')) {
  const theme = process.argv[2] || 'night sky stars';
  fetchBrollVideo(theme, 'test_vertical_broll.mp4')
    .then(p => console.log('[B-Roll] Saved:', p))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
