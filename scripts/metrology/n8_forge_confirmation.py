#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N8 — CONFIRMATION SEMANTIQUE DIMENSIONNEE. Tribunal 2/2 : confirmer/refuter les candidats N7.
6 chapitres distincts (2 low / 2 mixed / 2 master, sessions variees) x 3 leviers semantiques
ciblés : voice (principal), internal_tension (secondaire), subtext (exploratoire).
EXCLUS : mimetic (RAG naif HOLD), focalisation, image_necessity (N7 faibles).
REGLE DES DEUX CLES (graduée) : juge gemma calibré ecfb32d6 + radar bge-m3.
  STRONG = juge REWRITE & radar>=0 ; CANDIDATE = REWRITE & radar in (-0.005,0) ;
  SUSPECT = REWRITE & radar<=-0.005 ; COSMETIC = TIE & radar>=0 ; LOSS = ORIGINAL.
PASS levier = wins>=4/6 ET 0 SUSPECT ET length_ok 6/6.
Thermostat masse ±10%, double-ordre. + AUTOPSIE de la zone morte mixed.
ZERO modif moteur. Advisory pur. Gemma SEUL (N2 a disqualifié les autres, EMP-19).
"""
import json, os, re, urllib.request
import numpy as np
WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SESS=r"C:\Users\elric\omega-project\packages\sovereign-engine\sessions"
TEL=os.path.join(WS,"N5_SHADOW_TELEMETRY.json")
CENT=r"C:\Users\elric\omega-project\packages\sovereign-engine\src\oracle\intrinsic-quality\data\bgem3-radar-centroids.json"
OUT=os.path.join(WS,"N8_CONFIRMATION_RESULTS.json"); REW=os.path.join(WS,"n8_confirmation"); os.makedirs(REW,exist_ok=True)
GEN="gemma4:31b"; EMB="bge-m3"
RADAR_COLLAPSE=-0.005  # chute radar "forte"

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
    r1=judge_once(orig,rew); r2=judge_once(rew,orig); sr=so=t=0
    for r,fav in ((r1,"B"),(r2,"A")):
        if r==fav: sr+=1
        elif r=="TIE": t+=1
        else: so+=1
    res="REWRITE" if sr>so else "ORIGINAL" if so>sr else "TIE"
    return res, t  # t = nb de TIE sur les 2 ordres (proxy tie_rate)

LEVERS=[
 ("voice","Singularise la voix narrative : choix de phrases, rythme, angle qui ne pourraient venir que de ce narrateur-ci. Fuis la prose neutre interchangeable, SANS sur-styliser ni tomber dans le manierisme."),
 ("internal_tension","Charge chaque paragraphe d'une friction ou tension latente : desir contrarie, non-dit, menace, contradiction interne. Aucun paragraphe purement informatif ou contemplatif sans enjeu."),
 ("subtext","Remplace toute explication directe des emotions, pensees et intentions par des gestes, des objets, des silences et des details concrets. Montre, ne dis pas : le sens doit passer par le sous-texte, jamais par la declaration."),
]

def forge_prompt(text,target,instr):
    return (f"Tu es un ecrivain litteraire exigeant. Reecris le texte ci-dessous en appliquant UNIQUEMENT "
     f"cette transformation de scene : « {instr} ». N'applique AUCUNE autre consigne. "
     f"IMPERATIF DE LONGUEUR : au minimum {target} mots (vise {target} a {target+200}). N'abrege JAMAIS, "
     f"ne resume pas, developpe la matiere existante si besoin pour MAINTENIR la longueur. Garde la meme histoire, "
     f"les memes evenements, la meme intention de scene. Rends UNIQUEMENT le texte reecrit, sans commentaire.\n\nTEXTE:\n{text}")

def grade(pw,dr):
    if pw=="REWRITE":
        if dr is None: return "WIN_NORADAR"
        if dr>=0: return "STRONG"
        if dr> RADAR_COLLAPSE: return "CANDIDATE"
        return "SUSPECT"
    if pw=="ORIGINAL": return "LOSS"
    return "COSMETIC" if (dr is not None and dr>=0) else "TIE"

def repetition_rate(t):
    w=[x.lower() for x in words(t)]
    tri=[tuple(w[i:i+3]) for i in range(len(w)-2)]
    if not tri: return 0.0
    from collections import Counter
    c=Counter(tri); rep=sum(v for v in c.values() if v>1)
    return round(rep/len(tri),4)
def explanatory_density(t):
    markers=re.findall(r"\b(parce que|car|puisque|il pensait|elle pensait|il sentait|elle sentait|il savait|elle savait|il comprit|elle comprit|se sentait|etait triste|etait heureux)\b",t.lower())
    return round(1000.0*len(markers)/max(1,len(words(t))),3)
def sent_stats(t):
    sents=[s for s in re.split(r"[.!?]+",t) if s.strip()]
    lens=[len(words(s)) for s in sents]
    return (round(float(np.mean(lens)),1) if lens else 0, round(float(np.median(lens)),1) if lens else 0, len(sents))

def main():
    cent=json.load(open(CENT,encoding="utf-8")); mc=np.array(cent["master_centroid"]); lc=np.array(cent["low_centroid"])
    def radar(t):
        e=embed(t); return None if e is None else round(cos(e,mc)-cos(e,lc),5)
    tel=json.load(open(TEL,encoding="utf-8"))
    rows=[r for r in tel["rows"] if isinstance(r["score"],(int,float)) and r["score"]==r["score"]]
    uniq={}
    for r in rows:
        if r["scene"] not in uniq: uniq[r["scene"]]=r
    su=sorted(uniq.values(),key=lambda r:r["score"])
    n=len(su); med=n//2
    def distinct_pick(cands,k):
        out=[]; used=set()
        for r in cands:
            sess=r["scene"].split("/")[0]
            if sess not in used: out.append(r); used.add(sess)
            if len(out)==k: break
        i=0
        while len(out)<k and i<len(cands):
            if cands[i] not in out: out.append(cands[i])
            i+=1
        return out
    picks=[("low",r) for r in distinct_pick(su[:6],2)] + \
          [("mixed",r) for r in distinct_pick(su[med-3:med+3],2)] + \
          [("master",r) for r in distinct_pick(su[::-1][:6],2)]
    results=[]; lever_agg={k:[] for k,_ in LEVERS}; autopsy=[]
    for band,r in picks:
        sess,chap=r["scene"].split("/"); raw=open(os.path.join(SESS,sess,chap),encoding="utf-8",errors="ignore").read()
        orig=middle(raw); target=len(words(orig)); ro=radar(orig)
        if band=="mixed":
            ml,md,ns=sent_stats(orig)
            autopsy.append(dict(scene=r["scene"],score_tel=r["score"],radar=ro,words=len(words(orig)),
                                sent_mean=ml,sent_median=md,n_sent=ns,
                                repetition_rate=repetition_rate(orig),explanatory_density=explanatory_density(orig)))
        for lev,instr in LEVERS:
            print(f"[N8] {band} {sess.split('_')[-1]}/{chap} {lev} ...",flush=True)
            rw=gen(forge_prompt(orig,target,instr)).strip()
            wn=len(words(rw)); rr=radar(rw); length_ok=wn>=0.90*target
            pw,tr=pairwise(orig,rw) if wn>200 else ("INVALID",0)
            dr=(round(rr-ro,5) if (rr is not None and ro is not None) else None)
            g=grade(pw,dr)
            open(os.path.join(REW,f"{band}_{sess.split('_')[-1]}_{chap}_{lev}.txt"),"w",encoding="utf-8").write(rw)
            cell=dict(band=band,scene=r["scene"],lever=lev,radar_before=ro,radar_after=rr,radar_delta=dr,
                      words=wn,target=target,length_ok=bool(length_ok),pairwise=pw,tie_orders=tr,grade=g,
                      PASS=bool(length_ok and pw=="REWRITE" and dr is not None and dr>=0))
            results.append(cell)
            if dr is not None: lever_agg[lev].append(dr)
            print(json.dumps({k:cell[k] for k in ("band","lever","radar_delta","pairwise","grade","PASS")},ensure_ascii=False),flush=True)
    lever_summary={}
    for lev in lever_agg:
        cs=[c for c in results if c["lever"]==lev]
        wins=sum(1 for c in cs if c["pairwise"]=="REWRITE")
        strong=sum(1 for c in cs if c["grade"]=="STRONG")
        suspect=sum(1 for c in cs if c["grade"]=="SUSPECT")
        losses=sum(1 for c in cs if c["pairwise"]=="ORIGINAL")
        lenok=sum(1 for c in cs if c["length_ok"])
        ds=lever_agg[lev]
        lever_PASS = (wins>=4 and suspect==0 and lenok==len(cs))
        lever_summary[lev]=dict(judge_wins=wins,strong=strong,suspect=suspect,losses=losses,
                                mean_radar_delta=round(float(np.mean(ds)),5) if ds else None,
                                length_ok=f"{lenok}/{len(cs)}",n=len(cs),lever_PASS=bool(lever_PASS))
    pass_levers=[k for k,v in lever_summary.items() if v["lever_PASS"]]
    summ=dict(run="N8 CONFIRMATION SEMANTIQUE DIMENSIONNEE (6 chap x voice/internal_tension/subtext, gemma calibré ecfb32d6, regle 2 cles)",
              n_chapters=len(picks),chapters=[p[1]["scene"] for p in picks],
              levers=[k for k,_ in LEVERS],n_cells=len(results),
              criteria="PASS levier = wins>=4/6 ET 0 SUSPECT ET length_ok 6/6 (regle deux cles: juge+radar non degrade)",
              lever_summary=lever_summary, pass_levers=pass_levers,
              verdict=("PASS" if pass_levers else "FAIL"),
              mixed_autopsy=autopsy, rows=results,
              note="Confirmation candidats N7. Gemma seul (N2 disqualifie autres). Radar=2e cle. Pas de fusion/gate/LoRA/RAG. Decision moteur=Architecte.")
    json.dump(summ,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps({k:v for k,v in summ.items() if k not in ("rows",)},ensure_ascii=False,indent=2))
if __name__=="__main__": main()
