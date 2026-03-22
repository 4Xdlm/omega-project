"""
OMEGA — Feature Parity Debugger
Dumps all 42 GB features for a single text file.
Compare output with TS computeAllGBFeatures() to find divergence.

Usage:
  python feature_dump.py <text_file>
"""
import json, math, os, re, sys

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

# Marker sets (EXACT copy from r7_multiscale_scorer_v2.py)
ALL_SUB={'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles','quand','comme','si','puisque','parce','bien','quoique','malgre','tandis','alors','lorsque','des','avant','apres','pendant','jusqu','that','which','who','whom','whose','where','when','although','because','since','while','until','unless','whether','after','before','though','even','whereas','provided'}
EPISTEMIC_ALL=['semblait','paraissait','apparemment','peut-etre','probablement','sans doute','il me semblait','comme si','on eut dit','dirait-on','quelque chose','une sorte','une espece','je croyais','il croyait','il lui semblait',"avait l'air","avait l'impression",'seemed','appeared','apparently','perhaps','probably','possibly','as if','as though','something like','a kind of','sort of','might','could','would have','had seemed','it seemed']
CONDITIONAL_FR=['aurait','aurait ete','eut','eut ete','serait','fut','voudrait']
PASSE_SIMPLE=['fut','eut','dit','prit','vit','alla','revint','sembla','parut']
NEG_COMPLEX=['ne...que','nul','aucun','jamais','guere','ni...ni','point','nullement','en aucune facon','rien de','pas un seul']
IRONY_V3=['on eut dit',"c'etait bien la",'voila qui',"comme c'est",'comme il convient','naturellement','il va sans dire',"cela s'entend",'bien entendu']
ADVERSATIVE=['mais','cependant','pourtant','toutefois','neanmoins','or','en revanche','au contraire','malgre','bien que','quoique','but','however','yet','nevertheless','although','despite','nonetheless','on the contrary','whereas']
STOP_FR={'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces','mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur','nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car','dans','sur','sous','avec','sans','pour','par','entre','vers','chez','contre','apres','avant','pendant','depuis','que','qui','dont','ou','quand','comme','si','ne','pas','plus','jamais','rien','est','sont','etait','etaient','etre','avoir','avait','avaient','fait','faire','dit','dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes','autre','autres','meme','aussi','tres','bien','peu','trop','assez','alors','encore','deja','la','ici','puis','the','a','an','and','or','but','in','on','at','to','for','of','with','from','by','is','was','were','are','been','be','has','had','have','do','did','does','will','would','could','should','may','might','shall','can','must','it','its','he','she','they','them','their','his','her','this','that','these','those','not','no','so','if','as'}

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
    f['f_referent_orphan_rate']=r4(len(hapax)/nlw)
    cap_words=[w for w in words if len(w)>2 and w[0].isupper() and not w.isupper()]
    if cap_words:
        cap_set=set(w.lower() for w in cap_words)
        cap_freq={w:sum(1 for cw in cap_words if cw.lower()==w) for w in cap_set}
        f['f_entity_persistence']=r4(sum(1 for c in cap_freq.values() if c>=2)/max(len(cap_set),1))
    else: f['f_entity_persistence']=0
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
    if len(lw)>=W:
        windows=[lw[i:i+W] for i in range(0,len(lw)-W+1,W)]
        rarities=[sum(1 for w,c in {w2:win.count(w2) for w2 in set(win)}.items() if c==1)/len(win) for win in windows]
        f['f_contextual_precision']=r4(mean_val(rarities))
        f['f_rare_word_isolation']=r4(stdev_val(rarities) if len(rarities)>1 else 0)
    else: f['f_contextual_precision']=0; f['f_rare_word_isolation']=0
    f['f_hapax_contextual_rate']=r4(len(hapax)/nlw)
    f['f_vocabulary_depth']=r4(len(set(lw))/nlw)
    TENSION_RE=re.compile(r'\b(?:soudain|brusquement|tout a coup|alors|aussitot|suddenly|abruptly|immediately)\b',re.I)
    DESIR_RE=re.compile(r'\b(?:voulait|desirait|esperait|souhaitait|revait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b',re.I)
    NEG_SEM=re.compile(r"\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guere|point|not|n't|never|nothing|neither|nor|without)\b",re.I)
    PERC_RE=re.compile(r'\b(?:voyait|sentait|entendait|regardait|ecoutait|touchait|percevait|apercut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b',re.I)
    f['f_tension_density']=r4(len(TENSION_RE.findall(tl))/ns)
    dn=sum(1 for s in sents if DESIR_RE.search(s) and NEG_SEM.search(s))
    f['f_desire_negation_rate']=r4(dn/ns)
    pc=sum(1 for s in sents if PERC_RE.search(s) and re.search(r'\b(?:mais|pourtant|cependant|yet|but|however)\b',s,re.I))
    f['f_perception_conflict_rate']=r4(pc/ns)
    pov2={'1st':re.compile(r"\b(?:je|j'|me|m'|moi|nous|my|mine|i|we|us|our)\b",re.I),
          '3rd':re.compile(r"\b(?:il|elle|ils|elles|lui|leur|on|he|she|they|them|his|her|its|their)\b",re.I)}
    povs2=[]
    for s in sents:
        c1=len(pov2['1st'].findall(s)); c3=len(pov2['3rd'].findall(s))
        povs2.append('1st' if c1>c3 else '3rd' if c3>c1 else 'neutral')
    transitions=sum(1 for i in range(1,len(povs2)) if povs2[i]!=povs2[i-1])
    f['f_pov_drift_rate']=r4(transitions/max(len(sents)-1,1))
    ruptures=sum(1 for i in range(1,len(povs2)) if povs2[i]!=povs2[i-1] and 'neutral' not in (povs2[i],povs2[i-1]))
    f['f_pov_rupture_rate']=r4(ruptures/max(len(sents)-1,1))
    if len(povs2)>=4:
        mc={'1st':0,'3rd':0,'neutral':0}
        for p in povs2: mc[p]=mc.get(p,0)+1
        f['f_pov_stability']=r4(max(mc.values())/len(povs2))
    else: f['f_pov_stability']=1.0
    CAUS_RE=re.compile(r"\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|des que|a cause|grace a|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|caused|led to|resulted)\b",re.I)
    f['f_causal_density']=r4(len(CAUS_RE.findall(tl))/ns)
    chains=0; cur=0
    for s in sents:
        if CAUS_RE.search(s): cur+=1; chains=max(chains,cur)
        else: cur=0
    f['f_causal_chain_length']=chains
    TEMP_RE=re.compile(r"\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitot|tout a coup|apres|avant|pendant|des|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b",re.I)
    f['f_temporal_anchor_rate']=r4(len(TEMP_RE.findall(tl))/ns)
    if len(lw)>=100:
        first50=set(lw[:50]); last50=set(lw[-50:])
        f['f_echo_density']=r4(len(first50&last50-STOP_FR)/max(len(first50-STOP_FR),1))
        mid_start=len(lw)//4; mid_end=3*len(lw)//4
        mid_set=set(lw[mid_start:mid_end])
        f['f_lexical_callback_rate']=r4(len(first50&set(lw[-50:])-mid_set-STOP_FR)/max(len(first50-STOP_FR),1))
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

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python feature_dump.py <text_file>")
        sys.exit(1)
    
    fpath = sys.argv[1]
    with open(fpath, 'r', encoding='utf-8', errors='replace') as fh:
        text = fh.read()
    
    wc = len(text.split())
    print(f"File: {fpath}")
    print(f"Words: {wc}")
    print(f"Sentences: {len(split_sentences(text))}")
    print()
    
    feats = compute_all_features(text)
    
    print(f"{'Feature':<35} {'Value':>12}")
    print(f"{'-'*35} {'-'*12}")
    for fname in ALL_FEATURES:
        val = feats.get(fname, 'MISSING')
        if isinstance(val, float):
            print(f"{fname:<35} {val:>12.6f}")
        else:
            print(f"{fname:<35} {str(val):>12}")
    
    # Also dump as JSON for easy comparison
    out_path = fpath.replace('.txt', '_features_python.json')
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump({
            'source': 'python',
            'file': os.path.basename(fpath),
            'words': wc,
            'features': {k: feats.get(k, 0) for k in ALL_FEATURES}
        }, fh, indent=2)
    print(f"\nSaved: {out_path}")
