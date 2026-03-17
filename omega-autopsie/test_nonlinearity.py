#!/usr/bin/env python3
"""
test_nonlinearity.py — Test non-linearity of perturbation effects.

For each (perturbation_type, category) pair, fits linear, quadratic, and
saturating models to the 5 amplitude data points, then determines whether
the relationship is significantly non-linear (R²_quad - R²_lin > 0.05).

No scipy dependency. Uses numpy OLS + grid search for saturating model.
"""

import json
import os
import sys
import numpy as np
from collections import defaultdict
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

np.random.seed(42)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, 'bench_results_v4', 'bench_report.json')
OUTPUT_JSON = os.path.join(SCRIPT_DIR, 'bench_results_v4', 'nonlinearity_report.json')
OUTPUT_MD = os.path.join(SCRIPT_DIR, 'bench_results_v4', 'nonlinearity_report.md')

# ---------------------------------------------------------------------------
# Category mapping
# ---------------------------------------------------------------------------
CATEGORIES = {
    'MUSICALITE':   ['f1_mean', 'f1a_rhythm_variance', 'f19e_window_median'],
    'COMPLEXITE':   ['f22f_literary_index', 'f26c_period_score'],
    'SENSORIEL':    ['f24e_contrast_score', 'f25g_description_score'],
    'LEXICAL':      ['f29b_ttr_window', 'f21e_ritual_index'],
    'INTERIORITE':  ['f27d_modal_score', 'f28d_sil_score'],
    'TENSION':      ['f23d_literary_causal_score', 'f30d_ps_imp_ratio'],
}

# The 10 most significant pairs to focus on
TARGET_PAIRS = [
    ('P03_COMPLEXIFY_SYNTAX', 'TENSION'),
    ('P04_REMOVE_INTERIORITY', 'INTERIORITE'),
    ('P05_INJECT_SYNCOPES', 'COMPLEXITE'),
    ('P05_INJECT_SYNCOPES', 'INTERIORITE'),
    ('P05_INJECT_SYNCOPES', 'TENSION'),
    ('P05_INJECT_SYNCOPES', 'LEXICAL'),
    ('P03_COMPLEXIFY_SYNTAX', 'COMPLEXITE'),
    ('P03_COMPLEXIFY_SYNTAX', 'LEXICAL'),
    ('P05_INJECT_SYNCOPES', 'SENSORIEL'),
    ('P03_COMPLEXIFY_SYNTAX', 'INTERIORITE'),
]

AMPLITUDES = [0.03, 0.10, 0.25, 0.50, 1.00]


# ---------------------------------------------------------------------------
# Model fitting utilities (numpy only, no scipy)
# ---------------------------------------------------------------------------

def r_squared(y_true, y_pred):
    """Compute R² score."""
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    if ss_tot == 0:
        return 0.0
    return 1.0 - ss_res / ss_tot


def r_squared_adj(r2, n, p):
    """Adjusted R² penalizing extra parameters."""
    if n - p - 1 <= 0:
        return r2
    return 1.0 - (1.0 - r2) * (n - 1) / (n - p - 1)


def fit_linear(x, y):
    """Fit delta = a*amp + b via OLS (with intercept)."""
    n = len(x)
    X = np.column_stack([x, np.ones(n)])
    # OLS: beta = (X^T X)^-1 X^T y
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    y_pred = X @ beta
    r2 = r_squared(y, y_pred)
    r2_adj = r_squared_adj(r2, n, 2)
    return {
        'slope': float(beta[0]),
        'intercept': float(beta[1]),
        'r2': float(r2),
        'r2_adj': float(r2_adj),
        'y_pred': y_pred,
    }


def fit_quadratic(x, y):
    """Fit delta = a*amp^2 + b*amp (through origin, no constant term)."""
    n = len(x)
    X = np.column_stack([x ** 2, x])
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    y_pred = X @ beta
    r2 = r_squared(y, y_pred)
    r2_adj = r_squared_adj(r2, n, 2)
    return {
        'a': float(beta[0]),
        'b': float(beta[1]),
        'r2': float(r2),
        'r2_adj': float(r2_adj),
        'y_pred': y_pred,
    }


def fit_saturating(x, y):
    """
    Fit delta = b*amp / (1 + k*amp) via grid search on k.
    For each candidate k, the model is linear in b, so we solve via OLS.
    """
    n = len(x)
    best_r2 = -np.inf
    best_params = {'b': 0.0, 'k': 0.0}
    best_pred = np.zeros(n)

    # Grid search over k in [0.01, 50] with fine resolution
    k_candidates = np.concatenate([
        np.linspace(0.01, 1.0, 100),
        np.linspace(1.0, 10.0, 100),
        np.linspace(10.0, 50.0, 50),
    ])

    for k in k_candidates:
        # For fixed k: delta = b * (amp / (1 + k*amp))
        # This is linear in b: delta = b * z, where z = amp/(1+k*amp)
        z = x / (1.0 + k * x)
        # OLS for single variable through origin: b = sum(z*y) / sum(z^2)
        denom = np.sum(z ** 2)
        if denom == 0:
            continue
        b = np.sum(z * y) / denom
        y_pred = b * z
        r2 = r_squared(y, y_pred)
        if r2 > best_r2:
            best_r2 = r2
            best_params = {'b': float(b), 'k': float(k)}
            best_pred = y_pred.copy()

    r2_adj = r_squared_adj(best_r2, n, 2)
    return {
        'b': best_params['b'],
        'k': best_params['k'],
        'r2': float(best_r2),
        'r2_adj': float(r2_adj),
        'y_pred': best_pred,
    }


def compute_saturation_point(b, k, threshold_frac=0.9):
    """
    For saturating model delta = b*amp/(1+k*amp), the asymptote is b/k.
    Find amplitude where delta reaches threshold_frac of asymptote.
    delta = b*amp/(1+k*amp) = threshold_frac * (b/k)
    => amp/(1+k*amp) = threshold_frac / k
    => amp = threshold_frac * (1+k*amp) / k
    => amp - threshold_frac*amp = threshold_frac / k
    => amp * (1 - threshold_frac) = threshold_frac / k  (only if k > 0)
    => amp = threshold_frac / (k * (1 - threshold_frac))
    """
    if k <= 0 or b == 0:
        return None
    amp_sat = threshold_frac / (k * (1.0 - threshold_frac))
    if amp_sat > 10.0:  # beyond reasonable range
        return None
    return float(round(amp_sat, 4))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"[nonlinearity] Loading {INPUT_PATH}")
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    results = data['results']
    print(f"[nonlinearity] Loaded {len(results)} results")

    # ----- Step 1: Group by (perturbation_type, amplitude) -----
    # For each result, compute per-category mean abs_delta
    # grouped[(pert, amp)] -> list of per-category deltas
    grouped = defaultdict(list)

    for r in results:
        pert = r['perturbation_type']
        amp = r['amplitude']
        deltas = r['deltas']

        for cat_name, features in CATEGORIES.items():
            vals = []
            for feat in features:
                if feat in deltas and deltas[feat]['abs_delta'] is not None:
                    vals.append(abs(deltas[feat]['abs_delta']))
            if vals:
                cat_mean = sum(vals) / len(vals)
                grouped[(pert, cat_name, amp)].append(cat_mean)

    # ----- Step 2: Compute mean delta per (pert, cat, amp) -----
    # curve_data[(pert, cat)] -> list of (amp, mean_delta)
    curve_data = defaultdict(list)
    for (pert, cat, amp), vals in grouped.items():
        mean_delta = float(np.mean(vals))
        curve_data[(pert, cat)].append((amp, mean_delta))

    # Sort by amplitude
    for key in curve_data:
        curve_data[key].sort(key=lambda t: t[0])

    # ----- Step 3: Fit models for target pairs -----
    report_entries = []

    for pert, cat in TARGET_PAIRS:
        key = (pert, cat)
        if key not in curve_data or len(curve_data[key]) < 3:
            print(f"[nonlinearity] SKIP {pert} -> {cat}: insufficient data")
            continue

        points = curve_data[key]
        x = np.array([p[0] for p in points])
        y = np.array([p[1] for p in points])

        lin = fit_linear(x, y)
        quad = fit_quadratic(x, y)
        sat = fit_saturating(x, y)

        # Determine best model by adjusted R²
        models = {
            'linear': lin['r2_adj'],
            'quadratic': quad['r2_adj'],
            'saturating': sat['r2_adj'],
        }
        best_model = max(models, key=models.get)

        # Non-linearity test: quadratic significantly better than linear
        is_nonlinear = (quad['r2_adj'] - lin['r2_adj']) > 0.05

        # Saturation point (only for saturating model)
        sat_point = None
        if best_model == 'saturating' or sat['r2_adj'] > lin['r2_adj']:
            sat_point = compute_saturation_point(sat['b'], sat['k'])

        entry = {
            'perturbation': pert,
            'category': cat,
            'n_results': sum(len(grouped[(pert, cat, amp)]) for amp in AMPLITUDES),
            'linear': {
                'r2': round(lin['r2'], 6),
                'r2_adj': round(lin['r2_adj'], 6),
                'slope': round(lin['slope'], 6),
                'intercept': round(lin['intercept'], 6),
            },
            'quadratic': {
                'r2': round(quad['r2'], 6),
                'r2_adj': round(quad['r2_adj'], 6),
                'a': round(quad['a'], 6),
                'b': round(quad['b'], 6),
            },
            'saturating': {
                'r2': round(sat['r2'], 6),
                'r2_adj': round(sat['r2_adj'], 6),
                'b': round(sat['b'], 6),
                'k': round(sat['k'], 6),
            },
            'best_model': best_model,
            'is_nonlinear': is_nonlinear,
            'r2_delta_quad_lin': round(quad['r2_adj'] - lin['r2_adj'], 6),
            'curve_data': [
                {'amplitude': float(p[0]), 'mean_abs_delta': round(float(p[1]), 6)}
                for p in points
            ],
            'saturation_point': sat_point,
        }
        report_entries.append(entry)

        tag = 'NON-LINEAR' if is_nonlinear else 'LINEAR'
        print(f"  {pert} -> {cat}: best={best_model}, "
              f"R²_lin={lin['r2_adj']:.4f}, R²_quad={quad['r2_adj']:.4f}, "
              f"R²_sat={sat['r2_adj']:.4f} [{tag}]")

    # ----- Step 4: Summary stats -----
    n_nonlinear = sum(1 for e in report_entries if e['is_nonlinear'])
    n_total = len(report_entries)

    summary = {
        'total_pairs_tested': n_total,
        'nonlinear_count': n_nonlinear,
        'linear_count': n_total - n_nonlinear,
        'nonlinear_fraction': round(n_nonlinear / n_total, 4) if n_total > 0 else 0.0,
        'best_model_distribution': {},
    }
    for e in report_entries:
        m = e['best_model']
        summary['best_model_distribution'][m] = summary['best_model_distribution'].get(m, 0) + 1

    report = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'input_file': 'bench_results_v4/bench_report.json',
            'total_input_results': len(results),
            'nonlinearity_threshold': 0.05,
            'seed': 42,
        },
        'summary': summary,
        'pairs': report_entries,
    }

    # ----- Step 5: Write JSON -----
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n[nonlinearity] JSON written: {OUTPUT_JSON}")

    # ----- Step 6: Write Markdown -----
    md_lines = [
        '# Non-Linearity Analysis Report',
        '',
        f'**Generated**: {report["metadata"]["generated"]}',
        f'**Input**: {len(results)} perturbation results',
        f'**Pairs tested**: {n_total}',
        f'**Non-linear**: {n_nonlinear}/{n_total} '
        f'({summary["nonlinear_fraction"]*100:.1f}%)',
        '',
        '## Summary',
        '',
        '| Best Model | Count |',
        '|------------|-------|',
    ]
    for model, count in sorted(summary['best_model_distribution'].items()):
        md_lines.append(f'| {model} | {count} |')

    md_lines += [
        '',
        '## Detailed Results',
        '',
        '| Perturbation | Category | Best Model | R²_lin | R²_quad | '
        'R²_sat | ΔR²(q-l) | Non-linear? |',
        '|---|---|---|---|---|---|---|---|',
    ]

    for e in report_entries:
        nl_flag = 'YES' if e['is_nonlinear'] else 'no'
        pert_short = e['perturbation'].replace('_', ' ')
        md_lines.append(
            f"| {pert_short} | {e['category']} | {e['best_model']} | "
            f"{e['linear']['r2_adj']:.4f} | {e['quadratic']['r2_adj']:.4f} | "
            f"{e['saturating']['r2_adj']:.4f} | {e['r2_delta_quad_lin']:+.4f} | "
            f"{nl_flag} |"
        )

    md_lines += [
        '',
        '## Curve Data',
        '',
    ]

    for e in report_entries:
        md_lines.append(f"### {e['perturbation']} → {e['category']}")
        md_lines.append('')
        md_lines.append('| Amplitude | Mean |Δ| |')
        md_lines.append('|-----------|---------|')
        for pt in e['curve_data']:
            md_lines.append(f"| {pt['amplitude']:.2f} | {pt['mean_abs_delta']:.6f} |")
        if e['saturation_point'] is not None:
            md_lines.append(f"\nSaturation point (90%): amplitude ≈ {e['saturation_point']}")
        md_lines.append('')

    md_lines += [
        '---',
        '*Analysis: no scipy dependency. Models fitted via numpy OLS + grid search.*',
        '',
    ]

    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_lines))
    print(f"[nonlinearity] Markdown written: {OUTPUT_MD}")

    print(f"\n[nonlinearity] Done. {n_nonlinear}/{n_total} pairs are non-linear.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
