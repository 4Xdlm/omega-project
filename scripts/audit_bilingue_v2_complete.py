#!/usr/bin/env python3
"""
OMEGA — AUDIT BILINGUE COMPLET V2
Corpus enrichi 834 fichiers (571 anciens + 263 nouveaux EN)
Runs ALL audits: Angostura, Hierarchy, Inter-relations, C1-C2-C3, Autopsie R2

Mode: CALC PUR — 0 API
Standard: NASA-Grade L4 / DO-178C Level A
"""
import pandas as pd
import numpy as np
from scipy.stats import spearmanr, f_oneway
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.metrics import roc_auc_score, silhouette_score
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json, os, time, warnings, sys
warnings.filterwarnings('ignore')

BASE = "C:/Users/elric/omega-project"
CSV_PATH = f"{BASE}/src/scoring/data/MASTER_RAW_WINDOWS.csv"
OUT_DIR = f"{BASE}/sessions/CORPUS_V2_AUDIT"
os.makedirs(OUT_DIR, exist_ok=True)

TIER_MAP = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
META_COLS = {'filename', 'tier', 'lang', 'chapter_idx', 'window_size', 'window_idx',
             'tier_num', 'window_type', 'window_start', 'window_end', 'p_rel'}

def save_json(data, filename):
    path = os.path.join(OUT_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    print(f"  Saved: {path}")

def get_feature_cols(df):
    return [c for c in df.columns if c not in META_COLS
            and df[c].dtype in ['float64', 'int64', 'float32', 'int32']
            and c != 'tier_num']

def rf_importance(X, y, feature_names, n_trees=200, max_depth=10, seed=42, perm_repeats=10):
    """Run Random Forest + Permutation Importance. Returns sorted list of (feature, importance)."""
    rf = RandomForestRegressor(n_estimators=n_trees, max_depth=max_depth, random_state=seed, n_jobs=-1)
    rf.fit(X, y)
    r2_train = rf.score(X, y)

    cv_scores = cross_val_score(rf, X, y, cv=5, scoring='r2')
    r2_cv = float(np.mean(cv_scores))

    perm = permutation_importance(rf, X, y, n_repeats=perm_repeats, random_state=seed, n_jobs=-1)
    importances = []
    for i, feat in enumerate(feature_names):
        importances.append({
            'feature': feat,
            'perm_importance_mean': float(perm.importances_mean[i]),
            'perm_importance_std': float(perm.importances_std[i]),
            'gini_importance': float(rf.feature_importances_[i]),
        })
    importances.sort(key=lambda x: x['perm_importance_mean'], reverse=True)
    return importances, r2_train, r2_cv


# ════════════════════════════════════════════════════════════════════════════════
# LOAD DATA
# ════════════════════════════════════════════════════════════════════════════════
print("=" * 80)
print("  OMEGA — AUDIT BILINGUE COMPLET V2")
print("  Corpus 834 fichiers — FR + EN")
print("=" * 80)

print("\n[LOAD] Reading MASTER_RAW_WINDOWS.csv...")
t0 = time.time()
df = pd.read_csv(CSV_PATH)
print(f"  Total rows: {len(df):,} in {time.time()-t0:.1f}s")
print(f"  Columns: {len(df.columns)}")

# Distribution
print(f"\n  By lang: {df['lang'].value_counts().to_dict()}")
print(f"  By tier: {df['tier'].value_counts().to_dict()}")
print(f"  By window_size: {df['window_size'].value_counts().to_dict()}")
print(f"  Unique files: {df['filename'].nunique()}")

# Prepare subsets
feature_cols = get_feature_cols(df)
print(f"  Feature columns: {len(feature_cols)}")

# Clean feature cols - keep only those with > 50% non-null
valid_features = []
for c in feature_cols:
    if df[c].notna().mean() > 0.5:
        valid_features.append(c)
feature_cols = valid_features
print(f"  Valid features (>50% non-null): {len(feature_cols)}")

df['tier_num'] = df['tier'].map(TIER_MAP)

# ════════════════════════════════════════════════════════════════════════════════
# 3.1 — ANGOSTURA FR + EN
# ════════════════════════════════════════════════════════════════════════════════
for lang_code in ['fr', 'en']:
    print(f"\n{'=' * 80}")
    print(f"  3.1 ANGOSTURA — {lang_code.upper()}")
    print(f"{'=' * 80}")

    df_sub = df[(df['lang'] == lang_code) & (df['window_size'] == '500') & (df['tier'].isin(TIER_MAP))].copy()
    df_sub['tier_num'] = df_sub['tier'].map(TIER_MAP)
    print(f"  Windows: {len(df_sub)}")
    print(f"  Books: {df_sub['filename'].nunique()}")
    print(f"  Tier dist: {df_sub['tier'].value_counts().to_dict()}")

    if len(df_sub) < 100:
        print(f"  SKIP: not enough data")
        save_json({'status': 'INSUFFICIENT_DATA', 'n_windows': len(df_sub)}, f'ANGOSTURA_{lang_code.upper()}_V2.json')
        continue

    X = df_sub[feature_cols].fillna(0).values
    y = df_sub['tier_num'].values

    importances, r2_train, r2_cv = rf_importance(X, y, feature_cols)

    print(f"\n  R2 train: {r2_train:.4f}")
    print(f"  R2 CV:    {r2_cv:.4f}")
    print(f"\n  Top 20 features (permutation importance):")
    print(f"  {'Rank':>4} {'Feature':40s} {'Perm Imp':>10} {'Gini':>8}")
    print(f"  " + "-" * 66)
    for i, imp in enumerate(importances[:20]):
        print(f"  {i+1:4d} {imp['feature']:40s} {imp['perm_importance_mean']:10.4f} {imp['gini_importance']:8.4f}")

    result = {
        'lang': lang_code,
        'window_size': 500,
        'n_windows': len(df_sub),
        'n_books': int(df_sub['filename'].nunique()),
        'tier_dist': df_sub['tier'].value_counts().to_dict(),
        'r2_train': float(r2_train),
        'r2_cv': float(r2_cv),
        'top_20': importances[:20],
        'all_importances': importances,
    }
    save_json(result, f'ANGOSTURA_{lang_code.upper()}_V2.json')


# ════════════════════════════════════════════════════════════════════════════════
# 3.2 — HIERARCHY MULTI-SCALE FR + EN
# ════════════════════════════════════════════════════════════════════════════════
for lang_code in ['fr', 'en']:
    print(f"\n{'=' * 80}")
    print(f"  3.2 HIERARCHY — {lang_code.upper()}")
    print(f"{'=' * 80}")

    hierarchy_result = {'lang': lang_code, 'sizes': {}}

    for size in [200, 500, 1000, 2000, 'full']:
        size_str = str(size)
        df_sub = df[(df['lang'] == lang_code) & (df['window_size'] == size_str) & (df['tier'].isin(TIER_MAP))].copy()
        df_sub['tier_num'] = df_sub['tier'].map(TIER_MAP)

        print(f"\n  Size {size}: {len(df_sub)} windows, {df_sub['filename'].nunique()} books")

        if len(df_sub) < 50:
            hierarchy_result['sizes'][size_str] = {'status': 'INSUFFICIENT_DATA', 'n': len(df_sub)}
            continue

        X = df_sub[feature_cols].fillna(0).values
        y = df_sub['tier_num'].values

        importances, r2_train, r2_cv = rf_importance(X, y, feature_cols)

        print(f"  R2 train: {r2_train:.4f}, R2 CV: {r2_cv:.4f}")
        print(f"  Top 5: {', '.join(imp['feature'] for imp in importances[:5])}")

        hierarchy_result['sizes'][size_str] = {
            'n_windows': len(df_sub),
            'n_books': int(df_sub['filename'].nunique()),
            'r2_train': float(r2_train),
            'r2_cv': float(r2_cv),
            'top_15': importances[:15],
        }

    save_json(hierarchy_result, f'HIERARCHY_{lang_code.upper()}_V2.json')


# ════════════════════════════════════════════════════════════════════════════════
# 3.3 — INTER-RELATIONS FR + EN
# ════════════════════════════════════════════════════════════════════════════════
for lang_code in ['fr', 'en']:
    print(f"\n{'=' * 80}")
    print(f"  3.3 INTER-RELATIONS — {lang_code.upper()}")
    print(f"{'=' * 80}")

    df_sub = df[(df['lang'] == lang_code) & (df['window_size'] == '500') & (df['tier'].isin(TIER_MAP))].copy()
    df_sub['tier_num'] = df_sub['tier'].map(TIER_MAP)

    if len(df_sub) < 100:
        save_json({'status': 'INSUFFICIENT_DATA'}, f'INTERRELATION_{lang_code.upper()}_V2.json')
        continue

    # Select top features (all available numeric ones)
    available = [f for f in feature_cols if f in df_sub.columns and df_sub[f].notna().mean() > 0.3]
    X = df_sub[available].fillna(0)

    # 1. Spearman correlations top 25
    print(f"\n  1. Spearman correlations (top 25 pairs)...")
    corr_matrix, _ = spearmanr(X)
    corr_df = pd.DataFrame(corr_matrix, index=available, columns=available)

    pairs = []
    for i in range(len(available)):
        for j in range(i+1, len(available)):
            pairs.append((available[i], available[j], float(corr_df.iloc[i,j])))
    pairs.sort(key=lambda x: abs(x[2]), reverse=True)
    top_25_corr = [{'a': a, 'b': b, 'rho': r} for a, b, r in pairs[:25]]

    for p in top_25_corr[:10]:
        print(f"    {p['a']:35s} x {p['b']:35s} rho={p['rho']:+.3f}")

    # 2. Elasticity: top 5 drivers x 13 targets
    print(f"\n  2. Elasticity (top 5 drivers x targets)...")
    # Get top 5 by correlation with tier_num
    tier_corrs = []
    for feat in available:
        rho, _ = spearmanr(df_sub[feat].fillna(0), df_sub['tier_num'])
        tier_corrs.append((feat, abs(rho), rho))
    tier_corrs.sort(key=lambda x: x[1], reverse=True)
    top5_drivers = [t[0] for t in tier_corrs[:5]]
    targets = [t[0] for t in tier_corrs[:13]]

    elasticity = {}
    for driver in top5_drivers:
        driver_std = X[driver].std()
        if driver_std < 1e-10:
            continue
        elast = {}
        for target in targets:
            if target == driver:
                continue
            target_std = X[target].std()
            if target_std < 1e-10:
                continue
            rho, _ = spearmanr(X[driver], X[target])
            # Elasticity: beta from standardized regression
            lr = LinearRegression()
            x_std = ((X[driver] - X[driver].mean()) / driver_std).values.reshape(-1, 1)
            y_std = ((X[target] - X[target].mean()) / target_std).values
            lr.fit(x_std, y_std)
            elast[target] = {'rho': float(rho), 'beta_std': float(lr.coef_[0])}
        elasticity[driver] = elast

    # 3. Multiplicative interactions top 15
    print(f"\n  3. Multiplicative interactions (top 15)...")
    interactions = []
    test_feats = [t[0] for t in tier_corrs[:15]]
    for i in range(len(test_feats)):
        for j in range(i+1, len(test_feats)):
            f1, f2 = test_feats[i], test_feats[j]
            inter = X[f1] * X[f2]
            rho, _ = spearmanr(inter, df_sub['tier_num'])
            # Compare to individual
            rho1, _ = spearmanr(X[f1], df_sub['tier_num'])
            rho2, _ = spearmanr(X[f2], df_sub['tier_num'])
            gain = abs(rho) - max(abs(rho1), abs(rho2))
            interactions.append({'f1': f1, 'f2': f2, 'rho_inter': float(rho),
                                'rho_f1': float(rho1), 'rho_f2': float(rho2), 'gain': float(gain)})
    interactions.sort(key=lambda x: x['gain'], reverse=True)

    for ix in interactions[:5]:
        print(f"    {ix['f1']:30s} x {ix['f2']:30s} gain={ix['gain']:+.4f}")

    # 4. Causal chains top 20
    print(f"\n  4. Causal chains (top 20)...")
    chains = []
    for i in range(len(test_feats)):
        for j in range(len(test_feats)):
            if i == j:
                continue
            for k in range(len(test_feats)):
                if k == i or k == j:
                    continue
                f1, f2, f3 = test_feats[i], test_feats[j], test_feats[k]
                r12, _ = spearmanr(X[f1], X[f2])
                r23, _ = spearmanr(X[f2], X[f3])
                r13, _ = spearmanr(X[f1], X[f3])
                # Chain strength = r12 * r23, residual = r13 - r12*r23
                chain_str = abs(r12 * r23)
                mediation = abs(r13) - abs(r13 - r12 * r23)
                if chain_str > 0.1:
                    chains.append({
                        'path': f"{f1} -> {f2} -> {f3}",
                        'r12': float(r12), 'r23': float(r23), 'r13': float(r13),
                        'chain_strength': float(chain_str),
                        'mediation': float(mediation),
                    })
    chains.sort(key=lambda x: x['chain_strength'], reverse=True)
    # Deduplicate (keep best per unique set of 3 features)
    seen = set()
    unique_chains = []
    for c in chains:
        parts = tuple(sorted(c['path'].replace(' -> ', ',').split(',')))
        if parts not in seen:
            seen.add(parts)
            unique_chains.append(c)
    chains = unique_chains[:20]

    # 5. Proportionality P25->P75 Tier S
    print(f"\n  5. Proportionality P25->P75 Tier S...")
    df_s = df_sub[df_sub['tier'] == 'S']
    proportionality = {}
    if len(df_s) > 20:
        for feat in test_feats[:15]:
            vals = df_s[feat].dropna()
            if len(vals) < 10:
                continue
            p25 = float(vals.quantile(0.25))
            p75 = float(vals.quantile(0.75))
            median = float(vals.median())
            iqr = p75 - p25
            proportionality[feat] = {
                'p25': p25, 'median': median, 'p75': p75, 'iqr': iqr,
                'ratio_p75_p25': float(p75 / p25) if p25 != 0 else None,
            }

    result = {
        'lang': lang_code,
        'n_windows': len(df_sub),
        'top_25_correlations': top_25_corr,
        'elasticity': elasticity,
        'top_15_interactions': interactions[:15],
        'top_20_causal_chains': chains[:20],
        'proportionality_tier_s': proportionality,
    }
    save_json(result, f'INTERRELATION_{lang_code.upper()}_V2.json')


# ════════════════════════════════════════════════════════════════════════════════
# 3.4 — CONFIRMATIONS C1-C2-C3 FR + EN
# ════════════════════════════════════════════════════════════════════════════════
for lang_code in ['fr', 'en']:
    print(f"\n{'=' * 80}")
    print(f"  3.4 CONFIRMATIONS C1-C2-C3 — {lang_code.upper()}")
    print(f"{'=' * 80}")

    df_sub = df[(df['lang'] == lang_code) & (df['tier'].isin(TIER_MAP))].copy()
    df_sub['tier_num'] = df_sub['tier'].map(TIER_MAP)

    if len(df_sub) < 100:
        save_json({'status': 'INSUFFICIENT_DATA'}, f'CONFIRMATION_{lang_code.upper()}_V2.json')
        continue

    confirmation = {}

    # C1: chapters >= 3000w and >= 5000w
    print(f"\n  C1 — Extended sizes (full chapters >= 3000w / >= 5000w)...")
    df_full = df_sub[df_sub['window_size'] == 'full'].copy()
    # Estimate word count from window_end - window_start or from text length
    # Use all 'full' windows and check if we have enough

    c1_results = {}
    for min_words_label, min_w in [('3000w', 3000), ('5000w', 5000)]:
        # We'll use full windows and filter by word count if available
        # Check if window_end column can serve as proxy
        if 'window_end' in df_full.columns:
            df_big = df_full[pd.to_numeric(df_full['window_end'], errors='coerce') >= min_w]
        else:
            df_big = df_full  # use all full chapters

        if len(df_big) < 30:
            c1_results[min_words_label] = {'status': 'INSUFFICIENT_DATA', 'n': len(df_big)}
            print(f"    {min_words_label}: only {len(df_big)} windows — skipped")
            continue

        X_c1 = df_big[feature_cols].fillna(0).values
        y_c1 = df_big['tier_num'].values
        imp, r2t, r2cv = rf_importance(X_c1, y_c1, feature_cols, n_trees=100, max_depth=8)
        c1_results[min_words_label] = {
            'n_windows': len(df_big),
            'r2_train': float(r2t),
            'r2_cv': float(r2cv),
            'top_10': imp[:10],
        }
        print(f"    {min_words_label}: {len(df_big)} windows, R2_cv={r2cv:.4f}, top={imp[0]['feature']}")

    confirmation['C1'] = c1_results

    # C2: Remove top 3 semicolon authors
    print(f"\n  C2 — Without top 3 semicolon authors...")
    df_500 = df_sub[df_sub['window_size'] == '500'].copy()

    if 'semicolon_count' in df_500.columns and len(df_500) > 100:
        # Find top 3 authors by mean semicolon
        df_500['author'] = df_500['filename'].apply(lambda x: '_'.join(x.replace('.txt','').split('_')[:-1]) if '_' in x else x.replace('.txt',''))
        author_semi = df_500.groupby('author')['semicolon_count'].mean().sort_values(ascending=False)
        top3_authors = list(author_semi.index[:3])
        print(f"    Top 3 semicolon authors: {top3_authors}")

        df_no_top3 = df_500[~df_500['author'].isin(top3_authors)]
        print(f"    Windows after removal: {len(df_no_top3)}")

        if len(df_no_top3) > 50:
            X_c2 = df_no_top3[feature_cols].fillna(0).values
            y_c2 = df_no_top3['tier_num'].values
            imp_c2, r2t_c2, r2cv_c2 = rf_importance(X_c2, y_c2, feature_cols, n_trees=100, max_depth=8)

            # Also get semicolon rank
            semi_rank = next((i+1 for i, x in enumerate(imp_c2) if x['feature'] == 'semicolon_count'), None)

            confirmation['C2'] = {
                'top3_removed': top3_authors,
                'n_windows_before': len(df_500),
                'n_windows_after': len(df_no_top3),
                'r2_cv': float(r2cv_c2),
                'semicolon_rank': semi_rank,
                'top_10': imp_c2[:10],
            }
            print(f"    R2_cv={r2cv_c2:.4f}, semicolon rank={semi_rank}")
        else:
            confirmation['C2'] = {'status': 'INSUFFICIENT_DATA'}
    else:
        confirmation['C2'] = {'status': 'NO_SEMICOLON_FEATURE'}

    # C3: Interaction coefficients
    print(f"\n  C3 — Interaction coefficients...")
    c3_results = {}

    if len(df_500) > 100:
        # std × f1a interaction by size
        for size in [200, 500, 1000, 2000]:
            df_sz = df_sub[df_sub['window_size'] == str(size)]
            if len(df_sz) < 50:
                continue
            if 'std_sent_len' in df_sz.columns and 'f1a_rhythm_variance' in df_sz.columns:
                inter = df_sz['std_sent_len'].fillna(0) * df_sz['f1a_rhythm_variance'].fillna(0)
                rho, _ = spearmanr(inter, df_sz['tier_num'])
                c3_results[f'std_x_f1a_{size}w'] = {'rho': float(rho), 'n': len(df_sz)}

        # semicolon × dash
        if 'semicolon_count' in df_500.columns and 'dash_count' in df_500.columns:
            inter_sd = df_500['semicolon_count'].fillna(0) * df_500['dash_count'].fillna(0)
            rho_sd, _ = spearmanr(inter_sd, df_500['tier_num'])
            c3_results['semicolon_x_dash_500w'] = {'rho': float(rho_sd), 'n': len(df_500)}

    confirmation['C3'] = c3_results

    save_json(confirmation, f'CONFIRMATION_{lang_code.upper()}_V2.json')


# ════════════════════════════════════════════════════════════════════════════════
# 3.5 — AUTOPSIE R2 EN (CORPUS REEQUILIBRE)
# ════════════════════════════════════════════════════════════════════════════════
print(f"\n{'=' * 80}")
print(f"  3.5 AUTOPSIE R2 EN — CORPUS REEQUILIBRE")
print(f"{'=' * 80}")

autopsie = {}

df_en = df[df['lang'] == 'en'].copy()
df_fr = df[df['lang'] == 'fr'].copy()
df_en_500 = df_en[(df_en['window_size'] == '500')].copy()
df_fr_500 = df_fr[(df_fr['window_size'] == '500') & (df_fr['tier'].isin(TIER_MAP))].copy()

# ACTION 1: Audit tiering EN
print(f"\n  ACTION 1 — Tiering distribution EN")
tier_audit = {}
for tier in ['S', 'A', 'B', 'C', 'D']:
    dt = df_en_500[df_en_500['tier'] == tier]
    n_books = dt['filename'].nunique()
    n_windows = len(dt)
    tier_audit[tier] = {'n_books': int(n_books), 'n_windows': int(n_windows)}
    print(f"    Tier {tier}: {n_books} books, {n_windows} windows")
autopsie['tiering_en'] = tier_audit

# Also FR for comparison
tier_audit_fr = {}
for tier in ['S', 'A', 'B', 'C', 'D']:
    dt = df_fr_500[df_fr_500['tier'] == tier]
    tier_audit_fr[tier] = {'n_books': int(dt['filename'].nunique()), 'n_windows': int(len(dt))}
autopsie['tiering_fr'] = tier_audit_fr

# ACTION 2: R2 EN with S/A/B/C
print(f"\n  ACTION 2 — R2 EN (S/A/B/C) vs R2 FR")
df_en_sabc = df_en_500[df_en_500['tier'].isin(TIER_MAP)].copy()
df_en_sabc['tier_num'] = df_en_sabc['tier'].map(TIER_MAP)

if len(df_en_sabc) > 50:
    X_en = df_en_sabc[feature_cols].fillna(0).values
    y_en = df_en_sabc['tier_num'].values
    imp_en, r2t_en, r2cv_en = rf_importance(X_en, y_en, feature_cols)
    print(f"    EN R2 train: {r2t_en:.4f}, R2 CV: {r2cv_en:.4f}")
    print(f"    EN Top 5: {', '.join(imp['feature'] for imp in imp_en[:5])}")
    autopsie['r2_en'] = {
        'r2_train': float(r2t_en), 'r2_cv': float(r2cv_en),
        'n_windows': len(df_en_sabc), 'n_books': int(df_en_sabc['filename'].nunique()),
        'top_20': imp_en[:20],
    }
else:
    autopsie['r2_en'] = {'status': 'INSUFFICIENT_DATA'}

# FR R2 for comparison
df_fr_sabc = df_fr_500[df_fr_500['tier'].isin(TIER_MAP)].copy()
df_fr_sabc['tier_num'] = df_fr_sabc['tier'].map(TIER_MAP)

if len(df_fr_sabc) > 50:
    X_fr = df_fr_sabc[feature_cols].fillna(0).values
    y_fr = df_fr_sabc['tier_num'].values
    imp_fr, r2t_fr, r2cv_fr = rf_importance(X_fr, y_fr, feature_cols)
    print(f"    FR R2 train: {r2t_fr:.4f}, R2 CV: {r2cv_fr:.4f}")
    autopsie['r2_fr'] = {
        'r2_train': float(r2t_fr), 'r2_cv': float(r2cv_fr),
        'n_windows': len(df_fr_sabc),
        'top_20': imp_fr[:20],
    }

# ACTION 3: Cohen's d + AUC univariate FR vs EN
print(f"\n  ACTION 3 — Cohen's d + AUC univariate")
cohens_d = {}
if len(df_en_sabc) > 50 and len(df_fr_sabc) > 50:
    for feat in feature_cols:
        en_vals = df_en_sabc[feat].dropna()
        fr_vals = df_fr_sabc[feat].dropna()
        if len(en_vals) < 30 or len(fr_vals) < 30:
            continue
        # Cohen's d
        pooled_std = np.sqrt((en_vals.std()**2 + fr_vals.std()**2) / 2)
        if pooled_std > 1e-10:
            d = float((en_vals.mean() - fr_vals.mean()) / pooled_std)
        else:
            d = 0.0

        # AUC for tier discrimination within each language
        auc_en = None
        auc_fr = None
        # Binary: S vs C
        en_sc = df_en_sabc[df_en_sabc['tier'].isin(['S', 'C'])]
        fr_sc = df_fr_sabc[df_fr_sabc['tier'].isin(['S', 'C'])]

        if len(en_sc) > 20 and feat in en_sc.columns:
            y_bin = (en_sc['tier'] == 'S').astype(int)
            vals = en_sc[feat].fillna(0)
            if y_bin.nunique() == 2 and vals.std() > 1e-10:
                try:
                    auc_en = float(roc_auc_score(y_bin, vals))
                except:
                    pass

        if len(fr_sc) > 20 and feat in fr_sc.columns:
            y_bin = (fr_sc['tier'] == 'S').astype(int)
            vals = fr_sc[feat].fillna(0)
            if y_bin.nunique() == 2 and vals.std() > 1e-10:
                try:
                    auc_fr = float(roc_auc_score(y_bin, vals))
                except:
                    pass

        cohens_d[feat] = {'cohens_d': d, 'auc_en_s_vs_c': auc_en, 'auc_fr_s_vs_c': auc_fr}

    # Sort by |d|
    sorted_d = sorted(cohens_d.items(), key=lambda x: abs(x[1]['cohens_d']), reverse=True)
    print(f"    Top 10 Cohen's d (FR vs EN):")
    for feat, vals in sorted_d[:10]:
        print(f"      {feat:40s} d={vals['cohens_d']:+.3f} auc_en={vals['auc_en_s_vs_c']}, auc_fr={vals['auc_fr_s_vs_c']}")
    autopsie['cohens_d'] = {k: v for k, v in sorted_d[:30]}

# ACTION 4: Clustering K=2 on Tier S EN
print(f"\n  ACTION 4 — Clustering K=2 on Tier S EN")
df_en_s = df_en_500[df_en_500['tier'] == 'S'].copy()
print(f"    Tier S EN windows: {len(df_en_s)}")

if len(df_en_s) > 30:
    X_s = df_en_s[feature_cols].fillna(0).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_s)

    km = KMeans(n_clusters=2, random_state=42, n_init=10)
    labels = km.fit_predict(X_scaled)
    sil = float(silhouette_score(X_scaled, labels))

    # R2 per cluster
    cluster_r2 = {}
    df_en_s_copy = df_en_s.copy()
    df_en_s_copy['cluster'] = labels
    for cl in [0, 1]:
        df_cl = df_en_s_copy[df_en_s_copy['cluster'] == cl]
        books = list(df_cl['filename'].unique()[:10])
        cluster_r2[cl] = {
            'n_windows': len(df_cl),
            'n_books': int(df_cl['filename'].nunique()),
            'example_books': books,
        }
        print(f"    Cluster {cl}: {len(df_cl)} windows, {df_cl['filename'].nunique()} books")

    autopsie['clustering_tier_s_en'] = {
        'silhouette': sil,
        'clusters': cluster_r2,
        'bimodality_detected': sil > 0.15,
    }
    print(f"    Silhouette: {sil:.4f}, Bimodal: {sil > 0.15}")

# ACTION 5: ANOVA F-stats FR vs EN
print(f"\n  ACTION 5 — ANOVA F-stats FR vs EN")
anova_results = {}
if len(df_en_sabc) > 50 and len(df_fr_sabc) > 50:
    for feat in feature_cols:
        en_vals = df_en_sabc[feat].dropna().values
        fr_vals = df_fr_sabc[feat].dropna().values
        if len(en_vals) < 30 or len(fr_vals) < 30:
            continue
        try:
            f_stat, p_val = f_oneway(en_vals, fr_vals)
            anova_results[feat] = {'F': float(f_stat), 'p': float(p_val)}
        except:
            pass

    sorted_anova = sorted(anova_results.items(), key=lambda x: x[1]['F'], reverse=True)
    print(f"    Top 10 ANOVA (highest F-stat):")
    for feat, vals in sorted_anova[:10]:
        sig = "***" if vals['p'] < 0.001 else "**" if vals['p'] < 0.01 else "*" if vals['p'] < 0.05 else "ns"
        print(f"      {feat:40s} F={vals['F']:10.1f} p={vals['p']:.2e} {sig}")
    autopsie['anova_fr_vs_en'] = {k: v for k, v in sorted_anova[:30]}

# Final R2 comparison
print(f"\n  === R2 COMPARISON ===")
r2_en_old = 0.020  # from previous autopsie
r2_en_new = autopsie.get('r2_en', {}).get('r2_cv', None)
r2_fr = autopsie.get('r2_fr', {}).get('r2_cv', None)

autopsie['r2_comparison'] = {
    'r2_en_old_corpus': r2_en_old,
    'r2_en_new_corpus': r2_en_new,
    'r2_fr': r2_fr,
    'improvement': float(r2_en_new - r2_en_old) if r2_en_new else None,
}
print(f"    R2 EN (old corpus):  {r2_en_old:.4f}")
print(f"    R2 EN (new corpus):  {r2_en_new}")
print(f"    R2 FR:               {r2_fr}")
if r2_en_new:
    print(f"    Improvement:         {r2_en_new - r2_en_old:+.4f}")

save_json(autopsie, 'AUTOPSIE_R2_EN_V2.json')

# ════════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ════════════════════════════════════════════════════════════════════════════════
print(f"\n{'=' * 80}")
print(f"  AUDIT BILINGUE V2 COMPLETE")
print(f"{'=' * 80}")
print(f"  Total rows in CSV:      {len(df):,}")
print(f"  Unique files:           {df['filename'].nunique()}")
print(f"  FR windows:             {len(df_fr):,}")
print(f"  EN windows:             {len(df_en):,}")
print(f"  Files generated in:     {OUT_DIR}")
print(f"  Elapsed:                {time.time() - t0:.0f}s")
