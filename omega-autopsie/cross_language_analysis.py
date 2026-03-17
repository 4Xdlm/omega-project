#!/usr/bin/env python3
"""
OMEGA — Cross-Language Comparison
Phase W — Day 4 — Mission 8

Finds works that exist in multiple languages, compares their style profiles.
"""

import sys, os, json, math, re
from collections import defaultdict
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHAPTERS_DIR = os.path.join(os.path.dirname(__file__), "results_v4", "chapters")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "bench_results_v4")

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

# Known cross-language pairs: canonical_key -> [(work_id_pattern, language)]
CROSS_LANG_WORKS = {
    "camus_etranger": [
        ("etranger", "FR"), ("stranger", "EN"), ("extranjero", "ES"),
    ],
    "camus_peste": [
        ("peste", "FR"),
    ],
    "flaubert_bovary": [
        ("bovary", "FR"),
    ],
    "hugo_miserables": [
        ("miserables", "FR"),
    ],
    "proust_swann": [
        ("swann", "FR"),
    ],
    "hemingway_sun": [
        ("soleil", "FR"), ("sun_also", "EN"),
    ],
    "hemingway_old_man": [
        ("vieil_homme", "FR"),
    ],
    "morrison_beloved": [
        ("beloved", "FR"), ("beloved", "EN"),
    ],
    "marquez_solitude": [
        ("solitude", "FR"), ("soledad", "ES"),
    ],
    "eco_rose": [
        ("nom_de_la_rose", "FR"), ("name_of_the_rose", "EN"),
    ],
    "ishiguro_vestiges": [
        ("vestiges", "FR"), ("remains", "EN"),
    ],
    "kundera_insoutenable": [
        ("insoutenable", "FR"), ("unbearable", "EN"),
    ],
    "ferrante_amie": [
        ("amie_prodigieuse", "FR"), ("brilliant_friend", "EN"),
    ],
    "faulkner_bruit": [
        ("bruit_et_la_fureu", "FR"), ("sound_and_fury", "EN"),
    ],
    "nabokov_lolita": [
        ("lolita", "FR"), ("lolita", "EN"),
    ],
    "calvino_winter": [
        ("winter", "FR"), ("winter", "EN"),
    ],
    "bolano_2666": [
        ("2666", "FR"), ("2666", "ES"),
    ],
    "rulfo_pedro": [
        ("pedro", "FR"), ("pedro", "ES"),
    ],
    "simon_flanders": [
        ("flandre", "FR"), ("flanders", "EN"),
    ],
    "gracq_balcony": [
        ("balcon", "FR"), ("balcony", "EN"),
    ],
    "gracq_opposing": [
        ("rivage", "FR"), ("opposing", "EN"),
    ],
    "duras_novels": [
        ("duras", "FR"), ("four_novels", "EN"),
    ],
    "ernaux_disent": [
        ("disent", "FR"), ("do_what", "EN"),
    ],
    "carrere_kingdom": [
        ("royaume", "FR"), ("kingdom", "EN"),
    ],
    "simon_grass": [
        ("herbe", "FR"), ("grass", "EN"),
    ],
}


def mean(v): return sum(v)/len(v) if v else 0
def var(v):
    if len(v) < 2: return 0
    m = mean(v)
    return sum((x-m)**2 for x in v)/(len(v)-1)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load all chapters grouped by work_id
    work_chapters = defaultdict(list)
    work_meta = {}
    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        wid = data.get("work_id", "")
        lang = data.get("language", "UNKNOWN")
        features = data.get("baseline_features", {})
        cat_vals = {}
        for cat, feats in CATEGORIES.items():
            cat_vals[cat] = mean([features.get(k, 0) for k in feats])
        work_chapters[wid].append(cat_vals)
        if wid not in work_meta:
            work_meta[wid] = {"language": lang, "author": data.get("author", ""),
                              "title": data.get("title", "")}

    # Compute work-level means
    work_profiles = {}
    for wid, chapters in work_chapters.items():
        work_profiles[wid] = {}
        for cat in CATEGORIES:
            work_profiles[wid][cat] = mean([ch[cat] for ch in chapters])

    # Find cross-language pairs
    pairs_found = []
    for canonical, patterns in CROSS_LANG_WORKS.items():
        matched = {}
        for wid in work_profiles:
            wid_lower = wid.lower()
            for pattern, expected_lang in patterns:
                if pattern in wid_lower:
                    actual_lang = work_meta.get(wid, {}).get("language", "UNKNOWN")
                    # Use actual language from metadata
                    lang_key = actual_lang if actual_lang != "UNKNOWN" else expected_lang
                    if lang_key not in matched:
                        matched[lang_key] = (wid, work_profiles[wid])

        if len(matched) >= 2:
            pairs_found.append({
                "canonical": canonical,
                "languages": {lang: {"work_id": wid, "profile": prof}
                              for lang, (wid, prof) in matched.items()},
            })

    # Also scan for same-author works with language hints in work_id
    # (e.g., "_FR_" or "_EN_" suffixes)
    author_lang_works = defaultdict(lambda: defaultdict(list))
    for wid, meta in work_meta.items():
        author = meta.get("author", "").strip()
        lang = meta.get("language", "UNKNOWN")
        if author and lang != "UNKNOWN":
            # Normalize title for matching
            title_norm = re.sub(r'[^a-z0-9]', '', meta.get("title", "").lower())
            author_lang_works[author][(title_norm, lang)].append(wid)

    print(f"[CROSS-LANG] Found {len(pairs_found)} cross-language pairs from known list")

    # Analyze pairs
    results = []
    for pair in pairs_found:
        langs = sorted(pair["languages"].keys())
        if len(langs) < 2:
            continue

        # Compute divergence between language versions
        divergences = {}
        for cat in CATEGORIES:
            vals = [pair["languages"][l]["profile"][cat] for l in langs]
            spread = max(vals) - min(vals)
            avg = mean(vals)
            rel_div = spread / abs(avg) if abs(avg) > 1e-6 else 0
            divergences[cat] = {
                "values": {l: round(pair["languages"][l]["profile"][cat], 5) for l in langs},
                "spread": round(spread, 5),
                "relative_divergence": round(rel_div, 4),
            }

        # Overall divergence
        spreads = [divergences[c]["spread"] for c in CATEGORIES]
        rel_divs = [divergences[c]["relative_divergence"] for c in CATEGORIES]

        most_stable = min(CATEGORIES, key=lambda c: divergences[c]["relative_divergence"])
        most_divergent = max(CATEGORIES, key=lambda c: divergences[c]["relative_divergence"])

        entry = {
            "canonical": pair["canonical"],
            "languages": langs,
            "work_ids": {l: pair["languages"][l]["work_id"] for l in langs},
            "divergences": divergences,
            "mean_spread": round(mean(spreads), 5),
            "mean_relative_divergence": round(mean(rel_divs), 4),
            "most_stable_category": most_stable,
            "most_divergent_category": most_divergent,
            "verdict": "TRANSLATION_FAITHFUL" if mean(rel_divs) < 0.3 else
                       "TRANSLATION_ADAPTED" if mean(rel_divs) < 0.6 else "TRANSLATION_TRANSFORMED",
        }
        results.append(entry)

    results.sort(key=lambda x: x["mean_relative_divergence"])

    # Global stats
    if results:
        faithful = sum(1 for r in results if r["verdict"] == "TRANSLATION_FAITHFUL")
        adapted = sum(1 for r in results if r["verdict"] == "TRANSLATION_ADAPTED")
        transformed = sum(1 for r in results if r["verdict"] == "TRANSLATION_TRANSFORMED")

        # Which categories are most preserved across translations?
        cat_stabilities = defaultdict(list)
        for r in results:
            for cat in CATEGORIES:
                cat_stabilities[cat].append(r["divergences"][cat]["relative_divergence"])
        cat_avg_div = {cat: mean(vals) for cat, vals in cat_stabilities.items()}
        most_universal_cat = min(cat_avg_div, key=cat_avg_div.get)
        most_lang_specific = max(cat_avg_div, key=cat_avg_div.get)
    else:
        faithful = adapted = transformed = 0
        cat_avg_div = {}
        most_universal_cat = "N/A"
        most_lang_specific = "N/A"

    output = {
        "metadata": {
            "n_pairs": len(results),
            "faithful": faithful,
            "adapted": adapted,
            "transformed": transformed,
            "most_universal_category": most_universal_cat,
            "most_language_specific": most_lang_specific,
            "category_avg_divergence": {c: round(v, 4) for c, v in cat_avg_div.items()},
            "timestamp": datetime.now().isoformat(),
        },
        "pairs": results,
    }

    json_path = os.path.join(OUTPUT_DIR, "cross_language_analysis.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Markdown
    lines = ["# OMEGA — Cross-Language Style Comparison", ""]
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Pairs found**: {len(results)}")
    lines.append(f"**Faithful**: {faithful} | **Adapted**: {adapted} | **Transformed**: {transformed}")
    lines.append("")

    if cat_avg_div:
        lines.append("## Category Translation Stability")
        lines.append("| Category | Avg Relative Divergence | Verdict |")
        lines.append("|----------|------------------------|---------|")
        for cat in sorted(cat_avg_div, key=cat_avg_div.get):
            v = cat_avg_div[cat]
            verdict = "UNIVERSAL" if v < 0.2 else "MODERATE" if v < 0.5 else "LANG-SPECIFIC"
            lines.append(f"| {cat} | {v:.3f} | {verdict} |")
        lines.append("")

    lines.append("## Pair Details")
    lines.append("| Work | Languages | Mean Div | Stable Cat | Divergent Cat | Verdict |")
    lines.append("|------|-----------|----------|------------|---------------|---------|")
    for r in results:
        lines.append(f"| {r['canonical'][:25]} | {'/'.join(r['languages'])} | "
                     f"{r['mean_relative_divergence']:.3f} | {r['most_stable_category']} | "
                     f"{r['most_divergent_category']} | {r['verdict']} |")
    lines.append("")

    for r in results:
        lines.append(f"### {r['canonical']}")
        lang_details = ', '.join(f"{l} ({r['work_ids'][l]})" for l in r['languages'])
        lines.append(f"Languages: {lang_details}")
        lines.append("| Category | " + " | ".join(r["languages"]) + " | Spread | Rel.Div |")
        lines.append("|----------|" + "|".join(["-------"] * len(r["languages"])) + "|--------|---------|")
        for cat in CATEGORIES:
            d = r["divergences"][cat]
            vals = " | ".join(f"{d['values'][l]:+.4f}" for l in r["languages"])
            lines.append(f"| {cat} | {vals} | {d['spread']:.4f} | {d['relative_divergence']:.3f} |")
        lines.append("")

    lines.append("---\n*Generated by cross_language_analysis.py*")
    md_path = os.path.join(OUTPUT_DIR, "cross_language_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[CROSS-LANG] {len(results)} pairs analyzed")
    for r in results:
        print(f"  {r['canonical']}: {'/'.join(r['languages'])} — div={r['mean_relative_divergence']:.3f} — {r['verdict']}")


if __name__ == "__main__":
    main()
