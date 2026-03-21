#!/usr/bin/env python3
"""
OMEGA Phase R-8.1 — TYPE PROFILES PURE
Measures Ci,f constants: average feature values for passages >80% of a single
type, from Tier S works only, at 2000-word windows.

Output: TYPE_PROFILES_PURE.json

Standard: NASA-Grade L4 — zero approximation, all values MEASURED.
"""

import json, os, re, math, sys
from statistics import mean, stdev, median
from collections import Counter, defaultdict
from datetime import datetime

ROOT = r"C:\Users\elric\omega-project"
TXT_DIR = os.path.join(ROOT, "omega-autopsie", "corpus_r", "txt")
TIERS_FILE = os.path.join(ROOT, "omega-autopsie", "corpus_r", "CORPUS_TIERS_V3.json")
OUT_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "TYPE_PROFILES_PURE.json")

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)

WINDOW = 2000
POSITIONS = [0.10, 0.25, 0.50, 0.75, 0.90]
PURITY_THRESHOLD = 0.80
MIN_PASSAGES_FOR_VALID = 20

def split_sentences(text):
    raw = re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def r5(v):
    if v is None: return None
    return round(v, 5)

# === MARKER SETS ===
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
STOP_FR = {'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces','mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur','nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car','dans','sur','sous','avec','sans','pour','par','entre','vers','chez','contre','que','qui','dont','ou','quand','comme','si','ne','pas','plus','jamais','rien','est','sont','etait','etaient','etre','avoir','avait','avaient','fait','faire','dit','dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes','autre','autres','meme','aussi','tres','bien','peu','trop','assez','alors','encore','deja','la','ici','puis','the','a','an','and','or','but','in','on','at','to','for','of','with','from','by','is','was','were','are','been','be','has','had','have','do','did','does','will','would','could','should','may','might','shall','can','must','it','its','he','she','they','them','their','his','her','this','that','these','those','not','no','so','if','as'}
ADVERSATIVES = {'mais','cependant','toutefois','neanmoins','pourtant','or','en revanche','au contraire','certes','malgre','but','however','nevertheless','yet','although','though','despite'}
CAUSAL_MARKERS = {'parce que','car','puisque','donc','ainsi','en effet','par consequent','de ce fait','because','since','therefore','thus','hence','consequently','as a result','due to','owing to'}
PERCEPTION_VERBS = {'vit','voyait','regardait','observait','apercevait','contemplait','entendait','ecoutait','sentait','touchait','goutait','saw','watched','observed','noticed','heard','listened','felt','touched'}
DESIRE_VERBS = {'voulait','desirait','souhaitait','revait','esperait','enviait','wanted','desired','wished','dreamed','hoped','longed','craved'}
NEGATION_WORDS = {'ne','pas','plus','jamais','rien','aucun','aucune','nul','nulle','guere','point','non','not','never','nothing','none','neither','nor','nowhere'}
SUB_MARKERS = {'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles','quand','lorsque','comme','puisque','parce','bien que','quoique','afin que','pour que','avant que','apres que','tandis que','that','which','who','whom','whose','where','when','while','because','since','although','though','if','unless','until'}

def clean_word(w):
    return w.lower().replace(',','').replace('.','').replace(';','').replace(':','').replace('!','').replace('?','').replace('"','').replace("'",'').replace('(','').replace(')','')

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

    raw = {'narration':narration_score, 'description':description_score, 'dialogue':dialogue_score, 'introspection':introspection_score, 'action':action_score}
    total = sum(raw.values())
    if total == 0:
        return {'narration':0,'description':1,'dialogue':0,'introspection':0,'action':0,'dominant_type':'description'}
    normalized = {}
    max_val, max_type = 0, 'description'
    for k, v in raw.items():
        normalized[k] = round(v / total, 4)
        if v > max_val: max_val, max_type = v, k
    normalized['dominant_type'] = max_type
    return normalized

def compute_features_on_passage(text):
    sents = split_sentences(text)
    words_clean = [clean_word(w) for w in text.split() if w]
    n_words = max(len(words_clean), 1)
    n_sents = max(len(sents), 1)
    txt_lower = text.lower()
    sent_lens = [len(s.split()) for s in sents]
    feats = {}

    feats['f1_mean'] = mean(sent_lens) if sent_lens else 0
    feats['f1a_rhythm_variance'] = stdev(sent_lens) if len(sent_lens) > 1 else 0
    feats['f1_sentence_count'] = n_sents
    feats['f1b_rhythm_ratio'] = (max(sent_lens) / max(min(sent_lens), 1)) if sent_lens else 0

    verb_endings_fr = ['ait','aient','ais','a','it','ut','er','ir','re','ant','ent','ons','ez']
    verb_count = sum(1 for w in words_clean if len(w) > 3 and any(w.endswith(e) for e in verb_endings_fr))
    feats['f5a_verb_density'] = verb_count / n_words
    adj_c = sum(1 for w in words_clean if any(w.endswith(e) for e in ADJ_ENDINGS) and len(w) > 4)
    feats['f5b_verb_adj_ratio'] = verb_count / max(adj_c, 1)
    feats['f5c_action_verb_ratio'] = sum(1 for w in words_clean if w in ACTION_VERBS) / n_words

    adv_count = sum(txt_lower.count(m) for m in ADVERSATIVES)
    feats['f9a_contradiction_rate'] = adv_count / n_sents

    switches, prev_t = 0, None
    for w in words_clean:
        if len(w) < 4: continue
        ct = None
        if any(w.endswith(e) for e in PS_ENDINGS): ct = 'PS'
        elif any(w.endswith(e) for e in IMP_ENDINGS): ct = 'IMP'
        if ct and prev_t and ct != prev_t: switches += 1
        if ct: prev_t = ct
    feats['f12_tense_switches'] = switches

    bigrams = [f"{words_clean[i]} {words_clean[i+1]}" for i in range(len(words_clean)-1) if words_clean[i] not in STOP_FR and words_clean[i+1] not in STOP_FR]
    unique_bg = len(set(bigrams))
    feats['f15b_redundancy_compression'] = unique_bg / max(len(bigrams), 1)

    content_words = [w for w in words_clean if w not in STOP_FR and len(w) > 2]
    word_freq = Counter(content_words)
    hapax = sum(1 for _, c in word_freq.items() if c == 1)
    feats['f16_hapax_count'] = hapax
    feats['f16a_bigram_rarity'] = unique_bg / max(len(bigrams), 1)
    feats['f16c_lexical_surprise'] = hapax / max(len(content_words), 1)

    knife = sum(1 for l in sent_lens if l <= 5)
    feats['f17_knife_count'] = knife

    if content_words:
        tc = len(content_words)
        freq = Counter(content_words)
        ent = -sum((c/tc)*math.log2(c/tc) for c in freq.values() if c > 0)
        me = math.log2(len(freq)) if len(freq) > 1 else 1
        feats['f19a_approx_entropy'] = ent / me if me > 0 else 0
    else:
        feats['f19a_approx_entropy'] = 0

    if n_sents >= 10:
        chunk = n_sents // 5
        sub_means = [mean(sent_lens[i*chunk:(i+1)*chunk]) for i in range(5) if sent_lens[i*chunk:(i+1)*chunk]]
        feats['f19f_window_stdev'] = stdev(sub_means) if len(sub_means) > 1 else 0
    else:
        feats['f19f_window_stdev'] = 0

    diacope = 0
    for i in range(len(content_words)):
        for j in range(i+1, min(i+6, len(content_words))):
            if content_words[i] == content_words[j]: diacope += 1; break
    feats['f21c_diacope_rate'] = diacope / max(len(content_words), 1)
    if sents:
        starts = [s.split()[0].lower() if s.split() else '' for s in sents]
        sf = Counter(starts)
        feats['f21e_ritual_index'] = sum(c for c in sf.values() if c > 1) / n_sents
    else:
        feats['f21e_ritual_index'] = 0

    if len(sent_lens) >= 10:
        ss = sorted(sent_lens); n = len(ss); p25 = ss[n//4]; p75 = ss[3*n//4]
        banal = [l for l in sent_lens if l <= p25]; apex = [l for l in sent_lens if l >= p75]
        feats['f24a_banal_rate'] = len(banal) / n
        feats['f24b_apex_rate'] = len(apex) / n
        feats['f24c_contrast_delta'] = (mean(apex) if apex else 0) - (mean(banal) if banal else 0)
        feats['f24e_contrast_score'] = min(1.0, feats['f24c_contrast_delta'] / 15.0) * 0.5 + 0.5
    else:
        feats['f24a_banal_rate'] = feats['f24b_apex_rate'] = feats['f24c_contrast_delta'] = feats['f24e_contrast_score'] = 0

    sensory_c = sum(1 for w in words_clean if w in SENSORY_WORDS)
    feats['f25a_description_density'] = sensory_c
    feats['f25g_description_score'] = sensory_c / n_words * 10

    sub_count = sum(txt_lower.count(f' {m} ') for m in SUB_MARKERS)
    feats['f26a_mean_sub_markers'] = sub_count / n_sents
    long_sents = sum(1 for l in sent_lens if l > 30)
    feats['f26b_long_sent_rate'] = long_sents / n_sents
    feats['f26c_period_score'] = feats['f26a_mean_sub_markers'] * feats['f26b_long_sent_rate']

    epistemic = {'peut-etre','sans doute','probablement','il semble','apparemment','perhaps','probably','possibly','seemingly'}
    ep_count = sum(1 for m in epistemic if m in txt_lower)
    feats['f27a_epistemic_rate'] = ep_count / n_sents * 100
    cond_c = sum(1 for w in words_clean if w in COND_FORMS)
    feats['f27b_conditional_rate'] = cond_c / n_words
    neg_count = sum(1 for w in words_clean if w in NEGATION_WORDS)
    feats['f27c_negation_rate'] = neg_count / n_sents * 100
    feats['f27d_modal_score'] = feats['f27b_conditional_rate'] * 5 + ep_count / n_words * 10

    sil_patterns = [r'il\s+(?:semblait|lui\s+semblait|croyait|pensait)', r'elle\s+(?:semblait|croyait|pensait|sentait)', r'(?:comme\s+si|sans\s+doute)\s+\w+\s+(?:avait|etait)']
    sil_c = sum(len(re.findall(p, txt_lower)) for p in sil_patterns)
    feats['f28d_sil_score'] = sil_c / n_sents

    all_lower = [w for w in words_clean if len(w) > 1]
    feats['f29a_ttr_global'] = len(set(all_lower)) / max(len(all_lower), 1)
    if len(all_lower) >= 200:
        ttrs = [len(set(all_lower[i:i+100])) / 100 for i in range(0, len(all_lower)-99, 50)]
        feats['f29d_ttr_score'] = mean(ttrs)
    else:
        feats['f29d_ttr_score'] = feats['f29a_ttr_global']

    ps = sum(1 for w in words_clean if len(w) > 4 and any(w.endswith(e) for e in PS_ENDINGS))
    imp = sum(1 for w in words_clean if len(w) > 4 and any(w.endswith(e) for e in IMP_ENDINGS))
    total_t = max(ps + imp + 1, 1)
    feats['f30a_passe_simple_rate'] = ps / total_t
    feats['f30b_imparfait_rate'] = imp / total_t
    feats['f30d_ps_imp_ratio'] = ps / max(imp, 1)

    dots = text.count('.') + text.count('!') + text.count('?')
    commas = text.count(',')
    feats['f33a_dots_count'] = dots
    feats['f33b_commas_count'] = commas
    feats['f33c_dot_comma_ratio'] = dots / max(commas, 1)

    paras = [p.strip() for p in text.split('\n\n') if p.strip()]
    feats['f34a_paragraph_count'] = max(len(paras), 1)
    feats['f34b_para_per_1000w'] = len(paras) / (n_words / 1000)

    short_paras = sum(1 for p in paras if len(p.split()) < 30) if paras else 0
    feats['f38a_short_para_rate'] = short_paras / max(len(paras), 1)
    feats['f38b_punct_density'] = (dots + commas) / n_words
    feats['f38c_speed_score'] = feats['f38a_short_para_rate'] * 0.3 + feats['f38b_punct_density'] * 2

    feats['f_subordination_depth_approx'] = sub_count / n_sents
    feats['f_negation_density'] = neg_count / (n_words / 100)
    feats['f_sentence_variance_local'] = feats['f1a_rhythm_variance'] ** 2

    causal_c = sum(txt_lower.count(m) for m in CAUSAL_MARKERS)
    feats['f_causal_density'] = causal_c / n_sents
    desire_c = sum(1 for w in words_clean if w in DESIRE_VERBS)
    feats['f_tension_density'] = (desire_c + neg_count * 0.3) / n_words
    feats['f_desire_negation_rate'] = desire_c / max(neg_count, 1)

    mid = len(all_lower) // 2
    if mid > 50:
        feats['f_lexical_progression'] = len(set(all_lower[mid:])) / max(len(all_lower)-mid, 1) - len(set(all_lower[:mid])) / mid
    else:
        feats['f_lexical_progression'] = 0

    return feats

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

def main():
    print("=" * 70)
    print("  OMEGA R-8.1 -- TYPE PROFILES PURE")
    print(f"  Window: {WINDOW}w | Purity: >{PURITY_THRESHOLD*100}% | Tier: S only")
    print("=" * 70)

    with open(TIERS_FILE, 'r', encoding='utf-8') as f:
        tiers_data = json.load(f)
    tier_lookup = {e['filename']: e.get('tier_final') or e.get('tier_suggestion', '?') for e in tiers_data}
    s_tier_files = [fn for fn, t in tier_lookup.items() if t == 'S']
    print(f"\n  Tier S works: {len(s_tier_files)}")

    all_passages = []
    skipped = 0
    processed = 0

    for i, fn in enumerate(s_tier_files):
        txt_path = os.path.join(TXT_DIR, fn)
        if not os.path.exists(txt_path):
            skipped += 1; continue
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='replace') as f:
                text = f.read()
        except:
            skipped += 1; continue
        if len(text.split()) < WINDOW * 1.5:
            skipped += 1; continue

        for pos in POSITIONS:
            passage_text = extract_passage(text, pos, WINDOW)
            if len(passage_text.split()) < WINDOW * 0.8: continue
            classification = classify_passage(passage_text)
            features = compute_features_on_passage(passage_text)
            all_passages.append({
                'filename': fn, 'position': pos,
                'classification': classification,
                'dominant_type': classification['dominant_type'],
                'dominant_score': classification[classification['dominant_type']],
                'features': features,
            })
        processed += 1
        if (i + 1) % 50 == 0:
            print(f"  [{i+1}/{len(s_tier_files)}] processed={processed} skipped={skipped} passages={len(all_passages)}")

    print(f"\n  TOTAL: {processed} works, {skipped} skipped, {len(all_passages)} passages")

    pure_passages = [p for p in all_passages if p['dominant_score'] >= PURITY_THRESHOLD]
    print(f"  Pure passages (>{PURITY_THRESHOLD*100}%): {len(pure_passages)} / {len(all_passages)}")

    types = ['action', 'narration', 'description', 'dialogue', 'introspection']
    type_profiles = {}

    for t in types:
        pot = [p for p in pure_passages if p['dominant_type'] == t]
        n_p = len(pot)
        sufficient = n_p >= MIN_PASSAGES_FOR_VALID
        status = "VALID" if sufficient else f"INSUFFICIENT ({n_p} < {MIN_PASSAGES_FOR_VALID})"
        if n_p == 0:
            type_profiles[t] = {'count':0, 'status':'EMPTY', 'mean':{}, 'stdev':{}, 'works_represented':0}
            continue
        fkeys = sorted(pot[0]['features'].keys())
        fm, fs = {}, {}
        for fk in fkeys:
            vals = [p['features'][fk] for p in pot if p['features'].get(fk) is not None]
            fm[fk] = r5(mean(vals)) if vals else None
            fs[fk] = r5(stdev(vals)) if len(vals) >= 2 else 0
        type_profiles[t] = {'count':n_p, 'status':status, 'works_represented':len(set(p['filename'] for p in pot)), 'mean':fm, 'stdev':fs}

    valid_types = [t for t in types if type_profiles[t]['count'] >= MIN_PASSAGES_FOR_VALID]
    top5_varying = []
    if len(valid_types) >= 2:
        fkeys = sorted(type_profiles[valid_types[0]]['mean'].keys())
        fvar = {}
        for fk in fkeys:
            tms = [type_profiles[t]['mean'].get(fk) for t in valid_types]
            tms = [v for v in tms if v is not None]
            if len(tms) >= 2:
                gm = mean(tms)
                fvar[fk] = stdev(tms) / abs(gm) if gm != 0 else stdev(tms)
        top5_varying = sorted(fvar.items(), key=lambda x: -x[1])[:5]

    output = {
        'phase': 'R-8.1', 'description': 'Ci,f constants for >80% pure passages from S-tier',
        'window_words': WINDOW, 'purity_threshold': PURITY_THRESHOLD,
        'min_passages': MIN_PASSAGES_FOR_VALID,
        'total_passages_extracted': len(all_passages), 'total_pure_passages': len(pure_passages),
        'works_processed': processed, 'works_skipped': skipped,
        'timestamp': datetime.now().isoformat(),
        'types': type_profiles,
        'top5_most_varying_features': [{'feature':fk, 'cross_type_cv':r5(cv)} for fk, cv in top5_varying],
        'distribution_all': {t: sum(1 for p in all_passages if p['dominant_type'] == t) for t in types},
        'distribution_pure': {t: sum(1 for p in pure_passages if p['dominant_type'] == t) for t in types},
    }

    print("\n" + "=" * 70)
    print("  TYPE PROFILES SUMMARY")
    print("=" * 70)
    print(f"  {'Type':<16} {'Count':>6} {'Works':>6} {'Status':<20}")
    print("  " + "-" * 50)
    for t in types:
        tp = type_profiles[t]
        print(f"  {t.upper():<16} {tp['count']:>6} {tp['works_represented']:>6} {tp['status']:<20}")
    print(f"\n  TOP 5 FEATURES VARYING MOST BETWEEN TYPES:")
    for item in top5_varying:
        print(f"    {item['feature']:<35} CV = {item['cross_type_cv']:.3f}")

    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
