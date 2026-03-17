#!/usr/bin/env python
"""
test_prediction.py — Out-of-sample prediction test with 4 train/test splits.

Learns a linear model: predicted_delta(category) = slope[perturbation_type][category] * amplitude
Evaluates on held-out data with MAE and R² metrics.
"""

import sys
import os
import json
import random
import math
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BENCH_PATH = os.path.join(BASE_DIR, "bench_results_v4", "bench_report.json")
CHAPTERS_DIR = os.path.join(BASE_DIR, "results_v4", "chapters")
OUT_JSON = os.path.join(BASE_DIR, "bench_results_v4", "prediction_report.json")
OUT_MD = os.path.join(BASE_DIR, "bench_results_v4", "prediction_report.md")

SEED = 42

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

THRESHOLDS = {
    "split_1_random": 0.05,
    "split_2_author": 0.08,
    "split_3_language": 0.10,
    "split_4_period": 0.10,
}


def load_bench_results():
    with open(BENCH_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["results"]


def load_chapter_metadata():
    """Load chapter metadata to build work_id -> {author, year, language, period} mapping."""
    work_meta = {}
    if not os.path.isdir(CHAPTERS_DIR):
        print(f"WARNING: chapters dir not found: {CHAPTERS_DIR}")
        return work_meta
    for fname in os.listdir(CHAPTERS_DIR):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(CHAPTERS_DIR, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            ch = json.load(f)
        wid = ch.get("work_id", "")
        if wid and wid not in work_meta:
            work_meta[wid] = {
                "author": ch.get("author", ""),
                "year": ch.get("year", 0),
                "language": ch.get("language", "UNKNOWN"),
                "period": ch.get("period", "UNKNOWN"),
            }
    return work_meta


def compute_category_deltas(result):
    """For a result, compute category_delta = mean of abs_delta for features in that category."""
    deltas = result["deltas"]
    cat_deltas = {}
    for cat, features in CATEGORIES.items():
        vals = []
        for feat in features:
            if feat in deltas and deltas[feat] is not None:
                ad = deltas[feat].get("abs_delta")
                if ad is not None:
                    vals.append(abs(ad))
        cat_deltas[cat] = sum(vals) / len(vals) if vals else 0.0
    return cat_deltas


def learn_slopes(train_results):
    """
    OLS with no intercept: slope = sum(amp_i * delta_i) / sum(amp_i^2)
    Per (perturbation_type, category).
    """
    # Accumulators: numerator and denominator per (ptype, category)
    num = defaultdict(lambda: defaultdict(float))
    den = defaultdict(lambda: defaultdict(float))

    for r in train_results:
        ptype = r["perturbation_type"]
        amp = r["amplitude"]
        cat_deltas = compute_category_deltas(r)
        for cat, delta in cat_deltas.items():
            num[ptype][cat] += amp * delta
            den[ptype][cat] += amp * amp

    slopes = {}
    for ptype in num:
        slopes[ptype] = {}
        for cat in num[ptype]:
            d = den[ptype][cat]
            slopes[ptype][cat] = num[ptype][cat] / d if d > 0 else 0.0
    return slopes


def predict(slopes, ptype, amplitude):
    """Predict category deltas."""
    preds = {}
    for cat in CATEGORIES:
        s = slopes.get(ptype, {}).get(cat, 0.0)
        preds[cat] = s * amplitude
    return preds


def evaluate(slopes, test_results):
    """Compute MAE and R² per category on test set."""
    actuals = defaultdict(list)
    preds = defaultdict(list)

    for r in test_results:
        ptype = r["perturbation_type"]
        amp = r["amplitude"]
        cat_deltas = compute_category_deltas(r)
        predicted = predict(slopes, ptype, amp)
        for cat in CATEGORIES:
            actuals[cat].append(cat_deltas[cat])
            preds[cat].append(predicted[cat])

    mae_per_cat = {}
    r2_per_cat = {}

    for cat in CATEGORIES:
        a = actuals[cat]
        p = preds[cat]
        n = len(a)
        if n == 0:
            mae_per_cat[cat] = float("nan")
            r2_per_cat[cat] = float("nan")
            continue

        # MAE
        mae = sum(abs(ai - pi) for ai, pi in zip(a, p)) / n
        mae_per_cat[cat] = round(mae, 6)

        # R²
        mean_a = sum(a) / n
        ss_tot = sum((ai - mean_a) ** 2 for ai in a)
        ss_res = sum((ai - pi) ** 2 for ai, pi in zip(a, p))
        r2_per_cat[cat] = round(1 - ss_res / ss_tot, 6) if ss_tot > 0 else 0.0

    overall_mae = sum(mae_per_cat[c] for c in CATEGORIES) / len(CATEGORIES)
    return {
        "mae_per_category": mae_per_cat,
        "r2_per_category": r2_per_cat,
        "overall_mae": round(overall_mae, 6),
    }


def split_random(results):
    """Split 1: Random 80/20 with seed 42."""
    shuffled = list(results)
    random.seed(SEED)
    random.shuffle(shuffled)
    cut = int(len(shuffled) * 0.8)
    return shuffled[:cut], shuffled[cut:]


def split_by_author(results, work_meta):
    """Split 2: Authors A-M train, N-Z test."""
    train, test = [], []
    for r in results:
        wid = r["work_id"]
        meta = work_meta.get(wid, {})
        author = meta.get("author", "")
        if not author:
            # Skip results with no author info — put in train to be safe
            train.append(r)
            continue
        first_letter = author.strip()[0].upper() if author.strip() else "A"
        if first_letter <= "M":
            train.append(r)
        else:
            test.append(r)
    return train, test


def split_by_language(results, work_meta):
    """Split 3: FR+EN train, ES test."""
    train, test = [], []
    for r in results:
        wid = r["work_id"]
        # Use chapter metadata language (more reliable than bench result)
        meta = work_meta.get(wid, {})
        lang = meta.get("language", r.get("language", "UNKNOWN"))
        if lang == "ES":
            test.append(r)
        elif lang in ("FR", "EN"):
            train.append(r)
        # Skip UNKNOWN — don't include in either set
    return train, test


def split_by_period(results, work_meta):
    """Split 4: year < 1900 (or PERIOD_1-4) train, year >= 1900 (or PERIOD_5-6) test."""
    train, test = [], []
    early_periods = {"PERIOD_1", "PERIOD_2", "PERIOD_3", "PERIOD_4"}
    late_periods = {"PERIOD_5", "PERIOD_6"}

    for r in results:
        wid = r["work_id"]
        meta = work_meta.get(wid, {})
        year = meta.get("year", 0)
        period = meta.get("period", r.get("period", "UNKNOWN"))

        if year > 0:
            if year < 1900:
                train.append(r)
            else:
                test.append(r)
        elif period in early_periods:
            train.append(r)
        elif period in late_periods:
            test.append(r)
        # UNKNOWN period + year=0 → skip
    return train, test


def run_split(name, train, test, threshold):
    """Run one split: learn slopes, evaluate, produce result dict."""
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"  Train: {len(train):,}  |  Test: {len(test):,}")
    print(f"{'='*60}")

    if len(test) == 0:
        print("  WARNING: empty test set — skipping")
        return {
            "split": name,
            "train_size": len(train),
            "test_size": 0,
            "mae_per_category": {},
            "r2_per_category": {},
            "overall_mae": float("nan"),
            "verdict": "SKIP (empty test set)",
        }

    slopes = learn_slopes(train)
    metrics = evaluate(slopes, test)

    verdict = "PASS" if metrics["overall_mae"] < threshold else "FAIL"
    print(f"  Overall MAE: {metrics['overall_mae']:.6f}  (threshold: {threshold})")
    print(f"  Verdict: {verdict}")
    print()
    for cat in CATEGORIES:
        mae_val = metrics["mae_per_category"].get(cat, float("nan"))
        r2_val = metrics["r2_per_category"].get(cat, float("nan"))
        print(f"    {cat:<14s}  MAE={mae_val:.6f}  R²={r2_val:.6f}")

    return {
        "split": name,
        "train_size": len(train),
        "test_size": len(test),
        "mae_per_category": metrics["mae_per_category"],
        "r2_per_category": metrics["r2_per_category"],
        "overall_mae": metrics["overall_mae"],
        "verdict": verdict,
    }


def generate_md(split_results):
    """Generate markdown report."""
    lines = [
        "# Prediction Report — Out-of-Sample Validation",
        "",
        "## Summary",
        "",
        "| Split | Train | Test | Overall MAE | Threshold | Verdict |",
        "|-------|------:|-----:|------------:|----------:|---------|",
    ]
    for sr in split_results:
        mae_str = f"{sr['overall_mae']:.6f}" if not math.isnan(sr["overall_mae"]) else "N/A"
        threshold = THRESHOLDS.get(sr["split"], "?")
        lines.append(
            f"| {sr['split']} | {sr['train_size']:,} | {sr['test_size']:,} "
            f"| {mae_str} | {threshold} | **{sr['verdict']}** |"
        )

    lines.append("")
    lines.append("## Per-Category Detail")
    lines.append("")

    for sr in split_results:
        lines.append(f"### {sr['split']}")
        lines.append("")
        lines.append("| Category | MAE | R² |")
        lines.append("|----------|----:|---:|")
        for cat in CATEGORIES:
            mae_val = sr["mae_per_category"].get(cat, float("nan"))
            r2_val = sr["r2_per_category"].get(cat, float("nan"))
            mae_s = f"{mae_val:.6f}" if not math.isnan(mae_val) else "N/A"
            r2_s = f"{r2_val:.6f}" if not math.isnan(r2_val) else "N/A"
            lines.append(f"| {cat} | {mae_s} | {r2_s} |")
        lines.append("")

    return "\n".join(lines)


def main():
    print("Loading bench results...")
    results = load_bench_results()
    print(f"  {len(results):,} results loaded")

    print("Loading chapter metadata...")
    work_meta = load_chapter_metadata()
    print(f"  {len(work_meta)} works with metadata")

    split_results = []

    # Split 1 — Random 80/20
    train, test = split_random(results)
    sr = run_split("split_1_random", train, test, THRESHOLDS["split_1_random"])
    split_results.append(sr)

    # Split 2 — By author (A-M vs N-Z)
    train, test = split_by_author(results, work_meta)
    sr = run_split("split_2_author", train, test, THRESHOLDS["split_2_author"])
    split_results.append(sr)

    # Split 3 — By language (FR+EN vs ES)
    train, test = split_by_language(results, work_meta)
    sr = run_split("split_3_language", train, test, THRESHOLDS["split_3_language"])
    split_results.append(sr)

    # Split 4 — By period (pre-1900 vs post-1900)
    train, test = split_by_period(results, work_meta)
    sr = run_split("split_4_period", train, test, THRESHOLDS["split_4_period"])
    split_results.append(sr)

    # Write JSON report
    report = {"splits": split_results}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nJSON report: {OUT_JSON}")

    # Write MD report
    md = generate_md(split_results)
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"MD report:   {OUT_MD}")

    # Final summary
    all_pass = all(sr["verdict"] == "PASS" for sr in split_results)
    print(f"\n{'='*60}")
    print(f"  FINAL: {'ALL PASS' if all_pass else 'SOME FAILED'}")
    print(f"{'='*60}")

    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
