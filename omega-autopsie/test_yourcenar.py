import sys; sys.path.insert(0, '.')
from full_work_analyzer_v4 import process_work, CATALOG_PDF
targets = [w for w in CATALOG_PDF if w['author'] == 'yourcenar']
for w in targets:
    print(f"--- {w['title']} ---")
    r = process_work(w)
    meta = r.get('meta', {}) if r else {}
    print(f"  gate_fail={meta.get('gate_fail','OK')!r}  words={meta.get('word_count',0)}")
