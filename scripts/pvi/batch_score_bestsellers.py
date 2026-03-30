#!/usr/bin/env python3
"""
OMEGA PVI — Batch scoring: livre best seller directory
Scores all epub/pdf, detects language, produces summary table.
"""
import csv
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
    extract_FL, extract_MS, extract_LP, extract_DR, extract_T_v2,
    extract_S_local, extract_A_proxy, extract_I_proxy,
)
from pvi_module_autonome import (
    load_coefficients, calculate_full_pvi, predict_bestseller,
    compute_goulots, compute_sensitivity, compute_zone_omega_distance,
    compute_verdict, generate_markdown_report,
)

BESTSELLER_DIR = r"C:\Users\elric\Downloads\livre\livre best seller"
OUTPUT_DIR = r"C:\Users\elric\omega-project\docs\physique-litteraire\scoring-bestsellers"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Files to exclude
EXCLUDE = [
    "Summary_of_Lessons_in_Chemistry",
    "Fourth_Wing_Special_Edition_-_Rebecca_Yarros (1)",  # duplicate
]

# Proxy-only (no NLP scoring)
PROXY_ONLY = [
    "Ugly_Love_Polish_Edition",
]

# Non-fiction exclusions
NONFICTION = [
    "Spare_-_Prince_Harry",  # memoir, not fiction
]

# Language detection: FR if French_Edition or known FR author
FR_MARKERS = [
    "French_Edition", "French Edition",
    "Guillaume_Musso", "Musso_Guillaume", "Michel_Houellebecq",
    "Kamel_Daoud", "Karine_Tuil", "David_Foenkinos",
    "Sarah_J_Maas.*French", "Sandrine_Collette", "Claire_Contreras.*French",
    "Yasmina_Reza", "Neige_Sinno", "Brigitte_Giraud",
]

# Known titles with pre-set Omega estimates (batch mode = no interactive)
# Based on literary knowledge of these bestsellers
OMEGA_ESTIMATES = {
    # High Omega (strong resolution)
    "Demon_Copperhead": 0.75,
    "Happy_place": 0.78,
    "It_Ends_with_Us": 0.80,
    "The_Maid": 0.78,
    "The_women": 0.78,
    "Hello_Beautiful": 0.72,
    "The_Covenant_of_Water": 0.75,
    "The_Frozen_River": 0.75,
    "Fourth_Wing_Special_Edition": 0.72,
    "Fourth_wing_Tome_1_French": 0.72,
    "Iron_Flame": 0.72,
    "Onyx_Storm": 0.72,
    "Everyone_In_My_Family_Has_Killed_Someone": 0.82,
    "Haunting_Adeline": 0.68,
    "The_Love_Hypothesis": 0.78,
    "Beach_Read": 0.78,
    "In_a_Holidaze": 0.75,
    "icebreakers": 0.75,
    "Still_See_You_Everywhere": 0.72,
    "The_striker": 0.72,
    "La_delicatesse": 0.72,
    "Linstant_present": 0.75,
    "Sauve_French": 0.72,
    "Le_trone_de_verre": 0.72,
    "Maison_de_la_flamme": 0.72,
    "Jusqua_ce_que_tu_mappartienne": 0.68,
    "Madelaine_avant_laube": 0.70,
    # Medium Omega (mixed resolution)
    "Tomorrow_and_Tomorrow": 0.72,
    "James": 0.72,
    "Intermezzo": 0.62,
    "All_Fours": 0.55,
    "Martyr": 0.52,
    "Serotonine": 0.55,
    "aneantir": 0.58,
    "Serge": 0.60,
    "Houris_French": 0.50,
    "Triste_tigre": 0.55,
    "Vivre_vite": 0.60,
    "La_Decision": 0.65,
}

# Known N_rev estimates
NREV_ESTIMATES = {
    "Demon_Copperhead": 4,
    "Fourth_Wing": 4,
    "Iron_Flame": 4,
    "Onyx_Storm": 4,
    "It_Ends_with_Us": 2,
    "Everyone_In_My_Family": 4,
    "Tomorrow_and_Tomorrow": 3,
    "James": 3,
    "Happy_place": 2,
    "The_women": 3,
    "Intermezzo": 2,
    "The_Maid": 3,
    "Haunting_Adeline": 3,
    "All_Fours": 2,
}


def detect_language(filename):
    """Detect language from filename."""
    for marker in FR_MARKERS:
        if marker.lower().replace("_", " ") in filename.lower().replace("_", " "):
            return "fr"
    # Known FR-only authors
    fr_authors = ["houellebecq", "musso", "daoud", "tuil", "foenkinos",
                  "collette", "reza", "sinno", "giraud"]
    fn_lower = filename.lower()
    for auth in fr_authors:
        if auth in fn_lower:
            return "fr"
    return "en"


def get_omega_estimate(filename):
    """Get pre-set Omega for batch mode."""
    for key, val in OMEGA_ESTIMATES.items():
        if key.lower() in filename.lower():
            return val, f"PROXY_BESTSELLER({val:.2f})"
    return 0.65, "DEFAUT_BATCH"


def get_nrev_estimate(filename):
    """Get pre-set N_rev for batch mode."""
    for key, val in NREV_ESTIMATES.items():
        if key.lower() in filename.lower():
            return val
    return 3  # Default for bestsellers


def should_exclude(filename):
    for exc in EXCLUDE + NONFICTION:
        if exc.lower() in filename.lower():
            return True
    return False


def is_proxy_only(filename):
    for p in PROXY_ONLY:
        if p.lower() in filename.lower():
            return True
    return False


def score_single(filepath, lang):
    """Score a single book with full NLP pipeline.
    Caps window size at 80K chars to avoid spaCy OOM on large epubs."""
    text = load_text(filepath)
    windows, _ = extract_windows(text)
    # Cap each window to 80K chars for memory safety
    windows = [w[:80000] for w in windows]

    fl = extract_FL(windows, lang)
    ms = extract_MS(windows, lang)
    lp = extract_LP(windows, lang)
    dr = extract_DR(windows, lang)
    t_v2 = extract_T_v2(windows, lang)
    s_local = extract_S_local(windows, lang)
    a_proxy = extract_A_proxy(windows, lang)
    i_proxy = extract_I_proxy(windows, lang)

    variables = {
        "FL": fl, "MS": ms, "LP": lp, "DR": dr, "T_v2": t_v2,
        "S_local": s_local, "A_proxy": a_proxy, "I_proxy": i_proxy,
    }
    return variables, text


def main():
    print("=" * 80)
    print("OMEGA PVI — Batch Scoring: Bestsellers 2022-2025")
    print("=" * 80)

    files = []
    for f in sorted(os.listdir(BESTSELLER_DIR)):
        ext = os.path.splitext(f)[1].lower()
        if ext not in (".epub", ".pdf"):
            continue
        if should_exclude(f):
            print(f"  SKIP (excluded): {f}")
            continue
        files.append(f)

    print(f"\nTotal files to score: {len(files)}")

    all_results = []

    for i, filename in enumerate(files, 1):
        filepath = os.path.join(BESTSELLER_DIR, filename)
        lang = detect_language(filename)
        title = Path(filename).stem
        proxy_only = is_proxy_only(filename)

        print(f"\n[{i}/{len(files)}] {title[:50]} ({lang.upper()})"
              f"{' [PROXY ONLY]' if proxy_only else ''}")

        if proxy_only:
            # Polish edition — just note it
            all_results.append({
                "titre": title,
                "auteur": "Colleen Hoover",
                "fichier": filename,
                "langue": "pl",
                "PVI": None,
                "proba": None,
                "verdict": "PROXY_ONLY (edition polonaise)",
                "phase": "—",
                "FL": None, "MS": None, "I": None, "Omega": None, "T": None,
                "goulots": "",
                "zone_omega": False,
                "proxy_only": True,
            })
            continue

        try:
            model, model_source = load_coefficients(lang)
            variables, text = score_single(filepath, lang)

            omega, omega_tag = get_omega_estimate(filename)
            n_rev = get_nrev_estimate(filename)
            u = 0.65

            calc = calculate_full_pvi(variables, omega, u, n_rev)
            proba = predict_bestseller(calc, model, lang)
            phase, verdict = compute_verdict(calc["PVI"], proba)
            goulots = compute_goulots(calc)
            zone_dist, zone_met = compute_zone_omega_distance(calc, lang)

            # Extract author from filename
            parts = title.replace("_-_", " - ").replace("_", " ").split(" - ")
            auteur = parts[-1].strip() if len(parts) > 1 else "Unknown"

            print(f"  FL={calc['FL']:.3f} MS={calc['MS']:.3f} I={calc['I']:.3f} "
                  f"O={calc['Omega']:.2f} T={calc['T_proxy']:.3f}")
            print(f"  PVI={calc['PVI']:.3f} proba={proba:.3f} -> {verdict[:30]}")

            # Save individual report
            top_leviers = compute_sensitivity(variables, calc, omega, u)
            md_report = generate_markdown_report(
                title, lang, calc, proba, model_source,
                goulots, top_leviers, zone_dist, zone_met,
                phase, verdict, variables, False)

            report_path = os.path.join(OUTPUT_DIR, f"rapport_pvi_{title[:60]}.md")
            with open(report_path, "w", encoding="utf-8") as f:
                f.write(md_report)

            all_results.append({
                "titre": title,
                "auteur": auteur,
                "fichier": filename,
                "langue": lang,
                "PVI": calc["PVI"],
                "SP": calc["SP"],
                "proba": proba,
                "verdict": verdict,
                "phase": phase,
                "FL": calc["FL"],
                "MS": calc["MS"],
                "I": calc["I"],
                "Omega": calc["Omega"],
                "T": calc["T_proxy"],
                "N_rev": calc["N_rev"],
                "CE": calc["CE"],
                "R": calc["R"],
                "W": calc["W"],
                "goulots": "|".join(g[0] for g in goulots),
                "zone_omega": zone_met,
                "proxy_only": False,
                "omega_tag": omega_tag,
            })

        except Exception as e:
            print(f"  ERREUR: {e}")
            all_results.append({
                "titre": title,
                "auteur": "?",
                "fichier": filename,
                "langue": lang,
                "PVI": None,
                "proba": None,
                "verdict": f"ERREUR: {str(e)[:50]}",
                "phase": "—",
                "FL": None, "MS": None, "I": None, "Omega": None, "T": None,
                "goulots": "",
                "zone_omega": False,
                "proxy_only": False,
            })

    # =========================================================================
    # GENERATE SUMMARY TABLE
    # =========================================================================
    scored = [r for r in all_results if r["PVI"] is not None]
    scored.sort(key=lambda x: -x["PVI"])

    lines = []
    lines.append("# Tableau Scoring Bestsellers 2022-2025\n\n")
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d')}\n")
    lines.append(f"**Module**: pvi_module_autonome.py (MINIMAL v2, coefficients culturels)\n")
    lines.append(f"**Titres scores**: {len(scored)} | **Exclus/proxy**: "
                 f"{len(all_results) - len(scored)}\n\n")

    lines.append("## Classement par PVI decroissant\n\n")
    lines.append("| # | Titre | Auteur | Lang | PVI | SP | Proba | Verdict | "
                 "FL | I | Omega | MS | Zone OMEGA |\n")
    lines.append("|---|-------|--------|------|-----|-----|-------|---------|"
                 "-----|---|-------|-----|------------|\n")

    for i, r in enumerate(scored, 1):
        verd_short = "PASS" if "PASS" in r["verdict"] else (
            "BORDER" if "BORDERLINE" in r["verdict"] else "FAIL")
        zo = "OUI" if r["zone_omega"] else "—"
        lines.append(
            f"| {i} | {r['titre'][:35]} | {r['auteur'][:18]} | "
            f"{r['langue'].upper()} | {r['PVI']:.3f} | {r['SP']:.1f} | "
            f"{r['proba']:.3f} | {verd_short} | "
            f"{r['FL']:.3f} | {r['I']:.3f} | {r['Omega']:.2f} | "
            f"{r['MS']:.3f} | {zo} |\n")

    # Proxy-only entries
    proxy_entries = [r for r in all_results if r.get("proxy_only")]
    if proxy_entries:
        lines.append(f"\n**Non scores (proxy uniquement):**\n")
        for r in proxy_entries:
            lines.append(f"- {r['titre']} — {r['verdict']}\n")

    # Reference comparison
    lines.append(f"\n## Reference Zone OMEGA\n\n")
    lines.append(f"| Titre | PVI | Statut |\n")
    lines.append(f"|-------|-----|--------|\n")
    lines.append(f"| Hemingway — Old Man and the Sea | 2.441 | Zone OMEGA (reference) |\n")
    lines.append(f"| Fitzgerald — Great Gatsby | 1.699 | Zone OMEGA (reference) |\n")

    # Top 5 closest to Zone OMEGA
    lines.append(f"\n## 5 titres les plus proches de la Zone OMEGA\n\n")
    # Score: how close to meeting all Zone OMEGA criteria
    for r in scored:
        r["_omega_dist"] = (
            max(0, r["FL"] - 0.25) +
            max(0, 0.85 - r["MS"]) +
            max(0, 0.72 - r["Omega"]) +
            max(0, 0.65 - r["I"]) +
            max(0, 0.75 - r["T"])
        )

    closest = sorted(scored, key=lambda x: x["_omega_dist"])[:5]
    lines.append("| Titre | PVI | Distance | FL(<=0.25) | MS(>=0.85) | "
                 "Omega(>=0.72) | I(>=0.65) | T(>=0.75) |\n")
    lines.append("|-------|-----|----------|-----------|-----------|"
                 "-------------|----------|----------|\n")
    for r in closest:
        def chk(val, op, thr):
            if op == "<=":
                return f"**{val:.3f}**" if val <= thr else f"{val:.3f} (+{val-thr:.2f})"
            else:
                return f"**{val:.3f}**" if val >= thr else f"{val:.3f} (-{thr-val:.2f})"

        lines.append(
            f"| {r['titre'][:30]} | {r['PVI']:.3f} | {r['_omega_dist']:.3f} | "
            f"{chk(r['FL'],'<=',0.25)} | {chk(r['MS'],'>=',0.85)} | "
            f"{chk(r['Omega'],'>=',0.72)} | {chk(r['I'],'>=',0.65)} | "
            f"{chk(r['T'],'>=',0.75)} |\n")

    # Stats
    lines.append(f"\n## Statistiques\n\n")
    pvs = [r["PVI"] for r in scored]
    probas = [r["proba"] for r in scored]
    pass_count = sum(1 for r in scored if "PASS" in r["verdict"])
    border_count = sum(1 for r in scored if "BORDERLINE" in r["verdict"])
    fail_count = sum(1 for r in scored if "FAIL" in r["verdict"])

    lines.append(f"- PVI moyen: {statistics.mean(pvs):.3f}\n")
    lines.append(f"- PVI median: {statistics.median(pvs):.3f}\n")
    lines.append(f"- PVI max: {max(pvs):.3f} ({scored[0]['titre'][:30]})\n")
    lines.append(f"- PVI min: {min(pvs):.3f} ({scored[-1]['titre'][:30]})\n")
    lines.append(f"- Proba moyenne: {statistics.mean(probas):.3f}\n")
    lines.append(f"- PASS: {pass_count} | BORDERLINE: {border_count} | FAIL: {fail_count}\n")
    lines.append(f"- Zone OMEGA: {sum(1 for r in scored if r['zone_omega'])}\n")

    # Write
    table_path = os.path.join(OUTPUT_DIR, "tableau_scoring_bestsellers_2022_2025.md")
    with open(table_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print(f"\n{'='*80}")
    print(f"BATCH COMPLETE: {len(scored)} scored")
    print(f"PASS: {pass_count} | BORDERLINE: {border_count} | FAIL: {fail_count}")
    print(f"Table: {table_path}")
    print(f"Reports: {OUTPUT_DIR}")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()
