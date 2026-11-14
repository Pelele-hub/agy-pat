import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      __type(name: "CreatePostInput") {
        inputFields {
          name
          type { name kind }
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  console.log(JSON.stringify(res.data?.__type?.inputFields, null, 2));
}

main().catch(console.error);
