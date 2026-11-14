# scripts/test_vibes_generate.py
import os
import sys
import json
from vibes_api import VibesClient, AspectRatio, Resolution, VideoModel

COOKIE_VALUE = "866eacb1-d6f5-458a-89ed-178199babf71.X0FvbQONcH27Ib9DLXskghBidKD-T0Uf5IfJJUKM8LQ"

client = VibesClient(meta_session=COOKIE_VALUE)

print("Connecting to Vibes.ai...")
# Create a dedicated project for Quran Video Studio
project_name = "Quran Video Studio - Meta AI"
existing_projects = client.list_projects().get("projects", [])
project = next((p for p in existing_projects if p.get("name") == project_name), None)

if not project:
    print(f"Creating project '{project_name}'...")
    project = client.create_project(name=project_name)
    print(f"Created project: {project['id']}")
else:
    print(f"Using existing project: {project['id']}")

project_id = project["id"]

prompt = "Cinematic nocturnal night sky, slow tranquil stars moving across dark clouds, peaceful meditative atmosphere, 4k high quality, vertical video"
print(f"\nSubmitting video generation to Meta AI (Vibes.ai)...")
print(f"Prompt: \"{prompt}\"")
print(f"Aspect Ratio: PORTRAIT (9:16) | Resolution: P720")

batch = client.generate_video(
    project_id=project_id,
    prompt=prompt,
    aspect_ratio=AspectRatio.PORTRAIT,
    resolution=Resolution.P720,
    variations=1,
    poll=True,
    poll_interval=4.0,
    poll_timeout=180.0
)

print("\nGeneration finished! Response structure:")
print(json.dumps(batch, indent=2)[:500] + "...")

# Find content items
items = batch.get("content") or batch.get("items") or batch.get("results") or []
if not items and "batch" in batch:
    items = batch["batch"].get("content") or []

print(f"\nFound {len(items)} content item(s):")
out_dir = "assets/visuals/vibes_ai"
os.makedirs(out_dir, exist_ok=True)

for i, item in enumerate(items):
    item_id = item.get("id")
    print(f"Item {i+1}: ID={item_id}, Status={item.get('status')}")
    out_file = os.path.join(out_dir, f"test_vibes_clip_{i+1}.mp4")
    print(f"Downloading to {out_file}...")
    client.download_video(item_id, out_file)
    print(f"Downloaded successfully: {out_file} (Size: {os.path.getsize(out_file)} bytes)")
