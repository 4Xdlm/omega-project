#!/usr/bin/env python3
"""
OMEGA — PROTOCOLE ANGOSTURA : AUDIT D'INFLUENCE CAUSALE DES 40 FEATURES
Mode: CALC PUR — 0 API
Source: MASTER_RAW_WINDOWS.csv (1.38M fenetres)
Focus: 500w, FR, Tier S/A/B/C
"""
import csv, json, os, sys, time, math
from collections import defaultdict
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LinearRegression

BASE = "C:/Users/elric/omega-project"
CSV_PATH = f"{BASE}/src/scoring/data/MASTER_RAW_WINDOWS.csv"
OUT_DIR = f"{BASE}/sessions/ANGOSTURA_AUDIT"
os.makedirs(OUT_DIR, exist_ok=True)

TIER_MAP = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
STABLE_FEATURES = ['f29d_ttr_score', 'f16a_bigram_rarity', 'cv_sent',
                    'f19a_approx_entropy', 'f35c_hook_score', 'f36c_cliff_score']

META_COLS = {'filename', 'tier', 'lang', 'chapter_idx', 'window_size',
             'window_type', 'window_start', 'window_end', 'p_rel'}

print("=" * 80)
print("OMEGA — PROTOCOLE ANGOSTURA")
print("=" * 80)

# ============================================================
# LOAD DATA: 500w, FR, Tier S/A/B/C
# ============================================================
print("\n[LOAD] Reading MASTER_RAW_WINDOWS.csv (500w, FR, S/A/B/C)...")
t0 = time.time()

rows = []
feature_cols = None
with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.DictReader(f)
    all_cols = reader.fieldnames
    feature_cols_candidates = [c for c in all_cols if c not in META_COLS]

    for row in reader:
        if row['window_size'] != '500':
            continue
        if row['lang'] != 'fr':
            continue
        if row['tier'] not in TIER_MAP:
            continue
        rows.append(row)

# Determine numeric feature columns
feature_cols = []
for col in feature_cols_candidates:
    try:
        float(rows[0][col])
        feature_cols.append(col)
    except (ValueError, KeyError):
        pass

print(f"  Loaded: {len(rows)} windows in {time.time()-t0:.1f}s")
print(f"  Feature columns: {len(feature_cols)}")

# Build numpy arrays
n = len(rows)
X = np.zeros((n, len(feature_cols)), dtype=np.float64)
y = np.zeros(n, dtype=np.float64)
tiers = []

for i, row in enumerate(rows):
    y[i] = TIER_MAP[row['tier']]
    tiers.append(row['tier'])
    for j, col in enumerate(feature_cols):
        try:
            v = float(row[col])
            if math.isfinite(v):
                X[i, j] = v
        except (ValueError, KeyError):
            pass

print(f"  X shape: {X.shape}, y shape: {y.shape}")
tier_dist = defaultdict(int)
for t in tiers:
    tier_dist[t] += 1
print(f"  Tier distribution: {dict(tier_dist)}")

# ============================================================
# NIVEAU 1 — FEATURE IMPORTANCE
# ============================================================
print("\n" + "=" * 80)
print("NIVEAU 1 — FEATURE IMPORTANCE")
print("=" * 80)

# 1c. Random Forest
print("\n[RF] Training Random Forest (200 trees, max_depth=10)...")
t0 = time.time()
rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
rf.fit(X, y)
print(f"  Trained in {time.time()-t0:.1f}s")

# MDI importance
mdi_imp = list(zip(feature_cols, rf.feature_importances_))
mdi_imp.sort(key=lambda x: -x[1])

print(f"\n{'Feature':<35} {'MDI':>8} {'Type':>10}")
print("-" * 60)
for feat, imp in mdi_imp[:20]:
    ftype = "STABLE" if feat in STABLE_FEATURES else "INSTABLE"
    print(f"  {feat:<33} {imp:>7.4f}  [{ftype}]")

# Cross-validation
print("\n[CV] 5-fold cross-validation...")
cv_scores = cross_val_score(rf, X, y, cv=5, scoring='r2', n_jobs=-1)
print(f"  R² = {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

# 1d. Permutation importance (subsample for speed)
print("\n[PERM] Permutation importance (subsample 80K)...")
np.random.seed(42)
idx = np.random.choice(n, min(80000, n), replace=False)
X_s, y_s = X[idx], y[idx]

rf_s = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
rf_s.fit(X_s, y_s)

t0 = time.time()
perm = permutation_importance(rf_s, X_s, y_s, n_repeats=10, random_state=42, n_jobs=-1)
print(f"  Computed in {time.time()-t0:.1f}s")

perm_imp = list(zip(feature_cols, perm.importances_mean, perm.importances_std))
perm_imp.sort(key=lambda x: -x[1])

print(f"\n{'Feature':<35} {'Perm':>8} {'±':>8} {'Type':>10}")
print("-" * 70)
for feat, mean, std in perm_imp[:20]:
    ftype = "STABLE" if feat in STABLE_FEATURES else "INSTABLE"
    print(f"  {feat:<33} {mean:>7.4f}  {std:>7.4f}  [{ftype}]")

# Save Niveau 1
results_n1 = {
    'n_windows': n,
    'n_features': len(feature_cols),
    'features': feature_cols,
    'tier_distribution': dict(tier_dist),
    'rf_r2_cv_mean': round(float(cv_scores.mean()), 4),
    'rf_r2_cv_std': round(float(cv_scores.std()), 4),
    'rf_importance_mdi': {feat: round(float(imp), 6) for feat, imp in mdi_imp},
    'permutation_importance': {
        feat: {'mean': round(float(m), 6), 'std': round(float(s), 6)}
        for feat, m, s in perm_imp
    },
}
with open(f"{OUT_DIR}/NIVEAU1_FEATURE_IMPORTANCE.json", 'w', encoding='utf-8') as f:
    json.dump(results_n1, f, indent=2, ensure_ascii=False)
print(f"\nSaved: {OUT_DIR}/NIVEAU1_FEATURE_IMPORTANCE.json")

# ============================================================
# NIVEAU 2 — CORRELATIONS PARTIELLES + MEDIATION
# ============================================================
print("\n" + "=" * 80)
print("NIVEAU 2 — CORRELATIONS PARTIELLES + MEDIATION + CONFLITS")
print("=" * 80)

# 2a. Partial correlations (control: tier)
print("\n[PARTIAL] Computing partial correlations (top 15 features)...")
top15_feats = [feat for feat, _, _ in perm_imp[:15]]
top15_idx = [feature_cols.index(f) for f in top15_feats]

control = y.reshape(-1, 1)  # tier_num

def partial_corr(x_vec, y_vec, z_mat):
    lr = LinearRegression()
    lr.fit(z_mat, x_vec)
    rx = x_vec - lr.predict(z_mat)
    lr.fit(z_mat, y_vec)
    ry = y_vec - lr.predict(z_mat)
    denom = np.sqrt(np.sum(rx**2) * np.sum(ry**2))
    if denom < 1e-10:
        return 0.0
    return float(np.sum(rx * ry) / denom)

partial_matrix = {}
for i, f1 in enumerate(top15_feats):
    for f2 in top15_feats[i+1:]:
        i1 = feature_cols.index(f1)
        i2 = feature_cols.index(f2)
        x = X[:, i1]
        yv = X[:, i2]
        raw_r = float(np.corrcoef(x, yv)[0, 1])
        part_r = partial_corr(x, yv, control)
        partial_matrix[f"{f1}_vs_{f2}"] = {
            'raw_r': round(raw_r, 3),
            'partial_r': round(part_r, 3),
            'delta': round(part_r - raw_r, 3),
        }

print("\nPaires ou |delta| > 0.05 (tier masquait la relation) :")
sorted_pairs = sorted(partial_matrix.items(), key=lambda x: abs(x[1]['delta']), reverse=True)
for pair, vals in sorted_pairs[:15]:
    print(f"  {pair:50s} raw={vals['raw_r']:+.3f} partial={vals['partial_r']:+.3f} delta={vals['delta']:+.3f}")

# 2b. Mediation via f26b
print("\n[MEDIATION] Testing mediation via f26b...")
f26b_idx = feature_cols.index('f26b_long_sent_rate') if 'f26b_long_sent_rate' in feature_cols else None

mediations = []
if f26b_idx is not None:
    f26b_vec = X[:, f26b_idx]
    for feat in top15_feats:
        if feat == 'f26b_long_sent_rate':
            continue
        fi = feature_cols.index(feat)
        x_vec = X[:, fi].reshape(-1, 1)

        # c: X -> tier
        lr = LinearRegression().fit(x_vec, y)
        c = float(lr.coef_[0])

        # a: X -> f26b
        lr = LinearRegression().fit(x_vec, f26b_vec)
        a = float(lr.coef_[0])

        # c', b: X + f26b -> tier
        xf = np.column_stack([x_vec, f26b_vec])
        lr = LinearRegression().fit(xf, y)
        c_prime = float(lr.coef_[0])
        b = float(lr.coef_[1])

        indirect = a * b
        med_pct = abs(indirect / c) * 100 if abs(c) > 0.001 else 0

        mediations.append({
            'feature': feat,
            'effect_total_c': round(c, 4),
            'effect_via_f26b': round(indirect, 4),
            'effect_direct': round(c_prime, 4),
            'mediation_pct': round(med_pct, 1),
        })

    mediations.sort(key=lambda x: -x['mediation_pct'])
    print(f"\n{'Feature':<35} {'Total':>8} {'via_f26b':>10} {'Direct':>8} {'Med%':>6}")
    print("-" * 75)
    for m in mediations[:12]:
        print(f"  {m['feature']:<33} {m['effect_total_c']:>+7.4f} {m['effect_via_f26b']:>+9.4f} {m['effect_direct']:>+7.4f} {m['mediation_pct']:>5.1f}%")

# 2c. Axis proxy conflicts
print("\n[CONFLICTS] Checking axis proxy conflicts...")
axis_proxies = {
    'ECC_proxy': ['cv_sent', 'f1a_rhythm_variance', 'f24c_contrast_delta'],
    'RCI_proxy': ['ratio_alt', 'cv_sent', 'knife_rate'],
    'SII_proxy': ['sub_per_sentence', 'mean_sent_len'],
    'IFI_proxy': ['f35c_hook_score', 'f36c_cliff_score'],
}

conflicts = []
for fi, feat in enumerate(feature_cols):
    if feat in STABLE_FEATURES:
        continue
    x = X[:, fi]
    if np.std(x) < 1e-10:
        continue

    axis_corrs = {}
    for axis, proxies in axis_proxies.items():
        corrs = []
        for proxy in proxies:
            if proxy in feature_cols:
                pi = feature_cols.index(proxy)
                yp = X[:, pi]
                if np.std(yp) > 1e-10:
                    r = float(np.corrcoef(x, yp)[0, 1])
                    if math.isfinite(r):
                        corrs.append(r)
        axis_corrs[axis] = round(float(np.mean(corrs)), 3) if corrs else 0.0

    pos = [a for a, r in axis_corrs.items() if r > 0.15]
    neg = [a for a, r in axis_corrs.items() if r < -0.15]
    if pos and neg:
        conflicts.append({
            'feature': feat,
            'helps': pos,
            'hurts': neg,
            'correlations': axis_corrs,
        })

print(f"\n{len(conflicts)} features with axis conflicts:")
for c in conflicts:
    print(f"  {c['feature']:<30s} AIDE {c['helps']} NUIT {c['hurts']}")

# 2d. Role classification
print("\n[CLASSIFY] Assigning roles to all 40 features...")
perm_dict = {feat: m for feat, m, s in perm_imp}
med_dict = {m['feature']: m['mediation_pct'] for m in mediations}
conflict_feats = {c['feature'] for c in conflicts}

roles = {}
for feat in feature_cols:
    perm_val = perm_dict.get(feat, 0)
    med_pct = med_dict.get(feat, 0)
    is_conflict = feat in conflict_feats
    is_stable = feat in STABLE_FEATURES

    if perm_val > 0.01:
        role = 'DRIVER'
    elif med_pct > 30:
        role = 'MEDIATOR'
    elif is_conflict:
        role = 'CONFLICT'
    elif is_stable and perm_val < 0.005:
        role = 'THERMOMETER'
    elif perm_val < 0.002:
        role = 'NOISE'
    else:
        role = 'CONDITIONAL'

    roles[feat] = {
        'role': role,
        'permutation_importance': round(perm_val, 6),
        'mediation_pct': round(med_pct, 1),
        'is_conflict': is_conflict,
        'is_stable': is_stable,
    }

# Summary
from collections import Counter
role_counts = Counter(r['role'] for r in roles.values())
print(f"\n{'Role':<15} {'Count':>5}")
print("-" * 25)
for role, count in role_counts.most_common():
    print(f"  {role:<13} {count:>5}")
    for feat in sorted(roles, key=lambda f: -roles[f]['permutation_importance']):
        if roles[feat]['role'] == role:
            r = roles[feat]
            print(f"    {feat:<30s} imp={r['permutation_importance']:.4f} med={r['mediation_pct']:.1f}%")

# Save Niveau 2
results_n2 = {
    'partial_correlations': partial_matrix,
    'mediations': mediations,
    'conflicts': conflicts,
    'roles': roles,
    'role_counts': dict(role_counts),
}
with open(f"{OUT_DIR}/NIVEAU2_CAUSAL_ANALYSIS.json", 'w', encoding='utf-8') as f:
    json.dump(results_n2, f, indent=2, ensure_ascii=False)
print(f"\nSaved: {OUT_DIR}/NIVEAU2_CAUSAL_ANALYSIS.json")

print("\n" + "=" * 80)
print("ANGOSTURA AUDIT COMPLETE")
print("=" * 80)
