#!/usr/bin/env python3
"""Relance r1_multiwindow sur les 12 oeuvres anciennement FILE_NOT_FOUND."""
import sys, time
sys.path.insert(0, ".")
from r1_multiwindow import process_work_r1
from v5_config import CATALOG_PDF

MISSING_TITLES = [
    "L'Etranger", "La Peste", "La Mort Heureuse", "L'Exil et le Royaume",
    "La Place", "La Femme Gelee", "Une Femme", "L'Evenement",
    "Ce qu'ils disent ou rien", "Dora Bruder", "La Danseuse", "L'Adversaire"
]

t0 = time.time()
ok, fail = 0, 0
for w in CATALOG_PDF:
    if w["title"] in MISSING_TITLES:
        print(f"\n>>> Processing: {w['author']} - {w['title']}")
        result = process_work_r1(w)
        if result and "gate_fail" not in result.get("meta", {}):
            ok += 1
            print(f"  OK ({result['protocol']['n_total_analyzed']} windows)")
        else:
            fail += 1
            gate = result.get("meta", {}).get("gate_fail", "UNKNOWN") if result else "NULL"
            print(f"  FAIL: {gate}")

elapsed = time.time() - t0
print(f"\n{'='*60}")
print(f"DONE: {ok} OK, {fail} FAIL, {elapsed:.0f}s total")
