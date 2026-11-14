// scripts/veo_generator.mjs - Fully Autonomous Google Veo Background Generator via Flow Connector Bridge
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BRIDGE_URL = 'http://127.0.0.1:8791';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Checks if the local Flow Connector Bridge is operational and extension is connected.
 */
export async function checkBridgeHealth() {
  try {
    const res = await fetch(`${BRIDGE_URL}/status?site=flow`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { up: false, reason: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      up: data.bridge === 'up',
      extensionConnected: !!data.extensionConnected,
      loggedIn: !!data.loggedIn,
      plan: data.plan,
      limits: data.limits,
      usedToday: data.usedToday,
      pausedReason: data.pausedReason
    };
  } catch (err) {
    return { up: false, reason: err.message };
  }
}

/**
 * Generates Veo background scenes autonomously via the Flow Connector HTTP Bridge.
 * 100% background, zero GUI manipulation, zero focus stealing.
 */
export async function generateVeoScenes(options = {}) {
  const prompts = options.prompts || [
    "Cinematic vertical 9:16 aerial drone shot of gentle turquoise ocean waves washing over a quiet shoreline at sunset, tranquil sea, slow motion, photorealistic, 4k",
    "Cinematic vertical 9:16 slow motion close-up of a single candle flame flickering softly in a tranquil dark room, warm golden glow, soft bokeh, meditative, calming, 4k",
    "Cinematic vertical 9:16 macro shot of gentle rain droplets sliding down a window pane at twilight, warm glowing amber light in background, slow motion, hyper-realistic, calming, peaceful, 4k",
    "Cinematic vertical 9:16 majestic starry night sky and milky way over silhouetted peaceful mountains, serene cosmic atmosphere, spiritual, awe-inspiring, 4k"
  ];
  const outputDir = options.outputDir || path.join(ROOT_DIR, 'assets', 'visuals', 'veo');
  const count = options.count || Math.min(prompts.length, 4);
  const imageModel = options.imageModel || 'veo-3.1-lite';
  const aspectRatio = options.aspectRatio || '9:16';
  const duration = options.duration || '8';
  const forceRegenerate = options.forceRegenerate === true;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Google Veo Engine] Generating ${count} scene(s) via Flow Bridge`);
  console.log(`Model: ${imageModel} | Format: ${aspectRatio} | Duration: ${duration}s`);
  console.log(`Target Directory: ${outputDir}`);
  console.log(`======================================================\n`);

  const health = await checkBridgeHealth();
  if (!health.up || !health.extensionConnected) {
    throw new Error(`Flow Connector Bridge unavailable: ${JSON.stringify(health)}`);
  }

  const generatedClips = [];

  for (let i = 0; i < count; i++) {
    const targetFile = path.join(outputDir, `veo_scene_${i + 1}.mp4`);
    if (fs.existsSync(targetFile) && !forceRegenerate) {
      console.log(`[Google Veo Engine] Scene ${i + 1} already cached at ${targetFile}`);
      generatedClips.push(targetFile);
      continue;
    }

    const prompt = prompts[i];
    console.log(`\n[Google Veo Engine] --- Submitting Scene ${i + 1}/${count} ---`);
    console.log(`Prompt: "${prompt.slice(0, 80)}..."`);

    const submitRes = await fetch(`${BRIDGE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: {
          prompt,
          mode: 'flow-text-to-video',
          params: {
            aspectRatio,
            videoOption: `${duration}s`,
            autoExtendCount: 0,
            imageModel,
            outputsPerPrompt: 1,
            downloadVideoQuality: '720p',
            downloadImageQuality: '1k',
            downloadSubfolder: 'quran-studio',
            autoRenameFiles: true
          }
        },
        imagePaths: [],
        client: 'quran-studio'
      })
    });

    const submitJson = await submitRes.json();
    if (!submitRes.ok || !submitJson.jobId) {
      throw new Error(`Failed to submit Veo job: ${JSON.stringify(submitJson)}`);
    }

    const jobId = submitJson.jobId;
    console.log(`[Google Veo Engine] Job queued! ID: ${jobId}. Rendering with Google Veo in background...`);

    const startTime = Date.now();
    let downloadPath = null;

    while (Date.now() - startTime < 600000) { // 10-minute timeout per scene
      try {
        const waitRes = await fetch(`${BRIDGE_URL}/jobs/${jobId}/wait?timeoutMs=25000`);
        const job = await waitRes.json();

        if (job.status === 'done') {
          if (job.files && job.files.length > 0) {
            downloadPath = job.files[0].path;
            break;
          }
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          throw new Error(`Veo Job ${jobId} failed with status: ${job.status} (${job.error || 'unknown error'})`);
        }
      } catch (pollErr) {
        if (pollErr.message && pollErr.message.includes('failed with status')) throw pollErr;
      }
      await sleep(2000);
    }

    if (!downloadPath || !fs.existsSync(downloadPath)) {
      throw new Error(`Veo Job ${jobId} timed out or downloaded file not found on disk.`);
    }

    // Copy downloaded video to scene target
    fs.copyFileSync(downloadPath, targetFile);
    const fileSize = (fs.statSync(targetFile).size / (1024 * 1024)).toFixed(2);
    console.log(`[Google Veo Engine] ✅ Scene ${i + 1} ready: ${targetFile} (${fileSize} MB)`);
    generatedClips.push(targetFile);
  }

  return {
    success: generatedClips.length === count,
    generatedCount: generatedClips.length,
    clips: generatedClips
  };
}
