#!/usr/bin/env python3
"""
OMEGA — spaCy Features Bridge
Reads text from stdin, computes 5 NLP features via spaCy, outputs JSON to stdout.

Features:
  f18a_fragment_rate   — sentences without verbs (fragments)
  f18b_nominal_rate    — sentences without verbs but with nouns
  f5_lex_verb_count    — count of lexical verbs (VERB, not AUX)
  f5a_lex_verb_density — lexical verbs / total tokens
  style_f5a_thresh     — style regime threshold (0.04/0.07/0.14)

Usage:
  echo "Le chat dort." | python spacy_features_bridge.py --lang fr
  echo "The cat sleeps." | python spacy_features_bridge.py --lang en

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import json
import argparse

MODELS = {
    "fr": "fr_core_news_lg",
    "en": "en_core_web_md",
    "es": "es_core_news_md",
}


def compute_features(text: str, lang: str) -> dict:
    import spacy

    model_name = MODELS.get(lang, MODELS["fr"])
    nlp = spacy.load(model_name)
    doc = nlp(text)

    # Sentences
    sents = list(doc.sents)
    total_sents = max(len(sents), 1)

    # F18: fragment_rate + nominal_rate
    frag_count = 0
    nom_count = 0
    for sent in sents:
        toks = [t for t in sent if not t.is_space and not t.is_punct]
        has_verb = any(t.pos_ in {"VERB", "AUX"} for t in toks)
        has_noun = any(t.pos_ in {"NOUN", "PROPN"} for t in toks)
        if not has_verb and len(toks) >= 2:
            frag_count += 1
        if not has_verb and has_noun:
            nom_count += 1

    f18a = round(frag_count / total_sents, 4)
    f18b = round(nom_count / total_sents, 4)

    # F5: lex_verb_count + lex_verb_density
    toks_all = [t for t in doc if not t.is_space and not t.is_punct]
    total_toks = max(len(toks_all), 1)
    lex_verbs = [t for t in toks_all if t.pos_ == "VERB"]
    f5_lex = len(lex_verbs)
    f5a_lex = round(f5_lex / total_toks, 4)

    # style_f5a_thresh: based on verb density regime
    # Uses f5a_verb_density (heuristic) from the TS side, but we compute from spaCy
    all_verbs = [t for t in toks_all if t.pos_ in {"VERB", "AUX"}]
    verb_density = len(all_verbs) / total_toks

    if verb_density >= 0.13:
        style_thresh = 0.14  # VERBAL regime
    elif verb_density <= 0.07:
        style_thresh = 0.04  # NOMINAL regime
    else:
        style_thresh = 0.07  # MIXED regime

    return {
        "f18a_fragment_rate": f18a,
        "f18b_nominal_rate": f18b,
        "f5_lex_verb_count": f5_lex,
        "f5a_lex_verb_density": f5a_lex,
        "style_f5a_thresh": style_thresh,
    }


def main():
    parser = argparse.ArgumentParser(description="OMEGA spaCy features bridge")
    parser.add_argument("--lang", default="fr", choices=["fr", "en", "es"])
    args = parser.parse_args()

    text = sys.stdin.read()
    if not text.strip():
        json.dump({
            "f18a_fragment_rate": 0,
            "f18b_nominal_rate": 0,
            "f5_lex_verb_count": 0,
            "f5a_lex_verb_density": 0,
            "style_f5a_thresh": 0.07,
        }, sys.stdout)
        return

    try:
        features = compute_features(text, args.lang)
        json.dump(features, sys.stdout)
    except Exception as e:
        json.dump({"error": str(e)}, sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
