#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1E-A — Crash-test anti-confond : MODERN_vs_MODERN + SOURCE_BLIND + NEGATIVE_CONTROLS.
Neutralise l'epoque (maitres modernes vs pulp/commercial moderne). gemma4 (A/B/TIE/INSUFF, double ordre)
+ nomic (centroides, K-fold/auteur, reuse cache S1D). Disagreement + confound era. ZERO modif moteur.
"""
import json, csv, os, glob, sys, urllib.request, re, random
import numpy as np
random.seed(42); np.random.seed(42)

OUT=sys.argv[1]; N_PAIRS=int(sys.argv[2]) if len(sys.argv)>2 else 40
SEAL=os.path.join(OUT,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(OUT,"S1A_EXTRACTION_MANIFEST.csv")
CORP=os.path.join(OUT,"extracted_corpus")
EMB=os.path.join(OUT,"S1D_embeddings_nomic.json")
JCACHE=os.path.join(OUT,"S1E_A_judge_cache.json")
GEMMA="gemma4:31b"

# maitres CANONIQUES MODERNES (post ~1950) — match par INTERSECTION DE TOKENS
MODERN_MASTER={"ernaux","modiano","clezio","quignard","duras","butor","sarraute","grillet","perec","beauvoir"}
# bas MODERNE = D_SOURCE_REAL_FR contemporain — exclut 19e (feval) + SAS/OSS117 mi-20e (villiers/bruce)
EXCLUDE_LOW={"feval","villiers","bruce"}
def _toks(a): return set(a.split("_"))

def source_blind(t):
    lines=t.split("\n"); keep=[]
    for ln in lines:
        s=ln.strip()
        if not s: continue
        if re.match(r"(?i)^(chapitre|chapter|tome|livre|partie|part|book)\b[\s\dIVXLC]*$",s): continue
        if re.search(r"(?i)project gutenberg|gutenberg\.org|all rights reserved|tous droits|isbn|copyright|©",s): continue
        if s.isupper() and len(s.split())<=8: continue   # titre/entete en capitales
        keep.append(s)
    t=" ".join(keep)
    t=t.replace("«",'"').replace("»",'"').replace("“",'"').replace("”",'"').replace("’","'")
    t=re.sub(r"\s+"," ",t).strip()
    return t

def gen(model,prompt):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":model,"prompt":prompt,"stream":False,"think":False,
                         "options":{"temperature":0,"num_predict":12}}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=240) as r:
        return json.loads(r.read()).get("response","")

def parse(resp):
    s=(resp or "").strip().upper()
    if "TIE" in s or "EGAL" in s or "ÉGAL" in s: return "TIE"
    if "INSUFF" in s: return "INSUFFICIENT"
    m=re.findall(r"\b([AB])\b",s)
    if m: return m[-1]
    for ch in s:
        if ch in("A","B"): return ch
    return "INSUFFICIENT"

PROMPT=("Voici deux extraits littéraires, A et B (anonymes).\n\n[A]\n{A}\n\n[B]\n{B}\n\n"
        "Lequel est de plus haute QUALITÉ LITTÉRAIRE (maîtrise du style, profondeur, justesse de la voix) ? "
        "Si trop proche pour décider, réponds TIE. Réponds UNIQUEMENT : A, B, ou TIE. /no_think")

def load():
    sha2idx={r["sha_text"]:r["idx"] for r in csv.DictReader(open(MAN,encoding="utf-8"))}
    emb=json.load(open(EMB)) if os.path.exists(EMB) else {}
    items=[]
    for f in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
        idx=sha2idx.get(f["sha_text"]);
        if idx is None: continue
        g=glob.glob(os.path.join(CORP,f"{int(idx):05d}_*.txt"))
        if not g: continue
        a=f["canonical_author"]; cell=f["cell"]
        if cell=="MASTER_NATIVE_FR" and (_toks(a) & MODERN_MASTER): fam="MMASTER"
        elif cell=="D_SOURCE_REAL_FR" and not (_toks(a) & EXCLUDE_LOW): fam="MLOW"
        else: continue
        txt=source_blind(open(g[0],encoding="utf-8").read())
        items.append(dict(fam=fam,author=a,sha=f["sha_text"],text=txt[:3500],
                          emb=(np.array(emb[f["sha_text"]],dtype=float) if f["sha_text"] in emb else None)))
    return items

def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))
def auc(sc,lb):
    p=[s for s,l in zip(sc,lb) if l==1]; n=[s for s,l in zip(sc,lb) if l==0]
    if not p or not n: return float("nan")
    return sum((1 if x>y else .5 if x==y else 0) for x in p for y in n)/(len(p)*len(n))

def loo(M,L):
    data=[(it["emb"],1,it["author"]) for it in M if it["emb"] is not None]+[(it["emb"],0,it["author"]) for it in L if it["emb"] is not None]
    sc=[];lb=[]
    for e,l,a in data:
        m=[x for x,ll,aa in data if ll==1 and aa!=a]; b=[x for x,ll,aa in data if ll==0 and aa!=a]
        if not m or not b: continue
        sc.append(cos(e,np.mean(m,0))-cos(e,np.mean(b,0))); lb.append(l)
    return sc,lb

def main():
    items=load()
    M=[x for x in items if x["fam"]=="MMASTER"]; L=[x for x in items if x["fam"]=="MLOW"]
    cache=json.load(open(JCACHE)) if os.path.exists(JCACHE) else {}
    # ---- gemma pairwise modern master vs modern low ----
    pairs=[(i,j) for i in range(len(M)) for j in range(len(L))]; random.Random(1).shuffle(pairs); pairs=pairs[:N_PAIRS]
    wins=[];pos=[];ties=0;auth=[];n=0
    for i,j in pairs:
        for order in("MD","DM"):
            k=f"{order}|{i}|{j}"
            if k not in cache:
                A,B=(M[i]["text"],L[j]["text"]) if order=="MD" else (L[j]["text"],M[i]["text"])
                cache[k]=parse(gen(GEMMA,PROMPT.format(A=A,B=B))); n+=1
                if n%20==0: json.dump(cache,open(JCACHE,"w")); print(f"  gemma {n}",flush=True)
            ans=cache[k]; mp="A" if order=="MD" else "B"
            if ans=="TIE" or ans=="INSUFFICIENT": ties+=1; continue
            wins.append(1 if ans==mp else 0); pos.append(1 if ans=="A" else 0); auth.append(M[i]["author"])
    json.dump(cache,open(JCACHE,"w"))
    gw=float(np.mean(wins)) if wins else float("nan")
    # bootstrap par auteur
    ua=sorted(set(auth)); idxby={a:[k for k,x in enumerate(auth) if x==a] for a in ua}; bs=[]
    for _ in range(2000):
        samp=[];[samp.extend(idxby[a]) for a in [random.choice(ua) for _ in ua]]
        if samp: bs.append(np.mean([wins[k] for k in samp]))
    gci=[round(np.percentile(bs,2.5),3),round(np.percentile(bs,97.5),3)] if bs else [None,None]
    # ---- embeddings nomic ----
    sc,lb=loo(M,L); eauc=auc(sc,lb)
    # ---- negative controls : master-master & low-low (attendu ~0.5 / TIE haut) ----
    def nc(pool,tag):
        pp=[(i,j) for i in range(len(pool)) for j in range(i+1,len(pool))]; random.Random(2).shuffle(pp); pp=pp[:30]
        t=0;dec=0
        for i,j in pp:
            k=f"NC|{tag}|{i}|{j}"
            if k not in cache:
                cache[k]=parse(gen(GEMMA,PROMPT.format(A=pool[i]["text"],B=pool[j]["text"]))); 
            if cache[k] in("TIE","INSUFFICIENT"): t+=1
            else: dec+=1
        json.dump(cache,open(JCACHE,"w"))
        return dict(pairs=len(pp),tie_rate=round(t/max(1,len(pp)),3),forced=dec)
    nc_master=nc(M,"MM"); nc_low=nc(L,"LL")

    res=dict(
      n_modern_master=len(M),n_modern_low=len(L),
      gemma_modern_win_rate=round(gw,4),gemma_CI95=gci,gemma_tie_rate=round(ties/max(1,2*len(pairs)),3),
      gemma_position_bias=round(float(np.mean(pos)),3) if pos else None,
      embeddings_modern_AUC=round(eauc,4),
      negative_control_master_master=nc_master,negative_control_low_low=nc_low)
    json.dump(res,open(os.path.join(OUT,"S1E_A_RESULTS.json"),"w"),ensure_ascii=False,indent=2)
    print(json.dumps(res,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
