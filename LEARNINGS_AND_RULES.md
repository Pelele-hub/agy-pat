# Quran Video Studio - Architecture Rules & Continuous Learnings

This document preserves architectural rules, technical bug fixes, and production guidelines learned during development.

## 1. Video Duration & Pacing Rules
- **Minimum Duration:** Videos MUST be at least 60 seconds long (`>= 60s`).
- **Tranquil Scene Pacing (Comfortable Viewing Experience):**
  - Meta AI (Vibes.ai) generates native ~5.2s video clips.
  - To allow the viewer to thoroughly enjoy and absorb each AI visual without fast, rushed cuts, target **~10.5 seconds per scene**:
    $$\text{sceneCount} = \max\left(4, \left\lceil \frac{\text{totalDuration}}{10.5} \right\rceil\right)$$
  - For a ~66s reel, this allocates **6 distinct scenes** (~11.0s each).
- **Buttery-Smooth Slow-Motion Effect:**
  - Scale video playback speed by `ptsFactor = sceneDur / 5.2` (approx $\approx 2.0\times$ slowdown).
  - Use `minterpolate=fps=30:mi_mode=blend` to blend adjacent frames, delivering fluid, natural cinematic motion blur that feels peaceful and dreamlike.
- **Cinematic Dip-to-Black Transitions:**
  - A relaxed **900ms dip-to-black transition** (`fade=t=in:st=0:d=0.9,fade=t=out:st=end-0.9:d=0.9`) is applied to **every** scene change, providing breathing room between visuals.

## 2. Sequential Quran Progression
- State is persistently maintained in `jobs/quran_progress_state.json`.
- Each run queries verses sequentially from `currentSurah:nextAyah`, calculating cumulative duration until `>= 60s`.
- When a chapter completes, it seamlessly overflows into the next Surah (e.g. Surah 1:7 -> Surah 2:1).

## 3. Vibes.ai & Meta AI Integration Rules
- **Single-Use Policy:** All generated clips are logged into `jobs/used_vibes_clips.json` with status `RETIRED_SINGLE_USE`. Never reuse clips across reels.
- **API Response Structure:**
  - Batch ID returned in `res.get("batchId")` (camelCase).
  - Batch poll response contains generated video items in `batch.get("content")`.
  - Video stream/download URL is at `item.get("videoUrl")`.
- **Thematic Prompt Library & Two-Tier Shuffle Execution:**
  - Expanded prompt library across all 10 distinct, non-repeating visual categories (each category updated with 2 additional high-fidelity cinematic prompts, totaling 84 curated prompts):
    1. *Holy Quran in Masjid* (9 prompts: carved wooden rehal, god rays, antique lanterns, gold illumination, lapis lazuli borders, arabesque stained-glass sunbeams)
    2. *Masjid Worship & Contemplation* (9 prompts: believers reading Quran in prayer halls, sujud, soft chandeliers, misbaha beads at blue hour, solitary morning reflection)
    3. *Nature, Trees & Rivers* (9 prompts: misty pine forests, weeping willows, olive groves, winding rivers, blooming almond orchards, morning vapor)
    4. *Waterfalls & Sacred Streams* (8 prompts: tiered waterfalls, crystal spring pools, rainforest grottoes, velvety emerald moss cascades, twin alpine lagoons)
    5. *Beaches & Coastal Waters* (8 prompts: calm turquoise shores, sunset tide pools, sweeping sea dunes, apricot/violet wet sand reflections, secluded pebble coves)
    6. *Cozy Illuminated Houses* (8 prompts: stone cottages in misty woods with warm window glow, courtyard villas, waterside cottages at dusk, snow-dusted timber chalets)
    7. *Cinematic Cityscapes* (8 prompts: aerial drone glides over twilight skylines, illuminated glass towers, waterfront boulevards, historic domed skylines)
    8. *Celestial & Cosmic* (8 prompts: aurora borealis, milky way, crescent moons, bioluminescent tides, twilight crescent & evening star, nebula lake reflections)
    9. *Peaceful Elements* (8 prompts: candlelight in dark rooms, raindrops on glass, incense smoke, crystal morning dew on rose petals, autumn leaves on spring water)
    10. *Fantastic Views* (9 prompts: sea of clouds at sunrise, glacial reflections, desert oases, terraced misty mountain slopes, alpine lavender fields)
  - **Dynamic Two-Tier Shuffle on Workflow Execution:**
    - **Tier 1 (Category Shuffle):** Upon workflow trigger, all 10 categories are randomized using the Fisher-Yates shuffle algorithm.
    - **Tier 2 (In-Category Prompt Shuffle):** For each chosen category, its prompts are independently shuffled using Fisher-Yates before selection, ensuring maximum visual diversity, non-repeating scenes, and zero pattern fatigue across generations.

## 4. Google Flow & Veo Automation Engine (Reverse-Engineered Architecture)
- **Slate.js & ProseMirror Fiber Insertion:**
  - Standard DOM `.value` or `.innerText` mutations fail because Slate/React Fiber manages text state internally.
  - Fix: Select end of node contents, collapse range, and dispatch `document.execCommand('insertText', false, promptText)` followed by an `input` event.
- **Bypassing Google's Synthetic Event Blocker (`isTrusted` Proxy):**
  - Google Flow's Wiz/Angular click dispatcher ignores untrusted synthetic events (`isTrusted: false`).
  - Fix: An injected bridge script in the page `MAIN` world (`flow_main_bridge.js`) hooks `EventTarget.prototype.addEventListener` to maintain a `WeakMap` of registered submit callbacks, then wraps synthetic MouseEvents in a `Proxy` returning `isTrusted: true` before invoking the registered Angular listener directly.
- **Network-Layer Video Blob Interception:**
  - Video tiles in Google Flow utilize virtualized scrolling and are unmounted outside the viewport.
  - Fix: Patch `window.fetch` at the network layer to sniff `video/mp4` binaries from `flow-content.google`, `storage.googleapis.com`, and `/asb/`, converting them into base64 payload streams for immediate transmission back to the studio API.
- **CORS Header Stripping:**
  - A Declarative Net Request rule strips the `cross-origin-resource-policy` header from `||flow.google.com/asb/` allowing unblocked binary fetching.
- **Autonomous Playwright Runner (Zero Manual Clicks):**
  - When Workflow 3 is triggered in n8n, `scripts/veo_generator.mjs` runs via Playwright in the background, injects the reverse-engineered bridge, navigates to `flow.google.com`, submits all 4 scenes via the `isTrusted` proxy, captures the MP4 binaries, and passes them to `produce_workflow_3.mjs` for assembly with zero manual interference.

## 5. Proposed Workflow Improvements & Upgrades
1. **Ayah-Thematic Semantic Prompting:**
   - Use an LLM node in n8n to analyze the English translation and Tafsir of the exact verses being recited, generating prompts that directly visualize the spiritual metaphors in the Ayahs (e.g., ships upon the sea, day and night alternation, gardens of paradise).
2. **Audio-Visual Pause Alignment (Waqf Sync):**
   - Align video scene cuts precisely to the reciter's natural pauses (*Waqf*) between verses rather than fixed intervals.
3. **Multi-Platform Auto-Publisher:**
   - Connect n8n nodes directly to YouTube Shorts, Instagram Graph API, and TikTok Content Posting API with auto-generated hashtags, captions, and title metadata.
4. **AI Frame Interpolation:**
   - Utilize RIFE (Real-Time Intermediate Flow Estimation) for optical flow interpolation to render native 60fps buttery-smooth motion.
