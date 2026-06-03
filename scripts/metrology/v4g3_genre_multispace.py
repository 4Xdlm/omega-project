#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V4-G3 — Genre separability, POWERED, multi-space (nomic vs bge-m3).

Design (truth-control):
  - 3 clean genres, each >=5 authors (LOAO-valid): THRILLER, SF_FANTASY, FEELGOOD.
    SPY (2 authors) and HISTORICAL (1 author) EXCLUDED (under-powered, would confound author=genre).
  - Corpus = lang_detected=fr, status=OK (full extraction, not just Gold-Set).
  - Labels = curated author->genre KB over FAMOUS published FR authors (genre = defining category).
  - Confound control: language FIXED (fr). Quality-tier NOT fixed here (genre authors span tiers),
    but author-idiosyncrasy controlled by leave-ONE-AUTHOR-out; permutation at AUTHOR level.
  - TWO feature spaces compared on the SAME books: nomic-embed-text vs bge-m3.
    Tests hypothesis: is genre unseparable, or just in the wrong feature space?

Metrics per space: LOAO nearest-centroid accuracy, macro-F1, confusion, per-genre recall,
  one-vs-rest AUC (mean), author-level permutation p (2000), intra/inter cosine (author-blocked).

Local Ollama only. Crash-safe embedding caches. No engine code. Sub/at-S-1 (n~25-31/genre).
"""
import json, csv, os, glob, sys, urllib.request, random
import numpy as np
random.seed(42); np.random.seed(42)

WS = r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
MAN = os.path.join(WS, "S1A_EXTRACTION_MANIFEST.csv")
CORP = os.path.join(WS, "extracted_corpus")
OUT = os.path.join(WS, "V4G3_RESULTS.json")
CACHE = {"nomic-embed-text": os.path.join(WS, "S1D_embeddings_nomic.json"),
         "bge-m3": os.path.join(WS, "V4G3_embeddings_bgem3.json")}

# author_token -> genre. Token must be a distinctive surname substring of author_title_key.
KB = {
 # THRILLER / POLAR
 "thilliez":"THRILLER","bussi":"THRILLER","chattam":"THRILLER","giacometti":"THRILLER",
 "grange":"THRILLER","minier":"THRILLER","norek":"THRILLER","lemaitre":"THRILLER",
 "vargas":"THRILLER","higgins":"THRILLER","loubry":"THRILLER","coben":"THRILLER",
 # SF / FANTASY
 "werber":"SF_FANTASY","barjavel":"SF_FANTASY","bordage":"SF_FANTASY","damasio":"SF_FANTASY",
 "robillard":"SF_FANTASY","pevel":"SF_FANTASY","gaborit":"SF_FANTASY","triss":"SF_FANTASY",
 "bottero":"SF_FANTASY","wul":"SF_FANTASY","ligny":"SF_FANTASY","andrevon":"SF_FANTASY",
 "genefort":"SF_FANTASY","heliot":"SF_FANTASY","ayerdhal":"SF_FANTASY","curval":"SF_FANTASY",
 # FEELGOOD / ROMANCE commerciale
 "valognes":"FEELGOOD","legardinier":"FEELGOOD","lugand":"FEELGOOD","levy":"FEELGOOD",
 "gavalda":"FEELGOOD","musso":"FEELGOOD","ledig":"FEELGOOD","giordano":"FEELGOOD",
 "bourdin":"FEELGOOD","pancol":"FEELGOOD","byrd":"FEELGOOD","martin_lugand":"FEELGOOD",
}
GENRES = ["THRILLER","SF_FANTASY","FEELGOOD"]

def ollama_embed(model, text):
    last=None
    for cap in (6000,3000,1500,800):
        try:
            req=urllib.request.Request("http://localhost:11434/api/embeddings",
                data=json.dumps({"model":model,"prompt":text[:cap]}).encode(),
                headers={"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=120) as r:
                emb=json.loads(r.read()).get("embedding")
                if emb: return emb
        except Exception as e:
            last=e; continue
    print("  EMBED_FAIL:",str(last)[:90],flush=True); return None

def middle_window(txt, n=1500):
    w=txt.split()
    if len(w)<=n: return " ".join(w)
    s=(len(w)-n)//2
    return " ".join(w[s:s+n])

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
                items.append({"idx":int(r["idx"]),"key":k,"author":tok,"genre":g,"sha":r["sha_text"]})
                break
    # attach text
    out=[]
    for it in items:
        g=glob.glob(os.path.join(CORP,f"{it['idx']:05d}_*.txt"))
        if not g: continue
        it["text"]=middle_window(open(g[0],encoding="utf-8",errors="ignore").read())
        out.append(it)
    return out

def embed_space(model, items):
    cpath=CACHE[model]
    cache=json.load(open(cpath,encoding="utf-8")) if os.path.exists(cpath) else {}
    for i,it in enumerate(items):
        key=it["sha"]
        if key not in cache or cache[key] is None:
            e=ollama_embed(model, it["text"])
            if e is not None: cache[key]=e
            if (i+1)%10==0:
                json.dump(cache,open(cpath,"w")); print(f"  [{model}] {i+1}/{len(items)}",flush=True)
    json.dump(cache,open(cpath,"w"))
    vecs={}
    for it in items:
        v=cache.get(it["sha"])
        if v is not None: vecs[it["sha"]]=np.array(v,dtype=float)
    return vecs

def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))

def loao(items, vecs, labels_by_author=None):
    """Leave-one-author-out nearest-centroid. labels_by_author overrides genre (for permutation)."""
    data=[(it["author"], (labels_by_author[it["author"]] if labels_by_author else it["genre"]), vecs[it["sha"]])
          for it in items if it["sha"] in vecs]
    authors=sorted(set(a for a,_,_ in data))
    y_true=[]; y_pred=[]
    for held in authors:
        train=[(g,v) for a,g,v in data if a!=held]
        test=[(g,v) for a,g,v in data if a==held]
        cents={}
        for g in GENRES:
            gv=[v for gg,v in train if gg==g]
            if gv: cents[g]=np.mean(gv,axis=0)
        if len(cents)<len(GENRES):  # degenerate (a genre lost all authors)
            return None
        for g,v in test:
            pred=max(cents, key=lambda c: cos(v,cents[c]))
            y_true.append(g); y_pred.append(pred)
    return y_true,y_pred

def metrics(y_true,y_pred):
    n=len(y_true); acc=sum(1 for a,b in zip(y_true,y_pred) if a==b)/n
    # macro-F1
    f1s={}; conf={g:{h:0 for h in GENRES} for g in GENRES}
    for a,b in zip(y_true,y_pred): conf[a][b]+=1
    for g in GENRES:
        tp=conf[g][g]; fp=sum(conf[h][g] for h in GENRES if h!=g); fn=sum(conf[g][h] for h in GENRES if h!=g)
        prec=tp/(tp+fp) if tp+fp else 0.0; rec=tp/(tp+fn) if tp+fn else 0.0
        f1s[g]=2*prec*rec/(prec+rec) if prec+rec else 0.0
    return acc, sum(f1s.values())/len(GENRES), f1s, conf

def run_space(model, items, vecs):
    r=loao(items,vecs)
    if r is None: return {"model":model,"error":"degenerate"}
    y_true,y_pred=r
    acc,macrof1,f1s,conf=metrics(y_true,y_pred)
    # author-level permutation
    authors=sorted(set(it["author"] for it in items if it["sha"] in vecs))
    a_genre={it["author"]:it["genre"] for it in items if it["sha"] in vecs}
    base=[a_genre[a] for a in authors]
    ge=0; valid=0; N=2000
    for _ in range(N):
        perm=base[:]; random.shuffle(perm)
        lm={a:perm[i] for i,a in enumerate(authors)}
        rr=loao(items,vecs,lm)
        if rr is None: continue
        valid+=1
        if metrics(*rr)[0]>=acc: ge+=1
    pval=(ge+1)/(valid+1) if valid else None
    # one-vs-rest AUC (mean) using centroid-cos margin under full-data centroids (descriptive)
    data=[(it["genre"],vecs[it["sha"]]) for it in items if it["sha"] in vecs]
    cents={g:np.mean([v for gg,v in data if gg==g],axis=0) for g in GENRES}
    aucs=[]
    for g in GENRES:
        pos=[cos(v,cents[g]) for gg,v in data if gg==g]
        neg=[cos(v,cents[g]) for gg,v in data if gg!=g]
        if pos and neg:
            c=sum((1 if p>n else 0.5 if p==n else 0) for p in pos for n in neg)/(len(pos)*len(neg))
            aucs.append(c)
    # intra/inter cosine author-blocked
    intra=[]; inter=[]
    dl=[(it["author"],it["genre"],vecs[it["sha"]]) for it in items if it["sha"] in vecs]
    for i in range(len(dl)):
        for j in range(i+1,len(dl)):
            if dl[i][0]==dl[j][0]: continue
            c=cos(dl[i][2],dl[j][2])
            (intra if dl[i][1]==dl[j][1] else inter).append(c)
    return {"model":model,"n_books":len(y_true),"n_authors":len(authors),
            "loao_accuracy":round(acc,4),"chance":round(1/len(GENRES),4),
            "macro_f1":round(macrof1,4),"per_genre_f1":{g:round(v,4) for g,v in f1s.items()},
            "confusion":conf,"permutation_p":round(pval,5) if pval is not None else None,
            "perm_valid":valid,"ovr_auc_mean":round(sum(aucs)/len(aucs),4) if aucs else None,
            "intra_cos":round(float(np.mean(intra)),4),"inter_cos":round(float(np.mean(inter)),4),
            "delta_cos":round(float(np.mean(intra)-np.mean(inter)),4)}

if __name__=="__main__":
    items=select()
    tally={}
    for it in items: tally.setdefault(it["genre"],{"a":set(),"b":0}); tally[it["genre"]]["a"].add(it["author"]); tally[it["genre"]]["b"]+=1
    print(json.dumps({"selected":len(items),
        "tally":{g:{"authors":len(v["a"]),"books":v["b"]} for g,v in tally.items()}},ensure_ascii=False))
    results={"design":"V4-G3 powered 3-class (THRILLER/SF_FANTASY/FEELGOOD), lang=fr fixed, LOAO, multi-space nomic vs bge-m3",
             "norm_caveat":"n~24-31/genre (at/near S-1 floor for pilot-powered; not n>=100). No adoption without full S-1 pass.",
             "selection_tally":{g:{"authors":len(v["a"]),"books":v["b"]} for g,v in tally.items()},
             "spaces":[]}
    for model in ("nomic-embed-text","bge-m3"):
        print(f"=== embedding {model} ===",flush=True)
        vecs=embed_space(model,items)
        print(f"  embedded {len(vecs)}/{len(items)}",flush=True)
        results["spaces"].append(run_space(model,items,vecs))
    json.dump(results,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps(results,ensure_ascii=False,indent=2))
