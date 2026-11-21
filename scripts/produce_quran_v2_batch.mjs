// scripts/produce_quran_v2_batch.mjs - Production Workhorse for Quran V2 Minshawi Series
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

export const THEMATIC_CATEGORIES = {
  cascading_waterfalls_rivers: [
    "Cinematic vertical 9:16 macro shot of a crystal clear turquoise mountain waterfall cascading gently over smooth mossy river rocks, soft morning sun rays piercing through mist, peaceful, tranquil, hyper-realistic, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 panoramic view of a wide serene winding river meandering through a lush green valley at golden hour sunset, calm gentle ripples reflecting the golden sky, peaceful water, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 slow-motion close-up of pure mountain spring water bubbling softly over jade-green riverbed pebbles, sun glints on the surface, tranquil zen atmosphere, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 majestic tiered waterfall in an enchanted bamboo and weeping willow forest at dawn, ethereal morning fog rising from the calm plunge pool, spiritual serenity, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 high-angle shot looking down at a tranquil crystal-clear turquoise river pool surrounded by ancient ferns and blooming water lilies, gentle sunlight filtering through trees, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene view of a calm river estuary at blue hour twilight, still reflective mirror water reflecting distant mountain silhouettes and a faint crescent moon, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 close-up of a gentle veil waterfall flowing softly like silk into an emerald forest pool, lush hanging vines and soft ambient morning light, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 drone shot flying smoothly over a roaring crystal clear alpine river cutting through lush emerald moss canyons at sunrise, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene hidden waterfall pouring into a deep turquoise grotto pool, soft sunbeams filtering through cave opening, peaceful tranquility, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 wide peaceful sunset over a tranquil river bend lined with flowering reeds and gentle weeping willows, golden pink reflections on water, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ],
  misty_forests_big_trees: [
    "Cinematic vertical 9:16 towering ancient redwood giant trees shrouded in soft rolling morning fog, ethereal golden sunbeams streaming through the lush green canopy, majestic, tranquil, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 slow low-angle perspective looking up at colossal emerald pine trees meeting the misty dawn sky, soft warm sunlight piercing the morning clouds, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 peaceful moss-covered forest path winding between ancient weeping willow trees, soft glowing ambient twilight, profound stillness, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 tranquil sun-dappled grove of giant birch trees in a quiet morning valley, soft dewdrops glistening on lush green ferns, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 panoramic view of an expansive ancient forest canopy rolling across misty mountain ridges at golden sunrise, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 intimate close-up of an ancient gnarly oak tree branch draped in soft emerald moss, gentle golden morning light illuminating dancing dust motes, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene deep woodland stream flowing softly between massive mossy tree trunks at dawn, sunbeams breaking through canopy, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 magical sunlit grove in an ancient cedar forest, golden ethereal light filtering through misty branches, lush carpet of emerald moss, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 towering mossy ancient forest giants reflected in a still, glass-like forest tarn at dawn, soft rolling mist, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 high canopy shot looking up through ancient autumn maple and cedar branches as morning sunlight dances on falling golden leaves, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ],
  grand_mosques: [
    "Cinematic vertical 9:16 low-angle shot of a majestic grand white marble mosque courtyard at dawn, polished mirror marble reflecting soft lavender sunrise clouds and glowing warm lanterns, tranquil, spiritual, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene perspective looking through intricate Islamic geometric marble arches toward a soaring illuminated minaret against a twilight sky, ethereal golden glow, peaceful, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 wide view of a magnificent grand mosque surrounded by calm reflective turquoise water fountains at golden hour sunset, warm ambient light, awe-inspiring tranquility, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 close-up architectural shot of elegant arabesque carved marble pillars and illuminated lanterns inside a peaceful prayer hall, soft morning light beams, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 high-angle view over majestic turquoise and gold domes of an ancient grand mosque emerging through soft dawn mist, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 dusk view of a breathtaking grand mosque with illuminated white domes reflected in perfectly still reflecting pool, deep indigo evening sky with crescent moon, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 intricate ceiling dome with gold arabesque mosaic patterns and a grand warm chandelier softly glowing in quiet mosque interior, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 wide breathtaking view of grand white marble mosque arches framing a calm reflecting pool under a soft golden dawn sky, ethereal peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 majestic soaring minaret rising into a peaceful twilight sky with a delicate crescent moon, warm lantern glow on carved stone, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 interior perspective of a quiet grand mosque prayer hall with sunlight streaming through stained glass arches onto ornate carpets, spiritual tranquility, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ],
  al_madinah: [
    "Cinematic vertical 9:16 serene view of Al-Madinah Al-Munawwarah giant shaded architectural umbrellas open in the courtyard at golden dawn, soft warm light, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 majestic perspective looking up at the illuminated minarets of the Prophet's Mosque at blue hour dusk, soft golden glowing lanterns, profound reverence and calm, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 peaceful panoramic view of the vast marble courtyard in Medina at sunrise, golden sun rays glistening across polished stone, serene, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 close-up of intricate gold Arabic calligraphy and green marble architectural motifs in Medina, soft ambient illumination, spiritual elegance, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 tranquil twilight view of Medina skyline with illuminated domes against a serene violet and amber sunset sky, peaceful atmosphere, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 early morning view across the quiet Medina marble plaza with morning mist kissing distant mountains, soft warm sunbeams, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 breathtaking low angle view of illuminated white and green domes of Medina under a tranquil starry night sky, ethereal golden glow, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene panoramic view of the Prophet's Mosque courtyard with illuminated green dome and minarets against an amber sunset, peaceful spiritual serenity, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 close-up of polished white marble courtyard tiles reflecting the warm glow of evening lanterns at Al-Madinah Al-Munawwarah, tranquil atmosphere, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 beautiful dawn view over Al-Madinah Al-Munawwarah with soft purple morning clouds and gentle sun rays illuminating the mosque skyline, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ],
  majestic_mountains_skies: [
    "Cinematic vertical 9:16 breathtaking view of towering snow-dusted alpine mountain peaks bathed in ethereal rose-gold morning light, tranquil sea of clouds rolling gently below, spiritual awe, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 peaceful view looking out from a high mountain ridge at sunset, radiant golden and purple light rays spreading across the cosmic twilight sky, profound stillness, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 macro shot of a solitary alpine wildflower resting on rugged granite cliff edge overlooking a vast misty mountain valley, morning dew, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 dramatic cloudscape of majestic golden sunbeams piercing through billowing thundercloud formations over distant peaks, heavenly and calm, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 starry night sky filled with the glowing Milky Way galaxy arching gracefully over tranquil silhouetted mountain ridges, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene mountain plateau with calm reflective lake mirroring the towering cliffs and soft pastel morning sky, crystal clear water, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 majestic aerial perspective flying above glowing sunset clouds toward sharp mountain silhouettes under twilight sky, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 sweeping aerial view of majestic snow-capped mountain peaks rising above an endless ocean of golden sunrise clouds, awe-inspiring tranquility, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 peaceful alpine lake nestled at the foot of towering granite peaks at twilight, crystal mirror reflections of starry cosmos, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 dramatic sunbeams breaking through morning mist over rolling alpine meadows and distant rugged mountain spires, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ]
};

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

  console.log(`[Upload] Uploading ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)...`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const stream = fs.createReadStream(filePath);
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
    } catch (upErr) {
      console.warn(`[Upload Warning] Upload attempt ${attempt} failed: ${upErr.message}`);
      if (attempt === 3) throw upErr;
      await sleep(3000);
    }
  }
}

export async function fetchBatchData(surah, startAyah, endAyah, startWord = 1, endWord = null) {
  console.log(`[Quran API] Fetching recitation timestamps for Surah ${surah} (Sheikh Minshawi)...`);
  let recRes;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      recRes = await fetch(`https://api.quran.com/api/v4/chapter_recitations/9/${surah}?segments=true`).then(r => r.json());
      if (recRes && recRes.audio_file) break;
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(2000);
    }
  }
  const timestamps = recRes.audio_file.timestamps;

  const startItem = timestamps.find(t => t.verse_key === `${surah}:${startAyah}`);
  const endItem = timestamps.find(t => t.verse_key === `${surah}:${endAyah}`);
  if (!startItem || !endItem) {
    throw new Error(`Could not find timestamps for ${surah}:${startAyah} or ${surah}:${endAyah}`);
  }

  const batchStartMs = (startWord > 1 && startItem.segments && startItem.segments[startWord - 1])
    ? startItem.segments[startWord - 1][1]
    : startItem.timestamp_from;

  const batchEndMs = (endWord && endItem.segments && endItem.segments[endWord - 1])
    ? endItem.segments[endWord - 1][2]
    : endItem.timestamp_to;

  const totalDuration = (batchEndMs - batchStartMs) / 1000;

  console.log(`[Quran API] Slicing range: ${batchStartMs}ms -> ${batchEndMs}ms (${totalDuration.toFixed(2)}s)`);

  const chunks = [];

  for (let a = startAyah; a <= endAyah; a++) {
    const verseKey = `${surah}:${a}`;
    const tsItem = timestamps.find(t => t.verse_key === verseKey);
    const vUrl = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?words=true&translations=131&word_fields=text_uthmani`;
    let vRes;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        vRes = await fetch(vUrl).then(r => r.json());
        if (vRes && vRes.verse) break;
      } catch (err) {
        if (attempt === 3) throw err;
        await sleep(1500);
      }
    }
    const allWords = vRes.verse.words.filter(w => w.char_type_name === 'word');
    const allSegs = tsItem.segments || [];

    const startIdx = (a === startAyah && startWord > 1) ? startWord - 1 : 0;
    const endIdx = (a === endAyah && endWord) ? endWord : allWords.length;

    const words = allWords.slice(startIdx, endIdx);
    const segs = allSegs.slice(startIdx, endIdx);

    let i = 0;
    while (i < words.length) {
      let take = 3;
      const rem = words.length - i;
      if (rem === 4) take = 2;
      else if (rem <= 3) take = rem;

      const chunkWords = words.slice(i, i + take);
      const segStart = segs[i] ? segs[i][1] : tsItem.timestamp_from;
      const lastSegIdx = Math.min(i + take - 1, segs.length - 1);
      const segEnd = segs[lastSegIdx] ? segs[lastSegIdx][2] : tsItem.timestamp_to;

      const arabic = chunkWords.map(w => w.text_uthmani).join(' ');
      const english = chunkWords.map(w => w.translation ? w.translation.text : '').join(' ')
        .replace(/\s+/g, ' ').trim();

      chunks.push({
        id: `chunk_${chunks.length + 1}`,
        surah,
        ayah: a,
        arabic,
        english,
        start: (segStart - batchStartMs) / 1000,
        end: (segEnd - batchStartMs) / 1000
      });

      i += take;
    }
  }

  return {
    batchStartMs,
    batchEndMs,
    totalDuration,
    chunks
  };
}

export async function produceQuranV2Video({
  surah = 2,
  startAyah,
  endAyah,
  startWord = 1,
  endWord = null,
  category,
  seriesNumber
}) {
  const timestamp = Date.now();
  const jobId = `quran_v2_minshawi_${timestamp}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Quran Studio V2] BATCH PRODUCTION (Series #${seriesNumber})`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Reciter: Sheikh Muhammad Siddiq Al-Minshawi (الشيخ محمد صديق المنشاوي)`);
  console.log(`Passage: Surah ${surah}:${startAyah} (word ${startWord}) - ${surah}:${endAyah} (word ${endWord || 'end'})`);
  console.log(`Category: "${category}"`);
  console.log(`======================================================\n`);

  // --- Step 1: Pre-Flight Bridge Verification ---
  await verifyFlowBridge();

  // --- Step 2: Fetch Quran Data & Timings ---
  const { batchStartMs, batchEndMs, totalDuration, chunks } = await fetchBatchData(surah, startAyah, endAyah, startWord, endWord);

  const imageCount = Math.max(5, Math.min(8, Math.round(totalDuration / 9.2)));
  const sceneDur = totalDuration / imageCount;

  console.log(`\n[Planning] Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`[Planning] Scene Count: ${imageCount} scenes (~${sceneDur.toFixed(2)}s per image)`);
  console.log(`[Planning] Subtitle Phrase Cards: ${chunks.length} cards\n`);

  // --- Step 3: Slice Master Audio ---
  console.log(`[Audio Engine] Slicing Surah ${surah} from ${(batchStartMs/1000).toFixed(3)}s to ${(batchEndMs/1000).toFixed(3)}s...`);
  const sMp3 = path.join(CHAPTERS_DIR, `surah_${surah}_reciter_9.mp3`);
  if (!fs.existsSync(sMp3)) throw new Error(`Missing audio file: ${sMp3}`);

  const masterAudio = path.join(jobDir, 'continuous_master_audio.wav');
  const sliceArgs = [
    '-y',
    '-ss', (batchStartMs / 1000).toFixed(3),
    '-to', (batchEndMs / 1000).toFixed(3),
    '-i', sMp3,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    masterAudio
  ];
  await execFileAsync('ffmpeg', sliceArgs);
  console.log(`[Audio Engine] Master audio sliced: ${masterAudio}`);

  // --- Step 4: Render Subtitle Cards via Playwright ---
  console.log(`[Typography Engine] Launching Playwright to render ${chunks.length} subtitle phrase cards...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1080, height: 500 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  const cardFiles = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const cardHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Outfit:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1080px;
    height: 500px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .card-container {
    width: 980px;
    background: rgba(10, 16, 26, 0.72);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1.5px solid rgba(212, 175, 55, 0.55);
    border-radius: 36px;
    padding: 38px 46px 34px;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.65), 0 0 45px rgba(212, 175, 55, 0.22);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .header-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.08));
    border: 1px solid rgba(212, 175, 55, 0.6);
    border-radius: 9999px;
    padding: 4px 18px;
    margin-bottom: 14px;
  }
  .header-text {
    font-family: 'Outfit', sans-serif;
    font-size: 21px;
    font-weight: 700;
    color: #F8E7A2;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .arabic-text {
    font-family: 'Amiri Quran', serif;
    font-size: 58px;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1.6;
    text-shadow: 0 4px 18px rgba(0, 0, 0, 0.85), 0 0 25px rgba(212, 175, 55, 0.35);
    direction: rtl;
    margin-bottom: 14px;
    max-width: 900px;
  }
  .english-text {
    font-family: 'Outfit', sans-serif;
    font-size: 27px;
    font-weight: 600;
    color: #E2E8F0;
    line-height: 1.35;
    letter-spacing: 0.3px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
    direction: ltr;
    max-width: 880px;
  }
</style>
</head>
<body>
  <div class="card-container">
    <div class="header-badge">
      <span class="header-text">سُورَةُ البَقَرَةِ • 2:${chunk.ayah}</span>
    </div>
    <div class="arabic-text">${chunk.arabic}</div>
    <div class="english-text">${chunk.english}</div>
  </div>
</body>
</html>
    `;
    await page.setContent(cardHtml, { waitUntil: 'load' });
    const cardPath = path.join(jobDir, `card_${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: cardPath, omitBackground: true });
    cardFiles.push(cardPath);
  }
  await browser.close();
  console.log(`[Typography Engine] All ${chunks.length} subtitle phrase cards rendered!`);

  // --- Step 5: Google Flow Visual Generation ---
  const promptsPool = THEMATIC_CATEGORIES[category] || THEMATIC_CATEGORIES.majestic_mountains_skies;
  const selectedPrompts = [];
  for (let i = 0; i < imageCount; i++) {
    selectedPrompts.push(promptsPool[i % promptsPool.length]);
  }

  console.log(`\n[Flow Visuals] Preparing ${selectedPrompts.length} prompts for category: "${category}"...`);
  const token = getFlowToken();
  const projectName = `QuranV2_${timestamp}`;

  const scenesPayload = selectedPrompts.map((prompt, idx) => ({
    prompt: prompt.endsWith('.') ? prompt : `${prompt}.`,
    model: 'Nano Banana 2.1',
    aspect_ratio: '9:16',
    download_quality: 'original',
    type: 'image',
    scene: `scene-${String(idx + 1).padStart(2, '0')}`
  }));

  console.log(`[Flow Visuals] Submitting batch of ${scenesPayload.length} scenes to Google Flow via MCP...`);
  let genRes;
  for (let gAttempt = 1; gAttempt <= 3; gAttempt++) {
    try {
      genRes = await fetch(`${FLOW_API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-flow-token': token },
        body: JSON.stringify({ project: projectName, scenes: scenesPayload })
      });
      if (genRes.ok) break;
      const err = await genRes.text();
      console.warn(`[Flow Visuals] Generate attempt ${gAttempt} returned ${genRes.status}: ${err}`);
    } catch (e) {
      console.warn(`[Flow Visuals] Generate attempt ${gAttempt} network error: ${e.message}`);
    }
    await sleep(3000);
  }

  if (!genRes || !genRes.ok) {
    throw new Error(`Flow generate failed after 3 attempts`);
  }

  const genData = await genRes.json();
  const jobIds = (genData.jobs || []).map(j => j.id);
  console.log(`[Flow Visuals] Flow jobs submitted: ${jobIds.map(id => id.slice(0, 8)).join(', ')}`);

  console.log(`[Flow Visuals] Waiting for all ${jobIds.length} scenes to complete (safe timeout 15m)...`);
  const flowStart = Date.now();
  let completedJobs = [];

  while (Date.now() - flowStart < 15 * 60 * 1000) {
    try {
      const waitRes = await fetch(`${FLOW_API_BASE}/wait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-flow-token': token },
        body: JSON.stringify({ job_ids: jobIds, timeout_seconds: 30 })
      });
      if (waitRes.ok) {
        const waitData = await waitRes.json();
        const currentJobs = waitData.jobs || [];
        const finished = currentJobs.filter(j => j.status === 'done');
        console.log(`[Flow Visuals] Progress: ${finished.length}/${jobIds.length} scenes finished.`);
        if (finished.length === jobIds.length) {
          completedJobs = currentJobs;
          break;
        }
      } else {
        console.warn(`[Flow Visuals] Wait returned status ${waitRes.status}, continuing to poll...`);
      }
    } catch (waitErr) {
      console.warn(`[Flow Visuals] Polling connection hiccup (${waitErr.message}), retrying in 4s...`);
    }
    await sleep(4000);
  }

  if (completedJobs.length < jobIds.length) {
    throw new Error(`Flow scenes generation timed out! Finished: ${completedJobs.length}/${jobIds.length}`);
  }

  const sceneImages = [];
  for (let i = 0; i < imageCount; i++) {
    const srcFile = completedJobs[i].files[0];
    const targetFile = path.join(jobDir, `scene_${i + 1}.jpeg`);
    fs.copyFileSync(srcFile, targetFile);
    sceneImages.push(targetFile);
    console.log(`[Flow Visuals] ✅ Scene ${i + 1} ready: ${targetFile}`);
  }

  // --- Step 6: Master FFmpeg Composite Pipeline ---
  console.log(`\n[Composite Engine] Constructing multi-layer filtergraph for ${imageCount} scenes (~${sceneDur.toFixed(2)}s each)...`);
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
    { zoom: "min(1.01+0.00020*on,1.06)", x: "iw/2-(iw/zoom/2)-0.02*on", y: "ih/2-(ih/zoom/2)" },
    { zoom: "min(1.0+0.00022*on,1.06)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)+0.02*on" }
  ];

  const inputArgs = [];
  for (let i = 0; i < imageCount; i++) {
    inputArgs.push('-loop', '1', '-t', (sceneDur + 1.0).toFixed(2), '-i', sceneImages[i]);
  }
  inputArgs.push('-i', phoneFrame);
  for (let i = 0; i < chunks.length; i++) {
    inputArgs.push('-loop', '1', '-t', totalDuration.toFixed(2), '-i', cardFiles[i]);
  }
  inputArgs.push('-i', masterAudio);

  const maskIdx = imageCount;
  const cardStartIdx = imageCount + 1;
  const audioIdx = imageCount + 1 + chunks.length;

  let f = '';
  for (let i = 0; i < imageCount; i++) {
    const p = liteZoomProfiles[i % liteZoomProfiles.length];
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

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const cardIdx = cardStartIdx + i;
    const layerName = i === chunks.length - 1 ? 'v_final' : `layer_${i}`;
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

  // --- Step 7: Upload to GitHub Releases Vault ---
  console.log(`\n[GitHub Vault] Fetching release metadata for tag: "${RELEASE_TAG}"...`);
  const relRes = await ghFetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${RELEASE_TAG}`);
  const release = await relRes.json();
  const downloadUrl = await uploadFile(release.upload_url, outputMp4, path.basename(outputMp4));

  // --- Step 8: Update Cloud Publish Queue ---
  console.log(`[Cloud Queue] Enqueuing ${path.basename(outputMp4)} into cloud publish queue...`);
  let cloudQueue = { items: [] };
  if (fs.existsSync(QUEUE_FILE)) {
    try { cloudQueue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8')); } catch {}
  }
  if (!cloudQueue.items) cloudQueue.items = [];
  const reelTitle = `Surah Al-Baqarah (2:${startAyah}-${endAyah}) | Sheikh Al-Minshawi (المنشاوي)`;
  const reelCaption = `سورة البقرة الآيات (${startAyah} - ${endAyah})\nبصوت الشيخ محمد صديق المنشاوي تلاوة خاشعة تريح القلوب.\n\nSurah Al-Baqarah (${startAyah} - ${endAyah}) recited with deep serenity by Sheikh Muhammad Siddiq Al-Minshawi.\n\n#قرآن #المنشاوي #سورة_البقرة #تلاوة_خاشعة #Quran #Islam #Minshawi #SurahBaqarah #Recitation #QuranV2`;

  cloudQueue.items.push({
    id: `quran_v2_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    jobId: path.basename(outputMp4, '.mp4'),
    title: reelTitle,
    caption: reelCaption,
    videoFilename: path.basename(outputMp4),
    cloudVideoUrl: downloadUrl,
    surah,
    engine: 'quran_v2_minshawi',
    status: 'pending',
    createdAt: new Date().toISOString(),
    publishedAt: null
  });
  cloudQueue.updatedAt = new Date().toISOString();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(cloudQueue, null, 2), 'utf-8');

  // --- Step 9: Update State Tracker ---
  let state = { currentSurah: 2, nextAyah: 1, reciter: 'Sheikh Muhammad Siddiq Al-Minshawi', reciterId: 9, history: [] };
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch {}
  }
  state.currentSurah = surah;
  state.nextAyah = endAyah + 1;
  state.lastRunAt = new Date().toISOString();
  state.lastBatch = {
    surahRange: `2:${startAyah} -> 2:${endAyah}`,
    duration: totalDuration,
    category,
    imageDuration: sceneDur,
    imageCount,
    outputMp4: path.basename(outputMp4),
    completedAt: new Date().toISOString()
  };
  state.history.push({
    start: `2:${startAyah}`,
    end: `2:${endAyah}`,
    duration: totalDuration.toFixed(2),
    category,
    outputFile: path.basename(outputMp4),
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  console.log(`[State Tracker] Progress updated! Next Ayah is: 2:${state.nextAyah}`);

  // --- Step 10: Git Commit & Push ---
  console.log(`[Git Sync] Syncing updated queue & state to origin/main...`);
  try {
    try { execSync(`git pull --rebase origin main`, { cwd: ROOT_DIR }); } catch {}
    execSync(`git add jobs/cloud_publish_queue.json jobs/quran_v2_progress_state.json`, { cwd: ROOT_DIR });
    execSync(`git commit -m "feat: produce and queue Quran V2 Minshawi Video #${seriesNumber} (Surah 2:${startAyah}-${endAyah}) [skip ci]"`, { cwd: ROOT_DIR });
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
    nextAyah: endAyah + 1,
    surahRange: `2:${startAyah} -> 2:${endAyah}`
  };
}
