import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      post(input: { id: "6af8884de86a5789a6b9408b" }) {
        id
        status
        dueAt
        error {
          message
          rawError
        }
        assets {
          ... on VideoAsset {
            id
            source
            thumbnail
          }
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
