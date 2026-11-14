// scripts/test_buffer.mjs
const token = 'UzOAWwEy9YPqjz67tZ6sqeyt2hqv0UNz00R1EDkfjib';

async function queryBuffer(query) {
  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  return res.json();
}

async function run() {
  const res = await queryBuffer(`
    query {
      channel(input: { id: "6af071d462b70b94b0bde992" }) {
        id
        name
        service
        isQueuePaused
        postingSchedule {
          day
          times
        }
      }
    }
  `);
  console.log("Channel schedule:", JSON.stringify(res, null, 2));
}

run().catch(console.error);
