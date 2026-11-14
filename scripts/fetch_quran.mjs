// fetch_quran.mjs - Automated Quran Verse & Subtitle Fetcher (with Vector Calligraphy Renderer)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT_DIR, 'assets', 'audio');

const RECITERS = {
  alafasy: { name: 'Mishari Rashid Alafasy', folder: 'Alafasy_128kbps' },
  dossari: { name: 'Yasser Al-Dossari', folder: 'Yasser_Ad-Dussary_128kbps' },
  ghamadi: { name: 'Saad Al-Ghamdi', folder: 'Ghamadi_40kbps' },
  abdulbasit: { name: 'AbdulBaset AbdulSamad', folder: 'Abdul_Basit_Murattal_192kbps' },
  minshawi: { name: 'Mohamed Siddiq Al-Minshawi', folder: 'Minshawy_Murattal_128kbps' }
};

function pad3(num) {
  return String(num).padStart(3, '0');
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
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

function formatAssTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hStr = String(h);
  const mStr = String(m).padStart(2, '0');
  const sStr = s.toFixed(2).padStart(5, '0');
  return `${hStr}:${mStr}:${sStr}`;
}

export async function fetchQuranAsset(surah = 32, ayah = 5, reciterKey = 'alafasy', outputDir = AUDIO_DIR) {
  const reciter = RECITERS[reciterKey] || RECITERS.alafasy;
  const verseKey = `${surah}:${ayah}`;
  console.log(`\n[Quran] Fetching Surah ${surah}, Ayah ${ayah} (${reciter.name})...`);

  // 1. Fetch Uthmanic Text
  const uthmaniRes = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${verseKey}`).then(r => r.json());
  const verseText = uthmaniRes.verses?.[0]?.text_uthmani;
  if (!verseText) {
    throw new Error(`Could not fetch Uthmanic text for ${verseKey}`);
  }
  console.log(`[Quran] Text (Uthmani): ${verseText}`);

  // 2. Fetch Translation
  let translationText = '';
  try {
    const transRes = await fetch(`https://api.quran.com/api/v4/quran/translations/131?verse_key=${verseKey}`).then(r => r.json());
    translationText = transRes.translations?.[0]?.text?.replace(/<sup.*?<\/sup>/g, '') || '';
  } catch (e) {}

  // 3. Download Audio
  const audioFilename = `${pad3(surah)}${pad3(ayah)}_${reciterKey}.mp3`;
  const audioPath = path.join(outputDir, audioFilename);
  const audioUrl = `https://everyayah.com/data/${reciter.folder}/${pad3(surah)}${pad3(ayah)}.mp3`;
  console.log(`[Quran] Downloading recitation from: ${audioUrl}`);
  await downloadFile(audioUrl, audioPath);

  // 4. Measure duration
  const durOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
    { encoding: 'utf-8' }
  );
  const totalDuration = parseFloat(durOutput.trim());
  console.log(`[Quran] Audio Duration: ${totalDuration.toFixed(2)}s`);

  // 5. Detect pause points
  let pauseTimestamps = [];
  try {
    const silenceOutput = execSync(
      `ffmpeg -i "${audioPath}" -af "silencedetect=noise=-28dB:d=0.25" -f null NUL 2>&1`,
      { encoding: 'utf-8' }
    );
    const regex = /silence_start: ([\d.]+)/g;
    let match;
    while ((match = regex.exec(silenceOutput)) !== null) {
      const t = parseFloat(match[1]);
      if (t > 2.0 && t < (totalDuration - 2.0)) {
        pauseTimestamps.push(t);
      }
    }
  } catch (e) {}

  // 6. Partition text into phrase segments
  const words = verseText.trim().split(/\s+/);
  const segments = [];

  if (pauseTimestamps.length === 0) {
    if (words.length > 8) {
      const mid = Math.ceil(words.length / 2);
      const halfTime = totalDuration / 2;
      segments.push({
        start: 0.4,
        end: halfTime + 0.3,
        text: words.slice(0, mid).join(' ')
      });
      segments.push({
        start: halfTime + 0.4,
        end: Math.max(halfTime + 1, totalDuration - 0.4),
        text: words.slice(mid).join(' ')
      });
    } else {
      segments.push({
        start: 0.4,
        end: Math.max(2, totalDuration - 0.4),
        text: verseText
      });
    }
  } else {
    const splits = [0, ...pauseTimestamps, totalDuration];
    const wordsPerSegment = Math.ceil(words.length / (splits.length - 1));
    for (let i = 0; i < splits.length - 1; i++) {
      const sStart = i === 0 ? 0.4 : splits[i] + 0.3;
      const sEnd = splits[i + 1] - 0.2;
      const segWords = words.slice(i * wordsPerSegment, (i + 1) * wordsPerSegment).join(' ');
      if (segWords.trim()) {
        segments.push({
          start: sStart,
          end: sEnd,
          text: segWords
        });
      }
    }
  }

  // 7. Render Authentic Vector Calligraphy Cards for each segment using Chromium HarfBuzz
  console.log(`[Quran] Rendering pixel-perfect Arabic typography cards (${segments.length} segments)...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 350 } });

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segPngPath = path.join(outputDir, `${pad3(surah)}${pad3(ayah)}_seg_${i}.png`);
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0; padding: 0;
              width: 1080px; height: 350px;
              background: transparent;
              display: flex; align-items: center; justify-content: center;
              font-family: 'Amiri Quran', serif;
            }
            .verse {
              color: #FFFFFF;
              font-size: 54px;
              text-align: center;
              line-height: 1.7;
              padding: 0 40px;
              text-shadow: 0 3px 18px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85);
              filter: drop-shadow(0 0 6px rgba(0,0,0,0.9));
            }
          </style>
        </head>
        <body>
          <div class="verse">${seg.text}</div>
        </body>
      </html>
    `;
    await page.setContent(html);
    await page.waitForTimeout(600);
    await page.screenshot({ path: segPngPath, omitBackground: true });
    seg.pngPath = segPngPath;
    console.log(`[Quran] Generated typography card: ${segPngPath}`);
  }
  await browser.close();

  return {
    surah,
    ayah,
    verseKey,
    reciter: reciter.name,
    verseText,
    translationText,
    duration: totalDuration,
    audioPath,
    segments
  };
}

if (process.argv[1] && process.argv[1].endsWith('fetch_quran.mjs')) {
  fetchQuranAsset(32, 5, 'alafasy')
    .then(r => console.log('Finished:', r.segments))
    .catch(console.error);
}
