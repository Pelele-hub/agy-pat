// scripts/quran_v2_engine.mjs - Universal Engine for New Quran Workflow
// Reciter: Sheikh Muhammad Siddiq Al-Minshawi (Murattal)
// Standards: 10s per image | 300ms xfade dissolve | 2-5 words with English | Auto State Resume
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
const QUEUE_FILE = path.join(JOBS_DIR, 'quran_v2_publish_queue.json');

const FLOW_TOKEN_FILE = 'C:/Users/majji/.flow-mcp/token';
const FLOW_API_BASE = 'http://127.0.0.1:8787/api';

[OUTPUT_DIR, JOBS_DIR, CHAPTERS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const THEMATIC_CATEGORIES = {
  cascading_waterfalls_rivers: [
    "Cinematic vertical 9:16 macro shot of a crystal clear turquoise mountain waterfall cascading gently over smooth mossy river rocks, soft morning sun rays piercing through mist, peaceful, tranquil, hyper-realistic, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 panoramic view of a wide serene winding river meandering through a lush green valley at golden hour sunset, calm gentle ripples reflecting the golden sky, peaceful water, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 slow-motion close-up of pure mountain spring water bubbling softly over jade-green riverbed pebbles, sun glints on the surface, tranquil zen atmosphere, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 majestic tiered waterfall in an enchanted bamboo and weeping willow forest at dawn, ethereal morning fog rising from the calm plunge pool, spiritual serenity, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 high-angle shot looking down at a tranquil crystal-clear turquoise river pool surrounded by ancient ferns and blooming water lilies, gentle sunlight filtering through trees, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 serene view of a calm river estuary at blue hour twilight, still reflective mirror water reflecting distant mountain silhouettes and a faint crescent moon, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 close-up of a gentle veil waterfall flowing softly like silk into an emerald forest pool, lush hanging vines and soft ambient morning light, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures"
  ],
  misty_forests_big_trees: [
    "Cinematic vertical 9:16 towering ancient redwood giant trees shrouded in soft rolling morning fog, ethereal golden sunbeams streaming through the lush green canopy, majestic, tranquil, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 slow low-angle perspective looking up at colossal emerald pine trees meeting the misty dawn sky, soft warm sunlight piercing the morning clouds, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 peaceful moss-covered forest path winding between ancient weeping willow trees, soft glowing ambient twilight, profound stillness, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 tranquil sun-dappled grove of giant birch trees in a quiet morning valley, soft dewdrops glistening on lush green ferns, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 panoramic view of an expansive ancient forest canopy rolling across misty mountain ridges at golden sunrise, 4k hyper-realistic, clean frame, absolutely no watermarks, no logos, no text, no signatures",
    "Cinematic vertical 9:16 intimate close-up of an ancient gnarly oak tree branch draped in soft emerald moss, gentle golden morning light illuminating dancing dust motes, 4k, clean frame, absolutely no watermarks, no logos, no text, no signatures"
  ],
  grand_mosques: [
    "Cinematic vertical 9:16 low-angle shot of a majestic grand white marble mosque courtyard at dawn, polished mirror marble reflecting soft lavender sunrise clouds and glowing warm lanterns, tranquil, spiritual, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene perspective looking through intricate Islamic geometric marble arches toward a soaring illuminated minaret against a twilight sky, ethereal golden glow, peaceful, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 wide view of a magnificent grand mosque surrounded by calm reflective turquoise water fountains at golden hour sunset, warm ambient light, awe-inspiring tranquility, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 close-up architectural shot of elegant arabesque carved marble pillars and illuminated lanterns inside a peaceful prayer hall, soft morning light beams, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 high-angle view over majestic turquoise and gold domes of an ancient grand mosque emerging through soft dawn mist, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 dusk view of a breathtaking grand mosque with illuminated white domes reflected in perfectly still reflecting pool, deep indigo evening sky with crescent moon, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ],
  al_madinah: [
    "Cinematic vertical 9:16 serene view of Al-Madinah Al-Munawwarah giant shaded architectural umbrellas open in the courtyard at golden dawn, soft warm light, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 majestic perspective looking up at the illuminated minarets of the Prophet's Mosque at blue hour dusk, soft golden glowing lanterns, profound reverence and calm, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 peaceful panoramic view of the vast marble courtyard in Medina at sunrise, golden sun rays glistening across polished stone, serene, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 close-up of intricate gold Arabic calligraphy and green marble architectural motifs in Medina, soft ambient illumination, spiritual elegance, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 tranquil twilight view of Medina skyline with illuminated domes against a serene violet and amber sunset sky, peaceful atmosphere, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 early morning view across the quiet Medina marble plaza with morning mist kissing distant mountains, soft warm sunbeams, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ],
  majestic_mountains_skies: [
    "Cinematic vertical 9:16 breathtaking view of towering snow-dusted alpine mountain peaks bathed in ethereal rose-gold morning light, tranquil sea of clouds rolling gently below, spiritual awe, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 peaceful view looking out from a high mountain ridge at sunset, radiant golden and purple light rays spreading across the cosmic twilight sky, profound stillness, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 macro shot of a solitary alpine wildflower resting on rugged granite cliff edge overlooking a vast misty mountain valley, morning dew, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 dramatic cloudscape of majestic golden sunbeams piercing through billowing thundercloud formations over distant peaks, heavenly and calm, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 starry night sky filled with the glowing Milky Way galaxy arching gracefully over tranquil silhouetted mountain ridges, spiritual peace, 4k, clean frame, absolutely no watermarks, no logos, no text",
    "Cinematic vertical 9:16 serene mountain plateau with calm reflective lake mirroring the towering cliffs and soft pastel morning sky, crystal clear water, 4k, clean frame, absolutely no watermarks, no logos, no text"
  ]
};

export function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch {}
  }
  return {
    currentSurah: 1,
    nextAyah: 1,
    reciter: 'Sheikh Muhammad Siddiq Al-Minshawi',
    reciterId: 9,
    history: []
  };
}

export function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export async function checkFlow() {
  const token = fs.readFileSync(FLOW_TOKEN_FILE, 'utf-8').trim();
  const res = await fetch(`${FLOW_API_BASE}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flow-token': token },
    body: JSON.stringify({ detailed: true })
  });
  if (!res.ok) throw new Error(`Flow status check failed: ${res.status}`);
  const data = await res.json();
  return data.flow || {};
}

export async function calculateNextBatch(surah = 2, startAyah = 1, minSec = 60.0, maxSec = 75.0) {
  const res = await fetch(`https://api.quran.com/api/v4/chapter_recitations/9/${surah}?segments=true`);
  const data = await res.json();
  const ts = data.audio_file.timestamps;
  
  let accumulated = 0;
  let endAyah = startAyah;
  for (let a = startAyah; a <= ts.length; a++) {
    const item = ts.find(t => t.verse_key === `${surah}:${a}`);
    if (!item) break;
    const dur = (item.timestamp_to - item.timestamp_from) / 1000;
    if (accumulated >= minSec && (accumulated + dur > maxSec)) {
      break;
    }
    accumulated += dur;
    endAyah = a;
    if (accumulated >= minSec) {
      break;
    }
  }
  return { surah, startAyah, endAyah, duration: accumulated };
}

export async function runNextSequentialVideo(categoryOverride = null) {
  const state = loadState();
  const surah = state.currentSurah || 2;
  const startAyah = state.nextAyah || 1;
  const seriesNumber = (state.history ? state.history.length : 0) + 1;

  const CATEGORY_ROTATION = [
    'cascading_waterfalls_rivers',
    'misty_forests_big_trees',
    'grand_mosques',
    'al_madinah',
    'majestic_mountains_skies'
  ];
  const category = categoryOverride || CATEGORY_ROTATION[(seriesNumber - 1) % CATEGORY_ROTATION.length];

  console.log(`[Quran V2 Engine] Calculating optimal range from Surah ${surah}:${startAyah}...`);
  const batch = await calculateNextBatch(surah, startAyah, 60.0, 75.0);
  console.log(`[Quran V2 Engine] Optimal range found: Surah ${surah}:${batch.startAyah}-${batch.endAyah} (~${batch.duration.toFixed(2)}s)`);

  const { produceQuranV2Video } = await import('./produce_quran_v2_batch.mjs');
  return produceQuranV2Video({
    surah,
    startAyah: batch.startAyah,
    endAyah: batch.endAyah,
    startWord: 1,
    endWord: null,
    category,
    seriesNumber
  });
}

console.log('[Quran V2 Engine] Universal engine loaded.');

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const catArgIdx = process.argv.indexOf('--category');
  const cat = catArgIdx >= 0 ? process.argv[catArgIdx + 1] : null;
  runNextSequentialVideo(cat).catch(err => {
    console.error('[Quran V2 Engine] Fatal error:', err);
    process.exit(1);
  });
}
