import os

root = r"C:\Users\elric\omega-project\packages\sovereign-engine\src"
patterns = ["prompt-assembler-v2", "ollama-provider", "musical-engine", "anti-cliche-sweep", "signature-enforcement"]

for pattern in patterns:
    print(f"\n=== {pattern} ===")
    found = False
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist')]
        for f in files:
            if f.endswith('.ts'):
                fp = os.path.join(dirpath, f)
                with open(fp, 'r', encoding='utf-8', errors='ignore') as fh:
                    for i, line in enumerate(fh, 1):
                        if pattern in line and not line.strip().startswith('//'):
                            rel = os.path.relpath(fp, root)
                            print(f"  {rel}:{i}: {line.strip()[:100]}")
                            found = True
    if not found:
        print("  NO ACTIVE IMPORTS FOUND")
