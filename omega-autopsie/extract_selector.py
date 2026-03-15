#!/usr/bin/env python3
"""
OMEGA — Extract Selector v2.3
Selectionne automatiquement les 3 extraits (APEX/NEUTRE/SEUIL) dans chaque texte.
Methode : recherche par mots-cles issus des justifications du manifest.
"""

import json
import re
import hashlib
import unicodedata
import logging
from pathlib import Path

CACHE_DIR = Path("gutenberg_cache")
EXTRACT_ROM = Path("extracts/romans")
EXTRACT_PRO = Path("extracts/proses")
MANIFEST = Path("ssot/corpus_manifest.json")
TARGET_WORDS = 600
MIN_WORDS = 400
MAX_WORDS = 850

EXTRACT_ROM.mkdir(parents=True, exist_ok=True)
EXTRACT_PRO.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("omega_extract.log"), logging.StreamHandler()]
)
log = logging.getLogger("SEL")

STOP_WORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "au", "aux",
    "sur", "par", "pour", "dans", "qui", "que", "se", "sa", "son", "ses",
    "est", "sont", "ont", "plus", "avec", "cette", "ce", "passage", "roman",
    "extrait", "scene", "analyse", "plus", "meme", "tout", "tous", "leur",
    "nous", "vous", "ils", "elle", "elles", "quand", "comme", "mais",
    "aussi", "tres", "bien", "fait", "etre", "avoir", "faire", "peut",
    "deux", "trois", "sous", "entre", "chez", "vers", "sans", "apres",
    "avant", "pendant", "depuis", "encore", "voix", "style", "prose",
    "maximum", "maximale", "absolue", "absolu", "domaine", "public",
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u2019", "'")
    return text.strip()


def split_paragraphs(text: str) -> list[str]:
    paras = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paras if len(p.strip().split()) > 5]


def extract_keywords(justification: str) -> list[str]:
    words = re.findall(r"\b\w{4,}\b", justification.lower())
    # Remove accents for matching
    keywords = [w for w in words if w not in STOP_WORDS]
    return keywords[:10]


def find_extract_by_keywords(text: str, keywords: list[str],
                              target_words: int = TARGET_WORDS) -> str | None:
    paragraphs = split_paragraphs(text)
    if not paragraphs:
        return None

    # Score each paragraph by keyword matches
    scores = []
    for i, para in enumerate(paragraphs):
        para_lower = para.lower()
        score = sum(1 for kw in keywords if kw in para_lower)
        scores.append((score, i))

    scores.sort(reverse=True)

    if scores[0][0] == 0:
        # No keyword match — try to find best scoring section of consecutive paragraphs
        # Fallback: use middle of text
        mid = len(paragraphs) // 2
        start = max(0, mid - 2)
        end = min(len(paragraphs), mid + 3)
        result = "\n\n".join(paragraphs[start:end])
        words = result.split()
        if len(words) > MAX_WORDS:
            result = " ".join(words[:MAX_WORDS])
        return normalize(result) if len(result.split()) >= MIN_WORDS else None

    best_idx = scores[0][1]

    # Expand around best paragraph to reach target_words
    start = best_idx
    end = best_idx + 1
    current_words = len(paragraphs[best_idx].split())

    while current_words < target_words:
        expanded = False
        # Try expanding after
        if end < len(paragraphs):
            next_words = len(paragraphs[end].split())
            if current_words + next_words <= MAX_WORDS:
                end += 1
                current_words += next_words
                expanded = True
        # Try expanding before
        if start > 0 and current_words < target_words:
            prev_words = len(paragraphs[start - 1].split())
            if current_words + prev_words <= MAX_WORDS:
                start -= 1
                current_words += prev_words
                expanded = True
        if not expanded:
            break

    result = "\n\n".join(paragraphs[start:end])
    words = result.split()
    if len(words) > MAX_WORDS:
        result = " ".join(words[:MAX_WORDS])

    return normalize(result) if len(result.split()) >= MIN_WORDS else None


def select_seuil(text: str) -> str | None:
    """SEUIL = opening pages of the text."""
    paragraphs = split_paragraphs(text)
    if not paragraphs:
        return None

    # Skip very short first paragraphs (titles, chapter headers)
    start_idx = 0
    while start_idx < len(paragraphs) and len(paragraphs[start_idx].split()) < 15:
        start_idx += 1

    if start_idx >= len(paragraphs):
        start_idx = 0

    # Collect paragraphs from start until target
    result_parts = []
    word_count = 0
    for i in range(start_idx, len(paragraphs)):
        para_words = len(paragraphs[i].split())
        if word_count + para_words > MAX_WORDS:
            break
        result_parts.append(paragraphs[i])
        word_count += para_words
        if word_count >= TARGET_WORDS:
            break

    result = "\n\n".join(result_parts)
    return normalize(result) if len(result.split()) >= MIN_WORDS else None


def select_neutre(text: str, keywords: list[str]) -> str | None:
    """NEUTRE = transition scene. Try keywords first, then pick from middle third."""
    # Try keyword-based first
    result = find_extract_by_keywords(text, keywords)
    if result and len(result.split()) >= MIN_WORDS:
        return result

    # Fallback: take from middle third of the text
    paragraphs = split_paragraphs(text)
    if len(paragraphs) < 6:
        return None

    third = len(paragraphs) // 3
    mid_paras = paragraphs[third:2*third]

    result_parts = []
    word_count = 0
    for para in mid_paras:
        pw = len(para.split())
        if word_count + pw > MAX_WORDS:
            break
        result_parts.append(para)
        word_count += pw
        if word_count >= TARGET_WORDS:
            break

    result = "\n\n".join(result_parts)
    return normalize(result) if len(result.split()) >= MIN_WORDS else None


def save_extract(text: str, filepath: Path) -> dict:
    sha256 = hashlib.sha256(text.encode("utf-8")).hexdigest()
    filepath.write_text(text, encoding="utf-8")
    filepath.with_suffix(".sha256").write_text(sha256)
    wc = len(text.split())
    return {"word_count": wc, "sha256": sha256, "range_ok": MIN_WORDS <= wc <= MAX_WORDS}


def process_novel(novel: dict, text: str):
    wid = novel["work_id"]
    results = {}

    for ext_type in ["APEX", "NEUTRE", "SEUIL"]:
        justif_key = f"{ext_type.lower()}_justification"
        justification = novel.get(justif_key, "")
        keywords = extract_keywords(justification)

        if ext_type == "SEUIL":
            extract = select_seuil(text)
        elif ext_type == "NEUTRE":
            extract = select_neutre(text, keywords)
        else:
            extract = find_extract_by_keywords(text, keywords)

        if not extract or len(extract.split()) < MIN_WORDS:
            log.warning(f"EXTRAIT INSUFFISANT: {wid}/{ext_type} — kw={keywords[:5]}")
            # Emergency fallback: take any 600-word chunk
            words = text.split()
            if ext_type == "APEX":
                # Apex: 60% into the text
                pos = int(len(words) * 0.6)
            elif ext_type == "NEUTRE":
                # Neutral: 35% into the text
                pos = int(len(words) * 0.35)
            else:
                pos = 0
            extract = " ".join(words[pos:pos+TARGET_WORDS])

        if extract and len(extract.split()) >= 100:
            out_path = EXTRACT_ROM / f"{wid}_{ext_type}.txt"
            info = save_extract(extract, out_path)
            log.info(f"OK: {wid}/{ext_type} — {info['word_count']} mots — {info['sha256'][:12]}...")
            results[ext_type] = {"status": "OK", **info}
        else:
            log.error(f"ECHEC: {wid}/{ext_type} — texte trop court apres tous les fallbacks")
            results[ext_type] = {"status": "FAILED"}

    return results


def process_prose(prose: dict, text: str):
    wid = prose.get("work_id")
    texts_to_extract = prose.get("texts_to_extract", [])
    results = []

    for i, description in enumerate(texts_to_extract):
        label = f"P{i+1}"
        keywords = extract_keywords(description)
        extract = find_extract_by_keywords(text, keywords, target_words=400)

        if not extract or len(extract.split()) < 100:
            # Fallback: take a proportional chunk
            words = text.split()
            n_chunks = max(len(texts_to_extract), 1)
            chunk_size = min(500, len(words) // n_chunks)
            start = i * chunk_size
            extract = " ".join(words[start:start + chunk_size])
            extract = normalize(extract)

        if extract and len(extract.split()) >= 80:
            out_path = EXTRACT_PRO / f"{wid}_{label}.txt"
            info = save_extract(extract, out_path)
            log.info(f"OK: {wid}/{label} — {info['word_count']} mots")
            results.append({"label": label, "status": "OK", **info})
        else:
            log.warning(f"SKIP: {wid}/{label} — trop court")
            results.append({"label": label, "status": "TOO_SHORT"})

    return results


def run():
    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)

    report = {"romans": {}, "proses": {}}

    # Romans
    for novel in manifest["romans"]:
        wid = novel["work_id"]
        gid = novel.get("gutenberg_id")

        cache_files = sorted(CACHE_DIR.glob(f"{wid}_*.txt"))
        if not cache_files:
            log.warning(f"SKIP {wid}: texte non telecharge")
            report["romans"][wid] = {"status": "NO_TEXT"}
            continue

        text = cache_files[0].read_text(encoding="utf-8")
        log.info(f"\n{'─'*50}\n{novel['author']} — {novel['title']} ({len(text.split())} mots)")

        results = process_novel(novel, text)
        report["romans"][wid] = results

    # Proses
    for prose in manifest.get("proses_reference", []):
        wid = prose.get("work_id")
        gid = prose.get("gutenberg_id")

        cache_files = sorted(CACHE_DIR.glob(f"{wid}_*.txt"))
        if not cache_files:
            log.warning(f"SKIP prose {wid}: texte non telecharge")
            report["proses"][wid] = {"status": "NO_TEXT"}
            continue

        text = cache_files[0].read_text(encoding="utf-8")
        log.info(f"\nProse: {prose.get('author')} — {prose.get('title')} ({len(text.split())} mots)")

        results = process_prose(prose, text)
        report["proses"][wid] = results

    # Stats
    rom_ok = sum(
        1 for r in report["romans"].values()
        if isinstance(r, dict) and any(
            v.get("status") == "OK" for v in r.values() if isinstance(v, dict)
        )
    )
    extract_ok = sum(
        1
        for r in report["romans"].values()
        if isinstance(r, dict)
        for v in r.values()
        if isinstance(v, dict) and v.get("status") == "OK"
    )
    prose_ok = sum(
        1
        for r in report["proses"].values()
        if isinstance(r, list)
        for v in r
        if isinstance(v, dict) and v.get("status") == "OK"
    )

    log.info(f"\n{'='*50}")
    log.info(f"Romans avec extraits: {rom_ok}/{len(manifest['romans'])}")
    log.info(f"Extraits romans OK: {extract_ok}")
    log.info(f"Extraits proses OK: {prose_ok}")
    log.info(f"{'='*50}")

    with open("EXTRACT_REPORT.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    log.info("Rapport: EXTRACT_REPORT.json")


if __name__ == "__main__":
    log.info("OMEGA Extract Selector v2.3")
    run()
