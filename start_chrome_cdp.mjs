import { spawn } from 'child_process';
import http from 'http';

console.log('Spawning persistent Chrome with custom profile and port 9222...');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const p = spawn(chromePath, [
  '--remote-debugging-port=9222',
  '--user-data-dir=C:\\Users\\majji\\quran_video_studio\\config\\google_chrome_profile',
  '--no-first-run',
  'https://flow.google.com'
], {
  detached: true,
  stdio: 'ignore'
});
p.unref();

console.log('Chrome spawned with PID:', p.pid);

async function checkPort() {
  for (let i = 1; i <= 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch('http://localhost:9222/json/version');
      if (res.ok) {
        const json = await res.json();
        console.log('✅ Port 9222 is ACTIVE!', json);
        return true;
      }
    } catch (_) {}
    console.log(`Waiting for port 9222 (attempt ${i}/10)...`);
  }
  console.log('❌ Port 9222 did not open');
  return false;
}

checkPort().then(ok => {
  if (ok) process.exit(0);
  else process.exit(1);
});
