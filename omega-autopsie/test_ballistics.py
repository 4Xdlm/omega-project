#!/usr/bin/env python3
"""
OMEGA — Inverse Ballistics Test
Phase W — Validation

Can we predict which perturbations to apply to match a target author profile?

Algorithm:
  1. Compute derivative matrix M[p][c] from bench_report.json
  2. Define 4 target profiles in percentile space
  3. Build percentile->raw_value lookup from corpus
  4. Select 20 neutral chapters (closest to median)
  5. For each chapter x target: solve for optimal perturbation amplitudes via grid search
  6. Apply perturbations, measure distance to target

PASS criterion: mean distance to target < 15 percentile points.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import time
import random
import math
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from speed_analyzer import analyze, FEATURE_KEYS
from perturbation_engine import apply_perturbation

# ── Config ────────────────────────────────────────────────────────────────────

SEED = 42
CHAPTERS_DIR = os.path.join(BASE_DIR, "results_v4", "chapters")
BENCH_REPORT = os.path.join(BASE_DIR, "bench_results_v4", "bench_report.json")
OUT_DIR = os.path.join(BASE_DIR, "bench_results_v4")

PERTURBATION_TYPES = [
    "P01_UNIFORMIZE_RHYTHM",
    "P03_COMPLEXIFY_SYNTAX",
    "P04_REMOVE_INTERIORITY",
    "P05_INJECT_SYNCOPES",
]

# ── Category definitions ──────────────────────────────────────────────────────

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

CATEGORY_NAMES = list(CATEGORIES.keys())

# ── Target profiles (percentile space 0-100) ─────────────────────────────────

TARGET_PROFILES = {
    "HEMINGWAY": {
        "MUSICALITE": 17, "COMPLEXITE": 14, "SENSORIEL": 41,
        "LEXICAL": 25, "INTERIORITE": 14, "TENSION": 69,
    },
    "PROUST": {
        "MUSICALITE": 100, "COMPLEXITE": 100, "SENSORIEL": 86,
        "LEXICAL": 100, "INTERIORITE": 99, "TENSION": 0,
    },
    "McCARTHY": {
        "MUSICALITE": 18, "COMPLEXITE": 3, "SENSORIEL": 21,
        "LEXICAL": 3, "INTERIORITE": 11, "TENSION": 84,
    },
    "FLAUBERT": {
        "MUSICALITE": 36, "COMPLEXITE": 25, "SENSORIEL": 71,
        "LEXICAL": 26, "INTERIORITE": 50, "TENSION": 79,
    },
}

# ── Amplitude grid ────────────────────────────────────────────────────────────

AMP_GRID = [round(a * 0.1, 1) for a in range(11)]  # 0.0, 0.1, ..., 1.0


# ══════════════════════════════════════════════════════════════════════════════
# Step 1: Compute derivative matrix from bench_report.json
# ══════════════════════════════════════════════════════════════════════════════

def compute_category_value(features: dict, category: str) -> float:
    """Category value = mean of feature values in that category."""
    keys = CATEGORIES[category]
    vals = [features.get(k, 0.0) for k in keys]
    return sum(vals) / len(vals) if vals else 0.0


def compute_derivative_matrix(bench_report: dict) -> dict:
    """
    For each (perturbation_type, category): slope = sum(amp*delta) / sum(amp^2).
    Returns M[ptype][category] = slope.
    """
    # Accumulate amp*delta and amp^2 per (ptype, category)
    num = {}   # (ptype, cat) -> sum(amp * delta)
    den = {}   # (ptype, cat) -> sum(amp^2)

    for row in bench_report["results"]:
        ptype = row["perturbation_type"]
        amp = row["amplitude"]
        deltas = row["deltas"]

        for cat in CATEGORY_NAMES:
            key = (ptype, cat)
            if key not in num:
                num[key] = 0.0
                den[key] = 0.0

            # Compute category delta from feature-level deltas
            cat_features = CATEGORIES[cat]
            cat_delta = 0.0
            for fk in cat_features:
                if fk in deltas:
                    cat_delta += deltas[fk]["abs_delta"]
            cat_delta /= len(cat_features)

            num[key] += amp * cat_delta
            den[key] += amp * amp

    M = {}
    for ptype in PERTURBATION_TYPES:
        M[ptype] = {}
        for cat in CATEGORY_NAMES:
            key = (ptype, cat)
            d = den.get(key, 0.0)
            M[ptype][cat] = num.get(key, 0.0) / d if d > 0 else 0.0

    return M


# ══════════════════════════════════════════════════════════════════════════════
# Step 2-3: Load corpus, build percentile lookup
# ══════════════════════════════════════════════════════════════════════════════

def load_all_chapters() -> list:
    """Load all chapter JSONs from results_v4/chapters/."""
    chapters = []
    files = sorted(f for f in os.listdir(CHAPTERS_DIR) if f.endswith(".json"))
    for fname in files:
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        chapters.append(data)
    return chapters


def compute_corpus_category_values(chapters: list) -> dict:
    """
    For each chapter, compute category values from speed_analyzer.
    Returns {category: [sorted list of values]}.
    """
    cat_values = {cat: [] for cat in CATEGORY_NAMES}

    for ch in chapters:
        text = ch.get("text", "")
        if len(text) < 200:
            continue
        features = analyze(text)
        for cat in CATEGORY_NAMES:
            val = compute_category_value(features, cat)
            cat_values[cat].append(val)

    # Sort each category's values for percentile lookup
    for cat in CATEGORY_NAMES:
        cat_values[cat].sort()

    return cat_values


def percentile_to_raw(cat_values: dict, category: str, percentile: float) -> float:
    """Convert a percentile (0-100) to a raw value using the sorted corpus values."""
    vals = cat_values[category]
    n = len(vals)
    if n == 0:
        return 0.0
    idx = (percentile / 100.0) * (n - 1)
    lo = int(math.floor(idx))
    hi = int(math.ceil(idx))
    if lo == hi or hi >= n:
        return vals[min(lo, n - 1)]
    frac = idx - lo
    return vals[lo] * (1 - frac) + vals[hi] * frac


def raw_to_percentile(cat_values: dict, category: str, raw_value: float) -> float:
    """Convert a raw value to a percentile (0-100) using the sorted corpus values."""
    vals = cat_values[category]
    n = len(vals)
    if n == 0:
        return 50.0
    # Binary search for position
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if vals[mid] < raw_value:
            lo = mid + 1
        else:
            hi = mid
    return (lo / n) * 100.0


# ══════════════════════════════════════════════════════════════════════════════
# Step 4: Select 20 neutral chapters (closest to median = 50th percentile)
# ══════════════════════════════════════════════════════════════════════════════

def select_neutral_chapters(chapters: list, cat_values: dict, n_select: int = 20) -> list:
    """Select chapters closest to the corpus median on all axes."""
    rng = random.Random(SEED)

    scored = []
    for ch in chapters:
        text = ch.get("text", "")
        if len(text) < 500:
            continue
        features = analyze(text)
        # Compute distance to 50th percentile on all axes
        dist = 0.0
        for cat in CATEGORY_NAMES:
            val = compute_category_value(features, cat)
            pct = raw_to_percentile(cat_values, cat, val)
            dist += abs(pct - 50.0)
        scored.append((dist, ch, features))

    scored.sort(key=lambda x: x[0])
    selected = scored[:n_select]
    print(f"[BALLISTICS] Selected {len(selected)} neutral chapters "
          f"(median distance range: {selected[0][0]:.1f} - {selected[-1][0]:.1f})")
    return [(ch, feats) for _, ch, feats in selected]


# ══════════════════════════════════════════════════════════════════════════════
# Step 5: Grid search for optimal perturbation amplitudes
# ══════════════════════════════════════════════════════════════════════════════

def solve_amplitudes(M: dict, delta_needed: dict) -> list:
    """
    Minimize ||M x - delta_needed||^2 where x in [0,1]^4.
    Grid search over 11^4 = 14641 combinations.
    Returns list of (ptype, amplitude) tuples.
    """
    best_cost = float("inf")
    best_amps = [0.0] * len(PERTURBATION_TYPES)

    for a0 in AMP_GRID:
        for a1 in AMP_GRID:
            for a2 in AMP_GRID:
                for a3 in AMP_GRID:
                    amps = [a0, a1, a2, a3]
                    cost = 0.0
                    for cat in CATEGORY_NAMES:
                        predicted = 0.0
                        for i, ptype in enumerate(PERTURBATION_TYPES):
                            predicted += M[ptype][cat] * amps[i]
                        diff = predicted - delta_needed[cat]
                        cost += diff * diff
                    if cost < best_cost:
                        best_cost = cost
                        best_amps = list(amps)

    return list(zip(PERTURBATION_TYPES, best_amps))


# ══════════════════════════════════════════════════════════════════════════════
# Step 5e-g: Apply perturbations and measure
# ══════════════════════════════════════════════════════════════════════════════

def apply_and_measure(text: str, plan: list) -> dict:
    """Apply perturbations sequentially and return resulting features."""
    current = text
    for ptype, amp in plan:
        if amp > 0:
            current, _ = apply_perturbation(current, ptype, amp)
    return analyze(current)


def compute_profile_distance(cat_values: dict, result_features: dict, target: dict) -> float:
    """Mean absolute difference in percentile space."""
    diffs = []
    for cat in CATEGORY_NAMES:
        val = compute_category_value(result_features, cat)
        pct = raw_to_percentile(cat_values, cat, val)
        diffs.append(abs(pct - target[cat]))
    return sum(diffs) / len(diffs)


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def main():
    random.seed(SEED)
    t0 = time.time()

    # Load bench report
    print("[BALLISTICS] Loading bench report...")
    with open(BENCH_REPORT, encoding="utf-8") as f:
        bench_report = json.load(f)

    # Step 1: Derivative matrix
    print("[BALLISTICS] Computing derivative matrix...")
    M = compute_derivative_matrix(bench_report)
    for ptype in PERTURBATION_TYPES:
        slopes = [f"{cat}={M[ptype][cat]:+.6f}" for cat in CATEGORY_NAMES]
        print(f"  {ptype}: {', '.join(slopes)}")

    # Load chapters
    print(f"[BALLISTICS] Loading chapters from {CHAPTERS_DIR}...")
    chapters = load_all_chapters()
    print(f"[BALLISTICS] Loaded {len(chapters)} chapters")

    # Step 2-3: Build percentile lookup
    print("[BALLISTICS] Computing corpus category distributions (this takes a while)...")
    t_corpus = time.time()
    cat_values = compute_corpus_category_values(chapters)
    for cat in CATEGORY_NAMES:
        n = len(cat_values[cat])
        lo = cat_values[cat][0] if n > 0 else 0
        hi = cat_values[cat][-1] if n > 0 else 0
        med = cat_values[cat][n // 2] if n > 0 else 0
        print(f"  {cat}: n={n}, range=[{lo:.4f}, {hi:.4f}], median={med:.4f}")
    print(f"[BALLISTICS] Corpus stats computed in {time.time() - t_corpus:.1f}s")

    # Step 4: Select neutral chapters
    print("[BALLISTICS] Selecting 20 neutral chapters...")
    neutral = select_neutral_chapters(chapters, cat_values, n_select=20)

    # Step 5-6: For each chapter x target, solve and apply
    results_by_target = {name: [] for name in TARGET_PROFILES}
    total_calls = 0
    n_total = len(neutral) * len(TARGET_PROFILES)
    n_done = 0

    for ch_idx, (ch, baseline_features) in enumerate(neutral):
        work_id = ch.get("work_id", "unknown")
        ch_title = ch.get("chapter_title", f"ch{ch_idx}")
        text = ch["text"]

        for target_name, target_pcts in TARGET_PROFILES.items():
            n_done += 1
            # a. Baseline category values
            baseline_cats = {}
            for cat in CATEGORY_NAMES:
                baseline_cats[cat] = compute_category_value(baseline_features, cat)

            # b. Target raw values
            target_raw = {}
            for cat in CATEGORY_NAMES:
                target_raw[cat] = percentile_to_raw(cat_values, cat, target_pcts[cat])

            # c. Delta needed
            delta_needed = {}
            for cat in CATEGORY_NAMES:
                delta_needed[cat] = target_raw[cat] - baseline_cats[cat]

            # d. Solve for optimal amplitudes
            plan = solve_amplitudes(M, delta_needed)

            # e. Apply perturbations
            result_features = apply_and_measure(text, plan)
            total_calls += 1

            # f-g. Measure distance
            dist = compute_profile_distance(cat_values, result_features, target_pcts)

            # Per-category detail
            cat_detail = {}
            for cat in CATEGORY_NAMES:
                val = compute_category_value(result_features, cat)
                achieved_pct = raw_to_percentile(cat_values, cat, val)
                cat_detail[cat] = {
                    "target_pct": target_pcts[cat],
                    "achieved_pct": round(achieved_pct, 1),
                    "error_pct": round(abs(achieved_pct - target_pcts[cat]), 1),
                }

            results_by_target[target_name].append({
                "work_id": work_id,
                "chapter_title": ch_title,
                "plan": [(p, round(a, 2)) for p, a in plan],
                "distance": round(dist, 2),
                "categories": cat_detail,
            })

            if n_done % 10 == 0 or n_done == n_total:
                elapsed = time.time() - t0
                print(f"[BALLISTICS] Progress: {n_done}/{n_total} "
                      f"({100*n_done/n_total:.0f}%) - {elapsed:.0f}s elapsed")

    # Step 6: Report
    print()
    print("=" * 70)
    print("INVERSE BALLISTICS REPORT")
    print("=" * 70)

    report = {
        "timestamp": datetime.now().isoformat(),
        "seed": SEED,
        "n_neutral_chapters": len(neutral),
        "n_targets": len(TARGET_PROFILES),
        "total_analyze_calls": total_calls,
        "perturbation_types": PERTURBATION_TYPES,
        "amplitude_grid": AMP_GRID,
        "derivative_matrix": {
            ptype: {cat: round(M[ptype][cat], 8) for cat in CATEGORY_NAMES}
            for ptype in PERTURBATION_TYPES
        },
        "targets": {},
    }

    all_pass = True
    for target_name, results in results_by_target.items():
        distances = [r["distance"] for r in results]
        mean_dist = sum(distances) / len(distances) if distances else 0
        min_dist = min(distances) if distances else 0
        max_dist = max(distances) if distances else 0
        passed = mean_dist < 15.0

        if not passed:
            all_pass = False

        print(f"\n  {target_name}:")
        print(f"    Mean distance: {mean_dist:.2f} percentile points")
        print(f"    Range: [{min_dist:.2f}, {max_dist:.2f}]")
        print(f"    PASS: {'YES' if passed else 'NO'} (threshold: <15)")

        # Per-category mean error
        cat_errors = {cat: [] for cat in CATEGORY_NAMES}
        for r in results:
            for cat in CATEGORY_NAMES:
                cat_errors[cat].append(r["categories"][cat]["error_pct"])
        cat_summary = {}
        for cat in CATEGORY_NAMES:
            errs = cat_errors[cat]
            mean_err = sum(errs) / len(errs) if errs else 0
            cat_summary[cat] = round(mean_err, 2)
            print(f"      {cat}: mean error = {mean_err:.1f} pct pts")

        report["targets"][target_name] = {
            "mean_distance": round(mean_dist, 2),
            "min_distance": round(min_dist, 2),
            "max_distance": round(max_dist, 2),
            "pass": passed,
            "category_mean_errors": cat_summary,
            "details": results,
        }

    total_time = time.time() - t0
    report["total_time_s"] = round(total_time, 1)
    report["overall_pass"] = all_pass

    print(f"\n  Overall: {'PASS' if all_pass else 'FAIL'}")
    print(f"  Total time: {total_time:.1f}s")
    print(f"  Total analyze calls: {total_calls}")

    # Write JSON report
    json_path = os.path.join(OUT_DIR, "ballistics_report.json")
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n[BALLISTICS] JSON report: {json_path}")

    # Write markdown report
    md_path = os.path.join(OUT_DIR, "ballistics_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# Inverse Ballistics Report\n\n")
        f.write(f"**Date**: {report['timestamp']}\n")
        f.write(f"**Seed**: {SEED}\n")
        f.write(f"**Neutral chapters**: {len(neutral)}\n")
        f.write(f"**Targets**: {len(TARGET_PROFILES)}\n")
        f.write(f"**Total time**: {total_time:.1f}s\n\n")

        f.write("## Derivative Matrix\n\n")
        f.write(f"| Perturbation | {'| '.join(CATEGORY_NAMES)} |\n")
        f.write(f"|{' --- |' * (len(CATEGORY_NAMES) + 1)}\n")
        for ptype in PERTURBATION_TYPES:
            vals = [f"{M[ptype][cat]:+.6f}" for cat in CATEGORY_NAMES]
            f.write(f"| {ptype} | {' | '.join(vals)} |\n")
        f.write("\n")

        f.write("## Results by Target\n\n")
        for target_name in TARGET_PROFILES:
            t = report["targets"][target_name]
            status = "PASS" if t["pass"] else "FAIL"
            f.write(f"### {target_name} — {status}\n\n")
            f.write(f"- Mean distance: **{t['mean_distance']:.2f}** percentile points\n")
            f.write(f"- Range: [{t['min_distance']:.2f}, {t['max_distance']:.2f}]\n\n")

            f.write("| Category | Target Pct | Mean Error |\n")
            f.write("| --- | --- | --- |\n")
            for cat in CATEGORY_NAMES:
                tgt = TARGET_PROFILES[target_name][cat]
                err = t["category_mean_errors"][cat]
                f.write(f"| {cat} | {tgt} | {err:.1f} |\n")
            f.write("\n")

        f.write("## Overall\n\n")
        f.write(f"**{'PASS' if all_pass else 'FAIL'}** — ")
        f.write(f"criterion: mean distance < 15 percentile points for all targets.\n")

    print(f"[BALLISTICS] Markdown report: {md_path}")
    print("[BALLISTICS] Done.")


if __name__ == "__main__":
    main()
