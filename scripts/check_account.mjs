import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      account {
        id
        organizations {
          id
          name
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  console.log('Account:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
