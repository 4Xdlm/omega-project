#!/usr/bin/env python3
"""
OMEGA — Static Correlation Matrix by Language and Period
Phase W — Day 3 — Mission G

Computes Pearson correlation between all 13 features, grouped by language and period.
Identifies which correlations are universal vs language/period-specific.

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

CHAPTERS_DIR = os.path.join(os.path.dirname(__file__), "results_v4", "chapters")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "bench_results_v2")


def pearson(xs, ys):
    """Compute Pearson correlation coefficient."""
    n = len(xs)
    if n < 3:
        return 0, 1.0
    mx = sum(xs) / n
    my = sum(ys) / n
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs) / (n - 1)) if n > 1 else 0
    sy = math.sqrt(sum((y - my) ** 2 for y in ys) / (n - 1)) if n > 1 else 0
    if sx < 1e-15 or sy < 1e-15:
        return 0, 1.0
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (n - 1)
    r = cov / (sx * sy)
    r = max(-1, min(1, r))
    # t-test for significance
    if abs(r) < 1 - 1e-10:
        t_stat = abs(r) * math.sqrt((n - 2) / (1 - r * r))
        df = n - 2
        if df > 5:
            p = min(1.0, 2 * math.exp(-0.717 * t_stat - 0.416 * t_stat * t_stat))
        else:
            p = 0.5 if t_stat < 1 else 0.1 if t_stat < 2 else 0.01
    else:
        p = 0.0
    return round(r, 4), round(p, 6)


def load_chapters_by_group(group_field):
    """Load all chapters grouped by field value."""
    groups = {}
    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        group = data.get(group_field, "UNKNOWN")
        if group == "UNKNOWN":
            continue
        if group not in groups:
            groups[group] = []
        groups[group].append(data.get("baseline_features", {}))
    return groups


def compute_corr_matrix(features_list):
    """Compute 13x13 correlation matrix from a list of feature dicts."""
    n = len(features_list)
    if n < 5:
        return {}

    matrix = {}
    for i, fi in enumerate(FEATURE_KEYS):
        matrix[fi] = {}
        xs = [f.get(fi, 0) for f in features_list]
        for j, fj in enumerate(FEATURE_KEYS):
            if j < i:
                # Symmetric
                matrix[fi][fj] = matrix[fj][fi]
            else:
                ys = [f.get(fj, 0) for f in features_list]
                r, p = pearson(xs, ys)
                matrix[fi][fj] = {"r": r, "p": p}
    return matrix


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Compute correlation matrices per language and per period
    for group_field, label in [("language", "language"), ("period", "period")]:
        print(f"\n[CORR-{label.upper()}] Loading chapters by {group_field}...")
        groups = load_chapters_by_group(group_field)

        all_matrices = {}
        for group in sorted(groups.keys()):
            n = len(groups[group])
            print(f"  {group}: {n} chapters")
            if n < 5:
                print(f"    SKIP (too few chapters)")
                continue
            all_matrices[group] = compute_corr_matrix(groups[group])

        # Also compute global matrix
        all_features = []
        for gl in groups.values():
            all_features.extend(gl)
        print(f"  GLOBAL: {len(all_features)} chapters")
        all_matrices["GLOBAL"] = compute_corr_matrix(all_features)

        # Find universal correlations (same sign + |r| > 0.3 in all groups)
        print(f"\n[CORR-{label.upper()}] Analyzing universality...")
        universal_pairs = []
        divergent_pairs = []
        group_names = [g for g in sorted(groups.keys()) if g in all_matrices]

        for i, fi in enumerate(FEATURE_KEYS):
            for j, fj in enumerate(FEATURE_KEYS):
                if j <= i:
                    continue
                correlations = {}
                for g in group_names:
                    info = all_matrices[g].get(fi, {}).get(fj, {})
                    if isinstance(info, dict):
                        correlations[g] = info.get("r", 0)

                if len(correlations) < 2:
                    continue

                vals = list(correlations.values())
                signs = set(1 if v > 0.1 else (-1 if v < -0.1 else 0) for v in vals)
                signs.discard(0)
                all_strong = all(abs(v) > 0.3 for v in vals)

                if len(signs) == 1 and all_strong:
                    universal_pairs.append((fi, fj, correlations))
                elif len(signs) > 1 and any(abs(v) > 0.3 for v in vals):
                    divergent_pairs.append((fi, fj, correlations))

        # Save JSON
        json_output = {
            "metadata": {
                "group_field": group_field,
                "groups": group_names,
                "n_features": len(FEATURE_KEYS),
                "timestamp": datetime.now().isoformat(),
            },
            "matrices": {g: {fi: {fj: all_matrices[g][fi][fj]
                                  for fj in FEATURE_KEYS}
                             for fi in FEATURE_KEYS}
                         for g in list(all_matrices.keys())},
            "universal_correlations": [
                {"f1": fi, "f2": fj, "r_by_group": corrs}
                for fi, fj, corrs in universal_pairs
            ],
            "divergent_correlations": [
                {"f1": fi, "f2": fj, "r_by_group": corrs}
                for fi, fj, corrs in divergent_pairs
            ],
        }
        json_path = os.path.join(OUTPUT_DIR, f"correlation_matrix_{label}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(json_output, f, ensure_ascii=False, indent=2)
        print(f"[CORR-{label.upper()}] Saved {json_path}")

        # Markdown report
        lines = []
        lines.append(f"# OMEGA — Correlation Matrix by {label.title()}")
        lines.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        lines.append(f"**Groups**: {', '.join(group_names)}")
        lines.append(f"**Features**: {len(FEATURE_KEYS)}")
        lines.append("")

        # Universal correlations
        lines.append("## Universal Correlations")
        lines.append(f"Pairs with |r| > 0.3 and same sign in ALL {label} groups:")
        lines.append("")
        if universal_pairs:
            header = "| Feature 1 | Feature 2 | " + " | ".join(group_names) + " | Global |"
            sep = "|" + "|".join(["---"] * (len(group_names) + 3)) + "|"
            lines.append(header)
            lines.append(sep)
            for fi, fj, corrs in sorted(universal_pairs, key=lambda x: -abs(list(x[2].values())[0])):
                cells = [f"{corrs.get(g, 0):+.2f}" for g in group_names]
                gl = all_matrices["GLOBAL"].get(fi, {}).get(fj, {})
                gl_r = gl.get("r", 0) if isinstance(gl, dict) else 0
                lines.append(f"| {fi} | {fj} | " + " | ".join(cells) + f" | {gl_r:+.2f} |")
        else:
            lines.append("*None found*")
        lines.append("")

        # Divergent correlations
        lines.append("## Divergent Correlations")
        lines.append(f"Pairs with opposite signs across {label} groups:")
        lines.append("")
        if divergent_pairs:
            header = "| Feature 1 | Feature 2 | " + " | ".join(group_names) + " |"
            sep = "|" + "|".join(["---"] * (len(group_names) + 2)) + "|"
            lines.append(header)
            lines.append(sep)
            for fi, fj, corrs in sorted(divergent_pairs, key=lambda x: -max(abs(v) for v in x[2].values())):
                cells = [f"{corrs.get(g, 0):+.2f}" for g in group_names]
                lines.append(f"| {fi} | {fj} | " + " | ".join(cells) + " |")
        else:
            lines.append("*None found*")
        lines.append("")

        lines.append("---")
        lines.append(f"*Generated by compute_correlation_matrix.py — Phase W Day 3*")

        md_path = os.path.join(OUTPUT_DIR, f"correlation_matrix_{label}_report.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"[CORR-{label.upper()}] Saved {md_path}")

        print(f"\n  Universal correlations: {len(universal_pairs)}")
        print(f"  Divergent correlations: {len(divergent_pairs)}")

    print("\n[CORR] ALL DONE")


if __name__ == "__main__":
    main()
