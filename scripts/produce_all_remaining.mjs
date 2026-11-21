// scripts/produce_all_remaining.mjs - Sequential Batch Production Engine (Clean Typography Mode)
// Restores exact clean, unboxed typography from Videos 1-4 with exact ayah word splits.
import { produceQuranV2Video } from './produce_quran_v2_batch.mjs';

const BATCHES_TO_CLEAN = [
  // Video #6 (Series #6): Surah 2:19 (Word 9 "يَجْعَلُونَ") to 2:21 -> 68.71s
  { seriesNumber: 6, surah: 2, startAyah: 19, endAyah: 21, startWord: 9, endWord: null, category: 'cascading_waterfalls_rivers', jobId: 'quran_v2_minshawi_1795284034662' },
  // Video #7 (Series #7): Surah 2:22 to 2:23 (Word 12 "مِّثْلِهِۦ") -> 54.46s
  { seriesNumber: 7, surah: 2, startAyah: 22, endAyah: 23, startWord: 1, endWord: 12, category: 'misty_forests_big_trees', jobId: 'quran_v2_minshawi_1795284959354' },
  // Video #8 (Series #8): Surah 2:23 (Word 13 "وَٱدْعُوا۟") to 2:25 (Word 31 "مُّطَهَّرَةٌۭ ۖ") -> 76.11s
  { seriesNumber: 8, surah: 2, startAyah: 23, endAyah: 25, startWord: 13, endWord: 31, category: 'grand_mosques', jobId: 'quran_v2_minshawi_1795287674552' },
  // Video #9 (Series #9): Surah 2:25 (Word 32 "وَهُمْ") to 2:27 (Word 7 "مِيثَـٰقِهِۦ") -> 66.56s
  { seriesNumber: 9, surah: 2, startAyah: 25, endAyah: 27, startWord: 32, endWord: 7, category: 'al_madinah', jobId: 'quran_v2_minshawi_1795288768844' },
  // Video #10 (Series #10): Surah 2:27 (Word 8 "وَيَقْطَعُونَ") to 2:29 -> 61.78s
  { seriesNumber: 10, surah: 2, startAyah: 27, endAyah: 29, startWord: 8, endWord: null, category: 'majestic_mountains_skies', jobId: 'quran_v2_minshawi_1795289562897' },
  // Video #11 (Series #11): Surah 2:30 to 2:31 -> 68.58s
  { seriesNumber: 11, surah: 2, startAyah: 30, endAyah: 31, startWord: 1, endWord: null, category: 'cascading_waterfalls_rivers', jobId: 'quran_v2_minshawi_1795290345817' },
  // Video #12 (Series #12): Surah 2:32 to 2:34 -> 73.46s
  { seriesNumber: 12, surah: 2, startAyah: 32, endAyah: 34, startWord: 1, endWord: null, category: 'misty_forests_big_trees', jobId: 'quran_v2_minshawi_1795291127658' }
];

async function main() {
  console.log(`\n======================================================`);
  console.log(`[Quran Studio V2] CLEAN RE-RENDER BATCH: ${BATCHES_TO_CLEAN.length} VIDEOS`);
  console.log(`Style: Exact 1-to-4 clean floating typography (no boxes, no borders)`);
  console.log(`Fonts: Amiri Quran (48-56px white) + Plus Jakarta Sans (24px gold)`);
  console.log(`Visuals: Reusing 100% existing Flow Nano Banana 2.1 scenes`);
  console.log(`Destination: GitHub Vault (stock-videos) -> Cloud Publish Queue`);
  console.log(`======================================================\n`);

  for (let idx = 0; idx < BATCHES_TO_CLEAN.length; idx++) {
    const batch = BATCHES_TO_CLEAN[idx];
    console.log(`\n>>> CLEAN BATCH ${idx + 1} OF ${BATCHES_TO_CLEAN.length}: Series #${batch.seriesNumber} (Surah ${batch.surah}:${batch.startAyah}-${batch.endAyah}) <<<`);
    
    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      attempts++;
      try {
        if (attempts > 1) {
          console.log(`\n🔄 Retrying Batch Series #${batch.seriesNumber} (Attempt ${attempts}/3)...`);
        }
        const res = await produceQuranV2Video(batch);
        console.log(`\n>>> COMPLETED CLEAN BATCH ${idx + 1} OF ${BATCHES_TO_CLEAN.length}: ${res.outputMp4} <<<`);
        console.log(`Duration: ${res.totalDuration.toFixed(2)}s`);
        console.log(`Download URL: ${res.downloadUrl}`);
        success = true;
      } catch (err) {
        console.error(`\n❌ ERROR IN BATCH Series #${batch.seriesNumber} (Attempt ${attempts}/3):`, err);
        if (attempts >= 3) {
          console.error(`\nBatch Series #${batch.seriesNumber} failed after 3 attempts. Aborting.`);
          process.exit(1);
        }
        console.log(`Waiting 10s before retry...`);
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }

  console.log(`\n🎉 ALL 8 VIDEOS (5-12) RE-RENDERED WITH CLEAN TYPOGRAPHY & PUSHED TO GITHUB! 🎉\n`);
}

main().catch(err => {
  console.error('Fatal crash:', err);
  process.exit(1);
});
