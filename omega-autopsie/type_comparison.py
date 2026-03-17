#!/usr/bin/env python3
"""
OMEGA — Type Comparison: Classique vs Contemporain vs Populaire
Phase W — Day 4 — Mission 9
"""

import sys, os, json, math
from collections import defaultdict
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHAPTERS_DIR = os.path.join(os.path.dirname(__file__), "results_v4", "chapters")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "corpus_manifest_v2.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "bench_results_v4")

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

FEATURES = [
    "f1_mean", "f1a_rhythm_variance", "f19e_window_median",
    "f21e_ritual_index", "f22f_literary_index", "f23d_literary_causal_score",
    "f24e_contrast_score", "f25g_description_score", "f26c_period_score",
    "f27d_modal_score", "f28d_sil_score", "f29b_ttr_window", "f30d_ps_imp_ratio",
]


def mean(v): return sum(v)/len(v) if v else 0
def var(v):
    if len(v) < 2: return 0
    m = mean(v)
    return sum((x-m)**2 for x in v)/(len(v)-1)
def std(v): return math.sqrt(var(v)) if var(v) > 0 else 0


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load manifest for type info
    manifest_types = {}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            manifest = json.load(f)
        for entry in manifest:
            wid = entry.get("work_id", "")
            t = entry.get("type", "UNKNOWN")
            manifest_types[wid] = t

    # Load chapters
    type_chapters = defaultdict(list)  # type -> list of {cat: val, features: {}}
    type_features = defaultdict(lambda: defaultdict(list))  # type -> feature -> [vals]

    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        wid = data.get("work_id", "")
        work_type = data.get("type", manifest_types.get(wid, "UNKNOWN"))

        # Normalize type
        if work_type in ("CLASSIQUE", "CONTEMPORAIN", "POPULAIRE"):
            pass
        elif work_type in ("ESSAI", "POESIE"):
            continue  # Skip non-fiction
        else:
            # Try to infer from period
            period = data.get("period", "UNKNOWN")
            year = data.get("year", 0)
            if year and year < 1980:
                work_type = "CLASSIQUE"
            elif year and year >= 1980:
                work_type = "CONTEMPORAIN"
            else:
                continue

        features = data.get("baseline_features", {})
        cat_vals = {}
        for cat, feats in CATEGORIES.items():
            cat_vals[cat] = mean([features.get(k, 0) for k in feats])

        type_chapters[work_type].append(cat_vals)
        for feat in FEATURES:
            type_features[work_type][feat].append(features.get(feat, 0))

    print(f"[TYPE] Chapters by type:")
    for t in sorted(type_chapters.keys()):
        print(f"  {t}: {len(type_chapters[t])} chapters")

    # Compute profiles per type
    types = sorted(type_chapters.keys())
    profiles = {}
    for t in types:
        chapters = type_chapters[t]
        profiles[t] = {}
        for cat in CATEGORIES:
            vals = [ch[cat] for ch in chapters]
            profiles[t][cat] = {
                "mean": round(mean(vals), 5),
                "std": round(std(vals), 5),
                "n": len(vals),
            }

    # Feature-level profiles
    feat_profiles = {}
    for t in types:
        feat_profiles[t] = {}
        for feat in FEATURES:
            vals = type_features[t][feat]
            feat_profiles[t][feat] = {
                "mean": round(mean(vals), 5),
                "std": round(std(vals), 5),
            }

    # Discriminating features: largest gap between types
    discriminators = []
    for cat in CATEGORIES:
        means = {t: profiles[t][cat]["mean"] for t in types}
        if len(means) >= 2:
            spread = max(means.values()) - min(means.values())
            avg_std = mean([profiles[t][cat]["std"] for t in types])
            effect_size = spread / avg_std if avg_std > 1e-6 else 0
            discriminators.append({
                "category": cat,
                "spread": round(spread, 5),
                "effect_size": round(effect_size, 3),
                "means": {t: round(v, 5) for t, v in means.items()},
                "ranking": sorted(means, key=means.get, reverse=True),
            })

    discriminators.sort(key=lambda x: -x["effect_size"])

    # Feature-level discriminators
    feat_discriminators = []
    for feat in FEATURES:
        means = {}
        stds = {}
        for t in types:
            vals = type_features[t][feat]
            means[t] = mean(vals)
            stds[t] = std(vals)
        if len(means) >= 2:
            spread = max(means.values()) - min(means.values())
            avg_std = mean(list(stds.values()))
            effect_size = spread / avg_std if avg_std > 1e-6 else 0
            feat_discriminators.append({
                "feature": feat,
                "spread": round(spread, 5),
                "effect_size": round(effect_size, 3),
                "means": {t: round(v, 5) for t, v in means.items()},
            })
    feat_discriminators.sort(key=lambda x: -x["effect_size"])

    # Build output
    output = {
        "metadata": {
            "types": types,
            "chapters_per_type": {t: len(type_chapters[t]) for t in types},
            "timestamp": datetime.now().isoformat(),
        },
        "category_profiles": profiles,
        "feature_profiles": feat_profiles,
        "category_discriminators": discriminators,
        "feature_discriminators": feat_discriminators[:10],
    }

    json_path = os.path.join(OUTPUT_DIR, "type_comparison.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Markdown
    lines = ["# OMEGA — Type Comparison: Classique vs Contemporain vs Populaire", ""]
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Types**: {', '.join(types)}")
    lines.append(f"**Chapters**: {', '.join(f'{t}={len(type_chapters[t])}' for t in types)}")
    lines.append("")

    lines.append("## Category Profiles")
    header = "| Category | " + " | ".join(f"{t} (μ±σ)" for t in types) + " |"
    sep = "|----------|" + "|".join(["-------------"] * len(types)) + "|"
    lines.append(header)
    lines.append(sep)
    for cat in CATEGORIES:
        row = f"| {cat} |"
        for t in types:
            p = profiles[t][cat]
            row += f" {p['mean']:+.4f}±{p['std']:.3f} |"
        lines.append(row)
    lines.append("")

    lines.append("## Most Discriminating Categories (by effect size)")
    lines.append("| Category | Effect Size | Spread | Ranking |")
    lines.append("|----------|-------------|--------|---------|")
    for d in discriminators:
        lines.append(f"| {d['category']} | {d['effect_size']:.3f} | {d['spread']:.4f} | "
                     f"{' > '.join(d['ranking'])} |")
    lines.append("")

    lines.append("## Top 10 Discriminating Features")
    lines.append("| Feature | Effect Size | " + " | ".join(types) + " |")
    lines.append("|---------|-------------|" + "|".join(["-------"] * len(types)) + "|")
    for d in feat_discriminators[:10]:
        row = f"| {d['feature']} | {d['effect_size']:.3f} |"
        for t in types:
            row += f" {d['means'].get(t, 0):+.4f} |"
        lines.append(row)
    lines.append("")

    # Conclusions
    lines.append("## Key Findings")
    if discriminators:
        top = discriminators[0]
        lines.append(f"- **Most discriminating category**: {top['category']} (effect={top['effect_size']:.2f})")
        lines.append(f"  Ranking: {' > '.join(top['ranking'])}")
    if len(discriminators) > 1:
        bot = discriminators[-1]
        lines.append(f"- **Least discriminating category**: {bot['category']} (effect={bot['effect_size']:.2f})")
        lines.append(f"  → This category is UNIVERSAL across types")
    lines.append("")
    lines.append("---\n*Generated by type_comparison.py*")

    md_path = os.path.join(OUTPUT_DIR, "type_comparison_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\n[TYPE] Results saved to {json_path}")
    print(f"[TYPE] Report saved to {md_path}")
    for d in discriminators:
        print(f"  {d['category']}: effect={d['effect_size']:.3f}, ranking={' > '.join(d['ranking'])}")


if __name__ == "__main__":
    main()
