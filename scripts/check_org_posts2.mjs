import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query GetOrgPosts($input: PostsInput!) {
      posts(input: $input) {
        totalCount
      }
    }
  `;
  const res = await queryBuffer(q, {
    input: {
      organizationId: "69ac22cb51aa2532be8a91fd"
    }
  });
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
