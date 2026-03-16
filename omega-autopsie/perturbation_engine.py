#!/usr/bin/env python3
"""
OMEGA — Perturbation Engine — 7 CALC perturbation types (0 API)
Phase W — Mission 2

Each perturbation modifies ONE aspect of a text in a controlled way.
Amplitude (0.0–1.0) controls the percentage of text affected.
All operations use a deterministic seed for reproducibility.

P01_UNIFORMIZE_RHYTHM : flatten sentence length variance
P02_SIMPLIFY_VOCABULARY : replace rare words with common ones
P03_COMPLEXIFY_SYNTAX : merge short sentences into long ones
P04_REMOVE_INTERIORITY : strip modal/perception markers
P05_INJECT_SYNCOPES : add short rhythmic fragments
P06_ENRICH_VOCABULARY : replace common words with literary ones
P07_NEUTRALIZE_TENSION : replace action verbs with state verbs

Standard: NASA-Grade L4 / DO-178C Level A
"""

import re
import os
import json
import math
import hashlib
import random
from typing import List, Tuple, Optional

# ── Resource loading ──────────────────────────────────────────────────────────

_RESOURCES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resources")

_cache = {}

def _load_json(filename: str):
    if filename in _cache:
        return _cache[filename]
    path = os.path.join(_RESOURCES_DIR, filename)
    if not os.path.exists(path):
        _cache[filename] = None
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    _cache[filename] = data
    return data


def _get_rare_to_common() -> dict:
    return _load_json("synonyms_rare_to_common.json") or {}


def _get_common_to_rare() -> dict:
    return _load_json("synonyms_common_to_rare.json") or {}


def _get_action_to_state() -> dict:
    return _load_json("verbs_action_to_state.json") or {}


def _get_modal_markers() -> list:
    return _load_json("modal_markers.json") or []


def _get_syncope_fragments() -> list:
    return _load_json("syncope_fragments.json") or []


# ── Sentence utilities ────────────────────────────────────────────────────────

def split_sentences(text: str) -> List[str]:
    """Split text into sentences (same as speed_analyzer)."""
    raw = re.split(r"(?<=[.!?…»])\s+", text)
    return [s.strip() for s in raw if len(s.strip()) > 5]


def join_sentences(sents: List[str]) -> str:
    """Rejoin sentences with single space."""
    return " ".join(sents)


def make_seed(text: str, ptype: str, amplitude: float) -> int:
    """Deterministic seed from text + perturbation type + amplitude."""
    h = hashlib.sha256(f"{text[:200]}|{ptype}|{amplitude}".encode()).hexdigest()
    return int(h[:8], 16)


def select_indices(n: int, amplitude: float, rng: random.Random) -> List[int]:
    """Select indices to modify based on amplitude. Returns sorted list."""
    count = max(1, int(n * amplitude))
    count = min(count, n)
    return sorted(rng.sample(range(n), count))


# ── Amplitude labels ──────────────────────────────────────────────────────────

AMPLITUDE_LEVELS = {
    0.03: "A1_MICRO",
    0.10: "A2_LOCAL",
    0.25: "A3_SECTION",
    0.50: "A4_MASSIVE",
    1.00: "A5_TOTAL",
}


def amplitude_label(amp: float) -> str:
    return AMPLITUDE_LEVELS.get(amp, f"A_CUSTOM_{amp:.2f}")


# ═══════════════════════════════════════════════════════════════════════════════
# P01 — UNIFORMIZE RHYTHM
# Target: lower f1a_rhythm_variance (sentence length std)
# ═══════════════════════════════════════════════════════════════════════════════

def p01_uniformize_rhythm(text: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    sents = split_sentences(text)
    if len(sents) < 3:
        return text, {"modified": 0, "total": len(sents)}

    rng = random.Random(make_seed(text, "P01", amplitude))
    lens = [len(s.split()) for s in sents]
    avg_len = sum(lens) / len(lens)

    indices = select_indices(len(sents), amplitude, rng)
    modified = 0
    new_sents = list(sents)

    for i in indices:
        s = new_sents[i]
        words = s.split()
        wl = len(words)

        if wl > avg_len * 1.5:
            # Split at central comma/semicolon
            mid = len(s) // 2
            best_pos = -1
            best_dist = len(s)
            for m in re.finditer(r"[,;]", s):
                d = abs(m.start() - mid)
                if d < best_dist:
                    best_dist = d
                    best_pos = m.start()
            if best_pos > 5 and best_pos < len(s) - 5:
                part1 = s[:best_pos].strip().rstrip(",;") + "."
                part2 = s[best_pos + 1:].strip()
                if part2 and not part2[0].isupper():
                    part2 = part2[0].upper() + part2[1:]
                new_sents[i] = part1 + " " + part2
                modified += 1
        elif wl < avg_len * 0.5 and i + 1 < len(new_sents):
            # Merge with next sentence
            next_s = new_sents[i + 1]
            # Remove trailing period and merge
            merged = s.rstrip(".!?…") + ", " + next_s[0].lower() + next_s[1:]
            new_sents[i] = merged
            new_sents[i + 1] = ""
            modified += 1

    new_sents = [s for s in new_sents if s.strip()]
    return join_sentences(new_sents), {"modified": modified, "total": len(sents)}


# ═══════════════════════════════════════════════════════════════════════════════
# P02 — SIMPLIFY VOCABULARY
# Target: lower f29b_ttr_window (lexical richness)
# ═══════════════════════════════════════════════════════════════════════════════

def p02_simplify_vocabulary(text: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    mapping = _get_rare_to_common()
    if not mapping:
        return text, {"modified": 0, "reason": "no dictionary"}

    rng = random.Random(make_seed(text, "P02", amplitude))
    words = text.split()
    # Find all rare words in text
    rare_positions = []
    for i, w in enumerate(words):
        clean = w.lower().rstrip(".,;:!?\"'()[]")
        if clean in mapping:
            rare_positions.append(i)

    if not rare_positions:
        return text, {"modified": 0, "rare_found": 0}

    indices = select_indices(len(rare_positions), amplitude, rng)
    selected = [rare_positions[j] for j in indices]

    modified = 0
    new_words = list(words)
    for i in selected:
        w = new_words[i]
        clean = w.lower().rstrip(".,;:!?\"'()[]")
        replacement = mapping.get(clean)
        if replacement:
            # Preserve punctuation and case
            suffix = w[len(clean):] if len(w) > len(clean) else ""
            if w[0].isupper():
                replacement = replacement[0].upper() + replacement[1:]
            new_words[i] = replacement + suffix
            modified += 1

    return " ".join(new_words), {"modified": modified, "rare_found": len(rare_positions)}


# ═══════════════════════════════════════════════════════════════════════════════
# P03 — COMPLEXIFY SYNTAX
# Target: raise f1_mean (avg sentence length)
# ═══════════════════════════════════════════════════════════════════════════════

_CONNECTORS = [", et", ", tandis que", ", alors que", ", car", ", mais", " — et"]


def p03_complexify_syntax(text: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    sents = split_sentences(text)
    if len(sents) < 4:
        return text, {"modified": 0, "total": len(sents)}

    rng = random.Random(make_seed(text, "P03", amplitude))

    # Find pairs of short sentences (< 12 words each)
    short_pairs = []
    for i in range(len(sents) - 1):
        if len(sents[i].split()) < 12 and len(sents[i + 1].split()) < 12:
            short_pairs.append(i)

    if not short_pairs:
        return text, {"modified": 0, "short_pairs": 0}

    indices = select_indices(len(short_pairs), amplitude, rng)
    selected = set(short_pairs[j] for j in indices)

    new_sents = []
    skip_next = False
    modified = 0

    for i, s in enumerate(sents):
        if skip_next:
            skip_next = False
            continue
        if i in selected and i + 1 < len(sents):
            conn = rng.choice(_CONNECTORS)
            s1 = s.rstrip(".!?…")
            s2 = sents[i + 1]
            # Lowercase start of second sentence
            if s2 and s2[0].isupper() and not s2.startswith(("Je ", "Il ", "Elle ", "Marie", "Pierre")):
                s2 = s2[0].lower() + s2[1:]
            new_sents.append(s1 + conn + " " + s2)
            skip_next = True
            modified += 1
        else:
            new_sents.append(s)

    return join_sentences(new_sents), {"modified": modified, "short_pairs": len(short_pairs)}


# ═══════════════════════════════════════════════════════════════════════════════
# P04 — REMOVE INTERIORITY
# Target: lower f27d_modal_score, f28d_sil_score
# ═══════════════════════════════════════════════════════════════════════════════

def p04_remove_interiority(text: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    markers = _get_modal_markers()
    if not markers:
        # Fallback markers
        markers = ["pensait", "croyait", "semblait", "peut-être", "sans doute",
                    "comme si", "on eût dit", "il lui parut", "elle sentait que"]

    sents = split_sentences(text)
    if len(sents) < 3:
        return text, {"modified": 0}

    rng = random.Random(make_seed(text, "P04", amplitude))

    # Find sentences with modal markers
    modal_sents = []
    for i, s in enumerate(sents):
        sl = s.lower()
        if any(m in sl for m in markers):
            modal_sents.append(i)

    if not modal_sents:
        return text, {"modified": 0, "modal_found": 0}

    indices = select_indices(len(modal_sents), amplitude, rng)
    selected = set(modal_sents[j] for j in indices)

    new_sents = list(sents)
    modified = 0
    for i in selected:
        s = new_sents[i]
        original = s
        # Remove common modal constructions
        s = re.sub(r"\b[Ii]l (lui )?semblait que\b", "", s)
        s = re.sub(r"\b[Ee]lle sentait que\b", "", s)
        s = re.sub(r"\b[Cc]omme si\b", "", s)
        s = re.sub(r"\bpeut-être\b", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\bsans doute\b", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\b[Ii]l croyait\b", "", s)
        s = re.sub(r"\b[Ee]lle croyait\b", "", s)
        s = re.sub(r"\b[Ii]l pensait\b", "", s)
        s = re.sub(r"\b[Ee]lle pensait\b", "", s)
        s = re.sub(r"\bon eût dit\b", "", s, flags=re.IGNORECASE)
        # Clean up double spaces
        s = re.sub(r"\s{2,}", " ", s).strip()
        if s and s != original:
            # Ensure sentence starts with uppercase
            if s[0].islower():
                s = s[0].upper() + s[1:]
            new_sents[i] = s
            modified += 1

    return join_sentences(new_sents), {"modified": modified, "modal_found": len(modal_sents)}


# ═══════════════════════════════════════════════════════════════════════════════
# P05 — INJECT SYNCOPES
# Target: lower f1_mean, raise f1a_rhythm_variance, change f24e_contrast_score
# ═══════════════════════════════════════════════════════════════════════════════

def p05_inject_syncopes(text: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    fragments = _get_syncope_fragments()
    if not fragments:
        fragments = ["Silence.", "Rien.", "Personne.", "Le temps passait.", "Un bruit.",
                     "Nuit.", "Froid.", "Attendre.", "Encore.", "Noir."]

    sents = split_sentences(text)
    if len(sents) < 3:
        return text, {"injected": 0}

    rng = random.Random(make_seed(text, "P05", amplitude))

    # Calculate number of syncopes to inject
    n_inject = max(1, int(len(sents) * amplitude * 0.3))  # ~30% of amplitude effect

    # Choose insertion points (spread evenly with jitter)
    step = max(2, len(sents) // (n_inject + 1))
    insert_positions = []
    for k in range(n_inject):
        pos = (k + 1) * step + rng.randint(-1, 1)
        pos = max(1, min(pos, len(sents)))
        insert_positions.append(pos)
    insert_positions.sort(reverse=True)  # Insert from end to preserve indices

    new_sents = list(sents)
    for pos in insert_positions:
        frag = rng.choice(fragments)
        new_sents.insert(pos, frag)

    return join_sentences(new_sents), {"injected": len(insert_positions), "total_sents": len(sents)}


# ═══════════════════════════════════════════════════════════════════════════════
# P06 — ENRICH VOCABULARY
# Target: raise f29b_ttr_window (lexical richness)
# ═══════════════════════════════════════════════════════════════════════════════

def p06_enrich_vocabulary(text: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    mapping = _get_common_to_rare()
    if not mapping:
        return text, {"modified": 0, "reason": "no dictionary"}

    rng = random.Random(make_seed(text, "P06", amplitude))
    words = text.split()
    common_positions = []
    for i, w in enumerate(words):
        clean = w.lower().rstrip(".,;:!?\"'()[]")
        if clean in mapping:
            common_positions.append(i)

    if not common_positions:
        return text, {"modified": 0, "common_found": 0}

    indices = select_indices(len(common_positions), amplitude, rng)
    selected = [common_positions[j] for j in indices]

    modified = 0
    new_words = list(words)
    for i in selected:
        w = new_words[i]
        clean = w.lower().rstrip(".,;:!?\"'()[]")
        replacement = mapping.get(clean)
        if replacement:
            suffix = w[len(clean):] if len(w) > len(clean) else ""
            if w[0].isupper():
                replacement = replacement[0].upper() + replacement[1:]
            new_words[i] = replacement + suffix
            modified += 1

    return " ".join(new_words), {"modified": modified, "common_found": len(common_positions)}


# ═══════════════════════════════════════════════════════════════════════════════
# P07 — NEUTRALIZE TENSION
# Target: change f30d_ps_imp_ratio, lower f23d
# ═══════════════════════════════════════════════════════════════════════════════

def p07_neutralize_tension(text: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    mapping = _get_action_to_state()
    if not mapping:
        return text, {"modified": 0, "reason": "no dictionary"}

    rng = random.Random(make_seed(text, "P07", amplitude))
    words = text.split()
    action_positions = []
    for i, w in enumerate(words):
        clean = w.lower().rstrip(".,;:!?\"'()[]")
        if clean in mapping:
            action_positions.append(i)

    if not action_positions:
        return text, {"modified": 0, "actions_found": 0}

    indices = select_indices(len(action_positions), amplitude, rng)
    selected = [action_positions[j] for j in indices]

    modified = 0
    new_words = list(words)
    for i in selected:
        w = new_words[i]
        clean = w.lower().rstrip(".,;:!?\"'()[]")
        replacement = mapping.get(clean)
        if replacement:
            suffix = w[len(clean):] if len(w) > len(clean) else ""
            if w[0].isupper():
                replacement = replacement[0].upper() + replacement[1:]
            new_words[i] = replacement + suffix
            modified += 1

    return " ".join(new_words), {"modified": modified, "actions_found": len(action_positions)}


# ═══════════════════════════════════════════════════════════════════════════════
# REGISTRY — All perturbation types
# ═══════════════════════════════════════════════════════════════════════════════

PERTURBATION_TYPES = {
    "P01_UNIFORMIZE_RHYTHM": p01_uniformize_rhythm,
    "P02_SIMPLIFY_VOCABULARY": p02_simplify_vocabulary,
    "P03_COMPLEXIFY_SYNTAX": p03_complexify_syntax,
    "P04_REMOVE_INTERIORITY": p04_remove_interiority,
    "P05_INJECT_SYNCOPES": p05_inject_syncopes,
    "P06_ENRICH_VOCABULARY": p06_enrich_vocabulary,
    "P07_NEUTRALIZE_TENSION": p07_neutralize_tension,
}

CALC_TYPES = list(PERTURBATION_TYPES.keys())


def apply_perturbation(text: str, ptype: str, amplitude: float = 0.25) -> Tuple[str, dict]:
    """Apply a named perturbation to text. Returns (perturbed_text, metadata)."""
    fn = PERTURBATION_TYPES.get(ptype)
    if fn is None:
        raise ValueError(f"Unknown perturbation type: {ptype}")
    return fn(text, amplitude)
