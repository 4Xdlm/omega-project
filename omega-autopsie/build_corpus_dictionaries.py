#!/usr/bin/env python3
"""
OMEGA — Build Corpus-Driven Dictionaries
Phase W — Mission B

Extracts vocabulary directly from the 235 chapter corpus and builds
replacement dictionaries that are GUARANTEED to match.

Strategy: frequency-based (language-agnostic, works for EN+FR mix)
- Rare words = bottom 30% by frequency, length >= 5
- Common words = top 500 by frequency, length >= 3
- Mappings built by similar word length for maximum TTR impact

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import re
from collections import Counter

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHAPTERS_DIR = os.path.join(os.path.dirname(__file__), "results_v4", "chapters")
RESOURCES_DIR = os.path.join(os.path.dirname(__file__), "resources")

# ── Tokenizer ─────────────────────────────────────────────────────────────────

WORD_RE = re.compile(r"[a-zA-ZàâäéèêëïîôùûüÿçœæÀ-ÿ'-]+")
STOPWORDS = {
    # English
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "not", "no", "nor",
    "so", "if", "than", "that", "this", "these", "those", "it", "its",
    "he", "she", "we", "they", "him", "her", "his", "my", "your", "our",
    "their", "me", "us", "them", "i", "you", "who", "which", "what",
    "when", "where", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "only", "own", "same", "then", "too",
    "very", "just", "about", "up", "out", "into", "over", "after", "before",
    "between", "under", "again", "further", "once", "here", "there",
    "why", "because", "as", "until", "while", "during", "through",
    "above", "below", "any", "also", "still", "even", "now", "much",
    # French
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "mais",
    "en", "dans", "sur", "par", "pour", "avec", "sans", "est", "sont",
    "être", "avoir", "fait", "pas", "ne", "se", "ce", "cette", "ces",
    "il", "elle", "ils", "elles", "nous", "vous", "on", "qui", "que",
    "quoi", "dont", "où", "si", "ni", "car", "donc", "puis", "plus",
    "moins", "très", "bien", "tout", "tous", "toute", "toutes", "mon",
    "ton", "son", "ma", "ta", "sa", "mes", "tes", "ses", "notre", "votre",
    "leur", "leurs", "au", "aux", "je", "tu", "me", "te", "lui",
}


def tokenize(text):
    """Extract clean word tokens from text."""
    return [w.lower() for w in WORD_RE.findall(text) if len(w) >= 2]


# ── Load corpus ───────────────────────────────────────────────────────────────

def load_corpus():
    """Load all chapter texts and return word frequency counter + sentence list."""
    word_freq = Counter()
    all_sentences = []

    for fname in sorted(os.listdir(CHAPTERS_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHAPTERS_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        text = data.get("text", "")
        if not text:
            continue
        tokens = tokenize(text)
        word_freq.update(tokens)
        sents = re.split(r"(?<=[.!?…»])\s+", text)
        all_sentences.extend([s.strip() for s in sents if len(s.strip()) > 10])

    return word_freq, all_sentences


# ── B1: Rare → Common (for P02_SIMPLIFY_VOCABULARY) ──────────────────────────

def build_rare_to_common(word_freq):
    """Build mapping: rare corpus words → common corpus words of similar length."""
    # Filter out stopwords and very short words
    content_words = {w: c for w, c in word_freq.items()
                     if w not in STOPWORDS and len(w) >= 4 and c >= 2}

    if not content_words:
        return {}

    # Sort by frequency
    sorted_words = sorted(content_words.items(), key=lambda x: x[1])
    total = len(sorted_words)

    # Common = top 20% by frequency (most frequent content words)
    common_threshold = int(total * 0.80)
    common_words = {w for w, c in sorted_words[common_threshold:]}

    # Rare = bottom 40% by frequency
    rare_threshold = int(total * 0.40)
    rare_words = [w for w, c in sorted_words[:rare_threshold] if len(w) >= 5]

    # Group common words by length for fast lookup
    common_by_len = {}
    for w in common_words:
        l = len(w)
        for target_l in range(max(3, l - 2), l + 3):
            if target_l not in common_by_len:
                common_by_len[target_l] = []
            common_by_len[target_l].append(w)

    # Build mapping: each rare word → most frequent common word of similar length
    mapping = {}
    for rare in rare_words:
        candidates = common_by_len.get(len(rare), [])
        if not candidates:
            # Try adjacent lengths
            for delta in [1, -1, 2, -2]:
                candidates = common_by_len.get(len(rare) + delta, [])
                if candidates:
                    break
        if candidates:
            # Pick the most frequent candidate
            best = max(candidates, key=lambda w: word_freq.get(w, 0))
            if best != rare:
                mapping[rare] = best

    # Limit to 800 entries
    mapping = dict(list(mapping.items())[:800])
    return mapping


# ── B2: Common → Rare (for P06_ENRICH_VOCABULARY) ────────────────────────────

def build_common_to_rare(word_freq):
    """Build mapping: common corpus words → rare corpus words of similar length."""
    content_words = {w: c for w, c in word_freq.items()
                     if w not in STOPWORDS and len(w) >= 4 and c >= 2}

    if not content_words:
        return {}

    sorted_words = sorted(content_words.items(), key=lambda x: x[1])
    total = len(sorted_words)

    # Common = top 20%
    common_threshold = int(total * 0.80)
    common_words = [w for w, c in sorted_words[common_threshold:]]

    # Rare = bottom 30% with frequency >= 2 (so they're real words)
    rare_threshold = int(total * 0.30)
    rare_words = {w: c for w, c in sorted_words[:rare_threshold] if len(w) >= 5}

    # Group rare words by length
    rare_by_len = {}
    for w in rare_words:
        l = len(w)
        for target_l in range(max(3, l - 2), l + 3):
            if target_l not in rare_by_len:
                rare_by_len[target_l] = []
            rare_by_len[target_l].append(w)

    mapping = {}
    for common in common_words:
        candidates = rare_by_len.get(len(common), [])
        if not candidates:
            for delta in [1, -1, 2, -2]:
                candidates = rare_by_len.get(len(common) + delta, [])
                if candidates:
                    break
        if candidates:
            # Pick a rare word (least frequent for maximum enrichment)
            best = min(candidates, key=lambda w: word_freq.get(w, 0))
            if best != common:
                mapping[common] = best

    mapping = dict(list(mapping.items())[:800])
    return mapping


# ── B3: Modal markers (for P04_REMOVE_INTERIORITY) ───────────────────────────

def build_modal_markers(word_freq, sentences):
    """Build modal/interiority markers that actually appear in the corpus."""
    # Multi-language modal patterns (substring matching)
    candidate_markers = [
        # English modal/perception
        "he thought", "she thought", "he felt", "she felt",
        "he believed", "she believed", "he imagined", "she imagined",
        "he supposed", "she supposed", "he wondered", "she wondered",
        "he knew", "she knew", "he feared", "she feared",
        "he hoped", "she hoped", "he wished", "she wished",
        "he remembered", "she remembered", "he realized", "she realized",
        "he seemed", "she seemed", "it seemed", "it appeared",
        "he considered", "she considered",
        "as if", "as though", "perhaps", "probably", "apparently",
        "no doubt", "doubtless", "presumably", "certainly",
        "it occurred to", "it struck him", "it struck her",
        "he could not help", "she could not help",
        "he had a feeling", "she had a feeling",
        "he was aware", "she was aware",
        "he suspected", "she suspected",
        "he sensed", "she sensed",
        "he perceived", "she perceived",
        "in his mind", "in her mind",
        "to himself", "to herself",
        "he reflected", "she reflected",
        "he reasoned", "she reasoned",
        "he decided", "she decided",
        "he understood", "she understood",
        "he guessed", "she guessed",
        "might have", "must have", "could have",
        "it was possible", "it was clear",
        "he was sure", "she was sure",
        "he was certain", "she was certain",
        # French modal/perception
        "pensait", "croyait", "semblait", "peut-être", "sans doute",
        "il lui parut", "elle sentait", "comme si", "on eût dit",
        "il semblait", "imaginait", "supposait", "se figurait",
        "se demandait", "songeait", "réfléchissait", "considérait",
        "jugeait", "estimait", "pressentait", "éprouvait",
        "ressentait", "percevait", "comprenait", "saisissait",
        "probablement", "vraisemblablement", "apparemment",
        "il se pouvait", "on aurait dit", "tout se passait comme si",
        "malgré lui", "malgré elle", "à son insu",
    ]

    # Filter to only markers that appear in at least 1 sentence
    matched_markers = []
    for marker in candidate_markers:
        ml = marker.lower()
        count = sum(1 for s in sentences if ml in s.lower())
        if count >= 1:
            matched_markers.append(marker)

    # Also scan for single-word cognitive verbs that appear as tokens
    cognitive_verbs = [
        "thought", "felt", "believed", "imagined", "supposed", "wondered",
        "feared", "hoped", "wished", "remembered", "realized", "seemed",
        "considered", "suspected", "sensed", "perceived", "reflected",
        "reasoned", "decided", "understood", "guessed", "knew", "dreamed",
        "recalled", "doubted", "fancied", "desired", "noticed", "observed",
        # French
        "pensait", "croyait", "semblait", "imaginait", "supposait",
        "songeait", "sentait", "comprenait", "craignait", "espérait",
    ]
    for verb in cognitive_verbs:
        if word_freq.get(verb, 0) >= 3 and verb not in matched_markers:
            matched_markers.append(verb)

    return matched_markers


# ── B4: Action verbs → State verbs (for P07_NEUTRALIZE_TENSION) ──────────────

def build_action_to_state(word_freq):
    """Build action→state verb mappings from corpus vocabulary."""
    # Action → state mappings (both EN and FR, all tenses found in corpus)
    action_state_candidates = {
        # English
        "ran": "stood", "rushed": "remained", "hurled": "held",
        "seized": "held", "grabbed": "held", "struck": "touched",
        "shouted": "said", "cried": "said", "screamed": "said",
        "exclaimed": "said", "roared": "said", "yelled": "said",
        "leaped": "stood", "jumped": "stood", "sprang": "stood",
        "fled": "stayed", "escaped": "stayed", "charged": "stood",
        "threw": "held", "flung": "held", "tossed": "held",
        "crashed": "lay", "smashed": "lay", "shattered": "lay",
        "fought": "stood", "struggled": "stood", "wrestled": "stood",
        "chased": "followed", "pursued": "followed", "hunted": "watched",
        "dragged": "held", "pulled": "held", "pushed": "touched",
        "tore": "held", "ripped": "held", "broke": "was",
        "killed": "left", "destroyed": "left", "burned": "was",
        "attacked": "faced", "assaulted": "faced",
        "plunged": "fell", "dashed": "went", "bolted": "went",
        "trembled": "stood", "shuddered": "stood", "shook": "stood",
        "wept": "sat", "sobbed": "sat",
        "snatched": "took", "clutched": "held", "gripped": "held",
        "slammed": "closed", "banged": "closed",
        "burst": "opened", "exploded": "was",
        "stumbled": "walked", "staggered": "walked",
        "racing": "moving", "running": "standing", "fighting": "standing",
        "screaming": "speaking", "rushing": "going", "falling": "lying",
        # French
        "bondit": "restait", "frappa": "touchait", "hurla": "disait",
        "courut": "allait", "saisit": "tenait", "arracha": "prenait",
        "lança": "tenait", "brisa": "était", "cria": "disait",
        "jeta": "posait", "poussa": "était", "tomba": "était",
        "tremblait": "restait", "frappait": "touchait",
        "bondissait": "restait", "courait": "allait",
        "criait": "parlait", "hurlait": "parlait",
        "frappant": "touchant", "courant": "allant",
    }

    # Filter to only verbs that exist in corpus
    mapping = {}
    for action, state in action_state_candidates.items():
        if word_freq.get(action, 0) >= 2:
            mapping[action] = state

    # Also add high-frequency action verbs found in corpus
    # that we can map to state equivalents
    extra_actions = {
        "ran": "went", "run": "go", "running": "going",
        "strike": "touch", "striking": "touching",
        "cry": "say", "crying": "saying",
        "throw": "put", "throwing": "putting",
        "fall": "lie", "falling": "lying",
        "fight": "stand", "hit": "touch",
        "catch": "hold", "shoot": "aim",
        "cut": "hold", "beat": "touch",
        "knock": "touch", "tear": "hold",
        "break": "leave", "kick": "touch",
        "grab": "hold", "leap": "stand",
        "dash": "walk", "rush": "go",
        "slam": "close", "crash": "stop",
        "scream": "say", "shout": "say",
        "seize": "hold", "hurl": "throw",
        "plunge": "go", "thrust": "push",
    }
    for action, state in extra_actions.items():
        if word_freq.get(action, 0) >= 2 and action not in mapping:
            mapping[action] = state

    return mapping


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("[BUILD] Loading corpus...")
    word_freq, sentences = load_corpus()
    print(f"[BUILD] {sum(word_freq.values())} tokens, {len(word_freq)} unique, {len(sentences)} sentences")

    # B1: Rare → Common
    print("\n[BUILD] B1: Building rare_to_common...")
    rare_to_common = build_rare_to_common(word_freq)
    print(f"  -> {len(rare_to_common)} mappings")

    # B2: Common → Rare
    print("[BUILD] B2: Building common_to_rare...")
    common_to_rare = build_common_to_rare(word_freq)
    print(f"  -> {len(common_to_rare)} mappings")

    # B3: Modal markers
    print("[BUILD] B3: Building modal_markers...")
    modal_markers = build_modal_markers(word_freq, sentences)
    print(f"  -> {len(modal_markers)} markers")

    # B4: Action → State verbs
    print("[BUILD] B4: Building action_to_state...")
    action_to_state = build_action_to_state(word_freq)
    print(f"  -> {len(action_to_state)} mappings")

    # Save all
    os.makedirs(RESOURCES_DIR, exist_ok=True)

    for name, data in [
        ("synonyms_rare_to_common.json", rare_to_common),
        ("synonyms_common_to_rare.json", common_to_rare),
        ("modal_markers.json", modal_markers),
        ("verbs_action_to_state.json", action_to_state),
    ]:
        path = os.path.join(RESOURCES_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[BUILD] Saved {name}")

    # Coverage report
    print("\n" + "=" * 60)
    print("COVERAGE REPORT")
    print("=" * 60)

    # Test coverage: how many entries match the corpus?
    for name, data in [
        ("synonyms_rare_to_common.json", rare_to_common),
        ("synonyms_common_to_rare.json", common_to_rare),
        ("verbs_action_to_state.json", action_to_state),
    ]:
        keys_in_corpus = sum(1 for k in data if word_freq.get(k, 0) >= 1)
        print(f"  {name}: {keys_in_corpus}/{len(data)} keys in corpus ({100*keys_in_corpus/max(1,len(data)):.1f}%)")

    # Modal markers coverage (substring in sentences)
    modal_sentence_hits = 0
    for s in sentences:
        sl = s.lower()
        if any(m.lower() in sl for m in modal_markers):
            modal_sentence_hits += 1
    pct = 100 * modal_sentence_hits / max(1, len(sentences))
    print(f"  modal_markers.json: {modal_sentence_hits}/{len(sentences)} sentences contain markers ({pct:.1f}%)")

    # Action verbs coverage
    action_word_hits = sum(word_freq.get(k, 0) for k in action_to_state)
    print(f"  verbs_action_to_state.json: {action_word_hits} occurrences in corpus")

    # Sample mappings
    print("\n── Sample rare→common mappings ──")
    for k, v in list(rare_to_common.items())[:10]:
        print(f"  {k} (freq={word_freq.get(k,0)}) → {v} (freq={word_freq.get(v,0)})")

    print("\n── Sample common→rare mappings ──")
    for k, v in list(common_to_rare.items())[:10]:
        print(f"  {k} (freq={word_freq.get(k,0)}) → {v} (freq={word_freq.get(v,0)})")

    print("\n── Sample modal markers (with counts) ──")
    for m in modal_markers[:15]:
        count = sum(1 for s in sentences if m.lower() in s.lower())
        print(f"  '{m}' -> {count} sentences")

    print("\n── Sample action→state mappings ──")
    for k, v in list(action_to_state.items())[:10]:
        print(f"  {k} (freq={word_freq.get(k,0)}) → {v}")


if __name__ == "__main__":
    main()
