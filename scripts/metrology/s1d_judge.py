#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1D — Choc des Titans : juges LLM pairwise (qwen3:32b + gemma4:31b indépendant) vs embeddings.
Choix forcé double-ordre (anti position-bias), cache crash-safe, master_win_rate + IC95 bootstrap
par auteur + position_bias + matrice désaccords. MÊME Gold-Set scellé. ZERO modif moteur.
"""
import json, csv, os, glob, sys, urllib.request, random
import numpy as np
random.seed(42); np.random.seed(42)

OUT=sys.argv[1]
MODELS=["qwen3:32b","gemma4:31b"]
N_PAIRS=int(sys.argv[2]) if len(sys.argv)>2 else 40
SEAL=os.path.join(OUT,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(OUT,"S1A_EXTRACTION_MANIFEST.csv")
CORP=os.path.join(OUT,"extracted_corpus")
CACHE=os.path.join(OUT,"S1D_judge_cache.json")
CONTRASTS=[("MASTER_NATIVE_FR","D_SOURCE_REAL_FR","fr"),
           ("MASTER_NATIVE_FR","C_FORMULAIC_FR","fr"),
           ("MASTER_NATIVE_EN","C_FORMULAIC_EN","en")]

PROMPT={"fr":"Voici deux extraits littéraires, A et B.\n\n[A]\n{A}\n\n[B]\n{B}\n\nLequel relève de la plus haute QUALITÉ LITTÉRAIRE (maîtrise du style, profondeur, justesse de la voix) — pas le plus spectaculaire, le plus ABOUTI ? Réponds par UNE seule lettre : A ou B.",
        "en":"Here are two literary excerpts, A and B.\n\n[A]\n{A}\n\n[B]\n{B}\n\nWhich one is of higher LITERARY QUALITY (mastery of style, depth, control of voice) — not the flashiest, the most ACCOMPLISHED? Answer with ONE letter: A or B."}

import re as _re
def gen(model,prompt):
    p=prompt+(" /no_think" if "qwen" in model.lower() else "")
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":model,"prompt":p,"stream":False,"think":False,
                         "options":{"temperature":0,"num_predict":24}}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=240) as r:
        return json.loads(r.read()).get("response","")

def parse(resp):
    s=_re.sub(r"<think>.*?</think>","",resp or "",flags=_re.S)
    s=s.strip().upper()
    # cherche une lettre A/B isolée (mot), sinon 1er A/B
    m=_re.findall(r"\b([AB])\b",s)
    if m: return m[-1]
    for ch in s:
        if ch in ("A","B"): return ch
    return None

def load():
    sha2idx={r["sha_text"]:r["idx"] for r in csv.DictReader(open(MAN,encoding="utf-8"))}
    cells={}
    for f in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
        idx=sha2idx.get(f["sha_text"]);
        if idx is None: continue
        g=glob.glob(os.path.join(CORP,f"{int(idx):05d}_*.txt"))
        if not g: continue
        cells.setdefault(f["cell"],[]).append(dict(author=f["canonical_author"],
            text=open(g[0],encoding="utf-8").read()[:3500],sha=f["sha_text"]))
    return cells

def main():
    cells=load()
    cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    results={}
    n=0
    for mcell,lcell,lang in CONTRASTS:
        M=cells.get(mcell,[]); L=cells.get(lcell,[])
        pairs=[(i,j) for i in range(len(M)) for j in range(len(L))]
        random.Random(42).shuffle(pairs); pairs=pairs[:N_PAIRS]
        for model in MODELS:
            wins=[]; pos_first=[]; authors=[]
            for (i,j) in pairs:
                for order in ("MD","DM"):
                    key=f"{model}|{mcell}|{lcell}|{i}|{j}|{order}"
                    if cache.get(key) is None:
                        cache.pop(key,None)
                    if key not in cache:
                        if order=="MD": p=PROMPT[lang].format(A=M[i]["text"],B=L[j]["text"])
                        else: p=PROMPT[lang].format(A=L[j]["text"],B=M[i]["text"])
                        cache[key]=parse(gen(model,p)); n+=1
                        if n%20==0: json.dump(cache,open(CACHE,"w")); print(f"  {n} judged",flush=True)
                    ans=cache[key]
                    if ans is None: continue
                    master_pos = "A" if order=="MD" else "B"
                    wins.append(1 if ans==master_pos else 0)
                    pos_first.append(1 if ans=="A" else 0)
                    authors.append(M[i]["author"])
            json.dump(cache,open(CACHE,"w"))
            wr=float(np.mean(wins)) if wins else float("nan")
            pb=float(np.mean(pos_first)) if pos_first else float("nan")
            # bootstrap par auteur
            uniq=sorted(set(authors)); idxby={a:[k for k,au in enumerate(authors) if au==a] for a in uniq}
            bs=[]
            for _ in range(2000):
                samp=[]
                for a in [random.choice(uniq) for _ in uniq]: samp+=idxby[a]
                if samp: bs.append(np.mean([wins[k] for k in samp]))
            lo,hi=(np.percentile(bs,2.5),np.percentile(bs,97.5)) if bs else (float('nan'),float('nan'))
            results[f"{model}|{mcell}_vs_{lcell}"]=dict(master_win_rate=round(wr,4),
                CI95=[round(lo,4),round(hi,4)],position_bias=round(pb,4),n_judg=len(wins))
            print(json.dumps({f"{model}|{mcell}_vs_{lcell}":results[f"{model}|{mcell}_vs_{lcell}"]}),flush=True)
    json.dump(results,open(os.path.join(OUT,"S1D_JUDGE_RESULTS.json"),"w"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps(results,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
