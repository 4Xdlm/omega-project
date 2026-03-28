#!/usr/bin/env python3
"""
OMEGA — AUTOPSIE DU TROU NOIR ANGLO-SAXON (R2 = 0.020)
5 Actions diagnostiques pour comprendre l'effondrement du R2 EN
Mode: CALC PUR — 0 API
"""
import pandas as pd
import numpy as np
from scipy.stats import f_oneway
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score, silhouette_score
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
import json, os, time, warnings
warnings.filterwarnings('ignore')

BASE = "C:/Users/elric/omega-project"
CSV_PATH = f"{BASE}/src/scoring/data/MASTER_RAW_WINDOWS.csv"
OUT_DIR = f"{BASE}/sessions/AUTOPSIE_R2_EN"
os.makedirs(OUT_DIR, exist_ok=True)

TIER_MAP = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
META_COLS = {'filename', 'tier', 'lang', 'chapter_idx', 'window_size', 'window_idx',
             'tier_num', 'window_type', 'window_start', 'window_end', 'p_rel'}

def extract_author(fn):
    parts = fn.replace('.txt', '').split('_')
    if len(parts) >= 2:
        return '_'.join(parts[-2:])
    return fn.replace('.txt', '')

print("=" * 80)
print("  OMEGA — AUTOPSIE DU TROU NOIR ANGLO-SAXON (R2 = 0.020)")
print("=" * 80)

# === LOAD ===
print("\n[LOAD] Reading CSV...")
t0 = time.time()
df = pd.read_csv(CSV_PATH)
print(f"  Total: {len(df)} rows in {time.time()-t0:.1f}s")

df_en = df[(df['lang'] == 'en')].copy()
df_fr = df[(df['lang'] == 'fr')].copy()
print(f"  EN total: {len(df_en)}, FR total: {len(df_fr)}")

# Feature columns
feature_cols = [c for c in df.columns if c not in META_COLS
                and df[c].dtype in ['float64', 'int64', 'float32', 'int32']
                and c != 'tier_num']
print(f"  Features: {len(feature_cols)}")

results = {}

# ════════════════════════════════════════════════════════════════════════════════
# ACTION 1 — AUDIT DU TIERING EN
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  ACTION 1 — AUDIT DU TIERING EN (Metadata Check)")
print("=" * 80)

df_en_500 = df_en[df_en['window_size'] == '500'].copy()
df_fr_500 = df_fr[(df_fr['window_size'] == '500') & (df_fr['tier'].isin(TIER_MAP))].copy()

# Books per tier
print("\n  LIVRES ET FENETRES PAR TIER (EN, 500w)")
print(f"  {'Tier':>4} {'Livres':>8} {'Fenetres':>10} {'Exemples'}")
print("  " + "-" * 90)

tier_audit = {}
for tier in ['S', 'A', 'B', 'C', 'D']:
    dt = df_en_500[df_en_500['tier'] == tier]
    books = dt['filename'].unique()
    n_books = len(books)
    n_windows = len(dt)
    examples = list(books[:8])
    tier_audit[tier] = {
        'n_books': n_books,
        'n_windows': n_windows,
        'examples': [str(b) for b in examples],
    }
    print(f"  {tier:>4} {n_books:>8} {n_windows:>10}   {', '.join(str(b)[:40] for b in examples[:5])}")

# Tier distribution comparison
print(f"\n  DISTRIBUTION COMPARATIVE FR vs EN (500w, S/A/B/C)")
for tier in ['S', 'A', 'B', 'C']:
    n_fr = len(df_fr_500[df_fr_500['tier'] == tier])
    n_en = len(df_en_500[df_en_500['tier'] == tier])
    pct_fr = 100 * n_fr / max(len(df_fr_500[df_fr_500['tier'].isin(TIER_MAP)]), 1)
    pct_en = 100 * n_en / max(len(df_en_500[df_en_500['tier'].isin(TIER_MAP)]), 1)
    print(f"  {tier}: FR {n_fr:>7} ({pct_fr:.1f}%)  |  EN {n_en:>7} ({pct_en:.1f}%)")

# Check for D tier in EN
n_d_en = len(df_en_500[df_en_500['tier'] == 'D'])
print(f"\n  Tier D EN: {n_d_en} fenetres ({100*n_d_en/max(len(df_en_500),1):.1f}%)")

results['action1_tiering'] = tier_audit

# ════════════════════════════════════════════════════════════════════════════════
# ACTION 2 — SEPARATION DE CLASSES UNIVARIEE
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  ACTION 2 — SEPARATION DE CLASSES UNIVARIEE (Cohen's d + AUC)")
print("=" * 80)

# EN
df_en_sabc = df_en_500[df_en_500['tier'].isin(TIER_MAP)].copy()
df_en_sabc['tier_num'] = df_en_sabc['tier'].map(TIER_MAP)

# FR
df_fr_sabc = df_fr_500.copy()
df_fr_sabc['tier_num'] = df_fr_sabc['tier'].map(TIER_MAP)

def compute_separation(dfs, label):
    s = dfs[dfs['tier'] == 'S']
    c = dfs[dfs['tier'] == 'C']
    y_sc = np.concatenate([np.ones(len(s)), np.zeros(len(c))])

    sep_results = []
    for feat in feature_cols:
        vals_s = s[feat].fillna(0).values
        vals_c = c[feat].fillna(0).values

        mean_s = np.mean(vals_s)
        mean_c = np.mean(vals_c)
        std_s = np.std(vals_s, ddof=1)
        std_c = np.std(vals_c, ddof=1)
        std_pooled = np.sqrt((std_s**2 + std_c**2) / 2)

        if std_pooled > 1e-10:
            cohen_d = (mean_s - mean_c) / std_pooled
        else:
            cohen_d = 0.0

        # AUC
        vals_sc = np.concatenate([vals_s, vals_c])
        try:
            auc = roc_auc_score(y_sc, vals_sc)
        except:
            auc = 0.5

        sep_results.append({
            'feature': feat,
            'mean_S': round(float(mean_s), 4),
            'mean_C': round(float(mean_c), 4),
            'cohen_d': round(float(cohen_d), 4),
            'abs_cohen_d': round(abs(float(cohen_d)), 4),
            'auc': round(float(auc), 4),
        })

    sep_results.sort(key=lambda x: -x['abs_cohen_d'])
    return sep_results

print("\n  Computing separation FR...")
sep_fr = compute_separation(df_fr_sabc, 'FR')
print("  Computing separation EN...")
sep_en = compute_separation(df_en_sabc, 'EN')

# Side-by-side top 15
print(f"\n  {'Rang':>4} | {'Feature FR':>25} {'d_FR':>7} {'AUC_FR':>7} | {'Feature EN':>25} {'d_EN':>7} {'AUC_EN':>7}")
print("  " + "-" * 95)
for i in range(15):
    fr = sep_fr[i]
    en = sep_en[i]
    print(f"  {i+1:4d} | {fr['feature']:>25} {fr['cohen_d']:+7.3f} {fr['auc']:7.3f} | {en['feature']:>25} {en['cohen_d']:+7.3f} {en['auc']:7.3f}")

# Compare same features
print(f"\n  MEMES FEATURES — cohen_d FR vs EN")
print(f"  {'Feature':>30} {'d_FR':>8} {'d_EN':>8} {'ratio':>8}")
print("  " + "-" * 58)
en_dict = {r['feature']: r for r in sep_en}
for fr_r in sep_fr[:15]:
    feat = fr_r['feature']
    en_r = en_dict.get(feat, {'cohen_d': 0, 'auc': 0.5})
    ratio = abs(fr_r['cohen_d']) / max(abs(en_r['cohen_d']), 0.001)
    print(f"  {feat:>30} {fr_r['cohen_d']:+8.3f} {en_r['cohen_d']:+8.3f} {ratio:8.1f}x")

# Summary
avg_abs_d_fr = np.mean([r['abs_cohen_d'] for r in sep_fr[:15]])
avg_abs_d_en = np.mean([r['abs_cohen_d'] for r in sep_en[:15]])
print(f"\n  Moyenne |d| top 15: FR={avg_abs_d_fr:.3f}, EN={avg_abs_d_en:.3f}, ratio={avg_abs_d_fr/max(avg_abs_d_en,0.001):.1f}x")

results['action2_separation'] = {
    'fr_top15': sep_fr[:15],
    'en_top15': sep_en[:15],
    'avg_abs_d_fr': round(avg_abs_d_fr, 4),
    'avg_abs_d_en': round(avg_abs_d_en, 4),
}

# ════════════════════════════════════════════════════════════════════════════════
# ACTION 3 — BIMODALITE TIER S
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  ACTION 3 — BIMODALITE INTRA-TIER S (Hemingway vs Faulkner ?)")
print("=" * 80)

cluster_feats = ['mean_sent_len', 'f1a_rhythm_variance', 'f17_knife_count',
                 'f26b_long_sent_rate', 'sub_per_sentence']

tier_s_en = df_en_sabc[df_en_sabc['tier'] == 'S'].copy()
print(f"\n  Tier S EN 500w: {len(tier_s_en)} fenetres")

X_clust = tier_s_en[cluster_feats].fillna(0).values
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_clust)

# K-Means K=2
print("\n  [K-MEANS] K=2...")
km = KMeans(n_clusters=2, random_state=42, n_init=10)
km_labels = km.fit_predict(X_scaled)

# GMM K=2
print("  [GMM] n_components=2...")
gmm = GaussianMixture(n_components=2, random_state=42)
gmm_labels = gmm.fit_predict(X_scaled)

# Silhouette scores
sil_km = silhouette_score(X_scaled, km_labels, sample_size=min(50000, len(X_scaled)), random_state=42)
sil_gmm = silhouette_score(X_scaled, gmm_labels, sample_size=min(50000, len(X_scaled)), random_state=42)
print(f"\n  Silhouette K-Means: {sil_km:.3f}")
print(f"  Silhouette GMM:     {sil_gmm:.3f}")

# Cluster profiles (K-Means)
tier_s_en['km_cluster'] = km_labels
tier_s_en['gmm_cluster'] = gmm_labels
tier_s_en['author'] = tier_s_en['filename'].apply(extract_author)

cluster_profiles = {}
for cl in [0, 1]:
    mask = tier_s_en['km_cluster'] == cl
    sub = tier_s_en[mask]
    profile = {
        'n_windows': int(mask.sum()),
        'means': {f: round(float(sub[f].mean()), 4) for f in cluster_feats},
        'top_authors': list(sub['author'].value_counts().head(5).index),
        'top_files': list(sub['filename'].value_counts().head(5).index),
    }
    cluster_profiles[f'cluster_{cl}'] = profile
    print(f"\n  CLUSTER {cl} ({profile['n_windows']} fenetres)")
    for f in cluster_feats:
        print(f"    {f:>25}: {profile['means'][f]:>10.3f}")
    print(f"    Top auteurs: {', '.join(profile['top_authors'][:5])}")

# Label clusters semantically
c0_mean_sl = cluster_profiles['cluster_0']['means']['mean_sent_len']
c1_mean_sl = cluster_profiles['cluster_1']['means']['mean_sent_len']
if c0_mean_sl < c1_mean_sl:
    short_cl, long_cl = 0, 1
else:
    short_cl, long_cl = 1, 0
print(f"\n  Cluster {short_cl} = COURT/HACHE (mean_sent_len = {cluster_profiles[f'cluster_{short_cl}']['means']['mean_sent_len']:.1f})")
print(f"  Cluster {long_cl} = LONG/AMPLE  (mean_sent_len = {cluster_profiles[f'cluster_{long_cl}']['means']['mean_sent_len']:.1f})")

# BONUS: RF per cluster
print("\n  [RF par cluster] Random Forest R2 par cluster...")
all_feat_cols_available = [c for c in feature_cols if c in tier_s_en.columns]

# Need to use ALL tiers for RF, but within each cluster
# Actually, we need S/A/B/C windows, not just S. Let's cluster S, then
# for each cluster's authors/books, take all their S/A/B/C windows.
# Simpler approach: do RF on ALL EN data, then on each cluster of S separately
# won't work because we need variation in tiers.

# Better: cluster ALL en windows by the same features, then RF per cluster
print("  Clustering ALL EN 500w S/A/B/C windows...")
X_all_clust = df_en_sabc[cluster_feats].fillna(0).values
X_all_scaled = scaler.transform(X_all_clust)
all_km_labels = km.predict(X_all_scaled)
df_en_sabc['km_cluster'] = all_km_labels

r2_per_cluster = {}
for cl in [0, 1]:
    sub = df_en_sabc[df_en_sabc['km_cluster'] == cl]
    if len(sub) < 1000:
        print(f"  Cluster {cl}: too few ({len(sub)})")
        continue

    X = sub[feature_cols].fillna(0).values
    y = sub['tier_num'].values

    rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    cv = cross_val_score(rf, X, y, cv=5, scoring='r2', n_jobs=-1)
    r2 = float(cv.mean())
    r2_std = float(cv.std())
    r2_per_cluster[f'cluster_{cl}'] = {'r2': round(r2, 4), 'std': round(r2_std, 4), 'n': len(sub)}
    print(f"  Cluster {cl}: R2 = {r2:.4f} +/- {r2_std:.4f} (n={len(sub)})")

# Compare with global
print(f"\n  R2 global EN: 0.0203")
for cl, data in r2_per_cluster.items():
    improvement = "AMELIORATION" if data['r2'] > 0.05 else "PAS D'AMELIORATION"
    print(f"  R2 {cl}: {data['r2']:.4f} — {improvement}")

results['action3_bimodality'] = {
    'silhouette_kmeans': round(sil_km, 4),
    'silhouette_gmm': round(sil_gmm, 4),
    'cluster_profiles': cluster_profiles,
    'r2_per_cluster': r2_per_cluster,
    'short_cluster': short_cl,
    'long_cluster': long_cl,
}

# Also do bimodality check on FR Tier S for comparison
print("\n  [Comparaison] Bimodalite FR Tier S...")
tier_s_fr = df_fr_sabc[df_fr_sabc['tier'] == 'S'].copy()
X_fr_clust = tier_s_fr[cluster_feats].fillna(0).values
X_fr_scaled = StandardScaler().fit_transform(X_fr_clust)
km_fr = KMeans(n_clusters=2, random_state=42, n_init=10).fit(X_fr_scaled)
sil_fr = silhouette_score(X_fr_scaled, km_fr.labels_, sample_size=min(50000, len(X_fr_scaled)), random_state=42)
print(f"  Silhouette FR Tier S K=2: {sil_fr:.3f}")
print(f"  Silhouette EN Tier S K=2: {sil_km:.3f}")
results['action3_bimodality']['silhouette_fr_comparison'] = round(sil_fr, 4)

# ════════════════════════════════════════════════════════════════════════════════
# ACTION 4 — ANOVA INTER-TIER
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  ACTION 4 — ANOVA INTER-TIER (F-stat FR vs EN)")
print("=" * 80)

def compute_anova(dfs, label):
    anova_results = []
    for feat in feature_cols:
        groups = []
        for tier in ['S', 'A', 'B', 'C']:
            vals = dfs[dfs['tier'] == tier][feat].fillna(0).values
            if len(vals) > 0:
                groups.append(vals)

        if len(groups) >= 2:
            try:
                f_stat, p_val = f_oneway(*groups)
                if not np.isfinite(f_stat):
                    f_stat = 0.0
            except:
                f_stat, p_val = 0.0, 1.0
        else:
            f_stat, p_val = 0.0, 1.0

        anova_results.append({
            'feature': feat,
            'f_stat': round(float(f_stat), 2),
            'p_value': float(p_val),
        })

    anova_results.sort(key=lambda x: -x['f_stat'])
    return anova_results

print("\n  Computing ANOVA FR...")
anova_fr = compute_anova(df_fr_sabc, 'FR')
print("  Computing ANOVA EN...")
anova_en = compute_anova(df_en_sabc, 'EN')

print(f"\n  {'Rang':>4} | {'Feature FR':>25} {'F_FR':>10} | {'Feature EN':>25} {'F_EN':>10}")
print("  " + "-" * 85)
for i in range(15):
    fr = anova_fr[i]
    en = anova_en[i]
    print(f"  {i+1:4d} | {fr['feature']:>25} {fr['f_stat']:>10.1f} | {en['feature']:>25} {en['f_stat']:>10.1f}")

# Same feature comparison
print(f"\n  MEMES FEATURES — F-stat FR vs EN")
print(f"  {'Feature':>30} {'F_FR':>10} {'F_EN':>10} {'ratio':>8}")
print("  " + "-" * 60)
en_anova_dict = {r['feature']: r for r in anova_en}
for fr_r in anova_fr[:15]:
    feat = fr_r['feature']
    en_r = en_anova_dict.get(feat, {'f_stat': 0})
    ratio = fr_r['f_stat'] / max(en_r['f_stat'], 0.1)
    print(f"  {feat:>30} {fr_r['f_stat']:>10.1f} {en_r['f_stat']:>10.1f} {ratio:>7.1f}x")

avg_f_fr = np.mean([r['f_stat'] for r in anova_fr[:15]])
avg_f_en = np.mean([r['f_stat'] for r in anova_en[:15]])
print(f"\n  Moyenne F top 15: FR={avg_f_fr:.1f}, EN={avg_f_en:.1f}, ratio={avg_f_fr/max(avg_f_en,0.1):.1f}x")

results['action4_anova'] = {
    'fr_top15': anova_fr[:15],
    'en_top15': anova_en[:15],
    'avg_f_fr': round(avg_f_fr, 2),
    'avg_f_en': round(avg_f_en, 2),
}

# ════════════════════════════════════════════════════════════════════════════════
# ACTION 5 — AUDIT TECHNIQUE
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  ACTION 5 — AUDIT TECHNIQUE (pipeline, distributions)")
print("=" * 80)

# 1. Distribution comparison
print("\n  1. DISTRIBUTIONS DE BASE FR vs EN (500w, S/A/B/C)")

metrics_compare = {}
for label, dfs in [('FR', df_fr_sabc), ('EN', df_en_sabc)]:
    d500 = dfs[dfs['window_size'] == '500']
    m = {}
    m['n_windows'] = len(d500)
    m['mean_sentence_count'] = round(float(d500['sentence_count'].mean()), 2) if 'sentence_count' in d500.columns else 0
    m['mean_sent_len'] = round(float(d500['mean_sent_len'].mean()), 2) if 'mean_sent_len' in d500.columns else 0
    m['mean_semicolon'] = round(float(d500['semicolon_count'].mean()), 3) if 'semicolon_count' in d500.columns else 0
    m['pct_zero_semicolon'] = round(100 * (d500['semicolon_count'] == 0).mean(), 1) if 'semicolon_count' in d500.columns else 0
    m['mean_dialogue_ratio'] = round(float(d500['dialogue_ratio'].mean()), 3) if 'dialogue_ratio' in d500.columns else 0
    m['pct_high_dialogue'] = round(100 * (d500['dialogue_ratio'] > 0.5).mean(), 1) if 'dialogue_ratio' in d500.columns else 0
    m['mean_dash'] = round(float(d500['dash_count'].mean()), 3) if 'dash_count' in d500.columns else 0
    m['std_mean_sent_len'] = round(float(d500['mean_sent_len'].std()), 2) if 'mean_sent_len' in d500.columns else 0
    m['mean_f16a_bigram'] = round(float(d500['f16a_bigram_rarity'].mean()), 4) if 'f16a_bigram_rarity' in d500.columns else 0
    m['std_f16a_bigram'] = round(float(d500['f16a_bigram_rarity'].std()), 4) if 'f16a_bigram_rarity' in d500.columns else 0
    metrics_compare[label] = m

print(f"\n  {'Metrique':>30} {'FR':>12} {'EN':>12}")
print("  " + "-" * 56)
for key in metrics_compare['FR']:
    fr_v = metrics_compare['FR'][key]
    en_v = metrics_compare['EN'][key]
    print(f"  {key:>30} {fr_v:>12} {en_v:>12}")

# 2. Segmentation audit
print("\n  2. SEGMENTATION")

for label, dfs in [('FR', df_fr), ('EN', df_en)]:
    full_chapters = dfs[dfs['window_size'] == 'full']
    n_books = dfs['filename'].nunique()
    n_chapters_per_book = dfs.groupby('filename')['chapter_idx'].nunique()

    # Small full chapters
    if 'words' in full_chapters.columns:
        tiny = (full_chapters['words'] < 100).sum()
    elif 'sentence_count' in full_chapters.columns and 'mean_sent_len' in full_chapters.columns:
        est_words = full_chapters['sentence_count'] * full_chapters['mean_sent_len']
        tiny = (est_words < 100).sum()
    else:
        tiny = 0

    print(f"\n  {label}:")
    print(f"    Livres: {n_books}")
    print(f"    Chapitres full: {len(full_chapters)}")
    print(f"    Chapitres full < 100 mots: {tiny}")
    print(f"    Chapitres/livre median: {n_chapters_per_book.median():.0f}")
    print(f"    Chapitres/livre max: {n_chapters_per_book.max()}")

# 3. Feature variance comparison (CV = std/mean for each feature)
print("\n  3. COEFFICIENT DE VARIATION DES FEATURES (FR vs EN, 500w)")
cv_compare = []
for feat in feature_cols:
    fr_std = df_fr_sabc[df_fr_sabc['window_size']=='500'][feat].std()
    fr_mean = df_fr_sabc[df_fr_sabc['window_size']=='500'][feat].mean()
    en_std = df_en_sabc[df_en_sabc['window_size']=='500'][feat].std()
    en_mean = df_en_sabc[df_en_sabc['window_size']=='500'][feat].mean()

    cv_fr = abs(fr_std / fr_mean) if abs(fr_mean) > 1e-10 else 0
    cv_en = abs(en_std / en_mean) if abs(en_mean) > 1e-10 else 0

    cv_compare.append({
        'feature': feat,
        'cv_fr': round(float(cv_fr), 3),
        'cv_en': round(float(cv_en), 3),
        'mean_fr': round(float(fr_mean), 4),
        'mean_en': round(float(en_mean), 4),
    })

# Show features where EN has much less variance
cv_compare.sort(key=lambda x: x['cv_fr'] - x['cv_en'], reverse=True)
print(f"\n  Features ou FR a PLUS de variance relative que EN:")
print(f"  {'Feature':>30} {'CV_FR':>8} {'CV_EN':>8} {'diff':>8}")
print("  " + "-" * 58)
for r in cv_compare[:10]:
    print(f"  {r['feature']:>30} {r['cv_fr']:8.3f} {r['cv_en']:8.3f} {r['cv_fr']-r['cv_en']:+8.3f}")

results['action5_technical'] = {
    'distributions': metrics_compare,
    'cv_comparison_top10': cv_compare[:10],
}

# ════════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC FINAL
# ════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  DIAGNOSTIC FINAL")
print("=" * 80)

# Compute key diagnostic metrics
# 1. Tiering: ratio S/C
ratio_s_c_fr = len(df_fr_sabc[df_fr_sabc['tier']=='S']) / max(len(df_fr_sabc[df_fr_sabc['tier']=='C']), 1)
ratio_s_c_en = len(df_en_sabc[df_en_sabc['tier']=='S']) / max(len(df_en_sabc[df_en_sabc['tier']=='C']), 1)

# 2. Signal: avg cohen_d
signal_ratio = avg_abs_d_fr / max(avg_abs_d_en, 0.001)

# 3. Bimodality: silhouette
bimodal = sil_km > 0.25

# 4. ANOVA ratio
anova_ratio = avg_f_fr / max(avg_f_en, 0.1)

# 5. R2 improvement per cluster
r2_improved = any(d['r2'] > 0.05 for d in r2_per_cluster.values())

print(f"\n  A. Tiering corrompu?")
print(f"     Ratio S/C: FR={ratio_s_c_fr:.1f}, EN={ratio_s_c_en:.1f}")
tier_verdict = "SUSPECT" if ratio_s_c_en > 8 or ratio_s_c_en < 1.5 else "SAIN"
print(f"     VERDICT: {tier_verdict}")

print(f"\n  B. Bimodalite Tier S?")
print(f"     Silhouette K=2 EN: {sil_km:.3f} (FR: {sil_fr:.3f})")
bimodal_verdict = "BIMODAL" if sil_km > 0.25 else "FAIBLEMENT BIMODAL" if sil_km > 0.15 else "UNIMODAL"
r2_parts = [str(k) + "=" + format(v["r2"], ".4f") for k,v in r2_per_cluster.items()]
print("     R2 par cluster: " + ", ".join(r2_parts))
print(f"     VERDICT: {bimodal_verdict}")

print(f"\n  C. Signal univarie absent?")
print(f"     Cohen d moyen top15: FR={avg_abs_d_fr:.3f}, EN={avg_abs_d_en:.3f} (ratio {signal_ratio:.1f}x)")
signal_verdict = "SIGNAL PRESENT MAIS FAIBLE" if avg_abs_d_en > 0.05 else "SIGNAL ABSENT"
print(f"     VERDICT: {signal_verdict}")

print(f"\n  D. ANOVA inter-tier?")
print(f"     F moyen top15: FR={avg_f_fr:.1f}, EN={avg_f_en:.1f} (ratio {anova_ratio:.1f}x)")
anova_verdict = "TIERS FAIBLEMENT SEPARES" if anova_ratio > 3 else "TIERS COMPARABLES"
print(f"     VERDICT: {anova_verdict}")

print(f"\n  E. Pipeline technique?")
pct_zero_semi_en = metrics_compare['EN']['pct_zero_semicolon']
pct_zero_semi_fr = metrics_compare['FR']['pct_zero_semicolon']
print(f"     % zero semicolons: FR={pct_zero_semi_fr}%, EN={pct_zero_semi_en}%")
pipeline_verdict = "PIPELINE SAIN" if abs(metrics_compare['EN']['mean_sentence_count'] - metrics_compare['FR']['mean_sentence_count']) < 10 else "PIPELINE SUSPECT"
print(f"     VERDICT: {pipeline_verdict}")

# Final diagnosis
print(f"\n  {'='*60}")
print(f"  DIAGNOSTIC FINAL: Le R2 EN = 0.020 est cause par :")
print(f"  {'='*60}")

diagnostics = []
if signal_ratio > 3:
    diagnostics.append("C. Signal univarie beaucoup plus faible en EN")
if anova_ratio > 3:
    diagnostics.append("D. Tiers EN structurellement moins separes")
if bimodal_verdict != "UNIMODAL":
    diagnostics.append(f"B. {bimodal_verdict} — clusters EN dans Tier S")
if r2_improved:
    diagnostics.append("B+. R2 s'ameliore par cluster — bimodalite contribue")
if tier_verdict != "SAIN":
    diagnostics.append("A. Tiering EN suspect")

if not diagnostics:
    diagnostics.append("E. Combinaison de facteurs sans cause dominante unique")

for d in diagnostics:
    print(f"  -> {d}")

results['diagnostic'] = {
    'tier_verdict': tier_verdict,
    'bimodal_verdict': bimodal_verdict,
    'signal_verdict': signal_verdict,
    'anova_verdict': anova_verdict,
    'pipeline_verdict': pipeline_verdict,
    'ratio_s_c_fr': round(ratio_s_c_fr, 2),
    'ratio_s_c_en': round(ratio_s_c_en, 2),
    'signal_ratio': round(signal_ratio, 2),
    'anova_ratio': round(anova_ratio, 2),
    'r2_improved_by_cluster': r2_improved,
    'diagnostics': diagnostics,
}

# ════════════════════════════════════════════════════════════════════════════════
# SAVE JSON
# ════════════════════════════════════════════════════════════════════════════════
with open(f"{OUT_DIR}/AUTOPSIE_RESULTS.json", 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False, default=str)
print(f"\n  Saved: {OUT_DIR}/AUTOPSIE_RESULTS.json")

print("\n" + "=" * 80)
print("  AUTOPSIE COMPLETE")
print("=" * 80)
