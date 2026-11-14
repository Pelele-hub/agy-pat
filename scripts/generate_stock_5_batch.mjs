// scripts/generate_stock_5_batch.mjs - Generate 5 Sequential Quran Reels & Add Directly to Stock
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { produceWorkflow2 } from './produce_workflow_2.mjs';
import { addToQueue, loadQueue } from './publish_queue_manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

async function run() {
  console.log("================================================================");
  console.log("  GENERATING 5 SEQUENTIAL QURAN REELS FOR STOCK INVENTORY       ");
  console.log("  (Sequential Quran Progression - Meta AI Engine - >= 60s)     ");
  console.log("================================================================\n");

  const results = [];
  const initialQueue = loadQueue();
  const startingTotal = initialQueue.length;
  console.log(`Current items in queue before run: ${startingTotal}`);

  for (let i = 1; i <= 5; i++) {
    const globalReelNum = startingTotal + i;
    console.log(`\n================================================================`);
    console.log(`>>> PRODUCING STOCK REEL ${i} OF 5 (Overall Reel #${globalReelNum})`);
    console.log(`================================================================`);

    const startTime = Date.now();
    const result = await produceWorkflow2({ minDuration: 60.0 });
    const videoFilename = path.basename(result.outputPath);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

    const arabicFullText = (result.verses || []).map(v => v.text).join(' ۝ ');
    const verseKeys = (result.verses || []).map(v => v.key).join(', ');
    const surahNum = result.startVerse?.surah || '2';
    const reelTitle = `Surah ${surahNum} (Ayahs ${verseKeys})`;
    const reelCaption = `Surah ${surahNum} (Ayahs ${verseKeys})\n\n"${arabicFullText}"\n\nReciter: Mishari Rashid Alafasy\n\nRelax your heart and find peace in the words of the Almighty. 🕊️✨\n\n#quran #islam #relaxation #quranrecitation #peace #reels #shorts #tiktok`;

    // Add directly to local queue as pending (Stock)
    const queueItem = addToQueue({
      jobId: result.jobId,
      title: reelTitle,
      caption: reelCaption,
      videoFilename,
      surah: surahNum,
      verses: result.verses,
      engine: 'vibes_ai'
    });

    console.log(`>>> Reel #${globalReelNum} rendered in ${elapsedSec}s: ${videoFilename}`);
    console.log(`>>> Title: ${reelTitle}`);
    console.log(`>>> Ayahs: ${verseKeys} (${result.totalDuration.toFixed(1)}s)`);
    console.log(`>>> Status: STOCKED_LOCALLY (Queue ID: ${queueItem.id})`);

    results.push({
      batchIndex: i,
      globalReelNum,
      videoFilename,
      title: reelTitle,
      verseKeys,
      duration: result.totalDuration,
      queueId: queueItem.id
    });
  }

  console.log(`\n================================================================`);
  console.log(`  COMPLETED GENERATION OF 5 REELS -> ALL ADDED TO STOCK!        `);
  console.log(`================================================================`);
  results.forEach(r => {
    console.log(`- [STOCKED] Reel #${r.globalReelNum}: ${r.title} | ${r.videoFilename} (${r.duration.toFixed(1)}s)`);
  });

  const finalQueue = loadQueue();
  console.log(`\nTotal items now in queue: ${finalQueue.length}`);
}

run().catch(err => {
  console.error('[Stock Batch Fatal Error]:', err);
  process.exit(1);
});
