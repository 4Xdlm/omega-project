#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FIX-JUGE — Calibration du PROMPT CANDIDAT NEUTRE (A|B|TIE) pour le juge module.
Mini-cal gemma4 sur negative controls (master-master + pulp-pulp, double ordre) => position_bias.
Si max|bias-0.5|<=0.15 => candidat ADOPTABLE dans intrinsic-quality.ts. Imprime aussi le sha du prompt.
Ollama local. ZERO modif moteur (mesure seule).
"""
import json, csv, os, urllib.request, re, random, hashlib, glob
random.seed(42)
WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SEAL=os.path.join(WS,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(WS,"S1A_EXTRACTION_MANIFEST.csv")
CORP=os.path.join(WS,"extracted_corpus")
CACHE=os.path.join(WS,"FIX_JUGE_cache.json")
RES=os.path.join(WS,"FIX_JUGE_NEUTRAL_CALIB.json")
MODEL="gemma4:31b"; NPAIR=16

# CANDIDAT NEUTRE : A|B|TIE, echappatoire "trop proche", dimensions qualite, framing neutre [A]/[B].
CAND_TEMPLATE=("Deux extraits litteraires anonymes, A et B.\n\n[A]\n{A}\n\n[B]\n{B}\n\n"
 "Lequel est de plus haute qualite litteraire (profondeur, style, voix, justesse) ? "
 "S'ils sont d'un niveau trop proche pour departager honnetement, reponds TIE. "
 "Reponds UNIQUEMENT : A, B, ou TIE.")
PROMPT_SHA=hashlib.sha256(CAND_TEMPLATE.encode("utf-8")).hexdigest()

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
def gen(p):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":MODEL,"prompt":p,"stream":False,"think":False,
                         "options":{"temperature":0,"num_predict":12}}).encode(),
        headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=240) as r: return json.loads(r.read()).get("response","")
    except Exception as e: return "ERR:"+type(e).__name__
def parse(r):
    s=(r or "").strip().upper()
    if "TIE" in s or "EGAL" in s or "ÉGAL" in s or "PROCHE" in s: return "TIE"
    m=re.findall(r"\b([AB])\b",s); return m[-1] if m else None
def load():
    sha2idx={r["sha_text"]:r["idx"] for r in csv.DictReader(open(MAN,encoding="utf-8"))}
    cells={}
    for f in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
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
        random.Random(7).shuffle(pp); pp=pp[:NPAIR]; dec=0;posA=0;tie=0;n=0
        for i,j in pp:
            for order in ("IJ","JI"):
                k=f"{cell}|{i}|{j}|{order}"
                if k not in cache or cache[k] is None or str(cache[k]).startswith("ERR"):
                    A,B=(pool[i],pool[j]) if order=="IJ" else (pool[j],pool[i])
                    cache[k]=parse(gen(CAND_TEMPLATE.format(A=A,B=B))); n+=1
                    if n%20==0: json.dump(cache,open(CACHE,"w")); print(f"  {cell} {n}",flush=True)
                a=cache[k]
                if a=="TIE": tie+=1
                elif a in("A","B"): dec+=1; posA+=(1 if a=="A" else 0)
        json.dump(cache,open(CACHE,"w"))
        res[cell]=dict(decisions=dec,tie=tie,tie_rate=round(tie/max(1,tie+dec),3),position_bias=round(posA/max(1,dec),3))
    pb=[res[c]["position_bias"] for c in res]; maxdev=max(abs(x-0.5) for x in pb)
    out=dict(test="FIX-JUGE candidat neutre A|B|TIE", prompt_sha256=PROMPT_SHA, cells=res,
             max_position_bias_dev=round(maxdev,3),
             verdict=("CALIBRATED_ADOPTABLE" if maxdev<=0.15 else "STILL_BIASED"),
             note="Si CALIBRATED => adopter ce template dans intrinsic-quality.ts (pairPrompt) + parser A|B|TIE + tournoi TIE, maj registre.")
    json.dump(out,open(RES,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps(out,ensure_ascii=False,indent=2))
if __name__=="__main__": main()
