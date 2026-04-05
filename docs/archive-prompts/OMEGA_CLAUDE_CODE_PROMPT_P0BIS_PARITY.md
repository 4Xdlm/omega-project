# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — PHASE P0-BIS
# Réalignement Parité Features Python → TypeScript
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : bd46af12
# Standard     : NASA-Grade L4 / DO-178C Level A
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

# SECTION 0 — LE PROBLÈME (LIRE AVANT TOUTE ACTION)

## DIAGNOSTIC CONFIRMÉ

Le GB V1 utilise 42 features. L'inférence TS (arbres) est IDENTIQUE au Python.
Le bug est dans le CALCUL DES FEATURES.

Sur la même prose (w4-panique.txt, 448 mots, 37 phrases) :
- Python GB score = 3.76 (A-tier)
- TS GB score     = 2.73 (B-tier)
- Delta           = -1.03 (INACCEPTABLE, tolérance = ±0.05)

## 14 FEATURES DIVERGENTES

| Feature | Python | TS | Delta | Module TS |
|---------|--------|-----|-------|-----------|
| f_subordination_depth | 0.0338 | 0.3784 | +0.345 | depth-features.ts |
| f_pov_shift_rate | 0.0000 | 0.1351 | +0.135 | depth-features.ts |
| f_clause_per_sentence | 1.5135 | 1.4054 | -0.108 | depth-features.ts |
| ix_mean_x_subdepth | 0.4083 | 4.5715 | +4.163 | DÉRIVÉ (cascade) |
| f_referent_continuity | 0.5225 | 0.0000 | -0.523 | semantic-depth-features.ts |
| f_lexical_progression | 0.9200 | 0.2823 | -0.638 | semantic-depth-features.ts |
| f_semantic_stagnation | 0.0000 | 0.1765 | +0.177 | semantic-depth-features.ts |
| f_vocabulary_depth | 0.8667 | 0.0952 | -0.772 | semantic-depth-features.ts |
| f_pov_drift_rate | 0.6389 | 0.0000 | -0.639 | semantic-depth-features.ts |
| f_pov_rupture_rate | 0.0000 | 0.3571 | +0.357 | semantic-depth-features.ts |
| f_pov_stability | 0.6216 | 0.7586 | +0.137 | semantic-depth-features.ts |
| f_temporal_anchor_rate | 0.2162 | 0.1081 | -0.108 | semantic-depth-features.ts |
| f_motif_concentration | 0.0500 | 1.0000 | +0.950 | semantic-depth-features.ts |
| f_echo_density | 0.0800 | 0.1027 | +0.023 | semantic-depth-features.ts |

28 features sont CORRECTES (text-features.ts = parfait).

## RÈGLE ABSOLUE

Le Python (r7_multiscale_scorer_v2.py) est la SOURCE DE VÉRITÉ.
Le TS doit CLONER le comportement Python. Pas "s'en inspirer". Pas "améliorer".
CLONER. Mêmes regex, mêmes stop words, mêmes fenêtres, mêmes seuils,
mêmes dénominateurs, mêmes cas limites.

# SECTION 1 — DOCUMENTS À LIRE (OBLIGATOIRE)

1. omega-autopsie/corpus_r/r7_multiscale_scorer_v2.py
   → LE SOURCE DE VÉRITÉ. Contient compute_depth_features() et
   compute_semantic_features(). TOUT le TS doit reproduire ces fonctions.

2. packages/sovereign-engine/src/scoring/depth-features.ts
   → À CORRIGER pour cloner compute_depth_features() du Python.

3. packages/sovereign-engine/src/scoring/semantic-depth-features.ts
   → À CORRIGER pour cloner compute_semantic_features() du Python.

4. Le dump de parité Panique :
   sessions/UnifiedBench_API_2026-03-22T11-41-04_bd46af12/prose/w4-panique_features_python.json

5. Les 8 proses LLM du bench :
   sessions/UnifiedBench_API_2026-03-22T11-41-04_bd46af12/prose/*.txt

# SECTION 2 — CODE PYTHON À CLONER VERBATIM

## HELPERS

```python
def r4(v): return round(v, 4)
def mean_val(vals): return sum(vals)/len(vals) if vals else 0
def stdev_val(vals):
    if len(vals)<2: return 0
    m=mean_val(vals); return math.sqrt(sum((v-m)**2 for v in vals)/(len(vals)-1))
def split_sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?\u2026\u00bb])\s+', text) if len(s.strip())>5]
def get_lower_words(text):
    return [w2 for w in text.split() for w2 in [re.sub(r"[^a-z\u00e0-\u00ff\u0153\u00e6\u00f1'-]",'',w.lower())] if len(w2)>1]
```

CRITICAL: get_lower_words regex uses the range \u00e0-\u00ff (all latin-1 accented).
The TS MUST use: /[^a-z\u00e0-\u00ff\u0153\u00e6\u00f1'-]/g

## STOP_FR (copie exacte — sans accents unicode)

```python
STOP_FR={'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces','mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur','nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car','dans','sur','sous','avec','sans','pour','par','entre','vers','chez','contre','apres','avant','pendant','depuis','que','qui','dont','ou','quand','comme','si','ne','pas','plus','jamais','rien','est','sont','etait','etaient','etre','avoir','avait','avaient','fait','faire','dit','dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes','autre','autres','meme','aussi','tres','bien','peu','trop','assez','alors','encore','deja','la','ici','puis','the','a','an','and','or','but','in','on','at','to','for','of','with','from','by','is','was','were','are','been','be','has','had','have','do','did','does','will','would','could','should','may','might','shall','can','must','it','its','he','she','they','them','their','his','her','this','that','these','those','not','no','so','if','as'}
```

## compute_depth_features() — PYTHON SOURCE

```python
SUB_RE=[r'\bqui\b',r'\bque\b',r'\bdont\b',r'\boù\b',r'\blorsqu',r'\bquand\b',r'\btandis qu',r'\baprès qu',r'\bavant qu',r'\bdepuis qu',r'\bpuisqu',r'\bparce qu',r'\bcar\b',r'\bbien qu',r'\bquoiqu',r'\bmême si\b',r'\bafin qu',r'\bpour qu',r'\bsi\b',r'\bcomme\b',r'\bwhich\b',r'\bwho\b',r'\bwhom\b',r'\bwhose\b',r'\bthat\b',r'\bwhere\b',r'\bwhen\b',r'\bwhile\b',r'\bbecause\b',r'\balthough\b',r'\bthough\b',r'\bsince\b',r'\bunless\b',r'\bwhereas\b',r'\bif\b',r'\bas\b']

def compute_depth_features(text):
    sents=split_sentences(text)
    if not sents: return {'f_pov_shift_rate':0,'f_subordination_depth':0,'f_clause_per_sentence':0}
    # subordination: COUNT of SUB_RE matches per sentence, then MEAN
    sc=[sum(len(re.findall(p,s.lower(),re.I)) for p in SUB_RE) for s in sents]
    # clause: verb detection patterns
    cc=[max(1,len(re.findall(r"\b(?:j[e']|tu|il|elle|on|nous|vous|ils|elles|ce|c'|qui)\s+\w+",s.lower()))+int(len(re.findall(r'\b\w{3,}(?:ait|aient|ais|ions|iez|urent|èrent|erait|eraient|eront)\b',s.lower()))*0.5)+len(re.findall(r'\b(?:est|était|fut|sera|sont|étaient|serait|fût|soient)\b',s.lower()))+len(re.findall(r'\b(?:avait|eut|aura|avaient|auraient|aurait|eût)\b',s.lower()))) for s in sents]
    # POV shift: >=2 person CLASSES in SAME sentence
    fp=re.compile(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|me\b|my\b|mine\b)",re.I)
    tp=re.compile(r"\b(?:il|elle|ils|elles|lui|leur|son|sa|ses|he\b|she\b|his\b|her\b|they\b|their\b)",re.I)
    cp=re.compile(r"\b(?:on|nous|we\b|our\b|us\b)",re.I)
    sh=sum(1 for s in sents if sum([bool(fp.search(s.lower())),bool(tp.search(s.lower())),bool(cp.search(s.lower()))])>=2)
    return {'f_pov_shift_rate':r4(sh/len(sents)),'f_subordination_depth':r4(mean_val(sc)),'f_clause_per_sentence':r4(mean_val(cc))}
```

KEY DIFFERENCES FROM CURRENT TS:
1. f_subordination_depth: Python = mean(COUNT of SUB_RE per sent). TS = mean(ratio per sent). FIX: use count not ratio.
2. f_pov_shift_rate: Python = sentences with >=2 person classes. TS = consecutive POV transitions. FIX: clone intra-sentence logic.
3. f_clause_per_sentence: Python = specific verb patterns with 0.5 multiplier. TS = different heuristic. FIX: clone verb patterns.

## compute_semantic_features() — PYTHON SOURCE

### REGEX CONSTANTS (copy exactly)
```python
PERC_RE=re.compile(r'\b(?:voyait|sentait|entendait|regardait|ecoutait|touchait|percevait|apercut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b',re.I)
DESIR_RE=re.compile(r'\b(?:voulait|desirait|esperait|souhaitait|revait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b',re.I)
NEG_SEM=re.compile(r"\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guere|point|not|n't|never|nothing|neither|nor|without)\b",re.I)
CONC_RE=re.compile(r'\b(?:mais|pourtant|cependant|toutefois|neanmoins|malgre|quoique|although|though|however|yet|despite|nevertheless|but)\b',re.I)
IRON_RE=re.compile(r'\b(?:sans doute|bien sur|evidemment|naturellement|certes|apparently|of course|surely|indeed|certainly)\b',re.I)
CAUS_RE=re.compile(r"\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|des que|a cause|grace a|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|caused|led to|resulted)\b",re.I)
TEMP_RE=re.compile(r"\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitot|tout a coup|apres|avant|pendant|des|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b",re.I)
REAC_RE=re.compile(r"\b(?:sentit|comprit|realisa|sursauta|fremit|recula|bondit|cria|murmura|soupira|trembla|felt|understood|realized|jumped|flinched|gasped|whispered|sighed|trembled|cried|screamed|froze)\b",re.I)
```

### REFERENTIAL COHERENCE
```python
if len(sents)>=3:
    eps=[set(m.lower() for m in re.findall(r'\b[A-Z\u00c0-\u00dc][a-z\u00e0-\u00ff]{2,}',s)) for s in sents]
    ch=ct=0
    for i in range(len(sents)-1):
        if not eps[i]: continue
        n1=eps[i+1] if i+1<len(sents) else set()
        n2=eps[i+2] if i+2<len(sents) else set()
        for e in eps[i]: ct+=1; ch+=(1 if e in n1 or e in n2 else 0)
    # ...entity counting, orphan, persistence...
```

### PROGRESSION (3-sentence windows)
```python
if len(sents)>=5:
    wv=[set(w for w in get_lower_words(' '.join(sents[i:i+3])) if w not in STOP_FR and len(w)>2) for i in range(len(sents)-2)]
    nr=[]; cum=set()
    for i,v in enumerate(wv):
        if i==0: cum.update(v); nr.append(1.0); continue
        new=sum(1 for w in v if w not in cum); cum.update(v)
        nr.append(new/len(v) if v else 0)
    f['f_lexical_progression']=r4(mean_val(nr[1:]))
    f['f_semantic_stagnation']=r4(sum(1 for r in nr[1:] if r<0.10)/max(len(nr)-1,1))
```

### VOCABULARY DEPTH
```python
words=[w for w in get_lower_words(text) if w not in STOP_FR and len(w)>2]
freq2={}
for w in words: freq2[w]=freq2.get(w,0)+1
f['f_vocabulary_depth']=r4(sum(1 for c in freq2.values() if 2<=c<=3)/max(len(freq2),1))
```

### POV DRIFT/RUPTURE/STABILITY
```python
def cpov(s):
    lo=s.lower()
    p1=len(re.findall(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|my\b|mine\b|myself\b)",lo))
    p3=len(re.findall(r"\b(?:il|elle|lui|son|sa|ses|he\b|she\b|his\b|her\b|him\b)",lo))
    pn=len(re.findall(r"\b(?:on|nous|we\b|our\b|us\b)",lo))
    mx=max(p1,p3,pn)
    if mx==0: return '0'
    return '1' if p1==mx else ('3' if p3==mx else 'N')
povs=[cpov(s) for s in sents]; dr=ru=0; last='0'
for p in povs:
    if p=='0': continue
    if last!='0' and last!=p:
        if (last=='1' and p=='3') or (last=='3' and p=='1'): ru+=1
        else: dr+=1
    last=p
nz=sum(1 for p in povs if p!='0'); pc3={}
for p in povs:
    if p=='0': continue
    pc3[p]=pc3.get(p,0)+1
f['f_pov_drift_rate']=r4(dr/max(nz-1,1))
f['f_pov_rupture_rate']=r4(ru/max(nz-1,1))
f['f_pov_stability']=r4(max(pc3.values(),default=0)/max(nz,1))
```

KEY: drift = NON-DIRECT transitions (1→N, N→3, etc). rupture = DIRECT 1↔3.
The TS has these INVERTED. Clone the Python exactly.

### RELATIONAL DENSITY + MOTIF CONCENTRATION
```python
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
rep=[(w,pos) for w,pos in wp.items() if len(pos)>=2]; gv=[]
for w,pos in rep:
    gaps=[pos[i]-pos[i-1] for i in range(1,len(pos))]
    if len(gaps)>1: gm=mean_val(gaps); gv.append(sum((g-gm)**2 for g in gaps)/(len(gaps)-1))
    elif gaps: gv.append(0)
f['f_motif_concentration']=r4(min(1,mean_val(gv)/20) if gv else 0)
```

KEY for motif_concentration: variance of gaps (not mean of gaps).
Single-gap words get variance=0.
Empty gv list → 0. Otherwise min(1, mean(variances)/20).

# SECTION 3 — VALIDATION OBLIGATOIRE

## Avant tout commit, Claude Code DOIT :

1. Générer les dumps Python pour les 8 proses (feature_dump.py)
2. Générer les dumps TS pour les 8 proses (feature-dump-ts.ts)
3. Comparer les 42 features pour chaque prose
4. Afficher un tableau de parité avec deltas
5. TOUS les deltas doivent être dans la tolérance

## Tolérance

- Features 0-1 : |delta| < 0.01
- Features counts : |delta| < 0.5
- GB score final : |delta| < 0.05
- Ordonnancement 8 scènes : Spearman ≥ 0.95

## Tests existants

npm test → 1911 tests PASS, ZERO regression.

# SECTION 4 — COMMIT FINAL

```bash
git add packages/sovereign-engine/src/scoring/depth-features.ts
git add packages/sovereign-engine/src/scoring/semantic-depth-features.ts
# + tout test/script ajouté
git commit -m "fix(P0-BIS): realign 14 features on Python — parity restored

Root cause: tokenization, stop words, windowing, POV logic diverged.
- depth-features.ts: subordination=count not ratio, pov=intra-sentence
- semantic-depth-features.ts: get_lower_words aligned, STOP_FR cloned,
  progression=3-sent windows, vocab_depth=freq2-3/unique, cpov cloned,
  motif=variance/20 capped
All 42 features within tolerance on 8 LLM proses."
git tag p0bis-parity-fixed
```

# FIN — Le Python est la LOI. Le TS clone le Python.
