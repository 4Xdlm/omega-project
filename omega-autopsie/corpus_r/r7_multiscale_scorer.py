"""
OMEGA Phase R-7 Step 3 — Multi-Scale Scorer
Computes per-work: score_local (500w), score_meso (2000w), slope (endurance),
then learns alpha/beta for final score via Ridge regression.
Same GB model, same split (seed=42).
"""
import json
import math
import os
import re
import random
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score
from scipy.stats import spearmanr
from collections import defaultdict

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")
TXT_DIR = os.path.join(ROOT, "omega-autopsie/corpus_r/txt")
LLM_DIR = os.path.join(ROOT, "omega-autopsie/results_rosetta/s0/p5_test")
OUT = os.path.join(ROOT, "omega-autopsie/results_phase_r/R7_MULTISCALE_SCORER_FINAL.json")

# ═══════════════════════════════════════════════════════════════
# FEATURE COMPUTATION (same as r7_endurance_curves.py)
# ═══════════════════════════════════════════════════════════════

def r4(v): return round(v, 4)
def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)): return 0.0
    return float(v)
def mean_val(vals): return sum(vals)/len(vals) if vals else 0
def stdev_val(vals):
    if len(vals)<2: return 0
    m=mean_val(vals); return math.sqrt(sum((v-m)**2 for v in vals)/(len(vals)-1))
def count_occ(text, marker):
    c=0; p=0
    while True:
        p=text.find(marker,p)
        if p==-1: break
        c+=1; p+=len(marker)
    return c
def split_sentences(text):
    raw=re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip())>5]
def get_lower_words(text):
    return [w2 for w in text.split() for w2 in [re.sub(r"[^a-z\u00e0-\u00ff\u0153\u00e6\u00f1'-]",'',w.lower())] if len(w2)>1]

ALL_SUB={'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles',
    'quand','comme','si','puisque','parce','bien','quoique','malgre',
    'tandis','alors','lorsque','des','avant','apres','pendant','jusqu',
    'that','which','who','whom','whose','where','when','although',
    'because','since','while','until','unless','whether','after',
    'before','though','even','whereas','provided'}
EPISTEMIC_ALL=['semblait','paraissait','apparemment','peut-etre','probablement',
    'sans doute','il me semblait','comme si','on eut dit','dirait-on',
    'quelque chose','une sorte','une espece','je croyais','il croyait',
    'il lui semblait',"avait l'air","avait l'impression",
    'seemed','appeared','apparently','perhaps','probably','possibly',
    'as if','as though','something like','a kind of','sort of','might',
    'could','would have','had seemed','it seemed']
CONDITIONAL_FR=['aurait','aurait ete','eut','eut ete','serait','fut','voudrait']
PASSE_SIMPLE=['fut','eut','dit','prit','vit','alla','revint','sembla','parut']
NEG_COMPLEX=['ne...que','nul','aucun','jamais','guere','ni...ni','point',
    'nullement','en aucune facon','rien de','pas un seul']
IRONY_V3=['on eut dit',"c'etait bien la",'voila qui',"comme c'est",
    'comme il convient','naturellement','il va sans dire',"cela s'entend",'bien entendu']
ADVERSATIVE=['mais','cependant','pourtant','toutefois','neanmoins','or',
    'en revanche','au contraire','malgre','bien que','quoique',
    'but','however','yet','nevertheless','although','despite',
    'nonetheless','on the contrary','whereas']

def compute_v3_text_features(text):
    sents=split_sentences(text); f={}; txt_lower=text.lower(); n_s=max(len(sents),1)
    if sents:
        lens=[len(s.split()) for s in sents]
        f['f1_mean']=r4(mean_val(lens)); f['f1a_rhythm_variance']=r4(stdev_val(lens))
    else: f['f1_mean']=0; f['f1a_rhythm_variance']=0
    f['f9a_contradiction_rate']=r4(sum(count_occ(txt_lower,m) for m in ADVERSATIVE)/n_s)
    f['f17_knife_count']=sum(1 for s in sents if len(s.split())<=5) if len(sents)>=4 else 0
    if len(sents)>=4:
        lens19=[len(s.split()) for s in sents]; m19=mean_val(lens19); s19=stdev_val(lens19)
        f['f19a_approx_entropy']=r4(min(s19/m19 if m19>0 else 0,2.0))
    else: f['f19a_approx_entropy']=0
    if len(sents)>=10:
        l24=[len(s.split()) for s in sents]; sl=sorted(l24); n24=len(sl)
        p25=sl[n24//4]; p75=sl[3*n24//4]
        f['f24c_contrast_delta']=r4((mean_val([l for l in l24 if l>=p75]) or 0)-(mean_val([l for l in l24 if l<=p25]) or 0))
    else: f['f24c_contrast_delta']=0
    if sents:
        sc=[]; sl2=[]
        for s in sents:
            ws=s.lower().split(); sc.append(sum(1 for w in ws if re.sub(r'[.,;:!?]','',w) in ALL_SUB)); sl2.append(len(ws))
        ms=mean_val(sc); lr=sum(1 for l in sl2 if l>40)/len(sl2)
        f['f26b_long_sent_rate']=r4(lr); f['f26c_period_score']=r4(min(ms/6,1)*0.6+lr*0.4)
    else: f['f26b_long_sent_rate']=0; f['f26c_period_score']=0
    ep=sum(count_occ(txt_lower,m) for m in EPISTEMIC_ALL); er=r4(ep/n_s*100)
    cr2=r4(sum(count_occ(txt_lower,m) for m in CONDITIONAL_FR)/max(sum(count_occ(txt_lower,m) for m in PASSE_SIMPLE),1))
    nr2=r4(sum(count_occ(txt_lower,m) for m in NEG_COMPLEX)/n_s*100)
    f['f27a_epistemic_rate']=er; f['f27d_modal_score']=r4(min(er/20,1)*0.5+min(cr2/2,1)*0.3+min(nr2/10,1)*0.2)
    f['f28b_irony_density']=r4(sum(count_occ(txt_lower,m) for m in IRONY_V3)/n_s*100)
    W=100; w29=[re.sub(r'[.,;:!?\"\'\(\)\[\]]','',w.lower()) for w in text.split() if len(w)>1]
    if len(w29)>=W:
        ts=[len(set(w29[i:i+W]))/W for i in range(0,len(w29)-W+1,50)]
        tw=mean_val(ts); tsd=stdev_val(ts) if len(ts)>1 else 0
        f['f29d_ttr_score']=r4(min(tw/0.80,1)*0.7+min(tsd*5,1)*0.3)
    else: f['f29d_ttr_score']=0
    hs=split_sentences(' '.join(text.split()[:100]))
    if hs:
        hq=any(s.strip().endswith('?') for s in hs); he=any(s.strip().endswith('!') for s in hs)
        ml=mean_val([len(s.split()) for s in hs]); t35=min(1,20/max(ml,1))
        f['f35c_hook_score']=r4(t35*0.5+(0.3 if hq else 0)+(0.2 if he else 0))
    else: f['f35c_hook_score']=0
    cs=split_sentences(' '.join(text.split()[-100:]))
    if cs:
        ls=cs[-1].strip(); ee=ls.endswith('...') or ls.endswith('\u2026')
        lc=ls[-1] if ls else ''; ei=lc not in '.!?\u2026'
        ml36=mean_val([len(s.split()) for s in cs]); t36=min(1,20/max(ml36,1))
        f['f36c_cliff_score']=r4(t36*0.5+(0.3 if ee else 0)+(0.2 if ei else 0))
    else: f['f36c_cliff_score']=0
    return f

SUB_RE=[r'\bqui\b',r'\bque\b',r'\bdont\b',r'\bo\u00f9\b',r'\blorsqu',r'\bquand\b',
    r'\btandis qu',r'\bapr\u00e8s qu',r'\bavant qu',r'\bdepuis qu',r'\bpuisqu',
    r'\bparce qu',r'\bcar\b',r'\bbien qu',r'\bquoiqu',r'\bm\u00eame si\b',
    r'\bafin qu',r'\bpour qu',r'\bsi\b',r'\bcomme\b',r'\bwhich\b',r'\bwho\b',
    r'\bwhom\b',r'\bwhose\b',r'\bthat\b',r'\bwhere\b',r'\bwhen\b',r'\bwhile\b',
    r'\bbecause\b',r'\balthough\b',r'\bthough\b',r'\bsince\b',r'\bunless\b',
    r'\bwhereas\b',r'\bif\b',r'\bas\b']

def compute_depth_features(text):
    sents=split_sentences(text)
    if not sents: return {'f_pov_shift_rate':0,'f_subordination_depth':0,'f_clause_per_sentence':0}
    sc2=[sum(len(re.findall(p,s.lower(),re.I)) for p in SUB_RE) for s in sents]
    cc=[]
    for s in sents:
        lo=s.lower()
        pv=len(re.findall(r"\b(?:j[e']|tu|il|elle|on|nous|vous|ils|elles|ce|c'|qui)\s+\w+",lo))
        fe=len(re.findall(r'\b\w{3,}(?:ait|aient|ais|ions|iez|urent|\u00e8rent|erait|eraient|eront)\b',lo))
        et=len(re.findall(r'\b(?:est|\u00e9tait|fut|sera|sont|\u00e9taient|serait|f\u00fbt|soient)\b',lo))
        av=len(re.findall(r'\b(?:avait|eut|aura|avaient|auraient|aurait|e\u00fbt)\b',lo))
        cc.append(max(1,pv+int(fe*0.5)+et+av))
    fp=re.compile(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|me\b|my\b|mine\b)",re.I)
    tp=re.compile(r"\b(?:il|elle|ils|elles|lui|leur|son|sa|ses|he\b|she\b|his\b|her\b|they\b|their\b)",re.I)
    cp=re.compile(r"\b(?:on|nous|we\b|our\b|us\b)",re.I)
    sh=sum(1 for s in sents if sum([bool(fp.search(s.lower())),bool(tp.search(s.lower())),bool(cp.search(s.lower()))])>=2)
    return {'f_pov_shift_rate':r4(sh/len(sents)),'f_subordination_depth':r4(mean_val(sc2)),'f_clause_per_sentence':r4(mean_val(cc))}

STOP_FR={'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces',
    'mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur',
    'nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles',
    'me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car',
    'dans','sur','sous','avec','sans','pour','par','entre','vers','chez',
    'contre','apres','avant','pendant','depuis','que','qui','dont','ou',
    'quand','comme','si','ne','pas','plus','jamais','rien','est','sont',
    'etait','etaient','etre','avoir','avait','avaient','fait','faire','dit',
    'dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes',
    'autre','autres','meme','aussi','tres','bien','peu','trop','assez',
    'alors','encore','deja','la','ici','puis','the','a','an','and','or','but',
    'in','on','at','to','for','of','with','from','by','is','was','were','are',
    'been','be','has','had','have','do','did','does','will','would','could',
    'should','may','might','shall','can','must','it','its','he','she','they',
    'them','their','his','her','this','that','these','those','not','no','so','if','as'}
PERC_RE=re.compile(r'\b(?:voyait|sentait|entendait|regardait|ecoutait|touchait|percevait|apercut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b',re.I)
DESIR_RE=re.compile(r'\b(?:voulait|desirait|esperait|souhaitait|revait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b',re.I)
NEG_SEM=re.compile(r"\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guere|point|not|n't|never|nothing|neither|nor|without)\b",re.I)
CONC_RE=re.compile(r'\b(?:mais|pourtant|cependant|toutefois|neanmoins|malgre|quoique|although|though|however|yet|despite|nevertheless|but)\b',re.I)
IRON_RE=re.compile(r'\b(?:sans doute|bien sur|evidemment|naturellement|certes|apparently|of course|surely|indeed|certainly)\b',re.I)
CAUS_RE=re.compile(r"\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|des que|a cause|grace a|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|caused|led to|resulted)\b",re.I)
TEMP_RE=re.compile(r"\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitot|tout a coup|apres|avant|pendant|des|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b",re.I)
REAC_RE=re.compile(r"\b(?:sentit|comprit|realisa|sursauta|fremit|recula|bondit|cria|murmura|soupira|trembla|felt|understood|realized|jumped|flinched|gasped|whispered|sighed|trembled|cried|screamed|froze)\b",re.I)

def compute_semantic_features(text):
    sents=split_sentences(text); f={}
    # 1-Referential
    if len(sents)>=3:
        eps=[set(m.lower() for m in re.findall(r'\b[A-Z\u00c0-\u00dc][a-z\u00e0-\u00ff]{2,}',s)) for s in sents]
        ch=ct=0
        for i in range(len(sents)-1):
            if not eps[i]: continue
            n1=eps[i+1] if i+1<len(sents) else set(); n2=eps[i+2] if i+2<len(sents) else set()
            for e in eps[i]: ct+=1; ch+=(1 if e in n1 or e in n2 else 0)
        ec={};
        for es in eps:
            for e in es: ec[e]=ec.get(e,0)+1
        te=len(ec); orph=sum(1 for c in ec.values() if c==1)
        espan={}
        for i,es in enumerate(eps):
            for e in es:
                if e not in espan: espan[e]=[i,i]
                else: espan[e][1]=i
        spans=[s[1]-s[0]+1 for s in espan.values()]
        f['f_referent_continuity']=r4(ch/ct if ct else 0)
        f['f_referent_orphan_rate']=r4(orph/te if te else 0)
        f['f_entity_persistence']=r4(mean_val(spans)/len(sents) if spans else 0)
    else: f['f_referent_continuity']=0; f['f_referent_orphan_rate']=0; f['f_entity_persistence']=0
    # 2-Progression
    if len(sents)>=5:
        wv=[set(w for w in get_lower_words(' '.join(sents[i:i+3])) if w not in STOP_FR and len(w)>2) for i in range(len(sents)-2)]
        nr=[]; cum=set()
        for i,v in enumerate(wv):
            if i==0: cum.update(v); nr.append(1.0); continue
            new=sum(1 for w in v if w not in cum); cum.update(v)
            nr.append(new/len(v) if v else 0)
        f['f_lexical_progression']=r4(mean_val(nr[1:]) if len(nr)>1 else 0)
        f['f_semantic_stagnation']=r4(sum(1 for r in nr[1:] if r<0.10)/max(len(nr)-1,1))
        n=len(nr); xm=(n-1)/2; ym=mean_val(nr)
        num=sum((i-xm)*(nr[i]-ym) for i in range(n)); den=sum((i-xm)**2 for i in range(n))
        f['f_novelty_curve_slope']=r4(num/den if den else 0)
    else: f['f_lexical_progression']=0; f['f_semantic_stagnation']=0; f['f_novelty_curve_slope']=0
    # 3-Contextual precision
    if len(sents)>=3:
        aw=[w for s in sents for w in get_lower_words(s) if w not in STOP_FR and len(w)>2]
        freq={}
        for w in aw: freq[w]=freq.get(w,0)+1
        if len(aw)>=10:
            rare={w for w,c in freq.items() if c<=2}; sup=iso=tr=0
            for s in sents:
                wds=[w for w in get_lower_words(s) if w not in STOP_FR and len(w)>2]
                for i,w in enumerate(wds):
                    if w not in rare: continue
                    tr+=1; st=w[:min(4,len(w))]; found=False
                    for j in range(max(0,i-5),min(len(wds),i+6)):
                        if j==i: continue
                        nb=wds[j]
                        if nb[:min(4,len(nb))]==st or nb in rare: found=True; break
                    if found: sup+=1
                    else: iso+=1
            f['f_contextual_precision']=r4(sup/tr if tr else 0)
            f['f_rare_word_isolation']=r4(iso/tr if tr else 0)
        else: f['f_contextual_precision']=0; f['f_rare_word_isolation']=0
    else: f['f_contextual_precision']=0; f['f_rare_word_isolation']=0
    # 4-Originality
    words=[w for w in get_lower_words(text) if w not in STOP_FR and len(w)>2]
    if len(words)>=10:
        freq2={}
        for w in words: freq2[w]=freq2.get(w,0)+1
        f['f_hapax_contextual_rate']=r4(sum(1 for c in freq2.values() if c==1)/len(words))
        f['f_vocabulary_depth']=r4(sum(1 for c in freq2.values() if 2<=c<=3)/max(len(freq2),1))
    else: f['f_hapax_contextual_rate']=0; f['f_vocabulary_depth']=0
    # 5-Tension
    if len(sents)>=3:
        ts=dn=pc=0
        for s in sents:
            lo=s.lower()
            hp=bool(PERC_RE.search(lo)); hd=bool(DESIR_RE.search(lo))
            hn=bool(NEG_SEM.search(lo)); hc=bool(CONC_RE.search(lo)); hi=bool(IRON_RE.search(lo))
            if sum([hp,hd,hn,hc,hi])>=2: ts+=1
            if hd and hn: dn+=1
            if hp and (hn or hc): pc+=1
        f['f_tension_density']=r4(ts/len(sents)); f['f_desire_negation_rate']=r4(dn/len(sents))
        f['f_perception_conflict_rate']=r4(pc/len(sents))
    else: f['f_tension_density']=0; f['f_desire_negation_rate']=0; f['f_perception_conflict_rate']=0
    # 6-POV contamination
    if len(sents)>=5:
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
        povs=[cpov(s) for s in sents]; dr=ru=0; last='0'
        for p in povs:
            if p=='0': continue
            if last!='0' and last!=p:
                if (last=='1' and p=='3') or (last=='3' and p=='1'): ru+=1
                else: dr+=1
            last=p
        nz=sum(1 for p in povs if p!='0')
        f['f_pov_drift_rate']=r4(dr/max(nz-1,1)); f['f_pov_rupture_rate']=r4(ru/max(nz-1,1))
        pc3={}
        for p in povs:
            if p=='0': continue
            pc3[p]=pc3.get(p,0)+1
        f['f_pov_stability']=r4(max(pc3.values(),default=0)/max(nz,1))
    else: f['f_pov_drift_rate']=0; f['f_pov_rupture_rate']=0; f['f_pov_stability']=0
    # 7-Causal
    if len(sents)>=3:
        cs=ta=0; ch2=0; chains=[]
        for s in sents:
            lo=s.lower(); hca=bool(CAUS_RE.search(lo)); ht=bool(TEMP_RE.search(lo)); hr=bool(REAC_RE.search(lo))
            if hca or hr: cs+=1; ch2+=1
            else:
                if ch2>0: chains.append(ch2)
                ch2=0
            if ht: ta+=1
        if ch2>0: chains.append(ch2)
        f['f_causal_density']=r4(cs/len(sents))
        f['f_causal_chain_length']=r4(mean_val(chains) if chains else 0)
        f['f_temporal_anchor_rate']=r4(ta/len(sents))
    else: f['f_causal_density']=0; f['f_causal_chain_length']=0; f['f_temporal_anchor_rate']=0
    # 8-Relational
    if len(sents)>=3:
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
        f['f_echo_density']=r4(ec2/tcw if tcw else 0); f['f_lexical_callback_rate']=r4(cb/tcw if tcw else 0)
        rep=[(w,pos) for w,pos in wp.items() if len(pos)>=2]; gv=[]
        for w,pos in rep:
            gaps=[pos[i]-pos[i-1] for i in range(1,len(pos))]
            if len(gaps)>1: gm=mean_val(gaps); gv.append(sum((g-gm)**2 for g in gaps)/(len(gaps)-1))
            elif gaps: gv.append(0)
        f['f_motif_concentration']=r4(min(1,mean_val(gv)/20) if gv else 0)
    else: f['f_echo_density']=0; f['f_lexical_callback_rate']=0; f['f_motif_concentration']=0
    return f

V3_FEATURES=['f26b_long_sent_rate','f1a_rhythm_variance','f1_mean','f24c_contrast_delta',
    'f28b_irony_density','f27a_epistemic_rate','f9a_contradiction_rate','f19a_approx_entropy',
    'f27d_modal_score','f26c_period_score','f_pov_shift_rate','f_subordination_depth',
    'f_clause_per_sentence','f17_knife_count','f29d_ttr_score','f35c_hook_score','f36c_cliff_score',
    'ix_mean_x_subdepth','ix_pov_x_irony','ix_variance_x_longrate']
SEMANTIC_FEATURES=['f_referent_continuity','f_referent_orphan_rate','f_entity_persistence',
    'f_lexical_progression','f_semantic_stagnation','f_novelty_curve_slope',
    'f_contextual_precision','f_rare_word_isolation','f_hapax_contextual_rate','f_vocabulary_depth',
    'f_tension_density','f_desire_negation_rate','f_perception_conflict_rate',
    'f_pov_drift_rate','f_pov_rupture_rate','f_pov_stability',
    'f_causal_density','f_causal_chain_length','f_temporal_anchor_rate',
    'f_echo_density','f_lexical_callback_rate','f_motif_concentration']
ALL_FEATURES=V3_FEATURES+SEMANTIC_FEATURES

def compute_all_features(text):
    f={}; f.update(compute_v3_text_features(text)); f.update(compute_depth_features(text))
    f.update(compute_semantic_features(text))
    f['ix_mean_x_subdepth']=f.get('f1_mean',0)*f.get('f_subordination_depth',0)
    f['ix_pov_x_irony']=f.get('f_pov_shift_rate',0)*f.get('f28b_irony_density',0)
    f['ix_variance_x_longrate']=f.get('f1a_rhythm_variance',0)*f.get('f26b_long_sent_rate',0)
    return f

def extract_windows(text, window_size, n_windows=5):
    words=text.split(); total=len(words)
    if total<window_size: return None
    positions=[i/(n_windows+1) for i in range(1,n_windows+1)]
    windows=[]
    for pos in positions:
        center=int(total*pos); start=max(0,center-window_size//2)
        end=min(total,start+window_size)
        if end-start<window_size: start=max(0,end-window_size)
        windows.append(' '.join(words[start:end]))
    return windows

# ═══════════════════════════════════════════════════════════════
# TRAIN GB MODEL
# ═══════════════════════════════════════════════════════════════

print("Loading corpus + training GB...")
with open(MASTER,'r',encoding='utf-8') as f: master=json.load(f)
with open(DEPTH,'r',encoding='utf-8') as f: depth_data=json.load(f)
with open(TIERS,'r',encoding='utf-8') as f: tiers_data=json.load(f)
with open(SEMANTIC,'r',encoding='utf-8') as f: semantic_data=json.load(f)

tier_lookup={e['filename']:e.get('tier_suggestion','?') for e in tiers_data}
depth_lookup={e['filename']:e['depth_features'] for e in depth_data}
semantic_lookup={e['filename']:e['semantic_features'] for e in semantic_data}
author_lookup={e['filename']:e.get('author_guess','') for e in tiers_data}
TIER_RANK={'S':5,'A':4,'B':3,'C':2,'D':1}

ORIG_F=['f26b_long_sent_rate','f1a_rhythm_variance','f1_mean','f24c_contrast_delta',
        'f28b_irony_density','f27a_epistemic_rate','f9a_contradiction_rate',
        'f19a_approx_entropy','f27d_modal_score','f26c_period_score']
DEPTH_F=['f_pov_shift_rate','f_subordination_depth','f_clause_per_sentence']
SUSPECT_F=['f17_knife_count','f29d_ttr_score','f35c_hook_score','f36c_cliff_score']

data_corpus=[]
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

random.seed(42)
indices=list(range(len(data_corpus))); random.shuffle(indices)
n_train=int(len(data_corpus)*0.70); n_val=int(len(data_corpus)*0.15)
train_idx=indices[:n_train]; val_idx=indices[n_train:n_train+n_val]; hold_idx=indices[n_train+n_val:]

X_train=np.array([[data_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in train_idx])
y_train=np.array([data_corpus[i][1] for i in train_idx])

gb=GradientBoostingRegressor(n_estimators=50,max_depth=4,learning_rate=0.05,
                             random_state=42,subsample=0.8,min_samples_leaf=5)
gb.fit(X_train,y_train)
print(f"  GB trained on {len(train_idx)} samples.")

def score_window(text):
    feats=compute_all_features(text)
    X=np.array([[feats.get(f,0) for f in ALL_FEATURES]])
    return float(gb.predict(X)[0])

# ═══════════════════════════════════════════════════════════════
# COMPUTE MULTI-SCALE SCORES FOR ALL 571 WORKS
# ═══════════════════════════════════════════════════════════════

print("\nComputing multi-scale scores for 571 works...")
SCALES_FOR_SLOPE = [500, 2000, 5000]

multiscale_data = []  # (score_local, score_meso, slope, tier_rank, filename)

for idx, entry in enumerate(master):
    fn = entry['filename']
    tier = entry.get('tier') or tier_lookup.get(fn, '?')
    if tier not in TIER_RANK:
        continue

    txt_path = os.path.join(TXT_DIR, fn)
    if not os.path.exists(txt_path):
        continue

    with open(txt_path, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    wc = len(text.split())

    # Score local (500w)
    w500 = extract_windows(text, 500, 5)
    if w500:
        scores_500 = [score_window(w) for w in w500]
        score_local = mean_val(scores_500)
        std_local = stdev_val(scores_500)
    else:
        score_local = 0; std_local = 0; scores_500 = []

    # Score meso (2000w)
    w2000 = extract_windows(text, 2000, 5)
    if w2000:
        scores_2000 = [score_window(w) for w in w2000]
        score_meso = mean_val(scores_2000)
        std_meso = stdev_val(scores_2000)
    else:
        score_meso = score_local; std_meso = std_local; scores_2000 = []

    # Slope (endurance) = linear regression of score vs log(scale)
    scale_points = []
    if w500:
        scale_points.append((500, score_local))
    if w2000:
        scale_points.append((2000, score_meso))
    w5000 = extract_windows(text, 5000, 5)
    if w5000:
        s5k = [score_window(w) for w in w5000]
        scale_points.append((5000, mean_val(s5k)))

    if len(scale_points) >= 2:
        # Linear regression on log(scale)
        xs = [math.log(sp[0]) for sp in scale_points]
        ys = [sp[1] for sp in scale_points]
        xm = mean_val(xs); ym = mean_val(ys)
        num = sum((xs[i]-xm)*(ys[i]-ym) for i in range(len(xs)))
        den = sum((xs[i]-xm)**2 for i in range(len(xs)))
        slope = num/den if den > 0 else 0
    else:
        slope = 0

    multiscale_data.append({
        'filename': fn,
        'tier': tier,
        'tier_rank': TIER_RANK[tier],
        'word_count': wc,
        'score_local': round(score_local, 4),
        'score_meso': round(score_meso, 4),
        'slope': round(slope, 4),
        'std_local': round(std_local, 4),
        'std_meso': round(std_meso, 4),
        'has_meso': bool(w2000),
        'has_slope': len(scale_points) >= 2,
    })

    if (idx+1) % 100 == 0:
        print(f"  {idx+1}/{len(master)} done")

print(f"  {len(multiscale_data)} works scored.")

# ═══════════════════════════════════════════════════════════════
# LEARN alpha/beta: final = alpha*meso + beta*slope + intercept
# ═══════════════════════════════════════════════════════════════

print("\nLearning alpha/beta...")

# Build matrices using same split
ms_lookup = {d['filename']: d for d in multiscale_data}

def build_ms_matrices(idx_list):
    X = []; y = []; fns = []
    for i in idx_list:
        row, rank, fn = data_corpus[i]
        d = ms_lookup.get(fn)
        if d is None or not d['has_meso']:
            continue
        X.append([d['score_meso'], d['slope']])
        y.append(rank)
        fns.append(fn)
    return np.array(X), np.array(y), fns

X_tr_ms, y_tr_ms, fn_tr_ms = build_ms_matrices(train_idx)
X_val_ms, y_val_ms, fn_val_ms = build_ms_matrices(val_idx)
X_hold_ms, y_hold_ms, fn_hold_ms = build_ms_matrices(hold_idx)
X_all_ms, y_all_ms, fn_all_ms = build_ms_matrices(list(range(len(data_corpus))))

print(f"  Train: {len(X_tr_ms)}, Val: {len(X_val_ms)}, Hold: {len(X_hold_ms)}, All: {len(X_all_ms)}")

# Grid search Ridge lambda
best_lam = 0.1; best_r2 = -999
for lam in [0.001, 0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0]:
    model = Ridge(alpha=lam)
    model.fit(X_tr_ms, y_tr_ms)
    pred = model.predict(X_val_ms)
    r2 = r2_score(y_val_ms, pred)
    if r2 > best_r2:
        best_r2 = r2; best_lam = lam

print(f"  Best lambda: {best_lam}")

final_model = Ridge(alpha=best_lam)
final_model.fit(X_tr_ms, y_tr_ms)

alpha = final_model.coef_[0]
beta = final_model.coef_[1]
intercept = final_model.intercept_

print(f"  alpha (meso weight): {alpha:.4f}")
print(f"  beta (slope weight): {beta:.4f}")
print(f"  intercept: {intercept:.4f}")
print(f"  Formula: final = {alpha:.4f} * score_meso + {beta:.4f} * slope + {intercept:.4f}")

# ═══════════════════════════════════════════════════════════════
# EVALUATE MULTI-SCALE SCORER
# ═══════════════════════════════════════════════════════════════

def evaluate_ms(X, y, fns, label):
    pred = final_model.predict(X)
    r2 = r2_score(y, pred)
    rho, _ = spearmanr(pred, y)
    # Tier means
    tm = defaultdict(list)
    tier_map = {5:'S',4:'A',3:'B',2:'C',1:'D'}
    for i in range(len(y)):
        tm[tier_map[y[i]]].append(pred[i])
    means = {t: round(mean_val(v),4) for t,v in tm.items()}
    # S vs D inversions
    sp = tm.get('S',[]); dp = tm.get('D',[])
    inv = sum(1 for d in dp for s in sp if d >= s)
    total_pairs = len(sp)*len(dp) if dp else 0
    print(f"\n  {label}: R2={r2:.4f}  Spearman={rho:.4f}  S-D inv={inv}/{total_pairs}")
    print(f"    Tier means: S={means.get('S',0):.3f} A={means.get('A',0):.3f} B={means.get('B',0):.3f} C={means.get('C',0):.3f} D={means.get('D',0):.3f}")
    return {'r2':round(r2,4),'spearman':round(rho,4),'inversions_s_vs_d':inv,
            'total_pairs':total_pairs,'tier_means':means}

print(f"\n{'='*70}")
print("  MULTI-SCALE SCORER EVALUATION")
print(f"{'='*70}")

res_train = evaluate_ms(X_tr_ms, y_tr_ms, fn_tr_ms, "TRAIN")
res_val = evaluate_ms(X_val_ms, y_val_ms, fn_val_ms, "VALIDATION")
res_hold = evaluate_ms(X_hold_ms, y_hold_ms, fn_hold_ms, "HOLDOUT")
res_full = evaluate_ms(X_all_ms, y_all_ms, fn_all_ms, "FULL")

# Author diagnostic
print(f"\n  AUTHOR DIAGNOSTIC:")
target_authors = {'flaubert':'Flaubert','proust':'Proust','hugo':'Hugo','camus':'Camus',
                  'zola':'Zola','claude':'Claude Opus','gpt':'GPT','riviera':'Riviera',
                  'gemini':'Gemini','perplexity':'Perplexity'}
author_diag = {}
for i, fn in enumerate(fn_all_ms):
    fn_lower = fn.lower()
    author_name = author_lookup.get(fn, '').lower()
    for key, label in target_authors.items():
        if key in fn_lower or key in author_name:
            if label not in author_diag:
                author_diag[label] = {'preds': [], 'true': []}
            pred = final_model.predict(X_all_ms[i:i+1])[0]
            author_diag[label]['preds'].append(pred)
            author_diag[label]['true'].append(y_all_ms[i])
            break

print(f"  {'Author':<20} {'Mean Pred':>10} {'True':>6} {'Count':>6}")
print(f"  {'-'*20} {'-'*10} {'-'*6} {'-'*6}")
author_results = {}
for label in ['Flaubert','Proust','Hugo','Camus','Zola','Claude Opus','GPT','Riviera','Gemini']:
    d = author_diag.get(label)
    if not d: continue
    mp = mean_val(d['preds'])
    mt = mean_val(d['true'])
    author_results[label] = {'mean_pred': round(mp,4), 'mean_true': round(mt,4), 'count': len(d['preds'])}
    print(f"  {label:<20} {mp:>10.3f} {mt:>6.1f} {len(d['preds']):>6}")

# Critical test
fl = author_results.get('Flaubert', {}).get('mean_pred', 0)
cl = author_results.get('Claude Opus', {}).get('mean_pred', 0)
gap = fl - cl
print(f"\n  CRITICAL: Flaubert={fl:.3f}  Claude Opus={cl:.3f}  gap={gap:+.3f}  {'FLAUBERT WINS' if gap>0 else 'OPUS WINS'}")

# ═══════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════

output = {
    'phase': 'R-7',
    'step': 3,
    'title': 'Multi-Scale Scorer Final',
    'date': '2026-03-21',
    'model': {
        'formula': f'final = {alpha:.6f} * score_meso + {beta:.6f} * slope + {intercept:.6f}',
        'alpha': round(float(alpha), 6),
        'beta': round(float(beta), 6),
        'intercept': round(float(intercept), 6),
        'ridge_lambda': best_lam,
        'gb_params': {'n_estimators': 50, 'max_depth': 4, 'learning_rate': 0.05},
    },
    'performance': {
        'train': res_train,
        'validation': res_val,
        'holdout': res_hold,
        'full': res_full,
    },
    'author_diagnostic': author_results,
    'critical_test': {
        'flaubert_pred': round(fl, 4),
        'claude_opus_pred': round(cl, 4),
        'gap': round(gap, 4),
        'flaubert_wins': bool(gap > 0),
    },
    'verdicts': {
        'spearman_above_080': bool(res_full['spearman'] > 0.80),
        'zero_sd_inversions': bool(res_full['inversions_s_vs_d'] == 0),
        'flaubert_above_opus': bool(gap > 0),
    },
    'per_work_scores': multiscale_data,
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT}")

# Final verdict
print(f"\n{'='*70}")
v = output['verdicts']
passes = sum(v.values())
total_checks = len(v)
print(f"  VERDICTS: {passes}/{total_checks} PASS")
for k, passed in v.items():
    print(f"    [{'PASS' if passed else 'FAIL'}] {k}")
if passes == total_checks:
    print(f"\n  R-7 STEP 3: ALL PASS")
elif passes >= 2:
    print(f"\n  R-7 STEP 3: PASS PARTIEL ({passes}/{total_checks})")
else:
    print(f"\n  R-7 STEP 3: FAIL ({passes}/{total_checks})")
print(f"{'='*70}")
