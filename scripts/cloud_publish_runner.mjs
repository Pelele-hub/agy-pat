// scripts/cloud_publish_runner.mjs - 24/7 Cloud Publisher for GitHub Actions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const QUEUE_FILE = path.join(ROOT_DIR, 'jobs', 'cloud_publish_queue.json');

// Auto-load .env if present
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/\r$/, '');
    }
  }
}

const BUFFER_TOKEN = process.env.BUFFER_TOKEN || 'UzOAWwEy9YPqjz67tZ6sqeyt2hqv0UNz00R1EDkfjib';
const BUFFER_API_URL = 'https://api.buffer.com';

const CHANNELS = [
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

async function queryBuffer(query, variables = {}) {
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

async function createBufferPost({ channelId, service, text, title, videoUrl }) {
  const metadata = {};
  if (service === 'youtube') {
    metadata.youtube = {
      title: (title || 'تلاوة مباركة خاشعة').slice(0, 95),
      privacy: 'public',
      madeForKids: false,
      categoryId: '22'
    };
  } else if (service === 'tiktok') {
    metadata.tiktok = {
      title: (title || 'تلاوة مباركة خاشعة').slice(0, 90),
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
    mode: 'shareNow', // Direct broadcast - consumes 0 scheduled queue slots
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

export async function runDailyPublish() {
  console.log(`[Cloud Runner] Starting daily publication run at ${new Date().toISOString()}...`);

  if (!fs.existsSync(QUEUE_FILE)) {
    console.error(`[Cloud Runner] Queue file not found: ${QUEUE_FILE}`);
    return { ok: false, error: 'Queue file missing' };
  }

  const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`[Cloud Runner] Failed to parse queue:`, e.message);
    return { ok: false, error: e.message };
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const nextItem = items.find(i => i.status === 'pending');

  if (!nextItem) {
    console.log(`[Cloud Runner] All videos published! Queue is empty. Please add more stock.`);
    return { ok: true, message: 'Queue empty' };
  }

  if (!nextItem.cloudVideoUrl) {
    console.error(`[Cloud Runner] Item ${nextItem.id} is missing cloudVideoUrl! Skipping.`);
    nextItem.status = 'error_missing_url';
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { ok: false, error: 'Missing cloud URL' };
  }

  console.log(`[Cloud Runner] Publishing next video in stock: ${nextItem.title || nextItem.id}`);
  console.log(`[Cloud Runner] Video URL: ${nextItem.cloudVideoUrl}`);

  const dispatched = [];
  let allSuccess = true;

  for (const ch of CHANNELS) {
    console.log(`[Cloud Runner] Publishing to ${ch.channelName}...`);
    try {
      const res = await createBufferPost({
        channelId: ch.channelId,
        service: ch.service,
        text: nextItem.caption,
        title: nextItem.title,
        videoUrl: nextItem.cloudVideoUrl
      });

      const post = res.data?.createPost?.post;
      if (post && post.id) {
        console.log(`[Cloud Runner] ✓ ${ch.channelName} SUCCESS (Post ID: ${post.id}, Status: ${post.status})`);
        dispatched.push({
          channel: ch.channelName,
          channelId: ch.channelId,
          postId: post.id,
          status: post.status
        });
      } else {
        const errMsg = res.data?.createPost?.message || JSON.stringify(res.errors || res);
        console.error(`[Cloud Runner] ✗ ${ch.channelName} FAILED:`, errMsg);
        dispatched.push({
          channel: ch.channelName,
          channelId: ch.channelId,
          error: errMsg
        });
        allSuccess = false;
      }
    } catch (err) {
      console.error(`[Cloud Runner] ✗ ${ch.channelName} EXCEPTION:`, err.message);
      dispatched.push({
        channel: ch.channelName,
        channelId: ch.channelId,
        error: err.message
      });
      allSuccess = false;
    }
  }

  nextItem.status = allSuccess ? 'published' : (dispatched.some(d => d.postId) ? 'partially_published' : 'failed');
  nextItem.publishedAt = new Date().toISOString();
  nextItem.dispatchedPosts = dispatched;
  data.updatedAt = new Date().toISOString();

  fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[Cloud Runner] Run finished. Item status updated to: ${nextItem.status}`);

  return { ok: allSuccess, dispatched };
}

// If executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runDailyPublish().then(res => {
    if (!res.ok && res.error) process.exit(1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
