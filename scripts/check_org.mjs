import { queryBuffer, CHANNELS } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query GetChannelPosts($input: PostsInput!) {
      posts(input: $input) {
        totalCount
        edges {
          node {
            id
            status
            dueAt
            text
            assets {
              ... on VideoAsset {
                source
              }
            }
          }
        }
      }
    }
  `;
  // Let's inspect the organization ID or query via user
  const userQuery = `
    query {
      user {
        id
        organizations {
          id
          name
        }
      }
    }
  `;
  const res = await queryBuffer(userQuery);
  console.log('User organizations:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
