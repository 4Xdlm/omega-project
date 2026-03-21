"""
OMEGA Phase R-4 — Audit des features par tier
Analyse discriminante de chaque feature sur les 571 œuvres classées.
"""
import json
import math
import os
from collections import defaultdict

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
OUT_JSON = os.path.join(ROOT, "omega-autopsie/results_phase_r/R4_FEATURE_AUDIT.json")
OUT_MD = os.path.join(ROOT, "omega-autopsie/results_phase_r/R4_FEATURE_AUDIT_REPORT.md")

os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)

# Load data
with open(MASTER, 'r', encoding='utf-8') as f:
    master = json.load(f)
with open(TIERS, 'r', encoding='utf-8') as f:
    tiers_data = json.load(f)

# Build tier lookup from V3
tier_lookup = {e['filename']: e['tier_suggestion'] for e in tiers_data}

# Map tier to numeric rank
TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}
TIER_ORDER = ['S', 'A', 'B', 'C', 'D']

# Group features by tier
tier_features = defaultdict(lambda: defaultdict(list))
for entry in master:
    fn = entry['filename']
    tier = entry.get('tier') or tier_lookup.get(fn, '?')
    if tier == '?' or tier not in TIER_RANK:
        continue
    for feat_name, feat_val in entry['features'].items():
        if isinstance(feat_val, (int, float)) and math.isfinite(feat_val):
            tier_features[feat_name][tier].append(feat_val)

# Stats helpers
def median(vals):
    s = sorted(vals)
    n = len(s)
    if n == 0: return 0.0
    if n % 2 == 1: return s[n // 2]
    return (s[n // 2 - 1] + s[n // 2]) / 2.0

def mean(vals):
    if not vals: return 0.0
    return sum(vals) / len(vals)

def stdev(vals):
    if len(vals) < 2: return 0.0
    m = mean(vals)
    return math.sqrt(sum((x - m) ** 2 for x in vals) / (len(vals) - 1))

def spearman_corr(x_vals, y_vals):
    """Spearman rank correlation between two lists."""
    n = len(x_vals)
    if n < 3: return 0.0

    def rank_data(data):
        indexed = sorted(enumerate(data), key=lambda t: t[1])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and indexed[j + 1][1] == indexed[j][1]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                ranks[indexed[k][0]] = avg_rank
            i = j + 1
        return ranks

    rx = rank_data(x_vals)
    ry = rank_data(y_vals)

    d_sq = sum((rx[i] - ry[i]) ** 2 for i in range(n))
    return 1.0 - (6.0 * d_sq) / (n * (n * n - 1))

# Analyze each feature
all_feature_names = sorted(tier_features.keys())
results = []

for feat_name in all_feature_names:
    by_tier = tier_features[feat_name]

    # Per-tier stats
    tier_stats = {}
    for t in TIER_ORDER:
        vals = by_tier.get(t, [])
        tier_stats[t] = {
            'mean': round(mean(vals), 6),
            'median': round(median(vals), 6),
            'stdev': round(stdev(vals), 6),
            'count': len(vals),
        }

    # Means in order S -> D
    means = [tier_stats[t]['mean'] for t in TIER_ORDER]
    medians = [tier_stats[t]['median'] for t in TIER_ORDER]

    # Monotonicity test (on means)
    decreasing = all(means[i] >= means[i + 1] for i in range(4))  # S >= A >= B >= C >= D
    increasing = all(means[i] <= means[i + 1] for i in range(4))  # S <= A <= B <= C <= D
    monotone = decreasing or increasing
    monotone_dir = 'DESC' if decreasing else ('ASC' if increasing else 'NONE')

    # Spearman correlation: feature value vs tier rank
    all_vals = []
    all_ranks = []
    for t in TIER_ORDER:
        vals = by_tier.get(t, [])
        rank = TIER_RANK[t]
        for v in vals:
            all_vals.append(v)
            all_ranks.append(rank)

    rho = round(spearman_corr(all_vals, all_ranks), 4) if len(all_vals) >= 5 else 0.0

    # Inversion rate: how often D beats S
    s_vals = by_tier.get('S', [])
    d_vals = by_tier.get('D', [])
    s_mean = mean(s_vals)
    d_mean = mean(d_vals)
    c_mean = mean(by_tier.get('C', []))

    # Count how many D values exceed S median
    s_med = median(s_vals)
    inversions = sum(1 for v in d_vals if v > s_med) if d_vals else 0
    inversion_rate = round(inversions / len(d_vals), 4) if d_vals else 0.0

    # Classification
    abs_rho = abs(rho)
    if abs_rho >= 0.3 and monotone:
        category = 'DISCRIMINANTE'
    elif (d_mean > s_mean and rho < -0.1) or (c_mean > s_mean and rho < -0.1):
        category = 'TROMPEUSE'
    elif abs_rho >= 0.15 and not monotone:
        # Check if S is extreme
        s_is_max = s_mean >= max(means)
        s_is_min = s_mean <= min(means)
        if s_is_max or s_is_min:
            category = 'NON-LINEAIRE'
        else:
            category = 'NEUTRE'
    elif abs_rho < 0.15:
        category = 'NEUTRE'
    else:
        # Moderate correlation but not monotone
        if (d_mean > s_mean) or (c_mean > s_mean):
            category = 'TROMPEUSE'
        else:
            category = 'NON-LINEAIRE'

    results.append({
        'feature': feat_name,
        'category': category,
        'spearman_rho': rho,
        'abs_rho': abs_rho,
        'monotone': monotone,
        'monotone_dir': monotone_dir,
        'inversion_rate_d_vs_s': inversion_rate,
        'tier_stats': tier_stats,
        'means_S_to_D': means,
        'medians_S_to_D': medians,
        's_mean': round(s_mean, 6),
        'd_mean': round(d_mean, 6),
        'delta_s_d': round(s_mean - d_mean, 6),
    })

# Sort: DISCRIMINANTE first (by abs_rho desc), then TROMPEUSE, then rest
cat_order = {'DISCRIMINANTE': 0, 'TROMPEUSE': 1, 'NON-LINEAIRE': 2, 'NEUTRE': 3}
results.sort(key=lambda r: (cat_order.get(r['category'], 9), -r['abs_rho']))

# Save JSON
with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

# Category counts
cat_counts = defaultdict(int)
for r in results:
    cat_counts[r['category']] += 1

# Generate report
lines = []
lines.append("# OMEGA Phase R-4 — Feature Audit Report")
lines.append(f"**Date**: 2026-03-21")
lines.append(f"**Corpus**: 571 oeuvres | S={tier_stats['S']['count'] if 'S' in tier_stats else '?'}, A={tier_stats['A']['count'] if 'A' in tier_stats else '?'}, B={tier_stats['B']['count'] if 'B' in tier_stats else '?'}, C={tier_stats['C']['count'] if 'C' in tier_stats else '?'}, D={tier_stats['D']['count'] if 'D' in tier_stats else '?'}")
lines.append(f"**Features analysées**: {len(results)}")
lines.append("")
lines.append("## Classification Summary")
lines.append("")
lines.append("| Catégorie | Count | Description |")
lines.append("|-----------|-------|-------------|")
lines.append(f"| DISCRIMINANTE | {cat_counts['DISCRIMINANTE']} | Spearman > 0.3, monotone |")
lines.append(f"| TROMPEUSE | {cat_counts['TROMPEUSE']} | D ou C > S (corrélation négative) |")
lines.append(f"| NON-LINEAIRE | {cat_counts['NON-LINEAIRE']} | S est extrême mais pas monotone |")
lines.append(f"| NEUTRE | {cat_counts['NEUTRE']} | Pas de pattern clair |")
lines.append("")

# Top 10 discriminantes
disc = [r for r in results if r['category'] == 'DISCRIMINANTE']
lines.append("## TOP 10 Features DISCRIMINANTES")
lines.append("")
lines.append("| # | Feature | Spearman ρ | Dir | S mean | A mean | B mean | C mean | D mean | Δ(S-D) |")
lines.append("|---|---------|-----------|-----|--------|--------|--------|--------|--------|--------|")
for i, r in enumerate(disc[:10], 1):
    m = r['means_S_to_D']
    lines.append(f"| {i} | `{r['feature']}` | {r['spearman_rho']:+.4f} | {r['monotone_dir']} | {m[0]:.4f} | {m[1]:.4f} | {m[2]:.4f} | {m[3]:.4f} | {m[4]:.4f} | {r['delta_s_d']:+.4f} |")
lines.append("")

# Top 10 trompeuses
tromp = [r for r in results if r['category'] == 'TROMPEUSE']
lines.append("## TOP 10 Features TROMPEUSES")
lines.append("")
lines.append("| # | Feature | Spearman ρ | S mean | D mean | C mean | Inversion D>S |")
lines.append("|---|---------|-----------|--------|--------|--------|---------------|")
for i, r in enumerate(tromp[:10], 1):
    m = r['means_S_to_D']
    lines.append(f"| {i} | `{r['feature']}` | {r['spearman_rho']:+.4f} | {m[0]:.4f} | {m[4]:.4f} | {m[3]:.4f} | {r['inversion_rate_d_vs_s']:.0%} |")
lines.append("")

# Non-lineaires
nonlin = [r for r in results if r['category'] == 'NON-LINEAIRE']
lines.append("## Features NON-LINEAIRES")
lines.append("")
lines.append("| Feature | Spearman ρ | S mean | A mean | B mean | C mean | D mean |")
lines.append("|---------|-----------|--------|--------|--------|--------|--------|")
for r in nonlin:
    m = r['means_S_to_D']
    lines.append(f"| `{r['feature']}` | {r['spearman_rho']:+.4f} | {m[0]:.4f} | {m[1]:.4f} | {m[2]:.4f} | {m[3]:.4f} | {m[4]:.4f} |")
lines.append("")

# Full table
lines.append("## Table Complète (toutes features)")
lines.append("")
lines.append("| Feature | Cat. | ρ | S | A | B | C | D |")
lines.append("|---------|------|-----|-----|-----|-----|-----|-----|")
for r in results:
    m = r['means_S_to_D']
    cat_short = r['category'][:4]
    lines.append(f"| `{r['feature']}` | {cat_short} | {r['spearman_rho']:+.3f} | {m[0]:.3f} | {m[1]:.3f} | {m[2]:.3f} | {m[3]:.3f} | {m[4]:.3f} |")

report = '\n'.join(lines)
with open(OUT_MD, 'w', encoding='utf-8') as f:
    f.write(report)

# Console output
print("=" * 70)
print(f"  R-4 FEATURE AUDIT — {len(results)} features analysées")
print("=" * 70)
print(f"\n  DISCRIMINANTE: {cat_counts['DISCRIMINANTE']}")
print(f"  TROMPEUSE:     {cat_counts['TROMPEUSE']}")
print(f"  NON-LINEAIRE:  {cat_counts['NON-LINEAIRE']}")
print(f"  NEUTRE:        {cat_counts['NEUTRE']}")

print(f"\n  TOP 10 DISCRIMINANTES (Spearman desc):")
print(f"  {'Feature':<45} {'rho':>8}  {'S':>8}  {'D':>8}  {'D(S-D)':>8}")
print(f"  {'-'*45} {'-'*8}  {'-'*8}  {'-'*8}  {'-'*8}")
for r in disc[:10]:
    print(f"  {r['feature']:<45} {r['spearman_rho']:>+8.4f}  {r['s_mean']:>8.4f}  {r['d_mean']:>8.4f}  {r['delta_s_d']:>+8.4f}")

print(f"\n  TOP 10 TROMPEUSES (D ou C > S):")
print(f"  {'Feature':<45} {'rho':>8}  {'S':>8}  {'D':>8}  {'Inv%':>6}")
print(f"  {'-'*45} {'-'*8}  {'-'*8}  {'-'*8}  {'-'*6}")
for r in tromp[:10]:
    print(f"  {r['feature']:<45} {r['spearman_rho']:>+8.4f}  {r['s_mean']:>8.4f}  {r['d_mean']:>8.4f}  {r['inversion_rate_d_vs_s']:>5.0%}")

print(f"\n  Sauvé: {OUT_JSON}")
print(f"  Sauvé: {OUT_MD}")
print("=" * 70)
