#!/usr/bin/env python3
"""
OMEGA v5 — Extraction multi-fenetre, chapitres, classification passage
Phase R0 — Refondation Metrologique

Changements vs v4 :
  - split_chapters_v5() : pas de CHAPTER_MAX_WORDS, tous les chapitres reels
  - extract_protocol_v5() : multi-fenetre (12 tailles)
  - classify_passage() : detection type de texte
  - extract_hooks_cliffhangers() : 100 premiers/derniers mots
  - compute_p_rel() : position relative dans l'oeuvre
"""

import re, random, logging, urllib.request, urllib.error
from pathlib import Path
from statistics import mean
from collections import Counter

from v5_config import (
    SCENE_WORDS, CHAPTER_MIN_WORDS, ANALYSIS_WINDOWS,
    PDF_DIR, TXT_DIR, GATE_MIN_WORDS, GATE_ALPHA_RATIO,
    windows_safe_slug, log,
)
from v5_features import split_sentences, compute_f25

# ══════════════════════════════════════════════════════════════════════════
# DATA GATES
# ══════════════════════════════════════════════════════════════════════════

def check_data_gates(text: str, work_id: str) -> tuple:
    words = text.split()
    n_words = len(words)

    if n_words < GATE_MIN_WORDS:
        log.warning(f"  GATE FAIL [{work_id}] TRUNCATED_TEXT — {n_words} mots < {GATE_MIN_WORDS}")
        return False, f"TRUNCATED_TEXT:{n_words}"

    alpha = sum(c.isalpha() for c in text)
    total_chars = max(len(text), 1)
    ratio = alpha / total_chars
    if ratio < GATE_ALPHA_RATIO:
        log.warning(f"  GATE FAIL [{work_id}] GARBLED_TEXT — alpha_ratio={ratio:.3f}")
        return False, f"GARBLED_TEXT:{ratio:.3f}"

    return True, ""

# ══════════════════════════════════════════════════════════════════════════
# DOWNLOAD GUTENBERG
# ══════════════════════════════════════════════════════════════════════════

_GUTENBERG_URLS = [
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt",
    "https://www.gutenberg.org/files/{id}/{id}-0.txt",
    "https://www.gutenberg.org/files/{id}/{id}.txt",
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}-0.txt",
]

def download_gutenberg(gids: list, cache_dir: Path, label: str) -> str:
    for gid in gids:
        cache_file = cache_dir / f"pg{gid}.txt"
        if cache_file.exists():
            raw = cache_file.read_text(encoding="utf-8", errors="replace")
            if len(raw.split()) > 1000:
                log.info(f"  Gutenberg cache hit: pg{gid}.txt")
                return clean_gutenberg(raw)

        for url_tpl in _GUTENBERG_URLS:
            url = url_tpl.format(id=gid)
            try:
                req = urllib.request.Request(url, headers={
                    "User-Agent": "OMEGA-Research/1.0 (educational corpus calibration)"
                })
                with urllib.request.urlopen(req, timeout=30) as r:
                    raw = r.read().decode("utf-8", errors="replace")
                if len(raw.split()) > 1000:
                    cache_file.write_text(raw, encoding="utf-8")
                    log.info(f"  Gutenberg download OK: {url}")
                    return clean_gutenberg(raw)
            except (urllib.error.URLError, Exception) as e:
                log.debug(f"  URL fail {url}: {e}")
                continue

    log.warning(f"  Gutenberg echec total pour {label} (IDs: {gids})")
    return ""

def clean_gutenberg(raw: str) -> str:
    start_markers = ["*** START OF", "***START OF"]
    end_markers   = ["*** END OF", "***END OF", "End of the Project Gutenberg",
                     "End of Project Gutenberg"]

    start_pos = 0
    for m in start_markers:
        idx = raw.find(m)
        if idx >= 0:
            end_line = raw.find("\n", idx)
            if end_line > 0:
                candidate = end_line + 1
                if start_pos == 0 or candidate < start_pos:
                    start_pos = candidate

    end_pos = len(raw)
    for m in end_markers:
        idx = raw.rfind(m)
        if 0 < idx < len(raw):
            end_pos = min(end_pos, idx)

    text = raw[start_pos:end_pos]
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()

# ══════════════════════════════════════════════════════════════════════════
# EXTRACTION PDF / EPUB
# ══════════════════════════════════════════════════════════════════════════

def extract_pdf(path: Path) -> str:
    try:
        import fitz
        doc   = fitz.open(str(path))
        parts = []
        for page in doc:
            t = page.get_text()
            if t.strip():
                parts.append(t)
        doc.close()
        return "\n".join(parts)
    except Exception as e:
        log.error(f"  PDF extraction error: {e}")
        return ""

def extract_epub(path: Path) -> str:
    try:
        import ebooklib
        from ebooklib import epub
        from bs4 import BeautifulSoup
        book = epub.read_epub(str(path))
        parts = []
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            text = soup.get_text()
            if text.strip():
                parts.append(text)
        return "\n\n".join(parts)
    except ImportError:
        log.warning(f"  ebooklib/bs4 non disponible — EPUB ignore: {path.name}")
        return ""
    except Exception as e:
        log.error(f"  EPUB extraction error: {e}")
        return ""

def find_and_extract(work: dict) -> str:
    """Trouve et extrait le texte d'un PDF/EPUB."""
    import unicodedata
    candidates = [work.get("file", "")] + work.get("fallback", [])
    for name in candidates:
        if not name:
            continue
        p = PDF_DIR / name
        if p.exists():
            if name.lower().endswith('.epub'):
                return extract_epub(p)
            else:
                return extract_pdf(p)
    return ""

def clean_text(raw: str) -> str:
    lines  = raw.split("\n")
    counts = Counter(l.strip() for l in lines if 3 < len(l.strip()) < 80)
    skip   = {l for l, c in counts.items() if c > 8}
    out    = []
    for l in lines:
        s = l.strip()
        if re.match(r"^\d{1,4}$", s):
            continue
        if s in skip:
            continue
        out.append(l)
    text = "\n".join(out)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# ══════════════════════════════════════════════════════════════════════════
# SPLIT CHAPTERS v5 — SANS LIMITE DE TAILLE
# ══════════════════════════════════════════════════════════════════════════

def split_chapters_v5(text: str) -> list:
    """
    Parse les chapitres reels du texte.
    v5 : PAS de CHAPTER_MAX_WORDS — tous les chapitres, quelle que soit la taille.
    Seul filtre : CHAPTER_MIN_WORDS (500 mots minimum).

    Regex strict : evite les faux positifs sur numeros romains courts (I, V, etc.)
    Matche : "Chapitre X", "Part II", "LIBRO TERCERO", "[1]", "[23]"
    """
    pattern = re.compile(
        r"\n\s*(?:"
        r"(?:chapitre|chapter|capitulo|partie|part(?:e|ie)?|section|livre|book|libro)"
        r"\s+[\dIVXLCivxlc.]+"
        r"|\[\d{1,3}\]"
        r")",
        re.IGNORECASE,
    )
    splits = [m.start() for m in pattern.finditer(text)]

    if len(splits) < 2:
        # Fallback : decoupage par paragraphes de ~2000 mots
        paras = re.split(r"\n{2,}", text)
        chapters, current = [], []
        for p in paras:
            current.append(p)
            if sum(len(c.split()) for c in current) >= 2000:
                chapters.append("\n\n".join(current))
                current = []
        if current:
            chapters.append("\n\n".join(current))
        return [c for c in chapters if len(c.split()) >= CHAPTER_MIN_WORDS]

    chapters = []
    for i, pos in enumerate(splits):
        end = splits[i+1] if i+1 < len(splits) else len(text)
        chap = text[pos:end]
        if len(chap.split()) >= CHAPTER_MIN_WORDS:
            chapters.append(chap)

    return chapters

# ══════════════════════════════════════════════════════════════════════════
# CLASSIFICATION TYPE DE TEXTE
# ══════════════════════════════════════════════════════════════════════════

def classify_passage(text: str) -> str:
    """
    Classifie un passage en : DESCRIPTION | DIALOGUE | ACTION | INTROSPECTION | TRANSITION
    Heuristique lexicale (pas de ML).
    """
    txt_lower = text.lower()
    words = text.split()
    n_words = max(len(words), 1)

    # Indicateurs DIALOGUE
    dialogue_markers = text.count('"') + text.count('\u00ab') + text.count('\u00bb') + text.count('\u2014')
    dialogue_ratio = dialogue_markers / n_words
    if dialogue_ratio > 0.02:
        return "DIALOGUE"

    # Indicateurs ACTION
    ACTION_VERBS = ["courut","sauta","frappa","tira","poussa","attrapa","lanca",
                    "ran","jumped","hit","pulled","pushed","grabbed","threw","struck",
                    "corrio","salto","golpeo","tiro","empujo","agarro","lanzo"]
    action_count = sum(1 for w in words if w.lower().rstrip(".,;:!?") in ACTION_VERBS)
    sents = split_sentences(text)
    mean_sent_len = mean(len(s.split()) for s in sents) if sents else 20
    if action_count > 3 and mean_sent_len < 15:
        return "ACTION"

    # Indicateurs INTROSPECTION
    INTRO_MARKERS = ["pensait","songeait","se demandait","croyait","sentait","imaginait",
                     "thought","wondered","felt","believed","imagined","remembered",
                     "pensaba","sentia","imaginaba","recordaba","creia"]
    intro_count = sum(1 for m in INTRO_MARKERS if m in txt_lower)
    if intro_count >= 3:
        return "INTROSPECTION"

    # Indicateurs TRANSITION
    TRANS_MARKERS = ["le lendemain","plus tard","quelques jours","le soir","le matin",
                     "the next day","later that","some days","that evening","that morning",
                     "al dia siguiente","mas tarde","algunos dias","esa noche","esa manana"]
    trans_count = sum(1 for m in TRANS_MARKERS if m in txt_lower)
    if trans_count >= 2 and n_words < 200:
        return "TRANSITION"

    # Par defaut : DESCRIPTION
    return "DESCRIPTION"

# ══════════════════════════════════════════════════════════════════════════
# P_REL — Position relative
# ══════════════════════════════════════════════════════════════════════════

def compute_p_rel(pos_words: int, total_words: int) -> float:
    """Position relative : mots_precedents / mots_totaux."""
    if total_words <= 0:
        return 0.0
    return round(pos_words / total_words, 6)

# ══════════════════════════════════════════════════════════════════════════
# HOOKS & CLIFFHANGERS
# ══════════════════════════════════════════════════════════════════════════

def extract_hook(text: str, n_words: int = 100) -> str:
    """Extrait les N premiers mots d'un texte."""
    words = text.split()
    return " ".join(words[:n_words])

def extract_cliffhanger(text: str, n_words: int = 100) -> str:
    """Extrait les N derniers mots d'un texte."""
    words = text.split()
    return " ".join(words[-n_words:])

# ══════════════════════════════════════════════════════════════════════════
# SCORE DENSITY (pour selection extraits)
# ══════════════════════════════════════════════════════════════════════════

def score_density(text: str) -> float:
    sents = split_sentences(text)
    if not sents:
        return 0.0
    words = text.split()
    mean_len   = mean(len(s.split()) for s in sents) if sents else 0
    word_set   = set(w.lower() for w in words if len(w) > 3)
    hapax_rate = len(word_set) / max(len(words), 1)
    return mean_len * 0.4 + hapax_rate * 0.6

# ══════════════════════════════════════════════════════════════════════════
# EXTRACT PROTOCOL v5 — MULTI-FENETRE
# ══════════════════════════════════════════════════════════════════════════

def extract_protocol_v5(text: str) -> dict:
    """
    Protocole v5 — extraction multi-fenetre + tous les chapitres.

    Extraits fixes : APEX, NEUTRE, SEUIL, INCIPIT, EXPLICIT, CLIMAX
    Extraits RANDOM : proportionnel a la taille (1 par 5000 mots, min 5, max 30)
    Chapitres : TOUS les chapitres reels (pas de limite)
    Multi-fenetre : chaque extrait analyse a 12 tailles
    """
    words = text.split()
    total = len(words)

    if total < SCENE_WORDS * 4:
        return {"extracts": [], "chapters": [], "descriptive": [],
                "multi_window": [], "chapter_count": 0}

    # ─── Segments de SCENE_WORDS mots ─────────────────────────────────
    segments = []
    pos = 0
    while pos + SCENE_WORDS <= total:
        seg_text = " ".join(words[pos: pos + SCENE_WORDS])
        segments.append({
            "pos": pos,
            "text": seg_text,
            "score": score_density(seg_text),
            "p_rel": compute_p_rel(pos, total),
            "passage_type": classify_passage(seg_text),
        })
        pos += SCENE_WORDS

    if not segments:
        return {"extracts": [], "chapters": [], "descriptive": [],
                "multi_window": [], "chapter_count": 0}

    by_score = sorted(segments, key=lambda x: x["score"])
    apex   = by_score[-1]
    seuil  = by_score[0]
    neutre = min(segments, key=lambda x: abs(x["pos"] - total // 2))

    # CLIMAX
    if len(segments) >= 3:
        scores = [s["score"] for s in segments]
        deltas = [abs(scores[i+1] - scores[i-1]) for i in range(1, len(scores)-1)]
        best_i = deltas.index(max(deltas)) + 1
        climax_seg = segments[best_i]
    else:
        climax_seg = segments[-1]

    # INCIPIT
    incipit_pos = max(200, int(total * 0.02))
    incipit_text = " ".join(words[incipit_pos: incipit_pos + SCENE_WORDS])
    incipit = {"pos": incipit_pos, "text": incipit_text,
               "score": score_density(incipit_text),
               "p_rel": compute_p_rel(incipit_pos, total),
               "passage_type": classify_passage(incipit_text)}

    # EXPLICIT
    explicit_pos = max(0, total - SCENE_WORDS - 200)
    explicit_text = " ".join(words[explicit_pos: explicit_pos + SCENE_WORDS])
    explicit = {"pos": explicit_pos, "text": explicit_text,
                "score": score_density(explicit_text),
                "p_rel": compute_p_rel(explicit_pos, total),
                "passage_type": classify_passage(explicit_text)}

    # RANDOM — proportionnel a la taille
    n_random = max(5, min(30, total // 5000))
    random.seed(42)
    core = [s for s in segments if total * 0.05 < s["pos"] < total * 0.95]
    step = max(1, len(core) // n_random)
    tranches = [core[i*step: (i+1)*step] for i in range(n_random)]
    randoms  = [random.choice(t) for t in tranches if t]

    special = [apex, neutre, seuil, incipit, explicit, climax_seg]
    special_positions = {s["pos"] for s in special}
    randoms = [r for r in randoms if r["pos"] not in special_positions]

    extracts = (
        [{"type": "APEX",    **apex}] +
        [{"type": "NEUTRE",  **neutre}] +
        [{"type": "SEUIL",   **seuil}] +
        [{"type": "INCIPIT", **incipit}] +
        [{"type": "EXPLICIT", **explicit}] +
        [{"type": "CLIMAX",  **climax_seg}] +
        [{"type": f"RANDOM_{i:02d}", **r} for i, r in enumerate(randoms)]
    )

    # ─── CHAPITRES — TOUS (v5 : pas de limite) ───────────────────────
    all_chaps = split_chapters_v5(text)
    chapters = []
    for i, chap in enumerate(all_chaps):
        chap_words = len(chap.split())
        chapters.append({
            "type": f"CHAPTER_{i+1:02d}",
            "text": chap,
            "words": chap_words,
            "p_rel": compute_p_rel(text.find(chap[:50]), total) if len(chap) > 50 else i / max(len(all_chaps), 1),
            "passage_type": classify_passage(chap[:1000]),
            "hook_text": extract_hook(chap),
            "cliff_text": extract_cliffhanger(chap),
        })

    # ─── SCENES DESCRIPTIVES (top 3 F25) ─────────────────────────────
    desc_candidates = by_score[:min(15, len(by_score))]
    desc_scored = []
    for seg in desc_candidates:
        f25 = compute_f25(seg["text"], split_sentences(seg["text"]))
        desc_scored.append({**seg, "f25_score": f25["f25g_description_score"], "f25": f25})
    desc_scored.sort(key=lambda x: x["f25_score"], reverse=True)
    descriptive = [{"type": f"DESC_{i:02d}", **d} for i, d in enumerate(desc_scored[:3])]

    # ─── MULTI-FENETRE (extraits a tailles variees) ──────────────────
    # On prend le segment NEUTRE et on l'analyse a chaque fenetre
    multi_window = []
    neutre_pos = neutre["pos"]
    for win_size in ANALYSIS_WINDOWS:
        if neutre_pos + win_size <= total:
            win_text = " ".join(words[neutre_pos: neutre_pos + win_size])
            multi_window.append({
                "window_size": win_size,
                "text": win_text,
                "pos": neutre_pos,
                "p_rel": compute_p_rel(neutre_pos, total),
            })

    return {
        "extracts": extracts,
        "chapters": chapters,
        "descriptive": descriptive,
        "multi_window": multi_window,
        "chapter_count": len(chapters),
        "n_random": len(randoms),
        "total_words": total,
    }
