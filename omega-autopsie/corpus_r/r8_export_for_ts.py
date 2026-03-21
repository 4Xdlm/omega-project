#!/usr/bin/env python3
"""
OMEGA R-8.7 — Export R-8 constants for TypeScript integration.
Reads all R-8 JSON files and produces compact data files for the scorer.
"""

import json, os

ROOT = r"C:\Users\elric\omega-project"
R8_DIR = os.path.join(ROOT, "omega-autopsie", "results_phase_r8")
OUT_DIR = os.path.join(ROOT, "packages", "sovereign-engine", "src", "scoring", "data")

TYPES = ['action', 'narration', 'description', 'dialogue', 'introspection']

# Features used by the V3 scorer (the ones we need to normalize)
SCORER_FEATURES = [
    'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
    'f24c_contrast_delta', 'f27a_epistemic_rate',
    'f9a_contradiction_rate', 'f19a_approx_entropy', 'f27d_modal_score',
    'f26c_period_score', 'f29d_ttr_score',
    'f17_knife_count', 'f28d_sil_score',
    'f5a_verb_density', 'f5b_verb_adj_ratio', 'f5c_action_verb_ratio',
    'f12_tense_switches', 'f26a_mean_sub_markers', 'f26b_long_sent_rate',
    'f1b_rhythm_ratio', 'f30a_passe_simple_rate', 'f30b_imparfait_rate',
    'f30d_ps_imp_ratio', 'f33c_dot_comma_ratio', 'f34b_para_per_1000w',
    'f38a_short_para_rate', 'f38b_punct_density', 'f38c_speed_score',
    'f_subordination_depth_approx', 'f_negation_density',
    'f_causal_density', 'f_tension_density', 'f_desire_negation_rate',
    'f_lexical_progression',
    'f15b_redundancy_compression', 'f16a_bigram_rarity', 'f16c_lexical_surprise',
    'f19f_window_stdev', 'f21c_diacope_rate', 'f21e_ritual_index',
    'f24a_banal_rate', 'f24b_apex_rate', 'f24e_contrast_score',
    'f25a_description_density', 'f25g_description_score',
    'f27b_conditional_rate', 'f27c_negation_rate',
    'f29a_ttr_global', 'f17_contrast_spacing',
]

def r5(v):
    return round(float(v), 5)

def main():
    # ═══════════════════════════════════════════════════════════════
    # 1. Load R-8.1 Ci,f
    # ═══════════════════════════════════════════════════════════════
    with open(os.path.join(R8_DIR, "TYPE_PROFILES_PURE.json"), 'r', encoding='utf-8') as f:
        r81 = json.load(f)

    cif = {}
    for t in TYPES:
        cif[t] = r81['types'][t]['mean']

    # ═══════════════════════════════════════════════════════════════
    # 2. Load R-8.3 Lambda
    # ═══════════════════════════════════════════════════════════════
    with open(os.path.join(R8_DIR, "R8_LAMBDA_ESTIMATION.json"), 'r', encoding='utf-8') as f:
        r83 = json.load(f)

    lambda_data = {}
    r82_class = {}
    lambda_status = {}
    for entry in r83['features']:
        fk = entry['feature']
        lambda_data[fk] = entry['lambda']
        r82_class[fk] = entry.get('r82_class', '?')
        lambda_status[fk] = entry.get('status', '?')

    # ═══════════════════════════════════════════════════════════════
    # 3. Load R-8.4 Gamma (3 effective features only)
    # ═══════════════════════════════════════════════════════════════
    with open(os.path.join(R8_DIR, "R8_GAMMA_INTERACTIONS.json"), 'r', encoding='utf-8') as f:
        r84 = json.load(f)

    gamma_data = {}
    gamma_features = r84.get('architectural_decision', {}).get('gamma_retained', [])
    for entry in r84['features']:
        fk = entry['feature']
        if fk in gamma_features:
            # Extract all interaction pairs
            interactions = {}
            for ip in entry.get('all_interactions', entry.get('significant_interactions', [])):
                interactions[ip['pair']] = ip['gamma']
            gamma_data[fk] = interactions

    # ═══════════════════════════════════════════════════════════════
    # 4. Load R-8.5 Tipping Points
    # ═══════════════════════════════════════════════════════════════
    with open(os.path.join(R8_DIR, "R8_TIPPING_POINTS.json"), 'r', encoding='utf-8') as f:
        r85 = json.load(f)

    tipping_points = []
    for tk_entry in r85.get('tk_summary', []):
        tipping_points.append({
            'feature': tk_entry['feature'],
            'threshold': tk_entry['Tk'],
            'direction': tk_entry['direction'],
            'delta': tk_entry['delta'],
            'importance': tk_entry['importance'],
        })

    # ═══════════════════════════════════════════════════════════════
    # 5. Build compact output: TYPOLOGICAL CONSTANTS
    # ═══════════════════════════════════════════════════════════════

    # For each feature, build a compact record
    features_output = {}
    all_features = set()
    for t in TYPES:
        all_features.update(cif[t].keys())

    for fk in sorted(all_features):
        entry = {
            'cif': {t: r5(cif[t].get(fk, 0)) for t in TYPES},
        }
        if fk in lambda_data:
            entry['lambda'] = {t: r5(lambda_data[fk].get(t, 1.0)) for t in TYPES}
            entry['class'] = r82_class.get(fk, '?')
            entry['status'] = lambda_status.get(fk, '?')
        if fk in gamma_data:
            entry['gamma'] = {k: r5(v) for k, v in gamma_data[fk].items()}

        features_output[fk] = entry

    # ═══════════════════════════════════════════════════════════════
    # 6. Save compact JSON files
    # ═══════════════════════════════════════════════════════════════

    # File 1: Typological constants (Ci,f + λ + γ)
    output1 = {
        '_phase': 'R-8.7',
        '_description': 'Typological constants for OMEGA scorer. Ci,f from R-8.1, lambda from R-8.3, gamma from R-8.4.',
        '_types': TYPES,
        '_gamma_features': gamma_features,
        'features': features_output,
    }
    path1 = os.path.join(OUT_DIR, "R8_TYPOLOGICAL_CONSTANTS.json")
    with open(path1, 'w', encoding='utf-8') as f:
        json.dump(output1, f, indent=2, ensure_ascii=False)
    print(f"SAVED: {path1} ({os.path.getsize(path1)} bytes)")

    # File 2: Tipping points
    output2 = {
        '_phase': 'R-8.7',
        '_description': 'Tipping points from GB tree extraction (R-8.5).',
        'tipping_points': tipping_points,
        'co_occurrences': r85.get('co_occurrence_top20', [])[:10],
        'gb_spearman': r85.get('gb_full_spearman', 0),
    }
    path2 = os.path.join(OUT_DIR, "R8_TIPPING_POINTS.json")
    with open(path2, 'w', encoding='utf-8') as f:
        json.dump(output2, f, indent=2, ensure_ascii=False)
    print(f"SAVED: {path2} ({os.path.getsize(path2)} bytes)")

    # File 3: Assembly patterns (compact)
    with open(os.path.join(R8_DIR, "R8_ASSEMBLY_ANALYSIS.json"), 'r', encoding='utf-8') as f:
        r86 = json.load(f)

    output3 = {
        '_phase': 'R-8.7',
        '_description': 'Assembly patterns from R-8.6 Loi des LEGO.',
        'master_trigrams': r86.get('trigram_enrichment_S_top10', []),
        'commercial_transitions_to_penalize': [
            {'transition': 'action->action->action', 'cd_freq': 0.3308, 's_freq': 0.0824},
            {'transition': 'action->dialogue->action', 'cd_freq': 0.0194, 's_freq': 0.0033},
        ],
        'assembly_bonus_by_tier': r86.get('assembly_bonus_by_tier', {}),
        'master_transition_enrichment': r86.get('transition_enrichment_S_top10', []),
    }
    path3 = os.path.join(OUT_DIR, "R8_ASSEMBLY_PATTERNS.json")
    with open(path3, 'w', encoding='utf-8') as f:
        json.dump(output3, f, indent=2, ensure_ascii=False)
    print(f"SAVED: {path3} ({os.path.getsize(path3)} bytes)")

    # Summary
    print(f"\nFeatures with Ci,f: {len(features_output)}")
    print(f"Features with lambda: {sum(1 for f in features_output.values() if 'lambda' in f)}")
    print(f"Features with gamma: {len(gamma_features)}")
    print(f"Tipping points: {len(tipping_points)}")

if __name__ == '__main__':
    main()
