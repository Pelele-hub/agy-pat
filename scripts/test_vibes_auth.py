# scripts/test_vibes_auth.py
import json
import os
from vibes_api import VibesClient, AspectRatio, Resolution

COOKIE_VALUE = "866eacb1-d6f5-458a-89ed-178199babf71.X0FvbQONcH27Ib9DLXskghBidKD-T0Uf5IfJJUKM8LQ"

print("Testing Vibes.ai connection with provided meta_session cookie...")

try:
    client = VibesClient(meta_session=COOKIE_VALUE)
    me = client.get_me()
    print("\n[SUCCESS] Successfully authenticated with Vibes.ai!")
    print(f"User Profile: {json.dumps(me, indent=2)}")

    projects = client.list_projects()
    print(f"\nProjects return type: {type(projects)}")
    if isinstance(projects, dict):
        print(f"Projects dict keys: {list(projects.keys())}")
        items = projects.get("projects") or projects.get("items") or projects.get("data") or []
        print(f"Found {len(items)} project items:")
        for p in items[:5]:
            print(f"  - [{p.get('id')}] {p.get('name')}")
    elif isinstance(projects, list):
        print(f"Found {len(projects)} project items:")
        for p in projects[:5]:
            print(f"  - [{p.get('id')}] {p.get('name')}")

    # Check AspectRatio options
    print("\nSupported Aspect Ratios:")
    for ar in AspectRatio:
        print(f"  - {ar.name}: {ar.value}")

    print("\nSupported Resolutions:")
    for r in Resolution:
        print(f"  - {r.name}: {r.value}")

except Exception as e:
    print(f"\n[ERROR] Authentication or connection failed: {e}")
    import traceback
    traceback.print_exc()
