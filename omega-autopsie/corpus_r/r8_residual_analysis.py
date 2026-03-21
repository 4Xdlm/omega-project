#!/usr/bin/env python3
"""
OMEGA R-8.3b — POST-LAMBDA RESIDUAL ANALYSIS
═════════════════════════════════════════════
Question: After λ correction, does the S vs C/D gap persist on the 9 gamma targets?
If YES → R-8.4 (γ interactions) is justified
If NO → λ absorbed the signal, γ is unnecessary

This is a DIAGNOSTIC, not a full phase.
"""

import json, os, re, math
from statistics import mean, stdev
from collections import Counter
from datetime import datetime
import numpy as np
from scipy.optimize import nnls

ROOT = r"C:\Users\elric\omega-project"
TXT_DIR = os.path.join(ROOT, "omega-autopsie", "corpus_r", "txt")
TIERS_FILE = os.path.join(ROOT, "omega-autopsie", "corpus_r", "CORPUS_TIERS_V3.json")
R81_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "TYPE_PROFILES_PURE.json")
R83_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "R8_LAMBDA_ESTIMATION.json")
OUT_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "R8_RESIDUAL_ANALYSIS.json")

TYPES = ['action', 'narration', 'description', 'dialogue', 'introspection']
WINDOW = 2000
POSITIONS = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]

GAMMA_TARGETS = [
    'f38b_punct_density', 'f38c_speed_score', 'f28d_sil_score',
    'f27a_epistemic_rate', 'f33c_dot_comma_ratio', 'f1b_rhythm_ratio',
    'f26a_mean_sub_markers', 'f_subordination_depth_approx', 'f26c_period_score',
]

# ── Reuse all marker sets and functions from r8_lambda_estimation.py ──
# (inline for standalone execution)

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
    f['f34b_para_per_1000w']=len([p.strip() for p in text.split('\n\n') if p.strip()])/(nw/1000)
    pa=[p.strip() for p in text.split('\n\n') if p.strip()]
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
# MAIN — RESIDUAL ANALYSIS
# ═══════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  OMEGA R-8.3b -- POST-LAMBDA RESIDUAL ANALYSIS")
    print("  Question: Does the S vs C/D gap persist AFTER lambda correction?")
    print("=" * 70)

    # Load R-8.1 Ci,f
    with open(R81_FILE, 'r', encoding='utf-8') as fh:
        r81 = json.load(fh)
    cif = {t: r81['types'][t]['mean'] for t in TYPES}

    # Load R-8.3 lambda values
    with open(R83_FILE, 'r', encoding='utf-8') as fh:
        r83 = json.load(fh)
    lambda_by_feature = {}
    for entry in r83['features']:
        fk = entry['feature']
        lambda_by_feature[fk] = entry['lambda']  # dict {type: value}

    # Load tiers
    with open(TIERS_FILE, 'r', encoding='utf-8') as fh:
        tiers_data = json.load(fh)
    tier_lookup = {e['filename']: e.get('tier_final') or e.get('tier_suggestion','?') for e in tiers_data}

    # Extract passages
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
        if (i+1) % 200 == 0:
            print(f"  [{i+1}/{len(all_files)}] processed={processed} passages={len(all_passages)}")

    print(f"\n  TOTAL: {processed} works, {len(all_passages)} passages")

    # For each gamma target, compute:
    # 1. BASELINE error (no lambda): f_pred = Σ(pi * Ci,f)
    # 2. LAMBDA error: f_pred = Σ(pi * λi * Ci,f)
    # 3. Stratify both by tier
    # 4. Compute S/CD ratio for BOTH

    print("\n" + "=" * 70)
    print("  RESIDUAL S vs C/D ANALYSIS (9 GAMMA TARGETS)")
    print("=" * 70)
    print(f"\n  {'Feature':<32} {'BASE S':>7} {'BASE CD':>7} {'ratio':>6} | {'LAM S':>7} {'LAM CD':>7} {'ratio':>6} | {'verdict'}")
    print("  " + "-" * 100)

    results = []

    for fk in GAMMA_TARGETS:
        if fk not in lambda_by_feature:
            continue

        lam = lambda_by_feature[fk]
        cif_vec = {t: cif[t].get(fk, 0) for t in TYPES}

        # Compute errors per passage
        s_base_errs = []; cd_base_errs = []
        s_lam_errs = []; cd_lam_errs = []

        for p in all_passages:
            f_meas = p['features'].get(fk, 0)

            # Baseline
            f_base = sum(p['types'][t] * cif_vec[t] for t in TYPES)
            err_base = abs(f_meas - f_base)

            # Lambda-corrected
            f_lam = sum(p['types'][t] * lam[t] * cif_vec[t] for t in TYPES)
            err_lam = abs(f_meas - f_lam)

            tier = p['tier']
            if tier == 'S':
                s_base_errs.append(err_base)
                s_lam_errs.append(err_lam)
            elif tier in ('C', 'D'):
                cd_base_errs.append(err_base)
                cd_lam_errs.append(err_lam)

        if not s_base_errs or not cd_base_errs:
            continue

        s_base = mean(s_base_errs)
        cd_base = mean(cd_base_errs)
        ratio_base = s_base / cd_base if cd_base > 0 else 999

        s_lam = mean(s_lam_errs)
        cd_lam = mean(cd_lam_errs)
        ratio_lam = s_lam / cd_lam if cd_lam > 0 else 999

        # Verdict
        if ratio_lam > 1.15:
            verdict = "GAMMA_NEEDED (gap persists)"
        elif ratio_lam > 1.05:
            verdict = "MARGINAL (small gap)"
        else:
            verdict = "LAMBDA_SUFFICIENT (gap closed)"

        print(f"  {fk:<32} {s_base:>7.4f} {cd_base:>7.4f} {ratio_base:>5.2f}x | "
              f"{s_lam:>7.4f} {cd_lam:>7.4f} {ratio_lam:>5.2f}x | {verdict}")

        results.append({
            'feature': fk,
            'baseline_s_mae': r5(s_base), 'baseline_cd_mae': r5(cd_base),
            'baseline_ratio': r5(ratio_base),
            'lambda_s_mae': r5(s_lam), 'lambda_cd_mae': r5(cd_lam),
            'lambda_ratio': r5(ratio_lam),
            'verdict': verdict,
            'lambda_reduced_gap': r5(ratio_base - ratio_lam),
        })

    # Summary
    still_needed = [r for r in results if 'GAMMA_NEEDED' in r['verdict']]
    marginal = [r for r in results if 'MARGINAL' in r['verdict']]
    sufficient = [r for r in results if 'SUFFICIENT' in r['verdict']]

    print(f"\n  SUMMARY:")
    print(f"    GAMMA_NEEDED (ratio > 1.15):   {len(still_needed)} features")
    print(f"    MARGINAL (1.05-1.15):           {len(marginal)} features")
    print(f"    LAMBDA_SUFFICIENT (< 1.05):     {len(sufficient)} features")

    if still_needed:
        print(f"\n  FEATURES TO FORWARD TO R-8.4:")
        for r in still_needed:
            print(f"    {r['feature']:<32} ratio_after_lambda={r['lambda_ratio']:.2f}x")

    # Also check: did lambda REDUCE the gap on average?
    if results:
        avg_base_ratio = mean([r['baseline_ratio'] for r in results])
        avg_lam_ratio = mean([r['lambda_ratio'] for r in results])
        print(f"\n  AVERAGE RATIO:")
        print(f"    Before lambda: {avg_base_ratio:.3f}x")
        print(f"    After lambda:  {avg_lam_ratio:.3f}x")
        print(f"    Gap reduction: {(1 - avg_lam_ratio/avg_base_ratio)*100:.1f}%")

    # Save
    output = {
        'phase': 'R-8.3b',
        'description': 'Post-lambda residual analysis: does S vs C/D gap persist?',
        'total_passages': len(all_passages),
        'timestamp': datetime.now().isoformat(),
        'results': results,
        'gamma_needed': [r['feature'] for r in still_needed],
        'marginal': [r['feature'] for r in marginal],
        'lambda_sufficient': [r['feature'] for r in sufficient],
    }
    with open(OUT_FILE, 'w', encoding='utf-8') as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
