"""Phase R-1: Extract PDF files to TXT."""
import os, sys, glob, json, re, unicodedata

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF not installed. Run: pip install PyMuPDF")
    sys.exit(1)

SRC = r"C:\Users\elric\Downloads\livre"
DST = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\txt"

os.makedirs(DST, exist_ok=True)

results = []
ok_count = 0
skip_count = 0
fail_count = 0

def clean_filename(name):
    name = name.replace('.pdf', '')
    name = unicodedata.normalize('NFKD', name)
    name = re.sub(r'[^\w\s\-.]', '', name, flags=re.UNICODE)
    name = name.lower().strip()
    name = re.sub(r'[\s\-]+', '_', name)
    name = re.sub(r'_+', '_', name)
    return name + '.txt'

for path in sorted(glob.glob(os.path.join(SRC, "*.pdf"))):
    basename = os.path.basename(path)
    try:
        doc = fitz.open(path)
        texts = [page.get_text() for page in doc]
        doc.close()
        full_text = '\n'.join(texts)

        if len(full_text) < 1000:
            print(f"[SKIP] {basename} — trop court ({len(full_text)} chars)")
            results.append({"file": basename, "status": "skip", "reason": f"too short ({len(full_text)} chars)"})
            skip_count += 1
            continue

        out_name = "pdf_" + clean_filename(basename)
        out_path = os.path.join(DST, out_name)

        if os.path.exists(out_path):
            out_name = "pdf2_" + clean_filename(basename)
            out_path = os.path.join(DST, out_name)

        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(full_text)

        words = len(full_text.split())
        print(f"[OK] {out_name} — {words:,} mots")
        results.append({"file": out_name, "source_pdf": basename, "status": "ok", "words": words, "chars": len(full_text)})
        ok_count += 1

    except Exception as e:
        print(f"[FAIL] {basename} — {e}")
        results.append({"file": basename, "status": "fail", "error": str(e)})
        fail_count += 1

print(f"\n{'='*60}")
print(f"PDF Extraction Complete: {ok_count} OK / {skip_count} SKIP / {fail_count} FAIL")
print(f"{'='*60}")

log_path = os.path.join(os.path.dirname(DST), "pdf_extraction_log.json")
with open(log_path, 'w', encoding='utf-8') as f:
    json.dump({"summary": {"ok": ok_count, "skip": skip_count, "fail": fail_count}, "details": results}, f, indent=2, ensure_ascii=False)
print(f"Log saved: {log_path}")
