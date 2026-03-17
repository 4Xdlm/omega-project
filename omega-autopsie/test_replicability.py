#!/usr/bin/env python
"""
test_replicability.py — Tests whether partial derivatives replicate across 9 sub-corpora.

Loads bench_report.json (30420 perturbation results), enriches with metadata from
chapters/*.json and corpus_manifest_v2.json, then checks slope stability per
(perturbation_type, category) across 9 sub-corpora.

A law is UNIVERSAL if quantitatively stable in >= 7/9 sub-corpora.

Output:
  bench_results_v4/replicability_report.json
  bench_results_v4/replicability_report.md
"""

import json
import os
import sys
import glob
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BENCH_PATH = os.path.join(BASE_DIR, "bench_results_v4", "bench_report.json")
MANIFEST_PATH = os.path.join(BASE_DIR, "corpus_manifest_v2.json")
CHAPTERS_DIR = os.path.join(BASE_DIR, "results_v4", "chapters")
OUT_JSON = os.path.join(BASE_DIR, "bench_results_v4", "replicability_report.json")
OUT_MD = os.path.join(BASE_DIR, "bench_results_v4", "replicability_report.md")

# ---------------------------------------------------------------------------
# Category definitions
# ---------------------------------------------------------------------------
CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

QUANT_THRESHOLD = 0.30  # |slope_sub - slope_global| / |slope_global| < 0.30
UNIVERSALITY_MIN = 7    # stable in >= 7/9 sub-corpora


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ols_slope(xs, ys):
    """OLS slope through origin: slope = sum(x*y) / sum(x^2)."""
    sxy = sum(x * y for x, y in zip(xs, ys))
    sxx = sum(x * x for x in xs)
    if sxx == 0:
        return 0.0
    return sxy / sxx


def category_delta(deltas, features):
    """Mean of abs_delta for features in a category."""
    vals = []
    for f in features:
        if f in deltas and deltas[f] is not None:
            ad = deltas[f].get("abs_delta")
            if ad is not None:
                vals.append(ad)
    if not vals:
        return None
    return sum(vals) / len(vals)


def load_chapter_metadata():
    """Load work_id -> metadata from ch00 chapter files."""
    meta = {}
    pattern = os.path.join(CHAPTERS_DIR, "*ch00.json")
    for fpath in glob.glob(pattern):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                ch = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            try:
                with open(fpath, "r", encoding="latin-1") as f:
                    ch = json.load(f)
            except Exception:
                continue
        wid = ch.get("work_id", "")
        if not wid:
            continue
        meta[wid] = {
            "language": ch.get("language", "UNKNOWN"),
            "period": ch.get("period", "UNKNOWN"),
            "type": ch.get("type", ""),
            "author": ch.get("author", ""),
            "year": ch.get("year", 0),
        }
    return meta


def load_manifest_metadata():
    """Load work_id -> metadata from corpus_manifest_v2.json."""
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    meta = {}
    for entry in manifest:
        wid = entry.get("work_id", "")
        if not wid:
            continue
        meta[wid] = {
            "language": entry.get("language", "UNKNOWN"),
            "period": entry.get("period", "UNKNOWN"),
            "type": entry.get("type", ""),
            "author": entry.get("author", ""),
            "year": entry.get("year", 0),
        }
    return meta


def build_metadata_index():
    """Merge chapter metadata (priority) with manifest metadata."""
    manifest_meta = load_manifest_metadata()
    chapter_meta = load_chapter_metadata()
    # Chapters take priority, fill gaps from manifest
    merged = dict(manifest_meta)
    merged.update(chapter_meta)
    return merged


# ---------------------------------------------------------------------------
# Sub-corpus filters
# ---------------------------------------------------------------------------

def classify_subcorpus(m):
    """Return set of sub-corpus names this work belongs to."""
    lang = m.get("language", "UNKNOWN")
    wtype = m.get("type", "")
    period = m.get("period", "UNKNOWN")
    year = m.get("year", 0) or 0
    memberships = set()

    # Language + type combos
    if lang == "FR" and wtype == "CLASSIQUE":
        memberships.add("FR_CLASSIQUE")
    if lang == "FR" and wtype == "CONTEMPORAIN":
        memberships.add("FR_CONTEMPORAIN")
    if lang == "FR" and wtype == "POPULAIRE":
        memberships.add("FR_POPULAIRE")
    if lang == "EN" and wtype == "CLASSIQUE":
        memberships.add("EN_CLASSIQUE")
    if lang == "EN" and wtype == "POPULAIRE":
        memberships.add("EN_POPULAIRE")
    if lang == "ES":
        memberships.add("ES_ALL")

    # Period-based (year OR period tag)
    if year > 0 and year < 1800 or period in ("PERIOD_1", "PERIOD_2"):
        memberships.add("PERIOD_1_2")
    if (year >= 1800 and year < 1900) or period in ("PERIOD_3", "PERIOD_4"):
        memberships.add("PERIOD_3_4")
    if year >= 1900 or period in ("PERIOD_5", "PERIOD_6"):
        memberships.add("PERIOD_5_6")

    return memberships


SUBCORPUS_NAMES = [
    "FR_CLASSIQUE", "FR_CONTEMPORAIN", "FR_POPULAIRE",
    "EN_CLASSIQUE", "EN_POPULAIRE", "ES_ALL",
    "PERIOD_1_2", "PERIOD_3_4", "PERIOD_5_6",
]


# ---------------------------------------------------------------------------
# Derivative computation
# ---------------------------------------------------------------------------

def compute_derivatives(results_subset):
    """
    For each (perturbation_type, category), compute OLS slope
    from (amplitude, category_delta) pairs.
    Returns dict: "PTYPE→CATEGORY" -> {"slope": float}
    """
    # Collect data: key = (ptype, cat) -> list of (amplitude, cat_delta)
    data = defaultdict(list)
    for r in results_subset:
        ptype = r["perturbation_type"]
        amp = r.get("amplitude", 0)
        deltas = r.get("deltas", {})
        for cat_name, features in CATEGORIES.items():
            cd = category_delta(deltas, features)
            if cd is not None:
                data[(ptype, cat_name)].append((amp, cd))

    derivs = {}
    for (ptype, cat_name), pairs in data.items():
        xs = [p[0] for p in pairs]
        ys = [p[1] for p in pairs]
        slope = ols_slope(xs, ys)
        key = f"{ptype}→{cat_name}"
        derivs[key] = {"slope": round(slope, 6)}
    return derivs


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("[1/6] Loading bench_report.json ...")
    with open(BENCH_PATH, "r", encoding="utf-8") as f:
        bench = json.load(f)
    results = bench["results"]
    print(f"       {len(results)} results loaded.")

    print("[2/6] Building metadata index (chapters + manifest) ...")
    meta_index = build_metadata_index()
    print(f"       {len(meta_index)} work_id entries in metadata index.")

    # Enrich results with sub-corpus memberships
    print("[3/6] Classifying results into sub-corpora ...")
    for r in results:
        wid = r["work_id"]
        m = meta_index.get(wid, {})
        r["_meta"] = m
        r["_subcorpora"] = classify_subcorpus(m)

    # Count per sub-corpus
    sc_counts = defaultdict(int)
    for r in results:
        for sc in r["_subcorpora"]:
            sc_counts[sc] += 1
    for sc in SUBCORPUS_NAMES:
        print(f"       {sc}: {sc_counts.get(sc, 0)} results")

    # Compute global derivatives
    print("[4/6] Computing GLOBAL derivatives ...")
    global_derivs = compute_derivatives(results)
    print(f"       {len(global_derivs)} (perturbation, category) pairs.")

    # Compute per-sub-corpus derivatives
    print("[5/6] Computing per-sub-corpus derivatives ...")
    sub_corpora_report = {}
    for sc_name in SUBCORPUS_NAMES:
        sc_results = [r for r in results if sc_name in r["_subcorpora"]]
        sc_derivs = compute_derivatives(sc_results)

        # Compare to global
        comparisons = {}
        n_quant = 0
        n_dir = 0
        n_div = 0
        for key, gd in global_derivs.items():
            g_slope = gd["slope"]
            s_slope = sc_derivs.get(key, {}).get("slope", 0.0)
            same_sign = (g_slope >= 0 and s_slope >= 0) or (g_slope < 0 and s_slope < 0)
            if abs(g_slope) > 1e-12:
                ratio = abs(s_slope - g_slope) / abs(g_slope)
            else:
                ratio = 0.0 if abs(s_slope) < 1e-12 else float("inf")
            quant_stable = ratio < QUANT_THRESHOLD and same_sign
            if quant_stable:
                n_quant += 1
            elif same_sign:
                n_dir += 1
            else:
                n_div += 1
            comparisons[key] = {
                "slope": round(s_slope, 6),
                "global_slope": round(g_slope, 6),
                "ratio": round(ratio, 4),
                "same_sign": same_sign,
                "quant_stable": quant_stable,
            }

        sub_corpora_report[sc_name] = {
            "n_results": len(sc_results),
            "derivatives": comparisons,
            "summary": {
                "quant_stable": n_quant,
                "directional": n_dir,
                "divergent": n_div,
            },
        }

    # Universality assessment
    print("[6/6] Assessing universality ...")
    universality = {}
    for key in global_derivs:
        stable_count = 0
        tested_count = 0
        for sc_name in SUBCORPUS_NAMES:
            comp = sub_corpora_report[sc_name]["derivatives"].get(key)
            if comp is None:
                continue
            tested_count += 1
            if comp["quant_stable"]:
                stable_count += 1
        verdict = "UNIVERSAL" if stable_count >= UNIVERSALITY_MIN else "PARTIAL" if stable_count >= 5 else "LOCAL"
        universality[key] = {
            "stable_in": stable_count,
            "out_of": tested_count,
            "verdict": verdict,
        }

    # Build final report
    report = {
        "global_derivatives": global_derivs,
        "sub_corpora": sub_corpora_report,
        "universality": universality,
    }

    # Write JSON
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"  -> {OUT_JSON}")

    # Write Markdown
    write_markdown(report)
    print(f"  -> {OUT_MD}")

    # Summary
    verdicts = [v["verdict"] for v in universality.values()]
    n_univ = verdicts.count("UNIVERSAL")
    n_part = verdicts.count("PARTIAL")
    n_loc = verdicts.count("LOCAL")
    print(f"\n=== REPLICABILITY SUMMARY ===")
    print(f"  Total laws: {len(universality)}")
    print(f"  UNIVERSAL (>={UNIVERSALITY_MIN}/9): {n_univ}")
    print(f"  PARTIAL (5-6/9): {n_part}")
    print(f"  LOCAL (<5/9): {n_loc}")
    print("Done.")


def write_markdown(report):
    """Generate the markdown report."""
    lines = []
    lines.append("# Replicability Report — Partial Derivatives across Sub-Corpora")
    lines.append("")
    lines.append("## 1. Sub-Corpus Sizes")
    lines.append("")
    lines.append("| Sub-Corpus | N results |")
    lines.append("|:-----------|----------:|")
    for sc_name in SUBCORPUS_NAMES:
        sc = report["sub_corpora"][sc_name]
        lines.append(f"| {sc_name} | {sc['n_results']} |")
    lines.append("")

    # Universality table
    lines.append("## 2. Universality Verdicts")
    lines.append("")
    lines.append("| Law | Global Slope | Stable In | / | Verdict |")
    lines.append("|:----|------------:|----------:|:-:|:--------|")
    for key in sorted(report["universality"].keys()):
        u = report["universality"][key]
        g_slope = report["global_derivatives"][key]["slope"]
        lines.append(
            f"| {key} | {g_slope:+.4f} | {u['stable_in']} | {u['out_of']} | **{u['verdict']}** |"
        )
    lines.append("")

    # Per-sub-corpus summary
    lines.append("## 3. Per-Sub-Corpus Stability Summary")
    lines.append("")
    lines.append("| Sub-Corpus | Quant Stable | Directional | Divergent |")
    lines.append("|:-----------|------------:|-----------:|----------:|")
    for sc_name in SUBCORPUS_NAMES:
        s = report["sub_corpora"][sc_name]["summary"]
        lines.append(
            f"| {sc_name} | {s['quant_stable']} | {s['directional']} | {s['divergent']} |"
        )
    lines.append("")

    # Detailed per-law stability grid
    lines.append("## 4. Stability Grid (law × sub-corpus)")
    lines.append("")
    header = "| Law | " + " | ".join(SUBCORPUS_NAMES) + " |"
    sep = "|:----|" + "|".join([":---:" for _ in SUBCORPUS_NAMES]) + "|"
    lines.append(header)
    lines.append(sep)
    for key in sorted(report["universality"].keys()):
        cells = []
        for sc_name in SUBCORPUS_NAMES:
            comp = report["sub_corpora"][sc_name]["derivatives"].get(key)
            if comp is None:
                cells.append("-")
            elif comp["quant_stable"]:
                cells.append("Q")
            elif comp["same_sign"]:
                cells.append("D")
            else:
                cells.append("X")
        lines.append(f"| {key} | " + " | ".join(cells) + " |")
    lines.append("")
    lines.append("Legend: **Q** = Quantitatively Stable (<30% deviation), "
                 "**D** = Directionally Stable (same sign), "
                 "**X** = Divergent, **-** = No data")
    lines.append("")

    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    main()
