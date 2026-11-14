# scripts/test_google_veo.py
import os
import sys

print("=== CHECKING GOOGLE GENAI / VEO SETUP ===")
gemini_key = os.environ.get("GEMINI_API_KEY")
google_key = os.environ.get("GOOGLE_API_KEY")

print(f"GEMINI_API_KEY present: {bool(gemini_key)} (Length: {len(gemini_key) if gemini_key else 0})")
print(f"GOOGLE_API_KEY present: {bool(google_key)} (Length: {len(google_key) if google_key else 0})")

try:
    from google import genai
    from google.genai import types

    # Initialize client
    client = genai.Client()
    print("genai.Client initialized successfully!")

    # List models to see what is available
    print("\nQuerying available models from Google...")
    pager = client.models.list()
    veo_models = []
    for m in pager:
        if "veo" in m.name.lower() or "video" in m.name.lower():
            veo_models.append(m.name)
            print(f"  - {m.name} (Display: {getattr(m, 'display_name', 'N/A')})")

    if not veo_models:
        print("No models with 'veo' or 'video' in name found directly in list. Showing first 10 models:")
        for m in list(client.models.list())[:10]:
            print(f"  - {m.name}")

except Exception as e:
    print(f"\n[ERROR] Failed to query Google GenAI: {e}")
    import traceback
    traceback.print_exc()
