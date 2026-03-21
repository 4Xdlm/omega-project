"""
OMEGA Phase R-7 Step 2 — Endurance Curves
Multi-scale scoring: 200w, 500w, 2000w, 5000w, 10000w, 20000w
20 sources: 13 masters + 4 LLM + 3 commercial
Same GB model, same features, ZERO recalibration.
"""
import json
import math
import os
import re
import random
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")
TXT_DIR = os.path.join(ROOT, "omega-autopsie/corpus_r/txt")
LLM_DIR = os.path.join(ROOT, "omega-autopsie/results_rosetta/s0/p5_test")
OUT = os.path.join(ROOT, "omega-autopsie/results_phase_r/R7_ENDURANCE_CURVES.json")

WINDOW_SIZES = [200, 500, 2000, 5000, 10000, 20000]
N_WINDOWS = 5  # 5 windows per scale

# ═══════════════════════════════════════════════════════════════
# FEATURE COMPUTATION (imported from r7_multiscale_test.py logic)
# ═══════════════════════════════════════════════════════════════

def r4(v):
    return round(v, 4)

def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return 0.0
    return float(v)

def mean_val(vals):
    return sum(vals) / len(vals) if vals else 0

def stdev_val(vals):
    if len(vals) < 2:
        return 0
    m = mean_val(vals)
    return math.sqrt(sum((v - m)**2 for v in vals) / (len(vals) - 1))

def count_occ(text, marker):
    count = 0
    pos = 0
    while True:
        pos = text.find(marker, pos)
        if pos == -1:
            break
        count += 1
        pos += len(marker)
    return count

def split_sentences(text):
    raw = re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def get_lower_words(text):
    words = text.split()
    result = []
    for w in words:
        lower = re.sub(r"[^a-z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00ff\u00e7\u0153\u00e6\u00f1'-]", '', w.lower())
        if len(lower) > 1:
            result.append(lower)
    return result


# --- V3 TEXT FEATURES ---

ALL_SUB = {
    'que', 'qui', 'dont', 'ou', 'lequel', 'laquelle', 'lesquels', 'lesquelles',
    'quand', 'comme', 'si', 'puisque', 'parce', 'bien', 'quoique', 'malgre',
    'tandis', 'alors', 'lorsque', 'des', 'avant', 'apres', 'pendant', 'jusqu',
    'that', 'which', 'who', 'whom', 'whose', 'where', 'when', 'although',
    'because', 'since', 'while', 'until', 'unless', 'whether', 'after',
    'before', 'though', 'even', 'whereas', 'provided',
}

EPISTEMIC_ALL = [
    'semblait', 'paraissait', 'apparemment', 'peut-etre', 'probablement',
    'sans doute', 'il me semblait', 'comme si', 'on eut dit', 'dirait-on',
    'quelque chose', 'une sorte', 'une espece', 'je croyais', 'il croyait',
    'il lui semblait', "avait l'air", "avait l'impression",
    'seemed', 'appeared', 'apparently', 'perhaps', 'probably', 'possibly',
    'as if', 'as though', 'something like', 'a kind of', 'sort of', 'might',
    'could', 'would have', 'had seemed', 'it seemed',
]
CONDITIONAL_FR = ['aurait', 'aurait ete', 'eut', 'eut ete', 'serait', 'fut', 'voudrait']
PASSE_SIMPLE = ['fut', 'eut', 'dit', 'prit', 'vit', 'alla', 'revint', 'sembla', 'parut']
NEG_COMPLEX = ['ne...que', 'nul', 'aucun', 'jamais', 'guere', 'ni...ni', 'point',
               'nullement', 'en aucune facon', 'rien de', 'pas un seul']
IRONY_MARKERS_V3 = ['on eut dit', "c'etait bien la", 'voila qui', "comme c'est",
                    'comme il convient', 'naturellement', 'il va sans dire',
                    "cela s'entend", 'bien entendu']
ADVERSATIVE = [
    'mais', 'cependant', 'pourtant', 'toutefois', 'neanmoins', 'or',
    'en revanche', 'au contraire', 'malgre', 'bien que', 'quoique',
    'but', 'however', 'yet', 'nevertheless', 'although', 'despite',
    'nonetheless', 'on the contrary', 'whereas',
]


def compute_v3_text_features(text):
    sents = split_sentences(text)
    f = {}
    # F1
    if sents:
        lens = [len(s.split()) for s in sents]
        f['f1_mean'] = r4(mean_val(lens))
        f['f1a_rhythm_variance'] = r4(stdev_val(lens))
    else:
        f['f1_mean'] = 0; f['f1a_rhythm_variance'] = 0
    # F9
    txt_lower = text.lower()
    n_sents = max(len(sents), 1)
    f['f9a_contradiction_rate'] = r4(sum(count_occ(txt_lower, m) for m in ADVERSATIVE) / n_sents)
    # F17
    if len(sents) >= 4:
        lens17 = [len(s.split()) for s in sents]
        f['f17_knife_count'] = sum(1 for l in lens17 if l <= 5)
    else:
        f['f17_knife_count'] = 0
    # F19
    if len(sents) >= 4:
        lens19 = [len(s.split()) for s in sents]
        m19 = mean_val(lens19); s19 = stdev_val(lens19)
        f['f19a_approx_entropy'] = r4(min(s19 / m19 if m19 > 0 else 0, 2.0))
    else:
        f['f19a_approx_entropy'] = 0
    # F24
    if len(sents) >= 10:
        lens24 = [len(s.split()) for s in sents]
        sorted_l = sorted(lens24); n24 = len(sorted_l)
        p25 = sorted_l[n24//4]; p75 = sorted_l[3*n24//4]
        banal = [l for l in lens24 if l <= p25]; apex = [l for l in lens24 if l >= p75]
        f['f24c_contrast_delta'] = r4((mean_val(apex) if apex else 0) - (mean_val(banal) if banal else 0))
    else:
        f['f24c_contrast_delta'] = 0
    # F26
    if sents:
        sub_counts = []; sent_lens = []
        for s in sents:
            words = s.lower().split()
            sub_counts.append(sum(1 for w in words if re.sub(r'[.,;:!?]', '', w) in ALL_SUB))
            sent_lens.append(len(words))
        mean_sub = mean_val(sub_counts)
        long_rate = sum(1 for l in sent_lens if l > 40) / len(sent_lens)
        f['f26b_long_sent_rate'] = r4(long_rate)
        f['f26c_period_score'] = r4(min(mean_sub/6.0, 1.0)*0.6 + long_rate*0.4)
    else:
        f['f26b_long_sent_rate'] = 0; f['f26c_period_score'] = 0
    # F27
    ep_count = sum(count_occ(txt_lower, m) for m in EPISTEMIC_ALL)
    epistemic_rate = r4(ep_count / n_sents * 100)
    cond_count = sum(count_occ(txt_lower, m) for m in CONDITIONAL_FR)
    ps_count = max(sum(count_occ(txt_lower, m) for m in PASSE_SIMPLE), 1)
    cond_rate = r4(cond_count / ps_count)
    neg_count = sum(count_occ(txt_lower, m) for m in NEG_COMPLEX)
    neg_rate = r4(neg_count / n_sents * 100)
    f['f27a_epistemic_rate'] = epistemic_rate
    f['f27d_modal_score'] = r4(min(epistemic_rate/20,1)*0.5 + min(cond_rate/2,1)*0.3 + min(neg_rate/10,1)*0.2)
    # F28
    f['f28b_irony_density'] = r4(sum(count_occ(txt_lower, m) for m in IRONY_MARKERS_V3) / n_sents * 100)
    # F29
    WINDOW = 100
    words29 = [re.sub(r'[.,;:!?\"\'\(\)\[\]]', '', w.lower()) for w in text.split() if len(w) > 1]
    if len(words29) >= WINDOW:
        ttrs = []
        for i in range(0, len(words29)-WINDOW+1, 50):
            w = words29[i:i+WINDOW]; ttrs.append(len(set(w))/WINDOW)
        tw = mean_val(ttrs); ts = stdev_val(ttrs) if len(ttrs) > 1 else 0
        f['f29d_ttr_score'] = r4(min(tw/0.80, 1.0)*0.7 + min(ts*5, 1.0)*0.3)
    else:
        f['f29d_ttr_score'] = 0
    # F35
    hook_sents = split_sentences(' '.join(text.split()[:100]))
    if hook_sents:
        hq = any(s.strip().endswith('?') for s in hook_sents)
        he = any(s.strip().endswith('!') for s in hook_sents)
        ml = mean_val([len(s.split()) for s in hook_sents])
        t35 = min(1.0, 20.0/max(ml,1))
        f['f35c_hook_score'] = r4(t35*0.5 + (0.3 if hq else 0) + (0.2 if he else 0))
    else:
        f['f35c_hook_score'] = 0
    # F36
    cliff_sents = split_sentences(' '.join(text.split()[-100:]))
    if cliff_sents:
        ls = cliff_sents[-1].strip()
        ee = ls.endswith('...') or ls.endswith('\u2026')
        lc = ls[-1] if ls else ''
        ei = lc not in '.!?\u2026'
        ml36 = mean_val([len(s.split()) for s in cliff_sents])
        t36 = min(1.0, 20.0/max(ml36,1))
        f['f36c_cliff_score'] = r4(t36*0.5 + (0.3 if ee else 0) + (0.2 if ei else 0))
    else:
        f['f36c_cliff_score'] = 0
    return f


# --- DEPTH FEATURES ---

SUB_RE = [
    r'\bqui\b', r'\bque\b', r'\bdont\b', r'\bo\u00f9\b',
    r'\blorsqu', r'\bquand\b', r'\btandis qu', r'\bapr\u00e8s qu',
    r'\bavant qu', r'\bdepuis qu', r'\bpuisqu', r'\bparce qu',
    r'\bcar\b', r'\bbien qu', r'\bquoiqu', r'\bm\u00eame si\b',
    r'\bafin qu', r'\bpour qu', r'\bsi\b', r'\bcomme\b',
    r'\bwhich\b', r'\bwho\b', r'\bwhom\b', r'\bwhose\b',
    r'\bthat\b', r'\bwhere\b', r'\bwhen\b', r'\bwhile\b',
    r'\bbecause\b', r'\balthough\b', r'\bthough\b',
    r'\bsince\b', r'\bunless\b', r'\bwhereas\b', r'\bif\b', r'\bas\b',
]

def compute_depth_features(text):
    sents = split_sentences(text)
    if not sents:
        return {'f_pov_shift_rate': 0, 'f_subordination_depth': 0, 'f_clause_per_sentence': 0}
    sub_counts = []
    for s in sents:
        lower = s.lower()
        total = sum(len(re.findall(pat, lower, re.I)) for pat in SUB_RE)
        sub_counts.append(total)
    clause_counts = []
    for s in sents:
        lower = s.lower()
        pv = len(re.findall(r"\b(?:j[e']|tu|il|elle|on|nous|vous|ils|elles|ce|c'|qui)\s+\w+", lower))
        fe = len(re.findall(r'\b\w{3,}(?:ait|aient|ais|ions|iez|urent|\u00e8rent|erait|eraient|eront)\b', lower))
        etre = len(re.findall(r'\b(?:est|\u00e9tait|fut|sera|sont|\u00e9taient|serait|f\u00fbt|soient)\b', lower))
        avoir = len(re.findall(r'\b(?:avait|eut|aura|avaient|auraient|aurait|e\u00fbt)\b', lower))
        clause_counts.append(max(1, pv + int(fe*0.5) + etre + avoir))
    first_p = re.compile(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|me\b|my\b|mine\b)", re.I)
    third_p = re.compile(r"\b(?:il|elle|ils|elles|lui|leur|son|sa|ses|he\b|she\b|his\b|her\b|they\b|their\b)", re.I)
    coll_p = re.compile(r"\b(?:on|nous|we\b|our\b|us\b)", re.I)
    shifts = sum(1 for s in sents if sum([bool(first_p.search(s.lower())), bool(third_p.search(s.lower())), bool(coll_p.search(s.lower()))]) >= 2)
    return {
        'f_pov_shift_rate': r4(shifts / len(sents)),
        'f_subordination_depth': r4(mean_val(sub_counts)),
        'f_clause_per_sentence': r4(mean_val(clause_counts)),
    }


# --- SEMANTIC FEATURES ---

STOP_FR = {
    'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces',
    'mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur',
    'nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles',
    'me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car',
    'dans','sur','sous','avec','sans','pour','par','entre','vers','chez',
    'contre','apres','avant','pendant','depuis','que','qui','dont','ou',
    'quand','comme','si','ne','pas','plus','jamais','rien','est','sont',
    'etait','etaient','etre','avoir','avait','avaient','fait','faire','dit',
    'dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes',
    'autre','autres','meme','aussi','tres','bien','peu','trop','assez',
    'alors','encore','deja','la','ici','puis',
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'from','by','is','was','were','are','been','be','has','had','have','do',
    'did','does','will','would','could','should','may','might','shall','can',
    'must','it','its','he','she','they','them','their','his','her','this',
    'that','these','those','not','no','so','if','as',
}

PERC_RE = re.compile(r'\b(?:voyait|sentait|entendait|regardait|ecoutait|touchait|percevait|apercut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b', re.I)
DESIR_RE = re.compile(r'\b(?:voulait|desirait|esperait|souhaitait|revait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b', re.I)
NEG_SEM_RE = re.compile(r"\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guere|point|not|n't|never|nothing|neither|nor|without)\b", re.I)
CONC_RE = re.compile(r'\b(?:mais|pourtant|cependant|toutefois|neanmoins|malgre|quoique|although|though|however|yet|despite|nevertheless|but)\b', re.I)
IRON_RE = re.compile(r'\b(?:sans doute|bien sur|evidemment|naturellement|certes|apparently|of course|surely|indeed|certainly)\b', re.I)
CAUS_RE = re.compile(r"\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|des que|a cause|grace a|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|caused|led to|resulted)\b", re.I)
TEMP_RE = re.compile(r"\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitot|tout a coup|apres|avant|pendant|des|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b", re.I)
REAC_RE = re.compile(r"\b(?:sentit|comprit|realisa|sursauta|fremit|recula|bondit|cria|murmura|soupira|trembla|felt|understood|realized|jumped|flinched|gasped|whispered|sighed|trembled|cried|screamed|froze)\b", re.I)


def compute_semantic_features(text):
    sents = split_sentences(text)
    f = {}
    # 1. Referential coherence
    if len(sents) >= 3:
        eps = [set(m.lower() for m in re.findall(r'\b[A-Z\u00c0-\u00dc][a-z\u00e0-\u00ff]{2,}', s)) for s in sents]
        ch = ct = 0
        for i in range(len(sents)-1):
            if not eps[i]: continue
            n1 = eps[i+1] if i+1<len(sents) else set()
            n2 = eps[i+2] if i+2<len(sents) else set()
            for e in eps[i]:
                ct += 1
                if e in n1 or e in n2: ch += 1
        ec = {}
        for es in eps:
            for e in es: ec[e] = ec.get(e,0)+1
        te = len(ec); orph = sum(1 for c in ec.values() if c==1)
        espan = {}
        for i, es in enumerate(eps):
            for e in es:
                if e not in espan: espan[e]=[i,i]
                else: espan[e][1]=i
        spans = [s[1]-s[0]+1 for s in espan.values()]
        f['f_referent_continuity'] = r4(ch/ct if ct else 0)
        f['f_referent_orphan_rate'] = r4(orph/te if te else 0)
        f['f_entity_persistence'] = r4(mean_val(spans)/len(sents) if spans else 0)
    else:
        f['f_referent_continuity']=0; f['f_referent_orphan_rate']=0; f['f_entity_persistence']=0

    # 2. Progression
    if len(sents) >= 5:
        wv = []
        for i in range(len(sents)-2):
            txt = ' '.join(sents[i:i+3])
            wds = set(w for w in get_lower_words(txt) if w not in STOP_FR and len(w)>2)
            wv.append(wds)
        nr = []; cum = set()
        for i, v in enumerate(wv):
            if i==0: cum.update(v); nr.append(1.0); continue
            new = sum(1 for w in v if w not in cum); cum.update(v)
            nr.append(new/len(v) if v else 0)
        f['f_lexical_progression'] = r4(mean_val(nr[1:]) if len(nr)>1 else 0)
        f['f_semantic_stagnation'] = r4(sum(1 for r in nr[1:] if r<0.10)/max(len(nr)-1,1))
        n=len(nr); xm=(n-1)/2; ym=mean_val(nr)
        num=sum((i-xm)*(nr[i]-ym) for i in range(n)); den=sum((i-xm)**2 for i in range(n))
        f['f_novelty_curve_slope'] = r4(num/den if den else 0)
    else:
        f['f_lexical_progression']=0; f['f_semantic_stagnation']=0; f['f_novelty_curve_slope']=0

    # 3. Contextual precision
    if len(sents) >= 3:
        aw = [w for s in sents for w in get_lower_words(s) if w not in STOP_FR and len(w)>2]
        freq = {}
        for w in aw: freq[w]=freq.get(w,0)+1
        if len(aw) >= 10:
            rare = {w for w,c in freq.items() if c<=2}
            sup=iso=tr=0
            for s in sents:
                wds = [w for w in get_lower_words(s) if w not in STOP_FR and len(w)>2]
                for i,w in enumerate(wds):
                    if w not in rare: continue
                    tr+=1; st=w[:min(4,len(w))]; found=False
                    for j in range(max(0,i-5),min(len(wds),i+6)):
                        if j==i: continue
                        nb=wds[j]
                        if nb[:min(4,len(nb))]==st or nb in rare: found=True; break
                    if found: sup+=1
                    else: iso+=1
            f['f_contextual_precision'] = r4(sup/tr if tr else 0)
            f['f_rare_word_isolation'] = r4(iso/tr if tr else 0)
        else:
            f['f_contextual_precision']=0; f['f_rare_word_isolation']=0
    else:
        f['f_contextual_precision']=0; f['f_rare_word_isolation']=0

    # 4. Contextual originality
    words = [w for w in get_lower_words(text) if w not in STOP_FR and len(w)>2]
    if len(words) >= 10:
        freq = {}
        for w in words: freq[w]=freq.get(w,0)+1
        hapax = sum(1 for c in freq.values() if c==1)
        f['f_hapax_contextual_rate'] = r4(hapax/len(words))
        mid = sum(1 for c in freq.values() if 2<=c<=3)
        f['f_vocabulary_depth'] = r4(mid/max(len(freq),1))
    else:
        f['f_hapax_contextual_rate']=0; f['f_vocabulary_depth']=0

    # 5. Implicit tension
    if len(sents) >= 3:
        ts=dn=pc=0
        for s in sents:
            lo=s.lower()
            hp=bool(PERC_RE.search(lo)); hd=bool(DESIR_RE.search(lo))
            hn=bool(NEG_SEM_RE.search(lo)); hc=bool(CONC_RE.search(lo)); hi=bool(IRON_RE.search(lo))
            if sum([hp,hd,hn,hc,hi])>=2: ts+=1
            if hd and hn: dn+=1
            if hp and (hn or hc): pc+=1
        f['f_tension_density']=r4(ts/len(sents))
        f['f_desire_negation_rate']=r4(dn/len(sents))
        f['f_perception_conflict_rate']=r4(pc/len(sents))
    else:
        f['f_tension_density']=0; f['f_desire_negation_rate']=0; f['f_perception_conflict_rate']=0

    # 6. POV contamination
    if len(sents) >= 5:
        def cpov(s):
            lo=s.lower()
            p1=len(re.findall(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|my\b|mine\b|myself\b)",lo))
            p3=len(re.findall(r"\b(?:il|elle|lui|son|sa|ses|he\b|she\b|his\b|her\b|him\b)",lo))
            pn=len(re.findall(r"\b(?:on|nous|we\b|our\b|us\b)",lo))
            mx=max(p1,p3,pn)
            if mx==0: return '0'
            if p1==mx: return '1'
            if p3==mx: return '3'
            return 'N'
        povs=[cpov(s) for s in sents]
        dr=ru=0; last='0'
        for p in povs:
            if p=='0': continue
            if last!='0' and last!=p:
                if (last=='1' and p=='3') or (last=='3' and p=='1'): ru+=1
                else: dr+=1
            last=p
        nz=sum(1 for p in povs if p!='0')
        f['f_pov_drift_rate']=r4(dr/max(nz-1,1))
        f['f_pov_rupture_rate']=r4(ru/max(nz-1,1))
        pc2={}
        for p in povs:
            if p=='0': continue
            pc2[p]=pc2.get(p,0)+1
        f['f_pov_stability']=r4(max(pc2.values(),default=0)/max(nz,1))
    else:
        f['f_pov_drift_rate']=0; f['f_pov_rupture_rate']=0; f['f_pov_stability']=0

    # 7. Causal coherence
    if len(sents) >= 3:
        cs=ta=0; ch2=0; chains=[]
        for s in sents:
            lo=s.lower()
            hca=bool(CAUS_RE.search(lo)); ht=bool(TEMP_RE.search(lo)); hr=bool(REAC_RE.search(lo))
            if hca or hr: cs+=1; ch2+=1
            else:
                if ch2>0: chains.append(ch2)
                ch2=0
            if ht: ta+=1
        if ch2>0: chains.append(ch2)
        f['f_causal_density']=r4(cs/len(sents))
        f['f_causal_chain_length']=r4(mean_val(chains) if chains else 0)
        f['f_temporal_anchor_rate']=r4(ta/len(sents))
    else:
        f['f_causal_density']=0; f['f_causal_chain_length']=0; f['f_temporal_anchor_rate']=0

    # 8. Relational density
    if len(sents) >= 3:
        sw2=[set(w for w in get_lower_words(s) if w not in STOP_FR and len(w)>3) for s in sents]
        wp={}
        for i,ws in enumerate(sw2):
            for w in ws:
                if w not in wp: wp[w]=[]
                wp[w].append(i)
        acw=set(); [acw.update(ws) for ws in sw2]
        ec2=cb=0; ft2=len(sents)//3; lt2=len(sents)-ft2
        for w,pos in wp.items():
            if len(pos)<2: continue
            for i in range(1,len(pos)):
                if pos[i]-pos[i-1]>=3: ec2+=1; break
            if any(p<ft2 for p in pos) and any(p>=lt2 for p in pos): cb+=1
        tcw=len(acw)
        f['f_echo_density']=r4(ec2/tcw if tcw else 0)
        f['f_lexical_callback_rate']=r4(cb/tcw if tcw else 0)
        rep=[(w,pos) for w,pos in wp.items() if len(pos)>=2]
        gv=[]
        for w,pos in rep:
            gaps=[pos[i]-pos[i-1] for i in range(1,len(pos))]
            if len(gaps)>1:
                gm=mean_val(gaps); gv.append(sum((g-gm)**2 for g in gaps)/(len(gaps)-1))
            elif gaps: gv.append(0)
        f['f_motif_concentration']=r4(min(1,mean_val(gv)/20) if gv else 0)
    else:
        f['f_echo_density']=0; f['f_lexical_callback_rate']=0; f['f_motif_concentration']=0
    return f


# --- ALL 42 FEATURES ---

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


def compute_all_features(text):
    f = {}
    f.update(compute_v3_text_features(text))
    f.update(compute_depth_features(text))
    f.update(compute_semantic_features(text))
    f['ix_mean_x_subdepth'] = f.get('f1_mean',0) * f.get('f_subordination_depth',0)
    f['ix_pov_x_irony'] = f.get('f_pov_shift_rate',0) * f.get('f28b_irony_density',0)
    f['ix_variance_x_longrate'] = f.get('f1a_rhythm_variance',0) * f.get('f26b_long_sent_rate',0)
    return f


# ═══════════════════════════════════════════════════════════════
# RETRAIN GB MODEL (same as R-6b)
# ═══════════════════════════════════════════════════════════════

print("Loading corpus + training GB...")
with open(MASTER,'r',encoding='utf-8') as f: master=json.load(f)
with open(DEPTH,'r',encoding='utf-8') as f: depth_data=json.load(f)
with open(TIERS,'r',encoding='utf-8') as f: tiers_data=json.load(f)
with open(SEMANTIC,'r',encoding='utf-8') as f: semantic_data=json.load(f)

tier_lookup={e['filename']:e.get('tier_suggestion','?') for e in tiers_data}
depth_lookup={e['filename']:e['depth_features'] for e in depth_data}
semantic_lookup={e['filename']:e['semantic_features'] for e in semantic_data}
TIER_RANK={'S':5,'A':4,'B':3,'C':2,'D':1}

ORIG_F=['f26b_long_sent_rate','f1a_rhythm_variance','f1_mean','f24c_contrast_delta',
        'f28b_irony_density','f27a_epistemic_rate','f9a_contradiction_rate',
        'f19a_approx_entropy','f27d_modal_score','f26c_period_score']
DEPTH_F=['f_pov_shift_rate','f_subordination_depth','f_clause_per_sentence']
SUSPECT_F=['f17_knife_count','f29d_ttr_score','f35c_hook_score','f36c_cliff_score']

data=[]
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
    data.append((row,TIER_RANK[tier],fn))

random.seed(42)
indices=list(range(len(data))); random.shuffle(indices)
n_train=int(len(data)*0.70); train_idx=indices[:n_train]
X_train=np.array([[data[i][0].get(f,0) for f in ALL_FEATURES] for i in train_idx])
y_train=np.array([data[i][1] for i in train_idx])

gb=GradientBoostingRegressor(n_estimators=50,max_depth=4,learning_rate=0.05,
                             random_state=42,subsample=0.8,min_samples_leaf=5)
gb.fit(X_train,y_train)
print("  GB trained on 399 samples.")


# ═══════════════════════════════════════════════════════════════
# SOURCE PANEL
# ═══════════════════════════════════════════════════════════════

SOURCES = [
    # Tier S - Masters
    {'label':'Flaubert-Bovary','path':os.path.join(TXT_DIR,'flaubert_bovary_14155.txt'),'category':'S-Master'},
    {'label':'Flaubert-Education','path':os.path.join(TXT_DIR,'flaubert_education_14285.txt'),'category':'S-Master'},
    {'label':'Flaubert-Salammbo','path':os.path.join(TXT_DIR,'flaubert_salammbo_10884.txt'),'category':'S-Master'},
    {'label':'Proust-Swann','path':os.path.join(TXT_DIR,'proust_swann_2650.txt'),'category':'S-Master'},
    {'label':'Hugo-Miserables','path':os.path.join(TXT_DIR,'hugo_miserables_17489.txt'),'category':'S-Master'},
    {'label':'Hugo-NotreDame','path':os.path.join(TXT_DIR,'notre_dame_de_paris_victor_hugo.txt'),'category':'S-Master'},
    {'label':'Zola-BeteHumaine','path':os.path.join(TXT_DIR,'zola_bete_10007.txt'),'category':'S-Master'},
    {'label':'Zola-BonheurDames','path':os.path.join(TXT_DIR,'au_bonheur_des_dames_emile_zola.txt'),'category':'S-Master'},
    {'label':'Dostoievski-Crime','path':os.path.join(TXT_DIR,'dostoievski_crime_36034.txt'),'category':'S-Master'},
    {'label':'Camus-Etranger','path':os.path.join(TXT_DIR,'letranger_french_edition_albert_camus.txt'),'category':'S-Master'},
    {'label':'Camus-Peste','path':os.path.join(TXT_DIR,'la_peste_french_edition_albert_camus.txt'),'category':'S-Master'},
    # LLM
    {'label':'Claude-Opus','path':os.path.join(LLM_DIR,'claude_opus.txt'),'category':'LLM'},
    {'label':'GPT-5.4','path':os.path.join(LLM_DIR,'chatgpt_5.4_correction.txt'),'category':'LLM'},
    {'label':'Riviera','path':os.path.join(LLM_DIR,'riviera.txt'),'category':'LLM'},
    {'label':'Gemini','path':os.path.join(LLM_DIR,'gemini.txt'),'category':'LLM'},
    # Tier C - Commercial
    {'label':'Commercial-JadeWest','path':os.path.join(TXT_DIR,'bound_by_the_don_jade_west.txt'),'category':'C-Commercial'},
    {'label':'Commercial-MountainKings','path':os.path.join(TXT_DIR,'claimed_by_the_mountain_kings_alisson_bento.txt'),'category':'C-Commercial'},
    {'label':'Commercial-AlienWarrior','path':os.path.join(TXT_DIR,'convoitee_par_le_guerrier_alien_french_edition_ava_ross.txt'),'category':'C-Commercial'},
]


def extract_windows(text, window_size, n_windows=5):
    """Extract n_windows of window_size words at evenly spaced positions"""
    words = text.split()
    total = len(words)
    if total < window_size:
        return None  # Can't extract
    if total < window_size * 2:
        # Not enough room for multiple non-overlapping windows; extract with overlap
        positions = [i/(n_windows+1) for i in range(1, n_windows+1)]
    else:
        positions = [i/(n_windows+1) for i in range(1, n_windows+1)]
    windows = []
    for pos in positions:
        center = int(total * pos)
        start = max(0, center - window_size // 2)
        end = min(total, start + window_size)
        if end - start < window_size:
            start = max(0, end - window_size)
        windows.append(' '.join(words[start:end]))
    return windows


def score_window(text):
    feats = compute_all_features(text)
    X = np.array([[feats.get(f, 0) for f in ALL_FEATURES]])
    return float(gb.predict(X)[0])


# ═══════════════════════════════════════════════════════════════
# MAIN ENDURANCE TEST
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*80}")
print(f"  OMEGA R-7 STEP 2: ENDURANCE CURVES ({len(SOURCES)} sources x {len(WINDOW_SIZES)} scales)")
print(f"{'='*80}")

all_results = []

for src in SOURCES:
    if not os.path.exists(src['path']):
        print(f"  SKIP: {src['label']} (not found)")
        continue

    with open(src['path'], 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    word_count = len(text.split())

    print(f"\n  {src['label']} ({word_count:,} words) [{src['category']}]")

    entry = {
        'source': src['label'],
        'category': src['category'],
        'total_words': word_count,
        'scales': {},
    }

    for ws in WINDOW_SIZES:
        if word_count < ws:
            entry['scales'][str(ws)] = {'status': 'TOO_SHORT', 'scores': None}
            print(f"    {ws:>6}w: TOO SHORT ({word_count} < {ws})")
            continue

        windows = extract_windows(text, ws, N_WINDOWS)
        if windows is None:
            entry['scales'][str(ws)] = {'status': 'TOO_SHORT', 'scores': None}
            continue

        scores = [score_window(w) for w in windows]
        mn = mean_val(scores)
        sd = stdev_val(scores)
        med = sorted(scores)[len(scores)//2]

        entry['scales'][str(ws)] = {
            'status': 'OK',
            'scores': [round(s, 4) for s in scores],
            'mean': round(mn, 4),
            'stdev': round(sd, 4),
            'median': round(med, 4),
            'min': round(min(scores), 4),
            'max': round(max(scores), 4),
        }
        print(f"    {ws:>6}w: mean={mn:.3f} +/- {sd:.3f}  [min={min(scores):.3f} max={max(scores):.3f}]")

    all_results.append(entry)

# ═══════════════════════════════════════════════════════════════
# SUMMARY TABLE
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*80}")
print("  ENDURANCE TABLE (mean score per scale)")
print(f"{'='*80}")
header = f"  {'Source':<25} {'Cat':>5}"
for ws in WINDOW_SIZES:
    header += f" {ws:>7}w"
print(header)
print(f"  {'-'*25} {'-'*5}" + " --------" * len(WINDOW_SIZES))

for r in all_results:
    line = f"  {r['source']:<25} {r['category'][:5]:>5}"
    for ws in WINDOW_SIZES:
        sc = r['scales'].get(str(ws), {})
        if sc.get('status') == 'OK':
            line += f" {sc['mean']:>8.3f}"
        else:
            line += f" {'---':>8}"
    print(line)

# ═══════════════════════════════════════════════════════════════
# CATEGORY AVERAGES
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*80}")
print("  CATEGORY AVERAGES")
print(f"{'='*80}")

categories = ['S-Master', 'LLM', 'C-Commercial']
cat_avgs = {}
for cat in categories:
    cat_avgs[cat] = {}
    cat_results = [r for r in all_results if r['category'] == cat]
    for ws in WINDOW_SIZES:
        vals = []
        for r in cat_results:
            sc = r['scales'].get(str(ws), {})
            if sc.get('status') == 'OK':
                vals.append(sc['mean'])
        if vals:
            cat_avgs[cat][str(ws)] = {'mean': round(mean_val(vals), 4), 'n': len(vals)}

header2 = f"  {'Category':<15}"
for ws in WINDOW_SIZES:
    header2 += f" {ws:>7}w"
print(header2)
print(f"  {'-'*15}" + " --------" * len(WINDOW_SIZES))

for cat in categories:
    line = f"  {cat:<15}"
    for ws in WINDOW_SIZES:
        d = cat_avgs[cat].get(str(ws))
        if d:
            line += f" {d['mean']:>7.3f}({d['n']})"
        else:
            line += f" {'---':>10}"
    print(line)

# Trend analysis
print(f"\n{'='*80}")
print("  TREND ANALYSIS")
print(f"{'='*80}")

for cat in categories:
    scales_avail = [(int(ws), cat_avgs[cat][ws]['mean']) for ws in sorted(cat_avgs[cat].keys(), key=int)]
    if len(scales_avail) >= 2:
        first = scales_avail[0]
        last = scales_avail[-1]
        delta = last[1] - first[1]
        print(f"  {cat}: {first[0]}w -> {last[0]}w = {first[1]:.3f} -> {last[1]:.3f} (delta={delta:+.3f})")

# ═══════════════════════════════════════════════════════════════
# KEY QUESTIONS
# ═══════════════════════════════════════════════════════════════

print(f"\n{'='*80}")
print("  KEY FINDINGS")
print(f"{'='*80}")

# a) Is master-holds, LLM-drops general?
master_500 = cat_avgs.get('S-Master', {}).get('500', {}).get('mean', 0)
master_2000 = cat_avgs.get('S-Master', {}).get('2000', {}).get('mean', 0)
llm_500 = cat_avgs.get('LLM', {}).get('500', {}).get('mean', 0)
llm_2000 = cat_avgs.get('LLM', {}).get('2000', {}).get('mean', 0)

print(f"\n  a) Master-holds, LLM-drops pattern:")
print(f"     Masters: 500w={master_500:.3f} -> 2000w={master_2000:.3f} (delta={master_2000-master_500:+.3f})")
print(f"     LLM:     500w={llm_500:.3f} -> 2000w={llm_2000:.3f} (delta={llm_2000-llm_500:+.3f})")
if master_2000 > master_500 - 0.1 and llm_2000 < llm_500 - 0.1:
    print(f"     -> CONFIRMED: Masters hold, LLM drop")
else:
    print(f"     -> MIXED: Pattern not fully confirmed")

# b) At which scale does LLM crack?
print(f"\n  b) LLM cracking point:")
for r in all_results:
    if r['category'] != 'LLM':
        continue
    prev = None
    for ws in WINDOW_SIZES:
        sc = r['scales'].get(str(ws), {})
        if sc.get('status') != 'OK':
            continue
        curr = sc['mean']
        if prev is not None and curr < prev - 0.2:
            print(f"     {r['source']}: drops at {ws}w (from {prev:.3f} to {curr:.3f})")
        prev = curr

# Save
output = {
    'phase': 'R-7',
    'step': 2,
    'title': 'Endurance Curves',
    'date': '2026-03-21',
    'window_sizes': WINDOW_SIZES,
    'n_windows': N_WINDOWS,
    'gb_params': {'n_estimators': 50, 'max_depth': 4, 'learning_rate': 0.05},
    'sources': all_results,
    'category_averages': cat_avgs,
    'summary': {
        'master_holds_llm_drops': bool(master_2000 > master_500 - 0.1 and llm_2000 < llm_500 - 0.1),
        'master_500': round(master_500, 4),
        'master_2000': round(master_2000, 4),
        'llm_500': round(llm_500, 4),
        'llm_2000': round(llm_2000, 4),
    },
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT}")
print("=" * 80)
