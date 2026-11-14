// produce_workflow_2.mjs - Workflow 2: Meta AI (Vibes.ai) Engine (60s+ Minimum, Single-Use Clips, Sequential Quran Progression)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { getNextQuranBatch } from './quran_progress_tracker.mjs';
import { fetchConsecutiveQuranBatch } from './fetch_consecutive_quran.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OVERLAYS_DIR = path.join(ROOT_DIR, 'assets', 'overlays');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');

[OUTPUT_DIR, JOBS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

export const PROMPT_POOLS = {
  masjid_quran: [
    "Cinematic vertical 9:16 shot of the Holy Quran resting open on an ornate carved wooden rehal inside a magnificent peaceful mosque, gentle morning god rays illuminating the sacred gold-leaf calligraphy, ornate Turkish carpets, grand arches in background, spiritual tranquility, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 macro close-up of an open Holy Quran placed gracefully on a velvet stand inside a tranquil prayer hall, warm glowing light from an antique brass mosque lantern, soft dust motes dancing in the beam, deep peace, 4k ultra realistic, zero text",
    "Cinematic vertical 9:16 low angle shot of the Holy Quran on an ancient dark wood bookstand near a grand marble pillar of an Ottoman mosque, delicate evening sunset light filtering through tall arched windows, peaceful reverence, 4k, zero text",
    "Cinematic vertical 9:16 slow camera push toward the Holy Quran resting on a carved marble ledge inside a quiet Andalusian mosque courtyard, gentle fountain water rippling in the background, serene spiritual ambience, 4k, zero text",
    "Cinematic vertical 9:16 high-angle perspective looking down at an open Holy Quran with emerald and gold illuminated borders on a wooden rihal, surrounded by warm hanging mosque chandeliers, majestic silence, 4k, zero text",
    "Cinematic vertical 9:16 intimate side profile of a closed leather-bound Holy Quran with intricate geometric embossing resting peacefully beside a prayer bead misbaha on a soft mosque carpet at dawn, 4k ultra realistic, zero text",
    "Cinematic vertical 9:16 slow cinematic pan across an open Quran bathed in ethereal twilight glow inside a grand dome mosque, tranquil shadows and soft warm illumination, spiritual awe, 4k, zero text",
    "Cinematic vertical 9:16 slow overhead tracking shot of an open Holy Quran with illuminated gold and lapis lazuli borders resting on an ebony wooden rehal, gentle candlelight flickering softly on polished marble tiles, profound spiritual peace, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 low-angle perspective of an open Holy Quran bathed in warm amber sunbeam streaming through an ornate stained-glass arabesque window in a grand mosque, floating dust motes glistening like gold dust, serene contemplation, 4k ultra realistic, zero text"
  ],
  masjid_worship: [
    "Cinematic vertical 9:16 respectful rear shot of a believer in a clean white prayer robe sitting cross-legged on a vast Persian carpet in an empty grand mosque, peacefully reading the Holy Quran under a soft glowing chandelier, spiritual stillness, 4k, zero text",
    "Cinematic vertical 9:16 silhouetted worshipper sitting in quiet contemplation inside a majestic mosque prayer hall, warm amber sunset sunlight streaming through soaring arched stained-glass windows, meditative tranquility, 4k, zero text",
    "Cinematic vertical 9:16 peaceful worshipper sitting beside a grand marble column reciting Quran softly in an illuminated mosque at night, gentle ambient light from hanging lamps, profound serenity, 4k, zero text",
    "Cinematic vertical 9:16 devout figure with hands raised in peaceful supplication dua inside a tranquil quiet mosque sanctuary at dawn, soft morning blue light meeting warm lantern glow, deep inner peace, 4k, zero text",
    "Cinematic vertical 9:16 side view of an elderly scholar in traditional robe quietly turning a page of scripture inside an ancient sunlit mosque library with arched book alcoves, serene timeless atmosphere, 4k, zero text",
    "Cinematic vertical 9:16 peaceful worshipper walking slowly through an empty colonnaded mosque courtyard with polished white marble reflecting the twilight sky and glowing minaret lamps, 4k, zero text",
    "Cinematic vertical 9:16 respectful wide shot of a solitary worshipper in prostration sujud on a soft mosque carpet under a soaring decorated dome, deep devotion and absolute peace, 4k, zero text",
    "Cinematic vertical 9:16 peaceful side view of a devout worshipper in white attire gently turning prayer beads misbaha in serene silence beneath majestic arches of an illuminated historic mosque at blue hour, deep inner stillness, 4k, zero text",
    "Cinematic vertical 9:16 serene wide shot looking through a row of carved stone archways inside an empty grand mosque at sunrise, a solitary worshipper sitting in quiet reflection bathed in soft golden morning radiance, 4k hyper-realistic, zero text"
  ],
  nature_trees_rivers: [
    "Cinematic vertical 9:16 lush misty emerald pine forest shrouded in gentle mountain fog, soft golden sun rays piercing through towering trees, spiritual tranquil nature, slow camera, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 crystal clear winding river meandering smoothly through an enchanted green valley surrounded by ancient weeping willows and blooming wild lilies at golden hour, serene flow, 4k, zero text",
    "Cinematic vertical 9:16 majestic centuries-old olive grove on a quiet hillside, golden afternoon sunlight filtering through silver-green leaves, gentle breeze, peaceful countryside, 4k, zero text",
    "Cinematic vertical 9:16 autumn river valley with vibrant golden and crimson maple trees, mirror-still stream reflecting the vibrant foliage under a soft overcast sky, serene atmospheric motion, 4k, zero text",
    "Cinematic vertical 9:16 towering bamboo forest with gentle wind rustling stalks and morning mist drifting between emerald stems, peaceful zen nature, slow graceful motion, 4k, zero text",
    "Cinematic vertical 9:16 aerial drone shot following a tranquil mountain river with smooth crystal water flowing gently over polished river stones through a dense cedar forest at sunrise, 4k, zero text",
    "Cinematic vertical 9:16 peaceful meadow with a solitary grand oak tree bathed in ethereal morning mist, soft dew drops shining on grass, spiritual natural beauty, 4k, zero text",
    "Cinematic vertical 9:16 slow camera glide through an ancient blooming almond orchard at dawn, soft white and pink petals gently drifting onto a quiet crystal stream, warm morning glow, peaceful paradise, 4k, zero text",
    "Cinematic vertical 9:16 tranquil misty valley at sunrise with majestic weeping willows bordering a mirror-calm river, golden morning rays piercing through translucent vapor, meditative natural serenity, 4k ultra realistic, zero text"
  ],
  waterfalls_waters: [
    "Cinematic vertical 9:16 grand cascading tiered waterfall tumbling gently down mossy granite rocks into a crystal turquoise pool, gentle water spray in golden sunlight, peaceful, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 secluded tropical grotto with a silky smooth waterfall cascading into a luminous turquoise lagoon surrounded by lush ferns and exotic orchids, tranquil paradise, 4k, zero text",
    "Cinematic vertical 9:16 gentle wide veil waterfall cascading softly over layered limestone shelves into a clear emerald river, morning mist rising slowly in warm dawn light, serene motion, 4k, zero text",
    "Cinematic vertical 9:16 pure mountain spring water bubbling up crystal clear through smooth river pebbles, surrounded by wild mint and mossy stones, peaceful soothing flow, slow motion, 4k, zero text",
    "Cinematic vertical 9:16 dramatic high mountain waterfall framed by towering alpine cliffs and snow-capped peaks at sunset, glowing golden mist, majestic natural grandeur, 4k, zero text",
    "Cinematic vertical 9:16 tranquil rainforest stream with cascading miniature water steps flowing gently over slate rock terraces into a calm still pool, soothing ambience, 4k, zero text",
    "Cinematic vertical 9:16 slow motion close-up of a pure natural spring cascade tumbling gently over velvety emerald mossy rocks into a crystalline turquoise pool, delicate sunlit water droplets, calming peaceful ambience, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 breathtaking twin waterfalls pouring gracefully into a serene alpine lagoon surrounded by wild mountain flowers at golden hour, soft rainbow mist glowing in sunset light, 4k, zero text"
  ],
  beaches_coastal: [
    "Cinematic vertical 9:16 pristine secluded white sand beach at sunset, slow gentle turquoise waves rolling softly onto the shore under a pastel pink and apricot twilight sky, soothing ocean stillness, 4k, zero text",
    "Cinematic vertical 9:16 dramatic coastal headland with turquoise ocean swell washing gently against dark basalt sea cliffs and natural stone arches at golden hour, awe-inspiring tranquility, 4k, zero text",
    "Cinematic vertical 9:16 peaceful tropical shoreline with graceful palm trees swaying gently over crystal-clear shallow turquoise waters under a warm glowing dusk horizon, 4k ultra realistic, zero text",
    "Cinematic vertical 9:16 vast calm ocean at dawn with the golden sun rising quietly above the water, gentle shimmering ripples reflecting endless gold light, meditative stillness, 4k, zero text",
    "Cinematic vertical 9:16 sweeping coastal sand dunes meeting a calm azure sea at twilight, soft ocean breeze carving smooth wind ripples in the sand, peaceful solitude, 4k, zero text",
    "Cinematic vertical 9:16 tranquil twilight tide pool nestled among smooth coastal rocks, reflecting a glowing purple and orange sunset sky, gentle ocean foam receding softly, 4k, zero text",
    "Cinematic vertical 9:16 slow cinematic low-angle glide along wet golden beach sand reflecting a glowing apricot and violet sunset, gentle crystalline waves rolling silently onto shore, profound ocean peace, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 serene coastal cove framed by ancient pine trees and sea cliffs, calm emerald-turquoise waters gently lapping against smooth white pebbles at dawn, meditative stillness, 4k, zero text"
  ],
  cozy_illuminated_houses: [
    "Cinematic vertical 9:16 picturesque stone cottage nestled in a misty enchanted pine forest at twilight, warm amber lights glowing invitingly through wooden window panes, soft chimney smoke rising into starry night sky, cozy peaceful sanctuary, 4k, zero text",
    "Cinematic vertical 9:16 traditional Andalusian courtyard villa at night with warm hanging brass lanterns illuminating carved stone arches and reflecting on a calm central water pool, quiet serenity, 4k, zero text",
    "Cinematic vertical 9:16 cozy mountain wooden chalet perched on a peaceful hill surrounded by snow-dusted fir trees at dusk, glowing warm golden windows cutting through cool blue twilight mist, 4k, zero text",
    "Cinematic vertical 9:16 beautiful lakeside house with warm glowing porch lanterns and fairy lights reflecting across dark mirror-smooth water under a starry night and crescent moon, deeply peaceful, 4k, zero text",
    "Cinematic vertical 9:16 charming Mediterranean stone villa with warm lantern-lit courtyard garden, blooming bougainvillea, and soft glowing arched windows under a deep indigo sky, 4k, zero text",
    "Cinematic vertical 9:16 secluded rustic cabin surrounded by tall autumn trees at twilight, warm fireside glow visible through large bay windows, fallen leaves on stone pathway, tranquil haven, 4k, zero text",
    "Cinematic vertical 9:16 charming waterside cottage on a quiet riverbank at dusk, warm golden interior lamps glowing softly through wooden mullioned windows, calm water reflecting amber light ripples under a twilight sky, cozy sanctuary, 4k, zero text",
    "Cinematic vertical 9:16 picturesque timber cabin nestled deep in a quiet snow-dusted valley at twilight, warm fireplace smoke gently curling from chimney into a starlit sapphire sky, lantern on wooden porch glowing warmly, peaceful haven, 4k hyper-realistic, zero text"
  ],
  cinematic_cityscapes: [
    "Cinematic vertical 9:16 slow aerial drone glide over a breathtaking modern coastal city skyline at twilight, shimmering blue and gold skyscraper lights reflecting on calm bay waters, smooth elegant motion, 4k, zero text",
    "Cinematic vertical 9:16 elevated slow pan overlooking a majestic metropolitan skyline transitioning from golden sunset to dusk, glittering warm lights illuminating iconic towers, tranquil city grandeur, 4k, zero text",
    "Cinematic vertical 9:16 slow upward cinematic tilt along sleek illuminated glass towers into a deep violet evening sky, warm ambient city glow and soft light trails below, peaceful metropolis, 4k, zero text",
    "Cinematic vertical 9:16 panoramic view of a historic and modern cityscape illuminated at blue hour along a tranquil waterfront, bridge lights glowing like golden pearls over calm water, 4k, zero text",
    "Cinematic vertical 9:16 aerial drone tracking shot flying smoothly above illuminated skyscraper rooftops and rooftop gardens at night, distant horizon glowing warmly, serene cinematic perspective, 4k, zero text",
    "Cinematic vertical 9:16 distant high vantage of a sprawling luminous city under a starlit night sky with a peaceful crescent moon shining above the towers, calm urban majesty, 4k, zero text",
    "Cinematic vertical 9:16 slow graceful drone rise over a serene coastal metropolis at dusk, soft golden lantern light lining waterfront boulevards and reflecting off glass architectural towers, tranquil urban harmony, 4k, zero text",
    "Cinematic vertical 9:16 panoramic view of historic domed architecture seamlessly blending into modern illuminated skyline at twilight, warm glowing streetlamps and tranquil river reflections under a velvet blue sky, 4k ultra realistic, zero text"
  ],
  celestial_skies: [
    "Cinematic vertical 9:16 vibrant emerald green and violet aurora borealis dancing across starry Arctic night sky over calm dark water, sublime cosmic awe, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 celestial milky way galaxy with thousands of shining stars moving slowly across a deep midnight sky above silhouetted peaceful mountains, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 ethereal twilight sky with a delicate glowing crescent moon resting peacefully between soft drifting purple illuminated clouds, peaceful meditative night, 4k, zero text",
    "Cinematic vertical 9:16 glowing bioluminescent ocean waves breaking softly onto a dark sandy beach under a canopy of bright celestial stars, magical tranquil night, 4k, zero text",
    "Cinematic vertical 9:16 dramatic golden twilight horizon with the brilliant evening star shining brightly over quiet calm ocean waters, slow camera glide, 4k, zero text",
    "Cinematic vertical 9:16 time-lapse of celestial stars and soft glowing nebulas reflected in a mirror-still alpine lake surrounded by dark pine silhouettes, spiritual cosmic peace, 4k, zero text",
    "Cinematic vertical 9:16 breathtaking time-lapse of a glowing crescent moon and brilliant evening star shining peacefully amidst slow-moving iridescent purple and golden sunset clouds, spiritual wonder, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 ethereal night sky filled with millions of sparkling stars and soft turquoise nebula dust softly reflected in a perfectly still mirror mountain lake, cosmic tranquility, 4k ultra realistic, zero text"
  ],
  peaceful_elements: [
    "Cinematic vertical 9:16 slow heavy raindrops falling gently onto a dark glass window with soft warm amber glowing light in background, tranquil meditative ambience, hyper-realistic, 4k, zero text",
    "Cinematic vertical 9:16 single candle flame glowing softly in a completely dark ancient room, warm golden candlelight, peaceful meditative stillness, 4k ultra realistic, slow motion, zero text",
    "Cinematic vertical 9:16 warm fireplace embers glowing and flickering gently in a peaceful rustic stone hearth, soft calming crackle and warmth, 4k, zero text",
    "Cinematic vertical 9:16 macro water droplets on fresh green olive leaves shining in golden morning sunlight, slow serene camera motion, 4k, zero text",
    "Cinematic vertical 9:16 gentle ripples expanding softly across a mirror-still garden pond reflecting autumn trees and warm sky, meditative peaceful stillness, 4k, zero text",
    "Cinematic vertical 9:16 delicate incense smoke drifting gracefully through soft warm dust beams inside an ancient tranquil sanctuary, slow motion, 4k, zero text",
    "Cinematic vertical 9:16 extreme macro shot of morning dew droplets resting like crystal pearls on delicate rose petals in soft golden sunlight, gentle breeze, sublime meditative peace, 4k ultra realistic, zero text",
    "Cinematic vertical 9:16 slow motion shot of gentle autumn leaves floating serenely on a crystal clear forest spring, warm amber light filtering through canopy, soft water ripples, tranquil stillness, 4k, zero text"
  ],
  fantastic_views: [
    "Cinematic vertical 9:16 ethereal sea of clouds seen from a high mountain summit at dawn, golden morning sun rising above rolling cloud waves, majestic fantastic vista, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 crystal clear mirror-like glacial lake reflecting majestic snow-capped peaks and vibrant twilight colors, sublime peaceful stillness, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 serene desert oasis at golden hour, towering date palms swaying beside mirror-still water under warm glowing skies, tranquil exotic view, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 vast endless mirror salt flats reflecting deep pink and purple dusk horizon into infinity, surreal sublime landscape, 4k, zero text",
    "Cinematic vertical 9:16 majestic winding canyon river at sunrise with golden light illuminating red sandstone walls, peaceful grandeur, 4k, zero text",
    "Cinematic vertical 9:16 deep Norwegian fjord with sheer emerald cliffs and cascading veil waterfalls under soft Nordic dawn light, 4k, zero text",
    "Cinematic vertical 9:16 towering sand dunes in deep Sahara at twilight with sweeping wind ripples and soft violet shadow gradients, peaceful endless expanse, 4k, zero text",
    "Cinematic vertical 9:16 spectacular panoramic shot of terraced emerald green mountain slopes shrouded in soft flowing morning mist at sunrise, golden sunbeam ribbons sweeping across the valley, majestic divine creation, 4k hyper-realistic, zero text",
    "Cinematic vertical 9:16 breathtaking high-altitude vista of rolling purple lavender fields stretching toward distant snow-capped mountain peaks under a glorious pastel dawn sky, pure serenity, 4k, zero text"
  ]
};

// Fisher-Yates array shuffle for unbiased, true randomization
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateThematicPrompts(firstSurah, verses, count = 4) {
  const seed = Date.now().toString(36);
  // 1. Shuffle all categories first
  const categories = Object.keys(PROMPT_POOLS);
  const shuffledCategories = shuffleArray(categories);
  console.log(`[Workflow 2 - Meta AI] Shuffled categories order: [${shuffledCategories.join(', ')}]`);

  const selected = [];
  const usedPrompts = new Set();
  const categoryPools = {};

  for (let i = 0; i < count; i++) {
    const cat = shuffledCategories[i % shuffledCategories.length];

    // 2. In the chosen category, shuffle the prompts
    if (!categoryPools[cat] || categoryPools[cat].length === 0) {
      categoryPools[cat] = shuffleArray(PROMPT_POOLS[cat]);
      console.log(`[Workflow 2 - Meta AI] Chosen Category: "${cat}" -> Shuffled ${categoryPools[cat].length} prompts`);
    }

    // Pick an unused prompt from the shuffled pool
    let picked = null;
    while (categoryPools[cat].length > 0) {
      const candidate = categoryPools[cat].shift();
      if (!usedPrompts.has(candidate)) {
        picked = candidate;
        break;
      }
    }

    if (!picked) {
      categoryPools[cat] = shuffleArray(PROMPT_POOLS[cat]);
      picked = categoryPools[cat].shift();
    }

    usedPrompts.add(picked);
    selected.push(`${picked}, scene seed ${seed}_${i + 1}`);
    console.log(`[Workflow 2 - Meta AI] Scene ${i + 1}/${count} -> Category [${cat}]: "${picked.substring(0, 65)}..."`);
  }

  return selected;
}

export async function produceWorkflow2(options = {}) {
  const jobId = options.job_id || `wf2_vibes_ai_${Date.now()}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  const jobVibesDir = path.join(jobDir, 'vibes');
  fs.mkdirSync(jobVibesDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Workflow 2 - Meta AI Vibes.ai Engine] STARTING: ${jobId}`);
  console.log(`Duration Rule: AT LEAST 60 SECONDS (>= 60s)`);
  console.log(`Vibes.ai Policy: STRICT SINGLE-USE (Fresh Generation per Job)`);
  console.log(`Progression Rule: SEQUENTIAL QURAN CONTINUATION`);
  console.log(`======================================================\n`);

  // 1. Get next sequential batch of Quran verses (minimum 60 seconds)
  const batch = await getNextQuranBatch({
    surah: options.surah,
    startAyah: options.startAyah,
    minDuration: options.minDuration || 60.0,
    reciterId: options.reciterId || 7
  });

  const totalDuration = batch.totalDuration;
  console.log(`[Workflow 2] Sequential batch selected: ${batch.startVerse} to ${batch.endVerse} (${batch.verses.length} verses, ${totalDuration.toFixed(2)}s)`);

  // 2. Fetch Continuous Master Audio & Render Typography Cards
  const quranData = await fetchConsecutiveQuranBatch(batch.verses, options.reciterId || 7, jobDir);
  const verses = quranData.verses;
  const masterAudio = quranData.masterAudioPath;

  // 3. Dynamic Scene Calculation to Occupy Entire Reel (Tranquil Slow-Motion Pacing)
  // Meta AI produces 5.2s clips natively. Applying ~2x serene slow-motion extends them to ~10.5s per scene.
  const TARGET_SCENE_DUR = 10.5;
  const targetSceneCount = Math.max(4, Math.ceil(totalDuration / TARGET_SCENE_DUR));
  console.log(`[Workflow 2] Reel Duration: ${totalDuration.toFixed(2)}s -> Target Scene Count: ${targetSceneCount} unique scenes (~${(totalDuration / targetSceneCount).toFixed(2)}s each)`);

  const prompts = (options.prompts && Array.isArray(options.prompts) && options.prompts.length > 0)
    ? options.prompts
    : generateThematicPrompts(verses[0].surah, verses, targetSceneCount);
  const promptsFile = path.join(jobDir, 'prompts.json');
  fs.writeFileSync(promptsFile, JSON.stringify(prompts, null, 2));

  console.log(`[Workflow 2] Generating ${prompts.length} fresh Meta AI video scenes via Vibes.ai...`);
  const uvPath = 'C:\\Users\\majji\\.local\\bin\\uv.exe';
  const generatorScript = path.join(ROOT_DIR, 'scripts', 'vibes_generator.py');

  let generatedClips = [];
  try {
    const cmd = `"${uvPath}" run --with VibesAI-api python "${generatorScript}" --job-id "${jobId}" --output-dir "${jobVibesDir}" --prompts-file "${promptsFile}"`;
    execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });
    generatedClips = prompts
      .map((_, i) => path.join(jobVibesDir, `vibes_scene_${i + 1}.mp4`))
      .filter(f => fs.existsSync(f) && fs.statSync(f).size > 10000);
  } catch (err) {
    console.warn(`[Workflow 2] Warning during Vibes generation: ${err.message}`);
  }

  // Fallback check if any clip generation failed
  if (generatedClips.length === 0) {
    console.warn('[Workflow 2] Falling back to pre-seeded atmospheric scenes for rendering');
    const fallbackDir = path.join(ROOT_DIR, 'assets', 'visuals', 'vibes_ai');
    const available = [1, 2, 3, 4].map(i => path.join(fallbackDir, `vibes_scene_${i}.mp4`));
    generatedClips = Array.from({ length: targetSceneCount }, (_, i) => available[i % available.length]);
  }

  console.log(`[Workflow 2] Ready with ${generatedClips.length} Meta AI video scenes for Job ${jobId}`);

  // 4. Construct Multi-Scene FFmpeg Pipeline for 60s+ Video
  const cleanMaskPath = path.join(OVERLAYS_DIR, 'phone_frame_clean.png');
  const outputPath = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);

  const sceneCount = generatedClips.length;
  const sceneDur = totalDuration / sceneCount;
  const nativeDur = 5.2; // Meta AI native clip duration
  const ptsFactor = sceneDur / nativeDur; // Deep slow motion adjustment to fit sceneDur (~2x)
  const transDur = 0.90; // 900ms serene, cinematic dip-to-black on EVERY scene transition

  // Inputs:
  // 0..(sceneCount-1): Fresh Meta AI video clips (looped once for safety)
  // Input sceneCount: Clean Phone Bezel Mask
  // Inputs (sceneCount+1)..(sceneCount + verses.length): Typography Card PNGs
  // Input last: Continuous Master Audio
  const ffmpegInputs = [];
  for (let i = 0; i < sceneCount; i++) {
    ffmpegInputs.push('-stream_loop', '1', '-i', generatedClips[i]);
  }

  ffmpegInputs.push('-i', cleanMaskPath);
  const maskInputIdx = sceneCount;

  for (let i = 0; i < verses.length; i++) {
    ffmpegInputs.push('-loop', '1', '-t', totalDuration.toFixed(2), '-i', verses[i].cardPng);
  }

  ffmpegInputs.push('-i', masterAudio);
  const audioInputIdx = sceneCount + 1 + verses.length;

  // 5. Construct Filtergraph
  const filterParts = [];
  const sceneLabels = [];

  for (let i = 0; i < sceneCount; i++) {
    // Dip to black on EVERY transition from video to video (900ms gentle fade in/out)
    const fadeFilter = `fade=t=in:st=0:d=${transDur.toFixed(3)},fade=t=out:st=${(sceneDur - transDur).toFixed(3)}:d=${transDur.toFixed(3)}`;

    filterParts.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,setpts=${ptsFactor.toFixed(4)}*PTS,minterpolate=fps=30:mi_mode=blend,trim=duration=${sceneDur.toFixed(3)},${fadeFilter}[sc${i}]`);
    sceneLabels.push(`[sc${i}]`);
  }

  // Concatenate background scenes
  filterParts.push(`${sceneLabels.join('')}concat=n=${sceneCount}:v=1:a=0[bg_concat]`);

  // Film grain & nocturnal color grading
  filterParts.push(`[bg_concat]noise=alls=7:allf=t+u,eq=contrast=1.06:brightness=-0.02:saturation=0.95[bg_graded]`);

  // Phone bezel overlay (zero watermarks)
  filterParts.push(`[bg_graded][${maskInputIdx}:v]overlay=0:0[bg_clean_bezel]`);

  // Overlay each verse card PNG at its exact relative start & end time
  let prevLayer = 'bg_clean_bezel';
  const cardY = options.cardY || 740;

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const cardInputIdx = sceneCount + 1 + i;
    const cardLabel = `card_faded_${i}`;
    const nextLayer = i === verses.length - 1 ? 'v_final' : `layer_${i}`;

    const textFadeIn = (v.startTime + 0.25).toFixed(3);
    const textFadeOut = Math.max(0, v.endTime - 0.35).toFixed(3);

    filterParts.push(`[${cardInputIdx}:v]format=rgba,fade=t=in:st=${textFadeIn}:d=0.30:alpha=1,fade=t=out:st=${textFadeOut}:d=0.30:alpha=1[${cardLabel}]`);
    filterParts.push(`[${prevLayer}][${cardLabel}]overlay=0:${cardY}:enable='between(t,${v.startTime.toFixed(3)},${v.endTime.toFixed(3)})'[${nextLayer}]`);
    prevLayer = nextLayer;
  }

  const filterComplexStr = filterParts.join(';');

  // Hardware acceleration check
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

  console.log(`[Workflow 2] Rendering 60s+ Master Meta AI Reel (${vcodec})...`);
  const renderStartTime = Date.now();
  await execFileAsync('ffmpeg', ffmpegArgs);
  const renderDuration = ((Date.now() - renderStartTime) / 1000).toFixed(2);

  console.log(`\n======================================================`);
  console.log(`[Workflow 2] 60s+ META AI REEL RENDERED SUCCESSFULLY IN ${renderDuration}s!`);
  console.log(`Output: ${outputPath}`);
  console.log(`Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`Next Execution Will Continue At: Surah ${batch.nextSurah}, Ayah ${batch.nextAyah}`);
  console.log(`======================================================\n`);

  // 6. Extract verification keyframes
  const keyframes = [];
  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const midPoint = v.startTime + (v.duration / 2);
    const thumbFile = path.join(OUTPUT_DIR, `${jobId}_ayah_${v.surah}_${v.ayah}_mid.jpg`);
    execSync(`ffmpeg -y -ss ${midPoint.toFixed(2)} -i "${outputPath}" -vframes 1 -q:v 2 "${thumbFile}"`);
    keyframes.push({
      surah: v.surah,
      ayah: v.ayah,
      verseKey: v.verseKey,
      timestamp: midPoint.toFixed(2),
      thumbFile
    });
  }

  return {
    jobId,
    outputPath,
    renderDuration,
    totalDuration,
    startVerse: batch.startVerse,
    endVerse: batch.endVerse,
    nextSurah: batch.nextSurah,
    nextAyah: batch.nextAyah,
    verses: verses.map(v => ({ key: v.verseKey, text: v.text, start: v.startTime, end: v.endTime })),
    keyframes,
    prompts,
    chosenCategories: options.chosenCategories || []
  };
}

if (process.argv[1] && process.argv[1].endsWith('produce_workflow_2.mjs')) {
  produceWorkflow2()
    .then(r => console.log('Successfully completed 60s+ Workflow 2 production:\n', JSON.stringify(r, null, 2)))
    .catch(console.error);
}
