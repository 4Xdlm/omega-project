"""
OMEGA Phase P0.1 — Export GB V1 Model to JSON
Trains exact GB (seed=42) and exports 50 trees as JSON for TS inference.
Source of truth: r7_multiscale_scorer_v2.py feature order.
"""
import json
import math
import os
import random
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from scipy.stats import spearmanr

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")
TXT_DIR = os.path.join(ROOT, "omega-autopsie/corpus_r/txt")
OUT = os.path.join(ROOT, "packages/sovereign-engine/src/scoring/data/GB_V1_MODEL.json")

def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return 0.0
    return float(v)

# ═══════════════════════════════════════════════════════════════
# EXACT feature order from r7_multiscale_scorer_v2.py
# ═══════════════════════════════════════════════════════════════

V3_FEATURES = [
    'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
    'f24c_contrast_delta', 'f28b_irony_density', 'f27a_epistemic_rate',
    'f9a_contradiction_rate', 'f19a_approx_entropy', 'f27d_modal_score',
    'f26c_period_score',
    'f_pov_shift_rate', 'f_subordination_depth', 'f_clause_per_sentence',
    'f17_knife_count', 'f29d_ttr_score', 'f35c_hook_score', 'f36c_cliff_score',
    'ix_mean_x_subdepth', 'ix_pov_x_irony', 'ix_variance_x_longrate',
]

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

# ═══════════════════════════════════════════════════════════════
# LOAD DATA (exact same as r7_multiscale_scorer_v2.py)
# ═══════════════════════════════════════════════════════════════

print("Loading data...")
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
TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}

ORIG_F = ['f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean', 'f24c_contrast_delta',
          'f28b_irony_density', 'f27a_epistemic_rate', 'f9a_contradiction_rate',
          'f19a_approx_entropy', 'f27d_modal_score', 'f26c_period_score']
DEPTH_F = ['f_pov_shift_rate', 'f_subordination_depth', 'f_clause_per_sentence']
SUSPECT_F = ['f17_knife_count', 'f29d_ttr_score', 'f35c_hook_score', 'f36c_cliff_score']

data = []
for entry in master:
    fn = entry['filename']
    tier = entry.get('tier') or tier_lookup.get(fn, '?')
    if tier not in TIER_RANK:
        continue
    feats = entry['features']
    df = depth_lookup.get(fn, {})
    sf = semantic_lookup.get(fn, {})
    row = {}
    for ff in ORIG_F:
        row[ff] = safe(feats.get(ff, 0))
    for ff in DEPTH_F:
        row[ff] = safe(df.get(ff, 0))
    for ff in SUSPECT_F:
        row[ff] = safe(feats.get(ff, 0))
    row['ix_mean_x_subdepth'] = row['f1_mean'] * row['f_subordination_depth']
    row['ix_pov_x_irony'] = row['f_pov_shift_rate'] * row['f28b_irony_density']
    row['ix_variance_x_longrate'] = row['f1a_rhythm_variance'] * row['f26b_long_sent_rate']
    for ff in SEMANTIC_FEATURES:
        row[ff] = safe(sf.get(ff, 0))
    data.append((row, TIER_RANK[tier], fn))

print(f"  {len(data)} samples loaded")

# ═══════════════════════════════════════════════════════════════
# SAME SPLIT (seed=42, 70% train)
# ═══════════════════════════════════════════════════════════════

random.seed(42)
indices = list(range(len(data)))
random.shuffle(indices)
n_train = int(len(data) * 0.70)
train_idx = indices[:n_train]

X_train = np.array([[data[i][0].get(f, 0) for f in ALL_FEATURES] for i in train_idx])
y_train = np.array([data[i][1] for i in train_idx])

# Full corpus
X_all = np.array([[data[i][0].get(f, 0) for f in ALL_FEATURES] for i in range(len(data))])
y_all = np.array([data[i][1] for i in range(len(data))])

# ═══════════════════════════════════════════════════════════════
# TRAIN GB (exact same params)
# ═══════════════════════════════════════════════════════════════

print("Training GB V1...")
gb = GradientBoostingRegressor(
    n_estimators=50, max_depth=4, learning_rate=0.05,
    random_state=42, subsample=0.8, min_samples_leaf=5,
)
gb.fit(X_train, y_train)

# Verify Spearman
pred_all = gb.predict(X_all)
rho, _ = spearmanr(pred_all, y_all)
print(f"  Full Spearman: {rho:.4f}")
assert abs(rho - 0.7865) < 0.01, f"Spearman mismatch: {rho:.4f} vs expected 0.7865"

# ═══════════════════════════════════════════════════════════════
# EXPORT TREES AS JSON
# ═══════════════════════════════════════════════════════════════

print("Exporting 50 trees...")

init_value = float(gb.init_.constant_[0][0]) if hasattr(gb.init_, 'constant_') else float(np.mean(y_train))

trees_json = []
for i, estimator_arr in enumerate(gb.estimators_):
    tree = estimator_arr[0].tree_
    n_nodes = tree.node_count
    nodes = []
    for j in range(n_nodes):
        is_leaf = bool(tree.children_left[j] == -1)
        node = {
            'feature_index': int(tree.feature[j]) if not is_leaf else -1,
            'threshold': round(float(tree.threshold[j]), 10) if not is_leaf else 0.0,
            'left_child': int(tree.children_left[j]) if not is_leaf else -1,
            'right_child': int(tree.children_right[j]) if not is_leaf else -1,
            'value': round(float(tree.value[j][0][0]), 10),
            'is_leaf': is_leaf,
        }
        nodes.append(node)
    trees_json.append({'tree_index': i, 'n_nodes': n_nodes, 'nodes': nodes})

# Sanity check: predict 5 reference samples manually
def predict_manual(trees, init_val, lr, x):
    pred = init_val
    for tree_data in trees:
        node = 0
        while not tree_data['nodes'][node]['is_leaf']:
            n = tree_data['nodes'][node]
            if x[n['feature_index']] <= n['threshold']:
                node = n['left_child']
            else:
                node = n['right_child']
        pred += lr * tree_data['nodes'][node]['value']
    return pred

# Select 5 reference texts: S, A, B, C, D
sanity_samples = []
tier_found = {}
for i in range(len(data)):
    tier = {5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D'}[data[i][1]]
    if tier not in tier_found:
        x = [data[i][0].get(f, 0) for f in ALL_FEATURES]
        sklearn_score = float(gb.predict(np.array([x]))[0])
        manual_score = predict_manual(trees_json, init_value, 0.05, x)
        sanity_samples.append({
            'filename': data[i][2],
            'tier': tier,
            'tier_rank': data[i][1],
            'features': {ALL_FEATURES[j]: round(x[j], 6) for j in range(len(ALL_FEATURES))},
            'sklearn_score': round(sklearn_score, 6),
            'manual_score': round(manual_score, 6),
            'delta': round(abs(sklearn_score - manual_score), 8),
        })
        tier_found[tier] = True
        print(f"  Sanity {tier}: sklearn={sklearn_score:.4f}  manual={manual_score:.4f}  delta={abs(sklearn_score-manual_score):.8f}")
    if len(tier_found) == 5:
        break

# Feature importance
importance = {ALL_FEATURES[i]: round(float(gb.feature_importances_[i]), 6) for i in range(len(ALL_FEATURES))}

# ═══════════════════════════════════════════════════════════════
# SAVE JSON
# ═══════════════════════════════════════════════════════════════

model_json = {
    'version': 'GB_V1',
    'date': '2026-03-22',
    'phase': 'P0',
    'description': 'Gradient Boosting V1 — 50 trees, 42 features, Spearman 0.79',
    'params': {
        'n_estimators': 50,
        'max_depth': 4,
        'learning_rate': 0.05,
        'random_state': 42,
        'subsample': 0.8,
        'min_samples_leaf': 5,
    },
    'training': {
        'n_samples': len(train_idx),
        'n_features': len(ALL_FEATURES),
        'split_seed': 42,
        'split_ratio': 0.70,
    },
    'performance': {
        'full_spearman': round(float(rho), 4),
    },
    'init_value': round(init_value, 10),
    'feature_names': ALL_FEATURES,
    'feature_importance': importance,
    'trees': trees_json,
    'sanity_check': sanity_samples,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(model_json, f, indent=2, ensure_ascii=False)

print(f"\n  Saved: {OUT}")
print(f"  Trees: {len(trees_json)}")
print(f"  Features: {len(ALL_FEATURES)}")
print(f"  Init value: {init_value:.6f}")
print(f"  Spearman: {rho:.4f}")
print(f"  Sanity deltas: {[s['delta'] for s in sanity_samples]}")
print("\n  EXPORT COMPLETE")
