#!/usr/bin/env python3
"""
OMEGA Phase R-8.5 — TIPPING POINTS EXTRACTION FROM GB
══════════════════════════════════════════════════════
Extract decision thresholds (Tk) from the trained Gradient Boosting model.

The GB (Spearman 0.79, 19 S/D inversions) already knows WHERE the tipping
points are. R-8.5 makes this knowledge EXPLICIT and DOCUMENTED.

Extracts:
  1. Feature importance ranking (which features drive splits)
  2. Split threshold distribution per feature (WHERE it splits)
  3. Most common split values (the Tk constants)
  4. Interaction patterns (which features co-occur in same branch)
  5. Conditional effects (if feature_A > threshold, what happens to prediction)

Standard: NASA-Grade L4 — zero hand-tuning, all values EXTRACTED from trained model.
"""

import json, math, os, random
from collections import Counter, defaultdict
from datetime import datetime
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json")
OUT_FILE = os.path.join(ROOT, "omega-autopsie/results_phase_r8/R8_TIPPING_POINTS.json")

SEED = 42
TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}

# ═══════════════════════════════════════════════════════════════
# FEATURE LISTS (same as r6b_tribunal.py)
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

V3_FEATURES = ORIG_FEATURES + DEPTH_FEATURES + SUSPECT_FEATURES + INTERACTION_NAMES
ALL_FEATURES = V3_FEATURES + SEMANTIC_FEATURES

def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return 0.0
    return float(v)

def r5(v):
    return round(float(v), 5)

# ═══════════════════════════════════════════════════════════════
# LOAD DATA + RETRAIN GB (exact same pipeline as r6b_tribunal)
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  OMEGA R-8.5 -- TIPPING POINTS EXTRACTION FROM GB")
    print("=" * 70)

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
    semantic_lookup = {e['filename']: e.get('semantic_features', {}) for e in semantic_data}

    # Build dataset
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
        for ft in ORIG_FEATURES:
            row[ft] = safe(feats.get(ft, 0))
        for ft in DEPTH_FEATURES:
            row[ft] = safe(d_feats.get(ft, 0))
        for ft in SUSPECT_FEATURES:
            row[ft] = safe(feats.get(ft, 0))
        # Interactions
        row['ix_mean_x_subdepth'] = row.get('f1_mean', 0) * row.get('f_subordination_depth', 0)
        row['ix_pov_x_irony'] = row.get('f_pov_shift_rate', 0) * row.get('f28b_irony_density', 0)
        row['ix_variance_x_longrate'] = row.get('f1a_rhythm_variance', 0) * row.get('f26b_long_sent_rate', 0)
        for ft in SEMANTIC_FEATURES:
            row[ft] = safe(s_feats.get(ft, 0))

        y = TIER_RANK[tier]
        data.append((row, y, fn, tier))

    print(f"  Dataset: {len(data)} works")

    # Split (same as r6b: 70/15/15, seed=42)
    random.seed(SEED)
    indices = list(range(len(data)))
    random.shuffle(indices)
    n = len(data)
    n_train = int(n * 0.70)
    n_val = int(n * 0.15)
    train_idx = indices[:n_train]
    val_idx = indices[n_train:n_train+n_val]
    hold_idx = indices[n_train+n_val:]

    def build_matrices(idx_list):
        X = np.array([[data[i][0].get(f, 0) for f in ALL_FEATURES] for i in idx_list])
        y = np.array([data[i][1] for i in idx_list])
        return X, y

    X_train, y_train = build_matrices(train_idx)
    X_val, y_val = build_matrices(val_idx)
    X_hold, y_hold = build_matrices(hold_idx)
    X_all, y_all = build_matrices(list(range(len(data))))

    print(f"  Split: train={len(train_idx)} val={len(val_idx)} hold={len(hold_idx)}")

    # Grid search GB (same grid as r6b)
    best_params = None
    best_val_r2 = -999
    for n_est in [50, 100, 200]:
        for depth in [2, 3, 4]:
            for lr in [0.05, 0.1, 0.2]:
                gb = GradientBoostingRegressor(
                    n_estimators=n_est, max_depth=depth, learning_rate=lr,
                    random_state=SEED, subsample=0.8, min_samples_leaf=5,
                )
                gb.fit(X_train, y_train)
                pred = gb.predict(X_val)
                r2 = r2_score(y_val, pred)
                if r2 > best_val_r2:
                    best_val_r2 = r2
                    best_params = {'n_estimators': n_est, 'max_depth': depth, 'learning_rate': lr}

    print(f"  GB best params: {best_params} (val_R2={best_val_r2:.4f})")

    # Retrain with best params on TRAIN
    gb = GradientBoostingRegressor(
        n_estimators=best_params['n_estimators'],
        max_depth=best_params['max_depth'],
        learning_rate=best_params['learning_rate'],
        random_state=SEED, subsample=0.8, min_samples_leaf=5,
    )
    gb.fit(X_train, y_train)

    # Verify performance
    pred_hold = gb.predict(X_hold)
    r2_hold = r2_score(y_hold, pred_hold)
    from scipy.stats import spearmanr
    rho_all, _ = spearmanr(y_all, gb.predict(X_all))
    print(f"  Holdout R2: {r2_hold:.4f} | Full Spearman: {rho_all:.4f}")

    # ═══════════════════════════════════════════════════════════
    # EXTRACTION 1: Feature importance
    # ═══════════════════════════════════════════════════════════

    importance = sorted(
        zip(ALL_FEATURES, gb.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
    print(f"\n  FEATURE IMPORTANCE (top 20):")
    for fname, imp in importance[:20]:
        print(f"    {fname:<35} {imp:.4f}")

    # ═══════════════════════════════════════════════════════════
    # EXTRACTION 2: Split thresholds from all trees
    # ═══════════════════════════════════════════════════════════

    split_thresholds = defaultdict(list)  # feature_name -> [threshold_values]
    split_counts = Counter()  # feature_name -> count
    co_occurrence = Counter()  # (feature_a, feature_b) -> count in same tree
    depth_splits = defaultdict(lambda: Counter())  # feature -> {depth: count}

    n_trees = len(gb.estimators_)
    for tree_idx in range(n_trees):
        tree = gb.estimators_[tree_idx][0].tree_
        n_nodes = tree.node_count
        feature_ids = tree.feature
        thresholds = tree.threshold
        left = tree.children_left
        right = tree.children_right

        features_in_tree = set()

        def walk_tree(node, current_depth=0):
            if left[node] == -1:  # leaf
                return
            feat_idx = feature_ids[node]
            if feat_idx >= 0 and feat_idx < len(ALL_FEATURES):
                fname = ALL_FEATURES[feat_idx]
                thresh = thresholds[node]
                split_thresholds[fname].append(float(thresh))
                split_counts[fname] += 1
                features_in_tree.add(fname)
                depth_splits[fname][current_depth] += 1
            walk_tree(left[node], current_depth + 1)
            walk_tree(right[node], current_depth + 1)

        walk_tree(0)

        # Co-occurrence: features that appear together in the same tree
        feats_list = sorted(features_in_tree)
        for i in range(len(feats_list)):
            for j in range(i+1, len(feats_list)):
                co_occurrence[(feats_list[i], feats_list[j])] += 1

    # ═══════════════════════════════════════════════════════════
    # EXTRACTION 3: Tipping points (most common split values)
    # ═══════════════════════════════════════════════════════════

    tipping_points = {}
    for fname in sorted(split_thresholds.keys(), key=lambda x: -split_counts[x]):
        vals = split_thresholds[fname]
        if not vals:
            continue
        arr = np.array(vals)
        # Find clusters of split values
        p10 = np.percentile(arr, 10)
        p25 = np.percentile(arr, 25)
        p50 = np.percentile(arr, 50)
        p75 = np.percentile(arr, 75)
        p90 = np.percentile(arr, 90)

        tipping_points[fname] = {
            'n_splits': int(split_counts[fname]),
            'mean': r5(arr.mean()),
            'stdev': r5(arr.std()),
            'p10': r5(p10),
            'p25': r5(p25),
            'median': r5(p50),
            'p75': r5(p75),
            'p90': r5(p90),
            'min': r5(arr.min()),
            'max': r5(arr.max()),
            'primary_threshold': r5(p50),  # The Tk
            'depth_distribution': dict(depth_splits[fname]),
        }

    # ═══════════════════════════════════════════════════════════
    # EXTRACTION 4: Co-occurrence (interaction patterns)
    # ═══════════════════════════════════════════════════════════

    top_co = co_occurrence.most_common(20)

    print(f"\n  SPLIT COUNT BY FEATURE (top 20):")
    for fname, count in split_counts.most_common(20):
        tp = tipping_points[fname]
        print(f"    {fname:<35} splits={count:>4}  median_threshold={tp['median']:.4f}  "
              f"range=[{tp['min']:.4f}, {tp['max']:.4f}]")

    print(f"\n  TOP 15 FEATURE CO-OCCURRENCES IN SAME TREE:")
    for (fa, fb), count in top_co[:15]:
        pct = count / n_trees * 100
        print(f"    {fa:<30} x {fb:<30} {count:>4}/{n_trees} ({pct:.0f}%)")

    # ═══════════════════════════════════════════════════════════
    # EXTRACTION 5: Conditional effects
    # For top 10 features, what happens when above/below median split
    # ═══════════════════════════════════════════════════════════

    print(f"\n  CONDITIONAL EFFECTS (top 10 features):")
    conditional_effects = {}
    pred_all = gb.predict(X_all)

    for fname, _ in importance[:10]:
        fidx = ALL_FEATURES.index(fname)
        if fname not in tipping_points:
            continue
        thresh = tipping_points[fname]['median']

        above_mask = X_all[:, fidx] > thresh
        below_mask = ~above_mask

        if above_mask.sum() > 5 and below_mask.sum() > 5:
            above_mean_pred = float(pred_all[above_mask].mean())
            below_mean_pred = float(pred_all[below_mask].mean())
            above_mean_true = float(y_all[above_mask].mean())
            below_mean_true = float(y_all[below_mask].mean())
            delta = above_mean_pred - below_mean_pred

            # Tier distribution above/below
            above_tiers = Counter([data[i][3] for i in range(len(data)) if above_mask[i]])
            below_tiers = Counter([data[i][3] for i in range(len(data)) if below_mask[i]])

            conditional_effects[fname] = {
                'threshold': r5(thresh),
                'above_count': int(above_mask.sum()),
                'below_count': int(below_mask.sum()),
                'above_mean_pred': r5(above_mean_pred),
                'below_mean_pred': r5(below_mean_pred),
                'above_mean_true': r5(above_mean_true),
                'below_mean_true': r5(below_mean_true),
                'delta_pred': r5(delta),
                'direction': 'HIGHER_IS_BETTER' if delta > 0 else 'LOWER_IS_BETTER',
                'above_tier_pct_S': r5(above_tiers.get('S', 0) / max(above_mask.sum(), 1)),
                'below_tier_pct_S': r5(below_tiers.get('S', 0) / max(below_mask.sum(), 1)),
            }

            dir_str = "+" if delta > 0 else "-"
            print(f"    {fname:<35} thresh={thresh:.4f}  "
                  f"above={above_mean_pred:.2f}(S:{above_tiers.get('S',0)})  "
                  f"below={below_mean_pred:.2f}(S:{below_tiers.get('S',0)})  "
                  f"delta={delta:+.3f}")

    # ═══════════════════════════════════════════════════════════
    # EXTRACTION 6: Key Tk summary (the constants for R-8 equation)
    # ═══════════════════════════════════════════════════════════

    print(f"\n  KEY TIPPING POINTS (Tk) — Top 15 by importance:")
    print(f"    {'Feature':<35} {'Tk (median)':>12} {'Direction':>20} {'Delta':>8}")
    print("    " + "-" * 80)
    tk_summary = []
    for fname, imp_val in importance[:15]:
        if fname in tipping_points and fname in conditional_effects:
            tp = tipping_points[fname]
            ce = conditional_effects[fname]
            tk_summary.append({
                'feature': fname,
                'Tk': tp['median'],
                'importance': r5(imp_val),
                'direction': ce['direction'],
                'delta': ce['delta_pred'],
                'above_pct_S': ce['above_tier_pct_S'],
                'below_pct_S': ce['below_tier_pct_S'],
            })
            print(f"    {fname:<35} {tp['median']:>12.4f} {ce['direction']:>20} {ce['delta_pred']:>+8.3f}")

    # Save
    output = {
        'phase': 'R-8.5',
        'description': 'Tipping points extracted from GB trees. Decision thresholds documented.',
        'gb_params': best_params,
        'gb_val_r2': r5(best_val_r2),
        'gb_holdout_r2': r5(r2_hold),
        'gb_full_spearman': r5(rho_all),
        'n_trees': n_trees,
        'n_works': len(data),
        'timestamp': datetime.now().isoformat(),
        'feature_importance': {fname: r5(imp) for fname, imp in importance},
        'tipping_points': tipping_points,
        'tk_summary': tk_summary,
        'co_occurrence_top20': [
            {'pair': f'{fa}x{fb}', 'count': count, 'pct': r5(count/n_trees*100)}
            for (fa, fb), count in top_co[:20]
        ],
        'conditional_effects': conditional_effects,
    }
    with open(OUT_FILE, 'w', encoding='utf-8') as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
