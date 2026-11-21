// scripts/produce_all_remaining.mjs - Sequential Batch Production Engine
import { produceQuranV2Video } from './produce_quran_v2_batch.mjs';

const REMAINING_BATCHES = [
  { seriesNumber: 5, surah: 2, startAyah: 16, endAyah: 18, category: 'majestic_mountains_skies' },
  { seriesNumber: 6, surah: 2, startAyah: 19, endAyah: 20, category: 'cascading_waterfalls_rivers' },
  { seriesNumber: 7, surah: 2, startAyah: 21, endAyah: 22, category: 'misty_forests_big_trees' },
  { seriesNumber: 8, surah: 2, startAyah: 23, endAyah: 24, category: 'grand_mosques' },
  { seriesNumber: 9, surah: 2, startAyah: 25, endAyah: 25, category: 'al_madinah' },
  { seriesNumber: 10, surah: 2, startAyah: 26, endAyah: 26, category: 'majestic_mountains_skies' },
  { seriesNumber: 11, surah: 2, startAyah: 27, endAyah: 28, category: 'cascading_waterfalls_rivers' },
  { seriesNumber: 12, surah: 2, startAyah: 29, endAyah: 30, category: 'misty_forests_big_trees' }
];

async function main() {
  console.log(`\n======================================================`);
  console.log(`[Quran Studio V2] BATCH AUTOMATION: ${REMAINING_BATCHES.length} VIDEOS REMAINING`);
  console.log(`Engine: Sheikh Muhammad Siddiq Al-Minshawi | 100% Flow Nano Banana 2.1 Visuals`);
  console.log(`Destination: GitHub Vault (stock-videos) -> Cloud Publish Queue`);
  console.log(`======================================================\n`);

  for (let idx = 0; idx < REMAINING_BATCHES.length; idx++) {
    const batch = REMAINING_BATCHES[idx];
    console.log(`\n>>> STARTING BATCH ${idx + 1} OF ${REMAINING_BATCHES.length}: Series #${batch.seriesNumber} (Surah ${batch.surah}:${batch.startAyah}-${batch.endAyah}) <<<`);
    try {
      const res = await produceQuranV2Video(batch);
      console.log(`\n>>> COMPLETED BATCH ${idx + 1} OF ${REMAINING_BATCHES.length}: ${res.outputMp4} <<<`);
      console.log(`Download URL: ${res.downloadUrl}`);
    } catch (err) {
      console.error(`\n❌ ERROR IN BATCH Series #${batch.seriesNumber}:`, err);
      process.exit(1);
    }
  }

  console.log(`\n🎉 ALL REMAINING 8 BATCHES PRODUCED, UPLOADED, QUEUED & PUSHED TO GITHUB! 🎉\n`);
}

main().catch(err => {
  console.error('Fatal crash:', err);
  process.exit(1);
});
