#!/usr/bin/env python3
"""
OMEGA PVI — Phase P1 Correction: FL 3 seuils + MS_v2 benchmark
Teste les 3 variantes FL et le nouveau MS_v2 sur 5 titres pilotes.
"""
import os
import sys
import statistics
import json

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pvi_nlp_scorer import (
    load_text, extract_windows, get_nlp, find_book_file,
    _import_wordfreq, _import_vader, BENCHMARK_BOOKS
)

# ============================================================================
# FL VARIANT A — top-5000 seuil
# ============================================================================
def extract_FL_A(text_windows, lang):
    """FL with top-5000 threshold (stricter)."""
    wordfreq = _import_wordfreq()
    nlp = get_nlp(lang)

    top_5k = wordfreq.top_n_list(lang, 5000)
    seuil_5k = wordfreq.word_frequency(top_5k[-1], lang) if top_5k else 1e-5

    fl_per_window = []
    for window in text_windows:
        doc = nlp(window[:500000])
        ner_indices = set()
        for ent in doc.ents:
            if ent.label_ in ("PER", "PERS", "GPE", "ORG", "WORK_OF_ART",
                               "LOC", "PERSON", "FAC"):
                for i in range(ent.start, ent.end):
                    ner_indices.add(i)

        total = 0
        below = 0
        for token in doc:
            if token.i in ner_indices:
                continue
            if token.is_punct or token.is_space or len(token.text) < 2:
                continue
            if token.like_num:
                continue
            word = token.text.lower()
            freq = wordfreq.word_frequency(word, lang)
            total += 1
            if freq < seuil_5k:
                below += 1

        fl_per_window.append(below / total if total > 0 else 0.0)

    return statistics.mean(fl_per_window) if fl_per_window else 0.0


# ============================================================================
# FL VARIANT B — fixed threshold 1e-5 (strict frequency cutoff)
# ============================================================================
def extract_FL_B(text_windows, lang):
    """FL with fixed frequency threshold 1e-5."""
    wordfreq = _import_wordfreq()
    nlp = get_nlp(lang)

    seuil = 1e-5

    fl_per_window = []
    for window in text_windows:
        doc = nlp(window[:500000])
        ner_indices = set()
        for ent in doc.ents:
            if ent.label_ in ("PER", "PERS", "GPE", "ORG", "WORK_OF_ART",
                               "LOC", "PERSON", "FAC"):
                for i in range(ent.start, ent.end):
                    ner_indices.add(i)

        total = 0
        below = 0
        for token in doc:
            if token.i in ner_indices:
                continue
            if token.is_punct or token.is_space or len(token.text) < 2:
                continue
            if token.like_num:
                continue
            word = token.text.lower()
            freq = wordfreq.word_frequency(word, lang)
            total += 1
            if freq < seuil:
                below += 1

        fl_per_window.append(below / total if total > 0 else 0.0)

    return statistics.mean(fl_per_window) if fl_per_window else 0.0


# ============================================================================
# FL VARIANT C — top-5000, tokens length >= 4 only
# ============================================================================
def extract_FL_C(text_windows, lang):
    """FL with top-5000 threshold, only tokens of length >= 4."""
    wordfreq = _import_wordfreq()
    nlp = get_nlp(lang)

    top_5k = wordfreq.top_n_list(lang, 5000)
    seuil_5k = wordfreq.word_frequency(top_5k[-1], lang) if top_5k else 1e-5

    fl_per_window = []
    for window in text_windows:
        doc = nlp(window[:500000])
        ner_indices = set()
        for ent in doc.ents:
            if ent.label_ in ("PER", "PERS", "GPE", "ORG", "WORK_OF_ART",
                               "LOC", "PERSON", "FAC"):
                for i in range(ent.start, ent.end):
                    ner_indices.add(i)

        total = 0
        below = 0
        for token in doc:
            if token.i in ner_indices:
                continue
            if token.is_punct or token.is_space:
                continue
            if token.like_num:
                continue
            if len(token.text) < 4:
                continue  # Skip short function words
            word = token.text.lower()
            freq = wordfreq.word_frequency(word, lang)
            total += 1
            if freq < seuil_5k:
                below += 1

        fl_per_window.append(below / total if total > 0 else 0.0)

    return statistics.mean(fl_per_window) if fl_per_window else 0.0


# ============================================================================
# MS V2 — 4-component rhythm-based musicalité
# ============================================================================
def extract_MS_v2(text_windows, lang):
    """
    Musicalité Syntaxique v2 — 4 composantes:
    1. Alternance rythmique (0.35)
    2. Diversité structures de début de phrase (0.25)
    3. Figures syntaxiques répétitives / anaphores (0.25)
    4. Ponctuation expressive interne (0.15)
    """
    nlp = get_nlp(lang)
    ms_per_window = []
    components_per_window = []

    for window in text_windows:
        doc = nlp(window[:500000])
        sents = list(doc.sents)
        if len(sents) < 10:
            ms_per_window.append(0.5)
            components_per_window.append({})
            continue

        # --- COMPONENT 1: Alternance rythmique (0.35) ---
        lengths = [len(list(s)) for s in sents]
        n_triplets = 0
        n_alternating = 0
        for i in range(len(lengths) - 2):
            li, lj, lk = lengths[i], lengths[i+1], lengths[i+2]
            n_triplets += 1
            # Short sandwiched: middle < both neighbors
            if lj < min(li, lk) and (min(li, lk) - lj) > 2:
                n_alternating += 1
            # Long sandwiched: middle > both neighbors
            elif lj > max(li, lk) and (lj - max(li, lk)) > 2:
                n_alternating += 1

        rhythm_ratio = n_alternating / max(n_triplets, 1)
        # Normalize: typical range 0.10-0.45 -> [0, 1]
        rhythm_norm = min(rhythm_ratio / 0.40, 1.0)

        # --- COMPONENT 2: Diversité structures début phrase (0.25) ---
        first_pos_tags = []
        for sent in sents:
            tokens_in_sent = [t for t in sent if not t.is_space and not t.is_punct]
            if tokens_in_sent:
                first_pos_tags.append(tokens_in_sent[0].pos_)

        if first_pos_tags:
            n_unique_starts = len(set(first_pos_tags))
            # How many different POS categories start sentences
            # Perfect diversity = 7+ categories out of typical 12
            diversity_ratio = n_unique_starts / 7.0
            diversity_norm = min(diversity_ratio, 1.0)

            # Also penalize if one POS dominates > 50%
            from collections import Counter
            pos_counts = Counter(first_pos_tags)
            most_common_ratio = pos_counts.most_common(1)[0][1] / len(first_pos_tags)
            # If >60% same start -> penalty
            monotony_penalty = max(0, (most_common_ratio - 0.35) / 0.35)
            diversity_norm = diversity_norm * (1 - 0.5 * min(monotony_penalty, 1.0))
        else:
            diversity_norm = 0.5

        # --- COMPONENT 3: Figures syntaxiques (anaphores) (0.25) ---
        # Detect consecutive sentences starting with same word
        first_words = []
        for sent in sents:
            tokens_in_sent = [t for t in sent if not t.is_space and not t.is_punct]
            if tokens_in_sent:
                first_words.append(tokens_in_sent[0].text.lower())
            else:
                first_words.append("")

        anaphore_count = 0
        i = 0
        while i < len(first_words) - 1:
            if first_words[i] == first_words[i+1] and first_words[i]:
                # Count consecutive same-starts
                run = 1
                while i + run < len(first_words) and first_words[i+run] == first_words[i]:
                    run += 1
                if run >= 2:
                    anaphore_count += run
                i += run
            else:
                i += 1

        anaphore_ratio = anaphore_count / max(len(first_words), 1)
        # Normalize: typical 0.02-0.15 -> literary texts have more
        anaphore_norm = min(anaphore_ratio / 0.12, 1.0)

        # Simple inversion detection: sentences starting with verb or adverb
        # (non-standard SVO order = syntactic sophistication)
        inversion_count = sum(1 for pos in first_pos_tags
                              if pos in ("VERB", "AUX", "ADV", "ADP"))
        inversion_ratio = inversion_count / max(len(first_pos_tags), 1)
        inversion_norm = min(inversion_ratio / 0.40, 1.0)

        repetition_score = 0.70 * anaphore_norm + 0.30 * inversion_norm

        # --- COMPONENT 4: Ponctuation expressive interne (0.15) ---
        internal_punct_count = 0
        for sent in sents:
            for token in sent:
                if token.text in (",", ";", ":", "—", "–", "..."):
                    internal_punct_count += 1

        punct_per_sentence = internal_punct_count / max(len(sents), 1)
        # Normalize: typical 1-6 per sentence
        punct_norm = min(punct_per_sentence / 5.0, 1.0)

        # --- COMBINE ---
        ms = (0.35 * rhythm_norm +
              0.25 * diversity_norm +
              0.25 * repetition_score +
              0.15 * punct_norm)

        ms_per_window.append(ms)
        components_per_window.append({
            "rhythm": round(rhythm_norm, 4),
            "diversity": round(diversity_norm, 4),
            "repetition": round(repetition_score, 4),
            "punct": round(punct_norm, 4),
        })

    ms_mean = statistics.mean(ms_per_window) if ms_per_window else 0.5
    ms_sigma = statistics.stdev(ms_per_window) if len(ms_per_window) > 1 else 0.0

    return {
        "score": round(ms_mean, 4),
        "sigma": round(ms_sigma, 4),
        "per_window": [round(x, 4) for x in ms_per_window],
        "components": components_per_window,
        "methode": "rhythm_diversity_anaphore_punct",
        "tag": "NLP-ROBUSTE-v2",
    }


# ============================================================================
# BENCHMARK RUNNER
# ============================================================================
def run_correction_benchmark():
    """Run FL 3-seuil + MS v2 benchmark on 5 pilot books."""
    print("=" * 80)
    print("OMEGA PVI — Phase P1 Correction Benchmark")
    print("FL: 3 seuils (A=top5k, B=1e-5, C=top5k+len4)")
    print("MS: v2 (rhythm+diversity+anaphore+punct)")
    print("=" * 80)

    # Expected values
    expected = {
        "L'Etranger (Camus)": {"FL": 0.18, "MS": 0.82},
        "Du cote de chez Swann (Proust)": {"FL": 0.72, "MS": 0.92},
        "Madame Bovary (Flaubert)": {"FL": 0.45, "MS": 0.90},
        "Gone Girl (Flynn)": {"FL": 0.20, "MS": 0.72},
        "It Ends With Us (Hoover)": {"FL": 0.12, "MS": 0.55},
    }

    results = {}
    report = []
    report.append("# Rapport Benchmark NLP v2 — Phase P1 Corrections\n")
    report.append("**Date**: 2026-03-29\n")
    report.append("**Objectif**: Corriger FL (seuil adaptatif) et MS (rythme v2)\n\n")

    # --- FL BENCHMARK ---
    report.append("## 1. FL — 3 seuils compares\n\n")
    report.append("| Titre | FL_proxy | FL_A (top5k) | dA | FL_B (1e-5) | dB | FL_C (top5k+len4) | dC |\n")
    report.append("|-------|---------|-------------|-----|------------|-----|-------------------|-----|\n")

    fl_deltas = {"A": [], "B": [], "C": []}
    fl_scores_by_test = {"A": {}, "B": {}, "C": {}}

    for lang, books in BENCHMARK_BOOKS.items():
        for book_info in books:
            filepath = find_book_file(book_info["file_pattern"], lang)
            if not filepath:
                print(f"  SKIP: {book_info['title']} — not found")
                continue

            title = book_info["title"]
            fl_expected = expected.get(title, {}).get("FL", 0)
            print(f"\n--- {title} ---")
            print(f"  File: {os.path.basename(filepath)}")

            text = load_text(filepath)
            windows, _ = extract_windows(text)
            print(f"  Text: {len(text):,} chars, {len(windows)} windows")

            # Test A
            print("  FL_A (top5k)...", end=" ", flush=True)
            fl_a = extract_FL_A(windows, lang)
            da = abs(fl_a - fl_expected)
            fl_deltas["A"].append(da)
            fl_scores_by_test["A"][title] = fl_a
            print(f"{fl_a:.4f} (d={da:.4f})")

            # Test B
            print("  FL_B (1e-5)...", end=" ", flush=True)
            fl_b = extract_FL_B(windows, lang)
            db = abs(fl_b - fl_expected)
            fl_deltas["B"].append(db)
            fl_scores_by_test["B"][title] = fl_b
            print(f"{fl_b:.4f} (d={db:.4f})")

            # Test C
            print("  FL_C (top5k+len4)...", end=" ", flush=True)
            fl_c = extract_FL_C(windows, lang)
            dc = abs(fl_c - fl_expected)
            fl_deltas["C"].append(dc)
            fl_scores_by_test["C"][title] = fl_c
            print(f"{fl_c:.4f} (d={dc:.4f})")

            def verdict(d):
                if d < 0.10: return "CONVERGENT"
                elif d < 0.20: return "INSTABLE"
                else: return "INUTILISABLE"

            report.append(
                f"| {title} | {fl_expected:.2f} | "
                f"{fl_a:.4f} | {da:.4f} {verdict(da)} | "
                f"{fl_b:.4f} | {db:.4f} {verdict(db)} | "
                f"{fl_c:.4f} | {dc:.4f} {verdict(dc)} |\n"
            )

            # Store windows for MS
            results[title] = {"windows": windows, "lang": lang, "filepath": filepath}

    # FL summary
    report.append(f"\n### FL Resume\n")
    for test_id in ["A", "B", "C"]:
        deltas = fl_deltas[test_id]
        mean_d = statistics.mean(deltas) if deltas else 999
        conv = sum(1 for d in deltas if d < 0.10)
        report.append(f"- **Test {test_id}**: delta moyen = {mean_d:.4f}, "
                      f"CONVERGENT = {conv}/{len(deltas)}\n")

    # Determine best FL test
    best_test = min(fl_deltas, key=lambda k: statistics.mean(fl_deltas[k]) if fl_deltas[k] else 999)
    report.append(f"\n**Meilleur test FL: {best_test}** "
                  f"(delta moyen = {statistics.mean(fl_deltas[best_test]):.4f})\n")

    # Check ordering for best test
    scores = fl_scores_by_test[best_test]
    expected_order = [
        "Du cote de chez Swann (Proust)",
        "Madame Bovary (Flaubert)",
        "Gone Girl (Flynn)",
        "L'Etranger (Camus)",
        "It Ends With Us (Hoover)",
    ]
    actual_order = sorted(scores.keys(), key=lambda t: -scores[t])
    report.append(f"\nOrdonnancement attendu (FL decroissant): Proust > Bovary > Flynn ~ Camus > Hoover\n")
    report.append(f"Ordonnancement obtenu (Test {best_test}): ")
    report.append(" > ".join(f"{t.split('(')[1].strip(')')}({scores[t]:.3f})" for t in actual_order))
    report.append("\n")

    # Check key orderings
    proust = scores.get("Du cote de chez Swann (Proust)", 0)
    bovary = scores.get("Madame Bovary (Flaubert)", 0)
    flynn = scores.get("Gone Girl (Flynn)", 0)
    camus = scores.get("L'Etranger (Camus)", 0)
    hoover = scores.get("It Ends With Us (Hoover)", 0)

    order_ok = (proust > bovary and bovary > max(flynn, camus) and
                min(flynn, camus) > hoover)
    report.append(f"Ordonnancement preserve: **{'OUI' if order_ok else 'PARTIEL'}**\n")

    # --- MS BENCHMARK ---
    report.append(f"\n## 2. MS v2 — 4 composantes rythme\n\n")
    report.append("| Titre | MS_proxy | MS_v2 | Delta | Verdict | Composantes |\n")
    report.append("|-------|---------|-------|-------|---------|-------------|\n")

    ms_deltas = []
    ms_scores = {}

    for title, data in results.items():
        ms_expected = expected.get(title, {}).get("MS", 0)
        print(f"\n--- MS v2: {title} ---")

        ms_result = extract_MS_v2(data["windows"], data["lang"])
        ms_val = ms_result["score"]
        dm = abs(ms_val - ms_expected)
        ms_deltas.append(dm)
        ms_scores[title] = ms_val

        vdict = "CONVERGENT" if dm < 0.15 else ("INSTABLE" if dm < 0.25 else "INUTILISABLE")
        comps = ms_result.get("components", [{}])
        comp_str = ""
        if comps and comps[0]:
            c = comps[0]
            comp_str = f"rhy={c.get('rhythm',0):.2f} div={c.get('diversity',0):.2f} rep={c.get('repetition',0):.2f} pct={c.get('punct',0):.2f}"

        report.append(
            f"| {title} | {ms_expected:.2f} | {ms_val:.4f} | {dm:.4f} | {vdict} | {comp_str} |\n"
        )
        print(f"  MS_v2={ms_val:.4f} vs proxy={ms_expected:.2f} delta={dm:.4f} -> {vdict}")
        if comps:
            for i, c in enumerate(comps):
                if c:
                    print(f"    Window {i}: rhythm={c.get('rhythm',0):.3f} "
                          f"diversity={c.get('diversity',0):.3f} "
                          f"repetition={c.get('repetition',0):.3f} "
                          f"punct={c.get('punct',0):.3f}")

    # MS summary
    conv_ms = sum(1 for d in ms_deltas if d < 0.15)
    report.append(f"\n### MS v2 Resume\n")
    report.append(f"- Delta moyen: {statistics.mean(ms_deltas):.4f}\n")
    report.append(f"- CONVERGENT (d<0.15): {conv_ms}/{len(ms_deltas)}\n")

    # MS ordering
    ms_order = sorted(ms_scores.keys(), key=lambda t: -ms_scores[t])
    report.append(f"\nOrdonnancement attendu (MS decroissant): Proust ~ Bovary > Camus ~ Flynn > Hoover\n")
    report.append(f"Ordonnancement obtenu: ")
    report.append(" > ".join(f"{t.split('(')[1].strip(')')}({ms_scores[t]:.3f})" for t in ms_order))
    report.append("\n")

    proust_ms = ms_scores.get("Du cote de chez Swann (Proust)", 0)
    hoover_ms = ms_scores.get("It Ends With Us (Hoover)", 0)
    ms_order_ok = proust_ms > hoover_ms
    report.append(f"Proust > Hoover: **{'OUI' if ms_order_ok else 'NON'}**\n")

    # --- GLOBAL VERDICT ---
    fl_conv_count = sum(1 for d in fl_deltas[best_test] if d < 0.10)
    fl_pass = fl_conv_count >= 4 and order_ok
    ms_pass = conv_ms >= 3 and ms_order_ok

    report.append(f"\n## 3. Verdict Global\n\n")
    report.append(f"| Critere | Resultat | Pass |\n")
    report.append(f"|---------|----------|------|\n")
    report.append(f"| FL CONVERGENT >= 4/5 | {fl_conv_count}/5 | {'PASS' if fl_conv_count >= 4 else 'FAIL'} |\n")
    report.append(f"| FL ordonnancement | {'OUI' if order_ok else 'PARTIEL'} | {'PASS' if order_ok else 'FAIL'} |\n")
    report.append(f"| MS CONVERGENT >= 3/5 (d<0.15) | {conv_ms}/5 | {'PASS' if conv_ms >= 3 else 'FAIL'} |\n")
    report.append(f"| MS Proust > Hoover | {'OUI' if ms_order_ok else 'NON'} | {'PASS' if ms_order_ok else 'FAIL'} |\n")

    overall = "PHASE P1 CORRECTIONS PASS" if (fl_pass and ms_pass) else "PHASE P1 CORRECTIONS — VOIR DETAILS"
    report.append(f"\n**Verdict: {overall}**\n")

    report.append(f"\n### Decision adoptee\n")
    report.append(f"- FL: adopter **Test {best_test}** (delta moyen {statistics.mean(fl_deltas[best_test]):.4f})\n")
    report.append(f"- MS: adopter **MS v2** (4 composantes rythme)\n")

    # Write report
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "rapport_benchmark_nlp_v2.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.writelines(report)
    print(f"\n{'='*80}")
    print(f"Report: {report_path}")
    print(f"FL best: Test {best_test}")
    print(f"Verdict: {overall}")
    print(f"{'='*80}")

    return best_test, fl_scores_by_test[best_test], ms_scores


if __name__ == "__main__":
    run_correction_benchmark()
