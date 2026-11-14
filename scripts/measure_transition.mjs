// scripts/measure_transition.mjs
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const dir = path.join(ROOT_DIR, 'reference_analysis', 'transition_detail');

const frames = ['reel1_11_50s.jpg', 'reel1_11_75s.jpg', 'reel1_12_00s.jpg', 'reel1_12_25s.jpg', 'reel1_12_50s.jpg', 'reel1_12_75s.jpg'];
for (const f of frames) {
  const p = path.join(dir, f);
  const stat = execSync(`ffmpeg -i "${p}" -vf "crop=800:300:140:880,signalstats,metadata=print" -f null - 2>&1`, { encoding: 'utf-8' });
  const m = stat.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/);
  console.log(`${f} text region brightness: ${m ? m[1] : 'N/A'}`);
}
