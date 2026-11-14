// scripts/clear_buffer_and_queue.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const QUEUE_FILE = path.join(ROOT_DIR, 'jobs', 'quran_publish_queue.json');
const BUFFER_TOKEN = 'UzOAWwEy9YPqjz67tZ6sqeyt2hqv0UNz00R1EDkfjib';

async function queryBuffer(query, variables = {}) {
  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUFFER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

const POST_IDS = [
  '6af1b93f520b42ec9162f518',
  '6af1b94179df38f6f586df39',
  '6af1b9439c89efdcd5b94f57',
  '6af1b958fff3dca70d1a1690',
  '6af1b95a9c89efdcd5b966d7',
  '6af1b95b9c89efdcd5b967a3',
  '6af1b96379df38f6f586f7e4',
  '6af1b9659c89efdcd5b96b9b',
  '6af1b967520b42ec9163153d',
  '6af1b96c79df38f6f586fba5',
  '6af1b96e520b42ec916317b7',
  '6af1b97095b09d04823b3ee1',
  '6af1b9769c89efdcd5b973cb',
  '6af1b977fff3dca70d1a221a',
  '6af1b979520b42ec91631a58'
];

async function deletePost(id) {
  const mutation = `
    mutation DeletePost($input: DeletePostInput!) {
      deletePost(input: $input) {
        ... on DeletePostSuccess {
          id
        }
        ... on VoidMutationError {
          message
        }
      }
    }
  `;
  return queryBuffer(mutation, { input: { id } });
}

async function main() {
  console.log(`Deleting ${POST_IDS.length} posts from Buffer...`);
  for (const id of POST_IDS) {
    process.stdout.write(`Deleting ${id}... `);
    const res = await deletePost(id);
    const successId = res.data?.deletePost?.id;
    if (successId) {
      console.log(`DELETED.`);
    } else {
      console.log(`Result:`, JSON.stringify(res.data?.deletePost || res.errors));
    }
  }

  // Clear local queue completely
  fs.writeFileSync(QUEUE_FILE, JSON.stringify({ items: [], updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  console.log("Local queue cleared and reset to [].");

  const limits = await queryBuffer(`
    query {
      dailyPostingLimits(input: {
        channelIds: [
          "6af071d462b70b94b0bde992",
          "6af072a762b70b94b0be017e",
          "6af0714462b70b94b0bde62b"
        ]
      }) {
        channelId
        isAtLimit
        limit
        scheduled
        sent
      }
    }
  `);

  console.log("Buffer limits after cleanup:", JSON.stringify(limits.data?.dailyPostingLimits, null, 2));
}

main().catch(console.error);
