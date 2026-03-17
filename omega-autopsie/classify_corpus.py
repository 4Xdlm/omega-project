#!/usr/bin/env python3
"""
OMEGA — Classify Corpus by Language and Period
Phase W — Day 3 — Mission B

Detects language (FR/EN/ES) by stopword frequency.
Classifies by period using year metadata.
Updates corpus_manifest_v2.json.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "corpus_manifest_v2.json")
CACHE_DIR = os.path.join(os.path.dirname(__file__), "gutenberg_cache")

# Stopword sets for language detection
STOPWORDS = {
    "FR": {"le", "la", "les", "de", "des", "un", "une", "que", "qui", "dans",
            "il", "elle", "est", "sont", "pas", "nous", "vous", "mais", "avec",
            "pour", "sur", "ce", "cette", "ses", "mon", "son", "au", "aux", "du"},
    "EN": {"the", "of", "and", "to", "in", "a", "is", "that", "was", "for",
            "it", "with", "he", "she", "his", "her", "as", "are", "on", "be",
            "had", "but", "not", "have", "from", "they", "been", "has", "an"},
    "ES": {"el", "la", "los", "de", "en", "un", "una", "que", "por", "con",
            "del", "las", "se", "su", "al", "como", "era", "pero", "sus",
            "fue", "muy", "todo", "esta", "hay", "ya", "sin", "más", "donde"},
}

PERIODS = [
    ("PERIOD_1", 0, 1750, "Classicisme"),
    ("PERIOD_2", 1750, 1800, "Lumières"),
    ("PERIOD_3", 1800, 1850, "Romantisme"),
    ("PERIOD_4", 1850, 1900, "Réalisme"),
    ("PERIOD_5", 1900, 1950, "Modernisme"),
    ("PERIOD_6", 1950, 9999, "Contemporain"),
]


def detect_language(filepath: str) -> str:
    """Detect language by counting stopwords in first 2000 words."""
    if not os.path.exists(filepath):
        return "UNKNOWN"
    with open(filepath, encoding="utf-8", errors="replace") as f:
        text = f.read()
    # Skip first 5% (header area)
    start = len(text) // 20
    words = re.findall(r"[a-zA-ZàâäéèêëïîôùûüÿçœæÀ-ÿáéíóúñ¿¡]+", text[start:].lower())[:2000]

    scores = {}
    for lang, sw in STOPWORDS.items():
        scores[lang] = sum(1 for w in words if w in sw)

    if not scores:
        return "UNKNOWN"
    best = max(scores, key=scores.get)
    # Need at least 5% stopword hit rate to be confident
    if scores[best] < len(words) * 0.05:
        return "UNKNOWN"
    return best


def classify_period(year: int) -> str:
    """Classify by period based on year."""
    if year == 0:
        return "UNKNOWN"
    for pid, lo, hi, _ in PERIODS:
        if lo <= year < hi:
            return pid
    return "PERIOD_6"


def main():
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    lang_changes = 0
    for entry in manifest:
        filepath = os.path.join(os.path.dirname(__file__), entry["filepath"])

        # Detect language if UNKNOWN
        if entry["language"] == "UNKNOWN":
            detected = detect_language(filepath)
            entry["language"] = detected
            entry["language_detected"] = True
            lang_changes += 1
        else:
            entry["language_detected"] = False

        # Classify period
        entry["period"] = classify_period(entry.get("year", 0))

    # Save updated manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Stats
    by_lang = {}
    by_period = {}
    for m in manifest:
        l = m["language"]
        p = m.get("period", "UNKNOWN")
        by_lang[l] = by_lang.get(l, 0) + 1
        by_period[p] = by_period.get(p, 0) + 1

    print(f"[CLASSIFY] Updated {len(manifest)} entries")
    print(f"  Language changes: {lang_changes}")
    print(f"  By language: {by_lang}")
    print(f"  By period: {by_period}")


if __name__ == "__main__":
    main()
