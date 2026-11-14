// produce_workflow_3.mjs - Workflow 3: Google Veo / Google Flow Video Background Engine
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { fetchConsecutiveQuran } from './fetch_consecutive_quran.mjs';
import { generateVeoScenes } from './veo_generator.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const VEO_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'veo');
const OVERLAYS_DIR = path.join(ROOT_DIR, 'assets', 'overlays');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');

[OUTPUT_DIR, JOBS_DIR, VEO_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

export async function produceWorkflow3(options = {}) {
  const jobId = options.job_id || `wf3_veo_${Date.now()}`;
  const surah = options.surah || 94; // Surah Al-Inshirah
  const startAyah = options.startAyah || 5;
  const count = options.count || 4; // 94:5, 94:6, 94:7, 94:8
  const reciterId = options.reciterId || 7; // Mishari Rashid Alafasy

  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Workflow 3 - Google Veo / Flow] STARTING: ${jobId}`);
  console.log(`Surah: ${surah} | Verses: ${startAyah} to ${startAyah + count - 1}`);
  console.log(`Continuous Studio Master Audio | Dip-To-Black Transitions`);
  console.log(`Google Veo Background Video Engine | ZERO Watermarks`);
  console.log(`======================================================\n`);

  // 1. Fetch Consecutive Verses & Continuous Master Audio
  const quranData = await fetchConsecutiveQuran(surah, startAyah, count, reciterId, jobDir);
  const verses = quranData.verses;
  const masterAudio = quranData.masterAudioPath;
  const totalDuration = quranData.totalDuration;

  // 2. Generate Google Veo Video Backgrounds (Job-Specific & Fresh)
  const jobScenesDir = path.join(jobDir, 'scenes');
  if (!fs.existsSync(jobScenesDir)) fs.mkdirSync(jobScenesDir, { recursive: true });

  const curatedPrompts = [
    "Cinematic vertical 9:16 aerial drone shot of gentle turquoise ocean waves washing over a quiet shoreline at sunset, tranquil calm sea, slow motion, photorealistic, 4k",
    "Cinematic vertical 9:16 slow motion close-up of a single candle flame flickering softly in a tranquil dark room, warm golden glow, soft bokeh, meditative, calming, 4k",
    "Cinematic vertical 9:16 macro shot of gentle rain droplets sliding down a window pane at twilight, warm glowing amber light in background, slow motion, hyper-realistic, calming, peaceful, 4k",
    "Cinematic vertical 9:16 majestic starry night sky and milky way over silhouetted peaceful mountains, serene cosmic atmosphere, spiritual, awe-inspiring, 4k"
  ];

  const promptsToUse = (options.prompts && options.prompts.length >= count) 
    ? options.prompts.slice(0, count) 
    : curatedPrompts.slice(0, count);

  console.log(`[Workflow 3 - Veo] Autonomous generation triggered: Generating ${count} fresh Veo scenes...`);
  const veoGenResult = await generateVeoScenes({
    prompts: promptsToUse,
    outputDir: jobScenesDir,
    count: count,
    forceRegenerate: options.forceRegenerate !== false
  });

  if (!veoGenResult || !veoGenResult.success || veoGenResult.clips.length < count) {
    throw new Error(`Google Veo generation incomplete: expected ${count} scenes, got ${veoGenResult?.clips?.length || 0}`);
  }

  const veoClips = veoGenResult.clips;
  for (let i = 0; i < count; i++) {
    if (!fs.existsSync(veoClips[i]) || fs.statSync(veoClips[i]).size < 100000) {
      throw new Error(`Veo scene ${i + 1} missing or corrupted at: ${veoClips[i]}`);
    }
  }

  // 3. Clean Frame Mask (ZERO WATERMARKS)
  const cleanMaskPath = path.join(OVERLAYS_DIR, 'phone_frame_clean.png');
  const outputPath = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);

  // 4. Construct FFmpeg Inputs
  const ffmpegInputs = [];

  for (let i = 0; i < count; i++) {
    ffmpegInputs.push('-stream_loop', '-1', '-i', veoClips[i]);
  }

  ffmpegInputs.push('-i', cleanMaskPath);

  for (let i = 0; i < count; i++) {
    ffmpegInputs.push('-loop', '1', '-t', totalDuration.toFixed(3), '-i', verses[i].cardPng);
  }

  ffmpegInputs.push('-i', masterAudio);
  const audioInputIdx = count + 1 + count;

  // 5. Construct Filtergraph
  const filterParts = [];
  const transDur = 0.40; // 400ms dip down to black, 400ms dip up from black

  // Prepare each scene with dip-to-black
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

  // Concatenate background video segments
  filterParts.push(`${sceneLabels.join('')}concat=n=${count}:v=1:a=0[bg_concat]`);

  // Subtle film grain matching reference style
  filterParts.push(`[bg_concat]noise=alls=7:allf=t+u,eq=contrast=1.06:brightness=-0.02:saturation=0.95[bg_graded]`);

  // Overlay clean phone bezel mask (ZERO WATERMARKS)
  const maskInputIdx = count;
  filterParts.push(`[bg_graded][${maskInputIdx}:v]overlay=0:0[bg_clean_bezel]`);

  // Chain animated typography cards with smooth alpha crossfades
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

  // Hardware acceleration check (NVENC)
  let vcodec = 'h264_nvenc';
  let codecExtra = ['-preset', 'p5', '-tune', 'hq', '-b:v', '6500k'];
  try {
    execSync('ffmpeg -f lavfi -i nullsrc -c:v h264_nvenc -f null NUL 2>NUL');
  } catch (e) {
    vcodec = 'libx264';
    codecExtra = ['-preset', 'fast', '-crf', '18'];
  }

  // 6. Execute FFmpeg Render
  const ffmpegArgs = [
    '-y',
    ...ffmpegInputs,
    '-filter_complex', filterComplexStr,
    '-map', '[v_final]',
    '-map', `${audioInputIdx}:a`,
    '-c:v', vcodec,
    ...codecExtra,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-ar', '44100',
    '-shortest',
    outputPath
  ];

  console.log(`[Workflow 3] Rendering master composite to ${outputPath}...`);
  const startTime = Date.now();
  await execFileAsync('ffmpeg', ffmpegArgs);
  const renderSecs = ((Date.now() - startTime) / 1000).toFixed(1);

  // Generate keyframe thumbnails for n8n preview
  const keyframes = [];
  for (let i = 0; i < count; i++) {
    const v = verses[i];
    const snapTime = (v.startTime + v.duration / 2).toFixed(2);
    const thumbFile = path.join(OUTPUT_DIR, `${jobId}_ayah_${v.ayah}_thumb.jpg`);
    try {
      execSync(`ffmpeg -y -ss ${snapTime} -i "${outputPath}" -vframes 1 -q:v 2 "${thumbFile}" 2>NUL`);
      if (fs.existsSync(thumbFile)) {
        keyframes.push({ ayah: v.ayah, time: snapTime, thumbFile });
      }
    } catch (e) {}
  }

  console.log(`\n======================================================`);
  console.log(`[Workflow 3] COMPLETE in ${renderSecs}s!`);
  console.log(`Master Video: ${outputPath}`);
  console.log(`File Size: ${(fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`Keyframes Generated: ${keyframes.length}`);
  console.log(`======================================================\n`);

  return {
    jobId,
    outputPath,
    totalDuration,
    verses,
    startVerse: `${surah}:${startAyah}`,
    endVerse: `${surah}:${startAyah + count - 1}`,
    nextSurah: surah,
    nextAyah: startAyah + count,
    renderDuration: renderSecs,
    renderSecs,
    keyframes
  };
}

if (process.argv[1] && process.argv[1].endsWith('produce_workflow_3.mjs')) {
  produceWorkflow3()
    .then(res => {
      console.log('Production Result:', {
        jobId: res.jobId,
        outputPath: res.outputPath,
        totalDuration: res.totalDuration,
        renderSecs: res.renderSecs,
        keyframesCount: res.keyframes.length
      });
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal render error:', err);
      process.exit(1);
    });
}
