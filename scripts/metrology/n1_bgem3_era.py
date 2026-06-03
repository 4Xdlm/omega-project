#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N1 — bge-m3 era-robustesse : MODERN_MASTER vs MODERN_LOW (epoque neutralisee).
Compare a nomic (S1E-A = 0.79). Embeddings bge-m3 deja caches (V4G3 cache). LOAO auteur +
bootstrap clusterise auteur (IC95) + permutation auteur (EMP-18). ZERO modif moteur.
"""
import json, csv, os, glob, random
import numpy as np
random.seed(42); np.random.seed(42)

OUT = r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SEAL=os.path.join(OUT,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(OUT,"S1A_EXTRACTION_MANIFEST.csv")
EMB=os.path.join(OUT,"V4G3_embeddings_bgem3.json")
RES=os.path.join(OUT,"S1E_BGEM3_ERA_RESULTS.json")

MODERN_MASTER={"ernaux","modiano","clezio","quignard","duras","butor","sarraute","grillet","perec","beauvoir"}
EXCLUDE_LOW={"feval","villiers","bruce"}
def _toks(a): return set(a.split("_"))

def load():
    sha2idx={r["sha_text"]:r["idx"] for r in csv.DictReader(open(MAN,encoding="utf-8"))}
    emb=json.load(open(EMB,encoding="utf-8")) if os.path.exists(EMB) else {}
    items=[]
    for f in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
        a=f["canonical_author"]; cell=f["cell"]; sha=f["sha_text"]
        if cell=="MASTER_NATIVE_FR" and (_toks(a)&MODERN_MASTER): fam=1
        elif cell=="D_SOURCE_REAL_FR" and not (_toks(a)&EXCLUDE_LOW): fam=0
        else: continue
        v=emb.get(sha)
        if v is None: continue
        items.append(dict(fam=fam,author=a,emb=np.array(v,dtype=float)))
    return items

def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))
def auc(sc,lb):
    p=[s for s,l in zip(sc,lb) if l==1]; n=[s for s,l in zip(sc,lb) if l==0]
    if not p or not n: return float("nan")
    return sum((1 if x>y else .5 if x==y else 0) for x in p for y in n)/(len(p)*len(n))
def loo(items):
    data=[(it["emb"],it["fam"],it["author"]) for it in items]
    sc=[];lb=[]
    for e,l,a in data:
        m=[x for x,ll,aa in data if ll==1 and aa!=a]; b=[x for x,ll,aa in data if ll==0 and aa!=a]
        if not m or not b: continue
        sc.append(cos(e,np.mean(m,0))-cos(e,np.mean(b,0))); lb.append(l)
    return sc,lb

def main():
    items=load()
    M=[x for x in items if x["fam"]==1]; L=[x for x in items if x["fam"]==0]
    sc,lb=loo(items); a=auc(sc,lb)
    # bootstrap clusterise auteur
    authors=sorted(set(x["author"] for x in items))
    by={au:[x for x in items if x["author"]==au] for au in authors}
    boots=[]
    for _ in range(3000):
        samp=[]
        for au in [random.choice(authors) for _ in authors]: samp+=by[au]
        if len(set(x["fam"] for x in samp))<2: continue
        s2,l2=loo(samp); aa=auc(s2,l2)
        if aa==aa: boots.append(aa)
    boots=sorted(boots); ci=[round(np.percentile(boots,2.5),4),round(np.percentile(boots,97.5),4)] if boots else [None,None]
    # permutation auteur
    a_fam={x["author"]:x["fam"] for x in items}; al=list(a_fam); base=[a_fam[x] for x in al]
    ge=0; valid=0
    for _ in range(2000):
        perm=base[:]; random.shuffle(perm); lm={al[i]:perm[i] for i in range(len(al))}
        it2=[dict(emb=x["emb"],fam=lm[x["author"]],author=x["author"]) for x in items]
        if len(set(lm.values()))<2: continue
        s2,l2=loo(it2)
        if not s2: continue
        valid+=1
        if auc(s2,l2)>=a: ge+=1
    pval=(ge+1)/(valid+1) if valid else None
    res=dict(test="MODERN_MASTER vs MODERN_LOW (era-neutralized), bge-m3 embeddings, LOAO",
             n_modern_master=len(M),n_modern_low=len(L),n_authors=len(authors),
             bgem3_AUC=round(a,4),CI95_author_bootstrap=ci,permutation_p=round(pval,5) if pval else None,
             nomic_reference_AUC=0.79,
             winner=("bge-m3" if a>0.79 else "nomic" if a<0.79 else "tie"))
    json.dump(res,open(RES,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps(res,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
