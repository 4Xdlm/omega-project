#!/usr/bin/env python3
"""Model ablation test — remove components to identify which are necessary.

Trains 6 model variants on bench_results_v4/bench_report.json (30420 results)
and compares MAE/R2 to determine which terms are necessary (delta_mae > 0.003).

Output: bench_results_v4/ablation_report.json, bench_results_v4/ablation_report.md
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
OUT_JSON = os.path.join(BASE_DIR, "bench_results_v4", "ablation_report.json")
OUT_MD = os.path.join(BASE_DIR, "bench_results_v4", "ablation_report.md")

SEED = 42
TRAIN_RATIO = 0.80
NONLINEARITY_THRESHOLD = 0.02
NECESSITY_THRESHOLD = 0.003

CATEGORIES = {
    "MUSICALITE":   ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE":   ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL":    ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL":      ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE":  ["f27d_modal_score", "f28d_sil_score"],
    "TENSION":      ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

TOP3_CATS = ["TENSION", "INTERIORITE", "COMPLEXITE"]


# ---------------------------------------------------------------------------
# OLS helpers (no scipy)
# ---------------------------------------------------------------------------

def ols_linear(xs, ys):
    """Returns slope for y = slope * x (no intercept)."""
    num = sum(x * y for x, y in zip(xs, ys))
    den = sum(x * x for x in xs)
    if den == 0:
        return 0.0
    return num / den


def ols_quadratic(xs, ys):
    """Returns (a, b) for y = a*x^2 + b*x (no intercept).

    Normal equations for design matrix [x^2, x]:
      [sum(x^4) sum(x^3)] [a]   [sum(x^2 * y)]
      [sum(x^3) sum(x^2)] [b] = [sum(x * y)  ]
    """
    s4 = sum(x ** 4 for x in xs)
    s3 = sum(x ** 3 for x in xs)
    s2 = sum(x ** 2 for x in xs)
    s2y = sum(x * x * y for x, y in zip(xs, ys))
    s1y = sum(x * y for x, y in zip(xs, ys))

    det = s4 * s2 - s3 * s3
    if abs(det) < 1e-30:
        return 0.0, ols_linear(xs, ys)
    a = (s2y * s2 - s1y * s3) / det
    b = (s4 * s1y - s3 * s2y) / det
    return a, b


def r_squared(ys, preds):
    """Compute R^2 = 1 - SS_res / SS_tot."""
    mean_y = sum(ys) / len(ys) if ys else 0.0
    ss_tot = sum((y - mean_y) ** 2 for y in ys)
    ss_res = sum((y - p) ** 2 for y, p in zip(ys, preds))
    if ss_tot == 0:
        return 0.0
    return 1.0 - ss_res / ss_tot


def mae(ys, preds):
    """Compute mean absolute error."""
    return sum(abs(y - p) for y, p in zip(ys, preds)) / len(ys) if ys else 0.0


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_data():
    print(f"Loading bench data from {BENCH_PATH} ...")
    with open(BENCH_PATH, encoding="utf-8") as f:
        data = json.load(f)
    results = data["results"]
    print(f"  -> {len(results)} results loaded")
    return results


def load_chapter_metadata():
    """Load chapter metadata for author/language/type/year lookup."""
    meta = {}
    if not os.path.isdir(CHAPTERS_DIR):
        print(f"  WARNING: chapters dir not found: {CHAPTERS_DIR}")
        return meta
    for fname in os.listdir(CHAPTERS_DIR):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            ch = json.load(f)
        key = (ch.get("work_id", ""), ch.get("chapter_idx", 0))
        meta[key] = {
            "author": ch.get("author", ""),
            "language": ch.get("language", ""),
            "type": ch.get("type", ""),
            "year": ch.get("year", 0),
        }
    print(f"  -> {len(meta)} chapter metadata entries loaded")
    return meta


# ---------------------------------------------------------------------------
# Feature computation
# ---------------------------------------------------------------------------

def compute_category_deltas(result):
    """For each category, compute mean of abs_delta across its features."""
    deltas = result.get("deltas", {})
    cat_deltas = {}
    for cat, features in CATEGORIES.items():
        vals = []
        for feat in features:
            fd = deltas.get(feat)
            if fd is not None:
                vals.append(fd["abs_delta"])
        cat_deltas[cat] = sum(vals) / len(vals) if vals else 0.0
    return cat_deltas


# ---------------------------------------------------------------------------
# Train/test split
# ---------------------------------------------------------------------------

def split_data(results):
    """Random 80/20 split with seed 42."""
    indices = list(range(len(results)))
    random.seed(SEED)
    random.shuffle(indices)
    n_train = int(len(indices) * TRAIN_RATIO)
    train_idx = set(indices[:n_train])
    train = [results[i] for i in range(len(results)) if i in train_idx]
    test = [results[i] for i in range(len(results)) if i not in train_idx]
    print(f"  Split: {len(train)} train, {len(test)} test")
    return train, test


# ---------------------------------------------------------------------------
# Model training
# ---------------------------------------------------------------------------

def train_complete(train_data):
    """MODEL_COMPLETE: per (perturbation_type, category), fit linear and
    optionally quadratic. Use quadratic if R2 improves by > 0.02."""
    # Group by (pert, cat) -> list of (amplitude, delta)
    groups = defaultdict(lambda: ([], []))
    for r in train_data:
        cd = compute_category_deltas(r)
        pt = r["perturbation_type"]
        amp = r["amplitude"]
        for cat, delta in cd.items():
            xs, ys = groups[(pt, cat)]
            xs.append(amp)
            ys.append(delta)

    model = {}  # (pt, cat) -> {"type": "linear"|"quadratic", "slope"|"a","b": ...}
    for (pt, cat), (xs, ys) in groups.items():
        slope = ols_linear(xs, ys)
        preds_lin = [slope * x for x in xs]
        r2_lin = r_squared(ys, preds_lin)

        a, b = ols_quadratic(xs, ys)
        preds_quad = [a * x * x + b * x for x in xs]
        r2_quad = r_squared(ys, preds_quad)

        if r2_quad - r2_lin > NONLINEARITY_THRESHOLD:
            model[(pt, cat)] = {"type": "quadratic", "a": a, "b": b, "r2": r2_quad}
        else:
            model[(pt, cat)] = {"type": "linear", "slope": slope, "r2": r2_lin}

    return model


def predict_complete(model, result):
    """Predict category deltas using the complete model."""
    pt = result["perturbation_type"]
    amp = result["amplitude"]
    preds = {}
    for cat in CATEGORIES:
        key = (pt, cat)
        m = model.get(key)
        if m is None:
            preds[cat] = 0.0
        elif m["type"] == "quadratic":
            preds[cat] = m["a"] * amp * amp + m["b"] * amp
        else:
            preds[cat] = m["slope"] * amp
    return preds


def train_no_nonlinearity(train_data):
    """MODEL_NO_NONLINEARITY: force linear only."""
    groups = defaultdict(lambda: ([], []))
    for r in train_data:
        cd = compute_category_deltas(r)
        pt = r["perturbation_type"]
        amp = r["amplitude"]
        for cat, delta in cd.items():
            xs, ys = groups[(pt, cat)]
            xs.append(amp)
            ys.append(delta)

    model = {}
    for (pt, cat), (xs, ys) in groups.items():
        slope = ols_linear(xs, ys)
        model[(pt, cat)] = {"type": "linear", "slope": slope}
    return model


def predict_no_nonlinearity(model, result):
    pt = result["perturbation_type"]
    amp = result["amplitude"]
    preds = {}
    for cat in CATEGORIES:
        key = (pt, cat)
        m = model.get(key)
        preds[cat] = m["slope"] * amp if m else 0.0
    return preds


def train_simplified(train_data):
    """MODEL_SIMPLIFIED: only P03, P04, P05 — linear slopes only."""
    allowed = {"P03_COMPLEXIFY_SYNTAX", "P04_REMOVE_INTERIORITY", "P05_INJECT_SYNCOPES"}
    groups = defaultdict(lambda: ([], []))
    for r in train_data:
        pt = r["perturbation_type"]
        if pt not in allowed:
            continue
        cd = compute_category_deltas(r)
        amp = r["amplitude"]
        for cat, delta in cd.items():
            xs, ys = groups[(pt, cat)]
            xs.append(amp)
            ys.append(delta)

    model = {}
    for (pt, cat), (xs, ys) in groups.items():
        slope = ols_linear(xs, ys)
        model[(pt, cat)] = {"type": "linear", "slope": slope}
    return model


def predict_simplified(model, result):
    allowed = {"P03_COMPLEXIFY_SYNTAX", "P04_REMOVE_INTERIORITY", "P05_INJECT_SYNCOPES"}
    pt = result["perturbation_type"]
    amp = result["amplitude"]
    preds = {}
    for cat in CATEGORIES:
        if pt not in allowed:
            preds[cat] = 0.0
        else:
            key = (pt, cat)
            m = model.get(key)
            preds[cat] = m["slope"] * amp if m else 0.0
    return preds


def train_top3_cats(train_data):
    """MODEL_TOP3_CATS: only predict TENSION, INTERIORITE, COMPLEXITE."""
    groups = defaultdict(lambda: ([], []))
    for r in train_data:
        cd = compute_category_deltas(r)
        pt = r["perturbation_type"]
        amp = r["amplitude"]
        for cat, delta in cd.items():
            if cat in TOP3_CATS:
                xs, ys = groups[(pt, cat)]
                xs.append(amp)
                ys.append(delta)

    model = {}
    for (pt, cat), (xs, ys) in groups.items():
        slope = ols_linear(xs, ys)
        model[(pt, cat)] = {"type": "linear", "slope": slope}
    return model


def predict_top3_cats(model, result):
    pt = result["perturbation_type"]
    amp = result["amplitude"]
    preds = {}
    for cat in CATEGORIES:
        if cat not in TOP3_CATS:
            preds[cat] = 0.0
        else:
            key = (pt, cat)
            m = model.get(key)
            preds[cat] = m["slope"] * amp if m else 0.0
    return preds


def train_single_slope(train_data):
    """MODEL_SINGLE_SLOPE: one global slope per category (not per perturbation).

    slope[cat] = mean of per-perturbation slopes.
    """
    # First compute per-perturbation slopes
    groups = defaultdict(lambda: ([], []))
    for r in train_data:
        cd = compute_category_deltas(r)
        pt = r["perturbation_type"]
        amp = r["amplitude"]
        for cat, delta in cd.items():
            xs, ys = groups[(pt, cat)]
            xs.append(amp)
            ys.append(delta)

    per_pt_slopes = defaultdict(list)
    for (pt, cat), (xs, ys) in groups.items():
        slope = ols_linear(xs, ys)
        per_pt_slopes[cat].append(slope)

    model = {}
    for cat, slopes in per_pt_slopes.items():
        model[cat] = sum(slopes) / len(slopes) if slopes else 0.0
    return model


def predict_single_slope(model, result):
    amp = result["amplitude"]
    preds = {}
    for cat in CATEGORIES:
        preds[cat] = model.get(cat, 0.0) * amp
    return preds


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate_model(test_data, predict_fn, model):
    """Compute MAE per category and overall, plus R2."""
    actuals_per_cat = defaultdict(list)
    preds_per_cat = defaultdict(list)
    all_actuals = []
    all_preds = []

    for r in test_data:
        cd = compute_category_deltas(r)
        pred = predict_fn(model, r)
        for cat in CATEGORIES:
            a = cd[cat]
            p = pred[cat]
            actuals_per_cat[cat].append(a)
            preds_per_cat[cat].append(p)
            all_actuals.append(a)
            all_preds.append(p)

    mae_per_cat = {}
    for cat in CATEGORIES:
        mae_per_cat[cat] = mae(actuals_per_cat[cat], preds_per_cat[cat])

    overall_mae = mae(all_actuals, all_preds)
    overall_r2 = r_squared(all_actuals, all_preds)

    return {
        "mae": round(overall_mae, 6),
        "r2": round(overall_r2, 6),
        "mae_per_category": {c: round(v, 6) for c, v in mae_per_cat.items()},
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    results = load_data()
    _meta = load_chapter_metadata()
    train_data, test_data = split_data(results)

    # Define all model variants
    variants = [
        ("COMPLETE",         train_complete,        predict_complete),
        ("NO_NONLINEARITY",  train_no_nonlinearity, predict_no_nonlinearity),
        ("SIMPLIFIED",       train_simplified,      predict_simplified),
        ("TOP3_CATS",        train_top3_cats,       predict_top3_cats),
        ("SINGLE_SLOPE",     train_single_slope,    predict_single_slope),
        ("NAIVE",            None,                  None),
    ]

    evaluations = {}

    for name, train_fn, predict_fn in variants:
        print(f"\n--- {name} ---")
        if name == "NAIVE":
            # Predict 0 always
            naive_model = None
            eval_result = evaluate_model(
                test_data,
                lambda model, r: {cat: 0.0 for cat in CATEGORIES},
                naive_model,
            )
        else:
            model = train_fn(train_data)
            eval_result = evaluate_model(test_data, predict_fn, model)

        evaluations[name] = eval_result
        print(f"  MAE={eval_result['mae']:.6f}  R2={eval_result['r2']:.6f}")
        for cat, v in eval_result["mae_per_category"].items():
            print(f"    {cat}: MAE={v:.6f}")

    # Compute delta_mae vs COMPLETE
    complete_mae = evaluations["COMPLETE"]["mae"]
    for name in evaluations:
        if name != "COMPLETE":
            evaluations[name]["delta_mae"] = round(
                evaluations[name]["mae"] - complete_mae, 6
            )

    # Determine necessary/unnecessary terms
    term_map = {
        "NO_NONLINEARITY": "nonlinearity",
        "SIMPLIFIED":      "P01",
        "TOP3_CATS":       "minor_categories",
        "SINGLE_SLOPE":    "per_perturbation_slopes",
    }

    necessary = []
    unnecessary = []
    for variant_name, term_label in term_map.items():
        delta = evaluations[variant_name]["delta_mae"]
        if delta > NECESSITY_THRESHOLD:
            necessary.append(term_label)
            print(f"\n  NECESSARY: {term_label} (delta_mae={delta:.6f} > {NECESSITY_THRESHOLD})")
        else:
            unnecessary.append(term_label)
            print(f"\n  UNNECESSARY: {term_label} (delta_mae={delta:.6f} <= {NECESSITY_THRESHOLD})")

    # Build output
    report = {
        "seed": SEED,
        "train_size": len(train_data),
        "test_size": len(test_data),
        "necessity_threshold": NECESSITY_THRESHOLD,
        "nonlinearity_threshold": NONLINEARITY_THRESHOLD,
        "models": evaluations,
        "necessary_terms": sorted(necessary),
        "unnecessary_terms": sorted(unnecessary),
    }

    # Write JSON
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nJSON written: {OUT_JSON}")

    # Write MD
    lines = [
        "# Ablation Report",
        "",
        f"Seed: {SEED} | Train: {len(train_data)} | Test: {len(test_data)}",
        f"Necessity threshold: delta_mae > {NECESSITY_THRESHOLD}",
        "",
        "## Model Comparison (ranked by MAE)",
        "",
        "| Rank | Model | MAE | R2 | delta vs COMPLETE |",
        "|------|-------|-----|----|-------------------|",
    ]

    ranked = sorted(evaluations.items(), key=lambda kv: kv[1]["mae"])
    for i, (name, ev) in enumerate(ranked, 1):
        delta_str = f"{ev.get('delta_mae', 0.0):+.6f}" if name != "COMPLETE" else "---"
        lines.append(
            f"| {i} | {name} | {ev['mae']:.6f} | {ev['r2']:.6f} | {delta_str} |"
        )

    lines.extend([
        "",
        "## MAE per Category (COMPLETE model)",
        "",
        "| Category | MAE |",
        "|----------|-----|",
    ])
    for cat, v in evaluations["COMPLETE"]["mae_per_category"].items():
        lines.append(f"| {cat} | {v:.6f} |")

    lines.extend([
        "",
        "## Necessity Verdict",
        "",
        f"**Necessary terms** (removing increases MAE by > {NECESSITY_THRESHOLD}):",
        "",
    ])
    for t in sorted(necessary):
        lines.append(f"- {t}")
    if not necessary:
        lines.append("- (none)")

    lines.extend([
        "",
        f"**Unnecessary terms** (removing increases MAE by <= {NECESSITY_THRESHOLD}):",
        "",
    ])
    for t in sorted(unnecessary):
        lines.append(f"- {t}")
    if not unnecessary:
        lines.append("- (none)")

    lines.append("")

    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"MD  written: {OUT_MD}")


if __name__ == "__main__":
    main()
