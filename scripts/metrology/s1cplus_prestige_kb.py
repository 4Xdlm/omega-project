#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1C+ — Remplissage AXE PRESTIGE depuis base de connaissances littéraires établies (sourcée).
Faits citables (Nobel/Goncourt/Renaudot/Médicis/Pléiade/canon). Axe commercial = batchs WebSearch (séparé).
canonical_status/award_signal/academic_signal/critical_reception/longevity_signal 0-5 (award null si pré-prix).
classification + source + confidence. Écrit le dossier en place.
"""
import json, sys, statistics

# canonical_author -> (canon, award|None, academic, critical(-2..2), longevity, classification, award_note, src)
KB = {
 # ---- MASTER_NATIVE_FR ----
 "flaubert":(5,None,5,2,5,"MASTER_CANON","pré-prix; canon scolaire/Pléiade","wikipedia:Gustave_Flaubert"),
 "hugo":(5,None,5,2,5,"MASTER_CANON","pré-prix; canon mondial","wikipedia:Victor_Hugo"),
 "proust":(5,4,5,2,5,"MASTER_CANON","Goncourt 1919 (À l'ombre des jeunes filles en fleurs)","wikipedia:Marcel_Proust"),
 "camus":(5,5,5,2,5,"MASTER_CANON","Nobel 1957","nobelprize.org/Camus"),
 "celine":(5,3,5,1,5,"MASTER_CANON","Renaudot 1932 (Voyage au bout de la nuit); auteur controversé","wikipedia:Louis-Ferdinand_Céline"),
 "duras":(5,4,5,2,5,"MASTER_CANON","Goncourt 1984 (L'Amant)","wikipedia:Marguerite_Duras"),
 "beauvoir":(5,4,5,2,5,"MASTER_CANON","Goncourt 1954 (Les Mandarins)","wikipedia:Simone_de_Beauvoir"),
 "malraux":(5,4,5,2,5,"MASTER_CANON","Goncourt 1933 (La Condition humaine)","wikipedia:André_Malraux"),
 "modiano":(5,5,5,2,5,"MASTER_CANON","Nobel 2014; Goncourt 1978","nobelprize.org/Modiano"),
 "clezio":(5,5,5,2,5,"MASTER_CANON","Nobel 2008","nobelprize.org/Le_Clezio"),
 "ernaux":(5,5,5,2,4,"MASTER_MODERN","Nobel 2022","nobelprize.org/Ernaux"),
 "perec":(5,4,5,2,5,"MASTER_CANON","Médicis 1978 (La Vie mode d'emploi); Oulipo canon","wikipedia:Georges_Perec"),
 "quignard":(4,4,4,2,4,"MASTER_MODERN","Goncourt 2002 (Les Ombres errantes)","wikipedia:Pascal_Quignard"),
 "sarraute":(5,None,5,2,4,"MASTER_CANON","Nouveau Roman canon","wikipedia:Nathalie_Sarraute"),
 "grillet":(5,None,5,2,4,"MASTER_CANON","Nouveau Roman canon (Robbe-Grillet)","wikipedia:Alain_Robbe-Grillet"),
 "butor":(4,3,4,1,4,"MASTER_CANON","Renaudot 1957 (La Modification); Nouveau Roman","wikipedia:Michel_Butor"),
 "chateaubriand":(5,None,5,2,5,"MASTER_CANON","Romantisme; canon scolaire","wikipedia:François-René_de_Chateaubriand"),
 "merimee":(5,None,5,2,5,"MASTER_CANON","19e canon; canon scolaire","wikipedia:Prosper_Mérimée"),
 # ---- MASTER_NATIVE_EN ----
 "austen":(5,None,5,2,5,"MASTER_CANON","canon anglais; étude massive","wikipedia:Jane_Austen"),
 "bronte":(5,None,5,2,5,"MASTER_CANON","canon victorien","wikipedia:Brontë_family"),
 "dickens":(5,None,5,2,5,"MASTER_CANON","canon victorien","wikipedia:Charles_Dickens"),
 "eliot":(5,None,5,2,5,"MASTER_CANON","George Eliot; canon (Middlemarch)","wikipedia:George_Eliot"),
 "hardy":(5,None,5,2,5,"MASTER_CANON","canon victorien tardif","wikipedia:Thomas_Hardy"),
 "hawthorne":(5,None,5,2,5,"MASTER_CANON","canon américain (Scarlet Letter)","wikipedia:Nathaniel_Hawthorne"),
 "james":(5,None,5,2,5,"MASTER_CANON","Henry James; canon","wikipedia:Henry_James"),
 "conrad":(5,None,5,2,5,"MASTER_CANON","canon moderniste (Heart of Darkness)","wikipedia:Joseph_Conrad"),
 "forster":(5,None,5,2,5,"MASTER_CANON","canon moderniste anglais","wikipedia:E._M._Forster"),
 "fielding":(5,None,5,2,5,"MASTER_CANON","roman 18e (Tom Jones)","wikipedia:Henry_Fielding"),
 "defoe":(5,None,5,2,5,"MASTER_CANON","Robinson Crusoe; canon","wikipedia:Daniel_Defoe"),
 "fitzgerald":(5,None,5,2,5,"MASTER_CANON","Gatsby; canon américain","wikipedia:F._Scott_Fitzgerald"),
 "faulkner":(5,5,5,2,5,"MASTER_CANON","Nobel 1949","nobelprize.org/Faulkner"),
 "hemingway":(5,5,5,2,5,"MASTER_CANON","Nobel 1954","nobelprize.org/Hemingway"),
 "bellow":(5,5,5,2,4,"MASTER_CANON","Nobel 1976","nobelprize.org/Bellow"),
 "delillo":(4,4,4,2,4,"MASTER_MODERN","postmoderne canon; National Book Award","wikipedia:Don_DeLillo"),
 "dreiser":(5,None,4,1,4,"MASTER_CANON","naturalisme américain (American Tragedy)","wikipedia:Theodore_Dreiser"),
 # ---- D_SOURCE_REAL_FR (pulp/genre publié, prestige bas) ----
 "franck_thilliez":(1,None,1,0,2,"GENRE_FORMULAIC","thriller best-seller FR; pas de canon académique","wikipedia:Franck_Thilliez"),
 "bussi_michel":(1,None,1,0,2,"GENRE_FORMULAIC","polar best-seller FR","wikipedia:Michel_Bussi"),
 "chattam_maxime":(1,None,1,0,2,"GENRE_FORMULAIC","thriller best-seller FR","wikipedia:Maxime_Chattam"),
 "eric_giacometti":(1,None,0,0,2,"GENRE_FORMULAIC","thriller ésotérique best-seller","wikipedia:Giacometti-Ravenne"),
 "clark_higgins":(1,None,1,0,3,"GENRE_FORMULAIC","Mary Higgins Clark, reine du suspense (traduite)","wikipedia:Mary_Higgins_Clark"),
 "bernard_werber":(1,None,1,0,3,"BEST_SELLER_COMMERCIAL","SF/philo populaire best-seller FR","wikipedia:Bernard_Werber"),
 "christian_jacq":(1,None,1,0,2,"BEST_SELLER_COMMERCIAL","romans égyptiens best-seller","wikipedia:Christian_Jacq"),
 "aurelie_valognes":(0,None,0,0,1,"BEST_SELLER_COMMERCIAL","feel-good best-seller FR récent","wikipedia:Aurélie_Valognes"),
 "agnes_lugand":(0,None,0,0,1,"BEST_SELLER_COMMERCIAL","feel-good best-seller FR","wikipedia:Agnès_Ledig"),
 "gilles_legardinier":(0,None,0,0,1,"BEST_SELLER_COMMERCIAL","feel-good best-seller FR","wikipedia:Gilles_Legardinier"),
 "de_gerard":(1,None,1,-1,3,"PULP_PUBLISHED","SAS, Gérard de Villiers, espionnage pulp série","wikipedia:Gérard_de_Villiers"),
 "devilliers_gerard":(1,None,1,-1,3,"PULP_PUBLISHED","SAS, espionnage pulp série","wikipedia:Gérard_de_Villiers"),
 "bruce_jean":(1,None,1,-1,3,"PULP_PUBLISHED","OSS 117, Jean Bruce, espionnage pulp","wikipedia:Jean_Bruce"),
 "feval_paul":(2,None,2,0,3,"PULP_PUBLISHED","Paul Féval, feuilleton 19e (Les Habits Noirs)","wikipedia:Paul_Féval"),
 "byrd_charlotte":(0,None,0,0,1,"GENRE_FORMULAIC","romance self-pub/commercial","goodreads:Charlotte_Byrd"),
 "anna_triss":(0,None,0,0,1,"GENRE_FORMULAIC","fantasy auto-édition FR","RESEARCH"),
 # ---- C notables (commercial fort, prestige bas) ----
 "brown_dan":(1,None,1,-1,2,"BEST_SELLER_COMMERCIAL","Dan Brown, best-seller mondial (Da Vinci Code)","wikipedia:Dan_Brown"),
 "christina_lauren":(0,None,0,0,1,"GENRE_FORMULAIC","romance best-seller (duo)","wikipedia:Christina_Lauren"),
 "grace_hannah":(0,None,0,0,1,"GENRE_FORMULAIC","romance New Adult best-seller TikTok (Icebreaker)","goodreads:Hannah_Grace"),
 "grimes_martha":(1,None,1,0,2,"GENRE_FORMULAIC","polar série (Richard Jury)","wikipedia:Martha_Grimes"),
 "aldiss_brian":(2,None,2,1,3,"GENRE_FORMULAIC","SF reconnue (Brian Aldiss) — borderline genre-classic","wikipedia:Brian_Aldiss"),
}

def score(canon, award, academic, longev):
    base = statistics.mean([canon, academic, longev])
    return round(min(5.0, base + (0.5 if award else 0.0)), 2)

def main(dossier):
    fiches=[json.loads(l) for l in open(dossier,encoding="utf-8")]
    filled=0
    for f in fiches:
        a=f["canonical_author"]
        if a in KB:
            canon,award,acad,crit,longev,cls,note,src=KB[a]
            f["prestige"]={"canonical_status":canon,"award_signal":award,"academic_signal":acad,
                           "critical_reception":crit,"longevity_signal":longev,
                           "PRESTIGE_SCORE":score(canon,award,acad,longev)}
            f["external_classification"]=cls
            f["confidence"]="CERTAIN" if cls.startswith(("MASTER","PULP","BEST_SELLER","GENRE")) else "PROBABLE"
            f["evidence_notes"]=note
            f["sources"]=[{"type":"established_record","ref":src,"claim":note,"confidence":"HIGH"}]
            filled+=1
        else:
            # C obscur par defaut : prestige nul, commercial a rechercher
            if f["confidence"]=="RESEARCH_NEEDED":
                f["prestige"]={"canonical_status":0,"award_signal":None,"academic_signal":0,
                               "critical_reception":0,"longevity_signal":0,"PRESTIGE_SCORE":0.0}
                f["external_classification"]="GENRE_FORMULAIC"
                f["confidence"]="PROBABLE"
                f["evidence_notes"]="aucune empreinte canonique/académique détectée (auto-édition/genre présumé) — commercial à confirmer"
                f["sources"]=[{"type":"absence_of_footprint","ref":"n/a","claim":"pas de prix/canon connu","confidence":"MED"}]
    with open(dossier,"w",encoding="utf-8") as fh:
        for f in fiches: fh.write(json.dumps(f,ensure_ascii=False)+"\n")
    import collections
    print(json.dumps({"kb_filled":filled,"total":len(fiches),
        "by_class":dict(collections.Counter(f["external_classification"] for f in fiches)),
        "by_conf":dict(collections.Counter(f["confidence"] for f in fiches))},ensure_ascii=False))

if __name__=="__main__": main(sys.argv[1])
