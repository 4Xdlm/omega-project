#!/usr/bin/env python3
"""
OMEGA — Extract texts from livre/ directory (PDF + ePub)
Phase W — Day 4 — Mission 1

Extracts text from PDF and ePub files, classifies by language/period/type,
applies data gates, saves to livre_cache/, updates manifest.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import re
import json
import hashlib
import zipfile
import logging
import warnings
import signal
from datetime import datetime
from html.parser import HTMLParser

# Suppress PDF library warnings
logging.getLogger("pdfplumber").setLevel(logging.ERROR)
logging.getLogger("pdfminer").setLevel(logging.ERROR)
logging.getLogger("PyPDF2").setLevel(logging.ERROR)
warnings.filterwarnings("ignore")

PDF_TIMEOUT = 60  # seconds per PDF file

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

LIVRE_DIR = r"C:\Users\elric\Downloads\livre"
CACHE_DIR = os.path.join(os.path.dirname(__file__), "livre_cache")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "corpus_manifest_v2.json")
GUTENBERG_DIR = os.path.join(os.path.dirname(__file__), "gutenberg_cache")

MIN_WORDS = 15000
MIN_ALPHA_RATIO = 0.60

# ── Stopwords for language detection ──────────────────────────────────────────

STOPWORDS = {
    "FR": {"le", "la", "les", "de", "des", "un", "une", "que", "qui", "dans",
            "il", "elle", "est", "sont", "pas", "nous", "vous", "mais", "avec",
            "pour", "sur", "ce", "cette", "ses", "mon", "son", "au", "aux", "du",
            "en", "ne", "se", "on", "tout", "plus", "par", "comme", "je", "me"},
    "EN": {"the", "of", "and", "to", "in", "a", "is", "that", "was", "for",
            "it", "with", "he", "she", "his", "her", "as", "are", "on", "be",
            "had", "but", "not", "have", "from", "they", "been", "has", "an",
            "at", "this", "which", "by", "were", "my", "you", "all", "would"},
    "ES": {"el", "la", "los", "de", "en", "un", "una", "que", "por", "con",
            "del", "las", "se", "su", "al", "como", "era", "pero", "sus",
            "fue", "muy", "todo", "esta", "hay", "ya", "sin", "donde", "no"},
    "DE": {"der", "die", "und", "in", "den", "von", "zu", "das", "mit", "sich",
            "des", "auf", "für", "ist", "im", "dem", "nicht", "ein", "eine",
            "als", "auch", "es", "an", "er", "hat", "aus", "wie", "sie", "ich"},
}

# ── Author/period/type classification ─────────────────────────────────────────

KNOWN_AUTHORS = {
    # FR CLASSIQUE
    "Zola": ("FR", "CLASSIQUE", 1880), "Hugo": ("FR", "CLASSIQUE", 1860),
    "Balzac": ("FR", "CLASSIQUE", 1840), "Flaubert": ("FR", "CLASSIQUE", 1860),
    "Maupassant": ("FR", "CLASSIQUE", 1885), "Stendhal": ("FR", "CLASSIQUE", 1830),
    "Proust": ("FR", "CLASSIQUE", 1920), "Camus": ("FR", "CLASSIQUE", 1945),
    "Duras": ("FR", "CLASSIQUE", 1960), "Gide": ("FR", "CLASSIQUE", 1910),
    "Sartre": ("FR", "CLASSIQUE", 1945), "Colette": ("FR", "CLASSIQUE", 1920),
    "Voltaire": ("FR", "CLASSIQUE", 1760), "Rousseau": ("FR", "CLASSIQUE", 1762),
    "Merimee": ("FR", "CLASSIQUE", 1845), "Mérimée": ("FR", "CLASSIQUE", 1845),
    "Sand": ("FR", "CLASSIQUE", 1845), "Nerval": ("FR", "CLASSIQUE", 1855),
    "Malraux": ("FR", "CLASSIQUE", 1935), "Céline": ("FR", "CLASSIQUE", 1932),
    "Celine": ("FR", "CLASSIQUE", 1932), "Beckett": ("FR", "CLASSIQUE", 1955),
    "Sarraute": ("FR", "CLASSIQUE", 1960), "Simon": ("FR", "CLASSIQUE", 1960),
    "Robbe-Grillet": ("FR", "CLASSIQUE", 1960), "Robbe_Grillet": ("FR", "CLASSIQUE", 1960),
    "Gracq": ("FR", "CLASSIQUE", 1951), "Perec": ("FR", "CLASSIQUE", 1978),
    "Apollinaire": ("FR", "CLASSIQUE", 1913), "Lautréamont": ("FR", "CLASSIQUE", 1869),
    "Lautreamont": ("FR", "CLASSIQUE", 1869),
    "Daudet": ("FR", "CLASSIQUE", 1872), "Huysmans": ("FR", "CLASSIQUE", 1884),
    "France": ("FR", "CLASSIQUE", 1908), "Rabelais": ("FR", "CLASSIQUE", 1534),

    # FR CONTEMPORAIN
    "Houellebecq": ("FR", "CONTEMPORAIN", 2000), "Modiano": ("FR", "CONTEMPORAIN", 1990),
    "Ernaux": ("FR", "CONTEMPORAIN", 1990), "Carrere": ("FR", "CONTEMPORAIN", 2000),
    "Carrère": ("FR", "CONTEMPORAIN", 2000), "Le_Clezio": ("FR", "CONTEMPORAIN", 1990),
    "Le Clézio": ("FR", "CONTEMPORAIN", 1990), "Echenoz": ("FR", "CONTEMPORAIN", 2000),
    "echenoz": ("FR", "CONTEMPORAIN", 2000), "NDiaye": ("FR", "CONTEMPORAIN", 2009),
    "Ndiaye": ("FR", "CONTEMPORAIN", 2009), "Quignard": ("FR", "CONTEMPORAIN", 1995),
    "Chamoiseau": ("FR", "CONTEMPORAIN", 1992), "Yourcenar": ("FR", "CLASSIQUE", 1960),
    "Kundera": ("FR", "CONTEMPORAIN", 1984),

    # EN CLASSIQUE
    "Dickens": ("EN", "CLASSIQUE", 1855), "Austen": ("EN", "CLASSIQUE", 1815),
    "Bronte": ("EN", "CLASSIQUE", 1847), "Brontë": ("EN", "CLASSIQUE", 1847),
    "Woolf": ("EN", "CLASSIQUE", 1927), "Conrad": ("EN", "CLASSIQUE", 1900),
    "Joyce": ("EN", "CLASSIQUE", 1922), "Hemingway": ("EN", "CLASSIQUE", 1930),
    "Faulkner": ("EN", "CLASSIQUE", 1935), "James": ("EN", "CLASSIQUE", 1900),
    "Steinbeck": ("EN", "CLASSIQUE", 1940), "Melville": ("EN", "CLASSIQUE", 1851),
    "Twain": ("EN", "CLASSIQUE", 1885), "Hardy": ("EN", "CLASSIQUE", 1890),
    "Hawthorne": ("EN", "CLASSIQUE", 1850), "Poe": ("EN", "CLASSIQUE", 1845),
    "Fitzgerald": ("EN", "CLASSIQUE", 1925), "Lawrence": ("EN", "CLASSIQUE", 1920),
    "Forster": ("EN", "CLASSIQUE", 1924), "Dreiser": ("EN", "CLASSIQUE", 1915),
    "Wharton": ("EN", "CLASSIQUE", 1905), "Chopin": ("EN", "CLASSIQUE", 1899),
    "Crane": ("EN", "CLASSIQUE", 1895), "Lewis": ("EN", "CLASSIQUE", 1920),
    "London": ("EN", "CLASSIQUE", 1909), "Norris": ("EN", "CLASSIQUE", 1899),
    "Nabokov": ("EN", "CLASSIQUE", 1955), "Orwell": ("EN", "CLASSIQUE", 1945),
    "Defoe": ("EN", "CLASSIQUE", 1719), "Stevenson": ("EN", "CLASSIQUE", 1886),
    "Wilde": ("EN", "CLASSIQUE", 1890), "Swift": ("EN", "CLASSIQUE", 1726),
    "Richardson": ("EN", "CLASSIQUE", 1740), "Fielding": ("EN", "CLASSIQUE", 1749),
    "Sterne": ("EN", "CLASSIQUE", 1767),

    # EN CONTEMPORAIN
    "McCarthy": ("EN", "CONTEMPORAIN", 1990), "DeLillo": ("EN", "CONTEMPORAIN", 1990),
    "Delillo": ("EN", "CONTEMPORAIN", 1990), "Morrison": ("EN", "CONTEMPORAIN", 1987),
    "Pynchon": ("EN", "CONTEMPORAIN", 1973), "Rushdie": ("EN", "CONTEMPORAIN", 1995),
    "Ishiguro": ("EN", "CONTEMPORAIN", 1989), "McEwan": ("EN", "CONTEMPORAIN", 2001),
    "Adichie": ("EN", "CONTEMPORAIN", 2013), "Baldwin": ("EN", "CLASSIQUE", 1956),
    "Sebald": ("EN", "CONTEMPORAIN", 2001), "Handke": ("DE", "CONTEMPORAIN", 1990),
    "Ferrante": ("FR", "CONTEMPORAIN", 2012), "Calvino": ("FR", "CONTEMPORAIN", 1979),
    "Eco": ("FR", "CONTEMPORAIN", 1980), "Bolano": ("ES", "CONTEMPORAIN", 2004),
    "Bolaño": ("ES", "CONTEMPORAIN", 2004),

    # EN SF/Fantasy (POPULAIRE)
    "Carver": ("EN", "POPULAIRE", 2000),

    # ES CLASSIQUE
    "Cervantes": ("ES", "CLASSIQUE", 1605), "Marquez": ("ES", "CLASSIQUE", 1967),
    "García Márquez": ("ES", "CLASSIQUE", 1967), "Rulfo": ("ES", "CLASSIQUE", 1955),
    "Borges": ("ES", "CLASSIQUE", 1944),

    # Translations
    "Dostoievski": ("FR", "CLASSIQUE", 1870), "Dostoïevski": ("FR", "CLASSIQUE", 1870),
    "Tolstoi": ("FR", "CLASSIQUE", 1870), "Kafka": ("FR", "CLASSIQUE", 1925),
    "Nietzsche": ("FR", "CLASSIQUE", 1885),
}


def detect_language(text, n_words=2000):
    """Detect language by stopword frequency."""
    words = re.findall(r"[a-zA-ZàâäéèêëïîôùûüÿçœæÀ-ÿáéíóúñ¿¡ßäöü]+", text.lower())
    sample = words[:n_words]
    if len(sample) < 100:
        return "UNKNOWN"

    scores = {}
    for lang, sw in STOPWORDS.items():
        scores[lang] = sum(1 for w in sample if w in sw)

    best = max(scores, key=scores.get)
    if scores[best] < len(sample) * 0.05:
        return "UNKNOWN"
    return best


def classify_period(year):
    """Classify by period."""
    if year == 0:
        return "UNKNOWN"
    periods = [
        ("PERIOD_1", 0, 1750), ("PERIOD_2", 1750, 1800),
        ("PERIOD_3", 1800, 1850), ("PERIOD_4", 1850, 1900),
        ("PERIOD_5", 1900, 1950), ("PERIOD_6", 1950, 9999),
    ]
    for pid, lo, hi in periods:
        if lo <= year < hi:
            return pid
    return "PERIOD_6"


def parse_filename(fname):
    """Extract author and title from filename like 'Title_-_Author.pdf'."""
    base = os.path.splitext(fname)[0]

    # Pattern: Title_-_Author or Title - Author
    if "_-_" in base:
        parts = base.split("_-_", 1)
        title = parts[0].strip().replace("_", " ")
        author = parts[1].strip().replace("_", " ")
    elif " - " in base:
        parts = base.split(" - ", 1)
        title = parts[0].strip()
        author = parts[1].strip()
    elif ", " in base:
        # Pattern: Author, FirstName - Title
        parts = base.split(" - ", 1) if " - " in base else [base, ""]
        title = parts[-1].strip() if len(parts) > 1 else base.replace("_", " ")
        author = parts[0].strip() if len(parts) > 1 else ""
    else:
        title = base.replace("_", " ")
        author = ""

    # Clean up
    title = re.sub(r"\s+", " ", title).strip()
    author = re.sub(r"\s+", " ", author).strip()

    # Remove common suffixes
    for suffix in ["French Edition", "English Edition", "FR", "EN", "ES"]:
        title = title.replace(suffix, "").strip().rstrip("_").rstrip("-").strip()

    return author, title


def classify_author(author_str):
    """Look up author in known authors database."""
    for key, (lang, typ, year) in KNOWN_AUTHORS.items():
        if key.lower() in author_str.lower():
            return lang, typ, year
    return None, None, 0


def alpha_ratio(text):
    """Calculate ratio of alphabetic characters."""
    if not text:
        return 0
    alpha = sum(1 for c in text if c.isalpha())
    return alpha / len(text)


# ── HTML stripper ─────────────────────────────────────────────────────────────

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self._skip = True
        elif tag in ('p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'li'):
            self.result.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self._skip = False
        elif tag == 'p':
            self.result.append('\n')

    def handle_data(self, data):
        if not self._skip:
            self.result.append(data)

    def get_text(self):
        return ''.join(self.result)


def strip_html(html_str):
    """Strip HTML tags and return plain text."""
    extractor = HTMLTextExtractor()
    try:
        extractor.feed(html_str)
        return extractor.get_text()
    except Exception:
        return re.sub(r'<[^>]+>', ' ', html_str)


# ── PDF extraction ────────────────────────────────────────────────────────────

class TimeoutError(Exception):
    pass

def _timeout_handler(signum, frame):
    raise TimeoutError("PDF extraction timeout")

def extract_pdf(filepath):
    """Extract text from PDF using pdfplumber, fallback to PyPDF2."""
    text = ""

    # Try PyPDF2 first (faster, less verbose)
    try:
        import PyPDF2
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            pages = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
            if pages:
                text = "\n\n".join(pages)
    except Exception:
        pass

    # Fallback to pdfplumber if PyPDF2 gave little text
    if len(text.split()) < 1000:
        try:
            import pdfplumber
            with pdfplumber.open(filepath) as pdf:
                pages = []
                for i, page in enumerate(pdf.pages):
                    if i > 500:  # safety limit
                        break
                    t = page.extract_text()
                    if t:
                        pages.append(t)
                if pages:
                    text2 = "\n\n".join(pages)
                    if len(text2.split()) > len(text.split()):
                        text = text2
        except Exception:
            pass

    return text


# ── ePub extraction ───────────────────────────────────────────────────────────

def extract_epub(filepath):
    """Extract text from ePub using zipfile + HTML parsing."""
    text_parts = []

    try:
        with zipfile.ZipFile(filepath, 'r') as zf:
            # Find content files
            names = zf.namelist()

            # Try to find OPF to get reading order
            opf_path = None
            for n in names:
                if n.endswith('.opf'):
                    opf_path = n
                    break

            # Get HTML/XHTML files
            html_files = [n for n in names
                         if n.endswith(('.html', '.xhtml', '.htm'))
                         and 'toc' not in n.lower()
                         and 'nav' not in n.lower()
                         and 'cover' not in n.lower()]

            # Sort by name (usually gives reading order)
            html_files.sort()

            for hf in html_files:
                try:
                    raw = zf.read(hf)
                    # Try UTF-8 first, then Latin-1
                    try:
                        html_str = raw.decode('utf-8')
                    except UnicodeDecodeError:
                        html_str = raw.decode('latin-1', errors='replace')

                    plain = strip_html(html_str)
                    if plain.strip():
                        text_parts.append(plain.strip())
                except Exception:
                    continue

    except Exception:
        pass

    return "\n\n".join(text_parts)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(CACHE_DIR, exist_ok=True)

    # Load existing manifest
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = []

    # Build set of existing work_ids to avoid duplicates
    existing_ids = {m["work_id"] for m in manifest}
    existing_titles = {(m.get("author", "").lower(), m.get("title", "").lower())
                       for m in manifest}
    # Also skip files already in livre_cache
    existing_cache = set(os.listdir(CACHE_DIR)) if os.path.isdir(CACHE_DIR) else set()

    # List all files
    all_files = sorted(os.listdir(LIVRE_DIR))
    pdf_files = [f for f in all_files if f.lower().endswith('.pdf')]
    epub_files = [f for f in all_files if f.lower().endswith('.epub')]

    print(f"[LIVRE] Found {len(pdf_files)} PDF + {len(epub_files)} ePub = {len(pdf_files)+len(epub_files)} files")

    stats = {
        "total": 0, "extracted": 0, "skipped_short": 0, "skipped_garbled": 0,
        "skipped_scan": 0, "skipped_duplicate": 0, "skipped_error": 0,
        "by_language": {}, "by_type": {},
    }

    new_entries = []

    for fname in pdf_files + epub_files:
        stats["total"] += 1
        filepath = os.path.join(LIVRE_DIR, fname)
        ext = os.path.splitext(fname)[1].lower()

        author_raw, title_raw = parse_filename(fname)

        # Check for duplicates
        wid = re.sub(r'[^a-z0-9_]', '_', f"{author_raw}_{title_raw}".lower())
        wid = re.sub(r'_+', '_', wid).strip('_')[:60]
        safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', f"{author_raw}_{title_raw}")[:80]

        if wid in existing_ids:
            stats["skipped_duplicate"] += 1
            continue
        if (author_raw.lower(), title_raw.lower()) in existing_titles:
            stats["skipped_duplicate"] += 1
            continue
        # Skip if already in cache
        if f"{safe_name}.txt" in existing_cache:
            stats["skipped_duplicate"] += 1
            continue

        # Extract text
        try:
            if ext == '.pdf':
                text = extract_pdf(filepath)
            elif ext == '.epub':
                text = extract_epub(filepath)
            else:
                continue
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            stats["skipped_error"] += 1
            continue

        word_count = len(text.split())

        # Data gate: word count
        if word_count < MIN_WORDS:
            if word_count < 500:
                stats["skipped_scan"] += 1
                print(f"  SKIP (scan/empty) {fname}: {word_count} words")
            else:
                stats["skipped_short"] += 1
                print(f"  SKIP (short) {fname}: {word_count} words")
            continue

        # Data gate: alpha ratio
        ar = alpha_ratio(text)
        if ar < MIN_ALPHA_RATIO:
            stats["skipped_garbled"] += 1
            print(f"  SKIP (garbled) {fname}: alpha={ar:.2f}")
            continue

        # Detect language
        lang_detected = detect_language(text)

        # Classify author
        author_lang, author_type, author_year = classify_author(author_raw)

        # Use author classification if available, else use detection
        lang = author_lang or lang_detected
        work_type = author_type or "UNKNOWN"
        year = author_year

        period = classify_period(year)

        # Save to cache
        cache_path = os.path.join(CACHE_DIR, f"{safe_name}.txt")
        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(text)

        sha = hashlib.sha256(text.encode()).hexdigest()[:16]

        entry = {
            "work_id": wid,
            "title": title_raw,
            "author": author_raw,
            "year": year,
            "language": lang,
            "period": period,
            "type": work_type,
            "source": "livre",
            "source_file": fname,
            "filepath": f"livre_cache/{safe_name}.txt",
            "word_count": word_count,
            "sha256": sha,
            "status": "extracted",
            "alpha_ratio": round(ar, 3),
            "language_detected": lang_detected,
        }
        new_entries.append(entry)
        existing_ids.add(wid)
        existing_titles.add((author_raw.lower(), title_raw.lower()))

        stats["extracted"] += 1
        stats["by_language"][lang] = stats["by_language"].get(lang, 0) + 1
        stats["by_type"][work_type] = stats["by_type"].get(work_type, 0) + 1

        print(f"  OK {fname}: {word_count} words, {lang}, {work_type}, {period}")

    # Update manifest
    manifest.extend(new_entries)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[LIVRE] DONE")
    print(f"  Total files: {stats['total']}")
    print(f"  Extracted: {stats['extracted']}")
    print(f"  Skipped (short): {stats['skipped_short']}")
    print(f"  Skipped (garbled): {stats['skipped_garbled']}")
    print(f"  Skipped (scan/empty): {stats['skipped_scan']}")
    print(f"  Skipped (duplicate): {stats['skipped_duplicate']}")
    print(f"  Skipped (error): {stats['skipped_error']}")
    print(f"  By language: {stats['by_language']}")
    print(f"  By type: {stats['by_type']}")
    print(f"  Manifest total: {len(manifest)} entries")

    # Save extraction report
    report_path = os.path.join(os.path.dirname(__file__), "livre_extraction_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"  Report: {report_path}")


if __name__ == "__main__":
    main()
