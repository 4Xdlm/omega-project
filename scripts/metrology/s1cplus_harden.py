#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""S1C+ source-hardening labels (corrections ChatGPT). Aucune mesure."""
import json, sys, collections
d=sys.argv[1]
fiches=[json.loads(l) for l in open(d,encoding="utf-8")]
for f in fiches:
    srcs=f.get("sources",[])
    has_real_src=any(s.get("type") in ("established_record","commercial","award","encyclopedia","press","academic") and s.get("ref") not in (None,"","n/a","RESEARCH") for s in srcs)
    # prestige source_status
    if f["external_classification"]=="GENRE_FORMULAIC" and f["prestige"].get("PRESTIGE_SCORE",0)==0.0 and not has_real_src:
        f["prestige"]["source_status"]="NO_EXTERNAL_PRESTIGE_SIGNAL_FOUND"   # absence != nul prouve
        f["confidence"]="PROBABLE_LOW"
        f["evidence_notes"]="aucun signal de prestige externe trouvé (non recherché finement) — PAS prestige nul prouvé"
    elif has_real_src:
        f["prestige"]["source_status"]="RESEARCHED_RECORD"   # source etablie attachee
    else:
        f["prestige"]["source_status"]="EXPERT_PRESELECTION"  # CERTAIN sans source -> a sourcer
        if f["confidence"]=="CERTAIN": f["confidence"]="CERTAIN_PENDING_SOURCE"
    # eligibilite fondatrice : prestige (qualite) sourcable ; commercial RESEARCHED requis pour OBJ1bis
    cstat=f["commercial"].get("source_status")
    f["founding_quality_eligible"]= f["confidence"] in ("CERTAIN",) and f["prestige"]["source_status"] in ("RESEARCHED_RECORD",)
    f["founding_commercial_eligible"]= (cstat=="RESEARCHED")
open(d,"w",encoding="utf-8").write("\n".join(json.dumps(f,ensure_ascii=False) for f in fiches))
print(json.dumps({
 "prestige_status":dict(collections.Counter(f["prestige"].get("source_status") for f in fiches)),
 "confidence":dict(collections.Counter(f["confidence"] for f in fiches)),
 "founding_quality_eligible":sum(1 for f in fiches if f["founding_quality_eligible"]),
 "founding_commercial_eligible":sum(1 for f in fiches if f["founding_commercial_eligible"])},ensure_ascii=False))
