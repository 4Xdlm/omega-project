#!/usr/bin/env python3
"""
OMEGA Phase R-8.3 — LAMBDA INFLUENCE COEFFICIENTS
══════════════════════════════════════════════════
For each of 43 normalized features, learn λi,f such that:
    f_measured ≈ Σ(pi,k × λi,f × Ci,f)

Corrections from 3-AI consultation:
  - λ learned on ALL 43 features (not fixed to 1 for additives)
  - Layer-by-layer: baseline → +λ
  - Feature-by-feature, not global
  - OLS + Ridge + NNLS compared
  - Train/val split seed=42
  - Bootstrap stability (10 resamples)
  - Status: LAMBDA_USEFUL / LAMBDA_NEUTRAL / NEEDS_GAMMA / UNSTABLE

Standard: NASA-Grade L4 — zero hand-tuning.
"""

import json, os, re, math, sys
from statistics import mean, stdev
from collections import Counter
from datetime import datetime
import numpy as np
from scipy.optimize import nnls

ROOT = r"C:\Users\elric\omega-project"
TXT_DIR = os.path.join(ROOT, "omega-autopsie", "corpus_r", "txt")
TIERS_FILE = os.path.join(ROOT, "omega-autopsie", "corpus_r", "CORPUS_TIERS_V3.json")
R81_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "TYPE_PROFILES_PURE.json")
R82_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "R8_ADDITIVITY_TEST.json")
OUT_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "R8_LAMBDA_ESTIMATION.json")

TYPES = ['action', 'narration', 'description', 'dialogue', 'introspection']
SEED = 42
VAL_RATIO = 0.20
N_BOOTSTRAP = 10
WINDOW = 2000
POSITIONS = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]

# ═══════════════════════════════════════════════════════════════════════
# Feature lists from R-8.2
# ═══════════════════════════════════════════════════════════════════════

NORMALIZED_FEATURES = [
    'f1_mean', 'f1a_rhythm_variance', 'f1b_rhythm_ratio',
    'f5a_verb_density', 'f5b_verb_adj_ratio', 'f5c_action_verb_ratio',
    'f9a_contradiction_rate', 'f12_tense_switches',
    'f15b_redundancy_compression',
    'f16a_bigram_rarity', 'f16c_lexical_surprise',
    'f17_knife_count', 'f17_contrast_spacing',
    'f19a_approx_entropy', 'f19f_window_stdev',
    'f21c_diacope_rate', 'f21e_ritual_index',
    'f24a_banal_rate', 'f24b_apex_rate', 'f24c_contrast_delta', 'f24e_contrast_score',
    'f25a_description_density', 'f25g_description_score',
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
]

GAMMA_TARGETS = [
    'f38b_punct_density', 'f38c_speed_score', 'f28d_sil_score',
    'f27a_epistemic_rate', 'f33c_dot_comma_ratio', 'f1b_rhythm_ratio',
    'f26a_mean_sub_markers', 'f_subordination_depth_approx', 'f26c_period_score',
]

# ═══════════════════════════════════════════════════════════════════════
# Reuse classifier + features from R-8.1/R-8.2 (inline)
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
    psc = sum(1 for w in lw if any(w.endswith(e) for e in PS_ENDINGS)); psr = psc/nlo
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
    ic = sum(1 for w in lw if any(w.endswith(e) for e in IMP_ENDINGS))
    tc = sum(1 for w in words if clean_word(w) in TEMPORAL_MARKERS)
    narr = min(1.0,(tp/nw)*4+(ic/nlo)*2+psr*2+(tc/nw)*8)
    raw = {'narration':narr,'description':desc,'dialogue':dial,'introspection':intro,'action':act}
    total = sum(raw.values())
    if total==0: return {'narration':0,'description':1,'dialogue':0,'introspection':0,'action':0}
    return {k: round(v/total,5) for k,v in raw.items()}

def compute_features(text):
    sents = split_sentences(text); wc = [clean_word(w) for w in text.split() if w]
    nw = max(len(wc),1); ns = max(len(sents),1); tl = text.lower()
    sl = [len(s.split()) for s in sents]; f = {}
    f['f1_mean'] = mean(sl) if sl else 0
    f['f1a_rhythm_variance'] = stdev(sl) if len(sl)>1 else 0
    f['f1b_rhythm_ratio'] = (max(sl)/max(min(sl),1)) if sl else 0
    ve = ['ait','aient','ais','a','it','ut','er','ir','re','ant','ent','ons','ez']
    vc = sum(1 for w in wc if len(w)>3 and any(w.endswith(e) for e in ve))
    f['f5a_verb_density'] = vc/nw
    ac = sum(1 for w in wc if any(w.endswith(e) for e in ADJ_ENDINGS) and len(w)>4)
    f['f5b_verb_adj_ratio'] = vc/max(ac,1)
    f['f5c_action_verb_ratio'] = sum(1 for w in wc if w in ACTION_VERBS)/nw
    adc = sum(tl.count(m) for m in ADVERSATIVES)
    f['f9a_contradiction_rate'] = adc/ns
    sw,prev = 0,None
    for w in wc:
        if len(w)<4: continue
        ct = None
        if any(w.endswith(e) for e in PS_ENDINGS): ct='PS'
        elif any(w.endswith(e) for e in IMP_ENDINGS): ct='IMP'
        if ct and prev and ct!=prev: sw+=1
        if ct: prev=ct
    f['f12_tense_switches'] = sw
    bg = [f"{wc[i]} {wc[i+1]}" for i in range(len(wc)-1) if wc[i] not in STOP_FR and wc[i+1] not in STOP_FR]
    ubg = len(set(bg)); f['f15b_redundancy_compression'] = ubg/max(len(bg),1)
    cw = [w for w in wc if w not in STOP_FR and len(w)>2]; wf = Counter(cw)
    hx = sum(1 for _,c in wf.items() if c==1)
    f['f16a_bigram_rarity'] = ubg/max(len(bg),1); f['f16c_lexical_surprise'] = hx/max(len(cw),1)
    kn = sum(1 for l in sl if l<=5); f['f17_knife_count'] = kn
    if kn>=2:
        ps = [i for i,l in enumerate(sl) if l<=5]; gp = [ps[j+1]-ps[j] for j in range(len(ps)-1)]
        f['f17_contrast_spacing'] = mean(gp) if gp else ns
    else: f['f17_contrast_spacing'] = ns
    if cw:
        tc2=len(cw); fr=Counter(cw); en=-sum((c/tc2)*math.log2(c/tc2) for c in fr.values() if c>0)
        me=math.log2(len(fr)) if len(fr)>1 else 1; f['f19a_approx_entropy']=en/me if me>0 else 0
    else: f['f19a_approx_entropy']=0
    if ns>=10:
        ch=ns//5; sm=[mean(sl[i*ch:(i+1)*ch]) for i in range(5) if sl[i*ch:(i+1)*ch]]
        f['f19f_window_stdev']=stdev(sm) if len(sm)>1 else 0
    else: f['f19f_window_stdev']=0
    dia=0
    for i in range(len(cw)):
        for j in range(i+1,min(i+6,len(cw))):
            if cw[i]==cw[j]: dia+=1; break
    f['f21c_diacope_rate']=dia/max(len(cw),1)
    if sents:
        st=[s.split()[0].lower() if s.split() else '' for s in sents]; sf=Counter(st)
        f['f21e_ritual_index']=sum(c for c in sf.values() if c>1)/ns
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
    f['f26a_mean_sub_markers']=subc/ns; ls2=sum(1 for l in sl if l>30)
    f['f26b_long_sent_rate']=ls2/ns; f['f26c_period_score']=f['f26a_mean_sub_markers']*f['f26b_long_sent_rate']
    epist={'peut-etre','sans doute','probablement','il semble','apparemment','perhaps','probably','possibly','seemingly'}
    epc=sum(1 for m in epist if m in tl)
    f['f27a_epistemic_rate']=epc/ns*100; cdc=sum(1 for w in wc if w in COND_FORMS)
    f['f27b_conditional_rate']=cdc/nw; nc=sum(1 for w in wc if w in NEGATION_WORDS)
    f['f27c_negation_rate']=nc/ns*100; f['f27d_modal_score']=f['f27b_conditional_rate']*5+epc/nw*10
    sp2=[r'il\s+(?:semblait|lui\s+semblait|croyait|pensait)',r'elle\s+(?:semblait|croyait|pensait|sentait)',r'(?:comme\s+si|sans\s+doute)\s+\w+\s+(?:avait|etait)']
    slc=sum(len(re.findall(p,tl)) for p in sp2); f['f28d_sil_score']=slc/ns
    al=[w for w in wc if len(w)>1]; f['f29a_ttr_global']=len(set(al))/max(len(al),1)
    if len(al)>=200:
        ttrs=[len(set(al[i:i+100]))/100 for i in range(0,len(al)-99,50)]; f['f29d_ttr_score']=mean(ttrs)
    else: f['f29d_ttr_score']=f['f29a_ttr_global']
    pps=sum(1 for w in wc if len(w)>4 and any(w.endswith(e) for e in PS_ENDINGS))
    imp2=sum(1 for w in wc if len(w)>4 and any(w.endswith(e) for e in IMP_ENDINGS))
    tt=max(pps+imp2+1,1); f['f30a_passe_simple_rate']=pps/tt; f['f30b_imparfait_rate']=imp2/tt
    f['f30d_ps_imp_ratio']=pps/max(imp2,1)
    dt=text.count('.')+text.count('!')+text.count('?'); cm=text.count(',')
    f['f33c_dot_comma_ratio']=dt/max(cm,1)
    pa=[p.strip() for p in text.split('\n\n') if p.strip()]
    f['f34b_para_per_1000w']=len(pa)/(nw/1000)
    spp=sum(1 for p in pa if len(p.split())<30) if pa else 0
    f['f38a_short_para_rate']=spp/max(len(pa),1); f['f38b_punct_density']=(dt+cm)/nw
    f['f38c_speed_score']=f['f38a_short_para_rate']*0.3+f['f38b_punct_density']*2
    f['f_subordination_depth_approx']=subc/ns; f['f_negation_density']=nc/(nw/100)
    caus=sum(tl.count(m) for m in CAUSAL_MARKERS); f['f_causal_density']=caus/ns
    des=sum(1 for w in wc if w in DESIRE_VERBS); f['f_tension_density']=(des+nc*0.3)/nw
    f['f_desire_negation_rate']=des/max(nc,1)
    mid=len(al)//2
    if mid>50: f['f_lexical_progression']=len(set(al[mid:]))/max(len(al)-mid,1)-len(set(al[:mid]))/mid
    else: f['f_lexical_progression']=0
    return f

def extract_passage(text, pos, win):
    words = text.split(); n = len(words); center = int(n*pos); half = win//2
    start = max(0,center-half); end = min(n,start+win)
    if end-start<win: start = max(0,end-win)
    return ' '.join(words[start:end])

# ═══════════════════════════════════════════════════════════════════════
# REGRESSION: learn λ per feature
# ═══════════════════════════════════════════════════════════════════════

def learn_lambda_for_feature(X_train, y_train, X_val, y_val, cif_vec):
    """
    X = (n_passages, 5) type proportions
    y = (n_passages,) measured feature values
    cif_vec = (5,) Ci,f constants

    Model: f_hat = Σ(pi * λi * Ci) = X @ (λ * C) = X @ diag(C) @ λ
    So: A = X * C[np.newaxis, :]  (element-wise broadcast)
    Solve: A @ λ = y

    Methods: OLS, Ridge(α=1), NNLS
    """
    # Build design matrix A = X * C
    A_train = X_train * cif_vec[np.newaxis, :]
    A_val = X_val * cif_vec[np.newaxis, :]

    # Baseline: λ = [1,1,1,1,1]
    baseline_pred_train = A_train @ np.ones(5)
    baseline_pred_val = A_val @ np.ones(5)
    mae_baseline_train = float(np.mean(np.abs(y_train - baseline_pred_train)))
    mae_baseline_val = float(np.mean(np.abs(y_val - baseline_pred_val)))

    results = {}

    # Method 1: OLS
    try:
        lam_ols, res, rank, sv = np.linalg.lstsq(A_train, y_train, rcond=None)
        pred_val_ols = A_val @ lam_ols
        mae_ols = float(np.mean(np.abs(y_val - pred_val_ols)))
        results['OLS'] = {'lambda': lam_ols.tolist(), 'mae_val': mae_ols}
    except:
        results['OLS'] = None

    # Method 2: Ridge (α=1)
    try:
        ATA = A_train.T @ A_train
        ATy = A_train.T @ y_train
        lam_ridge = np.linalg.solve(ATA + 1.0 * np.eye(5), ATy)
        pred_val_ridge = A_val @ lam_ridge
        mae_ridge = float(np.mean(np.abs(y_val - pred_val_ridge)))
        results['Ridge'] = {'lambda': lam_ridge.tolist(), 'mae_val': mae_ridge}
    except:
        results['Ridge'] = None

    # Method 3: NNLS (λ >= 0)
    try:
        lam_nnls, rnorm = nnls(A_train, y_train)
        pred_val_nnls = A_val @ lam_nnls
        mae_nnls = float(np.mean(np.abs(y_val - pred_val_nnls)))
        results['NNLS'] = {'lambda': lam_nnls.tolist(), 'mae_val': mae_nnls}
    except:
        results['NNLS'] = None

    # Pick best method by validation MAE
    valid_methods = {k: v for k, v in results.items() if v is not None}
    if not valid_methods:
        return None, mae_baseline_val, mae_baseline_val, 'UNSTABLE', results

    best_method = min(valid_methods, key=lambda k: valid_methods[k]['mae_val'])
    best = valid_methods[best_method]
    mae_lambda = best['mae_val']
    lam_best = np.array(best['lambda'])

    # Gain
    gain_abs = mae_baseline_val - mae_lambda
    gain_pct = (gain_abs / mae_baseline_val * 100) if mae_baseline_val > 0 else 0

    return lam_best, mae_baseline_val, mae_lambda, best_method, results, gain_pct


def bootstrap_stability(X, y, cif_vec, n_boot=N_BOOTSTRAP):
    """Run n_boot NNLS fits on resampled data, return stdev of each λ."""
    rng = np.random.RandomState(SEED + 100)
    n = len(y)
    all_lambdas = []
    A = X * cif_vec[np.newaxis, :]
    for _ in range(n_boot):
        idx = rng.choice(n, n, replace=True)
        try:
            lam, _ = nnls(A[idx], y[idx])
            all_lambdas.append(lam)
        except:
            pass
    if len(all_lambdas) < 3:
        return [999.0] * 5
    arr = np.array(all_lambdas)
    return arr.std(axis=0).tolist()

# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  OMEGA R-8.3 -- LAMBDA INFLUENCE COEFFICIENTS")
    print(f"  Methods: OLS + Ridge + NNLS | Split: {1-VAL_RATIO:.0%}/{VAL_RATIO:.0%} seed={SEED}")
    print(f"  Bootstrap: {N_BOOTSTRAP} resamples | Features: {len(NORMALIZED_FEATURES)}")
    print("=" * 70)

    # Load R-8.1 Ci,f
    with open(R81_FILE, 'r', encoding='utf-8') as fh:
        r81 = json.load(fh)
    cif = {t: r81['types'][t]['mean'] for t in TYPES}

    # Load tiers
    with open(TIERS_FILE, 'r', encoding='utf-8') as fh:
        tiers_data = json.load(fh)
    tier_lookup = {e['filename']: e.get('tier_final') or e.get('tier_suggestion','?') for e in tiers_data}

    # Extract passages from ALL works
    all_files = list(tier_lookup.keys())
    all_passages = []
    skipped = 0; processed = 0

    for i, fn in enumerate(all_files):
        txt_path = os.path.join(TXT_DIR, fn)
        if not os.path.exists(txt_path): skipped += 1; continue
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='replace') as fh:
                text = fh.read()
        except: skipped += 1; continue
        if len(text.split()) < WINDOW*1.5: skipped += 1; continue
        tier = tier_lookup.get(fn, '?')
        for pos in POSITIONS:
            pt = extract_passage(text, pos, WINDOW)
            if len(pt.split()) < WINDOW*0.8: continue
            cl = classify_passage(pt)
            ft = compute_features(pt)
            all_passages.append({'tier': tier, 'types': cl, 'features': ft})
        processed += 1
        if (i+1) % 100 == 0:
            print(f"  [{i+1}/{len(all_files)}] processed={processed} passages={len(all_passages)}")

    print(f"\n  TOTAL: {processed} works, {len(all_passages)} passages")

    # Build matrices
    n_pass = len(all_passages)
    X_types = np.array([[p['types'][t] for t in TYPES] for p in all_passages])  # (n, 5)

    # Train/val split
    rng = np.random.RandomState(SEED)
    indices = np.arange(n_pass)
    rng.shuffle(indices)
    n_val = int(n_pass * VAL_RATIO)
    val_idx = indices[:n_val]
    train_idx = indices[n_val:]

    X_train = X_types[train_idx]
    X_val = X_types[val_idx]

    print(f"  Split: train={len(train_idx)} val={len(val_idx)}")

    # Filter to features that exist in Ci,f
    available_features = [fk for fk in NORMALIZED_FEATURES if fk in cif['action']]
    print(f"  Available normalized features: {len(available_features)}")

    # Load R-8.2 classification
    r82_class = {}
    try:
        with open(R82_FILE, 'r', encoding='utf-8') as fh:
            r82 = json.load(fh)
        r82_class = r82.get('feature_classification', {})
    except:
        pass

    # === LEARN λ FOR EACH FEATURE ===
    results_table = []

    for fi, fk in enumerate(available_features):
        # Ci,f vector
        cif_vec = np.array([cif[t][fk] for t in TYPES])

        # Skip if all Ci,f are zero (degenerate)
        if np.all(np.abs(cif_vec) < 1e-10):
            results_table.append({
                'feature': fk, 'r82_class': r82_class.get(fk,'?'),
                'status': 'DEGENERATE', 'mae_baseline': 0, 'mae_lambda': 0,
                'gain_pct': 0, 'best_method': 'NONE',
                'lambda': {t: 0 for t in TYPES}, 'stability': {t: 0 for t in TYPES},
            })
            continue

        # Target vector
        y_all = np.array([p['features'][fk] for p in all_passages])
        y_train = y_all[train_idx]
        y_val = y_all[val_idx]

        # Learn λ
        result = learn_lambda_for_feature(X_train, y_train, X_val, y_val, cif_vec)
        if result[0] is None:
            results_table.append({
                'feature': fk, 'r82_class': r82_class.get(fk,'?'),
                'status': 'UNSTABLE', 'mae_baseline': r5(result[1]),
                'mae_lambda': r5(result[2]), 'gain_pct': 0, 'best_method': 'NONE',
                'lambda': {t: 0 for t in TYPES}, 'stability': {t: 999 for t in TYPES},
            })
            continue

        lam_best, mae_base, mae_lam, best_method, all_methods, gain_pct = result

        # Bootstrap stability
        stab = bootstrap_stability(X_types, y_all, cif_vec)
        max_stab = max(stab)

        # Classify status
        if max_stab > 2.0:
            status = 'UNSTABLE'
        elif gain_pct > 5.0 and max_stab < 1.0:
            status = 'LAMBDA_USEFUL'
        elif gain_pct < 2.0:
            if fk in GAMMA_TARGETS:
                status = 'NEEDS_GAMMA'
            else:
                status = 'LAMBDA_NEUTRAL'
        else:
            if fk in GAMMA_TARGETS and gain_pct < 10:
                status = 'NEEDS_GAMMA'
            else:
                status = 'LAMBDA_USEFUL'

        lam_dict = {t: r5(lam_best[i]) for i, t in enumerate(TYPES)}
        stab_dict = {t: r5(stab[i]) for i, t in enumerate(TYPES)}

        results_table.append({
            'feature': fk,
            'r82_class': r82_class.get(fk, '?'),
            'status': status,
            'mae_baseline': r5(mae_base),
            'mae_lambda': r5(mae_lam),
            'gain_pct': r5(gain_pct),
            'best_method': best_method,
            'lambda': lam_dict,
            'stability': stab_dict,
            'all_methods_mae': {k: r5(v['mae_val']) if v else None for k, v in all_methods.items()},
        })

    # === SUMMARY ===
    print("\n" + "=" * 70)
    print("  R-8.3 RESULTS — LAMBDA ESTIMATION")
    print("=" * 70)

    status_counts = Counter(r['status'] for r in results_table)
    print(f"\n  STATUS DISTRIBUTION:")
    for s in ['LAMBDA_USEFUL', 'LAMBDA_NEUTRAL', 'NEEDS_GAMMA', 'UNSTABLE', 'DEGENERATE']:
        print(f"    {s:<20} {status_counts.get(s,0)}")

    # Top 10 where λ helps most
    useful = sorted([r for r in results_table if r['gain_pct'] > 0],
                    key=lambda x: -x['gain_pct'])
    print(f"\n  TOP 10 — LAMBDA MOST USEFUL (gain %):")
    print(f"    {'Feature':<35} {'Base MAE':>10} {'Lam MAE':>10} {'Gain%':>7} {'Method':>6} {'Status':<15}")
    for r in useful[:10]:
        print(f"    {r['feature']:<35} {r['mae_baseline']:>10.4f} {r['mae_lambda']:>10.4f} "
              f"{r['gain_pct']:>6.1f}% {r['best_method']:>6} {r['status']:<15}")

    # Top 10 where λ helps least
    print(f"\n  TOP 10 — LAMBDA LEAST USEFUL:")
    least = sorted([r for r in results_table if r['status'] != 'DEGENERATE'],
                   key=lambda x: x['gain_pct'])
    for r in least[:10]:
        print(f"    {r['feature']:<35} {r['mae_baseline']:>10.4f} {r['mae_lambda']:>10.4f} "
              f"{r['gain_pct']:>6.1f}% {r['best_method']:>6} {r['status']:<15}")

    # R-8.2 additive features: do they stay near λ≈1?
    print(f"\n  ADDITIVE FEATURES (R-8.2) — λ VALUES:")
    for r in results_table:
        if r['r82_class'] == 'ADDITIVE':
            lams = r['lambda']
            print(f"    {r['feature']:<35} λ=[{lams['action']:.2f} {lams['narration']:.2f} "
                  f"{lams['description']:.2f} {lams['dialogue']:.2f} {lams['introspection']:.2f}] "
                  f"gain={r['gain_pct']:.1f}%")

    # Gamma targets status
    print(f"\n  GAMMA TARGETS (9 critical features) — STATUS:")
    for r in results_table:
        if r['feature'] in GAMMA_TARGETS:
            print(f"    {r['feature']:<35} gain={r['gain_pct']:>6.1f}%  status={r['status']}")

    # Final tally for R-8.4
    needs_gamma = [r['feature'] for r in results_table if r['status'] == 'NEEDS_GAMMA']
    print(f"\n  FEATURES FORWARDED TO R-8.4 (γ interactions): {len(needs_gamma)}")
    for fk in needs_gamma:
        print(f"    - {fk}")

    # Global reconstruction improvement
    all_base = [r['mae_baseline'] for r in results_table if r['status'] != 'DEGENERATE']
    all_lam = [r['mae_lambda'] for r in results_table if r['status'] != 'DEGENERATE']
    if all_base and all_lam:
        print(f"\n  GLOBAL: mean MAE baseline={mean(all_base):.4f} → lambda={mean(all_lam):.4f} "
              f"(improvement: {(1-mean(all_lam)/mean(all_base))*100:.1f}%)")

    # Save
    output = {
        'phase': 'R-8.3',
        'description': 'Lambda influence coefficients per feature. 3 methods compared. Bootstrap stability.',
        'seed': SEED, 'val_ratio': VAL_RATIO, 'n_bootstrap': N_BOOTSTRAP,
        'total_passages': n_pass, 'train_size': len(train_idx), 'val_size': len(val_idx),
        'timestamp': datetime.now().isoformat(),
        'status_counts': dict(status_counts),
        'features': results_table,
        'gamma_needed': needs_gamma,
        'global_mae_baseline': r5(mean(all_base)) if all_base else None,
        'global_mae_lambda': r5(mean(all_lam)) if all_lam else None,
    }
    with open(OUT_FILE, 'w', encoding='utf-8') as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
