// scripts/produce_quran_v2_video3.mjs - Production Engine for Video #3 (Series #3)
// Reciter: Sheikh Muhammad Siddiq Al-Minshawi (Murattal) | Surah 2:8 to 2:12 | Duration: 68.21s
// Category: grand_mosques | 8 Scenes (~8.53s per image) | 2 to 5 words per subtitle card with English translation
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

const FLOW_TOKEN_FILE = 'C:/Users/majji/.flow-mcp/token';
const FLOW_API_BASE = 'http://127.0.0.1:8787/api';

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
    throw new Error(`Google Flow is not ready or not in project: signedIn=${flow.signedIn}, inProject=${flow.inProject}`);
  }
  console.log(`[Flow Bridge] Connected! Plan: ${flow.plan} | Credits: ${flow.credits_remaining}`);
  return flow;
}

// 8 Grand Mosques Prompts tailored for vertical 9:16
const SCENE_PROMPTS = [
  "Cinematic vertical 9:16 low-angle shot of a majestic grand white marble mosque courtyard at dawn, polished mirror marble reflecting soft lavender sunrise clouds and glowing warm lanterns, tranquil, spiritual, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 serene perspective looking through intricate Islamic geometric marble arches toward a soaring illuminated minaret against a twilight sky, ethereal golden glow, peaceful, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 wide view of a magnificent grand mosque surrounded by calm reflective turquoise water fountains at golden hour sunset, warm ambient light, awe-inspiring tranquility, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 close-up architectural shot of elegant arabesque carved marble pillars and illuminated lanterns inside a peaceful prayer hall, soft morning light beams, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 high-angle view over majestic turquoise and gold domes of an ancient grand mosque emerging through soft dawn mist, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 dusk view of a breathtaking grand mosque with illuminated white domes reflected in perfectly still reflecting pool, deep indigo evening sky with crescent moon, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 wide shot looking down an endless colonnade of glowing marble arches inside a sacred sanctuary, soft golden hour sunlight casting geometric shadows, peaceful, 4k, clean frame, absolutely no watermarks, no logos, no text",
  "Cinematic vertical 9:16 ethereal twilight view of an illuminated grand mosque silhouette rising over tranquil desert dunes, radiant starfield in night sky, spiritual serenity, 4k, clean frame, absolutely no watermarks, no logos, no text"
];

// --- Subtitle Phrase Chunks (2 to 5 words) with Exact Timestamps & English Translation ---
// Slice window: 92.630s to 160.840s (Relative offset: 92.630s)
const PHRASE_CHUNKS = [
  // 2:8 (Part 1 - 4 words)
  {
    id: 'chunk_1',
    surah: 2, ayah: 8,
    arabic: 'وَمِنَ ٱلنَّاسِ مَن يَقُولُ',
    english: 'And of the people are some who say:',
    start: 0.000, end: 4.950
  },
  // 2:8 (Part 2 - 4 words)
  {
    id: 'chunk_2',
    surah: 2, ayah: 8,
    arabic: 'ءَامَنَّا بِٱللَّهِ وَبِٱلْيَوْمِ ٱلْـَٔاخِرِ',
    english: '"We believe in Allah and the Last Day,"',
    start: 4.950, end: 10.190
  },
  // 2:8 (Part 3 - 3 words)
  {
    id: 'chunk_3',
    surah: 2, ayah: 8,
    arabic: 'وَمَا هُم بِمُؤْمِنِينَ',
    english: 'yet they are not believers.',
    start: 10.190, end: 13.495
  },
  // 2:9 (Part 1 - 4 words)
  {
    id: 'chunk_4',
    surah: 2, ayah: 9,
    arabic: 'يُخَـٰدِعُونَ ٱللَّهَ وَٱلَّذِينَ ءَامَنُوا۟',
    english: 'They seek to deceive Allah and the believers,',
    start: 14.420, end: 19.980
  },
  // 2:9 (Part 2 - 4 words)
  {
    id: 'chunk_5',
    surah: 2, ayah: 9,
    arabic: 'وَمَا يَخْدَعُونَ إِلَّآ أَنفُسَهُمْ',
    english: 'yet they deceive none but themselves,',
    start: 19.980, end: 25.890
  },
  // 2:9 (Part 3 - 2 words)
  {
    id: 'chunk_6',
    surah: 2, ayah: 9,
    arabic: 'وَمَا يَشْعُرُونَ',
    english: 'though they do not realize it.',
    start: 25.890, end: 28.005
  },
  // 2:10 (Part 1 - 3 words)
  {
    id: 'chunk_7',
    surah: 2, ayah: 10,
    arabic: 'فِى قُلُوبِهِم مَّرَضٌۭ',
    english: 'In their hearts is a sickness,',
    start: 29.150, end: 33.698
  },
  // 2:10 (Part 2 - 3 words)
  {
    id: 'chunk_8',
    surah: 2, ayah: 10,
    arabic: 'فَزَادَهُمُ ٱللَّهُ مَرَضًۭا',
    english: 'so Allah has increased their sickness,',
    start: 33.698, end: 37.520
  },
  // 2:10 (Part 3 - 3 words)
  {
    id: 'chunk_9',
    surah: 2, ayah: 10,
    arabic: 'وَلَهُمْ عَذَابٌ أَلِيمٌۢ',
    english: 'and for them is a painful punishment,',
    start: 37.540, end: 41.940
  },
  // 2:10 (Part 4 - 3 words)
  {
    id: 'chunk_10',
    surah: 2, ayah: 10,
    arabic: 'بِمَا كَانُوا۟ يَكْذِبُونَ',
    english: 'for what they used to deny.',
    start: 41.940, end: 44.955
  },
  // 2:11 (Part 1 - 5 words)
  {
    id: 'chunk_11',
    surah: 2, ayah: 11,
    arabic: 'وَإِذَا قِيلَ لَهُمْ لَا تُفْسِدُوا۟',
    english: 'And when it is said to them: "Do not spread corruption,"',
    start: 45.870, end: 50.210
  },
  // 2:11 (Part 2 - 2 words)
  {
    id: 'chunk_12',
    surah: 2, ayah: 11,
    arabic: 'فِى ٱلْأَرْضِ',
    english: '"upon the earth,"',
    start: 50.210, end: 51.310
  },
  // 2:11 (Part 3 - 4 words)
  {
    id: 'chunk_13',
    surah: 2, ayah: 11,
    arabic: 'قَالُوٓا۟ إِنَّمَا نَحْنُ مُصْلِحُونَ',
    english: 'they say: "We are only peacemakers!"',
    start: 51.310, end: 57.055
  },
  // 2:12 (Part 1 - 4 words)
  {
    id: 'chunk_14',
    surah: 2, ayah: 12,
    arabic: 'أَلَآ إِنَّهُمْ هُمُ ٱلْمُفْسِدُونَ',
    english: 'Unquestionably, it is they who are the corrupters,',
    start: 57.940, end: 64.140
  },
  // 2:12 (Part 2 - 3 words)
  {
    id: 'chunk_15',
    surah: 2, ayah: 12,
    arabic: 'وَلَـٰكِن لَّا يَشْعُرُونَ',
    english: 'but they perceive it not.',
    start: 64.140, end: 67.035
  }
];

export async function runVideo3() {
  const timestamp = Date.now();
  const jobId = `quran_v2_minshawi_${timestamp}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const chosenCategory = 'grand_mosques';
  const totalDuration = 68.210; // 92.630s to 160.840s in Surah 2
  const imageCount = 8;         // 8 scenes -> ~8.526s per image
  const sceneDur = totalDuration / imageCount;

  console.log(`\n======================================================`);
  console.log(`[Quran Studio V2] PRODUCTION RUN #3`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Reciter: Sheikh Muhammad Siddiq Al-Minshawi (الشيخ محمد صديق المنشاوي)`);
  console.log(`Passage: Surah Al-Baqarah (2:8 - 2:12)`);
  console.log(`Duration: ${totalDuration.toFixed(2)}s (Strictly within 60s - 75s window)`);
  console.log(`Category: "${chosenCategory}" (Unified theme)`);
  console.log(`Visual Pacing: ${sceneDur.toFixed(2)}s per image (~8.5s per image)`);
  console.log(`Typography: 2 to 5 words at once + English translation`);
  console.log(`======================================================\n`);

  // --- Step 1: Pre-Flight Bridge Verification ---
  await verifyFlowBridge();

  // --- Step 2: Slice Master Audio ---
  console.log(`[Audio Engine] Slicing Surah 2 from 92.630s to 160.840s (${totalDuration.toFixed(2)}s)...`);
  const s2Mp3 = path.join(CHAPTERS_DIR, 'surah_2_reciter_9.mp3');
  if (!fs.existsSync(s2Mp3)) throw new Error(`Missing audio file: ${s2Mp3}`);

  const masterAudio = path.join(jobDir, 'continuous_master_audio.wav');
  execSync(`ffmpeg -y -ss 92.630 -i "${s2Mp3}" -t ${totalDuration.toFixed(3)} -ar 44100 -ac 2 -c:a pcm_s16le "${masterAudio}"`, { stdio: 'ignore' });
  console.log(`[Audio Engine] Master audio sliced: ${masterAudio}`);

  // --- Step 3: Render Typography Cards via Playwright ---
  console.log(`[Typography Engine] Launching Playwright to render 15 subtitle phrase cards...`);
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
  console.log(`[Typography Engine] All 15 subtitle phrase cards rendered!`);

  // --- Step 4: Generate 8 Scenes via Google Flow ---
  console.log(`\n[Flow Visuals] Preparing 8 prompts for category: "${chosenCategory}"...`);
  const token = getFlowToken();
  const projectName = `QuranV2_${timestamp}`;
  const scenesPayload = SCENE_PROMPTS.map(prompt => ({
    prompt,
    type: 'image',
    model: 'Nano Banana 2.1',
    aspect_ratio: '9:16',
    download_quality: 'original'
  }));

  console.log(`[Flow Visuals] Submitting batch of 8 scenes to Google Flow via MCP...`);
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

  console.log(`[Flow Visuals] Waiting for all 8 scenes to complete (safe timeout 15m)...`);
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
  console.log(`\n[Composite Engine] Constructing multi-layer filtergraph for 8 scenes (~8.53s each)...`);
  const phoneFrame = path.join(OVERLAYS_DIR, 'phone_frame_clean.png');
  const outputMp4 = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);
  const crossfadeDur = 0.35;

  // Lite Zoom profiles tuned for 8.53s slow motion
  const liteZoomProfiles = [
    { zoom: "min(1.0+0.00022*on,1.06)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.02*on" },
    { zoom: "min(1.01+0.00020*on,1.06)", x: "iw/2-(iw/zoom/2)-0.03*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "max(1.06-0.00020*on,1.01)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)-0.03*on" },
    { zoom: "min(1.01+0.00022*on,1.06)", x: "iw/2-(iw/zoom/2)+0.03*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.0+0.00020*on,1.06)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.02*on" },
    { zoom: "max(1.06-0.00022*on,1.01)", x: "iw/2-(iw/zoom/2)+0.04*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.01+0.00020*on,1.06)", x: "iw/2-(iw/zoom/2)-0.02*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.0+0.00022*on,1.06)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)-0.02*on" }
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
  // 1. Zoompan and crossfades for 8 scenes
  for (let i = 0; i < imageCount; i++) {
    const p = liteZoomProfiles[i];
    const fadeOutStart = (sceneDur - crossfadeDur).toFixed(3);
    const dFrames = Math.ceil(sceneDur * 30);
    f += `[${i}:v]scale=4320:7680:flags=lanczos,zoompan=z='${p.zoom}':d=${dFrames}:x='${p.x}':y='${p.y}':s=1080x1920:fps=30,setsar=1,trim=duration=${sceneDur.toFixed(3)},setpts=PTS-STARTPTS,fade=t=in:st=0:d=${crossfadeDur.toFixed(3)},fade=t=out:st=${fadeOutStart}:d=${crossfadeDur.toFixed(3)}[sc${i}];`;
  }

  // 2. Concat 8 scenes
  const scLabels = Array.from({ length: imageCount }, (_, i) => `[sc${i}]`).join('');
  f += `${scLabels}concat=n=${imageCount}:v=1:a=0[bg_concat];`;

  // 3. Film grain + subtle grading
  f += `[bg_concat]noise=alls=5:allf=t+u,eq=contrast=1.04:brightness=-0.01:saturation=0.97[bg_graded];`;

  // 4. Phone bezel overlay
  f += `[bg_graded][${maskIdx}:v]overlay=0:0[bg_bezeled];`;

  // 5. Chain 15 subtitle cards with exact onset/offset
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
  const thumb1 = path.join(OUTPUT_DIR, `${jobId}_ayah_2_8_mid.jpg`);
  const thumb2 = path.join(OUTPUT_DIR, `${jobId}_ayah_2_11_mid.jpg`);
  execSync(`ffmpeg -y -ss 8.0 -i "${outputMp4}" -vframes 1 -q:v 2 "${thumb1}"`, { stdio: 'ignore' });
  execSync(`ffmpeg -y -ss 53.0 -i "${outputMp4}" -vframes 1 -q:v 2 "${thumb2}"`, { stdio: 'ignore' });

  // --- Step 7: Update Progress State ---
  let state = { currentSurah: 2, nextAyah: 8, reciter: 'Sheikh Muhammad Siddiq Al-Minshawi', reciterId: 9, history: [] };
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch {}
  }
  state.currentSurah = 2;
  state.nextAyah = 13; // Next video will start from Ayah 13
  state.lastRunAt = new Date().toISOString();
  state.lastBatch = {
    surahRange: '2:8 -> 2:12',
    duration: totalDuration,
    category: chosenCategory,
    imageDuration: sceneDur,
    imageCount,
    outputMp4: path.basename(outputMp4),
    completedAt: new Date().toISOString()
  };
  state.history.push({
    start: '2:8',
    end: '2:12',
    duration: totalDuration.toFixed(2),
    category: chosenCategory,
    outputFile: path.basename(outputMp4),
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  console.log(`[State Tracker] Progress updated! Next Ayah is: 2:${state.nextAyah}`);

  return {
    success: true,
    jobId,
    outputMp4,
    totalDuration,
    renderSecs,
    nextAyah: 13,
    surahRange: '2:8 -> 2:12'
  };
}

// Run CLI directly if called
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runVideo3().then(res => {
    console.log(`\n🎉 Production Run #3 Finished Successfully! Output: ${res.outputMp4}`);
    process.exit(0);
  }).catch(err => {
    console.error('\n❌ Production Run #3 Failed:', err);
    process.exit(1);
  });
}
