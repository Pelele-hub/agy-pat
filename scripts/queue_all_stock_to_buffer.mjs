// scripts/queue_all_stock_to_buffer.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryBuffer } from './publish_queue_manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const QUEUE_FILE = path.join(ROOT_DIR, 'jobs', 'cloud_publish_queue.json');

const CHANNELS = [
  {
    name: 'TikTok',
    channelId: '6af072a762b70b94b0be017e',
    service: 'tiktok'
  },
  {
    name: 'Facebook Reels',
    channelId: '6af0714462b70b94b0bde62b',
    service: 'facebook'
  }
];

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

async function main() {
  const queueData = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const items = queueData.items;

  // Item 3 was scheduled for Nov 15
  if (items[3] && !items[3].scheduledPosts) {
    items[3].status = 'scheduled';
    items[3].dueAt = '2026-11-15T18:00:00.000Z';
    items[3].scheduledPosts = [
      { channel: 'TikTok', postId: '6af8c4a1918fe79d2ea1c15b', dueAt: '2026-11-15T18:00:00.000Z' },
      { channel: 'Facebook Reels', postId: '6af8c4a2918fe79d2ea1c195', dueAt: '2026-11-15T18:00:00.000Z' }
    ];
  }

  // Schedule items 4 through 9 (Nov 16 to Nov 21)
  const scheduleDates = [
    '2026-11-16T18:00:00.000Z', // Item 4 (Monday)
    '2026-11-17T18:00:00.000Z', // Item 5 (Tuesday)
    '2026-11-18T18:00:00.000Z', // Item 6 (Wednesday)
    '2026-11-19T18:00:00.000Z', // Item 7 (Thursday)
    '2026-11-20T18:00:00.000Z', // Item 8 (Friday)
    '2026-11-21T18:00:00.000Z'  // Item 9 (Saturday)
  ];

  for (let idx = 4; idx <= 9; idx++) {
    const item = items[idx];
    if (!item) continue;
    const dueAt = scheduleDates[idx - 4];
    console.log(`\n==================================================`);
    console.log(`Queuing Item ${idx}: ${item.title} for ${dueAt}`);
    console.log(`==================================================`);

    const scheduledList = [];

    for (const ch of CHANNELS) {
      const metadata = {};
      if (ch.service === 'tiktok') {
        metadata.tiktok = {
          title: (item.title || 'تلاوة خاشعة').slice(0, 90),
          isAiGenerated: false
        };
      } else if (ch.service === 'facebook') {
        metadata.facebook = {
          type: 'reel'
        };
      }

      // Remove #shorts hashtag from caption since YouTube is not included
      const cleanCaption = item.caption.replace(/#shorts\s*/gi, '');

      const input = {
        channelId: ch.channelId,
        text: cleanCaption,
        schedulingType: 'automatic',
        mode: 'customScheduled',
        dueAt,
        needsApproval: false,
        assets: [
          {
            video: {
              url: item.cloudVideoUrl
            }
          }
        ],
        metadata
      };

      console.log(`Scheduling to ${ch.name}...`);
      const res = await queryBuffer(mutation, { input });
      const post = res.data?.createPost?.post;
      if (post && post.id) {
        console.log(`✓ ${ch.name} Scheduled (Post ID: ${post.id}, Status: ${post.status})`);
        scheduledList.push({
          channel: ch.name,
          channelId: ch.channelId,
          postId: post.id,
          dueAt: post.dueAt,
          status: post.status
        });
      } else {
        const err = res.data?.createPost?.message || JSON.stringify(res.errors || res);
        console.error(`✗ ${ch.name} FAILED:`, err);
      }
    }

    item.status = 'scheduled';
    item.dueAt = dueAt;
    item.scheduledPosts = scheduledList;
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queueData, null, 2), 'utf8');
  }

  console.log(`\nAll items queued successfully in Buffer!`);
}

main().catch(console.error);
