// scripts/tobyflow_runner.mjs - Standalone Autonomous Runner using TobyFlow's EXACT Codebase
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const TOBY_DIR = 'C:\\Users\\majji\\tobyflow_extracted';
const PROFILE_DIR = path.join(ROOT_DIR, 'config', 'google_chrome_profile');
const OUTPUT_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'veo');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Read the exact TobyFlow scripts
const slateBridgeSrc = fs.readFileSync(path.join(TOBY_DIR, 'slate-bridge.js'), 'utf8');
const mediaInterceptorSrc = fs.readFileSync(path.join(TOBY_DIR, 'media-interceptor.js'), 'utf8');

export async function runTobyFlowGeneration(promptText, outputFile) {
  console.log('\n======================================================');
  console.log('[TobyFlow Native Runner] Starting Video Generation');
  console.log('Prompt:', promptText);
  console.log('Target Output:', outputFile);
  console.log('======================================================\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false, // Visible so Google bot protection does not trigger WebLite fallback
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--no-sandbox'
    ]
  });

  const page = context.pages()[0] || await context.newPage();

  // Inject TobyFlow MAIN world scripts at document_start (exact TobyFlow manifest configuration)
  await page.addInitScript({ content: slateBridgeSrc });
  await page.addInitScript({ content: mediaInterceptorSrc });

  // Hook network responses for video capture (TobyFlow method)
  let capturedVideoBuffer = null;
  page.on('response', async (res) => {
    try {
      const url = res.url();
      const status = res.status();
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (status >= 200 && status < 300 && (url.includes('/asb/') || url.includes('flow-content.google') || ct.includes('video/mp4'))) {
        const buf = await res.body().catch(() => null);
        if (buf && buf.byteLength > 150000) {
          console.log(`[TobyFlow Interceptor] 🎯 Captured video stream: ${url.slice(0, 80)}... (${buf.byteLength} bytes)`);
          capturedVideoBuffer = buf;
        }
      }
    } catch (_) {}
  });

  console.log('[TobyFlow Native Runner] Navigating to https://flow.google.com...');
  await page.goto('https://flow.google.com', { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Wait for user to be inside a project or open one
  console.log('[TobyFlow Native Runner] Waiting for Flow project editor to load...');
  let editorFound = false;
  const waitEditorStart = Date.now();

  while (Date.now() - waitEditorStart < 120000) {
    const curUrl = page.url();
    if (curUrl.includes('/about') || curUrl.includes('/signin')) {
      console.log(`[TobyFlow Native Runner] Waiting for authentication... Current URL: ${curUrl}`);
      // Click Créer button if on landing
      const cta = await page.$('button:has-text("Créer avec Google"), button:has-text("Essayer"), a:has-text("Créer avec Google")').catch(() => null);
      if (cta) await cta.click().catch(() => {});
    }

    const hasEditor = await page.evaluate(() => {
      return !!document.querySelector('[data-slate-editor="true"], .ProseMirror, div[role="textbox"]');
    }).catch(() => false);

    if (hasEditor) {
      editorFound = true;
      console.log('[TobyFlow Native Runner] ✅ Flow Editor detected!');
      break;
    }
    await page.waitForTimeout(3000);
  }

  if (!editorFound) {
    throw new Error('Flow project editor was not detected within timeout.');
  }

  await page.waitForTimeout(2000);

  // Execute TobyFlow's exact typing sequence
  console.log('[TobyFlow Native Runner] Inserting text into editor using TobyFlow Slate/ProseMirror method...');
  const textInserted = await page.evaluate((text) => {
    const editor = document.querySelector('[data-slate-editor="true"], .ProseMirror, div[role="textbox"]');
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
  }, promptText);

  console.log('[TobyFlow Native Runner] Text inserted:', textInserted);
  await page.waitForTimeout(1500);

  // Execute TobyFlow's exact submit sequence: activateV2Submit via Proxy
  console.log('[TobyFlow Native Runner] Triggering Submit using TobyFlow activateV2Submit proxy...');
  const submitDispatched = await page.evaluate(() => {
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

    if (!target) return false;

    const token = 'tf_submit_' + Date.now();
    target.setAttribute('data-tobyflow-submit-token', token);

    // Call TobyFlow slate-bridge.js handler
    window.postMessage({
      source: 'flow-auto-slate',
      action: 'activateV2Submit',
      submitToken: token
    }, window.location.origin);

    return true;
  });

  console.log('[TobyFlow Native Runner] Submit triggered:', submitDispatched);

  // Poll for video generation completion
  console.log('[TobyFlow Native Runner] Waiting for Veo video render to finish...');
  const pollStart = Date.now();
  const maxWait = 180000; // 3 mins

  while (Date.now() - pollStart < maxWait) {
    await page.waitForTimeout(3000);

    if (capturedVideoBuffer && capturedVideoBuffer.byteLength > 150000) {
      fs.writeFileSync(outputFile, capturedVideoBuffer);
      console.log(`[TobyFlow Native Runner] 🎉 SUCCESS! Video saved to ${outputFile} (${capturedVideoBuffer.byteLength} bytes)`);
      await page.waitForTimeout(2000);
      await context.close();
      return { success: true, path: outputFile, size: capturedVideoBuffer.byteLength };
    }

    // Check for DOM video elements
    const domUrl = await page.evaluate(() => {
      const vids = Array.from(document.querySelectorAll('video')).filter(v => v.src && v.duration > 2);
      if (vids.length > 0) return vids[vids.length - 1].src;
      return null;
    }).catch(() => null);

    if (domUrl && domUrl.startsWith('http')) {
      console.log(`[TobyFlow Native Runner] Video detected in DOM: ${domUrl}. Fetching...`);
      const resp = await page.request.get(domUrl).catch(() => null);
      if (resp) {
        const body = await resp.body();
        if (body.byteLength > 150000) {
          fs.writeFileSync(outputFile, body);
          console.log(`[TobyFlow Native Runner] 🎉 SUCCESS! Saved DOM video to ${outputFile}`);
          await context.close();
          return { success: true, path: outputFile, size: body.byteLength };
        }
      }
    }
  }

  await context.close();
  throw new Error('Video generation timed out after 3 minutes');
}

// Direct execution test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prompt = "Cinematic 9:16 macro shot of rain droplets on glass at sunset, slow motion 4k";
  const out = path.join(OUTPUT_DIR, 'test_tobyflow_generated.mp4');
  runTobyFlowGeneration(prompt, out)
    .then(res => console.log('RESULT:', res))
    .catch(err => console.error('ERROR:', err));
}
