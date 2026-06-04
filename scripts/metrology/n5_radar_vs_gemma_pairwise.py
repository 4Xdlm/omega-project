#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N5-AGREE2 — Accord radar bge-m3 vs juge gemma, PLAGE LARGE (maître vs pulp moderne).
Réutilise les décisions pairwise gemma cachées (S1E_A_judge_cache.json) et compare au
gagnant radar (score LOAO plus élevé). Résout le caveat de plage restreinte de N5-AGREE.
Lecture seule, cache bge-m3. EMP-18 (centroïde LOAO excluant l'auteur). ZERO modif moteur.
"""
import json, csv, os, glob
import numpy as np

WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SEAL=os.path.join(WS,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
MAN=os.path.join(WS,"S1A_EXTRACTION_MANIFEST.csv")
EMB=os.path.join(WS,"V4G3_embeddings_bgem3.json")
JCACHE=os.path.join(WS,"S1E_A_judge_cache.json")
OUT=os.path.join(WS,"N5_RADAR_VS_GEMMA_PAIRWISE.json")

MODERN_MASTER={"ernaux","modiano","clezio","quignard","duras","butor","sarraute","grillet","perec","beauvoir"}
EXCLUDE_LOW={"feval","villiers","bruce"}
def _toks(a): return set(a.split("_"))

def load():
    """Reconstruit M (MMASTER) et L (MLOW) dans l'ORDRE du fichier SEAL (= ordre des clés cache)."""
    emb=json.load(open(EMB,encoding="utf-8"))
    M=[];L=[]
    for f in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
        a=f["canonical_author"]; cell=f["cell"]; v=emb.get(f["sha_text"])
        if cell=="MASTER_NATIVE_FR" and (_toks(a)&MODERN_MASTER): M.append(dict(author=a,emb=(np.array(v,dtype=float) if v is not None else None)))
        elif cell=="D_SOURCE_REAL_FR" and not (_toks(a)&EXCLUDE_LOW): L.append(dict(author=a,emb=(np.array(v,dtype=float) if v is not None else None)))
    return M,L

def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))

def main():
    M,L=load()
    allm=[x for x in M if x["emb"] is not None]; alll=[x for x in L if x["emb"] is not None]
    def radar(it):
        m=[x["emb"] for x in allm if x["author"]!=it["author"]]
        l=[x["emb"] for x in alll if x["author"]!=it["author"]]
        if not m or not l or it["emb"] is None: return None
        return cos(it["emb"],np.mean(m,0))-cos(it["emb"],np.mean(l,0))
    rM=[radar(x) for x in M]; rL=[radar(x) for x in L]
    cache=json.load(open(JCACHE,encoding="utf-8")) if os.path.exists(JCACHE) else {}
    # agrège les 2 ordres par paire (i,j) : gemma winner = master si A en MD ou B en DM
    pairs={}
    for k,v in cache.items():
        if "|" not in k: continue
        parts=k.split("|")
        if len(parts)!=3 or parts[0] not in ("MD","DM"): continue
        order,i,j=parts[0],int(parts[1]),int(parts[2])
        if v not in ("A","B"): continue  # ignore TIE/INSUFF
        master_won = (v=="A" and order=="MD") or (v=="B" and order=="DM")
        pairs.setdefault((i,j),[]).append(master_won)
    agree=0; disagree=0; tie_radar=0; skipped=0; gemma_master=0; n=0
    for (i,j),votes in pairs.items():
        if i>=len(rM) or j>=len(rL) or rM[i] is None or rL[j] is None: skipped+=1; continue
        gemma_master_win = sum(votes)/len(votes) >= 0.5   # consensus des ordres
        radar_master_win = rM[i] > rL[j]
        n+=1; gemma_master+=(1 if gemma_master_win else 0)
        if rM[i]==rL[j]: tie_radar+=1; continue
        if gemma_master_win==radar_master_win: agree+=1
        else: disagree+=1
    dec=agree+disagree
    res=dict(test="N5-AGREE2 accord radar bge-m3 vs gemma pairwise (maître-vs-pulp moderne, plage LARGE)",
             n_pairs_judged=n, gemma_master_win_rate=round(gemma_master/max(1,n),3),
             radar_ties=tie_radar, skipped_no_emb=skipped,
             agreement_rate=round(agree/max(1,dec),3), agree=agree, disagree=disagree,
             note="Accord élevé => radar concorde avec le juge sur le contraste large maître/pulp (validation croisée). "
                  "Complète N5-AGREE (qui était range-restricted sur la prose OMEGA passing).")
    json.dump(res,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps(res,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
