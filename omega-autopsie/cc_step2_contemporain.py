#!/usr/bin/env python3
"""
OMEGA — CC-STEP-2 : Corpus Œuvres Contemporaines
Pipeline extraction PDF + analyse multi-scènes (15-25 par œuvre)

Droits : Traitement computationnel analytique uniquement.
Aucun extrait reproduit dans les outputs publics.
Features mesurées : valeurs numériques uniquement.

Standard : NASA-Grade L4 — aucune approximation tolérée.
"""

import json
import hashlib
import re
import unicodedata
import math
import logging
from pathlib import Path
from datetime import datetime
from collections import Counter
from statistics import mean, stdev, median

import numpy as np
import spacy

try:
    import fitz  # pymupdf
    PYMUPDF_OK = True
except ImportError:
    PYMUPDF_OK = False
    print("ERREUR: pymupdf manquant. pip install pymupdf")

# ══════════════════════════════════════════════════════════════════════
# MANIFEST CORPUS PAYANT
# ══════════════════════════════════════════════════════════════════════

CORPUS_PAYANT = [
    {
        "work_id": "duras_amant",
        "title": "L'Amant",
        "author": "Duras",
        "year": 1984,
        "category": "prose_autofiction",
        "lang_original": "fr",
        "pdf_filename": "LAmant_-_Marguerite_Duras.pdf",
        "target_scenes": 20,
        "style_notes": "Prose fragmentée, temps suspendu, voix je/elle dissociée",
    },
    {
        "work_id": "carrere_adversaire",
        "title": "L'Adversaire",
        "author": "Carrère",
        "year": 2000,
        "category": "prose_recit_vrai",
        "lang_original": "fr",
        "pdf_filename": "Carrère, Emmanuel - L'Adversaire.pdf",
        "target_scenes": 20,
        "style_notes": "Récit factuel sous tension narrative, voix directe, ellipse maximale",
    },
    {
        "work_id": "mccarthy_route",
        "title": "La Route",
        "author": "McCarthy",
        "year": 2006,
        "category": "prose_postapocalyptique",
        "lang_original": "en",
        "pdf_filename": "la route.pdf",
        "target_scenes": 20,
        "style_notes": "Prose nominale, absence ponctuation dialogue, rythme binaire père/fils",
    },
    {
        "work_id": "rulfo_pedro",
        "title": "Pedro Páramo",
        "author": "Rulfo",
        "year": 1955,
        "category": "prose_realisme_magique",
        "lang_original": "es",
        "pdf_filename": "pedro_paramo.pdf",
        "target_scenes": 15,
        "style_notes": "Fragment, voix multiples mortes/vivantes, temps non-linéaire",
    },
    {
        "work_id": "morrison_beloved",
        "title": "Beloved",
        "author": "Morrison",
        "year": 1987,
        "category": "prose_stream_conscience",
        "lang_original": "en",
        "pdf_filename": "Toni-Morrison.-Beloved.pdf",
        "target_scenes": 20,
        "style_notes": "Flux de conscience, répétition rituelle, oralité afro-américaine",
    },
]

# ══════════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════════

PROTOCOL_VERSION = "autopsie_cc2_v1.0"
SPACY_MODEL = "fr_core_news_lg"
MIN_WORDS = 400
MAX_WORDS = 900
MIN_SENT_WORDS = 3

# Positions de scènes : distribution sur l'espace du texte
# 20 scènes = déciles + positions intermédiaires
POSITIONS_20 = [
    0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50,
    0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.88, 0.92, 0.96,
]
POSITIONS_15 = [
    0.05, 0.10, 0.18, 0.25, 0.33, 0.40, 0.47, 0.54,
    0.61, 0.67, 0.73, 0.79, 0.84, 0.90, 0.95,
]

import io as _io
_utf8_stdout = _io.TextIOWrapper(
    __import__("sys").stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("omega_cc2.log", encoding="utf-8"),
        logging.StreamHandler(stream=_utf8_stdout),
    ]
)
log = logging.getLogger("CC2")

# ══════════════════════════════════════════════════════════════════════
# LEXICONS (hérités)
# ══════════════════════════════════════════════════════════════════════

TEMPORAL_MARKERS = [
    "avant", "après", "depuis", "soudain", "encore", "jamais", "autrefois",
    "jadis", "désormais", "bientôt", "déjà", "toujours", "parfois", "souvent",
    "naguère", "dorénavant", "auparavant", "ensuite", "puis", "soudainement",
    "enfin", "longtemps", "brusquement", "tout à coup", "dès lors",
]
SUBJECTIVITY_MARKERS = [
    "peut-être", "comme si", "à vrai dire", "on aurait dit", "il semblait",
    "paraissait", "semblait", "avait l'air", "apparemment", "vraisemblablement",
    "sans doute", "il me semble", "je crois", "je pense",
]
JUDGMENT_MARKERS = [
    "ridicule", "absurde", "indigne", "magnifique", "terrible", "horrible",
    "merveilleux", "atroce", "sublime", "misérable", "admirable",
    "pathétique", "grotesque", "splendide",
]
ADVERSATIVE_MARKERS = [
    "pourtant", "cependant", "néanmoins", "toutefois", "mais", "or",
    "bien que", "malgré", "quand même", "tout de même",
]
COPULA_VERBS = {
    "être", "avoir", "sembler", "paraître", "devenir", "rester", "demeurer",
}
CONNECTORS = [
    "et", "ou", "mais", "donc", "or", "ni", "car", "puis", "ensuite",
    "enfin", "alors", "ainsi", "parce", "puisque", "quand", "lorsque",
    "si", "pourtant", "cependant",
]
EMOTION_WORDS = [
    "triste", "tristesse", "douleur", "souffrance", "angoisse", "peur",
    "effroi", "terreur", "joie", "bonheur", "amour", "haine", "colère",
    "rage", "désespoir", "espoir", "nostalgie", "mélancolie", "chagrin",
]
BANALITY_WHITELIST = [
    "il faisait chaud", "le soleil", "la lumière", "le silence",
    "il était fatigué", "elle regardait", "il marchait", "la nuit tombait",
]

_NLP = None

def get_nlp():
    global _NLP
    if _NLP is None:
        log.info(f"Chargement modèle {SPACY_MODEL}...")
        _NLP = spacy.load(SPACY_MODEL)
    return _NLP


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ══════════════════════════════════════════════════════════════════════
# EXTRACTION PDF
# ══════════════════════════════════════════════════════════════════════

def extract_pdf_text(pdf_path: Path) -> str:
    """
    Extrait tout le texte d'un PDF via pymupdf.
    Concatène toutes les pages, nettoyage minimal.
    """
    if not PYMUPDF_OK:
        raise RuntimeError("pymupdf non disponible")

    doc = fitz.open(str(pdf_path))
    pages_text = []

    for page in doc:
        t = page.get_text()
        if t.strip():
            pages_text.append(t)

    doc.close()

    full_text = "\n".join(pages_text)
    # Nettoyage : numéros de page isolés, headers récurrents
    full_text = re.sub(r'\n\d{1,4}\n', '\n', full_text)
    full_text = re.sub(r'\n{3,}', '\n\n', full_text)
    return normalize_text(full_text)


def split_sentences_simple(text: str) -> list:
    """Segmentation rapide sans spaCy pour sélection de fenêtres."""
    pattern = r'(?<=[.!?…»])\s+(?=[A-ZÀÂÆÇÈÉÊËÎÏÔÙÛÜŸŒ«\-])'
    raw = re.split(pattern, text)
    sents = []
    for s in raw:
        s = s.strip()
        if len(s.split()) >= MIN_SENT_WORDS:
            sents.append(s)
    return sents


def extract_window(sentences: list, position: float,
                   min_w: int = MIN_WORDS, max_w: int = MAX_WORDS) -> str:
    """Extrait une fenêtre de texte centrée sur position (0.0-1.0)."""
    n = len(sentences)
    if n < 8:
        return None

    ci = int(position * n)
    ci = max(3, min(ci, n - 4))

    start, end = ci, ci
    wc = len(sentences[ci].split())
    left, right = ci - 1, ci + 1

    while wc < min_w:
        added = False
        if left >= 0:
            wc += len(sentences[left].split())
            start = left
            left -= 1
            added = True
        if wc >= min_w:
            break
        if right < n:
            wc += len(sentences[right].split())
            end = right
            right += 1
            added = True
        if not added:
            break

    while wc > max_w and (end - start) > 2:
        if abs(start - ci) >= abs(end - ci):
            wc -= len(sentences[start].split())
            start += 1
        else:
            wc -= len(sentences[end].split())
            end -= 1

    window = " ".join(sentences[start:end + 1])
    return window if len(window.split()) >= min_w else None


def check_overlap(new_text: str, existing: list, threshold: float = 0.60) -> bool:
    """True si le texte est suffisamment différent des existants."""
    new_words = set(new_text.lower().split())
    for ex in existing:
        ex_words = set(ex.lower().split())
        if not new_words or not ex_words:
            continue
        overlap = len(new_words & ex_words) / max(len(new_words), 1)
        if overlap > (1 - threshold):
            return False  # Trop similaire
    return True


# ══════════════════════════════════════════════════════════════════════
# FEATURES (pipeline complet v3.0)
# ══════════════════════════════════════════════════════════════════════

def find_apex(sents):
    scores = []
    for s in sents:
        wl = s.lower().split()
        e = sum(1 for w in wl if any(ew in w for ew in EMOTION_WORDS))
        p = sum(1 for c in ["!", "—", "...", "?!"] if c in s)
        scores.append(e * 2 + p + (1 if len(wl) < 10 else 0))
    return int(np.argmax(scores)) if scores else len(sents) // 2


def compute_f1(sents):
    lens = [len(s.split()) for s in sents]
    if len(lens) < 3:
        return {"_f1": "NON_CALCULABLE"}
    a = np.array(lens, dtype=float)
    mu, sigma = float(np.mean(a)), float(np.std(a))
    q4 = a[int(len(a) * 0.75):]
    return {
        "f1a_rhythm_variance": round(sigma, 3),
        "f1b_rhythm_ratio": round(sigma / mu, 4) if mu > 0 else None,
        "f1c_rhythm_q4_variance": round(float(np.std(q4)), 3) if len(q4) >= 2 else None,
        "f1_mean": round(mu, 2),
        "f1_max": int(np.max(a)),
        "f1_min": int(np.min(a)),
        "f1_sentence_count": len(lens),
    }


def compute_f2(sents):
    if len(sents) < 3:
        return {"_f2": "NON_CALCULABLE"}
    ai = find_apex(sents)
    al = len(sents[ai].split())
    pl = len(sents[ai - 1].split()) if ai > 0 else al
    nl = len(sents[ai + 1].split()) if ai < len(sents) - 1 else al
    ctx = (pl + nl) / 2
    return {
        "f2_apex_compression_ratio": round(al / ctx, 4) if ctx > 0 else None,
        "f2_apex_position": f"Q{min(int(ai/len(sents)*4)+1,4)}",
        "f2_apex_length": al,
    }


def compute_f5(doc):
    toks = [t for t in doc if not t.is_space and not t.is_punct]
    verbs = [t for t in toks if t.pos_ in {"VERB", "AUX"}]
    verbs_lex = [t for t in toks if t.pos_ == "VERB"]
    adjs = [t for t in toks if t.pos_ == "ADJ"]
    act = [v for v in verbs_lex if v.lemma_.lower() not in COPULA_VERBS]
    if not toks:
        return {"_f5": "NON_CALCULABLE"}
    return {
        "f5a_verb_density": round(len(verbs) / len(toks), 4),
        "f5a_lex_verb_density": round(len(verbs_lex) / len(toks), 4),
        "f5b_verb_adj_ratio": round(len(verbs) / max(len(adjs), 1), 4),
        "f5c_action_verb_ratio": round(len(act) / max(len(verbs_lex), 1), 4),
        "f5_verb_count": len(verbs),
        "f5_adj_count": len(adjs),
        "f5_total_tokens": len(toks),
    }


def compute_f8a(text):
    words = text.lower().split()
    if not words:
        return {"_f8a": "NON_CALCULABLE"}
    hits = [w for w in words if any(e in w for e in EMOTION_WORDS)]
    r = len(hits) / len(words)
    return {
        "f8a_emotional_density_ratio": round(r, 5),
        "f8a_emotion_count": len(hits),
        "f8a_zone": "HEMINGWAY" if r < 0.005 else ("PURPLE_PROSE" if r > 0.02 else "NORMAL"),
    }


def compute_f9(sents):
    count = sum(1 for s in sents if any(m in s.lower() for m in ADVERSATIVE_MARKERS))
    return {
        "f9a_contradiction_rate": round(count / max(len(sents), 1), 4),
        "f9a_adversative_count": count,
    }


def compute_f12(doc, text):
    tl = text.lower()
    total_words = len([t for t in doc if not t.is_space and not t.is_punct])
    mc = sum(1 for m in TEMPORAL_MARKERS if m in tl)
    sw, prev_tense, sc = 0, None, 0
    for sent in doc.sents:
        sc += 1
        tenses = []
        for tok in sent:
            if tok.pos_ in {"VERB", "AUX"}:
                t = tok.morph.get("Tense")
                if t:
                    tenses.extend(t)
        if tenses:
            ct = max(set(tenses), key=tenses.count)
            if prev_tense and ct != prev_tense:
                sw += 1
            prev_tense = ct
    return {
        "f12a_temporal_marker_rate": round(mc / max(total_words, 1), 5),
        "f12b_tense_switch_rate": round(sw / max(sc, 1), 4),
        "f12c_temporal_density": round((mc / max(total_words, 1) + sw / max(sc, 1)) / 2, 5),
    }


def compute_f15(sents):
    if len(sents) < 5:
        return {"_f15": "NON_CALCULABLE"}
    def bigrams(t):
        w = re.sub(r"[^\w\s]", "", t.lower()).split()
        return set(zip(w, w[1:]))
    total_bg, dup_bg = 0, 0
    for i, s in enumerate(sents):
        win = sents[max(0, i-2):i] + sents[i+1:min(len(sents), i+3)]
        cur = bigrams(s)
        wbg = bigrams(" ".join(win))
        dup_bg += len(cur & wbg)
        total_bg += len(cur)
    rr = dup_bg / total_bg if total_bg else 0
    return {
        "f15a_local_repetition_rate": round(rr, 4),
        "f15b_redundancy_compression": round(1 - rr, 4),
    }


def compute_f16(text):
    words = re.sub(r"[^\w\s]", "", text.lower()).split()
    if len(words) < 10:
        return {"_f16": "NON_CALCULABLE"}
    wc = Counter(words)
    hapax = sum(1 for w, c in wc.items() if c == 1 and len(w) > 3)
    hr = hapax / max(len(wc), 1)
    bgl = list(zip(words, words[1:]))
    ub = sum(1 for _, c in Counter(bgl).items() if c == 1)
    br = ub / max(len(Counter(bgl)), 1)
    return {
        "f16a_bigram_rarity": round(br, 4),
        "f16b_hapax_rate": round(hr, 4),
        "f16c_lexical_surprise": round(hr * 0.4 + br * 0.6, 4),
        "f16_vocab_size": len(wc),
        "f16_hapax_count": hapax,
    }


def compute_f17(sents):
    def is_knife(s):
        return (len(s.split()) < 12 and any(p in s for p in ["!", "—", "...", "«"])) or \
               any(m in s.lower() for m in ["pourtant", "mais", "cependant"])
    def is_banal(s):
        return any(w in s.lower() for w in BANALITY_WHITELIST) or \
               (15 <= len(s.split()) <= 25 and not is_knife(s))
    ki = [i for i, s in enumerate(sents) if is_knife(s)]
    bi = [i for i, s in enumerate(sents) if is_banal(s)]
    if not ki:
        return {"f17_contrast_arc_score": 0.0, "f17_knife_count": 0, "f17_banal_count": len(bi)}
    cr = len(ki) / (len(bi) + 1)
    sp = float(np.mean([ki[j+1]-ki[j] for j in range(len(ki)-1)])) if len(ki) >= 2 else None
    rt = sum(1 for k in ki if any(is_banal(s) for s in sents[k+1:k+3])) / len(ki)
    ss = (1.0 if 3 <= sp <= 9 else max(0.0, 1.0 - abs(sp-6)/6)) if sp else 0.5
    return {
        "f17_contrast_arc_score": round(rt * 0.5 + ss * 0.3 + min(cr, 1.0) * 0.2, 4),
        "f17_knife_count": len(ki),
        "f17_banal_count": len(bi),
    }


def compute_f18(doc, sents):
    total = len(sents)
    if not total:
        return {"_f18": "NON_CALCULABLE"}
    frag, nom = 0, 0
    for sent in doc.sents:
        toks = [t for t in sent if not t.is_space and not t.is_punct]
        hv = any(t.pos_ in {"VERB", "AUX"} for t in toks)
        hn = any(t.pos_ in {"NOUN", "PROPN"} for t in toks)
        if not hv and len(toks) >= 2:
            frag += 1
        if not hv and hn:
            nom += 1
    cuts = sum(1 for i in range(len(sents)-1)
               if not any(sents[i+1].strip().lower().startswith(c+" ") for c in CONNECTORS))
    fr, nr, cr = frag/total, nom/total, cuts/max(total-1, 1)
    raw = (fr + nr + cr) / 3
    return {
        "f18a_fragment_rate": round(fr, 4),
        "f18b_nominal_rate": round(nr, 4),
        "f18c_cut_rate": round(cr, 4),
        "f18f_ellipsis_final": round(max(0.0, raw - (fr-0.25)*0.3 if fr > 0.25 else raw), 4),
    }


def _approximate_entropy(data: list, m: int = 2, r: float = None) -> float:
    n = len(data)
    if n < m + 2:
        return 0.0
    arr = np.array(data, dtype=float)
    if r is None:
        r = max(0.2 * float(np.std(arr)), 0.001)
    def phi(ml):
        templates = [arr[i:i+ml] for i in range(n-ml+1)]
        count = 0
        for tmpl in templates:
            matches = sum(1 for other in templates if np.max(np.abs(tmpl-other)) <= r)
            if matches > 0:
                count += math.log(matches / (n-ml+1))
        return count / (n-ml+1)
    return abs(phi(m) - phi(m+1))


def compute_f19(sents):
    if len(sents) < 6:
        return {"_f19": "NON_CALCULABLE"}
    lens = [len(s.split()) for s in sents]
    apen = _approximate_entropy(lens)
    arr = np.array(lens, dtype=float)
    if len(set(lens)) > 1:
        hist, _ = np.histogram(arr, bins=min(len(lens)//2, 10))
        hist = hist[hist > 0]
        probs = hist / hist.sum()
        shannon = -float(np.sum(probs * np.log2(probs)))
    else:
        shannon = 0.0
    zone = ("CANONICAL_PREFERRED" if apen >= 0.8 else
            "ABOVE_AVERAGE" if apen >= 0.5 else
            "AVERAGE" if apen >= 0.3 else "PREDICTABLE")
    return {
        "f19a_approx_entropy": round(apen, 5),
        "f19b_shannon_entropy": round(shannon, 5),
        "f19c_entropy_zone": zone,
        "f19d_sentence_len_std": round(float(np.std(arr)), 3),
    }


def compute_f20(doc, text, sents):
    words = re.sub(r"[^\w\s]", "", text.lower()).split()
    allit = (sum(1 for i in range(len(words)-1)
                 if words[i][0] == words[i+1][0] and len(words[i]) > 2)
             / max(len(words)-1, 1)) if len(words) > 5 else 0.0
    tl = text.lower()
    adv = sum(1 for m in ADVERSATIVE_MARKERS if m in tl)
    adv_rate = adv / max(len(sents), 1)
    lens = [len(s.split()) for s in sents]
    breaks = sum(1 for i in range(len(lens)-1)
                 if max(lens[i], lens[i+1]) / max(min(lens[i], lens[i+1]), 1) >= 3.0)
    break_rate = breaks / max(len(sents)-1, 1)
    sem = adv_rate * 0.5 + break_rate * 0.5
    composite = allit * 0.25 + sem * 0.75
    return {
        "f20a_phonetic_fg": round(allit, 5),
        "f20c_semantic_fg": round(sem, 5),
        "f20d_composite_fg": round(composite, 5),
        "f20e_fg_level": ("HIGH" if composite >= 0.5 else
                          "MEDIUM" if composite >= 0.3 else
                          "LOW" if composite >= 0.15 else "MINIMAL"),
    }


# ══════════════════════════════════════════════════════════════════════
# ANALYSE D'UN EXTRAIT
# ══════════════════════════════════════════════════════════════════════

def analyze_window(text: str, meta: dict) -> dict:
    nlp = get_nlp()
    doc = nlp(text)
    sents = [s.text.strip() for s in doc.sents
             if len(s.text.strip().split()) >= MIN_SENT_WORDS]

    features = {}
    errors = []
    pipeline = [
        ("F1",  lambda: compute_f1(sents)),
        ("F2",  lambda: compute_f2(sents)),
        ("F5",  lambda: compute_f5(doc)),
        ("F8a", lambda: compute_f8a(text)),
        ("F9",  lambda: compute_f9(sents)),
        ("F12", lambda: compute_f12(doc, text)),
        ("F15", lambda: compute_f15(sents)),
        ("F16", lambda: compute_f16(text)),
        ("F17", lambda: compute_f17(sents)),
        ("F18", lambda: compute_f18(doc, sents)),
        ("F19", lambda: compute_f19(sents)),
        ("F20", lambda: compute_f20(doc, text, sents)),
    ]
    for fname, func in pipeline:
        try:
            features.update(func())
        except Exception as e:
            errors.append(f"{fname}: {e}")

    sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return {
        "meta": {**meta, "protocol": PROTOCOL_VERSION,
                 "extraction_date": datetime.now().isoformat()},
        "extract_info": {
            "text_sha256": sha,
            "word_count": len(text.split()),
            "sentence_count": len(sents),
        },
        "features": features,
        "flags": {"errors": errors,
                  "lang_model_mismatch": meta.get("lang_original", "fr") != "fr"},
    }


# ══════════════════════════════════════════════════════════════════════
# BASELINES AUTEUR (identique v3.0)
# ══════════════════════════════════════════════════════════════════════

FEATURES_FOR_BASELINE = [
    "f1_mean", "f1a_rhythm_variance", "f1b_rhythm_ratio",
    "f5a_verb_density", "f5a_lex_verb_density",
    "f8a_emotional_density_ratio",
    "f9a_contradiction_rate",
    "f15a_local_repetition_rate", "f15b_redundancy_compression",
    "f16b_hapax_rate", "f16c_lexical_surprise",
    "f17_contrast_arc_score",
    "f18f_ellipsis_final",
    "f19a_approx_entropy", "f19b_shannon_entropy",
    "f20d_composite_fg",
]


def compute_baseline(results: list) -> dict:
    fv = {f: [] for f in FEATURES_FOR_BASELINE}
    for r in results:
        for f in FEATURES_FOR_BASELINE:
            v = r.get("features", {}).get(f)
            if v is not None and isinstance(v, (int, float)) and not math.isnan(v):
                fv[f].append(float(v))
    baseline = {}
    for f, vals in fv.items():
        if len(vals) < 2:
            baseline[f] = {"status": "INSUFFICIENT_DATA", "n": len(vals)}
            continue
        s = sorted(vals)
        n = len(s)
        baseline[f] = {
            "n": n,
            "min": round(s[0], 5),
            "p25": round(s[max(0, int(n*0.25)-1)], 5),
            "median": round(median(s), 5),
            "p75": round(s[min(n-1, int(n*0.75))], 5),
            "max": round(s[-1], 5),
            "mean": round(mean(s), 5),
            "stdev": round(stdev(s) if n >= 2 else 0.0, 5),
        }
    return baseline


# ══════════════════════════════════════════════════════════════════════
# DELTA CONTEMPORAIN vs DOMAINE PUBLIC
# ══════════════════════════════════════════════════════════════════════

def compute_delta_contemporary(payant_baselines: dict,
                                public_baselines_path: Path) -> dict:
    """
    Compare les baselines contemporaines vs corpus domaine public.
    Identifie les features où la prose contemporaine s'écarte significativement.
    """
    if not public_baselines_path.exists():
        return {"status": "NO_PUBLIC_BASELINE", "deltas": []}

    with open(public_baselines_path, encoding="utf-8") as f:
        public_data = json.load(f)

    global_public = public_data.get("global_corpus_baseline", {})
    deltas = []

    for feat in FEATURES_FOR_BASELINE:
        pub = global_public.get(feat, {})
        pub_med = pub.get("median")
        if pub_med is None:
            continue

        for wid, info in payant_baselines.items():
            b = info.get("baseline", {}).get(feat, {})
            pay_med = b.get("median")
            if pay_med is None:
                continue
            if pub_med == 0:
                continue
            delta_pct = (pay_med - pub_med) / abs(pub_med) * 100
            deltas.append({
                "work_id": wid,
                "author": info.get("author"),
                "feature": feat,
                "public_median": round(pub_med, 5),
                "contemporary_median": round(pay_med, 5),
                "delta_pct": round(delta_pct, 1),
                "direction": "HIGHER" if delta_pct > 0 else "LOWER",
                "significant": abs(delta_pct) > 20,
            })

    return {
        "status": "OK",
        "n_comparisons": len(deltas),
        "significant_deltas": [d for d in deltas if d["significant"]],
        "all_deltas": sorted(deltas, key=lambda x: abs(x["delta_pct"]), reverse=True),
    }


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def main(pdf_dir: str = ".", results_base: str = "results_cc2",
         public_baselines: str = "ssot/baselines_auteur.json"):

    pdf_dir = Path(pdf_dir)
    results_dir = Path(results_base)
    results_dir.mkdir(parents=True, exist_ok=True)

    log.info("OMEGA CC-STEP-2 — Corpus Œuvres Contemporaines")
    log.info(f"PDFs source: {pdf_dir.resolve()}")
    log.info(f"Œuvres: {len(CORPUS_PAYANT)}")

    all_baselines = {}
    master_summary = {
        "run_date": datetime.now().isoformat(),
        "protocol": PROTOCOL_VERSION,
        "works": [],
        "global": {"total_processed": 0, "total_failed": 0, "total_skipped": 0},
    }

    for entry in CORPUS_PAYANT:
        wid = entry["work_id"]
        pdf_name = entry["pdf_filename"]
        pdf_path = pdf_dir / pdf_name
        target_n = entry["target_scenes"]

        log.info(f"\n{'-'*50}")
        log.info(f"Traitement: {wid} ({pdf_name})")

        if not pdf_path.exists():
            log.warning(f"PDF introuvable: {pdf_path}")
            master_summary["works"].append({"work_id": wid, "status": "PDF_NOT_FOUND"})
            continue

        # Extraction texte PDF
        try:
            full_text = extract_pdf_text(pdf_path)
            total_words = len(full_text.split())
            log.info(f"  PDF extrait: {total_words} mots")
        except Exception as e:
            log.error(f"  Extraction PDF échouée: {e}")
            master_summary["works"].append({"work_id": wid, "status": "PDF_EXTRACT_FAILED",
                                             "error": str(e)})
            continue

        if total_words < 5000:
            log.warning(f"  Texte trop court: {total_words} mots")
            master_summary["works"].append({"work_id": wid, "status": "TOO_SHORT"})
            continue

        # Segmentation pour sélection de fenêtres
        sentences = split_sentences_simple(full_text)
        log.info(f"  Phrases segmentées: {len(sentences)}")

        # Positions de scènes
        positions = POSITIONS_20 if target_n >= 20 else POSITIONS_15
        positions = positions[:target_n]

        # Dossier résultats pour cette œuvre
        work_dir = results_dir / wid
        work_dir.mkdir(parents=True, exist_ok=True)

        work_results = []
        extracted_texts = []
        processed, skipped, failed = 0, 0, 0

        for i, pos in enumerate(positions):
            scene_id = f"S{i+1:02d}"
            out_file = work_dir / f"{wid}_{scene_id}.json"

            if out_file.exists():
                log.info(f"  {scene_id}: déjà existant — chargement")
                with open(out_file, encoding="utf-8") as f:
                    r = json.load(f)
                work_results.append(r)
                processed += 1
                continue

            window = extract_window(sentences, pos)
            if not window:
                log.warning(f"  {scene_id} @ {pos:.0%}: extraction échouée")
                skipped += 1
                continue

            if not check_overlap(window, extracted_texts):
                # Essai décalé
                window = extract_window(sentences, min(pos + 0.05, 0.97))
                if not window or not check_overlap(window, extracted_texts):
                    log.warning(f"  {scene_id}: overlap — skip")
                    skipped += 1
                    continue

            try:
                meta = {
                    "work_id": wid,
                    "title": entry["title"],
                    "author": entry["author"],
                    "year": entry["year"],
                    "category": entry["category"],
                    "lang_original": entry["lang_original"],
                    "extract_type": scene_id,
                    "position_pct": round(pos * 100, 1),
                    "style_notes": entry["style_notes"],
                }
                result = analyze_window(window, meta)
                wc = result["extract_info"]["word_count"]

                with open(out_file, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)

                extracted_texts.append(window)
                work_results.append(result)
                processed += 1

                sha12 = result["extract_info"]["text_sha256"][:12]
                apen = result["features"].get("f19a_approx_entropy", "N/A")
                log.info(f"  {scene_id} @ {pos:.0%}: {wc}w | ApEn={apen} | [{sha12}]")

            except Exception as e:
                log.error(f"  {scene_id}: analyse échouée: {e}")
                failed += 1

        log.info(f"  → Traités: {processed} | Skippés: {skipped} | Échecs: {failed}")

        # Baseline auteur
        if work_results:
            baseline = compute_baseline(work_results)
            all_baselines[wid] = {
                "author": entry["author"],
                "work_id": wid,
                "year": entry["year"],
                "lang_original": entry["lang_original"],
                "category": entry["category"],
                "n_extracts": len(work_results),
                "baseline": baseline,
            }

        master_summary["works"].append({
            "work_id": wid,
            "status": "OK",
            "n_processed": processed,
            "n_skipped": skipped,
            "n_failed": failed,
        })
        master_summary["global"]["total_processed"] += processed
        master_summary["global"]["total_failed"] += failed
        master_summary["global"]["total_skipped"] += skipped

    # Sauvegarder baselines contemporaines
    baselines_cc2_path = Path("ssot/baselines_contemporain.json")
    baselines_cc2_path.parent.mkdir(parents=True, exist_ok=True)

    baselines_out = {
        "generated": datetime.now().isoformat(),
        "protocol": PROTOCOL_VERSION,
        "n_works": len(all_baselines),
        "features_tracked": FEATURES_FOR_BASELINE,
        "authors": all_baselines,
    }
    sha_b = hashlib.sha256(
        json.dumps(baselines_out, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    baselines_out["sha256"] = sha_b

    with open(baselines_cc2_path, "w", encoding="utf-8") as f:
        json.dump(baselines_out, f, ensure_ascii=False, indent=2)
    log.info(f"\nBaselines contemporaines: {baselines_cc2_path} [{sha_b[:16]}]")

    # Delta contemporain vs domaine public
    delta = compute_delta_contemporary(all_baselines, Path(public_baselines))
    delta_path = results_dir / "delta_contemporary.json"
    with open(delta_path, "w", encoding="utf-8") as f:
        json.dump(delta, f, ensure_ascii=False, indent=2)
    log.info(f"Delta contemporain: {delta_path}")

    if delta.get("significant_deltas"):
        log.info(f"\nDELTAS SIGNIFICATIFS (>20%):")
        for d in delta["significant_deltas"][:10]:
            log.info(f"  {d['author']:15s} {d['feature']:30s} "
                     f"{d['direction']} {d['delta_pct']:+.1f}%")

    # Master summary
    sha_s = hashlib.sha256(
        json.dumps(master_summary, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    master_summary["sha256"] = sha_s
    master_summary["baselines_sha256"] = sha_b

    summary_path = results_dir / "00_MASTER_SUMMARY_CC2.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(master_summary, f, ensure_ascii=False, indent=2)

    log.info(f"\n{'='*60}")
    log.info(f"CC-STEP-2 TERMINÉ")
    log.info(f"  Traités:  {master_summary['global']['total_processed']}")
    log.info(f"  Échecs:   {master_summary['global']['total_failed']}")
    log.info(f"  Baselines: {len(all_baselines)} œuvres contemporaines")
    log.info(f"  SHA256: {sha_s[:24]}")
    log.info(f"{'='*60}")


if __name__ == "__main__":
    import sys
    pdf_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    main(pdf_dir=pdf_dir)
