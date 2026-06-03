#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1C+ — Dossier 2-axes scaffold + persistance crash-safe.
- build : cree le dossier JSONL (1 fiche/oeuvre) avec auteur/titre propres + champs vides,
          + worklist auteurs (dedupe), + pre-remplissage deterministe (langue/traduit/famille).
- merge : applique un fichier de findings (JSON {work_id: {champs}}) sur le dossier (resume-safe).
Schema: docs/metrology/S1C_EXTERNAL_RECEPTION_SCHEMA.md. Aucune prose. WebSearch fait par l'agent.
"""
import json, re, os, sys, collections

STOP={"edition","french","spanish","english","tome","volume","oeuvres","completes","the","les",
      "des","de","du","la","le","von","van","der","den","el","los","oceanofpdf","com","a","au","aux"}

def clean_tokens(s): return [t for t in re.split(r"[^a-zA-Zà-ÿ0-9]+", s.lower()) if t and t not in STOP]

def author_title_from_path(sp, key):
    base=os.path.basename(sp); base=re.sub(r"\.(epub|pdf|txt)$","",base,flags=re.I)
    base=re.sub(r"(_french_edition|_spanish_edition|_english_edition|_oceanofpdf\.com|oceanofpdf_com)","",base,flags=re.I)
    if "_-_" in base:
        title,_,auth=base.partition("_-_")
    elif " - " in base:
        title,_,auth=base.partition(" - ")
    else:
        # gutenberg 'auteur_titre' approx : 2 premiers tokens = auteur
        tt=clean_tokens(key); auth=" ".join(tt[:2]); title=" ".join(tt[2:]) or " ".join(tt)
        return _tc(auth), _tc(title)
    return _tc(auth.replace("_"," ").strip()), _tc(title.replace("_"," ").strip())

def _tc(s): return " ".join(w.capitalize() for w in s.split())

FIELDS_PRESTIGE=["canonical_status","award_signal","academic_signal","critical_reception","longevity_signal","PRESTIGE_SCORE"]
FIELDS_COMM=["commercial_impact","public_rating","public_volume","polarization","COMMERCIAL_SCORE"]

def build(v4_path, out_dossier, out_worklist):
    rows=[json.loads(l) for l in open(v4_path,encoding="utf-8")]
    fiches=[]; authors=collections.defaultdict(list)
    for r in rows:
        auth,title=author_title_from_path(r["source_path"], r["author_title_key"])
        wid=re.sub(r"[^a-z0-9]+","_",(r["canonical_author"]+"_"+title).lower()).strip("_")[:80]
        f=dict(work_id=wid, canonical_author=r["canonical_author"], author_display=auth, title=title,
               cell=r["cell"], family_candidate=r["cell"], lang=r["lang"],
               translated=("MASTER" in r["cell"] and False),  # masters natifs par construction
               text_sha256=r["sha_text"], total_words=r["total_words"],
               prestige={k:None for k in FIELDS_PRESTIGE},
               commercial={k:None for k in FIELDS_COMM},
               external_classification=None, confidence="RESEARCH_NEEDED",
               evidence_notes="", sources=[])
        fiches.append(f); authors[r["canonical_author"]].append(title)
    with open(out_dossier,"w",encoding="utf-8") as fh:
        for f in fiches: fh.write(json.dumps(f,ensure_ascii=False)+"\n")
    # worklist auteurs
    import csv
    with open(out_worklist,"w",newline="",encoding="utf-8") as fh:
        w=csv.writer(fh); w.writerow(["canonical_author","n_works","cells","titles"])
        cell_by_auth=collections.defaultdict(set)
        for r in rows: cell_by_auth[r["canonical_author"]].add(r["cell"])
        for a,ts in sorted(authors.items()):
            w.writerow([a,len(ts),"|".join(sorted(cell_by_auth[a]))," / ".join(ts)])
    print(json.dumps({"fiches":len(fiches),"authors":len(authors)}))

def merge(dossier_path, findings_path):
    fiches=[json.loads(l) for l in open(dossier_path,encoding="utf-8")]
    findings=json.load(open(findings_path,encoding="utf-8"))
    idx={f["work_id"]:f for f in fiches}
    applied=0
    for wid,upd in findings.items():
        if wid in idx:
            f=idx[wid]
            for k,v in upd.items():
                if k in ("prestige","commercial") and isinstance(v,dict): f[k].update(v)
                else: f[k]=v
            applied+=1
    with open(dossier_path,"w",encoding="utf-8") as fh:
        for f in fiches: fh.write(json.dumps(f,ensure_ascii=False)+"\n")
    done=sum(1 for f in fiches if f["confidence"]!="RESEARCH_NEEDED")
    print(json.dumps({"applied":applied,"total":len(fiches),"researched":done}))

if __name__=="__main__":
    if sys.argv[1]=="build": build(sys.argv[2],sys.argv[3],sys.argv[4])
    elif sys.argv[1]=="merge": merge(sys.argv[2],sys.argv[3])
