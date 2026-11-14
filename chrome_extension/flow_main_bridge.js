// flow_main_bridge.js - Injected into MAIN world at document_start for flow.google.com
(function () {
  'use strict';
  console.log('[VeoBridge:MainWorld] Loaded at document_start');

  // 1. WeakMap Registry to capture submit button click listeners (including Angular & React)
  const clickRegistry = new WeakMap();
  const nativeAddEventListener = EventTarget.prototype.addEventListener;
  const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'click' && listener) {
      if (this instanceof HTMLButtonElement || (this instanceof Element && this.getAttribute('role') === 'button')) {
        const list = clickRegistry.get(this) || [];
        const capture = options === true || !!(options && options.capture);
        if (!list.some(e => e.listener === listener && e.capture === capture)) {
          list.push({ listener, capture });
          clickRegistry.set(this, list);
        }
      }
    }
    return Reflect.apply(nativeAddEventListener, this, arguments);
  };

  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    if (type === 'click' && this instanceof Element) {
      const list = clickRegistry.get(this);
      const capture = options === true || !!(options && options.capture);
      if (list) {
        clickRegistry.set(this, list.filter(e => e.listener !== listener || e.capture !== capture));
      }
    }
    return Reflect.apply(nativeRemoveEventListener, this, arguments);
  };

  // 2. Click Dispatcher with isTrusted Proxy Spoofing
  function dispatchTrustedClick(target) {
    console.log('[VeoBridge:MainWorld] dispatchTrustedClick invoked for:', target);
    let invoked = 0;

    // Check Angular listeners first if available
    let listeners = [];
    try {
      if (window.ng && typeof window.ng.getListeners === 'function') {
        const ngList = window.ng.getListeners(target) || [];
        for (const entry of ngList) {
          if ((entry.name === 'click' || entry.eventName === 'click') && typeof entry.callback === 'function') {
            listeners.push({ callback: entry.callback, owner: target });
          }
        }
      }
    } catch (_) {}

    // Fallback to our intercepted WeakMap registry
    if (listeners.length === 0) {
      for (const node of [target, target.parentElement].filter(Boolean)) {
        const reg = clickRegistry.get(node) || [];
        for (const item of reg) {
          const cb = typeof item.listener === 'function' ? item.listener : item.listener?.handleEvent?.bind(item.listener);
          if (cb) listeners.push({ callback: cb, owner: node });
        }
      }
    }

    // Dispatch synthetic event with isTrusted proxy
    for (const entry of listeners) {
      const nativeEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        button: 0
      });

      const proxyEvent = new Proxy(nativeEvent, {
        get: function (src, key) {
          if (key === 'isTrusted') return true; // Bypass Google's synthetic event check
          if (key === 'target') return target;
          if (key === 'currentTarget') return entry.owner;
          if (key === 'composedPath') return () => [target, target.parentElement].filter(Boolean);
          const val = Reflect.get(src, key, src);
          return typeof val === 'function' ? val.bind(src) : val;
        }
      });

      try {
        entry.callback.call(entry.owner, proxyEvent);
        invoked++;
      } catch (err) {
        console.warn('[VeoBridge:MainWorld] Click listener execution warning:', err);
      }
    }

    // Also trigger native click as additional fallback
    try {
      target.click();
      invoked++;
    } catch (_) {}

    return { success: invoked > 0, count: invoked };
  }

  // 3. Network Media Interceptor (captures Veo video stream responses at network layer)
  const nativeFetch = window.fetch.bind(window);
  let activeMediaWatch = true;

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const res = await nativeFetch(input, init);

    if (activeMediaWatch && res && res.ok && url) {
      const isMediaHost = url.includes('flow.google.com/asb/') ||
                          url.includes('flow-content.google') ||
                          url.includes('storage.googleapis.com');
      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (isMediaHost || contentType.includes('video/mp4') || contentType.includes('application/octet-stream')) {
        // Clone and inspect if it's an MP4
        try {
          const clone = res.clone();
          clone.arrayBuffer().then(buf => {
            if (buf.byteLength > 100000) { // Videos are typically > 100KB
              const bytes = new Uint8Array(buf.slice(0, 16));
              // Check for ftyp mp4 signature (bytes 4-7 = 'ftyp')
              const isMp4 = (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) ||
                            contentType.includes('video/mp4');

              if (isMp4) {
                console.log('[VeoBridge:MainWorld] Captured Veo video at network layer! Size:', buf.byteLength, 'bytes');
                const blob = new Blob([buf], { type: 'video/mp4' });
                const blobUrl = URL.createObjectURL(blob);

                // Convert small portion to base64 or notify content script
                window.postMessage({
                  channel: 'VEO_BRIDGE_MEDIA_CAPTURED',
                  url,
                  blobUrl,
                  size: buf.byteLength
                }, '*');
              }
            }
          }).catch(() => {});
        } catch (_) {}
      }
    }

    return res;
  };

  // 4. Communication channel with ISOLATED world (content.js)
  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data) return;

    if (ev.data.action === 'VEO_ACTIVATE_SUBMIT') {
      const token = ev.data.submitToken;
      const target = document.querySelector(`[data-veo-token="${token}"]`);
      if (target) {
        const result = dispatchTrustedClick(target);
        window.postMessage({
          channel: 'VEO_SUBMIT_RESULT',
          requestId: ev.data.requestId,
          ...result
        }, '*');
      } else {
        window.postMessage({
          channel: 'VEO_SUBMIT_RESULT',
          requestId: ev.data.requestId,
          success: false,
          error: 'TARGET_NOT_FOUND'
        }, '*');
      }
    }
  });

  console.log('[VeoBridge:MainWorld] Initialization complete.');
})();
