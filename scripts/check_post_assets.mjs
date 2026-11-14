import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      post(input: { id: "6af3390a825741bba8402ed5" }) {
        id
        status
        dueAt
        text
        assets {
          ... on VideoAsset {
            url
          }
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
