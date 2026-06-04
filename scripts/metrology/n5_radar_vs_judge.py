#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N5-AGREE — Le radar géométrique bge-m3 (cheap) est-il d'accord avec le juge OMEGA (cher) ?
Apparie, par chapitre BOOK_FULL, le radar score (N5 telemetry) avec le composite + min_axis
OMEGA (chapter_NN_result.json). Spearman + diagnostic. Lecture seule. ZERO modif moteur.
"""
import json, os, re, glob
import numpy as np

WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SESS=r"C:\Users\elric\omega-project\packages\sovereign-engine\sessions"
TEL=os.path.join(WS,"N5_SHADOW_TELEMETRY.json")
OUT=os.path.join(WS,"N5_RADAR_VS_JUDGE.json")

def spearman(x,y):
    n=len(x)
    if n<4: return float("nan")
    def rank(v):
        order=sorted(range(len(v)),key=lambda i:v[i]); r=[0.0]*len(v); i=0
        while i<len(v):
            j=i
            while j+1<len(v) and v[order[j+1]]==v[order[i]]: j+=1
            avg=(i+j)/2.0+1
            for k in range(i,j+1): r[order[k]]=avg
            i=j+1
        return r
    rx,ry=rank(x),rank(y)
    mx,my=sum(rx)/n,sum(ry)/n
    num=sum((a-mx)*(b-my) for a,b in zip(rx,ry))
    den=(sum((a-mx)**2 for a in rx)*sum((b-my)**2 for b in ry))**0.5
    return num/den if den else float("nan")

def main():
    tel=json.load(open(TEL,encoding="utf-8"))
    radar={r["scene"]:r["score"] for r in tel["rows"] if isinstance(r["score"],(int,float)) and r["score"]==r["score"]}
    rows=[]
    for scene,score in radar.items():
        sess,chap=scene.split("/")
        m=re.match(r"chapter_(\d+)\.txt",chap)
        if not m: continue
        rj=os.path.join(SESS,sess,f"chapter_{m.group(1)}_result.json")
        if not os.path.exists(rj): continue
        try: d=json.load(open(rj,encoding="utf-8"))
        except Exception: continue
        comp=d.get("composite"); mina=d.get("min_axis")
        if comp is None: continue
        rows.append(dict(scene=scene,radar=score,composite=comp,min_axis=mina,
                         ecc=d.get("macro_axes",{}).get("ecc")))
    # dédup par radar score (sessions répliquées) pour ne pas gonfler n
    seen={}; uniq=[]
    for r in rows:
        k=round(r["radar"],6)
        if k in seen: continue
        seen[k]=1; uniq.append(r)
    res={"n_paired":len(rows),"n_unique":len(uniq)}
    if len(uniq)>=4:
        rad=[r["radar"] for r in uniq]; comp=[r["composite"] for r in uniq]
        mina=[r["min_axis"] for r in uniq if r["min_axis"] is not None]
        radm=[r["radar"] for r in uniq if r["min_axis"] is not None]
        ecc=[r["ecc"] for r in uniq if r["ecc"] is not None]
        rade=[r["radar"] for r in uniq if r["ecc"] is not None]
        res["spearman_radar_vs_composite"]=round(spearman(rad,comp),4)
        res["spearman_radar_vs_min_axis"]=round(spearman(radm,mina),4) if mina else None
        res["spearman_radar_vs_ecc"]=round(spearman(rade,ecc),4) if ecc else None
        res["composite_range"]=[round(min(comp),2),round(max(comp),2)]
        res["radar_range"]=[round(min(rad),4),round(max(rad),4)]
        res["interpretation"]=("Spearman élevé (>0.5) => radar = proxy de sélection du juge. "
            "Faible/nul => radar et juge mesurent des choses différentes (géométrie vs multi-axes).")
        res["rows"]=sorted(uniq,key=lambda r:-r["radar"])
    json.dump(res,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps({k:v for k,v in res.items() if k!="rows"},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
