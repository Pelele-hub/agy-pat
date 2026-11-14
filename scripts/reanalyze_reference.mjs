// scripts/reanalyze_reference.mjs
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const REF_DIR = path.join(ROOT_DIR, 'reference_videos');
const OUT_DIR = path.join(ROOT_DIR, 'reference_analysis', 'transition_detail');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('Analyzing Reference Reels for Transitions, Pacing & Audio...');

for (const reel of ['reel_1.mp4', 'reel_2.mp4', 'reel_3.mp4']) {
  const reelPath = path.join(REF_DIR, reel);
  if (!fs.existsSync(reelPath)) continue;

  console.log(`\n=================== ${reel} ===================`);
  // Get duration
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${reelPath}"`).toString().trim());
  console.log(`Duration: ${dur.toFixed(2)}s`);

  // Detect black frames or low luminance frames (dip to dark)
  // We can extract a frame every 0.2s from 9s to 14s for reel_1
  if (reel === 'reel_1.mp4') {
    console.log('Extracting fine-grained transition frames between 10.0s and 13.0s...');
    for (let t = 10.0; t <= 13.0; t += 0.25) {
      const outImg = path.join(OUT_DIR, `reel1_${t.toFixed(2).replace('.', '_')}s.jpg`);
      execSync(`ffmpeg -y -ss ${t.toFixed(2)} -i "${reelPath}" -vframes 1 -q:v 2 "${outImg}"`);
    }
  }

  // Also check reel_2 transition if any
  if (reel === 'reel_2.mp4') {
    console.log('Extracting frames across reel_2 at 0s, 4s, 8s, 12s, 16s, 20s...');
    for (let t = 0; t <= Math.min(dur, 20); t += 4) {
      const outImg = path.join(OUT_DIR, `reel2_${t.toFixed(0)}s.jpg`);
      execSync(`ffmpeg -y -ss ${t} -i "${reelPath}" -vframes 1 -q:v 2 "${outImg}"`);
    }
  }
}
console.log('Done!');
