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
    """Extract raw text from .epub file."""
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
        content = item.get_content().decode("utf-8", errors="replace")
        stripper = _HTMLStripper()
        stripper.feed(content)
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


def load_text(filepath):
    """Load text from file, auto-detecting format."""
    ext = Path(filepath).suffix.lower()
    if ext == ".epub":
        return extract_text_from_epub(filepath)
    elif ext == ".txt":
        return extract_text_from_txt(filepath)
    elif ext == ".pdf":
        return extract_text_from_pdf(filepath)
    else:
        raise ValueError(f"Unsupported format: {ext} (use .txt, .epub, or .pdf)")


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
    Friction Lexicale — proportion of tokens below top-10k frequency.
    NER-filtered to avoid penalizing fantasy/SF proper nouns.
    """
    wordfreq = _import_wordfreq()
    nlp = get_nlp(lang)

    # Get frequency threshold for rank ~10000
    # wordfreq.top_n_list returns top N words; we get the freq of the 10000th
    top_10k = wordfreq.top_n_list(lang, 10000)
    if top_10k:
        seuil_10k = wordfreq.word_frequency(top_10k[-1], lang)
    else:
        seuil_10k = 1e-6  # fallback

    fl_per_window = []

    for window in text_windows:
        # Process with spaCy (limit to first 500k chars per window)
        doc = nlp(window[:500000])

        # Collect NER spans to exclude
        ner_char_ranges = set()
        for ent in doc.ents:
            if ent.label_ in ("PER", "PERS", "GPE", "ORG", "WORK_OF_ART",
                               "LOC", "PERSON", "FAC"):
                for i in range(ent.start, ent.end):
                    ner_char_ranges.add(i)

        total = 0
        below_10k = 0
        for token in doc:
            if token.i in ner_char_ranges:
                continue
            if token.is_punct or token.is_space or len(token.text) < 2:
                continue
            if token.like_num:
                continue

            word = token.text.lower()
            freq = wordfreq.word_frequency(word, lang)
            total += 1
            if freq < seuil_10k:
                below_10k += 1

        if total > 0:
            fl_per_window.append(below_10k / total)
        else:
            fl_per_window.append(0.0)

    fl_mean = statistics.mean(fl_per_window) if fl_per_window else 0.0
    fl_sigma = statistics.stdev(fl_per_window) if len(fl_per_window) > 1 else 0.0

    return {
        "score": round(fl_mean, 4),
        "sigma": round(fl_sigma, 4),
        "per_window": [round(x, 4) for x in fl_per_window],
        "methode": "wordfreq_NER_filtered",
        "seuil_10k": seuil_10k,
        "tag": "NLP-ROBUSTE",
    }


def extract_MS(text_windows, lang):
    """
    Musicalite Syntaxique — rhythm variety via CV of sentence lengths,
    max dependency depth, and syntactic structure diversity.
    """
    nlp = get_nlp(lang)
    ms_per_window = []

    for window in text_windows:
        doc = nlp(window[:500000])
        sents = list(doc.sents)
        if len(sents) < 5:
            ms_per_window.append(0.5)
            continue

        # 1. CV of sentence lengths
        lengths = [len(list(s)) for s in sents]
        mean_len = statistics.mean(lengths)
        std_len = statistics.stdev(lengths) if len(lengths) > 1 else 0
        cv = std_len / mean_len if mean_len > 0 else 0

        # 2. Max dependency tree depth per sentence
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

        # 3. Syntactic structure diversity
        dep_types = set()
        for token in doc:
            dep_types.add(token.dep_)
        struct_ratio = len(dep_types) / max(len(sents), 1)

        # Normalize each component to [0,1]
        # CV: typical range 0.3-1.5, normalize with sigmoid-like
        cv_norm = min(cv / 1.0, 1.0)
        # Depth: typical range 3-12, normalize
        depth_norm = min((mean_depth - 2) / 10.0, 1.0)
        depth_norm = max(depth_norm, 0.0)
        # Struct ratio: typical range 0.1-1.5
        struct_norm = min(struct_ratio / 1.0, 1.0)

        ms = 0.40 * cv_norm + 0.35 * depth_norm + 0.25 * struct_norm
        ms_per_window.append(ms)

    ms_mean = statistics.mean(ms_per_window) if ms_per_window else 0.5
    ms_sigma = statistics.stdev(ms_per_window) if len(ms_per_window) > 1 else 0.0

    return {
        "score": round(ms_mean, 4),
        "sigma": round(ms_sigma, 4),
        "per_window": [round(x, 4) for x in ms_per_window],
        "methode": "spacy_CV_depth",
        "tag": "NLP-ROBUSTE",
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
    """
    vader = _import_vader()

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
    is_first_person = pov_ratio > 0.03  # ~3% threshold

    # Extract 50-token windows around protagonist mentions
    protag_windows = []
    for i, tok in enumerate(tokens):
        clean = tok.strip("'\".,;:!?()")
        if clean in markers:
            start = max(0, i - 25)
            end = min(n_tokens, i + 25)
            window_text = " ".join(tokens[start:end])
            protag_windows.append(window_text)
            if len(protag_windows) >= 200:
                break

    # Analyze emotional density in protagonist windows
    if not protag_windows:
        # Fallback: sample from full text
        protag_windows = [" ".join(tokens[i:i+50])
                          for i in range(0, min(n_tokens, 5000), 250)]

    neg_scores = []
    for w in protag_windows[:200]:
        vs = vader.polarity_scores(w)
        neg_scores.append(vs["neg"])

    mean_neg = statistics.mean(neg_scores) if neg_scores else 0.05
    # Arousal proxy: high absolute sentiment
    arousal_scores = [abs(vader.polarity_scores(w)["compound"])
                      for w in protag_windows[:200]]
    mean_arousal = statistics.mean(arousal_scores) if arousal_scores else 0.3

    # Normalize components
    neg_norm = min(mean_neg / 0.15, 1.0)  # typical neg 0.02-0.15
    arousal_norm = min(mean_arousal / 0.5, 1.0)
    pov_bonus = 0.15 if is_first_person else 0.0

    # I_proxy = weighted combination
    i_proxy = (0.35 * neg_norm + 0.30 * arousal_norm +
               0.20 * min(pov_ratio / 0.05, 1.0) + pov_bonus)
    i_proxy = min(i_proxy, 1.0)

    return {
        "score": round(i_proxy, 4),
        "pov_1st_person": is_first_person,
        "pov_ratio": round(pov_ratio, 4),
        "mean_neg_valence": round(mean_neg, 4),
        "mean_arousal": round(mean_arousal, 4),
        "methode": "vader_protagonist_windows",
        "tag": "PROXY-NLP",
    }


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

    # T_proxy = 1 - DR (less referential density = more immersive)
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

    # 7. S_local
    print("[7/8] Computing S_local (Surprise locale) [EXPERIMENTAL]...")
    s_local = extract_S_local(windows, lang)
    print(f"       S_local = {s_local['score']}")

    # 8. I_proxy + A_proxy
    print("[8/8] Computing I_proxy + A_proxy [EXPERIMENTAL]...")
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
