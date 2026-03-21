"""
OMEGA Phase R-6b — Tribunal de Contrefaçon
Model comparison: Ridge V3 baseline vs Ridge+semantic vs GradientBoosting+all
Same split as V3 (seed=42, 70/15/15).
"""
import json
import math
import os
import random
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score
from collections import defaultdict

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")
OUT_COMPARISON = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_MODEL_COMPARISON.json")
OUT_DIAGNOSTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_DIAGNOSTIC_REPORT.json")

# Load data
with open(MASTER, 'r', encoding='utf-8') as f:
    master = json.load(f)
with open(DEPTH, 'r', encoding='utf-8') as f:
    depth_data = json.load(f)
with open(TIERS, 'r', encoding='utf-8') as f:
    tiers_data = json.load(f)
with open(SEMANTIC, 'r', encoding='utf-8') as f:
    semantic_data = json.load(f)

tier_lookup = {e['filename']: e.get('tier_suggestion', '?') for e in tiers_data}
depth_lookup = {e['filename']: e['depth_features'] for e in depth_data}
semantic_lookup = {e['filename']: e['semantic_features'] for e in semantic_data}

# Author lookup for diagnostic
author_lookup = {e['filename']: e.get('author_guess', '') for e in tiers_data}

TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}

# ═══════════════════════════════════════════════════════════════
# FEATURE SETS (exact same as V3 for baseline)
# ═══════════════════════════════════════════════════════════════

ORIG_FEATURES = [
    'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
    'f24c_contrast_delta', 'f28b_irony_density', 'f27a_epistemic_rate',
    'f9a_contradiction_rate', 'f19a_approx_entropy', 'f27d_modal_score',
    'f26c_period_score',
]
DEPTH_FEATURES = ['f_pov_shift_rate', 'f_subordination_depth', 'f_clause_per_sentence']
SUSPECT_FEATURES = ['f17_knife_count', 'f29d_ttr_score', 'f35c_hook_score', 'f36c_cliff_score']
INTERACTION_NAMES = ['ix_mean_x_subdepth', 'ix_pov_x_irony', 'ix_variance_x_longrate']

V3_FEATURES = ORIG_FEATURES + DEPTH_FEATURES + SUSPECT_FEATURES + INTERACTION_NAMES

# New semantic features
SEMANTIC_FEATURES = [
    'f_referent_continuity', 'f_referent_orphan_rate', 'f_entity_persistence',
    'f_lexical_progression', 'f_semantic_stagnation', 'f_novelty_curve_slope',
    'f_contextual_precision', 'f_rare_word_isolation',
    'f_hapax_contextual_rate', 'f_vocabulary_depth',
    'f_tension_density', 'f_desire_negation_rate', 'f_perception_conflict_rate',
    'f_pov_drift_rate', 'f_pov_rupture_rate', 'f_pov_stability',
    'f_causal_density', 'f_causal_chain_length', 'f_temporal_anchor_rate',
    'f_echo_density', 'f_lexical_callback_rate', 'f_motif_concentration',
]

ALL_FEATURES = V3_FEATURES + SEMANTIC_FEATURES


def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return 0.0
    return float(v)


# ═══════════════════════════════════════════════════════════════
# BUILD DATA
# ═══════════════════════════════════════════════════════════════

data = []

for entry in master:
    fn = entry['filename']
    tier = entry.get('tier') or tier_lookup.get(fn, '?')
    if tier not in TIER_RANK:
        continue

    feats = entry['features']
    d_feats = depth_lookup.get(fn, {})
    s_feats = semantic_lookup.get(fn, {})

    row = {}
    # V3 features
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

    # Semantic features
    for f in SEMANTIC_FEATURES:
        row[f] = safe(s_feats.get(f, 0))

    data.append((row, TIER_RANK[tier], fn))

print(f"Data: {len(data)} samples")

# ═══════════════════════════════════════════════════════════════
# SAME SPLIT AS V3 (seed=42, 70/15/15)
# ═══════════════════════════════════════════════════════════════

random.seed(42)
indices = list(range(len(data)))
random.shuffle(indices)

n = len(data)
n_train = int(n * 0.70)
n_val = int(n * 0.15)

train_idx = indices[:n_train]
val_idx = indices[n_train:n_train + n_val]
hold_idx = indices[n_train + n_val:]

print(f"Split: train={len(train_idx)}, val={len(val_idx)}, holdout={len(hold_idx)}")


def build_matrices(idx_list, feature_names):
    X = []
    y = []
    fns = []
    for i in idx_list:
        row, rank, fn = data[i]
        X.append([row.get(f, 0) for f in feature_names])
        y.append(rank)
        fns.append(fn)
    return np.array(X), np.array(y), fns


# ═══════════════════════════════════════════════════════════════
# METRICS
# ═══════════════════════════════════════════════════════════════

def spearman(x_vals, y_vals):
    from scipy.stats import spearmanr
    rho, _ = spearmanr(x_vals, y_vals)
    return rho


# Manual spearman fallback
def spearman_manual(x_vals, y_vals):
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

    rx = rank_data(list(x_vals))
    ry = rank_data(list(y_vals))
    d_sq = sum((rx[i] - ry[i]) ** 2 for i in range(n))
    return 1.0 - (6.0 * d_sq) / (n * (n * n - 1))


try:
    from scipy.stats import spearmanr
    def compute_spearman(x, y):
        rho, _ = spearmanr(x, y)
        return rho
except ImportError:
    compute_spearman = spearman_manual


def count_inversions(y_true, y_pred, tier_a=5, tier_b=1):
    """Count pairs where tier_b is predicted >= tier_a"""
    a_preds = [y_pred[i] for i in range(len(y_true)) if y_true[i] == tier_a]
    b_preds = [y_pred[i] for i in range(len(y_true)) if y_true[i] == tier_b]
    inv = sum(1 for b in b_preds for a in a_preds if b >= a)
    total = len(a_preds) * len(b_preds) if b_preds else 1
    return inv, total


def tier_means(y_true, y_pred):
    tier_map = {5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D'}
    tier_preds = defaultdict(list)
    for i in range(len(y_true)):
        tier_preds[tier_map[y_true[i]]].append(y_pred[i])
    result = {}
    for t in ['S', 'A', 'B', 'C', 'D']:
        vals = tier_preds.get(t, [])
        result[t] = sum(vals) / len(vals) if vals else 0
    return result


def evaluate_model(name, model, X_train, y_train, X_val, y_val, X_hold, y_hold, X_all, y_all, fn_all):
    """Full evaluation of a model"""
    pred_train = model.predict(X_train)
    pred_val = model.predict(X_val)
    pred_hold = model.predict(X_hold)
    pred_all = model.predict(X_all)

    r2_train = r2_score(y_train, pred_train)
    r2_val = r2_score(y_val, pred_val)
    r2_hold = r2_score(y_hold, pred_hold)
    r2_full = r2_score(y_all, pred_all)

    rho_train = compute_spearman(pred_train, y_train)
    rho_val = compute_spearman(pred_val, y_val)
    rho_hold = compute_spearman(pred_hold, y_hold)
    rho_full = compute_spearman(pred_all, y_all)

    inv_hold, inv_hold_total = count_inversions(y_hold, pred_hold)
    inv_full, inv_full_total = count_inversions(y_all, pred_all)

    tm_train = tier_means(y_train, pred_train)
    tm_hold = tier_means(y_hold, pred_hold)
    tm_full = tier_means(y_all, pred_all)

    # Author-level diagnostic
    author_diag = compute_author_diagnostic(y_all, pred_all, fn_all)

    result = {
        'name': name,
        'train': {'r2': round(r2_train, 4), 'spearman': round(rho_train, 4)},
        'validation': {'r2': round(r2_val, 4), 'spearman': round(rho_val, 4)},
        'holdout': {
            'r2': round(r2_hold, 4), 'spearman': round(rho_hold, 4),
            'inversions_s_vs_d': inv_hold, 'total_pairs': inv_hold_total,
        },
        'full': {
            'r2': round(r2_full, 4), 'spearman': round(rho_full, 4),
            'inversions_s_vs_d': inv_full, 'total_pairs': inv_full_total,
        },
        'tier_predictions': {
            'train': {k: round(v, 4) for k, v in tm_train.items()},
            'holdout': {k: round(v, 4) for k, v in tm_hold.items()},
            'full': {k: round(v, 4) for k, v in tm_full.items()},
        },
        'author_diagnostic': author_diag,
    }

    print(f"\n{'='*70}")
    print(f"  MODEL: {name}")
    print(f"{'='*70}")
    print(f"  Train:      R²={r2_train:.4f}  Spearman={rho_train:.4f}")
    print(f"  Validation: R²={r2_val:.4f}  Spearman={rho_val:.4f}")
    print(f"  Holdout:    R²={r2_hold:.4f}  Spearman={rho_hold:.4f}  S-D inv={inv_hold}/{inv_hold_total}")
    print(f"  Full:       R²={r2_full:.4f}  Spearman={rho_full:.4f}  S-D inv={inv_full}/{inv_full_total}")
    print(f"  Tier means (full): S={tm_full['S']:.3f} A={tm_full['A']:.3f} B={tm_full['B']:.3f} C={tm_full['C']:.3f} D={tm_full['D']:.3f}")

    return result


def compute_author_diagnostic(y_all, pred_all, fn_all):
    """Per-author diagnostic for key authors"""
    target_authors = {
        'flaubert': 'Flaubert',
        'proust': 'Proust',
        'hugo': 'Hugo',
        'camus': 'Camus',
        'zola': 'Zola',
        'claude': 'Claude Opus',
        'gpt': 'GPT',
        'riviera': 'Riviera',
        'gemini': 'Gemini',
        'perplexity': 'Perplexity',
    }

    author_preds = defaultdict(list)
    author_true = defaultdict(list)

    for i, fn in enumerate(fn_all):
        fn_lower = fn.lower()
        author_name = author_lookup.get(fn, '')
        author_lower = author_name.lower() if author_name else ''

        for key, label in target_authors.items():
            if key in fn_lower or key in author_lower:
                author_preds[label].append(pred_all[i])
                author_true[label].append(y_all[i])
                break

    diag = {}
    for label in target_authors.values():
        preds = author_preds.get(label, [])
        trues = author_true.get(label, [])
        if not preds:
            continue
        diag[label] = {
            'count': len(preds),
            'mean_pred': round(float(np.mean(preds)), 4),
            'min_pred': round(float(np.min(preds)), 4),
            'max_pred': round(float(np.max(preds)), 4),
            'mean_true': round(float(np.mean(trues)), 4),
        }
    return diag


# ═══════════════════════════════════════════════════════════════
# MODEL 1: Ridge V3 baseline (exact reproduction)
# ═══════════════════════════════════════════════════════════════

print("\n" + "=" * 70)
print("  TRAINING 3 MODELS")
print("=" * 70)

# Build matrices for each feature set
X_train_v3, y_train_v3, fn_train_v3 = build_matrices(train_idx, V3_FEATURES)
X_val_v3, y_val_v3, fn_val_v3 = build_matrices(val_idx, V3_FEATURES)
X_hold_v3, y_hold_v3, fn_hold_v3 = build_matrices(hold_idx, V3_FEATURES)
X_all_v3, y_all_v3, fn_all_v3 = build_matrices(list(range(len(data))), V3_FEATURES)

# Grid search lambda for Ridge V3 (reproduce)
best_lam_v3 = 50.0
best_val_r2_v3 = -999
for lam in [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0]:
    model = Ridge(alpha=lam)
    model.fit(X_train_v3, y_train_v3)
    pred = model.predict(X_val_v3)
    r2 = r2_score(y_val_v3, pred)
    if r2 > best_val_r2_v3:
        best_val_r2_v3 = r2
        best_lam_v3 = lam

print(f"\n  Ridge V3: best lambda={best_lam_v3}")
ridge_v3 = Ridge(alpha=best_lam_v3)
ridge_v3.fit(X_train_v3, y_train_v3)

result_v3 = evaluate_model(
    "Ridge V3 (baseline)", ridge_v3,
    X_train_v3, y_train_v3, X_val_v3, y_val_v3,
    X_hold_v3, y_hold_v3, X_all_v3, y_all_v3, fn_all_v3,
)

# ═══════════════════════════════════════════════════════════════
# MODEL 2: Ridge V3 + Semantic features
# ═══════════════════════════════════════════════════════════════

X_train_all, y_train_all, fn_train_all = build_matrices(train_idx, ALL_FEATURES)
X_val_all, y_val_all, fn_val_all = build_matrices(val_idx, ALL_FEATURES)
X_hold_all, y_hold_all, fn_hold_all = build_matrices(hold_idx, ALL_FEATURES)
X_all_all, y_all_all, fn_all_all = build_matrices(list(range(len(data))), ALL_FEATURES)

best_lam_rs = 50.0
best_val_r2_rs = -999
for lam in [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0, 200.0]:
    model = Ridge(alpha=lam)
    model.fit(X_train_all, y_train_all)
    pred = model.predict(X_val_all)
    r2 = r2_score(y_val_all, pred)
    if r2 > best_val_r2_rs:
        best_val_r2_rs = r2
        best_lam_rs = lam

print(f"\n  Ridge+Semantic: best lambda={best_lam_rs}")
ridge_semantic = Ridge(alpha=best_lam_rs)
ridge_semantic.fit(X_train_all, y_train_all)

result_rs = evaluate_model(
    "Ridge V3 + Semantic", ridge_semantic,
    X_train_all, y_train_all, X_val_all, y_val_all,
    X_hold_all, y_hold_all, X_all_all, y_all_all, fn_all_all,
)

# Feature importance for Ridge+Semantic
ridge_importance = sorted(
    zip(ALL_FEATURES, ridge_semantic.coef_),
    key=lambda x: abs(x[1]), reverse=True
)
print("\n  Ridge+Semantic top 15 features:")
for fname, coef in ridge_importance[:15]:
    print(f"    {fname:<35} {coef:+.6f}")

# ═══════════════════════════════════════════════════════════════
# MODEL 3: Gradient Boosting + all features
# ═══════════════════════════════════════════════════════════════

# Grid search GB hyperparameters
best_gb_params = None
best_gb_val_r2 = -999

for n_est in [50, 100, 200]:
    for depth in [2, 3, 4]:
        for lr in [0.05, 0.1, 0.2]:
            gb = GradientBoostingRegressor(
                n_estimators=n_est, max_depth=depth, learning_rate=lr,
                random_state=42, subsample=0.8, min_samples_leaf=5,
            )
            gb.fit(X_train_all, y_train_all)
            pred = gb.predict(X_val_all)
            r2 = r2_score(y_val_all, pred)
            if r2 > best_gb_val_r2:
                best_gb_val_r2 = r2
                best_gb_params = {'n_estimators': n_est, 'max_depth': depth, 'learning_rate': lr}

print(f"\n  GB best params: {best_gb_params} (val_R2={best_gb_val_r2:.4f})")

gb_model = GradientBoostingRegressor(
    n_estimators=best_gb_params['n_estimators'],
    max_depth=best_gb_params['max_depth'],
    learning_rate=best_gb_params['learning_rate'],
    random_state=42, subsample=0.8, min_samples_leaf=5,
)
gb_model.fit(X_train_all, y_train_all)

result_gb = evaluate_model(
    "Gradient Boosting + All", gb_model,
    X_train_all, y_train_all, X_val_all, y_val_all,
    X_hold_all, y_hold_all, X_all_all, y_all_all, fn_all_all,
)

# GB feature importance
gb_importance = sorted(
    zip(ALL_FEATURES, gb_model.feature_importances_),
    key=lambda x: x[1], reverse=True
)
result_gb['feature_importance'] = {fname: round(float(imp), 6) for fname, imp in gb_importance[:20]}

print("\n  GB top 15 features:")
for fname, imp in gb_importance[:15]:
    print(f"    {fname:<35} {imp:.6f}")

# ═══════════════════════════════════════════════════════════════
# COMPARISON TABLE
# ═══════════════════════════════════════════════════════════════

print("\n" + "=" * 70)
print("  COMPARISON TABLE")
print("=" * 70)
print(f"\n  {'Model':<30} {'Train R2':>10} {'Hold R2':>10} {'Full rho':>10} {'S-D inv':>10}")
print(f"  {'-'*30} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
for res in [result_v3, result_rs, result_gb]:
    inv_str = f"{res['full']['inversions_s_vs_d']}/{res['full']['total_pairs']}"
    print(f"  {res['name']:<30} {res['train']['r2']:>10.4f} {res['holdout']['r2']:>10.4f} {res['full']['spearman']:>10.4f} {inv_str:>10}")

# Author diagnostic comparison
print("\n  AUTHOR DIAGNOSTIC:")
print(f"  {'Author':<20} {'V3':>8} {'Ridge+S':>8} {'GB+All':>8} {'True':>8}")
print(f"  {'-'*20} {'-'*8} {'-'*8} {'-'*8} {'-'*8}")
all_authors = set(result_v3['author_diagnostic'].keys()) | set(result_rs['author_diagnostic'].keys()) | set(result_gb['author_diagnostic'].keys())
for author in ['Flaubert', 'Proust', 'Hugo', 'Camus', 'Zola', 'Claude Opus', 'GPT', 'Riviera', 'Gemini', 'Perplexity']:
    if author not in all_authors:
        continue
    v3_pred = result_v3['author_diagnostic'].get(author, {}).get('mean_pred', 0)
    rs_pred = result_rs['author_diagnostic'].get(author, {}).get('mean_pred', 0)
    gb_pred = result_gb['author_diagnostic'].get(author, {}).get('mean_pred', 0)
    true_val = result_v3['author_diagnostic'].get(author, {}).get('mean_true', 0)
    print(f"  {author:<20} {v3_pred:>8.3f} {rs_pred:>8.3f} {gb_pred:>8.3f} {true_val:>8.1f}")

# Key comparison: Claude Opus vs Flaubert gap
print("\n  CRITICAL TEST: Claude Opus vs Flaubert")
for name, res in [("V3", result_v3), ("Ridge+S", result_rs), ("GB+All", result_gb)]:
    fl = res['author_diagnostic'].get('Flaubert', {}).get('mean_pred', 0)
    cl = res['author_diagnostic'].get('Claude Opus', {}).get('mean_pred', 0)
    gap = fl - cl
    direction = "Flaubert > Claude" if gap > 0 else "Claude > Flaubert"
    print(f"    {name:<15} Flaubert={fl:.3f}  Claude={cl:.3f}  gap={gap:+.3f}  ({direction})")

# ═══════════════════════════════════════════════════════════════
# SAVE RESULTS
# ═══════════════════════════════════════════════════════════════

comparison = {
    'phase': 'R-6b',
    'title': 'Tribunal de Contrefaçon',
    'date': '2026-03-21',
    'split': {'train': len(train_idx), 'val': len(val_idx), 'holdout': len(hold_idx)},
    'models': [result_v3, result_rs, result_gb],
    'ridge_semantic_lambda': best_lam_rs,
    'gb_params': best_gb_params,
    'ridge_semantic_top_features': [
        {'name': fname, 'weight': round(float(coef), 6)}
        for fname, coef in ridge_importance[:25]
    ],
    'gb_top_features': [
        {'name': fname, 'importance': round(float(imp), 6)}
        for fname, imp in gb_importance[:25]
    ],
}

with open(OUT_COMPARISON, 'w', encoding='utf-8') as f:
    json.dump(comparison, f, indent=2, ensure_ascii=False)
print(f"\nSaved: {OUT_COMPARISON}")

# Diagnostic report
diagnostic = {
    'phase': 'R-6b',
    'critical_test': {
        'description': 'Claude Opus vs Flaubert separation',
        'results': {},
    },
    'tier_ordering': {},
    'new_features_impact': {},
}

for name, res in [("V3_baseline", result_v3), ("Ridge_Semantic", result_rs), ("GB_All", result_gb)]:
    fl = res['author_diagnostic'].get('Flaubert', {}).get('mean_pred', 0)
    cl = res['author_diagnostic'].get('Claude Opus', {}).get('mean_pred', 0)
    diagnostic['critical_test']['results'][name] = {
        'flaubert_pred': round(fl, 4),
        'claude_pred': round(cl, 4),
        'gap': round(fl - cl, 4),
        'correct_ordering': bool(fl > cl),
    }
    # Tier ordering check
    tm = res['tier_predictions']['full']
    ordering_correct = bool(
        tm.get('S', 0) > tm.get('A', 0) > tm.get('B', 0) > tm.get('C', 0) > tm.get('D', 0)
    )
    diagnostic['tier_ordering'][name] = {
        'means': tm,
        'correct_s_a_b_c_d': ordering_correct,
    }

# Semantic features individual impact (by Spearman on full corpus)
sem_impact = {}
y_all_np = np.array([data[i][1] for i in range(len(data))])
for sf in SEMANTIC_FEATURES:
    sf_vals = np.array([data[i][0].get(sf, 0) for i in range(len(data))])
    rho = compute_spearman(sf_vals, y_all_np)
    sem_impact[sf] = round(float(rho), 4)

diagnostic['new_features_impact'] = dict(sorted(sem_impact.items(), key=lambda x: abs(x[1]), reverse=True))

with open(OUT_DIAGNOSTIC, 'w', encoding='utf-8') as f:
    json.dump(diagnostic, f, indent=2, ensure_ascii=False)
print(f"Saved: {OUT_DIAGNOSTIC}")

# Print feature impact
print("\n  SEMANTIC FEATURES INDIVIDUAL SPEARMAN:")
for sf, rho in sorted(sem_impact.items(), key=lambda x: abs(x[1]), reverse=True):
    direction = "+" if rho > 0 else "-"
    print(f"    {sf:<35} rho={rho:+.4f}")

print("\n" + "=" * 70)
print("  TRIBUNAL R-6b COMPLETE")
print("=" * 70)
