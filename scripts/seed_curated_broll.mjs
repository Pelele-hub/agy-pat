import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BROLL_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'broll');

if (!fs.existsSync(BROLL_DIR)) {
  fs.mkdirSync(BROLL_DIR, { recursive: true });
}

const THEMES = [
  { name: 'rain_window', query: 'rain window night' },
  { name: 'night_sky', query: 'dark night starry sky' },
  { name: 'ocean_night', query: 'nocturnal ocean waves' }
];

async function seed() {
  console.log('[Seed] Launching browser to seed curated B-roll library...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  for (const item of THEMES) {
    const targetFile = path.join(BROLL_DIR, `${item.name}.mp4`);
    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 1000000) {
      console.log(`[Seed] ${item.name}.mp4 already exists, skipping.`);
      continue;
    }

    console.log(`\n[Seed] Searching Pexels for "${item.query}"...`);
    const page = await context.newPage();
    const mediaUrls = [];
    page.on('response', res => {
      const u = res.url();
      if (u.includes('.mp4') && (u.includes('video-files') || u.includes('1080') || u.includes('uhd') || u.includes('hd'))) {
        mediaUrls.push(u);
      }
    });

    try {
      const url = `https://www.pexels.com/search/videos/${encodeURIComponent(item.query)}/?orientation=portrait`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      // Find first video link
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/video/"]'))
          .map(a => a.href)
          .filter(h => !h.includes('/search/'));
      });

      if (links.length > 0) {
        console.log(`[Seed] Navigating to ${links[0]}...`);
        await page.goto(links[0], { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);

        // Check LD JSON
        const directUrl = await page.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
          for (const s of scripts) {
            try {
              const j = JSON.parse(s.innerText);
              if (j['@type'] === 'VideoObject' && j.contentUrl) return j.contentUrl;
            } catch (e) {}
          }
          return null;
        });

        const chosenUrl = directUrl || mediaUrls[0];
        if (chosenUrl) {
          console.log(`[Seed] Found download link: ${chosenUrl.slice(0, 80)}...`);
          console.log(`[Seed] Downloading via curl to ${targetFile}...`);
          execSync(`curl.exe -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${chosenUrl}" -o "${targetFile}"`);
          console.log(`[Seed] Successfully seeded: ${item.name}.mp4`);
        } else {
          console.log(`[Seed] Warning: No direct URL found for ${item.name}`);
        }
      }
    } catch (err) {
      console.log(`[Seed] Error on ${item.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n[Seed] Finished seeding B-roll library.');
}

seed().catch(console.error);
