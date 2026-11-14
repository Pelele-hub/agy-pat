// fetch_consecutive_quran.mjs - Continuous Master Audio Slicer & Typography Generator (60s+ Multi-Verse & Multi-Surah Support)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT_DIR, 'assets', 'audio');
const CHAPTERS_DIR = path.join(AUDIO_DIR, 'chapters');

[AUDIO_DIR, CHAPTERS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      return resolve(dest);
    }
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status code ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

/**
 * Fetch and assemble continuous master audio & typography cards for an array of consecutive verses
 * @param {Array} verseList - Array of verse objects from quran_progress_tracker
 * @param {number} reciterId - Reciter ID (default 7 Mishari Rashid Alafasy)
 * @param {string} outputDir - Job output directory
 */
export async function fetchConsecutiveQuranBatch(verseList, reciterId = 7, outputDir = AUDIO_DIR) {
  if (!verseList || verseList.length === 0) {
    throw new Error('fetchConsecutiveQuranBatch: verseList cannot be empty');
  }

  const startVerse = verseList[0].verseKey;
  const endVerse = verseList[verseList.length - 1].verseKey;
  console.log(`\n======================================================`);
  console.log(`[Quran Continuous Studio] Processing Verses ${startVerse} to ${endVerse} (${verseList.length} verses)`);
  console.log(`Reciter ID: ${reciterId} (Mishari Rashid Alafasy)`);
  console.log(`======================================================\n`);

  // 1. Group verses by Surah to slice audio per chapter
  const surahGroups = [];
  let currentGroup = null;

  for (const v of verseList) {
    if (!currentGroup || currentGroup.surah !== v.surah) {
      currentGroup = {
        surah: v.surah,
        audioUrl: v.audioUrl,
        verses: [v]
      };
      surahGroups.push(currentGroup);
    } else {
      currentGroup.verses.push(v);
    }
  }

  // 2. Slice audio for each Surah segment
  const audioParts = [];
  for (let gIdx = 0; gIdx < surahGroups.length; gIdx++) {
    const group = surahGroups[gIdx];
    const surah = group.surah;
    const firstV = group.verses[0];
    const lastV = group.verses[group.verses.length - 1];

    const startSec = firstV.timestamp_from / 1000;
    const endSec = lastV.timestamp_to / 1000;
    const durSec = endSec - startSec;

    const chapterMp3Path = path.join(CHAPTERS_DIR, `surah_${surah}_reciter_${reciterId}.mp3`);
    console.log(`[Quran Audio] Verifying full Surah ${surah} audio (${group.audioUrl})...`);
    await downloadFile(group.audioUrl, chapterMp3Path);

    const partWav = path.join(outputDir, `part_surah_${surah}_${firstV.ayah}_to_${lastV.ayah}.wav`);
    const sliceCmd = `ffmpeg -y -ss ${startSec.toFixed(3)} -i "${chapterMp3Path}" -t ${durSec.toFixed(3)} -af "afade=t=in:st=0:d=0.03,afade=t=out:st=${Math.max(0, durSec - 0.05).toFixed(3)}:d=0.05" -c:a pcm_s16le "${partWav}"`;
    execSync(sliceCmd);
    audioParts.push(partWav);
  }

  // 3. Combine into continuous master audio
  const masterAudioPath = path.join(outputDir, `continuous_recitation_${verseList[0].surah}_${verseList[0].ayah}_${verseList.length}.wav`);
  if (audioParts.length === 1) {
    fs.copyFileSync(audioParts[0], masterAudioPath);
  } else {
    console.log(`[Quran Audio] Concatenating ${audioParts.length} Surah segments into master continuous audio...`);
    const inputs = audioParts.map(p => `-i "${p}"`).join(' ');
    const concatFilter = audioParts.map((_, i) => `[${i}:a]`).join('') + `concat=n=${audioParts.length}:v=0:a=1[a]`;
    execSync(`ffmpeg -y ${inputs} -filter_complex "${concatFilter}" -map "[a]" -c:a pcm_s16le "${masterAudioPath}"`);
  }

  // 4. Compute relative timeline and render Typography Cards using Playwright
  let runningTime = 0;
  const processedVerses = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 560 } });

  for (let i = 0; i < verseList.length; i++) {
    const v = verseList[i];
    const dur = v.duration;
    const relativeStart = runningTime;
    const relativeEnd = runningTime + dur;
    runningTime += dur;

    // Fetch Uthmanic Arabic text
    const textRes = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${v.verseKey}`).then(r => r.json());
    const verseText = textRes.verses?.[0]?.text_uthmani;
    if (!verseText) throw new Error(`Could not fetch Uthmanic text for ${v.verseKey}`);

    console.log(`[Quran] Verse ${v.verseKey} | Time: [${relativeStart.toFixed(2)}s -> ${relativeEnd.toFixed(2)}s] (Dur: ${dur.toFixed(2)}s)`);

    // Compute dynamic font size based on word count
    const words = verseText.split(/\s+/).length;
    let fontSize = 56;
    let lineHeight = 1.9;
    if (words > 18) {
      fontSize = 42;
      lineHeight = 1.75;
    } else if (words > 14) {
      fontSize = 46;
      lineHeight = 1.8;
    } else if (words > 10) {
      fontSize = 50;
      lineHeight = 1.85;
    }

    // Render Typography Card PNG
    const cardPng = path.join(outputDir, `verse_card_${v.surah}_${v.ayah}.png`);
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0; padding: 0;
              width: 1080px; height: 560px;
              background: transparent;
              display: flex; align-items: center; justify-content: center;
              font-family: 'Amiri Quran', serif;
            }
            .verse {
              color: #FFFFFF;
              font-size: ${fontSize}px;
              text-align: center;
              line-height: ${lineHeight};
              padding: 0 65px;
              text-shadow: 0 4px 26px rgba(0,0,0,0.98), 0 0 16px rgba(0,0,0,0.92);
              filter: drop-shadow(0 0 12px rgba(0,0,0,0.95));
            }
          </style>
        </head>
        <body>
          <div class="verse">${verseText}</div>
        </body>
      </html>
    `;
    await page.setContent(html);
    await page.waitForTimeout(400);
    await page.screenshot({ path: cardPng, omitBackground: true });

    processedVerses.push({
      surah: v.surah,
      ayah: v.ayah,
      verseKey: v.verseKey,
      text: verseText,
      startTime: relativeStart,
      endTime: relativeEnd,
      duration: dur,
      cardPng
    });
  }

  await browser.close();

  console.log(`[Quran Audio] Master audio assembled successfully: ${masterAudioPath} (${runningTime.toFixed(2)}s)`);

  return {
    startVerse,
    endVerse,
    totalDuration: runningTime,
    masterAudioPath,
    verses: processedVerses
  };
}

// Backward-compatible wrapper
export async function fetchConsecutiveQuran(surah = 1, startAyah = 1, count = 7, reciterId = 7, outputDir = AUDIO_DIR) {
  const { fetchChapterTimestamps } = await import('./quran_progress_tracker.mjs');
  const chapterData = await fetchChapterTimestamps(surah, reciterId);
  const verses = [];
  for (let i = 0; i < count; i++) {
    const a = startAyah + i;
    const vKey = `${surah}:${a}`;
    const ts = chapterData.timestamps.find(t => t.verse_key === vKey);
    if (ts) {
      verses.push({
        surah,
        ayah: a,
        verseKey: vKey,
        audioUrl: chapterData.audioUrl,
        timestamp_from: ts.timestamp_from,
        timestamp_to: ts.timestamp_to,
        duration: ts.duration / 1000
      });
    }
  }
  return fetchConsecutiveQuranBatch(verses, reciterId, outputDir);
}
