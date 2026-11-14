// scripts/generate_5_batch.mjs - Generate 5 Sequential Quran Reels & Queue/Stock Automatically
import path from 'path';
import { fileURLToPath } from 'url';
import { produceWorkflow2 } from './produce_workflow_2.mjs';
import { addToQueue, dispatchNext, checkBufferLimits } from './publish_queue_manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getPublicBaseUrl() {
  try {
    const res = await fetch('http://localhost:5056/api/queue/status');
    const data = await res.json();
    return data.publicBaseUrl || null;
  } catch (e) {
    console.warn('[Batch Runner] Notice: could not get publicBaseUrl from server:', e.message);
    return null;
  }
}

async function run() {
  console.log("================================================================");
  console.log("  STARTING GENERATION OF 5 SEQUENTIAL QURAN REELS (META AI)     ");
  console.log("================================================================");

  let publicBaseUrl = await getPublicBaseUrl();
  console.log(`[Batch Runner] Cloudflare Edge Stream URL: ${publicBaseUrl}`);

  const results = [];

  for (let i = 1; i <= 5; i++) {
    console.log(`\n>>> ------------------------------------------------------------`);
    console.log(`>>> PRODUCING REEL ${i} OF 5 (Sequential Quran Progression)...`);
    console.log(`>>> ------------------------------------------------------------`);

    const startTime = Date.now();
    const result = await produceWorkflow2({ minDuration: 60.0 });
    const videoFilename = path.basename(result.outputPath);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`>>> Reel ${i}/5 rendered in ${elapsedSec}s: ${videoFilename}`);

    const arabicFullText = (result.verses || []).map(v => v.text).join(' ۝ ');
    const verseKeys = (result.verses || []).map(v => v.key).join(', ');
    const surahNum = result.startVerse?.surah || '';
    const reelTitle = `Surah ${surahNum} (Ayahs ${verseKeys})`;
    const reelCaption = `Surah ${surahNum} (Ayahs ${verseKeys})\n\n"${arabicFullText}"\n\nReciter: Mishari Rashid Alafasy\n\nRelax your heart and find peace in the words of the Almighty. 🕊️✨\n\n#quran #islam #relaxation #quranrecitation #peace #reels #shorts #tiktok`;

    // 1. Add to local queue
    const queueItem = addToQueue({
      jobId: result.jobId,
      title: reelTitle,
      caption: reelCaption,
      videoFilename,
      surah: surahNum,
      verses: result.verses,
      engine: 'vibes_ai'
    });

    // 2. Dispatch to Buffer if slots available
    if (!publicBaseUrl) {
      publicBaseUrl = await getPublicBaseUrl();
    }

    let dispatchRes = null;
    if (publicBaseUrl) {
      dispatchRes = await dispatchNext({ publicBaseUrl });
    }

    const itemStatus = dispatchRes?.dispatched ? 'SCHEDULED_TO_BUFFER' : 'STOCKED_LOCALLY';
    console.log(`>>> Reel ${i}/5 STATUS: ${itemStatus}`);
    if (dispatchRes?.dispatched) {
      console.log(`    Dispatched Posts:`, (dispatchRes.dispatchedPosts || []).map(p => `${p.channel}: ${p.status}`));
    } else {
      console.log(`    Stocked Reason: ${dispatchRes?.message || 'No tunnel or buffer full'}`);
    }

    results.push({
      batchIndex: i,
      videoFilename,
      surah: surahNum,
      verseKeys,
      duration: result.totalDuration,
      status: itemStatus,
      dispatchDetails: dispatchRes
    });
  }

  console.log(`\n================================================================`);
  console.log(`  COMPLETED 5-REEL BATCH GENERATION & INGESTION                `);
  console.log(`================================================================`);
  results.forEach(r => {
    console.log(`- [${r.status}] Reel ${r.batchIndex}: ${r.videoFilename} (Surah ${r.surah}:${r.verseKeys}, ${r.duration.toFixed(1)}s)`);
  });
}

run().catch(err => {
  console.error('[Batch Fatal Error]:', err);
  process.exit(1);
});
