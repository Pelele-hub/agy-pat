# scripts/vibes_generator.py - Automated Meta AI (Vibes.ai) Background Video Generator (Single-Use Policy)
import os
import sys
import time
import json
import argparse
import urllib.request
from vibes_api import VibesClient, AspectRatio, Resolution, VideoModel

COOKIE_VALUE = "866eacb1-d6f5-458a-89ed-178199babf71.X0FvbQONcH27Ib9DLXskghBidKD-T0Uf5IfJJUKM8LQ"

def get_vibes_client():
    return VibesClient(meta_session=COOKIE_VALUE)

def get_or_create_project(client, project_name="Quran Video Studio - Meta AI"):
    res = client.list_projects()
    projects = res.get("projects", [])
    project = next((p for p in projects if p.get("name") == project_name), None)
    if not project:
        print(f"[Vibes.ai] Creating dedicated project: '{project_name}'...", flush=True)
        project = client.create_project(name=project_name)
    return project["id"]

def record_used_clips(job_id, clips_info):
    """Log generated clips into persistent used_vibes_clips.json to enforce single-use policy"""
    try:
        registry_path = os.path.join(os.path.dirname(__file__), "..", "jobs", "used_vibes_clips.json")
        registry_path = os.path.abspath(registry_path)
        os.makedirs(os.path.dirname(registry_path), exist_ok=True)

        history = []
        if os.path.exists(registry_path):
            with open(registry_path, "r", encoding="utf-8") as f:
                history = json.load(f)

        for c in clips_info:
            history.append({
                "jobId": job_id,
                "batchId": c.get("batch_id"),
                "file": c.get("dest_path"),
                "prompt": c.get("prompt"),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "status": "RETIRED_SINGLE_USE"
            })

        with open(registry_path, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
        print(f"[Vibes.ai] Recorded {len(clips_info)} clips into single-use registry: {registry_path}", flush=True)
    except Exception as e:
        print(f"[Vibes.ai Warning] Failed to update registry: {e}", flush=True)

def generate_vibes_clips(prompts, output_dir="assets/visuals/vibes_ai", job_id="manual_job"):
    client = get_vibes_client()
    project_id = get_or_create_project(client)
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n========================================================", flush=True)
    print(f"[Vibes.ai Engine] Submitting {len(prompts)} prompts to Meta AI (Job: {job_id})...", flush=True)
    print(f"Output Directory: {output_dir}", flush=True)
    print(f"Format: 9:16 Vertical (PORTRAIT) | Resolution: P720", flush=True)
    print(f"Strict Policy: Generated clips are SINGLE-USE ONLY", flush=True)
    print(f"========================================================\n", flush=True)

    batch_ids = []
    # 1. Submit all prompts in parallel/sequence
    for i, p in enumerate(prompts):
        filename = f"vibes_scene_{i+1}.mp4"
        dest_path = os.path.join(output_dir, filename)

        print(f"[Vibes.ai] Submitting Prompt {i+1}: \"{p[:60]}...\"", flush=True)
        # generate with poll=False to submit immediately
        res = client.generate_video(
            project_id=project_id,
            prompt=p,
            aspect_ratio=AspectRatio.PORTRAIT,
            resolution=Resolution.P720,
            variations=1,
            poll=False
        )
        batch_id = res.get("batchId") or res.get("id") or res.get("batch_id") or (res.get("batch", {}).get("id") if isinstance(res.get("batch"), dict) else None)
        print(f"  -> Submitted batch: {batch_id}", flush=True)
        batch_ids.append({
            "index": i + 1,
            "batch_id": batch_id,
            "dest_path": dest_path,
            "prompt": p,
            "downloaded": False
        })
        time.sleep(1.2) # brief throttle between submissions

    # 2. Poll and download videos as soon as videoUrl is ready on CDN
    print(f"\n[Vibes.ai] Polling Meta AI CDN for completed video clips...", flush=True)
    start_poll = time.time()
    max_poll = 420 # 7 minutes max for multi-clip batches

    while time.time() - start_poll < max_poll:
        all_done = True
        for b in batch_ids:
            if b["downloaded"]:
                continue
            all_done = False

            try:
                batch_data = client.get_batch(b["batch_id"])
                content = batch_data.get("content") or []
                if content:
                    item = content[0]
                    video_url = item.get("videoUrl")
                    if video_url:
                        print(f"[Vibes.ai] Clip {b['index']} ready on Meta CDN! Downloading...", flush=True)
                        urllib.request.urlretrieve(video_url, b["dest_path"])
                        file_size = os.path.getsize(b["dest_path"])
                        print(f"  [SUCCESS] Clip {b['index']} saved to {b['dest_path']} ({file_size} bytes)", flush=True)
                        b["downloaded"] = True
            except Exception as e:
                print(f"  Warning polling {b['batch_id']}: {e}", flush=True)

        if all_done:
            print("\n[Vibes.ai] ALL Meta AI clips successfully generated and downloaded!", flush=True)
            break

        time.sleep(4)

    downloaded = [b for b in batch_ids if b["downloaded"]]
    record_used_clips(job_id, downloaded)
    downloaded_files = [b["dest_path"] for b in downloaded]
    print(f"\n[Vibes.ai] Summary: {len(downloaded_files)}/{len(prompts)} clips ready for {job_id}.\n", flush=True)
    return downloaded_files

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate fresh Meta AI video scenes via Vibes.ai")
    parser.add_argument("--job-id", type=str, default=f"job_{int(time.time())}")
    parser.add_argument("--output-dir", type=str, default="assets/visuals/vibes_ai")
    parser.add_argument("--prompts-file", type=str, default="")
    args = parser.parse_args()

    prompts = []
    if args.prompts_file and os.path.exists(args.prompts_file):
        with open(args.prompts_file, "r", encoding="utf-8") as f:
            prompts = json.load(f)

    if not prompts:
        prompts = [
            "Cinematic vertical 9:16 shot of the Holy Quran resting open on an ornate carved wooden rehal inside a magnificent peaceful mosque, gentle morning god rays illuminating sacred gold-leaf calligraphy, ornate Turkish carpets, grand arches in background, spiritual tranquility, 4k hyper-realistic, zero text",
            "Cinematic vertical 9:16 respectful rear shot of a believer in a clean white prayer robe sitting cross-legged in an empty grand mosque, peacefully reading the Holy Quran under a soft glowing chandelier, spiritual stillness, 4k, zero text",
            "Cinematic vertical 9:16 picturesque stone cottage nestled in a misty enchanted pine forest at twilight, warm amber lights glowing invitingly through wooden window panes, soft chimney smoke rising into starry night sky, cozy peaceful sanctuary, 4k, zero text",
            "Cinematic vertical 9:16 slow aerial drone glide over a breathtaking modern coastal city skyline at twilight, shimmering blue and gold skyscraper lights reflecting on calm bay waters, smooth elegant motion, 4k, zero text",
            "Cinematic vertical 9:16 grand cascading tiered waterfall tumbling gently down mossy granite rocks into a crystal turquoise pool, gentle water spray in golden sunlight, peaceful, 4k hyper-realistic, zero text",
            "Cinematic vertical 9:16 pristine secluded white sand beach at sunset, slow gentle turquoise waves rolling softly onto the shore under a pastel pink and apricot twilight sky, soothing ocean stillness, 4k, zero text",
            "Cinematic vertical 9:16 single candle flame glowing softly in a completely dark ancient room, warm golden candlelight, peaceful meditative stillness, 4k ultra realistic, slow motion, zero text"
        ]

    files = generate_vibes_clips(prompts, output_dir=args.output_dir, job_id=args.job_id)
    print(json.dumps(files))
