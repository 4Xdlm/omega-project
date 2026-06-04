#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N6-ATELIER — Peut-on déplacer la prose OMEGA vers le cluster maître, mesuré ?
Sur 3 chapitres OMEGA (low-like / mixed / master-like d'après N5), 1 passe d'amélioration via gemma4
(clean langue + moins d'explication émotionnelle + voix + rythme + images, length-guarded, sans résumé).
Mesure AVANT/APRÈS : radar bge-m3 (vers maître ?) + gemma pairwise (préfère la réécriture ?).
PASS si gemma préfère la réécriture ET radar ne baisse pas ET longueur ±15%. ZERO modif moteur.
"""
import json, os, re, urllib.request
import numpy as np

WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SESS=r"C:\Users\elric\omega-project\packages\sovereign-engine\sessions"
TEL=os.path.join(WS,"N5_SHADOW_TELEMETRY.json")
CENT=r"C:\Users\elric\omega-project\packages\sovereign-engine\src\oracle\intrinsic-quality\data\bgem3-radar-centroids.json"
OUT=os.path.join(WS,"N6_ATELIER_RESULTS.json")
REW=os.path.join(WS,"N6_REWRITES"); os.makedirs(REW,exist_ok=True)
GEN="gemma4:31b"; EMB="bge-m3"

def ollama_gen(prompt,n=2200):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":GEN,"prompt":prompt,"stream":False,"think":False,
                         "options":{"temperature":0.7,"num_predict":n}}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=600) as r: return json.loads(r.read()).get("response","")

def ollama_embed(text):
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

def words(t): return [w for w in re.split(r"\s+",t) if w]
def middle(t,n=1500):
    w=words(t)
    if len(w)<=n: return " ".join(w)
    s=(len(w)-n)//2; return " ".join(w[s:s+n])

REWRITE=("Tu es un ecrivain litteraire exigeant. Reecris le texte en ameliorant : la langue (epure), "
 "en MONTRANT au lieu d'EXPLIQUER les emotions, la singularite de la voix, le rythme et l'euphonie, "
 "la precision des images (supprime le decoratif). CONTRAINTES ABSOLUES : meme longueur (+/-10%), meme "
 "histoire, memes evenements, meme intention de scene. NE resume PAS, ne compresse pas. "
 "Rends UNIQUEMENT le texte reecrit, sans aucun commentaire.\n\nTEXTE:\n{t}")

PAIR=("Deux extraits de prose francaise de longueur comparable, A et B.\n\n[A]\n{A}\n\n[B]\n{B}\n\n"
 "Lequel est de plus haute QUALITE LITTERAIRE (profondeur, style, voix, justesse) ? "
 "Reponds UNIQUEMENT : A, B, ou TIE.")

def judge(a,b):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":GEN,"prompt":PAIR.format(A=a[:3500],B=b[:3500]),"stream":False,"think":False,
                         "options":{"temperature":0,"num_predict":8}}).encode(),
        headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=240) as r: s=json.loads(r.read()).get("response","").upper()
    except Exception: return "ERR"
    if "TIE" in s: return "TIE"
    m=re.findall(r"\b([AB])\b",s); return m[-1] if m else "TIE"

def pairwise(orig,rew):
    # double ordre ; gagnant = orig|rew|tie
    r1=judge(orig,rew); r2=judge(rew,orig)
    score_rew=0; score_orig=0
    if r1=="B": score_rew+=1
    elif r1=="A": score_orig+=1
    if r2=="A": score_rew+=1
    elif r2=="B": score_orig+=1
    if score_rew>score_orig: return "REWRITE"
    if score_orig>score_rew: return "ORIGINAL"
    return "TIE"

def main():
    cent=json.load(open(CENT,encoding="utf-8")); mc=np.array(cent["master_centroid"]); lc=np.array(cent["low_centroid"])
    def radar(t):
        e=ollama_embed(t)
        return None if e is None else round(cos(e,mc)-cos(e,lc),5)
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
        sess,chap=r["scene"].split("/")
        path=os.path.join(SESS,sess,chap)
        raw=open(path,encoding="utf-8",errors="ignore").read()
        orig=middle(raw)
        print(f"[N6] {label} {r['scene']} rewrite...",flush=True)
        rew=ollama_gen(REWRITE.format(t=orig)).strip()
        open(os.path.join(REW,f"{label}_{sess}_{chap}.orig.txt"),"w",encoding="utf-8").write(orig)
        open(os.path.join(REW,f"{label}_{sess}_{chap}.rewrite.txt"),"w",encoding="utf-8").write(rew)
        ro=radar(orig); rr=radar(rew)
        wo=len(words(orig)); wr=len(words(rew))
        verdict_pw=pairwise(orig,rew) if rew and len(words(rew))>200 else "INVALID_REWRITE"
        length_ok = wr>=wo*0.85 and wr<=wo*1.15
        radar_ok = (rr is not None and ro is not None and rr>=ro)
        pw_ok = verdict_pw=="REWRITE"
        results.append(dict(label=label,scene=r["scene"],
            radar_before=ro,radar_after=rr,radar_delta=(round(rr-ro,5) if (rr is not None and ro is not None) else None),
            words_before=wo,words_after=wr,length_ok=bool(length_ok),
            pairwise_winner=verdict_pw,
            PASS=bool(pw_ok and radar_ok and length_ok)))
        print(json.dumps(results[-1],ensure_ascii=False),flush=True)
    summary=dict(run="N6 atelier amelioration mesuree (1 passe, gemma4)", n=len(results),
                 n_pass=sum(1 for x in results if x["PASS"]),
                 mean_radar_delta=round(float(np.mean([x["radar_delta"] for x in results if x["radar_delta"] is not None])),5) if results else None,
                 rewrites_preferred=sum(1 for x in results if x["pairwise_winner"]=="REWRITE"),
                 rows=results,
                 note="PASS = gemma prefere reecriture ET radar ne baisse pas ET longueur +/-15%. Advisory, zero impact moteur.")
    json.dump(summary,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps({k:v for k,v in summary.items() if k!="rows"},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
