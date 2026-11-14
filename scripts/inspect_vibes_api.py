# scripts/inspect_vibes_api.py
import vibes_api
import inspect

print("=== VIBES API INSPECTION ===")
for name in dir(vibes_api):
    if not name.startswith("_"):
        val = getattr(vibes_api, name)
        print(f"{name}: {type(val)}")

from vibes_api import VibesClient

print("\nVibesClient methods:")
for m in dir(VibesClient):
    if not m.startswith("_"):
        print(f"  - {m}")
