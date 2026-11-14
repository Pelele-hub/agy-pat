import { execSync } from 'child_process';

async function checkDurations() {
  const surah = 94;
  const ayahs = [5, 6, 7, 8];
  let total = 0;
  for (const a of ayahs) {
    const sStr = String(surah).padStart(3, '0');
    const aStr = String(a).padStart(3, '0');
    const url = `https://everyayah.com/data/Alafasy_128kbps/${sStr}${aStr}.mp3`;
    const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${url}"`, { encoding: 'utf-8' }).trim());
    console.log(`Ayah ${surah}:${a} duration: ${dur.toFixed(2)}s`);
    total += dur;
  }
  console.log(`Total Duration: ${total.toFixed(2)}s`);
}

checkDurations().catch(console.error);
