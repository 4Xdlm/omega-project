"""
OMEGA — AUDIT D'INTER-RELATIONS PROPORTIONNELLES ENTRE FEATURES
Quand semicolon monte de +1 std, de combien bougent les autres ?
FR-only, 500w, Tier S/A/B/C
"""
import pandas as pd
import numpy as np
from scipy.stats import spearmanr
from sklearn.linear_model import LinearRegression
import json, os

print("="*70)
print("  OMEGA — INTER-RELATIONS PROPORTIONNELLES")
print("="*70)

# === LOAD ===
print("\nLoading CSV...")
df = pd.read_csv(r'C:\Users\elric\omega-project\src\scoring\data\MASTER_RAW_WINDOWS.csv')
df5 = df[(df['lang']=='fr') & (df['tier'].isin(['S','A','B','C'])) & (df['window_size']=='500')].copy()
print(f"FR 500w: {len(df5)} windows")

# Top 13 drivers
drivers = ['semicolon_count','dash_count','excl_count','dialogue_ratio','colon_count',
           'ellipsis_count','std_sent_len','f1a_rhythm_variance','sub_per_sentence',
           'f16a_bigram_rarity','quest_count','longest_sent_words','f9a_contradiction_rate']

# Extended: add key structural features
extended = drivers + ['f26b_long_sent_rate','mean_sent_len','cv_sent','knife_rate',
                      'ratio_alt','f17_knife_count','f29d_ttr_score','f19a_approx_entropy',
                      'f35c_hook_score','f36c_cliff_score','f24c_contrast_delta']
extended = [f for f in extended if f in df5.columns]
print(f"Features: {len(extended)}")

X = df5[extended].fillna(0)

# === 1. SPEARMAN CORRELATION MATRIX ===
print("\n" + "="*70)
print("  1. TOP CORRELATIONS SPEARMAN")
print("="*70)

corr, _ = spearmanr(X)
corr_df = pd.DataFrame(corr, index=extended, columns=extended)

pairs = []
for i in range(len(extended)):
    for j in range(i+1, len(extended)):
        pairs.append((extended[i], extended[j], corr_df.iloc[i,j]))

pairs.sort(key=lambda x: abs(x[2]), reverse=True)

print(f"\n{'Feature A':30s} {'Feature B':30s} {'rho':>8s}")
print("-"*70)
for a,b,r in pairs[:25]:
    print(f"{a:30s} {b:30s} {r:+.3f}")

# === 2. ELASTICITY MATRIX ===
# Quand feature X monte de +1 std, de combien monte/baisse feature Y (en std) ?
print("\n" + "="*70)
print("  2. MATRICE D'ELASTICITE (delta Y quand X monte +1 std)")
print("="*70)

means = X.mean()
stds = X.std().replace(0, 1)
Xz = (X - means) / stds

# Top 5 drivers seulement (pour lisibilite)
top5 = ['semicolon_count','dash_count','excl_count','dialogue_ratio','f1a_rhythm_variance']
targets = ['f26b_long_sent_rate','mean_sent_len','cv_sent','knife_rate','ratio_alt',
           'sub_per_sentence','f17_knife_count','f29d_ttr_score','f24c_contrast_delta',
           'f35c_hook_score','f36c_cliff_score','std_sent_len','longest_sent_words']

elasticity = {}
print(f"\n{'Target':30s}", end="")
for d in top5:
    short = d[:12]
    print(f" {short:>14s}", end="")
print()
print("-" * (30 + 15*len(top5)))

for t in targets:
    if t not in Xz.columns:
        continue
    y = Xz[t].values
    row = {}
    print(f"{t:30s}", end="")
    for d in top5:
        if d not in Xz.columns or d == t:
            print(f" {'---':>14s}", end="")
            continue
        x = Xz[d].values
        # Simple OLS: y = beta * x + eps
        lr = LinearRegression().fit(x.reshape(-1,1), y)
        beta = lr.coef_[0]
        row[d] = round(float(beta), 3)
        # Color coding
        sign = "+" if beta > 0 else ""
        print(f" {sign}{beta:>13.3f}", end="")
    elasticity[t] = row
    print()

# === 3. INTERACTION PAIRS (multiplicative effects) ===
print("\n" + "="*70)
print("  3. INTERACTIONS MULTIPLICATIVES")
print("  (features dont le produit predit mieux le tier que la somme)")
print("="*70)

tier_map = {'S': 4, 'A': 3, 'B': 2, 'C': 1}
df5['tier_num'] = df5['tier'].map(tier_map)
y_tier = df5['tier_num'].values

interactions = []
for i, f1 in enumerate(drivers[:10]):
    for f2 in drivers[i+1:10]:
        x1 = Xz[f1].values
        x2 = Xz[f2].values
        
        # Model 1: additive (x1 + x2)
        X_add = np.column_stack([x1, x2])
        lr_add = LinearRegression().fit(X_add, y_tier)
        r2_add = lr_add.score(X_add, y_tier)
        
        # Model 2: additive + interaction (x1 + x2 + x1*x2)
        X_int = np.column_stack([x1, x2, x1*x2])
        lr_int = LinearRegression().fit(X_int, y_tier)
        r2_int = lr_int.score(X_int, y_tier)
        
        delta = r2_int - r2_add
        if delta > 0.005:  # interaction adds > 0.5% R2
            interactions.append({
                'f1': f1, 'f2': f2,
                'r2_add': round(r2_add, 4),
                'r2_interaction': round(r2_int, 4),
                'delta_r2': round(delta, 4),
                'interaction_coef': round(float(lr_int.coef_[2]), 4),
            })

interactions.sort(key=lambda x: x['delta_r2'], reverse=True)
print(f"\n{'Feature 1':25s} {'Feature 2':25s} {'R2 add':>8s} {'R2 int':>8s} {'delta':>8s} {'coef':>8s}")
print("-"*90)
for ix in interactions[:15]:
    print(f"{ix['f1']:25s} {ix['f2']:25s} {ix['r2_add']:8.4f} {ix['r2_interaction']:8.4f} {ix['delta_r2']:8.4f} {ix['interaction_coef']:+8.4f}")

# === 4. CAUSAL CHAINS ===
print("\n" + "="*70)
print("  4. CHAINES CAUSALES (X -> M -> Tier)")
print("  Mediation via les features structurelles")
print("="*70)

mediators = ['f26b_long_sent_rate','mean_sent_len','cv_sent','ratio_alt','sub_per_sentence']
chains = []

for source in drivers[:7]:  # top 7 drivers
    for med in mediators:
        if source == med:
            continue
        x = df5[source].fillna(0).values.reshape(-1,1)
        m = df5[med].fillna(0).values
        y = y_tier
        
        # c: total effect X -> Y
        lr = LinearRegression().fit(x, y)
        c = lr.coef_[0]
        
        # a: X -> M
        lr = LinearRegression().fit(x, m)
        a = lr.coef_[0]
        
        # b + c': X + M -> Y
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
print(f"\n{'Source':20s} {'->':>3s} {'Mediator':20s} {'->':>3s} {'Tier':5s} {'Med%':>7s} {'Type':>10s}")
print("-"*80)
for ch in chains[:20]:
    print(f"{ch['source']:20s}  -> {ch['mediator']:20s}  -> Tier  {ch['mediation_pct']:6.1f}% {ch['direction']:>10s}")

# === 5. PROPORTIONALITY TABLE ===
print("\n" + "="*70)
print("  5. TABLE DE PROPORTIONNALITE")
print("  'Quand semicolon monte de +0.25, voici ce qui bouge'")
print("="*70)

# Use real units, not z-scores
# For each top driver, compute: if driver goes from P25 to P75 (IQR), 
# how much do the targets move?
print("\nQuand le feature SOURCE passe de son P25 a son P75 chez les Maitres (Tier S):")

tier_s = df5[df5['tier']=='S']
for source in ['semicolon_count','dash_count','sub_per_sentence','f1a_rhythm_variance']:
    p25 = tier_s[source].quantile(0.25)
    p75 = tier_s[source].quantile(0.75)
    print(f"\n  {source}: P25={p25:.2f} -> P75={p75:.2f} (IQR={p75-p25:.2f})")
    
    # Split into LOW (below median) and HIGH (above median)
    med = tier_s[source].median()
    low = tier_s[tier_s[source] <= med]
    high = tier_s[tier_s[source] > med]
    
    key_targets = ['f26b_long_sent_rate','mean_sent_len','cv_sent','knife_rate',
                   'ratio_alt','f17_knife_count','f35c_hook_score','f24c_contrast_delta']
    
    for t in key_targets:
        if t not in df5.columns:
            continue
        low_mean = low[t].mean()
        high_mean = high[t].mean()
        delta = high_mean - low_mean
        pct = (delta / max(abs(low_mean), 0.001)) * 100
        arrow = "+" if delta > 0 else ""
        print(f"    {t:30s} low={low_mean:8.3f}  high={high_mean:8.3f}  delta={arrow}{delta:.3f} ({arrow}{pct:.1f}%)")

# === SAVE ===
os.makedirs(r'C:\Users\elric\omega-project\sessions\INTERRELATION_AUDIT', exist_ok=True)

results = {
    'n_windows': len(df5),
    'top_correlations': [{'a': a, 'b': b, 'rho': round(float(r), 4)} for a,b,r in pairs[:30]],
    'elasticity': elasticity,
    'interactions': interactions[:20],
    'causal_chains': chains[:25],
}

with open(r'C:\Users\elric\omega-project\sessions\INTERRELATION_AUDIT\INTERRELATION_RESULTS.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\nSaved: sessions/INTERRELATION_AUDIT/INTERRELATION_RESULTS.json")
print("\nDONE.")
