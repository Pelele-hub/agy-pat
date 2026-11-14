// scripts/passage_catalogue.mjs - Curated Quran Passages & Automatic Rotator
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '..', 'jobs', 'rotation_state.json');

export const CURATED_PASSAGES = [
  {
    surah: 93, // Ad-Duha
    name: "Ad-Duha (The Morning Hours)",
    startAyah: 1,
    count: 4,
    theme: "Hope & Consolation in Dark Times",
    prompts: [
      "Cinematic vertical 9:16 warm golden sunrise breaking through dark morning mist, glowing amber light, soft clouds, majestic, 4k",
      "Cinematic vertical 9:16 serene nocturnal night sky transitioning into twilight blue dawn, tranquil, peace, 4k",
      "Cinematic vertical 9:16 glowing lantern illuminating a dark serene chamber, warm golden atmosphere, spiritual, 4k",
      "Cinematic vertical 9:16 gentle peaceful ocean waves touching calm sandy shoreline at sunrise, pastel colors, 4k"
    ]
  },
  {
    surah: 94, // Al-Inshirah
    name: "Al-Inshirah (The Relief)",
    startAyah: 5,
    count: 4,
    theme: "Verily with Hardship comes Ease",
    prompts: [
      "Cinematic vertical 9:16 raindrops falling gently on twilight window, amber street lamp in background, slow motion, 4k",
      "Cinematic vertical 9:16 candle flame flickering in tranquil quiet room, meditative, 4k",
      "Cinematic vertical 9:16 deep blue twilight ocean under star-filled sky, tranquil waves, 4k",
      "Cinematic vertical 9:16 majestic starry galaxy over silhouetted peaceful mountains, 4k"
    ]
  },
  {
    surah: 67, // Al-Mulk
    name: "Al-Mulk (The Sovereignty)",
    startAyah: 1,
    count: 4,
    theme: "Creation of the Heavens & Seven Skies",
    prompts: [
      "Cinematic vertical 9:16 breathtaking deep space nebula and cosmic stars slowly rotating, majestic spiritual atmosphere, 4k",
      "Cinematic vertical 9:16 full moon glowing softly behind dark moving dramatic clouds at night, 4k",
      "Cinematic vertical 9:16 dark stormy sea at dusk with serene glowing horizon, awe-inspiring, 4k",
      "Cinematic vertical 9:16 celestial milky way galaxy moving over silent midnight peaks, 4k"
    ]
  },
  {
    surah: 55, // Ar-Rahman
    name: "Ar-Rahman (The Beneficent)",
    startAyah: 1,
    count: 4,
    theme: "The Most Merciful & Divine Creation",
    prompts: [
      "Cinematic vertical 9:16 lush emerald paradise garden with gentle misty waterfall and soft sunlight rays, 4k",
      "Cinematic vertical 9:16 golden celestial light beams piercing through gentle clouds into calm blue ocean, 4k",
      "Cinematic vertical 9:16 sacred twilight landscape with soft glowing stars and tranquil waters, 4k",
      "Cinematic vertical 9:16 deep midnight blue mountain lake reflecting millions of sparkling stars, 4k"
    ]
  },
  {
    surah: 112, // Al-Ikhlas
    name: "Al-Ikhlas (The Sincerity)",
    startAyah: 1,
    count: 4,
    theme: "The Oneness & Absolute Nature of God",
    prompts: [
      "Cinematic vertical 9:16 single radiant light shining brightly in deep serene cosmic space, sublime simplicity, 4k",
      "Cinematic vertical 9:16 pristine calm water surface reflecting infinite twilight sky, pure silence, 4k",
      "Cinematic vertical 9:16 warm glowing golden candlelight in a minimalist tranquil space, 4k",
      "Cinematic vertical 9:16 tranquil mountain silhouette under clear majestic starry sky, 4k"
    ]
  }
];

export function getNextPassage(requestedSurah, requestedAyah, requestedCount) {
  // If specific parameters were explicitly requested, use them
  if (requestedSurah && requestedAyah) {
    return {
      surah: parseInt(requestedSurah, 10),
      startAyah: parseInt(requestedAyah, 10),
      count: requestedCount ? parseInt(requestedCount, 10) : 4,
      name: `Surah ${requestedSurah}:${requestedAyah}`,
      theme: "Custom Selection"
    };
  }

  // Load rotation index
  let currentIndex = 0;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      currentIndex = (state.lastIndex + 1) % CURATED_PASSAGES.length;
    }
  } catch (e) {
    currentIndex = 0;
  }

  // Save new index
  try {
    const jobsDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(jobsDir)) fs.mkdirSync(jobsDir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastIndex: currentIndex, lastRun: new Date().toISOString() }));
  } catch (e) {}

  return CURATED_PASSAGES[currentIndex];
}
