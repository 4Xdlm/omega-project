"""
OMEGA Phase R-5 — Compute Ridge regression weights for V2 scorer
Input: CORPUS_FEATURES_MASTER.json + CORPUS_TIERS_V3.json
Output: R5_WEIGHTS_V2.json (coefficients for multi-stage-scorer-v2.ts)
"""
import json
import math
import os

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
OUT = os.path.join(ROOT, "omega-autopsie/results_phase_r/R5_WEIGHTS_V2.json")

with open(MASTER, 'r', encoding='utf-8') as f:
    master = json.load(f)
with open(TIERS, 'r', encoding='utf-8') as f:
    tiers_data = json.load(f)

tier_lookup = {e['filename']: e['tier_suggestion'] for e in tiers_data}
TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}

# 11 discriminant features (positive weight)
POSITIVE_FEATURES = [
    'f26b_long_sent_rate',
    'f1a_rhythm_variance',
    'f1_mean',
    'f24c_contrast_delta',
    'f26c_period_score',
    'f9a_contradiction_rate',
    'f28b_irony_density',
    'f27a_epistemic_rate',
    'f27d_modal_score',
    'f27c_negation_rate',
    'f19a_approx_entropy',
]

# 5 trompeur features (to invert)
INVERTED_FEATURES = [
    'f17_knife_count',
    'f29d_ttr_score',
    'f35c_hook_score',
    'f36c_cliff_score',
    'f33c_dot_comma_ratio',
]

ALL_FEATURES = POSITIVE_FEATURES + INVERTED_FEATURES

# Build data matrix
X = []  # features
y = []  # tier rank

for entry in master:
    fn = entry['filename']
    tier = entry.get('tier') or tier_lookup.get(fn, '?')
    if tier not in TIER_RANK:
        continue

    row = []
    features = entry['features']
    for feat in ALL_FEATURES:
        val = features.get(feat, 0.0)
        if not math.isfinite(val):
            val = 0.0
        row.append(val)

    X.append(row)
    y.append(TIER_RANK[tier])

n = len(X)
p = len(ALL_FEATURES)
print(f"Data: {n} samples, {p} features")

# Standardize features (zero mean, unit variance)
means = [0.0] * p
stds = [0.0] * p

for j in range(p):
    vals = [X[i][j] for i in range(n)]
    m = sum(vals) / n
    means[j] = m
    var = sum((v - m) ** 2 for v in vals) / (n - 1) if n > 1 else 1.0
    stds[j] = math.sqrt(var) if var > 0 else 1.0

# Standardize
X_std = []
for i in range(n):
    row = [(X[i][j] - means[j]) / stds[j] for j in range(p)]
    X_std.append(row)

# Ridge regression: w = (X^T X + lambda I)^-1 X^T y
# Manual implementation (no numpy dependency)
LAMBDA = 1.0  # Ridge regularization parameter

# Compute X^T X (p x p)
XtX = [[0.0] * p for _ in range(p)]
for i in range(n):
    for j in range(p):
        for k in range(p):
            XtX[j][k] += X_std[i][j] * X_std[i][k]

# Add lambda * I
for j in range(p):
    XtX[j][j] += LAMBDA

# Compute X^T y (p x 1)
Xty = [0.0] * p
for i in range(n):
    for j in range(p):
        Xty[j] += X_std[i][j] * y[i]

# Solve via Cholesky decomposition
# A = XtX, b = Xty
def cholesky_solve(A, b):
    """Solve Ax = b using Cholesky decomposition."""
    n = len(A)
    # Cholesky: A = L L^T
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                L[i][j] = math.sqrt(max(A[i][i] - s, 1e-12))
            else:
                L[i][j] = (A[i][j] - s) / L[j][j] if L[j][j] != 0 else 0

    # Forward substitution: L z = b
    z = [0.0] * n
    for i in range(n):
        z[i] = (b[i] - sum(L[i][k] * z[k] for k in range(i))) / L[i][i]

    # Back substitution: L^T x = z
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (z[i] - sum(L[j][i] * x[j] for j in range(i + 1, n))) / L[i][i]

    return x

weights_std = cholesky_solve(XtX, Xty)

# Convert back to original scale: w_orig = w_std / std, intercept adjusted
weights_orig = [weights_std[j] / stds[j] for j in range(p)]

# Compute intercept: y_mean - sum(w_orig[j] * means[j])
y_mean = sum(y) / n
intercept = y_mean - sum(weights_orig[j] * means[j] for j in range(p))

# Compute R-squared
y_pred = []
for i in range(n):
    pred = intercept + sum(weights_orig[j] * X[i][j] for j in range(p))
    y_pred.append(pred)

ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(n))
ss_tot = sum((y[i] - y_mean) ** 2 for i in range(n))
r_squared = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

# Per-tier mean prediction
from collections import defaultdict
tier_preds = defaultdict(list)
for i in range(n):
    fn = master[i]['filename']
    tier = master[i].get('tier') or tier_lookup.get(fn, '?')
    tier_preds[tier].append(y_pred[i])

print(f"\nRidge Regression (lambda={LAMBDA}):")
print(f"  R-squared: {r_squared:.4f}")
print(f"  Intercept: {intercept:.4f}")
print(f"\n  {'Feature':<35} {'Weight':>10}  {'Std_W':>10}  {'Direction':>10}")
print(f"  {'-'*35} {'-'*10}  {'-'*10}  {'-'*10}")

for j in range(p):
    feat = ALL_FEATURES[j]
    direction = "POSITIVE" if j < len(POSITIVE_FEATURES) else "INVERTED"
    print(f"  {feat:<35} {weights_orig[j]:>+10.6f}  {weights_std[j]:>+10.4f}  {direction:>10}")

print(f"\n  Mean prediction by tier:")
for t in ['S', 'A', 'B', 'C', 'D']:
    vals = tier_preds.get(t, [])
    if vals:
        m = sum(vals) / len(vals)
        print(f"    {t} (target={TIER_RANK[t]}): predicted={m:.3f} (n={len(vals)})")

# Build output
# Normalize weights to sum of abs = 100 for interpretability
total_abs = sum(abs(w) for w in weights_orig)
weights_normalized = [w / total_abs * 100 for w in weights_orig]

result = {
    "method": "Ridge regression",
    "lambda": LAMBDA,
    "r_squared": round(r_squared, 4),
    "intercept": round(intercept, 6),
    "n_samples": n,
    "n_features": p,
    "features": {},
    "bonuses": {
        "rhythmic_mastery": {
            "condition": "f1_mean > 18 AND f1a_rhythm_variance > 12",
            "bonus": 0.15,
            "description": "Maitrise rythmique - longues phrases avec variation"
        },
        "controlled_breathing": {
            "condition": "f26b_long_sent_rate > 0.08 AND f24c_contrast_delta > 25",
            "bonus": 0.12,
            "description": "Respiration maitrisee - longues phrases et contrastes"
        },
        "narrative_depth": {
            "condition": "f28b_irony_density > 0.05 AND f27a_epistemic_rate > 8",
            "bonus": 0.10,
            "description": "Profondeur narrative - ironie et epistemic markers"
        }
    },
    "penalties": {
        "knife_excess": {
            "condition": "f17_knife_count / f1_sentence_count > 0.15",
            "penalty": -0.10,
            "description": "Exces de phrases courtes (> 15% = malus)"
        }
    },
    "normalization": {
        "means": {ALL_FEATURES[j]: round(means[j], 6) for j in range(p)},
        "stds": {ALL_FEATURES[j]: round(stds[j], 6) for j in range(p)},
    }
}

for j in range(p):
    feat = ALL_FEATURES[j]
    result["features"][feat] = {
        "weight_raw": round(weights_orig[j], 6),
        "weight_std": round(weights_std[j], 4),
        "weight_pct": round(weights_normalized[j], 2),
        "direction": "POSITIVE" if j < len(POSITIVE_FEATURES) else "INVERTED",
        "mean": round(means[j], 6),
        "std": round(stds[j], 6),
    }

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"\nSaved: {OUT}")
