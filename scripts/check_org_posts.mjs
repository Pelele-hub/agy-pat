import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query GetOrgPosts($input: PostsInput!) {
      posts(input: $input) {
        totalCount
        edges {
          node {
            id
            status
            dueAt
            channelId
            text
            error {
              message
              rawError
            }
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
  const res = await queryBuffer(q, {
    input: {
      organizationId: "69ac22cb51aa2532be8a91fd"
    }
  });
  console.log('Total posts in Org:', res.data?.posts?.totalCount);
  console.log('Posts:', JSON.stringify(res.data?.posts?.edges?.map(e => ({
    id: e.node.id,
    channelId: e.node.channelId,
    status: e.node.status,
    dueAt: e.node.dueAt,
    source: e.node.assets?.[0]?.source,
    error: e.node.error
  })), null, 2));
}

main().catch(console.error);
