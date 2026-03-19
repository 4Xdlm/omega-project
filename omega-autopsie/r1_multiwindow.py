#!/usr/bin/env python3
"""
OMEGA — Phase R1 : Analyse multi-fenetre complete
Mesure F1-F30 a 12 fenetres x 5 positions x 187 oeuvres
Derive CV(feature, taille) et constantes window_min / window_opt

Usage : .venv311/Scripts/python.exe r1_multiwindow.py [titre_partiel]
"""

import json, hashlib, sys, os, re, random, math, time, traceback
from pathlib import Path
from datetime import datetime
from statistics import mean, stdev, median
from collections import defaultdict

# ─── Ajuster les imports v5 ──────────────────────────────────────────────
# On reutilise les modules v5 pour config, extraction, features
from v5_config import (
    CATALOG_PUBLIC, CATALOG_PDF, SAGAS, ANALYSIS_WINDOWS,
    OUTPUT_DIR, TXT_DIR, PDF_DIR, GATE_MIN_WORDS, SCENE_WORDS,
    windows_safe_slug, make_work_id, log,
)
from v5_features import (
    split_sentences, compute_all_features, compute_averages,
    run_autopsie, compute_f31_chapter_length,
)
from v5_extraction import (
    check_data_gates, download_gutenberg, find_and_extract,
    clean_text, split_chapters_v5, classify_passage,
    compute_p_rel, score_density,
)

# ─── CONFIG R1 ────────────────────────────────────────────────────────────
R1_OUTPUT_DIR = Path("results_r1")
R1_OUTPUT_DIR.mkdir(exist_ok=True)

N_POSITIONS_PER_WINDOW = 5   # 5 positions par fenetre par oeuvre
CV_THRESHOLD_MIN  = 0.30     # window_min = CV < 0.30
CV_DERIV_THRESHOLD = 0.05    # window_opt = derivee CV < 5%

# Fenetres completes (ajout chapitre reel + oeuvre complete)
WINDOWS = ANALYSIS_WINDOWS  # [30, 150, 300, 600, 1000, 1500, 2500, 5000, 10000, 20000]

# ══════════════════════════════════════════════════════════════════════════
# EXTRACTION MULTI-FENETRE
# ══════════════════════════════════════════════════════════════════════════

def extract_windows(text: str, windows: list, n_positions: int = 5) -> list:
    """
    Pour chaque fenetre, extrait N positions uniformement distribuees
    couvrant P_rel 0.0 a 1.0.
    Retourne : [{window_size, position_idx, p_rel, text, passage_type}, ...]
    """
    words = text.split()
    total = len(words)
    results = []

    for win_size in windows:
        if win_size > total:
            continue

        # Positions uniformement distribuees
        usable = total - win_size
        if usable <= 0:
            # Fenetre = taille du texte
            results.append({
                "window_size": win_size,
                "position_idx": 0,
                "p_rel": 0.5,
                "text": text,
                "passage_type": classify_passage(text[:1000]),
            })
            continue

        positions = []
        for i in range(n_positions):
            # Distribuer uniformement entre 5% et 95% du texte
            p_rel_target = 0.05 + (0.90 * i / max(n_positions - 1, 1))
            pos = int(p_rel_target * usable)
            pos = max(0, min(pos, usable))
            positions.append(pos)

        for idx, pos in enumerate(positions):
            win_text = " ".join(words[pos: pos + win_size])
            results.append({
                "window_size": win_size,
                "position_idx": idx,
                "p_rel": round(pos / total, 4),
                "text": win_text,
                "passage_type": classify_passage(win_text[:500]),
            })

    # Ajouter fenetre "full_work" (oeuvre complete)
    results.append({
        "window_size": total,
        "position_idx": 0,
        "p_rel": 0.5,
        "text": text,
        "passage_type": "FULL_WORK",
    })

    return results


def extract_chapter_windows(text: str) -> list:
    """
    Extrait tous les chapitres reels comme fenetres supplementaires.
    Retourne : [{window_size, position_idx, p_rel, text, passage_type, chapter_idx}, ...]
    """
    chapters = split_chapters_v5(text)
    total = len(text.split())
    results = []
    cumulative_words = 0

    for i, chap in enumerate(chapters):
        chap_words = len(chap.split())
        p_rel = compute_p_rel(cumulative_words, total)
        results.append({
            "window_size": chap_words,
            "position_idx": i,
            "p_rel": round(p_rel, 4),
            "text": chap,
            "passage_type": classify_passage(chap[:1000]),
            "chapter_idx": i,
            "is_real_chapter": True,
        })
        cumulative_words += chap_words

    return results


# ══════════════════════════════════════════════════════════════════════════
# ANALYSE PAR FENETRE
# ══════════════════════════════════════════════════════════════════════════

def analyze_window(win: dict, work_id: str, lang_orig: str) -> dict:
    """Analyse une fenetre : F1-F23 (autopsie) + F24-F30 + F31-F38."""
    text = win["text"]
    sents = split_sentences(text)

    # F1-F23 via autopsie_v4 (seulement si < 10000 mots pour perf)
    word_count = len(text.split())
    if word_count <= 10000:
        r = run_autopsie(text, f"{work_id}_w{win['window_size']}", lang_orig)
        feats = r.get("features", {}) if r else {}
    else:
        # Pour les tres grandes fenetres, echantillonner 5000 mots pour F1-F23
        sample = " ".join(text.split()[:5000])
        r = run_autopsie(sample, f"{work_id}_w{win['window_size']}_sample", lang_orig)
        feats = r.get("features", {}) if r else {}

    # F24-F30 + F31-F38 sur le texte complet
    feats.update(compute_all_features(text, sents, feats))

    return {
        "window_size": win["window_size"],
        "position_idx": win.get("position_idx", 0),
        "p_rel": win.get("p_rel", 0),
        "passage_type": win.get("passage_type", "UNKNOWN"),
        "word_count": word_count,
        "n_sentences": len(sents),
        "features": feats,
    }


# ══════════════════════════════════════════════════════════════════════════
# PROCESS WORK R1
# ══════════════════════════════════════════════════════════════════════════

def process_work_r1(work: dict, text_override: str = "") -> dict | None:
    """Analyse complete multi-fenetre d'une oeuvre."""
    author  = work["author"]
    title   = work["title"]
    corpus  = work["corpus"]
    lang_o  = work["lang_original"]
    work_id = make_work_id(author, title)

    log.info(f"\n{'='*60}")
    log.info(f"  [{corpus}] {title} -- {author}")

    # Obtenir le texte
    if text_override:
        text = text_override
        log.info(f"  Source: Gutenberg TXT")
    else:
        raw = find_and_extract(work)
        if not raw:
            log.error(f"  Fichier introuvable: {work.get('file','?')}")
            return {"meta": {"work_id": work_id, "gate_fail": "FILE_NOT_FOUND"}}
        text = clean_text(raw)

    if not text:
        return {"meta": {"work_id": work_id, "gate_fail": "EMPTY_TEXT"}}

    word_count = len(text.split())
    log.info(f"  Mots: {word_count:,}")

    # Data gates
    gate_ok, gate_code = check_data_gates(text, work_id)
    if not gate_ok:
        return {"meta": {"work_id": work_id, "title": title, "gate_fail": gate_code}}

    # ─── Multi-fenetre fixe ───────────────────────────────────────────
    log.info(f"  Extraction multi-fenetre ({len(WINDOWS)} fenetres x {N_POSITIONS_PER_WINDOW} positions)...")
    windows = extract_windows(text, WINDOWS, N_POSITIONS_PER_WINDOW)
    log.info(f"  Fenetres fixes: {len(windows)}")

    # ─── Chapitres reels ──────────────────────────────────────────────
    chap_windows = extract_chapter_windows(text)
    log.info(f"  Chapitres reels: {len(chap_windows)}")

    # ─── Analyse ──────────────────────────────────────────────────────
    all_windows = windows + chap_windows
    log.info(f"  Analyse {len(all_windows)} fenetres (F1-F30 + F31-F38)...")

    t0 = time.time()
    window_results = []
    for i, win in enumerate(all_windows):
        if i > 0 and i % 20 == 0:
            elapsed = time.time() - t0
            log.info(f"    ... {i}/{len(all_windows)} fenetres ({elapsed:.1f}s)")
        try:
            wr = analyze_window(win, work_id, lang_o)
            wr["is_real_chapter"] = win.get("is_real_chapter", False)
            wr["chapter_idx"] = win.get("chapter_idx", -1)
            window_results.append(wr)
        except Exception as e:
            log.error(f"    ERREUR fenetre {win['window_size']}@{win.get('position_idx',0)}: {e}")

    elapsed = time.time() - t0
    log.info(f"  Analyse terminee: {len(window_results)} fenetres en {elapsed:.1f}s")

    # ─── Chapitres distribution ───────────────────────────────────────
    chap_texts = [w["text"] for w in chap_windows]
    f31 = compute_f31_chapter_length(chap_texts)

    result = {
        "meta": {
            "work_id": work_id, "author": author, "title": title,
            "corpus": corpus, "lang_original": lang_o,
            "year": work.get("year"), "word_count": word_count,
            "analyzed_at": datetime.now().isoformat(),
            "text_sha": hashlib.sha256(text.encode()).hexdigest()[:16],
            "analyzer_version": "r1_multiwindow",
        },
        "protocol": {
            "n_fixed_windows": len(windows),
            "n_chapter_windows": len(chap_windows),
            "n_total_analyzed": len(window_results),
            "positions_per_window": N_POSITIONS_PER_WINDOW,
            "analysis_time_s": round(elapsed, 1),
        },
        "windows": window_results,
        "chapter_distribution": f31,
    }

    # Sauvegarder
    out_file = R1_OUTPUT_DIR / f"{work_id[:40]}.json"
    out_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    sha = hashlib.sha256(out_file.read_bytes()).hexdigest()[:12]
    log.info(f"  -> {out_file.name} | SHA: {sha}")

    return result


# ══════════════════════════════════════════════════════════════════════════
# CV CALCULATION
# ══════════════════════════════════════════════════════════════════════════

def compute_cv_matrix(results: list) -> dict:
    """
    Calcule CV(feature, window_size) sur tout le corpus.

    Retourne : {
        feature_name: {
            window_size: {mean, stdev, cv, n_samples},
            ...
        }
    }
    """
    # Collecter : feature -> window_size -> [values]
    data = defaultdict(lambda: defaultdict(list))

    for r in results:
        if r.get("meta", {}).get("gate_fail"):
            continue
        lang = r["meta"].get("lang_original", "?")
        corpus = r["meta"].get("corpus", "?")
        for w in r.get("windows", []):
            ws = w["window_size"]
            for fk, fv in w.get("features", {}).items():
                if isinstance(fv, (int, float)) and fv is not None and not math.isnan(fv):
                    data[fk][ws].append(fv)

    # Calculer CV par feature x window_size
    cv_matrix = {}
    for feat, by_ws in data.items():
        cv_matrix[feat] = {}
        for ws in sorted(by_ws.keys()):
            vals = by_ws[ws]
            if len(vals) < 3:
                continue
            m = mean(vals)
            sd = stdev(vals)
            cv = sd / abs(m) if abs(m) > 1e-10 else float('inf')
            cv_matrix[feat][ws] = {
                "mean": round(m, 6),
                "stdev": round(sd, 6),
                "cv": round(cv, 4),
                "n_samples": len(vals),
            }

    return cv_matrix


def compute_cv_by_lang(results: list) -> dict:
    """CV par feature x window_size x langue."""
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    for r in results:
        if r.get("meta", {}).get("gate_fail"):
            continue
        lang = r["meta"].get("lang_original", "?")
        for w in r.get("windows", []):
            ws = w["window_size"]
            for fk, fv in w.get("features", {}).items():
                if isinstance(fv, (int, float)) and fv is not None and not math.isnan(fv):
                    data[fk][ws][lang].append(fv)

    cv_by_lang = {}
    for feat, by_ws in data.items():
        cv_by_lang[feat] = {}
        for ws in sorted(by_ws.keys()):
            cv_by_lang[feat][ws] = {}
            for lang, vals in by_ws[ws].items():
                if len(vals) < 3:
                    continue
                m = mean(vals)
                sd = stdev(vals)
                cv = sd / abs(m) if abs(m) > 1e-10 else float('inf')
                cv_by_lang[feat][ws][lang] = {
                    "cv": round(cv, 4),
                    "n": len(vals),
                }

    return cv_by_lang


# ══════════════════════════════════════════════════════════════════════════
# DERIVE WINDOW_MIN / WINDOW_OPT
# ══════════════════════════════════════════════════════════════════════════

def derive_windows(cv_matrix: dict) -> dict:
    """
    Pour chaque feature, derive :
      window_min : plus petite fenetre ou CV < 0.30
      window_opt : fenetre ou la derivee du CV < 5% du CV precedent
      classification : LOCAL / ARC / MACRO

    Classification :
      LOCAL : window_opt <= 1500 (phrase/scene)
      ARC   : 1500 < window_opt <= 10000 (chapitre)
      MACRO : window_opt > 10000 (arc/oeuvre)
    """
    derived = {}

    for feat, by_ws in cv_matrix.items():
        sizes = sorted(by_ws.keys())
        if len(sizes) < 2:
            derived[feat] = {
                "window_min": None, "window_opt": None,
                "classification": "INSUFFICIENT_DATA",
                "cv_curve": {},
            }
            continue

        cvs = [(s, by_ws[s]["cv"]) for s in sizes if by_ws[s]["cv"] < float('inf')]
        if not cvs:
            derived[feat] = {
                "window_min": None, "window_opt": None,
                "classification": "INFINITE_CV",
                "cv_curve": {},
            }
            continue

        # window_min : premier ou CV < 0.30
        window_min = None
        for ws, cv in cvs:
            if cv < CV_THRESHOLD_MIN:
                window_min = ws
                break

        # window_opt : derivee < 5%
        window_opt = None
        for i in range(1, len(cvs)):
            ws_prev, cv_prev = cvs[i-1]
            ws_curr, cv_curr = cvs[i]
            if cv_prev > 0:
                deriv = abs(cv_curr - cv_prev) / cv_prev
                if deriv < CV_DERIV_THRESHOLD:
                    window_opt = ws_curr
                    break

        # Si pas de window_opt, prendre la derniere fenetre
        if window_opt is None and cvs:
            window_opt = cvs[-1][0]

        # Classification
        if window_opt is not None:
            if window_opt <= 1500:
                classification = "LOCAL"
            elif window_opt <= 10000:
                classification = "ARC"
            else:
                classification = "MACRO"
        else:
            classification = "UNPROVEN"

        derived[feat] = {
            "window_min": window_min,
            "window_opt": window_opt,
            "classification": classification,
            "cv_curve": {str(ws): round(cv, 4) for ws, cv in cvs},
        }

    return derived


# ══════════════════════════════════════════════════════════════════════════
# CV PAR TYPE DE TEXTE
# ══════════════════════════════════════════════════════════════════════════

def compute_cv_by_type(results: list) -> dict:
    """CV par feature x window_size x passage_type."""
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    for r in results:
        if r.get("meta", {}).get("gate_fail"):
            continue
        for w in r.get("windows", []):
            ws = w["window_size"]
            pt = w.get("passage_type", "UNKNOWN")
            for fk, fv in w.get("features", {}).items():
                if isinstance(fv, (int, float)) and fv is not None and not math.isnan(fv):
                    data[fk][ws][pt].append(fv)

    cv_by_type = {}
    for feat, by_ws in data.items():
        cv_by_type[feat] = {}
        for ws in sorted(by_ws.keys()):
            cv_by_type[feat][ws] = {}
            for pt, vals in by_ws[ws].items():
                if len(vals) < 3:
                    continue
                m = mean(vals)
                sd = stdev(vals)
                cv = sd / abs(m) if abs(m) > 1e-10 else float('inf')
                cv_by_type[feat][ws][pt] = {
                    "cv": round(cv, 4),
                    "n": len(vals),
                }

    return cv_by_type


# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════

def main(single_work: str = None):
    all_pdf = CATALOG_PDF
    all_pub = CATALOG_PUBLIC

    if single_work:
        all_pdf = [w for w in all_pdf if single_work.lower() in w["title"].lower()]
        all_pub = [w for w in all_pub if single_work.lower() in w["title"].lower()]
        log.info(f"MODE SINGLE: '{single_work}' -> {len(all_pdf)} PDF + {len(all_pub)} PD")

    total_works = len(all_pdf) + len(all_pub)
    log.info("="*70)
    log.info("OMEGA — Phase R1 — Analyse Multi-Fenetre")
    log.info(f"Corpus: {total_works} oeuvres")
    log.info(f"Fenetres: {len(WINDOWS)} tailles x {N_POSITIONS_PER_WINDOW} positions + chapitres reels")
    log.info(f"CV seuils: window_min CV<{CV_THRESHOLD_MIN}, window_opt deriv<{CV_DERIV_THRESHOLD}")
    log.info("="*70)

    results  = []
    rejected = []
    t_global = time.time()

    # Phase 1 : PDF
    if all_pdf:
        log.info(f"\n{'='*40} PDF ({len(all_pdf)}) {'='*40}")
        for i, work in enumerate(all_pdf, 1):
            log.info(f"\n[PDF {i}/{len(all_pdf)}]")
            try:
                r = process_work_r1(work)
                if r:
                    if r.get("meta", {}).get("gate_fail"):
                        rejected.append({"title": work["title"], "reason": r["meta"]["gate_fail"]})
                    else:
                        results.append(r)
            except Exception as e:
                log.error(f"  EXCEPTION: {e}")
                traceback.print_exc()
                rejected.append({"title": work.get("title", "?"), "reason": f"EXCEPTION:{e}"})

    # Phase 2 : Gutenberg
    if all_pub:
        log.info(f"\n{'='*40} GUTENBERG ({len(all_pub)}) {'='*40}")
        for i, work in enumerate(all_pub, 1):
            log.info(f"\n[PD {i}/{len(all_pub)}]")
            label = f"{work['author']}_{work['title'][:15]}"
            try:
                text = download_gutenberg(work["gutenberg_ids"], TXT_DIR, label)
                if not text:
                    rejected.append({"title": work["title"], "reason": "GUTENBERG_DOWNLOAD_FAIL"})
                    continue
                r = process_work_r1(work, text_override=text)
                if r:
                    if r.get("meta", {}).get("gate_fail"):
                        rejected.append({"title": work["title"], "reason": r["meta"]["gate_fail"]})
                    else:
                        results.append(r)
            except Exception as e:
                log.error(f"  EXCEPTION: {e}")
                traceback.print_exc()
                rejected.append({"title": work.get("title","?"), "reason": f"EXCEPTION:{e}"})

    elapsed_total = time.time() - t_global
    log.info(f"\n{'='*70}")
    log.info(f"CORPUS TERMINE: {len(results)}/{total_works} en {elapsed_total:.0f}s")
    log.info(f"Rejetees: {len(rejected)}")

    if not results:
        log.error("Aucun resultat — arret.")
        return

    # ─── Calcul CV ────────────────────────────────────────────────────
    log.info("\nCalcul CV(feature, window_size)...")
    cv_matrix  = compute_cv_matrix(results)
    cv_by_lang = compute_cv_by_lang(results)
    cv_by_type = compute_cv_by_type(results)

    log.info(f"Features mesurees: {len(cv_matrix)}")

    # ─── Derivation constantes ────────────────────────────────────────
    log.info("Derivation window_min / window_opt...")
    derived = derive_windows(cv_matrix)

    # Stats classification
    counts = defaultdict(int)
    for feat, d in derived.items():
        counts[d["classification"]] += 1
    log.info(f"Classification: {dict(counts)}")

    # ─── Sauvegarde ───────────────────────────────────────────────────
    metrologie = {
        "generated_at": datetime.now().isoformat(),
        "version": "r1_v1",
        "corpus_size": len(results),
        "rejected": len(rejected),
        "rejected_list": rejected,
        "protocol": {
            "windows": WINDOWS,
            "positions_per_window": N_POSITIONS_PER_WINDOW,
            "cv_threshold_min": CV_THRESHOLD_MIN,
            "cv_deriv_threshold": CV_DERIV_THRESHOLD,
            "total_elapsed_s": round(elapsed_total, 1),
        },
        "cv_matrix": cv_matrix,
        "cv_by_language": cv_by_lang,
        "cv_by_passage_type": cv_by_type,
        "derived_constants": derived,
        "classification_counts": dict(counts),
    }

    out_path = R1_OUTPUT_DIR / "OMEGA_METROLOGIE_EMPIRIQUE_v1.json"
    out_path.write_text(json.dumps(metrologie, ensure_ascii=False, indent=2), encoding="utf-8")
    sha = hashlib.sha256(out_path.read_bytes()).hexdigest()
    log.info(f"\nOMEGA_METROLOGIE_EMPIRIQUE_v1.json | SHA: {sha}")

    # ─── Resume console ──────────────────────────────────────────────
    print("\n" + "="*100)
    print("OMEGA R1 — CONSTANTES DERIVEES")
    print("="*100)
    print(f"{'Feature':<40} {'window_min':>10} {'window_opt':>10} {'class':>8}")
    print("-"*75)
    for feat in sorted(derived.keys()):
        d = derived[feat]
        wmin = str(d["window_min"]) if d["window_min"] else "N/A"
        wopt = str(d["window_opt"]) if d["window_opt"] else "N/A"
        cls  = d["classification"]
        print(f"  {feat:<38} {wmin:>10} {wopt:>10} {cls:>8}")
    print("="*100)


if __name__ == "__main__":
    single = sys.argv[1] if len(sys.argv) > 1 else None
    main(single_work=single)
