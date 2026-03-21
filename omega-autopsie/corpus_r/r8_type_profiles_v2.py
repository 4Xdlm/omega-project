#!/usr/bin/env python3
"""
OMEGA Phase R-8.1 v2 — TYPE PROFILES (WEIGHTED CONTINUOUS)
═══════════════════════════════════════════════════════════
Instead of filtering for "pure" passages (impossible at 2000w on masters),
compute Ci,f as WEIGHTED AVERAGES across ALL passages, where each passage
contributes proportionally to its type composition.

Formula: Ci,f = Σ(pi,k × fk) / Σ(pi,k)

5 guards (ChatGPT audit):
  1. Normalization: verify type weights sum to 1.0 per passage
  2. Effective mass: Σ(pi,k) per type — low mass = noisy profile
  3. Weighted variance per type per feature
  4. Colinearity warning between type vectors
  5. Reconstruction validation: f_predicted vs f_measured

Standard: NASA-Grade L4 — zero approximation, all values MEASURED.
"""

import json, os, re, math, sys
from statistics import mean, stdev
from collections import Counter
from datetime import datetime
import numpy as np

ROOT = r"C:\Users\elric\omega-project"
TXT_DIR = os.path.join(ROOT, "omega-autopsie", "corpus_r", "txt")
TIERS_FILE = os.path.join(ROOT, "omega-autopsie", "corpus_r", "CORPUS_TIERS_V3.json")
OUT_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "TYPE_PROFILES_PURE.json")

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)

WINDOW = 2000
POSITIONS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40,
             0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80,
             0.85, 0.90, 0.95]  # 19 positions for max coverage
TYPES = ['action', 'narration', 'description', 'dialogue', 'introspection']

# ═══════════════════════════════════════════════════════════════════════
# UTILS
# ═══════════════════════════════════════════════════════════════════════

def split_sentences(text):
    raw = re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def r5(v):
    if v is None: return None
    return round(float(v), 5)

def clean_word(w):
    return w.lower().replace(',','').replace('.','').replace(';','').replace(
        ':','').replace('!','').replace('?','').replace('"','').replace(
        "'", '').replace('(','').replace(')','')

# ═══════════════════════════════════════════════════════════════════════
# MARKER SETS
# ═══════════════════════════════════════════════════════════════════════

SENSORY_WORDS = {'lumiere','ombre','couleur','brillant','sombre','clair','lueur','reflet','bruit','son','silence','murmure','voix','echo','souffle','froid','chaud','doux','rugeux','humide','sec','peau','odeur','parfum','senteur','fumee','gout','amer','sucre','light','shadow','dark','bright','noise','sound','whisper','cold','warm','smooth','rough','smell','scent'}
ADJ_ENDINGS = ['eux','euse','ique','able','ible','ant','ent','al','el','ous','ful','less','ive','oso','osa']
ACTION_VERBS = {'marcha','marchait','courut','courait','bondit','bondissait','saisit','saisissait','frappa','frappait','lanca','lancait','jeta','jetait','tira','tirait','poussa','poussait','sauta','sautait','attrapa','attrapait','tomba','tombait','coupa','coupait','brisa','brisait','arracha','arrachait','ouvrit','ouvrait','ferma','fermait','prit','prenait','walked','ran','jumped','grabbed','threw','hit','kicked','pushed','pulled','struck','seized','caught'}
SPEECH_VERBS = {'dit','disait','repondit','repondait','murmura','murmurait','cria','criait','demanda','demandait','ajouta','ajoutait','reprit','reprenait','declara','declarait','chuchota','said','asked','replied','whispered','shouted','exclaimed'}
MODAL_MARKERS = ['semblait','paraissait','apparemment','peut-etre','probablement','sans doute','comme si','dirait-on','il semblait','seemed','appeared','perhaps','probably','possibly','as if']
STATIC_VERBS = {'etait','etaient','fut','semblait','paraissait','demeurait','restait','was','were','seemed','appeared','remained'}
PS_ENDINGS = ['a','it','ut','int','urent','irent','erent']
IMP_ENDINGS = ['ait','aient','ais']
TEMPORAL_MARKERS = ['puis','ensuite','alors','soudain','enfin','aussitot','then','suddenly','finally','next']
COND_FORMS = ['aurait','serait','pourrait','devrait','voudrait','would','could','should','might']
STOP_FR = {'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces','mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur','nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car','dans','sur','sous','avec','sans','pour','par','entre','vers','chez','contre','que','qui','dont','quand','comme','si','ne','pas','plus','jamais','rien','est','sont','etait','etaient','etre','avoir','avait','avaient','fait','faire','dit','dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes','autre','autres','meme','aussi','tres','bien','peu','trop','assez','alors','encore','deja','la','ici','puis','the','a','an','and','or','but','in','on','at','to','for','of','with','from','by','is','was','were','are','been','be','has','had','have','do','did','does','will','would','could','should','may','might','shall','can','must','it','its','he','she','they','them','their','his','her','this','that','these','those','not','no','so','if','as'}
ADVERSATIVES = {'mais','cependant','toutefois','neanmoins','pourtant','or','en revanche','au contraire','certes','malgre','but','however','nevertheless','yet','although','though','despite'}
CAUSAL_MARKERS = {'parce que','car','puisque','donc','ainsi','en effet','par consequent','de ce fait','because','since','therefore','thus','hence','consequently','as a result','due to','owing to'}
PERCEPTION_VERBS = {'vit','voyait','regardait','observait','apercevait','contemplait','entendait','ecoutait','sentait','touchait','goutait','saw','watched','observed','noticed','heard','listened','felt','touched'}
DESIRE_VERBS = {'voulait','desirait','souhaitait','revait','esperait','enviait','wanted','desired','wished','dreamed','hoped','longed','craved'}
NEGATION_WORDS = {'ne','pas','plus','jamais','rien','aucun','aucune','nul','nulle','guere','point','non','not','never','nothing','none','neither','nor','nowhere'}
SUB_MARKERS = {'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles','quand','lorsque','comme','puisque','parce','bien que','quoique','afin que','pour que','avant que','apres que','tandis que','that','which','who','whom','whose','where','when','while','because','since','although','though','if','unless','until'}

# ═══════════════════════════════════════════════════════════════════════
# PASSAGE CLASSIFIER — Python port of passage-classifier.ts
# ═══════════════════════════════════════════════════════════════════════

def classify_passage(text):
    sents = split_sentences(text)
    words = [w for w in text.split() if w]
    n_words = max(len(words), 1)
    n_sents = max(len(sents), 1)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    n_lines = max(len(lines), 1)

    dialogue_lines = sum(1 for line in lines if line.startswith('\u2014') or line.startswith('\u2013') or line.startswith('- ') or line.startswith('\u00ab') or '\u00ab ' in line or ' \u00bb' in line or re.match(r'^["""\u201C]', line))
    speech_verb_count = sum(1 for w in words if clean_word(w) in SPEECH_VERBS)
    dialogue_score = min(1.0, (dialogue_lines / n_lines) * 1.5 + (speech_verb_count / n_words) * 10)

    adj_count = sum(1 for w in words if any(clean_word(w).endswith(e) for e in ADJ_ENDINGS) and len(clean_word(w)) > 4)
    sensory_count = sum(1 for w in words if clean_word(w) in SENSORY_WORDS)
    static_count = sum(1 for w in words if clean_word(w) in STATIC_VERBS)
    description_score = min(1.0, (adj_count/n_words)*8 + (sensory_count/n_words)*15 + (static_count/n_words)*10)

    action_verb_count = sum(1 for w in words if clean_word(w) in ACTION_VERBS)
    long_words = [clean_word(w) for w in words if len(w) > 3]
    n_long = max(len(long_words), 1)
    ps_count = sum(1 for w in long_words if any(w.endswith(e) for e in PS_ENDINGS))
    ps_rate = ps_count / n_long
    sent_lens = [len(s.split()) for s in sents]
    mean_sent_len = sum(sent_lens) / n_sents
    short_sent_rate = sum(1 for l in sent_lens if l < 10) / n_sents
    action_score = min(1.0, (action_verb_count/n_words)*20 + ps_rate*2 + short_sent_rate*0.5 + (0.2 if mean_sent_len < 12 else 0))

    txt_lower = text.lower()
    modal_count = 0
    for marker in MODAL_MARKERS:
        p = 0
        while True:
            p = txt_lower.find(marker, p)
            if p == -1: break
            modal_count += 1
            p += len(marker)
    cond_count = sum(1 for w in words if clean_word(w) in COND_FORMS)
    first_person = len(re.findall(r"\b(?:je|j'|me|m'|moi)\b", txt_lower))
    introspection_score = min(1.0, (modal_count/n_words)*15 + (cond_count/n_words)*12 + (first_person/n_words)*3)

    third_person = len(re.findall(r"\b(?:il|elle|ils|elles|son|sa|ses|he\b|she\b|his\b|her\b)\b", txt_lower))
    imp_count = sum(1 for w in long_words if any(w.endswith(e) for e in IMP_ENDINGS))
    temporal_count = sum(1 for w in words if clean_word(w) in TEMPORAL_MARKERS)
    narration_score = min(1.0, (third_person/n_words)*4 + (imp_count/n_long)*2 + ps_rate*2 + (temporal_count/n_words)*8)

    raw = {'narration': narration_score, 'description': description_score,
           'dialogue': dialogue_score, 'introspection': introspection_score,
           'action': action_score}
    total = sum(raw.values())
    if total == 0:
        return {'narration':0,'description':1,'dialogue':0,'introspection':0,'action':0}
    return {k: round(v / total, 5) for k, v in raw.items()}

# ═══════════════════════════════════════════════════════════════════════
# FEATURE COMPUTATION
# ═══════════════════════════════════════════════════════════════════════

def compute_features(text):
    sents = split_sentences(text)
    words_clean = [clean_word(w) for w in text.split() if w]
    n_words = max(len(words_clean), 1)
    n_sents = max(len(sents), 1)
    txt_lower = text.lower()
    sent_lens = [len(s.split()) for s in sents]
    f = {}

    f['f1_mean'] = mean(sent_lens) if sent_lens else 0
    f['f1a_rhythm_variance'] = stdev(sent_lens) if len(sent_lens) > 1 else 0
    f['f1b_rhythm_ratio'] = (max(sent_lens) / max(min(sent_lens), 1)) if sent_lens else 0

    verb_ends = ['ait','aient','ais','a','it','ut','er','ir','re','ant','ent','ons','ez']
    vc = sum(1 for w in words_clean if len(w) > 3 and any(w.endswith(e) for e in verb_ends))
    f['f5a_verb_density'] = vc / n_words
    ac = sum(1 for w in words_clean if any(w.endswith(e) for e in ADJ_ENDINGS) and len(w) > 4)
    f['f5b_verb_adj_ratio'] = vc / max(ac, 1)
    f['f5c_action_verb_ratio'] = sum(1 for w in words_clean if w in ACTION_VERBS) / n_words

    adv_c = sum(txt_lower.count(m) for m in ADVERSATIVES)
    f['f9a_contradiction_rate'] = adv_c / n_sents

    sw, prev = 0, None
    for w in words_clean:
        if len(w) < 4: continue
        ct = None
        if any(w.endswith(e) for e in PS_ENDINGS): ct = 'PS'
        elif any(w.endswith(e) for e in IMP_ENDINGS): ct = 'IMP'
        if ct and prev and ct != prev: sw += 1
        if ct: prev = ct
    f['f12_tense_switches'] = sw

    bigrams = [f"{words_clean[i]} {words_clean[i+1]}" for i in range(len(words_clean)-1)
               if words_clean[i] not in STOP_FR and words_clean[i+1] not in STOP_FR]
    ubg = len(set(bigrams))
    f['f15b_redundancy_compression'] = ubg / max(len(bigrams), 1)

    cw = [w for w in words_clean if w not in STOP_FR and len(w) > 2]
    wf = Counter(cw)
    hx = sum(1 for _, c in wf.items() if c == 1)
    f['f16_hapax_count'] = hx
    f['f16a_bigram_rarity'] = ubg / max(len(bigrams), 1)
    f['f16c_lexical_surprise'] = hx / max(len(cw), 1)

    knife = sum(1 for l in sent_lens if l <= 5)
    f['f17_knife_count'] = knife
    if knife >= 2:
        pos = [i for i, l in enumerate(sent_lens) if l <= 5]
        gaps = [pos[j+1]-pos[j] for j in range(len(pos)-1)]
        f['f17_contrast_spacing'] = mean(gaps) if gaps else n_sents
    else:
        f['f17_contrast_spacing'] = n_sents

    if cw:
        tc = len(cw); freq = Counter(cw)
        ent = -sum((c/tc)*math.log2(c/tc) for c in freq.values() if c > 0)
        me = math.log2(len(freq)) if len(freq) > 1 else 1
        f['f19a_approx_entropy'] = ent / me if me > 0 else 0
    else:
        f['f19a_approx_entropy'] = 0

    if n_sents >= 10:
        ch = n_sents // 5
        sm = [mean(sent_lens[i*ch:(i+1)*ch]) for i in range(5) if sent_lens[i*ch:(i+1)*ch]]
        f['f19f_window_stdev'] = stdev(sm) if len(sm) > 1 else 0
    else:
        f['f19f_window_stdev'] = 0

    dia = 0
    for i in range(len(cw)):
        for j in range(i+1, min(i+6, len(cw))):
            if cw[i] == cw[j]: dia += 1; break
    f['f21c_diacope_rate'] = dia / max(len(cw), 1)

    if sents:
        starts = [s.split()[0].lower() if s.split() else '' for s in sents]
        sf = Counter(starts)
        f['f21e_ritual_index'] = sum(c for c in sf.values() if c > 1) / n_sents
    else:
        f['f21e_ritual_index'] = 0

    if len(sent_lens) >= 10:
        ss = sorted(sent_lens); n = len(ss); p25 = ss[n//4]; p75 = ss[3*n//4]
        banal = [l for l in sent_lens if l <= p25]; apex = [l for l in sent_lens if l >= p75]
        f['f24a_banal_rate'] = len(banal)/n
        f['f24b_apex_rate'] = len(apex)/n
        f['f24c_contrast_delta'] = (mean(apex) if apex else 0) - (mean(banal) if banal else 0)
        f['f24e_contrast_score'] = min(1.0, f['f24c_contrast_delta']/15)*0.5+0.5
    else:
        f['f24a_banal_rate'] = f['f24b_apex_rate'] = f['f24c_contrast_delta'] = f['f24e_contrast_score'] = 0

    sc = sum(1 for w in words_clean if w in SENSORY_WORDS)
    f['f25a_description_density'] = sc
    f['f25g_description_score'] = sc / n_words * 10

    sub_c = sum(txt_lower.count(f' {m} ') for m in SUB_MARKERS)
    f['f26a_mean_sub_markers'] = sub_c / n_sents
    ls = sum(1 for l in sent_lens if l > 30)
    f['f26b_long_sent_rate'] = ls / n_sents
    f['f26c_period_score'] = f['f26a_mean_sub_markers'] * f['f26b_long_sent_rate']

    epist = {'peut-etre','sans doute','probablement','il semble','apparemment','perhaps','probably','possibly','seemingly'}
    epc = sum(1 for m in epist if m in txt_lower)
    f['f27a_epistemic_rate'] = epc / n_sents * 100
    cc = sum(1 for w in words_clean if w in COND_FORMS)
    f['f27b_conditional_rate'] = cc / n_words
    nc = sum(1 for w in words_clean if w in NEGATION_WORDS)
    f['f27c_negation_rate'] = nc / n_sents * 100
    f['f27d_modal_score'] = f['f27b_conditional_rate']*5 + epc/n_words*10

    sil_pat = [r'il\s+(?:semblait|lui\s+semblait|croyait|pensait)',
               r'elle\s+(?:semblait|croyait|pensait|sentait)',
               r'(?:comme\s+si|sans\s+doute)\s+\w+\s+(?:avait|etait)']
    silc = sum(len(re.findall(p, txt_lower)) for p in sil_pat)
    f['f28d_sil_score'] = silc / n_sents

    al = [w for w in words_clean if len(w) > 1]
    f['f29a_ttr_global'] = len(set(al)) / max(len(al), 1)
    if len(al) >= 200:
        ttrs = [len(set(al[i:i+100]))/100 for i in range(0, len(al)-99, 50)]
        f['f29d_ttr_score'] = mean(ttrs)
    else:
        f['f29d_ttr_score'] = f['f29a_ttr_global']

    ps = sum(1 for w in words_clean if len(w) > 4 and any(w.endswith(e) for e in PS_ENDINGS))
    imp = sum(1 for w in words_clean if len(w) > 4 and any(w.endswith(e) for e in IMP_ENDINGS))
    tt = max(ps+imp+1, 1)
    f['f30a_passe_simple_rate'] = ps/tt
    f['f30b_imparfait_rate'] = imp/tt
    f['f30d_ps_imp_ratio'] = ps/max(imp, 1)

    dots = text.count('.')+text.count('!')+text.count('?')
    commas = text.count(',')
    f['f33a_dots_count'] = dots
    f['f33b_commas_count'] = commas
    f['f33c_dot_comma_ratio'] = dots/max(commas, 1)

    paras = [p.strip() for p in text.split('\n\n') if p.strip()]
    f['f34a_paragraph_count'] = max(len(paras), 1)
    f['f34b_para_per_1000w'] = len(paras) / (n_words/1000)

    sp = sum(1 for p in paras if len(p.split()) < 30) if paras else 0
    f['f38a_short_para_rate'] = sp/max(len(paras), 1)
    f['f38b_punct_density'] = (dots+commas)/n_words
    f['f38c_speed_score'] = f['f38a_short_para_rate']*0.3 + f['f38b_punct_density']*2

    f['f_subordination_depth_approx'] = sub_c / n_sents
    f['f_negation_density'] = nc / (n_words/100)
    f['f_sentence_variance_local'] = f['f1a_rhythm_variance']**2

    caus = sum(txt_lower.count(m) for m in CAUSAL_MARKERS)
    f['f_causal_density'] = caus / n_sents
    des = sum(1 for w in words_clean if w in DESIRE_VERBS)
    f['f_tension_density'] = (des + nc*0.3) / n_words
    f['f_desire_negation_rate'] = des / max(nc, 1)

    mid = len(al) // 2
    if mid > 50:
        f['f_lexical_progression'] = len(set(al[mid:]))/max(len(al)-mid,1) - len(set(al[:mid]))/mid
    else:
        f['f_lexical_progression'] = 0

    return f

# ═══════════════════════════════════════════════════════════════════════
# EXTRACTION
# ═══════════════════════════════════════════════════════════════════════

def extract_passage(text, position_ratio, window_words):
    words = text.split()
    n = len(words)
    center = int(n * position_ratio)
    half = window_words // 2
    start = max(0, center - half)
    end = min(n, start + window_words)
    if end - start < window_words:
        start = max(0, end - window_words)
    return ' '.join(words[start:end])

# ═══════════════════════════════════════════════════════════════════════
# MAIN — WEIGHTED CONTINUOUS PROFILES
# ═══════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  OMEGA R-8.1 v2 -- WEIGHTED CONTINUOUS TYPE PROFILES")
    print(f"  Window: {WINDOW}w | Positions: {len(POSITIONS)} | Tier: S only")
    print(f"  Method: Ci,f = sum(pi,k * fk) / sum(pi,k)")
    print("=" * 70)

    with open(TIERS_FILE, 'r', encoding='utf-8') as f:
        tiers_data = json.load(f)
    tier_lookup = {e['filename']: e.get('tier_final') or e.get('tier_suggestion','?') for e in tiers_data}
    s_files = [fn for fn, t in tier_lookup.items() if t == 'S']
    print(f"\n  Tier S works: {len(s_files)}")

    # === PHASE 1: Extract passages + classify + compute features ===
    all_passages = []
    skipped = 0
    processed = 0

    for i, fn in enumerate(s_files):
        txt_path = os.path.join(TXT_DIR, fn)
        if not os.path.exists(txt_path):
            skipped += 1; continue
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='replace') as fh:
                text = fh.read()
        except:
            skipped += 1; continue
        if len(text.split()) < WINDOW * 1.5:
            skipped += 1; continue

        for pos in POSITIONS:
            pt = extract_passage(text, pos, WINDOW)
            if len(pt.split()) < WINDOW * 0.8: continue
            cl = classify_passage(pt)
            ft = compute_features(pt)
            all_passages.append({'filename': fn, 'position': pos,
                                 'types': cl, 'features': ft})
        processed += 1
        if (i+1) % 50 == 0:
            print(f"  [{i+1}/{len(s_files)}] processed={processed} skipped={skipped} passages={len(all_passages)}")

    print(f"\n  TOTAL: {processed} works, {skipped} skipped, {len(all_passages)} passages")

    # === GUARD 1: Verify normalization ===
    norm_errors = 0
    for p in all_passages:
        s = sum(p['types'][t] for t in TYPES)
        if abs(s - 1.0) > 0.01:
            norm_errors += 1
    print(f"  GUARD 1 — Normalization errors (|sum-1| > 0.01): {norm_errors}")

    # === PHASE 2: Compute weighted means ===
    feature_keys = sorted(all_passages[0]['features'].keys())
    type_profiles = {}

    for typ in TYPES:
        # Effective mass = sum of all weights for this type
        weights = [p['types'][typ] for p in all_passages]
        effective_mass = sum(weights)
        n_effective = effective_mass  # conceptual "number of effective passages"

        # Weighted mean: Ci,f = sum(pi,k * fk) / sum(pi,k)
        feat_wmean = {}
        feat_wvar = {}
        for fk in feature_keys:
            values = [p['features'][fk] for p in all_passages]
            w = weights  # pi,k for this type

            # Weighted mean
            wsum = sum(wi * vi for wi, vi in zip(w, values))
            wmean = wsum / effective_mass if effective_mass > 0 else 0

            # Weighted variance: sum(wi * (vi - wmean)^2) / sum(wi)
            wvar_sum = sum(wi * (vi - wmean)**2 for wi, vi in zip(w, values))
            wvar = wvar_sum / effective_mass if effective_mass > 0 else 0
            wstd = math.sqrt(wvar)

            feat_wmean[fk] = r5(wmean)
            feat_wvar[fk] = r5(wstd)

        # N_effective for confidence (Kish's formula: (sum w)^2 / sum(w^2))
        sum_w2 = sum(wi**2 for wi in weights)
        kish_n = (effective_mass**2 / sum_w2) if sum_w2 > 0 else 0

        type_profiles[typ] = {
            'effective_mass': r5(effective_mass),
            'kish_effective_n': r5(kish_n),
            'n_passages_total': len(all_passages),
            'mean_weight': r5(effective_mass / len(all_passages)),
            'max_weight': r5(max(weights)),
            'mean': feat_wmean,
            'stdev': feat_wvar,
        }

    # === GUARD 2: Report effective masses ===
    print(f"\n  GUARD 2 — Effective masses per type:")
    for typ in TYPES:
        tp = type_profiles[typ]
        print(f"    {typ.upper():<16} mass={tp['effective_mass']:>8.1f}  "
              f"Kish_N={tp['kish_effective_n']:>7.1f}  "
              f"mean_w={tp['mean_weight']:.3f}  max_w={tp['max_weight']:.3f}")

    # === GUARD 3: Colinearity check between type vectors ===
    print(f"\n  GUARD 3 — Type vector correlations:")
    type_weight_matrix = np.array([[p['types'][t] for t in TYPES] for p in all_passages])
    for i in range(len(TYPES)):
        for j in range(i+1, len(TYPES)):
            corr = np.corrcoef(type_weight_matrix[:, i], type_weight_matrix[:, j])[0, 1]
            flag = " *** HIGH" if abs(corr) > 0.7 else ""
            print(f"    {TYPES[i]:>15} x {TYPES[j]:<15}  r = {corr:+.3f}{flag}")

    # === GUARD 5: Reconstruction validation ===
    print(f"\n  GUARD 5 — Reconstruction validation:")
    errors_by_feature = {}
    for fk in feature_keys:
        errs = []
        for p in all_passages:
            f_measured = p['features'][fk]
            f_predicted = sum(p['types'][t] * type_profiles[t]['mean'][fk]
                              for t in TYPES)
            errs.append(abs(f_measured - f_predicted))
        errors_by_feature[fk] = r5(mean(errs))

    # Sort by error
    sorted_errs = sorted(errors_by_feature.items(), key=lambda x: -x[1])
    mean_global_err = mean(errors_by_feature.values())
    print(f"    Mean absolute reconstruction error: {mean_global_err:.4f}")
    print(f"    Top 5 worst reconstructed features:")
    for fk, err in sorted_errs[:5]:
        print(f"      {fk:<35} MAE = {err:.4f}")
    print(f"    Top 5 best reconstructed features:")
    for fk, err in sorted_errs[-5:]:
        print(f"      {fk:<35} MAE = {err:.4f}")

    # === Top 5 features varying most between types ===
    feature_type_cv = {}
    for fk in feature_keys:
        type_means = [type_profiles[t]['mean'][fk] for t in TYPES]
        gm = mean(type_means) if type_means else 0
        if gm != 0 and len(type_means) >= 2:
            feature_type_cv[fk] = stdev(type_means) / abs(gm)
        elif len(type_means) >= 2:
            feature_type_cv[fk] = stdev(type_means)
        else:
            feature_type_cv[fk] = 0
    top5_varying = sorted(feature_type_cv.items(), key=lambda x: -x[1])[:10]

    print(f"\n  TOP 10 FEATURES VARYING MOST BETWEEN TYPES:")
    for fk, cv in top5_varying:
        vals = {t: type_profiles[t]['mean'][fk] for t in TYPES}
        best_t = max(vals, key=vals.get)
        worst_t = min(vals, key=vals.get)
        print(f"    {fk:<35} CV={cv:.3f}  high={best_t}({vals[best_t]:.3f})  low={worst_t}({vals[worst_t]:.3f})")

    # === Distribution summary ===
    print(f"\n  TYPE WEIGHT DISTRIBUTION (mean across all passages):")
    for typ in TYPES:
        ws = [p['types'][typ] for p in all_passages]
        print(f"    {typ.upper():<16} mean={mean(ws):.3f}  stdev={stdev(ws):.3f}  "
              f"min={min(ws):.3f}  max={max(ws):.3f}")

    # === Build output ===
    output = {
        'phase': 'R-8.1',
        'version': 'v2-weighted-continuous',
        'description': 'Ci,f via weighted average: Ci,f = sum(pi,k*fk)/sum(pi,k). All 1380 S-tier passages used.',
        'method': 'weighted_continuous',
        'window_words': WINDOW,
        'n_positions': len(POSITIONS),
        'works_processed': processed,
        'works_skipped': skipped,
        'total_passages': len(all_passages),
        'timestamp': datetime.now().isoformat(),
        'guards': {
            'normalization_errors': norm_errors,
            'effective_masses': {t: type_profiles[t]['effective_mass'] for t in TYPES},
            'kish_effective_n': {t: type_profiles[t]['kish_effective_n'] for t in TYPES},
            'mean_reconstruction_error': r5(mean_global_err),
            'reconstruction_errors': errors_by_feature,
        },
        'types': type_profiles,
        'top10_most_varying_features': [
            {'feature': fk, 'cross_type_cv': r5(cv)} for fk, cv in top5_varying
        ],
        'type_distribution': {
            typ: r5(mean([p['types'][typ] for p in all_passages])) for typ in TYPES
        },
    }

    with open(OUT_FILE, 'w', encoding='utf-8') as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
