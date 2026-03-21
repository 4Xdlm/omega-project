"""Phase R-1: Extract EPUB files to TXT."""
import os, sys, glob, json, re, unicodedata

from ebooklib import epub
from bs4 import BeautifulSoup

SRC = r"C:\Users\elric\Downloads\livre"
DST = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\txt"

os.makedirs(DST, exist_ok=True)

results = []
ok_count = 0
skip_count = 0
fail_count = 0

def clean_filename(name):
    """Normalize filename: lowercase, underscores, ASCII-safe."""
    name = name.replace('.epub', '')
    # Normalize unicode
    name = unicodedata.normalize('NFKD', name)
    # Keep only alphanumeric, spaces, hyphens, underscores, dots
    name = re.sub(r'[^\w\s\-.]', '', name, flags=re.UNICODE)
    name = name.lower().strip()
    name = re.sub(r'[\s\-]+', '_', name)
    name = re.sub(r'_+', '_', name)
    return name + '.txt'

for path in sorted(glob.glob(os.path.join(SRC, "*.epub"))):
    basename = os.path.basename(path)
    try:
        book = epub.read_epub(path, options={'ignore_ncx': True})
        texts = []
        for item in book.get_items_of_type(9):  # ITEM_DOCUMENT
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            # Remove script/style tags
            for tag in soup(['script', 'style', 'nav']):
                tag.decompose()
            text = soup.get_text(separator='\n', strip=True)
            if text:
                texts.append(text)

        full_text = '\n\n'.join(texts)

        if len(full_text) < 1000:
            print(f"[SKIP] {basename} — trop court ({len(full_text)} chars)")
            results.append({"file": basename, "status": "skip", "reason": f"too short ({len(full_text)} chars)"})
            skip_count += 1
            continue

        out_name = clean_filename(basename)
        out_path = os.path.join(DST, out_name)

        # Avoid overwriting
        if os.path.exists(out_path):
            out_name = "epub_" + out_name
            out_path = os.path.join(DST, out_name)

        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(full_text)

        words = len(full_text.split())
        print(f"[OK] {out_name} — {words:,} mots")
        results.append({"file": out_name, "source_epub": basename, "status": "ok", "words": words, "chars": len(full_text)})
        ok_count += 1

    except Exception as e:
        print(f"[FAIL] {basename} — {e}")
        results.append({"file": basename, "status": "fail", "error": str(e)})
        fail_count += 1

print(f"\n{'='*60}")
print(f"EPUB Extraction Complete: {ok_count} OK / {skip_count} SKIP / {fail_count} FAIL")
print(f"{'='*60}")

# Save log
log_path = os.path.join(os.path.dirname(DST), "epub_extraction_log.json")
with open(log_path, 'w', encoding='utf-8') as f:
    json.dump({"summary": {"ok": ok_count, "skip": skip_count, "fail": fail_count}, "details": results}, f, indent=2, ensure_ascii=False)
print(f"Log saved: {log_path}")
