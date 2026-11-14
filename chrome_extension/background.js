// chrome_extension/background.js - Service Worker for Quran Studio Veo Bridge v2.0.0
const STUDIO_API = 'http://localhost:5056';
let activeJob = null;
let isPolling = false;

console.log('[Quran Studio Veo Bridge v2.0] Service worker initialized.');

// Safe tab messaging with lastError suppression
function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        void chrome.runtime.lastError;
        resolve(response || null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

// Programmatic injection for open tabs
async function ensureContentInjected(tabId) {
  try {
    // 1. Inject MAIN world bridge first
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['flow_main_bridge.js'],
      world: 'MAIN'
    }).catch(() => {});

    // 2. Inject CSS
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css']
    }).catch(() => {});

    // 3. Inject Content Driver in ISOLATED world
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    }).catch(() => {});
  } catch (err) {}
}

// Toolbar icon click focuses or opens Google Flow
chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: '*://flow.google.com/*' });
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    await ensureContentInjected(tabs[0].id);
    await sendTabMessage(tabs[0].id, { type: 'PING' });
  } else {
    await chrome.tabs.create({ url: 'https://flow.google.com/' });
  }
});

// Automatic injection when Google Flow loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('flow.google.com') || tab.url.includes('labs.google'))) {
    await ensureContentInjected(tabId);
    await sendTabMessage(tabId, { type: 'PING' });
  }
});

// Alarm-based reliable polling (Chrome MV3 standard)
chrome.alarms.create('check_jobs', { periodInMinutes: 0.1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check_jobs') {
    pollServer();
  }
});

// Poll server
async function pollServer() {
  if (isPolling) return;
  isPolling = true;

  try {
    const res = await fetch(`${STUDIO_API}/api/bridge/poll`);
    if (!res.ok) {
      isPolling = false;
      return;
    }
    const data = await res.json();

    if (data.hasJob && (!activeJob || activeJob.jobId !== data.job.jobId)) {
      console.log('[Quran Studio Bridge v2.0] Pending job detected:', data.job.jobId);
      activeJob = data.job;
      await handleNewJob(data.job);
    }
  } catch (err) {
  } finally {
    isPolling = false;
  }
}

async function handleNewJob(job) {
  const tabs = await chrome.tabs.query({ url: '*://flow.google.com/*' });
  let targetTab = null;

  if (tabs.length > 0) {
    targetTab = tabs[0];
  } else {
    targetTab = await chrome.tabs.create({ url: 'https://flow.google.com/', active: true });
    await new Promise(r => setTimeout(r, 4000));
  }

  await ensureContentInjected(targetTab.id);

  let ready = false;
  let attempts = 0;
  while (!ready && attempts < 8) {
    attempts++;
    const response = await sendTabMessage(targetTab.id, { type: 'PING' });
    if (response && response.status === 'pong') {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
    await ensureContentInjected(targetTab.id);
  }

  await sendTabMessage(targetTab.id, {
    type: 'EXECUTE_JOB',
    job: job
  });
}

// Message listener from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCENE_READY') {
    uploadScene(message);
    sendResponse({ status: 'uploading' });
    return true;
  }

  if (message.type === 'JOB_FINISHED') {
    activeJob = null;
    notifyJobFinished(message.jobId);
    sendResponse({ status: 'done' });
    return true;
  }
});

async function uploadScene({ jobId, sceneIndex, videoUrl, videoData }) {
  try {
    await fetch(`${STUDIO_API}/api/bridge/upload-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        sceneIndex,
        videoUrl,
        videoData
      })
    });
    console.log(`[Quran Studio Bridge v2.0] Scene ${sceneIndex + 1} uploaded to studio successfully!`);
  } catch (err) {
    console.error(`[Quran Studio Bridge v2.0] Upload failed for scene ${sceneIndex + 1}:`, err);
  }
}

async function notifyJobFinished(jobId) {
  try {
    await fetch(`${STUDIO_API}/api/bridge/job-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    });
  } catch (err) {}
}

pollServer();
