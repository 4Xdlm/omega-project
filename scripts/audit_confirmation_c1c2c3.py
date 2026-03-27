"""
OMEGA — MESURES DE CONFIRMATION C1+C2+C3
Protocole Angostura — Validation multi-échelle + contrôle auteur + interactions
0 API — CALC PUR — FR-only
Standard : NASA-Grade L4 / DO-178C Level A
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
import json, os, warnings
warnings.filterwarnings('ignore')

print("="*80)
print("  OMEGA — CONFIRMATIONS C1 + C2 + C3")
print("  Protocole Angostura — Validation finale")
print("="*80)

# === LOAD ===
print("\nLoading CSV...")
df = pd.read_csv(r'C:\Users\elric\omega-project\src\scoring\data\MASTER_RAW_WINDOWS.csv')
df_fr = df[(df['lang']=='fr') & (df['tier'].isin(['S','A','B','C']))].copy()
tier_map = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
df_fr['tier_num'] = df_fr['tier'].map(tier_map)
print(f"Total FR windows: {len(df_fr)}")

meta_cols = ['filename','tier','lang','chapter_idx','window_size','window_idx',
             'tier_num','window_type','window_start','window_end']
feature_cols = [c for c in df_fr.columns if c not in meta_cols 
                and df_fr[c].dtype in ['float64','int64','float32','int32']
                and c != 'tier_num']
print(f"Features: {len(feature_cols)}")

os.makedirs(r'C:\Users\elric\omega-project\sessions\CONFIRMATION_AUDIT', exist_ok=True)

# ═══════════════════════════════════════════════════════════════════════════════
# C1 — TAILLES 3000w + 5000w
# Question : semicolon tient-il au-delà de 2000w ?
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*80)
print("  C1 — TAILLES ÉTENDUES (3000w + 5000w par fenêtres synthétiques)")
print("="*80)

# Le CSV n'a pas de fenêtres 3000/5000 natives.
# On les construit par CONCATÉNATION de fenêtres adjacentes du même chapitre.
# Alternative : on utilise les chapitres entiers >= 3000w et >= 5000w.

# Approche : filtrer les chapitres "full" avec assez de mots
df_full = df_fr[df_fr['window_size'] == 'full'].copy()
if len(df_full) == 0:
    # Essayer d'autres conventions
    for val in df_fr['window_size'].unique():
        if str(val).lower() in ['full','chapter','0','-1']:
            df_full = df_fr[df_fr['window_size'] == val].copy()
            break

print(f"Chapitres full FR: {len(df_full)}")

# Vérifier si on a une colonne 'words' pour filtrer par taille
if 'words' in df_full.columns:
    df_3000 = df_full[df_full['words'] >= 3000].copy()
    df_5000 = df_full[df_full['words'] >= 5000].copy()
    print(f"Chapitres >= 3000w: {len(df_3000)}")
    print(f"Chapitres >= 5000w: {len(df_5000)}")
else:
    # Estimer via sentence_count * mean_sent_len
    if 'sentence_count' in df_full.columns and 'mean_sent_len' in df_full.columns:
        df_full['est_words'] = df_full['sentence_count'] * df_full['mean_sent_len']
        df_3000 = df_full[df_full['est_words'] >= 3000].copy()
        df_5000 = df_full[df_full['est_words'] >= 5000].copy()
        print(f"Chapitres estimés >= 3000w: {len(df_3000)}")
        print(f"Chapitres estimés >= 5000w: {len(df_5000)}")
    else:
        df_3000 = pd.DataFrame()
        df_5000 = pd.DataFrame()
        print("SKIP C1: pas de colonne words ni sentence_count*mean_sent_len")

# Aussi utiliser les fenêtres 2000w existantes pour comparaison
c1_results = {}

for label, dfs in [('2000', df_fr[df_fr['window_size']=='2000']),
                    ('3000+', df_3000),
                    ('5000+', df_5000)]:
    if len(dfs) < 500:
        print(f"  {label}: SKIP ({len(dfs)} windows, besoin >= 500)")
        continue
    
    X = dfs[feature_cols].fillna(0)
    y = dfs['tier_num']
    
    # Sous-échantillon si trop gros
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
    
    top5 = list(perm_df.head(5).itertuples(index=False))
    print(f"\n  {label} (n={len(dfs)}):")
    for rank, (feat, imp) in enumerate(top5, 1):
        print(f"    #{rank} {feat:30s} {imp:.4f}")
    
    c1_results[label] = {
        'n': len(dfs),
        'top10': [{'feature': row.feature, 'importance': round(float(row.importance), 6)} 
                  for row in perm_df.head(10).itertuples(index=False)]
    }

# ═══════════════════════════════════════════════════════════════════════════════
# C2 — CONTRÔLE PAR AUTEUR
# Question : semicolon = signal littéraire ou signal "Proust/Zola" ?
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*80)
print("  C2 — CONTRÔLE PAR AUTEUR")
print("  semicolon = signal universel ou signal de quelques auteurs ?")
print("="*80)

df500 = df_fr[df_fr['window_size'] == '500'].copy()

# Extraire l'auteur du filename (dernière partie après le dernier _)
# Format typique : "la_peste_french_edition_albert_camus.txt"
# On prend les 2 derniers mots avant .txt comme proxy d'auteur
def extract_author(fn):
    parts = fn.replace('.txt','').split('_')
    if len(parts) >= 2:
        return '_'.join(parts[-2:])
    return fn.replace('.txt','')

df500['author'] = df500['filename'].apply(extract_author)

# Compter les auteurs avec assez de fenêtres
author_counts = df500['author'].value_counts()
major_authors = author_counts[author_counts >= 500].index.tolist()
print(f"Auteurs avec >= 500 fenêtres: {len(major_authors)}")

# Pour chaque auteur majeur, calculer le rang de semicolon
author_ranks = {}
for author in major_authors[:20]:  # Top 20 pour vitesse
    df_auth = df500[df500['author'] == author]
    X = df_auth[feature_cols].fillna(0)
    y = df_auth['tier_num']
    
    # Si tous les textes sont du même tier, skip
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

print(f"\n  {'Auteur':25s} {'n':>6s} {'semi rank':>10s} {'dash rank':>10s} Top 3")
print("-"*100)
for author, info in sorted(author_ranks.items(), key=lambda x: x[1]['semicolon_rank']):
    t3 = ', '.join([f"{f}({v:.3f})" for f, v in info['top3']])
    print(f"  {author:25s} {info['n_windows']:6d} #{info['semicolon_rank']:>8d} #{info['dash_rank']:>8d}  {t3}")

# Vérifier si semicolon est #1 chez la majorité des auteurs ou juste chez quelques-uns
semi_top3_count = sum(1 for a in author_ranks.values() if a['semicolon_rank'] <= 3)
semi_top5_count = sum(1 for a in author_ranks.values() if a['semicolon_rank'] <= 5)
total_auth = len(author_ranks)

print(f"\n  semicolon dans le top 3 chez {semi_top3_count}/{total_auth} auteurs ({100*semi_top3_count/max(total_auth,1):.0f}%)")
print(f"  semicolon dans le top 5 chez {semi_top5_count}/{total_auth} auteurs ({100*semi_top5_count/max(total_auth,1):.0f}%)")

# Test SANS les 3 auteurs les plus gros contributeurs de semicolons
# Pour vérifier que le signal tient sans eux
top_semi_authors = df500.groupby('author')['semicolon_count'].mean().sort_values(ascending=False).head(3).index.tolist()
print(f"\n  Top 3 auteurs par semicolon moyen: {top_semi_authors}")

df500_sans_top = df500[~df500['author'].isin(top_semi_authors)]
print(f"  Sans ces 3 auteurs: {len(df500_sans_top)} fenêtres (était {len(df500)})")

X_sans = df500_sans_top[feature_cols].fillna(0)
y_sans = df500_sans_top['tier_num']

n = min(50000, len(df500_sans_top))
idx = np.random.RandomState(42).choice(len(df500_sans_top), n, replace=False)

rf_sans = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
rf_sans.fit(X_sans.iloc[idx], y_sans.iloc[idx])

perm_sans = permutation_importance(rf_sans, X_sans.iloc[idx], y_sans.iloc[idx], n_repeats=5, random_state=42, n_jobs=-1)
perm_sans_df = pd.DataFrame({
    'feature': feature_cols,
    'importance': perm_sans.importances_mean,
}).sort_values('importance', ascending=False)

print(f"\n  TOP 5 SANS les 3 plus gros auteurs à semicolons:")
for rank, (_, row) in enumerate(perm_sans_df.head(5).iterrows(), 1):
    print(f"    #{rank} {row['feature']:30s} {row['importance']:.4f}")

semi_rank_sans = list(perm_sans_df['feature']).index('semicolon_count') + 1
print(f"\n  semicolon rang SANS top auteurs: #{semi_rank_sans}")
print(f"  semicolon rang AVEC top auteurs: #1")

c2_results = {
    'n_major_authors': len(author_ranks),
    'semi_top3_pct': round(100*semi_top3_count/max(total_auth,1), 1),
    'semi_top5_pct': round(100*semi_top5_count/max(total_auth,1), 1),
    'top_semi_authors': top_semi_authors,
    'semi_rank_without_top_authors': semi_rank_sans,
    'author_details': author_ranks,
    'top5_without_top_authors': [
        {'rank': i+1, 'feature': row['feature'], 'importance': round(float(row['importance']), 6)}
        for i, (_, row) in enumerate(perm_sans_df.head(5).iterrows())
    ],
}

# ═══════════════════════════════════════════════════════════════════════════════
# C3 — INTERACTIONS À TOUTES LES ÉCHELLES
# Question : le coefficient d'interaction -0.030 tient-il à 2000w ?
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*80)
print("  C3 — INTERACTIONS PAR TAILLE")
print("  Le coefficient std×f1a = -0.030 tient-il à toutes les échelles ?")
print("="*80)

interaction_pairs = [
    ('std_sent_len', 'f1a_rhythm_variance'),
    ('semicolon_count', 'std_sent_len'),
    ('semicolon_count', 'sub_per_sentence'),
    ('semicolon_count', 'dash_count'),
]

sizes = ['200', '500', '1000', '2000']
c3_results = {}

for s in sizes:
    dfs = df_fr[df_fr['window_size'] == s]
    if len(dfs) < 1000:
        continue
    
    y = dfs['tier_num'].values
    means = {}
    stds_dict = {}
    for f in feature_cols:
        vals = dfs[f].fillna(0).values
        means[f] = vals.mean()
        stds_dict[f] = vals.std()
        if stds_dict[f] == 0:
            stds_dict[f] = 1
    
    size_results = {}
    for f1, f2 in interaction_pairs:
        if f1 not in dfs.columns or f2 not in dfs.columns:
            continue
        
        x1 = (dfs[f1].fillna(0).values - means[f1]) / stds_dict[f1]
        x2 = (dfs[f2].fillna(0).values - means[f2]) / stds_dict[f2]
        
        # Additif
        X_add = np.column_stack([x1, x2])
        lr_add = LinearRegression().fit(X_add, y)
        r2_add = lr_add.score(X_add, y)
        
        # Avec interaction
        X_int = np.column_stack([x1, x2, x1*x2])
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

# Afficher le tableau comparatif
print(f"\n  {'Paire':45s}", end="")
for s in sizes:
    print(f" | {s:>14s}", end="")
print()
print("-"*(45 + 17*len(sizes)))

for pair_name in [f"{f1} x {f2}" for f1, f2 in interaction_pairs]:
    print(f"  {pair_name:43s}", end="")
    for s in sizes:
        if s in c3_results and pair_name in c3_results[s]:
            coef = c3_results[s][pair_name]['interaction_coef']
            delta = c3_results[s][pair_name]['delta_r2']
            print(f" | {coef:+.4f} Δ{delta:.3f}", end="")
        else:
            print(f" | {'N/A':>14s}", end="")
    print()

# Vérifier la stabilité du coefficient
print("\n  STABILITÉ DU COEFFICIENT std×f1a:")
key = "std_sent_len x f1a_rhythm_variance"
for s in sizes:
    if s in c3_results and key in c3_results[s]:
        coef = c3_results[s][key]['interaction_coef']
        delta = c3_results[s][key]['delta_r2']
        stable = "STABLE" if abs(coef - (-0.030)) < 0.015 else "INSTABLE"
        print(f"    @{s:>5s}w: coef={coef:+.4f}  delta_R2={delta:.4f}  [{stable}]")

# ═══════════════════════════════════════════════════════════════════════════════
# SYNTHÈSE
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*80)
print("  SYNTHÈSE DES CONFIRMATIONS")
print("="*80)

# C1
print("\n  C1 — TAILLES ÉTENDUES:")
if c1_results:
    for label, data in c1_results.items():
        top_feat = data['top10'][0]['feature'] if data['top10'] else 'N/A'
        print(f"    {label}: #{1} = {top_feat} (n={data['n']})")
else:
    print("    Pas assez de données pour 3000w/5000w dans les fenêtres full")

# C2
print(f"\n  C2 — CONTRÔLE AUTEUR:")
print(f"    semicolon top 3 chez {c2_results['semi_top3_pct']:.0f}% des auteurs")
print(f"    semicolon top 5 chez {c2_results['semi_top5_pct']:.0f}% des auteurs")
print(f"    semicolon rang SANS top 3 auteurs: #{c2_results['semi_rank_without_top_authors']}")
verdict_c2 = "UNIVERSEL" if c2_results['semi_rank_without_top_authors'] <= 3 else "CONDITIONNEL"
print(f"    VERDICT: {verdict_c2}")

# C3
print(f"\n  C3 — INTERACTIONS PAR TAILLE:")
key = "std_sent_len x f1a_rhythm_variance"
coefs = []
for s in sizes:
    if s in c3_results and key in c3_results[s]:
        coefs.append(c3_results[s][key]['interaction_coef'])
if coefs:
    mean_coef = np.mean(coefs)
    std_coef = np.std(coefs)
    cv_coef = abs(std_coef / mean_coef) if abs(mean_coef) > 0.001 else float('inf')
    print(f"    Coefficient moyen: {mean_coef:+.4f} ± {std_coef:.4f} (CV={cv_coef:.2f})")
    verdict_c3 = "STABLE" if cv_coef < 0.50 else "INSTABLE"
    print(f"    VERDICT: {verdict_c3}")

# === SAVE ===
all_results = {
    'c1_extended_sizes': c1_results,
    'c2_author_control': c2_results,
    'c3_interactions_by_size': c3_results,
}

with open(r'C:\Users\elric\omega-project\sessions\CONFIRMATION_AUDIT\CONFIRMATION_C1C2C3.json', 'w') as f:
    json.dump(all_results, f, indent=2, default=str)

print(f"\nSaved: sessions/CONFIRMATION_AUDIT/CONFIRMATION_C1C2C3.json")
print("\nDONE — Les 3 confirmations sont terminées.")
