// scripts/download_calm_broll.mjs
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BROLL_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'broll');

// Target queries:
// 1. "candle flame dark room"
// 2. "foggy trees misty forest slow"
// 3. "calm night sea dark"
// 4. "clouds night moon slow"

async function fetchPexelsVertical(query, filename) {
  console.log(`\nSearching Pexels for: "${query}"...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const url = `https://www.pexels.com/search/videos/${encodeURIComponent(query)}/?orientation=portrait`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Extract video download links or video element sources
  const videoUrls = await page.evaluate(() => {
    const list = [];
    const videos = document.querySelectorAll('video source, video, a[href*="/download/video/"]');
    for (const v of videos) {
      if (v.src && v.src.startsWith('http')) list.push(v.src);
      if (v.href && v.href.includes('/download/video/')) list.push(v.href);
    }
    // Also check article links
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
  console.log(`Found ${videoUrls.length} potential links for "${query}"`);

  // Download the first working vertical video
  const destPath = path.join(BROLL_DIR, filename);
  for (const vUrl of videoUrls) {
    console.log(`Attempting download from: ${vUrl}`);
    try {
      execSync(`curl.exe -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${vUrl}" -o "${destPath}"`, { timeout: 45000 });
      // Check if file is valid mp4 and has duration > 5s
      const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${destPath}"`).toString().trim());
      if (dur >= 4) {
        console.log(`Successfully downloaded ${filename} (Duration: ${dur.toFixed(2)}s)!`);
        return destPath;
      }
    } catch (e) {
      console.log(`Failed with link ${vUrl}: ${e.message}`);
    }
  }
  return null;
}

async function run() {
  await fetchPexelsVertical('candle dark slow', 'calm_candle.mp4');
  await fetchPexelsVertical('misty forest fog slow', 'calm_forest_fog.mp4');
  await fetchPexelsVertical('calm night lake reflection', 'calm_night_lake.mp4');
}

run().catch(console.error);
