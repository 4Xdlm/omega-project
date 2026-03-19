#!/usr/bin/env python3
"""
OMEGA — Full Work Analyzer v5 — REFONDATION METROLOGIQUE
Phase R0 — Point d'entree principal

Changements vs v4 :
  - Modules decomposes : v5_config, v5_features, v5_extraction
  - GATE_MIN_WORDS = 8000 (vs 15000)
  - CHAPTER_MAX_WORDS = SUPPRIME (tous les chapitres)
  - N_CHAPTERS = ILLIMITE (tous les chapitres reels)
  - N_RANDOM = proportionnel a la taille (1/5000 mots, min 5 max 30)
  - Multi-fenetre : 12 tailles d'analyse
  - Corpus ES : 17 oeuvres espagnoles
  - Classification type de passage
  - P_rel sur chaque extrait
  - Hooks et cliffhangers par chapitre
"""

import json, hashlib, sys, os
from pathlib import Path
from datetime import datetime
from statistics import mean, stdev

from v5_config import (
    CATALOG_PUBLIC, CATALOG_PDF, SAGAS, KEY_FEATURES, CORPUS_ORDER,
    OUTPUT_DIR, SCENES_DIR, TXT_DIR,
    GATE_MIN_WORDS, SCENE_WORDS,
    windows_safe_slug, make_work_id, log,
)
from v5_features import (
    run_autopsie, split_sentences,
    compute_all_features, compute_averages,
    compute_f31_chapter_length,
)
from v5_extraction import (
    check_data_gates, download_gutenberg, find_and_extract,
    clean_text, clean_gutenberg, extract_protocol_v5,
)

# ══════════════════════════════════════════════════════════════════════════
# PROCESS WORK v5
# ══════════════════════════════════════════════════════════════════════════

def process_work_v5(work: dict, text_override: str = "") -> dict | None:
    author  = work["author"]
    title   = work["title"]
    corpus  = work["corpus"]
    lang_o  = work["lang_original"]
    work_id = make_work_id(author, title)

    log.info(f"\n{'='*60}")
    log.info(f"  [{corpus}] {title} -- {author}")

    # ─── Obtenir le texte ─────────────────────────────────────────────
    if text_override:
        raw = text_override
        log.info(f"  Source: Gutenberg TXT")
    else:
        raw = find_and_extract(work)
        if not raw:
            log.error(f"  Fichier introuvable: {work.get('file','?')}")
            return {"meta": {"work_id": work_id, "gate_fail": "FILE_NOT_FOUND", **work}}

    if not raw:
        log.error("  Extraction vide -> REJECT")
        return {"meta": {"work_id": work_id, "gate_fail": "OCR_REQUIRED", **work}}

    text       = clean_text(raw) if not text_override else raw
    word_count = len(text.split())
    log.info(f"  Mots: {word_count:,}")

    # ─── DATA GATES ───────────────────────────────────────────────────
    gate_ok, gate_code = check_data_gates(text, work_id)
    if not gate_ok:
        return {"meta": {"work_id": work_id, "title": title, "author": author,
                         "corpus": corpus, "gate_fail": gate_code}}

    # ─── Protocole extraction v5 ─────────────────────────────────────
    log.info("  Protocole v5 : APEX/NEUTRE/SEUIL/INCIPIT/EXPLICIT/CLIMAX + RANDOM + ALL_CHAPTERS...")
    protocol   = extract_protocol_v5(text)
    n_ext      = len(protocol["extracts"])
    n_chap     = protocol["chapter_count"]
    n_desc     = len(protocol["descriptive"])
    n_mw       = len(protocol["multi_window"])
    log.info(f"  Extraits: {n_ext} | Chapitres: {n_chap} | Descriptifs: {n_desc} | Multi-fenetre: {n_mw}")

    # ─── Analyse par extrait ──────────────────────────────────────────
    log.info("  Analyse F1-F30 + F31-F38 sur extraits...")
    extract_results = []
    for ex in protocol["extracts"]:
        r     = run_autopsie(ex["text"], f"{work_id}_{ex['type']}", lang_o)
        feats = r.get("features", {}) if r else {}
        sents = split_sentences(ex["text"])
        feats.update(compute_all_features(ex["text"], sents, feats))
        extract_results.append({
            "type": ex["type"],
            "pos": ex.get("pos", 0),
            "p_rel": ex.get("p_rel", 0),
            "passage_type": ex.get("passage_type", "UNKNOWN"),
            "features": feats,
        })

    # ─── Analyse chapitres (TOUS) ────────────────────────────────────
    log.info(f"  Analyse {n_chap} chapitres...")
    chapter_results = []
    chapter_texts = []
    for ch in protocol["chapters"]:
        r     = run_autopsie(ch["text"][:5000], f"{work_id}_{ch['type']}", lang_o)
        feats = r.get("features", {}) if r else {}
        sents = split_sentences(ch["text"])
        feats.update(compute_all_features(ch["text"], sents, feats))
        chapter_results.append({
            "type": ch["type"],
            "words": ch["words"],
            "p_rel": ch.get("p_rel", 0),
            "passage_type": ch.get("passage_type", "UNKNOWN"),
            "features": feats,
        })
        chapter_texts.append(ch["text"])

    # F31 — distribution longueur chapitres (sur l'ensemble)
    f31 = compute_f31_chapter_length(chapter_texts)

    # ─── Analyse descriptive ─────────────────────────────────────────
    desc_results = []
    for d in protocol["descriptive"]:
        r     = run_autopsie(d["text"], f"{work_id}_{d['type']}", lang_o)
        feats = r.get("features", {}) if r else {}
        feats.update(d.get("f25", {}))
        desc_results.append({
            "type": d["type"],
            "f25_score": d.get("f25_score", 0),
            "features": feats,
        })

    # ─── Multi-fenetre (feature stability) ───────────────────────────
    mw_results = []
    for mw in protocol["multi_window"]:
        sents = split_sentences(mw["text"])
        feats = compute_all_features(mw["text"], sents, {})
        mw_results.append({
            "window_size": mw["window_size"],
            "features": feats,
        })

    # ─── Moyennes ─────────────────────────────────────────────────────
    all_feat_dicts = [er["features"] for er in extract_results + chapter_results]
    averages = compute_averages(all_feat_dicts)
    averages.update(f31)  # ajouter F31

    log.info(f"  OK: {len(extract_results)} extraits + {len(chapter_results)} chapitres analyses")

    result = {
        "meta": {
            "work_id": work_id, "author": author, "title": title,
            "corpus": corpus, "lang_original": lang_o,
            "year": work.get("year"), "word_count": word_count,
            "analyzed_at": datetime.now().isoformat(),
            "text_sha": hashlib.sha256(text.encode()).hexdigest()[:16],
            "analyzer_version": "v5",
        },
        "protocol": {
            "extracts_count": len(extract_results),
            "chapters_count": len(chapter_results),
            "descriptive_count": len(desc_results),
            "multi_window_count": len(mw_results),
            "n_random": protocol.get("n_random", 0),
        },
        "averages":      averages,
        "extracts":      extract_results,
        "chapters":      chapter_results,
        "descriptive":   desc_results,
        "multi_window":  mw_results,
        "chapter_distribution": f31,
    }

    # ─── Sauvegarde ───────────────────────────────────────────────────
    out_file = OUTPUT_DIR / f"{work_id[:40]}.json"
    out_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    sha = hashlib.sha256(out_file.read_bytes()).hexdigest()[:12]
    log.info(f"  -> {out_file.name} | SHA: {sha}")

    # Sauvegarder extraits texte
    sc_dir = SCENES_DIR / author
    sc_dir.mkdir(exist_ok=True)
    for ex in protocol["extracts"][:6]:
        fname = f"{windows_safe_slug(title, 20)}_{ex['type']}.txt"
        (sc_dir / fname).write_text(ex["text"], encoding="utf-8")

    return result

# ══════════════════════════════════════════════════════════════════════════
# Z-SCORES & RANKING
# ══════════════════════════════════════════════════════════════════════════

def compute_zscores(results: list) -> dict:
    by_corpus = {}
    for r in results:
        c = r["meta"].get("corpus", "UNKNOWN")
        by_corpus.setdefault(c, []).append(r)

    zscores = {}
    for corpus, group in by_corpus.items():
        zscores[corpus] = {}
        for feat in KEY_FEATURES:
            vals = [g["averages"].get(feat) for g in group
                    if isinstance(g.get("averages", {}).get(feat), (int, float))]
            if len(vals) < 2:
                continue
            m  = mean(vals)
            sd = stdev(vals) if stdev(vals) > 0 else 1.0
            for g in group:
                v = g.get("averages", {}).get(feat)
                if v is not None:
                    wid = g["meta"]["work_id"]
                    zscores[corpus].setdefault(wid, {})[feat] = round((v - m) / sd, 4)
    return zscores

def print_ranking(results: list):
    if not results:
        return
    print("\n" + "="*130)
    print("OMEGA v5 — CLASSEMENT PROSE — REFONDATION METROLOGIQUE")
    print("="*130)
    for corpus_label in CORPUS_ORDER:
        group = [r for r in results if r["meta"].get("corpus") == corpus_label]
        if not group:
            continue
        group.sort(key=lambda r: r.get("averages", {}).get("f22f_literary_index", 0), reverse=True)
        print(f"\n-- {corpus_label} ({len(group)} oeuvres) --")
        hdr = f"  {'Titre':<32} {'F22':>7} {'F24':>7} {'F25':>7} {'F26':>7} {'F27':>7} {'F28':>7} {'F29':>8} {'Chap':>5}"
        print(hdr)
        print("  " + "-"*105)
        for r in group:
            av = r.get("averages", {})
            def fmt(k): return f"{av.get(k,'N/A'):.3f}" if isinstance(av.get(k), float) else "N/A"
            n_ch = r.get("protocol", {}).get("chapters_count", 0)
            print(
                f"  {r['meta']['title'][:31]:<32}"
                f"  {fmt('f22f_literary_index'):>6}"
                f"  {fmt('f24e_contrast_score'):>6}"
                f"  {fmt('f25g_description_score'):>6}"
                f"  {fmt('f26c_period_score'):>6}"
                f"  {fmt('f27d_modal_score'):>6}"
                f"  {fmt('f28d_sil_score'):>6}"
                f"  {fmt('f29b_ttr_window'):>7}"
                f"  {n_ch:>4}"
            )
    print()

def save_ranking(results: list, zscores: dict, rejected: list) -> str:
    data = {
        "generated_at":   datetime.now().isoformat(),
        "analyzer_version": "v5",
        "total_analyzed": len(results),
        "total_rejected": len(rejected),
        "rejected":       rejected,
        "protocol": {
            "version":           "v5",
            "features":          "F1-F23 (autopsie_v4) + F24-F30 + F31-F38 (topologie)",
            "scene_words":       SCENE_WORDS,
            "chapter_max":       "ILLIMITE (v5)",
            "gate_min_words":    GATE_MIN_WORDS,
            "normalization":     "Z-scores par corpus",
        },
        "works": [
            {
                "work_id": r["meta"]["work_id"],
                "title":   r["meta"]["title"],
                "author":  r["meta"]["author"],
                "corpus":  r["meta"].get("corpus"),
                "year":    r["meta"].get("year"),
                "words":   r["meta"].get("word_count"),
                "chapters": r.get("protocol", {}).get("chapters_count", 0),
                "scores":  {k: r.get("averages", {}).get(k) for k in KEY_FEATURES},
            }
            for r in results
        ],
        "zscores_by_corpus": zscores,
    }
    path = OUTPUT_DIR / "RANKING_V5.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    sha  = hashlib.sha256(path.read_bytes()).hexdigest()
    log.info(f"\nRANKING_V5.json | SHA: {sha}")
    return sha

# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════

def main(single_work: str = None):
    """
    Point d'entree principal.
    single_work : si fourni, ne traite qu'une seule oeuvre (titre partiel).
    """
    all_pdf = CATALOG_PDF
    all_pub = CATALOG_PUBLIC

    # Mode single work (pour test)
    if single_work:
        all_pdf = [w for w in all_pdf if single_work.lower() in w["title"].lower()]
        all_pub = [w for w in all_pub if single_work.lower() in w["title"].lower()]
        log.info(f"MODE SINGLE: '{single_work}' -> {len(all_pdf)} PDF + {len(all_pub)} PD")

    log.info("="*70)
    log.info("OMEGA — Full Work Analyzer v5 — REFONDATION METROLOGIQUE")
    log.info(f"PDF Catalog:       {len(all_pdf)} oeuvres")
    log.info(f"Public Domain:     {len(all_pub)} oeuvres (Gutenberg)")
    log.info(f"Total cible:       {len(all_pdf) + len(all_pub)} oeuvres")
    log.info(f"Features:          F1-F23 + F24-F30 + F31-F38")
    log.info(f"Data gates:        min {GATE_MIN_WORDS:,} mots | Chapitres: ILLIMITE")
    log.info(f"Sagas:             {len(SAGAS)} identifiees")
    log.info("="*70)

    results  = []
    rejected = []
    total    = 0

    # ── Phase 1 : PDF/EPUB ────────────────────────────────────────────
    if all_pdf:
        log.info(f"\n{'='*40} PHASE 1 — PDF ({len(all_pdf)} oeuvres) {'='*40}")
        for i, work in enumerate(all_pdf, 1):
            total += 1
            log.info(f"\n[PDF {i}/{len(all_pdf)}]")
            try:
                r = process_work_v5(work)
                if r:
                    if r.get("meta", {}).get("gate_fail"):
                        rejected.append({"title": work["title"], "reason": r["meta"]["gate_fail"]})
                        log.warning(f"  REJECTED: {r['meta']['gate_fail']}")
                    else:
                        results.append(r)
            except Exception as e:
                log.error(f"  EXCEPTION: {e}")
                import traceback; traceback.print_exc()
                rejected.append({"title": work.get("title", "?"), "reason": f"EXCEPTION:{e}"})

    # ── Phase 2 : Domaine Public (Gutenberg) ──────────────────────────
    if all_pub:
        log.info(f"\n{'='*40} PHASE 2 — GUTENBERG ({len(all_pub)} oeuvres) {'='*40}")
        for i, work in enumerate(all_pub, 1):
            total += 1
            log.info(f"\n[PD {i}/{len(all_pub)}]")
            label = f"{work['author']}_{work['title'][:15]}"
            try:
                text = download_gutenberg(work["gutenberg_ids"], TXT_DIR, label)
                if not text:
                    log.warning(f"  SKIP {label}: telechargement echoue")
                    rejected.append({"title": work["title"], "reason": "GUTENBERG_DOWNLOAD_FAIL"})
                    continue
                r = process_work_v5(work, text_override=text)
                if r:
                    if r.get("meta", {}).get("gate_fail"):
                        rejected.append({"title": work["title"], "reason": r["meta"]["gate_fail"]})
                    else:
                        results.append(r)
            except Exception as e:
                log.error(f"  EXCEPTION: {e}")
                import traceback; traceback.print_exc()
                rejected.append({"title": work.get("title","?"), "reason": f"EXCEPTION:{e}"})

    # ── Classement & sortie ───────────────────────────────────────────
    if results:
        print_ranking(results)
        zscores = compute_zscores(results)
        sha = save_ranking(results, zscores, rejected)
    else:
        sha = "NO_RESULTS"

    log.info("\n" + "="*70)
    log.info("TERMINE")
    log.info(f"  Analysees  : {len(results)}/{total}")
    log.info(f"  Rejetees   : {len(rejected)}")
    for r in rejected:
        log.info(f"    x {r['title']:40} [{r['reason']}]")
    if results:
        log.info(f"  RANKING_V5 : SHA {sha[:20]}")
    log.info("="*70)


if __name__ == "__main__":
    # Usage: python full_work_analyzer_v5.py [titre_partiel]
    # Exemple: python full_work_analyzer_v5.py "Bovary"
    single = sys.argv[1] if len(sys.argv) > 1 else None
    main(single_work=single)
