# scripts/download_all_vibes_scenes.py
import urllib.request
import os
import json
from vibes_api import VibesClient

COOKIE = "866eacb1-d6f5-458a-89ed-178199babf71.X0FvbQONcH27Ib9DLXskghBidKD-T0Uf5IfJJUKM8LQ"
client = VibesClient(meta_session=COOKIE)

BATCH_MAP = [
    {
        "batch_id": "batch-01a182da-0fa7-76fe-b2e0-7c65dde025ba",
        "output_file": "assets/visuals/vibes_ai/vibes_scene_1.mp4",
        "name": "Scene 1: Rainy Night Glass"
    },
    {
        "batch_id": "batch-01a182da-6800-7d3d-94a4-1985fa20b427",
        "output_file": "assets/visuals/vibes_ai/vibes_scene_2.mp4",
        "name": "Scene 2: Single Candle Flame"
    },
    {
        "batch_id": "batch-01a182da-af14-740f-b5eb-c8f387f8d345",
        "output_file": "assets/visuals/vibes_ai/vibes_scene_3.mp4",
        "name": "Scene 3: Deep Blue Ocean Twilight"
    },
    {
        "batch_id": "batch-01a182da-ffa5-79ee-a29b-8bc613b70936",
        "output_file": "assets/visuals/vibes_ai/vibes_scene_4.mp4",
        "name": "Scene 4: Starlit Night Sky & Lake"
    }
]

os.makedirs("assets/visuals/vibes_ai", exist_ok=True)

print("=== DOWNLOADING META AI GENERATED CLIPS FROM CDN ===")
for item in BATCH_MAP:
    print(f"\nProcessing {item['name']} (Batch {item['batch_id']})...")
    b = client.get_batch(item["batch_id"])
    content = b.get("content") or []
    if not content:
        print("  Error: No content in batch!")
        continue

    v_url = content[0].get("videoUrl")
    if not v_url:
        print("  Error: videoUrl not yet ready!")
        continue

    dest = item["output_file"]
    print(f"  Downloading from Meta CDN to {dest}...")
    urllib.request.urlretrieve(v_url, dest)
    size = os.path.getsize(dest)
    print(f"  [SUCCESS] Downloaded {dest} ({size} bytes)!")

print("\nAll 4 Meta AI scenes downloaded successfully!")
