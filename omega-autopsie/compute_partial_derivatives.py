#!/usr/bin/env python3
"""
OMEGA — Compute Partial Derivatives from Perturbation Bench
Phase W — Mission F

For each (perturbation_type, feature) pair:
  delta = slope * amplitude + epsilon
  -> slope = partial derivative
  -> r2 = fit quality
  -> p_value, ci_95

Also computes at category level (6 macro-categories from z-scored features).

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import math
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from speed_analyzer import FEATURE_KEYS

# ── Category mapping ──────────────────────────────────────────────────────────

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

BENCH_REPORT = os.path.join(os.path.dirname(__file__), "bench_results_full", "bench_report.json")
CHAPTERS_DIR = os.path.join(os.path.dirname(__file__), "results_v4", "chapters")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "bench_results_full")


# ── Linear regression (no scipy needed) ──────────────────────────────────────

def linreg(xs, ys):
    """Simple OLS linear regression. Returns slope, intercept, r2, std_err, p_value_approx."""
    n = len(xs)
    if n < 3:
        return {"slope": 0, "r2": 0, "p_value": 1.0, "std_error": 0, "ci_95": [0, 0], "n": n}

    sx = sum(xs)
    sy = sum(ys)
    sxx = sum(x * x for x in xs)
    sxy = sum(x * y for x, y in zip(xs, ys))
    syy = sum(y * y for y in ys)

    denom = n * sxx - sx * sx
    if abs(denom) < 1e-15:
        return {"slope": 0, "r2": 0, "p_value": 1.0, "std_error": 0, "ci_95": [0, 0], "n": n}

    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n

    # R²
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(xs, ys))
    y_mean = sy / n
    ss_tot = sum((y - y_mean) ** 2 for y in ys)
    r2 = 1 - ss_res / ss_tot if ss_tot > 1e-15 else 0

    # Standard error of slope
    if n > 2 and abs(sxx - sx * sx / n) > 1e-15:
        mse = ss_res / (n - 2)
        se_slope = math.sqrt(mse / (sxx - sx * sx / n)) if mse >= 0 else 0
    else:
        se_slope = 0

    # Approximate p-value using t-distribution approximation
    if se_slope > 1e-15:
        t_stat = abs(slope / se_slope)
        df = n - 2
        # Rough p-value: p ≈ 2 * exp(-0.717 * t - 0.416 * t²) for df > 5
        if df > 5:
            p_value = min(1.0, 2 * math.exp(-0.717 * t_stat - 0.416 * t_stat * t_stat))
        else:
            p_value = 0.5 if t_stat < 1 else 0.1 if t_stat < 2 else 0.01
    else:
        p_value = 1.0

    ci_95 = [round(slope - 1.96 * se_slope, 6), round(slope + 1.96 * se_slope, 6)]

    return {
        "slope": round(slope, 6),
        "r2": round(max(0, min(1, r2)), 6),
        "p_value": round(p_value, 6),
        "std_error": round(se_slope, 6),
        "ci_95": ci_95,
        "n": n,
    }


# ── Compute corpus baseline stats (for z-scoring) ────────────────────────────

def compute_corpus_stats():
    """Compute mean and std of each feature across all 235 chapters."""
    stats = {k: [] for k in FEATURE_KEYS}

    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        features = data.get("baseline_features", {})
        for k in FEATURE_KEYS:
            v = features.get(k)
            if v is not None:
                stats[k].append(v)

    result = {}
    for k, vals in stats.items():
        if vals:
            mean = sum(vals) / len(vals)
            var = sum((v - mean) ** 2 for v in vals) / max(len(vals) - 1, 1)
            std = math.sqrt(var) if var > 0 else 1e-10
            result[k] = {"mean": mean, "std": std, "n": len(vals)}
        else:
            result[k] = {"mean": 0, "std": 1, "n": 0}

    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("[DERIV] Loading bench report...")
    with open(BENCH_REPORT, encoding="utf-8") as f:
        report = json.load(f)

    results = report["results"]
    n_total = len(results)
    ptypes = sorted(set(r["perturbation_type"] for r in results))
    amplitudes = sorted(set(r["amplitude"] for r in results))

    print(f"[DERIV] {n_total} results, {len(ptypes)} types, {len(amplitudes)} amplitudes")

    # Compute corpus stats for z-scoring
    print("[DERIV] Computing corpus baseline stats...")
    corpus_stats = compute_corpus_stats()

    # ── Feature-level partial derivatives ─────────────────────────────────────
    print("[DERIV] Computing feature-level partial derivatives...")

    feature_level = {}
    for ptype in ptypes:
        feature_level[ptype] = {}
        ptype_results = [r for r in results if r["perturbation_type"] == ptype]

        for feat in FEATURE_KEYS:
            xs = []  # amplitudes
            ys = []  # abs_deltas
            for r in ptype_results:
                delta_info = r["deltas"].get(feat, {})
                abs_delta = delta_info.get("abs_delta", 0)
                xs.append(r["amplitude"])
                ys.append(abs_delta)

            reg = linreg(xs, ys)
            feature_level[ptype][feat] = reg

    # ── Category-level partial derivatives ────────────────────────────────────
    print("[DERIV] Computing category-level partial derivatives...")

    category_level = {}
    for ptype in ptypes:
        category_level[ptype] = {}
        ptype_results = [r for r in results if r["perturbation_type"] == ptype]

        for cat, cat_features in CATEGORIES.items():
            xs = []
            ys = []  # z-score delta for the category

            for r in ptype_results:
                amp = r["amplitude"]
                # Compute z-score delta for category
                z_deltas = []
                for feat in cat_features:
                    delta_info = r["deltas"].get(feat, {})
                    abs_delta = delta_info.get("abs_delta", 0)
                    std = corpus_stats[feat]["std"]
                    if std > 1e-10:
                        z_delta = abs_delta / std
                    else:
                        z_delta = 0
                    z_deltas.append(z_delta)

                cat_z_delta = sum(z_deltas) / max(len(z_deltas), 1)
                xs.append(amp)
                ys.append(cat_z_delta)

            reg = linreg(xs, ys)
            category_level[ptype][cat] = reg

    # ── Summary matrix (7 perturbations × 6 categories) ──────────────────────
    print("[DERIV] Building summary matrix...")

    summary_matrix = {}
    for ptype in ptypes:
        summary_matrix[ptype] = {}
        for cat in CATEGORIES:
            info = category_level[ptype][cat]
            summary_matrix[ptype][cat] = {
                "slope": info["slope"],
                "r2": info["r2"],
                "significant": info["p_value"] < 0.05,
            }

    # ── Build output ──────────────────────────────────────────────────────────
    output = {
        "metadata": {
            "n_perturbations": n_total,
            "n_chapters": report["config"]["chapters"],
            "n_types": len(ptypes),
            "n_amplitudes": len(amplitudes),
            "amplitudes": amplitudes,
            "types": ptypes,
            "timestamp": datetime.now().isoformat(),
        },
        "corpus_stats": {k: {"mean": round(v["mean"], 6), "std": round(v["std"], 6)}
                         for k, v in corpus_stats.items()},
        "feature_level": feature_level,
        "category_level": category_level,
        "summary_matrix": summary_matrix,
    }

    # Save JSON
    out_path = os.path.join(OUTPUT_DIR, "partial_derivatives.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"[DERIV] Saved {out_path}")

    # ── Generate markdown report ──────────────────────────────────────────────
    print("[DERIV] Generating markdown report...")

    lines = []
    lines.append("# OMEGA Phase W — Partial Derivatives Report")
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Data**: {n_total} perturbations, {report['config']['chapters']} chapters, "
                 f"{len(ptypes)} types, {len(amplitudes)} amplitudes")
    lines.append("")

    # Summary matrix
    lines.append("## Summary Matrix (7 perturbations x 6 categories)")
    lines.append("")
    lines.append("Slope = partial derivative of category z-score delta with respect to amplitude.")
    lines.append("Positive slope = perturbation INCREASES the category value.")
    lines.append("Stars: *** p<0.001, ** p<0.01, * p<0.05")
    lines.append("")

    # Header
    cats = list(CATEGORIES.keys())
    header = "| Perturbation | " + " | ".join(cats) + " |"
    sep = "|" + "|".join(["---"] * (len(cats) + 1)) + "|"
    lines.append(header)
    lines.append(sep)

    for ptype in ptypes:
        short = ptype.split("_", 1)[1] if "_" in ptype else ptype
        cells = []
        for cat in cats:
            info = category_level[ptype][cat]
            slope = info["slope"]
            p = info["p_value"]
            stars = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            r2 = info["r2"]
            cells.append(f"{slope:+.3f}{stars} (r²={r2:.2f})")
        lines.append(f"| {short:30s} | " + " | ".join(cells) + " |")

    lines.append("")

    # Feature-level details for each perturbation
    lines.append("## Feature-Level Details")
    lines.append("")

    for ptype in ptypes:
        short = ptype.split("_", 1)[1] if "_" in ptype else ptype
        lines.append(f"### {ptype}")
        lines.append("")
        lines.append("| Feature | Slope | R² | p-value | CI 95% |")
        lines.append("|---------|-------|-----|---------|--------|")

        # Sort by absolute slope
        feat_items = sorted(feature_level[ptype].items(),
                           key=lambda x: abs(x[1]["slope"]), reverse=True)
        for feat, info in feat_items:
            slope = info["slope"]
            r2 = info["r2"]
            p = info["p_value"]
            ci = info["ci_95"]
            stars = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            lines.append(f"| {feat:30s} | {slope:+.4f}{stars:3s} | {r2:.3f} | {p:.4f} | [{ci[0]:+.4f}, {ci[1]:+.4f}] |")

        lines.append("")

    # Top insights
    lines.append("## Top Insights")
    lines.append("")

    # Find the 10 strongest effects (by absolute slope at category level)
    all_effects = []
    for ptype in ptypes:
        for cat in cats:
            info = category_level[ptype][cat]
            if info["p_value"] < 0.05:
                all_effects.append((ptype, cat, info["slope"], info["r2"], info["p_value"]))
    all_effects.sort(key=lambda x: abs(x[2]), reverse=True)

    for i, (ptype, cat, slope, r2, p) in enumerate(all_effects[:10]):
        direction = "INCREASES" if slope > 0 else "DECREASES"
        lines.append(f"{i+1}. **{ptype}** {direction} **{cat}** (slope={slope:+.3f}, r²={r2:.2f}, p={p:.4f})")

    lines.append("")

    # Cross-coupling effects
    lines.append("## Cross-Coupling Effects")
    lines.append("")
    lines.append("Perturbations that significantly affect categories OTHER than their primary target:")
    lines.append("")

    primary_targets = {
        "P01_UNIFORMIZE_RHYTHM": "MUSICALITE",
        "P02_SIMPLIFY_VOCABULARY": "LEXICAL",
        "P03_COMPLEXIFY_SYNTAX": "MUSICALITE",
        "P04_REMOVE_INTERIORITY": "INTERIORITE",
        "P05_INJECT_SYNCOPES": "MUSICALITE",
        "P06_ENRICH_VOCABULARY": "LEXICAL",
        "P07_NEUTRALIZE_TENSION": "TENSION",
    }

    for ptype in ptypes:
        primary = primary_targets.get(ptype, "")
        cross = []
        for cat in cats:
            if cat == primary:
                continue
            info = category_level[ptype][cat]
            if info["p_value"] < 0.05 and abs(info["slope"]) > 0.01:
                cross.append((cat, info["slope"], info["r2"]))
        if cross:
            cross.sort(key=lambda x: abs(x[1]), reverse=True)
            effects = ", ".join(f"{c} ({s:+.3f})" for c, s, _ in cross)
            lines.append(f"- **{ptype}**: {effects}")

    lines.append("")
    lines.append("---")
    lines.append("*Generated by compute_partial_derivatives.py — Phase W*")

    report_path = os.path.join(OUTPUT_DIR, "partial_derivatives_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[DERIV] Saved {report_path}")

    # Print summary to console
    print("\n" + "=" * 80)
    print("SUMMARY MATRIX (slopes, significant effects marked with *)")
    print("=" * 80)
    print(f"{'':35s} " + " ".join(f"{c:>12s}" for c in cats))
    for ptype in ptypes:
        short = ptype[4:25] if ptype.startswith("P0") else ptype[:25]
        vals = []
        for cat in cats:
            info = category_level[ptype][cat]
            s = info["slope"]
            sig = "*" if info["p_value"] < 0.05 else " "
            vals.append(f"{s:+.3f}{sig}")
        print(f"{short:35s} " + " ".join(f"{v:>12s}" for v in vals))

    print(f"\n[DERIV] DONE")


if __name__ == "__main__":
    main()
