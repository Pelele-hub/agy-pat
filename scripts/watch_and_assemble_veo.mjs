// scripts/watch_and_assemble_veo.mjs - Watch for Google Veo generation and assemble Workflow 3
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { produceWorkflow3 } from './produce_workflow_3.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const VEO_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'veo');
const DOWNLOADS_DIR = path.join(process.env.USERPROFILE, 'Downloads');

const startTime = new Date(Date.now() - 5 * 60 * 1000); // Look for files created in last 5 mins

console.log('=== WATCHING FOR GOOGLE VEO GENERATION ===');
console.log('Monitoring:');
console.log(' 1. Downloads:', DOWNLOADS_DIR);
console.log(' 2. Veo Dir:', VEO_DIR);
console.log('Time threshold:', startTime.toISOString());

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const maxWaitMs = 10 * 60 * 1000; // wait up to 10 minutes
  const pollStart = Date.now();
  let collectedClips = [];

  while (Date.now() - pollStart < maxWaitMs) {
    // 1. Check Downloads directory for any fresh MP4s
    if (fs.existsSync(DOWNLOADS_DIR)) {
      const files = fs.readdirSync(DOWNLOADS_DIR)
        .filter(f => f.toLowerCase().endsWith('.mp4'))
        .map(f => {
          const fullPath = path.join(DOWNLOADS_DIR, f);
          const stat = fs.statSync(fullPath);
          return { name: f, fullPath, mtime: stat.mtime, size: stat.size };
        })
        .filter(f => f.mtime > startTime && f.size > 100000)
        .sort((a, b) => a.mtime - b.mtime); // chronological order

      for (const f of files) {
        if (!collectedClips.some(c => c.fullPath === f.fullPath)) {
          console.log(`[Veo Watcher] Found new download: ${f.name} (${(f.size / (1024 * 1024)).toFixed(2)} MB)`);
          collectedClips.push(f);
        }
      }
    }

    // 2. Check VEO_DIR for fresh uploaded files
    const veoFiles = [1, 2, 3, 4].map(i => {
      const p = path.join(VEO_DIR, `veo_scene_${i}.mp4`);
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        return { index: i, fullPath: p, mtime: stat.mtime, size: stat.size };
      }
      return null;
    }).filter(Boolean);

    const freshVeoUploads = veoFiles.filter(f => f.mtime > startTime);

    if (freshVeoUploads.length >= 4) {
      console.log('[Veo Watcher] All 4 Veo scenes received in assets/visuals/veo!');
      break;
    }

    if (collectedClips.length >= 4) {
      console.log('[Veo Watcher] 4 new clips found in Downloads! Copying to assets/visuals/veo...');
      for (let i = 0; i < 4; i++) {
        const dest = path.join(VEO_DIR, `veo_scene_${i + 1}.mp4`);
        fs.copyFileSync(collectedClips[i].fullPath, dest);
        console.log(`Copied ${collectedClips[i].name} -> veo_scene_${i + 1}.mp4`);
      }
      break;
    }

    console.log(`[Veo Watcher] Waiting for Veo clips... Found: ${Math.max(freshVeoUploads.length, collectedClips.length)}/4. Elapsed: ${((Date.now() - pollStart) / 1000).toFixed(0)}s`);
    await sleep(4000);
  }

  console.log('\n======================================================');
  console.log('[Veo Watcher] Assembling Workflow 3 Master Reel with Real Veo Clips!');
  console.log('======================================================\n');

  const result = await produceWorkflow3({
    surah: 94,
    startAyah: 5,
    count: 4,
    reciterId: 7
  });

  console.log('\n[Veo Watcher] SUCCESS! Master Video Ready:');
  console.log(result.outputPath);
}

main().catch(err => {
  console.error('[Veo Watcher] Error:', err);
  process.exit(1);
});
