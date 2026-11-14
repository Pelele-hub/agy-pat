import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
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
  const res = await queryBuffer(mutation, { input: { id: "6af8884de86a5789a6b9408b" } });
  console.log('Deleted test draft:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
