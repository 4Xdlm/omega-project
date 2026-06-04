#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FORGE-v2 — Réécriture LENGTH-ENFORCED vers le cluster maître (mesuré).
Corrige le confound de compression de N6 (gemma raccourcissait 25-38%). Pour chaque chapitre OMEGA :
  - best-of-3 réécritures gemma avec consigne de LONGUEUR STRICTE (>= target, expansion anti-compression)
  - filtre longueur (>= 90% original) ; parmi les valides, juge calibré pairwise vs original
  - radar bge-m3 avant/après sur le gagnant length-valide
PASS = longueur OK ET juge préfère réécriture ET radar ne baisse pas. Crash-safe. ZERO modif moteur.
"""
import json, os, re, urllib.request
import numpy as np
WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SESS=r"C:\Users\elric\omega-project\packages\sovereign-engine\sessions"
TEL=os.path.join(WS,"N5_SHADOW_TELEMETRY.json")
CENT=r"C:\Users\elric\omega-project\packages\sovereign-engine\src\oracle\intrinsic-quality\data\bgem3-radar-centroids.json"
OUT=os.path.join(WS,"FORGE_V2_RESULTS.json"); REW=os.path.join(WS,"FORGE_V2_REWRITES"); os.makedirs(REW,exist_ok=True)
GEN="gemma4:31b"; EMB="bge-m3"; NREW=3

def words(t): return [w for w in re.split(r"\s+",t) if w]
def middle(t,n=1500):
    w=words(t)
    if len(w)<=n: return " ".join(w)
    s=(len(w)-n)//2; return " ".join(w[s:s+n])
def gen(prompt,temp,npredict):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":GEN,"prompt":prompt,"stream":False,"think":False,
                         "options":{"temperature":temp,"num_predict":npredict}}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=900) as r: return json.loads(r.read()).get("response","")
def embed(text):
    for cap in (6000,3000,1500):
        try:
            req=urllib.request.Request("http://localhost:11434/api/embeddings",
                data=json.dumps({"model":EMB,"prompt":text[:cap]}).encode(),
                headers={"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=120) as r:
                e=json.loads(r.read()).get("embedding")
                if e: return np.array(e,dtype=float)
        except Exception: continue
    return None
def cos(a,b): return float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))

# Juge CALIBRÉ (sha ecfb32d6, FIX-JUGE) — verdict A|B|TIE neutre.
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
def pairwise(orig,rew):  # double ordre, gagnant ORIGINAL|REWRITE|TIE
    r1=judge_once(orig,rew); r2=judge_once(rew,orig); sr=so=0
    if r1=="B": sr+=1
    elif r1=="A": so+=1
    if r2=="A": sr+=1
    elif r2=="B": so+=1
    return "REWRITE" if sr>so else "ORIGINAL" if so>sr else "TIE"

def forge_prompt(text,target):
    return (f"Tu es un ecrivain litteraire exigeant. Reecris le texte en ameliorant : la langue (epure), "
     f"en MONTRANT au lieu d'EXPLIQUER les emotions, la singularite de la voix, le rythme/euphonie, la "
     f"precision des images. IMPERATIF DE LONGUEUR : le texte reecrit doit faire AU MINIMUM {target} mots "
     f"(vise {target} a {target+200}). N'abrege JAMAIS, ne resume pas, ne compresse pas ; DEVELOPPE les images, "
     f"l'interiorite et le detail sensoriel pour MAINTENIR la longueur. Garde la meme histoire, les memes "
     f"evenements, la meme intention de scene. Rends UNIQUEMENT le texte reecrit, sans aucun commentaire.\n\nTEXTE:\n{text}")

def main():
    cent=json.load(open(CENT,encoding="utf-8")); mc=np.array(cent["master_centroid"]); lc=np.array(cent["low_centroid"])
    def radar(t):
        e=embed(t); return None if e is None else round(cos(e,mc)-cos(e,lc),5)
    tel=json.load(open(TEL,encoding="utf-8"))
    rows=[r for r in tel["rows"] if isinstance(r["score"],(int,float)) and r["score"]==r["score"]]
    uniq={}
    for r in rows:
        k=round(r["score"],6)
        if k not in uniq: uniq[k]=r
    su=sorted(uniq.values(),key=lambda r:r["score"])
    picks=[("low-like",su[0]),("mixed",su[len(su)//2]),("master-like",su[-1])]
    results=[]
    for label,r in picks:
        sess,chap=r["scene"].split("/"); raw=open(os.path.join(SESS,sess,chap),encoding="utf-8",errors="ignore").read()
        orig=middle(raw); target=len(words(orig)); ro=radar(orig)
        print(f"[FORGE] {label} {r['scene']} target={target} best-of-{NREW}",flush=True)
        cands=[]
        for k in range(NREW):
            rw=gen(forge_prompt(orig,target),0.7,3600).strip()
            wn=len(words(rw)); cands.append((rw,wn))
            open(os.path.join(REW,f"{label}_{sess}_{chap}.rw{k}.txt"),"w",encoding="utf-8").write(rw)
            print(f"  rw{k} words={wn} (target {target})",flush=True)
        valid=[(rw,wn) for rw,wn in cands if wn>=0.90*target]
        chosen=None; pw="N/A"; rr=None; length_ok=False
        pool=valid if valid else cands
        # parmi le pool, prendre le radar le plus haut qui bat l'original au juge
        best=None
        for rw,wn in pool:
            rad=radar(rw)
            v=pairwise(orig,rw)
            cand_ok=(wn>=0.90*target)
            score=(1 if v=="REWRITE" else 0, rad if rad is not None else -9)
            if best is None or score>best[0]:
                best=(score,rw,wn,rad,v,cand_ok)
        if best:
            _,chosen,wn,rr,pw,length_ok=best
        open(os.path.join(REW,f"{label}_{sess}_{chap}.CHOSEN.txt"),"w",encoding="utf-8").write(chosen or "")
        results.append(dict(label=label,scene=r["scene"],target_words=target,
            radar_before=ro,radar_after=rr,radar_delta=(round(rr-ro,5) if (rr is not None and ro is not None) else None),
            chosen_words=wn,length_ok=bool(length_ok),n_valid_length=len(valid),
            pairwise_winner=pw, PASS=bool(length_ok and pw=="REWRITE" and rr is not None and ro is not None and rr>=ro)))
        print(json.dumps(results[-1],ensure_ascii=False),flush=True)
    summ=dict(run="FORGE-v2 length-enforced best-of-3 (gemma4, juge calibré ecfb32d6)",n=len(results),
              n_pass=sum(1 for x in results if x["PASS"]),
              n_length_ok=sum(1 for x in results if x["length_ok"]),
              rewrites_preferred=sum(1 for x in results if x["pairwise_winner"]=="REWRITE"),
              mean_radar_delta=round(float(np.mean([x["radar_delta"] for x in results if x["radar_delta"] is not None])),5) if results else None,
              rows=results,
              note="PASS = longueur>=90% ET juge calibré préfère réécriture ET radar ne baisse pas.")
    json.dump(summ,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps({k:v for k,v in summ.items() if k!="rows"},ensure_ascii=False,indent=2))
if __name__=="__main__": main()
