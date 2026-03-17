#!/usr/bin/env python3
"""
OMEGA — Extract chapters from livre_cache/ (PDF/ePub texts)
Phase W — Day 4 — Mission 2

Reuses extract_chapters.py logic on livre_cache/ files.
Skips chapters already extracted.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import hashlib
import time
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from speed_analyzer import analyze, FEATURE_KEYS
from extract_chapters import (
    split_into_chapters, strip_gutenberg_header_footer,
    compute_categories, MIN_CHAPTER_WORDS, MAX_CHAPTER_WORDS,
    TARGET_CHAPTERS_PER_WORK, CHAPTERS_DIR, load_manifest_index
)

LIVRE_DIR = os.path.join(os.path.dirname(__file__), "livre_cache")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "corpus_manifest_v2.json")


def main():
    os.makedirs(CHAPTERS_DIR, exist_ok=True)

    # Load manifest for metadata
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    # Build index: filepath basename -> entry
    livre_index = {}
    for entry in manifest:
        if entry.get("source") == "livre":
            fp = os.path.basename(entry.get("filepath", ""))
            livre_index[fp] = entry

    # Get existing chapter files to skip duplicates
    existing = set(os.listdir(CHAPTERS_DIR))

    livre_files = sorted(f for f in os.listdir(LIVRE_DIR) if f.endswith(".txt"))
    print(f"[EXTRACT-LIVRE] Found {len(livre_files)} livre texts")
    print(f"[EXTRACT-LIVRE] Manifest livre entries: {len(livre_index)}")
    print(f"[EXTRACT-LIVRE] Existing chapters: {len(existing)}")

    total_new = 0
    total_skipped = 0
    total_short = 0

    for lf in livre_files:
        path = os.path.join(LIVRE_DIR, lf)

        # Get metadata from manifest
        meta_entry = livre_index.get(lf, {})
        work_id = meta_entry.get("work_id", lf.rsplit(".", 1)[0])
        work_id = re.sub(r'[^a-z0-9_]', '_', work_id.lower())[:60]

        # Skip if chapters already exist
        if f"{work_id}_ch00.json" in existing:
            total_skipped += 1
            continue

        with open(path, encoding="utf-8", errors="replace") as f:
            text = f.read()

        total_words = len(text.split())
        if total_words < 5000:
            total_short += 1
            continue

        chapters = split_into_chapters(text)

        # Filter by word count
        valid_chapters = []
        for title, body in chapters:
            wc = len(body.split())
            if MIN_CHAPTER_WORDS <= wc <= MAX_CHAPTER_WORDS:
                valid_chapters.append((title, body, wc))

        # Fallback: middle chunks
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

        for idx, (title, body, wc) in enumerate(selected):
            t0 = time.perf_counter()
            features = analyze(body)
            dt = time.perf_counter() - t0

            categories = compute_categories(features)

            chapter_data = {
                "work_id": work_id,
                "chapter_idx": idx,
                "chapter_title": title.replace("\n", " ").strip()[:80],
                "language": meta_entry.get("language", "UNKNOWN"),
                "period": meta_entry.get("period", "UNKNOWN"),
                "author": meta_entry.get("author", ""),
                "title": meta_entry.get("title", ""),
                "year": meta_entry.get("year", 0),
                "type": meta_entry.get("type", "UNKNOWN"),
                "source": "livre",
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

            total_new += 1

        if selected:
            print(f"  {work_id}: {len(selected)} chapters ({total_words} words)")

    print(f"\n[EXTRACT-LIVRE] DONE")
    print(f"  New chapters: {total_new}")
    print(f"  Skipped (already exist): {total_skipped}")
    print(f"  Skipped (too short): {total_short}")
    print(f"  Total chapters in dir: {len(os.listdir(CHAPTERS_DIR))}")


if __name__ == "__main__":
    main()
