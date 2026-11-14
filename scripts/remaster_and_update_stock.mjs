// scripts/remaster_and_update_stock.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const QUEUE_FILE = path.join(ROOT_DIR, 'jobs', 'cloud_publish_queue.json');

// Auto-load .env
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/\r$/, '');
    }
  }
}

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'Pelele-hub/agy-pat';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const RELEASE_TAG = 'stock-videos';

async function ghFetch(url, options = {}) {
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'QuranVideoStudio-Remasterer',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

// 1. Remaster audio for a single video file
export function remasterVideoAudio(filePath) {
  const tempPath = filePath.replace(/\.mp4$/i, '_remaster_temp.mp4');
  console.log(`[Remaster] Processing: ${path.basename(filePath)}...`);

  // Audio filter: pitch shift +3.8% with preserved vocal formants, gentle mosque echo, subtle EQ
  const afFilter = 'rubberband=pitch=1.038:formant=preserved:pitchq=quality:detector=soft,aecho=0.8:0.88:28|40:0.18|0.12,equalizer=f=1200:t=q:w=2:g=-2.5,equalizer=f=3500:t=q:w=2:g=2';
  const cmd = `ffmpeg -y -i "${filePath}" -c:v copy -af "${afFilter}" -c:a aac -b:a 192k "${tempPath}"`;
  
  execSync(cmd, { stdio: 'inherit' });

  // Verify duration
  const origDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`).toString().trim());
  const newDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempPath}"`).toString().trim());
  
  console.log(`[Remaster] Duration check: Original=${origDur.toFixed(4)}s, Remastered=${newDur.toFixed(4)}s`);
  if (Math.abs(origDur - newDur) > 0.1) {
    throw new Error(`Duration mismatch detected: original ${origDur}s vs new ${newDur}s`);
  }

  // Replace original file
  fs.copyFileSync(tempPath, filePath);
  fs.unlinkSync(tempPath);
  console.log(`[Remaster] ✓ Successfully replaced ${path.basename(filePath)} with anti-claim remaster.`);
}

// 2. Upload/Replace asset in GitHub Release
export async function replaceAssetInRelease(repo, releaseData, filePath, filename) {
  const existingAsset = releaseData.assets.find(a => a.name === filename);
  if (existingAsset) {
    console.log(`[GitHub Vault] Removing existing asset ${filename} (ID: ${existingAsset.id})...`);
    const delRes = await ghFetch(`https://api.github.com/repos/${repo}/releases/assets/${existingAsset.id}`, {
      method: 'DELETE'
    });
    if (!delRes.ok && delRes.status !== 404) {
      console.warn(`[GitHub Vault] Warning deleting asset: ${await delRes.text()}`);
    } else {
      console.log(`[GitHub Vault] ✓ Deleted old asset ${filename}`);
    }
  }

  // Upload new asset
  const uploadUrl = releaseData.upload_url.replace(/\{.*\}/, `?name=${encodeURIComponent(filename)}`);
  const stats = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);

  console.log(`[GitHub Vault] Uploading remastered ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)...`);
  const res = await ghFetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': stats.size.toString()
    },
    body: stream,
    duplex: 'half'
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asset upload failed (${res.status}): ${err}`);
  }

  const asset = await res.json();
  console.log(`[GitHub Vault] ✓ Successfully uploaded! Permanent URL: ${asset.browser_download_url}`);
  return asset.browser_download_url;
}

// Main execution
async function main() {
  const targetIndex = process.argv[2] !== undefined ? parseInt(process.argv[2], 10) : null;
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));

  console.log(`[Remaster & Update] Fetching release info for ${GITHUB_REPO}...`);
  const relRes = await ghFetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${RELEASE_TAG}`);
  if (!relRes.ok) {
    throw new Error(`Failed to get release: ${await relRes.text()}`);
  }
  let releaseData = await relRes.json();

  const itemsToProcess = targetIndex !== null 
    ? [queue.items[targetIndex]]
    : queue.items.filter(it => it.status === 'pending');

  console.log(`[Remaster & Update] Found ${itemsToProcess.length} items to remaster.`);

  for (const item of itemsToProcess) {
    console.log(`\n========================================`);
    console.log(`Remastering: ${item.videoFilename} - ${item.title}`);
    console.log(`========================================`);
    const localPath = path.join(OUTPUT_DIR, item.videoFilename);
    if (!fs.existsSync(localPath)) {
      console.error(`[Error] File not found: ${localPath}`);
      continue;
    }

    // Remaster audio
    remasterVideoAudio(localPath);

    // Refresh release info to get fresh asset list
    const freshRel = await ghFetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${RELEASE_TAG}`);
    releaseData = await freshRel.json();

    // Replace in GitHub Release
    const newUrl = await replaceAssetInRelease(GITHUB_REPO, releaseData, localPath, item.videoFilename);
    item.cloudVideoUrl = newUrl;
  }

  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  console.log(`\n[Remaster & Update] All items processed and queue updated!`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(err => {
    console.error('[Fatal Error]:', err);
    process.exit(1);
  });
}
