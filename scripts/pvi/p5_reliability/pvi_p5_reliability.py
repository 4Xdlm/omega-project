#!/usr/bin/env python3
"""
OMEGA PVI Phase P5 — Inter-Annotator Reliability Analysis
==========================================================
Calcule la fiabilite des annotations humaines sur Omega, I, U.

Usage:
    py -3.11 pvi_p5_reliability.py --a annotations_A.jsonl --b annotations_B.jsonl
    py -3.11 pvi_p5_reliability.py --a T0.jsonl --b T1.jsonl --mode test-retest
    py -3.11 pvi_p5_reliability.py --multi a1.jsonl a2.jsonl a3.jsonl --icc

Standard: OMEGA NASA-Grade L4 / DO-178C Level A
"""

import argparse
import json
import math
import os
import statistics
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COEFFICIENTS_DIR = SCRIPT_DIR.parent


# =============================================================================
# FORMULAS — Omega, I, U from sub-components
# =============================================================================
OMEGA_WEIGHTS = {"R_t": 0.35, "C_a": 0.30, "S_f": 0.15, "C_e": 0.20}
IDENT_WEIGHTS = {"P_p": 0.30, "D_i": 0.25, "V_p": 0.25, "L_e": 0.20}
UNIC_WEIGHTS  = {"D_s": 0.30, "M_t": 0.25, "N_c": 0.20, "P_r": 0.25}


def compute_weighted(block, weights):
    """Compute weighted score from sub-components. Returns None if any is None."""
    vals = []
    for key, w in weights.items():
        v = block.get(key)
        if v is None:
            return None
        vals.append(v * w)
    return sum(vals)


def recalc_scores(entry):
    """Recalculate score_final for omega/identification/unicite from sub-components."""
    entry["omega"]["score_final"] = compute_weighted(entry["omega"], OMEGA_WEIGHTS)
    entry["identification"]["score_final"] = compute_weighted(entry["identification"], IDENT_WEIGHTS)
    entry["unicite"]["score_final"] = compute_weighted(entry["unicite"], UNIC_WEIGHTS)
    return entry


# =============================================================================
# LOADING
# =============================================================================
def load_jsonl(path):
    """Load JSONL file, recalculate scores, return list of entries."""
    entries = []
    with open(path, encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  WARNING: {path} line {line_num}: {e}")
                continue
            recalc_scores(entry)
            entries.append(entry)
    return entries


def index_by_id(entries):
    """Create dict id -> entry."""
    return {e["id"]: e for e in entries}


# =============================================================================
# DELTA STATISTICS
# =============================================================================
def extract_variable_pair(a_entries, b_entries, variable, sub_key=None):
    """Extract paired values for a variable from two annotation sets.

    variable: 'omega' | 'identification' | 'unicite'
    sub_key: if None, use score_final; else use specific sub-component
    """
    a_idx = index_by_id(a_entries)
    b_idx = index_by_id(b_entries)
    common_ids = sorted(set(a_idx) & set(b_idx))

    pairs = []
    for tid in common_ids:
        a_block = a_idx[tid][variable]
        b_block = b_idx[tid][variable]
        if sub_key:
            va = a_block.get(sub_key)
            vb = b_block.get(sub_key)
        else:
            va = a_block.get("score_final")
            vb = b_block.get("score_final")
        if va is not None and vb is not None:
            pairs.append((tid, va, vb))
    return pairs


def compute_delta_stats(pairs):
    """Compute delta statistics from paired observations."""
    if len(pairs) < 2:
        return None

    deltas = [abs(a - b) for _, a, b in pairs]
    n = len(deltas)
    mean_d = statistics.mean(deltas)
    median_d = statistics.median(deltas)
    std_d = statistics.stdev(deltas) if n > 1 else 0.0
    pct_le_005 = sum(1 for d in deltas if d <= 0.05) / n * 100
    pct_le_010 = sum(1 for d in deltas if d <= 0.10) / n * 100
    pct_gt_015 = sum(1 for d in deltas if d > 0.15) / n * 100

    return {
        "n": n,
        "delta_mean": round(mean_d, 4),
        "delta_median": round(median_d, 4),
        "delta_std": round(std_d, 4),
        "pct_le_005": round(pct_le_005, 1),
        "pct_le_010": round(pct_le_010, 1),
        "pct_gt_015": round(pct_gt_015, 1),
    }


# =============================================================================
# CORRELATIONS
# =============================================================================
def pearson(x, y):
    """Pearson correlation coefficient."""
    n = len(x)
    if n < 3:
        return None
    mx = statistics.mean(x)
    my = statistics.mean(y)
    sx = statistics.stdev(x)
    sy = statistics.stdev(y)
    if sx < 1e-10 or sy < 1e-10:
        return None
    r = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y)) / ((n - 1) * sx * sy)
    return round(r, 4)


def spearman(x, y):
    """Spearman rank correlation coefficient."""
    n = len(x)
    if n < 3:
        return None

    def rank(vals):
        indexed = sorted(enumerate(vals), key=lambda t: t[1])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and abs(indexed[j + 1][1] - indexed[j][1]) < 1e-12:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                ranks[indexed[k][0]] = avg_rank
            i = j + 1
        return ranks

    rx = rank(x)
    ry = rank(y)
    return pearson(rx, ry)


# =============================================================================
# ICC — Intraclass Correlation Coefficient (two-way mixed, single measures)
# =============================================================================
def compute_icc(all_sets, variable, sub_key=None):
    """Compute ICC(3,1) from multiple annotator sets.

    all_sets: list of annotator entry lists
    Returns ICC value or None.
    """
    if len(all_sets) < 2:
        return None

    # Build matrix: rows=titles, cols=annotators
    all_ids = set()
    indexed = []
    for entries in all_sets:
        idx = index_by_id(entries)
        indexed.append(idx)
        all_ids.update(idx.keys())

    common_ids = sorted(all_ids)
    k = len(all_sets)  # number of annotators
    matrix = []

    for tid in common_ids:
        row = []
        for idx in indexed:
            if tid not in idx:
                break
            block = idx[tid][variable]
            val = block.get(sub_key) if sub_key else block.get("score_final")
            if val is None:
                break
            row.append(val)
        else:
            if len(row) == k:
                matrix.append(row)

    n = len(matrix)
    if n < 3 or k < 2:
        return None

    # ICC(3,1) — two-way mixed, consistency, single measures
    grand_mean = sum(v for row in matrix for v in row) / (n * k)
    row_means = [statistics.mean(row) for row in matrix]
    col_means = [statistics.mean([matrix[i][j] for i in range(n)]) for j in range(k)]

    ss_rows = k * sum((rm - grand_mean) ** 2 for rm in row_means)
    ss_cols = n * sum((cm - grand_mean) ** 2 for cm in col_means)
    ss_total = sum((matrix[i][j] - grand_mean) ** 2
                   for i in range(n) for j in range(k))
    ss_error = ss_total - ss_rows - ss_cols

    ms_rows = ss_rows / (n - 1) if n > 1 else 0
    ms_error = ss_error / ((n - 1) * (k - 1)) if (n > 1 and k > 1) else 0

    if ms_error < 1e-12:
        return 1.0 if ms_rows > 1e-12 else None

    icc = (ms_rows - ms_error) / (ms_rows + (k - 1) * ms_error)
    return round(icc, 4)


# =============================================================================
# PVI RE-PREDICTION — Verdict stability
# =============================================================================
def load_coefficients(lang):
    """Load PVI model coefficients for given language."""
    lang_upper = lang.upper()
    path = COEFFICIENTS_DIR / f"coefficients_v2_{lang_upper}.json"
    if not path.exists():
        path = COEFFICIENTS_DIR / "coefficients_v2.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_corpus():
    """Load P5 corpus with original NLP variables."""
    corpus_path = SCRIPT_DIR / "p5_corpus_20_titres.csv"
    if not corpus_path.exists():
        return {}
    titles = {}
    with open(corpus_path, encoding="utf-8") as f:
        header = f.readline().strip().split(",")
        for line in f:
            vals = line.strip().split(",")
            row = dict(zip(header, vals))
            titles[row["id"]] = row
    return titles


def predict_proba(fl, i_val, omega, t, lang):
    """Predict bestseller probability."""
    model = load_coefficients(lang)
    coefs = model["coefficients"]
    z = model["intercept"]
    z += coefs["FL"] * fl
    z += coefs["I"] * i_val
    z += coefs["Omega"] * omega
    z += coefs["T"] * t
    return 1 / (1 + math.exp(-z))


def verdict_from_proba(proba):
    if proba >= 0.65:
        return "PASS"
    elif proba >= 0.50:
        return "BORDERLINE"
    return "FAIL"


def compute_verdict_stability(a_entries, b_entries):
    """Check if swapping annotated Omega/I/U changes the PVI verdict."""
    corpus = load_corpus()
    if not corpus:
        return None

    a_idx = index_by_id(a_entries)
    b_idx = index_by_id(b_entries)
    common_ids = sorted(set(a_idx) & set(b_idx) & set(corpus))

    results = []
    for tid in common_ids:
        row = corpus[tid]
        fl = float(row["FL"])
        t = float(row["T"])
        lang = row["langue"]

        # Original verdict
        orig_omega = float(row["Omega"])
        orig_i = float(row["I"])
        orig_proba = predict_proba(fl, orig_i, orig_omega, t, lang)
        orig_verdict = verdict_from_proba(orig_proba)

        # With annotator A values
        omega_a = a_idx[tid]["omega"].get("score_final")
        i_a = a_idx[tid]["identification"].get("score_final")
        if omega_a is None or i_a is None:
            continue
        proba_a = predict_proba(fl, i_a, omega_a, t, lang)
        verdict_a = verdict_from_proba(proba_a)

        # With annotator B values
        omega_b = b_idx[tid]["omega"].get("score_final")
        i_b = b_idx[tid]["identification"].get("score_final")
        if omega_b is None or i_b is None:
            continue
        proba_b = predict_proba(fl, i_b, omega_b, t, lang)
        verdict_b = verdict_from_proba(proba_b)

        stable = (verdict_a == verdict_b)
        results.append({
            "id": tid,
            "titre": row["titre"],
            "orig_verdict": orig_verdict,
            "verdict_a": verdict_a,
            "verdict_b": verdict_b,
            "proba_a": round(proba_a, 4),
            "proba_b": round(proba_b, 4),
            "stable": stable,
        })

    if not results:
        return None

    n_stable = sum(1 for r in results if r["stable"])
    return {
        "n_titles": len(results),
        "n_stable": n_stable,
        "pct_stable": round(n_stable / len(results) * 100, 1),
        "details": results,
    }


# =============================================================================
# DIVERGENT CASES
# =============================================================================
def find_divergent(a_entries, b_entries, threshold=0.15):
    """Find all cases where delta > threshold on any variable."""
    a_idx = index_by_id(a_entries)
    b_idx = index_by_id(b_entries)
    common_ids = sorted(set(a_idx) & set(b_idx))

    variables = [
        ("omega", OMEGA_WEIGHTS),
        ("identification", IDENT_WEIGHTS),
        ("unicite", UNIC_WEIGHTS),
    ]

    divergents = []
    for tid in common_ids:
        for var_name, weights in variables:
            a_block = a_idx[tid][var_name]
            b_block = b_idx[tid][var_name]

            # Check score_final
            va = a_block.get("score_final")
            vb = b_block.get("score_final")
            if va is not None and vb is not None:
                delta = abs(va - vb)
                if delta > threshold:
                    # Find which sub-component caused the divergence
                    worst_sub = None
                    worst_delta = 0
                    for sub_key in weights:
                        sa = a_block.get(sub_key)
                        sb = b_block.get(sub_key)
                        if sa is not None and sb is not None:
                            sd = abs(sa - sb)
                            if sd > worst_delta:
                                worst_delta = sd
                                worst_sub = sub_key

                    divergents.append({
                        "id": tid,
                        "titre": a_idx[tid].get("titre", tid),
                        "variable": var_name,
                        "score_a": round(va, 4),
                        "score_b": round(vb, 4),
                        "delta": round(delta, 4),
                        "worst_sub": worst_sub,
                        "worst_sub_delta": round(worst_delta, 4),
                    })

    divergents.sort(key=lambda x: -x["delta"])
    return divergents


# =============================================================================
# HEATMAP — Sub-component breakdown
# =============================================================================
def compute_subcomponent_heatmap(a_entries, b_entries):
    """Compute mean absolute delta per sub-component."""
    a_idx = index_by_id(a_entries)
    b_idx = index_by_id(b_entries)
    common_ids = sorted(set(a_idx) & set(b_idx))

    all_subs = {
        "omega": list(OMEGA_WEIGHTS.keys()),
        "identification": list(IDENT_WEIGHTS.keys()),
        "unicite": list(UNIC_WEIGHTS.keys()),
    }

    heatmap = {}
    for var_name, sub_keys in all_subs.items():
        for sub_key in sub_keys:
            deltas = []
            for tid in common_ids:
                va = a_idx[tid][var_name].get(sub_key)
                vb = b_idx[tid][var_name].get(sub_key)
                if va is not None and vb is not None:
                    deltas.append(abs(va - vb))
            if deltas:
                heatmap[f"{var_name}.{sub_key}"] = {
                    "mean_delta": round(statistics.mean(deltas), 4),
                    "max_delta": round(max(deltas), 4),
                    "n": len(deltas),
                }
    return heatmap


# =============================================================================
# RELIABILITY GRADE
# =============================================================================
def grade_reliability(delta_mean, pearson_r):
    """Assign reliability grade based on thresholds."""
    if pearson_r is None:
        return "N/A"
    if delta_mean <= 0.05 and pearson_r >= 0.90:
        return "EXCELLENT"
    elif delta_mean <= 0.10 and pearson_r >= 0.75:
        return "ACCEPTABLE"
    else:
        return "CRITIQUE"


# =============================================================================
# REPORT GENERATION
# =============================================================================
def generate_report(a_path, b_path, a_entries, b_entries, mode, icc_sets=None):
    """Generate full reliability report."""
    lines = []
    date = datetime.now().strftime("%Y-%m-%d")

    lines.append(f"# RAPPORT P5 — Fiabilite Inter-Annotateurs Omega / I / U\n")
    lines.append(f"**Date** : {date} | **Mode** : {mode}\n")
    lines.append(f"**Fichier A** : {Path(a_path).name} | "
                 f"**Fichier B** : {Path(b_path).name}\n")
    lines.append(f"**Titres communs** : {len(set(index_by_id(a_entries)) & set(index_by_id(b_entries)))}\n\n")

    lines.append("---\n\n")

    # Per-variable analysis
    var_labels = {
        "omega": ("Omega", OMEGA_WEIGHTS),
        "identification": ("I (Identification)", IDENT_WEIGHTS),
        "unicite": ("U (Unicite)", UNIC_WEIGHTS),
    }

    summary_grades = {}

    for var_name, (label, weights) in var_labels.items():
        lines.append(f"## {label}\n\n")

        # Score final
        pairs = extract_variable_pair(a_entries, b_entries, var_name)
        stats = compute_delta_stats(pairs)

        if stats:
            x = [a for _, a, _ in pairs]
            y = [b for _, _, b in pairs]
            r_pear = pearson(x, y)
            r_spear = spearman(x, y)
            grade = grade_reliability(stats["delta_mean"], r_pear)
            summary_grades[var_name] = grade

            lines.append(f"### Score final\n\n")
            lines.append(f"| Metrique | Valeur |\n")
            lines.append(f"|----------|--------|\n")
            lines.append(f"| N paires | {stats['n']} |\n")
            lines.append(f"| Delta moyen | {stats['delta_mean']:.4f} |\n")
            lines.append(f"| Delta median | {stats['delta_median']:.4f} |\n")
            lines.append(f"| Delta ecart-type | {stats['delta_std']:.4f} |\n")
            lines.append(f"| % Delta <= 0.05 | {stats['pct_le_005']:.1f}% |\n")
            lines.append(f"| % Delta <= 0.10 | {stats['pct_le_010']:.1f}% |\n")
            lines.append(f"| % Delta > 0.15 | {stats['pct_gt_015']:.1f}% |\n")
            lines.append(f"| Pearson | {r_pear if r_pear is not None else 'N/A'} |\n")
            lines.append(f"| Spearman | {r_spear if r_spear is not None else 'N/A'} |\n")
            lines.append(f"| **Grade** | **{grade}** |\n\n")

            # ICC if multi-annotator
            if icc_sets and len(icc_sets) > 2:
                icc_val = compute_icc(icc_sets, var_name)
                lines.append(f"ICC(3,1) = {icc_val}\n\n")
        else:
            lines.append("Donnees insuffisantes pour l'analyse.\n\n")
            summary_grades[var_name] = "N/A"

        # Sub-components
        lines.append(f"### Sous-composantes\n\n")
        lines.append(f"| Sous-composante | Poids | Delta moyen | Delta max | N |\n")
        lines.append(f"|-----------------|-------|-------------|-----------|---|\n")
        for sub_key, w in weights.items():
            sub_pairs = extract_variable_pair(a_entries, b_entries, var_name, sub_key)
            if sub_pairs:
                sub_deltas = [abs(a - b) for _, a, b in sub_pairs]
                mean_d = statistics.mean(sub_deltas)
                max_d = max(sub_deltas)
                lines.append(f"| {sub_key} | {w:.2f} | {mean_d:.4f} | {max_d:.4f} | {len(sub_deltas)} |\n")
            else:
                lines.append(f"| {sub_key} | {w:.2f} | — | — | 0 |\n")
        lines.append("\n")

    # Verdict stability
    lines.append("---\n\n## Stabilite des verdicts PVI\n\n")
    stability = compute_verdict_stability(a_entries, b_entries)
    if stability:
        lines.append(f"**{stability['pct_stable']:.1f}%** des titres conservent le meme verdict "
                     f"({stability['n_stable']}/{stability['n_titles']})\n\n")
        lines.append(f"| ID | Titre | Verdict A | Verdict B | Proba A | Proba B | Stable |\n")
        lines.append(f"|----|-------|-----------|-----------|---------|---------|--------|\n")
        for r in stability["details"]:
            stable_mark = "OK" if r["stable"] else "**DIVERGE**"
            lines.append(f"| {r['id']} | {r['titre']} | {r['verdict_a']} | "
                         f"{r['verdict_b']} | {r['proba_a']:.3f} | {r['proba_b']:.3f} | "
                         f"{stable_mark} |\n")
        lines.append("\n")
    else:
        lines.append("Donnees insuffisantes.\n\n")

    # Divergent cases
    lines.append("---\n\n## Cas divergents (Delta > 0.15)\n\n")
    divergents = find_divergent(a_entries, b_entries, threshold=0.15)
    if divergents:
        lines.append(f"| ID | Titre | Variable | Score A | Score B | Delta | "
                     f"Sous-comp. cause | Delta sous-comp. |\n")
        lines.append(f"|----|-------|----------|---------|---------|-------|"
                     f"-----------------|------------------|\n")
        for d in divergents:
            lines.append(f"| {d['id']} | {d['titre']} | {d['variable']} | "
                         f"{d['score_a']:.4f} | {d['score_b']:.4f} | "
                         f"**{d['delta']:.4f}** | {d['worst_sub']} | "
                         f"{d['worst_sub_delta']:.4f} |\n")
        lines.append("\n")
    else:
        lines.append("Aucun cas divergent.\n\n")

    # Heatmap
    lines.append("---\n\n## Heatmap sous-composantes\n\n")
    heatmap = compute_subcomponent_heatmap(a_entries, b_entries)
    if heatmap:
        lines.append(f"| Variable.Sous-composante | Delta moyen | Delta max | N | Zone |\n")
        lines.append(f"|--------------------------|-------------|-----------|---|------|\n")
        for key, vals in sorted(heatmap.items(), key=lambda x: -x[1]["mean_delta"]):
            zone = "CRITIQUE" if vals["mean_delta"] > 0.15 else (
                "ACCEPTABLE" if vals["mean_delta"] > 0.05 else "EXCELLENT")
            lines.append(f"| {key} | {vals['mean_delta']:.4f} | "
                         f"{vals['max_delta']:.4f} | {vals['n']} | {zone} |\n")
        lines.append("\n")
    else:
        lines.append("Donnees insuffisantes.\n\n")

    # Summary
    lines.append("---\n\n## SYNTHESE\n\n")
    lines.append(f"| Variable | Grade |\n")
    lines.append(f"|----------|-------|\n")
    for var_name, grade in summary_grades.items():
        lines.append(f"| {var_name} | **{grade}** |\n")
    lines.append("\n")

    # Decision thresholds reminder
    lines.append("### Seuils de decision\n\n")
    lines.append("| Grade | Delta moyen | Pearson |\n")
    lines.append("|-------|-------------|----------|\n")
    lines.append("| EXCELLENT | <= 0.05 | >= 0.90 |\n")
    lines.append("| ACCEPTABLE | <= 0.10 | >= 0.75 |\n")
    lines.append("| CRITIQUE | > 0.15 | < 0.70 |\n\n")

    lines.append(f"\n---\n**Genere le {date} par pvi_p5_reliability.py**\n")
    lines.append("**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**\n")

    return "".join(lines)


def generate_json_report(a_entries, b_entries, icc_sets=None):
    """Generate machine-readable JSON report."""
    var_names = ["omega", "identification", "unicite"]
    report = {"date": datetime.now().isoformat(), "variables": {}}

    for var_name in var_names:
        pairs = extract_variable_pair(a_entries, b_entries, var_name)
        stats = compute_delta_stats(pairs)
        x = [a for _, a, _ in pairs] if pairs else []
        y = [b for _, _, b in pairs] if pairs else []
        r_pear = pearson(x, y) if len(x) >= 3 else None
        r_spear = spearman(x, y) if len(x) >= 3 else None

        entry = {
            "delta_stats": stats,
            "pearson": r_pear,
            "spearman": r_spear,
            "grade": grade_reliability(
                stats["delta_mean"] if stats else 1.0,
                r_pear),
        }

        if icc_sets and len(icc_sets) > 2:
            entry["icc"] = compute_icc(icc_sets, var_name)

        report["variables"][var_name] = entry

    stability = compute_verdict_stability(a_entries, b_entries)
    report["verdict_stability"] = {
        "pct_stable": stability["pct_stable"] if stability else None,
        "n_titles": stability["n_titles"] if stability else 0,
    }

    divergents = find_divergent(a_entries, b_entries)
    report["divergent_cases"] = divergents
    report["heatmap"] = compute_subcomponent_heatmap(a_entries, b_entries)

    return report


# =============================================================================
# CLI
# =============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="OMEGA PVI P5 — Inter-Annotator Reliability Analysis")
    parser.add_argument("--a", required=True,
                        help="First annotation JSONL file")
    parser.add_argument("--b", required=True,
                        help="Second annotation JSONL file")
    parser.add_argument("--mode", default="inter-annotateur",
                        choices=["inter-annotateur", "test-retest"],
                        help="Analysis mode (default: inter-annotateur)")
    parser.add_argument("--multi", nargs="*",
                        help="Additional annotator files for ICC calculation")
    parser.add_argument("--icc", action="store_true",
                        help="Force ICC computation (requires --multi)")
    parser.add_argument("--output", "-o", default=None,
                        help="Output directory (default: same as --a)")

    args = parser.parse_args()

    if not os.path.exists(args.a):
        print(f"ERREUR: Fichier non trouve: {args.a}")
        sys.exit(1)
    if not os.path.exists(args.b):
        print(f"ERREUR: Fichier non trouve: {args.b}")
        sys.exit(1)

    print(f"\n{'='*70}")
    print(f"OMEGA PVI P5 — Fiabilite Inter-Annotateurs")
    print(f"{'='*70}")
    print(f"Mode:     {args.mode}")
    print(f"Fichier A: {args.a}")
    print(f"Fichier B: {args.b}")

    # Load
    print(f"\n[1/4] Chargement...", end=" ", flush=True)
    a_entries = load_jsonl(args.a)
    b_entries = load_jsonl(args.b)
    print(f"OK (A={len(a_entries)}, B={len(b_entries)})")

    # ICC sets
    icc_sets = None
    if args.multi:
        icc_sets = [a_entries, b_entries]
        for mp in args.multi:
            if os.path.exists(mp):
                icc_sets.append(load_jsonl(mp))
                print(f"  ICC annotateur: {mp} ({len(icc_sets[-1])} entrees)")
        print(f"  Total annotateurs ICC: {len(icc_sets)}")

    # Analyse
    print(f"[2/4] Analyse delta + correlations...")
    for var_name in ["omega", "identification", "unicite"]:
        pairs = extract_variable_pair(a_entries, b_entries, var_name)
        stats = compute_delta_stats(pairs)
        if stats:
            x = [a for _, a, _ in pairs]
            y = [b for _, _, b in pairs]
            r = pearson(x, y)
            grade = grade_reliability(stats["delta_mean"], r)
            print(f"  {var_name:20s} | Delta={stats['delta_mean']:.4f} | "
                  f"Pearson={r if r else 'N/A':>6} | {grade}")
        else:
            print(f"  {var_name:20s} | Donnees insuffisantes")

    # Divergents
    print(f"[3/4] Cas divergents...")
    divergents = find_divergent(a_entries, b_entries)
    print(f"  {len(divergents)} cas avec Delta > 0.15")

    # Stability
    print(f"[4/4] Stabilite verdicts...")
    stability = compute_verdict_stability(a_entries, b_entries)
    if stability:
        print(f"  {stability['pct_stable']:.1f}% stables "
              f"({stability['n_stable']}/{stability['n_titles']})")

    # Output
    out_dir = Path(args.output) if args.output else Path(args.a).parent
    date = datetime.now().strftime("%Y-%m-%d")

    md_report = generate_report(args.a, args.b, a_entries, b_entries,
                                args.mode, icc_sets)
    md_path = out_dir / f"rapport_p5_{args.mode}_{date}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_report)
    print(f"\n  Rapport MD:   {md_path}")

    json_report = generate_json_report(a_entries, b_entries, icc_sets)
    json_path = out_dir / f"rapport_p5_{args.mode}_{date}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_report, f, indent=2, ensure_ascii=False)
    print(f"  Rapport JSON: {json_path}")

    print(f"\nTermine.")


if __name__ == "__main__":
    main()
