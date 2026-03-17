#!/usr/bin/env python3
"""
OMEGA — Saga/Cycle Coherence Analysis
Phase W — Day 4 — Mission 7
"""

import sys, os, json, math
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

# Known saga/cycle definitions
SAGAS = {
    "Zola — Rougon-Macquart": {
        "author_pattern": "zola",
        "works": ["assommoir", "germinal", "nana", "bete", "bonheur", "argent",
                  "oeuvre", "terre", "page_damour", "joy_of_life", "love_story",
                  "kill", "beast_within", "soirees", "mysteres", "trois_villes",
                  "taberna", "sueno", "vientre", "denaro", "verdad", "truth",
                  "attack", "dead_men", "comment_on_meurt"],
    },
    "Hugo — Romans sociaux": {
        "author_pattern": "hugo",
        "works": ["miserables", "notre_dame", "travailleurs", "hunchback",
                  "toilers", "nuestra", "hombre_que_rie", "roi_samuse",
                  "napoleon", "ruy_blas", "legende", "dios", "contemplations",
                  "ultimo_dia", "feuilles"],
    },
    "Camus — Cycle": {
        "author_pattern": "camus",
        "works": ["etranger", "stranger", "extranjero", "peste", "chute",
                  "exil", "mort_heureuse", "malentendu", "mythe", "mito",
                  "premier_hombre", "correspondance", "notebooks", "cher_monsieur",
                  "reflections"],
    },
    "Carrère — Romans du réel": {
        "author_pattern": "carrere",
        "works": ["adversaire", "limonov", "kingdom", "moustache", "kolkhoze"],
    },
    "Modiano — Cycle mémoriel": {
        "author_pattern": "modiano",
        "works": ["dora_bruder", "boutiques", "quartier", "encre", "danseuse", "ronde"],
    },
    "Ernaux — Cycle autobiographique": {
        "author_pattern": "ernaux",
        "works": ["place", "femme", "annees", "evenement", "memoire", "gelee",
                  "disent", "do_what"],
    },
    "Dickens — Romans victoriens": {
        "author_pattern": "dickens",
        "works": ["oliver", "copperfield", "two_cities", "bleak", "expectations"],
    },
    "McCarthy — Trilogie": {
        "author_pattern": "mccarthy",
        "works": ["blood_meridian", "no_country", "road", "suttree"],
    },
    "Hemingway — Prose": {
        "author_pattern": "hemingway",
        "works": ["sun_also", "soleil", "vieil_homme", "garden", "men_without"],
    },
    "Steinbeck — Romans": {
        "author_pattern": "steinbeck",
        "works": ["souris", "burning_bright", "sweet_thursday", "god_unknown"],
    },
    "Woolf — Romans": {
        "author_pattern": "woolf",
        "works": ["dalloway", "lighthouse", "orlando", "waves", "haunted"],
    },
    "Yourcenar — Œuvres": {
        "author_pattern": "yourcenar",
        "works": ["hadrian", "oeuvre_au_noir", "alexis", "anna_soror", "eternite", "quoi"],
    },
    "Houellebecq — Romans": {
        "author_pattern": "houellebecq",
        "works": ["carte", "possibilite", "particules"],
    },
}


def mean(v): return sum(v)/len(v) if v else 0
def var(v):
    if len(v) < 2: return 0
    m = mean(v)
    return sum((x-m)**2 for x in v)/(len(v)-1)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load all chapters
    all_chapters = {}
    all_cat_vals = defaultdict(list)
    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        wid = data.get("work_id", "")
        features = data.get("baseline_features", {})
        cat_vals = {}
        for cat, feats in CATEGORIES.items():
            cat_vals[cat] = mean([features.get(k, 0) for k in feats])
            all_cat_vals[cat].append(cat_vals[cat])
        if wid not in all_chapters:
            all_chapters[wid] = []
        all_chapters[wid].append(cat_vals)

    # Global variance
    global_var = {c: var(v) for c, v in all_cat_vals.items()}

    # Process each saga
    results = []
    for saga_name, saga_def in SAGAS.items():
        pattern = saga_def["author_pattern"].lower()
        keywords = saga_def["works"]

        # Find matching works
        matched_works = {}
        for wid, chapters in all_chapters.items():
            wid_lower = wid.lower()
            if pattern in wid_lower:
                for kw in keywords:
                    if kw in wid_lower:
                        matched_works[wid] = chapters
                        break

        if len(matched_works) < 2:
            continue

        # Compute per-work means
        work_profiles = {}
        for wid, chapters in matched_works.items():
            work_profiles[wid] = {}
            for cat in CATEGORIES:
                work_profiles[wid][cat] = mean([ch[cat] for ch in chapters])

        # Saga coherence per category
        saga_profile = {}
        for cat in CATEGORIES:
            vals = [work_profiles[wid][cat] for wid in work_profiles]
            intra_var = var(vals)
            g_var = global_var[cat]
            coherence = 1 - (intra_var / g_var) if g_var > 1e-10 else 0
            coherence = max(0, min(1, coherence))
            saga_profile[cat] = {
                "mean": round(mean(vals), 5),
                "std": round(math.sqrt(var(vals)) if var(vals) > 0 else 0, 5),
                "coherence": round(coherence, 4),
            }

        coherences = [saga_profile[c]["coherence"] for c in CATEGORIES]
        overall = mean(coherences)

        results.append({
            "saga": saga_name,
            "n_works": len(matched_works),
            "works": sorted(matched_works.keys()),
            "profile": saga_profile,
            "overall_coherence": round(overall, 4),
            "most_coherent": max(CATEGORIES, key=lambda c: saga_profile[c]["coherence"]),
            "least_coherent": min(CATEGORIES, key=lambda c: saga_profile[c]["coherence"]),
        })

    results.sort(key=lambda x: -x["overall_coherence"])

    # Save
    output = {"metadata": {"n_sagas": len(results), "timestamp": datetime.now().isoformat()},
              "sagas": results}
    json_path = os.path.join(OUTPUT_DIR, "saga_analysis.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Markdown
    lines = ["# OMEGA — Saga/Cycle Coherence Analysis", ""]
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Sagas analyzed**: {len(results)}")
    lines.append("")
    lines.append("| Saga | Works | Coherence | Most coherent | Least coherent |")
    lines.append("|------|-------|-----------|---------------|----------------|")
    for r in results:
        lines.append(f"| {r['saga']:30s} | {r['n_works']:5d} | {r['overall_coherence']:.3f} | "
                     f"{r['most_coherent']:11s} | {r['least_coherent']:11s} |")
    lines.append("")
    for r in results:
        lines.append(f"### {r['saga']}")
        lines.append(f"Works: {', '.join(w[:30] for w in r['works'][:8])}")
        lines.append("| Cat | Mean | Std | Coherence |")
        lines.append("|-----|------|-----|-----------|")
        for cat in CATEGORIES:
            p = r["profile"][cat]
            lines.append(f"| {cat} | {p['mean']:+.4f} | {p['std']:.4f} | {p['coherence']:.3f} |")
        lines.append("")

    lines.append("---\n*Generated by saga_analysis.py*")
    md_path = os.path.join(OUTPUT_DIR, "saga_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[SAGA] {len(results)} sagas analyzed")
    for r in results:
        print(f"  {r['saga']}: {r['n_works']} works, coherence={r['overall_coherence']:.3f}")


if __name__ == "__main__":
    main()
