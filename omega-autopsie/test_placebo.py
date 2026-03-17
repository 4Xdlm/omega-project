#!/usr/bin/env python3
"""
OMEGA — Placebo Perturbation Test
Validates measurement pipeline with 3 near-zero-delta perturbations.

PLACEBO_1: Paragraph permutation (swap paragraphs 1 & 2)
PLACEBO_2: Cosmetic reformatting (trailing spaces, ellipsis style, em-dash)
PLACEBO_3: Identity substitution (text_after = text_before, deltas MUST be 0)

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import random
import time
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from speed_analyzer import analyze, FEATURE_KEYS

# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════

CATEGORIES = {
    "MUSICALITE":   ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE":   ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL":    ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL":      ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE":  ["f27d_modal_score", "f28d_sil_score"],
    "TENSION":      ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# PLACEBO PERTURBATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def placebo_1_paragraph_permutation(text: str) -> str:
    """Swap paragraphs at index 1 and 2 (if enough paragraphs)."""
    paragraphs = text.split("\n\n")
    if len(paragraphs) >= 3:
        paragraphs[1], paragraphs[2] = paragraphs[2], paragraphs[1]
    return "\n\n".join(paragraphs)


def placebo_2_cosmetic_reformatting(text: str, rng: random.Random) -> str:
    """Add/remove trailing spaces, swap '...'<->'…', add em-dash before some dialogue."""
    lines = text.split("\n")
    new_lines = []
    for line in lines:
        # Add or remove trailing spaces on ~30% of lines
        if rng.random() < 0.3:
            line = line.rstrip() + "   "
        elif rng.random() < 0.3:
            line = line.rstrip()

        # Swap "..." to "…" or back on ~20% of occurrences
        if "..." in line and rng.random() < 0.2:
            line = line.replace("...", "…", 1)
        elif "…" in line and rng.random() < 0.2:
            line = line.replace("…", "...", 1)

        # Add em-dash before dialogue lines (~15% of lines starting with quotes)
        if line.lstrip().startswith(("«", "\"", "\u2014")) and rng.random() < 0.15:
            line = "\u2014 " + line.lstrip()

        new_lines.append(line)
    return "\n".join(new_lines)


def placebo_3_identity(text: str) -> str:
    """Identity substitution — returns text unchanged."""
    return text


# ═══════════════════════════════════════════════════════════════════════════════
# LOADING
# ═══════════════════════════════════════════════════════════════════════════════

def load_chapters(n_select: int = 100, step: int = 15) -> list:
    """Load every `step`-th chapter file from results_v4/chapters/, sorted alphabetically."""
    chapters_dir = os.path.join(BASE_DIR, "results_v4", "chapters")
    if not os.path.isdir(chapters_dir):
        print(f"ERROR: chapters directory not found: {chapters_dir}")
        return []

    files = sorted(f for f in os.listdir(chapters_dir) if f.endswith(".json"))
    selected_files = files[::step][:n_select]

    chapters = []
    for fname in selected_files:
        fpath = os.path.join(chapters_dir, fname)
        with open(fpath, encoding="utf-8") as f:
            data = json.load(f)
        text = data.get("text", "")
        if len(text.split()) >= 50:  # skip very short chapters
            chapters.append({
                "file": fname,
                "text": text,
                "work_id": data.get("work_id", ""),
                "chapter_idx": data.get("chapter_idx", 0),
            })
    return chapters


# ═══════════════════════════════════════════════════════════════════════════════
# MEASUREMENT
# ═══════════════════════════════════════════════════════════════════════════════

def compute_deltas(features_before: dict, features_after: dict) -> dict:
    """Compute absolute delta per feature."""
    deltas = {}
    for k in FEATURE_KEYS:
        v_before = features_before.get(k, 0.0)
        v_after = features_after.get(k, 0.0)
        deltas[k] = abs(v_after - v_before)
    return deltas


def compute_category_deltas(deltas: dict) -> dict:
    """Compute mean |delta| per category."""
    cat_deltas = {}
    for cat, keys in CATEGORIES.items():
        vals = [deltas.get(k, 0.0) for k in keys]
        cat_deltas[cat] = sum(vals) / len(vals) if vals else 0.0
    return cat_deltas


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    rng = random.Random(42)
    t0_global = time.perf_counter()

    print("=" * 70)
    print("OMEGA — Placebo Perturbation Test")
    print(f"Date: {datetime.now().isoformat()}")
    print("=" * 70)

    # Load chapters
    print("\n[1/4] Loading chapters...")
    chapters = load_chapters(n_select=100, step=15)
    print(f"  Loaded {len(chapters)} chapters (every 15th file)")

    if not chapters:
        print("ERROR: No chapters loaded. Aborting.")
        sys.exit(1)

    # Prepare results storage
    placebos = {
        "PLACEBO_1": {"name": "Paragraph permutation", "deltas_all": [], "flags": []},
        "PLACEBO_2": {"name": "Cosmetic reformatting", "deltas_all": [], "flags": []},
        "PLACEBO_3": {"name": "Identity substitution", "deltas_all": [], "flags": []},
    }

    # Run placebos
    print(f"\n[2/4] Running 3 placebos on {len(chapters)} chapters...")
    for ci, ch in enumerate(chapters):
        text = ch["text"]
        features_before = analyze(text)

        # PLACEBO_1: Paragraph permutation
        text_p1 = placebo_1_paragraph_permutation(text)
        features_p1 = analyze(text_p1)
        d1 = compute_deltas(features_before, features_p1)
        placebos["PLACEBO_1"]["deltas_all"].append(d1)
        for k, v in d1.items():
            if v > 0.05:
                placebos["PLACEBO_1"]["flags"].append({"chapter": ch["file"], "feature": k, "delta": v})

        # PLACEBO_2: Cosmetic reformatting
        text_p2 = placebo_2_cosmetic_reformatting(text, rng)
        features_p2 = analyze(text_p2)
        d2 = compute_deltas(features_before, features_p2)
        placebos["PLACEBO_2"]["deltas_all"].append(d2)
        for k, v in d2.items():
            if v > 0.05:
                placebos["PLACEBO_2"]["flags"].append({"chapter": ch["file"], "feature": k, "delta": v})

        # PLACEBO_3: Identity
        text_p3 = placebo_3_identity(text)
        features_p3 = analyze(text_p3)
        d3 = compute_deltas(features_before, features_p3)
        placebos["PLACEBO_3"]["deltas_all"].append(d3)
        for k, v in d3.items():
            if v != 0.0:
                placebos["PLACEBO_3"]["flags"].append({"chapter": ch["file"], "feature": k, "delta": v})

        if (ci + 1) % 10 == 0 or ci == 0:
            print(f"  [{ci+1}/{len(chapters)}] processed")

    # Aggregate results
    print("\n[3/4] Aggregating results...")
    report = {
        "meta": {
            "date": datetime.now().isoformat(),
            "seed": 42,
            "n_chapters": len(chapters),
            "selection": "every 15th file sorted alphabetically",
        },
        "placebos": {},
    }

    all_pass = True

    for pkey, pdata in placebos.items():
        n = len(pdata["deltas_all"])
        # Mean delta per feature across all chapters
        mean_deltas = {}
        max_deltas = {}
        for k in FEATURE_KEYS:
            vals = [d[k] for d in pdata["deltas_all"]]
            mean_deltas[k] = sum(vals) / n if n else 0.0
            max_deltas[k] = max(vals) if vals else 0.0

        # Category means
        cat_means = {}
        for cat, keys in CATEGORIES.items():
            cat_vals = [mean_deltas[k] for k in keys]
            cat_means[cat] = sum(cat_vals) / len(cat_vals) if cat_vals else 0.0

        # Check criteria
        if pkey == "PLACEBO_3":
            # All deltas MUST be exactly 0
            p3_pass = all(v == 0.0 for v in mean_deltas.values())
            verdict = "PASS" if p3_pass else "FAIL"
            if not p3_pass:
                all_pass = False
        else:
            # Mean |delta| < 0.01 per category
            cat_pass = all(v < 0.01 for v in cat_means.values())
            verdict = "PASS" if cat_pass else "FAIL"
            if not cat_pass:
                all_pass = False

        report["placebos"][pkey] = {
            "name": pdata["name"],
            "mean_deltas_per_feature": {k: round(v, 6) for k, v in mean_deltas.items()},
            "max_deltas_per_feature": {k: round(v, 6) for k, v in max_deltas.items()},
            "category_mean_deltas": {k: round(v, 6) for k, v in cat_means.items()},
            "n_flags_above_005": len(pdata["flags"]),
            "flags": pdata["flags"][:20],  # cap at 20 for readability
            "verdict": verdict,
        }

    report["overall_verdict"] = "PASS" if all_pass else "FAIL"

    dt_global = time.perf_counter() - t0_global

    # Write JSON
    print("\n[4/4] Writing reports...")
    out_dir = os.path.join(BASE_DIR, "bench_results_v4")
    os.makedirs(out_dir, exist_ok=True)

    json_path = os.path.join(out_dir, "placebo_report.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"  JSON: {json_path}")

    # Write Markdown
    md_path = os.path.join(out_dir, "placebo_report.md")
    md_lines = [
        "# Placebo Perturbation Report",
        "",
        f"**Date**: {report['meta']['date']}",
        f"**Chapters**: {report['meta']['n_chapters']}",
        f"**Seed**: {report['meta']['seed']}",
        f"**Duration**: {dt_global:.1f}s",
        f"**Overall verdict**: {report['overall_verdict']}",
        "",
    ]

    for pkey in ["PLACEBO_1", "PLACEBO_2", "PLACEBO_3"]:
        pr = report["placebos"][pkey]
        md_lines.append(f"## {pkey}: {pr['name']}")
        md_lines.append("")
        md_lines.append(f"**Verdict**: {pr['verdict']}")
        md_lines.append(f"**Flags (|delta|>0.05)**: {pr['n_flags_above_005']}")
        md_lines.append("")
        md_lines.append("### Category mean |delta|")
        md_lines.append("")
        md_lines.append("| Category | Mean |delta| | Status |")
        md_lines.append("|----------|--------------|--------|")
        for cat, val in pr["category_mean_deltas"].items():
            if pkey == "PLACEBO_3":
                status = "OK" if val == 0.0 else "FAIL"
            else:
                status = "OK" if val < 0.01 else "FAIL"
            md_lines.append(f"| {cat} | {val:.6f} | {status} |")
        md_lines.append("")

        md_lines.append("### Feature mean |delta|")
        md_lines.append("")
        md_lines.append("| Feature | Mean |delta| | Max |delta| |")
        md_lines.append("|---------|--------------|-------------|")
        for k in FEATURE_KEYS:
            m = pr["mean_deltas_per_feature"][k]
            mx = pr["max_deltas_per_feature"][k]
            md_lines.append(f"| {k} | {m:.6f} | {mx:.6f} |")
        md_lines.append("")

        if pr["flags"]:
            md_lines.append("### Flags (first 20)")
            md_lines.append("")
            md_lines.append("| Chapter | Feature | |delta| |")
            md_lines.append("|---------|---------|---------|")
            for fl in pr["flags"]:
                md_lines.append(f"| {fl['chapter'][:50]} | {fl['feature']} | {fl['delta']:.6f} |")
            md_lines.append("")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"  Markdown: {md_path}")

    # Print summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    for pkey in ["PLACEBO_1", "PLACEBO_2", "PLACEBO_3"]:
        pr = report["placebos"][pkey]
        print(f"  {pkey} ({pr['name']}): {pr['verdict']}  "
              f"[flags>0.05: {pr['n_flags_above_005']}]")
        for cat, val in pr["category_mean_deltas"].items():
            marker = "  " if val < 0.01 else ">>"
            print(f"    {marker} {cat:15s} = {val:.6f}")
    print(f"\n  OVERALL: {report['overall_verdict']}")
    print(f"  Duration: {dt_global:.1f}s")
    print("=" * 70)


if __name__ == "__main__":
    main()
