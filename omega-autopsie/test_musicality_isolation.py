#!/usr/bin/env python3
"""
OMEGA — Musicality Isolation Test
Tests whether musicality can be controlled at generation time (prompt) vs post-hoc (perturbation).

ALGORITHM:
  Part 1: Generate 5 briefs × 5 musical styles via LLM (25 texts)
  Part 2: Measure 13 features on each text, compute MUSICALITE category
  Part 3: Apply P01 + P05 post-hoc on STYLE_NEUTRE texts, compare ranges
  Analysis: prompt_range vs posthoc_range → upstream or downstream control?

Standard: NASA-Grade L4 / DO-178C Level A
"""

import os
import sys
import json
import time
import random
import traceback
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from speed_analyzer import analyze
from perturbation_engine import apply_perturbation

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

SEED = 42
random.seed(SEED)

OUTPUT_DIR = os.path.join(SCRIPT_DIR, "bench_results_v4")

BRIEFS = {
    "brief_1": "Un homme entre dans un café parisien un matin d'hiver. Il commande un espresso et observe les passants.",
    "brief_2": "Une femme découvre une lettre cachée dans un vieux livre de la bibliothèque municipale.",
    "brief_3": "Deux frères se retrouvent après dix ans de silence lors de l'enterrement de leur père.",
    "brief_4": "Un scientifique réalise que son expérience a des conséquences imprévues sur le quartier.",
    "brief_5": "Une adolescente traverse la forêt la nuit pour rejoindre un ami en difficulté.",
}

STYLES = {
    "STYLE_HACHE": "Écris un texte de 300 mots basé sur ce brief. Phrases très courtes. Maximum 8 mots par phrase. Rythme sec, percutant, sans fioritures.\nBrief: {brief}",
    "STYLE_FLUIDE": "Écris un texte de 300 mots basé sur ce brief. Longues phrases fluides et respirantes. Minimum 25 mots par phrase. Cadence lente et ondulante.\nBrief: {brief}",
    "STYLE_ASYMETRIQUE": "Écris un texte de 300 mots basé sur ce brief. Alterne brutalement entre phrases de 3 mots et phrases de 40 mots. Contraste maximum.\nBrief: {brief}",
    "STYLE_POETIQUE": "Écris un texte de 300 mots basé sur ce brief. Rythme poétique. Mesure tes phrases comme des vers. Euphonie maximale.\nBrief: {brief}",
    "STYLE_NEUTRE": "Écris un texte de 300 mots basé sur ce brief. Écris naturellement sans contrainte de rythme.\nBrief: {brief}",
}

MUSICALITY_FEATURES = ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"]


# ═══════════════════════════════════════════════════════════════════════════════
# LLM GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

def generate_text(prompt: str, retries: int = 3) -> str:
    """Call Anthropic API to generate text. Retries on transient errors."""
    import anthropic
    client = anthropic.Anthropic()

    for attempt in range(retries):
        try:
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            print(f"  [API ERROR attempt {attempt + 1}/{retries}] {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                print(f"  [FATAL] Giving up after {retries} attempts")
                return ""


# ═══════════════════════════════════════════════════════════════════════════════
# MUSICALITY SCORE
# ═══════════════════════════════════════════════════════════════════════════════

def compute_musicality(features: dict) -> float:
    """Musicality = mean(f1_mean, f1a_rhythm_variance, f19e_window_median)."""
    vals = [features.get(k, 0.0) for k in MUSICALITY_FEATURES]
    return round(sum(vals) / len(vals), 4) if vals else 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# PART 1 — GENERATE 25 TEXTS
# ═══════════════════════════════════════════════════════════════════════════════

def part1_generate() -> dict:
    """Generate 5 briefs × 5 styles = 25 texts."""
    texts = {}
    total = len(BRIEFS) * len(STYLES)
    count = 0

    for brief_id, brief_text in BRIEFS.items():
        for style_id, style_template in STYLES.items():
            count += 1
            key = f"{brief_id}__{style_id}"
            prompt = style_template.format(brief=brief_text)
            print(f"  [{count}/{total}] Generating {key}...")
            text = generate_text(prompt)
            texts[key] = text
            if text:
                print(f"    -> {len(text.split())} words generated")
            else:
                print(f"    -> FAILED (empty)")

    return texts


# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — MEASURE FEATURES
# ═══════════════════════════════════════════════════════════════════════════════

def part2_measure(texts: dict) -> dict:
    """Measure all 13 features + musicality on each text."""
    results = {}
    for key, text in texts.items():
        if not text:
            results[key] = {"features": {}, "musicality": 0.0, "word_count": 0}
            continue
        features = analyze(text)
        musicality = compute_musicality(features)
        results[key] = {
            "features": features,
            "musicality": musicality,
            "word_count": len(text.split()),
        }
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — POST-HOC CORRECTION ON STYLE_NEUTRE
# ═══════════════════════════════════════════════════════════════════════════════

def part3_posthoc(texts: dict) -> dict:
    """Apply P01 + P05 at amplitude 0.50 on STYLE_NEUTRE texts, measure delta."""
    corrections = {}

    for brief_id in BRIEFS:
        key_neutre = f"{brief_id}__STYLE_NEUTRE"
        text_neutre = texts.get(key_neutre, "")
        if not text_neutre:
            corrections[brief_id] = {"error": "no neutral text"}
            continue

        # Apply P01 (uniformize rhythm) at amplitude 0.50
        text_p01, meta_p01 = apply_perturbation(text_neutre, "P01_UNIFORMIZE_RHYTHM", 0.50)
        # Apply P05 (syncopes) at amplitude 0.50 on top of P01
        text_corrected, meta_p05 = apply_perturbation(text_p01, "P05_INJECT_SYNCOPES", 0.50)

        features_before = analyze(text_neutre)
        features_after = analyze(text_corrected)

        musicality_before = compute_musicality(features_before)
        musicality_after = compute_musicality(features_after)

        corrections[brief_id] = {
            "musicality_before": musicality_before,
            "musicality_after": musicality_after,
            "musicality_delta": round(abs(musicality_after - musicality_before), 4),
            "features_before": features_before,
            "features_after": features_after,
            "perturbation_meta": {"P01": meta_p01, "P05": meta_p05},
            "word_count_before": len(text_neutre.split()),
            "word_count_after": len(text_corrected.split()),
        }
        print(f"  [{brief_id}] musicality: {musicality_before:.4f} -> {musicality_after:.4f} (delta={abs(musicality_after - musicality_before):.4f})")

    return corrections


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

def run_analysis(measurements: dict, corrections: dict) -> dict:
    """Compare prompt variation range vs post-hoc correction range."""
    # Per-brief: prompt variation range (max - min across styles)
    prompt_ranges = []
    for brief_id in BRIEFS:
        mus_values = []
        for style_id in STYLES:
            key = f"{brief_id}__{style_id}"
            m = measurements.get(key, {}).get("musicality", None)
            if m is not None and m > 0:
                mus_values.append(m)
        if len(mus_values) >= 2:
            prompt_ranges.append(max(mus_values) - min(mus_values))

    # Post-hoc correction deltas
    posthoc_deltas = []
    for brief_id, corr in corrections.items():
        delta = corr.get("musicality_delta", 0.0)
        if delta > 0:
            posthoc_deltas.append(delta)

    avg_prompt_range = round(sum(prompt_ranges) / len(prompt_ranges), 4) if prompt_ranges else 0.0
    avg_posthoc_delta = round(sum(posthoc_deltas) / len(posthoc_deltas), 4) if posthoc_deltas else 0.0

    ratio = round(avg_prompt_range / avg_posthoc_delta, 2) if avg_posthoc_delta > 0 else float("inf")

    if avg_prompt_range > 2 * avg_posthoc_delta:
        conclusion = "Musicality is controlled upstream (prompt), not downstream (perturbation)"
    elif avg_posthoc_delta > 2 * avg_prompt_range:
        conclusion = "Musicality is controlled downstream (perturbation), not upstream (prompt)"
    else:
        conclusion = "Musicality is influenced by both prompt and perturbation in comparable measure"

    return {
        "prompt_ranges_per_brief": prompt_ranges,
        "posthoc_deltas_per_brief": posthoc_deltas,
        "avg_prompt_range": avg_prompt_range,
        "avg_posthoc_delta": avg_posthoc_delta,
        "ratio_prompt_over_posthoc": ratio,
        "conclusion": conclusion,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# OUTPUT
# ═══════════════════════════════════════════════════════════════════════════════

def write_json_report(measurements: dict, corrections: dict, analysis: dict, texts: dict):
    """Write JSON report to bench_results_v4/musicality_isolation_report.json."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, "musicality_isolation_report.json")

    report = {
        "meta": {
            "date": datetime.now().isoformat(),
            "seed": SEED,
            "n_briefs": len(BRIEFS),
            "n_styles": len(STYLES),
            "n_texts": len(texts),
            "perturbations_applied": ["P01_UNIFORMIZE_RHYTHM@0.50", "P05_INJECT_SYNCOPES@0.50"],
        },
        "measurements": measurements,
        "corrections": corrections,
        "analysis": analysis,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n  JSON report -> {path}")
    return path


def write_md_report(measurements: dict, corrections: dict, analysis: dict):
    """Write Markdown report to bench_results_v4/musicality_isolation_report.md."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, "musicality_isolation_report.md")

    lines = []
    lines.append("# Musicality Isolation Report")
    lines.append(f"**Date**: {datetime.now().isoformat()}")
    lines.append(f"**Seed**: {SEED}")
    lines.append("")

    # Part 2: Musicality per brief × style
    lines.append("## Part 2 — Musicality per Brief × Style")
    lines.append("")
    header = "| Brief | " + " | ".join(STYLES.keys()) + " |"
    sep = "|-------|" + "|".join(["-------"] * len(STYLES)) + "|"
    lines.append(header)
    lines.append(sep)

    for brief_id in BRIEFS:
        row = f"| {brief_id} |"
        for style_id in STYLES:
            key = f"{brief_id}__{style_id}"
            m = measurements.get(key, {}).get("musicality", 0.0)
            row += f" {m:.4f} |"
        lines.append(row)
    lines.append("")

    # Part 3: Post-hoc corrections
    lines.append("## Part 3 — Post-hoc Corrections (P01 + P05 @ 0.50)")
    lines.append("")
    lines.append("| Brief | Before | After | Delta |")
    lines.append("|-------|--------|-------|-------|")
    for brief_id, corr in corrections.items():
        if "error" in corr:
            lines.append(f"| {brief_id} | ERROR | ERROR | ERROR |")
        else:
            lines.append(f"| {brief_id} | {corr['musicality_before']:.4f} | {corr['musicality_after']:.4f} | {corr['musicality_delta']:.4f} |")
    lines.append("")

    # Analysis
    lines.append("## Analysis")
    lines.append("")
    lines.append(f"- **Avg prompt variation range**: {analysis['avg_prompt_range']:.4f}")
    lines.append(f"- **Avg post-hoc correction delta**: {analysis['avg_posthoc_delta']:.4f}")
    lines.append(f"- **Ratio (prompt / posthoc)**: {analysis['ratio_prompt_over_posthoc']:.2f}")
    lines.append("")
    lines.append(f"**Conclusion**: {analysis['conclusion']}")
    lines.append("")

    # Feature details per style (aggregated across briefs)
    lines.append("## Feature Means per Style (aggregated across briefs)")
    lines.append("")
    all_feature_keys = ["f1_mean", "f1a_rhythm_variance", "f19e_window_median",
                        "f21e_ritual_index", "f22f_literary_index", "f23d_literary_causal_score",
                        "f24e_contrast_score", "f25g_description_score", "f26c_period_score",
                        "f27d_modal_score", "f28d_sil_score", "f29b_ttr_window", "f30d_ps_imp_ratio"]
    header2 = "| Feature | " + " | ".join(STYLES.keys()) + " |"
    sep2 = "|---------|" + "|".join(["-------"] * len(STYLES)) + "|"
    lines.append(header2)
    lines.append(sep2)

    for feat in all_feature_keys:
        row = f"| {feat} |"
        for style_id in STYLES:
            vals = []
            for brief_id in BRIEFS:
                key = f"{brief_id}__{style_id}"
                v = measurements.get(key, {}).get("features", {}).get(feat, None)
                if v is not None:
                    vals.append(v)
            avg = sum(vals) / len(vals) if vals else 0.0
            row += f" {avg:.3f} |"
        lines.append(row)
    lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  MD report  -> {path}")
    return path


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    t0 = time.time()
    print("=" * 70)
    print("OMEGA — Musicality Isolation Test")
    print("=" * 70)

    # Part 1: Generate
    print("\n[PART 1] Generating 25 texts (5 briefs × 5 styles)...")
    texts = part1_generate()
    n_ok = sum(1 for t in texts.values() if t)
    print(f"  -> {n_ok}/25 texts generated successfully")

    if n_ok == 0:
        print("[FATAL] No texts generated. Aborting.")
        sys.exit(1)

    # Part 2: Measure
    print("\n[PART 2] Measuring features on all texts...")
    measurements = part2_measure(texts)
    print(f"  -> {len(measurements)} texts measured")

    # Part 3: Post-hoc
    print("\n[PART 3] Applying post-hoc corrections on STYLE_NEUTRE texts...")
    corrections = part3_posthoc(texts)

    # Analysis
    print("\n[ANALYSIS] Comparing prompt variation vs post-hoc correction...")
    analysis = run_analysis(measurements, corrections)
    print(f"  Avg prompt range:    {analysis['avg_prompt_range']:.4f}")
    print(f"  Avg posthoc delta:   {analysis['avg_posthoc_delta']:.4f}")
    print(f"  Ratio:               {analysis['ratio_prompt_over_posthoc']:.2f}")
    print(f"  -> {analysis['conclusion']}")

    # Output
    print("\n[OUTPUT] Writing reports...")
    write_json_report(measurements, corrections, analysis, texts)
    write_md_report(measurements, corrections, analysis)

    elapsed = time.time() - t0
    print(f"\n[DONE] Total time: {elapsed:.1f}s")


if __name__ == "__main__":
    main()
