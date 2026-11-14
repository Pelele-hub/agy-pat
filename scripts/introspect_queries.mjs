import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const q = `
    query {
      __schema {
        queryType {
          fields {
            name
          }
        }
      }
    }
  `;
  const res = await queryBuffer(q);
  console.log(JSON.stringify(res.data?.__schema?.queryType?.fields.map(f => f.name), null, 2));
}

main().catch(console.error);
