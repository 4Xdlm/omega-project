#!/usr/bin/env python3
"""
OMEGA — Lexical LLM Perturbation Test
Phase W — Bench Layer

Tests lexical perturbations (simplify/enrich vocabulary) using LLM micro-calls
on 200 sampled chapters from results_v4/chapters/.

Volume: 200 chapters × 3 sentences × 2 types = 1200 API calls
Model: claude-haiku-4-5-20251001

Standard: NASA-Grade L4 / DO-178C Level A
"""

import os
import sys
import json
import time
import random
import traceback
from datetime import datetime, timezone
from statistics import mean

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHAPTERS_DIR = os.path.join(BASE_DIR, "results_v4", "chapters")
OUTPUT_DIR = os.path.join(BASE_DIR, "bench_results_v4")

sys.path.insert(0, BASE_DIR)
from speed_analyzer import analyze

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

SEED = 42
N_CHAPTERS = 200
N_SENTENCES = 3  # per chapter: at 25%, 50%, 75%
RATE_LIMIT_SLEEP = 0.05

PROMPT_SIMPLIFY = (
    "Réécris cette phrase en utilisant uniquement un vocabulaire simple et courant, "
    "comme si tu parlais à un enfant de 12 ans. Même sens, même longueur. "
    "Réponds UNIQUEMENT avec la phrase modifiée."
)

PROMPT_ENRICH = (
    "Réécris cette phrase en utilisant un vocabulaire littéraire, précieux et rare. "
    "Même sens, même longueur. "
    "Réponds UNIQUEMENT avec la phrase modifiée."
)

CATEGORIES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}

ALL_FEATURES = []
for feats in CATEGORIES.values():
    ALL_FEATURES.extend(feats)


# ═══════════════════════════════════════════════════════════════════════════════
# LLM CLIENT
# ═══════════════════════════════════════════════════════════════════════════════

def init_client():
    """Initialize Anthropic client."""
    import anthropic
    return anthropic.Anthropic()


def llm_call(client, prompt: str, sentence: str, max_retries: int = 1) -> str | None:
    """Make a single LLM micro-call with retry on error."""
    full_prompt = f"{prompt}\n\nPhrase : \"{sentence}\""
    for attempt in range(max_retries + 1):
        try:
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                messages=[{"role": "user", "content": full_prompt}],
            )
            return response.content[0].text.strip().strip('"')
        except Exception as e:
            if attempt < max_retries:
                print(f"  [RETRY] API error: {e}", flush=True)
                time.sleep(1.0)
            else:
                print(f"  [SKIP] API error after {max_retries + 1} attempts: {e}", flush=True)
                return None
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# SENTENCE EXTRACTION
# ═══════════════════════════════════════════════════════════════════════════════

def extract_representative_sentences(text: str) -> list[str]:
    """
    Extract 3 representative sentences from text.
    Split by ". ", filter 10-40 words, pick at 25%, 50%, 75% positions.
    """
    raw_sents = text.split(". ")
    # Filter to sentences with 10-40 words
    valid = [s.strip() for s in raw_sents if 10 <= len(s.strip().split()) <= 40]
    if len(valid) < 3:
        return valid[:len(valid)]  # return what we have

    positions = [int(len(valid) * p) for p in [0.25, 0.50, 0.75]]
    # Clamp to valid range
    positions = [min(p, len(valid) - 1) for p in positions]
    return [valid[p] for p in positions]


# ═══════════════════════════════════════════════════════════════════════════════
# PERTURBATION + MEASUREMENT
# ═══════════════════════════════════════════════════════════════════════════════

def apply_perturbation(text: str, original_sents: list[str], modified_sents: list[str]) -> str:
    """Replace original sentences with modified ones in text."""
    result = text
    for orig, mod in zip(original_sents, modified_sents):
        if mod is not None:
            result = result.replace(orig, mod, 1)
    return result


def compute_deltas(features_before: dict, features_after: dict) -> dict:
    """Compute per-feature deltas (after - before)."""
    deltas = {}
    for f in ALL_FEATURES:
        v_before = features_before.get(f, 0.0)
        v_after = features_after.get(f, 0.0)
        if v_before is not None and v_after is not None:
            deltas[f] = v_after - v_before
        else:
            deltas[f] = 0.0
    return deltas


def compute_category_deltas(deltas: dict) -> dict:
    """Compute mean abs delta per category."""
    cat_deltas = {}
    for cat, feats in CATEGORIES.items():
        vals = [abs(deltas.get(f, 0.0)) for f in feats]
        cat_deltas[cat] = round(mean(vals), 6) if vals else 0.0
    return cat_deltas


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    random.seed(SEED)
    t_start = time.time()

    print(f"=== OMEGA Lexical LLM Perturbation Test ===", flush=True)
    print(f"Date: {datetime.now(timezone.utc).isoformat()}", flush=True)
    print(f"Seed: {SEED}", flush=True)

    # --- Load chapter files ---
    all_files = sorted([
        f for f in os.listdir(CHAPTERS_DIR)
        if f.endswith(".json")
    ])
    print(f"Total chapter files: {len(all_files)}", flush=True)

    # Sample every ~7th file to get ~200
    step = max(1, len(all_files) // N_CHAPTERS)
    selected_files = all_files[::step][:N_CHAPTERS]
    print(f"Selected chapters: {len(selected_files)} (step={step})", flush=True)

    # --- Init LLM client ---
    client = init_client()
    print("Anthropic client initialized.", flush=True)

    # --- Accumulators ---
    all_deltas_simplify = []
    all_deltas_enrich = []
    n_api_calls = 0
    n_skipped = 0
    n_processed = 0

    # --- Process chapters ---
    for idx, fname in enumerate(selected_files):
        fpath = os.path.join(CHAPTERS_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                chapter = json.load(f)
        except Exception:
            n_skipped += 1
            continue

        text = chapter.get("text", "")
        if len(text.split()) < 100:
            n_skipped += 1
            continue

        # Extract representative sentences
        sents = extract_representative_sentences(text)
        if len(sents) < 1:
            n_skipped += 1
            continue

        # Measure baseline
        features_before = analyze(text)

        # --- P02b_SIMPLIFY ---
        simplified = []
        for s in sents:
            result = llm_call(client, PROMPT_SIMPLIFY, s)
            simplified.append(result)
            n_api_calls += 1
            time.sleep(RATE_LIMIT_SLEEP)

        text_simplified = apply_perturbation(text, sents, simplified)
        features_simplified = analyze(text_simplified)
        deltas_s = compute_deltas(features_before, features_simplified)
        all_deltas_simplify.append(deltas_s)

        # --- P06b_ENRICH ---
        enriched = []
        for s in sents:
            result = llm_call(client, PROMPT_ENRICH, s)
            enriched.append(result)
            n_api_calls += 1
            time.sleep(RATE_LIMIT_SLEEP)

        text_enriched = apply_perturbation(text, sents, enriched)
        features_enriched = analyze(text_enriched)
        deltas_e = compute_deltas(features_before, features_enriched)
        all_deltas_enrich.append(deltas_e)

        n_processed += 1

        if (idx + 1) % 20 == 0:
            elapsed = time.time() - t_start
            print(
                f"  [{idx + 1}/{len(selected_files)}] "
                f"processed={n_processed} skipped={n_skipped} "
                f"api_calls={n_api_calls} elapsed={elapsed:.1f}s",
                flush=True,
            )

    # --- Aggregate results ---
    print(f"\nAggregating results...", flush=True)

    def aggregate_deltas(all_deltas: list[dict]) -> dict:
        """Compute mean delta and mean abs delta per feature."""
        if not all_deltas:
            return {"mean_delta": {}, "mean_abs_delta": {}, "category_deltas": {}}
        feat_results = {}
        for f in ALL_FEATURES:
            vals = [d.get(f, 0.0) for d in all_deltas]
            feat_results[f] = {
                "mean_delta": round(mean(vals), 6),
                "mean_abs_delta": round(mean([abs(v) for v in vals]), 6),
            }
        # Category deltas (mean of mean_abs_delta for features in category)
        cat_deltas = {}
        for cat, feats in CATEGORIES.items():
            cat_vals = [feat_results[f]["mean_abs_delta"] for f in feats]
            cat_deltas[cat] = round(mean(cat_vals), 6) if cat_vals else 0.0
        # Most affected features (sorted by mean_abs_delta desc)
        ranked = sorted(feat_results.items(), key=lambda x: x[1]["mean_abs_delta"], reverse=True)
        most_affected = [{"feature": k, **v} for k, v in ranked[:5]]
        return {
            "per_feature": feat_results,
            "category_deltas": cat_deltas,
            "most_affected": most_affected,
        }

    results_simplify = aggregate_deltas(all_deltas_simplify)
    results_enrich = aggregate_deltas(all_deltas_enrich)

    elapsed_total = round(time.time() - t_start, 1)

    # --- Build JSON report ---
    report = {
        "test": "lexical_llm_perturbation",
        "date": datetime.now(timezone.utc).isoformat(),
        "seed": SEED,
        "model": "claude-haiku-4-5-20251001",
        "n_chapters": n_processed,
        "n_skipped": n_skipped,
        "n_api_calls": n_api_calls,
        "elapsed_s": elapsed_total,
        "P02b_SIMPLIFY": results_simplify,
        "P06b_ENRICH": results_enrich,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    json_path = os.path.join(OUTPUT_DIR, "lexical_llm_report.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"JSON report: {json_path}", flush=True)

    # --- Build MD report ---
    md_lines = [
        "# Lexical LLM Perturbation Report",
        "",
        f"**Date**: {report['date']}",
        f"**Model**: {report['model']}",
        f"**Chapters**: {n_processed} (skipped: {n_skipped})",
        f"**API calls**: {n_api_calls}",
        f"**Elapsed**: {elapsed_total}s",
        "",
        "## Category Deltas (mean |delta|)",
        "",
        "| Category | P02b_SIMPLIFY | P06b_ENRICH |",
        "|----------|---------------|-------------|",
    ]

    for cat in CATEGORIES:
        v_s = results_simplify.get("category_deltas", {}).get(cat, 0.0)
        v_e = results_enrich.get("category_deltas", {}).get(cat, 0.0)
        md_lines.append(f"| {cat} | {v_s:.6f} | {v_e:.6f} |")

    md_lines.extend([
        "",
        "## Most Affected Features",
        "",
        "### P02b_SIMPLIFY (top 5)",
        "",
        "| Feature | mean_delta | mean_abs_delta |",
        "|---------|-----------|----------------|",
    ])
    for item in results_simplify.get("most_affected", []):
        md_lines.append(
            f"| {item['feature']} | {item['mean_delta']:.6f} | {item['mean_abs_delta']:.6f} |"
        )

    md_lines.extend([
        "",
        "### P06b_ENRICH (top 5)",
        "",
        "| Feature | mean_delta | mean_abs_delta |",
        "|---------|-----------|----------------|",
    ])
    for item in results_enrich.get("most_affected", []):
        md_lines.append(
            f"| {item['feature']} | {item['mean_delta']:.6f} | {item['mean_abs_delta']:.6f} |"
        )

    md_lines.extend([
        "",
        "## Key Findings",
        "",
    ])

    # Determine which category is most affected per perturbation
    if results_simplify.get("category_deltas"):
        top_cat_s = max(results_simplify["category_deltas"], key=results_simplify["category_deltas"].get)
        md_lines.append(
            f"- **SIMPLIFY**: Most affected category = **{top_cat_s}** "
            f"(mean |delta| = {results_simplify['category_deltas'][top_cat_s]:.6f})"
        )
    if results_enrich.get("category_deltas"):
        top_cat_e = max(results_enrich["category_deltas"], key=results_enrich["category_deltas"].get)
        md_lines.append(
            f"- **ENRICH**: Most affected category = **{top_cat_e}** "
            f"(mean |delta| = {results_enrich['category_deltas'][top_cat_e]:.6f})"
        )

    # Compare simplify vs enrich overall
    if results_simplify.get("category_deltas") and results_enrich.get("category_deltas"):
        overall_s = mean(results_simplify["category_deltas"].values())
        overall_e = mean(results_enrich["category_deltas"].values())
        md_lines.append(
            f"- **Overall mean |delta|**: SIMPLIFY={overall_s:.6f}, ENRICH={overall_e:.6f}"
        )
        if overall_e > overall_s:
            md_lines.append("- Enrichment causes larger feature shifts than simplification.")
        else:
            md_lines.append("- Simplification causes larger feature shifts than enrichment.")

    md_lines.append("")

    md_path = os.path.join(OUTPUT_DIR, "lexical_llm_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"MD report: {md_path}", flush=True)

    print(f"\n=== DONE — {n_processed} chapters, {n_api_calls} API calls, {elapsed_total}s ===", flush=True)


if __name__ == "__main__":
    main()
