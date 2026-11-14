// scripts/download_mulk_broll.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BROLL_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'broll');

const TARGETS = [
  {
    name: 'mulk_scene_1_night_stars.mp4',
    query: 'night sky stars slow vertical',
    minDur: 15
  },
  {
    name: 'mulk_scene_2_candle.mp4',
    query: 'candle dark background slow flame vertical',
    minDur: 15
  },
  {
    name: 'mulk_scene_3_moon_clouds.mp4',
    query: 'moon night clouds slow vertical',
    minDur: 20
  },
  {
    name: 'mulk_scene_4_dark_sea.mp4',
    query: 'dark sea waves twilight slow vertical',
    minDur: 15
  },
  {
    name: 'mulk_scene_5_milky_way.mp4',
    query: 'milky way stars night celestial vertical',
    minDur: 20
  }
];

async function fetchVideo(target) {
  const destPath = path.join(BROLL_DIR, target.name);
  if (fs.existsSync(destPath)) {
    try {
      const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${destPath}"`).toString().trim());
      if (dur >= target.minDur) {
        console.log(`[B-Roll Cache] ${target.name} already exists (Duration: ${dur.toFixed(1)}s)`);
        return destPath;
      }
    } catch (e) {}
  }

  console.log(`\nSearching Pexels for "${target.query}"...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const url = `https://www.pexels.com/search/videos/${encodeURIComponent(target.query)}/?orientation=portrait`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const videoUrls = await page.evaluate(() => {
    const list = [];
    const videos = document.querySelectorAll('video source, video, a[href*="/download/video/"]');
    for (const v of videos) {
      if (v.src && v.src.startsWith('http')) list.push(v.src);
      if (v.href && v.href.includes('/download/video/')) list.push(v.href);
    }
    const articles = document.querySelectorAll('article a[href*="/video/"]');
    for (const a of articles) {
      const idMatch = a.href.match(/(\d+)\/?$/);
      if (idMatch) {
        list.push(`https://www.pexels.com/download/video/${idMatch[1]}/`);
      }
    }
    return [...new Set(list)];
  });

  await browser.close();
  console.log(`Found ${videoUrls.length} links for "${target.query}"`);

  for (const vUrl of videoUrls) {
    console.log(`Downloading: ${vUrl}`);
    try {
      execSync(`curl.exe -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${vUrl}" -o "${destPath}"`, { timeout: 60000 });
      const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${destPath}"`).toString().trim());
      if (dur >= 8) { // Good duration
        console.log(`[Success] Saved ${target.name} (Duration: ${dur.toFixed(1)}s)`);
        return destPath;
      }
    } catch (e) {
      console.log(`Failed link ${vUrl}: ${e.message}`);
    }
  }
  return null;
}

async function run() {
  for (const t of TARGETS) {
    await fetchVideo(t);
  }
}

run().catch(console.error);
