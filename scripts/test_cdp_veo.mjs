// scripts/test_cdp_veo.mjs - Standalone Test for Direct Chrome CDP Automation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkCDPConnection, generateSingleClipCDP } from './veo_cdp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, '..', 'jobs', 'cdp_test');
fs.mkdirSync(testDir, { recursive: true });

async function runTest() {
  console.log('======================================================');
  console.log('[Veo CDP Test] Step 1: Checking Chrome Remote Debugging on Port 9222...');
  console.log('======================================================');

  const status = await checkCDPConnection();
  if (!status.up) {
    console.log('\n❌ Chrome is not currently running with remote debugging on port 9222.');
    console.log('Reason:', status.reason);
    console.log('\nTo enable port 9222 on your normal Chrome:');
    console.log('1. Close any running Chrome windows.');
    console.log('2. Double-click or run: C:\\Users\\majji\\quran_video_studio\\scripts\\start_chrome_cdp.bat');
    console.log('3. Re-run this test script: node scripts/test_cdp_veo.mjs\n');
    process.exit(1);
  }

  console.log('✅ Chrome CDP connection detected!');
  console.log('Browser:', status.browser);

  const testPrompt = "Cinematic vertical 9:16 macro shot of gentle rain droplets sliding down a window pane at twilight, warm glowing amber light in background, slow motion, hyper-realistic, calming, peaceful, 4k";
  const testOutput = path.join(testDir, 'cdp_test_clip.mp4');

  console.log('\n======================================================');
  console.log('[Veo CDP Test] Step 2: Testing Direct Veo Generation (1 Clip)...');
  console.log('======================================================');

  try {
    const result = await generateSingleClipCDP({
      prompt: testPrompt,
      outputPath: testOutput,
      timeoutMs: 300000
    });

    console.log('\n======================================================');
    console.log('🎉 [Veo CDP Test] SUCCESS!');
    console.log('Generated Video:', result.file);
    console.log('Size:', (result.sizeBytes / (1024 * 1024)).toFixed(2), 'MB');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ [Veo CDP Test] Failed:', err.message);
    process.exit(1);
  }
}

runTest();
