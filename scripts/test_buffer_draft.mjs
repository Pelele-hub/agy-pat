import { queryBuffer } from './publish_queue_manager.mjs';

async function main() {
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            status
            dueAt
          }
        }
        ... on InvalidInputError {
          message
        }
        ... on LimitReachedError {
          message
        }
        ... on UnexpectedError {
          message
        }
      }
    }
  `;

  const input = {
    channelId: '6af071d462b70b94b0bde992', // YouTube Shorts
    text: 'Test Quran Pipeline Draft with Public CDN',
    schedulingType: 'automatic',
    mode: 'addToQueue',
    saveToDraft: true,
    needsApproval: false,
    assets: [
      {
        video: {
          url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4'
        }
      }
    ],
    metadata: {
      youtube: {
        title: 'Test Reel Video',
        privacy: 'private',
        madeForKids: false,
        categoryId: '22'
      }
    }
  };

  const res = await queryBuffer(mutation, { input });
  console.log('Result:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
