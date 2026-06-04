#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N5-REF — Calibration des bandes radar contre vérité-terrain (Gold-Set, bge-m3).
Score LOAO (EMP-18 : centroïde maître/low excluant l'AUTEUR testé) pour chaque livre Gold-Set.
Donne les distributions maîtres vs pulp/formulaic, puis place la prose OMEGA (N5 telemetry).
Lecture seule, cache bge-m3. ZERO modif moteur.
"""
import json, csv, os
import numpy as np

WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
EMB=os.path.join(WS,"V4G3_embeddings_bgem3.json")
SEAL=os.path.join(WS,"S1C_GOLDSET_FINAL_MANIFEST.jsonl")
TEL=os.path.join(WS,"N5_SHADOW_TELEMETRY.json")
OUT=os.path.join(WS,"N5_RADAR_REFERENCE.json")

MASTER={"MASTER_NATIVE_FR","MASTER_NATIVE_EN"}
LOW={"C_FORMULAIC_FR","C_FORMULAIC_EN","D_SOURCE_REAL_FR"}

def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))

def main():
    emb=json.load(open(EMB,encoding="utf-8"))
    items=[]
    for r in [json.loads(l) for l in open(SEAL,encoding="utf-8")]:
        v=emb.get(r["sha_text"])
        if v is None: continue
        grp="master" if r["cell"] in MASTER else ("low" if r["cell"] in LOW else None)
        if grp is None: continue
        items.append(dict(grp=grp,author=r["canonical_author"],emb=np.array(v,dtype=float)))
    M=[it for it in items if it["grp"]=="master"]; L=[it for it in items if it["grp"]=="low"]
    def loao_score(it):
        m=[x["emb"] for x in M if x["author"]!=it["author"]]
        l=[x["emb"] for x in L if x["author"]!=it["author"]]
        return cos(it["emb"],np.mean(m,0))-cos(it["emb"],np.mean(l,0))
    ms=[loao_score(it) for it in M]; ls=[loao_score(it) for it in L]
    def dist(xs):
        a=np.array(xs)
        return dict(n=len(xs),mean=round(float(a.mean()),4),median=round(float(np.median(a)),4),
                    p25=round(float(np.percentile(a,25)),4),p75=round(float(np.percentile(a,75)),4),
                    min=round(float(a.min()),4),max=round(float(a.max()),4))
    md=dist(ms); ld=dist(ls)
    # OMEGA telemetry
    omega=None
    if os.path.exists(TEL):
        t=json.load(open(TEL,encoding="utf-8"))
        sc=[r["score"] for r in t["rows"] if isinstance(r["score"],(int,float)) and r["score"]==r["score"]]
        uniq=sorted(set(round(s,6) for s in sc))
        a=np.array(uniq)
        omega=dict(n_unique=len(uniq),mean=round(float(a.mean()),4),median=round(float(np.median(a)),4),
                   p25=round(float(np.percentile(a,25)),4),p75=round(float(np.percentile(a,75)),4),
                   min=round(float(a.min()),4),max=round(float(a.max()),4))
    # positionnement : (omega_mean - low_mean)/(master_mean - low_mean) = 0 pulp .. 1 maître
    pos=None
    if omega and (md["mean"]-ld["mean"])!=0:
        pos=round((omega["mean"]-ld["mean"])/(md["mean"]-ld["mean"]),3)
    out=dict(test="N5-REF radar LOAO bge-m3 : maîtres vs pulp/formulaic, placement OMEGA",
             master_LOAO=md, low_LOAO=ld, omega_BOOK_FULL=omega,
             omega_position_0pulp_1master=pos,
             note="score=cos(emb,master_centroid_LOAO)-cos(emb,low_centroid_LOAO). EMP-18 respecté (auteur exclu).")
    json.dump(out,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps(out,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
