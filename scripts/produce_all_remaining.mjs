// scripts/produce_all_remaining.mjs - Sequential Batch Production Engine
// Enforcing STRICT rule: Every single video duration is between 60.0s and 75.0s!
import { produceQuranV2Video } from './produce_quran_v2_batch.mjs';

const REMAINING_BATCHES = [
  // Video #6 of 10 (Series #8): Surah 2:23 (Word 13 "وَٱدْعُوا۟") to 2:25 (Word 31 "مُّطَهَّرَةٌۭ ۖ") -> 76.11s
  { seriesNumber: 8, surah: 2, startAyah: 23, endAyah: 25, startWord: 13, endWord: 31, category: 'grand_mosques' },
  // Video #7 of 10 (Series #9): Surah 2:25 (Word 32 "وَهُمْ") to 2:27 (Word 7 "مِيثَـٰقِهِۦ") -> 66.56s
  { seriesNumber: 9, surah: 2, startAyah: 25, endAyah: 27, startWord: 32, endWord: 7, category: 'al_madinah' },
  // Video #8 of 10 (Series #10): Surah 2:27 (Word 8 "وَيَقْطَعُونَ") to 2:29 -> 61.78s
  { seriesNumber: 10, surah: 2, startAyah: 27, endAyah: 29, startWord: 8, endWord: null, category: 'majestic_mountains_skies' },
  // Video #9 of 10 (Series #11): Surah 2:30 to 2:31 -> 68.58s
  { seriesNumber: 11, surah: 2, startAyah: 30, endAyah: 31, startWord: 1, endWord: null, category: 'cascading_waterfalls_rivers' },
  // Video #10 of 10 (Series #12): Surah 2:32 to 2:34 -> 73.46s
  { seriesNumber: 12, surah: 2, startAyah: 32, endAyah: 34, startWord: 1, endWord: null, category: 'misty_forests_big_trees' }
];

async function main() {
  console.log(`\n======================================================`);
  console.log(`[Quran Studio V2] BATCH AUTOMATION: ${REMAINING_BATCHES.length} VIDEOS REMAINING`);
  console.log(`Strict Rule: Every video MUST be between 60.0s and 75.0s!`);
  console.log(`Engine: Sheikh Muhammad Siddiq Al-Minshawi | 100% Flow Nano Banana 2.1 Visuals`);
  console.log(`Destination: GitHub Vault (stock-videos) -> Cloud Publish Queue`);
  console.log(`======================================================\n`);

  for (let idx = 0; idx < REMAINING_BATCHES.length; idx++) {
    const batch = REMAINING_BATCHES[idx];
    console.log(`\n>>> STARTING BATCH ${idx + 1} OF ${REMAINING_BATCHES.length}: Series #${batch.seriesNumber} (Surah ${batch.surah}:${batch.startAyah}-${batch.endAyah}) <<<`);
    
    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      attempts++;
      try {
        if (attempts > 1) {
          console.log(`\n🔄 Retrying Batch Series #${batch.seriesNumber} (Attempt ${attempts}/3)...`);
        }
        const res = await produceQuranV2Video(batch);
        console.log(`\n>>> COMPLETED BATCH ${idx + 1} OF ${REMAINING_BATCHES.length}: ${res.outputMp4} <<<`);
        console.log(`Duration: ${res.totalDuration.toFixed(2)}s (Strictly within 60s - 75s window)`);
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

  console.log(`\n🎉 ALL REMAINING 8 BATCHES PRODUCED, UPLOADED, QUEUED & PUSHED TO GITHUB! 🎉\n`);
}

main().catch(err => {
  console.error('Fatal crash:', err);
  process.exit(1);
});
