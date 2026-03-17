#!/usr/bin/env python3
"""
OMEGA — Archetype Derivatives Analysis
Tests whether perturbation effects vary by author archetype.

Groups authors into archetypes (CATHEDRAL, BRUTAL, BALANCED, INTERIOR, SENSORY),
computes partial derivatives per (perturbation, category) for each archetype,
then identifies archetype-dependent vs archetype-invariant responses.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import math
from collections import defaultdict
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BENCH_REPORT = os.path.join(BASE_DIR, "bench_results_v4", "bench_report.json")
CHAPTERS_DIR = os.path.join(BASE_DIR, "results_v4", "chapters")
OUTPUT_DIR = os.path.join(BASE_DIR, "bench_results_v4")

# ── Category mapping ─────────────────────────────────────────────────────────

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

# ── Archetype definitions ────────────────────────────────────────────────────

ARCHETYPES = {
    "CATHEDRAL": ["proust", "simon", "butor"],
    "BRUTAL": ["mccarthy", "hemingway", "morrison"],
    "BALANCED": ["flaubert", "zola", "camus", "balzac", "maupassant", "dickens"],
    "INTERIOR": ["woolf", "houellebecq", "sarraute", "modiano", "duras"],
    "SENSORY": ["gracq", "conrad", "nabokov", "leclezio", "quignard"],
}


# ── OLS regression (no scipy) ────────────────────────────────────────────────

def ols_slope(xs, ys):
    """OLS through origin: slope = sum(x*y) / sum(x^2)."""
    n = len(xs)
    if n < 2:
        return 0.0
    sxy = sum(x * y for x, y in zip(xs, ys))
    sxx = sum(x * x for x in xs)
    if abs(sxx) < 1e-15:
        return 0.0
    return sxy / sxx


def linreg_full(xs, ys):
    """Full OLS with intercept for R2 and diagnostics."""
    n = len(xs)
    if n < 3:
        return {"slope": 0.0, "r2": 0.0, "n": n}

    sx = sum(xs)
    sy = sum(ys)
    sxx = sum(x * x for x in xs)
    sxy = sum(x * y for x, y in zip(xs, ys))

    denom = n * sxx - sx * sx
    if abs(denom) < 1e-15:
        return {"slope": 0.0, "r2": 0.0, "n": n}

    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n

    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(xs, ys))
    y_mean = sy / n
    ss_tot = sum((y - y_mean) ** 2 for y in ys)
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-15 else 0.0

    return {
        "slope": round(slope, 6),
        "r2": round(max(0.0, min(1.0, r2)), 6),
        "n": n,
    }


# ── Build work_id -> author mapping from chapter metadata ────────────────────

def build_work_author_map():
    """Scan chapters directory to map work_id -> author name."""
    work_author = {}
    if not os.path.isdir(CHAPTERS_DIR):
        print(f"[ARCHETYPE] ERROR: chapters dir not found: {CHAPTERS_DIR}")
        return work_author

    for fname in os.listdir(CHAPTERS_DIR):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        wid = data.get("work_id", "")
        author = data.get("author", "")
        if wid and author and wid not in work_author:
            work_author[wid] = author

    return work_author


# ── Classify author -> archetype ─────────────────────────────────────────────

def classify_author(author_name):
    """Match author name to archetype using case-insensitive substring matching."""
    lower = author_name.lower()
    for archetype, keywords in ARCHETYPES.items():
        for kw in keywords:
            if kw in lower:
                return archetype
    return None


# ── Compute category delta ───────────────────────────────────────────────────

def compute_category_delta(deltas, cat_features):
    """Average abs_delta across features in a category."""
    vals = []
    for feat in cat_features:
        delta_info = deltas.get(feat, {})
        abs_delta = delta_info.get("abs_delta", 0)
        vals.append(abs_delta)
    return sum(vals) / max(len(vals), 1)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Step 1: Load bench report
    print("[ARCHETYPE] Loading bench report...")
    with open(BENCH_REPORT, encoding="utf-8") as f:
        report = json.load(f)
    results = report["results"]
    print(f"[ARCHETYPE] {len(results)} bench results loaded")

    # Step 2: Build work_id -> author mapping
    print("[ARCHETYPE] Building work->author mapping from chapters metadata...")
    work_author = build_work_author_map()
    print(f"[ARCHETYPE] {len(work_author)} work->author mappings")

    # Step 3: Classify each result by archetype
    archetype_results = defaultdict(list)
    archetype_authors = defaultdict(set)
    skipped = 0

    for r in results:
        wid = r.get("work_id", "")
        author = work_author.get(wid, "")
        if not author:
            skipped += 1
            continue
        arch = classify_author(author)
        if arch is None:
            skipped += 1
            continue
        archetype_results[arch].append(r)
        archetype_authors[arch].add(author)

    print(f"[ARCHETYPE] Classified: {sum(len(v) for v in archetype_results.values())} results, skipped {skipped}")
    for arch in sorted(archetype_results):
        authors_list = sorted(archetype_authors[arch])
        print(f"  {arch}: {len(archetype_results[arch])} results, authors: {authors_list}")

    # Step 4: Compute partial derivatives per archetype
    ptypes = sorted(set(r["perturbation_type"] for r in results))
    cats = list(CATEGORIES.keys())

    archetype_data = {}

    for arch in sorted(archetype_results):
        arch_res = archetype_results[arch]
        derivatives = {}

        for ptype in ptypes:
            derivatives[ptype] = {}
            ptype_results = [r for r in arch_res if r["perturbation_type"] == ptype]

            for cat, cat_features in CATEGORIES.items():
                xs = []
                ys = []
                for r in ptype_results:
                    amp = r["amplitude"]
                    cat_delta = compute_category_delta(r["deltas"], cat_features)
                    xs.append(amp)
                    ys.append(cat_delta)

                slope = ols_slope(xs, ys)
                reg = linreg_full(xs, ys)
                derivatives[ptype][cat] = {
                    "slope": round(slope, 6),
                    "slope_with_intercept": reg["slope"],
                    "r2": reg["r2"],
                    "n": reg["n"],
                }

        archetype_data[arch] = {
            "n_results": len(arch_res),
            "authors_found": sorted(archetype_authors[arch]),
            "derivatives": derivatives,
        }

    # Step 5: Cross-archetype comparison
    comparison = {}
    n_dependent = 0
    n_invariant = 0

    for ptype in ptypes:
        short_ptype = ptype.split("_", 1)[1] if "_" in ptype else ptype
        for cat in cats:
            key = f"{ptype}→{cat}"

            by_archetype = {}
            for arch in sorted(archetype_data):
                s = archetype_data[arch]["derivatives"][ptype][cat]["slope"]
                by_archetype[arch] = round(s, 6)

            slopes = list(by_archetype.values())
            abs_slopes = [abs(s) for s in slopes]
            max_abs = max(abs_slopes) if abs_slopes else 0
            min_abs = min(abs_slopes) if abs_slopes else 0

            if min_abs > 1e-10:
                max_ratio = round(max_abs / min_abs, 4)
            elif max_abs > 1e-10:
                max_ratio = float("inf")
            else:
                max_ratio = 1.0

            archetype_dependent = max_ratio > 2.0

            if archetype_dependent:
                n_dependent += 1
            else:
                n_invariant += 1

            # Find most/least sensitive
            most_sensitive = max(by_archetype, key=lambda a: abs(by_archetype[a]))
            least_sensitive = min(by_archetype, key=lambda a: abs(by_archetype[a]))

            comparison[key] = {
                "by_archetype": by_archetype,
                "max_ratio": max_ratio if max_ratio != float("inf") else 999.0,
                "archetype_dependent": archetype_dependent,
                "most_sensitive": most_sensitive,
                "least_sensitive": least_sensitive,
            }

    print(f"\n[ARCHETYPE] Comparison: {n_dependent} ARCHETYPE_DEPENDENT, {n_invariant} ARCHETYPE_INVARIANT")

    # ── Save JSON ────────────────────────────────────────────────────────────

    output_json = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "n_bench_results": len(results),
            "n_classified": sum(len(v) for v in archetype_results.values()),
            "n_skipped": skipped,
            "perturbation_types": ptypes,
            "categories": cats,
            "archetype_definitions": {k: v for k, v in ARCHETYPES.items()},
        },
        "archetypes": archetype_data,
        "comparison": comparison,
        "summary": {
            "n_dependent": n_dependent,
            "n_invariant": n_invariant,
            "pct_dependent": round(100 * n_dependent / max(n_dependent + n_invariant, 1), 1),
        },
    }

    json_path = os.path.join(OUTPUT_DIR, "archetype_derivatives.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_json, f, ensure_ascii=False, indent=2)
    print(f"[ARCHETYPE] Saved {json_path}")

    # ── Save Markdown report ─────────────────────────────────────────────────

    lines = []
    lines.append("# OMEGA — Archetype Derivatives Analysis")
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Results**: {len(results)} total, {sum(len(v) for v in archetype_results.values())} classified, {skipped} skipped")
    lines.append("")

    # Archetype profiles
    lines.append("## Archetype Profiles")
    lines.append("")
    for arch in sorted(archetype_data):
        ad = archetype_data[arch]
        lines.append(f"### {arch}")
        lines.append(f"- **N results**: {ad['n_results']}")
        lines.append(f"- **Authors**: {', '.join(ad['authors_found'])}")
        lines.append("")

    # Comparison table per perturbation
    lines.append("## Cross-Archetype Comparison")
    lines.append("")

    arch_names = sorted(archetype_data.keys())

    for ptype in ptypes:
        short = ptype.split("_", 1)[1] if "_" in ptype else ptype
        lines.append(f"### {short}")
        lines.append("")

        header = "| Category | " + " | ".join(arch_names) + " | Ratio | Verdict |"
        sep = "|" + "|".join(["---"] * (len(arch_names) + 3)) + "|"
        lines.append(header)
        lines.append(sep)

        for cat in cats:
            key = f"{ptype}→{cat}"
            comp = comparison[key]
            cells = []
            for arch in arch_names:
                s = comp["by_archetype"].get(arch, 0)
                cells.append(f"{s:+.4f}")

            ratio_str = f"{comp['max_ratio']:.1f}" if comp["max_ratio"] < 100 else ">100"
            verdict = "DEPENDENT" if comp["archetype_dependent"] else "INVARIANT"
            lines.append(f"| {cat:12s} | " + " | ".join(cells) + f" | {ratio_str} | {verdict} |")

        lines.append("")

    # Summary
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- **ARCHETYPE_DEPENDENT** (max/min ratio > 2.0): {n_dependent}/{n_dependent + n_invariant} ({100 * n_dependent / max(n_dependent + n_invariant, 1):.0f}%)")
    lines.append(f"- **ARCHETYPE_INVARIANT** (max/min ratio <= 2.0): {n_invariant}/{n_dependent + n_invariant} ({100 * n_invariant / max(n_dependent + n_invariant, 1):.0f}%)")
    lines.append("")

    # Most sensitive archetypes ranking
    lines.append("## Most Sensitive Archetypes (frequency as most_sensitive)")
    lines.append("")
    sensitivity_count = defaultdict(int)
    for comp in comparison.values():
        sensitivity_count[comp["most_sensitive"]] += 1
    for arch, count in sorted(sensitivity_count.items(), key=lambda x: -x[1]):
        lines.append(f"- **{arch}**: {count} times most sensitive")
    lines.append("")

    lines.append("---")
    lines.append(f"*Generated by test_archetype_derivatives.py*")

    md_path = os.path.join(OUTPUT_DIR, "archetype_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[ARCHETYPE] Saved {md_path}")

    # Console summary
    print(f"\n{'=' * 80}")
    print("ARCHETYPE DERIVATIVES SUMMARY")
    print(f"{'=' * 80}")
    for arch in sorted(archetype_data):
        ad = archetype_data[arch]
        print(f"  {arch:12s}: {ad['n_results']:5d} results, {len(ad['authors_found'])} authors")
    print(f"\n  ARCHETYPE_DEPENDENT:  {n_dependent}")
    print(f"  ARCHETYPE_INVARIANT:  {n_invariant}")
    print(f"  % dependent:          {100 * n_dependent / max(n_dependent + n_invariant, 1):.1f}%")
    print()


if __name__ == "__main__":
    main()
