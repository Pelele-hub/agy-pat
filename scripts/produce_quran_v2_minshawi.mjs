// scripts/produce_quran_v2_minshawi.mjs - New Quran Workflow Engine
// Reciter: Sheikh Muhammad Siddiq Al-Minshawi (Murattal) | Surah 1:1 to 2:3 | Duration: 73.08s
// Single Category Thematic Visuals | 8s per Image with Lite Zoom | 2-5 Words at Once with English Translation
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
  console.log(`[Flow Bridge] Connected! Plan: ${flow.plan} | Credits: ${flow.credits_remaining} | Composer: ${flow.composer}`);
  return flow;
}

// --- Thematic Categories Engine ---
export const CATEGORY_POOLS = {
  cascading_waterfalls_rivers: [
    "Cinematic vertical 9:16 macro shot of a crystal clear turquoise mountain waterfall cascading gently over smooth mossy river rocks, soft morning sun rays piercing through mist, peaceful, tranquil, hyper-realistic, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 panoramic view of a wide serene winding river meandering through a lush green valley at golden hour sunset, calm gentle ripples reflecting the golden sky, peaceful water, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 slow-motion close-up of pure mountain spring water bubbling softly over jade-green riverbed pebbles, sun glints on the surface, tranquil zen atmosphere, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 majestic tiered waterfall in an enchanted bamboo and weeping willow forest at dawn, ethereal morning fog rising from the calm plunge pool, spiritual serenity, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 high-angle shot looking down at a tranquil crystal-clear turquoise river pool surrounded by ancient ferns and blooming water lilies, gentle sunlight filtering through trees, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 serene view of a calm river estuary at blue hour twilight, still reflective mirror water reflecting distant mountain silhouettes and a faint crescent moon, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 close-up of a gentle veil waterfall flowing softly like silk into an emerald forest pool, lush hanging vines and soft ambient morning light, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 peaceful winding stream flowing gracefully through a blooming wildflower alpine meadow at golden hour, crystal clear water, warm glowing sunlight, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 breathtaking view of a majestic mountain river winding between towering green forested cliffs at sunrise, radiant sunbeam ribbons across the water surface, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures"
  ],
  misty_forests_big_trees: [
    "Cinematic vertical 9:16 towering ancient redwood giant trees shrouded in soft rolling morning fog, ethereal golden sunbeams streaming through the lush green canopy, majestic, tranquil, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 slow low-angle perspective looking up at colossal emerald pine trees meeting the misty dawn sky, soft warm sunlight piercing the morning clouds, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 peaceful moss-covered forest path winding between ancient weeping willow trees, soft glowing ambient twilight, profound stillness, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 tranquil sun-dappled grove of giant birch trees in a quiet morning valley, soft dewdrops glistening on lush green ferns, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 panoramic view of an expansive ancient forest canopy rolling across misty mountain ridges at golden sunrise, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 intimate close-up of an ancient gnarly oak tree branch draped in soft emerald moss, gentle golden morning light illuminating dancing dust motes, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 serene deep pine forest at blue hour dusk with a quiet winding trail, peaceful cool twilight air, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 majestic cedar forest with ethereal sunbeam pillars illuminating a carpet of blooming wild mountain flowers, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 slow aerial drift looking over towering emerald evergreen trees kissed by soft morning mist, tranquil nature, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures"
  ]
};

// --- Subtitle Phrase Chunks (2 to 5 words) with Exact Timestamps & English Translation ---
// Mapped to Sheikh Muhammad Siddiq Al-Minshawi's vocal recitation
const PHRASE_CHUNKS = [
  // 1:1
  {
    id: 'chunk_1',
    surah: 1, ayah: 1,
    arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    english: 'In the Name of Allah—the Most Compassionate, Most Merciful',
    start: 0.020, end: 3.945
  },
  // 1:2
  {
    id: 'chunk_2',
    surah: 1, ayah: 2,
    arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
    english: 'All praise is for Allah—Lord of all worlds',
    start: 5.040, end: 9.695
  },
  // 1:3
  {
    id: 'chunk_3',
    surah: 1, ayah: 3,
    arabic: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    english: 'The Most Compassionate, Most Merciful',
    start: 10.840, end: 14.885
  },
  // 1:4
  {
    id: 'chunk_4',
    surah: 1, ayah: 4,
    arabic: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
    english: 'Master of the Day of Judgment',
    start: 15.280, end: 19.385
  },
  // 1:5
  {
    id: 'chunk_5',
    surah: 1, ayah: 5,
    arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    english: 'You alone we worship and You alone we ask for help',
    start: 19.510, end: 25.435
  },
  // 1:6
  {
    id: 'chunk_6',
    surah: 1, ayah: 6,
    arabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    english: 'Guide us along the Straight Path',
    start: 25.570, end: 30.640
  },
  // 1:7 (Part 1 - 4 words)
  {
    id: 'chunk_7',
    surah: 1, ayah: 7,
    arabic: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ',
    english: 'The path of those You have blessed',
    start: 30.770, end: 35.160
  },
  // 1:7 (Part 2 - 5 words)
  {
    id: 'chunk_8',
    surah: 1, ayah: 7,
    arabic: 'غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    english: 'not of those who earned Your anger, nor of those who are astray',
    start: 35.160, end: 43.485
  },
  // 2:1 (1 word)
  {
    id: 'chunk_9',
    surah: 2, ayah: 1,
    arabic: 'الٓمٓ',
    english: 'Alif-Lām-Mīm',
    start: 43.940, end: 50.460
  },
  // 2:2 (Part 1 - 4 words)
  {
    id: 'chunk_10',
    surah: 2, ayah: 2,
    arabic: 'ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ',
    english: 'This is the Book about which there is no doubt',
    start: 50.460, end: 54.000
  },
  // 2:2 (Part 2 - 2 words)
  {
    id: 'chunk_11',
    surah: 2, ayah: 2,
    arabic: 'هُدًۭى لِّلْمُتَّقِينَ',
    english: 'a guidance for those mindful of Allah',
    start: 54.000, end: 58.865
  },
  // 2:3 (Part 1 - 5 words)
  {
    id: 'chunk_12',
    surah: 2, ayah: 3,
    arabic: 'ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ',
    english: 'who believe in the unseen and establish prayer',
    start: 59.810, end: 66.790
  },
  // 2:3 (Part 2 - 3 words)
  {
    id: 'chunk_13',
    surah: 2, ayah: 3,
    arabic: 'وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ',
    english: 'and spend out of what We have provided for them',
    start: 66.790, end: 71.815
  }
];

export async function runNewQuranWorkflow(options = {}) {
  const timestamp = Date.now();
  const jobId = `quran_v2_minshawi_${timestamp}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const chosenCategory = options.category || 'cascading_waterfalls_rivers';
  const totalDuration = 73.080; // Total recitation length
  const imageCount = 9;         // 73.08 / 8.0 = 9 images (~8.12s each)
  const transitionDur = 0.300;  // 300ms seamless dissolve with zero dip-to-black
  const sceneDur = (totalDuration + (imageCount - 1) * transitionDur) / imageCount;

  console.log(`\n======================================================`);
  console.log(`[Quran Studio V2] INAUGURAL MASTER PRODUCTION RUN`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Reciter: Sheikh Muhammad Siddiq Al-Minshawi (الشيخ محمد صديق المنشاوي)`);
  console.log(`Recitation Style: Murattal (مرتل) | 100% Public Domain & Royalty Free`);
  console.log(`Passage: Surah Al-Fatihah (1:1 - 1:7) & Surah Al-Baqarah (2:1 - 2:3)`);
  console.log(`Duration: ${totalDuration.toFixed(2)}s (Strictly within 60s - 75s window)`);
  console.log(`Category: "${chosenCategory}" (All 9 scenes unified in one theme)`);
  console.log(`Visual Pacing: 8.0s per image with Lite Cinematic Zoom Effect`);
  console.log(`Typography: 2 to 5 Words at Once + Clean English Translation`);
  console.log(`======================================================\n`);

  // --- Step 1: Pre-Flight Bridge Verification ---
  await verifyFlowBridge();

  // --- Step 2: Slice & Concatenate Master Recitation Audio ---
  console.log(`[Audio Engine] Preparing continuous master audio...`);
  const s1Mp3 = path.join(CHAPTERS_DIR, 'surah_1_reciter_9.mp3');
  const s2Mp3 = path.join(CHAPTERS_DIR, 'surah_2_reciter_9.mp3');

  if (!fs.existsSync(s1Mp3) || !fs.existsSync(s2Mp3)) {
    throw new Error(`Required chapter audio files missing in ${CHAPTERS_DIR}`);
  }

  const s1Wav = path.join(jobDir, 's1_slice.wav');
  const s2Wav = path.join(jobDir, 's2_slice.wav');
  const masterAudio = path.join(jobDir, 'continuous_master_audio.wav');

  // Slice S1 (0.00s to 43.940s)
  execSync(`ffmpeg -y -ss 0.000 -i "${s1Mp3}" -t 43.940 -ar 44100 -ac 2 -c:a pcm_s16le "${s1Wav}"`, { stdio: 'ignore' });
  // Slice S2 (0.00s to 29.140s)
  execSync(`ffmpeg -y -ss 0.000 -i "${s2Mp3}" -t 29.140 -ar 44100 -ac 2 -c:a pcm_s16le "${s2Wav}"`, { stdio: 'ignore' });
  // Concat into single continuous master audio
  execSync(`ffmpeg -y -i "${s1Wav}" -i "${s2Wav}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" -ar 44100 -ac 2 -c:a pcm_s16le "${masterAudio}"`, { stdio: 'ignore' });

  console.log(`[Audio Engine] Master audio assembled: ${masterAudio} (${totalDuration.toFixed(2)}s)`);

  // --- Step 3: Render Typography Cards via Playwright (2 to 5 words + English) ---
  console.log(`[Typography Engine] Launching Playwright to render 13 subtitle phrase cards...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 500 } });

  const cardFiles = [];
  for (let i = 0; i < PHRASE_CHUNKS.length; i++) {
    const chunk = PHRASE_CHUNKS[i];
    const cardPng = path.join(jobDir, `card_${i + 1}.png`);
    
    // Dynamic Arabic font sizing
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
              color: #FDE68A; /* Soft warm amber gold */
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
    await page.waitForTimeout(400);
    await page.screenshot({ path: cardPng, omitBackground: true });
    cardFiles.push(cardPng);
  }
  await browser.close();
  console.log(`[Typography Engine] All 13 subtitle phrase cards rendered successfully!`);

  // --- Step 4: Generate 9 Thematic Scenes in Google Flow (Nano Banana 2.1) ---
  console.log(`\n[Flow Visuals] Preparing 9 prompts for category: "${chosenCategory}"...`);
  const prompts = CATEGORY_POOLS[chosenCategory].slice(0, imageCount);

  const token = getFlowToken();
  const projectName = `QuranV2_${timestamp}`;
  const scenesPayload = prompts.map(prompt => ({
    prompt,
    type: 'image',
    model: 'Nano Banana 2.1',
    aspect_ratio: '9:16',
    download_quality: 'original'
  }));

  console.log(`[Flow Visuals] Submitting batch of 9 scenes to Google Flow via MCP...`);
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

  console.log(`[Flow Visuals] Waiting for all 9 scenes to complete...`);
  const startWait = Date.now();
  const maxWaitMs = Math.max(900000, imageCount * 100000); // 15+ minutes safe timeout
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
  console.log(`\n[Composite Engine] Constructing multi-layer filtergraph...`);
  const phoneFrame = path.join(OVERLAYS_DIR, 'phone_frame_clean.png');
  const outputMp4 = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);

  const crossfadeDur = 0.35; // 350ms gentle soft crossfade between scenes

  // Lite Zoom profiles (alternating subtle camera motion)
  const liteZoomProfiles = [
    { zoom: "min(1.0+0.0003*on,1.08)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.03*on" },
    { zoom: "min(1.01+0.00025*on,1.08)", x: "iw/2-(iw/zoom/2)-0.05*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "max(1.08-0.00025*on,1.01)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)-0.04*on" },
    { zoom: "min(1.01+0.0003*on,1.08)", x: "iw/2-(iw/zoom/2)+0.04*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.0+0.00025*on,1.07)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.03*on" },
    { zoom: "max(1.08-0.0003*on,1.01)", x: "iw/2-(iw/zoom/2)+0.05*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.01+0.00025*on,1.08)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)-0.04*on" },
    { zoom: "min(1.0+0.0003*on,1.08)", x: "iw/2-(iw/zoom/2)-0.04*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "max(1.07-0.00025*on,1.01)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.03*on" }
  ];

  // Inputs:
  // 0..8: 9 scene images
  // 9: Phone frame
  // 10..22: 13 subtitle phrase cards
  // 23: Master audio
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
  // 1. Process 9 scenes with lite zoompan (Scene 0 starts IMMEDIATELY at full opacity - zero black pitch)
  const dFrames = Math.ceil(sceneDur * 30);
  for (let i = 0; i < imageCount; i++) {
    const p = liteZoomProfiles[i];
    f += `[${i}:v]scale=4320:7680:flags=lanczos,zoompan=z='${p.zoom}':d=${dFrames}:x='${p.x}':y='${p.y}':s=1080x1920:fps=30,setsar=1,trim=duration=${sceneDur.toFixed(3)},setpts=PTS-STARTPTS[sc${i}];`;
  }

  // 2. Cascade xfade transitions (True 300ms soft dissolve with zero black dip)
  let prevXf = 'sc0';
  let curOffset = sceneDur - transitionDur;
  for (let i = 1; i < imageCount; i++) {
    const outLabel = i === imageCount - 1 ? 'bg_concat' : `xf${i}`;
    f += `[${prevXf}][sc${i}]xfade=transition=fade:duration=${transitionDur.toFixed(3)}:offset=${curOffset.toFixed(3)}[${outLabel}];`;
    prevXf = outLabel;
    curOffset += sceneDur - transitionDur;
  }

  // 3. Film grain + subtle warm color grade
  f += `[bg_concat]noise=alls=5:allf=t+u,eq=contrast=1.04:brightness=-0.01:saturation=0.97[bg_graded];`;

  // 4. Clean phone frame overlay
  f += `[bg_graded][${maskIdx}:v]overlay=0:0[bg_bezeled];`;

  // 5. Chain 13 subtitle cards with millisecond vocal onset/offset and alpha fades
  const cardY = 760; // Centered lower third
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

  // Encoder configuration
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

  console.log(`[Composite Engine] Executing master FFmpeg render pipeline...`);
  const startRender = Date.now();
  await execFileAsync('ffmpeg', ffmpegArgs, { maxBuffer: 50 * 1024 * 1024 });
  const renderSecs = ((Date.now() - startRender) / 1000).toFixed(1);

  console.log(`\n======================================================`);
  console.log(`[Composite Engine] ✅ RENDER COMPLETE in ${renderSecs}s!`);
  console.log(`Output: ${outputMp4} (${(fs.statSync(outputMp4).size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`======================================================\n`);

  // --- Step 6: Extract Keyframe Thumbnails ---
  const thumb1 = path.join(OUTPUT_DIR, `${jobId}_ayah_1_1_mid.jpg`);
  const thumb2 = path.join(OUTPUT_DIR, `${jobId}_ayah_2_2_mid.jpg`);
  execSync(`ffmpeg -y -ss 2.00 -i "${outputMp4}" -vframes 1 -q:v 2 "${thumb1}"`, { stdio: 'ignore' });
  execSync(`ffmpeg -y -ss 52.00 -i "${outputMp4}" -vframes 1 -q:v 2 "${thumb2}"`, { stdio: 'ignore' });
  console.log(`[Thumbnails] Extracted:`);
  console.log(`   - Ayah 1:1: ${thumb1}`);
  console.log(`   - Ayah 2:2: ${thumb2}`);

  // --- Step 7: Update New Quran V2 Progress State & Queue ---
  const stateFile = path.join(JOBS_DIR, 'quran_v2_progress_state.json');
  try {
    let state = {};
    if (fs.existsSync(stateFile)) state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    state.currentSurah = 2;
    state.nextAyah = 4; // Resumes seamlessly from Surah 2, Ayah 4
    state.reciter = 'Sheikh Muhammad Siddiq Al-Minshawi';
    state.reciterId = 9;
    state.lastRunAt = new Date().toISOString();
    state.lastBatch = {
      surahRange: '1:1 -> 2:3',
      duration: totalDuration,
      category: chosenCategory,
      completedAt: new Date().toISOString()
    };
    if (!state.history) state.history = [];
    state.history.push({
      start: '1:1',
      end: '2:3',
      duration: totalDuration.toFixed(2),
      category: chosenCategory,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
    console.log(`[State Tracker] Updated quran_v2_progress_state.json: Next Ayah -> Surah 2, Ayah 4`);
  } catch (err) {
    console.warn(`[State Tracker] State save warning:`, err.message);
  }

  // Queue item
  const queueFile = path.join(JOBS_DIR, 'quran_v2_publish_queue.json');
  try {
    let queueData = { items: [] };
    if (fs.existsSync(queueFile)) queueData = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
    queueData.items.push({
      id: `quran_v2_${timestamp}`,
      jobId,
      title: 'Surah Al-Fatihah & Surah Al-Baqarah (1:1 - 2:3)',
      caption: `سورة الفاتحة وبداية سورة البقرة\n\nبِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ۝ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ ۝ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ۝ مَـٰلِكِ يَوْمِ ٱلدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ ۝ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ ۝ الٓمٓ ۝ ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ ۝ ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ\n\nReciter: Sheikh Muhammad Siddiq Al-Minshawi (الشيخ محمد صديق المنشاوي) 🕊️✨\n\n#quran #minshawi #alfatihah #baqarah #islam #peace #reels #shorts #tiktok`,
      videoFilename: path.basename(outputMp4),
      surahRange: '1:1 - 2:3',
      category: chosenCategory,
      engine: 'flow_v2_minshawi_thematic',
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    fs.writeFileSync(queueFile, JSON.stringify(queueData, null, 2), 'utf-8');
    console.log(`[Queue Manager] Registered into quran_v2_publish_queue.json`);
  } catch (qErr) {
    console.warn(`[Queue Manager] Queue save warning:`, qErr.message);
  }

  return {
    jobId,
    outputMp4,
    totalDuration,
    renderSecs,
    streamUrl: `http://localhost:5056/stream/${path.basename(outputMp4)}`,
    thumbnails: [thumb1, thumb2]
  };
}

if (process.argv[1] && process.argv[1].endsWith('produce_quran_v2_minshawi.mjs')) {
  runNewQuranWorkflow()
    .then(res => {
      console.log('\n🎉 NEW QURAN V2 PRODUCTION COMPLETE!');
      console.log(`📁 Local File:  file:///${res.outputMp4.replace(/\\/g, '/')}`);
      console.log(`▶️ Stream Link: ${res.streamUrl}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Production failed:', err);
      process.exit(1);
    });
}
