import sys, json, random
import numpy as np
OUT=sys.argv[1]
sys.argv=["s1e_a.py", OUT, "40"]
import importlib.util
spec=importlib.util.spec_from_file_location("s1e_a","scripts/metrology/s1e_a.py")
s=importlib.util.module_from_spec(spec); spec.loader.exec_module(s)
items=s.load()
M=[x for x in items if x["fam"]=="MMASTER"]; L=[x for x in items if x["fam"]=="MLOW"]
print("n_master_works",len(M),"authors",len(set(x["author"] for x in M)))
print("n_low_works",len(L),"authors",len(set(x["author"] for x in L)))
cache=json.load(open(OUT+r"\S1E_A_judge_cache.json"))
pairs=[(i,j) for i in range(len(M)) for j in range(len(L))]; random.Random(1).shuffle(pairs); pairs=pairs[:40]
wins=[];pos=[];ties=0
for i,j in pairs:
  for order in("MD","DM"):
    k=f"{order}|{i}|{j}"
    if k not in cache: continue
    ans=cache[k]; mp="A" if order=="MD" else "B"
    if ans in("TIE","INSUFFICIENT"): ties+=1; continue
    wins.append(1 if ans==mp else 0); pos.append(1 if ans=="A" else 0)
# bootstrap par auteur (sur les paires; auteur du master i)
print("gemma_MODERN_win_rate", round(float(np.mean(wins)),4) if wins else None,
      "| n_judg", len(wins), "| ties", ties, "| pos_bias", round(float(np.mean(pos)),3) if pos else None)
sc,lb=s.loo(M,L)
print("embeddings_MODERN_AUC", round(float(s.auc(sc,lb)),4), "| n_scored", len(sc))
