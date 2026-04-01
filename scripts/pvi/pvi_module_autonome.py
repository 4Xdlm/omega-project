#!/usr/bin/env python3
"""
OMEGA PVI Module Autonome — Phase P4
=====================================
Bestseller predictor: input raw text, output complete diagnostic.

Usage:
    py -3.11 pvi_module_autonome.py --input roman.epub --lang fr
    py -3.11 pvi_module_autonome.py --input roman.txt --lang en
    py -3.11 pvi_module_autonome.py --input roman.epub --lang fr --assisted

Modele: MINIMAL v2 (FL, I, Omega, T) — AUC=0.9728 hors echantillon
Coefficients culturels: FR et EN calibres separement

Standard: OMEGA NASA-Grade L4 / DO-178C Level A
"""

import argparse
import json
import math
import os
import sys
import statistics
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pvi_nlp_scorer import (
    load_text, extract_windows, get_nlp,
    extract_FL, extract_MS, extract_LP, extract_DR, extract_T_v2, extract_T_v3,
    extract_S_local, extract_A_proxy, extract_I_proxy, extract_I_proxy_v2,
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# =============================================================================
# COEFFICIENT LOADING
# =============================================================================
def load_coefficients(lang):
    """Load cultural coefficients for given language."""
    lang_upper = lang.upper()
    cultural_path = os.path.join(SCRIPT_DIR, f"coefficients_v2_{lang_upper}.json")
    fallback_path = os.path.join(SCRIPT_DIR, "coefficients_v2.json")

    if os.path.exists(cultural_path):
        with open(cultural_path, encoding="utf-8") as f:
            return json.load(f), f"cultural_{lang_upper}"
    else:
        with open(fallback_path, encoding="utf-8") as f:
            return json.load(f), "universal"


# =============================================================================
# ASSISTED MODE — Omega + U questions
# =============================================================================
def ask_assisted_questions():
    """Interactive questions for Omega and U estimation."""
    print("\n--- MODE ASSISTE : Questions structurelles ---\n")

    omega_questions = [
        "Q1: La tension principale du chapitre 1 est-elle resolue a la fin ?",
        "Q2: La resolution est-elle coherente avec l'arc du protagoniste ?",
        "Q3: La resolution contient-elle un element non telephone ?",
        "Q4: Le lecteur peut-il clore emotionnellement son investissement ?",
    ]

    omega_score = 0.0
    for q in omega_questions:
        while True:
            answer = input(f"  {q} (o/n/p=partiel) : ").strip().lower()
            if answer in ("o", "oui", "y", "yes"):
                omega_score += 0.25
                break
            elif answer in ("n", "non", "no"):
                break
            elif answer in ("p", "partiel", "partial"):
                omega_score += 0.12
                break
            else:
                print("    Repondre o, n, ou p")

    print(f"\n  Q5: Ce protagoniste peut-il etre decrit en 10 mots")
    while True:
        answer = input(f"      distincts de tout personnage connu ? (o/n/p) : ").strip().lower()
        if answer in ("o", "oui", "y", "yes"):
            u_score = 0.90
            break
        elif answer in ("n", "non", "no"):
            u_score = 0.40
            break
        elif answer in ("p", "partiel", "partial"):
            u_score = 0.65
            break
        else:
            print("    Repondre o, n, ou p")

    print(f"\n  Omega = {omega_score:.2f} | U = {u_score:.2f}")
    return omega_score, u_score


# =============================================================================
# PVI FULL CALCULATION
# =============================================================================
def calculate_full_pvi(variables, omega, u, n_rev):
    """Calculate complete PVI with all components."""
    FL = variables["FL"]["score"]
    MS = variables["MS"]["score"]
    LP = variables["LP"]["score"]
    DR = variables["DR"]["score"]
    S = variables.get("S_local", {}).get("score", 0.5)
    I = variables.get("I_proxy", {}).get("score", 0.6)
    # T_v2 if available, fallback to 1-DR
    if "T_v2" in variables:
        T_proxy = variables["T_v2"]["score"]
    else:
        T_proxy = max(1.0 - DR, 0.1)

    E_emo = 0.40 * I + 0.28 * T_proxy + 0.17 * S + 0.15 * I * T_proxy
    E_cog = 0.40 * FL + 0.25 * FL * (1 - MS) + 0.20 * DR + 0.15 * LP
    CE = E_emo / E_cog if E_cog > 0.001 else 999.0

    if n_rev < 2:
        Arc_rev = 0.50
    elif n_rev <= 3:
        Arc_rev = 1.00
    else:
        Arc_rev = 1.20

    R_exp = 1.2 * T_proxy + 1.5 * I + 1.0 * Arc_rev - 2.5
    R = 1 / (1 + math.exp(-R_exp))

    W_exp = 1.8 * I + 2.0 * omega + 0.8 * u - 2.8
    W = 1 / (1 + math.exp(-W_exp))

    penalty = max(0, 1 - 2.0 * FL * (1 - omega))
    PVI = CE * Arc_rev * R * W * penalty
    SP = PVI * 20

    score_etouffement = FL * (1 - omega)

    return {
        "I": round(I, 4),
        "T_proxy": round(T_proxy, 4),
        "FL": round(FL, 4),
        "MS": round(MS, 4),
        "LP": round(LP, 4),
        "DR": round(DR, 4),
        "S_local": round(S, 4),
        "Omega": round(omega, 4),
        "U": round(u, 4),
        "N_rev": n_rev,
        "E_emo": round(E_emo, 4),
        "E_cog": round(E_cog, 4),
        "CE": round(CE, 4),
        "Arc_rev": round(Arc_rev, 2),
        "R": round(R, 4),
        "W": round(W, 4),
        "PVI": round(PVI, 4),
        "SP": round(SP, 2),
        "score_etouffement": round(score_etouffement, 4),
        "warning_etouffement": score_etouffement > 0.08,
    }


def predict_bestseller(calc, model, lang):
    """Predict bestseller probability using calibrated logistic model."""
    coefs = model["coefficients"]
    intercept = model["intercept"]

    z = intercept
    mapping = {"FL": calc["FL"], "I": calc["I"], "Omega": calc["Omega"], "T": calc["T_proxy"]}
    for feat in model["features"]:
        z += coefs[feat] * mapping[feat]

    proba = 1 / (1 + math.exp(-z))
    return round(proba, 4)


# =============================================================================
# DIAGNOSTICS
# =============================================================================
def compute_goulots(calc):
    """Identify active bottlenecks."""
    goulots = []
    if calc["I"] < 0.55:
        goulots.append(("GOULOT-I", calc["I"], 0.55,
                         "Protagoniste insuffisamment identifiable"))
    if calc["Omega"] < 0.45:
        goulots.append(("GOULOT-Omega", calc["Omega"], 0.45,
                         "Fin ne declenche pas la recommandation"))
    if calc["FL"] > 0.65:
        goulots.append(("GOULOT-FL", calc["FL"], 0.65,
                         "Friction lexicale bloque la retention"))
    if calc["R"] < 0.50:
        goulots.append(("GOULOT-R", calc["R"], 0.50,
                         "Lecteur n'atteint probablement pas la fin"))
    if calc["W"] < 0.50:
        goulots.append(("GOULOT-W", calc["W"], 0.50,
                         "Transmissibilite nulle"))
    if calc["N_rev"] < 2:
        goulots.append(("GOULOT-ARC", calc["N_rev"], 2,
                         "Arc trop lineaire"))
    return goulots


def compute_sensitivity(variables, calc, omega, u):
    """Compute PVI gain for +0.10 on each variable."""
    base_pvi = calc["PVI"]
    gains = []

    test_vars = [
        ("I", "I_proxy", +0.10),
        ("FL", "FL", -0.10),
        ("Omega", None, +0.10),
        ("T", None, +0.10),
        ("MS", "MS", +0.10),
        ("S", "S_local", +0.10),
        ("U", None, +0.10),
    ]

    for name, nlp_key, delta in test_vars:
        mod_vars = {k: dict(v) if isinstance(v, dict) else v
                    for k, v in variables.items()}
        mod_omega = omega
        mod_u = u

        if nlp_key and nlp_key in mod_vars:
            new_val = max(0, min(1, mod_vars[nlp_key]["score"] + delta))
            mod_vars[nlp_key] = dict(mod_vars[nlp_key])
            mod_vars[nlp_key]["score"] = new_val
        elif name == "Omega":
            mod_omega = min(1, omega + delta)
        elif name == "T":
            # T is proxy from DR, modify DR inversely
            continue  # skip T for now
        elif name == "U":
            mod_u = min(1, u + delta)

        new_calc = calculate_full_pvi(mod_vars, mod_omega, mod_u, calc["N_rev"])
        gain = new_calc["PVI"] - base_pvi
        pct = (gain / base_pvi * 100) if base_pvi > 0.001 else 0

        direction = f"+0.10" if delta > 0 else f"-0.10"
        gains.append((name, direction, round(gain, 4), round(pct, 1)))

    gains.sort(key=lambda x: -abs(x[2]))
    return gains[:3]


def compute_zone_omega_distance(calc, lang):
    """Compute distance to Zone OMEGA targets."""
    targets = {
        "FL": ("<=", 0.25),
        "MS": (">=", 0.85),
        "Omega": (">=", 0.72),
        "I": (">=", 0.65),
        "T_proxy": (">=", 0.75),
    }

    distances = []
    all_met = True
    for var, (direction, target) in targets.items():
        actual = calc[var]
        if direction == "<=":
            met = actual <= target
            delta = actual - target if not met else 0
        else:
            met = actual >= target
            delta = target - actual if not met else 0

        if not met:
            all_met = False

        distances.append((var, actual, target, round(delta, 4), met))

    if calc["N_rev"] < 2:
        all_met = False
        distances.append(("N_rev", calc["N_rev"], 2, 2 - calc["N_rev"], False))
    else:
        distances.append(("N_rev", calc["N_rev"], 2, 0, True))

    return distances, all_met


# =============================================================================
# VERDICT
# =============================================================================
def compute_verdict(pvi, proba):
    """Determine phase and verdict."""
    if pvi < 0.30:
        phase = "Phase 1 : mort organique"
    elif pvi < 0.70:
        phase = "Phase 2 : niche viable"
    elif pvi < 1.50:
        phase = "Phase 3 : succes solide"
    elif pvi < 3.00:
        phase = "Phase 4 : best-seller organique"
    else:
        phase = "Phase 5 : phenomene"

    if proba >= 0.65:
        verdict = "PASS — potentiel bestseller detecte"
    elif proba >= 0.50:
        verdict = "BORDERLINE — signal ambigu"
    else:
        verdict = "FAIL — pas de potentiel bestseller intrinseque"

    return phase, verdict


# =============================================================================
# REPORT GENERATION
# =============================================================================
def generate_markdown_report(title, lang, calc, proba, model_source,
                              goulots, top_leviers, zone_dist, zone_met,
                              phase, verdict, variables, assisted):
    lines = []
    date = datetime.now().strftime("%Y-%m-%d")

    lines.append(f"# RAPPORT PVI — {title}\n")
    lines.append(f"Langue : {lang.upper()} | Date : {date} | "
                 f"Modele : MINIMAL v2 ({model_source})\n\n")

    # SCORES TABLE
    lines.append("## SCORES\n\n")
    lines.append("| Variable | Score | Methode | Seuil critique | Statut |\n")
    lines.append("|----------|-------|---------|----------------|--------|\n")

    def check(val, op, thresh):
        if op == ">=":
            return "OK" if val >= thresh else "GOULOT"
        return "OK" if val <= thresh else "GOULOT"

    i_method = variables.get("I_proxy", {}).get("tag", "PROXY-NLP")
    fl_method = variables.get("FL", {}).get("tag", "NLP_v2")
    ms_method = variables.get("MS", {}).get("tag", "NLP_v2")
    omega_tag = "ASSISTE" if assisted else "SEMI-AUTO"

    lines.append(f"| I | {calc['I']:.4f} | {i_method} | >= 0.65 | "
                 f"{check(calc['I'], '>=', 0.65)} |\n")
    lines.append(f"| FL | {calc['FL']:.4f} | {fl_method} | <= 0.25 | "
                 f"{check(calc['FL'], '<=', 0.25)} |\n")
    lines.append(f"| Omega | {calc['Omega']:.4f} | {omega_tag} | >= 0.72 | "
                 f"{check(calc['Omega'], '>=', 0.72)} |\n")
    lines.append(f"| T | {calc['T_proxy']:.4f} | proxy(1-DR) | >= 0.75 | "
                 f"{check(calc['T_proxy'], '>=', 0.75)} |\n")
    lines.append(f"| MS | {calc['MS']:.4f} | {ms_method} | >= 0.85 | "
                 f"{check(calc['MS'], '>=', 0.85)} |\n")
    lines.append(f"| N_rev | {calc['N_rev']} | semi-auto | >= 2 | "
                 f"{check(calc['N_rev'], '>=', 2)} |\n")
    lines.append(f"| S | {calc['S_local']:.4f} | NLP-PARTIEL | — | — |\n")
    lines.append(f"| U | {calc['U']:.4f} | {omega_tag} | — | — |\n\n")

    # CALCULS
    lines.append("## CALCULS\n\n")
    lines.append(f"E_emo = {calc['E_emo']:.4f} | E_cog = {calc['E_cog']:.4f} | "
                 f"CE = {calc['CE']:.4f}\n\n")
    lines.append(f"R = {calc['R']:.4f} | W = {calc['W']:.4f} | "
                 f"Arc_rev = {calc['Arc_rev']:.2f}\n\n")
    lines.append(f"Score etouffement FL x (1-Omega) = {calc['score_etouffement']:.4f}")
    if calc["warning_etouffement"]:
        lines.append(f" **ATTENTION: > 0.08 — risque abandon lecteur**")
    lines.append(f"\n\n**PVI = {calc['PVI']:.4f} | SP = {calc['SP']:.1f}/100**\n\n")

    # VERDICT
    lines.append("## VERDICT\n\n")
    lines.append(f"**{phase}**\n\n")
    lines.append(f"**Probabilite bestseller : {proba*100:.1f}% -> {verdict}**\n\n")
    if zone_met:
        lines.append(f"**ZONE OMEGA ATTEINTE**\n\n")

    # GOULOTS
    lines.append("## GOULOTS ACTIFS\n\n")
    if goulots:
        for g in goulots:
            lines.append(f"- **{g[0]}** : {g[3]} (actuel={g[1]:.2f}, seuil={g[2]})\n")
    else:
        lines.append("Aucun goulot critique detecte.\n")
    lines.append("\n")

    # LEVIERS
    lines.append("## TOP 3 LEVIERS\n\n")
    for i, (name, direction, gain, pct) in enumerate(top_leviers, 1):
        lines.append(f"{i}. **{name}** {direction} -> PVI {'+' if gain > 0 else ''}"
                     f"{gain:.4f} ({'+' if pct > 0 else ''}{pct:.1f}%)\n")
    lines.append("\n")

    # ZONE OMEGA DISTANCE
    lines.append("## DISTANCE ZONE OMEGA\n\n")
    lines.append("| Variable | Actuel | Cible | Delta manquant | Statut |\n")
    lines.append("|----------|--------|-------|----------------|--------|\n")
    for var, actual, target, delta, met in zone_dist:
        s = "OK" if met else f"**-{abs(delta):.2f}**"
        lines.append(f"| {var} | {actual:.4f} | {target} | {s} | "
                     f"{'OK' if met else 'MANQUE'} |\n")
    lines.append(f"\nReference Zone OMEGA: Hemingway PVI=2.441 / Fitzgerald PVI=1.699\n")

    return "".join(lines)


# =============================================================================
# MAIN PIPELINE
# =============================================================================
def run_module(filepath, lang, assisted=False):
    """Full autonomous PVI module pipeline."""
    print(f"\n{'='*70}")
    print(f"OMEGA PVI Module Autonome — Phase P4")
    print(f"{'='*70}")
    print(f"Input: {filepath}")
    print(f"Lang:  {lang}")
    print(f"Mode:  {'assiste' if assisted else 'automatique'}")

    # Load model
    model, model_source = load_coefficients(lang)
    print(f"Modele: {model_source} | Coefs: {model['coefficients']}")

    # Step 1: Load text
    print(f"\n[1/6] Chargement texte...", end=" ", flush=True)
    text = load_text(filepath)
    print(f"OK ({len(text):,} chars)")

    # Step 2: Extract windows
    print(f"[2/6] Extraction fenetres (20% x 3)...", end=" ", flush=True)
    windows, labels = extract_windows(text)
    print(f"OK ({len(windows)} fenetres)")

    # Step 3: NLP extraction
    print(f"[3/6] Extraction NLP...")
    fl = extract_FL(windows, lang)
    print(f"  FL = {fl['score']}")
    ms = extract_MS(windows, lang)
    print(f"  MS = {ms['score']}")
    lp = extract_LP(windows, lang)
    print(f"  LP = {lp['score']}")
    dr = extract_DR(windows, lang)
    print(f"  DR = {dr['score']}")
    t_v2 = extract_T_v3(windows, lang)
    print(f"  T  = {t_v2['score']} (sens={t_v2['T_sensoriel']:.3f}, "
          f"sit={t_v2['T_situationnel']:.3f}, rel={t_v2['T_relationnel']:.3f}, "
          f"nar={t_v2.get('T_narratif', 0):.3f})")
    s_local = extract_S_local(windows, lang)
    print(f"  S  = {s_local['score']}")
    a_proxy = extract_A_proxy(windows, lang)
    print(f"  A  = {a_proxy['score']} (N_rev_proxy={a_proxy['N_rev_proxy']})")
    i_proxy = extract_I_proxy_v2(windows, lang) if lang == "fr" else extract_I_proxy(windows, lang)
    if lang == "fr":
        print(f"  I  = {i_proxy['score']} (POV 1st: {i_proxy['pov_1st_person']}) [v2-FR: focal={i_proxy.get('focalisation_interne', 'N/A')}, ancrage={i_proxy.get('ancrage_corporel', 'N/A')}, desir={i_proxy.get('desir_narratif', 'N/A')}]")
    else:
        print(f"  I  = {i_proxy['score']} (POV 1st: {i_proxy['pov_1st_person']})")

    variables = {
        "FL": fl, "MS": ms, "LP": lp, "DR": dr, "T_v2": t_v2,
        "S_local": s_local, "A_proxy": a_proxy, "I_proxy": i_proxy,
    }

    # Step 4: Structural variables
    print(f"[4/6] Variables structurelles...")
    if assisted:
        omega, u = ask_assisted_questions()
    else:
        # A_proxy is UNRELIABLE as Omega estimator (VADER sentiment ≠ resolution quality)
        # Use profile-aware default based on I and FL:
        #   Commercial profile (I>0.70, FL<0.25) → Omega default 0.70
        #   Literary profile (I<0.55, FL>0.40) → Omega default 0.45
        #   Mixed → Omega default 0.58
        i_val = i_proxy["score"]
        fl_val = fl["score"]
        if i_val > 0.70 and fl_val < 0.25:
            omega = 0.70
            omega_tag = "DEFAUT_COMMERCIAL"
        elif i_val < 0.55 and fl_val > 0.40:
            omega = 0.45
            omega_tag = "DEFAUT_LITTERAIRE"
        else:
            omega = 0.58
            omega_tag = "DEFAUT_MIXTE"
        u = 0.65
        print(f"  Omega = {omega:.4f} [{omega_tag}] (profil: I={i_val:.2f}, FL={fl_val:.2f})")
        print(f"  U = {u:.2f} [DEFAUT]")

    n_rev = a_proxy["N_rev_proxy"]

    # Step 5: Calculate PVI
    print(f"[5/6] Calcul PVI...")
    calc = calculate_full_pvi(variables, omega, u, n_rev)
    proba = predict_bestseller(calc, model, lang)
    phase, verdict = compute_verdict(calc["PVI"], proba)

    print(f"\n  PVI    = {calc['PVI']:.4f}")
    print(f"  SP     = {calc['SP']:.1f}/100")
    print(f"  Proba  = {proba:.4f} ({proba*100:.1f}%)")
    print(f"  Phase  = {phase}")
    print(f"  Verdict= {verdict}")

    if calc["warning_etouffement"]:
        print(f"  *** ATTENTION: Score etouffement = {calc['score_etouffement']:.4f} > 0.08 ***")

    # Step 6: Diagnostics
    print(f"[6/6] Diagnostic...")
    goulots = compute_goulots(calc)
    top_leviers = compute_sensitivity(variables, calc, omega, u)
    zone_dist, zone_met = compute_zone_omega_distance(calc, lang)

    if goulots:
        print(f"  Goulots: {', '.join(g[0] for g in goulots)}")
    else:
        print(f"  Aucun goulot critique")

    print(f"  Top levier: {top_leviers[0][0] if top_leviers else 'N/A'}")
    print(f"  Zone OMEGA: {'ATTEINTE' if zone_met else 'NON ATTEINTE'}")

    # Generate reports
    title = Path(filepath).stem
    date = datetime.now().strftime("%Y-%m-%d")

    # Markdown
    md_report = generate_markdown_report(
        title, lang, calc, proba, model_source,
        goulots, top_leviers, zone_dist, zone_met,
        phase, verdict, variables, assisted)

    md_path = os.path.join(os.path.dirname(filepath),
                           f"rapport_pvi_{title}_{date}.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_report)
    print(f"\n  Rapport MD: {md_path}")

    # JSON
    json_data = {
        "titre": title,
        "langue": lang,
        "date": date,
        "modele": model_source,
        "assisted": assisted,
        "variables_nlp": {k: v for k, v in variables.items()},
        "calculs": calc,
        "proba_bestseller": proba,
        "phase": phase,
        "verdict": verdict,
        "goulots": [{"id": g[0], "actuel": g[1], "seuil": g[2], "desc": g[3]}
                    for g in goulots],
        "top_leviers": [{"variable": l[0], "delta": l[1], "gain_pvi": l[2],
                         "gain_pct": l[3]} for l in top_leviers],
        "zone_omega": {
            "atteinte": zone_met,
            "distances": [{"variable": d[0], "actuel": d[1], "cible": d[2],
                           "delta": d[3], "atteint": d[4]} for d in zone_dist],
        },
    }

    json_path = os.path.join(os.path.dirname(filepath),
                             f"rapport_pvi_{title}_{date}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    print(f"  Rapport JSON: {json_path}")

    return json_data


# =============================================================================
# CLI
# =============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="OMEGA PVI Module Autonome — Bestseller Predictor")
    parser.add_argument("--input", "-i", required=True,
                        help="Path to book file (.txt, .epub, .pdf)")
    parser.add_argument("--lang", "-l", default="fr", choices=["fr", "en"],
                        help="Language (default: fr)")
    parser.add_argument("--assisted", "-a", action="store_true",
                        help="Assisted mode: asks 5 questions for Omega + U")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"ERREUR: Fichier non trouve: {args.input}")
        sys.exit(1)

    run_module(args.input, args.lang, args.assisted)


if __name__ == "__main__":
    main()
