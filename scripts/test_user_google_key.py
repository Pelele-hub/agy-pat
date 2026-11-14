# scripts/test_user_google_key.py
import os
from google import genai

NEW_KEY = os.getenv("GOOGLE_API_KEY", "")

print("Testing Google GenAI Client with provided API key...")

try:
    if not NEW_KEY:
        print("GOOGLE_API_KEY environment variable is not set. Skipping live test.")
        exit(0)

    client = genai.Client(api_key=NEW_KEY)
    print("Client initialized!")

    print("Testing generate_content with gemini-2.5-flash...")
    res = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say hello in 3 words"
    )
    print(f"[SUCCESS] Auth works! Response: {res.text.strip()}")

except Exception as e:
    print(f"[ERROR]: {e}")
    import traceback
    traceback.print_exc()
