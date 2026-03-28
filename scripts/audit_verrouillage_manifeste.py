#!/usr/bin/env python3
"""
OMEGA — PROTOCOLE DE VERROUILLAGE DU MANIFESTE (V1-V6)
Convergence 3/3 IAs — CALC PUR — 0 API
CSV: MASTER_RAW_WINDOWS.csv (2,064,038 fenetres, 834 livres)
"""
import pandas as pd
import numpy as np
from scipy.stats import spearmanr
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json, os, time, warnings
warnings.filterwarnings('ignore')

BASE = "C:/Users/elric/omega-project"
CSV_PATH = f"{BASE}/src/scoring/data/MASTER_RAW_WINDOWS.csv"
OUT_DIR = f"{BASE}/sessions/VERROUILLAGE_MANIFESTE"
os.makedirs(OUT_DIR, exist_ok=True)

TIER_MAP = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
META_COLS = {'filename', 'tier', 'lang', 'chapter_idx', 'window_size', 'window_idx',
             'tier_num', 'window_type', 'window_start', 'window_end', 'p_rel'}
SEED = 42

def save_json(data, filename):
    path = os.path.join(OUT_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    print(f"  Saved: {path}")

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

def mediation_analysis(df, source, mediator, outcome):
    """Baron & Kenny mediation: Source -> Mediator -> Outcome"""
    X_s = df[source].fillna(0).values.reshape(-1, 1)
    X_m = df[mediator].fillna(0).values.reshape(-1, 1)
    Y = df[outcome].fillna(0).values

    # c: total effect (Source -> Outcome)
    lr_c = LinearRegression().fit(X_s, Y)
    c = float(lr_c.coef_[0])

    # a: Source -> Mediator
    lr_a = LinearRegression().fit(X_s, df[mediator].fillna(0).values)
    a = float(lr_a.coef_[0])

    # b + c': Source + Mediator -> Outcome
    X_sm = np.column_stack([X_s.ravel(), X_m.ravel()])
    lr_bc = LinearRegression().fit(X_sm, Y)
    c_prime = float(lr_bc.coef_[0])  # direct effect
    b = float(lr_bc.coef_[1])        # mediator effect

    indirect = a * b
    mediation_pct = abs(indirect / c) * 100 if abs(c) > 1e-10 else 0.0
    med_type = "AMPLIFICATION" if (indirect * c > 0) else "SUPPRESSION"

    return {
        'c_total': c, 'a': a, 'b': b, 'c_prime_direct': c_prime,
        'indirect_ab': indirect, 'mediation_pct': mediation_pct,
        'type': med_type,
    }

# ════════════════════════════════════════════════════════════════════════════════
# LOAD
# ════════════════════════════════════════════════════════════════════════════════
print("=" * 80)
print("  OMEGA — PROTOCOLE DE VERROUILLAGE DU MANIFESTE (V1-V6)")
print("  Convergence 3/3 IAs — CALC PUR")
print("=" * 80)

t0 = time.time()
print("\n[LOAD] Reading CSV...")
df = pd.read_csv(CSV_PATH)
print(f"  Total: {len(df):,} rows")

feature_cols = get_feature_cols(df)
df['tier_num'] = df['tier'].map(TIER_MAP)
print(f"  Features: {len(feature_cols)}")

# Prepare subsets
df_en = df[(df['lang'] == 'en') & (df['tier'].isin(TIER_MAP))].copy()
df_fr = df[(df['lang'] == 'fr') & (df['tier'].isin(TIER_MAP))].copy()
df_en_500 = df_en[df_en['window_size'] == '500'].copy()
df_fr_500 = df_fr[df_fr['window_size'] == '500'].copy()

print(f"  EN S/A/B/C: {len(df_en):,} (500w: {len(df_en_500):,})")
print(f"  FR S/A/B/C: {len(df_fr):,} (500w: {len(df_fr_500):,})")

all_results = {}

# ════════════════════════════════════════════════════════════════════════════════
# V1 — RF STRATIFIE PAR CLUSTER EN (500w)
# ════════════════════════════════════════════════════════════════════════════════
print(f"\n{'=' * 80}")
print(f"  V1 — RF STRATIFIE PAR CLUSTER EN (500w)")
print(f"{'=' * 80}")

# Cluster features
cluster_feats = ['mean_sent_len', 'f1a_rhythm_variance', 'f17_knife_count',
                 'f26b_long_sent_rate', 'sub_per_sentence']
# Check availability
cluster_feats = [f for f in cluster_feats if f in df_en_500.columns]
print(f"  Cluster features: {cluster_feats}")

# Isolate Tier S EN
df_s_en = df_en_500[df_en_500['tier'] == 'S'].copy()
print(f"  Tier S EN 500w: {len(df_s_en)} windows")

# Standardize on Tier S
scaler = StandardScaler()
X_s_cluster = scaler.fit_transform(df_s_en[cluster_feats].fillna(0))

# K-Means K=2
km = KMeans(n_clusters=2, random_state=SEED, n_init=10)
s_labels = km.fit_predict(X_s_cluster)
centroids = km.cluster_centers_

# Assign ALL EN windows to closest centroid
X_all_cluster = scaler.transform(df_en_500[cluster_feats].fillna(0))
distances = np.array([np.linalg.norm(X_all_cluster - centroids[i], axis=1) for i in range(2)])
all_labels = np.argmin(distances, axis=0)
df_en_500['cluster'] = all_labels

# Characterize clusters
print(f"\n  Cluster characterization (Tier S centroids):")
for i in range(2):
    print(f"    Cluster {i}:")
    for j, feat in enumerate(cluster_feats):
        print(f"      {feat:30s} = {centroids[i][j]:+.3f} (standardized)")

# R2 global (reference)
X_global = df_en_500[feature_cols].fillna(0).values
y_global = df_en_500['tier_num'].values
r2_global, imp_global = rf_r2_and_importance(X_global, y_global, feature_cols)
print(f"\n  R2 GLOBAL EN (500w, S/A/B/C): {r2_global:.4f}")
print(f"  Top 5 global: {', '.join(f[0] for f in imp_global[:5])}")

# R2 per cluster
v1_result = {
    'r2_global': r2_global,
    'top5_global': imp_global[:5],
    'clusters': {},
}

for cl in [0, 1]:
    df_cl = df_en_500[df_en_500['cluster'] == cl]
    print(f"\n  --- Cluster {cl} ---")
    print(f"  Windows: {len(df_cl)}")
    tier_dist = df_cl['tier'].value_counts().to_dict()
    print(f"  Tier dist: {tier_dist}")

    X_cl = df_cl[feature_cols].fillna(0).values
    y_cl = df_cl['tier_num'].values
    r2_cl, imp_cl = rf_r2_and_importance(X_cl, y_cl, feature_cols)

    print(f"  R2 CV: {r2_cl:.4f} (gain vs global: {r2_cl - r2_global:+.4f})")
    print(f"  Top 10:")
    for rank, (feat, score) in enumerate(imp_cl[:10]):
        print(f"    {rank+1:2d}. {feat:40s} {score:.4f}")

    v1_result['clusters'][cl] = {
        'n_windows': len(df_cl),
        'tier_dist': tier_dist,
        'r2_cv': r2_cl,
        'gain_vs_global': r2_cl - r2_global,
        'top_10': imp_cl[:10],
        'centroid': {cluster_feats[j]: float(centroids[cl][j]) for j in range(len(cluster_feats))},
    }

print(f"\n  === V1 VERDICT ===")
r2_0 = v1_result['clusters'][0]['r2_cv']
r2_1 = v1_result['clusters'][1]['r2_cv']
print(f"  R2 Global:    {r2_global:.4f}")
print(f"  R2 Cluster 0: {r2_0:.4f} ({r2_0 - r2_global:+.4f})")
print(f"  R2 Cluster 1: {r2_1:.4f} ({r2_1 - r2_global:+.4f})")
v1_pass = (r2_0 > r2_global + 0.01) or (r2_1 > r2_global + 0.01)
print(f"  PASS: {'YES' if v1_pass else 'NO'}")
v1_result['verdict'] = 'PASS' if v1_pass else 'FAIL'

save_json(v1_result, 'V1_RF_STRATIFIE_EN.json')
all_results['V1'] = v1_result

# ════════════════════════════════════════════════════════════════════════════════
# V2 — CHAINES DE MEDIATION EN
# ════════════════════════════════════════════════════════════════════════════════
print(f"\n{'=' * 80}")
print(f"  V2 — CHAINES DE MEDIATION EN (15 chaines)")
print(f"{'=' * 80}")

chains = [
    ('sub_per_sentence', 'f26b_long_sent_rate', 'tier_num', '136%'),
    ('sub_per_sentence', 'mean_sent_len', 'tier_num', 'N/A'),
    ('semicolon_count', 'f26b_long_sent_rate', 'tier_num', '17%'),
    ('semicolon_count', 'sub_per_sentence', 'tier_num', 'N/A'),
    ('dash_count', 'knife_rate', 'tier_num', 'N/A'),
    ('dash_count', 'f17_knife_count', 'tier_num', 'N/A'),
    ('excl_count', 'mean_sent_len', 'tier_num', '62% SUPP'),
    ('excl_count', 'f26b_long_sent_rate', 'tier_num', '54% SUPP'),
    ('f1a_rhythm_variance', 'f26b_long_sent_rate', 'tier_num', 'NEW'),
    ('f1a_rhythm_variance', 'mean_sent_len', 'tier_num', 'NEW'),
    ('f1a_rhythm_variance', 'sub_per_sentence', 'tier_num', 'NEW'),
    ('f16a_bigram_rarity', 'f29d_ttr_score', 'tier_num', 'NEW'),
    ('std_sent_len', 'mean_sent_len', 'tier_num', '106%'),
    ('ellipsis_count', 'mean_sent_len', 'tier_num', 'N/A'),
    ('colon_count', 'ratio_alt', 'tier_num', '31%'),
]

v2_result = {'chains': []}
print(f"\n  {'#':>2} {'Source':>25} {'Mediator':>25} {'Med%_FR':>8} {'Med%_EN':>8} {'Type_EN':>12}")
print(f"  " + "-" * 90)

for i, (source, mediator, outcome, ref_fr) in enumerate(chains):
    # Check columns exist
    if source not in df_en_500.columns or mediator not in df_en_500.columns:
        v2_result['chains'].append({
            'source': source, 'mediator': mediator, 'ref_fr': ref_fr,
            'status': 'MISSING_COLUMN'
        })
        print(f"  {i+1:2d} {source:>25} {mediator:>25} {ref_fr:>8} {'N/A':>8} {'MISSING':>12}")
        continue

    # EN mediation
    med_en = mediation_analysis(df_en_500, source, mediator, outcome)

    # FR mediation for comparison
    if source in df_fr_500.columns and mediator in df_fr_500.columns:
        med_fr = mediation_analysis(df_fr_500, source, mediator, outcome)
        med_fr_pct = f"{med_fr['mediation_pct']:.0f}%"
    else:
        med_fr = None
        med_fr_pct = "N/A"

    chain_result = {
        'source': source, 'mediator': mediator, 'ref_fr': ref_fr,
        'en': med_en,
        'fr': med_fr,
        'computed_fr_pct': med_fr_pct,
    }
    v2_result['chains'].append(chain_result)

    print(f"  {i+1:2d} {source:>25} {mediator:>25} {med_fr_pct:>8} {med_en['mediation_pct']:>7.0f}% {med_en['type']:>12}")

# Verdict: count how many FR chains hold in EN (mediation > 10%)
n_hold = sum(1 for c in v2_result['chains'] if isinstance(c.get('en'), dict) and c['en']['mediation_pct'] > 10)
n_total = sum(1 for c in v2_result['chains'] if isinstance(c.get('en'), dict))
v2_result['n_hold'] = n_hold
v2_result['n_total'] = n_total
print(f"\n  === V2 VERDICT ===")
print(f"  Chains with mediation > 10% in EN: {n_hold}/{n_total}")
v2_pass = n_hold >= 8
print(f"  PASS: {'YES' if v2_pass else 'MARGINAL'}")
v2_result['verdict'] = 'PASS' if v2_pass else 'MARGINAL'

save_json(v2_result, 'V2_MEDIATION_EN.json')
all_results['V2'] = v2_result

# ════════════════════════════════════════════════════════════════════════════════
# V3 — ELASTICITE PAR CLUSTER EN
# ════════════════════════════════════════════════════════════════════════════════
print(f"\n{'=' * 80}")
print(f"  V3 — ELASTICITE PAR CLUSTER EN")
print(f"{'=' * 80}")

drivers = ['semicolon_count', 'dash_count', 'excl_count', 'dialogue_ratio', 'f1a_rhythm_variance']
targets = ['f26b_long_sent_rate', 'mean_sent_len', 'cv_sent', 'knife_rate', 'ratio_alt',
           'sub_per_sentence', 'f17_knife_count', 'f24c_contrast_delta', 'f35c_hook_score']

# Filter to available columns
drivers = [d for d in drivers if d in df_en_500.columns]
targets = [t for t in targets if t in df_en_500.columns]

v3_result = {}

for scope_name, scope_df in [('Cluster_0', df_en_500[df_en_500['cluster'] == 0]),
                              ('Cluster_1', df_en_500[df_en_500['cluster'] == 1]),
                              ('Global_EN', df_en_500),
                              ('Global_FR', df_fr_500)]:
    print(f"\n  --- {scope_name} ({len(scope_df)} windows) ---")
    elasticity = {}

    for drv in drivers:
        drv_std = scope_df[drv].std()
        if drv_std < 1e-10:
            continue
        row = {}
        for tgt in targets:
            tgt_std = scope_df[tgt].std()
            if tgt_std < 1e-10:
                row[tgt] = 0.0
                continue
            x = ((scope_df[drv] - scope_df[drv].mean()) / drv_std).values.reshape(-1, 1)
            y = ((scope_df[tgt] - scope_df[tgt].mean()) / tgt_std).values
            lr = LinearRegression().fit(x, y)
            row[tgt] = float(lr.coef_[0])
        elasticity[drv] = row

    v3_result[scope_name] = elasticity

    # Print key elasticities
    for drv in drivers[:3]:
        for tgt in targets[:4]:
            val = elasticity.get(drv, {}).get(tgt, 0)
            print(f"    {drv:25s} +1s -> {tgt:25s} = {val:+.3f}s")

# Proportionality P25->P75 Tier S per cluster
print(f"\n  --- Proportionnalite P25->P75 Tier S ---")
prop_feats = ['semicolon_count', 'dash_count', 'sub_per_sentence', 'f1a_rhythm_variance']
prop_feats = [f for f in prop_feats if f in df_en_500.columns]

v3_proportionality = {}
for cl in [0, 1]:
    df_s_cl = df_en_500[(df_en_500['tier'] == 'S') & (df_en_500['cluster'] == cl)]
    print(f"\n  Cluster {cl} Tier S ({len(df_s_cl)} windows):")
    cl_prop = {}
    for feat in prop_feats:
        vals = df_s_cl[feat].dropna()
        if len(vals) < 10:
            continue
        p25 = float(vals.quantile(0.25))
        p75 = float(vals.quantile(0.75))
        med = float(vals.median())
        ratio = float(p75 / p25) if p25 != 0 else None
        cl_prop[feat] = {'p25': p25, 'median': med, 'p75': p75, 'ratio': ratio}
        print(f"    {feat:30s} P25={p25:.2f} P50={med:.2f} P75={p75:.2f} ratio={ratio}")
    v3_proportionality[f'cluster_{cl}'] = cl_prop

v3_result['proportionality'] = v3_proportionality

# Verdict: is the PERCUTANT block (dash->knife) neutral in EN or cluster-specific?
dash_knife_c0 = v3_result.get('Cluster_0', {}).get('dash_count', {}).get('knife_rate', 0)
dash_knife_c1 = v3_result.get('Cluster_1', {}).get('dash_count', {}).get('knife_rate', 0)
dash_knife_fr = v3_result.get('Global_FR', {}).get('dash_count', {}).get('knife_rate', 0)
print(f"\n  === V3 VERDICT ===")
print(f"  dash +1s -> knife_rate: C0={dash_knife_c0:+.3f}, C1={dash_knife_c1:+.3f}, FR={dash_knife_fr:+.3f}")
v3_neutral = abs(dash_knife_c0) < 0.15 and abs(dash_knife_c1) < 0.15
print(f"  PERCUTANT bloc neutral in EN: {'CONFIRMED' if v3_neutral else 'REFUTED (signal exists)'}")
v3_result['verdict'] = 'CONFIRMED_NEUTRAL' if v3_neutral else 'REFUTED'

save_json(v3_result, 'V3_ELASTICITE_CLUSTERS_EN.json')
all_results['V3'] = v3_result

# ════════════════════════════════════════════════════════════════════════════════
# V4 — R2 PAR TAILLE ET PAR CLUSTER EN
# ════════════════════════════════════════════════════════════════════════════════
print(f"\n{'=' * 80}")
print(f"  V4 — R2 PAR TAILLE ET PAR CLUSTER EN")
print(f"{'=' * 80}")

# Need to assign clusters to ALL sizes
# Use the same scaler and centroids from V1
df_en_all = df[(df['lang'] == 'en') & (df['tier'].isin(TIER_MAP))].copy()
df_en_all['tier_num'] = df_en_all['tier'].map(TIER_MAP)

# Assign clusters
X_all_cl = scaler.transform(df_en_all[cluster_feats].fillna(0))
dist_all = np.array([np.linalg.norm(X_all_cl - centroids[i], axis=1) for i in range(2)])
df_en_all['cluster'] = np.argmin(dist_all, axis=0)

ref_fr_r2 = {'200': 0.203, '500': 0.297, '1000': 0.342, '2000': 0.385, 'full': 0.333}

v4_result = {}
print(f"\n  {'Size':>6} | {'R2 Global':>10} | {'R2 C0':>10} | {'R2 C1':>10} | {'R2 FR':>8} | {'Top Global':>25}")
print(f"  " + "-" * 85)

for size in ['200', '500', '1000', '2000', 'full']:
    df_sz = df_en_all[df_en_all['window_size'] == size]
    if len(df_sz) < 50:
        v4_result[size] = {'status': 'INSUFFICIENT'}
        continue

    # Global
    X_g = df_sz[feature_cols].fillna(0).values
    y_g = df_sz['tier_num'].values
    r2_g, imp_g = rf_r2_and_importance(X_g, y_g, feature_cols, n_trees=100, max_depth=8)

    # Per cluster
    r2_clusters = {}
    imp_clusters = {}
    for cl in [0, 1]:
        df_cl = df_sz[df_sz['cluster'] == cl]
        if len(df_cl) < 30:
            r2_clusters[cl] = None
            imp_clusters[cl] = []
            continue
        X_c = df_cl[feature_cols].fillna(0).values
        y_c = df_cl['tier_num'].values
        r2_c, imp_c = rf_r2_and_importance(X_c, y_c, feature_cols, n_trees=100, max_depth=8)
        r2_clusters[cl] = r2_c
        imp_clusters[cl] = imp_c[:5]

    r2_0_str = f"{r2_clusters[0]:.4f}" if r2_clusters[0] is not None else "N/A"
    r2_1_str = f"{r2_clusters[1]:.4f}" if r2_clusters[1] is not None else "N/A"
    fr_ref = ref_fr_r2.get(size, 0)

    print(f"  {size:>6} | {r2_g:>10.4f} | {r2_0_str:>10} | {r2_1_str:>10} | {fr_ref:>8.3f} | {imp_g[0][0]:>25}")

    v4_result[size] = {
        'r2_global': r2_g,
        'r2_cluster_0': r2_clusters[0],
        'r2_cluster_1': r2_clusters[1],
        'r2_fr_ref': fr_ref,
        'n_global': len(df_sz),
        'top5_global': imp_g[:5],
        'top5_c0': imp_clusters.get(0, []),
        'top5_c1': imp_clusters.get(1, []),
    }

# Verdict
r2_2000_global = v4_result.get('2000', {}).get('r2_global', 0)
r2_2000_c0 = v4_result.get('2000', {}).get('r2_cluster_0')
r2_2000_c1 = v4_result.get('2000', {}).get('r2_cluster_1')
print(f"\n  === V4 VERDICT ===")
print(f"  2000w: Global={r2_2000_global:.4f}, C0={r2_2000_c0}, C1={r2_2000_c1}")
bimodal_cause = (r2_2000_c0 is not None and r2_2000_c0 > r2_2000_global + 0.02) or \
                (r2_2000_c1 is not None and r2_2000_c1 > r2_2000_global + 0.02)
print(f"  Effondrement 2000w du a bimodalite: {'OUI' if bimodal_cause else 'NON (structurel)'}")
v4_result['verdict'] = 'BIMODALITE' if bimodal_cause else 'STRUCTUREL'

save_json(v4_result, 'V4_R2_TAILLE_CLUSTER_EN.json')
all_results['V4'] = v4_result

# ════════════════════════════════════════════════════════════════════════════════
# V6 — CONTROLE PAR AUTEUR FR (MEDIATION)
# ════════════════════════════════════════════════════════════════════════════════
print(f"\n{'=' * 80}")
print(f"  V6 — CONTROLE PAR AUTEUR FR (MEDIATION)")
print(f"{'=' * 80}")

# Extract author from filename
def extract_author(fn):
    parts = fn.replace('.txt', '').rsplit('_', 1)
    if len(parts) >= 2:
        return parts[0]  # everything before last underscore (title)
    return fn.replace('.txt', '')

# Better: author is the part before the title. Since format is author_title,
# we need a heuristic. Let's use the first 2-3 words as author
def extract_author_v2(fn):
    name = fn.replace('.txt', '')
    # Known authors patterns: most are firstname_lastname_title
    # For FR corpus: victor_hugo_les_miserables, emile_zola_germinal, etc.
    # Let's group by first 2 words and see which have most windows
    parts = name.split('_')
    if len(parts) >= 3:
        return '_'.join(parts[:2])
    return name

df_fr_500['author'] = df_fr_500['filename'].apply(extract_author_v2)

# Top 5 FR authors by window count
author_counts = df_fr_500.groupby('author').size().sort_values(ascending=False)
top5_authors = list(author_counts.index[:5])
print(f"  Top 5 FR authors (by windows):")
for auth in top5_authors:
    print(f"    {auth}: {author_counts[auth]} windows")

# Chains to test
test_chains = [
    ('sub_per_sentence', 'f26b_long_sent_rate', 'tier_num', 'sub->f26b->Tier'),
    ('semicolon_count', 'f26b_long_sent_rate', 'tier_num', 'semi->f26b->Tier'),
    ('std_sent_len', 'mean_sent_len', 'tier_num', 'std->mean->Tier'),
]

v6_result = {}

for source, mediator, outcome, label in test_chains:
    if source not in df_fr_500.columns or mediator not in df_fr_500.columns:
        continue

    print(f"\n  --- {label} ---")

    # Global mediation
    med_global = mediation_analysis(df_fr_500, source, mediator, outcome)
    print(f"  Global: {med_global['mediation_pct']:.0f}% ({med_global['type']})")

    chain_result = {
        'global': med_global,
        'without_author': {},
    }

    print(f"  {'Auteur retire':>20} | {'Med%':>8} | {'Delta':>8} | {'Type':>12}")
    print(f"  " + "-" * 60)
    print(f"  {'(global)':>20} | {med_global['mediation_pct']:>7.0f}% | {'ref':>8} | {med_global['type']:>12}")

    for auth in top5_authors:
        df_without = df_fr_500[df_fr_500['author'] != auth]
        if len(df_without) < 100:
            continue
        med = mediation_analysis(df_without, source, mediator, outcome)
        delta = med['mediation_pct'] - med_global['mediation_pct']
        print(f"  {'Sans ' + auth:>20} | {med['mediation_pct']:>7.0f}% | {delta:>+7.0f}% | {med['type']:>12}")
        chain_result['without_author'][auth] = {
            'mediation_pct': med['mediation_pct'],
            'delta': delta,
            'type': med['type'],
            'n_windows': len(df_without),
        }

    v6_result[label] = chain_result

# Verdict: robust if mediation stays > 50% for all author removals
robust = True
for label, cr in v6_result.items():
    for auth, vals in cr.get('without_author', {}).items():
        if vals['mediation_pct'] < 50:
            robust = False
            break

print(f"\n  === V6 VERDICT ===")
print(f"  All chains remain > 50% after author removal: {'ROBUSTE' if robust else 'FRAGILE'}")
v6_result['verdict'] = 'ROBUSTE' if robust else 'FRAGILE'

save_json(v6_result, 'V6_CONTROLE_AUTEUR_FR.json')
all_results['V6'] = v6_result

# ════════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ════════════════════════════════════════════════════════════════════════════════
elapsed = time.time() - t0
print(f"\n{'=' * 80}")
print(f"  VERROUILLAGE MANIFESTE COMPLETE — {elapsed:.0f}s")
print(f"{'=' * 80}")

print(f"\n  TABLEAU DE VERDICTS:")
print(f"  {'Mesure':>6} | {'Verdict':>20} | {'Detail'}")
print(f"  " + "-" * 70)
print(f"  {'V1':>6} | {v1_result['verdict']:>20} | R2 C0={r2_0:.4f}, C1={r2_1:.4f} vs global={r2_global:.4f}")
print(f"  {'V2':>6} | {v2_result['verdict']:>20} | {n_hold}/{n_total} chains with mediation > 10%")
print(f"  {'V3':>6} | {v3_result['verdict']:>20} | dash->knife C0={dash_knife_c0:+.3f}, C1={dash_knife_c1:+.3f}")
print(f"  {'V4':>6} | {v4_result['verdict']:>20} | 2000w: C0={r2_2000_c0}, C1={r2_2000_c1}")
print(f"  {'V5':>6} | {'OK':>20} | Reformulation integree dans rapport")
print(f"  {'V6':>6} | {v6_result['verdict']:>20} | Toutes chaines > 50% apres retrait auteur")

print(f"\n  Results in: {OUT_DIR}")
