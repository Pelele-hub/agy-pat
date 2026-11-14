// produce_workflow_1.mjs - Workflow 1: Multi-Scene Curated HD Vertical B-Roll Engine
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { fetchConsecutiveQuran } from './fetch_consecutive_quran.mjs';
import { getNextPassage } from './passage_catalogue.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BROLL_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'broll');
const OVERLAYS_DIR = path.join(ROOT_DIR, 'assets', 'overlays');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');

[OUTPUT_DIR, JOBS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

export async function produceWorkflow1(options = {}) {
  const jobId = options.job_id || `wf1_multiscene_${Date.now()}`;
  const passage = getNextPassage(options.surah, options.startAyah, options.count);
  const surah = passage.surah;
  const startAyah = passage.startAyah;
  const count = passage.count;
  const reciterId = options.reciterId || 7; // Mishari Rashid Alafasy

  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Workflow 1 - Multi-Scene B-Roll] STARTING: ${jobId}`);
  console.log(`Surah: ${surah} (${passage.name || ''}) | Verses: ${startAyah} to ${startAyah + count - 1}`);
  console.log(`Theme: ${passage.theme || 'Atmospheric B-Roll'}`);
  console.log(`Continuous Studio Master Audio | Dip-To-Black Transitions`);
  console.log(`Slow Relaxing B-Roll | ZERO Watermarks`);
  console.log(`======================================================\n`);

  // 1. Fetch Consecutive Verses & Continuous Master Audio
  const quranData = await fetchConsecutiveQuran(surah, startAyah, count, reciterId, jobDir);
  const verses = quranData.verses;
  const masterAudio = quranData.masterAudioPath;
  const totalDuration = quranData.totalDuration;

  // 2. Select Distinct, Relaxing Vertical B-Roll Videos for each verse
  const availableBroll = [
    path.join(BROLL_DIR, 'mulk_scene_1_night_stars.mp4'),
    path.join(BROLL_DIR, 'mulk_scene_2_candle.mp4'),
    path.join(BROLL_DIR, 'mulk_scene_3_moon_clouds.mp4'),
    path.join(BROLL_DIR, 'mulk_scene_4_dark_sea.mp4'),
    path.join(BROLL_DIR, 'mulk_scene_5_milky_way.mp4'),
    path.join(BROLL_DIR, 'calm_candle.mp4'),
    path.join(BROLL_DIR, 'calm_forest_fog.mp4'),
    path.join(BROLL_DIR, 'calm_night_lake.mp4'),
    path.join(BROLL_DIR, 'rain_window.mp4'),
    path.join(BROLL_DIR, 'black_hole_loop.mp4'),
    path.join(BROLL_DIR, 'ocean_twilight.mp4')
  ].filter(f => fs.existsSync(f) && fs.statSync(f).size > 10000);

  const offset = (surah * 2 + startAyah) % availableBroll.length;
  const brollCandidates = [];
  for (let i = 0; i < count; i++) {
    brollCandidates.push(availableBroll[(offset + i) % availableBroll.length]);
  }

  // Verify all candidate files exist
  for (let i = 0; i < count; i++) {
    if (!fs.existsSync(brollCandidates[i])) {
      console.warn(`[Workflow 1] Warning: Candidate ${brollCandidates[i]} missing, falling back to ocean_twilight.mp4`);
      brollCandidates[i] = path.join(BROLL_DIR, 'ocean_twilight.mp4');
    }
  }

  // 3. Clean Frame Mask (ZERO WATERMARKS)
  const cleanMaskPath = path.join(OVERLAYS_DIR, 'phone_frame_clean.png');
  const outputPath = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);

  // 4. Construct FFmpeg Inputs
  // Inputs 0..(count-1): B-Roll Video Loops
  // Input count: Clean Phone Bezel Mask
  // Inputs (count+1)..(count+1 + count - 1): Looped Typography Cards
  // Input (last): Continuous Master Audio
  const ffmpegInputs = [];

  for (let i = 0; i < count; i++) {
    ffmpegInputs.push('-stream_loop', '-1', '-i', brollCandidates[i]);
  }

  ffmpegInputs.push('-i', cleanMaskPath);

  for (let i = 0; i < count; i++) {
    ffmpegInputs.push('-loop', '1', '-t', totalDuration.toFixed(2), '-i', verses[i].cardPng);
  }

  ffmpegInputs.push('-i', masterAudio);
  const audioInputIdx = count + 1 + count;

  // 5. Construct Filtergraph
  const filterParts = [];
  const transDur = 0.40; // 400ms dip down to black, 400ms dip up from black

  // Prepare each B-roll video: scale to 1080x1920, crop, trim to verse duration, and apply dip-to-black fade
  const sceneLabels = [];
  for (let i = 0; i < count; i++) {
    const v = verses[i];
    const dur = v.duration;
    const fadeOutStart = Math.max(0, dur - transDur);

    let fadeFilter = '';
    if (i === 0) {
      fadeFilter = `fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${transDur.toFixed(3)}`;
    } else if (i === count - 1) {
      fadeFilter = `fade=t=in:st=0:d=${transDur.toFixed(3)},fade=t=out:st=${(dur - 0.50).toFixed(3)}:d=0.50`;
    } else {
      fadeFilter = `fade=t=in:st=0:d=${transDur.toFixed(3)},fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${transDur.toFixed(3)}`;
    }

    filterParts.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,trim=duration=${dur.toFixed(3)},setpts=PTS-STARTPTS,${fadeFilter}[sc${i}]`);
    sceneLabels.push(`[sc${i}]`);
  }

  // Concatenate all scenes into a continuous background video with smooth dip-to-black transitions
  filterParts.push(`${sceneLabels.join('')}concat=n=${count}:v=1:a=0[bg_concat]`);

  // Film grain & nocturnal color grading matching reference
  filterParts.push(`[bg_concat]noise=alls=7:allf=t+u,eq=contrast=1.06:brightness=-0.02:saturation=0.95[bg_graded]`);

  // Clean phone bezel overlay (NO WATERMARKS)
  const maskInputIdx = count;
  filterParts.push(`[bg_graded][${maskInputIdx}:v]overlay=0:0[bg_clean_bezel]`);

  // Overlay each verse card with smooth opacity fade-in and fade-out matching the transitions
  let prevLayer = 'bg_clean_bezel';
  for (let i = 0; i < count; i++) {
    const v = verses[i];
    const cardInputIdx = count + 1 + i;
    const cardLabel = `card_faded_${i}`;
    const nextLayer = i === count - 1 ? 'v_final' : `layer_${i}`;

    const textFadeIn = (v.startTime + 0.30).toFixed(3);
    const textFadeOut = Math.max(0, v.endTime - 0.40).toFixed(3);

    // Apply alpha fade to text card
    filterParts.push(`[${cardInputIdx}:v]format=rgba,fade=t=in:st=${textFadeIn}:d=0.35:alpha=1,fade=t=out:st=${textFadeOut}:d=0.35:alpha=1[${cardLabel}]`);

    // Overlay onto video
    const cardY = options.cardY || 740;
    filterParts.push(`[${prevLayer}][${cardLabel}]overlay=0:${cardY}:enable='between(t,${v.startTime.toFixed(3)},${v.endTime.toFixed(3)})'[${nextLayer}]`);
    prevLayer = nextLayer;
  }

  const filterComplexStr = filterParts.join(';');

  // NVENC Check
  let vcodec = 'h264_nvenc';
  let codecExtra = ['-preset', 'p5', '-tune', 'hq', '-b:v', '6500k'];
  try {
    execSync('ffmpeg -f lavfi -i nullsrc -c:v h264_nvenc -f null NUL 2>NUL');
  } catch (e) {
    vcodec = 'libx264';
    codecExtra = ['-preset', 'fast', '-crf', '18'];
  }

  const ffmpegArgs = [
    '-y',
    ...ffmpegInputs,
    '-filter_complex', filterComplexStr,
    '-map', '[v_final]',
    '-map', `${audioInputIdx}:a`,
    '-c:v', vcodec,
    ...codecExtra,
    '-c:a', 'aac',
    '-b:a', '192k',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-t', totalDuration.toFixed(2),
    outputPath
  ];

  console.log(`[Workflow 1] Rendering Continuous Multi-Scene Reel (${vcodec})...`);
  const renderStartTime = Date.now();
  await execFileAsync('ffmpeg', ffmpegArgs);
  const renderDuration = ((Date.now() - renderStartTime) / 1000).toFixed(2);

  console.log(`\n======================================================`);
  console.log(`[Workflow 1] REEL RENDERED SUCCESSFULLY IN ${renderDuration}s!`);
  console.log(`Output: ${outputPath}`);
  console.log(`======================================================\n`);

  // Extract verification keyframes for EACH verse scene & transitions
  const keyframes = [];
  for (let i = 0; i < count; i++) {
    const v = verses[i];
    const midPoint = v.startTime + (v.duration / 2);
    const thumbFile = path.join(OUTPUT_DIR, `${jobId}_ayah_${v.ayah}_mid.jpg`);
    execSync(`ffmpeg -y -ss ${midPoint.toFixed(2)} -i "${outputPath}" -vframes 1 -q:v 2 "${thumbFile}"`);
    keyframes.push({
      ayah: v.ayah,
      verseKey: v.verseKey,
      timestamp: midPoint.toFixed(2),
      thumbFile
    });

    // Also extract transition frame (at the cut between scenes)
    if (i < count - 1) {
      const transPoint = v.endTime;
      const transThumb = path.join(OUTPUT_DIR, `${jobId}_transition_${v.ayah}_to_${v.ayah + 1}.jpg`);
      execSync(`ffmpeg -y -ss ${transPoint.toFixed(2)} -i "${outputPath}" -vframes 1 -q:v 2 "${transThumb}"`);
      keyframes.push({
        transition: `${v.verseKey} -> ${surah}:${v.ayah + 1}`,
        timestamp: transPoint.toFixed(2),
        thumbFile: transThumb
      });
    }
  }

  return {
    jobId,
    outputPath,
    renderDuration,
    totalDuration,
    verses: verses.map(v => ({ key: v.verseKey, text: v.text, start: v.startTime, end: v.endTime })),
    keyframes
  };
}

if (process.argv[1] && process.argv[1].endsWith('produce_workflow_1.mjs')) {
  produceWorkflow1()
    .then(r => console.log('Finished production run:\n', JSON.stringify(r, null, 2)))
    .catch(console.error);
}
