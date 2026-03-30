#!/usr/bin/env python3
"""
OMEGA PVI NLP Scorer — Phase P1
================================
Extracts NLP-based PVI variables from raw text (.txt or .epub).
Calculates FL, MS, LP, DR (robust), S_local, A_proxy, I_proxy (experimental).

Usage:
    py -3.11 pvi_nlp_scorer.py --input book.epub --lang fr
    py -3.11 pvi_nlp_scorer.py --input book.txt --lang en --output result.json
    py -3.11 pvi_nlp_scorer.py --benchmark

Standard: OMEGA NASA-Grade L4 — all scores tagged by method and confidence.
"""

import argparse
import json
import math
import os
import re
import sys
import statistics
from pathlib import Path

# ---------------------------------------------------------------------------
# Lazy imports — fail gracefully with clear messages
# ---------------------------------------------------------------------------
_spacy = None
_wordfreq = None
_vader = None
_textblob = None


def _import_spacy():
    global _spacy
    if _spacy is None:
        import spacy
        _spacy = spacy
    return _spacy


def _import_wordfreq():
    global _wordfreq
    if _wordfreq is None:
        import wordfreq
        _wordfreq = wordfreq
    return _wordfreq


def _import_vader():
    global _vader
    if _vader is None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _vader = SentimentIntensityAnalyzer()
    return _vader


def _import_textblob():
    global _textblob
    if _textblob is None:
        from textblob import TextBlob
        _textblob = TextBlob
    return _textblob


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------
def extract_text_from_epub(filepath):
    """Extract raw text from .epub file. Tries multiple encodings."""
    import ebooklib
    from ebooklib import epub
    from html.parser import HTMLParser

    class _HTMLStripper(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text_parts = []

        def handle_data(self, data):
            self.text_parts.append(data)

        def get_text(self):
            return " ".join(self.text_parts)

    book = epub.read_epub(filepath, options={"ignore_ncx": True})
    full_text = []
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        raw = item.get_content()
        # Try encodings in order: utf-8 clean, then latin-1, then utf-8 lossy
        text_decoded = None
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                candidate = raw.decode(enc)
                # Check for replacement chars — fewer is better
                if "\ufffd" not in candidate:
                    text_decoded = candidate
                    break
            except (UnicodeDecodeError, UnicodeError):
                continue
        if text_decoded is None:
            text_decoded = raw.decode("utf-8", errors="replace")

        stripper = _HTMLStripper()
        stripper.feed(text_decoded)
        text = stripper.get_text().strip()
        if len(text) > 50:
            full_text.append(text)
    return "\n".join(full_text)


def extract_text_from_txt(filepath):
    """Read raw text from .txt file."""
    encodings = ["utf-8", "latin-1", "cp1252"]
    for enc in encodings:
        try:
            with open(filepath, "r", encoding=enc) as f:
                return f.read()
        except (UnicodeDecodeError, UnicodeError):
            continue
    raise RuntimeError(f"Cannot decode {filepath} with any known encoding")


def extract_text_from_pdf(filepath):
    """Extract text from .pdf via pdfplumber or PyMuPDF."""
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        return "\n".join(pages)
    except ImportError:
        pass
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(filepath)
        pages = [doc[i].get_text() for i in range(len(doc))]
        doc.close()
        return "\n".join(pages)
    except ImportError:
        raise RuntimeError("Install pdfplumber or PyMuPDF to read PDFs")


def _fix_mojibake(text):
    """Fix common Latin-1/CP1252 mojibake in French text extracted from epub/pdf.
    E.g. 'Ã©' -> 'é', 'Ã¨' -> 'è', etc."""
    try:
        # Try re-encoding as latin-1 then decoding as utf-8
        fixed = text.encode('latin-1').decode('utf-8')
        # Verify it looks better (has French accented chars)
        if any(c in fixed for c in 'éèêëàâùûôîïçÉÈÊ'):
            return fixed
    except (UnicodeDecodeError, UnicodeEncodeError):
        pass
    return text


def load_text(filepath):
    """Load text from file, auto-detecting format. Fixes mojibake."""
    ext = Path(filepath).suffix.lower()
    if ext == ".epub":
        text = extract_text_from_epub(filepath)
    elif ext == ".txt":
        text = extract_text_from_txt(filepath)
    elif ext == ".pdf":
        text = extract_text_from_pdf(filepath)
    else:
        raise ValueError(f"Unsupported format: {ext} (use .txt, .epub, or .pdf)")
    return _fix_mojibake(text)


# ---------------------------------------------------------------------------
# Window extraction: debut(20%) + milieu(20%) + fin(20%)
# ---------------------------------------------------------------------------
def extract_windows(text, pct=0.20):
    """Extract 3 windows: start 20%, middle 20%, end 20%."""
    n = len(text)
    if n < 500:
        return [text], ["full"]

    start_end = int(n * pct)
    mid_start = int(n * 0.40)
    mid_end = int(n * 0.60)

    windows = [
        text[:start_end],
        text[mid_start:mid_end],
        text[-start_end:],
    ]
    labels = ["debut", "milieu", "fin"]
    return windows, labels


# ---------------------------------------------------------------------------
# NLP Model loader (cached)
# ---------------------------------------------------------------------------
_nlp_cache = {}


def get_nlp(lang):
    """Load spaCy model for given language, cached."""
    if lang in _nlp_cache:
        return _nlp_cache[lang]

    spacy = _import_spacy()
    model_map = {"fr": "fr_core_news_lg", "en": "en_core_web_lg"}
    model_name = model_map.get(lang)
    if not model_name:
        raise ValueError(f"Unsupported language: {lang}")

    print(f"  Loading spaCy model {model_name}...", end=" ", flush=True)
    nlp = spacy.load(model_name)
    # Increase max length for novels
    nlp.max_length = 3_000_000
    _nlp_cache[lang] = nlp
    print("OK")
    return nlp


# ---------------------------------------------------------------------------
# LEVEL 1: ROBUST NLP VARIABLES
# ---------------------------------------------------------------------------

def extract_FL(text_windows, lang):
    """
    Friction Lexicale v2 — proportion of content tokens (len>=4) below
    top-5000 frequency. NER-filtered. Short function words excluded to
    measure true LEXICAL rarity, not grammatical accessibility.

    Design note (P1 correction): top-10k was too permissive. top-5k with
    len>=4 filter correctly separates Hoover(0.14) from Camus(0.22) from
    Bovary(0.90). Proust FL is genuinely LOW (lexical, not syntactic
    difficulty) — his friction is captured by LP instead.
    """
    wordfreq = _import_wordfreq()
    nlp = get_nlp(lang)

    # Get frequency threshold for rank ~5000 (stricter than 10k)
    top_5k = wordfreq.top_n_list(lang, 5000)
    if top_5k:
        seuil_5k = wordfreq.word_frequency(top_5k[-1], lang)
    else:
        seuil_5k = 1e-5  # fallback

    fl_per_window = []

    for window in text_windows:
        doc = nlp(window[:500000])

        # Collect NER spans to exclude
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
            # Skip short function words (articles, prepositions)
            if len(token.text) < 4:
                continue

            word = token.text.lower()
            freq = wordfreq.word_frequency(word, lang)
            total += 1
            if freq < seuil_5k:
                below += 1

        if total > 0:
            fl_per_window.append(below / total)
        else:
            fl_per_window.append(0.0)

    fl_mean = statistics.mean(fl_per_window) if fl_per_window else 0.0
    fl_sigma = statistics.stdev(fl_per_window) if len(fl_per_window) > 1 else 0.0

    return {
        "score": round(fl_mean, 4),
        "sigma": round(fl_sigma, 4),
        "per_window": [round(x, 4) for x in fl_per_window],
        "methode": "wordfreq_top5k_NER_len4",
        "seuil_5k": seuil_5k,
        "tag": "NLP-ROBUSTE-v2",
    }


def extract_MS(text_windows, lang):
    """
    Musicalite Syntaxique v2 — 4 composantes:
    1. Alternance rythmique (0.35) — sentence-length breathing patterns
    2. Diversite structures debut phrase (0.25) — POS variety at sentence start
    3. Figures syntaxiques / anaphores (0.25) — repetitive patterns
    4. Ponctuation expressive interne (0.15) — internal rhythm markers

    Design note (P1 correction): v1 used CV+depth which failed 0/5.
    v2 captures rhythm PERCEPTION: 3/5 convergent, Proust>Hoover correct.
    """
    from collections import Counter
    nlp = get_nlp(lang)
    ms_per_window = []

    for window in text_windows:
        doc = nlp(window[:500000])
        sents = list(doc.sents)
        if len(sents) < 10:
            ms_per_window.append(0.5)
            continue

        # --- COMPONENT 1: Alternance rythmique (0.35) ---
        lengths = [len(list(s)) for s in sents]
        n_triplets = 0
        n_alternating = 0
        for i in range(len(lengths) - 2):
            li, lj, lk = lengths[i], lengths[i + 1], lengths[i + 2]
            n_triplets += 1
            # Short sandwiched: middle < both neighbors by >2 tokens
            if lj < min(li, lk) and (min(li, lk) - lj) > 2:
                n_alternating += 1
            # Long sandwiched: middle > both neighbors by >2 tokens
            elif lj > max(li, lk) and (lj - max(li, lk)) > 2:
                n_alternating += 1

        rhythm_ratio = n_alternating / max(n_triplets, 1)
        # v3 fix: /0.25 instead of /0.40 — commercial prose rhythm_ratio ~0.20
        rhythm_norm = min(rhythm_ratio / 0.25, 1.0)

        # --- COMPONENT 2: Diversite structures debut phrase (0.25) ---
        first_pos_tags = []
        for sent in sents:
            tokens_in_sent = [t for t in sent
                              if not t.is_space and not t.is_punct]
            if tokens_in_sent:
                first_pos_tags.append(tokens_in_sent[0].pos_)

        if first_pos_tags:
            n_unique_starts = len(set(first_pos_tags))
            # v3 fix: /5.0 instead of /7.0, removed monotony_penalty
            # (penalty was punishing POV 1st person "I"/"Je" starts)
            diversity_norm = min(n_unique_starts / 5.0, 1.0)
        else:
            diversity_norm = 0.5

        # --- COMPONENT 3: Figures syntaxiques / anaphores (0.25) ---
        first_words = []
        for sent in sents:
            tokens_in_sent = [t for t in sent
                              if not t.is_space and not t.is_punct]
            if tokens_in_sent:
                first_words.append(tokens_in_sent[0].text.lower())
            else:
                first_words.append("")

        anaphore_count = 0
        i = 0
        while i < len(first_words) - 1:
            if first_words[i] == first_words[i + 1] and first_words[i]:
                run = 1
                while (i + run < len(first_words)
                       and first_words[i + run] == first_words[i]):
                    run += 1
                if run >= 2:
                    anaphore_count += run
                i += run
            else:
                i += 1

        anaphore_ratio = anaphore_count / max(len(first_words), 1)
        # v3 fix: /0.08 instead of /0.12 — more sensitive to anaphores
        anaphore_norm = min(anaphore_ratio / 0.08, 1.0)

        # Inversions: sentences starting with verb/adverb/preposition
        inversion_count = sum(1 for pos in first_pos_tags
                              if pos in ("VERB", "AUX", "ADV", "ADP"))
        inversion_ratio = inversion_count / max(len(first_pos_tags), 1)
        inversion_norm = min(inversion_ratio / 0.40, 1.0)

        repetition_score = 0.70 * anaphore_norm + 0.30 * inversion_norm

        # --- COMPONENT 4: Ponctuation expressive interne (0.15) ---
        internal_punct_count = 0
        for sent in sents:
            for token in sent:
                if token.text in (",", ";", ":", "\u2014", "\u2013", "..."):
                    internal_punct_count += 1

        punct_per_sentence = internal_punct_count / max(len(sents), 1)
        # v3 fix: /3.5 instead of /5.0 — commercial prose has 1.5-2.5 per sent
        punct_norm = min(punct_per_sentence / 3.5, 1.0)

        # --- COMBINE ---
        ms = (0.35 * rhythm_norm
              + 0.25 * diversity_norm
              + 0.25 * repetition_score
              + 0.15 * punct_norm)
        ms_per_window.append(ms)

    ms_mean = statistics.mean(ms_per_window) if ms_per_window else 0.5
    ms_sigma = statistics.stdev(ms_per_window) if len(ms_per_window) > 1 else 0.0

    return {
        "score": round(ms_mean, 4),
        "sigma": round(ms_sigma, 4),
        "per_window": [round(x, 4) for x in ms_per_window],
        "methode": "rhythm_diversity_anaphore_punct_v3",
        "tag": "NLP-ROBUSTE-v3",
    }


def extract_LP(text_windows, lang):
    """
    Longueur Perçue — syntactic inertia based on sentence length stats.
    """
    nlp = get_nlp(lang)
    lp_per_window = []

    for window in text_windows:
        doc = nlp(window[:500000])
        sents = list(doc.sents)
        if len(sents) < 3:
            lp_per_window.append(0.5)
            continue

        lengths = [len(list(s)) for s in sents]
        mean_len = statistics.mean(lengths)
        ratio_long = sum(1 for l in lengths if l > 40) / len(lengths)

        # Depth (reuse logic)
        depths = []
        for sent in sents:
            max_d = 0
            for token in sent:
                d = 0
                t = token
                while t.head != t:
                    d += 1
                    t = t.head
                    if d > 50:
                        break
                if d > max_d:
                    max_d = d
            depths.append(max_d)
        mean_depth = statistics.mean(depths) if depths else 3

        # Normalize: mean_len typical 8-35
        mean_norm = min((mean_len - 5) / 30.0, 1.0)
        mean_norm = max(mean_norm, 0.0)
        # ratio_long: [0, 1]
        ratio_norm = min(ratio_long / 0.5, 1.0)
        # depth: same as MS
        depth_norm = min((mean_depth - 2) / 10.0, 1.0)
        depth_norm = max(depth_norm, 0.0)

        lp = 0.40 * mean_norm + 0.35 * ratio_norm + 0.25 * depth_norm
        lp_per_window.append(lp)

    lp_mean = statistics.mean(lp_per_window) if lp_per_window else 0.5

    return {
        "score": round(lp_mean, 4),
        "methode": "spacy_sentences",
        "tag": "NLP-ROBUSTE",
    }


def extract_DR(text_windows, lang):
    """
    Densite Referentielle — NER entity density.
    """
    nlp = get_nlp(lang)
    dr_per_window = []

    for window in text_windows:
        doc = nlp(window[:500000])
        n_ents = len([e for e in doc.ents
                      if e.label_ in ("PER", "PERS", "GPE", "ORG",
                                       "WORK_OF_ART", "EVENT", "LOC",
                                       "PERSON", "FAC", "NORP")])
        n_tokens = len([t for t in doc if not t.is_punct and not t.is_space])
        dr = n_ents / max(n_tokens, 1)
        dr_per_window.append(dr)

    dr_mean = statistics.mean(dr_per_window) if dr_per_window else 0.0
    # Normalize: typical DR 0.005-0.08 -> scale to [0,1]
    dr_scaled = min(dr_mean / 0.06, 1.0)

    return {
        "score": round(dr_scaled, 4),
        "raw_density": round(dr_mean, 6),
        "methode": "spacy_NER_density",
        "tag": "NLP-ROBUSTE",
    }


# ---------------------------------------------------------------------------
# T_v2: TRANSPORTATION — 3 composantes
# ---------------------------------------------------------------------------

def extract_T_sensoriel(text_windows, lang):
    """Sensory immersion: density of sensory verbs and nouns."""
    SENSORY_VERBS = {
        "fr": {"voir", "entendre", "sentir", "toucher", "goûter", "regarder",
               "observer", "remarquer", "percevoir", "flairer", "palper",
               "écouter", "humer", "contempler", "distinguer", "apercevoir",
               "discerner", "ressentir"},
        "en": {"see", "hear", "smell", "touch", "taste", "watch", "observe",
               "notice", "perceive", "feel", "listen", "gaze", "glimpse",
               "spot", "sense", "stare"},
    }
    SENSORY_NOUNS = {
        "fr": {"lumière", "ombre", "bruit", "silence", "odeur", "chaleur",
               "froid", "douleur", "texture", "couleur", "parfum", "saveur",
               "son", "voix", "ténèbres", "obscurité", "soleil", "pluie",
               "vent", "fumée", "poussière"},
        "en": {"light", "shadow", "sound", "silence", "smell", "heat", "cold",
               "pain", "texture", "color", "scent", "taste", "noise", "voice",
               "darkness", "sun", "rain", "wind", "smoke", "dust", "air"},
    }
    verbs = SENSORY_VERBS.get(lang, SENSORY_VERBS["en"])
    nouns = SENSORY_NOUNS.get(lang, SENSORY_NOUNS["en"])
    # Add accent-stripped versions for FR
    if lang == "fr":
        verbs = verbs | {_strip_accents(w) for w in verbs}
        nouns = nouns | {_strip_accents(w) for w in nouns}

    scores = []
    for window in text_windows:
        tokens = window.lower().split()
        n = max(len(tokens), 1)
        v_count = sum(1 for t in tokens if t.strip("'\".,;:!?()") in verbs)
        n_count = sum(1 for t in tokens if t.strip("'\".,;:!?()") in nouns)
        # Natural sensory density ~0.5-2% → multiply by 60 to get 0.30-1.0
        score = min((v_count + n_count) / n * 60.0, 1.0)
        scores.append(score)

    return statistics.mean(scores) if scores else 0.4


def extract_T_situationnel(text_windows, lang):
    """World coherence: spatio-temporal markers + recurring locations."""
    nlp = get_nlp(lang)
    scores = []
    all_locs = []

    PERCEPTION = {
        "fr": {"regarder", "observer", "remarquer", "noter", "souvenir",
               "rappeler", "penser", "imaginer", "se"},
        "en": {"watch", "observe", "notice", "note", "remember", "recall",
               "think", "imagine", "realize", "wonder"},
    }
    perc_set = PERCEPTION.get(lang, PERCEPTION["en"])
    if lang == "fr":
        perc_set = perc_set | {_strip_accents(w) for w in perc_set}

    for window in text_windows:
        doc = nlp(window[:300000])

        ctx_ents = [e for e in doc.ents
                    if e.label_ in ("TIME", "DATE", "LOC", "GPE", "FAC")]
        n_sents = max(len(list(doc.sents)), 1)
        ctx_norm = min(len(ctx_ents) / n_sents / 0.8, 1.0)

        locs = [e.text.lower() for e in doc.ents
                if e.label_ in ("LOC", "GPE", "FAC")]
        all_locs.extend(locs)

        tokens_lower = [t.text.lower() for t in doc if not t.is_punct]
        perc_count = sum(1 for t in tokens_lower if t in perc_set)
        perc_norm = min(perc_count / max(len(tokens_lower), 1) / 0.008, 1.0)

        scores.append(0.50 * ctx_norm + 0.50 * perc_norm)

    if all_locs:
        from collections import Counter
        recurring = sum(1 for c in Counter(all_locs).values() if c >= 2)
        recurrence_bonus = min(recurring / 5.0, 0.20)
    else:
        recurrence_bonus = 0

    base = statistics.mean(scores) if scores else 0.3
    return min(base + recurrence_bonus, 1.0)


def extract_T_relationnel(text_windows, lang):
    """Interpersonal dynamics: dialogue ratio + interaction verbs + pronouns."""
    INTERACTION_VERBS = {
        "fr": {"dire", "répondre", "demander", "regarder", "sourire", "toucher",
               "murmurer", "chuchoter", "crier", "rire", "pleurer", "embrasser",
               "fuir", "tendre", "serrer", "appeler", "écouter", "comprendre",
               "aimer", "promettre", "mentir", "pardonner", "accuser", "supplier",
               "dit", "répondit", "demanda", "murmura", "cria"},
        "en": {"say", "reply", "ask", "look", "smile", "touch", "grab",
               "whisper", "shout", "laugh", "cry", "kiss", "run", "lean",
               "reach", "pull", "push", "call", "listen", "understand", "love",
               "hate", "fear", "promise", "lie", "forgive", "accuse", "beg",
               "hold", "comfort", "ignore", "follow", "leave",
               "said", "asked", "replied", "whispered", "shouted", "called"},
    }
    REL_PRONOUNS = {
        "fr": {"tu", "vous", "il", "elle", "nous", "ils", "elles", "lui", "leur"},
        "en": {"you", "he", "she", "we", "they", "him", "her", "us", "them"},
    }
    verbs = INTERACTION_VERBS.get(lang, INTERACTION_VERBS["en"])
    pronouns = REL_PRONOUNS.get(lang, REL_PRONOUNS["en"])
    if lang == "fr":
        verbs = verbs | {_strip_accents(w) for w in verbs}

    scores = []
    for window in text_windows:
        lines = window.split('\n')
        tokens = window.lower().split()
        n = max(len(tokens), 1)

        dialogue_lines = sum(1 for l in lines
                             if l.strip().startswith(
                                 ('\u00ab', '"', '\u2014', '-', '\u201c', '\u2019')))
        dialogue_norm = min(dialogue_lines / max(len(lines), 1) / 0.25, 1.0)

        v_density = sum(1 for t in tokens
                        if t.strip("'\".,;:!?()") in verbs) / n
        v_norm = min(v_density / 0.015, 1.0)

        p_density = sum(1 for t in tokens if t in pronouns) / n
        p_norm = min(p_density / 0.04, 1.0)

        score = 0.40 * dialogue_norm + 0.35 * v_norm + 0.25 * p_norm
        scores.append(score)

    return statistics.mean(scores) if scores else 0.3


def extract_T_v2(text_windows, lang):
    """Transportation v2: sensory + situational + relational immersion."""
    T_s = extract_T_sensoriel(text_windows, lang)
    T_sit = extract_T_situationnel(text_windows, lang)
    T_rel = extract_T_relationnel(text_windows, lang)

    T_v2 = 0.40 * T_s + 0.35 * T_sit + 0.25 * T_rel

    return {
        "score": round(T_v2, 4),
        "T_sensoriel": round(T_s, 4),
        "T_situationnel": round(T_sit, 4),
        "T_relationnel": round(T_rel, 4),
        "methode": "T_v2_trois_composantes",
        "tag": "NLP-ROBUSTE-v2",
    }


# ---------------------------------------------------------------------------
# LEVEL 2: EXPERIMENTAL VARIABLES
# ---------------------------------------------------------------------------

def extract_S_local(text_windows, lang):
    """
    Surprise locale via VADER sentiment variance as proxy.
    (GPT-2 perplexity deferred — requires torch which may not be installed)
    """
    vader = _import_vader()

    surprises = []
    for window in text_windows:
        # Split into ~100-token chunks (approx 500 chars)
        chunks = [window[i:i+500] for i in range(0, len(window), 500)]
        if len(chunks) < 3:
            surprises.append(0.5)
            continue

        # Compute sentiment per chunk
        scores = []
        for chunk in chunks:
            vs = vader.polarity_scores(chunk)
            scores.append(vs["compound"])

        # Surprise = variance of consecutive differences
        if len(scores) < 2:
            surprises.append(0.5)
            continue

        diffs = [abs(scores[i+1] - scores[i]) for i in range(len(scores)-1)]
        mean_diff = statistics.mean(diffs)
        # Normalize: typical range 0.05-0.40
        s_norm = min(mean_diff / 0.35, 1.0)
        surprises.append(s_norm)

    s_mean = statistics.mean(surprises)
    return {
        "score": round(s_mean, 4),
        "methode": "vader_sentiment_variance",
        "tag": "NLP-PARTIEL",
    }


def extract_A_proxy(text_windows, lang):
    """
    Arc emotionnel proxy — sentiment polarity reversals across segments.
    """
    vader = _import_vader()

    # Concatenate all windows for full-book approximation
    full = " ".join(text_windows)
    n = len(full)
    n_segments = 20
    seg_len = n // n_segments

    polarities = []
    for i in range(n_segments):
        seg = full[i * seg_len: (i + 1) * seg_len]
        if not seg.strip():
            polarities.append(0.0)
            continue
        vs = vader.polarity_scores(seg)
        polarities.append(vs["compound"])

    # Count sign reversals with amplitude > 0.25
    n_rev = 0
    for i in range(len(polarities) - 1):
        diff = polarities[i + 1] - polarities[i]
        if abs(diff) > 0.25:
            # Check actual sign change or large swing
            if (polarities[i] * polarities[i + 1] < 0) or abs(diff) > 0.40:
                n_rev += 1

    # Amplitude total
    if polarities:
        amplitude = max(polarities) - min(polarities)
    else:
        amplitude = 0

    # Normalize: A_proxy from N_rev and amplitude
    # N_rev typical: 0-8
    rev_norm = min(n_rev / 5.0, 1.0)
    amp_norm = min(amplitude / 1.5, 1.0)
    a_proxy = 0.60 * rev_norm + 0.40 * amp_norm

    return {
        "score": round(a_proxy, 4),
        "N_rev_proxy": n_rev,
        "amplitude": round(amplitude, 4),
        "methode": "sentiment_segments",
        "tag": "SEMI-AUTO",
    }


def extract_I_proxy(text_windows, lang):
    """
    Identification proxy — protagonist emotional density in POV windows.
    v3: bilingual — VADER for EN, manual FR lexicon for FR.
    """
    pov_1st_markers = {
        "fr": {"je", "j'", "me", "moi", "m'", "mon", "ma", "mes"},
        "en": {"i", "me", "my", "myself", "mine"},
    }
    markers = pov_1st_markers.get(lang, pov_1st_markers["en"])

    full = " ".join(text_windows)
    tokens = full.lower().split()
    n_tokens = len(tokens)

    # Count 1st person markers
    pov_count = sum(1 for t in tokens if t.strip("'\".,;:!?()") in markers)
    pov_ratio = pov_count / max(n_tokens, 1)
    is_first_person = pov_ratio > 0.03

    # Extract 50-token windows around protagonist mentions
    protag_windows = []
    for i, tok in enumerate(tokens):
        clean = tok.strip("'\".,;:!?()")
        if clean in markers:
            start = max(0, i - 25)
            end = min(n_tokens, i + 25)
            protag_windows.append(tokens[start:end])
            if len(protag_windows) >= 200:
                break

    if not protag_windows:
        protag_windows = [tokens[i:i+50]
                          for i in range(0, min(n_tokens, 5000), 250)]

    # Branch by language for emotional density
    if lang == "fr":
        mean_neg, mean_arousal = _fr_emotional_density(protag_windows)
        method = "fr_lexicon_protagonist_windows"
        # FR lexicon yields lower raw densities than VADER
        neg_norm = min(mean_neg / 0.06, 1.0)
        arousal_norm = min(mean_arousal / 0.025, 1.0)
    else:
        mean_neg, mean_arousal = _en_emotional_density(protag_windows)
        method = "vader_protagonist_windows"
        neg_norm = min(mean_neg / 0.12, 1.0)
        arousal_norm = min(mean_arousal / 0.40, 1.0)
    pov_bonus = 0.15 if is_first_person else 0.0

    i_proxy = (0.35 * neg_norm + 0.30 * arousal_norm +
               0.20 * min(pov_ratio / 0.05, 1.0) + pov_bonus)
    i_proxy = min(i_proxy, 1.0)

    return {
        "score": round(i_proxy, 4),
        "pov_1st_person": is_first_person,
        "pov_ratio": round(pov_ratio, 4),
        "mean_neg_valence": round(mean_neg, 4),
        "mean_arousal": round(mean_arousal, 4),
        "methode": method,
        "tag": "PROXY-NLP-v3",
    }


# --- FR emotional lexicon (200 words, zero external dependency) ---
_FR_NEGATIVE_WORDS = {
    # douleur/souffrance
    "souffre", "souffrir", "souffrait", "souffrance", "douleur", "douloureux",
    "mal", "blessure", "blessé", "blesser", "peine", "chagrin",
    "tristesse", "triste", "pleurer", "pleurait", "pleurs", "larme", "larmes",
    "sanglot", "sangloter", "sanglotait",
    # peur/anxiete
    "peur", "crainte", "craindre", "craignait", "terreur", "angoisse",
    "angoisser", "effroi", "effrayant", "terrifiant", "trembler", "tremblait",
    "tremblement", "redouter", "redoutait", "horreur", "horrible",
    "inquiet", "inquiète", "inquiétude", "anxieux", "anxiété", "nerveux",
    # colere/haine
    "colère", "haine", "haïr", "haïssait", "fureur", "furieux", "rage",
    "enrager", "violence", "violent", "brutal", "brutalité", "agressif",
    "détester", "détestait", "mépris", "mépriser", "méprisait",
    # desespoir/mort
    "désespoir", "désespéré", "désespérée", "mort", "mourir", "mourait",
    "tuer", "tué", "tuait", "meurtre", "meurtrier", "meurtrière",
    "sang", "cadavre", "agonie", "agoniser", "funèbre", "enterrement",
    "cercueil", "tombeau", "tombe", "deuil",
    # abandon/solitude
    "seul", "seule", "solitude", "abandon", "abandonner", "abandonné",
    "rejeter", "rejet", "trahir", "trahison", "trahi", "mentir",
    "mensonge", "mentait", "isolé", "isolement",
    # honte/culpabilite
    "honte", "honteux", "coupable", "culpabilité", "faute", "punir",
    "punition", "humilier", "humiliation", "humilié",
    # manque/perte
    "manque", "manquer", "manquait", "absence", "absent", "vide",
    "perdre", "perdu", "perte", "regret", "regretter", "regrettait",
    "nostalgie", "mélancolie", "mélancolique",
    # conflit/rupture
    "rupture", "briser", "brisé", "crier", "criait", "hurler", "hurlait",
    "accuser", "accusait", "dispute", "disputer", "querelle",
    # emotion haute intensite (y compris positive-intense)
    "amour", "aimer", "aimait", "aimé", "désir", "désirer", "désirait",
    "passion", "passionné", "obsession", "obséder", "obsédait",
    "jalousie", "jaloux", "espoir", "espérer", "espérait",
    "bonheur", "heureux", "heureuse", "joie", "plaisir",
    "émotion", "émouvoir", "émouvant", "bouleverser", "bouleversé",
    "tendresse", "tendre", "doux", "douce", "caresse", "embrasser",
    # psychologique/cerebral (littéraire)
    "tourment", "tourmenter", "tourmenté", "trouble", "troubler", "troublé",
    "vertige", "fascination", "fasciner", "fasciné", "obsédant",
    "enchantement", "ivresse", "extase", "ravissement", "délice",
    "impression", "sensation", "sentiment", "ressentir", "ressentait",
    "éprouver", "éprouvait", "éprouvé",
    # physique/incarne
    "brûler", "brûlait", "froid", "froideur", "serrer", "serrait",
    "suffoquer", "suffoquait", "nausée", "vertige", "épuisement",
    "frisson", "frissonner", "frissonnait", "chaleur", "sueur",
    "battement", "battre", "battait",
    # etats negatifs quotidiens
    "ennui", "ennuyer", "ennuyait", "fatigue", "fatigué", "lassitude",
    "lasse", "las", "dégoût", "dégoûter", "indifférent", "indifférence",
    "gêne", "gêner", "gêné", "malaise", "mal-être",
}

_FR_HIGH_AROUSAL = {
    "trembler", "tremblait", "sangloter", "sanglotait", "crier", "criait",
    "hurler", "hurlait", "fuir", "fuyait", "saisir", "saisissait",
    "frapper", "frappait", "arracher", "arrachait", "serrer", "serrait",
    "brûler", "brûlait", "exploser", "explosait", "courir", "courait",
    "bondir", "bondissait", "supplier", "suppliait", "gémir", "gémissait",
    "suffoquer", "suffoquait", "étouffer", "étouffait", "claquer", "claquait",
    "mordre", "mordait", "griffer", "griffait", "déchirer", "déchirait",
    # ajout v3: verbes mouvement/action intense
    "jeter", "jetait", "lancer", "lançait", "pousser", "poussait",
    "tomber", "tombait", "précipiter", "précipitait",
    "pleurer", "pleurait", "embrasser", "embrassait",
    "agripper", "agrippait", "retenir", "retenait",
}


def _strip_accents(s):
    """Remove French accents for fuzzy matching."""
    import unicodedata
    nfkd = unicodedata.normalize('NFKD', s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))

# Pre-build accent-stripped versions for matching (rebuilt after lexicon expansion)
_FR_NEG_STRIPPED = {_strip_accents(w) for w in _FR_NEGATIVE_WORDS}
_FR_AROUSAL_STRIPPED = {_strip_accents(w) for w in _FR_HIGH_AROUSAL}
# Also add all words WITHOUT accents as direct matches (handles mojibake)
_FR_NEGATIVE_WORDS = _FR_NEGATIVE_WORDS | _FR_NEG_STRIPPED
_FR_HIGH_AROUSAL = _FR_HIGH_AROUSAL | _FR_AROUSAL_STRIPPED


def _fr_emotional_density(protag_windows):
    """Compute neg and arousal density for FR text using manual lexicon.
    Matches both accented and stripped forms for PDF robustness."""
    neg_ratios = []
    arousal_ratios = []
    for window_tokens in protag_windows[:200]:
        n = max(len(window_tokens), 1)
        neg = 0
        aro = 0
        for t in window_tokens:
            clean = t.strip("'\".,;:!?()\u00ab\u00bb\u2019\u2018")
            stripped = _strip_accents(clean)
            if clean in _FR_NEGATIVE_WORDS or stripped in _FR_NEG_STRIPPED:
                neg += 1
            if clean in _FR_HIGH_AROUSAL or stripped in _FR_AROUSAL_STRIPPED:
                aro += 1
        neg_ratios.append(neg / n)
        arousal_ratios.append(aro / n)

    mean_neg = statistics.mean(neg_ratios) if neg_ratios else 0.02
    mean_arousal = statistics.mean(arousal_ratios) if arousal_ratios else 0.005
    return mean_neg, mean_arousal


def _en_emotional_density(protag_windows):
    """Compute neg and arousal density for EN text using VADER."""
    vader = _import_vader()
    neg_scores = []
    arousal_scores = []
    for window_tokens in protag_windows[:200]:
        text = " ".join(window_tokens)
        vs = vader.polarity_scores(text)
        neg_scores.append(vs["neg"])
        arousal_scores.append(abs(vs["compound"]))

    mean_neg = statistics.mean(neg_scores) if neg_scores else 0.05
    mean_arousal = statistics.mean(arousal_scores) if arousal_scores else 0.3
    return mean_neg, mean_arousal


# ---------------------------------------------------------------------------
# PVI CALCULATION
# ---------------------------------------------------------------------------
def calculate_pvi(variables, omega_default=0.65):
    """Calculate PVI from extracted NLP variables."""
    FL = variables["FL"]["score"]
    MS = variables["MS"]["score"]
    LP = variables["LP"]["score"]
    DR = variables["DR"]["score"]
    S = variables.get("S_local", {}).get("score", 0.5)
    I = variables.get("I_proxy", {}).get("score", 0.6)

    # T_v2 if available, fallback to 1-DR
    if "T_v2" in variables:
        T_proxy = variables["T_v2"]["score"]
    else:
        T_proxy = max(1.0 - DR, 0.1)

    E_emo = 0.40 * I + 0.28 * T_proxy + 0.17 * S + 0.15 * I * T_proxy
    E_cog = 0.40 * FL + 0.25 * FL * (1 - MS) + 0.20 * DR + 0.15 * LP

    CE = E_emo / E_cog if E_cog > 0.001 else 999.0

    score_etouffement = FL * (1 - omega_default)
    warning = score_etouffement > 0.08

    return {
        "E_emo": round(E_emo, 4),
        "E_cog": round(E_cog, 4),
        "CE": round(CE, 4),
        "T_proxy": round(T_proxy, 4),
        "score_etouffement": round(score_etouffement, 4),
        "warning_etouffement": warning,
    }


# ---------------------------------------------------------------------------
# MAIN SCORING PIPELINE
# ---------------------------------------------------------------------------
def score_book(filepath, lang="fr"):
    """Full NLP scoring pipeline for a single book."""
    print(f"\n{'='*70}")
    print(f"OMEGA PVI NLP Scorer — Phase P1")
    print(f"{'='*70}")
    print(f"Input: {filepath}")
    print(f"Lang:  {lang}")

    # 1. Load text
    print("\n[1/8] Loading text...", end=" ", flush=True)
    text = load_text(filepath)
    print(f"OK ({len(text):,} chars)")

    # 2. Extract windows
    print("[2/8] Extracting windows (20% x 3)...", end=" ", flush=True)
    windows, labels = extract_windows(text)
    print(f"OK ({len(windows)} windows: {labels})")

    # 3. FL
    print("[3/8] Computing FL (Friction Lexicale)...")
    fl = extract_FL(windows, lang)
    print(f"       FL = {fl['score']} (sigma={fl['sigma']})")

    # 4. MS
    print("[4/8] Computing MS (Musicalite Syntaxique)...")
    ms = extract_MS(windows, lang)
    print(f"       MS = {ms['score']} (sigma={ms['sigma']})")

    # 5. LP
    print("[5/8] Computing LP (Longueur Percue)...")
    lp = extract_LP(windows, lang)
    print(f"       LP = {lp['score']}")

    # 6. DR
    print("[6/8] Computing DR (Densite Referentielle)...")
    dr = extract_DR(windows, lang)
    print(f"       DR = {dr['score']} (raw={dr['raw_density']})")

    # 7. T_v2
    print("[7/9] Computing T_v2 (Transportation 3 composantes)...")
    t_v2 = extract_T_v2(windows, lang)
    print(f"       T_v2 = {t_v2['score']} (sens={t_v2['T_sensoriel']}, "
          f"sit={t_v2['T_situationnel']}, rel={t_v2['T_relationnel']})")

    # 8. S_local
    print("[8/9] Computing S_local (Surprise locale) [EXPERIMENTAL]...")
    s_local = extract_S_local(windows, lang)
    print(f"       S_local = {s_local['score']}")

    # 9. I_proxy + A_proxy
    print("[9/9] Computing I_proxy + A_proxy [EXPERIMENTAL]...")
    i_proxy = extract_I_proxy(windows, lang)
    a_proxy = extract_A_proxy(windows, lang)
    print(f"       I_proxy = {i_proxy['score']} (POV 1st: {i_proxy['pov_1st_person']})")
    print(f"       A_proxy = {a_proxy['score']} (N_rev_proxy: {a_proxy['N_rev_proxy']})")

    # Assemble variables
    variables = {
        "FL": fl,
        "MS": ms,
        "LP": lp,
        "DR": dr,
        "T_v2": t_v2,
        "S_local": s_local,
        "A_proxy": a_proxy,
        "I_proxy": i_proxy,
    }

    # Calculate PVI
    calculs = calculate_pvi(variables)
    print(f"\n--- RESULTATS ---")
    print(f"  E_emo = {calculs['E_emo']}")
    print(f"  E_cog = {calculs['E_cog']}")
    print(f"  CE    = {calculs['CE']}")
    print(f"  Score etouffement = {calculs['score_etouffement']}")
    if calculs["warning_etouffement"]:
        print(f"  *** AVERTISSEMENT: FL x (1-Omega) > 0.08 — risque abandon lecteur ***")

    # Build output
    title = Path(filepath).stem
    result = {
        "titre": title,
        "langue": lang,
        "methode_extraction": "debut20+milieu20+fin20",
        "text_length_chars": len(text),
        "variables_nlp": variables,
        "calculs": calculs,
    }

    return result


# ---------------------------------------------------------------------------
# BENCHMARK
# ---------------------------------------------------------------------------
BENCHMARK_BOOKS = {
    "fr": [
        {
            "file_pattern": "Letranger_French_Edition_-_Albert_Camus",
            "title": "L'Etranger (Camus)",
            "expected": {"FL": 0.18, "MS": 0.82, "LP": 0.15, "DR": 0.20},
        },
        {
            "file_pattern": "Du_cote_de_chez_Swann_-_Marcel_Proust",
            "title": "Du cote de chez Swann (Proust)",
            "expected": {"FL": 0.72, "MS": 0.92, "LP": 0.90, "DR": 0.65},
        },
        {
            "file_pattern": "Madame_Bovary_-_Gustave_Flaubert",
            "title": "Madame Bovary (Flaubert)",
            "expected": {"FL": 0.45, "MS": 0.90, "LP": 0.50, "DR": 0.35},
        },
    ],
    "en": [
        {
            "file_pattern": "Gone_Girl_-_Gillian_Flynn",
            "title": "Gone Girl (Flynn)",
            "expected": {"FL": 0.20, "MS": 0.72, "LP": 0.25, "DR": 0.15},
        },
        {
            "file_pattern": "It_Ends_with_Us_-_Colleen_Hoover",
            "title": "It Ends With Us (Hoover)",
            "expected": {"FL": 0.12, "MS": 0.55, "LP": 0.15, "DR": 0.10},
        },
    ],
}

CORPUS_DIR = r"C:\Users\elric\Downloads\livre"
CORPUS_DIR_EN = r"C:\Users\elric\Downloads\livre\nouverau livre EN"


def find_book_file(pattern, lang):
    """Find a book file matching pattern in corpus directories."""
    dirs = [CORPUS_DIR]
    if lang == "en":
        dirs.append(CORPUS_DIR_EN)
        dirs.append(os.path.join(CORPUS_DIR, "livre anglais en plus 2 eme salve"))

    for d in dirs:
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            if pattern.lower() in f.lower():
                return os.path.join(d, f)
    return None


def run_benchmark():
    """Run benchmark on 5 pilot books. Produce report."""
    print("\n" + "=" * 70)
    print("OMEGA PVI NLP Scorer — BENCHMARK Phase P1")
    print("=" * 70)

    all_results = []
    report_lines = []
    report_lines.append("# Rapport Benchmark NLP — Phase P1\n")
    report_lines.append(f"**Date**: 2026-03-29\n")
    report_lines.append("**Methode**: spaCy + wordfreq + VADER\n")
    report_lines.append("**Python**: 3.11 | **spaCy**: lg models\n\n")

    convergent_count = 0
    instable_count = 0
    inutilisable_count = 0
    fl_convergent = False
    total_tests = 0

    for lang, books in BENCHMARK_BOOKS.items():
        for book_info in books:
            filepath = find_book_file(book_info["file_pattern"], lang)
            if not filepath:
                print(f"\n  SKIP: {book_info['title']} — file not found")
                report_lines.append(f"\n### {book_info['title']} — FICHIER NON TROUVE\n")
                continue

            print(f"\n{'='*50}")
            print(f"Benchmark: {book_info['title']}")
            print(f"File: {os.path.basename(filepath)}")

            try:
                result = score_book(filepath, lang)
            except Exception as e:
                print(f"  ERROR: {e}")
                report_lines.append(f"\n### {book_info['title']} — ERREUR: {e}\n")
                continue

            report_lines.append(f"\n### {book_info['title']}\n")
            report_lines.append(f"| Variable | NLP Score | PROXY Reference | Delta | Verdict |\n")
            report_lines.append(f"|----------|----------|----------------|-------|--------|\n")

            for var_name, expected_val in book_info["expected"].items():
                nlp_val = result["variables_nlp"].get(var_name, {}).get("score", None)
                if nlp_val is None:
                    continue

                delta = abs(nlp_val - expected_val)
                total_tests += 1

                if delta < 0.10:
                    verdict = "CONVERGENT"
                    convergent_count += 1
                    if var_name == "FL":
                        fl_convergent = True
                elif delta < 0.20:
                    verdict = "INSTABLE"
                    instable_count += 1
                else:
                    verdict = "INUTILISABLE"
                    inutilisable_count += 1

                report_lines.append(
                    f"| {var_name} | {nlp_val:.4f} | {expected_val:.2f} | "
                    f"{delta:.4f} | {verdict} |\n"
                )
                print(f"  {var_name}: NLP={nlp_val:.4f} vs PROXY={expected_val:.2f} "
                      f"delta={delta:.4f} -> {verdict}")

            # Also log CE
            ce = result["calculs"]["CE"]
            report_lines.append(f"\nCE = {ce:.4f}\n")

            all_results.append({
                "title": book_info["title"],
                "lang": lang,
                "result": result,
                "expected": book_info["expected"],
            })

    # Summary
    report_lines.append(f"\n## Resume Benchmark\n")
    report_lines.append(f"- Tests total: {total_tests}\n")
    report_lines.append(f"- CONVERGENT (delta<0.10): {convergent_count}\n")
    report_lines.append(f"- INSTABLE (0.10-0.20): {instable_count}\n")
    report_lines.append(f"- INUTILISABLE (>0.20): {inutilisable_count}\n")
    report_lines.append(f"- FL convergente: {'OUI' if fl_convergent else 'NON'}\n")

    pass_phase1 = convergent_count >= 3 and fl_convergent
    verdict_global = "PHASE 1 PASS" if pass_phase1 else "PHASE 1 FAIL"
    report_lines.append(f"\n## Verdict Global: **{verdict_global}**\n")

    if not pass_phase1:
        report_lines.append(f"\nConditions non remplies:\n")
        if convergent_count < 3:
            report_lines.append(f"- Moins de 3 variables convergentes ({convergent_count}/3)\n")
        if not fl_convergent:
            report_lines.append(f"- FL non convergente — diagnostic requis avant Phase 2\n")

    report_lines.append(f"\n---\n")
    report_lines.append(f"**Reserve**: Toutes les references PROXY sont des estimations humaines.\n")
    report_lines.append(f"Les deltas mesurent la distance NLP-vs-estimation, pas NLP-vs-verite.\n")

    # Write report
    report_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "rapport_benchmark_nlp.md"
    )
    with open(report_path, "w", encoding="utf-8") as f:
        f.writelines(report_lines)
    print(f"\nReport written: {report_path}")
    print(f"\n{'='*70}")
    print(f"VERDICT: {verdict_global}")
    print(f"  Convergent: {convergent_count}/{total_tests}")
    print(f"  FL convergente: {fl_convergent}")
    print(f"{'='*70}")

    return pass_phase1, all_results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="OMEGA PVI NLP Scorer — Phase P1"
    )
    parser.add_argument("--input", "-i", type=str,
                        help="Path to book file (.txt, .epub, .pdf)")
    parser.add_argument("--lang", "-l", type=str, default="fr",
                        choices=["fr", "en"],
                        help="Language (default: fr)")
    parser.add_argument("--output", "-o", type=str, default=None,
                        help="Output JSON file path")
    parser.add_argument("--benchmark", action="store_true",
                        help="Run benchmark on 5 pilot books")

    args = parser.parse_args()

    if args.benchmark:
        passed, _ = run_benchmark()
        sys.exit(0 if passed else 1)

    if not args.input:
        parser.error("--input required (or use --benchmark)")

    if not os.path.exists(args.input):
        print(f"ERROR: File not found: {args.input}")
        sys.exit(1)

    result = score_book(args.input, args.lang)

    # Output JSON
    output_path = args.output or args.input + ".pvi.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\nJSON output: {output_path}")


if __name__ == "__main__":
    main()
