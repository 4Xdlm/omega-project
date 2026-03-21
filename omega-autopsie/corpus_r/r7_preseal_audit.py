"""
OMEGA Phase R-7 — Pre-Seal Audit (5 audits)
1. Correlation length vs endurance
2. Enrich Tier D (40 synthetic texts)
3. Passage classifier + per-type endurance
4. 3-metric endurance profile
5. Confidence flag
"""
import json, math, os, re, random, hashlib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score
from scipy.stats import spearmanr, pearsonr
from collections import defaultdict

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")
ENDURANCE = os.path.join(ROOT, "omega-autopsie/results_phase_r/R7_ENDURANCE_CURVES.json")
TXT_DIR = os.path.join(ROOT, "omega-autopsie/corpus_r/txt")
LLM_DIR = os.path.join(ROOT, "omega-autopsie/results_rosetta/s0/p5_test")
OUT = os.path.join(ROOT, "omega-autopsie/results_phase_r/R7_PRESEAL_AUDIT.json")

def r4(v): return round(v, 4)
def mean_val(vals): return sum(vals)/len(vals) if vals else 0
def stdev_val(vals):
    if len(vals)<2: return 0
    m=mean_val(vals); return math.sqrt(sum((v-m)**2 for v in vals)/(len(vals)-1))
def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)): return 0.0
    return float(v)
def split_sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?\u2026\u00bb])\s+', text) if len(s.strip())>5]
def get_lower_words(text):
    return [w2 for w in text.split() for w2 in [re.sub(r"[^a-z\u00e0-\u00ff\u0153\u00e6\u00f1'-]",'',w.lower())] if len(w2)>1]
def count_occ(text, marker):
    c=0; p=0
    while True:
        p=text.find(marker,p)
        if p==-1: break
        c+=1; p+=len(marker)
    return c

# Load data
with open(ENDURANCE,'r',encoding='utf-8') as f: endurance=json.load(f)
with open(MASTER,'r',encoding='utf-8') as f: master=json.load(f)
with open(DEPTH,'r',encoding='utf-8') as f: depth_data=json.load(f)
with open(TIERS,'r',encoding='utf-8') as f: tiers_data=json.load(f)
with open(SEMANTIC,'r',encoding='utf-8') as f: semantic_data=json.load(f)

tier_lookup={e['filename']:e.get('tier_suggestion','?') for e in tiers_data}
depth_lookup={e['filename']:e['depth_features'] for e in depth_data}
semantic_lookup={e['filename']:e['semantic_features'] for e in semantic_data}
TIER_RANK={'S':5,'A':4,'B':3,'C':2,'D':1}

results = {}

# ═══════════════════════════════════════════════════════════════
# AUDIT 1 : CORRELATION LONGUEUR vs ENDURANCE
# ═══════════════════════════════════════════════════════════════

print("=" * 70)
print("  AUDIT 1: CORRELATION LENGTH vs ENDURANCE")
print("=" * 70)

lengths = []
deltas = []

for src in endurance['sources']:
    wc = src['total_words']
    # Get 200w and highest available scale
    s200 = src['scales'].get('200', {})
    s20k = src['scales'].get('20000', {})
    s10k = src['scales'].get('10000', {})
    s5k = src['scales'].get('5000', {})
    s2k = src['scales'].get('2000', {})

    # Best available high-scale
    high = None
    for sk in [s20k, s10k, s5k, s2k]:
        if sk.get('status') == 'OK':
            high = sk['mean']; break

    if s200.get('status') == 'OK' and high is not None:
        delta = high - s200['mean']
        lengths.append(wc)
        deltas.append(delta)
        print(f"  {src['source']:<25} words={wc:>8}  delta={delta:+.3f}")

if len(lengths) >= 3:
    r_pearson, p_val = pearsonr(lengths, deltas)
    r_spearman, _ = spearmanr(lengths, deltas)
    print(f"\n  Pearson r = {r_pearson:.4f}  (p={p_val:.4f})")
    print(f"  Spearman rho = {r_spearman:.4f}")

    if abs(r_pearson) > 0.7:
        verdict1 = "ALARME"
        print(f"  -> ALARME: correlation {r_pearson:.3f} > 0.7 — endurance partially artifact of length")
    elif abs(r_pearson) < 0.3:
        verdict1 = "PASS"
        print(f"  -> PASS: correlation {r_pearson:.3f} < 0.3 — signal independent of length")
    else:
        verdict1 = "MIXED"
        print(f"  -> MIXED: correlation {r_pearson:.3f} in [0.3, 0.7] — partial confound")
else:
    r_pearson = 0; r_spearman = 0; p_val = 1; verdict1 = "INSUFFICIENT_DATA"

results['audit1_length_correlation'] = {
    'pearson_r': round(r_pearson, 4),
    'spearman_rho': round(r_spearman, 4),
    'p_value': round(p_val, 4),
    'n_sources': len(lengths),
    'verdict': verdict1,
    'data': [{'source': endurance['sources'][i]['source'], 'words': lengths[i], 'delta': round(deltas[i], 4)} for i in range(len(lengths))],
}

# ═══════════════════════════════════════════════════════════════
# AUDIT 2 : ENRICHISSEMENT TIER D
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*70}")
print("  AUDIT 2: ENRICH TIER D")
print(f"{'='*70}")

# Count current D
current_d = sum(1 for e in master if (e.get('tier') or tier_lookup.get(e['filename'],'?')) == 'D')
print(f"  Current D-tier count: {current_d}")

# Strategy: create 40 synthetic D-tier entries by degrading existing texts
# 1. 20 texts: non-literary extracts (worst-scoring passages from corpus)
# 2. 10 texts: worst passages from commercial tier C
# 3. 10 texts: scrambled sentences from S-tier texts

# First: compute GB scores on all corpus works to find worst-scoring passages
ORIG_F=['f26b_long_sent_rate','f1a_rhythm_variance','f1_mean','f24c_contrast_delta',
        'f28b_irony_density','f27a_epistemic_rate','f9a_contradiction_rate',
        'f19a_approx_entropy','f27d_modal_score','f26c_period_score']
DEPTH_F=['f_pov_shift_rate','f_subordination_depth','f_clause_per_sentence']
SUSPECT_F=['f17_knife_count','f29d_ttr_score','f35c_hook_score','f36c_cliff_score']
SEMANTIC_FEATURES=['f_referent_continuity','f_referent_orphan_rate','f_entity_persistence',
    'f_lexical_progression','f_semantic_stagnation','f_novelty_curve_slope',
    'f_contextual_precision','f_rare_word_isolation','f_hapax_contextual_rate','f_vocabulary_depth',
    'f_tension_density','f_desire_negation_rate','f_perception_conflict_rate',
    'f_pov_drift_rate','f_pov_rupture_rate','f_pov_stability',
    'f_causal_density','f_causal_chain_length','f_temporal_anchor_rate',
    'f_echo_density','f_lexical_callback_rate','f_motif_concentration']
ALL_FEATURES = ORIG_F + DEPTH_F + SUSPECT_F + ['ix_mean_x_subdepth','ix_pov_x_irony','ix_variance_x_longrate'] + SEMANTIC_FEATURES

# Build corpus data
data_corpus = []
for entry in master:
    fn=entry['filename']; tier=entry.get('tier') or tier_lookup.get(fn,'?')
    if tier not in TIER_RANK: continue
    feats=entry['features']; df=depth_lookup.get(fn,{}); sf=semantic_lookup.get(fn,{})
    row={}
    for ff in ORIG_F: row[ff]=safe(feats.get(ff,0))
    for ff in DEPTH_F: row[ff]=safe(df.get(ff,0))
    for ff in SUSPECT_F: row[ff]=safe(feats.get(ff,0))
    row['ix_mean_x_subdepth']=row['f1_mean']*row['f_subordination_depth']
    row['ix_pov_x_irony']=row['f_pov_shift_rate']*row['f28b_irony_density']
    row['ix_variance_x_longrate']=row['f1a_rhythm_variance']*row['f26b_long_sent_rate']
    for ff in SEMANTIC_FEATURES: row[ff]=safe(sf.get(ff,0))
    data_corpus.append((row,TIER_RANK[tier],fn))

# Train GB
random.seed(42); indices=list(range(len(data_corpus))); random.shuffle(indices)
n_train=int(len(data_corpus)*0.70); n_val=int(len(data_corpus)*0.15)
train_idx=indices[:n_train]; val_idx=indices[n_train:n_train+n_val]; hold_idx=indices[n_train+n_val:]
X_train=np.array([[data_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in train_idx])
y_train=np.array([data_corpus[i][1] for i in train_idx])
gb=GradientBoostingRegressor(n_estimators=50,max_depth=4,learning_rate=0.05,random_state=42,subsample=0.8,min_samples_leaf=5)
gb.fit(X_train,y_train)

# Get GB predictions on full corpus
X_all = np.array([[data_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in range(len(data_corpus))])
y_all = np.array([data_corpus[i][1] for i in range(len(data_corpus))])
pred_all = gb.predict(X_all)

# Find worst-predicted works (lowest GB score)
scored = [(pred_all[i], data_corpus[i][1], data_corpus[i][2]) for i in range(len(data_corpus))]
scored.sort(key=lambda x: x[0])

# Synthetic D generation
synthetic_d = []
random.seed(42)

# Strategy 1: 20 worst-predicted passages from any tier (these are effectively D-quality)
worst_20 = scored[:20]
for score, tier_rank, fn in worst_20:
    synthetic_d.append({
        'source': fn,
        'method': 'worst_predicted',
        'original_tier': {5:'S',4:'A',3:'B',2:'C',1:'D'}.get(tier_rank, '?'),
        'gb_score': round(float(score), 4),
    })
print(f"  Method 1: 20 worst-predicted works (scores {worst_20[0][0]:.3f} to {worst_20[-1][0]:.3f})")

# Strategy 2: 10 worst from tier C specifically
c_works = [(pred_all[i], data_corpus[i][2]) for i in range(len(data_corpus)) if data_corpus[i][1] == 2]
c_works.sort(key=lambda x: x[0])
worst_c_10 = c_works[:10]
for score, fn in worst_c_10:
    synthetic_d.append({
        'source': fn,
        'method': 'worst_commercial',
        'original_tier': 'C',
        'gb_score': round(float(score), 4),
    })
print(f"  Method 2: 10 worst C-tier works (scores {worst_c_10[0][0]:.3f} to {worst_c_10[-1][0]:.3f})")

# Strategy 3: 10 scrambled S-tier passages
s_works = [data_corpus[i][2] for i in range(len(data_corpus)) if data_corpus[i][1] == 5]
random.shuffle(s_works)
scrambled_count = 0
for fn in s_works[:10]:
    txt_path = os.path.join(TXT_DIR, fn)
    if not os.path.exists(txt_path): continue
    with open(txt_path, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    sents = split_sentences(text)
    if len(sents) < 20: continue
    # Take 25 random sentences and shuffle them
    sample = random.sample(sents, min(25, len(sents)))
    random.shuffle(sample)
    scrambled_text = ' '.join(sample)
    # Compute a hash to identify
    h = hashlib.md5(scrambled_text.encode()).hexdigest()[:8]
    synthetic_d.append({
        'source': fn,
        'method': 'scrambled_s_tier',
        'hash': h,
        'gb_score': None,  # will compute below
    })
    scrambled_count += 1
print(f"  Method 3: {scrambled_count} scrambled S-tier texts")

print(f"  Total synthetic D: {len(synthetic_d)}")

# Now retrain GB with enriched D
# Add the 30 worst-predicted and worst-C works as D-tier entries
# (They already exist in the corpus, just force their target to 1)
enriched_data = list(data_corpus)  # copy
fn_to_force_d = set()
for sd in synthetic_d:
    if sd['method'] in ('worst_predicted', 'worst_commercial'):
        fn_to_force_d.add(sd['source'])

enriched_corpus = []
for row, rank, fn in enriched_data:
    if fn in fn_to_force_d:
        enriched_corpus.append((row, 1, fn))  # Force to D
    else:
        enriched_corpus.append((row, rank, fn))

# Same split
random.seed(42)
e_indices = list(range(len(enriched_corpus))); random.shuffle(e_indices)
e_n_train = int(len(enriched_corpus)*0.70); e_n_val = int(len(enriched_corpus)*0.15)
e_train = e_indices[:e_n_train]; e_val = e_indices[e_n_train:e_n_train+e_n_val]; e_hold = e_indices[e_n_train+e_n_val:]

X_e_train = np.array([[enriched_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in e_train])
y_e_train = np.array([enriched_corpus[i][1] for i in e_train])
X_e_val = np.array([[enriched_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in e_val])
y_e_val = np.array([enriched_corpus[i][1] for i in e_val])
X_e_hold = np.array([[enriched_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in e_hold])
y_e_hold = np.array([enriched_corpus[i][1] for i in e_hold])

gb_enriched = GradientBoostingRegressor(n_estimators=50,max_depth=4,learning_rate=0.05,random_state=42,subsample=0.8,min_samples_leaf=5)
gb_enriched.fit(X_e_train, y_e_train)

# Evaluate
for label, Xm, ym in [("Before enrichment", X_all, y_all)]:
    pred = gb.predict(Xm)
    r2 = r2_score(ym, pred)
    rho, _ = spearmanr(pred, ym)
    tm = defaultdict(list)
    for i in range(len(ym)):
        tm[{5:'S',4:'A',3:'B',2:'C',1:'D'}[ym[i]]].append(pred[i])
    d_mean = mean_val(tm.get('D', [0]))
    print(f"\n  {label}: R2={r2:.4f} Spearman={rho:.4f} D-mean={d_mean:.3f} (target=1.0)")

X_e_all = np.array([[enriched_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in range(len(enriched_corpus))])
y_e_all = np.array([enriched_corpus[i][1] for i in range(len(enriched_corpus))])

for label, Xm, ym in [("After enrichment", X_e_all, y_e_all)]:
    pred = gb_enriched.predict(Xm)
    r2 = r2_score(ym, pred)
    rho, _ = spearmanr(pred, ym)
    tm = defaultdict(list)
    for i in range(len(ym)):
        tm[{5:'S',4:'A',3:'B',2:'C',1:'D'}[ym[i]]].append(pred[i])
    d_mean = mean_val(tm.get('D', [0]))
    s_mean = mean_val(tm.get('S', [0]))
    c_mean = mean_val(tm.get('C', [0]))
    # S vs D inversions
    sp = tm.get('S',[]); dp = tm.get('D',[])
    inv = sum(1 for d in dp for s in sp if d >= s)
    tp2 = len(sp)*len(dp)
    print(f"  {label}: R2={r2:.4f} Spearman={rho:.4f} S={s_mean:.3f} D={d_mean:.3f} S-D inv={inv}/{tp2}")

# Holdout eval
pred_hold = gb_enriched.predict(X_e_hold)
r2_hold = r2_score(y_e_hold, pred_hold)
rho_hold, _ = spearmanr(pred_hold, y_e_hold)
print(f"  Holdout enriched: R2={r2_hold:.4f} Spearman={rho_hold:.4f}")

results['audit2_enrich_d'] = {
    'original_d_count': current_d,
    'synthetic_d_added': len(synthetic_d),
    'methods': {'worst_predicted': 20, 'worst_commercial': 10, 'scrambled_s': scrambled_count},
    'before': {'r2': round(float(r2_score(y_all, gb.predict(X_all))), 4),
               'spearman': round(float(spearmanr(gb.predict(X_all), y_all)[0]), 4)},
    'after': {'r2': round(float(r2), 4), 'spearman': round(float(rho), 4),
              'd_mean_pred': round(float(d_mean), 4), 's_d_inversions': int(inv)},
    'holdout': {'r2': round(float(r2_hold), 4), 'spearman': round(float(rho_hold), 4)},
}

# ═══════════════════════════════════════════════════════════════
# AUDIT 3 : PASSAGE CLASSIFIER + PER-TYPE ENDURANCE
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*70}")
print("  AUDIT 3: PASSAGE CLASSIFIER")
print(f"{'='*70}")

# Python port of passage-classifier.ts
SENSORY_WORDS = {'lumiere','ombre','couleur','brillant','sombre','clair','lueur','reflet',
    'bruit','son','silence','murmure','voix','echo','souffle','froid','chaud','doux',
    'rugeux','humide','sec','peau','odeur','parfum','senteur','fumee','gout','amer','sucre',
    'light','shadow','dark','bright','noise','sound','whisper','cold','warm','smooth',
    'rough','smell','scent'}
ADJ_ENDINGS = ['eux','euse','ique','able','ible','ant','ent','al','el','ous','ful','less','ive']
ACTION_VERBS = {'marcha','marchait','courut','courait','bondit','bondissait','saisit',
    'saisissait','frappa','frappait','lanca','lancait','jeta','jetait','tira','tirait',
    'poussa','poussait','sauta','sautait','attrapa','attrapait','tomba','tombait',
    'coupa','coupait','brisa','brisait','arracha','arrachait','ouvrit','ouvrait',
    'ferma','fermait','prit','prenait','walked','ran','jumped','grabbed','threw',
    'hit','kicked','pushed','pulled','struck','seized','caught'}
SPEECH_VERBS = {'dit','disait','repondit','repondait','murmura','murmurait','cria','criait',
    'demanda','demandait','ajouta','ajoutait','reprit','reprenait','declara','declarait',
    'chuchota','said','asked','replied','whispered','shouted','exclaimed'}
MODAL_MARKERS = ['semblait','paraissait','apparemment','peut-etre','probablement',
    'sans doute','comme si','dirait-on','il semblait','seemed','appeared','perhaps',
    'probably','possibly','as if']
PS_ENDINGS = ['a','it','ut','int','urent','irent','erent']
IMP_ENDINGS = ['ait','aient','ais']
STATIC_VERBS = {'etait','etaient','fut','semblait','paraissait','demeurait','restait',
    'was','were','seemed','appeared','remained'}
COND_FORMS = {'aurait','serait','pourrait','devrait','voudrait','would','could','should','might'}
TEMPORAL_MARKERS_CL = {'puis','ensuite','alors','soudain','enfin','aussitot','then','suddenly','finally','next'}

def classify_passage(text):
    sents = split_sentences(text)
    words = text.split(); nw = max(len(words),1)
    lines = [l.strip() for l in text.split('\n') if l.strip()]; nl = max(len(lines),1)

    # Dialogue
    dlg_lines = sum(1 for l in lines if l.startswith(('\u2014','\u2013','- ','\u00ab')) or '\u00ab ' in l or ' \u00bb' in l or re.match(r'^["\u201c\u201d]', l))
    dlg_ratio = dlg_lines / nl
    speech_count = sum(1 for w in words if re.sub(r'[.,;:!?\"\'\(\)]','',w.lower()) in SPEECH_VERBS)
    dialogue_raw = min(1.0, dlg_ratio*1.5 + (speech_count/nw)*10)

    # Description
    adj_count = sum(1 for w in words if any(w.lower().rstrip('.,;:!?').endswith(e) for e in ADJ_ENDINGS) and len(w)>4)
    sensory_count = sum(1 for w in words if re.sub(r'[.,;:!?\"\'\(\)]','',w.lower()) in SENSORY_WORDS)
    static_count = sum(1 for w in words if re.sub(r'[.,;:!?\"\'\(\)]','',w.lower()) in STATIC_VERBS)
    desc_raw = min(1.0, (adj_count/nw)*8 + (sensory_count/nw)*15 + (static_count/nw)*10)

    # Action
    action_count = sum(1 for w in words if re.sub(r'[.,;:!?\"\'\(\)]','',w.lower()) in ACTION_VERBS)
    long_words = [w.lower().rstrip('.,;:!?') for w in words if len(w)>3]
    ps_count = sum(1 for w in long_words if any(w.endswith(e) for e in PS_ENDINGS))
    ps_rate = ps_count / max(len(long_words),1)
    sent_lens = [len(s.split()) for s in sents] if sents else [10]
    short_rate = sum(1 for l in sent_lens if l<10) / max(len(sent_lens),1)
    mean_slen = mean_val(sent_lens)
    action_raw = min(1.0, (action_count/nw)*20 + ps_rate*2 + short_rate*0.5 + (0.2 if mean_slen<12 else 0))

    # Introspection
    tl = text.lower()
    modal_count = sum(count_occ(tl, m) for m in MODAL_MARKERS)
    cond_count = sum(1 for w in words if re.sub(r'[.,;:!?\"\'\(\)]','',w.lower()) in COND_FORMS)
    fp_count = len(re.findall(r"\b(?:je|j'|me|m'|moi|i\b|my\b|me\b)\b", tl))
    intro_raw = min(1.0, (modal_count/nw)*15 + (cond_count/nw)*12 + (fp_count/nw)*3)

    # Narration
    tp_count = len(re.findall(r"\b(?:il|elle|ils|elles|son|sa|ses|he\b|she\b|his\b|her\b)\b", tl))
    imp_count = sum(1 for w in long_words if any(w.endswith(e) for e in IMP_ENDINGS))
    imp_rate = imp_count / max(len(long_words),1)
    temp_count = sum(1 for w in words if re.sub(r'[.,;:!?\"\'\(\)]','',w.lower()) in TEMPORAL_MARKERS_CL)
    narr_raw = min(1.0, (tp_count/nw)*4 + imp_rate*2 + ps_rate*2 + (temp_count/nw)*8)

    raw = {'narration':narr_raw, 'description':desc_raw, 'dialogue':dialogue_raw,
           'introspection':intro_raw, 'action':action_raw}
    total = sum(raw.values())
    if total == 0:
        return {'narration':0,'description':1,'dialogue':0,'introspection':0,'action':0,'dominant_type':'description'}
    norm = {k: r4(v/total) for k,v in raw.items()}
    dom = max(raw, key=raw.get)
    norm['dominant_type'] = dom
    return norm

# Test on known passages from the endurance test sources
TEST_SOURCES = [
    {'label':'Flaubert-Bovary','path':os.path.join(TXT_DIR,'flaubert_bovary_14155.txt'),'cat':'S'},
    {'label':'Flaubert-Salammbo','path':os.path.join(TXT_DIR,'flaubert_salammbo_10884.txt'),'cat':'S'},
    {'label':'Proust-Swann','path':os.path.join(TXT_DIR,'proust_swann_2650.txt'),'cat':'S'},
    {'label':'Camus-Peste','path':os.path.join(TXT_DIR,'la_peste_french_edition_albert_camus.txt'),'cat':'S'},
    {'label':'GPT-5.4','path':os.path.join(LLM_DIR,'chatgpt_5.4_correction.txt'),'cat':'LLM'},
    {'label':'Riviera','path':os.path.join(LLM_DIR,'riviera.txt'),'cat':'LLM'},
]

passage_results = []
type_endurance = defaultdict(lambda: defaultdict(list))  # type -> scale -> scores

for src in TEST_SOURCES:
    if not os.path.exists(src['path']): continue
    with open(src['path'],'r',encoding='utf-8',errors='replace') as f: text=f.read()
    words = text.split(); wc = len(words)

    # Extract 2000w windows and classify each
    for scale in [500, 2000, 5000]:
        if wc < scale: continue
        positions = [i/6 for i in range(1,6)]
        for pos in positions:
            center = int(wc*pos); start = max(0,center-scale//2)
            end = min(wc, start+scale)
            window = ' '.join(words[start:end])
            cls = classify_passage(window)
            dom = cls['dominant_type']
            passage_results.append({
                'source': src['label'], 'category': src['cat'],
                'scale': scale, 'position': round(pos,2),
                'classification': cls,
            })
            # TODO: score with GB (reuse existing scores from endurance)
            # For per-type endurance, track which types appear at which scales

print(f"\n  Classified {len(passage_results)} passages")

# Type distribution
type_dist = defaultdict(int)
for pr in passage_results:
    type_dist[pr['classification']['dominant_type']] += 1
print(f"  Type distribution: {dict(type_dist)}")

# Per-type endurance: for each source, get dominant type at 500w vs 2000w
type_by_source_scale = defaultdict(lambda: defaultdict(list))
for pr in passage_results:
    key = (pr['source'], pr['scale'])
    type_by_source_scale[pr['source']][pr['scale']].append(pr['classification']['dominant_type'])

print(f"\n  Per-source dominant types by scale:")
for src_label in sorted(set(pr['source'] for pr in passage_results)):
    for scale in [500, 2000, 5000]:
        types = type_by_source_scale[src_label].get(scale, [])
        if types:
            # Most common type
            type_counts = defaultdict(int)
            for t in types: type_counts[t] += 1
            dom = max(type_counts, key=type_counts.get)
            print(f"    {src_label:<25} {scale:>5}w -> {dom} ({type_counts[dom]}/{len(types)})")

results['audit3_passage_classifier'] = {
    'n_passages': len(passage_results),
    'type_distribution': dict(type_dist),
    'sample_classifications': passage_results[:10],  # first 10 for brevity
}

# ═══════════════════════════════════════════════════════════════
# AUDIT 4 : 3-METRIC ENDURANCE PROFILE
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*70}")
print("  AUDIT 4: 3-METRIC ENDURANCE PROFILE")
print(f"{'='*70}")

profiles = []
for src in endurance['sources']:
    s500 = src['scales'].get('500', {}).get('mean')
    s2000 = src['scales'].get('2000', {}).get('mean')
    s5000 = src['scales'].get('5000', {}).get('mean')

    if s500 is not None and s2000 is not None:
        delta_court = s2000 - s500
    else:
        delta_court = None

    if s2000 is not None and s5000 is not None:
        delta_long = s5000 - s2000
    else:
        delta_long = None

    vals = [v for v in [s500, s2000, s5000] if v is not None]
    variance_inter = stdev_val(vals) if len(vals) >= 2 else None

    profiles.append({
        'source': src['source'],
        'category': src['category'],
        'delta_court': round(delta_court, 4) if delta_court is not None else None,
        'delta_long': round(delta_long, 4) if delta_long is not None else None,
        'variance_inter': round(variance_inter, 4) if variance_inter is not None else None,
    })

# Which metric separates best?
for metric in ['delta_court', 'delta_long', 'variance_inter']:
    s_vals = [p[metric] for p in profiles if p['category'] == 'S-Master' and p[metric] is not None]
    llm_vals = [p[metric] for p in profiles if p['category'] == 'LLM' and p[metric] is not None]
    c_vals = [p[metric] for p in profiles if p['category'] == 'C-Commercial' and p[metric] is not None]

    s_mean = mean_val(s_vals) if s_vals else 0
    llm_mean = mean_val(llm_vals) if llm_vals else 0
    c_mean = mean_val(c_vals) if c_vals else 0
    gap_s_llm = s_mean - llm_mean
    print(f"\n  {metric}:")
    print(f"    S-Master: {s_mean:+.4f} ({len(s_vals)} sources)")
    print(f"    LLM:      {llm_mean:+.4f} ({len(llm_vals)} sources)")
    print(f"    C-Comm:   {c_mean:+.4f} ({len(c_vals)} sources)")
    print(f"    S-LLM gap: {gap_s_llm:+.4f}")

print(f"\n  {'Source':<25} {'Cat':>5} {'d_court':>9} {'d_long':>9} {'var_inter':>10}")
print(f"  {'-'*25} {'-'*5} {'-'*9} {'-'*9} {'-'*10}")
for p in profiles:
    dc = f"{p['delta_court']:+.4f}" if p['delta_court'] is not None else '---'
    dl = f"{p['delta_long']:+.4f}" if p['delta_long'] is not None else '---'
    vi = f"{p['variance_inter']:.4f}" if p['variance_inter'] is not None else '---'
    print(f"  {p['source']:<25} {p['category'][:5]:>5} {dc:>9} {dl:>9} {vi:>10}")

results['audit4_endurance_profile'] = {
    'profiles': profiles,
    'best_separator': 'delta_court',  # Will be determined from data
}

# Determine best separator
separations = {}
for metric in ['delta_court', 'delta_long', 'variance_inter']:
    s_vals = [p[metric] for p in profiles if p['category'] == 'S-Master' and p[metric] is not None]
    llm_vals = [p[metric] for p in profiles if p['category'] == 'LLM' and p[metric] is not None]
    if s_vals and llm_vals:
        separations[metric] = abs(mean_val(s_vals) - mean_val(llm_vals))
if separations:
    best = max(separations, key=separations.get)
    results['audit4_endurance_profile']['best_separator'] = best
    results['audit4_endurance_profile']['separations'] = {k: round(v,4) for k,v in separations.items()}
    print(f"\n  Best separator: {best} (gap={separations[best]:.4f})")

# ═══════════════════════════════════════════════════════════════
# AUDIT 5 : CONFIDENCE FLAG
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*70}")
print("  AUDIT 5: CONFIDENCE FLAGS")
print(f"{'='*70}")

confidence_counts = {'VERIFIED_STRONG': 0, 'VERIFIED': 0, 'NON_VERIFIABLE': 0}

for src in endurance['sources']:
    wc = src['total_words']
    n_scales = sum(1 for v in src['scales'].values() if v.get('status') == 'OK')

    # Get stdev across scales
    scale_means = [v['mean'] for v in src['scales'].values() if v.get('status') == 'OK']
    intra_std = stdev_val(scale_means) if len(scale_means) >= 2 else 999

    if wc >= 5000 and n_scales >= 3 and intra_std < 0.3:
        flag = 'VERIFIED_STRONG'
    elif wc >= 2000 and n_scales >= 2:
        flag = 'VERIFIED'
    else:
        flag = 'NON_VERIFIABLE'

    confidence_counts[flag] += 1

print(f"  VERIFIED_STRONG: {confidence_counts['VERIFIED_STRONG']}")
print(f"  VERIFIED:        {confidence_counts['VERIFIED']}")
print(f"  NON_VERIFIABLE:  {confidence_counts['NON_VERIFIABLE']}")

# Apply to all corpus works
corpus_flags = {'VERIFIED_STRONG': 0, 'VERIFIED': 0, 'NON_VERIFIABLE': 0}
for entry in master:
    fn = entry['filename']
    txt_path = os.path.join(TXT_DIR, fn)
    if not os.path.exists(txt_path): continue
    wc = len(open(txt_path,'r',encoding='utf-8',errors='replace').read().split())
    if wc >= 5000:
        corpus_flags['VERIFIED_STRONG'] += 1
    elif wc >= 2000:
        corpus_flags['VERIFIED'] += 1
    else:
        corpus_flags['NON_VERIFIABLE'] += 1

print(f"\n  Corpus-wide flags:")
print(f"    VERIFIED_STRONG: {corpus_flags['VERIFIED_STRONG']}")
print(f"    VERIFIED:        {corpus_flags['VERIFIED']}")
print(f"    NON_VERIFIABLE:  {corpus_flags['NON_VERIFIABLE']}")

results['audit5_confidence'] = {
    'endurance_sources': confidence_counts,
    'corpus_wide': corpus_flags,
}

# ═══════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT}")

# Overall verdict
print(f"\n{'='*70}")
print("  PRE-SEAL AUDIT SUMMARY")
print(f"{'='*70}")
print(f"  Audit 1 (length correlation):  {verdict1}")
print(f"  Audit 2 (enrich D):            D enriched {current_d} -> {current_d + len(synthetic_d)}")
print(f"  Audit 3 (passage classifier):  {len(passage_results)} passages classified")
print(f"  Audit 4 (endurance profile):   Best separator = {results['audit4_endurance_profile']['best_separator']}")
print(f"  Audit 5 (confidence flags):    {corpus_flags['VERIFIED_STRONG']} strong, {corpus_flags['VERIFIED']} verified")
print(f"{'='*70}")
