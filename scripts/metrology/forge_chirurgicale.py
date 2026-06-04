#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FORGE-CHIRURGICALE — 1 levier Rosetta/passe (causal). Tribunal 2/2 : isoler chaque levier.
3 chapitres OMEGA (low/mixed/master) × 4 leviers actifs gemma4 (TTR/compression/contraste/rareté),
length-enforced (thermostat de masse ±, rejet si <90%), radar bge-m3 avant/après + gemma pairwise calibré.
Objectif : quel levier déplace le radar vers le cluster maître. PAS de combiné. ZERO modif moteur.
Leviers tirés de ROSETTA_BRIDGE_MATRIX_GEMMA4.json (active=true). f17/hook/cliff/f25g EXCLUS.
"""
import json, os, re, urllib.request
import numpy as np
WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SESS=r"C:\Users\elric\omega-project\packages\sovereign-engine\sessions"
TEL=os.path.join(WS,"N5_SHADOW_TELEMETRY.json")
CENT=r"C:\Users\elric\omega-project\packages\sovereign-engine\src\oracle\intrinsic-quality\data\bgem3-radar-centroids.json"
GEMMA_MATRIX=r"C:\Users\elric\omega-project\packages\sovereign-engine\src\scoring\data\ROSETTA_BRIDGE_MATRIX_GEMMA4.json"
OUT=os.path.join(WS,"FORGE_CHIRURGICALE_RESULTS.json"); REW=os.path.join(WS,"forge_chirurgicale"); os.makedirs(REW,exist_ok=True)
GEN="gemma4:31b"; EMB="bge-m3"

def words(t): return [w for w in re.split(r"\s+",t) if w]
def middle(t,n=1500):
    w=words(t)
    if len(w)<=n: return " ".join(w)
    s=(len(w)-n)//2; return " ".join(w[s:s+n])
def gen(prompt,temp=0.7,npredict=3600):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":GEN,"prompt":prompt,"stream":False,"think":False,
                         "options":{"temperature":temp,"num_predict":npredict}}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=900) as r: return json.loads(r.read()).get("response","")
def embed(t):
    for cap in (6000,3000,1500):
        try:
            req=urllib.request.Request("http://localhost:11434/api/embeddings",
                data=json.dumps({"model":EMB,"prompt":t[:cap]}).encode(),
                headers={"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=120) as r:
                e=json.loads(r.read()).get("embedding")
                if e: return np.array(e,dtype=float)
        except Exception: continue
    return None
def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))
def judge_once(a,b):
    p=("Deux extraits litteraires anonymes, A et B.\n\n[A]\n"+a[:3500]+"\n\n[B]\n"+b[:3500]+
       "\n\nLequel est de plus haute qualite litteraire (profondeur, style, voix, justesse) ? "
       "Si trop proche pour departager honnetement, reponds TIE. "
       'Reponds UNIQUEMENT en JSON : {"verdict":"A"} ou {"verdict":"B"} ou {"verdict":"TIE"}.')
    try: s=gen(p,0,24).upper()
    except Exception: return "ERR"
    m=re.search(r'VERDICT"?\s*:?\s*"?\s*(A|B|TIE)',s)
    if m: return m.group(1)
    if "TIE" in s: return "TIE"
    mm=re.findall(r"\b([AB])\b",s); return mm[-1] if mm else "TIE"
def pairwise(orig,rew):
    r1=judge_once(orig,rew); r2=judge_once(rew,orig); sr=so=0
    if r1=="B": sr+=1
    elif r1=="A": so+=1
    if r2=="A": sr+=1
    elif r2=="B": so+=1
    return "REWRITE" if sr>so else "ORIGINAL" if so>sr else "TIE"

def forge_prompt(text,target,lever_instr):
    return (f"Tu es un ecrivain litteraire exigeant. Reecris le texte ci-dessous en appliquant UNIQUEMENT "
     f"cette consigne de style : « {lever_instr} ». N'applique AUCUNE autre transformation stylistique. "
     f"IMPERATIF DE LONGUEUR : au minimum {target} mots (vise {target} a {target+200}). N'abrege JAMAIS, "
     f"ne resume pas, developpe si besoin pour MAINTENIR la longueur. Garde la meme histoire, les memes "
     f"evenements, la meme intention de scene. Rends UNIQUEMENT le texte reecrit, sans aucun commentaire.\n\nTEXTE:\n{text}")

def main():
    cent=json.load(open(CENT,encoding="utf-8")); mc=np.array(cent["master_centroid"]); lc=np.array(cent["low_centroid"])
    def radar(t):
        e=embed(t); return None if e is None else round(cos(e,mc)-cos(e,lc),5)
    gm=json.load(open(GEMMA_MATRIX,encoding="utf-8"))
    levers=[(k,gm["features"][k]["instruction"]) for k in gm["active_levers"]]  # 4 leviers SOLIDE&pilot>0
    tel=json.load(open(TEL,encoding="utf-8"))
    rows=[r for r in tel["rows"] if isinstance(r["score"],(int,float)) and r["score"]==r["score"]]
    uniq={}
    for r in rows:
        k=round(r["score"],6)
        if k not in uniq: uniq[k]=r
    su=sorted(uniq.values(),key=lambda r:r["score"])
    picks=[("low-like",su[0]),("mixed",su[len(su)//2]),("master-like",su[-1])]
    results=[]; lever_agg={k:[] for k,_ in levers}
    for label,r in picks:
        sess,chap=r["scene"].split("/"); raw=open(os.path.join(SESS,sess,chap),encoding="utf-8",errors="ignore").read()
        orig=middle(raw); target=len(words(orig)); ro=radar(orig)
        for lev,instr in levers:
            print(f"[FORGE-CHIR] {label} {lev} ...",flush=True)
            rw=gen(forge_prompt(orig,target,instr)).strip()
            wn=len(words(rw)); rr=radar(rw); length_ok=wn>=0.90*target
            pw=pairwise(orig,rw) if wn>200 else "INVALID"
            open(os.path.join(REW,f"{label}_{lev}.txt"),"w",encoding="utf-8").write(rw)
            cell=dict(label=label,scene=r["scene"],lever=lev,radar_before=ro,radar_after=rr,
                      radar_delta=(round(rr-ro,5) if (rr is not None and ro is not None) else None),
                      words=wn,target=target,length_ok=bool(length_ok),pairwise=pw,
                      PASS=bool(length_ok and pw=="REWRITE" and rr is not None and ro is not None and rr>=ro))
            results.append(cell)
            if cell["radar_delta"] is not None: lever_agg[lev].append(cell["radar_delta"])
            print(json.dumps(cell,ensure_ascii=False),flush=True)
    # agrégat par levier
    lever_summary={}
    for lev in lever_agg:
        ds=lever_agg[lev]; wins=sum(1 for c in results if c["lever"]==lev and c["pairwise"]=="REWRITE")
        passes=sum(1 for c in results if c["lever"]==lev and c["PASS"])
        lever_summary[lev]=dict(mean_radar_delta=round(float(np.mean(ds)),5) if ds else None,
                                rewrites_won=wins, passes=passes, n=len([c for c in results if c['lever']==lev]))
    best=max(lever_summary.items(), key=lambda kv: (kv[1]["mean_radar_delta"] if kv[1]["mean_radar_delta"] is not None else -9))
    summ=dict(run="FORGE-CHIRURGICALE 1 levier/passe (gemma4 leviers actifs, juge calibré ecfb32d6)",
              levers=[k for k,_ in levers], n_cells=len(results),
              lever_summary=lever_summary, best_lever_by_radar=best[0], rows=results,
              note="Causal : quel levier isolé déplace le radar vers maître. Pas de combiné (décision Architecte).")
    json.dump(summ,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps({k:v for k,v in summ.items() if k!="rows"},ensure_ascii=False,indent=2))
if __name__=="__main__": main()
