// scripts/veo_cdp.mjs - 100% Autonomous Chrome DevTools Protocol (CDP) Engine for Google Veo
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CDP_URL = 'http://localhost:9222';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Checks if Chrome is responding on remote debugging port 9222
 */
export async function checkCDPConnection() {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { up: false, reason: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      up: true,
      browser: data.Browser,
      webSocketDebuggerUrl: data.webSocketDebuggerUrl
    };
  } catch (err) {
    return { up: false, reason: err.message };
  }
}

/**
 * Ensures Chrome is actively running with --remote-debugging-port=9222.
 * Auto-launches Chrome if not already running with CDP.
 */
export async function ensureChromeRunning() {
  let cdp = await checkCDPConnection();
  if (cdp.up) {
    return true;
  }

  console.log('[Veo CDP Engine] Chrome remote debugging port 9222 not active. Initializing Chrome in background...');

  // If Chrome is already running without port 9222, close it so port 9222 can bind
  try {
    execSync('taskkill /f /im chrome.exe 2>NUL');
    await sleep(2000);
  } catch (e) {}

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--remote-debugging-port=9222',
    'https://flow.google.com'
  ], {
    detached: true,
    stdio: 'ignore'
  });
  chromeProc.unref();

  // Wait for port 9222 to come online (up to 20s)
  const startTime = Date.now();
  while (Date.now() - startTime < 20000) {
    await sleep(1500);
    cdp = await checkCDPConnection();
    if (cdp.up) {
      console.log(`[Veo CDP Engine] ✅ Chrome connected on port 9222 (${cdp.browser})!`);
      return true;
    }
  }

  throw new Error('Failed to auto-start Chrome with remote debugging on port 9222.');
}

/**
 * Connects to Chrome over CDP and returns the Google Flow page inside a project.
 */
export async function getFlowPage() {
  await ensureChromeRunning();

  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error('No active browser contexts found in Chrome CDP connection.');
  }

  const context = contexts[0];
  let pages = context.pages();

  let flowPage = pages.find(p => p.url().includes('flow.google.com') || p.url().includes('labs.google'));

  if (!flowPage) {
    console.log('[Veo CDP Engine] Opening Google Flow tab...');
    flowPage = await context.newPage();
    await flowPage.goto('https://flow.google.com', { waitUntil: 'domcontentloaded' });
    await sleep(4000);
  }

  await flowPage.bringToFront();

  // If on home landing page, click into the most recent project or create one
  if (!flowPage.url().includes('/project/')) {
    console.log('[Veo CDP Engine] Navigating into active Google Flow project...');
    try {
      await flowPage.waitForSelector('flow-project-card, .project-card, a[href*="/project/"], button[aria-label*="Nouveau"], button[aria-label*="New"]', { timeout: 8000 });
      const projectCard = flowPage.locator('flow-project-card, .project-card, a[href*="/project/"]').first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
      } else {
        const newProjBtn = flowPage.locator('button[aria-label*="Nouveau"], button[aria-label*="New"]').first();
        await newProjBtn.click();
      }
      await sleep(4000);
    } catch (e) {
      console.log('[Veo CDP Engine] Already on project shell or root.');
    }
  }

  return { browser, flowPage };
}

/**
 * Generates a single Veo video clip via direct CDP.
 */
export async function generateSingleClipCDP({ prompt, outputPath, timeoutMs = 450000 }) {
  console.log(`\n======================================================`);
  console.log(`[Veo CDP Engine] Direct Google Veo Generation Triggered`);
  console.log(`Prompt: "${prompt.slice(0, 80)}..."`);
  console.log(`Target: ${outputPath}`);
  console.log(`======================================================\n`);

  const { browser, flowPage: page } = await getFlowPage();

  try {
    await sleep(1500);

    // 1. Locate Prompt Input (ProseMirror / ContentEditable)
    const promptSelector = 'div[role="textbox"][contenteditable="true"], .ProseMirror';
    await page.waitForSelector(promptSelector, { timeout: 20000 });
    const promptInput = page.locator(promptSelector).first();

    await promptInput.click();
    await sleep(400);

    // Clear existing text
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await sleep(200);

    // Paste prompt text directly
    await page.evaluate(({ selector, text }) => {
      const el = document.querySelector(selector);
      if (el) {
        el.focus();
        document.execCommand('insertText', false, text);
      }
    }, { selector: promptSelector, text: prompt });

    await sleep(600);

    // 2. Intercept video download stream or CDN URLs from Google
    let capturedVideoUrl = null;
    const responseHandler = async (response) => {
      const url = response.url();
      if (url.includes('flow-content.google/video/') || (url.includes('.mp4') && url.includes('google'))) {
        console.log(`[Veo CDP Engine] 🎯 Video stream detected on Google CDN!`);
        capturedVideoUrl = url;
      }
    };
    page.on('response', responseHandler);

    // 3. Click Submit Button (Lancer la génération)
    const submitSelector = 'button[type="submit"], button[aria-label*="Lancer"], button[aria-label*="Submit"], flow-icon-button button';
    const submitBtn = page.locator(submitSelector).first();
    await submitBtn.click();
    console.log('[Veo CDP Engine] Generation launched! Rendering in Google Flow with your full credits...');

    // 4. Wait for Render to Complete
    const startTime = Date.now();
    let downloaded = false;

    while (Date.now() - startTime < timeoutMs) {
      if (capturedVideoUrl) {
        console.log(`[Veo CDP Engine] Downloading generated video directly from Google CDN...`);
        const res = await fetch(capturedVideoUrl);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(outputPath, buffer);
          downloaded = true;
          break;
        }
      }

      // Check if progress bar has disappeared after at least 30s
      if (Date.now() - startTime > 35000) {
        const tileFinished = await page.evaluate(() => {
          const tile = document.querySelector('flow-video-tile, flow-grid-tile-container');
          if (!tile) return false;
          const hasProgressBar = tile.querySelector('.footer-overlay-has-progress-bar, [class*="progress"]');
          return !hasProgressBar;
        });

        if (tileFinished) {
          console.log('[Veo CDP Engine] Video tile rendering complete! Extracting video source...');
          await sleep(3000);

          const videoSrc = await page.evaluate(() => {
            const v = document.querySelector('flow-video-tile video, video');
            if (v && v.src && v.src.startsWith('http')) return v.src;
            const img = document.querySelector('flow-video-tile img.thumbnail');
            return img ? img.src : null;
          });

          if (videoSrc && (videoSrc.includes('.mp4') || videoSrc.includes('flow-content.google/video'))) {
            const res = await fetch(videoSrc);
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer());
              fs.writeFileSync(outputPath, buffer);
              downloaded = true;
              break;
            }
          }
        }
      }

      await sleep(3000);
    }

    page.off('response', responseHandler);

    if (!downloaded || !fs.existsSync(outputPath) || fs.statSync(outputPath).size < 100000) {
      throw new Error(`Veo CDP generation timed out or failed to download valid video file.`);
    }

    const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
    console.log(`[Veo CDP Engine] ✅ Scene ready: ${outputPath} (${fileSize} MB)`);

    return {
      success: true,
      file: outputPath,
      sizeBytes: fs.statSync(outputPath).size
    };
  } finally {
    await browser.close();
  }
}

/**
 * Generates multiple Veo background scenes via direct CDP.
 */
export async function generateVeoScenesCDP(options = {}) {
  const prompts = options.prompts || [];
  const outputDir = options.outputDir;
  const count = options.count || prompts.length;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const generatedClips = [];

  for (let i = 0; i < count; i++) {
    const targetFile = path.join(outputDir, `veo_scene_${i + 1}.mp4`);
    console.log(`\n[Veo CDP Engine] --- Scene ${i + 1}/${count} ---`);

    const result = await generateSingleClipCDP({
      prompt: prompts[i],
      outputPath: targetFile,
      timeoutMs: options.timeoutMs || 450000
    });

    generatedClips.push(result.file);
    await sleep(2000); // brief cooldown between scenes
  }

  return {
    success: generatedClips.length === count,
    clips: generatedClips
  };
}
