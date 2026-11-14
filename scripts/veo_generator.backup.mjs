// scripts/veo_generator.mjs - Fully Autonomous Google Veo / Flow Background Generator
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const PROFILE_DIR = path.join(CONFIG_DIR, 'google_chrome_profile');
const STORAGE_STATE_PATH = path.join(CONFIG_DIR, 'google_flow_storage_state.json');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BRIDGE_SCRIPT_PATH = path.join(ROOT_DIR, 'chrome_extension', 'flow_main_bridge.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Generates Veo background scenes autonomously using Playwright + TobyFlow reverse-engineered bridge.
 */
export async function generateVeoScenes(options = {}) {
  const prompts = options.prompts || [
    "Cinematic vertical 9:16 macro shot of gentle rain droplets sliding down a window pane at twilight, warm glowing amber light in background, slow motion, hyper-realistic, calming, peaceful, 4k",
    "Cinematic vertical 9:16 slow motion close-up of a single candle flame flickering softly in a tranquil dark room, warm golden glow, soft bokeh, meditative, calming, 4k",
    "Cinematic vertical 9:16 aerial drone shot of gentle ocean waves washing over a quiet shoreline at dusk, soothing tidal motion, deep blue and teal tones, tranquil, 4k",
    "Cinematic vertical 9:16 time-lapse of majestic starry night sky and milky way over silhouetted peaceful mountains, serene cosmic atmosphere, spiritual, awe-inspiring, 4k"
  ];
  const outputDir = options.outputDir || path.join(ROOT_DIR, 'assets', 'visuals', 'veo');
  const count = options.count || Math.min(prompts.length, 4);
  const timeoutPerScene = options.timeoutPerScene || 150000; // 2.5 mins per scene

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Autonomous Veo Generator] Starting generation of ${count} scenes`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Using Playwright + Reverse-Engineered isTrusted Proxy Bridge`);
  console.log(`======================================================\n`);

  let browserContext = null;
  let isCdp = false;

  // 1. Attempt connection to existing Chrome with debugging port 9222
  try {
    const cdpBrowser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = cdpBrowser.contexts();
    browserContext = contexts[0];
    isCdp = true;
    console.log('[Autonomous Veo Generator] Connected to existing Chrome instance via CDP (port 9222)!');
  } catch (_) {
    console.log('[Autonomous Veo Generator] Launching dedicated persistent Chrome context...');
  }

  // 2. Fallback to persistent context with dedicated profile
  if (!browserContext) {
    if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });
    browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
      executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
      headless: false,
      storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-sandbox'
      ]
    });
  }

  const page = browserContext.pages()[0] || await browserContext.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  // 3. Inject the reverse-engineered flow_main_bridge.js into the MAIN world at document_start
  if (fs.existsSync(BRIDGE_SCRIPT_PATH)) {
    const bridgeCode = fs.readFileSync(BRIDGE_SCRIPT_PATH, 'utf8');
    await page.addInitScript({ content: bridgeCode });
    console.log('[Autonomous Veo Generator] Injected reverse-engineered flow_main_bridge.js into MAIN world.');
  }

  // 4. Set up Network-level Video Interceptor to capture MP4 binaries
  let latestCapturedBuffer = null;
  let latestCapturedUrl = null;

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      const contentType = (response.headers()['content-type'] || '').toLowerCase();

      const isCandidate = url.includes('/asb/') ||
                          url.includes('flow-content.google') ||
                          url.includes('storage.googleapis.com') ||
                          contentType.includes('video/mp4');

      if (status >= 200 && status < 300 && isCandidate) {
        const buf = await response.body().catch(() => null);
        if (buf && buf.byteLength > 100000) { // Valid video is typically > 100KB
          console.log(`[Autonomous Veo Generator] Captured video stream at network layer: ${url.slice(0, 80)}... (${buf.byteLength} bytes)`);
          latestCapturedBuffer = buf;
          latestCapturedUrl = url;
        }
      }
    } catch (_) {}
  });

  try {
    // 5. Navigate to Google Flow
    console.log('[Autonomous Veo Generator] Navigating to https://flow.google.com...');
    await page.goto('https://flow.google.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4000);

    // 6. Enter Project if on landing or about page
    if (!page.url().includes('/project/')) {
      console.log('[Autonomous Veo Generator] Looking for project entrance button...');
      const enterBtn = await page.$('button:has-text("Créer avec Google"), button:has-text("Essayer dans Google"), button:has-text("New project"), button:has-text("Nouveau projet"), a:has-text("Créer avec Google"), a:has-text("New project")');
      if (enterBtn) {
        console.log('[Autonomous Veo Generator] Entering Google Flow studio...');
        await enterBtn.click();
        await sleep(5000);
      }
    }

    // 7. Loop through each prompt and generate
    const generatedClips = [];

    for (let i = 0; i < count; i++) {
      const prompt = prompts[i];
      const targetPath = path.join(outputDir, `veo_scene_${i + 1}.mp4`);
      console.log(`\n[Autonomous Veo Generator] --- Generating Scene ${i + 1}/${count} ---`);
      console.log(`Prompt: "${prompt.slice(0, 75)}..."`);

      latestCapturedBuffer = null;
      latestCapturedUrl = null;
      const sceneStartTime = Date.now();

      // Find Slate / ProseMirror editor
      const editorHandle = await page.waitForSelector('[data-slate-editor="true"], .ProseMirror, div[role="textbox"], div[contenteditable="true"]', { timeout: 15000 }).catch(() => null);
      if (!editorHandle) {
        console.warn(`[Autonomous Veo Generator] Editor not found for scene ${i + 1}. Attempting to focus container...`);
      }

      // Insert text cleanly into the editor using execCommand
      await page.evaluate((text) => {
        const editor = document.querySelector('[data-slate-editor="true"], .ProseMirror, div[role="textbox"], div[contenteditable="true"]');
        if (!editor) return false;

        editor.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);

        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);

        range.selectNodeContents(editor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);

        document.execCommand('insertText', false, text);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }, prompt);

      await sleep(1000);

      // Locate Submit / Generate button
      const submitFound = await page.evaluate(() => {
        const iconNames = ['arrow_upward', 'send', 'spark', 'play_arrow', 'auto_awesome'];
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));

        let target = null;
        for (const btn of buttons) {
          if (btn.disabled) continue;
          const text = (btn.innerText || '').trim().toLowerCase();
          if (iconNames.includes(text) || iconNames.some(n => text.startsWith(n))) {
            target = btn;
            break;
          }
          const icons = Array.from(btn.querySelectorAll('i, span, svg'));
          for (const ic of icons) {
            const icText = (ic.textContent || '').trim().toLowerCase();
            if (iconNames.includes(icText)) {
              target = btn;
              break;
            }
          }
          if (target) break;
        }

        if (!target) {
          target = buttons.find(b => !b.disabled && ['generate', 'create', 'run'].some(k => (b.innerText || '').toLowerCase().includes(k)));
        }

        if (target) {
          // Tag element for our main world bridge proxy
          const token = 'submit_token_' + Date.now();
          target.setAttribute('data-veo-token', token);
          window.postMessage({ action: 'VEO_ACTIVATE_SUBMIT', submitToken: token }, '*');
          return true;
        }
        return false;
      });

      console.log(`[Autonomous Veo Generator] Submit button triggered: ${submitFound}`);

      // Wait for generated video (timeout: 120s)
      console.log(`[Autonomous Veo Generator] Waiting for Veo render to complete...`);
      const pollStart = Date.now();
      let sceneSuccess = false;

      while (Date.now() - pollStart < timeoutPerScene) {
        await sleep(3000);

        // Check if network interceptor captured the file
        if (latestCapturedBuffer && latestCapturedBuffer.byteLength > 100000) {
          fs.writeFileSync(targetPath, latestCapturedBuffer);
          console.log(`[Autonomous Veo Generator] ✅ Scene ${i + 1} saved successfully to ${targetPath} (${latestCapturedBuffer.byteLength} bytes)!`);
          generatedClips.push(targetPath);
          sceneSuccess = true;
          break;
        }

        // Check for download buttons or video blobs in DOM
        const domVideoUrl = await page.evaluate(() => {
          const dl = document.querySelector('a[download]');
          if (dl && dl.href) return dl.href;
          const vids = Array.from(document.querySelectorAll('video')).filter(v => v.src && v.duration > 2);
          if (vids.length > 0) return vids[vids.length - 1].src;
          return null;
        });

        if (domVideoUrl && domVideoUrl.startsWith('http')) {
          console.log(`[Autonomous Veo Generator] Found video URL in DOM: ${domVideoUrl}. Downloading...`);
          try {
            const resp = await page.request.get(domVideoUrl);
            const body = await resp.body();
            if (body.byteLength > 100000) {
              fs.writeFileSync(targetPath, body);
              console.log(`[Autonomous Veo Generator] ✅ Scene ${i + 1} saved from DOM URL to ${targetPath}!`);
              generatedClips.push(targetPath);
              sceneSuccess = true;
              break;
            }
          } catch (_) {}
        }
      }

      if (!sceneSuccess) {
        console.warn(`[Autonomous Veo Generator] ⚠️ Scene ${i + 1} render timed out, checking for fallback...`);
      }

      await sleep(2000);
    }

    return {
      success: generatedClips.length > 0,
      generatedCount: generatedClips.length,
      clips: generatedClips
    };
  } finally {
    if (!isCdp && browserContext) {
      await browserContext.close().catch(() => {});
      console.log('[Autonomous Veo Generator] Browser context closed cleanly.');
    }
  }
}
