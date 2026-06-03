import json, statistics, sys
rows = [json.loads(l) for l in open(sys.argv[1], encoding="utf-8")]
cells = ["MASTER_NATIVE_FR","MASTER_NATIVE_EN","D_SOURCE_REAL_FR","C_FORMULAIC_FR","C_FORMULAIC_EN"]
for cell in cells:
    cr = [r for r in rows if r["cell"] == cell]
    auth = sorted(set(r["canonical_author"] for r in cr))
    print(f"### {cell} (n={len(cr)}) — {len(auth)} auteurs")
    print("   " + ", ".join(auth))
print()
print("### word_count (sanity) ###")
for cell in cells:
    wc = sorted(int(r["total_words"]) for r in rows if r["cell"] == cell)
    print(f"  {cell}: min={wc[0]} med={int(statistics.median(wc))} max={wc[-1]}")
