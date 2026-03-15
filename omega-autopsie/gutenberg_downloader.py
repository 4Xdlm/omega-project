#!/usr/bin/env python3
"""
OMEGA — Gutenberg Downloader v2.3
Telecharge les textes domaine public depuis Project Gutenberg.
"""

import requests
import json
import hashlib
import time
import re
import unicodedata
import logging
from pathlib import Path

MANIFEST_PATH = Path("ssot/corpus_manifest.json")
CACHE_DIR = Path("gutenberg_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "OMEGA-Autopsie-Research/2.3 (educational literary research)"
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("omega_download.log"), logging.StreamHandler()]
)
log = logging.getLogger("DL")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_gutenberg_headers(text: str) -> str:
    start_markers = [
        "*** START OF THE PROJECT GUTENBERG",
        "*** START OF THIS PROJECT GUTENBERG",
        "***START OF THE PROJECT GUTENBERG",
        "***START OF THIS PROJECT GUTENBERG",
    ]
    end_markers = [
        "*** END OF THE PROJECT GUTENBERG",
        "*** END OF THIS PROJECT GUTENBERG",
        "***END OF THE PROJECT GUTENBERG",
        "***END OF THIS PROJECT GUTENBERG",
    ]

    start_idx = 0
    for marker in start_markers:
        idx = text.upper().find(marker.upper())
        if idx != -1:
            nl = text.find("\n", idx)
            start_idx = nl + 1 if nl != -1 else idx + len(marker)
            break

    end_idx = len(text)
    for marker in end_markers:
        idx = text.upper().find(marker.upper())
        if idx != -1:
            end_idx = idx
            break

    return text[start_idx:end_idx].strip()


def download_gutenberg(gutenberg_id: int, work_id: str) -> str | None:
    cache_file = CACHE_DIR / f"{work_id}_{gutenberg_id}.txt"

    if cache_file.exists():
        log.info(f"CACHE HIT: {work_id} (Gutenberg {gutenberg_id})")
        return cache_file.read_text(encoding="utf-8")

    urls = [
        f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt",
        f"https://www.gutenberg.org/ebooks/{gutenberg_id}.txt.utf-8",
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}-0.txt",
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}.txt",
    ]

    for url in urls:
        try:
            log.info(f"GET: {url}")
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                # Detect encoding
                text = resp.text
                if not text or len(text) < 500:
                    continue

                text = strip_gutenberg_headers(text)
                text = normalize(text)

                cache_file.write_text(text, encoding="utf-8")
                sha256 = hashlib.sha256(text.encode()).hexdigest()
                (CACHE_DIR / f"{work_id}_{gutenberg_id}.sha256").write_text(sha256)

                word_count = len(text.split())
                log.info(f"OK: {work_id} — {word_count} mots — SHA256: {sha256[:12]}...")
                time.sleep(2)  # Respecter Gutenberg
                return text
            else:
                log.warning(f"HTTP {resp.status_code}: {url}")
        except Exception as e:
            log.error(f"ERREUR {url}: {e}")
            continue

    log.error(f"ECHEC: Gutenberg {gutenberg_id} pour {work_id} — toutes les URLs ont echoue")
    return None


def download_all():
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    results = {"downloaded": [], "failed": [], "skipped": []}

    # Romans
    for novel in manifest["romans"]:
        gid = novel.get("gutenberg_id")
        wid = novel["work_id"]

        if not gid:
            log.warning(f"SKIP {wid}: pas de Gutenberg ID")
            results["skipped"].append({"work_id": wid, "reason": "no_gutenberg_id"})
            continue

        text = download_gutenberg(gid, wid)
        if text:
            results["downloaded"].append({
                "work_id": wid,
                "gutenberg_id": gid,
                "words": len(text.split()),
                "lang": novel.get("gutenberg_lang", "?")
            })
        else:
            results["failed"].append({"work_id": wid, "gutenberg_id": gid})

    # Proses de reference
    for prose in manifest.get("proses_reference", []):
        gid = prose.get("gutenberg_id")
        wid = prose.get("work_id")

        if not gid:
            log.warning(f"SKIP prose {wid}: pas de Gutenberg ID")
            results["skipped"].append({"work_id": wid, "reason": "no_gutenberg_id"})
            continue

        text = download_gutenberg(gid, wid)
        if text:
            results["downloaded"].append({
                "work_id": wid,
                "gutenberg_id": gid,
                "words": len(text.split()),
                "lang": prose.get("gutenberg_lang", "?")
            })
        else:
            results["failed"].append({"work_id": wid, "gutenberg_id": gid})

    log.info(f"\n{'='*50}")
    log.info(f"Telecharges: {len(results['downloaded'])}")
    log.info(f"Echoues: {len(results['failed'])}")
    log.info(f"Skippes: {len(results['skipped'])}")
    log.info(f"{'='*50}")

    with open("DOWNLOAD_REPORT.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return results


if __name__ == "__main__":
    log.info("OMEGA Gutenberg Downloader v2.3")
    download_all()
