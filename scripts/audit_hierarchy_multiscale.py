#!/usr/bin/env python3
"""
OMEGA — AUDIT HIERARCHIQUE MULTI-ECHELLE DES FEATURES
Mode: CALC PUR — 0 API
Source: MASTER_RAW_WINDOWS.csv
Question: semicolon_count domine a 500w — domine-t-il a toutes les echelles?
"""
import csv, json, os, sys, time, math
from collections import defaultdict
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import cross_val_score

BASE = "C:/Users/elric/omega-project"
CSV_PATH = f"{BASE}/src/scoring/data/MASTER_RAW_WINDOWS.csv"
OUT_DIR = f"{BASE}/sessions/HIERARCHY_AUDIT"
os.makedirs(OUT_DIR, exist_ok=True)

TIER_MAP = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
META_COLS = {'filename', 'tier', 'lang', 'chapter_idx', 'window_size',
             'window_type', 'window_start', 'window_end', 'p_rel'}
SIZES = [200, 500, 1000, 2000, 'full']

print("=" * 80)
print("OMEGA — AUDIT HIERARCHIQUE MULTI-ECHELLE")
print("=" * 80)

# ============================================================
# LOAD ALL FR S/A/B/C WINDOWS (all sizes)
# ============================================================
print("\n[LOAD] Reading CSV (FR, S/A/B/C, all sizes)...")
t0 = time.time()

rows_by_size = defaultdict(list)
feature_cols = None

with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.DictReader(f)
    all_cols = reader.fieldnames

    for row in reader:
        if row['lang'] != 'fr':
            continue
        if row['tier'] not in TIER_MAP:
            continue

        ws = row['window_size']
        # Map to our size categories
        if ws == 'full':
            rows_by_size['full'].append(row)
        else:
            try:
                ws_int = int(ws)
                if ws_int in [200, 500, 1000, 2000]:
                    rows_by_size[ws_int].append(row)
            except ValueError:
                pass

# Determine feature columns from first row
sample_row = None
for sz in SIZES:
    if rows_by_size[sz]:
        sample_row = rows_by_size[sz][0]
        break

feature_cols = []
for col in all_cols:
    if col in META_COLS:
        continue
    try:
        float(sample_row[col])
        feature_cols.append(col)
    except (ValueError, KeyError, TypeError):
        pass

print(f"  Loaded in {time.time()-t0:.1f}s")
print(f"  Feature columns: {len(feature_cols)}")
for sz in SIZES:
    print(f"  {str(sz):>6}: {len(rows_by_size[sz]):>8} windows")

# ============================================================
# RUN ANALYSIS PER SIZE
# ============================================================
results_by_size = {}

for size in SIZES:
    size_label = str(size)
    rows = rows_by_size[size]
    n = len(rows)

    print(f"\n{'=' * 60}")
    print(f"  TAILLE : {size_label}w ({n} windows)")
    print(f"{'=' * 60}")

    if n < 500:
        print(f"  SKIP: too few ({n})")
        continue

    # Build numpy arrays
    X = np.zeros((n, len(feature_cols)), dtype=np.float64)
    y = np.zeros(n, dtype=np.float64)
    tier_dist = defaultdict(int)

    for i, row in enumerate(rows):
        y[i] = TIER_MAP[row['tier']]
        tier_dist[row['tier']] += 1
        for j, col in enumerate(feature_cols):
            try:
                v = float(row[col])
                if math.isfinite(v):
                    X[i, j] = v
            except (ValueError, KeyError):
                pass

    print(f"  Tiers: {dict(tier_dist)}")

    # Random Forest
    rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)

    # Cross-validation
    cv = cross_val_score(rf, X, y, cv=5, scoring='r2', n_jobs=-1)
    r2_mean = float(cv.mean())
    r2_std = float(cv.std())
    print(f"  R2 CV: {r2_mean:.3f} +/- {r2_std:.3f}")

    # Full fit for MDI
    rf.fit(X, y)
    mdi = list(zip(feature_cols, rf.feature_importances_))
    mdi.sort(key=lambda x: -x[1])

    # Permutation importance (subsample)
    sample_n = min(100000, n)
    np.random.seed(42)
    idx = np.random.choice(n, sample_n, replace=False)
    X_s, y_s = X[idx], y[idx]

    rf_s = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    rf_s.fit(X_s, y_s)

    perm = permutation_importance(rf_s, X_s, y_s, n_repeats=10, random_state=42, n_jobs=-1)
    perm_list = list(zip(feature_cols, perm.importances_mean, perm.importances_std))
    perm_list.sort(key=lambda x: -x[1])

    # Print top 15
    print(f"\n  {'Rang':>4} {'Feature':<30} {'Perm':>10} {'+-':>8}")
    print(f"  {'-'*4} {'-'*30} {'-'*10} {'-'*8}")
    for rank, (feat, imp, std) in enumerate(perm_list[:15], 1):
        print(f"  {rank:4d} {feat:<30} {imp:10.4f} {std:8.4f}")

    results_by_size[size_label] = {
        'n_windows': n,
        'tier_distribution': dict(tier_dist),
        'r2_cv_mean': round(r2_mean, 4),
        'r2_cv_std': round(r2_std, 4),
        'top15_permutation': [
            {'rank': i+1, 'feature': feat, 'importance': round(float(imp), 6), 'std': round(float(std), 6)}
            for i, (feat, imp, std) in enumerate(perm_list[:15])
        ],
        'full_permutation': {
            feat: round(float(imp), 6) for feat, imp, _ in perm_list
        },
    }

# ============================================================
# COMPARATIVE TABLE
# ============================================================
print(f"\n{'=' * 80}")
print("  TABLEAU COMPARATIF : TOP 5 PAR TAILLE")
print(f"{'=' * 80}")

available = [str(s) for s in SIZES if str(s) in results_by_size]

print(f"\n{'Rang':>4}", end="")
for sl in available:
    print(f" | {sl+'w':>22}", end="")
print()
print("-" * (4 + 25 * len(available)))

for rank in range(1, 6):
    print(f"{rank:4d}", end="")
    for sl in available:
        top = results_by_size[sl]['top15_permutation']
        if rank <= len(top):
            feat = top[rank-1]['feature'][:16]
            imp = top[rank-1]['importance']
            print(f" | {feat:>14} {imp:.3f}", end="")
        else:
            print(f" | {'N/A':>14} {'':>5}", end="")
    print()

# R2 comparison
print(f"\n{'R2':>4}", end="")
for sl in available:
    r2 = results_by_size[sl]['r2_cv_mean']
    print(f" | {r2:>20.3f}", end="")
print()

# ============================================================
# RANK CHANGES
# ============================================================
print(f"\n{'=' * 80}")
print("  FEATURES QUI CHANGENT DE RANG AVEC LA TAILLE")
print(f"{'=' * 80}")

feature_ranks = {}
for sl, data in results_by_size.items():
    for entry in data['top15_permutation']:
        feat = entry['feature']
        if feat not in feature_ranks:
            feature_ranks[feat] = {}
        feature_ranks[feat][sl] = entry['rank']

# Sort by max delta
ranked = []
for feat, ranks in feature_ranks.items():
    if len(ranks) >= 2:
        delta = max(ranks.values()) - min(ranks.values())
        ranked.append((feat, delta, ranks))
ranked.sort(key=lambda x: -x[1])

for feat, delta, ranks in ranked[:12]:
    rank_str = ", ".join([f"{s}:#{r}" for s, r in sorted(ranks.items())])
    print(f"  {feat:<30} delta={delta:>2} — {rank_str}")

# ============================================================
# SAVE
# ============================================================
with open(f"{OUT_DIR}/MULTISCALE_IMPORTANCE.json", 'w', encoding='utf-8') as f:
    json.dump(results_by_size, f, indent=2, ensure_ascii=False)
print(f"\nSaved: {OUT_DIR}/MULTISCALE_IMPORTANCE.json")

# Generate report
lines = [
    "# OMEGA — AUDIT HIERARCHIQUE MULTI-ECHELLE",
    "**Date** : 2026-03-27",
    "**Mode** : CALC PUR — 0 API — FR-only, Tier S/A/B/C",
    "",
    "## Question centrale",
    "semicolon_count domine a 500w (importance 0.42). Est-ce vrai a toutes les echelles ?",
    "",
]

for sl in available:
    data = results_by_size[sl]
    lines.append(f"## Taille : {sl}w")
    lines.append(f"- Fenetres : {data['n_windows']}")
    lines.append(f"- R2 CV : {data['r2_cv_mean']:.3f} +/- {data['r2_cv_std']:.3f}")
    lines.append("")
    lines.append("| Rang | Feature | Importance |")
    lines.append("|------|---------|-----------|")
    for e in data['top15_permutation']:
        lines.append(f"| {e['rank']} | {e['feature']} | {e['importance']:.4f} |")
    lines.append("")

lines.append("## Comparatif Top 5")
lines.append("")
header = "| Rang |"
for sl in available:
    header += f" {sl}w |"
lines.append(header)
lines.append("|------|" + "------|" * len(available))
for rank in range(1, 6):
    row = f"| {rank} |"
    for sl in available:
        top = results_by_size[sl]['top15_permutation']
        if rank <= len(top):
            row += f" {top[rank-1]['feature']} ({top[rank-1]['importance']:.3f}) |"
        else:
            row += " N/A |"
    lines.append(row)

with open(f"{BASE}/docs/OMEGA_FEATURE_HIERARCHY_BY_SCALE.md", 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f"Saved: docs/OMEGA_FEATURE_HIERARCHY_BY_SCALE.md")

print(f"\n{'=' * 80}")
print("AUDIT HIERARCHIQUE COMPLETE")
print(f"{'=' * 80}")
