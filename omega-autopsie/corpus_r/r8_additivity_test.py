#!/usr/bin/env python3
"""
OMEGA Phase R-8.2 — ADDITIVITY VALIDATION
══════════════════════════════════════════
Tests: f_predicted = Σ(pi × Ci,f) vs f_measured on ALL tiers.

Questions answered:
  1. Which features are ADDITIVE vs INTERACTIONAL?
  2. Does additivity hold by tier? (S vs C/D hypothesis)
  3. Normalized vs absolute features separated
  4. Synthetic mix reconstruction test
  5. Exact list of features needing γij,f (R-8.4)

Uses Ci,f from R-8.1 TYPE_PROFILES_PURE.json (S-tier weighted constants).
Tests on ALL 611 works across ALL tiers.

Standard: NASA-Grade L4 — zero approximation.
"""

import json, os, re, math, sys
from statistics import mean, stdev, median
from collections import Counter
from datetime import datetime

ROOT = r"C:\Users\elric\omega-project"
TXT_DIR = os.path.join(ROOT, "omega-autopsie", "corpus_r", "txt")
TIERS_FILE = os.path.join(ROOT, "omega-autopsie", "corpus_r", "CORPUS_TIERS_V3.json")
R81_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "TYPE_PROFILES_PURE.json")
OUT_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "R8_ADDITIVITY_TEST.json")

WINDOW = 2000
# Use 9 positions (not 19) to keep runtime reasonable on 611 works
POSITIONS = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]
TYPES = ['action', 'narration', 'description', 'dialogue', 'introspection']

# Features that are RATIOS/SCORES (normalized, comparable)
# vs COUNTS/ABSOLUTES (scale-dependent, need separate treatment)
NORMALIZED_FEATURES = {
    'f1_mean', 'f1a_rhythm_variance', 'f1b_rhythm_ratio',
    'f5a_verb_density', 'f5b_verb_adj_ratio', 'f5c_action_verb_ratio',
    'f9a_contradiction_rate',
    'f15b_redundancy_compression',
    'f16a_bigram_rarity', 'f16c_lexical_surprise',
    'f19a_approx_entropy', 'f19f_window_stdev',
    'f21c_diacope_rate', 'f21e_ritual_index',
    'f24a_banal_rate', 'f24b_apex_rate', 'f24c_contrast_delta', 'f24e_contrast_score',
    'f25g_description_score',
    'f26a_mean_sub_markers', 'f26b_long_sent_rate', 'f26c_period_score',
    'f27a_epistemic_rate', 'f27b_conditional_rate', 'f27c_negation_rate', 'f27d_modal_score',
    'f28d_sil_score',
    'f29a_ttr_global', 'f29d_ttr_score',
    'f30a_passe_simple_rate', 'f30b_imparfait_rate', 'f30d_ps_imp_ratio',
    'f33c_dot_comma_ratio',
    'f34b_para_per_1000w',
    'f38a_short_para_rate', 'f38b_punct_density', 'f38c_speed_score',
    'f_subordination_depth_approx', 'f_negation_density',
    'f_causal_density', 'f_tension_density', 'f_desire_negation_rate',
    'f_lexical_progression',
}

# ═══════════════════════════════════════════════════════════════════════
# REUSE: classifier + features from R-8.1 v2
# (imported inline to keep single-file)
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
DESIRE_VERBS = {'voulait','desirait','souhaitait','revait','esperait','enviait','wanted','desired','wished','dreamed','hoped','longed','craved'}
NEGATION_WORDS = {'ne','pas','plus','jamais','rien','aucun','aucune','nul','nulle','guere','point','non','not','never','nothing','none','neither','nor','nowhere'}
SUB_MARKERS = {'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles','quand','lorsque','comme','puisque','parce','bien que','quoique','afin que','pour que','avant que','apres que','tandis que','that','which','who','whom','whose','where','when','while','because','since','although','though','if','unless','until'}

def split_sentences(text):
    raw = re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def r5(v):
    if v is None: return None
    return round(float(v), 5)

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
    speech_vc = sum(1 for w in words if clean_word(w) in SPEECH_VERBS)
    dialogue_score = min(1.0, (dialogue_lines/n_lines)*1.5 + (speech_vc/n_words)*10)
    adj_c = sum(1 for w in words if any(clean_word(w).endswith(e) for e in ADJ_ENDINGS) and len(clean_word(w)) > 4)
    sens_c = sum(1 for w in words if clean_word(w) in SENSORY_WORDS)
    stat_c = sum(1 for w in words if clean_word(w) in STATIC_VERBS)
    description_score = min(1.0, (adj_c/n_words)*8 + (sens_c/n_words)*15 + (stat_c/n_words)*10)
    act_vc = sum(1 for w in words if clean_word(w) in ACTION_VERBS)
    lw = [clean_word(w) for w in words if len(w) > 3]
    nl = max(len(lw), 1)
    psc = sum(1 for w in lw if any(w.endswith(e) for e in PS_ENDINGS))
    psr = psc / nl
    sl = [len(s.split()) for s in sents]
    msl = sum(sl) / n_sents
    ssr = sum(1 for l in sl if l < 10) / n_sents
    action_score = min(1.0, (act_vc/n_words)*20 + psr*2 + ssr*0.5 + (0.2 if msl < 12 else 0))
    tl = text.lower()
    mc = 0
    for marker in MODAL_MARKERS:
        p = 0
        while True:
            p = tl.find(marker, p)
            if p == -1: break
            mc += 1; p += len(marker)
    cc = sum(1 for w in words if clean_word(w) in COND_FORMS)
    fp = len(re.findall(r"\b(?:je|j'|me|m'|moi)\b", tl))
    introspection_score = min(1.0, (mc/n_words)*15 + (cc/n_words)*12 + (fp/n_words)*3)
    tp = len(re.findall(r"\b(?:il|elle|ils|elles|son|sa|ses|he\b|she\b|his\b|her\b)\b", tl))
    ic = sum(1 for w in lw if any(w.endswith(e) for e in IMP_ENDINGS))
    tc = sum(1 for w in words if clean_word(w) in TEMPORAL_MARKERS)
    narration_score = min(1.0, (tp/n_words)*4 + (ic/nl)*2 + psr*2 + (tc/n_words)*8)
    raw = {'narration':narration_score, 'description':description_score, 'dialogue':dialogue_score, 'introspection':introspection_score, 'action':action_score}
    total = sum(raw.values())
    if total == 0:
        return {'narration':0,'description':1,'dialogue':0,'introspection':0,'action':0}
    return {k: round(v/total, 5) for k, v in raw.items()}

def compute_features(text):
    sents = split_sentences(text)
    wc = [clean_word(w) for w in text.split() if w]
    nw = max(len(wc), 1); ns = max(len(sents), 1)
    tl = text.lower()
    sl = [len(s.split()) for s in sents]
    f = {}
    f['f1_mean'] = mean(sl) if sl else 0
    f['f1a_rhythm_variance'] = stdev(sl) if len(sl) > 1 else 0
    f['f1b_rhythm_ratio'] = (max(sl)/max(min(sl),1)) if sl else 0
    ve = ['ait','aient','ais','a','it','ut','er','ir','re','ant','ent','ons','ez']
    vc = sum(1 for w in wc if len(w)>3 and any(w.endswith(e) for e in ve))
    f['f5a_verb_density'] = vc/nw
    ac = sum(1 for w in wc if any(w.endswith(e) for e in ADJ_ENDINGS) and len(w)>4)
    f['f5b_verb_adj_ratio'] = vc/max(ac,1)
    f['f5c_action_verb_ratio'] = sum(1 for w in wc if w in ACTION_VERBS)/nw
    adc = sum(tl.count(m) for m in ADVERSATIVES)
    f['f9a_contradiction_rate'] = adc/ns
    sw, prev = 0, None
    for w in wc:
        if len(w)<4: continue
        ct = None
        if any(w.endswith(e) for e in PS_ENDINGS): ct='PS'
        elif any(w.endswith(e) for e in IMP_ENDINGS): ct='IMP'
        if ct and prev and ct!=prev: sw+=1
        if ct: prev=ct
    f['f12_tense_switches'] = sw
    bg = [f"{wc[i]} {wc[i+1]}" for i in range(len(wc)-1) if wc[i] not in STOP_FR and wc[i+1] not in STOP_FR]
    ubg = len(set(bg))
    f['f15b_redundancy_compression'] = ubg/max(len(bg),1)
    cw = [w for w in wc if w not in STOP_FR and len(w)>2]
    wf = Counter(cw); hx = sum(1 for _,c in wf.items() if c==1)
    f['f16_hapax_count'] = hx
    f['f16a_bigram_rarity'] = ubg/max(len(bg),1)
    f['f16c_lexical_surprise'] = hx/max(len(cw),1)
    kn = sum(1 for l in sl if l<=5)
    f['f17_knife_count'] = kn
    if kn>=2:
        ps = [i for i,l in enumerate(sl) if l<=5]
        gp = [ps[j+1]-ps[j] for j in range(len(ps)-1)]
        f['f17_contrast_spacing'] = mean(gp) if gp else ns
    else: f['f17_contrast_spacing'] = ns
    if cw:
        tc2=len(cw); fr=Counter(cw)
        en=-sum((c/tc2)*math.log2(c/tc2) for c in fr.values() if c>0)
        me=math.log2(len(fr)) if len(fr)>1 else 1
        f['f19a_approx_entropy']=en/me if me>0 else 0
    else: f['f19a_approx_entropy']=0
    if ns>=10:
        ch=ns//5
        sm=[mean(sl[i*ch:(i+1)*ch]) for i in range(5) if sl[i*ch:(i+1)*ch]]
        f['f19f_window_stdev']=stdev(sm) if len(sm)>1 else 0
    else: f['f19f_window_stdev']=0
    dia=0
    for i in range(len(cw)):
        for j in range(i+1, min(i+6, len(cw))):
            if cw[i]==cw[j]: dia+=1; break
    f['f21c_diacope_rate']=dia/max(len(cw),1)
    if sents:
        st=[s.split()[0].lower() if s.split() else '' for s in sents]
        sf=Counter(st); f['f21e_ritual_index']=sum(c for c in sf.values() if c>1)/ns
    else: f['f21e_ritual_index']=0
    if len(sl)>=10:
        ss=sorted(sl); n=len(ss); p25=ss[n//4]; p75=ss[3*n//4]
        ba=[l for l in sl if l<=p25]; ap=[l for l in sl if l>=p75]
        f['f24a_banal_rate']=len(ba)/n; f['f24b_apex_rate']=len(ap)/n
        f['f24c_contrast_delta']=(mean(ap) if ap else 0)-(mean(ba) if ba else 0)
        f['f24e_contrast_score']=min(1.0,f['f24c_contrast_delta']/15)*0.5+0.5
    else: f['f24a_banal_rate']=f['f24b_apex_rate']=f['f24c_contrast_delta']=f['f24e_contrast_score']=0
    sc=sum(1 for w in wc if w in SENSORY_WORDS)
    f['f25a_description_density']=sc; f['f25g_description_score']=sc/nw*10
    subc=sum(tl.count(f' {m} ') for m in SUB_MARKERS)
    f['f26a_mean_sub_markers']=subc/ns
    ls=sum(1 for l in sl if l>30)
    f['f26b_long_sent_rate']=ls/ns
    f['f26c_period_score']=f['f26a_mean_sub_markers']*f['f26b_long_sent_rate']
    epist={'peut-etre','sans doute','probablement','il semble','apparemment','perhaps','probably','possibly','seemingly'}
    epc=sum(1 for m in epist if m in tl)
    f['f27a_epistemic_rate']=epc/ns*100
    cdc=sum(1 for w in wc if w in COND_FORMS)
    f['f27b_conditional_rate']=cdc/nw
    nc=sum(1 for w in wc if w in NEGATION_WORDS)
    f['f27c_negation_rate']=nc/ns*100
    f['f27d_modal_score']=f['f27b_conditional_rate']*5+epc/nw*10
    sp=[r'il\s+(?:semblait|lui\s+semblait|croyait|pensait)',r'elle\s+(?:semblait|croyait|pensait|sentait)',r'(?:comme\s+si|sans\s+doute)\s+\w+\s+(?:avait|etait)']
    slc=sum(len(re.findall(p,tl)) for p in sp)
    f['f28d_sil_score']=slc/ns
    al=[w for w in wc if len(w)>1]
    f['f29a_ttr_global']=len(set(al))/max(len(al),1)
    if len(al)>=200:
        ttrs=[len(set(al[i:i+100]))/100 for i in range(0,len(al)-99,50)]
        f['f29d_ttr_score']=mean(ttrs)
    else: f['f29d_ttr_score']=f['f29a_ttr_global']
    pps=sum(1 for w in wc if len(w)>4 and any(w.endswith(e) for e in PS_ENDINGS))
    imp=sum(1 for w in wc if len(w)>4 and any(w.endswith(e) for e in IMP_ENDINGS))
    tt=max(pps+imp+1,1)
    f['f30a_passe_simple_rate']=pps/tt; f['f30b_imparfait_rate']=imp/tt; f['f30d_ps_imp_ratio']=pps/max(imp,1)
    dt=text.count('.')+text.count('!')+text.count('?'); cm=text.count(',')
    f['f33a_dots_count']=dt; f['f33b_commas_count']=cm; f['f33c_dot_comma_ratio']=dt/max(cm,1)
    pa=[p.strip() for p in text.split('\n\n') if p.strip()]
    f['f34a_paragraph_count']=max(len(pa),1); f['f34b_para_per_1000w']=len(pa)/(nw/1000)
    spp=sum(1 for p in pa if len(p.split())<30) if pa else 0
    f['f38a_short_para_rate']=spp/max(len(pa),1)
    f['f38b_punct_density']=(dt+cm)/nw
    f['f38c_speed_score']=f['f38a_short_para_rate']*0.3+f['f38b_punct_density']*2
    f['f_subordination_depth_approx']=subc/ns
    f['f_negation_density']=nc/(nw/100)
    f['f_sentence_variance_local']=f['f1a_rhythm_variance']**2
    caus=sum(tl.count(m) for m in CAUSAL_MARKERS)
    f['f_causal_density']=caus/ns
    des=sum(1 for w in wc if w in DESIRE_VERBS)
    f['f_tension_density']=(des+nc*0.3)/nw
    f['f_desire_negation_rate']=des/max(nc,1)
    mid=len(al)//2
    if mid>50: f['f_lexical_progression']=len(set(al[mid:]))/max(len(al)-mid,1)-len(set(al[:mid]))/mid
    else: f['f_lexical_progression']=0
    return f

def extract_passage(text, pos, win):
    words = text.split(); n = len(words)
    center = int(n * pos); half = win // 2
    start = max(0, center - half); end = min(n, start + win)
    if end - start < win: start = max(0, end - win)
    return ' '.join(words[start:end])

# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  OMEGA R-8.2 -- ADDITIVITY VALIDATION (ALL TIERS)")
    print(f"  Window: {WINDOW}w | Positions: {len(POSITIONS)} | Corpus: ALL")
    print("=" * 70)

    # Load R-8.1 Ci,f constants
    with open(R81_FILE, 'r', encoding='utf-8') as fh:
        r81 = json.load(fh)
    cif = {t: r81['types'][t]['mean'] for t in TYPES}
    feature_keys = sorted(cif['action'].keys())
    print(f"  Ci,f loaded: {len(feature_keys)} features x {len(TYPES)} types")

    # Load tiers
    with open(TIERS_FILE, 'r', encoding='utf-8') as fh:
        tiers_data = json.load(fh)
    tier_lookup = {e['filename']: e.get('tier_final') or e.get('tier_suggestion','?') for e in tiers_data}
    all_files = list(tier_lookup.keys())
    tier_counts = Counter(tier_lookup.values())
    print(f"  Corpus: {len(all_files)} works — " + ", ".join(f"{t}={c}" for t,c in sorted(tier_counts.items())))

    # === PHASE 1: Extract, classify, measure ALL works ===
    all_passages = []
    skipped = 0; processed = 0

    for i, fn in enumerate(all_files):
        txt_path = os.path.join(TXT_DIR, fn)
        if not os.path.exists(txt_path): skipped += 1; continue
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='replace') as fh:
                text = fh.read()
        except: skipped += 1; continue
        if len(text.split()) < WINDOW * 1.5: skipped += 1; continue

        tier = tier_lookup.get(fn, '?')
        for pos in POSITIONS:
            pt = extract_passage(text, pos, WINDOW)
            if len(pt.split()) < WINDOW * 0.8: continue
            cl = classify_passage(pt)
            ft = compute_features(pt)
            # Compute f_predicted for each feature
            f_pred = {}
            for fk in feature_keys:
                f_pred[fk] = sum(cl[t] * cif[t][fk] for t in TYPES)
            all_passages.append({
                'filename': fn, 'tier': tier, 'position': pos,
                'types': cl, 'features': ft, 'predicted': f_pred,
            })
        processed += 1
        if (i+1) % 100 == 0:
            print(f"  [{i+1}/{len(all_files)}] processed={processed} skipped={skipped} passages={len(all_passages)}")

    print(f"\n  TOTAL: {processed} works, {skipped} skipped, {len(all_passages)} passages")

    # === PHASE 2: Compute deltas and classify features ===
    norm_keys = [fk for fk in feature_keys if fk in NORMALIZED_FEATURES]
    abs_keys = [fk for fk in feature_keys if fk not in NORMALIZED_FEATURES]
    print(f"  Normalized features: {len(norm_keys)} | Absolute features: {len(abs_keys)}")

    # Per-feature MAE (all passages)
    mae_all = {}
    mae_rel_all = {}  # relative to mean
    for fk in feature_keys:
        errs = [abs(p['features'][fk] - p['predicted'][fk]) for p in all_passages]
        mae_all[fk] = r5(mean(errs))
        feat_mean = mean([p['features'][fk] for p in all_passages])
        mae_rel_all[fk] = r5(mean(errs) / abs(feat_mean)) if feat_mean != 0 else None

    # === PHASE 3: Stratify by TIER ===
    tiers_present = sorted(set(p['tier'] for p in all_passages))
    mae_by_tier = {}
    mae_norm_by_tier = {}

    for tier in tiers_present:
        tier_passages = [p for p in all_passages if p['tier'] == tier]
        if len(tier_passages) < 10: continue

        # All features
        tier_mae = {}
        for fk in feature_keys:
            errs = [abs(p['features'][fk] - p['predicted'][fk]) for p in tier_passages]
            tier_mae[fk] = r5(mean(errs))
        mae_by_tier[tier] = tier_mae

        # Normalized features only — mean MAE
        norm_errs = [mean([abs(p['features'][fk] - p['predicted'][fk]) for fk in norm_keys]) for p in tier_passages]
        mae_norm_by_tier[tier] = r5(mean(norm_errs))

    # === PHASE 4: Classify features as ADDITIVE / SEMI-ADDITIVE / INTERACTIONAL ===
    # Using relative MAE on normalized features
    feature_class = {}
    for fk in norm_keys:
        rel = mae_rel_all.get(fk)
        if rel is None:
            feature_class[fk] = 'HORS_MODELE'
        elif rel < 0.10:
            feature_class[fk] = 'ADDITIVE'
        elif rel < 0.25:
            feature_class[fk] = 'SEMI_ADDITIVE'
        else:
            feature_class[fk] = 'INTERACTIONAL'

    for fk in abs_keys:
        feature_class[fk] = 'ABSOLUTE_SCALE'

    class_counts = Counter(feature_class.values())

    # === PHASE 5: Synthetic mix reconstruction ===
    synth_mixes = [
        {'name': '50narr_50desc', 'narration':0.5, 'description':0.5, 'action':0, 'dialogue':0, 'introspection':0},
        {'name': '40act_30dial_20narr_10desc', 'action':0.4, 'dialogue':0.3, 'narration':0.2, 'description':0.1, 'introspection':0},
        {'name': '60intro_20desc_20narr', 'introspection':0.6, 'description':0.2, 'narration':0.2, 'action':0, 'dialogue':0},
        {'name': '33act_33narr_33desc', 'action':0.333, 'narration':0.333, 'description':0.334, 'dialogue':0, 'introspection':0},
        {'name': '25each_no_intro', 'action':0.25, 'narration':0.25, 'description':0.25, 'dialogue':0.25, 'introspection':0},
    ]
    synth_results = []
    for mix in synth_mixes:
        pred = {}
        for fk in norm_keys:
            pred[fk] = r5(sum(mix[t] * cif[t][fk] for t in TYPES))
        # Find closest real passages (cosine similarity of type vectors)
        best_dist = 999; best_real = None
        for p in all_passages:
            d = sum((p['types'][t] - mix[t])**2 for t in TYPES)**0.5
            if d < best_dist: best_dist = d; best_real = p
        real_vals = {fk: best_real['features'][fk] for fk in norm_keys} if best_real else {}
        real_errs = {fk: r5(abs(real_vals[fk] - pred[fk])) for fk in norm_keys} if best_real else {}
        synth_results.append({
            'mix': {k:v for k,v in mix.items() if k != 'name'},
            'name': mix['name'],
            'predicted_sample': {fk: pred[fk] for fk in list(norm_keys)[:5]},
            'closest_real_distance': r5(best_dist),
            'closest_real_tier': best_real['tier'] if best_real else None,
            'mae_vs_closest': r5(mean(real_errs.values())) if real_errs else None,
        })

    # === PHASE 6: Top features needing gamma (for R-8.4) ===
    # Features where S-tier has HIGHER reconstruction error than C/D
    gamma_candidates = []
    if 'S' in mae_by_tier and ('C' in mae_by_tier or 'D' in mae_by_tier):
        cd_mae = {}
        for fk in norm_keys:
            vals = []
            if 'C' in mae_by_tier: vals.append(mae_by_tier['C'][fk])
            if 'D' in mae_by_tier: vals.append(mae_by_tier['D'][fk])
            cd_mae[fk] = mean(vals) if vals else 0

        for fk in norm_keys:
            s_mae = mae_by_tier['S'][fk]
            cd = cd_mae[fk]
            if s_mae > 0 and cd > 0:
                ratio = s_mae / cd
                gamma_candidates.append({'feature': fk, 's_mae': s_mae, 'cd_mae': cd,
                                          'ratio_s_over_cd': r5(ratio),
                                          'class': feature_class[fk]})
    gamma_candidates.sort(key=lambda x: -x['ratio_s_over_cd'])

    # === OUTPUT ===
    print("\n" + "=" * 70)
    print("  R-8.2 RESULTS")
    print("=" * 70)

    print(f"\n  FEATURE CLASSIFICATION (normalized only, {len(norm_keys)} features):")
    print(f"    ADDITIVE (<10% rel error):      {sum(1 for v in feature_class.values() if v=='ADDITIVE')}")
    print(f"    SEMI_ADDITIVE (10-25%):          {sum(1 for v in feature_class.values() if v=='SEMI_ADDITIVE')}")
    print(f"    INTERACTIONAL (>25%):            {sum(1 for v in feature_class.values() if v=='INTERACTIONAL')}")
    print(f"    ABSOLUTE_SCALE (excluded):       {sum(1 for v in feature_class.values() if v=='ABSOLUTE_SCALE')}")

    print(f"\n  MAE BY TIER (normalized features only):")
    for tier in sorted(mae_norm_by_tier.keys()):
        n_p = sum(1 for p in all_passages if p['tier'] == tier)
        print(f"    Tier {tier}: MAE = {mae_norm_by_tier[tier]:.4f}  (n={n_p})")

    print(f"\n  TOP 10 WORST RECONSTRUCTED (normalized features):")
    sorted_norm = sorted([(fk, mae_all[fk], mae_rel_all[fk], feature_class[fk])
                           for fk in norm_keys if mae_rel_all.get(fk) is not None],
                          key=lambda x: -x[2])
    for fk, mae, rel, cls in sorted_norm[:10]:
        print(f"    {fk:<35} MAE={mae:.4f}  rel={rel:.3f}  class={cls}")

    print(f"\n  TOP 10 BEST RECONSTRUCTED (normalized features):")
    for fk, mae, rel, cls in sorted_norm[-10:]:
        print(f"    {fk:<35} MAE={mae:.4f}  rel={rel:.3f}  class={cls}")

    print(f"\n  S vs C/D HYPOTHESIS (top 10 features where S error > C/D error):")
    for gc in gamma_candidates[:10]:
        print(f"    {gc['feature']:<35} S_MAE={gc['s_mae']:.4f}  CD_MAE={gc['cd_mae']:.4f}  ratio={gc['ratio_s_over_cd']:.2f}  {gc['class']}")

    print(f"\n  FEATURES NEEDING GAMMA (ratio S/CD > 1.2 AND class != ADDITIVE):")
    gamma_list = [gc for gc in gamma_candidates if gc['ratio_s_over_cd'] > 1.2 and gc['class'] != 'ADDITIVE']
    for gc in gamma_list:
        print(f"    {gc['feature']:<35} ratio={gc['ratio_s_over_cd']:.2f}")
    print(f"    TOTAL: {len(gamma_list)} features need interaction terms")

    print(f"\n  SYNTHETIC MIX RECONSTRUCTION:")
    for sr in synth_results:
        print(f"    {sr['name']:<35} closest_dist={sr['closest_real_distance']:.3f}  tier={sr['closest_real_tier']}  mae={sr['mae_vs_closest']}")

    # Save
    output = {
        'phase': 'R-8.2',
        'description': 'Additivity validation: f_predicted vs f_measured across all tiers',
        'total_passages': len(all_passages),
        'works_processed': processed,
        'timestamp': datetime.now().isoformat(),
        'feature_classification': feature_class,
        'classification_counts': dict(class_counts),
        'mae_all_features': mae_all,
        'mae_relative_all': mae_rel_all,
        'mae_by_tier_normalized': mae_norm_by_tier,
        'mae_by_tier_per_feature': mae_by_tier,
        'gamma_candidates': gamma_candidates[:20],
        'gamma_needed_features': [gc['feature'] for gc in gamma_list],
        'synthetic_reconstruction': synth_results,
        'normalized_feature_list': sorted(norm_keys),
        'absolute_feature_list': sorted(abs_keys),
    }
    with open(OUT_FILE, 'w', encoding='utf-8') as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
