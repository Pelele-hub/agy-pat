import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      __type(name: "VideoAsset") {
        fields {
          name
          type { name kind }
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  console.log(JSON.stringify(res.data?.__type?.fields, null, 2));
}

main().catch(console.error);
