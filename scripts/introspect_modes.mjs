import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      __type(name: "CreatePostMode") {
        enumValues {
          name
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  console.log(JSON.stringify(res.data?.__type?.enumValues, null, 2));
}

main().catch(console.error);
