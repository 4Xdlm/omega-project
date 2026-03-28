#!/usr/bin/env python3
"""
OMEGA — AUDIT COMPLET EN (English) : P0.1 + P0.2 + P0.3 + P0.4
Reproduit les 4 protocoles FR (Angostura, Hierarchie, Inter-relations, Confirmations)
sur lang=='en' pour valider l'universalite des lois L31-L36.
Mode: CALC PUR — 0 API
Source: MASTER_RAW_WINDOWS.csv
"""
import pandas as pd
import numpy as np
from scipy.stats import spearmanr
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LinearRegression
import json, os, time, warnings
warnings.filterwarnings('ignore')

BASE = "C:/Users/elric/omega-project"
CSV_PATH = f"{BASE}/src/scoring/data/MASTER_RAW_WINDOWS.csv"
OUT_DIR = f"{BASE}/sessions/P0_EN_AUDIT"
os.makedirs(OUT_DIR, exist_ok=True)

TIER_MAP = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
META_COLS = {'filename', 'tier', 'lang', 'chapter_idx', 'window_size', 'window_idx',
             'tier_num', 'window_type', 'window_start', 'window_end'}

print("=" * 80)
print("  OMEGA — AUDIT COMPLET EN (P0.1 + P0.2 + P0.3 + P0.4)")
print("  Replication des protocoles FR sur lang=='en'")
print("=" * 80)

# ============================================================
# LOAD DATA
# ============================================================
print("\n[LOAD] Reading MASTER_RAW_WINDOWS.csv...")
t0 = time.time()
df = pd.read_csv(CSV_PATH)
print(f"  Total rows: {len(df)} in {time.time()-t0:.1f}s")

df_en = df[(df['lang'] == 'en') & (df['tier'].isin(['S', 'A', 'B', 'C']))].copy()
df_en['tier_num'] = df_en['tier'].map(TIER_MAP)
print(f"  EN windows (S/A/B/C): {len(df_en)}")
print(f"  Tier distribution: {dict(df_en['tier'].value_counts())}")
print(f"  Window sizes: {dict(df_en['window_size'].value_counts())}")

# Determine feature columns
feature_cols = [c for c in df_en.columns if c not in META_COLS
                and df_en[c].dtype in ['float64', 'int64', 'float32', 'int32']
                and c != 'tier_num' and c != 'p_rel']
print(f"  Feature columns: {len(feature_cols)}")

# ════════════════════════════════════════════════════════════════════════════════
# P0.1 — ANGOSTURA EN
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  P0.1 — ANGOSTURA EN (RF + Permutation Importance, 500w)")
print("=" * 80)

df500 = df_en[df_en['window_size'] == '500'].copy()
print(f"\n  EN 500w windows: {len(df500)}")
print(f"  Tier distribution: {dict(df500['tier'].value_counts())}")

X_500 = df500[feature_cols].fillna(0).values
y_500 = df500['tier_num'].values
n_500 = len(df500)

# Random Forest
print("\n  [RF] Training Random Forest (200 trees, max_depth=10)...")
t0 = time.time()
rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
rf.fit(X_500, y_500)
print(f"  Trained in {time.time()-t0:.1f}s")

# MDI
mdi_imp = list(zip(feature_cols, rf.feature_importances_))
mdi_imp.sort(key=lambda x: -x[1])

print(f"\n  {'Feature':<35} {'MDI':>8}")
print("  " + "-" * 45)
for feat, imp in mdi_imp[:15]:
    print(f"  {feat:<35} {imp:.4f}")

# Cross-validation
print("\n  [CV] 5-fold cross-validation...")
cv_scores = cross_val_score(rf, X_500, y_500, cv=5, scoring='r2', n_jobs=-1)
print(f"  R2 = {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

# Permutation importance (subsample)
print("\n  [PERM] Permutation importance (subsample 100K max)...")
np.random.seed(42)
sample_n = min(100000, n_500)
idx = np.random.choice(n_500, sample_n, replace=False)
X_s, y_s = X_500[idx], y_500[idx]

rf_s = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
rf_s.fit(X_s, y_s)

t0 = time.time()
perm = permutation_importance(rf_s, X_s, y_s, n_repeats=10, random_state=42, n_jobs=-1)
print(f"  Computed in {time.time()-t0:.1f}s")

perm_imp = list(zip(feature_cols, perm.importances_mean, perm.importances_std))
perm_imp.sort(key=lambda x: -x[1])

print(f"\n  {'Rank':>4} {'Feature':<35} {'Perm':>8} {'+-':>8}")
print("  " + "-" * 58)
for rank, (feat, mean, std) in enumerate(perm_imp[:15], 1):
    print(f"  {rank:4d} {feat:<35} {mean:.4f}  {std:.4f}")

# Save P0.1
angostura_en = {
    'n_windows': n_500,
    'n_features': len(feature_cols),
    'features': feature_cols,
    'tier_distribution': {k: int(v) for k, v in df500['tier'].value_counts().items()},
    'rf_r2_cv_mean': round(float(cv_scores.mean()), 4),
    'rf_r2_cv_std': round(float(cv_scores.std()), 4),
    'rf_importance_mdi': {feat: round(float(imp), 6) for feat, imp in mdi_imp},
    'permutation_importance': {
        feat: {'mean': round(float(m), 6), 'std': round(float(s), 6)}
        for feat, m, s in perm_imp
    },
    'top20_permutation': [
        {'rank': i+1, 'feature': feat, 'importance': round(float(m), 6), 'std': round(float(s), 6)}
        for i, (feat, m, s) in enumerate(perm_imp[:20])
    ],
}

with open(f"{OUT_DIR}/ANGOSTURA_EN.json", 'w', encoding='utf-8') as f:
    json.dump(angostura_en, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT_DIR}/ANGOSTURA_EN.json")

# ════════════════════════════════════════════════════════════════════════════════
# P0.2 — HIERARCHIE MULTI-ECHELLE EN
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  P0.2 — HIERARCHIE MULTI-ECHELLE EN")
print("=" * 80)

SIZES = ['200', '500', '1000', '2000', 'full']
hierarchy_en = {}

for size_label in SIZES:
    dfs = df_en[df_en['window_size'] == size_label]
    n = len(dfs)
    print(f"\n  --- {size_label}w: {n} windows ---")

    if n < 500:
        print(f"  SKIP: too few ({n})")
        continue

    X = dfs[feature_cols].fillna(0).values
    y = dfs['tier_num'].values
    tier_dist = {k: int(v) for k, v in dfs['tier'].value_counts().items()}

    # RF + CV
    rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    cv = cross_val_score(rf, X, y, cv=5, scoring='r2', n_jobs=-1)
    r2_mean = float(cv.mean())
    r2_std = float(cv.std())
    print(f"  R2 CV: {r2_mean:.4f} +/- {r2_std:.4f}")

    rf.fit(X, y)

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

    print(f"  {'Rank':>4} {'Feature':<30} {'Perm':>10}")
    for rank, (feat, imp, std) in enumerate(perm_list[:5], 1):
        print(f"  {rank:4d} {feat:<30} {imp:.4f}")

    hierarchy_en[size_label] = {
        'n_windows': n,
        'tier_distribution': tier_dist,
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

# Comparative table
print(f"\n  TABLEAU COMPARATIF TOP 5 x 5 TAILLES (EN)")
available = [s for s in SIZES if s in hierarchy_en]
print(f"\n  {'Rang':>4}", end="")
for sl in available:
    print(f" | {sl+'w':>22}", end="")
print()
print("  " + "-" * (4 + 25 * len(available)))
for rank in range(1, 6):
    print(f"  {rank:4d}", end="")
    for sl in available:
        top = hierarchy_en[sl]['top15_permutation']
        if rank <= len(top):
            feat = top[rank-1]['feature'][:16]
            imp = top[rank-1]['importance']
            print(f" | {feat:>14} {imp:.3f}", end="")
        else:
            print(f" | {'N/A':>22}", end="")
    print()

with open(f"{OUT_DIR}/HIERARCHY_EN.json", 'w', encoding='utf-8') as f:
    json.dump(hierarchy_en, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT_DIR}/HIERARCHY_EN.json")

# ════════════════════════════════════════════════════════════════════════════════
# P0.3 — INTER-RELATIONS EN
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  P0.3 — INTER-RELATIONS EN (500w)")
print("=" * 80)

# Use df500 (EN, 500w)
drivers = ['semicolon_count', 'dash_count', 'excl_count', 'dialogue_ratio', 'colon_count',
           'ellipsis_count', 'std_sent_len', 'f1a_rhythm_variance', 'sub_per_sentence',
           'f16a_bigram_rarity', 'quest_count', 'longest_sent_words', 'f9a_contradiction_rate']

extended = drivers + ['f26b_long_sent_rate', 'mean_sent_len', 'cv_sent', 'knife_rate',
                      'ratio_alt', 'f17_knife_count', 'f29d_ttr_score', 'f19a_approx_entropy',
                      'f35c_hook_score', 'f36c_cliff_score', 'f24c_contrast_delta']
extended = [f for f in extended if f in df500.columns]
print(f"  Features: {len(extended)}")

X_ext = df500[extended].fillna(0)

# 1. Spearman correlations
print("\n  1. TOP CORRELATIONS SPEARMAN")
corr, _ = spearmanr(X_ext)
corr_df = pd.DataFrame(corr, index=extended, columns=extended)

pairs = []
for i in range(len(extended)):
    for j in range(i+1, len(extended)):
        pairs.append((extended[i], extended[j], corr_df.iloc[i, j]))

pairs.sort(key=lambda x: abs(x[2]), reverse=True)

print(f"\n  {'Feature A':30s} {'Feature B':30s} {'rho':>8s}")
print("  " + "-" * 70)
for a, b, r in pairs[:25]:
    print(f"  {a:30s} {b:30s} {r:+.3f}")

# 2. Elasticity matrix
print("\n  2. MATRICE D'ELASTICITE")
means = X_ext.mean()
stds = X_ext.std().replace(0, 1)
Xz = (X_ext - means) / stds

top5_drivers = ['semicolon_count', 'dash_count', 'excl_count', 'dialogue_ratio', 'f1a_rhythm_variance']
targets = ['f26b_long_sent_rate', 'mean_sent_len', 'cv_sent', 'knife_rate', 'ratio_alt',
           'sub_per_sentence', 'f17_knife_count', 'f29d_ttr_score', 'f24c_contrast_delta',
           'f35c_hook_score', 'f36c_cliff_score', 'std_sent_len', 'longest_sent_words']

elasticity = {}
print(f"\n  {'Target':30s}", end="")
for d in top5_drivers:
    print(f" {d[:12]:>14s}", end="")
print()
print("  " + "-" * (30 + 15 * len(top5_drivers)))

for t in targets:
    if t not in Xz.columns:
        continue
    yv = Xz[t].values
    row = {}
    print(f"  {t:30s}", end="")
    for d in top5_drivers:
        if d not in Xz.columns or d == t:
            print(f" {'---':>14s}", end="")
            continue
        x = Xz[d].values
        lr = LinearRegression().fit(x.reshape(-1, 1), yv)
        beta = lr.coef_[0]
        row[d] = round(float(beta), 3)
        sign = "+" if beta > 0 else ""
        print(f" {sign}{beta:>13.3f}", end="")
    elasticity[t] = row
    print()

# 3. Interaction pairs
print("\n  3. INTERACTIONS MULTIPLICATIVES")
y_tier = df500['tier_num'].values

interactions = []
for i, f1 in enumerate(drivers[:10]):
    for f2 in drivers[i+1:10]:
        if f1 not in Xz.columns or f2 not in Xz.columns:
            continue
        x1 = Xz[f1].values
        x2 = Xz[f2].values

        X_add = np.column_stack([x1, x2])
        lr_add = LinearRegression().fit(X_add, y_tier)
        r2_add = lr_add.score(X_add, y_tier)

        X_int = np.column_stack([x1, x2, x1 * x2])
        lr_int = LinearRegression().fit(X_int, y_tier)
        r2_int = lr_int.score(X_int, y_tier)

        delta = r2_int - r2_add
        if delta > 0.001:
            interactions.append({
                'f1': f1, 'f2': f2,
                'r2_add': round(r2_add, 4),
                'r2_interaction': round(r2_int, 4),
                'delta_r2': round(delta, 4),
                'interaction_coef': round(float(lr_int.coef_[2]), 4),
            })

interactions.sort(key=lambda x: x['delta_r2'], reverse=True)
print(f"\n  {'Feature 1':25s} {'Feature 2':25s} {'R2 add':>8s} {'R2 int':>8s} {'delta':>8s} {'coef':>8s}")
print("  " + "-" * 90)
for ix in interactions[:15]:
    print(f"  {ix['f1']:25s} {ix['f2']:25s} {ix['r2_add']:8.4f} {ix['r2_interaction']:8.4f} {ix['delta_r2']:8.4f} {ix['interaction_coef']:+8.4f}")

# 4. Causal chains
print("\n  4. CHAINES CAUSALES (X -> M -> Tier)")
mediators_list = ['f26b_long_sent_rate', 'mean_sent_len', 'cv_sent', 'ratio_alt', 'sub_per_sentence']
chains = []

for source in drivers[:7]:
    for med in mediators_list:
        if source == med or source not in df500.columns or med not in df500.columns:
            continue
        x = df500[source].fillna(0).values.reshape(-1, 1)
        m = df500[med].fillna(0).values
        y = y_tier

        lr = LinearRegression().fit(x, y)
        c = lr.coef_[0]

        lr = LinearRegression().fit(x, m)
        a = lr.coef_[0]

        xm = np.column_stack([x, m])
        lr = LinearRegression().fit(xm, y)
        c_prime = lr.coef_[0]
        b = lr.coef_[1]

        indirect = a * b
        if abs(c) > 0.0001:
            med_pct = abs(indirect / c) * 100
        else:
            med_pct = 0

        if med_pct > 15:
            chains.append({
                'source': source,
                'mediator': med,
                'total_effect': round(float(c), 5),
                'indirect_via_med': round(float(indirect), 5),
                'direct_effect': round(float(c_prime), 5),
                'mediation_pct': round(float(med_pct), 1),
                'direction': 'AMPLIFY' if (indirect > 0 and c > 0) or (indirect < 0 and c < 0) else 'SUPPRESS',
            })

chains.sort(key=lambda x: x['mediation_pct'], reverse=True)
print(f"\n  {'Source':20s} {'->':>3s} {'Mediator':20s} {'->':>3s} {'Tier':5s} {'Med%':>7s} {'Type':>10s}")
print("  " + "-" * 80)
for ch in chains[:20]:
    print(f"  {ch['source']:20s}  -> {ch['mediator']:20s}  -> Tier  {ch['mediation_pct']:6.1f}% {ch['direction']:>10s}")

# 5. Proportionality table (Tier S, P25->P75)
print("\n  5. TABLE DE PROPORTIONNALITE (Tier S, P25->P75)")
tier_s = df500[df500['tier'] == 'S']
proportionality = {}
for source in ['semicolon_count', 'dash_count', 'sub_per_sentence', 'f1a_rhythm_variance']:
    if source not in tier_s.columns:
        continue
    p25 = tier_s[source].quantile(0.25)
    p75 = tier_s[source].quantile(0.75)
    med = tier_s[source].median()
    low = tier_s[tier_s[source] <= med]
    high = tier_s[tier_s[source] > med]
    print(f"\n  {source}: P25={p25:.2f} -> P75={p75:.2f} (IQR={p75-p25:.2f})")

    key_targets = ['f26b_long_sent_rate', 'mean_sent_len', 'cv_sent', 'knife_rate',
                   'ratio_alt', 'f17_knife_count', 'f35c_hook_score', 'f24c_contrast_delta']
    src_props = {}
    for t in key_targets:
        if t not in df500.columns:
            continue
        low_mean = low[t].mean()
        high_mean = high[t].mean()
        delta = high_mean - low_mean
        pct = (delta / max(abs(low_mean), 0.001)) * 100
        src_props[t] = {'low_mean': round(float(low_mean), 4), 'high_mean': round(float(high_mean), 4),
                        'delta': round(float(delta), 4), 'pct_change': round(float(pct), 1)}
        arrow = "+" if delta > 0 else ""
        print(f"    {t:30s} low={low_mean:8.3f}  high={high_mean:8.3f}  delta={arrow}{delta:.3f} ({arrow}{pct:.1f}%)")
    proportionality[source] = src_props

# Save P0.3
interrelation_en = {
    'n_windows': len(df500),
    'top_correlations': [{'a': a, 'b': b, 'rho': round(float(r), 4)} for a, b, r in pairs[:30]],
    'elasticity': elasticity,
    'interactions': interactions[:20],
    'causal_chains': chains[:25],
    'proportionality_tier_s': proportionality,
}

with open(f"{OUT_DIR}/INTERRELATION_EN.json", 'w', encoding='utf-8') as f:
    json.dump(interrelation_en, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT_DIR}/INTERRELATION_EN.json")

# ════════════════════════════════════════════════════════════════════════════════
# P0.4 — CONFIRMATIONS C1-C2-C3 EN
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  P0.4 — CONFIRMATIONS C1 + C2 + C3 EN")
print("=" * 80)

# --- C1: Extended sizes (3000w+, 5000w+) ---
print("\n  C1 — TAILLES ETENDUES (3000w + 5000w)")

df_full_en = df_en[df_en['window_size'] == 'full'].copy()
print(f"  Chapitres full EN: {len(df_full_en)}")

if 'words' in df_full_en.columns:
    df_3000 = df_full_en[df_full_en['words'] >= 3000].copy()
    df_5000 = df_full_en[df_full_en['words'] >= 5000].copy()
elif 'sentence_count' in df_full_en.columns and 'mean_sent_len' in df_full_en.columns:
    df_full_en['est_words'] = df_full_en['sentence_count'] * df_full_en['mean_sent_len']
    df_3000 = df_full_en[df_full_en['est_words'] >= 3000].copy()
    df_5000 = df_full_en[df_full_en['est_words'] >= 5000].copy()
else:
    df_3000 = pd.DataFrame()
    df_5000 = pd.DataFrame()

print(f"  Chapitres >= 3000w: {len(df_3000)}")
print(f"  Chapitres >= 5000w: {len(df_5000)}")

c1_results = {}
for label, dfs in [('2000', df_en[df_en['window_size'] == '2000']),
                    ('3000+', df_3000),
                    ('5000+', df_5000)]:
    if len(dfs) < 100:
        print(f"  {label}: SKIP ({len(dfs)} windows, need >= 100)")
        continue

    X = dfs[feature_cols].fillna(0)
    y = dfs['tier_num']

    n = min(50000, len(dfs))
    idx = np.random.RandomState(42).choice(len(dfs), n, replace=False)
    X_s = X.iloc[idx]
    y_s = y.iloc[idx]

    rf = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    rf.fit(X_s, y_s)

    perm = permutation_importance(rf, X_s, y_s, n_repeats=5, random_state=42, n_jobs=-1)
    perm_df = pd.DataFrame({
        'feature': feature_cols,
        'importance': perm.importances_mean,
    }).sort_values('importance', ascending=False)

    print(f"\n  {label} (n={len(dfs)}):")
    for rank, (_, row) in enumerate(perm_df.head(5).iterrows(), 1):
        print(f"    #{rank} {row['feature']:30s} {row['importance']:.4f}")

    c1_results[label] = {
        'n': len(dfs),
        'top10': [{'feature': row['feature'], 'importance': round(float(row['importance']), 6)}
                  for _, row in perm_df.head(10).iterrows()]
    }

# --- C2: Author control ---
print("\n  C2 — CONTROLE PAR AUTEUR EN")

def extract_author(fn):
    parts = fn.replace('.txt', '').split('_')
    if len(parts) >= 2:
        return '_'.join(parts[-2:])
    return fn.replace('.txt', '')

df500c = df500.copy()
df500c['author'] = df500c['filename'].apply(extract_author)

author_counts = df500c['author'].value_counts()
major_authors = author_counts[author_counts >= 200].index.tolist()
print(f"  Auteurs avec >= 200 fenetres: {len(major_authors)}")

author_ranks = {}
for author in major_authors[:25]:
    df_auth = df500c[df500c['author'] == author]
    X = df_auth[feature_cols].fillna(0)
    y = df_auth['tier_num']

    if y.nunique() < 2:
        continue

    n = min(10000, len(df_auth))
    idx = np.random.RandomState(42).choice(len(df_auth), n, replace=False)

    rf = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42, n_jobs=-1)
    rf.fit(X.iloc[idx], y.iloc[idx])

    mdi = pd.Series(rf.feature_importances_, index=feature_cols).sort_values(ascending=False)
    top3 = list(mdi.head(3).items())

    semi_rank = list(mdi.index).index('semicolon_count') + 1 if 'semicolon_count' in mdi.index else -1
    dash_rank = list(mdi.index).index('dash_count') + 1 if 'dash_count' in mdi.index else -1

    author_ranks[author] = {
        'n_windows': len(df_auth),
        'n_tiers': int(y.nunique()),
        'semicolon_rank': semi_rank,
        'dash_rank': dash_rank,
        'top3': [(f, round(float(v), 4)) for f, v in top3],
    }

print(f"\n  {'Auteur':25s} {'n':>6s} {'semi rank':>10s} {'dash rank':>10s}")
print("  " + "-" * 55)
for author, info in sorted(author_ranks.items(), key=lambda x: x[1]['semicolon_rank']):
    t3 = ', '.join([f"{f}({v:.3f})" for f, v in info['top3']])
    print(f"  {author:25s} {info['n_windows']:6d} #{info['semicolon_rank']:>8d} #{info['dash_rank']:>8d}  {t3}")

semi_top3_count = sum(1 for a in author_ranks.values() if a['semicolon_rank'] <= 3)
semi_top5_count = sum(1 for a in author_ranks.values() if a['semicolon_rank'] <= 5)
total_auth = len(author_ranks)

print(f"\n  semicolon top 3 chez {semi_top3_count}/{total_auth} auteurs ({100*semi_top3_count/max(total_auth,1):.0f}%)")
print(f"  semicolon top 5 chez {semi_top5_count}/{total_auth} auteurs ({100*semi_top5_count/max(total_auth,1):.0f}%)")

# Without top 3 semicolon authors
top_semi_authors = df500c.groupby('author')['semicolon_count'].mean().sort_values(ascending=False).head(3).index.tolist()
print(f"\n  Top 3 auteurs EN par semicolon moyen: {top_semi_authors}")

df500_sans = df500c[~df500c['author'].isin(top_semi_authors)]
print(f"  Sans ces 3 auteurs: {len(df500_sans)} fenetres (etait {len(df500c)})")

X_sans = df500_sans[feature_cols].fillna(0)
y_sans = df500_sans['tier_num']

n = min(50000, len(df500_sans))
idx = np.random.RandomState(42).choice(len(df500_sans), n, replace=False)

rf_sans = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
rf_sans.fit(X_sans.iloc[idx], y_sans.iloc[idx])

perm_sans = permutation_importance(rf_sans, X_sans.iloc[idx], y_sans.iloc[idx], n_repeats=5, random_state=42, n_jobs=-1)
perm_sans_df = pd.DataFrame({
    'feature': feature_cols,
    'importance': perm_sans.importances_mean,
}).sort_values('importance', ascending=False)

print(f"\n  TOP 5 SANS les 3 plus gros auteurs a semicolons EN:")
for rank, (_, row) in enumerate(perm_sans_df.head(5).iterrows(), 1):
    print(f"    #{rank} {row['feature']:30s} {row['importance']:.4f}")

semi_rank_sans = list(perm_sans_df['feature']).index('semicolon_count') + 1
print(f"\n  semicolon rang SANS top auteurs: #{semi_rank_sans}")

c2_results = {
    'n_major_authors': len(author_ranks),
    'semi_top3_pct': round(100 * semi_top3_count / max(total_auth, 1), 1),
    'semi_top5_pct': round(100 * semi_top5_count / max(total_auth, 1), 1),
    'top_semi_authors': top_semi_authors,
    'semi_rank_without_top_authors': semi_rank_sans,
    'author_details': author_ranks,
    'top5_without_top_authors': [
        {'rank': i+1, 'feature': row['feature'], 'importance': round(float(row['importance']), 6)}
        for i, (_, row) in enumerate(perm_sans_df.head(5).iterrows())
    ],
}

# --- C3: Interactions by size ---
print("\n  C3 — INTERACTIONS PAR TAILLE EN")

interaction_pairs_c3 = [
    ('std_sent_len', 'f1a_rhythm_variance'),
    ('semicolon_count', 'std_sent_len'),
    ('semicolon_count', 'sub_per_sentence'),
    ('semicolon_count', 'dash_count'),
]

sizes_c3 = ['200', '500', '1000', '2000']
c3_results = {}

for s in sizes_c3:
    dfs = df_en[df_en['window_size'] == s]
    if len(dfs) < 1000:
        print(f"  {s}w: SKIP ({len(dfs)} windows)")
        continue

    y = dfs['tier_num'].values
    means_c3 = {}
    stds_c3 = {}
    for f in feature_cols:
        vals = dfs[f].fillna(0).values
        means_c3[f] = vals.mean()
        stds_c3[f] = vals.std()
        if stds_c3[f] == 0:
            stds_c3[f] = 1

    size_results = {}
    for f1, f2 in interaction_pairs_c3:
        if f1 not in dfs.columns or f2 not in dfs.columns:
            continue

        x1 = (dfs[f1].fillna(0).values - means_c3[f1]) / stds_c3[f1]
        x2 = (dfs[f2].fillna(0).values - means_c3[f2]) / stds_c3[f2]

        X_add = np.column_stack([x1, x2])
        lr_add = LinearRegression().fit(X_add, y)
        r2_add = lr_add.score(X_add, y)

        X_int = np.column_stack([x1, x2, x1 * x2])
        lr_int = LinearRegression().fit(X_int, y)
        r2_int = lr_int.score(X_int, y)

        delta = r2_int - r2_add
        coef_int = lr_int.coef_[2]

        size_results[f"{f1} x {f2}"] = {
            'r2_add': round(float(r2_add), 4),
            'r2_int': round(float(r2_int), 4),
            'delta_r2': round(float(delta), 4),
            'interaction_coef': round(float(coef_int), 4),
        }

    c3_results[s] = size_results

# Display C3
print(f"\n  {'Paire':45s}", end="")
for s in sizes_c3:
    if s in c3_results:
        print(f" | {s:>14s}", end="")
print()
print("  " + "-" * (45 + 17 * len([s for s in sizes_c3 if s in c3_results])))

for pair_name in [f"{f1} x {f2}" for f1, f2 in interaction_pairs_c3]:
    print(f"  {pair_name:43s}", end="")
    for s in sizes_c3:
        if s in c3_results and pair_name in c3_results[s]:
            coef = c3_results[s][pair_name]['interaction_coef']
            delta = c3_results[s][pair_name]['delta_r2']
            print(f" | {coef:+.4f} D{delta:.3f}", end="")
        else:
            print(f" | {'N/A':>14s}", end="")
    print()

# Save P0.4
confirmation_en = {
    'c1_extended_sizes': c1_results,
    'c2_author_control': c2_results,
    'c3_interactions_by_size': c3_results,
}

with open(f"{OUT_DIR}/CONFIRMATION_EN.json", 'w', encoding='utf-8') as f:
    json.dump(confirmation_en, f, indent=2, default=str)
print(f"\n  Saved: {OUT_DIR}/CONFIRMATION_EN.json")

# ════════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  AUDIT EN COMPLET — RESUME")
print("=" * 80)

print(f"\n  P0.1 Angostura EN: {angostura_en['n_windows']} windows, R2={angostura_en['rf_r2_cv_mean']:.4f}")
top1_feat = angostura_en['top20_permutation'][0]['feature']
top1_imp = angostura_en['top20_permutation'][0]['importance']
print(f"    #1 feature: {top1_feat} ({top1_imp:.4f})")

print(f"\n  P0.2 Hierarchie EN: {len(hierarchy_en)} tailles analysees")
for sl in available:
    top = hierarchy_en[sl]['top15_permutation'][0]
    print(f"    {sl}w: #1 = {top['feature']} ({top['importance']:.4f})")

print(f"\n  P0.3 Inter-relations EN: {interrelation_en['n_windows']} windows")
print(f"    Top correlation: {interrelation_en['top_correlations'][0]['a']} x {interrelation_en['top_correlations'][0]['b']} (rho={interrelation_en['top_correlations'][0]['rho']:.3f})")

print(f"\n  P0.4 Confirmations EN:")
if c1_results:
    for label, data in c1_results.items():
        if data['top10']:
            print(f"    C1 {label}: #1 = {data['top10'][0]['feature']}")
print(f"    C2: semicolon top3 chez {c2_results['semi_top3_pct']:.0f}% auteurs, rang sans top auteurs: #{c2_results['semi_rank_without_top_authors']}")

print(f"\n  Files saved in: {OUT_DIR}/")
print("  - ANGOSTURA_EN.json")
print("  - HIERARCHY_EN.json")
print("  - INTERRELATION_EN.json")
print("  - CONFIRMATION_EN.json")

print("\n" + "=" * 80)
print("  AUDIT EN COMPLETE — ALL 4 SUB-MISSIONS DONE")
print("=" * 80)
