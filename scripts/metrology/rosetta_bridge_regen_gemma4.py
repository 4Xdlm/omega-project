#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BRIDGE-GEMMA4 — Régénère le bridge Rosetta DEPUIS le S0 gemma4 (model-aware).
Lit s06_classification_regles.json (gemma4) → produit :
  - ROSETTA_BRIDGE_MATRIX_GEMMA4.json (8 features, leviers actifs = SOLIDE & pilot>0 ; f17 ILLUSION interdit)
  - ROSETTA_BRIDGE_MATRIX_BY_MODEL.json (dispatch gemma4 / claude-sonnet / unknown→CALIBRATION_REQUIRED)
  - ROSETTA_GEMMA4_VS_CLAUDE_DIFF.json (features communes/divergentes)
EMP-19 : on ne pilote gemma4 qu'avec les leviers mesurés sur gemma4. ZERO modif moteur (data).
"""
import json, os
SE=r"C:\Users\elric\omega-project\packages\sovereign-engine"
S0=r"C:\Users\elric\omega-project\omega-autopsie\results_rosetta\s0\s06_classification_regles.json"
DATA=os.path.join(SE,"src","scoring","data")
CLAUDE=os.path.join(DATA,"ROSETTA_BRIDGE_MATRIX.json")

def lever_level(cat,pilot):
    if cat=="SOLIDE" and pilot>=0.8: return "A"          # levier fiable
    if cat=="PROMETTEUSE": return "B"                     # advisory
    if cat=="ILLUSION_DÉCLARATIVE": return "C_FORBIDDEN"  # interdit
    return "C_NOT_PILOTABLE"                              # SOLIDE mais pilot 0, etc.

def main():
    s06=json.load(open(S0,encoding="utf-8"))
    feats={}
    for r in s06["regles"]:
        cat=r["categorie"]; pilot=float(r["taux_pilotabilite"])
        active = (cat=="SOLIDE" and pilot>0)
        lvl=lever_level(cat,pilot)
        route = "PROMPT_DIRECT" if active else ("SHADOW" if cat=="ILLUSION_DÉCLARATIVE" else "INACTIVE")
        feats[r["feature"]]=dict(
            name=r["name"], category=cat, pilotability=pilot,
            compliance_rate=pilot,  # compat rosetta-bridge.ts (MatrixEntry.compliance_rate)
            instruction=(r["instruction_exacte"] if active else ""),  # pas d'instruction si non-actif
            instruction_variant=r.get("instruction_gagnante"),
            route=route, active=active, lever_level=lvl,
            forbidden=(cat=="ILLUSION_DÉCLARATIVE"))
    active_levers=[k for k,v in feats.items() if v["active"]]
    gemma=dict(
        matrix_id="rosetta_bridge_gemma4-31b_v1", model="gemma4:31b", provider="ollama",
        source="omega-autopsie/results_rosetta/s0/s06_classification_regles.json (cap-400, 370 tests)",
        date="2026-06-04",
        active_levers=active_levers,
        forbidden_levers=[k for k,v in feats.items() if v["forbidden"]],
        advisory_levers=[k for k,v in feats.items() if v["lever_level"]=="B"],
        inactive_levers=[k for k,v in feats.items() if v["lever_level"]=="C_NOT_PILOTABLE"],
        note="EMP-19 : pilotage gemma4 uniquement via active_levers (SOLIDE & pilot>0). f17_knife=ILLUSION interdit.",
        features=feats)
    json.dump(gemma,open(os.path.join(DATA,"ROSETTA_BRIDGE_MATRIX_GEMMA4.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=2)

    bymodel=dict(
        schema="rosetta-bridge-by-model/v1",
        note="Dispatch par modèle générateur (EMP-19). unknown => CALIBRATION_REQUIRED (lancer rosetta-s0-ollama.ts).",
        models={
          "gemma4:31b": {"matrix":"ROSETTA_BRIDGE_MATRIX_GEMMA4.json","status":"CALIBRATED"},
          "claude-sonnet-4-20250514": {"matrix":"ROSETTA_BRIDGE_MATRIX.json","status":"ARCHIVE_EXTERNAL"}
        },
        default="CALIBRATION_REQUIRED")
    json.dump(bymodel,open(os.path.join(DATA,"ROSETTA_BRIDGE_MATRIX_BY_MODEL.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=2)

    # diff gemma vs claude (features communes)
    claude=json.load(open(CLAUDE,encoding="utf-8")).get("features",{})
    common=sorted(set(feats)&set(claude)); only_g=sorted(set(feats)-set(claude)); only_c=sorted(set(claude)-set(feats))
    diff_rows=[]
    for k in common:
        gc=feats[k]["category"]; cc=claude[k].get("s06_categorie") or claude[k].get("category")
        diff_rows.append(dict(feature=k, gemma_cat=gc, gemma_pilot=feats[k]["pilotability"],
                              claude_cat=cc, claude_compliance=claude[k].get("compliance_rate"),
                              divergent=(gc!=cc)))
    diff=dict(common=common, only_gemma=only_g, only_claude=only_c,
              divergent=[d for d in diff_rows if d["divergent"]], rows=diff_rows,
              danger="f17_knife_count = ILLUSION sur gemma4 (interdit comme levier)")
    json.dump(diff,open(os.path.join(DATA,"ROSETTA_GEMMA4_VS_CLAUDE_DIFF.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=2)

    print(json.dumps({"active_levers":active_levers,
                      "forbidden":gemma["forbidden_levers"],
                      "advisory":gemma["advisory_levers"],
                      "inactive":gemma["inactive_levers"],
                      "common_with_claude":len(common),"divergent":len(diff["divergent"]),
                      "only_gemma":only_g,"only_claude":only_c},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
