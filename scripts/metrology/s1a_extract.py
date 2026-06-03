#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
S1A — Pipeline d'extraction OMEGA (epub/pdf/txt -> texte propre + manifest)
Doctrine: OMEGA_ABSOLUTE_PROOF_STANDARD.md. ZERO embedding, ZERO LLM ici.
Sortie texte = NON versionnee (copyright). Manifests = partageables (pas de prose).
"""
import os, sys, re, csv, json, hashlib, argparse, random
from pathlib import Path

random.seed(42)

# ---------- extraction ----------
def sha256_bytes(b): return hashlib.sha256(b).hexdigest()
def sha256_text(t): return hashlib.sha256(t.encode("utf-8", "ignore")).hexdigest()

def extract_epub(path):
    from ebooklib import epub
    import ebooklib
    from bs4 import BeautifulSoup
    book = epub.read_epub(path, options={"ignore_ncx": True})
    parts = []
    for it in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        soup = BeautifulSoup(it.get_content(), "html.parser")
        for bad in soup(["script", "style"]):
            bad.decompose()
        parts.append(soup.get_text(" "))
    return "\n".join(parts)

def extract_pdf(path):
    # fitz (PyMuPDF) primary
    try:
        import fitz
        doc = fitz.open(path)
        txt = "\n".join(page.get_text("text") for page in doc)
        doc.close()
        if len(txt.split()) > 200:
            return txt, "fitz"
    except Exception:
        pass
    # fallback pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            txt = "\n".join((p.extract_text() or "") for p in pdf.pages)
        return txt, "pdfplumber"
    except Exception as e:
        return "", "FAIL:" + type(e).__name__

def extract_txt(path):
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            return Path(path).read_text(encoding=enc)
        except Exception:
            continue
    return Path(path).read_bytes().decode("utf-8", "ignore")

# ---------- cleaning ----------
def clean_text(t):
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"-\n([a-zà-ÿ])", r"\1", t)         # de-hyphenation
    t = t.replace("­", "")                      # soft hyphen
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = re.sub(r"[ \t]*\n[ \t]*", "\n", t)
    return t.strip()

FRONT_PAT = re.compile(r"(table des mati|sommaire|copyright|tous droits|isbn|table of contents|"
                       r"all rights reserved|acknowledg|remerciement|dédicace|du m[eê]me auteur|"
                       r"chapitre\s+(un|i|1)\b|chapter\s+(one|i|1)\b)", re.I)

def sample_middle(text, n_words=1500):
    """Prend une fenetre continue de n_words au milieu du livre (evite front/back matter)."""
    words = text.split()
    W = len(words)
    if W < n_words:
        return " ".join(words), W
    start = max(0, (W - n_words) // 2)
    return " ".join(words[start:start + n_words]), W

def detect_lang(text):
    try:
        from langdetect import detect, DetectorFactory
        DetectorFactory.seed = 42
        return detect(text[:4000])
    except Exception:
        return "und"

# ---------- quality ----------
def quality_flags(raw, sampled, total_words, lang_folder, lang_detected):
    flags = []
    if total_words < 1500: flags.append("TOO_SHORT")
    # OCR / layout suspects: ratio non-alpha eleve, mots colles, lignes tres courtes
    nonalpha = sum(1 for c in sampled if not (c.isalpha() or c.isspace() or c in ".,;:!?'\"-—()«»…"))
    if sampled and nonalpha / max(1, len(sampled)) > 0.08: flags.append("OCR_SUSPECT")
    avg_wl = sum(len(w) for w in sampled.split()) / max(1, len(sampled.split()))
    if avg_wl > 12 or avg_wl < 3: flags.append("BROKEN_LAYOUT")
    fl = (lang_folder or "").lower()[:2]
    ld = (lang_detected or "").lower()[:2]
    map_folder = {"en": "en", "fr": "fr", "es": "es", "it": "it"}
    if fl in map_folder and ld and ld != map_folder[fl]: flags.append("MIXED_LANGUAGE")
    if FRONT_PAT.search(sampled[:600]): flags.append("FRONT_MATTER_HEAVY")
    return flags if flags else ["OK"]

def norm_key(s):
    s = re.sub(r"\.(epub|pdf|txt)$", "", s, flags=re.I)
    s = re.sub(r"_french_edition|_spanish_edition|_\d+$", "", s, flags=re.I)
    s = re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
    return s

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--roots", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--quarantine", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sample-words", type=int, default=1500)
    ap.add_argument("--write-text", action="store_true")
    ap.add_argument("--exts", nargs="+", default=[".epub", ".pdf", ".txt"])
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    files = []
    for root in args.roots:
        for dp, _, fns in os.walk(root):
            if os.sep + "_EXCLU" in dp: continue
            for fn in fns:
                if os.path.splitext(fn)[1].lower() in args.exts:
                    files.append(os.path.join(dp, fn))
    files.sort()
    if args.limit: files = files[:args.limit]

    seen_keys = {}
    man = open(args.manifest, "w", newline="", encoding="utf-8")
    qua = open(args.quarantine, "w", newline="", encoding="utf-8")
    cols = ["idx","source_path","source_format","tier_folder","lang_folder","lang_detected",
            "author_title_key","total_words","sample_words","sha_source","sha_text",
            "extractor","quality_flags","duplicate_of","status"]
    mw = csv.DictWriter(man, fieldnames=cols); mw.writeheader()
    qw = csv.DictWriter(qua, fieldnames=cols); qw.writeheader()

    n_ok = n_quar = 0
    for i, fp in enumerate(files):
        ext = os.path.splitext(fp)[1].lower()
        parts = Path(fp).parts
        tier_folder = lang_folder = ""
        for p in parts:
            if p in ("S","A","B","C","D","Best Seller"): tier_folder = p
            if p in ("FR","ENG","ESP","IT"): lang_folder = {"FR":"fr","ENG":"en","ESP":"es","IT":"it"}[p]
        extractor = ext[1:]
        try:
            raw_bytes = Path(fp).read_bytes()
            if ext == ".epub": raw = extract_epub(fp)
            elif ext == ".pdf": raw, extractor = extract_pdf(fp)
            else: raw = extract_txt(fp)
        except Exception as e:
            raw, extractor = "", "FAIL:" + type(e).__name__
        cleaned = clean_text(raw)
        sampled, total_words = sample_middle(cleaned, args.sample_words)
        lang_detected = detect_lang(sampled) if sampled else "und"
        key = norm_key(os.path.basename(fp))
        flags = quality_flags(raw, sampled, total_words, lang_folder, lang_detected)
        dup_of = ""
        if key in seen_keys:
            flags = list(set(flags + ["DUPLICATE"])); dup_of = str(seen_keys[key])
        else:
            seen_keys[key] = i
        status = "OK" if flags == ["OK"] else "QUARANTINE"
        row = dict(idx=i, source_path=fp, source_format=ext[1:], tier_folder=tier_folder,
                   lang_folder=lang_folder, lang_detected=lang_detected, author_title_key=key,
                   total_words=total_words, sample_words=len(sampled.split()),
                   sha_source=sha256_bytes(raw_bytes), sha_text=sha256_text(sampled),
                   extractor=extractor, quality_flags="|".join(flags),
                   duplicate_of=dup_of, status=status)
        (mw if status=="OK" else qw).writerow(row)
        if status=="OK":
            n_ok += 1
            if args.write_text:
                Path(os.path.join(args.out, f"{i:05d}_{key[:60]}.txt")).write_text(sampled, encoding="utf-8")
        else:
            n_quar += 1
        if (i+1) % 50 == 0: print(f"  ...{i+1}/{len(files)} (OK={n_ok} QUAR={n_quar})", flush=True)
    man.close(); qua.close()
    print(json.dumps({"total": len(files), "ok": n_ok, "quarantine": n_quar,
                      "manifest": args.manifest, "quarantine_csv": args.quarantine}))

if __name__ == "__main__":
    main()
