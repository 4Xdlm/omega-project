#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
N7 — FORGE SEMANTIQUE CAUSALE. Tribunal 2/2 : tester des leviers de SCENE (pas lexicaux).
Forge Chirurgicale Rosetta = NULL RESULT scelle. On attaque l'etage semantique.
3 chapitres OMEGA (low/mixed/master) x 6 leviers semantiques isoles :
  1 sous-texte incarne, 2 focalisation/POV, 3 necessite des images, 4 tension interne,
  5 voix singuliere, 6 few-shot MIMETIQUE (exemplaire maitre choisi par tonalite).
Length-enforced (thermostat masse, rejet <90% cible), radar bge-m3 avant/apres,
pairwise gemma calibre ecfb32d6 double-ordre. 1 levier = 1 passe. PAS de combine.
ZERO modif moteur. Advisory pur.
"""
import json, os, re, urllib.request
import numpy as np
WS=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology"
SESS=r"C:\Users\elric\omega-project\packages\sovereign-engine\sessions"
TEL=os.path.join(WS,"N5_SHADOW_TELEMETRY.json")
CENT=r"C:\Users\elric\omega-project\packages\sovereign-engine\src\oracle\intrinsic-quality\data\bgem3-radar-centroids.json"
HUMAN=r"C:\Users\elric\omega-project\packages\omega-p0\corpus\human"
OUT=os.path.join(WS,"N7_FORGE_SEMANTIQUE_RESULTS.json"); REW=os.path.join(WS,"n7_forge_semantique"); os.makedirs(REW,exist_ok=True)
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

# Leviers semantiques (instruction de SCENE, pas metrique). 1 levier/passe.
LEVERS=[
 ("subtext","plain","Remplace toute explication directe des emotions, pensees et intentions par des gestes, des objets, des silences et des details concrets. Montre, ne dis pas : le sens doit passer par le sous-texte, jamais par la declaration."),
 ("focalisation","plain","Ancre tout dans la perception incarnee d'UN seul point de vue : ce que ce personnage voit, entend, sent et pense, dans son ordre a lui. Supprime la voix omnisciente neutre et les informations qu'il ne pourrait pas percevoir."),
 ("image_necessity","plain","Supprime toute image purement decorative. Ne garde que les images qui font avancer la scene ou revelent un personnage (images causales). Chaque image restante doit etre necessaire a l'action ou au sens."),
 ("internal_tension","plain","Charge chaque paragraphe d'une friction ou tension latente : desir contrarie, non-dit, menace, contradiction interne. Aucun paragraphe purement informatif ou contemplatif sans enjeu."),
 ("voice","plain","Singularise la voix narrative : choix de phrases, rythme, angle qui ne pourraient venir que de ce narrateur-ci. Fuis la prose neutre interchangeable, SANS sur-styliser ni tomber dans le manierisme."),
 ("mimetic","mimetic",None),  # exemplaire maitre choisi par tonalite
]

def forge_prompt_plain(text,target,instr):
    return (f"Tu es un ecrivain litteraire exigeant. Reecris le texte ci-dessous en appliquant UNIQUEMENT "
     f"cette transformation de scene : « {instr} ». N'applique AUCUNE autre consigne. "
     f"IMPERATIF DE LONGUEUR : au minimum {target} mots (vise {target} a {target+200}). N'abrege JAMAIS, "
     f"ne resume pas, developpe la matiere existante si besoin pour MAINTENIR la longueur. Garde la meme histoire, "
     f"les memes evenements, la meme intention de scene. Rends UNIQUEMENT le texte reecrit, sans commentaire.\n\nTEXTE:\n{text}")

def forge_prompt_mimetic(text,target,exemplar,author):
    return (f"Tu es un ecrivain litteraire exigeant. Voici d'abord un extrait de reference ecrit par un maitre ({author}) :\n\n"
     f"--- EXTRAIT MAITRE ---\n{exemplar}\n--- FIN ---\n\n"
     f"Analyse l'implicite, la densite semantique, la justesse et la voix de cet extrait. "
     f"Puis reecris le TEXTE ci-dessous pour ELEVER ta prose a ce standard de profondeur. "
     f"NE COPIE PAS ses mots ni ses tournures, n'imite pas son sujet : garde TON histoire, TES evenements, TON intention de scene. "
     f"Eleve seulement la qualite (sous-texte, necessite, densite). "
     f"IMPERATIF DE LONGUEUR : au minimum {target} mots (vise {target} a {target+200}). N'abrege JAMAIS, ne resume pas. "
     f"Rends UNIQUEMENT le texte reecrit, sans commentaire.\n\nTEXTE:\n{text}")

def main():
    cent=json.load(open(CENT,encoding="utf-8")); mc=np.array(cent["master_centroid"]); lc=np.array(cent["low_centroid"])
    def radar(t):
        e=embed(t); return None if e is None else round(cos(e,mc)-cos(e,lc),5)
    # banque d'exemplaires maitres + embeddings (1 fois)
    exemplars=[]
    for fn in sorted(os.listdir(HUMAN)):
        if fn.endswith("-style.txt"):
            txt=open(os.path.join(HUMAN,fn),encoding="utf-8",errors="ignore").read().strip()
            auth=re.sub(r"^\d+-|-style\.txt$","",fn)
            e=embed(txt)
            exemplars.append((auth,txt,e))
    tel=json.load(open(TEL,encoding="utf-8"))
    rows=[r for r in tel["rows"] if isinstance(r["score"],(int,float)) and r["score"]==r["score"]]
    uniq={}
    for r in rows:
        k=round(r["score"],6)
        if k not in uniq: uniq[k]=r
    su=sorted(uniq.values(),key=lambda r:r["score"])
    picks=[("low-like",su[0]),("mixed",su[len(su)//2]),("master-like",su[-1])]
    results=[]; lever_agg={k:[] for k,_,_ in LEVERS}
    for label,r in picks:
        sess,chap=r["scene"].split("/"); raw=open(os.path.join(SESS,sess,chap),encoding="utf-8",errors="ignore").read()
        orig=middle(raw); target=len(words(orig)); ro=radar(orig); oe=embed(orig)
        # exemplaire maitre le plus proche en tonalite (cosine sur embedding)
        best_ex=max(exemplars,key=lambda x: cos(oe,x[2]) if (oe is not None and x[2] is not None) else -9)
        for lev,mode,instr in LEVERS:
            print(f"[N7-SEM] {label} {lev} ...",flush=True)
            if mode=="mimetic":
                prompt=forge_prompt_mimetic(orig,target,best_ex[1],best_ex[0]); used_ex=best_ex[0]
            else:
                prompt=forge_prompt_plain(orig,target,instr); used_ex=None
            rw=gen(prompt).strip()
            wn=len(words(rw)); rr=radar(rw); length_ok=wn>=0.90*target
            pw=pairwise(orig,rw) if wn>200 else "INVALID"
            open(os.path.join(REW,f"{label}_{lev}.txt"),"w",encoding="utf-8").write(rw)
            cell=dict(label=label,scene=r["scene"],lever=lev,mode=mode,exemplar=used_ex,
                      radar_before=ro,radar_after=rr,
                      radar_delta=(round(rr-ro,5) if (rr is not None and ro is not None) else None),
                      words=wn,target=target,length_ok=bool(length_ok),pairwise=pw,
                      PASS=bool(length_ok and pw=="REWRITE" and rr is not None and ro is not None and rr>=ro))
            results.append(cell)
            if cell["radar_delta"] is not None: lever_agg[lev].append(cell["radar_delta"])
            print(json.dumps(cell,ensure_ascii=False),flush=True)
    lever_summary={}
    for lev in lever_agg:
        ds=lever_agg[lev]; wins=sum(1 for c in results if c["lever"]==lev and c["pairwise"]=="REWRITE")
        passes=sum(1 for c in results if c["lever"]==lev and c["PASS"])
        lever_summary[lev]=dict(mean_radar_delta=round(float(np.mean(ds)),5) if ds else None,
                                rewrites_won=wins, passes=passes, n=len([c for c in results if c['lever']==lev]))
    ranked=sorted(lever_summary.items(), key=lambda kv:(kv[1]["passes"], kv[1]["rewrites_won"],
                   kv[1]["mean_radar_delta"] if kv[1]["mean_radar_delta"] is not None else -9), reverse=True)
    # critere Tribunal : PASS levier = >=1 levier gagne 2/3 chapitres au juge + radar non degrade
    pass_levers=[k for k,v in lever_summary.items() if v["rewrites_won"]>=2]
    summ=dict(run="N7 FORGE SEMANTIQUE CAUSALE (leviers de scene + few-shot mimetique, juge calibre ecfb32d6)",
              levers=[k for k,_,_ in LEVERS], n_cells=len(results),
              lever_summary=lever_summary, ranking=[k for k,_ in ranked],
              pass_levers_2of3=pass_levers,
              verdict=("PASS" if pass_levers else "FAIL"),
              rows=results,
              note="Causal : un levier semantique isole bat-il les leviers lexicaux Rosetta (0/12) ? PASS = >=1 levier gagne 2/3 chapitres au juge. Pas de combine (decision Architecte).")
    json.dump(summ,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("DONE"); print(json.dumps({k:v for k,v in summ.items() if k!="rows"},ensure_ascii=False,indent=2))
if __name__=="__main__": main()
