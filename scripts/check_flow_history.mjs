// scripts/check_flow_history.mjs
import fs from 'fs';
import path from 'path';

const tempHistory = path.join(process.env.TEMP, 'ChromeHistoryCopy');
if (!fs.existsSync(tempHistory)) {
  console.log('No history copy');
  process.exit(0);
}

const buf = fs.readFileSync(tempHistory);
const text = buf.toString('latin1');
const re = /https:\/\/flow\.google\.com\/[^\s\0<>"']+/g;
const matches = text.match(re) || [];
const unique = Array.from(new Set(matches));
console.log('Total unique flow URLs:', unique.length);
unique.forEach(u => console.log(' ->', u));
