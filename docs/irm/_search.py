import os
import re

root = r"C:\Users\elric\omega-project\packages\sovereign-engine\src"
pattern = "s-score"

for dirpath, dirs, files in os.walk(root):
    dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist')]
    for f in files:
        if f.endswith('.ts'):
            fp = os.path.join(dirpath, f)
            with open(fp, 'r', encoding='utf-8', errors='ignore') as fh:
                for i, line in enumerate(fh, 1):
                    if pattern in line:
                        rel = os.path.relpath(fp, root)
                        print(f"{rel}:{i}: {line.strip()}")
