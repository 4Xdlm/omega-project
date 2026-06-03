#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1C+ — AXE COMMERCIAL. commercial_impact 0-5 + source_status (RESEARCHED|ESTIMATED).
RESEARCHED = donnee web sourcee (ventes/listes). ESTIMATED = estimation raisonnee a confirmer (batch suivant).
Masters : commercial non prioritaire -> null si non recherche. Obscur-C : bas.
"""
import json, sys, collections

# author -> (commercial_impact 0-5, status, note, src)
COMM = {
 "franck_thilliez":(5,"RESEARCHED","7 M ex. (GFK); 4e auteur le plus lu en France 2020","livreshebdo.fr/actualitte"),
 "bernard_werber":(5,"RESEARCHED","35 M ex. mondiaux, 35 langues","allocine/albin-michel"),
 "clark_higgins":(5,"ESTIMATED","Mary Higgins Clark ~100M+ mondiaux (à confirmer)","RESEARCH"),
 "brown_dan":(5,"ESTIMATED","Dan Brown best-seller mondial (Da Vinci Code) (à confirmer)","RESEARCH"),
 "bussi_michel":(4,"ESTIMATED","polar best-seller FR, millions (à confirmer)","RESEARCH"),
 "chattam_maxime":(4,"ESTIMATED","thriller best-seller FR (à confirmer)","RESEARCH"),
 "christian_jacq":(4,"ESTIMATED","romans égyptiens best-seller, millions (à confirmer)","RESEARCH"),
 "aurelie_valognes":(4,"ESTIMATED","feel-good best-seller FR >1M (à confirmer)","RESEARCH"),
 "gilles_legardinier":(4,"ESTIMATED","feel-good best-seller FR >1M (à confirmer)","RESEARCH"),
 "de_gerard":(4,"ESTIMATED","SAS série, dizaines de M historiques (à confirmer)","RESEARCH"),
 "devilliers_gerard":(4,"ESTIMATED","SAS série (à confirmer)","RESEARCH"),
 "bruce_jean":(3,"ESTIMATED","OSS 117 pulp série historique (à confirmer)","RESEARCH"),
 "agnes_lugand":(3,"ESTIMATED","feel-good best-seller FR (à confirmer)","RESEARCH"),
 "eric_giacometti":(3,"ESTIMATED","thriller best-seller (à confirmer)","RESEARCH"),
 "feval_paul":(2,"ESTIMATED","feuilleton populaire 19e (succès d'époque)","RESEARCH"),
 "christina_lauren":(4,"ESTIMATED","romance best-seller US (à confirmer)","RESEARCH"),
 "grace_hannah":(4,"ESTIMATED","Icebreaker, phénomène TikTok/BookTok (à confirmer)","RESEARCH"),
 "grimes_martha":(3,"ESTIMATED","polar série best-seller US (à confirmer)","RESEARCH"),
 "byrd_charlotte":(2,"ESTIMATED","romance self-pub (à confirmer)","RESEARCH"),
 "aldiss_brian":(2,"ESTIMATED","SF reconnue, ventes modérées (à confirmer)","RESEARCH"),
 "anna_triss":(1,"ESTIMATED","fantasy auto-édition (à confirmer)","RESEARCH"),
}

def main(dossier):
    fiches=[json.loads(l) for l in open(dossier,encoding="utf-8")]
    for f in fiches:
        a=f["canonical_author"]; cls=f.get("external_classification","")
        if a in COMM:
            ci,st,note,src=COMM[a]
            f["commercial"]={"commercial_impact":ci,"public_rating":None,"public_volume":None,
                             "polarization":None,"COMMERCIAL_SCORE":float(ci),"source_status":st}
            f["sources"].append({"type":"commercial","ref":src,"claim":note,"confidence":("HIGH" if st=="RESEARCHED" else "LOW")})
        elif cls and cls.startswith("MASTER"):
            f["commercial"]={"commercial_impact":None,"public_rating":None,"public_volume":None,
                             "polarization":None,"COMMERCIAL_SCORE":None,"source_status":"NOT_PRIORITIZED"}
        else:
            # obscur-C : commercial bas presume (auto-edition/genre niche)
            f["commercial"]={"commercial_impact":1,"public_rating":None,"public_volume":None,
                             "polarization":None,"COMMERCIAL_SCORE":1.0,"source_status":"ESTIMATED_LOW"}
    with open(dossier,"w",encoding="utf-8") as fh:
        for f in fiches: fh.write(json.dumps(f,ensure_ascii=False)+"\n")
    rr=sum(1 for f in fiches if f["commercial"].get("source_status")=="RESEARCHED")
    est=sum(1 for f in fiches if "ESTIMATED" in str(f["commercial"].get("source_status")))
    print(json.dumps({"commercial_researched":rr,"commercial_estimated":est,"total":len(fiches)},ensure_ascii=False))

if __name__=="__main__": main(sys.argv[1])
