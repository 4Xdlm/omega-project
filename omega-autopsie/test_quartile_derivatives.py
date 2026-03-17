#!/usr/bin/env python3
"""
OMEGA — Quartile Derivative Test — Perturbation sensitivity by narrative position
Phase W — Mission Q

Tests whether perturbation effects vary by narrative quartile position.
For each chapter, splits into 4 quartiles (Q1-Q4), perturbs ONE quartile
at a time, measures feature deltas on the full reassembled text.

Hypothesis: Q3 (climax) may be more sensitive than Q1 (setup).

200 chapters × 4 perturbation types × 4 quartiles = 3200 measurements.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import time
import math
import hashlib
import random
from datetime import datetime
from statistics import mean, stdev

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from speed_analyzer import analyze, FEATURE_KEYS
from perturbation_engine import apply_perturbation

# ── Config ────────────────────────────────────────────────────────────────────

CHAPTERS_DIR = os.path.join(BASE_DIR, "results_v4", "chapters")
OUT_DIR = os.path.join(BASE_DIR, "bench_results_v4")

SEED = 42
TARGET_CHAPTERS = 200
AMPLITUDE = 0.50

PERTURBATION_TYPES = [
    "P01_UNIFORMIZE_RHYTHM",
    "P03_COMPLEXIFY_SYNTAX",
    "P04_REMOVE_INTERIORITY",
    "P05_INJECT_SYNCOPES",
]

QUARTILE_LABELS = ["Q1", "Q2", "Q3", "Q4"]

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

PROGRESS_EVERY = 20


# ── Quartile splitting ────────────────────────────────────────────────────────

def split_quartiles(text: str):
    """Split text into 4 quartiles by word count. Returns list of 4 strings."""
    words = text.split()
    n = len(words)
    q_size = n // 4
    quartiles = []
    for i in range(4):
        start = i * q_size
        end = (i + 1) * q_size if i < 3 else n
        quartiles.append(" ".join(words[start:end]))
    return quartiles


def reassemble_with_perturbed_quartile(quartiles, qi, perturbed_qi_text):
    """Replace quartile qi with perturbed text, return full reassembled text."""
    parts = list(quartiles)
    parts[qi] = perturbed_qi_text
    return " ".join(parts)


# ── Chapter loading ───────────────────────────────────────────────────────────

def load_sampled_chapters(target_n: int, seed: int):
    """Load ~target_n chapters, evenly sampled (every Kth file, sorted)."""
    if not os.path.isdir(CHAPTERS_DIR):
        print(f"[QUARTILE] ERROR: chapters dir not found: {CHAPTERS_DIR}")
        return []

    files = sorted(f for f in os.listdir(CHAPTERS_DIR) if f.endswith(".json"))
    total = len(files)
    if total == 0:
        return []

    step = max(1, total // target_n)
    selected_files = files[::step][:target_n]

    chapters = []
    for fname in selected_files:
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        text = data.get("text", "")
        if text and len(text.split()) >= 500:
            chapters.append({
                "filename": fname,
                "text": text,
                "work_id": data.get("work_id", fname.rsplit("_ch", 1)[0]),
            })

    return chapters


# ── Delta computation ─────────────────────────────────────────────────────────

def compute_feature_deltas(baseline: dict, perturbed: dict) -> dict:
    """Compute signed delta for each feature."""
    deltas = {}
    for k in FEATURE_KEYS:
        bv = baseline.get(k, 0.0)
        pv = perturbed.get(k, 0.0)
        deltas[k] = pv - bv
    return deltas


def compute_category_delta(deltas: dict, features: list) -> float:
    """Category delta = mean of |delta| for the features in that category."""
    vals = [abs(deltas.get(f, 0.0)) for f in features]
    return mean(vals) if vals else 0.0


# ── Confidence interval ──────────────────────────────────────────────────────

def mean_ci(values, confidence=0.95):
    """Return (mean, ci_low, ci_high) using t-distribution approximation."""
    n = len(values)
    if n == 0:
        return 0.0, 0.0, 0.0
    m = mean(values)
    if n < 2:
        return m, m, m
    se = stdev(values) / math.sqrt(n)
    # z-approx for 95% CI
    z = 1.96
    return m, m - z * se, m + z * se


# ── Main bench ────────────────────────────────────────────────────────────────

def run_quartile_bench():
    random.seed(SEED)
    t_start = time.perf_counter()

    print(f"[QUARTILE] Loading ~{TARGET_CHAPTERS} chapters from {CHAPTERS_DIR}")
    chapters = load_sampled_chapters(TARGET_CHAPTERS, SEED)
    n_chapters = len(chapters)
    print(f"[QUARTILE] Loaded {n_chapters} chapters (>= 500 words each)")
    print(f"[QUARTILE] Perturbation types: {PERTURBATION_TYPES}")
    print(f"[QUARTILE] Amplitude: {AMPLITUDE}")
    n_total = n_chapters * len(PERTURBATION_TYPES) * 4
    print(f"[QUARTILE] Expected measurements: {n_total}")
    print()

    # Storage: measurements[ptype][quartile_label] = list of category_deltas dicts
    measurements = {}
    for ptype in PERTURBATION_TYPES:
        measurements[ptype] = {q: [] for q in QUARTILE_LABELS}

    skipped = 0

    for ci, chapter in enumerate(chapters):
        text = chapter["text"]

        # Compute baseline features on full original text
        baseline = analyze(text)

        # Split into quartiles
        quartiles = split_quartiles(text)

        # Check all quartiles have reasonable length
        min_q_words = min(len(q.split()) for q in quartiles)
        if min_q_words < 50:
            skipped += 1
            continue

        for ptype in PERTURBATION_TYPES:
            for qi in range(4):
                qlabel = QUARTILE_LABELS[qi]

                # Perturb only this quartile
                perturbed_q_text, _meta = apply_perturbation(
                    quartiles[qi], ptype, AMPLITUDE
                )

                # Reassemble full text with perturbed quartile
                full_modified = reassemble_with_perturbed_quartile(
                    quartiles, qi, perturbed_q_text
                )

                # Measure features on full modified text
                perturbed_features = analyze(full_modified)

                # Compute deltas
                deltas = compute_feature_deltas(baseline, perturbed_features)

                # Compute category deltas
                cat_deltas = {}
                for cat_name, cat_features in CATEGORIES.items():
                    cat_deltas[cat_name] = compute_category_delta(deltas, cat_features)

                measurements[ptype][qlabel].append(cat_deltas)

        if (ci + 1) % PROGRESS_EVERY == 0:
            elapsed = time.perf_counter() - t_start
            pct = (ci + 1) / n_chapters * 100
            rate = (ci + 1) / elapsed
            eta = (n_chapters - ci - 1) / rate if rate > 0 else 0
            print(f"[QUARTILE] {ci+1}/{n_chapters} chapters ({pct:.0f}%) "
                  f"— {elapsed:.0f}s elapsed, ETA {eta:.0f}s")

    total_time = time.perf_counter() - t_start
    n_actual = sum(
        len(measurements[p][q])
        for p in PERTURBATION_TYPES
        for q in QUARTILE_LABELS
    )
    print(f"\n[QUARTILE] Completed: {n_actual} measurements in {total_time:.1f}s")
    if skipped:
        print(f"[QUARTILE] Skipped {skipped} chapters (quartile too short)")

    # ── Aggregate results ─────────────────────────────────────────────────────

    results = {}

    for ptype in PERTURBATION_TYPES:
        results[ptype] = {}
        for cat_name in CATEGORIES:
            quartile_stats = {}
            all_means = []

            for qlabel in QUARTILE_LABELS:
                vals = [m[cat_name] for m in measurements[ptype][qlabel]]
                m, ci_lo, ci_hi = mean_ci(vals)
                quartile_stats[qlabel] = {
                    "mean_delta": round(m, 6),
                    "ci_low": round(ci_lo, 6),
                    "ci_high": round(ci_hi, 6),
                    "n_samples": len(vals),
                }
                all_means.append((qlabel, m))

            # Determine strongest quartile
            strongest = max(all_means, key=lambda x: x[1])
            weakest = min(all_means, key=lambda x: x[1])

            # Quartile-dependent if strongest is >20% above weakest
            ratio = strongest[1] / weakest[1] if weakest[1] > 1e-9 else 1.0
            quartile_dependent = ratio > 1.20

            results[ptype][cat_name] = {
                "quartiles": quartile_stats,
                "strongest_quartile": strongest[0],
                "weakest_quartile": weakest[0],
                "strongest_to_weakest_ratio": round(ratio, 4),
                "quartile_dependent": quartile_dependent,
            }

    # ── Build JSON output ─────────────────────────────────────────────────────

    os.makedirs(OUT_DIR, exist_ok=True)

    report = {
        "bench_id": hashlib.sha256(
            f"quartile_derivatives|{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12],
        "timestamp": datetime.now().isoformat(),
        "config": {
            "target_chapters": TARGET_CHAPTERS,
            "actual_chapters": n_chapters - skipped,
            "skipped": skipped,
            "amplitude": AMPLITUDE,
            "perturbation_types": PERTURBATION_TYPES,
            "categories": {k: v for k, v in CATEGORIES.items()},
            "seed": SEED,
            "total_measurements": n_actual,
        },
        "performance": {
            "total_time_s": round(total_time, 3),
            "avg_per_chapter_s": round(total_time / max(1, n_chapters - skipped), 3),
        },
        "results": results,
    }

    json_path = os.path.join(OUT_DIR, "quartile_derivatives.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"[QUARTILE] JSON saved: {json_path}")

    # ── Build markdown report ─────────────────────────────────────────────────

    md_lines = []
    md_lines.append("# Quartile Derivative Analysis")
    md_lines.append("")
    md_lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    md_lines.append(f"**Chapters**: {n_chapters - skipped} | "
                    f"**Amplitude**: {AMPLITUDE} | "
                    f"**Measurements**: {n_actual}")
    md_lines.append(f"**Time**: {total_time:.0f}s")
    md_lines.append("")
    md_lines.append("## Hypothesis")
    md_lines.append("")
    md_lines.append("Does perturbation sensitivity vary by narrative position? "
                    "Is Q3 (climax) more sensitive than Q1 (setup)?")
    md_lines.append("")

    for ptype in PERTURBATION_TYPES:
        short_name = ptype.split("_", 1)[1] if "_" in ptype else ptype
        md_lines.append(f"## {short_name}")
        md_lines.append("")
        md_lines.append("| Category | Q1 (setup) | Q2 (develop) | Q3 (climax) | Q4 (resolution) | Strongest | Dependent? |")
        md_lines.append("|----------|-----------|-------------|------------|-----------------|-----------|------------|")

        for cat_name in CATEGORIES:
            r = results[ptype][cat_name]
            qs = r["quartiles"]

            def fmt_q(qlabel):
                q = qs[qlabel]
                val = q["mean_delta"]
                marker = " **" if qlabel == r["strongest_quartile"] else " "
                end_marker = "**" if qlabel == r["strongest_quartile"] else ""
                return f"{marker}{val:.4f}{end_marker}"

            dep_mark = "YES" if r["quartile_dependent"] else "no"
            row = (f"| {cat_name} "
                   f"| {fmt_q('Q1')} "
                   f"| {fmt_q('Q2')} "
                   f"| {fmt_q('Q3')} "
                   f"| {fmt_q('Q4')} "
                   f"| {r['strongest_quartile']} "
                   f"| {dep_mark} |")
            md_lines.append(row)

        md_lines.append("")

    # Summary: count how often Q3 is strongest
    q3_strongest_count = 0
    total_combos = 0
    dependent_count = 0
    for ptype in PERTURBATION_TYPES:
        for cat_name in CATEGORIES:
            r = results[ptype][cat_name]
            total_combos += 1
            if r["strongest_quartile"] == "Q3":
                q3_strongest_count += 1
            if r["quartile_dependent"]:
                dependent_count += 1

    md_lines.append("## Summary")
    md_lines.append("")
    md_lines.append(f"- **Q3 strongest**: {q3_strongest_count}/{total_combos} "
                    f"({q3_strongest_count/total_combos*100:.0f}%) of (perturbation, category) pairs")
    md_lines.append(f"- **Quartile-dependent**: {dependent_count}/{total_combos} "
                    f"({dependent_count/total_combos*100:.0f}%) pairs show >20% variation across quartiles")
    md_lines.append("")

    # Strongest quartile distribution
    q_counts = {q: 0 for q in QUARTILE_LABELS}
    for ptype in PERTURBATION_TYPES:
        for cat_name in CATEGORIES:
            sq = results[ptype][cat_name]["strongest_quartile"]
            q_counts[sq] += 1

    md_lines.append("### Strongest quartile distribution")
    md_lines.append("")
    for q in QUARTILE_LABELS:
        bar = "#" * q_counts[q]
        md_lines.append(f"- {q}: {q_counts[q]} {bar}")
    md_lines.append("")

    md_path = os.path.join(OUT_DIR, "quartile_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"[QUARTILE] Report saved: {md_path}")

    print(f"\n[QUARTILE] DONE.")


if __name__ == "__main__":
    run_quartile_bench()
