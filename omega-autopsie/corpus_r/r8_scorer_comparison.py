#!/usr/bin/env python3
"""
OMEGA Phase R-8.7 — SCORER COMPARISON: Does R-8 improve the tribunal?
═════════════════════════════════════════════════════════════════════
V1 = GB baseline (42 features, the current champion)
V2 = V1 + 5 assembly features from R-8.6
V3 = V2 + typological deviation features from R-8.1/R-8.3 + Tk flags

Same split as r6b_tribunal.py (seed=42, 70/15/15).
Same GB grid search.
Pure empirical comparison — no poetry, only numbers.

Criteria:
  - Spearman strictly > baseline
  - S/D inversions strictly < baseline
  - No degradation on holdout
  - Better separation on difficult cases (Flaubert, Opus, GPT)
"""

import json, math, os, random, re
from statistics import mean, stdev
from collections import Counter, defaultdict
from datetime import datetime
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score
from scipy.stats import spearmanr

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json")
R81_FILE = os.path.join(ROOT, "omega-autopsie/results_phase_r8/TYPE_PROFILES_PURE.json")
R83_FILE = os.path.join(ROOT, "omega-autopsie/results_phase_r8/R8_LAMBDA_ESTIMATION.json")
TXT_DIR = os.path.join(ROOT, "omega-autopsie/corpus_r/txt")
OUT_FILE = os.path.join(ROOT, "omega-autopsie/results_phase_r8/R8_SCORER_COMPARISON.json")

SEED = 42
TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}
TYPES_LIST = ['action', 'narration', 'description', 'dialogue', 'introspection']

# ═══════════════════════════════════════════════════════════════
# V1 FEATURE SETS (exact same as r6b_tribunal)
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

V1_FEATURES = ORIG_FEATURES + DEPTH_FEATURES + SUSPECT_FEATURES + INTERACTION_NAMES + SEMANTIC_FEATURES

# ═══════════════════════════════════════════════════════════════
# V2 NEW FEATURES (assembly signals from R-8.6)
# ═══════════════════════════════════════════════════════════════

V2_NEW = [
    'r8_assembly_bonus_rhythm',      # f1a_rhythm_variance bonus (block vs windows)
    'r8_master_transition_score',    # enrichment of S-type transitions
    'r8_action_loop_penalty',        # frequency of act→act→act trigram
    'r8_type_diversity',             # number of unique dominant types
    'r8_desc_intro_signature',       # frequency of desc→desc→intro circuit
]

# ═══════════════════════════════════════════════════════════════
# V3 NEW FEATURES (typological normalization from R-8.1/R-8.3)
# ═══════════════════════════════════════════════════════════════

V3_NEW = [
    'r8_tk_master_pct',                   # % of tipping points on master side
    'r8_dev_f26b_long_sent_rate',         # deviation from typological expectation
    'r8_dev_f1a_rhythm_variance',
    'r8_dev_f28d_sil_score',
    'r8_dev_f27a_epistemic_rate',
    'r8_dev_f26c_period_score',
    'r8_dev_f19a_approx_entropy',
    'r8_dev_f29d_ttr_score',
]

V2_FEATURES = V1_FEATURES + V2_NEW
V3_FEATURES = V2_FEATURES + V3_NEW

# ═══════════════════════════════════════════════════════════════
# PASSAGE CLASSIFIER (same logic as R-8 scripts, compact)
# ═══════════════════════════════════════════════════════════════

SENSORY_WORDS = {'lumiere','ombre','couleur','brillant','sombre','clair','lueur','reflet','bruit','son','silence','murmure','voix','echo','souffle','froid','chaud','doux','rugeux','humide','sec','peau','odeur','parfum','senteur','fumee','gout','amer','sucre','light','shadow','dark','bright','noise','sound','whisper','cold','warm','smooth','rough','smell','scent'}
ADJ_ENDINGS = ['eux','euse','ique','able','ible','ant','ent','al','el','ous','ful','less','ive','oso','osa']
ACTION_VERBS = {'marcha','marchait','courut','courait','bondit','bondissait','saisit','saisissait','frappa','frappait','lanca','lancait','jeta','jetait','tira','tirait','poussa','poussait','sauta','sautait','attrapa','attrapait','tomba','tombait','coupa','coupait','brisa','brisait','arracha','arrachait','ouvrit','ouvrait','ferma','fermait','prit','prenait','walked','ran','jumped','grabbed','threw','hit','kicked','pushed','pulled','struck','seized','caught'}
SPEECH_VERBS = {'dit','disait','repondit','repondait','murmura','murmurait','cria','criait','demanda','demandait','ajouta','ajoutait','reprit','reprenait','declara','declarait','chuchota','said','asked','replied','whispered','shouted','exclaimed'}
MODAL_MARKERS = ['semblait','paraissait','apparemment','peut-etre','probablement','sans doute','comme si','dirait-on','il semblait','seemed','appeared','perhaps','probably','possibly','as if']
STATIC_VERBS = {'etait','etaient','fut','semblait','paraissait','demeurait','restait','was','were','seemed','appeared','remained'}
PS_ENDINGS_CL = ['a','it','ut','int','urent','irent','erent']
IMP_ENDINGS_CL = ['ait','aient','ais']
COND_FORMS = {'aurait','serait','pourrait','devrait','voudrait','would','could','should','might'}

def clean_word(w):
    return w.lower().replace(',','').replace('.','').replace(';','').replace(':','').replace('!','').replace('?','').replace('"','').replace("'",'').replace('(','').replace(')','')

def split_sentences(text):
    raw = re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def classify_passage(text):
    sents = split_sentences(text)
    words = [w for w in text.split() if w]; nw = max(len(words),1); ns = max(len(sents),1)
    lines = [l.strip() for l in text.split('\n') if l.strip()]; nl = max(len(lines),1)
    dl = sum(1 for l in lines if l.startswith('\u2014') or l.startswith('\u2013') or l.startswith('- ') or l.startswith('\u00ab') or '\u00ab ' in l or ' \u00bb' in l or re.match(r'^["""\u201C]',l))
    svc = sum(1 for w in words if clean_word(w) in SPEECH_VERBS)
    dial = min(1.0,(dl/nl)*1.5+(svc/nw)*10)
    ac2 = sum(1 for w in words if any(clean_word(w).endswith(e) for e in ADJ_ENDINGS) and len(clean_word(w))>4)
    snc = sum(1 for w in words if clean_word(w) in SENSORY_WORDS)
    stc = sum(1 for w in words if clean_word(w) in STATIC_VERBS)
    desc = min(1.0,(ac2/nw)*8+(snc/nw)*15+(stc/nw)*10)
    avc = sum(1 for w in words if clean_word(w) in ACTION_VERBS)
    lw = [clean_word(w) for w in words if len(w)>3]; nlo = max(len(lw),1)
    psc = sum(1 for w in lw if any(w.endswith(e) for e in PS_ENDINGS_CL)); psr = psc/nlo
    sl = [len(s.split()) for s in sents]; msl = sum(sl)/ns; ssr = sum(1 for l in sl if l<10)/ns
    act = min(1.0,(avc/nw)*20+psr*2+ssr*0.5+(0.2 if msl<12 else 0))
    tl = text.lower(); mc = 0
    for m in MODAL_MARKERS:
        p=0
        while True:
            p=tl.find(m,p)
            if p==-1: break
            mc+=1; p+=len(m)
    cc = sum(1 for w in words if clean_word(w) in COND_FORMS)
    fp = len(re.findall(r"\b(?:je|j'|me|m'|moi)\b",tl))
    intro = min(1.0,(mc/nw)*15+(cc/nw)*12+(fp/nw)*3)
    tp = len(re.findall(r"\b(?:il|elle|ils|elles|son|sa|ses|he\b|she\b|his\b|her\b)\b",tl))
    ic = sum(1 for w in lw if any(w.endswith(e) for e in IMP_ENDINGS_CL))
    tc = sum(1 for w in words if clean_word(w) in {'puis','ensuite','alors','soudain','enfin','aussitot','then','suddenly','finally','next'})
    narr = min(1.0,(tp/nw)*4+(ic/nlo)*2+psr*2+(tc/nw)*8)
    raw = {'narration':narr,'description':desc,'dialogue':dial,'introspection':intro,'action':act}
    total = sum(raw.values())
    if total==0: return {'narration':0,'description':1,'dialogue':0,'introspection':0,'action':0}
    return {k: round(v/total,5) for k,v in raw.items()}

def get_dominant(cl):
    return max(TYPES_LIST, key=lambda t: cl.get(t, 0))

def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return 0.0
    return float(v)

# ═══════════════════════════════════════════════════════════════
# COMPUTE R-8 FEATURES PER WORK
# ═══════════════════════════════════════════════════════════════

def compute_r8_features_for_work(text, cif, lambda_data, work_features):
    """
    Given a full work text, compute R-8 assembly and typological features.
    Returns dict of new features.
    """
    words = text.split()
    if len(words) < 3000:
        return None  # Not enough text

    result = {}

    # --- ASSEMBLY FEATURES (V2) ---

    # Extract consecutive 500w windows
    win = 500
    windows = []
    pos = 0
    while pos + win <= len(words):
        chunk = ' '.join(words[pos:pos+win])
        windows.append(chunk)
        pos += win

    if len(windows) < 8:
        return None

    # Classify each window
    window_types = [get_dominant(classify_passage(w)) for w in windows]

    # 1. Assembly bonus rhythm: compare 2000w blocks vs 4×500w
    bonuses = []
    for i in range(0, len(windows) - 3, 4):
        block = ' '.join(windows[i:i+4])
        block_sents = split_sentences(block)
        block_sl = [len(s.split()) for s in block_sents]
        block_var = stdev(block_sl) if len(block_sl) > 1 else 0

        win_vars = []
        for j in range(4):
            ws = split_sentences(windows[i+j])
            wsl = [len(s.split()) for s in ws]
            win_vars.append(stdev(wsl) if len(wsl) > 1 else 0)

        bonuses.append(block_var - mean(win_vars))

    result['r8_assembly_bonus_rhythm'] = mean(bonuses) if bonuses else 0

    # 2. Master transition score
    # Count S-enriched transitions, penalize CD-enriched ones
    s_enriched = {
        ('introspection','description'), ('description','introspection'),
        ('description','description'), ('narration','narration'),
        ('description','narration'), ('narration','description'),
        ('narration','dialogue'), ('dialogue','narration'),
    }
    cd_enriched = {
        ('action','action'), ('action','dialogue'), ('dialogue','action'),
    }
    s_count = 0; cd_count = 0; total_trans = max(len(window_types) - 1, 1)
    for i in range(len(window_types) - 1):
        pair = (window_types[i], window_types[i+1])
        if pair in s_enriched: s_count += 1
        if pair in cd_enriched: cd_count += 1
    result['r8_master_transition_score'] = (s_count - cd_count) / total_trans

    # 3. Action loop penalty
    act_loops = 0; total_tri = max(len(window_types) - 2, 1)
    for i in range(len(window_types) - 2):
        if window_types[i] == 'action' and window_types[i+1] == 'action' and window_types[i+2] == 'action':
            act_loops += 1
    result['r8_action_loop_penalty'] = -act_loops / total_tri

    # 4. Type diversity
    result['r8_type_diversity'] = len(set(window_types)) / 5.0

    # 5. Desc→desc→intro signature
    ddi = 0
    for i in range(len(window_types) - 2):
        if window_types[i] == 'description' and window_types[i+1] == 'description' and window_types[i+2] == 'introspection':
            ddi += 1
    result['r8_desc_intro_signature'] = ddi / total_tri

    # --- TYPOLOGICAL FEATURES (V3) ---

    # Get type vector for the central 2000w passage
    center = len(words) // 2
    half = 1000
    start = max(0, center - half)
    passage_2k = ' '.join(words[start:start+2000])
    type_vec = classify_passage(passage_2k)

    # Tipping points evaluation
    TK = [
        ('f26b_long_sent_rate', 0.024, 'HIGHER'),
        ('f29d_ttr_score', 0.710, 'LOWER'),
        ('f_pov_stability', 0.646, 'LOWER'),
        ('f1a_rhythm_variance', 11.361, 'HIGHER'),
        ('f19a_approx_entropy', 0.637, 'HIGHER'),
        ('f_pov_shift_rate', 0.348, 'HIGHER'),
        ('f_causal_density', 0.068, 'HIGHER'),
        ('f_pov_drift_rate', 0.113, 'HIGHER'),
        ('f_clause_per_sentence', 1.010, 'HIGHER'),
    ]
    master_count = 0; total_tk = 0
    for fk, threshold, direction in TK:
        val = work_features.get(fk)
        if val is None: continue
        total_tk += 1
        above = val > threshold
        master_side = above if direction == 'HIGHER' else not above
        if master_side: master_count += 1
    result['r8_tk_master_pct'] = master_count / max(total_tk, 1)

    # Typological deviations
    DEV_FEATURES = [
        'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f28d_sil_score',
        'f27a_epistemic_rate', 'f26c_period_score', 'f19a_approx_entropy',
        'f29d_ttr_score',
    ]
    for fk in DEV_FEATURES:
        if fk not in cif.get('action', {}):
            result[f'r8_dev_{fk}'] = 0
            continue
        if fk not in lambda_data:
            result[f'r8_dev_{fk}'] = 0
            continue

        # Expected = Σ(pi × λi × Ci)
        expected = 0
        for t in TYPES_LIST:
            pi = type_vec.get(t, 0)
            ci = cif[t].get(fk, 0)
            li = lambda_data[fk].get(t, 1.0)
            expected += pi * li * ci

        measured = work_features.get(fk, 0)
        result[f'r8_dev_{fk}'] = measured - expected

    return result

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  OMEGA R-8.7 -- SCORER COMPARISON")
    print("  V1 = GB baseline (42 features)")
    print("  V2 = V1 + 5 assembly features")
    print("  V3 = V2 + 8 typological features")
    print("=" * 70)

    # Load base data
    with open(MASTER, 'r', encoding='utf-8') as f:
        master_data = json.load(f)
    with open(DEPTH, 'r', encoding='utf-8') as f:
        depth_data = json.load(f)
    with open(TIERS, 'r', encoding='utf-8') as f:
        tiers_data = json.load(f)
    with open(SEMANTIC, 'r', encoding='utf-8') as f:
        semantic_data = json.load(f)

    tier_lookup = {e['filename']: e.get('tier_suggestion', '?') for e in tiers_data}
    depth_lookup = {e['filename']: e.get('depth_features', {}) for e in depth_data}
    semantic_lookup = {e['filename']: e.get('semantic_features', {}) for e in semantic_data}
    author_lookup = {e['filename']: e.get('author_guess', '') for e in tiers_data}

    # Load R-8 constants
    with open(R81_FILE, 'r', encoding='utf-8') as f:
        r81 = json.load(f)
    cif = {t: r81['types'][t]['mean'] for t in TYPES_LIST}

    with open(R83_FILE, 'r', encoding='utf-8') as f:
        r83 = json.load(f)
    lambda_data = {}
    for entry in r83['features']:
        lambda_data[entry['feature']] = entry['lambda']

    # Build base dataset
    data = []
    for entry in master_data:
        fn = entry['filename']
        tier = entry.get('tier') or tier_lookup.get(fn, '?')
        if tier not in TIER_RANK: continue

        feats = entry['features']
        d_feats = depth_lookup.get(fn, {})
        s_feats = semantic_lookup.get(fn, {})

        row = {}
        for ft in ORIG_FEATURES: row[ft] = safe(feats.get(ft, 0))
        for ft in DEPTH_FEATURES: row[ft] = safe(d_feats.get(ft, 0))
        for ft in SUSPECT_FEATURES: row[ft] = safe(feats.get(ft, 0))
        row['ix_mean_x_subdepth'] = row.get('f1_mean',0)*row.get('f_subordination_depth',0)
        row['ix_pov_x_irony'] = row.get('f_pov_shift_rate',0)*row.get('f28b_irony_density',0)
        row['ix_variance_x_longrate'] = row.get('f1a_rhythm_variance',0)*row.get('f26b_long_sent_rate',0)
        for ft in SEMANTIC_FEATURES: row[ft] = safe(s_feats.get(ft, 0))

        data.append({'row': row, 'y': TIER_RANK[tier], 'fn': fn, 'tier': tier,
                     'author': author_lookup.get(fn, '')})

    print(f"  Base data: {len(data)} works")

    # Compute R-8 features per work (reading text files)
    print("  Computing R-8 features per work...")
    r8_computed = 0; r8_skipped = 0
    for i, d in enumerate(data):
        fn = d['fn']
        txt_path = os.path.join(TXT_DIR, fn)
        if not os.path.exists(txt_path):
            r8_skipped += 1
            for fk in V2_NEW + V3_NEW: d['row'][fk] = 0
            continue
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='replace') as f:
                text = f.read()
        except:
            r8_skipped += 1
            for fk in V2_NEW + V3_NEW: d['row'][fk] = 0
            continue

        r8_feats = compute_r8_features_for_work(text, cif, lambda_data, d['row'])
        if r8_feats is None:
            r8_skipped += 1
            for fk in V2_NEW + V3_NEW: d['row'][fk] = 0
        else:
            for fk, val in r8_feats.items():
                d['row'][fk] = val
            r8_computed += 1

        if (i+1) % 100 == 0:
            print(f"    [{i+1}/{len(data)}] computed={r8_computed} skipped={r8_skipped}")

    print(f"  R-8 features: {r8_computed} computed, {r8_skipped} skipped")

    # Split (same as r6b)
    random.seed(SEED)
    indices = list(range(len(data)))
    random.shuffle(indices)
    n = len(data)
    n_train = int(n * 0.70)
    n_val = int(n * 0.15)
    train_idx = indices[:n_train]
    val_idx = indices[n_train:n_train+n_val]
    hold_idx = indices[n_train+n_val:]

    print(f"  Split: train={len(train_idx)} val={len(val_idx)} hold={len(hold_idx)}")

    def build_matrices(idx_list, feature_names):
        X = np.array([[data[i]['row'].get(f, 0) for f in feature_names] for i in idx_list])
        y = np.array([data[i]['y'] for i in idx_list])
        return X, y

    def count_inversions(pred, true, all_data, idx_list):
        """Count S-vs-D inversions: cases where a D-tier work scores higher than an S-tier."""
        inv = 0; total = 0
        for i in range(len(idx_list)):
            for j in range(i+1, len(idx_list)):
                ti = all_data[idx_list[i]]['tier']
                tj = all_data[idx_list[j]]['tier']
                if (ti == 'S' and tj == 'D') or (ti == 'D' and tj == 'S'):
                    total += 1
                    if ti == 'S' and pred[i] < pred[j]: inv += 1
                    elif tj == 'S' and pred[j] < pred[i]: inv += 1
        return inv, total

    def eval_model(name, model, feature_names):
        X_tr, y_tr = build_matrices(train_idx, feature_names)
        X_va, y_va = build_matrices(val_idx, feature_names)
        X_ho, y_ho = build_matrices(hold_idx, feature_names)
        X_all, y_all = build_matrices(list(range(len(data))), feature_names)

        model.fit(X_tr, y_tr)
        pred_tr = model.predict(X_tr)
        pred_va = model.predict(X_va)
        pred_ho = model.predict(X_ho)
        pred_all = model.predict(X_all)

        r2_tr = r2_score(y_tr, pred_tr)
        r2_va = r2_score(y_va, pred_va)
        r2_ho = r2_score(y_ho, pred_ho)
        rho_all, _ = spearmanr(y_all, pred_all)

        inv, total = count_inversions(pred_all, y_all, data, list(range(len(data))))

        # Author diagnostic
        author_preds = defaultdict(list)
        author_trues = defaultdict(list)
        for i in range(len(data)):
            a = data[i]['author']
            if a: 
                author_preds[a].append(pred_all[i])
                author_trues[a].append(data[i]['y'])

        # Tier means
        tier_preds = defaultdict(list)
        for i in range(len(data)):
            tier_preds[data[i]['tier']].append(pred_all[i])

        return {
            'name': name,
            'n_features': len(feature_names),
            'r2_train': round(r2_tr, 4),
            'r2_val': round(r2_va, 4),
            'r2_holdout': round(r2_ho, 4),
            'spearman': round(rho_all, 4),
            'inversions_sd': inv,
            'inversions_total': total,
            'tier_means': {t: round(mean(v), 3) for t, v in tier_preds.items()},
            'author_means': {a: round(mean(v), 3) for a, v in author_preds.items()
                           if a in ['Flaubert', 'Proust', 'Hugo', 'Camus', 'Zola',
                                    'Claude Opus', 'GPT', 'Gemini', 'Riviera', 'Perplexity']},
        }

    # ═══════════════════════════════════════════════════════════
    # GRID SEARCH + COMPARE
    # ═══════════════════════════════════════════════════════════

    results = []

    for version, feat_list, label in [
        ('V1', V1_FEATURES, 'GB baseline (42 features)'),
        ('V2', V2_FEATURES, 'GB + 5 assembly features'),
        ('V3', V3_FEATURES, 'GB + assembly + typological'),
    ]:
        print(f"\n  === {version}: {label} ({len(feat_list)} features) ===")

        # Grid search
        X_tr, y_tr = build_matrices(train_idx, feat_list)
        X_va, y_va = build_matrices(val_idx, feat_list)

        best_params = None; best_val_r2 = -999
        for n_est in [50, 100, 200]:
            for depth in [2, 3, 4]:
                for lr in [0.05, 0.1, 0.2]:
                    gb = GradientBoostingRegressor(
                        n_estimators=n_est, max_depth=depth, learning_rate=lr,
                        random_state=SEED, subsample=0.8, min_samples_leaf=5,
                    )
                    gb.fit(X_tr, y_tr)
                    pred = gb.predict(X_va)
                    r2 = r2_score(y_va, pred)
                    if r2 > best_val_r2:
                        best_val_r2 = r2
                        best_params = {'n_estimators': n_est, 'max_depth': depth, 'learning_rate': lr}

        print(f"    Best params: {best_params} (val R2={best_val_r2:.4f})")

        gb = GradientBoostingRegressor(
            n_estimators=best_params['n_estimators'],
            max_depth=best_params['max_depth'],
            learning_rate=best_params['learning_rate'],
            random_state=SEED, subsample=0.8, min_samples_leaf=5,
        )
        res = eval_model(version, gb, feat_list)
        res['params'] = best_params
        res['label'] = label

        # Feature importance
        X_all, y_all = build_matrices(list(range(len(data))), feat_list)
        gb.fit(build_matrices(train_idx, feat_list)[0], build_matrices(train_idx, feat_list)[1])
        imp = sorted(zip(feat_list, gb.feature_importances_), key=lambda x: -x[1])
        res['top_features'] = [(f, round(float(v), 4)) for f, v in imp[:15]]

        results.append(res)

        print(f"    Spearman={res['spearman']}  Hold_R2={res['r2_holdout']}  "
              f"S/D_inv={res['inversions_sd']}/{res['inversions_total']}")
        print(f"    Tiers: {res['tier_means']}")

    # ═══════════════════════════════════════════════════════════
    # COMPARISON TABLE
    # ═══════════════════════════════════════════════════════════

    print("\n" + "=" * 70)
    print("  COMPARISON TABLE")
    print("=" * 70)
    print(f"  {'Model':<40} {'Features':>4} {'Spearman':>9} {'Hold R2':>9} {'S/D inv':>8}")
    print("  " + "-" * 75)
    for r in results:
        inv_str = f"{r['inversions_sd']}/{r['inversions_total']}"
        print(f"  {r['name']+' '+r['label']:<40} {r['n_features']:>4} "
              f"{r['spearman']:>9.4f} {r['r2_holdout']:>9.4f} {inv_str:>8}")

    # Author comparison
    print(f"\n  AUTHOR DIAGNOSTIC:")
    print(f"  {'Author':<20} ", end="")
    for r in results: print(f"{r['name']:>10}", end="")
    print(f"{'True':>10}")
    print("  " + "-" * 60)
    all_authors = set()
    for r in results: all_authors.update(r['author_means'].keys())
    for a in ['Flaubert','Proust','Hugo','Camus','Zola','Claude Opus','GPT','Gemini','Riviera','Perplexity']:
        if a not in all_authors: continue
        print(f"  {a:<20} ", end="")
        for r in results:
            v = r['author_means'].get(a, 0)
            print(f"{v:>10.3f}", end="")
        # True
        true_vals = [data[i]['y'] for i in range(len(data)) if data[i]['author'] == a]
        true_mean = mean(true_vals) if true_vals else 0
        print(f"{true_mean:>10.1f}")

    # V2/V3 new feature importance
    for r in results:
        if r['name'] in ('V2', 'V3'):
            print(f"\n  {r['name']} NEW R-8 FEATURES IN TOP 15:")
            for f, imp in r['top_features']:
                if f.startswith('r8_'):
                    print(f"    {f:<40} importance={imp:.4f}")

    # Verdict
    print("\n" + "=" * 70)
    print("  VERDICT")
    print("=" * 70)

    v1 = results[0]; v2 = results[1]; v3 = results[2]
    v2_better = v2['spearman'] > v1['spearman'] and v2['inversions_sd'] <= v1['inversions_sd']
    v3_better = v3['spearman'] > v1['spearman'] and v3['inversions_sd'] <= v1['inversions_sd']

    print(f"  V2 vs V1: Spearman {'BETTER' if v2['spearman']>v1['spearman'] else 'WORSE'} "
          f"({v1['spearman']}→{v2['spearman']}), "
          f"Inversions {'BETTER' if v2['inversions_sd']<v1['inversions_sd'] else 'SAME/WORSE'} "
          f"({v1['inversions_sd']}→{v2['inversions_sd']})")
    print(f"  V3 vs V1: Spearman {'BETTER' if v3['spearman']>v1['spearman'] else 'WORSE'} "
          f"({v1['spearman']}→{v3['spearman']}), "
          f"Inversions {'BETTER' if v3['inversions_sd']<v1['inversions_sd'] else 'SAME/WORSE'} "
          f"({v1['inversions_sd']}→{v3['inversions_sd']})")
    print(f"\n  INTEGRATE V2? {'YES' if v2_better else 'NO — insufficient improvement'}")
    print(f"  INTEGRATE V3? {'YES' if v3_better else 'NO — insufficient improvement'}")

    # Save
    output = {
        'phase': 'R-8.7',
        'description': 'Scorer comparison: V1 baseline vs V2 assembly vs V3 typological',
        'timestamp': datetime.now().isoformat(),
        'results': results,
        'verdict': {
            'v2_improves': bool(v2_better),
            'v3_improves': bool(v3_better),
        },
    }
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
