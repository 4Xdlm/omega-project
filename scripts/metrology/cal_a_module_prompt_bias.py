#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAL-A — Calibrer le biais position de gemma4 sur le PROMPT RUNTIME du module IntrinsicQuality
(pairPrompt JSON, sha 139d970d), pour résoudre le mismatch EMP-19 (calibration S1E-B non transférable).
Negative controls : master-master + pulp-pulp, double ordre => position_bias. ZERO modif moteur.
"""
import json, csv, os, sys, urllib.request, re, random
random.seed(42)
OUT=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SEAL=os.path.join(OUT,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(OUT,"S1A_EXTRACTION_MANIFEST.csv")
CORP=os.path.join(OUT,"extracted_corpus")
CACHE=os.path.join(OUT,"CAL_A_cache.json")
RES=os.path.join(OUT,"CAL_A_MODULE_PROMPT_BIAS.json")
MODEL="gemma4:31b"; NPAIR=16

# Prompt RUNTIME EXACT du module IntrinsicQuality (pairPrompt FR) — sha 139d970d
def pairprompt(a,b):
    return ("Tu es un critique litteraire exigeant. Voici deux extraits de prose francaise de longueur "
        "comparable. Lequel est la prose la plus accomplie litterairement (profondeur, style, voix, justesse "
        "— PAS la quantite de peripeties) ?\n\n=== EXTRAIT A ===\n"+a+"\n\n=== EXTRAIT B ===\n"+b+
        "\n\nReponds UNIQUEMENT en JSON : {\"winner\":\"A\"|\"B\"}")

def source_blind(t):
    keep=[]
    for ln in t.split("\n"):
        s=ln.strip()
        if not s: continue
        if re.match(r"(?i)^(chapitre|chapter|tome|livre|partie|part|book)\b[\s\dIVXLC]*$",s): continue
        if re.search(r"(?i)gutenberg|isbn|copyright|©|tous droits",s): continue
        if s.isupper() and len(s.split())<=8: continue
        keep.append(s)
    return re.sub(r"\s+"," "," ".join(keep)).strip()

def gen(prompt):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":MODEL,"prompt":prompt,"stream":False,"think":False,
                         "options":{"temperature":0,"num_predict":24}}).encode(),
        headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=240) as r: return json.loads(r.read()).get("response","")
    except Exception as e: return "ERR:"+type(e).__name__

def parse(r):
    s=(r or "").upper()
    m=re.search(r'WINNER"?\s*:?\s*"?\s*([AB])',s)
    if m: return m.group(1)
    mm=re.findall(r"\b([AB])\b",s)
    return mm[-1] if mm else None

def load():
    sha2idx={r["sha_text"]:r["idx"] for r in csv.DictReader(open(MAN,encoding="utf-8"))}
    cells={}
    for f in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
        import glob
        idx=sha2idx.get(f["sha_text"]);
        if idx is None: continue
        g=glob.glob(os.path.join(CORP,f"{int(idx):05d}_*.txt"))
        if not g: continue
        cells.setdefault(f["cell"],[]).append(source_blind(open(g[0],encoding="utf-8",errors="ignore").read())[:3500])
    return cells

def main():
    cells=load(); cache=json.load(open(CACHE,encoding="utf-8")) if os.path.exists(CACHE) else {}
    res={}
    for cell in ["MASTER_NATIVE_FR","D_SOURCE_REAL_FR"]:
        pool=cells.get(cell,[]); pp=[(i,j) for i in range(len(pool)) for j in range(i+1,len(pool))]
        random.Random(7).shuffle(pp); pp=pp[:NPAIR]; dec=0;posA=0;err=0;n=0
        for i,j in pp:
            for order in ("IJ","JI"):
                k=f"{cell}|{i}|{j}|{order}"
                if k not in cache or str(cache[k]).startswith("ERR") or cache[k] is None:
                    A,B=(pool[i],pool[j]) if order=="IJ" else (pool[j],pool[i])
                    cache[k]=parse(gen(pairprompt(A,B))); n+=1
                    if n%20==0: json.dump(cache,open(CACHE,"w")); print(f"  {cell} {n}",flush=True)
                a=cache[k]
                if a in("A","B"): dec+=1; posA+=(1 if a=="A" else 0)
                else: err+=1
        json.dump(cache,open(CACHE,"w"))
        res[cell]=dict(decisions=dec,errors=err,position_bias=round(posA/max(1,dec),3))
    pb=[res[c]["position_bias"] for c in res]; maxdev=max(abs(x-0.5) for x in pb)
    out=dict(test="CAL-A gemma4 sur prompt RUNTIME module IntrinsicQuality (139d970d)",
             prompt_sha256="139d970de85a45d356aecfbb254c242dff57018e8f6239b288e6725629570303",
             cells=res, max_position_bias_dev=round(maxdev,3),
             verdict=("CALIBRATED" if maxdev<=0.15 else "CALIBRATION_FAIL_BIAS"),
             note="Si CALIBRATED => le prompt module est apte (biais ~0.5), statut registre passe ADVISORY_APPROVED pour 139d970d. Note: ce prompt force A|B (pas de TIE).")
    json.dump(out,open(RES,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps(out,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
