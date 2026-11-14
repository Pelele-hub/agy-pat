// scripts/inspect_chrome_history.mjs
import fs from 'fs';
import path from 'path';

const tempHistory = path.join(process.env.TEMP, 'ChromeHistoryCopy');
if (!fs.existsSync(tempHistory)) {
  console.log('No temp file');
  process.exit(0);
}

const buf = fs.readFileSync(tempHistory);
const text = buf.toString('latin1');
const matches = text.match(/https?:\/\/[a-zA-Z0-9.-]+(?:flow|google|veo)[^\s\0<>"']+/g) || [];
const unique = Array.from(new Set(matches)).filter(u => u.includes('flow') || u.includes('fx'));
console.log('Found URLs:');
unique.slice(-15).forEach(u => console.log(' -', u));
