// scripts/publish_queue_manager.mjs - Robust Local Queue Manager & Auto-Dispatcher for Buffer
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const QUEUE_FILE = path.join(JOBS_DIR, 'quran_publish_queue.json');

const BUFFER_TOKEN = 'UzOAWwEy9YPqjz67tZ6sqeyt2hqv0UNz00R1EDkfjib';
const BUFFER_API_URL = 'https://api.buffer.com';

export const CHANNELS = [
  {
    channelName: 'YouTube Shorts',
    channelId: '6af071d462b70b94b0bde992',
    service: 'youtube'
  },
  {
    channelName: 'TikTok',
    channelId: '6afafea9ece6dfde5fe3e185',
    service: 'tiktok'
  },
  {
    channelName: 'Facebook Reels',
    channelId: '6af0714462b70b94b0bde62b',
    service: 'facebook'
  }
];

if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

// Load queue from disk
export function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({ items: [] }, null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    console.error('[Queue Manager] Error parsing queue file:', e);
    return [];
  }
}

// Save queue to disk
export function saveQueue(items) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
}

// Add a video to queue
export function addToQueue({ jobId, title, caption, videoFilename, surah, verses, engine }) {
  const items = loadQueue();
  const existing = items.find(i => i.jobId === jobId || i.videoFilename === videoFilename);
  if (existing) {
    console.log(`[Queue Manager] Video ${jobId} already exists in queue (status: ${existing.status}).`);
    return existing;
  }

  const newItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    jobId: jobId || `job_${Date.now()}`,
    title: title || 'تلاوة مباركة - Quran Recitation',
    caption: caption || '',
    videoFilename,
    surah: surah || null,
    verses: verses || [],
    engine: engine || 'unknown',
    status: 'pending', // 'pending' | 'scheduled' | 'failed'
    createdAt: new Date().toISOString(),
    scheduledAt: null,
    dispatchedPosts: []
  };

  items.push(newItem);
  saveQueue(items);
  console.log(`[Queue Manager] Added ${videoFilename} to queue as pending. Total items: ${items.length}`);
  return newItem;
}

// Helper to query Buffer GraphQL
export async function queryBuffer(query, variables = {}) {
  const res = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUFFER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

// Check real-time Buffer slots across all 3 channels
export async function checkBufferLimits() {
  const channelIds = CHANNELS.map(c => c.channelId);
  const query = `
    query GetDailyLimits($input: DailyPostingLimitsInput!) {
      dailyPostingLimits(input: $input) {
        channelId
        isAtLimit
        limit
        scheduled
        sent
      }
    }
  `;
  try {
    const res = await queryBuffer(query, { input: { channelIds } });
    if (res.errors && res.errors.length > 0) {
      console.warn('[Queue Manager] Buffer limits query error:', res.errors);
      return { ok: false, error: res.errors[0].message };
    }

    const limits = res.data?.dailyPostingLimits || [];
    const channelStatus = limits.map(l => {
      const ch = CHANNELS.find(c => c.channelId === l.channelId);
      return {
        channelName: ch ? ch.channelName : l.channelId,
        channelId: l.channelId,
        scheduled: l.scheduled || 0,
        isAtLimit: l.isAtLimit || false,
        limit: l.limit
      };
    });

    // In Buffer Free tier, max queue is 10 items total or ~3 per channel
    // We can dispatch a video if ALL channels currently have space (e.g. scheduled < 3 or isAtLimit === false)
    const maxScheduled = Math.max(...channelStatus.map(c => c.scheduled), 0);
    const anyAtLimit = channelStatus.some(c => c.isAtLimit);
    const canSchedule = !anyAtLimit && maxScheduled < 3;

    return {
      ok: true,
      canSchedule,
      maxScheduled,
      anyAtLimit,
      channelStatus
    };
  } catch (err) {
    console.error('[Queue Manager] Network error querying Buffer:', err);
    return { ok: false, error: err.message };
  }
}

// Calculate scheduled slots (One per day at 6:00 PM Africa/Casablanca time / 18:00 UTC)
export function getNextSlot(scheduledItems = []) {
  const assignedTimestamps = new Set();
  scheduledItems.forEach(item => {
    if (item.scheduledDueAt) {
      assignedTimestamps.add(new Date(item.scheduledDueAt).toISOString());
    }
  });

  const now = new Date();
  let dayOffset = 0;

  while (true) {
    const currentDay = new Date(now);
    currentDay.setUTCDate(now.getUTCDate() + dayOffset);
    currentDay.setUTCMilliseconds(0);
    currentDay.setUTCSeconds(0);
    currentDay.setUTCMinutes(0);

    // Single Daily Slot: 18:00 UTC (6:00 PM Casablanca)
    const evening = new Date(currentDay);
    evening.setUTCHours(18);
    if (evening.getTime() > now.getTime() + 15 * 60 * 1000) {
      const iso = evening.toISOString();
      if (!assignedTimestamps.has(iso)) {
        return evening;
      }
    }

    dayOffset++;
    if (dayOffset > 60) {
      return new Date(now.getTime() + 3600 * 1000);
    }
  }
}

// Create Buffer Post Mutation (Supports customScheduled at exact dueAt)
export async function createBufferPost({ channelId, service, text, title, videoUrl, dueAt }) {
  const metadata = {};
  if (service === 'youtube') {
    metadata.youtube = {
      title: (title || 'تلاوة مباركة').slice(0, 95),
      privacy: 'public',
      madeForKids: false,
      categoryId: '22'
    };
  } else if (service === 'tiktok') {
    metadata.tiktok = {
      title: (title || 'تلاوة مباركة').slice(0, 90),
      isAiGenerated: false
    };
  } else if (service === 'facebook') {
    metadata.facebook = {
      type: 'reel'
    };
  }

  const input = {
    channelId,
    text,
    schedulingType: 'automatic',
    mode: dueAt ? 'customScheduled' : 'addToQueue',
    needsApproval: false,
    assets: [
      {
        video: {
          url: videoUrl
        }
      }
    ],
    metadata
  };

  if (dueAt) {
    input.dueAt = dueAt;
  }

  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            status
            dueAt
          }
        }
        ... on InvalidInputError {
          message
        }
        ... on LimitReachedError {
          message
        }
        ... on UnexpectedError {
          message
        }
      }
    }
  `;

  return queryBuffer(mutation, { input });
}

// Dispatch the next pending video if Buffer has available slots
export async function dispatchNext({ publicBaseUrl } = {}) {
  const items = loadQueue();
  const pendingItems = items.filter(i => i.status === 'pending');

  if (pendingItems.length === 0) {
    return {
      dispatched: false,
      message: 'Queue is empty (no pending videos to dispatch)',
      pendingCount: 0
    };
  }

  // 1. Check Buffer limits
  const limits = await checkBufferLimits();
  if (!limits.ok) {
    return {
      dispatched: false,
      message: `Failed to check Buffer limits: ${limits.error}`,
      pendingCount: pendingItems.length
    };
  }

  if (!limits.canSchedule) {
    return {
      dispatched: false,
      message: `Buffer queue is currently full (${limits.maxScheduled} scheduled per channel, limit reached: ${limits.anyAtLimit}). Waiting for a post to go live.`,
      pendingCount: pendingItems.length,
      channelStatus: limits.channelStatus
    };
  }

  // 2. Pick oldest pending item
  const itemToDispatch = pendingItems[0];
  const videoFilePath = path.join(OUTPUT_DIR, itemToDispatch.videoFilename);

  if (!fs.existsSync(videoFilePath)) {
    itemToDispatch.status = 'failed';
    itemToDispatch.error = `File not found on disk: ${itemToDispatch.videoFilename}`;
    saveQueue(items);
    return {
      dispatched: false,
      message: `Error: Video file not found: ${videoFilePath}`,
      failedItem: itemToDispatch.id
    };
  }

  // 3. Construct video URL (requires public URL for Buffer ingestion)
  if (!publicBaseUrl) {
    return {
      dispatched: false,
      message: 'No publicBaseUrl available. Ensure server.mjs SSH tunnel or public stream is connected.',
      pendingCount: pendingItems.length
    };
  }

  const streamUrl = `${publicBaseUrl}/stream/${encodeURIComponent(itemToDispatch.videoFilename)}`;
  
  // 4. Compute next unassigned 8:00 AM / 6:00 PM slot
  const scheduledItems = items.filter(i => i.status === 'scheduled');
  const targetSlot = getNextSlot(scheduledItems);
  const dueAtIso = targetSlot.toISOString();
  console.log(`[Queue Manager] Dispatching ${itemToDispatch.videoFilename} to Buffer via ${streamUrl}...`);
  console.log(`[Queue Manager] Target Publication Slot: ${dueAtIso} (Daily 6:00 PM Casablanca Schedule)`);

  const dispatchResults = [];
  let allSuccess = true;

  for (const ch of CHANNELS) {
    try {
      console.log(`[Queue Manager] Submitting to ${ch.channelName} for ${dueAtIso}...`);
      const res = await createBufferPost({
        channelId: ch.channelId,
        service: ch.service,
        text: itemToDispatch.caption || itemToDispatch.title,
        title: itemToDispatch.title,
        videoUrl: streamUrl,
        dueAt: dueAtIso
      });

      const createPostResult = res.data?.createPost;
      if (createPostResult?.post) {
        dispatchResults.push({
          channel: ch.channelName,
          postId: createPostResult.post.id,
          dueAt: createPostResult.post.dueAt,
          status: 'success'
        });
      } else {
        const errMsg = createPostResult?.message || JSON.stringify(res.errors || res);
        console.warn(`[Queue Manager] Failed for ${ch.channelName}:`, errMsg);
        dispatchResults.push({
          channel: ch.channelName,
          error: errMsg,
          status: 'error'
        });
        allSuccess = false;
      }
    } catch (e) {
      console.error(`[Queue Manager] Exception creating post for ${ch.channelName}:`, e);
      dispatchResults.push({
        channel: ch.channelName,
        error: e.message,
        status: 'error'
      });
      allSuccess = false;
    }
  }

  if (allSuccess) {
    itemToDispatch.status = 'scheduled';
    itemToDispatch.scheduledAt = new Date().toISOString();
    itemToDispatch.scheduledDueAt = dueAtIso;
    itemToDispatch.dispatchedPosts = dispatchResults;
    saveQueue(items);
    console.log(`[Queue Manager] SUCCESS: Video ${itemToDispatch.videoFilename} scheduled for ${dueAtIso} across all 3 platforms!`);
    return {
      dispatched: true,
      message: `Successfully scheduled ${itemToDispatch.videoFilename} for ${dueAtIso} on YouTube, TikTok, and Facebook Reels`,
      jobId: itemToDispatch.jobId,
      dueAt: dueAtIso,
      dispatchedPosts: dispatchResults,
      remainingPending: pendingItems.length - 1
    };
  } else {
    // If partial or limit reached
    itemToDispatch.dispatchedPosts = dispatchResults;
    saveQueue(items);
    return {
      dispatched: false,
      message: `Partial dispatch error for ${itemToDispatch.videoFilename}`,
      dispatchedPosts: dispatchResults,
      remainingPending: pendingItems.length
    };
  }
}
