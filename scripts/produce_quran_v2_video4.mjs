// scripts/produce_quran_v2_video4.mjs - Production Engine for Video #2 of 10 (Series #4)
// Reciter: Sheikh Muhammad Siddiq Al-Minshawi (Murattal) | Surah 2:13 to 2:15 | Duration: 65.94s
// Category: al_madinah | 7 Scenes (~9.42s per image) | 2 to 5 words per subtitle card with English translation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');
const OVERLAYS_DIR = path.join(ROOT_DIR, 'assets', 'overlays');
const CHAPTERS_DIR = path.join(ROOT_DIR, 'assets', 'audio', 'chapters');
const STATE_FILE = path.join(JOBS_DIR, 'quran_v2_progress_state.json');
const QUEUE_FILE = path.join(JOBS_DIR, 'cloud_publish_queue.json');

const FLOW_TOKEN_FILE = 'C:/Users/majji/.flow-mcp/token';
const FLOW_API_BASE = 'http://127.0.0.1:8787/api';

const GITHUB_REPO = 'Pelele-hub/agy-pat';
const GITHUB_TOKEN_FILE = 'C:/Users/majji/.flow-mcp/github_token';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || (fs.existsSync(GITHUB_TOKEN_FILE) ? fs.readFileSync(GITHUB_TOKEN_FILE, 'utf-8').trim() : '');
const RELEASE_TAG = 'stock-videos';

[OUTPUT_DIR, JOBS_DIR, CHAPTERS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getFlowToken() {
  if (!fs.existsSync(FLOW_TOKEN_FILE)) {
    throw new Error(`Flow token not found at: ${FLOW_TOKEN_FILE}. Ensure flow-mcp is running.`);
  }
  return fs.readFileSync(FLOW_TOKEN_FILE, 'utf-8').trim();
}

async function verifyFlowBridge() {
  const token = getFlowToken();
  const res = await fetch(`${FLOW_API_BASE}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flow-token': token },
    body: JSON.stringify({ detailed: true })
  });
  if (!res.ok) throw new Error(`Flow bridge returned HTTP ${res.status}`);
  const data = await res.json();
  const flow = data.flow || {};
  if (!flow.signedIn || !flow.inProject) {
    throw new Error(`Google Flow is not ready: signedIn=${flow.signedIn}, inProject=${flow.inProject}`);
  }
  console.log(`[Flow Bridge] Connected! Plan: ${flow.plan} | Credits: ${flow.credits_remaining}`);
  return flow;
}

async function ghFetch(url, options = {}) {
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'QuranStudio-Uploader',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

async function uploadFile(uploadUrlTemplate, filePath, filename) {
  const uploadUrl = uploadUrlTemplate.replace(/\{.*\}/, `?name=${encodeURIComponent(filename)}`);
  const stats = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);

  console.log(`[Upload] Uploading ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)...`);
  const res = await ghFetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': stats.size.toString()
    },
    body: stream,
    duplex: 'half'
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed (${res.status}): ${err}`);
  }

  const asset = await res.json();
  console.log(`[Upload] ✓ Successfully uploaded! Permanent URL: ${asset.browser_download_url}`);
  return asset.browser_download_url;
}

// 7 Al-Madinah Prompts
const SCENE_PROMPTS = [
  "Cinematic vertical 9:16 serene view of Al-Madinah Al-Munawwarah giant shaded architectural umbrellas open in the courtyard at golden dawn, soft warm light, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 majestic perspective looking up at the illuminated minarets of the Prophet's Mosque at blue hour dusk, soft golden glowing lanterns, profound reverence and calm, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 peaceful panoramic view of the vast marble courtyard in Medina at sunrise, golden sun rays glistening across polished stone, serene, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 close-up of intricate gold Arabic calligraphy and green marble architectural motifs in Medina, soft ambient illumination, spiritual elegance, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 tranquil twilight view of Medina skyline with illuminated domes against a serene violet and amber sunset sky, peaceful atmosphere, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 early morning view across the quiet Medina marble plaza with morning mist kissing distant mountains, soft warm sunbeams, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 breathtaking low angle view of illuminated white and green domes of Medina under a tranquil starry night sky, ethereal golden glow, 4k, clean frame, absolutely no watermarks, no logos, no text"
];

// Subtitle Phrase Chunks (2 to 5 words)
// Slice window: 160.840s to 226.780s (Relative offset: 160.840s)
const PHRASE_CHUNKS = [
  // 2:13 (Part 1 - 4 words)
  {
    id: 'chunk_1',
    surah: 2, ayah: 13,
    arabic: 'وَإِذَا قِيلَ لَهُمْ ءَامِنُوا۟',
    english: 'And when it is said to them: "Believe,"',
    start: 0.000, end: 4.020
  },
  // 2:13 (Part 2 - 3 words)
  {
    id: 'chunk_2',
    surah: 2, ayah: 13,
    arabic: 'كَمَآ ءَامَنَ ٱلنَّاسُ',
    english: '"as the people have believed,"',
    start: 4.020, end: 8.190
  },
  // 2:13 (Part 3 - 2 words)
  {
    id: 'chunk_3',
    surah: 2, ayah: 13,
    arabic: 'قَالُوٓا۟ أَنُؤْمِنُ',
    english: 'they say: "Should we believe,"',
    start: 8.190, end: 11.140
  },
  // 2:13 (Part 4 - 3 words)
  {
    id: 'chunk_4',
    surah: 2, ayah: 13,
    arabic: 'كَمَآ ءَامَنَ ٱلسُّفَهَآءُ ۗ',
    english: '"as the foolish have believed?"',
    start: 11.140, end: 17.640
  },
  // 2:13 (Part 5 - 4 words)
  {
    id: 'chunk_5',
    surah: 2, ayah: 13,
    arabic: 'أَلَآ إِنَّهُمْ هُمُ ٱلسُّفَهَآءُ',
    english: 'Unquestionably, it is they who are the foolish,',
    start: 17.660, end: 25.540
  },
  // 2:13 (Part 6 - 3 words)
  {
    id: 'chunk_6',
    surah: 2, ayah: 13,
    arabic: 'وَلَـٰكِن لَّا يَعْلَمُونَ',
    english: 'but they do not know.',
    start: 25.540, end: 28.255
  },
  // 2:14 (Part 1 - 4 words)
  {
    id: 'chunk_7',
    surah: 2, ayah: 14,
    arabic: 'وَإِذَا لَقُوا۟ ٱلَّذِينَ ءَامَنُوا۟',
    english: 'And when they meet the believers,',
    start: 29.440, end: 33.600
  },
  // 2:14 (Part 2 - 2 words)
  {
    id: 'chunk_8',
    surah: 2, ayah: 14,
    arabic: 'قَالُوٓا۟ ءَامَنَّا',
    english: 'they say: "We believe;"',
    start: 33.600, end: 37.550
  },
  // 2:14 (Part 3 - 4 words)
  {
    id: 'chunk_9',
    surah: 2, ayah: 14,
    arabic: 'وَإِذَا خَلَوْا۟ إِلَىٰ شَيَـٰطِينِهِمْ',
    english: 'but when they are alone with their evil ones,',
    start: 37.570, end: 44.260
  },
  // 2:14 (Part 4 - 3 words)
  {
    id: 'chunk_10',
    surah: 2, ayah: 14,
    arabic: 'قَالُوٓا۟ إِنَّا مَعَكُمْ',
    english: 'they say: "Indeed, we are with you;"',
    start: 44.260, end: 48.484
  },
  // 2:14 (Part 5 - 3 words)
  {
    id: 'chunk_11',
    surah: 2, ayah: 14,
    arabic: 'إِنَّمَا نَحْنُ مُسْتَهْزِءُونَ',
    english: '"we were only mocking!"',
    start: 48.484, end: 54.575
  },
  // 2:15 (Part 1 - 3 words)
  {
    id: 'chunk_12',
    surah: 2, ayah: 15,
    arabic: 'ٱللَّهُ يَسْتَهْزِئُ بِهِمْ',
    english: 'Allah mocks at them,',
    start: 55.880, end: 59.700
  },
  // 2:15 (Part 2 - 3 words)
  {
    id: 'chunk_13',
    surah: 2, ayah: 15,
    arabic: 'وَيَمُدُّهُمْ فِى طُغْيَـٰنِهِمْ',
    english: 'and prolongs them in their transgression,',
    start: 59.700, end: 63.180
  },
  // 2:15 (Part 3 - 1 word)
  {
    id: 'chunk_14',
    surah: 2, ayah: 15,
    arabic: 'يَعْمَهُونَ',
    english: 'while they wander blindly.',
    start: 63.180, end: 64.795
  }
];

export async function runVideo4() {
  const timestamp = Date.now();
  const jobId = `quran_v2_minshawi_${timestamp}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const chosenCategory = 'al_madinah';
  const totalDuration = 65.940; // 160.840s to 226.780s in Surah 2
  const imageCount = 7;         // 7 scenes -> ~9.42s per image
  const sceneDur = totalDuration / imageCount;

  console.log(`\n======================================================`);
  console.log(`[Quran Studio V2] PRODUCTION RUN #4 (Video 2 of 10)`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Reciter: Sheikh Muhammad Siddiq Al-Minshawi (الشيخ محمد صديق المنشاوي)`);
  console.log(`Passage: Surah Al-Baqarah (2:13 - 2:15)`);
  console.log(`Duration: ${totalDuration.toFixed(2)}s (Strictly within 60s - 75s window)`);
  console.log(`Category: "${chosenCategory}" (Unified theme)`);
  console.log(`Visual Pacing: ${sceneDur.toFixed(2)}s per image (~9.4s per image)`);
  console.log(`Typography: 2 to 5 words at once + English translation`);
  console.log(`======================================================\n`);

  // --- Step 1: Pre-Flight Bridge Verification ---
  await verifyFlowBridge();

  // --- Step 2: Slice Master Audio ---
  console.log(`[Audio Engine] Slicing Surah 2 from 160.840s to 226.780s (${totalDuration.toFixed(2)}s)...`);
  const s2Mp3 = path.join(CHAPTERS_DIR, 'surah_2_reciter_9.mp3');
  if (!fs.existsSync(s2Mp3)) throw new Error(`Missing audio file: ${s2Mp3}`);

  const masterAudio = path.join(jobDir, 'continuous_master_audio.wav');
  execSync(`ffmpeg -y -ss 160.840 -i "${s2Mp3}" -t ${totalDuration.toFixed(3)} -ar 44100 -ac 2 -c:a pcm_s16le "${masterAudio}"`, { stdio: 'ignore' });
  console.log(`[Audio Engine] Master audio sliced: ${masterAudio}`);

  // --- Step 3: Render Typography Cards via Playwright ---
  console.log(`[Typography Engine] Launching Playwright to render 14 subtitle phrase cards...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 500 } });

  const cardFiles = [];
  for (let i = 0; i < PHRASE_CHUNKS.length; i++) {
    const chunk = PHRASE_CHUNKS[i];
    const cardPng = path.join(jobDir, `card_${i + 1}.png`);
    const arabicWords = chunk.arabic.split(/\s+/).length;
    let arFontSize = arabicWords <= 3 ? 56 : 48;
    let enFontSize = 24;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Plus+Jakarta+Sans:wght@500;600&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0; padding: 0;
              width: 1080px; height: 500px;
              background: transparent;
              display: flex; flex-direction: column;
              align-items: center; justify-content: center;
              box-sizing: border-box;
            }
            .arabic-text {
              font-family: 'Amiri Quran', serif;
              color: #FFFFFF;
              font-size: ${arFontSize}px;
              line-height: 1.8;
              text-align: center;
              padding: 0 70px;
              text-shadow: 0 4px 24px rgba(0, 0, 0, 0.98), 0 0 14px rgba(0, 0, 0, 0.92);
              filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.95));
            }
            .english-text {
              font-family: 'Plus Jakarta Sans', sans-serif;
              direction: ltr;
              color: #FDE68A;
              font-size: ${enFontSize}px;
              font-weight: 500;
              letter-spacing: 0.4px;
              line-height: 1.4;
              text-align: center;
              margin-top: 14px;
              padding: 0 90px;
              text-shadow: 0 2px 14px rgba(0, 0, 0, 0.98);
              filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.95));
            }
          </style>
        </head>
        <body>
          <div class="arabic-text">${chunk.arabic}</div>
          <div class="english-text">${chunk.english}</div>
        </body>
      </html>
    `;
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({ path: cardPng, omitBackground: true });
    cardFiles.push(cardPng);
  }
  await browser.close();
  console.log(`[Typography Engine] All 14 subtitle phrase cards rendered!`);

  // --- Step 4: Generate 7 Scenes via Google Flow ---
  console.log(`\n[Flow Visuals] Preparing 7 prompts for category: "${chosenCategory}"...`);
  const token = getFlowToken();
  const projectName = `QuranV2_${timestamp}`;
  const scenesPayload = SCENE_PROMPTS.map(prompt => ({
    prompt,
    type: 'image',
    model: 'Nano Banana 2.1',
    aspect_ratio: '9:16',
    download_quality: 'original'
  }));

  console.log(`[Flow Visuals] Submitting batch of 7 scenes to Google Flow via MCP...`);
  const genRes = await fetch(`${FLOW_API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flow-token': token },
    body: JSON.stringify({ project: projectName, scenes: scenesPayload })
  });

  if (!genRes.ok) {
    const errText = await genRes.text();
    throw new Error(`Flow generation submission failed (${genRes.status}): ${errText}`);
  }

  const genData = await genRes.json();
  const jobIds = (genData.jobs || []).map(j => j.id);
  console.log(`[Flow Visuals] Flow jobs submitted: ${jobIds.join(', ')}`);

  console.log(`[Flow Visuals] Waiting for all 7 scenes to complete (safe timeout 15m)...`);
  const startWait = Date.now();
  const maxWaitMs = 15 * 60 * 1000;
  let latestJobs = [];

  while (Date.now() - startWait < maxWaitMs) {
    const waitRes = await fetch(`${FLOW_API_BASE}/wait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-flow-token': token },
      body: JSON.stringify({ job_ids: jobIds, timeout_seconds: 30 })
    });
    if (waitRes.ok) {
      const waitData = await waitRes.json();
      latestJobs = waitData.jobs || [];
      const doneCount = latestJobs.filter(j => j.status === 'done').length;
      console.log(`[Flow Visuals] Progress: ${doneCount}/${imageCount} scenes finished.`);
      if (doneCount >= imageCount) break;
    }
    await sleep(2000);
  }

  const completedJobs = latestJobs.filter(j => j.status === 'done' && j.files && j.files.length > 0);
  if (completedJobs.length < imageCount) {
    throw new Error(`Flow generation incomplete: expected ${imageCount} images, got ${completedJobs.length}`);
  }

  const sceneImages = [];
  for (let i = 0; i < imageCount; i++) {
    const srcFile = completedJobs[i].files[0];
    const targetFile = path.join(jobDir, `scene_${i + 1}.jpeg`);
    fs.copyFileSync(srcFile, targetFile);
    sceneImages.push(targetFile);
    console.log(`[Flow Visuals] ✅ Scene ${i + 1} ready: ${targetFile}`);
  }

  // --- Step 5: Master FFmpeg Composite Pipeline ---
  console.log(`\n[Composite Engine] Constructing multi-layer filtergraph for 7 scenes (~9.42s each)...`);
  const phoneFrame = path.join(OVERLAYS_DIR, 'phone_frame_clean.png');
  const outputMp4 = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);
  const crossfadeDur = 0.35;

  const liteZoomProfiles = [
    { zoom: "min(1.0+0.00022*on,1.06)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.02*on" },
    { zoom: "min(1.01+0.00020*on,1.06)", x: "iw/2-(iw/zoom/2)-0.03*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "max(1.06-0.00020*on,1.01)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)-0.03*on" },
    { zoom: "min(1.01+0.00022*on,1.06)", x: "iw/2-(iw/zoom/2)+0.03*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.0+0.00020*on,1.06)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.02*on" },
    { zoom: "max(1.06-0.00022*on,1.01)", x: "iw/2-(iw/zoom/2)+0.04*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.01+0.00020*on,1.06)", x: "iw/2-(iw/zoom/2)-0.02*on", y: "ih/2-(ih/zoom/2)" }
  ];

  const inputArgs = [];
  for (let i = 0; i < imageCount; i++) {
    inputArgs.push('-loop', '1', '-t', (sceneDur + 1.0).toFixed(2), '-i', sceneImages[i]);
  }
  inputArgs.push('-i', phoneFrame);
  for (let i = 0; i < PHRASE_CHUNKS.length; i++) {
    inputArgs.push('-loop', '1', '-t', totalDuration.toFixed(2), '-i', cardFiles[i]);
  }
  inputArgs.push('-i', masterAudio);

  const maskIdx = imageCount;
  const cardStartIdx = imageCount + 1;
  const audioIdx = imageCount + 1 + PHRASE_CHUNKS.length;

  let f = '';
  for (let i = 0; i < imageCount; i++) {
    const p = liteZoomProfiles[i];
    const fadeOutStart = (sceneDur - crossfadeDur).toFixed(3);
    const dFrames = Math.ceil(sceneDur * 30);
    f += `[${i}:v]scale=4320:7680:flags=lanczos,zoompan=z='${p.zoom}':d=${dFrames}:x='${p.x}':y='${p.y}':s=1080x1920:fps=30,setsar=1,trim=duration=${sceneDur.toFixed(3)},setpts=PTS-STARTPTS,fade=t=in:st=0:d=${crossfadeDur.toFixed(3)},fade=t=out:st=${fadeOutStart}:d=${crossfadeDur.toFixed(3)}[sc${i}];`;
  }

  const scLabels = Array.from({ length: imageCount }, (_, i) => `[sc${i}]`).join('');
  f += `${scLabels}concat=n=${imageCount}:v=1:a=0[bg_concat];`;
  f += `[bg_concat]noise=alls=5:allf=t+u,eq=contrast=1.04:brightness=-0.01:saturation=0.97[bg_graded];`;
  f += `[bg_graded][${maskIdx}:v]overlay=0:0[bg_bezeled];`;

  const cardY = 760;
  let prevLayer = 'bg_bezeled';

  for (let i = 0; i < PHRASE_CHUNKS.length; i++) {
    const chunk = PHRASE_CHUNKS[i];
    const cardIdx = cardStartIdx + i;
    const layerName = i === PHRASE_CHUNKS.length - 1 ? 'v_final' : `layer_${i}`;
    const cardLabel = `card_fade_${i}`;

    const fadeInStart = Math.max(0, chunk.start - 0.05).toFixed(3);
    const fadeOutStart = Math.max(0, chunk.end - 0.20).toFixed(3);

    f += `[${cardIdx}:v]format=rgba,fade=t=in:st=${fadeInStart}:d=0.20:alpha=1,fade=t=out:st=${fadeOutStart}:d=0.20:alpha=1[${cardLabel}];`;
    f += `[${prevLayer}][${cardLabel}]overlay=0:${cardY}:enable='between(t,${chunk.start.toFixed(3)},${chunk.end.toFixed(3)})'[${layerName}];`;
    prevLayer = layerName;
  }

  let vcodec = 'libx264';
  let codecExtra = ['-preset', 'fast', '-crf', '18'];
  try {
    execSync('ffmpeg -f lavfi -i nullsrc=s=1080x1920 -t 0.1 -c:v h264_mf -f null NUL 2>NUL', { stdio: 'ignore' });
    vcodec = 'h264_mf';
    codecExtra = ['-b:v', '6500k'];
    console.log('[Encoder] Using Media Foundation hardware encoder (h264_mf)');
  } catch {
    console.log('[Encoder] Using software encoder (libx264)');
  }

  const ffmpegArgs = [
    '-y',
    ...inputArgs,
    '-filter_complex', f,
    '-map', '[v_final]',
    '-map', `${audioIdx}:a`,
    '-c:v', vcodec,
    ...codecExtra,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-t', totalDuration.toFixed(2),
    outputMp4
  ];

  console.log(`[Composite Engine] Rendering master composite video...`);
  const startRender = Date.now();
  await execFileAsync('ffmpeg', ffmpegArgs, { maxBuffer: 100 * 1024 * 1024 });
  const renderSecs = ((Date.now() - startRender) / 1000).toFixed(1);
  console.log(`[Composite Engine] ✅ Render complete in ${renderSecs}s! File: ${outputMp4}`);

  // --- Step 6: Thumbnails ---
  const thumb1 = path.join(OUTPUT_DIR, `${jobId}_ayah_2_13_mid.jpg`);
  const thumb2 = path.join(OUTPUT_DIR, `${jobId}_ayah_2_14_mid.jpg`);
  execSync(`ffmpeg -y -ss 12.0 -i "${outputMp4}" -vframes 1 -q:v 2 "${thumb1}"`, { stdio: 'ignore' });
  execSync(`ffmpeg -y -ss 40.0 -i "${outputMp4}" -vframes 1 -q:v 2 "${thumb2}"`, { stdio: 'ignore' });

  // --- Step 7: Upload to GitHub Releases Vault ---
  console.log(`[Vault Uploader] Uploading ${path.basename(outputMp4)} to GitHub Releases...`);
  const relRes = await ghFetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${RELEASE_TAG}`);
  const release = await relRes.json();
  const downloadUrl = await uploadFile(release.upload_url, outputMp4, path.basename(outputMp4));

  // --- Step 8: Update Cloud Publish Queue ---
  console.log(`[Cloud Queue] Enqueuing ${path.basename(outputMp4)} into cloud publish queue...`);
  const fullArabicText = 'وَإِذَا قِيلَ لَهُمْ ءَامِنُوا۟ كَمَآ ءَامَنَ ٱلنَّاسُ قَالُوٓا۟ أَنُؤْمِنُ كَمَآ ءَامَنَ ٱلسُّفَهَآءُ ۗ أَلَآ إِنَّهُمْ هُمُ ٱلسُّفَهَآءُ وَلَـٰكِن لَّا يَعْلَمُونَ ۝ وَإِذَا لَقُوا۟ ٱلَّذِينَ ءَامَنُوا۟ قَالُوٓا۟ ءَامَنَّا وَإِذَا خَلَوْا۟ إِلَىٰ شَيَـٰطِينِهِمْ قَالُوٓا۟ إِنَّا مَعَكُمْ إِنَّمَا نَحْنُ مُسْتَهْزِءُونَ ۝ ٱللَّهُ يَسْتَهْزِئُ بِهِمْ وَيَمُدُّهُمْ فِى طُغْيَـٰنِهِمْ يَعْمَهُونَ';
  const reelTitle = 'Surah Al-Baqarah (2:13 - 2:15)';
  const reelCaption = `${reelTitle}\n\n"${fullArabicText}"\n\nReciter: Sheikh Muhammad Siddiq Al-Minshawi (الشيخ محمد صديق المنشاوي) 🕊️✨\n\nRelax your heart and find peace in the words of the Almighty.\n\n#quran #minshawi #islam #relaxation #quranrecitation #peace #reels #shorts #tiktok`;

  const cloudQueue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  cloudQueue.items.push({
    id: `quran_v2_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    jobId: path.basename(outputMp4, '.mp4'),
    title: reelTitle,
    caption: reelCaption,
    videoFilename: path.basename(outputMp4),
    cloudVideoUrl: downloadUrl,
    surah: 2,
    engine: 'quran_v2_minshawi',
    status: 'pending',
    createdAt: new Date().toISOString(),
    publishedAt: null
  });
  cloudQueue.updatedAt = new Date().toISOString();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(cloudQueue, null, 2), 'utf-8');

  // --- Step 9: Update State Tracker ---
  let state = { currentSurah: 2, nextAyah: 13, reciter: 'Sheikh Muhammad Siddiq Al-Minshawi', reciterId: 9, history: [] };
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch {}
  }
  state.currentSurah = 2;
  state.nextAyah = 16; // Next is 2:16 onwards
  state.lastRunAt = new Date().toISOString();
  state.lastBatch = {
    surahRange: '2:13 -> 2:15',
    duration: totalDuration,
    category: chosenCategory,
    imageDuration: sceneDur,
    imageCount,
    outputMp4: path.basename(outputMp4),
    completedAt: new Date().toISOString()
  };
  state.history.push({
    start: '2:13',
    end: '2:15',
    duration: totalDuration.toFixed(2),
    category: chosenCategory,
    outputFile: path.basename(outputMp4),
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  console.log(`[State Tracker] Progress updated! Next Ayah is: 2:${state.nextAyah}`);

  // --- Step 10: Git Commit & Push ---
  console.log(`[Git Sync] Syncing updated queue & state to origin/main...`);
  try {
    execSync(`git add jobs/cloud_publish_queue.json jobs/quran_v2_progress_state.json scripts/produce_quran_v2_video4.mjs`, { cwd: ROOT_DIR });
    execSync(`git commit -m "feat: produce and queue Quran V2 Minshawi Video #4 (Surah 2:13-15) [skip ci]"`, { cwd: ROOT_DIR });
    execSync(`git push origin main`, { cwd: ROOT_DIR });
    console.log(`[Git Sync] ✓ Committed and pushed to GitHub!`);
  } catch (gitErr) {
    console.warn(`[Git Sync Notice]:`, gitErr.message);
  }

  return {
    success: true,
    jobId,
    outputMp4,
    downloadUrl,
    totalDuration,
    renderSecs,
    nextAyah: 16,
    surahRange: '2:13 -> 2:15'
  };
}

// Run CLI directly if called
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runVideo4().then(res => {
    console.log(`\n🎉 Production Run #4 Finished Successfully! Output: ${res.outputMp4}`);
    process.exit(0);
  }).catch(err => {
    console.error('\n❌ Production Run #4 Failed:', err);
    process.exit(1);
  });
}
