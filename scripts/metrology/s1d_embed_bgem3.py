#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1D-bge — Radar qualité géométrique sur bge-m3 (vs nomic). Gold-Set scellé.
Clone fidèle de s1d_embed.py : memes contrastes, meme protocole (AUC, bootstrap 10k
clusterise par auteur, permutation, K-fold par auteur). SEULE difference : MODEL=bge-m3,
cache partage V4G3_embeddings_bgem3.json. ZERO modif moteur.
"""
import json, csv, os, glob, sys, urllib.request, hashlib, random
import numpy as np
random.seed(42); np.random.seed(42)

OUT = r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SEAL=os.path.join(OUT,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(OUT,"S1A_EXTRACTION_MANIFEST.csv")
CORP=os.path.join(OUT,"extracted_corpus")
EMB_CACHE=os.path.join(OUT,"V4G3_embeddings_bgem3.json")  # cache PARTAGE avec V4G3
MODEL="bge-m3"
RESULTS=os.path.join(OUT,"S1D_BGEM3_EMBED_RESULTS.json")

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
        except Exception as e:
            last=e; continue
    print("  EMBED_FAIL:",str(last)[:80],flush=True); return None

def load_texts():
    sha2idx={}
    for row in csv.DictReader(open(MAN,encoding="utf-8")):
        sha2idx[row["sha_text"]]=row["idx"]
    fiches=[json.loads(l) for l in open(SEAL,encoding="utf-8")]
    items=[]
    for f in fiches:
        idx=sha2idx.get(f["sha_text"])
        if idx is None: continue
        g=glob.glob(os.path.join(CORP,f"{int(idx):05d}_*.txt"))
        if not g: continue
        txt=open(g[0],encoding="utf-8",errors="ignore").read()
        items.append(dict(cell=f["cell"],author=f["canonical_author"],sha=f["sha_text"],text=txt))
    return items

def get_embeddings(items):
    cache=json.load(open(EMB_CACHE,encoding="utf-8")) if os.path.exists(EMB_CACHE) else {}
    for i,it in enumerate(items):
        if it["sha"] not in cache or cache[it["sha"]] is None:
            e=ollama_embed(it["text"])
            if e is not None: cache[it["sha"]]=e
            if (i+1)%10==0:
                json.dump(cache,open(EMB_CACHE,"w")); print(f"  emb {i+1}/{len(items)}",flush=True)
    json.dump(cache,open(EMB_CACHE,"w"))
    out=[]
    for it in items:
        if cache.get(it["sha"]) is not None:
            it["emb"]=np.array(cache[it["sha"]],dtype=float); out.append(it)
    print(f"  embedded_ok={len(out)}/{len(items)}",flush=True)
    return out

def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))

def auc(scores,labels):
    pos=[s for s,l in zip(scores,labels) if l==1]; neg=[s for s,l in zip(scores,labels) if l==0]
    if not pos or not neg: return float("nan")
    c=sum((1 if p>n else 0.5 if p==n else 0) for p in pos for n in neg)
    return c/(len(pos)*len(neg))

def loo_author_scores(master, low):
    data=[(it["emb"],1,it["author"]) for it in master]+[(it["emb"],0,it["author"]) for it in low]
    scores=[]; labels=[]
    for emb,lab,auth in data:
        m=[e for e,l,a in data if l==1 and a!=auth]
        b=[e for e,l,a in data if l==0 and a!=auth]
        if not m or not b: continue
        cm=np.mean(m,axis=0); cb=np.mean(b,axis=0)
        scores.append(cos(emb,cm)-cos(emb,cb)); labels.append(lab)
    return scores,labels

def boot_ci(master,low,n=10000):
    authors=sorted(set(it["author"] for it in master+low))
    by={a:[it for it in master+low if it["author"]==a] for a in authors}
    cellset={id(it):(1 if it in master else 0) for it in master+low}
    aucs=[]
    for _ in range(n):
        samp=[]
        for a in [random.choice(authors) for _ in authors]:
            samp+=by[a]
        m=[it for it in samp if cellset[id(it)]==1]; l=[it for it in samp if cellset[id(it)]==0]
        if not m or not l: continue
        s,lab=loo_author_scores(m,l)
        a_=auc(s,lab)
        if a_==a_: aucs.append(a_)
    aucs=sorted(aucs)
    return (np.percentile(aucs,2.5),np.percentile(aucs,97.5)) if aucs else (float('nan'),float('nan'))

def perm_test(master,low,observed,n=1000):
    data=master+low; labels0=[1]*len(master)+[0]*len(low)
    ge=0
    for _ in range(n):
        perm=labels0[:]; random.shuffle(perm)
        m=[d for d,l in zip(data,perm) if l==1]; b=[d for d,l in zip(data,perm) if l==0]
        s,lab=loo_author_scores(m,b)
        if auc(s,lab)>=observed: ge+=1
    return (ge+1)/(n+1)

def contrast(items,master_cell,low_cell,boot=2000,perm=1000):
    M=[it for it in items if it["cell"]==master_cell]
    L=[it for it in items if it["cell"]==low_cell]
    s,lab=loo_author_scores(M,L)
    a=auc(s,lab)
    lo,hi=boot_ci(M,L,boot)
    p=perm_test(M,L,a,perm)
    return dict(contrast=f"{master_cell} vs {low_cell}",model=MODEL,n_master=len(M),n_low=len(L),
                AUC=round(a,4),CI95=[round(lo,4),round(hi,4)],perm_p=round(p,4))

if __name__=="__main__":
    items=get_embeddings(load_texts())
    print(json.dumps({"model":MODEL,"loaded":len(items),"dim":len(items[0]["emb"]) if items else 0}))
    res=[]
    res.append(contrast(items,"MASTER_NATIVE_FR","D_SOURCE_REAL_FR"))
    res.append(contrast(items,"MASTER_NATIVE_FR","C_FORMULAIC_FR"))
    res.append(contrast(items,"MASTER_NATIVE_EN","C_FORMULAIC_EN"))
    json.dump(res,open(RESULTS,"w"),ensure_ascii=False,indent=2)
    print(json.dumps(res,ensure_ascii=False,indent=2))
