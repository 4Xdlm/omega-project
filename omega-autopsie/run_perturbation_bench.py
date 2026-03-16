#!/usr/bin/env python3
"""
OMEGA — Perturbation Bench — Orchestrator
Phase W — Mission 5

Runs perturbation_engine on extracted chapters, measures feature deltas,
and produces a structured JSON report.

Usage:
  python run_perturbation_bench.py [--works N] [--chapters N] [--amplitudes A1,A2,...] [--types T1,T2,...] [--outdir DIR]

Default (pilot): 3 works × 2 chapters × 7 types × 3 amplitudes = 126 perturbations

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import time
import hashlib
import argparse
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from speed_analyzer import analyze, FEATURE_KEYS
from perturbation_engine import (
    PERTURBATION_TYPES, CALC_TYPES, apply_perturbation,
    amplitude_label, AMPLITUDE_LEVELS
)

# ── Config ────────────────────────────────────────────────────────────────────

CHAPTERS_DIR = os.path.join(os.path.dirname(__file__), "results_v4", "chapters")
DEFAULT_OUT_DIR = os.path.join(os.path.dirname(__file__), "bench_results")

DEFAULT_AMPLITUDES = [0.10, 0.25, 0.50]
PILOT_WORKS = 3
PILOT_CHAPTERS = 2


# ── Chapter loading ───────────────────────────────────────────────────────────

def load_chapters(max_works: int = None, max_chapters_per_work: int = None) -> list:
    """Load chapter JSONs grouped by work. Returns list of {work_id, chapters: [{...}]}."""
    if not os.path.isdir(CHAPTERS_DIR):
        print(f"[BENCH] ERROR: chapters dir not found: {CHAPTERS_DIR}")
        return []

    files = sorted(f for f in os.listdir(CHAPTERS_DIR) if f.endswith(".json"))
    # Group by work_id
    works = {}
    for fname in files:
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        wid = data.get("work_id", fname.rsplit("_ch", 1)[0])
        if wid not in works:
            works[wid] = []
        works[wid].append(data)

    # Apply limits
    work_ids = sorted(works.keys())
    if max_works:
        work_ids = work_ids[:max_works]

    result = []
    for wid in work_ids:
        chapters = works[wid]
        if max_chapters_per_work:
            chapters = chapters[:max_chapters_per_work]
        result.append({"work_id": wid, "chapters": chapters})

    return result


# ── Delta computation ─────────────────────────────────────────────────────────

def compute_deltas(baseline: dict, perturbed: dict) -> dict:
    """Compute absolute and relative deltas for all features."""
    deltas = {}
    for k in FEATURE_KEYS:
        bv = baseline.get(k, 0)
        pv = perturbed.get(k, 0)
        abs_delta = pv - bv
        if bv != 0:
            rel_delta = abs_delta / abs(bv)
        else:
            rel_delta = abs_delta  # Can't divide by zero
        deltas[k] = {
            "baseline": round(bv, 6),
            "perturbed": round(pv, 6),
            "abs_delta": round(abs_delta, 6),
            "rel_delta": round(rel_delta, 6),
        }
    return deltas


# ── Main bench ────────────────────────────────────────────────────────────────

def run_bench(works_data: list, amplitudes: list, types: list, out_dir: str) -> dict:
    """Run perturbation bench. Returns full report dict."""
    os.makedirs(out_dir, exist_ok=True)

    total_perturbations = 0
    total_time = 0
    results = []

    n_works = len(works_data)
    n_chapters_total = sum(len(w["chapters"]) for w in works_data)
    n_expected = n_chapters_total * len(types) * len(amplitudes)

    print(f"[BENCH] {n_works} works, {n_chapters_total} chapters, "
          f"{len(types)} types, {len(amplitudes)} amplitudes")
    print(f"[BENCH] Expected perturbations: {n_expected}")
    print()

    for wi, work in enumerate(works_data):
        wid = work["work_id"]
        print(f"[BENCH] Work {wi+1}/{n_works}: {wid} ({len(work['chapters'])} chapters)")

        for ci, chapter in enumerate(work["chapters"]):
            text = chapter.get("text", "")
            if not text or len(text.split()) < 500:
                print(f"  ch{ci}: SKIP (too short)")
                continue

            # Use stored baseline or recompute
            baseline = chapter.get("baseline_features")
            if not baseline:
                baseline = analyze(text)

            ch_title = chapter.get("chapter_title", f"ch{ci}")
            print(f"  ch{ci} ({ch_title[:40]}): ", end="", flush=True)

            for ptype in types:
                for amp in amplitudes:
                    t0 = time.perf_counter()

                    perturbed_text, meta = apply_perturbation(text, ptype, amp)
                    perturbed_features = analyze(perturbed_text)
                    deltas = compute_deltas(baseline, perturbed_features)

                    dt = time.perf_counter() - t0
                    total_time += dt
                    total_perturbations += 1

                    entry = {
                        "work_id": wid,
                        "chapter_idx": ci,
                        "chapter_title": ch_title[:80],
                        "perturbation_type": ptype,
                        "amplitude": amp,
                        "amplitude_label": amplitude_label(amp),
                        "meta": meta,
                        "deltas": deltas,
                        "text_hash_before": hashlib.sha256(text.encode()).hexdigest()[:16],
                        "text_hash_after": hashlib.sha256(perturbed_text.encode()).hexdigest()[:16],
                        "word_count_before": len(text.split()),
                        "word_count_after": len(perturbed_text.split()),
                        "time_s": round(dt, 4),
                    }
                    results.append(entry)

            print(f"{len(types)*len(amplitudes)} perturbations done")

    # ── Build report ──────────────────────────────────────────────────────────
    report = {
        "bench_id": hashlib.sha256(
            f"{datetime.now().isoformat()}|{total_perturbations}".encode()
        ).hexdigest()[:12],
        "timestamp": datetime.now().isoformat(),
        "config": {
            "works": n_works,
            "chapters": n_chapters_total,
            "types": types,
            "amplitudes": amplitudes,
            "total_perturbations": total_perturbations,
        },
        "performance": {
            "total_time_s": round(total_time, 3),
            "avg_time_per_perturbation_s": round(total_time / max(1, total_perturbations), 4),
        },
        "results": results,
    }

    # ── Aggregate statistics ──────────────────────────────────────────────────
    agg = {}
    for ptype in types:
        agg[ptype] = {}
        for amp in amplitudes:
            amp_key = f"{amp:.2f}"
            entries = [r for r in results if r["perturbation_type"] == ptype and r["amplitude"] == amp]
            if not entries:
                continue
            # Average deltas per feature
            avg_deltas = {}
            for k in FEATURE_KEYS:
                abs_vals = [e["deltas"][k]["abs_delta"] for e in entries if k in e["deltas"]]
                rel_vals = [e["deltas"][k]["rel_delta"] for e in entries if k in e["deltas"]]
                if abs_vals:
                    avg_deltas[k] = {
                        "mean_abs_delta": round(sum(abs_vals) / len(abs_vals), 6),
                        "mean_rel_delta": round(sum(rel_vals) / len(rel_vals), 6),
                    }
            agg[ptype][amp_key] = {
                "n_samples": len(entries),
                "avg_deltas": avg_deltas,
            }
    report["aggregates"] = agg

    # ── Save ──────────────────────────────────────────────────────────────────
    report_path = os.path.join(out_dir, "bench_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # Save summary (lighter)
    summary = {
        "bench_id": report["bench_id"],
        "timestamp": report["timestamp"],
        "config": report["config"],
        "performance": report["performance"],
        "aggregates": report["aggregates"],
    }
    summary_path = os.path.join(out_dir, "bench_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n[BENCH] DONE: {total_perturbations} perturbations in {total_time:.1f}s")
    print(f"[BENCH] Report: {report_path}")
    print(f"[BENCH] Summary: {summary_path}")

    return report


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="OMEGA Perturbation Bench")
    parser.add_argument("--works", type=int, default=PILOT_WORKS,
                        help=f"Number of works (default: {PILOT_WORKS})")
    parser.add_argument("--chapters", type=int, default=PILOT_CHAPTERS,
                        help=f"Chapters per work (default: {PILOT_CHAPTERS})")
    parser.add_argument("--amplitudes", type=str, default=None,
                        help="Comma-separated amplitudes (default: 0.10,0.25,0.50)")
    parser.add_argument("--types", type=str, default=None,
                        help="Comma-separated types (default: all 7)")
    parser.add_argument("--outdir", type=str, default=DEFAULT_OUT_DIR,
                        help=f"Output directory (default: {DEFAULT_OUT_DIR})")
    args = parser.parse_args()

    amplitudes = DEFAULT_AMPLITUDES
    if args.amplitudes:
        amplitudes = [float(x.strip()) for x in args.amplitudes.split(",")]

    types = CALC_TYPES
    if args.types:
        types = [x.strip() for x in args.types.split(",")]
        for t in types:
            if t not in PERTURBATION_TYPES:
                print(f"ERROR: Unknown type '{t}'. Available: {CALC_TYPES}")
                sys.exit(1)

    works_data = load_chapters(max_works=args.works, max_chapters_per_work=args.chapters)
    if not works_data:
        print("[BENCH] No chapters found. Run extract_chapters.py first.")
        sys.exit(1)

    print(f"[BENCH] Starting bench: {args.works} works × {args.chapters} ch × "
          f"{len(types)} types × {len(amplitudes)} amp")
    print(f"[BENCH] Output: {args.outdir}")
    print()

    run_bench(works_data, amplitudes, types, args.outdir)


if __name__ == "__main__":
    main()
