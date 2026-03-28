#!/usr/bin/env python3
"""
OMEGA — ANALYSE PHASE B — Contrat comportemental final
Consolide 95 runs API en lois emergentes
"""
import json, os, math
from collections import defaultdict
import numpy as np

BASE = "C:/Users/elric/omega-project"
PB_DIR = f"{BASE}/packages/sovereign-engine/sessions/CLAUDE_BLACKBOX_PHASE_B"
OUT_DIR = f"{BASE}/sessions/CLAUDE_BLACKBOX"

def load(name):
    with open(f"{PB_DIR}/{name}", encoding='utf-8') as f:
        return json.load(f)

def stats(vals):
    if not vals: return None
    a = np.array(vals, dtype=float)
    return {'n': len(a), 'mean': round(float(np.mean(a)), 3), 'std': round(float(np.std(a, ddof=1)), 3),
            'min': round(float(np.min(a)), 3), 'max': round(float(np.max(a)), 3),
            'cv': round(float(np.std(a, ddof=1) / np.mean(a)), 3) if np.mean(a) != 0 else 0}

print("=" * 80)
print("OMEGA — ANALYSE PHASE B")
print("=" * 80)

# ============================================================
# B1 — BASELINE
# ============================================================
print("\n=== B1 — BASELINE (30 runs, 10 scenes) ===")
b1 = [r for r in load('B1_BASELINE.json') if 'error' not in r]
print(f"  Runs OK: {len(b1)}")

# Baseline global
feats_keys = ['mean_sent_len', 'cv_sent', 'f26b_long_sent_rate', 'f17_knife_count',
              'knife_rate', 'ratio_alt', 'semicolon_count', 'dash_count', 'colon_count',
              'excl_count', 'quest_count', 'ellipsis_count']
print(f"\n  {'Feature':<25} {'Mean':>8} {'Std':>8} {'Min':>8} {'Max':>8} {'CV':>6}")
print("  " + "-" * 65)
baseline_stats = {}
for fk in feats_keys:
    vals = [r['features'][fk] for r in b1 if fk in r.get('features', {})]
    s = stats(vals)
    if s:
        baseline_stats[fk] = s
        print(f"  {fk:<25} {s['mean']:>8.3f} {s['std']:>8.3f} {s['min']:>8.3f} {s['max']:>8.3f} {s['cv']:>6.3f}")

# Composite stats
comp_vals = [r['composite'] for r in b1]
comp_s = stats(comp_vals)
print(f"\n  Composite: mean={comp_s['mean']:.1f} std={comp_s['std']:.1f} [{comp_s['min']:.1f} - {comp_s['max']:.1f}]")

# Per scene
print(f"\n  {'Scene':<18} {'n':>3} {'Comp':>6} {'Words':>6} {'mean_sl':>8} {'cv':>6} {';':>4} {'--':>4} {'f17':>4}")
print("  " + "-" * 65)
scenes = sorted(set(r['scene'] for r in b1))
scene_stats = {}
for sc in scenes:
    runs = [r for r in b1 if r['scene'] == sc]
    cs = stats([r['composite'] for r in runs])
    ws = stats([r['words'] for r in runs])
    ms = stats([r['features']['mean_sent_len'] for r in runs])
    cvs = stats([r['features']['cv_sent'] for r in runs])
    scs = stats([r['features']['semicolon_count'] for r in runs])
    ds = stats([r['features']['dash_count'] for r in runs])
    f17s = stats([r['features']['f17_knife_count'] for r in runs])
    scene_stats[sc] = {'comp': cs, 'words': ws, 'mean_sl': ms, 'cv': cvs, 'semi': scs, 'dash': ds, 'f17': f17s}
    print(f"  {sc:<18} {len(runs):>3} {cs['mean']:>6.1f} {ws['mean']:>6.0f} {ms['mean']:>8.1f} {cvs['mean']:>6.3f} {scs['mean']:>4.1f} {ds['mean']:>4.1f} {f17s['mean']:>4.1f}")

# ============================================================
# B2 — GRADIENT SEMICOLONS
# ============================================================
print("\n=== B2 — GRADIENT SEMICOLONS (15 runs, 5 niveaux) ===")
b2 = [r for r in load('B2_GRADIENT_SEMICOLONS.json') if 'error' not in r]
print(f"  Runs OK: {len(b2)}")

print(f"\n  {'Level':>5} {'n':>3} {';_mean':>7} {';_max':>6} {'Comp':>6} {'mean_sl':>8}")
print("  " + "-" * 45)
semi_gradient = {}
for lvl in range(5):
    runs = [r for r in b2 if r['level'] == lvl]
    semi = [r['features']['semicolon_count'] for r in runs]
    comp = [r['composite'] for r in runs]
    msl = [r['features']['mean_sent_len'] for r in runs]
    semi_gradient[lvl] = {'semi': stats(semi), 'comp': stats(comp), 'msl': stats(msl)}
    s = stats(semi)
    c = stats(comp)
    m = stats(msl)
    print(f"  {lvl:>5} {len(runs):>3} {s['mean']:>7.1f} {s['max']:>6.0f} {c['mean']:>6.1f} {m['mean']:>8.1f}")

# ============================================================
# B3 — GRADIENT SENTLEN
# ============================================================
print("\n=== B3 — GRADIENT MEAN_SENT_LEN (15 runs, 5 targets) ===")
b3 = [r for r in load('B3_GRADIENT_SENTLEN.json') if 'error' not in r]
print(f"  Runs OK: {len(b3)}")

print(f"\n  {'Target':>6} {'n':>3} {'Produced':>8} {'Factor':>7} {'Comp':>6} {'CV':>6}")
print("  " + "-" * 45)
sentlen_gradient = {}
for entry in b3:
    t = entry.get('target', 0)
    if t not in sentlen_gradient:
        sentlen_gradient[t] = {'produced': [], 'comp': [], 'cv': []}
    sentlen_gradient[t]['produced'].append(entry['features']['mean_sent_len'])
    sentlen_gradient[t]['comp'].append(entry['composite'])
    sentlen_gradient[t]['cv'].append(entry['features']['cv_sent'])

for t in sorted(sentlen_gradient.keys()):
    d = sentlen_gradient[t]
    ps = stats(d['produced'])
    cs = stats(d['comp'])
    cvs = stats(d['cv'])
    factor = ps['mean'] / t if t > 0 else 0
    print(f"  {t:>6} {ps['n']:>3} {ps['mean']:>8.1f} {factor:>7.2f}x {cs['mean']:>6.1f} {cvs['mean']:>6.3f}")

# ============================================================
# B4 — CONFLICTS
# ============================================================
print("\n=== B4 — CONFLITS (15 runs, 5 paires) ===")
b4 = [r for r in load('B4_CONFLICTS.json') if 'error' not in r]
print(f"  Runs OK: {len(b4)}")

print(f"\n  {'Conflict':<25} {'n':>3} {'Comp':>6} {'mean':>6} {'f17':>4} {';':>4} {'cv':>6}")
print("  " + "-" * 60)
conflict_results = {}
for cid in sorted(set(r['conflict'] for r in b4)):
    runs = [r for r in b4 if r['conflict'] == cid]
    cs = stats([r['composite'] for r in runs])
    ms = stats([r['features']['mean_sent_len'] for r in runs])
    f17s = stats([r['features']['f17_knife_count'] for r in runs])
    scs = stats([r['features']['semicolon_count'] for r in runs])
    cvs = stats([r['features']['cv_sent'] for r in runs])
    conflict_results[cid] = {'comp': cs, 'mean': ms, 'f17': f17s, 'semi': scs, 'cv': cvs}
    print(f"  {cid:<25} {len(runs):>3} {cs['mean']:>6.1f} {ms['mean']:>6.1f} {f17s['mean']:>4.1f} {scs['mean']:>4.1f} {cvs['mean']:>6.3f}")

# Compare with baseline
base_comp = stats([r['composite'] for r in b1])['mean']
base_mean = baseline_stats['mean_sent_len']['mean']
print(f"\n  Baseline ref: comp={base_comp:.1f} mean_sl={base_mean:.1f}")
for cid, cr in conflict_results.items():
    delta_comp = cr['comp']['mean'] - base_comp
    print(f"  {cid:<25} delta_comp={delta_comp:>+5.1f}")

# ============================================================
# B5 — STABILITY
# ============================================================
print("\n=== B5 — STABILITE (20 runs, 2 prompts x 10) ===")
b5 = [r for r in load('B5_STABILITY.json') if 'error' not in r]
print(f"  Runs OK: {len(b5)}")

for sc in ['contemplation', 'menace']:
    runs = [r for r in b5 if r['scene'] == sc]
    if not runs:
        continue
    print(f"\n  {sc} ({len(runs)} runs):")
    for fk in ['composite', 'words']:
        vals = [r[fk] for r in runs]
        s = stats(vals)
        print(f"    {fk:<20} mean={s['mean']:>8.1f} std={s['std']:>6.1f} cv={s['cv']:.3f} [{s['min']:.1f} - {s['max']:.1f}]")
    for fk in ['mean_sent_len', 'cv_sent', 'f17_knife_count', 'semicolon_count', 'dash_count', 'ratio_alt']:
        vals = [r['features'][fk] for r in runs]
        s = stats(vals)
        print(f"    {fk:<20} mean={s['mean']:>8.3f} std={s['std']:>6.3f} cv={s['cv']:.3f} [{s['min']:.3f} - {s['max']:.3f}]")

# ============================================================
# SAVE ANALYSIS
# ============================================================
analysis = {
    'generated': '2026-03-28',
    'total_runs': 95,
    'runs_ok': len(b1) + len(b2) + len(b3) + len(b4) + len(b5),
    'B1_baseline': {'n': len(b1), 'global_stats': baseline_stats, 'per_scene': {
        sc: {k: v for k, v in d.items()} for sc, d in scene_stats.items()
    }, 'composite': stats([r['composite'] for r in b1])},
    'B2_semicolons': {'n': len(b2), 'gradient': {str(k): v for k, v in semi_gradient.items()}},
    'B3_sentlen': {'n': len(b3), 'gradient': {str(k): {
        'produced': stats(v['produced']), 'comp': stats(v['comp']), 'cv': stats(v['cv'])
    } for k, v in sentlen_gradient.items()}},
    'B4_conflicts': {'n': len(b4), 'results': {k: v for k, v in conflict_results.items()}},
    'B5_stability': {'n': len(b5)},
}

with open(f"{OUT_DIR}/PHASE_B_ANALYSIS.json", 'w', encoding='utf-8') as f:
    json.dump(analysis, f, indent=2, ensure_ascii=False)
print(f"\nSaved: {OUT_DIR}/PHASE_B_ANALYSIS.json")

print(f"\n{'='*80}")
print("ANALYSE PHASE B COMPLETE")
print(f"{'='*80}")
