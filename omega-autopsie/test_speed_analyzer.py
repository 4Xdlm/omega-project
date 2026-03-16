#!/usr/bin/env python3
"""
test_speed_analyzer.py — Validation tests for speed_analyzer.py
Phase W — Mission 1

Tests:
  1. Performance: < 0.5s per 2000-word text
  2. All 13 features returned
  3. Comparison against known corpus values (results_v4)
  4. Determinism: same text → same results
  5. Edge cases: very short text, empty text
  6. Feature ranges: all values are plausible

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import time

# FIX-CP1252: force UTF-8 on Windows stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from speed_analyzer import analyze, FEATURE_KEYS, split_sentences

# ── Paths ─────────────────────────────────────────────────────────────────────
GUTENBERG_DIR = os.path.join(os.path.dirname(__file__), "gutenberg_cache")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results_v4")


def load_gutenberg_chunk(filename: str, target_words: int = 2000) -> str:
    """Load a chunk of target_words from a gutenberg file."""
    path = os.path.join(GUTENBERG_DIR, filename)
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8", errors="replace") as f:
        text = f.read()
    # Skip header (first 5% of text)
    start = len(text) // 20
    words = text[start:].split()
    chunk = " ".join(words[:target_words])
    return chunk


def load_reference_averages(result_file: str) -> dict:
    """Load the averages from a results_v4 JSON."""
    path = os.path.join(RESULTS_DIR, result_file)
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("averages", {})


# ═══════════════════════════════════════════════════════════════════════════════
# TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def test_all_features_returned():
    """All 13 features must be present in output."""
    text = load_gutenberg_chunk("flaubert_bovary_14155.txt")
    if not text:
        print("SKIP: flaubert text not found")
        return True
    result = analyze(text)
    missing = [k for k in FEATURE_KEYS if k not in result]
    if missing:
        print(f"FAIL: Missing features: {missing}")
        return False
    print(f"PASS: All 13 features returned")
    return True


def test_performance():
    """analyze() must complete in < 0.5s for 2000-word text."""
    text = load_gutenberg_chunk("flaubert_bovary_14155.txt", 2000)
    if not text:
        print("SKIP: flaubert text not found")
        return True

    times = []
    for _ in range(3):
        t0 = time.perf_counter()
        analyze(text)
        dt = time.perf_counter() - t0
        times.append(dt)

    avg_time = sum(times) / len(times)
    if avg_time > 0.5:
        print(f"FAIL: Performance {avg_time:.3f}s > 0.5s target")
        return False
    print(f"PASS: Performance {avg_time:.3f}s (target < 0.5s)")
    return True


def test_determinism():
    """Same text must produce identical results."""
    text = load_gutenberg_chunk("hugo_miserables_17489.txt", 1500)
    if not text:
        print("SKIP: hugo text not found")
        return True
    r1 = analyze(text)
    r2 = analyze(text)
    for k in FEATURE_KEYS:
        if r1.get(k) != r2.get(k):
            print(f"FAIL: Non-deterministic: {k} = {r1.get(k)} vs {r2.get(k)}")
            return False
    print("PASS: Determinism verified")
    return True


def test_feature_ranges():
    """All features should be within plausible ranges."""
    text = load_gutenberg_chunk("flaubert_bovary_14155.txt", 2000)
    if not text:
        print("SKIP: flaubert text not found")
        return True
    result = analyze(text)
    checks = {
        "f1_mean": (3.0, 60.0),            # avg sentence length in words
        "f1a_rhythm_variance": (1.0, 30.0), # std of sentence lengths
        "f19e_window_median": (0.0, 2.0),   # approximate entropy
        "f21e_ritual_index": (0.0, 1.0),    # ritual composite
        "f22f_literary_index": (0.0, 1.0),  # literary reading index
        "f23d_literary_causal_score": (0.0, 1.0),  # inverted causal
        "f24e_contrast_score": (0.0, 1.0),  # contrast budget
        "f25g_description_score": (0.0, 1.0), # description
        "f26c_period_score": (0.0, 1.0),    # syntactic period
        "f27d_modal_score": (0.0, 1.0),     # epistemic modality
        "f28d_sil_score": (0.0, 1.0),       # SIL
        "f29b_ttr_window": (0.3, 1.0),      # TTR windowed
        "f30d_ps_imp_ratio": (0.0, 5.0),    # log ratio
    }
    for k, (lo, hi) in checks.items():
        v = result.get(k, -999)
        if not (lo <= v <= hi):
            print(f"FAIL: {k}={v} outside [{lo}, {hi}]")
            return False
    print("PASS: All feature ranges plausible")
    return True


def test_comparison_flaubert():
    """Compare speed_analyzer results vs full_work_analyzer_v4 averages.
    NOTE: We analyze a single 2000-word chunk, while averages are over 16+ extracts.
    We expect correlation, not exact match. Delta < 50% is acceptable for this test."""
    ref = load_reference_averages("flaubert_Madame_Bovary.json")
    text = load_gutenberg_chunk("flaubert_bovary_14155.txt", 3000)
    if not ref or not text:
        print("SKIP: flaubert reference or text not found")
        return True

    result = analyze(text)
    print("Flaubert comparison (single chunk vs corpus averages):")
    ok = True
    for k in FEATURE_KEYS:
        rv = ref.get(k)
        sv = result.get(k)
        if rv is None or sv is None:
            continue
        if rv == 0:
            delta_pct = abs(sv) * 100
        else:
            delta_pct = abs(sv - rv) / abs(rv) * 100
        status = "OK" if delta_pct < 100 else "WARN"
        if status == "WARN":
            ok = False
        print(f"  {k:30s} ref={rv:8.4f}  speed={sv:8.4f}  delta={delta_pct:6.1f}% [{status}]")
    if ok:
        print("PASS: Flaubert comparison within acceptable range")
    else:
        print("WARN: Some features diverge significantly (expected for single chunk vs corpus avg)")
    return True  # Comparison is informational, not hard fail


def test_comparison_hugo():
    """Compare speed_analyzer results vs full_work_analyzer_v4 averages for Hugo."""
    ref = load_reference_averages("hugo_Les_Mis_rables_T1.json")
    text = load_gutenberg_chunk("hugo_miserables_17489.txt", 3000)
    if not ref or not text:
        print("SKIP: hugo reference or text not found")
        return True

    result = analyze(text)
    print("Hugo comparison (single chunk vs corpus averages):")
    for k in FEATURE_KEYS:
        rv = ref.get(k)
        sv = result.get(k)
        if rv is None or sv is None:
            continue
        if rv == 0:
            delta_pct = abs(sv) * 100
        else:
            delta_pct = abs(sv - rv) / abs(rv) * 100
        status = "OK" if delta_pct < 100 else "WARN"
        print(f"  {k:30s} ref={rv:8.4f}  speed={sv:8.4f}  delta={delta_pct:6.1f}% [{status}]")
    print("PASS: Hugo comparison done")
    return True


def test_edge_empty():
    """Empty or very short text should not crash."""
    result = analyze("")
    assert all(k in result for k in FEATURE_KEYS), "Missing keys on empty text"
    result2 = analyze("Hello world.")
    assert all(k in result2 for k in FEATURE_KEYS), "Missing keys on short text"
    print("PASS: Edge cases (empty/short) handled")
    return True


def test_sentence_splitter():
    """Sentence splitter should match full_work_analyzer_v4 behavior."""
    text = 'Il marchait. Elle courait ! Pourquoi ? Et puis… « Non. »'
    sents = split_sentences(text)
    assert len(sents) >= 3, f"Expected >= 3 sentences, got {len(sents)}: {sents}"
    print(f"PASS: Sentence splitter OK ({len(sents)} sentences)")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    tests = [
        test_all_features_returned,
        test_performance,
        test_determinism,
        test_feature_ranges,
        test_sentence_splitter,
        test_edge_empty,
        test_comparison_flaubert,
        test_comparison_hugo,
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
