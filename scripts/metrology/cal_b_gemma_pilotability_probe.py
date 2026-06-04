#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAL-B (probe) — Pilotabilité gemma4 sur directives de style Rosetta (sonde focalisée).
Le S0 complet (rosetta-s0-calibration.ts) est hardcodé Anthropic+claude-sonnet ; cette sonde
teste si gemma4 RÉPOND aux directives de style (signal de transfert des directives claude-sonnet).
2 styles opposés (ACTION vs INTROSPECTION), même thème, mesure f1_mean (longueur phrase) + densité virgule.
Si gemma différencie fortement => pilotable sur l'axe rythme. Ollama local. ZERO modif moteur.
"""
import json, os, re, urllib.request
import numpy as np
OUT=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology\CAL_B_PILOTABILITY_PROBE.json"
GEN="gemma4:31b"
THEME="un homme entre dans une maison vide qu'il a quittée enfant"
DIRECTIVES={
 "ACTION":"Style ACTION : phrases TRÈS COURTES (5-10 mots), haute densité de verbes d'action, rythme sec, peu de description. Environ 250 mots.",
 "INTROSPECTION":"Style INTROSPECTION : phrases LONGUES et sinueuses (20-35 mots), subordination, intériorité, peu d'action, rythme lent. Environ 250 mots.",
}
def gen(prompt):
    req=urllib.request.Request("http://localhost:11434/api/generate",
        data=json.dumps({"model":GEN,"prompt":prompt,"stream":False,"think":False,
                         "options":{"temperature":0.7,"num_predict":500}}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=400) as r: return json.loads(r.read()).get("response","")
def feats(t):
    sents=[s for s in re.split(r"[.!?]+",t) if len(s.split())>=2]
    wl=[len(s.split()) for s in sents]
    words=[w for w in re.split(r"\s+",t) if w]
    return dict(f1_mean_sentence_len=round(float(np.mean(wl)),2) if wl else 0,
                comma_density=round(t.count(",")/max(1,len(words)),4),
                n_words=len(words), n_sentences=len(sents))
def main():
    res={}
    for style,d in DIRECTIVES.items():
        txt=gen(f"Écris un passage de prose littéraire française. Thème : {THEME}.\n{d}\nRends UNIQUEMENT le passage.").strip()
        res[style]=feats(txt); res[style]["sample"]=txt[:200]
        print(style, {k:v for k,v in res[style].items() if k!="sample"}, flush=True)
    a=res["ACTION"]["f1_mean_sentence_len"]; i=res["INTROSPECTION"]["f1_mean_sentence_len"]
    ratio=round(i/max(0.1,a),2)
    out=dict(probe="CAL-B gemma4 pilotability (ACTION vs INTROSPECTION sentence length)",
             model=GEN, action=res["ACTION"], introspection=res["INTROSPECTION"],
             f1_ratio_intro_over_action=ratio,
             verdict=("PILOTABLE_RHYTHM" if ratio>=1.8 else "WEAK_PILOTABILITY" if ratio>=1.3 else "NOT_PILOTABLE"),
             note="ratio>=1.8 => gemma differencie fortement la longueur de phrase selon directive (pilotable rythme). "
                  "Sonde partielle ; S0 complet Rosetta gemma4 requiert adaptateur Anthropic->Ollama (chantier dedie).")
    json.dump(out,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps({k:v for k,v in out.items() if k not in('action','introspection')},ensure_ascii=False,indent=2))
if __name__=="__main__": main()
