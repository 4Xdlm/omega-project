#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V4-G4 — Genre separability, SCALED + honest, bge-m3 only.

Improvements over V4-G3 (which was promising, perm p=0.078):
  - Expanded author->genre KB (more authors/books per genre).
  - HONEST one-vs-rest AUC: per held-out author, centroids exclude that author (LOAO),
    score each held book = cos(book, centroid_genre_LOAO). AUC(label=g vs rest) on LOAO scores.
  - Author-clustered bootstrap CI95 on macro-OVR-AUC (resample authors with replacement).
  - Author-level permutation on LOAO accuracy (2000).
  - Covariate checks: per-genre mean length + tier distribution (is genre a proxy of length/tier?).
  - bge-m3 only (nomic refuted for genre in V4-G3).

Target S-1: macro-OVR-AUC >= 0.80 AND CI95-low >= 0.70 AND permutation p < 0.05.
3 clean genres (>=5 authors). Local Ollama, shared bge-m3 cache. No engine code.
"""
import json, csv, os, glob, urllib.request, random
import numpy as np
random.seed(42); np.random.seed(42)

WS = r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
MAN = os.path.join(WS, "S1A_EXTRACTION_MANIFEST.csv")
CORP = os.path.join(WS, "extracted_corpus")
OUT = os.path.join(WS, "V4G4_RESULTS.json")
CACHE = os.path.join(WS, "V4G3_embeddings_bgem3.json")  # shared
MODEL = "bge-m3"

KB = {
 # THRILLER / POLAR
 "thilliez":"THRILLER","bussi":"THRILLER","chattam":"THRILLER","giacometti":"THRILLER",
 "grange":"THRILLER","minier":"THRILLER","norek":"THRILLER","lemaitre":"THRILLER",
 "vargas":"THRILLER","higgins":"THRILLER","loubry":"THRILLER","coben":"THRILLER",
 "jonquet":"THRILLER","daeninckx":"THRILLER","dantec":"THRILLER","expert":"THRILLER",
 "ledesma":"THRILLER","gardner":"THRILLER","slaughter":"THRILLER","connelly":"THRILLER",
 "thiry":"THRILLER","villard":"THRILLER",
 # SF / FANTASY
 "werber":"SF_FANTASY","barjavel":"SF_FANTASY","bordage":"SF_FANTASY","damasio":"SF_FANTASY",
 "robillard":"SF_FANTASY","pevel":"SF_FANTASY","gaborit":"SF_FANTASY","triss":"SF_FANTASY",
 "bottero":"SF_FANTASY","wul":"SF_FANTASY","ligny":"SF_FANTASY","andrevon":"SF_FANTASY",
 "genefort":"SF_FANTASY","heliot":"SF_FANTASY","ayerdhal":"SF_FANTASY","curval":"SF_FANTASY",
 "dunyach":"SF_FANTASY","colin":"SF_FANTASY","ferey":"SF_FANTASY","brussolo":"SF_FANTASY",
 # FEELGOOD / ROMANCE commerciale
 "valognes":"FEELGOOD","legardinier":"FEELGOOD","lugand":"FEELGOOD","levy":"FEELGOOD",
 "gavalda":"FEELGOOD","musso":"FEELGOOD","ledig":"FEELGOOD","giordano":"FEELGOOD",
 "bourdin":"FEELGOOD","pancol":"FEELGOOD","byrd":"FEELGOOD","martin_lugand":"FEELGOOD",
 "colombani":"FEELGOOD","aubry":"FEELGOOD","delacourt":"FEELGOOD","dieudonne":"FEELGOOD",
}
GENRES = ["THRILLER","SF_FANTASY","FEELGOOD"]

def ollama_embed(text):
    last=None
    for cap in (6000,3000,1500,800):
        try:
            req=urllib.request.Request("http://localhost:11434/api/embeddings",
                data=json.dumps({"model":MODEL,"prompt":text[:cap]}).encode(),
                headers={"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=120) as r:
                emb=json.loads(r.read()).get("embedding")
                if emb: return emb
        except Exception as e: last=e; continue
    print("  EMBED_FAIL",str(last)[:80],flush=True); return None

def middle_window(txt,n=1500):
    w=txt.split()
    if len(w)<=n: return " ".join(w)
    s=(len(w)-n)//2; return " ".join(w[s:s+n])

def select():
    rows=list(csv.DictReader(open(MAN,encoding="utf-8")))
    items=[]; seen=set()
    for r in rows:
        if r["lang_detected"]!="fr" or r["status"]!="OK": continue
        k=r["author_title_key"]
        for tok,g in KB.items():
            if tok in k:
                key=(int(r["idx"]),tok)
                if key in seen: break
                seen.add(key)
                items.append({"idx":int(r["idx"]),"key":k,"author":tok,"genre":g,
                              "sha":r["sha_text"],"words":int(r["total_words"] or 0),"tier":r["tier_folder"]})
                break
    out=[]
    for it in items:
        g=glob.glob(os.path.join(CORP,f"{it['idx']:05d}_*.txt"))
        if not g: continue
        it["text"]=middle_window(open(g[0],encoding="utf-8",errors="ignore").read())
        out.append(it)
    return out

def embed(items):
    cache=json.load(open(CACHE,encoding="utf-8")) if os.path.exists(CACHE) else {}
    for i,it in enumerate(items):
        if it["sha"] not in cache or cache[it["sha"]] is None:
            e=ollama_embed(it["text"])
            if e is not None: cache[it["sha"]]=e
            if (i+1)%10==0: json.dump(cache,open(CACHE,"w")); print(f"  emb {i+1}/{len(items)}",flush=True)
    json.dump(cache,open(CACHE,"w"))
    for it in items:
        v=cache.get(it["sha"]); it["emb"]=np.array(v,dtype=float) if v is not None else None
    return [it for it in items if it["emb"] is not None]

def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))

def loao_predict(items, labels=None):
    """Return per-book (true_genre, pred_genre, {genre:loao_cos_score})."""
    data=[(it["author"], (labels[it["author"]] if labels else it["genre"]), it["emb"]) for it in items]
    authors=sorted(set(a for a,_,_ in data))
    res=[]
    for held in authors:
        train=[(g,v) for a,g,v in data if a!=held]
        cents={}
        for g in GENRES:
            gv=[v for gg,v in train if gg==g]
            if gv: cents[g]=np.mean(gv,axis=0)
        if len(cents)<len(GENRES): return None
        for a,g,v in [(a,g,v) for a,g,v in data if a==held]:
            sc={gg:cos(v,cents[gg]) for gg in GENRES}
            pred=max(sc,key=sc.get)
            res.append((g,pred,sc))
    return res

def accuracy(res): return sum(1 for t,p,_ in res if t==p)/len(res)

def macro_ovr_auc(res):
    aucs={}
    for g in GENRES:
        pos=[sc[g] for t,p,sc in res if t==g]; neg=[sc[g] for t,p,sc in res if t!=g]
        if pos and neg:
            c=sum((1 if x>y else 0.5 if x==y else 0) for x in pos for y in neg)/(len(pos)*len(neg))
            aucs[g]=c
    return sum(aucs.values())/len(aucs), aucs

if __name__=="__main__":
    items=embed(select())
    tally={}
    for it in items: tally.setdefault(it["genre"],{"a":set(),"b":0,"w":[]}); tally[it["genre"]]["a"].add(it["author"]); tally[it["genre"]]["b"]+=1; tally[it["genre"]]["w"].append(it["words"])
    sel={g:{"authors":len(v["a"]),"books":v["b"],"mean_words":int(np.mean(v["w"]))} for g,v in tally.items()}
    print(json.dumps({"selected":len(items),"tally":sel},ensure_ascii=False),flush=True)

    res=loao_predict(items)
    acc=accuracy(res); macro_auc,per_auc=macro_ovr_auc(res)

    # author-level permutation on accuracy
    authors=sorted(set(it["author"] for it in items)); a_genre={it["author"]:it["genre"] for it in items}
    base=[a_genre[a] for a in authors]; ge=0; valid=0
    for _ in range(2000):
        perm=base[:]; random.shuffle(perm); lm={a:perm[i] for i,a in enumerate(authors)}
        r=loao_predict(items,lm)
        if r is None: continue
        valid+=1
        if accuracy(r)>=acc: ge+=1
    pval=(ge+1)/(valid+1) if valid else None

    # author-clustered bootstrap CI95 on macro-OVR-AUC
    by={a:[it for it in items if it["author"]==a] for a in authors}
    boots=[]
    for _ in range(2000):
        samp=[];
        for a in [random.choice(authors) for _ in authors]: samp+=by[a]
        # need >=1 author per genre in resample
        if len(set(it["genre"] for it in samp))<len(GENRES): continue
        r=loao_predict(samp)
        if r is None: continue
        boots.append(macro_ovr_auc(r)[0])
    boots=sorted(boots)
    ci=[round(np.percentile(boots,2.5),4),round(np.percentile(boots,97.5),4)] if boots else [None,None]

    # covariate: genre vs length (one-way effect), tier distribution
    tiers={g:{} for g in GENRES}
    for it in items: tiers[it["genre"]][it["tier"] or "_none"]=tiers[it["genre"]].get(it["tier"] or "_none",0)+1

    s1_pass = (macro_auc>=0.80 and ci[0] is not None and ci[0]>=0.70 and pval is not None and pval<0.05)
    out={"design":"V4-G4 scaled genre 3-class, bge-m3, honest LOAO-AUC + author bootstrap CI + permutation",
         "model":MODEL,"selection":sel,"n_books":len(res),"n_authors":len(authors),
         "loao_accuracy":round(acc,4),"chance":round(1/len(GENRES),4),
         "macro_ovr_auc_LOAO":round(macro_auc,4),"per_genre_auc_LOAO":{g:round(v,4) for g,v in per_auc.items()},
         "macro_auc_CI95_author_bootstrap":ci,"permutation_p_accuracy":round(pval,5) if pval else None,
         "perm_valid":valid,"mean_words_by_genre":{g:sel[g]["mean_words"] for g in GENRES},
         "tier_distribution":tiers,
         "S1_thresholds":{"macro_auc>=0.80":bool(macro_auc>=0.80),"CI95_low>=0.70":bool(ci[0] is not None and ci[0]>=0.70),"perm_p<0.05":bool(pval is not None and pval<0.05)},
         "S1_PASS":bool(s1_pass)}
    json.dump(out,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps(out,ensure_ascii=False,indent=2))
