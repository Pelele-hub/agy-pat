import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      __type(name: "CreatePostInput") {
        inputFields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
              enumValues { name }
            }
          }
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  const modeField = res.data?.__type?.inputFields.find(f => f.name === 'mode');
  console.log('Mode field type:', JSON.stringify(modeField, null, 2));
}

main().catch(console.error);
