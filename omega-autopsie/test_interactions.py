#!/usr/bin/env python3
"""
OMEGA — Perturbation Interaction Tester
Phase W — Mission: test interaction effects between pairs of perturbations.

For each pair (Pa, Pb) at amplitude 0.50, applies:
  - Pa alone, Pb alone, Pa->Pb sequential, Pb->Pa sequential
then classifies interactions as SYNERGY / ANTAGONISM / ADDITIVE.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import time
import random
import numpy as np
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _DIR)

from perturbation_engine import apply_perturbation
from speed_analyzer import analyze

# ── Constants ────────────────────────────────────────────────────────────────

SEED = 42
AMPLITUDE = 0.50

PAIRS = [
    ("P01_UNIFORMIZE_RHYTHM", "P03_COMPLEXIFY_SYNTAX"),
    ("P01_UNIFORMIZE_RHYTHM", "P05_INJECT_SYNCOPES"),
    ("P03_COMPLEXIFY_SYNTAX", "P04_REMOVE_INTERIORITY"),
    ("P03_COMPLEXIFY_SYNTAX", "P05_INJECT_SYNCOPES"),
    ("P04_REMOVE_INTERIORITY", "P05_INJECT_SYNCOPES"),
    ("P01_UNIFORMIZE_RHYTHM", "P04_REMOVE_INTERIORITY"),
]

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

SYNERGY_THRESHOLD = 0.02
ANTAGONISM_THRESHOLD = -0.02
COMMUTATIVE_THRESHOLD = 0.05

CHAPTERS_DIR = os.path.join(_DIR, "results_v4", "chapters")
OUTPUT_DIR = os.path.join(_DIR, "bench_results_v4")


# ── Helpers ──────────────────────────────────────────────────────────────────

def compute_category_deltas(baseline_feats: dict, perturbed_feats: dict) -> dict:
    """Compute per-category delta = mean of |feature_perturbed - feature_baseline|."""
    deltas = {}
    for cat, features in CATEGORIES.items():
        abs_diffs = []
        for f in features:
            bv = baseline_feats.get(f, 0.0) or 0.0
            pv = perturbed_feats.get(f, 0.0) or 0.0
            abs_diffs.append(pv - bv)  # signed delta, not abs
        deltas[cat] = round(np.mean(abs_diffs), 6) if abs_diffs else 0.0
    return deltas


def add_deltas(d1: dict, d2: dict) -> dict:
    """Element-wise sum of two delta dicts."""
    return {k: round(d1.get(k, 0.0) + d2.get(k, 0.0), 6) for k in CATEGORIES}


def sub_deltas(d1: dict, d2: dict) -> dict:
    """Element-wise difference d1 - d2."""
    return {k: round(d1.get(k, 0.0) - d2.get(k, 0.0), 6) for k in CATEGORIES}


def abs_deltas(d: dict) -> dict:
    """Element-wise absolute value."""
    return {k: abs(v) for k, v in d.items()}


def classify_interaction(interaction_delta: float) -> str:
    if interaction_delta > SYNERGY_THRESHOLD:
        return "SYNERGY"
    elif interaction_delta < ANTAGONISM_THRESHOLD:
        return "ANTAGONISM"
    else:
        return "ADDITIVE"


def load_chapters(n_target: int = 100) -> list:
    """Load ~n_target chapters, well distributed (every Nth file sorted alphabetically)."""
    files = sorted(f for f in os.listdir(CHAPTERS_DIR) if f.endswith(".json"))
    if not files:
        raise FileNotFoundError(f"No chapter files found in {CHAPTERS_DIR}")

    step = max(1, len(files) // n_target)
    selected = files[::step][:n_target]

    chapters = []
    for fname in selected:
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        text = data.get("text", "")
        if len(text.split()) < 200:
            continue
        chapters.append({
            "file": fname,
            "text": text,
            "author": data.get("author", "unknown"),
            "title": data.get("title", "unknown"),
            "chapter_idx": data.get("chapter_idx", 0),
        })
    return chapters


# ── Main analysis ────────────────────────────────────────────────────────────

def run_interactions():
    random.seed(SEED)
    np.random.seed(SEED)

    print(f"[INTERACTION TEST] Start: {datetime.now().isoformat()}")
    print(f"[INTERACTION TEST] Amplitude: {AMPLITUDE}, Pairs: {len(PAIRS)}")

    # Load chapters
    chapters = load_chapters(100)
    print(f"[INTERACTION TEST] Loaded {len(chapters)} chapters from {CHAPTERS_DIR}")

    t_start = time.time()
    analyze_calls = 0

    # Results storage
    pair_results = {}
    for pa, pb in PAIRS:
        pair_key = f"{pa}+{pb}"
        pair_results[pair_key] = {
            "pa": pa,
            "pb": pb,
            "per_chapter": [],
            "category_interactions": {cat: [] for cat in CATEGORIES},
            "category_commutative": {cat: [] for cat in CATEGORIES},
            "classifications": {cat: {"SYNERGY": 0, "ANTAGONISM": 0, "ADDITIVE": 0} for cat in CATEGORIES},
        }

    for ch_idx, chapter in enumerate(chapters):
        text = chapter["text"]

        # Baseline features (one analyze call per chapter, shared across pairs)
        baseline_feats = analyze(text)
        analyze_calls += 1

        for pa, pb in PAIRS:
            pair_key = f"{pa}+{pb}"

            # Apply Pa alone
            text_a, _ = apply_perturbation(text, pa, AMPLITUDE)
            feats_a = analyze(text_a)
            analyze_calls += 1
            delta_a = compute_category_deltas(baseline_feats, feats_a)

            # Apply Pb alone
            text_b, _ = apply_perturbation(text, pb, AMPLITUDE)
            feats_b = analyze(text_b)
            analyze_calls += 1
            delta_b = compute_category_deltas(baseline_feats, feats_b)

            # Apply Pa then Pb (forward)
            text_ab, _ = apply_perturbation(text, pa, AMPLITUDE)
            text_ab, _ = apply_perturbation(text_ab, pb, AMPLITUDE)
            feats_ab = analyze(text_ab)
            analyze_calls += 1
            delta_ab_forward = compute_category_deltas(baseline_feats, feats_ab)

            # Apply Pb then Pa (reverse)
            text_ba, _ = apply_perturbation(text, pb, AMPLITUDE)
            text_ba, _ = apply_perturbation(text_ba, pa, AMPLITUDE)
            feats_ba = analyze(text_ba)
            analyze_calls += 1
            delta_ab_reverse = compute_category_deltas(baseline_feats, feats_ba)

            # Compute interaction effects
            expected_additive = add_deltas(delta_a, delta_b)
            interaction = sub_deltas(delta_ab_forward, expected_additive)
            commutative_diff = sub_deltas(delta_ab_forward, delta_ab_reverse)

            chapter_record = {
                "file": chapter["file"],
                "author": chapter["author"],
                "delta_a": delta_a,
                "delta_b": delta_b,
                "delta_ab_forward": delta_ab_forward,
                "delta_ab_reverse": delta_ab_reverse,
                "expected_additive": expected_additive,
                "interaction": interaction,
                "commutative_diff": commutative_diff,
            }
            pair_results[pair_key]["per_chapter"].append(chapter_record)

            # Accumulate per-category
            for cat in CATEGORIES:
                pair_results[pair_key]["category_interactions"][cat].append(interaction[cat])
                pair_results[pair_key]["category_commutative"][cat].append(
                    abs(commutative_diff[cat]) < COMMUTATIVE_THRESHOLD
                )
                cls = classify_interaction(interaction[cat])
                pair_results[pair_key]["classifications"][cat][cls] += 1

        if (ch_idx + 1) % 10 == 0:
            elapsed = time.time() - t_start
            rate = analyze_calls / elapsed if elapsed > 0 else 0
            print(f"  [{ch_idx + 1}/{len(chapters)}] "
                  f"{analyze_calls} analyze calls, "
                  f"{elapsed:.1f}s elapsed, "
                  f"{rate:.1f} calls/s")

    total_time = time.time() - t_start
    print(f"[INTERACTION TEST] Done: {analyze_calls} analyze calls in {total_time:.1f}s")

    # ── Aggregate summaries ──────────────────────────────────────────────────

    summary = {}
    for pair_key, pr in pair_results.items():
        pair_summary = {
            "pa": pr["pa"],
            "pb": pr["pb"],
            "n_chapters": len(pr["per_chapter"]),
            "categories": {},
        }
        for cat in CATEGORIES:
            vals = pr["category_interactions"][cat]
            comm = pr["category_commutative"][cat]
            n = len(vals)
            if n == 0:
                continue
            mean_interaction = float(np.mean(vals))
            std_interaction = float(np.std(vals))
            commutative_pct = sum(comm) / n * 100.0

            cls_counts = pr["classifications"][cat]
            dominant = max(cls_counts, key=cls_counts.get)

            pair_summary["categories"][cat] = {
                "mean_interaction": round(mean_interaction, 5),
                "std_interaction": round(std_interaction, 5),
                "dominant_class": dominant,
                "synergy_pct": round(cls_counts["SYNERGY"] / n * 100, 1),
                "antagonism_pct": round(cls_counts["ANTAGONISM"] / n * 100, 1),
                "additive_pct": round(cls_counts["ADDITIVE"] / n * 100, 1),
                "commutative_pct": round(commutative_pct, 1),
            }
        summary[pair_key] = pair_summary

    # ── Output JSON ──────────────────────────────────────────────────────────

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    output = {
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "amplitude": AMPLITUDE,
            "n_chapters": len(chapters),
            "n_pairs": len(PAIRS),
            "total_analyze_calls": analyze_calls,
            "total_time_s": round(total_time, 1),
            "seed": SEED,
            "synergy_threshold": SYNERGY_THRESHOLD,
            "antagonism_threshold": ANTAGONISM_THRESHOLD,
            "commutative_threshold": COMMUTATIVE_THRESHOLD,
        },
        "summary": summary,
        "detail": {k: v["per_chapter"] for k, v in pair_results.items()},
    }

    json_path = os.path.join(OUTPUT_DIR, "interactions_report.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"[INTERACTION TEST] JSON -> {json_path}")

    # ── Output Markdown ──────────────────────────────────────────────────────

    md_lines = [
        "# Perturbation Interaction Report",
        "",
        f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"**Amplitude**: {AMPLITUDE} | **Chapters**: {len(chapters)} | "
        f"**Pairs**: {len(PAIRS)} | **Analyze calls**: {analyze_calls}",
        f"**Time**: {total_time:.1f}s | **Seed**: {SEED}",
        "",
        "## Classification thresholds",
        "",
        f"- SYNERGY: interaction > +{SYNERGY_THRESHOLD}",
        f"- ANTAGONISM: interaction < {ANTAGONISM_THRESHOLD}",
        f"- ADDITIVE: otherwise",
        f"- Commutative: |forward - reverse| < {COMMUTATIVE_THRESHOLD}",
        "",
    ]

    for pair_key, ps in summary.items():
        md_lines.append(f"## {ps['pa']} + {ps['pb']}")
        md_lines.append("")
        md_lines.append(f"Chapters: {ps['n_chapters']}")
        md_lines.append("")
        md_lines.append("| Category | Mean Interaction | Std | Dominant | Syn% | Ant% | Add% | Comm% |")
        md_lines.append("|----------|-----------------|-----|----------|------|------|------|-------|")

        for cat, cs in ps["categories"].items():
            md_lines.append(
                f"| {cat} | {cs['mean_interaction']:+.5f} | {cs['std_interaction']:.5f} | "
                f"{cs['dominant_class']} | {cs['synergy_pct']:.1f} | "
                f"{cs['antagonism_pct']:.1f} | {cs['additive_pct']:.1f} | "
                f"{cs['commutative_pct']:.1f} |"
            )
        md_lines.append("")

    # Global summary table
    md_lines.append("## Global Summary")
    md_lines.append("")
    md_lines.append("| Pair | Synergistic cats | Antagonistic cats | Additive cats | Non-commutative cats |")
    md_lines.append("|------|-----------------|-------------------|---------------|---------------------|")

    for pair_key, ps in summary.items():
        syn_cats = [c for c, cs in ps["categories"].items() if cs["dominant_class"] == "SYNERGY"]
        ant_cats = [c for c, cs in ps["categories"].items() if cs["dominant_class"] == "ANTAGONISM"]
        add_cats = [c for c, cs in ps["categories"].items() if cs["dominant_class"] == "ADDITIVE"]
        noncomm_cats = [c for c, cs in ps["categories"].items() if cs["commutative_pct"] < 80.0]
        md_lines.append(
            f"| {pair_key} | {', '.join(syn_cats) or '-'} | "
            f"{', '.join(ant_cats) or '-'} | {', '.join(add_cats) or '-'} | "
            f"{', '.join(noncomm_cats) or '-'} |"
        )
    md_lines.append("")

    md_path = os.path.join(OUTPUT_DIR, "interactions_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"[INTERACTION TEST] Markdown -> {md_path}")

    return output


if __name__ == "__main__":
    run_interactions()
