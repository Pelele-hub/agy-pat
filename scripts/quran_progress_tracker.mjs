// scripts/quran_progress_tracker.mjs - Sequential Quran Continuation Engine
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '..', 'jobs', 'quran_progress_state.json');
const CHAPTERS_DIR = path.join(__dirname, '..', 'assets', 'audio', 'chapters');

if (!fs.existsSync(CHAPTERS_DIR)) fs.mkdirSync(CHAPTERS_DIR, { recursive: true });

// Cache for chapter recitations metadata to avoid duplicate network calls
const chapterCache = new Map();

export async function fetchChapterTimestamps(surah, reciterId = 7) {
  if (chapterCache.has(surah)) return chapterCache.get(surah);
  const apiUrl = `https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${surah}?segments=true`;
  const res = await fetch(apiUrl).then(r => r.json());
  if (!res.audio_file || !res.audio_file.timestamps) {
    throw new Error(`Failed to load timestamps for Surah ${surah} from Quran.com API`);
  }
  const data = {
    audioUrl: res.audio_file.audio_url,
    timestamps: res.audio_file.timestamps,
    totalVerses: res.audio_file.timestamps.length
  };
  chapterCache.set(surah, data);
  return data;
}

export function loadProgressState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      if (state.currentSurah && state.nextAyah) {
        return state;
      }
    }
  } catch (e) {
    console.warn('[Progress Tracker] Warning loading state file, starting fresh:', e.message);
  }
  return {
    currentSurah: 1,
    nextAyah: 1,
    history: []
  };
}

export function saveProgressState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[Progress Tracker] Failed to save state:', e);
  }
}

/**
 * Determine the next sequential batch of Quran verses with minimum duration >= minDurationSec
 * @param {Object} options - Optional overrides { surah, startAyah, minDuration }
 */
export async function getNextQuranBatch(options = {}) {
  const minDurationSec = options.minDuration || 60.0; // User rule: at least 60 seconds
  const reciterId = options.reciterId || 7; // Sheikh Mishari Rashid Alafasy

  const state = loadProgressState();
  let currSurah = options.surah ? parseInt(options.surah, 10) : state.currentSurah;
  let currAyah = options.startAyah ? parseInt(options.startAyah, 10) : state.nextAyah;

  const selectedVerses = [];
  let accumulatedDuration = 0;
  let nextSurah = currSurah;
  let nextAyah = currAyah;

  console.log(`\n======================================================`);
  console.log(`[Quran Sequential Progress Tracker]`);
  console.log(`Starting Position: Surah ${currSurah}, Ayah ${currAyah}`);
  console.log(`Target Minimum Duration: >= ${minDurationSec} seconds`);
  console.log(`======================================================\n`);

  while (accumulatedDuration < minDurationSec) {
    const chapterData = await fetchChapterTimestamps(currSurah, reciterId);
    const timestamps = chapterData.timestamps;

    for (let a = currAyah; a <= chapterData.totalVerses; a++) {
      const vKey = `${currSurah}:${a}`;
      const ts = timestamps.find(t => t.verse_key === vKey);
      if (!ts) continue;

      const dur = ts.duration / 1000;
      accumulatedDuration += dur;

      selectedVerses.push({
        surah: currSurah,
        ayah: a,
        verseKey: vKey,
        audioUrl: chapterData.audioUrl,
        timestamp_from: ts.timestamp_from,
        timestamp_to: ts.timestamp_to,
        duration: dur,
        accumulated: accumulatedDuration
      });

      console.log(`  + Verse ${vKey} (${dur.toFixed(2)}s) | Total: ${accumulatedDuration.toFixed(2)}s / ${minDurationSec}s`);

      if (accumulatedDuration >= minDurationSec) {
        if (a < chapterData.totalVerses) {
          nextSurah = currSurah;
          nextAyah = a + 1;
        } else {
          nextSurah = currSurah >= 114 ? 1 : currSurah + 1;
          nextAyah = 1;
        }
        break;
      }
    }

    if (accumulatedDuration < minDurationSec) {
      // Completed this Surah, transition to the next Surah
      console.log(`  [Surah ${currSurah} Finished] Accumulating next Surah to reach ${minDurationSec}s...`);
      currSurah = currSurah >= 114 ? 1 : currSurah + 1;
      currAyah = 1;
    }
  }

  // Update persistent state for the next run
  const updatedState = {
    currentSurah: nextSurah,
    nextAyah: nextAyah,
    lastRunAt: new Date().toISOString(),
    lastBatch: {
      surahRange: `${selectedVerses[0].surah}:${selectedVerses[0].ayah} -> ${selectedVerses[selectedVerses.length - 1].surah}:${selectedVerses[selectedVerses.length - 1].ayah}`,
      verseCount: selectedVerses.length,
      duration: accumulatedDuration,
      completedAt: new Date().toISOString()
    },
    history: [
      ...(state.history || []).slice(-20), // keep last 20 in history
      {
        start: `${selectedVerses[0].surah}:${selectedVerses[0].ayah}`,
        end: `${selectedVerses[selectedVerses.length - 1].surah}:${selectedVerses[selectedVerses.length - 1].ayah}`,
        verses: selectedVerses.length,
        duration: accumulatedDuration.toFixed(2),
        timestamp: new Date().toISOString()
      }
    ]
  };

  saveProgressState(updatedState);

  console.log(`\n[Progress Tracker] Batch Complete!`);
  console.log(`Verses: ${selectedVerses.length} total (${selectedVerses[0].verseKey} -> ${selectedVerses[selectedVerses.length - 1].verseKey})`);
  console.log(`Total Duration: ${accumulatedDuration.toFixed(2)}s (>= ${minDurationSec}s)`);
  console.log(`Next Execution Will Resume At: Surah ${nextSurah}, Ayah ${nextAyah}\n`);

  return {
    verses: selectedVerses,
    totalDuration: accumulatedDuration,
    startVerse: selectedVerses[0].verseKey,
    endVerse: selectedVerses[selectedVerses.length - 1].verseKey,
    nextSurah,
    nextAyah
  };
}
