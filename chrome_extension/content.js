// chrome_extension/content.js - Autonomous Google Flow (Veo) Automation Driver v2.0.0
console.log('[Quran Studio Veo Bridge v2.0] Content script loaded on Google Flow.');

if (window.__QURAN_STUDIO_BRIDGE_INITIALIZED) {
  console.log('[Quran Studio Veo Bridge v2.0] Already initialized in this tab.');
} else {
  window.__QURAN_STUDIO_BRIDGE_INITIALIZED = true;

  let isExecuting = false;
  let hudElement = null;
  let latestCapturedMedia = null;

  // Listen for media captured by the MAIN world network interceptor
  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data) return;
    if (ev.data.channel === 'VEO_BRIDGE_MEDIA_CAPTURED') {
      console.log('[VeoBridge:Content] Received media captured notification:', ev.data);
      latestCapturedMedia = {
        url: ev.data.url,
        blobUrl: ev.data.blobUrl,
        size: ev.data.size,
        timestamp: Date.now()
      };
    }
  });

  // Initialize UI HUD
  function initHUD() {
    if (document.getElementById('quran-studio-bridge-hud')) return;

    hudElement = document.createElement('div');
    hudElement.id = 'quran-studio-bridge-hud';
    hudElement.innerHTML = `
      <div class="qs-hud-header">
        <div class="qs-hud-title">
          <span>🌙</span>
          <span>Quran Studio — Veo Engine</span>
        </div>
        <div class="qs-hud-status" id="qs-bridge-status-text">● Connected</div>
      </div>
      <div class="qs-hud-body" id="qs-hud-body">
        Google Flow Bridge v2.0 Active (Slate & isTrusted Proxy Ready).
      </div>
      <div class="qs-hud-scenes" id="qs-scenes-list" style="display:none;"></div>
      <button class="qs-hud-btn" id="qs-trigger-btn">⚡ Test 4-Scene Veo Generation</button>
    `;

    document.body.appendChild(hudElement);

    const triggerBtn = document.getElementById('qs-trigger-btn');
    if (triggerBtn) {
      triggerBtn.onclick = () => {
        if (isExecuting) return;
        executeJob({
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
        });
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHUD);
  } else {
    initHUD();
  }

  // Communication from background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
      initHUD();
      sendResponse({ status: 'pong' });
      return true;
    }

    if (message.type === 'EXECUTE_JOB') {
      initHUD();
      executeJob(message.job);
      sendResponse({ status: 'started' });
      return true;
    }
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Find the Slate or ProseMirror editor element
  function findEditor() {
    const selectors = [
      '[data-slate-editor="true"]',
      '.ProseMirror',
      'div[role="textbox"]',
      'div[contenteditable="true"]',
      'textarea'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // Clear text inside Slate / ProseMirror editor
  async function clearEditor(editor) {
    editor.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    await sleep(150);
  }

  // Insert prompt into Slate / ProseMirror editor
  async function insertPromptText(editor, text) {
    await clearEditor(editor);
    editor.focus();

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Use execCommand to preserve Slate / React internal fiber state
    document.execCommand('insertText', false, text);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(300);
  }

  // Find submit button via selectors, icons, or role
  function findSubmitButton() {
    // 1. Common submit button selectors
    const direct = document.querySelector('button[type="submit"], button[aria-label*="Generate" i], button[aria-label*="Submit" i], button[aria-label*="Create" i]');
    if (direct && !direct.disabled) return direct;

    // 2. Google Material symbol search inside buttons (arrow_upward, send, spark, play_arrow)
    const iconNames = ['arrow_upward', 'send', 'spark', 'play_arrow', 'auto_awesome'];
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    for (const btn of buttons) {
      if (btn.disabled) continue;
      const text = btn.innerText ? btn.innerText.trim().toLowerCase() : '';
      if (iconNames.includes(text) || iconNames.some(name => text.startsWith(name))) {
        return btn;
      }
      // Check inside child spans/icons
      const icons = Array.from(btn.querySelectorAll('i, span, svg'));
      for (const icon of icons) {
        const icText = (icon.textContent || '').trim().toLowerCase();
        if (iconNames.includes(icText)) return btn;
      }
    }

    // 3. Fallback to button containing text
    for (const btn of buttons) {
      const text = (btn.innerText || '').trim().toLowerCase();
      if (['generate', 'create', 'run', 'produce'].some(k => text.includes(k))) {
        return btn;
      }
    }

    return null;
  }

  // Activate submit via MAIN world isTrusted proxy
  function triggerSubmitViaProxy(submitBtn) {
    return new Promise((resolve) => {
      const token = 'token_' + Math.random().toString(36).slice(2) + Date.now();
      submitBtn.setAttribute('data-veo-token', token);

      const reqId = 'req_' + Math.random().toString(36).slice(2);
      const listener = (ev) => {
        if (ev.source !== window || !ev.data) return;
        if (ev.data.channel === 'VEO_SUBMIT_RESULT' && ev.data.requestId === reqId) {
          window.removeEventListener('message', listener);
          submitBtn.removeAttribute('data-veo-token');
          resolve(ev.data);
        }
      };

      window.addEventListener('message', listener);

      // Send submit request to flow_main_bridge.js
      window.postMessage({
        action: 'VEO_ACTIVATE_SUBMIT',
        requestId: reqId,
        submitToken: token
      }, '*');

      // Safety timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('message', listener);
        submitBtn.removeAttribute('data-veo-token');
        resolve({ success: false, timeout: true });
      }, 5000);
    });
  }

  // Convert Blob or BlobUrl to Base64
  async function blobUrlToBase64(blobUrl) {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Main Job Execution Loop
  async function executeJob(job) {
    if (isExecuting) return;
    isExecuting = true;

    console.log('[Quran Studio Veo Bridge v2.0] Executing Job:', job.jobId);
    const bodyEl = document.getElementById('qs-hud-body');
    const listEl = document.getElementById('qs-scenes-list');
    const btnEl = document.getElementById('qs-trigger-btn');

    if (btnEl) btnEl.style.display = 'none';
    if (listEl) {
      listEl.style.display = 'flex';
      listEl.innerHTML = job.prompts.map((_, i) => `
        <div class="qs-scene-item" id="qs-scene-item-${i}">
          <span>Ayah ${job.startAyah + i}: Scene ${i + 1}</span>
          <span id="qs-scene-badge-${i}" style="color: #94a3b8;">Pending</span>
        </div>
      `).join('');
    }

    try {
      // Loop through all required prompts
      for (let i = 0; i < job.prompts.length; i++) {
        const prompt = job.prompts[i];
        const badge = document.getElementById(`qs-scene-badge-${i}`);
        if (badge) {
          badge.className = 'qs-scene-status-active';
          badge.innerText = 'Generating...';
        }
        if (bodyEl) bodyEl.innerText = `Generating Scene ${i + 1}/${job.prompts.length} with Veo...`;

        await generateSingleScene(prompt, i, job.jobId);

        if (badge) {
          badge.className = 'qs-scene-status-done';
          badge.innerText = '✅ Uploaded';
        }
        await sleep(3000);
      }

      if (bodyEl) bodyEl.innerText = '🎉 All 4 Veo scenes generated and delivered to Quran Studio!';
      chrome.runtime.sendMessage({ type: 'JOB_FINISHED', jobId: job.jobId });
    } catch (err) {
      console.error('[Quran Studio Veo Bridge v2.0] Job error:', err);
      if (bodyEl) bodyEl.innerText = `Error: ${err.message}`;
    } finally {
      isExecuting = false;
      if (btnEl) btnEl.style.display = 'block';
    }
  }

  async function generateSingleScene(promptText, sceneIndex, jobId) {
    latestCapturedMedia = null;
    const sceneStartTime = Date.now();

    // 1. Locate Editor
    const editor = findEditor();
    if (!editor) throw new Error('Google Flow editor element not found');

    // 2. Type Prompt via execCommand
    console.log(`[VeoBridge] Typing prompt for scene ${sceneIndex + 1}...`);
    await insertPromptText(editor, promptText);
    await sleep(600);

    // 3. Locate & Dispatch Submit Button via Main World Proxy
    const submitBtn = findSubmitButton();
    if (!submitBtn) throw new Error('Generate / Submit button not found on Google Flow');

    console.log(`[VeoBridge] Disagreeing Google synthetic barriers via Main Bridge Proxy...`);
    const submitResult = await triggerSubmitViaProxy(submitBtn);
    console.log(`[VeoBridge] Submit result:`, submitResult);

    // 4. Await Generated Video (Poll network interceptor & video elements)
    console.log(`[VeoBridge] Waiting for Veo video render to complete (timeout: 120s)...`);
    const maxWait = 120000;
    let videoData = null;
    let videoUrl = null;

    const waitStart = Date.now();
    while (Date.now() - waitStart < maxWait) {
      await sleep(2000);

      // Check network interceptor first (most reliable)
      if (latestCapturedMedia && latestCapturedMedia.timestamp >= sceneStartTime) {
        console.log('[VeoBridge] Video captured via network interceptor!', latestCapturedMedia);
        videoUrl = latestCapturedMedia.url;
        videoData = await blobUrlToBase64(latestCapturedMedia.blobUrl);
        break;
      }

      // Check DOM video elements
      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        if (v.src && (v.src.startsWith('blob:') || v.src.startsWith('http')) && v.duration > 2) {
          videoUrl = v.src;
          try {
            videoData = await blobUrlToBase64(v.src);
            if (videoData) break;
          } catch (_) {}
        }
      }
      if (videoData) break;

      // Check download button if present on newly rendered card
      const dlLink = document.querySelector('a[download]');
      if (dlLink && dlLink.href) {
        videoUrl = dlLink.href;
        try {
          videoData = await blobUrlToBase64(dlLink.href);
          if (videoData) break;
        } catch (_) {}
      }
      if (videoData) break;
    }

    if (!videoData && !videoUrl) {
      throw new Error(`Timeout waiting for Veo scene ${sceneIndex + 1} render.`);
    }

    console.log(`[VeoBridge] Scene ${sceneIndex + 1} captured! Size: ${videoData ? videoData.length : 'url-only'}. Uploading to Studio...`);

    // 5. Send Scene to Service Worker to forward to Studio Server (port 5056)
    chrome.runtime.sendMessage({
      type: 'SCENE_READY',
      jobId,
      sceneIndex,
      videoUrl,
      videoData
    });
  }
}
