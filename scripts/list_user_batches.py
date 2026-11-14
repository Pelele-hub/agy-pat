# scripts/list_user_batches.py
from vibes_api import VibesClient
import json

COOKIE = "866eacb1-d6f5-458a-89ed-178199babf71.X0FvbQONcH27Ib9DLXskghBidKD-T0Uf5IfJJUKM8LQ"
client = VibesClient(meta_session=COOKIE)
res = client.list_batches(limit=10)

batches = res if isinstance(res, list) else res.get("batches") or res.get("items") or []
print(f"Found {len(batches)} batches:")
for b in batches:
    b_id = b.get("id")
    complete = b.get("isComplete")
    content = b.get("content") or []
    v_url = content[0].get("videoUrl") if content else None
    prompt = b.get("prompt", "")[:45]
    print(f"Batch: {b_id} | Complete: {complete} | VideoURL: {bool(v_url)} | Prompt: {prompt}")
    if v_url:
        print(f"  URL: {v_url[:80]}...")
