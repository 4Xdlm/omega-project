#!/usr/bin/env python3
"""
OMEGA — Compute Partial Derivatives by Group (Language / Period)
Phase W — Day 3 — Missions E+F

Groups bench results by language or period, then computes
partial derivatives (slope of feature delta vs amplitude) per group.

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

BENCH_REPORT = os.path.join(os.path.dirname(__file__), "bench_results_v2", "bench_report.json")
CHAPTERS_DIR = os.path.join(os.path.dirname(__file__), "results_v4", "chapters")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "bench_results_v2")


# ── Linear regression ─────────────────────────────────────────────────────────

def linreg(xs, ys):
    """Simple OLS linear regression."""
    n = len(xs)
    if n < 3:
        return {"slope": 0, "r2": 0, "p_value": 1.0, "std_error": 0, "ci_95": [0, 0], "n": n}

    sx = sum(xs)
    sy = sum(ys)
    sxx = sum(x * x for x in xs)
    sxy = sum(x * y for x, y in zip(xs, ys))

    denom = n * sxx - sx * sx
    if abs(denom) < 1e-15:
        return {"slope": 0, "r2": 0, "p_value": 1.0, "std_error": 0, "ci_95": [0, 0], "n": n}

    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n

    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(xs, ys))
    y_mean = sy / n
    ss_tot = sum((y - y_mean) ** 2 for y in ys)
    r2 = 1 - ss_res / ss_tot if ss_tot > 1e-15 else 0

    if n > 2 and abs(sxx - sx * sx / n) > 1e-15:
        mse = ss_res / (n - 2)
        se_slope = math.sqrt(mse / (sxx - sx * sx / n)) if mse >= 0 else 0
    else:
        se_slope = 0

    if se_slope > 1e-15:
        t_stat = abs(slope / se_slope)
        df = n - 2
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


# ── Corpus stats by group ────────────────────────────────────────────────────

def compute_corpus_stats_by_group(group_field):
    """Compute mean and std of each feature, grouped by language or period."""
    stats = {}

    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        group = data.get(group_field, "UNKNOWN")
        if group not in stats:
            stats[group] = {k: [] for k in FEATURE_KEYS}

        features = data.get("baseline_features", {})
        for k in FEATURE_KEYS:
            v = features.get(k)
            if v is not None:
                stats[group][k].append(v)

    result = {}
    for group, feat_vals in stats.items():
        result[group] = {}
        for k, vals in feat_vals.items():
            if vals:
                mean = sum(vals) / len(vals)
                var = sum((v - mean) ** 2 for v in vals) / max(len(vals) - 1, 1)
                std = math.sqrt(var) if var > 0 else 1e-10
                result[group][k] = {"mean": mean, "std": std, "n": len(vals)}
            else:
                result[group][k] = {"mean": 0, "std": 1, "n": 0}

    return result


# ── Main computation ──────────────────────────────────────────────────────────

def compute_derivatives_by_group(group_field, label):
    """Compute partial derivatives grouped by group_field (language or period)."""
    print(f"\n[DERIV-{label.upper()}] Loading bench report...")
    with open(BENCH_REPORT, encoding="utf-8") as f:
        report = json.load(f)

    results = report["results"]
    ptypes = sorted(set(r["perturbation_type"] for r in results))
    groups = sorted(set(r.get(group_field, "UNKNOWN") for r in results))
    groups = [g for g in groups if g != "UNKNOWN"]  # Skip UNKNOWN

    print(f"[DERIV-{label.upper()}] {len(results)} results, {len(ptypes)} types, groups: {groups}")

    # Corpus stats per group for z-scoring
    print(f"[DERIV-{label.upper()}] Computing corpus stats per {group_field}...")
    corpus_stats = compute_corpus_stats_by_group(group_field)

    # Also compute global stats for fallback
    global_stats = {}
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
                if k not in global_stats:
                    global_stats[k] = []
                global_stats[k].append(v)
    for k in FEATURE_KEYS:
        vals = global_stats.get(k, [])
        if vals:
            mean = sum(vals) / len(vals)
            var = sum((v - mean) ** 2 for v in vals) / max(len(vals) - 1, 1)
            global_stats[k] = {"mean": mean, "std": math.sqrt(var) if var > 0 else 1e-10}
        else:
            global_stats[k] = {"mean": 0, "std": 1}

    # Compute category-level derivatives per group
    all_derivatives = {}
    for group in groups:
        all_derivatives[group] = {}
        group_results = [r for r in results if r.get(group_field) == group]

        g_stats = corpus_stats.get(group, {})

        for ptype in ptypes:
            all_derivatives[group][ptype] = {}
            ptype_results = [r for r in group_results if r["perturbation_type"] == ptype]

            for cat, cat_features in CATEGORIES.items():
                xs = []
                ys = []

                for r in ptype_results:
                    amp = r["amplitude"]
                    z_deltas = []
                    for feat in cat_features:
                        delta_info = r["deltas"].get(feat, {})
                        abs_delta = delta_info.get("abs_delta", 0)
                        feat_stats = g_stats.get(feat, global_stats.get(feat, {"std": 1}))
                        std = feat_stats["std"]
                        if std > 1e-10:
                            z_delta = abs_delta / std
                        else:
                            z_delta = 0
                        z_deltas.append(z_delta)

                    cat_z_delta = sum(z_deltas) / max(len(z_deltas), 1)
                    xs.append(amp)
                    ys.append(cat_z_delta)

                reg = linreg(xs, ys)
                all_derivatives[group][ptype][cat] = reg

    return all_derivatives, groups, ptypes


def format_stars(p):
    return "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""


def save_results(derivatives, groups, ptypes, label, group_field):
    """Save JSON and markdown report."""
    cats = list(CATEGORIES.keys())

    # JSON
    out_data = {
        "metadata": {
            "group_field": group_field,
            "label": label,
            "groups": groups,
            "types": ptypes,
            "categories": cats,
            "timestamp": datetime.now().isoformat(),
        },
        "derivatives": derivatives,
    }
    json_path = os.path.join(OUTPUT_DIR, f"derivatives_by_{label}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(out_data, f, ensure_ascii=False, indent=2)
    print(f"[DERIV-{label.upper()}] Saved {json_path}")

    # Markdown report
    lines = []
    lines.append(f"# OMEGA Phase W — Partial Derivatives by {label.title()}")
    lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Groups**: {', '.join(groups)}")
    lines.append("")

    # One matrix per group
    for group in groups:
        lines.append(f"## {group}")
        lines.append("")
        header = "| Perturbation | " + " | ".join(cats) + " |"
        sep = "|" + "|".join(["---"] * (len(cats) + 1)) + "|"
        lines.append(header)
        lines.append(sep)

        for ptype in ptypes:
            short = ptype.split("_", 1)[1] if "_" in ptype else ptype
            cells = []
            for cat in cats:
                info = derivatives[group][ptype][cat]
                slope = info["slope"]
                p = info["p_value"]
                stars = format_stars(p)
                cells.append(f"{slope:+.3f}{stars}")
            lines.append(f"| {short:30s} | " + " | ".join(cells) + " |")
        lines.append("")

    # Comparison matrix: for each (ptype, cat), show slope per group side by side
    lines.append("## Cross-Group Comparison")
    lines.append("")
    lines.append("For each (perturbation, category), slopes across groups:")
    lines.append("")

    for ptype in ptypes:
        short = ptype.split("_", 1)[1] if "_" in ptype else ptype
        lines.append(f"### {short}")
        header = "| Category | " + " | ".join(groups) + " | Δ max | Universal? |"
        sep = "|" + "|".join(["---"] * (len(groups) + 3)) + "|"
        lines.append(header)
        lines.append(sep)

        for cat in cats:
            slopes = []
            for group in groups:
                info = derivatives[group][ptype][cat]
                slopes.append(info["slope"])

            cells = [f"{s:+.3f}" for s in slopes]

            # Universality check
            max_abs = max(abs(s) for s in slopes)
            if max_abs > 0.001:
                min_abs = min(abs(s) for s in slopes)
                signs = set(1 if s > 0 else (-1 if s < 0 else 0) for s in slopes)
                signs.discard(0)

                if len(signs) <= 1 and min_abs > 0.3 * max_abs:
                    universal = "UNIVERSAL"
                elif len(signs) <= 1:
                    universal = "DIRECTIONAL"
                else:
                    universal = "DIVERGENT"
                delta_max = f"{max_abs - min_abs:.3f}"
            else:
                universal = "NEGLIGIBLE"
                delta_max = "—"

            lines.append(f"| {cat:12s} | " + " | ".join(cells) + f" | {delta_max} | {universal} |")
        lines.append("")

    # Summary statistics
    lines.append("## Universality Summary")
    lines.append("")
    n_universal = 0
    n_directional = 0
    n_divergent = 0
    n_negligible = 0

    for ptype in ptypes:
        for cat in cats:
            slopes = [derivatives[group][ptype][cat]["slope"] for group in groups]
            max_abs = max(abs(s) for s in slopes)
            if max_abs <= 0.001:
                n_negligible += 1
            else:
                min_abs = min(abs(s) for s in slopes)
                signs = set(1 if s > 0 else (-1 if s < 0 else 0) for s in slopes)
                signs.discard(0)
                if len(signs) <= 1 and min_abs > 0.3 * max_abs:
                    n_universal += 1
                elif len(signs) <= 1:
                    n_directional += 1
                else:
                    n_divergent += 1

    total = n_universal + n_directional + n_divergent + n_negligible
    lines.append(f"- **UNIVERSAL** (same sign, ±30%): {n_universal}/{total} ({100*n_universal/max(total,1):.0f}%)")
    lines.append(f"- **DIRECTIONAL** (same sign, >30% spread): {n_directional}/{total} ({100*n_directional/max(total,1):.0f}%)")
    lines.append(f"- **DIVERGENT** (opposite signs): {n_divergent}/{total} ({100*n_divergent/max(total,1):.0f}%)")
    lines.append(f"- **NEGLIGIBLE** (|slope| < 0.001): {n_negligible}/{total} ({100*n_negligible/max(total,1):.0f}%)")
    lines.append("")
    lines.append("---")
    lines.append(f"*Generated by compute_derivatives_by_group.py — Phase W Day 3*")

    md_path = os.path.join(OUTPUT_DIR, f"derivatives_by_{label}_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[DERIV-{label.upper()}] Saved {md_path}")

    # Console summary
    print(f"\n{'='*80}")
    print(f"UNIVERSALITY SUMMARY ({label.upper()})")
    print(f"{'='*80}")
    print(f"  UNIVERSAL:    {n_universal}/{total}")
    print(f"  DIRECTIONAL:  {n_directional}/{total}")
    print(f"  DIVERGENT:    {n_divergent}/{total}")
    print(f"  NEGLIGIBLE:   {n_negligible}/{total}")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Mission E: by language
    deriv_lang, groups_lang, ptypes = compute_derivatives_by_group("language", "language")
    save_results(deriv_lang, groups_lang, ptypes, "language", "language")

    # Mission F: by period
    deriv_period, groups_period, ptypes = compute_derivatives_by_group("period", "period")
    save_results(deriv_period, groups_period, ptypes, "period", "period")

    print("\n[DERIV] ALL DONE")


if __name__ == "__main__":
    main()
