// scripts/server.mjs - Lightweight Quran Studio API Microservice for n8n & Chrome Extension Bridge
import http from 'http';
import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { produceWorkflow1 } from './produce_workflow_1.mjs';
import { produceWorkflow2 } from './produce_workflow_2.mjs';
import { produceWorkflow3 } from './produce_workflow_3.mjs';
import { getNextPassage } from './passage_catalogue.mjs';
import { loadQueue, saveQueue, addToQueue, checkBufferLimits, dispatchNext, CHANNELS } from './publish_queue_manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const VEO_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'veo');
const PORT = 5056;

if (!fs.existsSync(VEO_DIR)) fs.mkdirSync(VEO_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// High-Speed Auto Public Ingest Tunnel for Buffer / Cloud Schedulers (Cloudflare Edge with SSH fallback)
let publicBaseUrl = null;
const CLOUDFLARED_BIN = path.join(ROOT_DIR, 'bin', 'cloudflared.exe');

function initPublicTunnel() {
  if (fs.existsSync(CLOUDFLARED_BIN)) {
    try {
      console.log('[Tunnel] Launching high-speed Cloudflare Edge Tunnel...');
      const cf = spawn(CLOUDFLARED_BIN, ['tunnel', '--url', `http://127.0.0.1:${PORT}`]);
      const handleData = (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
        if (match && !publicBaseUrl) {
          publicBaseUrl = match[0];
          console.log(`[Buffer Ingest Tunnel] Ultra-fast Cloudflare Edge ready: ${publicBaseUrl}`);
          setTimeout(() => {
            dispatchNext({ publicBaseUrl }).then(res => {
              if (res.dispatched) {
                console.log(`[Auto Dispatch on Tunnel Ready]:`, res.message);
              }
            }).catch(err => console.warn('[Auto Dispatch Error]:', err.message));
          }, 1500);
        }
      };
      cf.stdout.on('data', handleData);
      cf.stderr.on('data', handleData);
      cf.on('close', () => {
        console.log('[Tunnel] Cloudflare closed. Reconnecting in 5s...');
        publicBaseUrl = null;
        setTimeout(initPublicTunnel, 5000);
      });
      cf.on('error', (err) => {
        console.warn('[Tunnel] Cloudflare notice, falling back to SSH:', err.message);
        initSshTunnel();
      });
      return;
    } catch (e) {
      console.warn('[Tunnel] Cloudflare attempt failed, falling back to SSH:', e.message);
    }
  }
  initSshTunnel();
}

function initSshTunnel() {
  try {
    const ssh = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-R', `80:127.0.0.1:${PORT}`,
      'nokey@localhost.run'
    ]);
    ssh.stdout.on('data', (data) => {
      const match = data.toString().match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
      if (match && !publicBaseUrl) {
        publicBaseUrl = match[0];
        console.log(`[Buffer Ingest Tunnel] Public stream ready (SSH): ${publicBaseUrl}`);
        setTimeout(() => {
          dispatchNext({ publicBaseUrl }).then(res => {
            if (res.dispatched) {
              console.log(`[Auto Dispatch on Tunnel Ready]:`, res.message);
            }
          }).catch(err => console.warn('[Auto Dispatch Error]:', err.message));
        }, 2000);
      }
    });
    ssh.on('close', () => {
      console.log('[Buffer Ingest Tunnel] SSH Closed. Reconnecting in 5s...');
      publicBaseUrl = null;
      setTimeout(initPublicTunnel, 5000);
    });
    ssh.on('error', (err) => {
      console.warn('[Buffer Ingest Tunnel] SSH notice:', err.message);
    });
  } catch (e) {
    console.warn('[Buffer Ingest Tunnel] SSH spawn skipped:', e.message);
  }
}
initPublicTunnel();

// Periodic queue check every 15 minutes to auto-fill Buffer when posts go live
setInterval(() => {
  if (publicBaseUrl) {
    dispatchNext({ publicBaseUrl }).then(res => {
      if (res.dispatched) {
        console.log(`[Periodic Auto Dispatch]:`, res.message);
      }
    }).catch(err => console.warn('[Periodic Dispatch Error]:', err.message));
  }
}, 15 * 60 * 1000);

const jobEvents = new EventEmitter();

// Chrome Extension Bridge State
let pendingJob = {
  jobId: `wf3_veo_${Date.now()}`,
  surah: 94,
  startAyah: 5,
  count: 4,
  prompts: [
    "Cinematic vertical 9:16 macro shot of gentle rain droplets sliding down a window pane at twilight, warm glowing amber light in background, slow motion, hyper-realistic, calming, peaceful, 4k",
    "Cinematic vertical 9:16 slow motion close-up of a single candle flame flickering softly in a tranquil dark room, warm golden glow, soft bokeh, meditative, calming, 4k",
    "Cinematic vertical 9:16 aerial drone shot of gentle ocean waves washing over a quiet shoreline at dusk, soothing tidal motion, deep blue and teal tones, tranquil, 4k",
    "Cinematic vertical 9:16 time-lapse of majestic starry night sky and milky way over silhouetted peaceful mountains, serene cosmic atmosphere, spiritual, awe-inspiring, 4k"
  ]
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health Check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      studio: 'Quran Video Studio',
      port: PORT,
      workflows: ['Workflow 1 (Curated B-Roll)', 'Workflow 2 (Meta AI)', 'Workflow 3 (Google Veo)'],
      bridgePending: !!pendingJob,
      veoFilesReady: [1, 2, 3, 4].filter(i => fs.existsSync(path.join(VEO_DIR, `veo_scene_${i}.mp4`))).length
    }));
  }

  // --- Local Queue & Buffer Dispatch Endpoints ---
  // 1. Get Queue Status & Real-time Buffer Limits
  if (req.method === 'GET' && url.pathname === '/api/queue/status') {
    const queue = loadQueue();
    const limits = await checkBufferLimits();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      publicBaseUrl,
      pendingCount: queue.filter(i => i.status === 'pending').length,
      scheduledCount: queue.filter(i => i.status === 'scheduled').length,
      totalCount: queue.length,
      bufferLimits: limits,
      items: queue
    }));
  }

  // 2. Trigger Queue Dispatch (Checks slots and pushes next video if available)
  if (req.method === 'POST' && url.pathname === '/api/queue/dispatch') {
    const result = await dispatchNext({ publicBaseUrl });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  // 3. Sync Existing Output MP4 Files into Queue
  if (req.method === 'POST' && url.pathname === '/api/queue/sync-output') {
    const existingFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.mp4'));
    const queue = loadQueue();
    let addedCount = 0;
    for (const file of existingFiles) {
      if (!queue.some(q => q.videoFilename === file)) {
        addToQueue({
          jobId: `file_${path.basename(file, '.mp4')}`,
          title: 'تلاوة مباركة خاشعة - Quran Recitation',
          caption: 'تلاوة عطرة من آيات الذكر الحكيم 🕊️✨\\n\\n#قرآن #تلاوة #islam #Shorts #Reels #TikTok',
          videoFilename: file,
          engine: 'pre_rendered'
        });
        addedCount++;
      }
    }
    let dispatchRes = null;
    if (publicBaseUrl) {
      try {
        dispatchRes = await dispatchNext({ publicBaseUrl });
      } catch (e) {
        dispatchRes = { error: e.message };
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      scannedFiles: existingFiles.length,
      newlyAdded: addedCount,
      dispatchResult: dispatchRes
    }));
  }

  // --- Chrome Extension Bridge Endpoints ---
  // 1. Poll for pending tasks
  if (req.method === 'GET' && url.pathname === '/api/bridge/poll') {
    // Log poll count throttle
    if (!globalThis._pollCount) globalThis._pollCount = 0;
    globalThis._pollCount++;
    if (globalThis._pollCount % 10 === 1) {
      console.log(`[Bridge Server] Polled by client (total polls: ${globalThis._pollCount}, hasJob: ${!!pendingJob})`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      hasJob: !!pendingJob,
      job: pendingJob
    }));
  }

  // 2. Upload generated scene from extension
  if (req.method === 'POST' && url.pathname === '/api/bridge/upload-scene') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const sceneIndex = payload.sceneIndex;
        const targetFile = path.join(VEO_DIR, `veo_scene_${sceneIndex + 1}.mp4`);

        if (payload.videoData && payload.videoData.startsWith('data:video')) {
          const base64Data = payload.videoData.split(';base64,').pop();
          fs.writeFileSync(targetFile, base64Data, { encoding: 'base64' });
          console.log(`[Bridge Upload] Saved base64 video to ${targetFile} (${fs.statSync(targetFile).size} bytes)`);
        } else if (payload.videoUrl && payload.videoUrl.startsWith('http')) {
          console.log(`[Bridge Upload] Fetching video URL: ${payload.videoUrl}`);
          const fetchRes = await fetch(payload.videoUrl);
          const arrayBuf = await fetchRes.arrayBuffer();
          fs.writeFileSync(targetFile, Buffer.from(arrayBuf));
          console.log(`[Bridge Upload] Downloaded video to ${targetFile} (${fs.statSync(targetFile).size} bytes)`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sceneIndex, path: targetFile }));
      } catch (err) {
        console.error('[Bridge Upload Error]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 3. Mark job complete
  if (req.method === 'POST' && url.pathname === '/api/bridge/job-complete') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const payload = body ? JSON.parse(body) : {};
      const completedJobId = payload.jobId || (pendingJob ? pendingJob.jobId : null);
      pendingJob = null;

      console.log(`[Bridge] Job ${completedJobId} completed by extension! Triggering master Workflow 3 assemble...`);
      produceWorkflow3().then(result => {
        console.log('[Bridge] Master reel assembled successfully:', result.outputPath);
        if (completedJobId) {
          jobEvents.emit(`complete_${completedJobId}`, result);
        }
      }).catch(err => {
        console.error('[Bridge] Assembly error:', err);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  // Stream Output Video File (supports GET, HEAD, and HTTP 206 Range requests for browser video playback)
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/stream/')) {
    const filename = path.basename(url.pathname);
    const filePath = path.join(OUTPUT_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    const stat = fs.statSync(filePath);
    const contentType = filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    const range = req.headers.range;

    if (range && req.method === 'GET') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      return file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      if (req.method === 'HEAD') {
        return res.end();
      }
      const readStream = fs.createReadStream(filePath);
      return readStream.pipe(res);
    }
  }

  // Generate Reel Endpoint (Workflow 1, Workflow 2 & Workflow 3)
  const isGenerateEndpoint = req.method === 'POST' && (
    url.pathname === '/generate-quran-reel' ||
    url.pathname === '/generate-quran-reel-vibes' ||
    url.pathname === '/generate-quran-reel-veo'
  );

  if (isGenerateEndpoint) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        let params = {};
        if (body.trim()) {
          try { params = JSON.parse(body); } catch (e) {}
        }

        let engine = params.engine;
        if (!engine) {
          if (url.pathname.includes('veo')) engine = 'veo';
          else if (url.pathname.includes('vibes')) engine = 'vibes_ai';
          else engine = 'curated_broll';
        }

        let producer = produceWorkflow1;
        if (engine === 'vibes_ai') producer = produceWorkflow2;
        if (engine === 'veo' || engine === 'google_flow') {
          producer = produceWorkflow3;
          console.log('[API Veo] Initiating Autonomous Google Flow / Veo pipeline...');
        }

        const result = await producer({
          surah: params.surah,
          startAyah: params.startAyah,
          count: params.count,
          minDuration: params.minDuration || 60.0,
          reciterId: params.reciterId || 7,
          prompts: params.prompts,
          chosenCategories: params.chosenCategories
        });

        const videoFilename = path.basename(result.outputPath);
        const arabicFullText = (result.verses || []).map(v => v.text).join(' ۝ ');
        const verseKeys = (result.verses || []).map(v => v.key).join(', ');
        const reelTitle = `Surah ${result.startVerse?.surah || ''} (Ayahs ${verseKeys})`;
        const reelCaption = `Surah ${result.startVerse?.surah || ''} (Ayahs ${verseKeys})\n\n"${arabicFullText}"\n\nReciter: Mishari Rashid Alafasy\n\nRelax your heart and find peace in the words of the Almighty. 🕊️✨\n\n#quran #islam #relaxation #quranrecitation #peace #reels #shorts #tiktok`;

        // Automatically enqueue in local queue
        const queueItem = addToQueue({
          jobId: result.jobId,
          title: reelTitle,
          caption: reelCaption,
          videoFilename,
          surah: result.startVerse?.surah,
          verses: result.verses,
          engine
        });

        // Attempt immediate dispatch if publicBaseUrl is ready and Buffer has space
        let dispatchResult = null;
        if (publicBaseUrl) {
          try {
            dispatchResult = await dispatchNext({ publicBaseUrl });
          } catch (e) {
            console.warn('[Queue Auto-Dispatch Notice]:', e.message);
          }
        }

        const responseData = {
          success: true,
          job_id: result.jobId,
          engine,
          queue_item: queueItem,
          dispatch_result: dispatchResult,
          start_verse: result.startVerse,
          end_verse: result.endVerse,
          next_surah: result.nextSurah,
          next_ayah: result.nextAyah,
          verse_count: (result.verses || []).length,
          verses: result.verses,
          duration_seconds: result.totalDuration,
          render_time_seconds: parseFloat(result.renderDuration || '0'),
          local_file_path: result.outputPath,
          stream_url: `http://localhost:${PORT}/stream/${videoFilename}`,
          docker_stream_url: `http://host.docker.internal:${PORT}/stream/${videoFilename}`,
          public_stream_url: publicBaseUrl ? `${publicBaseUrl}/stream/${videoFilename}` : null,
          keyframes: (result.keyframes || []).map(k => ({
            ...k,
            url: `http://host.docker.internal:${PORT}/stream/${path.basename(k.thumbFile)}`
          })),
          prompts: result.prompts || [],
          chosenCategories: result.chosenCategories || []
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
      } catch (err) {
        console.error('[API Error]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Quran Studio API Microservice listening on http://localhost:${PORT}`);
  console.log(`Accessible from inside Docker n8n at http://host.docker.internal:${PORT}`);
});
