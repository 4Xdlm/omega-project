"""
OMEGA — TRIBUNAL GB V1
Score prose files from DualBench with the official GB V1 scorer.

Usage:
  python tribunal_gb_v1.py <prose_dir>
  python tribunal_gb_v1.py C:/Users/elric/.../DualBench_API_.../prose

Same GB model as r7_multiscale_scorer_v2.py:
  n_estimators=50, max_depth=4, lr=0.05, seed=42, subsample=0.8
  42 features (20 V3 + 22 semantic)
  Trained on 70% of 611 corpus works
"""
import json, math, os, re, sys, random
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from scipy.stats import spearmanr

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")

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
    return [s.strip() for s in re.split(r'(?<=[.!?\u2026\u00bb])\s+', text) if len(s.strip())>5]

# ═══════════════════════════════════════════════════════════
# MARKER SETS (exact copy from r7_multiscale_scorer_v2.py)
# ═══════════════════════════════════════════════════════════
ALL_SUB={'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles','quand','comme','si','puisque','parce','bien','quoique','malgre','tandis','alors','lorsque','des','avant','apres','pendant','jusqu','that','which','who','whom','whose','where','when','although','because','since','while','until','unless','whether','after','before','though','even','whereas','provided'}
EPISTEMIC_ALL=['semblait','paraissait','apparemment','peut-etre','probablement','sans doute','il me semblait','comme si','on eut dit','dirait-on','quelque chose','une sorte','une espece','je croyais','il croyait','il lui semblait',"avait l'air","avait l'impression",'seemed','appeared','apparently','perhaps','probably','possibly','as if','as though','something like','a kind of','sort of','might','could','would have','had seemed','it seemed']
CONDITIONAL_FR=['aurait','aurait ete','eut','eut ete','serait','fut','voudrait']
PASSE_SIMPLE=['fut','eut','dit','prit','vit','alla','revint','sembla','parut']
NEG_COMPLEX=['ne...que','nul','aucun','jamais','guere','ni...ni','point','nullement','en aucune facon','rien de','pas un seul']
IRONY_V3=['on eut dit',"c'etait bien la",'voila qui',"comme c'est",'comme il convient','naturellement','il va sans dire',"cela s'entend",'bien entendu']
ADVERSATIVE=['mais','cependant','pourtant','toutefois','neanmoins','or','en revanche','au contraire','malgre','bien que','quoique','but','however','yet','nevertheless','although','despite','nonetheless','on the contrary','whereas']
STOP_FR={'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces','mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur','nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car','dans','sur','sous','avec','sans','pour','par','entre','vers','chez','contre','apres','avant','pendant','depuis','que','qui','dont','ou','quand','comme','si','ne','pas','plus','jamais','rien','est','sont','etait','etaient','etre','avoir','avait','avaient','fait','faire','dit','dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes','autre','autres','meme','aussi','tres','bien','peu','trop','assez','alors','encore','deja','la','ici','puis','the','a','an','and','or','but','in','on','at','to','for','of','with','from','by','is','was','were','are','been','be','has','had','have','do','did','does','will','would','could','should','may','might','shall','can','must','it','its','he','she','they','them','their','his','her','this','that','these','those','not','no','so','if','as'}

# ═══════════════════════════════════════════════════════════
# FEATURE COMPUTATION (exact copy from r7_multiscale_scorer_v2.py)
# ═══════════════════════════════════════════════════════════

def compute_v3_text_features(text):
    sents=split_sentences(text); f={}; tl=text.lower(); ns=max(len(sents),1)
    if sents:
        lens=[len(s.split()) for s in sents]; f['f1_mean']=r4(mean_val(lens)); f['f1a_rhythm_variance']=r4(stdev_val(lens))
    else: f['f1_mean']=0; f['f1a_rhythm_variance']=0
    f['f9a_contradiction_rate']=r4(sum(count_occ(tl,m) for m in ADVERSATIVE)/ns)
    f['f17_knife_count']=sum(1 for s in sents if len(s.split())<=5) if len(sents)>=4 else 0
    if len(sents)>=4:
        l19=[len(s.split()) for s in sents]; m19=mean_val(l19); s19=stdev_val(l19)
        f['f19a_approx_entropy']=r4(min(s19/m19 if m19>0 else 0,2.0))
    else: f['f19a_approx_entropy']=0
    if len(sents)>=10:
        l24=[len(s.split()) for s in sents]; sl=sorted(l24); n=len(sl)
        f['f24c_contrast_delta']=r4((mean_val([l for l in l24 if l>=sl[3*n//4]]) or 0)-(mean_val([l for l in l24 if l<=sl[n//4]]) or 0))
    else: f['f24c_contrast_delta']=0
    if sents:
        sc=[]; sl2=[]
        for s in sents:
            ws=s.lower().split(); sc.append(sum(1 for w in ws if re.sub(r'[.,;:!?]','',w) in ALL_SUB)); sl2.append(len(ws))
        ms=mean_val(sc); lr=sum(1 for l in sl2 if l>40)/len(sl2)
        f['f26b_long_sent_rate']=r4(lr); f['f26c_period_score']=r4(min(ms/6,1)*0.6+lr*0.4)
    else: f['f26b_long_sent_rate']=0; f['f26c_period_score']=0
    ep=sum(count_occ(tl,m) for m in EPISTEMIC_ALL); er=r4(ep/ns*100)
    cr=r4(sum(count_occ(tl,m) for m in CONDITIONAL_FR)/max(sum(count_occ(tl,m) for m in PASSE_SIMPLE),1))
    nr=r4(sum(count_occ(tl,m) for m in NEG_COMPLEX)/ns*100)
    f['f27a_epistemic_rate']=er; f['f27d_modal_score']=r4(min(er/20,1)*0.5+min(cr/2,1)*0.3+min(nr/10,1)*0.2)
    f['f28b_irony_density']=r4(sum(count_occ(tl,m) for m in IRONY_V3)/ns*100)
    W=100; w29=[re.sub(r'[.,;:!?\"\'\(\)\[\]]','',w.lower()) for w in text.split() if len(w)>1]
    if len(w29)>=W:
        ts=[len(set(w29[i:i+W]))/W for i in range(0,len(w29)-W+1,50)]
        f['f29d_ttr_score']=r4(min(mean_val(ts)/0.80,1)*0.7+min((stdev_val(ts) if len(ts)>1 else 0)*5,1)*0.3)
    else: f['f29d_ttr_score']=0
    hs=split_sentences(' '.join(text.split()[:100]))
    f['f35c_hook_score']=r4(min(1,20/max(mean_val([len(s.split()) for s in hs]),1))*0.5+(0.3 if any(s.strip().endswith('?') for s in hs) else 0)+(0.2 if any(s.strip().endswith('!') for s in hs) else 0)) if hs else 0
    cs=split_sentences(' '.join(text.split()[-100:]))
    if cs:
        ls=cs[-1].strip(); f['f36c_cliff_score']=r4(min(1,20/max(mean_val([len(s.split()) for s in cs]),1))*0.5+(0.3 if ls.endswith('...') or ls.endswith('\u2026') else 0)+(0.2 if ls[-1:] not in '.!?\u2026' else 0))
    else: f['f36c_cliff_score']=0
    return f

def compute_depth_features(text):
    sents=split_sentences(text); f={}
    if not sents: return {'f_pov_shift_rate':0,'f_subordination_depth':0,'f_clause_per_sentence':0}
    pov_markers={'1st':re.compile(r"\b(?:je|j'|me|m'|moi|nous|my|mine|i|we|us|our)\b",re.I),
                 '3rd':re.compile(r"\b(?:il|elle|ils|elles|lui|leur|on|he|she|they|them|his|her|its|their)\b",re.I)}
    povs=[]
    for s in sents:
        c1=len(pov_markers['1st'].findall(s)); c3=len(pov_markers['3rd'].findall(s))
        povs.append('1st' if c1>c3 else '3rd' if c3>c1 else 'neutral')
    shifts=sum(1 for i in range(1,len(povs)) if povs[i]!=povs[i-1] and 'neutral' not in (povs[i],povs[i-1]))
    f['f_pov_shift_rate']=r4(shifts/max(len(sents)-1,1))
    sub_counts=[]
    for s in sents:
        ws=s.lower().split(); sc_=sum(1 for w in ws if re.sub(r'[.,;:!?]','',w) in ALL_SUB)
        sub_counts.append(sc_/max(len(ws),1))
    f['f_subordination_depth']=r4(mean_val(sub_counts))
    f['f_clause_per_sentence']=r4(mean_val([max(1,sum(1 for w in s.lower().split() if re.sub(r'[.,;:!?]','',w) in ALL_SUB)+1) for s in sents]))
    return f

def compute_semantic_features(text):
    sents=split_sentences(text); f={}; tl=text.lower(); ns=max(len(sents),1)
    words=[w for w in text.split() if w]; nw=max(len(words),1)
    lw=[re.sub(r'[^a-z\u00e0-\u00ff]','',w.lower()) for w in words if len(w)>1]
    lw=[w for w in lw if w and w not in STOP_FR]; nlw=max(len(lw),1)
    # referent features
    entities=set()
    for w in lw:
        if len(w)>3 and w[0].islower()==False: entities.add(w)
    W=50
    if len(lw)>=W*2:
        chunks=[lw[i:i+W] for i in range(0,len(lw)-W+1,W//2)]
        if len(chunks)>=2:
            overlaps=[len(set(chunks[i])&set(chunks[i+1]))/W for i in range(len(chunks)-1)]
            f['f_referent_continuity']=r4(mean_val(overlaps))
        else: f['f_referent_continuity']=0
    else: f['f_referent_continuity']=0
    hapax=set(); seen=set()
    for w in lw:
        if w in seen: hapax.discard(w)
        else: seen.add(w); hapax.add(w)
    orphan_rate=len(hapax)/nlw if nlw>0 else 0
    f['f_referent_orphan_rate']=r4(orphan_rate)
    cap_words=[w for w in words if len(w)>2 and w[0].isupper() and not w.isupper()]
    if cap_words:
        cap_set=set(w.lower() for w in cap_words)
        cap_freq={w:sum(1 for cw in cap_words if cw.lower()==w) for w in cap_set}
        persist=sum(1 for c in cap_freq.values() if c>=2)/max(len(cap_set),1)
        f['f_entity_persistence']=r4(persist)
    else: f['f_entity_persistence']=0
    # novelty features
    if len(lw)>=W*3:
        chunks2=[set(lw[i:i+W]) for i in range(0,len(lw)-W+1,W)]
        nr=[len(chunks2[i]-chunks2[i-1])/W for i in range(1,len(chunks2))]
        f['f_lexical_progression']=r4(mean_val(nr) if nr else 0)
        f['f_semantic_stagnation']=r4(sum(1 for r in nr[1:] if r<0.10)/max(len(nr)-1,1) if len(nr)>1 else 0)
        if len(nr)>=2:
            xs=list(range(len(nr))); xm=mean_val(xs); ym=mean_val(nr)
            num=sum((xs[i]-xm)*(nr[i]-ym) for i in range(len(xs)))
            den=sum((xs[i]-xm)**2 for i in range(len(xs)))
            f['f_novelty_curve_slope']=r4(num/den if den>0 else 0)
        else: f['f_novelty_curve_slope']=0
    else: f['f_lexical_progression']=0; f['f_semantic_stagnation']=0; f['f_novelty_curve_slope']=0
    # contextual precision
    if len(lw)>=W:
        windows=[lw[i:i+W] for i in range(0,len(lw)-W+1,W)]
        rarities=[]
        for win in windows:
            freq={w:win.count(w) for w in set(win)}
            rare=sum(1 for w,c in freq.items() if c==1)/len(win)
            rarities.append(rare)
        f['f_contextual_precision']=r4(mean_val(rarities))
        f['f_rare_word_isolation']=r4(stdev_val(rarities) if len(rarities)>1 else 0)
    else: f['f_contextual_precision']=0; f['f_rare_word_isolation']=0
    f['f_hapax_contextual_rate']=r4(len(hapax)/nlw if nlw>0 else 0)
    unique_ratio=len(set(lw))/nlw if nlw>0 else 0
    f['f_vocabulary_depth']=r4(unique_ratio)
    # tension/desire/perception
    TENSION_RE=re.compile(r'\b(?:soudain|brusquement|tout a coup|alors|aussitot|suddenly|abruptly|immediately)\b',re.I)
    DESIR_RE=re.compile(r'\b(?:voulait|desirait|esperait|souhaitait|revait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b',re.I)
    NEG_SEM=re.compile(r"\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guere|point|not|n't|never|nothing|neither|nor|without)\b",re.I)
    PERC_RE=re.compile(r'\b(?:voyait|sentait|entendait|regardait|ecoutait|touchait|percevait|apercut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b',re.I)
    f['f_tension_density']=r4(len(TENSION_RE.findall(tl))/ns)
    dn=sum(1 for s in sents if DESIR_RE.search(s) and NEG_SEM.search(s))
    f['f_desire_negation_rate']=r4(dn/ns)
    pc=sum(1 for s in sents if PERC_RE.search(s) and re.search(r'\b(?:mais|pourtant|cependant|yet|but|however)\b',s,re.I))
    f['f_perception_conflict_rate']=r4(pc/ns)
    # POV drift
    pov_markers2={'1st':re.compile(r"\b(?:je|j'|me|m'|moi|nous|my|mine|i|we|us|our)\b",re.I),
                  '3rd':re.compile(r"\b(?:il|elle|ils|elles|lui|leur|on|he|she|they|them|his|her|its|their)\b",re.I)}
    povs2=[]
    for s in sents:
        c1=len(pov_markers2['1st'].findall(s)); c3=len(pov_markers2['3rd'].findall(s))
        povs2.append('1st' if c1>c3 else '3rd' if c3>c1 else 'neutral')
    transitions=sum(1 for i in range(1,len(povs2)) if povs2[i]!=povs2[i-1])
    f['f_pov_drift_rate']=r4(transitions/max(len(sents)-1,1))
    ruptures=sum(1 for i in range(1,len(povs2)) if povs2[i]!=povs2[i-1] and 'neutral' not in (povs2[i],povs2[i-1]))
    f['f_pov_rupture_rate']=r4(ruptures/max(len(sents)-1,1))
    if len(povs2)>=4:
        mode_counts={'1st':0,'3rd':0,'neutral':0}
        for p in povs2: mode_counts[p]=mode_counts.get(p,0)+1
        dominant=max(mode_counts,key=mode_counts.get)
        f['f_pov_stability']=r4(mode_counts[dominant]/len(povs2))
    else: f['f_pov_stability']=1.0
    # causal
    CAUS_RE=re.compile(r"\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|des que|a cause|grace a|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|caused|led to|resulted)\b",re.I)
    caus_count=len(CAUS_RE.findall(tl))
    f['f_causal_density']=r4(caus_count/ns)
    chains=0; cur=0
    for s in sents:
        if CAUS_RE.search(s): cur+=1; chains=max(chains,cur)
        else: cur=0
    f['f_causal_chain_length']=chains
    # temporal
    TEMP_RE=re.compile(r"\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitot|tout a coup|apres|avant|pendant|des|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b",re.I)
    f['f_temporal_anchor_rate']=r4(len(TEMP_RE.findall(tl))/ns)
    # echo/callback
    if len(lw)>=100:
        first50=set(lw[:50]); last50=set(lw[-50:])
        echo=len(first50&last50-STOP_FR)/max(len(first50-STOP_FR),1)
        f['f_echo_density']=r4(echo)
        mid_start=len(lw)//4; mid_end=3*len(lw)//4
        mid_set=set(lw[mid_start:mid_end])
        callbacks=len(first50&set(lw[-50:])-mid_set-STOP_FR)
        f['f_lexical_callback_rate']=r4(callbacks/max(len(first50-STOP_FR),1))
        chunk_sz=max(len(lw)//5,10)
        chunks3=[set(lw[i:i+chunk_sz]) for i in range(0,len(lw),chunk_sz)]
        gv=[]
        for w in first50-STOP_FR:
            gaps=[]; last_seen=0
            for ci,ch in enumerate(chunks3):
                if w in ch:
                    if last_seen>0: gaps.append(ci-last_seen)
                    last_seen=ci
            if gaps: gv.append(mean_val(gaps))
            elif gaps: gv.append(0)
        f['f_motif_concentration']=r4(min(1,mean_val(gv)/20) if gv else 0)
    else: f['f_echo_density']=0; f['f_lexical_callback_rate']=0; f['f_motif_concentration']=0
    return f

V3_FEATURES=['f26b_long_sent_rate','f1a_rhythm_variance','f1_mean','f24c_contrast_delta','f28b_irony_density','f27a_epistemic_rate','f9a_contradiction_rate','f19a_approx_entropy','f27d_modal_score','f26c_period_score','f_pov_shift_rate','f_subordination_depth','f_clause_per_sentence','f17_knife_count','f29d_ttr_score','f35c_hook_score','f36c_cliff_score','ix_mean_x_subdepth','ix_pov_x_irony','ix_variance_x_longrate']
SEMANTIC_FEATURES=['f_referent_continuity','f_referent_orphan_rate','f_entity_persistence','f_lexical_progression','f_semantic_stagnation','f_novelty_curve_slope','f_contextual_precision','f_rare_word_isolation','f_hapax_contextual_rate','f_vocabulary_depth','f_tension_density','f_desire_negation_rate','f_perception_conflict_rate','f_pov_drift_rate','f_pov_rupture_rate','f_pov_stability','f_causal_density','f_causal_chain_length','f_temporal_anchor_rate','f_echo_density','f_lexical_callback_rate','f_motif_concentration']
ALL_FEATURES=V3_FEATURES+SEMANTIC_FEATURES

def compute_all_features(text):
    f={}; f.update(compute_v3_text_features(text)); f.update(compute_depth_features(text)); f.update(compute_semantic_features(text))
    f['ix_mean_x_subdepth']=f.get('f1_mean',0)*f.get('f_subordination_depth',0)
    f['ix_pov_x_irony']=f.get('f_pov_shift_rate',0)*f.get('f28b_irony_density',0)
    f['ix_variance_x_longrate']=f.get('f1a_rhythm_variance',0)*f.get('f26b_long_sent_rate',0)
    return f

# ═══════════════════════════════════════════════════════════
# TRAIN GB V1 (exact same as r7_multiscale_scorer_v2.py)
# ═══════════════════════════════════════════════════════════

ORIG_F=['f26b_long_sent_rate','f1a_rhythm_variance','f1_mean','f24c_contrast_delta','f28b_irony_density','f27a_epistemic_rate','f9a_contradiction_rate','f19a_approx_entropy','f27d_modal_score','f26c_period_score']
DEPTH_F=['f_pov_shift_rate','f_subordination_depth','f_clause_per_sentence']
SUSPECT_F=['f17_knife_count','f29d_ttr_score','f35c_hook_score','f36c_cliff_score']
TIER_RANK={'S':5,'A':4,'B':3,'C':2,'D':1}

def train_gb():
    print("Loading corpus...")
    with open(MASTER,'r',encoding='utf-8') as f: master=json.load(f)
    with open(DEPTH,'r',encoding='utf-8') as f: depth_data=json.load(f)
    with open(TIERS,'r',encoding='utf-8') as f: tiers_data=json.load(f)
    with open(SEMANTIC,'r',encoding='utf-8') as f: semantic_data=json.load(f)

    tier_lookup={e['filename']:e.get('tier_suggestion','?') for e in tiers_data}
    depth_lookup={e['filename']:e['depth_features'] for e in depth_data}
    semantic_lookup={e['filename']:e['semantic_features'] for e in semantic_data}

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

    random.seed(42); indices=list(range(len(data_corpus))); random.shuffle(indices)
    n_train=int(len(data_corpus)*0.70)
    X_train=np.array([[data_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in indices[:n_train]])
    y_train=np.array([data_corpus[i][1] for i in indices[:n_train]])

    gb=GradientBoostingRegressor(n_estimators=50,max_depth=4,learning_rate=0.05,random_state=42,subsample=0.8,min_samples_leaf=5)
    gb.fit(X_train,y_train)
    print(f"  GB trained on {len(X_train)} samples from {len(data_corpus)} total works.")

    # Quick sanity: score on full corpus
    X_all=np.array([[data_corpus[i][0].get(f,0) for f in ALL_FEATURES] for i in range(len(data_corpus))])
    y_all=np.array([data_corpus[i][1] for i in range(len(data_corpus))])
    pred_all=gb.predict(X_all)
    rho,_=spearmanr(pred_all,y_all)
    print(f"  Sanity check: full corpus Spearman = {rho:.4f}")

    return gb

# ═══════════════════════════════════════════════════════════
# SCORE PROSE FILES
# ═══════════════════════════════════════════════════════════

def score_prose_file(gb, filepath):
    with open(filepath,'r',encoding='utf-8',errors='replace') as f: text=f.read()
    wc=len(text.split())
    feats=compute_all_features(text)
    vec=np.array([[feats.get(f,0) for f in ALL_FEATURES]])
    score=float(gb.predict(vec)[0])

    # Extract key Tk features for diagnosis
    tk_diag = {
        'f26b_long_sent_rate': feats.get('f26b_long_sent_rate',0),
        'f1a_rhythm_variance': feats.get('f1a_rhythm_variance',0),
        'f29d_ttr_score': feats.get('f29d_ttr_score',0),
        'f_pov_stability': feats.get('f_pov_stability',0),
        'f_pov_shift_rate': feats.get('f_pov_shift_rate',0),
        'ix_variance_x_longrate': feats.get('ix_variance_x_longrate',0),
    }
    return score, wc, tk_diag

def main():
    if len(sys.argv) < 2:
        print("Usage: python tribunal_gb_v1.py <prose_dir>")
        print("  prose_dir = directory containing .txt files from DualBench")
        sys.exit(1)

    prose_dir = sys.argv[1]
    if not os.path.isdir(prose_dir):
        print(f"ERROR: {prose_dir} is not a directory")
        sys.exit(1)

    # Train GB
    gb = train_gb()

    # Score all .txt files
    txt_files = sorted([f for f in os.listdir(prose_dir) if f.endswith('.txt')])
    if not txt_files:
        print(f"ERROR: No .txt files found in {prose_dir}")
        sys.exit(1)

    print(f"\n{'='*80}")
    print(f"  TRIBUNAL GB V1 — {len(txt_files)} PROSE FILES")
    print(f"{'='*80}")
    print(f"\n  {'Scene':<28} {'Words':>6} {'GB Score':>9} {'Tier':>6} {'f26b':>7} {'f1a_var':>8} {'f29d':>7} {'pov_stab':>9}")
    print(f"  {'-'*28} {'-'*6} {'-'*9} {'-'*6} {'-'*7} {'-'*8} {'-'*7} {'-'*9}")

    results = []
    for fname in txt_files:
        fpath = os.path.join(prose_dir, fname)
        score, wc, tk = score_prose_file(gb, fpath)
        label = fname.replace('.txt','')

        # Tier interpretation
        if score >= 4.5: tier = 'S'
        elif score >= 3.5: tier = 'A'
        elif score >= 2.5: tier = 'B'
        elif score >= 1.5: tier = 'C'
        else: tier = 'D'

        results.append({'label':label, 'score':score, 'tier':tier, 'words':wc, 'tk':tk})

        # Tk gate checks
        tk_flags = []
        if tk['f26b_long_sent_rate'] > 0.024: tk_flags.append('f26b+')
        else: tk_flags.append('f26b-')
        if tk['f29d_ttr_score'] < 0.710: tk_flags.append('ttr+')
        else: tk_flags.append('ttr-')

        print(f"  {label:<28} {wc:>6} {score:>9.4f} {tier:>6} {tk['f26b_long_sent_rate']:>7.4f} {tk['f1a_rhythm_variance']:>8.2f} {tk['f29d_ttr_score']:>7.4f} {tk['f_pov_stability']:>9.4f}")

    # Summary
    scores = [r['score'] for r in results]
    med = sorted(scores)[len(scores)//2]
    avg = mean_val(scores)
    tiers = [r['tier'] for r in results]

    print(f"\n  {'='*80}")
    print(f"  SUMMARY")
    print(f"  {'='*80}")
    print(f"  Median score:  {med:.4f}")
    print(f"  Mean score:    {avg:.4f}")
    print(f"  Tier counts:   S={tiers.count('S')} A={tiers.count('A')} B={tiers.count('B')} C={tiers.count('C')} D={tiers.count('D')}")
    print(f"  Score range:   {min(scores):.4f} — {max(scores):.4f}")

    # Tk audit
    f26b_pass = sum(1 for r in results if r['tk']['f26b_long_sent_rate'] > 0.024)
    ttr_pass = sum(1 for r in results if r['tk']['f29d_ttr_score'] < 0.710)
    var_pass = sum(1 for r in results if r['tk']['f1a_rhythm_variance'] > 11.36)
    print(f"\n  Tk GATE AUDIT (Laws 8-12 effect):")
    print(f"    f26b > 0.024 (long sentences):    {f26b_pass}/{len(results)}")
    print(f"    f29d < 0.710 (TTR not artificial): {ttr_pass}/{len(results)}")
    print(f"    f1a > 11.36 (rhythm variance):     {var_pass}/{len(results)}")

    # Reference points
    print(f"\n  REFERENCE SCALE:")
    print(f"    5.0 = perfect S-tier master")
    print(f"    4.5 = S threshold")
    print(f"    4.0 = A threshold")
    print(f"    3.5 = B threshold (competent)")
    print(f"    3.0 = C threshold (commercial)")
    print(f"    < 2.5 = D tier")

    # Save results
    out_path = os.path.join(prose_dir, '..', 'TRIBUNAL_GB_V1_RESULTS.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({
            'date': '2026-03-22',
            'model': 'GB V1 (n=50, depth=4, lr=0.05, seed=42)',
            'features': len(ALL_FEATURES),
            'median': round(med,4),
            'mean': round(avg,4),
            'results': [{
                'label': r['label'],
                'score': round(r['score'],4),
                'tier': r['tier'],
                'words': r['words'],
                'tk_features': {k:round(v,4) for k,v in r['tk'].items()},
            } for r in results],
        }, f, indent=2)
    print(f"\n  Saved: {out_path}")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
