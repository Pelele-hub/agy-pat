// scripts/inspect_broll.mjs
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const dir = path.join(ROOT_DIR, 'assets', 'visuals', 'broll');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4'));
for (const f of files) {
  const p = path.join(dir, f);
  const info = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of default=noprint_wrappers=1 "${p}"`, { encoding: 'utf-8' });
  console.log(`=== ${f} ===\n${info.trim()}\n`);
}
