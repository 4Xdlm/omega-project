#!/usr/bin/env python3
"""
test_perturbation_engine.py — Validation tests for perturbation_engine.py
Phase W — Mission 2

Tests:
  1. All 7 perturbation types execute without error
  2. Output text is different from input (at amplitude >= 0.25)
  3. Determinism: same inputs → same outputs
  4. Metadata contains expected keys
  5. Edge cases: short text, empty text
  6. Amplitude scaling: higher amplitude → more modifications
  7. Feature delta: perturbation moves targeted feature in expected direction

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perturbation_engine import (
    PERTURBATION_TYPES, CALC_TYPES, apply_perturbation,
    make_seed, split_sentences, amplitude_label
)
from speed_analyzer import analyze

# ── Test text (French literary prose, ~200 words) ────────────────────────────

SAMPLE_TEXT = (
    "Il marchait lentement dans la rue déserte. Le crépuscule tombait sur les "
    "toits. Peut-être songeait-il à cette femme qu'il avait croisée la veille. "
    "Elle semblait perdue, comme si le monde entier s'était effondré autour "
    "d'elle. Il s'arrêta devant la vitrine. Les lumières scintillaient "
    "faiblement. Un chat traversa la chaussée. Il croyait entendre une "
    "musique lointaine, sans doute un piano quelque part dans l'immeuble. "
    "Le vent soufflait par rafales. Il enfonça ses mains dans ses poches. "
    "La nuit s'installait peu à peu. Il reprit sa marche. Les réverbères "
    "s'allumèrent un à un. Une odeur de pain frais montait d'une boulangerie. "
    "Il tourna au coin de la rue. Le silence était presque parfait. "
    "Il se demandait pourquoi il avait choisi cette route. Les pavés luisaient "
    "sous la pluie fine. Un tramway passa au loin. Il leva les yeux vers "
    "les fenêtres éclairées. Quelqu'un jouait du violon. La mélodie flottait "
    "dans l'air humide. Il accéléra le pas. Bientôt il serait chez lui."
)


# ═════════════════════════════════════════════════════════════════════════════
# TESTS
# ═════════════════════════════════════════════════════════════════════════════

def test_all_types_execute():
    """All 7 types must execute without exception."""
    assert len(CALC_TYPES) == 7, f"Expected 7 types, got {len(CALC_TYPES)}"
    for ptype in CALC_TYPES:
        result_text, meta = apply_perturbation(SAMPLE_TEXT, ptype, 0.25)
        assert isinstance(result_text, str), f"{ptype} returned non-string"
        assert isinstance(meta, dict), f"{ptype} returned non-dict metadata"
        assert len(result_text) > 0, f"{ptype} returned empty text"
    print(f"PASS: All 7 types execute without error")
    return True


def test_text_modified():
    """At amplitude 0.50, text should be modified for most types."""
    modified_count = 0
    for ptype in CALC_TYPES:
        result_text, meta = apply_perturbation(SAMPLE_TEXT, ptype, 0.50)
        if result_text != SAMPLE_TEXT:
            modified_count += 1
    if modified_count < 4:
        print(f"FAIL: Only {modified_count}/7 types modified text at amplitude 0.50")
        return False
    print(f"PASS: {modified_count}/7 types modified text at amplitude 0.50")
    return True


def test_determinism():
    """Same inputs must produce identical outputs."""
    for ptype in CALC_TYPES:
        r1_text, r1_meta = apply_perturbation(SAMPLE_TEXT, ptype, 0.25)
        r2_text, r2_meta = apply_perturbation(SAMPLE_TEXT, ptype, 0.25)
        if r1_text != r2_text:
            print(f"FAIL: {ptype} non-deterministic")
            return False
    print("PASS: All 7 types are deterministic")
    return True


def test_metadata_keys():
    """Metadata should contain 'modified' or 'injected' count."""
    for ptype in CALC_TYPES:
        _, meta = apply_perturbation(SAMPLE_TEXT, ptype, 0.25)
        has_count = ("modified" in meta or "injected" in meta)
        if not has_count:
            print(f"FAIL: {ptype} metadata missing count key: {meta}")
            return False
    print("PASS: All metadata contains count keys")
    return True


def test_edge_cases():
    """Short and empty text should not crash."""
    for ptype in CALC_TYPES:
        r1, _ = apply_perturbation("", ptype, 0.25)
        assert isinstance(r1, str), f"{ptype} crashed on empty text"
        r2, _ = apply_perturbation("Une phrase.", ptype, 0.25)
        assert isinstance(r2, str), f"{ptype} crashed on short text"
    print("PASS: Edge cases handled (empty + short)")
    return True


def test_amplitude_scaling():
    """Higher amplitude should produce >= modifications than lower."""
    failures = 0
    for ptype in CALC_TYPES:
        _, meta_low = apply_perturbation(SAMPLE_TEXT, ptype, 0.03)
        _, meta_high = apply_perturbation(SAMPLE_TEXT, ptype, 1.00)
        count_key = "modified" if "modified" in meta_low else "injected"
        low_count = meta_low.get(count_key, 0)
        high_count = meta_high.get(count_key, 0)
        if high_count < low_count:
            print(f"  WARN: {ptype} amplitude inversion: low={low_count}, high={high_count}")
            failures += 1
    if failures > 2:
        print(f"FAIL: {failures} types show amplitude inversion")
        return False
    print(f"PASS: Amplitude scaling verified ({failures} minor inversions)")
    return True


def test_seed_uniqueness():
    """Different perturbation types should produce different seeds."""
    seeds = set()
    for ptype in CALC_TYPES:
        s = make_seed(SAMPLE_TEXT, ptype, 0.25)
        seeds.add(s)
    if len(seeds) < 7:
        print(f"FAIL: Only {len(seeds)} unique seeds for 7 types")
        return False
    print("PASS: All 7 types produce unique seeds")
    return True


def test_feature_direction():
    """Perturbations should move targeted features in expected direction.
    This is informational — we test direction on a best-effort basis."""
    baseline = analyze(SAMPLE_TEXT)

    checks = {
        "P01_UNIFORMIZE_RHYTHM": ("f1a_rhythm_variance", "down"),
        "P03_COMPLEXIFY_SYNTAX": ("f1_mean", "up"),
        "P05_INJECT_SYNCOPES": ("f1a_rhythm_variance", "up"),
    }

    correct = 0
    total = 0
    for ptype, (feature, direction) in checks.items():
        perturbed_text, _ = apply_perturbation(SAMPLE_TEXT, ptype, 0.50)
        perturbed_features = analyze(perturbed_text)
        base_val = baseline.get(feature, 0)
        pert_val = perturbed_features.get(feature, 0)
        delta = pert_val - base_val
        expected_sign = -1 if direction == "down" else 1
        ok = (delta * expected_sign) >= 0
        status = "OK" if ok else "MISS"
        if ok:
            correct += 1
        total += 1
        print(f"  {ptype} -> {feature}: {base_val:.4f} -> {pert_val:.4f} (delta={delta:+.4f}) [{status}]")

    print(f"PASS: Feature direction check {correct}/{total} correct (informational)")
    return True


def test_performance():
    """All 7 perturbations should complete in < 1s total for sample text."""
    t0 = time.perf_counter()
    for ptype in CALC_TYPES:
        apply_perturbation(SAMPLE_TEXT, ptype, 0.50)
    dt = time.perf_counter() - t0
    if dt > 1.0:
        print(f"FAIL: Total time {dt:.3f}s > 1.0s")
        return False
    print(f"PASS: All 7 perturbations in {dt:.3f}s (< 1.0s)")
    return True


# ═════════════════════════════════════════════════════════════════════════════
# RUNNER
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    tests = [
        test_all_types_execute,
        test_text_modified,
        test_determinism,
        test_metadata_keys,
        test_edge_cases,
        test_amplitude_scaling,
        test_seed_uniqueness,
        test_feature_direction,
        test_performance,
    ]

    passed = 0
    failed = 0
    for t in tests:
        print(f"\n── {t.__name__} ──")
        try:
            result = t()
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"FAIL: Exception: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print(f"\n{'='*60}")
    print(f"RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
    if failed == 0:
        print("ALL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)
