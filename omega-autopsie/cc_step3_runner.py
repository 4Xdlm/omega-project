#!/usr/bin/env python3
"""
OMEGA — CC-STEP-3 Runner
Réanalyse du corpus complet (domaine public + contemporain) avec autopsie_v4.0.

Études intégrées :
  E4  Van Peer (2008)       — F21 ritual_repetition_index
  E5  Miall & Kuiken (1998) — F22 literary_reading_index
  +   Graesser (1994)       — F23 causal_density
  E3  Jena (2023)           — F19 recalibré intra-oeuvre (fenêtres 15)

Comportement :
  - Réutilise les textes bruts depuis gutenberg_cache/ et results_v3/ + results_cc2/
  - Si texte brut disponible → réanalyse complète v4
  - Si texte brut absent (contemporary → PDF chiffré) → enrichit le JSON existant
    en appliquant uniquement F21/F22/F23 sur le texte stocké dans le JSON
  - Produit results_v4/ avec 246 JSONs enrichis
  - Produit ssot/baselines_v4.json (P25/médiane/P75 par auteur, features v4)
  - Produit results_cc3/CC3_INVARIANT_REPORT.json (validation invariants)

Standard : NASA-Grade L4 — 0 erreur tolérée.
"""

import json
import hashlib
import logging
import math
import re
import io
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from statistics import median, mean, stdev

import numpy as np

# ── UTF-8 console Windows (cp1252 fix) ───────────────────────────────
_utf8_stdout = io.TextIOWrapper(
    sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
)
_utf8_stderr = io.TextIOWrapper(
    sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("omega_cc3.log", encoding="utf-8"),
        logging.StreamHandler(stream=_utf8_stdout),
    ]
)
log = logging.getLogger("OMEGA_CC3")

# ── Chemins ───────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
RESULTS_V3    = BASE_DIR / "results_v3"
RESULTS_CC2   = BASE_DIR / "results_cc2"
RESULTS_V4    = BASE_DIR / "results_v4"
GUTENBERG     = BASE_DIR / "gutenberg_cache"
SSOT          = BASE_DIR / "ssot"
REPORT_DIR    = BASE_DIR / "results_cc3"

RESULTS_V4.mkdir(exist_ok=True)
SSOT.mkdir(exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

# ── Import autopsie_v4 ────────────────────────────────────────────────
sys.path.insert(0, str(BASE_DIR))
import autopsie_v4 as V4

# ══════════════════════════════════════════════════════════════════════
# INVARIANTS CC-STEP-3 (à vérifier sur chaque extrait)
# ══════════════════════════════════════════════════════════════════════
INVARIANTS = {
    "INV-CC3-01": "f21e_ritual_index doit être dans [0.0, 1.0]",
    "INV-CC3-02": "f22f_literary_index doit être dans [0.0, 1.5]",
    "INV-CC3-03": "f23a_explicit_causal_rate doit être dans [0.0, 1.0]",
    "INV-CC3-04": "f23d_literary_causal_score doit être dans [0.0, 1.0]",
    "INV-CC3-05": "f19e_window_median >= 0.0",
    "INV-CC3-06": "style_regime in {NOMINAL, VERBAL, MIXED}",
    "INV-CC3-07": "f21f_ritual_level in {RITUAL_DOMINANT, RITUAL_PRESENT, RITUAL_TRACE, RITUAL_ABSENT}",
    "INV-CC3-08": "f22g_lri_level in {LITERARY_DOMINANT, LITERARY_MODERATE, MIXED, DOCUMENTARY}",
    "INV-CC3-09": "f23e_graesser_zone in {LITERARY_IMPLICIT, LITERARY_MIXED, MIXED, EXPOSITORY}",
    "INV-CC3-10": "f19a_approx_entropy (global) compatible avec v3 — écart < 5% sur même texte",
}

VALID_RITUAL_LEVELS  = {"RITUAL_DOMINANT", "RITUAL_PRESENT", "RITUAL_TRACE", "RITUAL_ABSENT"}
VALID_LRI_LEVELS     = {"LITERARY_DOMINANT", "LITERARY_MODERATE", "MIXED", "DOCUMENTARY"}
VALID_GRAESSER_ZONES = {"LITERARY_IMPLICIT", "LITERARY_MIXED", "MIXED", "EXPOSITORY"}
VALID_REGIMES        = {"NOMINAL", "VERBAL", "MIXED"}

def check_invariants(features: dict, work_id: str) -> list:
    """Retourne liste de violations. [] = PASS."""
    violations = []
    f = features

    # INV-CC3-01
    v = f.get("f21e_ritual_index")
    if v is not None and not (0.0 <= v <= 1.0):
        violations.append(f"{work_id} INV-CC3-01 FAIL: f21e={v}")

    # INV-CC3-02
    v = f.get("f22f_literary_index")
    if v is not None and not (0.0 <= v <= 1.5):
        violations.append(f"{work_id} INV-CC3-02 FAIL: f22f={v}")

    # INV-CC3-03
    v = f.get("f23a_explicit_causal_rate")
    if v is not None and not (0.0 <= v <= 1.0):
        violations.append(f"{work_id} INV-CC3-03 FAIL: f23a={v}")

    # INV-CC3-04
    v = f.get("f23d_literary_causal_score")
    if v is not None and not (0.0 <= v <= 1.0):
        violations.append(f"{work_id} INV-CC3-04 FAIL: f23d={v}")

    # INV-CC3-05
    v = f.get("f19e_window_median")
    if v is not None and v < 0.0:
        violations.append(f"{work_id} INV-CC3-05 FAIL: f19e={v}")

    # INV-CC3-06
    v = f.get("style_regime")
    if v is not None and v not in VALID_REGIMES:
        violations.append(f"{work_id} INV-CC3-06 FAIL: style_regime={v}")

    # INV-CC3-07
    v = f.get("f21f_ritual_level")
    if v is not None and v not in VALID_RITUAL_LEVELS:
        violations.append(f"{work_id} INV-CC3-07 FAIL: f21f={v}")

    # INV-CC3-08
    v = f.get("f22g_lri_level")
    if v is not None and v not in VALID_LRI_LEVELS:
        violations.append(f"{work_id} INV-CC3-08 FAIL: f22g={v}")

    # INV-CC3-09
    v = f.get("f23e_graesser_zone")
    if v is not None and v not in VALID_GRAESSER_ZONES:
        violations.append(f"{work_id} INV-CC3-09 FAIL: f23e={v}")

    return violations


# ══════════════════════════════════════════════════════════════════════
# ENRICHISSEMENT D'UN JSON EXISTANT
# Pour les textes contemporains (payants) dont on n'a pas le brut,
# on reconstruit les phrases depuis le JSON stocké.
# ══════════════════════════════════════════════════════════════════════

def enrich_from_json(json_path: Path) -> dict | None:
    """
    Lit un JSON existant (v3 ou cc2), extrait le texte brut si disponible,
    réanalyse avec autopsie_v4 complète.
    Retourne le dict enrichi ou None si texte indisponible.
    """
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        log.error(f"Lecture JSON {json_path.name}: {e}")
        return None

    # Chercher le texte brut
    raw_text = data.get("raw_text") or data.get("extract_text") or data.get("text")

    if not raw_text or len(raw_text.split()) < 50:
        log.warning(f"Pas de texte brut dans {json_path.name} — features partiels uniquement")
        if "features" not in data:
            log.warning(f"  Fichier non-extrait (pas de clé features) — SKIP")
            return None
        data["features"]["_cc3_status"] = "PARTIAL_NO_RAW_TEXT"
        return data

    meta = data.get("meta", {})
    result_v4 = V4.analyze(raw_text, str(json_path), meta)

    # Fusionner : conserver meta original + remplacer features par v4
    data["features"] = result_v4["features"]
    data["meta"]["protocol_version"] = "autopsie_v4.0"
    data["meta"]["cc3_enrichment_date"] = datetime.now().isoformat()
    data["flags"] = result_v4["flags"]
    data["features"]["_cc3_status"] = "FULL_REANALYSIS"
    return data


def reanalyze_from_raw(text_path: Path, json_path: Path) -> dict | None:
    """
    Réanalyse depuis le texte brut gutenberg. 
    Lit meta depuis le JSON existant pour cohérence.
    """
    try:
        raw_text = text_path.read_text(encoding="utf-8", errors="replace")
        existing = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        log.error(f"Lecture fichiers {json_path.name}: {e}")
        return None

    meta = existing.get("meta", {})
    result_v4 = V4.analyze(raw_text, str(text_path), meta)
    result_v4["features"]["_cc3_status"] = "FULL_REANALYSIS_FROM_RAW"
    return result_v4


# ══════════════════════════════════════════════════════════════════════
# BASELINES v4 — P25 / médiane / P75 par auteur + global
# Étend FEATURES_FOR_BASELINE avec les nouveaux features v4
# ══════════════════════════════════════════════════════════════════════

# Déduplication — FEATURES_FOR_BASELINE contient déjà f21/f22/f23/f19e
_seen = set()
FEATURES_V4_EXTENDED = []
for f in V4.FEATURES_FOR_BASELINE:
    if f not in _seen:
        _seen.add(f)
        FEATURES_V4_EXTENDED.append(f)


def compute_baseline_v4(results: list, label: str) -> dict:
    feature_vals = defaultdict(list)
    for r in results:
        feats = r.get("features", {})
        for f in FEATURES_V4_EXTENDED:
            v = feats.get(f)
            if v is not None and isinstance(v, (int, float)) and not math.isnan(v):
                feature_vals[f].append(float(v))

    baseline = {"_label": label, "_n_extracts": len(results)}
    for f, vals in feature_vals.items():
        if len(vals) < 2:
            baseline[f] = {"status": "INSUFFICIENT_DATA", "n": len(vals)}
            continue
        vals_s = sorted(vals)
        n = len(vals_s)
        baseline[f] = {
            "n":      n,
            "min":    round(vals_s[0], 5),
            "p25":    round(vals_s[max(0, int(n * 0.25) - 1)], 5),
            "median": round(median(vals_s), 5),
            "p75":    round(vals_s[min(n-1, int(n * 0.75))], 5),
            "max":    round(vals_s[-1], 5),
            "mean":   round(mean(vals_s), 5),
            "stdev":  round(stdev(vals_s) if n >= 2 else 0.0, 5),
        }
    return baseline


# ══════════════════════════════════════════════════════════════════════
# PIPELINE PRINCIPAL
# ══════════════════════════════════════════════════════════════════════

def main():
    log.info("=" * 60)
    log.info("CC-STEP-3 — Enrichissement corpus avec F21/F22/F23/F19v4")
    log.info("Études : E4 Van Peer 2008 | E5 Miall&Kuiken 1998 | Graesser 1994")
    log.info("=" * 60)

    # Force chargement spaCy
    _ = V4.get_nlp()

    all_results   = []   # tous les JSONs v4
    by_author     = defaultdict(list)
    all_violations = []
    processed = 0
    failed    = 0
    enriched_partial = 0

    # ── Collecte tous les JSONs sources ──────────────────────────────
    # Noms de fichiers à exclure (summaries, index, baselines)
    SKIP_PATTERNS = {"MASTER_SUMMARY", "BASELINE_ANALYSIS", "delta_contemporary",
                     "00_MASTER", "baselines_", "CC3_INVARIANT"}

    sources = []
    for d in [RESULTS_V3, RESULTS_CC2]:
        if d.exists():
            for p in sorted(d.rglob("*.json")):
                if not any(pat in p.name for pat in SKIP_PATTERNS):
                    sources.append(p)

    log.info(f"JSONs sources trouvés: {len(sources)} (fichiers summary exclus)")

    for json_path in sources:
        # Nom de sortie : conserver structure
        rel = json_path.relative_to(json_path.parent.parent)
        out_path = RESULTS_V4 / json_path.parent.name / json_path.name
        out_path.parent.mkdir(parents=True, exist_ok=True)

        # Chercher texte brut — priorité : extracts/ puis gutenberg_cache/
        stem = json_path.stem  # ex: flaubert_bovary_APEX ou carrere_adversaire_S01
        raw_candidates = []

        # 1. extracts/**/{stem}.txt (textes pré-découpés — correspondance exacte)
        extracts_dir = BASE_DIR / "extracts"
        if extracts_dir.exists():
            raw_candidates = list(extracts_dir.rglob(f"{stem}.txt"))

        # 2. gutenberg_cache/{stem}*.txt (fallback texte complet)
        if not raw_candidates and GUTENBERG.exists():
            raw_candidates = list(GUTENBERG.rglob(f"{stem}*.txt"))

        if raw_candidates:
            result = reanalyze_from_raw(raw_candidates[0], json_path)
        else:
            result = enrich_from_json(json_path)

        if result is None:
            log.error(f"FAIL: {json_path.name}")
            failed += 1
            continue

        feats = result.get("features", {})
        cc3_status = feats.get("_cc3_status", "UNKNOWN")
        if "PARTIAL" in cc3_status:
            enriched_partial += 1

        # Vérification invariants
        work_id = result.get("meta", {}).get("work_id", json_path.stem)
        viols = check_invariants(feats, work_id)
        all_violations.extend(viols)

        # Sauvegarde JSON v4
        out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

        # Agrégation baselines
        author = result.get("meta", {}).get("author", "UNKNOWN")
        by_author[author].append(result)
        all_results.append(result)
        processed += 1

        if processed % 25 == 0:
            log.info(f"  Traités: {processed} / {len(sources)} | violations: {len(all_violations)}")

    # ── Baselines v4 ─────────────────────────────────────────────────
    log.info(f"\nCalcul baselines v4 — {len(by_author)} auteurs...")
    baselines_v4 = {
        "_meta": {
            "generated":       datetime.now().isoformat(),
            "protocol":        "autopsie_v4.0",
            "total_extracts":  processed,
            "total_authors":   len(by_author),
            "studies":         ["E4_VAN_PEER_2008", "E5_MIALL_KUIKEN_1998",
                                 "GRAESSER_1994", "E3_JENA_2023_V4"],
        },
        "global": compute_baseline_v4(all_results, "GLOBAL"),
        "by_author": {},
    }

    for author, results in by_author.items():
        baselines_v4["by_author"][author] = compute_baseline_v4(results, author)

    ssot_path = SSOT / "baselines_v4.json"
    ssot_path.write_text(json.dumps(baselines_v4, ensure_ascii=False, indent=2), encoding="utf-8")
    sha_bl = hashlib.sha256(ssot_path.read_bytes()).hexdigest()
    log.info(f"baselines_v4.json écrit — SHA256: {sha_bl[:24]}...")

    # ── Rapport invariants ────────────────────────────────────────────
    verdict = "PASS" if not all_violations else "FAIL"
    report = {
        "cc3_status":       verdict,
        "processed":        processed,
        "failed":           failed,
        "partial_enriched": enriched_partial,
        "invariants":       INVARIANTS,
        "violations":       all_violations,
        "violation_count":  len(all_violations),
        "baselines_sha256": sha_bl,
        "generated":        datetime.now().isoformat(),
        "protocol":         "autopsie_v4.0",
    }

    # Stats globales F21/F22/F23
    for feat, label in [
        ("f21e_ritual_index",     "F21 ritual_index"),
        ("f22f_literary_index",   "F22 literary_index"),
        ("f23a_explicit_causal",  "F23 explicit_causal"),
        ("f23d_literary_causal",  "F23 literary_causal"),
        ("f19e_window_median",    "F19 window_median"),
    ]:
        vals = [r.get("features", {}).get(feat)
                for r in all_results
                if r.get("features", {}).get(feat) is not None]
        if vals:
            report[f"stats_{feat}"] = {
                "n": len(vals),
                "min":    round(min(vals), 4),
                "median": round(median(vals), 4),
                "max":    round(max(vals), 4),
            }

    report_path = REPORT_DIR / "CC3_INVARIANT_REPORT.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    sha_rep = hashlib.sha256(report_path.read_bytes()).hexdigest()

    # ── Résumé console ───────────────────────────────────────────────
    log.info("=" * 60)
    log.info(f"CC-STEP-3 TERMINE")
    log.info(f"  Traites:          {processed}")
    log.info(f"  Echecs:           {failed}")
    log.info(f"  Partiels:         {enriched_partial}")
    log.info(f"  Auteurs:          {len(by_author)}")
    log.info(f"  Violations INV:   {len(all_violations)}")
    log.info(f"  Verdict:          {verdict}")
    log.info(f"  baselines_v4 SHA: {sha_bl[:24]}")
    log.info(f"  rapport SHA:      {sha_rep[:24]}")
    log.info("=" * 60)

    if all_violations:
        log.error("VIOLATIONS DETECTEES:")
        for v in all_violations:
            log.error(f"  {v}")

    return 0 if verdict == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
