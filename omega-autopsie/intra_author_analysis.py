#!/usr/bin/env python3
"""
OMEGA — Intra-Author Style Constancy Analysis
Phase W — Day 4 — Mission 6

For each author with 3+ works, computes style signature stability.

Standard: NASA-Grade L4 / DO-178C Level A
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


def mean(vals):
    return sum(vals) / len(vals) if vals else 0

def variance(vals):
    if len(vals) < 2:
        return 0
    m = mean(vals)
    return sum((v - m) ** 2 for v in vals) / (len(vals) - 1)

def std(vals):
    return math.sqrt(variance(vals))


def compute_category_value(features, cat_features):
    vals = [features.get(k, 0) for k in cat_features]
    return mean(vals)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load all chapters, group by author then work_id
    author_works = defaultdict(lambda: defaultdict(list))
    all_cat_values = defaultdict(list)

    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        author = data.get("author", "").strip()
        if not author or len(author) < 2:
            continue

        work_id = data.get("work_id", "")
        features = data.get("baseline_features", {})

        # Compute category values
        cat_vals = {}
        for cat, feats in CATEGORIES.items():
            cat_vals[cat] = compute_category_value(features, feats)
            all_cat_values[cat].append(cat_vals[cat])

        author_works[author][work_id].append(cat_vals)

    # Filter: authors with 3+ distinct works
    multi_authors = {a: works for a, works in author_works.items()
                     if len(works) >= 3}

    print(f"[AUTHOR] Total authors: {len(author_works)}")
    print(f"[AUTHOR] Authors with 3+ works: {len(multi_authors)}")

    # Compute inter-author variance (global)
    global_variance = {}
    for cat in CATEGORIES:
        global_variance[cat] = variance(all_cat_values[cat])

    # Analyze each multi-work author
    results = []
    for author in sorted(multi_authors.keys()):
        works = multi_authors[author]
        n_works = len(works)

        # Compute mean category per work
        work_means = defaultdict(list)
        for work_id, chapters in works.items():
            for cat in CATEGORIES:
                vals = [ch[cat] for ch in chapters]
                work_means[cat].append(mean(vals))

        # Intra-author variance and signature stability
        author_profile = {}
        for cat in CATEGORIES:
            wm = work_means[cat]
            intra_var = variance(wm)
            inter_var = global_variance[cat]
            stability = 1 - (intra_var / inter_var) if inter_var > 1e-10 else 0
            stability = max(0, min(1, stability))

            author_profile[cat] = {
                "mean": round(mean(wm), 5),
                "std": round(std(wm), 5),
                "variance_intra": round(intra_var, 8),
                "variance_global": round(inter_var, 8),
                "stability": round(stability, 4),
            }

        # Overall signature stability
        stabilities = [author_profile[c]["stability"] for c in CATEGORIES]
        overall_stability = mean(stabilities)

        # Find most stable and most variable category
        most_stable = max(CATEGORIES, key=lambda c: author_profile[c]["stability"])
        most_variable = min(CATEGORIES, key=lambda c: author_profile[c]["stability"])

        entry = {
            "author": author,
            "n_works": n_works,
            "n_chapters": sum(len(chs) for chs in works.values()),
            "works": sorted(works.keys()),
            "profile": author_profile,
            "overall_stability": round(overall_stability, 4),
            "most_stable_category": most_stable,
            "most_variable_category": most_variable,
            "signature_verdict": "STABLE" if overall_stability > 0.7 else
                                 "MODERATE" if overall_stability > 0.4 else "CHAMELEON",
        }
        results.append(entry)

    # Sort by stability
    results.sort(key=lambda x: -x["overall_stability"])

    # Save JSON
    output = {
        "metadata": {
            "n_authors": len(results),
            "n_total_authors": len(author_works),
            "global_variance": {c: round(v, 8) for c, v in global_variance.items()},
            "timestamp": datetime.now().isoformat(),
        },
        "authors": results,
    }
    json_path = os.path.join(OUTPUT_DIR, "intra_author_analysis.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"[AUTHOR] Saved {json_path}")

    # Markdown report
    lines = ["# OMEGA — Intra-Author Style Constancy", ""]
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Authors analyzed**: {len(results)} (with 3+ works)")
    lines.append("")

    # Summary table
    lines.append("## Author Signatures (sorted by stability)")
    lines.append("")
    lines.append("| Author | Works | Stability | Verdict | DNA (most stable) | Flex (most variable) |")
    lines.append("|--------|-------|-----------|---------|-------------------|---------------------|")
    for r in results:
        lines.append(f"| {r['author'][:25]:25s} | {r['n_works']:5d} | {r['overall_stability']:.3f} | "
                     f"{r['signature_verdict']:9s} | {r['most_stable_category']:11s} | {r['most_variable_category']:11s} |")
    lines.append("")

    # Detailed profiles for top authors
    lines.append("## Detailed Profiles (Top 20)")
    lines.append("")
    for r in results[:20]:
        lines.append(f"### {r['author']} ({r['n_works']} works, {r['n_chapters']} chapters)")
        lines.append(f"**Stability**: {r['overall_stability']:.3f} — **{r['signature_verdict']}**")
        lines.append(f"**Works**: {', '.join(r['works'][:8])}")
        lines.append("")
        lines.append("| Category | Mean | Std | Stability |")
        lines.append("|----------|------|-----|-----------|")
        for cat in CATEGORIES:
            p = r["profile"][cat]
            marker = " ← DNA" if cat == r["most_stable_category"] else \
                     " ← FLEX" if cat == r["most_variable_category"] else ""
            lines.append(f"| {cat:11s} | {p['mean']:+.4f} | {p['std']:.4f} | {p['stability']:.3f}{marker} |")
        lines.append("")

    lines.append("---")
    lines.append("*Generated by intra_author_analysis.py — Phase W Day 4*")

    md_path = os.path.join(OUTPUT_DIR, "intra_author_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[AUTHOR] Saved {md_path}")

    # Console summary
    n_stable = sum(1 for r in results if r["signature_verdict"] == "STABLE")
    n_moderate = sum(1 for r in results if r["signature_verdict"] == "MODERATE")
    n_chameleon = sum(1 for r in results if r["signature_verdict"] == "CHAMELEON")
    print(f"\n  STABLE (>0.7): {n_stable}")
    print(f"  MODERATE (0.4-0.7): {n_moderate}")
    print(f"  CHAMELEON (<0.4): {n_chameleon}")


if __name__ == "__main__":
    main()
