import { queryBuffer, CHANNELS } from './publish_queue_manager.mjs';

async function main() {
  for (const ch of CHANNELS) {
    const q = `
      query GetPosts($input: PostsInput!) {
        posts(input: $input) {
          totalCount
          edges {
            node {
              id
              status
              dueAt
              error {
                message
                rawError
              }
              text
            }
          }
        }
      }
    `;
    const res = await queryBuffer(q, { input: { channelId: ch.channelId, status: ['scheduled', 'error'] } });
    console.log(`=== Channel: ${ch.channelName} ===`);
    if (res.errors) {
      console.log('Errors:', JSON.stringify(res.errors, null, 2));
    } else {
      console.log(JSON.stringify(res.data?.posts, null, 2));
    }
  }
}

main().catch(console.error);
