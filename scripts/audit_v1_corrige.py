#!/usr/bin/env python3
"""
OMEGA — V1 CORRIGE: Test decisif du cluster maximaliste EN
Corpus V3 avec 2eme salve EN (maximalistes)
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import cross_val_score
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json, os, time, warnings
warnings.filterwarnings('ignore')

BASE = "C:/Users/elric/omega-project"
CSV_PATH = f"{BASE}/src/scoring/data/MASTER_RAW_WINDOWS.csv"
OUT_DIR = f"{BASE}/sessions/V1_CORRIGE"
os.makedirs(OUT_DIR, exist_ok=True)

TIER_MAP = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
META_COLS = {'filename', 'tier', 'lang', 'chapter_idx', 'window_size', 'window_idx',
             'tier_num', 'window_type', 'window_start', 'window_end', 'p_rel'}
SEED = 42

def get_feature_cols(df):
    return [c for c in df.columns if c not in META_COLS
            and df[c].dtype in ['float64', 'int64', 'float32', 'int32']
            and c != 'tier_num' and df[c].notna().mean() > 0.5]

def rf_r2_and_importance(X, y, feature_names, n_trees=200, max_depth=10):
    rf = RandomForestRegressor(n_estimators=n_trees, max_depth=max_depth, random_state=SEED, n_jobs=-1)
    rf.fit(X, y)
    cv = cross_val_score(rf, X, y, cv=5, scoring='r2')
    r2_cv = float(np.mean(cv))
    perm = permutation_importance(rf, X, y, n_repeats=10, random_state=SEED, n_jobs=-1)
    imp = [(feature_names[i], float(perm.importances_mean[i])) for i in range(len(feature_names))]
    imp.sort(key=lambda x: x[1], reverse=True)
    return r2_cv, imp

print("=" * 80)
print("  OMEGA — V1 CORRIGE: TEST DECISIF CLUSTER MAXIMALISTE EN")
print("  Corpus V3 enrichi maximalistes")
print("=" * 80)

t0 = time.time()
print("\n[LOAD] Reading CSV...")
df = pd.read_csv(CSV_PATH)
print(f"  Total: {len(df):,} rows")
print(f"  Unique files: {df['filename'].nunique()}")

feature_cols = get_feature_cols(df)
df['tier_num'] = df['tier'].map(TIER_MAP)

# EN S/A/B/C 500w
df_en = df[(df['lang'] == 'en') & (df['tier'].isin(TIER_MAP)) & (df['window_size'] == '500')].copy()
print(f"  EN S/A/B/C 500w: {len(df_en):,} windows, {df_en['filename'].nunique()} books")
print(f"  Tier dist: {df_en['tier'].value_counts().to_dict()}")

# ── CLUSTERING ────────────────────────────────────────────────────────────────
cluster_feats = ['mean_sent_len', 'f1a_rhythm_variance', 'f17_knife_count',
                 'f26b_long_sent_rate', 'sub_per_sentence']
cluster_feats = [f for f in cluster_feats if f in df_en.columns]

# Tier S EN for clustering
df_s = df_en[df_en['tier'] == 'S'].copy()
print(f"\n  Tier S EN 500w: {len(df_s)} windows")

scaler = StandardScaler()
X_s = scaler.fit_transform(df_s[cluster_feats].fillna(0))
km = KMeans(n_clusters=2, random_state=SEED, n_init=10)
s_labels = km.fit_predict(X_s)
centroids = km.cluster_centers_

# Assign ALL EN windows to nearest centroid
X_all = scaler.transform(df_en[cluster_feats].fillna(0))
distances = np.array([np.linalg.norm(X_all - centroids[i], axis=1) for i in range(2)])
df_en['cluster'] = np.argmin(distances, axis=0)

# Characterize centroids
print(f"\n  Centroids (standardized):")
for i in range(2):
    vals = ', '.join(f"{cluster_feats[j]}={centroids[i][j]:+.2f}" for j in range(len(cluster_feats)))
    label = "COURT/minimaliste" if centroids[i][0] < 0 else "LONG/maximaliste"
    print(f"    Cluster {i} ({label}): {vals}")

# ── BEFORE (V2 reference) ────────────────────────────────────────────────────
print(f"\n{'=' * 80}")
print(f"  AVANT (V2): Reference du verrouillage precedent")
print(f"{'=' * 80}")
print(f"  Cluster 1 Tier C: 84 fenetres")
print(f"  R2 Cluster 1: -0.308")
print(f"  R2 Global: 0.101")

# ── AFTER (V3 current) ───────────────────────────────────────────────────────
print(f"\n{'=' * 80}")
print(f"  APRES (V3): Corpus enrichi maximalistes")
print(f"{'=' * 80}")

# Distribution per cluster
print(f"\n  Distribution des tiers par cluster (V3):")
print(f"  {'Tier':>4} | {'Cluster 0':>10} | {'Cluster 1':>10} | {'Total':>10}")
print(f"  " + "-" * 40)
for tier in ['S', 'A', 'B', 'C', 'D']:
    c0 = len(df_en[(df_en['cluster'] == 0) & (df_en['tier'] == tier)])
    c1 = len(df_en[(df_en['cluster'] == 1) & (df_en['tier'] == tier)])
    total = c0 + c1
    print(f"  {tier:>4} | {c0:>10,} | {c1:>10,} | {total:>10,}")

# R2 global
r2_global, imp_global = rf_r2_and_importance(
    df_en[feature_cols].fillna(0).values, df_en['tier_num'].values, feature_cols)
print(f"\n  R2 GLOBAL EN V3: {r2_global:.4f}")
print(f"  Top 5: {', '.join(f[0] for f in imp_global[:5])}")

# R2 per cluster
results = {'r2_global': r2_global, 'top5_global': imp_global[:5], 'clusters': {}}

for cl in [0, 1]:
    df_cl = df_en[df_en['cluster'] == cl]
    tier_dist = df_cl['tier'].value_counts().to_dict()
    n_sabc = len(df_cl[df_cl['tier'].isin(TIER_MAP)])

    print(f"\n  --- Cluster {cl} ---")
    print(f"  Total windows: {len(df_cl):,}")
    print(f"  S/A/B/C windows: {n_sabc:,}")
    print(f"  Tier dist: {tier_dist}")

    # RF only on S/A/B/C
    df_cl_sabc = df_cl[df_cl['tier'].isin(TIER_MAP)]
    if len(df_cl_sabc) < 50:
        print(f"  SKIP: insufficient S/A/B/C data")
        results['clusters'][cl] = {'status': 'INSUFFICIENT', 'n': len(df_cl_sabc)}
        continue

    r2_cl, imp_cl = rf_r2_and_importance(
        df_cl_sabc[feature_cols].fillna(0).values, df_cl_sabc['tier_num'].values, feature_cols)

    print(f"  R2 CV: {r2_cl:.4f} (gain vs global: {r2_cl - r2_global:+.4f})")
    print(f"  Top 10:")
    for rank, (feat, score) in enumerate(imp_cl[:10]):
        print(f"    {rank+1:2d}. {feat:40s} {score:.4f}")

    results['clusters'][cl] = {
        'n_windows': len(df_cl),
        'n_sabc': n_sabc,
        'tier_dist': tier_dist,
        'r2_cv': r2_cl,
        'gain': r2_cl - r2_global,
        'top_10': imp_cl[:10],
    }

# ── VERDICT ───────────────────────────────────────────────────────────────────
print(f"\n{'=' * 80}")
print(f"  VERDICT V1 CORRIGE")
print(f"{'=' * 80}")

r2_c0 = results['clusters'].get(0, {}).get('r2_cv', None)
r2_c1 = results['clusters'].get(1, {}).get('r2_cv', None)
c1_tier_c = results['clusters'].get(1, {}).get('tier_dist', {}).get('C', 0)

print(f"\n  AVANT (V2):")
print(f"    Cluster 1 Tier C: 84 fenetres")
print(f"    R2 Cluster 1: -0.308")
print(f"\n  APRES (V3):")
print(f"    Cluster 1 Tier C: {c1_tier_c} fenetres")
print(f"    R2 Cluster 0: {r2_c0}")
print(f"    R2 Cluster 1: {r2_c1}")
print(f"    R2 Global:    {r2_global:.4f}")

if r2_c1 is not None and r2_c1 > 0:
    verdict = "BIMODALITE CONFIRMEE — Le scorer EN a 2 profils est viable"
    print(f"\n  VERDICT: {verdict}")
    print(f"  Le R2 Cluster 1 est maintenant > 0. Le corpus maximaliste a comble le blanc.")
elif r2_c1 is not None:
    verdict = f"FEATURES INSUFFISANTES — R2 Cluster 1 = {r2_c1:.4f}, toujours negatif"
    print(f"\n  VERDICT: {verdict}")
    print(f"  Les 42 features sont insuffisantes pour discriminer le style maximaliste EN.")
    print(f"  Zone NON CLOSE a documenter dans le manifeste.")
else:
    verdict = "DONNEES INSUFFISANTES"
    print(f"\n  VERDICT: {verdict}")

results['verdict'] = verdict
results['comparison'] = {
    'v2_cluster1_tier_c': 84,
    'v2_cluster1_r2': -0.308,
    'v3_cluster1_tier_c': c1_tier_c,
    'v3_cluster1_r2': r2_c1,
    'v3_global_r2': r2_global,
}

# Save
path = os.path.join(OUT_DIR, 'V1_CORRIGE_RESULTS.json')
with open(path, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False, default=str)
print(f"\n  Saved: {path}")
print(f"  Elapsed: {time.time()-t0:.0f}s")
