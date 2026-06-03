#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N2 — Chasse au 2e juge non biaise. Calibration position_bias sur negative controls
(master-master & pulp-pulp, order-swapped) + sanity master-vs-pulp accuracy.
Modeles candidats en argv. Un juge sain : position_bias ~0.50, tie_rate>0 sur cas proches,
et classe master>pulp en forced choice. ZERO modif moteur. Crash-safe cache par modele.

Usage: python n2_judge_hunt.py <OUT> "phi4,command-r7b,llama3.1:8b" [NPAIR]
"""
import json, csv, os, glob, sys, urllib.request, re, random
import numpy as np
random.seed(42)
OUT=sys.argv[1]
MODELS=sys.argv[2].split(",") if len(sys.argv)>2 else ["phi4","command-r7b","llama3.1:8b"]
NPAIR=int(sys.argv[3]) if len(sys.argv)>3 else 16
SEAL=os.path.join(OUT,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(OUT,"S1A_EXTRACTION_MANIFEST.csv")
CORP=os.path.join(OUT,"extracted_corpus")
CACHE=os.path.join(OUT,"N2_judge_hunt_cache.json")
RES=os.path.join(OUT,"N2_JUDGE_HUNT_RESULTS.json")

def source_blind(t):
    keep=[]
    for ln in t.split("\n"):
        s=ln.strip()
        if not s: continue
        if re.match(r"(?i)^(chapitre|chapter|tome|livre|partie|part|book)\b[\s\dIVXLC]*$",s): continue
        if re.search(r"(?i)project gutenberg|gutenberg\.org|all rights reserved|tous droits|isbn|copyright|©",s): continue
        if s.isupper() and len(s.split())<=8: continue
        keep.append(s)
    t=" ".join(keep).replace("«",'"').replace("»",'"').replace("“",'"').replace("”",'"').replace("’","'")
    return re.sub(r"\s+"," ",t).strip()

def gen(model,prompt):
    p=prompt+(" /no_think" if "qwen" in model.lower() else "")
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":model,"prompt":p,"stream":False,"think":False,
                         "options":{"temperature":0,"num_predict":12}}).encode(),
        headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=240) as r: return json.loads(r.read()).get("response","")
    except Exception as e: return "ERR:"+type(e).__name__

def parse(r):
    s=(r or "").strip().upper()
    if "TIE" in s or "EGAL" in s or "ÉGAL" in s or "PROCHE" in s: return "TIE"
    m=re.findall(r"\b([AB])\b",s)
    if m: return m[-1]
    for c in s:
        if c in("A","B"): return c
    return "TIE"

PROMPT=("Deux extraits littéraires anonymes, A et B.\n\n[A]\n{A}\n\n[B]\n{B}\n\n"
        "Lequel est de plus haute QUALITÉ LITTÉRAIRE ? S'ils sont d'un niveau trop proche pour "
        "départager honnêtement, réponds TIE. Réponds UNIQUEMENT : A, B, ou TIE.")

def load():
    sha2idx={r["sha_text"]:r["idx"] for r in csv.DictReader(open(MAN,encoding="utf-8"))}
    cells={}
    for f in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
        idx=sha2idx.get(f["sha_text"])
        if idx is None: continue
        g=glob.glob(os.path.join(CORP,f"{int(idx):05d}_*.txt"))
        if not g: continue
        cells.setdefault(f["cell"],[]).append(dict(author=f["canonical_author"],
            text=source_blind(open(g[0],encoding="utf-8",errors="ignore").read())[:3500]))
    return cells

def main():
    cells=load(); cache=json.load(open(CACHE,encoding="utf-8")) if os.path.exists(CACHE) else {}
    def pairs_within(cell):
        pool=cells.get(cell,[]); pp=[(i,j) for i in range(len(pool)) for j in range(i+1,len(pool))]
        random.Random(7).shuffle(pp); return pool,pp[:NPAIR]
    def pairs_cross(c1,c2):  # master vs pulp (different quality) for accuracy/position
        p1=cells.get(c1,[]); p2=cells.get(c2,[]); pp=[(i,j) for i in range(len(p1)) for j in range(len(p2))]
        random.Random(9).shuffle(pp); return p1,p2,pp[:NPAIR]
    res={}
    for model in MODELS:
        entry={}
        # --- negative controls within-cell : position_bias + tie_rate ---
        for cell in ["MASTER_NATIVE_FR","D_SOURCE_REAL_FR"]:
            pool,pp=pairs_within(cell); tie=0;dec=0;posA=0;n=0
            for i,j in pp:
                for order in("IJ","JI"):
                    k=f"{model}|NC|{cell}|{i}|{j}|{order}"
                    if k not in cache or str(cache[k]).startswith("ERR"):
                        A,B=(pool[i]["text"],pool[j]["text"]) if order=="IJ" else (pool[j]["text"],pool[i]["text"])
                        cache[k]=parse(gen(model,PROMPT.format(A=A,B=B))); n+=1
                        if n%20==0: json.dump(cache,open(CACHE,"w")); print(f"  {model} NC {cell} {n}",flush=True)
                    a=cache[k]
                    if a=="TIE": tie+=1
                    else: dec+=1; posA+=(1 if a=="A" else 0)
            tot=tie+dec
            entry[f"NC_{cell}"]=dict(tie_rate=round(tie/max(1,tot),3),forced=dec,
                                     position_bias=round(posA/max(1,dec),3))
        # --- cross master-vs-pulp : accuracy (master should win) order-swapped ---
        p1,p2,pp=pairs_cross("MASTER_NATIVE_FR","D_SOURCE_REAL_FR"); correct=0;dec=0;posA=0
        for i,j in pp:
            for order in("MD","DM"):
                k=f"{model}|CR|{i}|{j}|{order}"
                if k not in cache or str(cache[k]).startswith("ERR"):
                    A,B=(p1[i]["text"],p2[j]["text"]) if order=="MD" else (p2[j]["text"],p1[i]["text"])
                    cache[k]=parse(gen(model,PROMPT.format(A=A,B=B)))
                a=cache[k]; master_pos="A" if order=="MD" else "B"
                if a=="TIE": continue
                dec+=1; correct+=(1 if a==master_pos else 0); posA+=(1 if a=="A" else 0)
        json.dump(cache,open(CACHE,"w"))
        entry["CROSS_master_vs_pulp"]=dict(master_win_rate=round(correct/max(1,dec),3),
                                           forced=dec,position_bias=round(posA/max(1,dec),3))
        # verdict
        pb=[entry["NC_MASTER_NATIVE_FR"]["position_bias"],entry["NC_D_SOURCE_REAL_FR"]["position_bias"],
            entry["CROSS_master_vs_pulp"]["position_bias"]]
        maxdev=max(abs(x-0.5) for x in pb)
        entry["max_position_bias_dev"]=round(maxdev,3)
        entry["verdict"]="ADMIS" if maxdev<=0.15 else "DISQUALIFIE_BIAIS_POSITION"
        res[model]=entry
        print(json.dumps({model:entry},ensure_ascii=False),flush=True)
    json.dump(res,open(RES,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps(res,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
