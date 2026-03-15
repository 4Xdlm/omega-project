#!/usr/bin/env python3
"""
OMEGA — Full Work Analyzer
Analyse le texte complet de grandes oeuvres (PDF) avec autopsie_v4.
Produit un tableau de classement sur F1-F23.

Usage: python full_work_analyzer.py
"""

import os
import sys
import json
import logging
import hashlib
import re
from pathlib import Path
from datetime import datetime

# ─── CONFIG ────────────────────────────────────────────────────────────────
PDF_DIR = Path(r"C:\Users\elric\Downloads\livre")

WORKS = [
    {"file": "Carrère, Emmanuel - L'Adversaire.pdf", "author": "carrere",   "title": "L'Adversaire",          "lang": "fr", "regime_hint": "VERBAL"},
    {"file": "la route.pdf",                          "author": "mccarthy",  "title": "La Route",               "lang": "fr", "regime_hint": "VERBAL"},
    {"file": "LAmant_-_Marguerite_Duras.pdf",         "author": "duras",     "title": "L'Amant",                "lang": "fr", "regime_hint": "VERBAL"},
    {"file": "pedro_paramo.pdf",                      "author": "rulfo",     "title": "Pedro Paramo",           "lang": "fr", "regime_hint": "NOMINAL"},
    {"file": "Toni-Morrison.-Beloved.pdf",            "author": "morrison",  "title": "Beloved",                "lang": "fr", "regime_hint": "NOMINAL"},
]

OUTPUT_DIR = Path("results_fullwork")
OUTPUT_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("full_work")

# ─── EXTRACTION PDF ─────────────────────────────────────────────────────────
def extract_text_pdfplumber(pdf_path: Path) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts)
    except Exception as e:
        log.error(f"pdfplumber failed: {e}")
        return ""

def extract_text_pymupdf(pdf_path: Path) -> str:
    try:
        import fitz
        doc = fitz.open(str(pdf_path))
        parts = []
        for page in doc:
            parts.append(page.get_text())
        doc.close()
        return "\n".join(parts)
    except Exception as e:
        log.error(f"pymupdf failed: {e}")
        return ""

def extract_pdf(pdf_path: Path) -> str:
    log.info(f"  Extraction: {pdf_path.name}")
    text = extract_text_pdfplumber(pdf_path)
    if len(text) < 20000:
        log.warning("  pdfplumber insuffisant, essai pymupdf...")
        text = extract_text_pymupdf(pdf_path)
    if len(text) < 20000:
        log.error(f"  ECHEC extraction — texte trop court ({len(text)} chars)")
        return ""
    log.info(f"  Extrait: {len(text):,} chars, ~{len(text.split()):,} mots")
    return text

def clean_text(text: str) -> str:
    """Nettoyage minimal — conserve la prose, retire artifacts PDF."""
    # Retirer numéros de page isolés
    text = re.sub(r'\n\s*\d{1,4}\s*\n', '\n', text)
    # Retirer headers/footers répétitifs (lignes < 5 mots qui se répètent)
    lines = text.split('\n')
    from collections import Counter
    line_counts = Counter(l.strip() for l in lines if 2 < len(l.strip()) < 60)
    repeated = {l for l, c in line_counts.items() if c > 5}
    lines = [l for l in lines if l.strip() not in repeated]
    text = '\n'.join(lines)
    # Normaliser espaces multiples
    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

# ─── ANALYSE AVEC AUTOPSIE V4 ───────────────────────────────────────────────
def analyze_with_autopsie(text: str, work: dict) -> dict:
    """Charge autopsie_v4 et analyse le texte complet."""
    try:
        # Import autopsie_v4 depuis le dossier courant
        import importlib.util
        spec = importlib.util.spec_from_file_location("autopsie_v4", "autopsie_v4.py")
        autopsie = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(autopsie)
    except Exception as e:
        log.error(f"  Impossible de charger autopsie_v4.py: {e}")
        log.error("  Verifier que autopsie_v4.py est dans le meme dossier")
        return {}

    log.info(f"  Analyse autopsie_v4 en cours ({len(text.split()):,} mots)...")
    try:
        meta_arg = {"lang_original": work.get("lang", "fr"), "work_id": work["author"] + "_FULL", "author": work["author"]}
        result = autopsie.analyze(text, work["file"], meta_arg)
        return result
    except Exception as e:
        log.error(f"  Erreur analyse: {e}")
        import traceback
        traceback.print_exc()
        return {}

# ─── SCORING & CLASSEMENT ───────────────────────────────────────────────────
# Features d'intérêt pour le classement prose
RANKING_FEATURES = [
    ("f21e_ritual_index",          "F21 Rituel (Van Peer)",       "higher=more incantatory"),
    ("f21f_ritual_level",          "F21 Niveau rituel",           "level"),
    ("f22f_literary_index",        "F22 Index littéraire (M&K)",  "higher=more literary"),
    ("f22g_lri_level",             "F22 Niveau littéraire",       "level"),
    ("f23d_literary_causal_score", "F23 Causalité implicite",     "higher=more literary"),
    ("f23e_graesser_zone",         "F23 Zone Graesser",           "level"),
    ("f19e_window_median",         "F19 Entropie locale",         "higher=richer"),
    ("f19h_intra_zone",            "F19 Zone intra",              "level"),
    ("f1_mean",                    "Longueur phrase (mots)",      "higher=longer"),
    ("f1a_rhythm_variance",        "Variance rythmique",          "higher=varied"),
    ("f5a_verb_density",           "Densité verbale",             "regime-dependent"),
    ("f16b_hapax_rate",            "Taux hapax",                  "higher=richer vocab"),
    ("f15a_local_repetition_rate", "Répétition locale",           "higher=more repetition"),
    ("f19a_approx_entropy",        "Entropie approx (global)",    "higher=varied"),
    ("style_regime",               "Régime stylistique",          "NOMINAL/VERBAL/MIXED"),
]

def build_ranking_table(results: list[dict]) -> dict:
    """Construit le tableau de classement inter-oeuvres."""
    ranking = {}
    for feat_id, feat_label, _ in RANKING_FEATURES:
        ranking[feat_id] = {"label": feat_label, "scores": {}}
        for r in results:
            author = r["meta"]["author"]
            features = r.get("features", {})
            # Chercher dans features ou dans le niveau supérieur
            val = features.get(feat_id, r.get(feat_id, None))
            if val is None:
                # Chercher dans nested dicts
                for k, v in features.items():
                    if isinstance(v, dict) and feat_id in v:
                        val = v[feat_id]
                        break
            ranking[feat_id]["scores"][author] = val

    return ranking

def print_ranking_table(ranking: dict, results: list[dict]):
    """Affiche le tableau dans le terminal."""
    authors = [r["meta"]["author"] for r in results]
    titles  = {r["meta"]["author"]: r["meta"]["title"] for r in results}

    print("\n" + "="*100)
    print("OMEGA — TABLEAU DE CLASSEMENT PROSE — OEUVRES COMPLETES")
    print("="*100)
    print(f"\n{'Feature':<35}", end="")
    for a in authors:
        print(f"  {titles[a][:15]:<16}", end="")
    print()
    print("-"*100)

    for feat_id, feat_label, _ in RANKING_FEATURES:
        scores = ranking.get(feat_id, {}).get("scores", {})
        print(f"{feat_label:<35}", end="")
        for a in authors:
            val = scores.get(a)
            if val is None:
                print(f"  {'N/A':<16}", end="")
            elif isinstance(val, float):
                print(f"  {val:<16.4f}", end="")
            elif isinstance(val, str):
                print(f"  {val[:14]:<16}", end="")
            else:
                print(f"  {str(val)[:14]:<16}", end="")
        print()

    print("="*100)

    # Top performers par feature numérique
    print("\n--- TOP PERFORMERS PAR FEATURE ---")
    numeric_feats = [
        ("f21e_ritual_index",          "Rituel (F21)"),
        ("f22f_literary_index",        "Litteraire (F22)"),
        ("f23d_literary_causal_score", "Causalite implicite (F23)"),
        ("f19e_window_median",         "Entropie locale (F19)"),
        ("f1a_rhythm_variance",        "Variance rythmique"),
        ("f16b_hapax_rate",            "Richesse lexicale"),
    ]
    for feat_id, label in numeric_feats:
        scores = ranking.get(feat_id, {}).get("scores", {})
        valid = {a: v for a, v in scores.items() if isinstance(v, (int, float)) and v is not None}
        if valid:
            ranked = sorted(valid.items(), key=lambda x: x[1], reverse=True)
            top = " > ".join(f"{titles[a]} ({v:.3f})" for a, v in ranked)
            print(f"  {label:<30}: {top}")

    print()

# ─── MAIN ────────────────────────────────────────────────────────────────────
def main():
    log.info("="*60)
    log.info("OMEGA — Full Work Analyzer")
    log.info("="*60)

    # Vérification PDF_DIR
    if not PDF_DIR.exists():
        log.error(f"Dossier PDF introuvable: {PDF_DIR}")
        sys.exit(1)

    results = []

    for work in WORKS:
        pdf_path = PDF_DIR / work["file"]
        log.info(f"\n{'─'*50}")
        log.info(f"Oeuvre: {work['title']} ({work['author']})")
        log.info(f"Fichier: {work['file']}")

        if not pdf_path.exists():
            log.error(f"PDF introuvable: {pdf_path}")
            continue

        # 1. Extraction texte
        raw_text = extract_pdf(pdf_path)
        if not raw_text:
            log.error("Extraction echouee — skip")
            continue

        # 2. Nettoyage
        text = clean_text(raw_text)
        word_count = len(text.split())
        char_count = len(text)

        # Hash du texte extrait
        text_sha = hashlib.sha256(text.encode()).hexdigest()[:16]
        log.info(f"  Texte nettoye: {word_count:,} mots | {char_count:,} chars | SHA: {text_sha}")

        # 3. Analyse autopsie_v4
        features = analyze_with_autopsie(text, work)

        # 4. Assemblage résultat
        result = {
            "meta": {
                "author":     work["author"],
                "title":      work["title"],
                "file":       work["file"],
                "mode":       "FULL_WORK",
                "word_count": word_count,
                "char_count": char_count,
                "text_sha":   text_sha,
                "analyzed_at": datetime.now().isoformat(),
                "regime_hint": work["regime_hint"],
            },
            "features": features,
        }

        # 5. Sauvegarde JSON
        out_path = OUTPUT_DIR / f"{work['author']}_FULL.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        out_sha = hashlib.sha256(out_path.read_bytes()).hexdigest()[:16]
        log.info(f"  Sauvegarde: {out_path.name} | SHA: {out_sha}")

        results.append(result)

    # ── TABLEAU DE CLASSEMENT ──
    if results:
        ranking = build_ranking_table(results)
        print_ranking_table(ranking, results)

        # Sauvegarde ranking JSON
        ranking_path = OUTPUT_DIR / "FULLWORK_RANKING.json"
        ranking_data = {
            "generated_at": datetime.now().isoformat(),
            "works_analyzed": len(results),
            "works": [r["meta"] for r in results],
            "ranking": ranking,
        }
        with open(ranking_path, "w", encoding="utf-8") as f:
            json.dump(ranking_data, f, ensure_ascii=False, indent=2)
        log.info(f"\nRanking sauvegarde: {ranking_path}")
    else:
        log.error("Aucun resultat produit.")

    log.info("\n" + "="*60)
    log.info(f"TERMINE — {len(results)}/{len(WORKS)} oeuvres analysees")
    log.info("="*60)

if __name__ == "__main__":
    main()

# Ce code ne sera pas exécuté — diagnostic intégré dans le script principal
