#!/usr/bin/env python3
"""
OMEGA — Chapter Extractor — Extract chapters from Gutenberg TXT files
Phase W — Mission 3

Reads Gutenberg TXT files from gutenberg_cache/, splits into chapters,
measures baseline features with speed_analyzer, and saves per-chapter JSON.

Output: results_v4/chapters/*.json

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import re
import json
import hashlib
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from speed_analyzer import analyze, FEATURE_KEYS

# ── Config ────────────────────────────────────────────────────────────────────

GUTENBERG_DIR = os.path.join(os.path.dirname(__file__), "gutenberg_cache")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results_v4")
CHAPTERS_DIR = os.path.join(RESULTS_DIR, "chapters")

MIN_CHAPTER_WORDS = 1000
MAX_CHAPTER_WORDS = 5000
TARGET_CHAPTERS_PER_WORK = 3

# ── Category mapping (from RANKING_V4.json / corpus_analysis) ─────────────────

CATEGORY_FEATURES = {
    "MUSICALITE": ["f1_mean", "f1a_rhythm_variance", "f19e_window_median"],
    "COMPLEXITE": ["f22f_literary_index", "f26c_period_score"],
    "SENSORIEL": ["f24e_contrast_score", "f25g_description_score"],
    "LEXICAL": ["f29b_ttr_window", "f21e_ritual_index"],
    "INTERIORITE": ["f27d_modal_score", "f28d_sil_score"],
    "TENSION": ["f23d_literary_causal_score", "f30d_ps_imp_ratio"],
}


def compute_categories(features: dict) -> dict:
    """Compute raw category values (mean of feature values). Z-scores require corpus stats."""
    cats = {}
    for cat, feat_keys in CATEGORY_FEATURES.items():
        vals = [features.get(k, 0) for k in feat_keys]
        cats[cat] = round(sum(vals) / max(len(vals), 1), 5) if vals else 0
    return cats


# ── Chapter splitting ─────────────────────────────────────────────────────────

# FR chapter markers
CHAPTER_RE = re.compile(
    r"(?:^|\n\n+)"
    r"(?:"
    r"(?:CHAPITRE|CHAPTER|LIVRE|BOOK|PART|PARTIE|ACTE)"
    r"\s+(?:[IVXLCDM]+|[0-9]+)"
    r"|"
    r"(?:[IVXLCDM]{1,8}|[0-9]{1,3})\s*\.?\s*\n"
    r")",
    re.IGNORECASE | re.MULTILINE
)


def split_into_chapters(text: str) -> list:
    """Split text into chapters. Returns list of (title, text) tuples."""
    # Try chapter markers
    matches = list(CHAPTER_RE.finditer(text))
    if len(matches) >= 3:
        chapters = []
        for i, m in enumerate(matches):
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            title = m.group().strip()
            body = text[start:end].strip()
            chapters.append((title, body))
        return chapters

    # Fallback: split on double newlines into large blocks
    blocks = re.split(r"\n\n\n+", text)
    if len(blocks) < 3:
        # Last resort: split into equal chunks
        words = text.split()
        chunk_size = 3000
        chapters = []
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            chapters.append((f"Block_{i // chunk_size}", chunk))
        return chapters

    # Group small blocks into chapters
    chapters = []
    current_text = ""
    current_title = "Block_0"
    block_idx = 0
    for block in blocks:
        current_text += "\n\n" + block
        wc = len(current_text.split())
        if wc >= MIN_CHAPTER_WORDS:
            chapters.append((current_title, current_text.strip()))
            block_idx += 1
            current_title = f"Block_{block_idx}"
            current_text = ""
    if current_text.strip():
        chapters.append((current_title, current_text.strip()))

    return chapters


def strip_gutenberg_header_footer(text: str) -> str:
    """Remove Project Gutenberg header and footer."""
    # Header end marker
    header_markers = [
        "*** START OF THIS PROJECT GUTENBERG",
        "*** START OF THE PROJECT GUTENBERG",
        "*END*THE SMALL PRINT",
    ]
    for marker in header_markers:
        idx = text.find(marker)
        if idx != -1:
            text = text[idx + len(marker):]
            # Skip to next line
            nl = text.find("\n")
            if nl != -1:
                text = text[nl + 1:]
            break

    # Footer start marker
    footer_markers = [
        "*** END OF THIS PROJECT GUTENBERG",
        "*** END OF THE PROJECT GUTENBERG",
        "End of the Project Gutenberg",
        "End of Project Gutenberg",
    ]
    for marker in footer_markers:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]
            break

    return text.strip()


# ── Main extraction ───────────────────────────────────────────────────────────

def extract_all_chapters():
    """Extract chapters from all Gutenberg files."""
    os.makedirs(CHAPTERS_DIR, exist_ok=True)

    gut_files = sorted(f for f in os.listdir(GUTENBERG_DIR) if f.endswith(".txt"))
    print(f"[EXTRACT] Found {len(gut_files)} Gutenberg files")

    report = {
        "total_files": len(gut_files),
        "total_chapters": 0,
        "works": [],
    }

    for gf in gut_files:
        path = os.path.join(GUTENBERG_DIR, gf)
        work_id = gf.rsplit("_", 1)[0]  # e.g., "flaubert_bovary"

        with open(path, encoding="utf-8", errors="replace") as f:
            raw = f.read()

        text = strip_gutenberg_header_footer(raw)
        total_words = len(text.split())

        if total_words < 5000:
            print(f"[EXTRACT] SKIP {work_id} — too short ({total_words} words)")
            continue

        chapters = split_into_chapters(text)
        print(f"[EXTRACT] {work_id}: {len(chapters)} raw chapters, {total_words} words")

        # Filter by word count and take up to TARGET_CHAPTERS_PER_WORK
        valid_chapters = []
        for title, body in chapters:
            wc = len(body.split())
            if MIN_CHAPTER_WORDS <= wc <= MAX_CHAPTER_WORDS:
                valid_chapters.append((title, body, wc))

        # If no chapters in range, take middle chunks
        if not valid_chapters:
            words = text.split()
            mid = len(words) // 2
            for offset in [0, 3000, -3000]:
                start = max(0, mid + offset)
                chunk = " ".join(words[start:start + 3000])
                wc = len(chunk.split())
                if wc >= MIN_CHAPTER_WORDS:
                    valid_chapters.append((f"Chunk_{offset}", chunk, wc))

        selected = valid_chapters[:TARGET_CHAPTERS_PER_WORK]
        work_report = {"work_id": work_id, "source": gf, "chapters_extracted": len(selected)}

        for idx, (title, body, wc) in enumerate(selected):
            t0 = time.perf_counter()
            features = analyze(body)
            dt = time.perf_counter() - t0

            categories = compute_categories(features)

            chapter_data = {
                "work_id": work_id,
                "chapter_idx": idx,
                "chapter_title": title.replace("\n", " ").strip()[:80],
                "text": body,
                "word_count": wc,
                "text_hash": hashlib.sha256(body.encode()).hexdigest()[:16],
                "baseline_features": features,
                "baseline_categories": categories,
                "analysis_time_s": round(dt, 3),
            }

            out_name = f"{work_id}_ch{idx:02d}.json"
            out_path = os.path.join(CHAPTERS_DIR, out_name)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(chapter_data, f, ensure_ascii=False, indent=2)

            report["total_chapters"] += 1

        report["works"].append(work_report)
        print(f"  -> {len(selected)} chapters saved")

    # Save report
    report_path = os.path.join(RESULTS_DIR, "chapters_extraction_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n[EXTRACT] DONE: {report['total_chapters']} chapters from {len(report['works'])} works")
    print(f"[EXTRACT] Report: {report_path}")
    return report


if __name__ == "__main__":
    extract_all_chapters()
