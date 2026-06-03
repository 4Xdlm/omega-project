#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1E-B — NEGATIVE CONTROLS (calibration). master-vs-master & pulp-vs-pulp, source-blind.
Sorties A/B/TIE. Mesure tie_rate (un juge sain doit douter entre 2 maitres), position_bias,
et accord gemma vs mistral. gemma PUIS mistral (pas de swap VRAM par appel). ZERO modif moteur.
"""
import json, csv, os, glob, sys, urllib.request, re, random
import numpy as np
random.seed(42)
OUT=sys.argv[1]; NPAIR=int(sys.argv[2]) if len(sys.argv)>2 else 24
SEAL=os.path.join(OUT,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(OUT,"S1A_EXTRACTION_MANIFEST.csv")
CORP=os.path.join(OUT,"extracted_corpus")
CACHE=os.path.join(OUT,"S1E_B_nc_cache.json")
MODELS=["gemma4:31b","mistral-small:latest"]

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
            text=source_blind(open(g[0],encoding="utf-8").read())[:3500]))
    return cells

def main():
    cells=load(); cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    def pairs_of(cell):
        pool=cells.get(cell,[]); pp=[(i,j) for i in range(len(pool)) for j in range(i+1,len(pool))]
        random.Random(7).shuffle(pp); return pool,pp[:NPAIR]
    res={}
    for model in MODELS:            # gemma entier PUIS mistral entier (pas de swap par appel)
        for cell in ["MASTER_NATIVE_FR","D_SOURCE_REAL_FR"]:
            pool,pp=pairs_of(cell); dec=0;tie=0;posA=0;n=0;errs=0
            for i,j in pp:
                for order in("IJ","JI"):
                    k=f"{model}|{cell}|{i}|{j}|{order}"
                    if k not in cache or str(cache[k]).startswith("ERR"):
                        A,B=(pool[i]["text"],pool[j]["text"]) if order=="IJ" else (pool[j]["text"],pool[i]["text"])
                        cache[k]=parse(gen(model,PROMPT.format(A=A,B=B))); n+=1
                        if n%20==0: json.dump(cache,open(CACHE,"w")); print(f"  {model} {cell} {n}",flush=True)
                    a=cache[k]
                    if a=="TIE": tie+=1
                    else: dec+=1; posA+=(1 if a=="A" else 0)
            json.dump(cache,open(CACHE,"w"))
            tot=tie+dec
            res[f"{model}|{cell}"]=dict(pairs=len(pp),judgments=tot,
                tie_rate=round(tie/max(1,tot),3),forced=dec,
                position_bias=round(posA/max(1,dec),3))
            print(json.dumps({f"{model}|{cell}":res[f"{model}|{cell}"]}),flush=True)
    json.dump(res,open(os.path.join(OUT,"S1E_B_NC_RESULTS.json"),"w"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps(res,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
