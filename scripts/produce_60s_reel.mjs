// scripts/produce_60s_reel.mjs - Produce 60s+ Cinematic Quran Reel (Surah Al-Mulk 67:1-5)
import path from 'path';
import { fileURLToPath } from 'url';
import { produceWorkflow1 } from './produce_workflow_1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BROLL_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'broll');

async function main() {
  console.log('================================================================');
  console.log(' PRODUCING 60s+ MASTER REEL: SURAH AL-MULK (67:1 - 67:5)');
  console.log(' Target Duration: ~76.5s (Exceeds 60s minimum requirement)');
  console.log(' Reciter: Sheikh Mishari Rashid Alafasy (Continuous Studio Take)');
  console.log(' Pacing: Meditative, Nocturnal & Relaxing Dip-to-Black Transitions');
  console.log('================================================================\n');

  const brollSelection = [
    path.join(BROLL_DIR, 'mulk_scene_1_night_stars.mp4'),  // 67:1 - Cosmic night stars & celestial majesty
    path.join(BROLL_DIR, 'mulk_scene_2_candle.mp4'),       // 67:2 - Warm candlelight in darkness (Life & Death)
    path.join(BROLL_DIR, 'mulk_scene_3_moon_clouds.mp4'),   // 67:3 - Moon through 7 layered clouds (Seven Heavens)
    path.join(BROLL_DIR, 'ocean_twilight.mp4'),            // 67:4 - Rolling ocean at twilight (Sight returning humbled)
    path.join(BROLL_DIR, 'mulk_scene_5_milky_way.mp4')     // 67:5 - Radiant starry heavens (Lamps adorning heaven)
  ];

  const result = await produceWorkflow1({
    job_id: `wf1_mulk_60s_${Date.now()}`,
    surah: 67,
    startAyah: 1,
    count: 5,
    reciterId: 7,
    broll: brollSelection,
    cardY: 740
  });

  console.log('\n================================================================');
  console.log(' 60s+ PRODUCTION COMPLETE!');
  console.log(` Output: ${result.outputPath}`);
  console.log(` Duration: ${result.totalDuration.toFixed(2)}s`);
  console.log(` Render Time: ${result.renderDuration}s`);
  console.log(' Keyframes Generated:');
  result.keyframes.forEach(k => {
    console.log(`  - [${k.timestamp}s] ${k.verseKey || k.transition}: ${k.thumbFile}`);
  });
  console.log('================================================================\n');
}

main().catch(console.error);
