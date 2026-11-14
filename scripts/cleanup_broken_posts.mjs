import { queryBuffer } from './publish_queue_manager.mjs';

const BROKEN_POSTS = [
  '6af3390a825741bba8402ed5',
  '6af3390ca80c88d57642667e',
  '6af3390da80c88d576426707'
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
  console.log('Clearing broken tunnel posts from Buffer...');
  for (const id of BROKEN_POSTS) {
    const res = await deletePost(id);
    console.log(`Deleted ${id}:`, JSON.stringify(res.data?.deletePost || res.errors));
  }
}

main().catch(console.error);
