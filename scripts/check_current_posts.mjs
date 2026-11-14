import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const postIds = [
    { name: 'YouTube', id: '6af3390a825741bba8402ed5' },
    { name: 'TikTok', id: '6af3390ca80c88d57642667e' },
    { name: 'Facebook', id: '6af3390da80c88d576426707' }
  ];

  for (const item of postIds) {
    const q = `
      query {
        post(input: { id: "${item.id}" }) {
          id
          status
          dueAt
          error {
            message
            rawError
            supportUrl
          }
        }
      }
    `;
    const res = await queryBuffer(q);
    console.log(`\n=== ${item.name} (${item.id}) ===`);
    console.log(JSON.stringify(res.data?.post || res.errors, null, 2));
  }
}

main().catch(console.error);
