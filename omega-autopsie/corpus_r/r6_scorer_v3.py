"""
OMEGA Phase R-6 — Scorer V3 "Tribunal Academique"
Ridge regression on combined features (original + depth + interactions)
70% train / 15% validation / 15% holdout
"""
import json
import math
import os
import random

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
OUT_WEIGHTS = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6_WEIGHTS_V3.json")
OUT_REPORT = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6_SCORER_V3_REPORT.md")

os.makedirs(os.path.dirname(OUT_WEIGHTS), exist_ok=True)

# Load data
with open(MASTER, 'r', encoding='utf-8') as f:
    master = json.load(f)
with open(DEPTH, 'r', encoding='utf-8') as f:
    depth_data = json.load(f)
with open(TIERS, 'r', encoding='utf-8') as f:
    tiers_data = json.load(f)

tier_lookup = {e['filename']: e['tier_suggestion'] for e in tiers_data}
depth_lookup = {e['filename']: e['depth_features'] for e in depth_data}

TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}

# ═════════════════════════════════════════════════════════════
# FEATURE SELECTION
# ═════════════════════════════════════════════════════════════

# 10 discriminant original features
ORIG_FEATURES = [
    'f26b_long_sent_rate',
    'f1a_rhythm_variance',
    'f1_mean',
    'f24c_contrast_delta',
    'f28b_irony_density',
    'f27a_epistemic_rate',
    'f9a_contradiction_rate',
    'f19a_approx_entropy',
    'f27d_modal_score',
    'f26c_period_score',
]

# 3 new depth features
DEPTH_FEATURES = [
    'f_pov_shift_rate',
    'f_subordination_depth',
    'f_clause_per_sentence',
]

# Suspect features (test saturation)
SUSPECT_FEATURES = [
    'f17_knife_count',
    'f29d_ttr_score',
    'f35c_hook_score',
    'f36c_cliff_score',
]

# Interaction features (computed below)
INTERACTION_NAMES = [
    'ix_mean_x_subdepth',      # f1_mean * f_subordination_depth
    'ix_pov_x_irony',          # f_pov_shift_rate * f28b_irony_density
    'ix_variance_x_longrate',  # f1a_rhythm_variance * f26b_long_sent_rate
]

ALL_FEATURE_NAMES = ORIG_FEATURES + DEPTH_FEATURES + SUSPECT_FEATURES + INTERACTION_NAMES


def safe(v):
    if v is None or not math.isfinite(v):
        return 0.0
    return float(v)


# ═════════════════════════════════════════════════════════════
# BUILD DATA MATRIX
# ═════════════════════════════════════════════════════════════

data = []  # list of (features_dict, tier_rank, filename)

for entry in master:
    fn = entry['filename']
    tier = entry.get('tier') or tier_lookup.get(fn, '?')
    if tier not in TIER_RANK:
        continue

    feats = entry['features']
    d_feats = depth_lookup.get(fn, {})

    row = {}
    for f in ORIG_FEATURES:
        row[f] = safe(feats.get(f, 0))
    for f in DEPTH_FEATURES:
        row[f] = safe(d_feats.get(f, 0))
    for f in SUSPECT_FEATURES:
        row[f] = safe(feats.get(f, 0))

    # Interactions
    row['ix_mean_x_subdepth'] = row.get('f1_mean', 0) * row.get('f_subordination_depth', 0)
    row['ix_pov_x_irony'] = row.get('f_pov_shift_rate', 0) * row.get('f28b_irony_density', 0)
    row['ix_variance_x_longrate'] = row.get('f1a_rhythm_variance', 0) * row.get('f26b_long_sent_rate', 0)

    data.append((row, TIER_RANK[tier], fn))

print(f"Data: {len(data)} samples, {len(ALL_FEATURE_NAMES)} features")

# ═════════════════════════════════════════════════════════════
# TRAIN / VALIDATION / HOLDOUT SPLIT (70/15/15)
# ═════════════════════════════════════════════════════════════

random.seed(42)  # Deterministic
indices = list(range(len(data)))
random.shuffle(indices)

n = len(data)
n_train = int(n * 0.70)
n_val = int(n * 0.15)

train_idx = indices[:n_train]
val_idx = indices[n_train:n_train + n_val]
hold_idx = indices[n_train + n_val:]

print(f"Split: train={len(train_idx)}, val={len(val_idx)}, holdout={len(hold_idx)}")


def build_matrices(idx_list):
    X = []
    y = []
    fns = []
    for i in idx_list:
        row, rank, fn = data[i]
        X.append([row[f] for f in ALL_FEATURE_NAMES])
        y.append(rank)
        fns.append(fn)
    return X, y, fns


X_train, y_train, fn_train = build_matrices(train_idx)
X_val, y_val, fn_val = build_matrices(val_idx)
X_hold, y_hold, fn_hold = build_matrices(hold_idx)

p = len(ALL_FEATURE_NAMES)


# ═════════════════════════════════════════════════════════════
# RIDGE REGRESSION (manual, no numpy)
# ═════════════════════════════════════════════════════════════

def standardize(X, means=None, stds=None):
    n = len(X)
    p = len(X[0])
    if means is None:
        means = [sum(X[i][j] for i in range(n)) / n for j in range(p)]
        stds = []
        for j in range(p):
            var = sum((X[i][j] - means[j]) ** 2 for i in range(n)) / max(n - 1, 1)
            stds.append(math.sqrt(var) if var > 0 else 1.0)
    X_std = [[(X[i][j] - means[j]) / stds[j] for j in range(p)] for i in range(n)]
    return X_std, means, stds


def ridge_fit(X, y, lam):
    n = len(X)
    p = len(X[0])
    # X^T X + lambda I
    XtX = [[0.0] * p for _ in range(p)]
    for i in range(n):
        for j in range(p):
            for k in range(p):
                XtX[j][k] += X[i][j] * X[i][k]
    for j in range(p):
        XtX[j][j] += lam
    # X^T y
    Xty = [sum(X[i][j] * y[i] for i in range(n)) for j in range(p)]
    # Cholesky solve
    return cholesky_solve(XtX, Xty)


def cholesky_solve(A, b):
    n = len(A)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                L[i][j] = math.sqrt(max(A[i][i] - s, 1e-12))
            else:
                L[i][j] = (A[i][j] - s) / L[j][j] if L[j][j] != 0 else 0
    z = [0.0] * n
    for i in range(n):
        z[i] = (b[i] - sum(L[i][k] * z[k] for k in range(i))) / L[i][i]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (z[i] - sum(L[j][i] * x[j] for j in range(i + 1, n))) / L[i][i]
    return x


def predict(X, w, intercept):
    return [intercept + sum(w[j] * X[i][j] for j in range(len(w))) for i in range(len(X))]


def r_squared(y_true, y_pred):
    m = sum(y_true) / len(y_true)
    ss_res = sum((y_true[i] - y_pred[i]) ** 2 for i in range(len(y_true)))
    ss_tot = sum((y_true[i] - m) ** 2 for i in range(len(y_true)))
    return 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0


def spearman(x_vals, y_vals):
    n = len(x_vals)
    if n < 3:
        return 0.0

    def rank_data(data):
        indexed = sorted(enumerate(data), key=lambda t: t[1])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and indexed[j + 1][1] == indexed[j][1]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                ranks[indexed[k][0]] = avg_rank
            i = j + 1
        return ranks

    rx = rank_data(x_vals)
    ry = rank_data(y_vals)
    d_sq = sum((rx[i] - ry[i]) ** 2 for i in range(n))
    return 1.0 - (6.0 * d_sq) / (n * (n * n - 1))


# Standardize on train
X_train_std, means, stds = standardize(X_train)
X_val_std, _, _ = standardize(X_val, means, stds)
X_hold_std, _, _ = standardize(X_hold, means, stds)

# Grid search lambda on validation
best_lam = 1.0
best_val_r2 = -999

for lam in [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0]:
    w_std = ridge_fit(X_train_std, y_train, lam)
    y_mean_train = sum(y_train) / len(y_train)
    intercept = y_mean_train  # standardized features have zero mean contribution

    y_pred_val = predict(X_val_std, w_std, intercept)
    val_r2 = r_squared(y_val, y_pred_val)
    val_rho = spearman(y_pred_val, y_val)
    print(f"  lambda={lam:<6} val_R2={val_r2:.4f}  val_rho={val_rho:.4f}")

    if val_r2 > best_val_r2:
        best_val_r2 = val_r2
        best_lam = lam

print(f"\n  Best lambda: {best_lam} (val_R2={best_val_r2:.4f})")

# Refit on train with best lambda
w_std = ridge_fit(X_train_std, y_train, best_lam)
y_mean_train = sum(y_train) / len(y_train)
intercept_std = y_mean_train

# Convert to original scale
w_orig = [w_std[j] / stds[j] for j in range(p)]
intercept_orig = y_mean_train - sum(w_orig[j] * means[j] for j in range(p))

# ═════════════════════════════════════════════════════════════
# EVALUATE ON ALL SPLITS
# ═════════════════════════════════════════════════════════════

def evaluate(X_raw, y_true, fns, label):
    y_pred = [intercept_orig + sum(w_orig[j] * X_raw[i][j] for j in range(p)) for i in range(len(X_raw))]
    r2 = r_squared(y_true, y_pred)
    rho = spearman(y_pred, y_true)

    # Tier-level analysis
    from collections import defaultdict
    tier_preds = defaultdict(list)
    tier_map = {5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D'}
    for i in range(len(y_true)):
        tier_preds[tier_map[y_true[i]]].append(y_pred[i])

    tier_means = {}
    for t in ['S', 'A', 'B', 'C', 'D']:
        vals = tier_preds.get(t, [])
        tier_means[t] = sum(vals) / len(vals) if vals else 0

    # Count S vs D inversions
    s_preds = tier_preds.get('S', [])
    d_preds = tier_preds.get('D', [])
    inversions = sum(1 for d in d_preds for s in s_preds if d >= s)
    total_pairs = len(s_preds) * len(d_preds) if d_preds else 1

    print(f"\n  {label}:")
    print(f"    R2={r2:.4f}  Spearman={rho:.4f}")
    print(f"    Tier means: S={tier_means.get('S',0):.3f} A={tier_means.get('A',0):.3f} B={tier_means.get('B',0):.3f} C={tier_means.get('C',0):.3f} D={tier_means.get('D',0):.3f}")
    print(f"    S vs D inversions: {inversions}/{total_pairs} ({inversions/total_pairs*100:.1f}%)")

    return r2, rho, tier_means, inversions, total_pairs, y_pred

train_r2, train_rho, train_tiers, _, _, _ = evaluate(X_train, y_train, fn_train, "TRAIN")
val_r2, val_rho, val_tiers, _, _, _ = evaluate(X_val, y_val, fn_val, "VALIDATION")
hold_r2, hold_rho, hold_tiers, hold_inv, hold_pairs, hold_preds = evaluate(X_hold, y_hold, fn_hold, "HOLDOUT")

# ═════════════════════════════════════════════════════════════
# FULL CORPUS EVALUATION
# ═════════════════════════════════════════════════════════════

X_all = [d[0] for d in data]
y_all = [d[1] for d in data]
fn_all = [d[2] for d in data]
X_all_raw = [[X_all[i][f] for f in ALL_FEATURE_NAMES] for i in range(len(X_all))]

# Fix: X_all is list of dicts, need to extract values
X_all_raw = []
for i in range(len(data)):
    row = data[i][0]
    X_all_raw.append([row[f] for f in ALL_FEATURE_NAMES])

full_r2, full_rho, full_tiers, full_inv, full_pairs, full_preds = evaluate(X_all_raw, y_all, fn_all, "FULL CORPUS")

# ═════════════════════════════════════════════════════════════
# FEATURE IMPORTANCE
# ═════════════════════════════════════════════════════════════

print("\n  Feature weights (sorted by |std_weight|):")
print(f"  {'Feature':<35} {'w_std':>10} {'w_orig':>12} {'Direction':>10}")
print(f"  {'-'*35} {'-'*10} {'-'*12} {'-'*10}")

importance = sorted(enumerate(w_std), key=lambda x: abs(x[1]), reverse=True)
for idx, w in importance:
    feat = ALL_FEATURE_NAMES[idx]
    direction = "+" if w > 0 else "-"
    print(f"  {feat:<35} {w:>+10.4f} {w_orig[idx]:>+12.6f} {direction:>10}")

# ═════════════════════════════════════════════════════════════
# SAVE WEIGHTS
# ═════════════════════════════════════════════════════════════

result = {
    "version": "V3",
    "method": "Ridge regression",
    "lambda": best_lam,
    "split": {"train": len(train_idx), "val": len(val_idx), "holdout": len(hold_idx)},
    "performance": {
        "train": {"r2": round(train_r2, 4), "spearman": round(train_rho, 4)},
        "validation": {"r2": round(val_r2, 4), "spearman": round(val_rho, 4)},
        "holdout": {"r2": round(hold_r2, 4), "spearman": round(hold_rho, 4),
                    "inversions_s_vs_d": hold_inv, "total_pairs_s_vs_d": hold_pairs},
        "full": {"r2": round(full_r2, 4), "spearman": round(full_rho, 4),
                 "inversions_s_vs_d": full_inv, "total_pairs_s_vs_d": full_pairs},
    },
    "tier_predictions": {
        "train": {k: round(v, 4) for k, v in train_tiers.items()},
        "holdout": {k: round(v, 4) for k, v in hold_tiers.items()},
        "full": {k: round(v, 4) for k, v in full_tiers.items()},
    },
    "intercept": round(intercept_orig, 6),
    "features": {},
    "normalization": {
        "means": {ALL_FEATURE_NAMES[j]: round(means[j], 6) for j in range(p)},
        "stds": {ALL_FEATURE_NAMES[j]: round(stds[j], 6) for j in range(p)},
    },
}

for j in range(p):
    feat = ALL_FEATURE_NAMES[j]
    result["features"][feat] = {
        "weight_raw": round(w_orig[j], 6),
        "weight_std": round(w_std[j], 4),
        "mean": round(means[j], 6),
        "std": round(stds[j], 6),
    }

with open(OUT_WEIGHTS, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

# ═════════════════════════════════════════════════════════════
# GENERATE REPORT
# ═════════════════════════════════════════════════════════════

lines = []
lines.append("# OMEGA Phase R-6 — Scorer V3 Report")
lines.append(f"**Date**: 2026-03-21")
lines.append(f"**Method**: Ridge Regression (lambda={best_lam})")
lines.append(f"**Split**: train={len(train_idx)} / val={len(val_idx)} / holdout={len(hold_idx)}")
lines.append("")
lines.append("## Performance")
lines.append("")
lines.append("| Set | R2 | Spearman | S vs D inversions |")
lines.append("|-----|------|----------|-------------------|")
lines.append(f"| Train | {train_r2:.4f} | {train_rho:.4f} | - |")
lines.append(f"| Validation | {val_r2:.4f} | {val_rho:.4f} | - |")
lines.append(f"| Holdout | {hold_r2:.4f} | {hold_rho:.4f} | {hold_inv}/{hold_pairs} |")
lines.append(f"| Full | {full_r2:.4f} | {full_rho:.4f} | {full_inv}/{full_pairs} |")
lines.append("")
lines.append("## Tier Predictions (mean predicted score)")
lines.append("")
lines.append("| Tier | Train | Holdout | Full | Target |")
lines.append("|------|-------|---------|------|--------|")
for t, target in [('S', 5), ('A', 4), ('B', 3), ('C', 2), ('D', 1)]:
    lines.append(f"| {t} | {train_tiers.get(t,0):.3f} | {hold_tiers.get(t,0):.3f} | {full_tiers.get(t,0):.3f} | {target} |")
lines.append("")
lines.append("## Feature Weights (sorted by |standardized weight|)")
lines.append("")
lines.append("| Feature | Std Weight | Raw Weight |")
lines.append("|---------|-----------|-----------|")
for idx, w in importance:
    feat = ALL_FEATURE_NAMES[idx]
    lines.append(f"| `{feat}` | {w:+.4f} | {w_orig[idx]:+.6f} |")
lines.append("")

# Verdicts
lines.append("## Verdicts")
lines.append("")
checks = [
    (f"Spearman > 0.5 (full)", full_rho > 0.5, f"{full_rho:.4f}"),
    (f"R2 > 0.40 (holdout)", hold_r2 > 0.40, f"{hold_r2:.4f}"),
    (f"Zero S vs D inversions (full)", full_inv == 0, f"{full_inv}/{full_pairs}"),
    (f"Holdout close to train (R2 delta < 0.10)", abs(train_r2 - hold_r2) < 0.10, f"delta={abs(train_r2 - hold_r2):.4f}"),
]
for desc, passed, val in checks:
    status = "PASS" if passed else "FAIL"
    lines.append(f"- [{status}] {desc}: {val}")

report = '\n'.join(lines)
with open(OUT_REPORT, 'w', encoding='utf-8') as f:
    f.write(report)

print(f"\n  Weights saved: {OUT_WEIGHTS}")
print(f"  Report saved: {OUT_REPORT}")

# OVERALL VERDICT
print("\n" + "=" * 70)
all_pass = all(c[1] for c in checks)
if all_pass:
    print("  VERDICT: ALL CHECKS PASS")
else:
    fails = [c[0] for c in checks if not c[1]]
    print(f"  VERDICT: {len(fails)} CHECK(S) FAILED")
    for f in fails:
        print(f"    - {f}")
print("=" * 70)
