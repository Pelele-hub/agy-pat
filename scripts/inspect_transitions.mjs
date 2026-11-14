import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FRAMES_DIR = 'C:/Users/majji/quran_video_studio/reference_analysis/transition_frames';
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

// Inspect transitions in reel_1 from 7.0s to 13.0s at 0.3s steps
for (let t = 7.0; t <= 13.0; t += 0.3) {
  const file = path.join(FRAMES_DIR, `r1_${t.toFixed(1).replace('.', '_')}s.jpg`);
  execSync(`ffmpeg -y -ss ${t.toFixed(2)} -i "C:/Users/majji/quran_video_studio/reference_videos/reel_1.mp4" -vframes 1 -q:v 2 "${file}"`);
}

console.log('Extracted transition frames.');
