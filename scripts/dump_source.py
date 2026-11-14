# scripts/dump_source.py
import vibes_api.client as c
import inspect

with open("vibes_client_source.py", "w", encoding="utf-8") as f:
    f.write(inspect.getsource(c.VibesClient.generate_video))
    f.write("\n\n# --- poll_batch ---\n\n")
    f.write(inspect.getsource(c.VibesClient.poll_batch))
print("Dumped source to vibes_client_source.py")
