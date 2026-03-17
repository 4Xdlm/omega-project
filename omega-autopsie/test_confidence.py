#!/usr/bin/env python3
"""
Bootstrap confidence intervals for all partial derivatives.

Reads bench_results_v4/bench_report.json (30420 results),
computes OLS-through-origin slopes for each (perturbation_type, category) pair,
then bootstraps 1000 times to produce 95% CIs.

Outputs:
  bench_results_v4/confidence_report.json
  bench_results_v4/confidence_report.md
"""

import sys
import os
import json

sys.stdout.reconfigure(encoding="utf-8")

import numpy as np

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

SEED = 42
N_BOOTSTRAP = 1000

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "bench_results_v4")
INPUT_PATH = os.path.join(DATA_DIR, "bench_report.json")
OUT_JSON = os.path.join(DATA_DIR, "confidence_report.json")
OUT_MD = os.path.join(DATA_DIR, "confidence_report.md")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ols_slope_origin(amp: np.ndarray, delta: np.ndarray) -> float:
    """OLS slope through origin: slope = sum(amp*delta) / sum(amp^2)."""
    denom = np.sum(amp ** 2)
    if denom == 0:
        return 0.0
    return float(np.sum(amp * delta) / denom)


def category_delta(result: dict, features: list[str]) -> float:
    """Mean of abs_delta across features in a category."""
    deltas = result["deltas"]
    vals = [deltas[f]["abs_delta"] for f in features if f in deltas]
    if not vals:
        return 0.0
    return sum(vals) / len(vals)


def verdict(slope: float, reliability: float) -> str:
    if abs(slope) < 0.01:
        return "NEGLIGIBLE"
    if reliability > 0.7:
        return "HIGH_CONFIDENCE"
    if reliability > 0.4:
        return "MODERATE"
    return "LOW"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"Loading {INPUT_PATH} ...")
    with open(INPUT_PATH, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    results = data["results"]
    print(f"  {len(results)} results loaded.")

    # ---- Group by perturbation_type ----
    by_ptype: dict[str, list[dict]] = {}
    for r in results:
        pt = r["perturbation_type"]
        by_ptype.setdefault(pt, []).append(r)

    perturbation_types = sorted(by_ptype.keys())
    category_names = list(CATEGORIES.keys())

    print(f"  Perturbation types: {perturbation_types}")
    print(f"  Categories: {category_names}")
    print(f"  Bootstrap: {N_BOOTSTRAP} iterations, seed {SEED}")

    rng = np.random.RandomState(SEED)

    derivatives: dict = {}
    summary_counts = {"high_confidence": 0, "moderate": 0, "low": 0, "negligible": 0}

    for pt in perturbation_types:
        derivatives[pt] = {}
        pt_results = by_ptype[pt]

        for cat_name in category_names:
            features = CATEGORIES[cat_name]

            # Collect (amplitude, category_delta) pairs
            amps = []
            deltas_vec = []
            for r in pt_results:
                a = r["amplitude"]
                d = category_delta(r, features)
                amps.append(a)
                deltas_vec.append(d)

            amps = np.array(amps, dtype=np.float64)
            deltas_vec = np.array(deltas_vec, dtype=np.float64)
            n = len(amps)

            # Point estimate
            slope_pt = ols_slope_origin(amps, deltas_vec)

            # Bootstrap
            boot_slopes = np.empty(N_BOOTSTRAP, dtype=np.float64)
            for b in range(N_BOOTSTRAP):
                idx = rng.randint(0, n, size=n)
                boot_slopes[b] = ols_slope_origin(amps[idx], deltas_vec[idx])

            ci_lo = float(np.percentile(boot_slopes, 2.5))
            ci_hi = float(np.percentile(boot_slopes, 97.5))
            ci_width = ci_hi - ci_lo

            if abs(slope_pt) > 0.001:
                rel = 1.0 - (ci_width / abs(slope_pt))
            else:
                rel = 0.0

            verd = verdict(slope_pt, rel)

            derivatives[pt][cat_name] = {
                "slope": round(slope_pt, 6),
                "ci_95": [round(ci_lo, 6), round(ci_hi, 6)],
                "ci_width": round(ci_width, 6),
                "reliability": round(rel, 4),
                "verdict": verd,
                "n_samples": n,
            }

            # Count
            key_map = {
                "HIGH_CONFIDENCE": "high_confidence",
                "MODERATE": "moderate",
                "LOW": "low",
                "NEGLIGIBLE": "negligible",
            }
            summary_counts[key_map[verd]] += 1

            print(f"  {pt} / {cat_name}: slope={slope_pt:.6f}  CI=[{ci_lo:.6f}, {ci_hi:.6f}]  rel={rel:.4f}  -> {verd}")

    # ---- Build output ----
    report = {
        "derivatives": derivatives,
        "summary": summary_counts,
    }

    # JSON
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
    print(f"\nJSON written to {OUT_JSON}")

    # MD
    lines = [
        "# Bootstrap Confidence Report",
        "",
        f"**Samples**: {len(results)} | **Bootstrap**: {N_BOOTSTRAP} iterations | **Seed**: {SEED}",
        "",
        "## Summary",
        "",
        f"- **HIGH_CONFIDENCE**: {summary_counts['high_confidence']}",
        f"- **MODERATE**: {summary_counts['moderate']}",
        f"- **LOW**: {summary_counts['low']}",
        f"- **NEGLIGIBLE**: {summary_counts['negligible']}",
        "",
        "## Derivatives",
        "",
        "| Perturbation | Category | Slope | CI 95% | CI Width | Reliability | Verdict |",
        "|---|---|---:|---|---:|---:|---|",
    ]

    for pt in perturbation_types:
        for cat_name in category_names:
            d = derivatives[pt][cat_name]
            marker = " **" if d["verdict"] == "HIGH_CONFIDENCE" else ""
            end_marker = "**" if marker else ""
            ci_str = f"[{d['ci_95'][0]:.6f}, {d['ci_95'][1]:.6f}]"
            lines.append(
                f"| {marker}{pt}{end_marker} | {marker}{cat_name}{end_marker} "
                f"| {d['slope']:.6f} | {ci_str} | {d['ci_width']:.6f} "
                f"| {d['reliability']:.4f} | {marker}{d['verdict']}{end_marker} |"
            )

    lines.append("")

    with open(OUT_MD, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    print(f"MD  written to {OUT_MD}")

    print(f"\nDone. {summary_counts['high_confidence']} HIGH_CONFIDENCE / 24 derivatives.")


if __name__ == "__main__":
    main()
