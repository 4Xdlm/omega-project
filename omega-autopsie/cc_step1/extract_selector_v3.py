#!/usr/bin/env python3
"""
OMEGA — Extract Selector v3.0
CC-STEP-1 : Extraction des scènes supplémentaires S4-S10

Principe :
  - Les scènes APEX/NEUTRE/SEUIL existent déjà dans extracts/romans/
  - Ce script extrait 7 scènes supplémentaires (S4-S10) depuis gutenberg_cache/
  - Stratégie de sélection : 7 positions distribuées dans l'espace du texte (déciles)
  - Cible : 10 scènes/œuvre soit 150 extraits romans (vs 45 actuels)

Positions décile :
  S4  → décile 1 (après incipit, corps du texte commence)
  S5  → décile 2
  S6  → décile 3 (premier tiers)
  S7  → décile 5 (milieu exact)
  S8  → décile 6
  S9  → décile 7
  S10 → décile 8 (avant dénouement)

Invariant : chaque scène = 550-800 mots, frontières de phrase respectées.
"""

import json
import hashlib
import re
import unicodedata
import logging
from pathlib import Path
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("omega_extract_v3.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("EXTRACT_V3")

TARGET_MIN = 550
TARGET_MAX = 800
TARGET_CENTER = 650

# Déciles de position pour S4-S10
SCENE_POSITIONS = {
    "S4":  0.10,  # 10% du texte
    "S5":  0.20,  # 20%
    "S6":  0.30,  # 30%
    "S7":  0.50,  # 50% (milieu)
    "S8":  0.60,  # 60%
    "S9":  0.70,  # 70%
    "S10": 0.80,  # 80%
}

# Gutenberg ID mapping (depuis corpus_manifest.json)
GUTENBERG_MAP = {
    "tchekhov_dame":       13415,
    "flaubert_bovary":     14155,
    "merimee_mateo":       14115,
    "austen_orgueil":      42671,
    "dostoievski_crime":   36034,
    "kafka_proces":        69327,
    "proust_swann":        2650,
    "joyce_ulysse":        4300,
    "diderot_jacques":     6560,
    "sterne_tristram":     1079,
    "hugo_miserables":     17489,
    "tolstoi_guerre":      2600,
    "dumas_monte_cristo":  17989,
    "melville_moby":       2701,
    "machado_bras_cubas":  55752,
}


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_gutenberg_header(text: str) -> str:
    """Supprime le header/footer Project Gutenberg."""
    # Header
    start_markers = [
        "*** START OF THE PROJECT GUTENBERG",
        "*** START OF THIS PROJECT GUTENBERG",
        "***START OF THE PROJECT GUTENBERG",
        "DÉBUT DU TEXTE LIBRE DU PROJET GUTENBERG",
        "Début du Projet Gutenberg",
    ]
    for marker in start_markers:
        idx = text.find(marker)
        if idx != -1:
            # Trouver fin de ligne
            end = text.find("\n", idx)
            if end != -1:
                text = text[end+1:]
            break

    # Footer
    end_markers = [
        "*** END OF THE PROJECT GUTENBERG",
        "*** END OF THIS PROJECT GUTENBERG",
        "***END OF THE PROJECT GUTENBERG",
        "FIN DU TEXTE LIBRE DU PROJET GUTENBERG",
        "End of the Project Gutenberg",
        "End of Project Gutenberg",
    ]
    for marker in end_markers:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]
            break

    return text.strip()


def split_into_sentences(text: str) -> list:
    """Segmentation simple sur ponctuation — sans spaCy pour vitesse."""
    # Découpe sur . ! ? suivi d'espace+majuscule ou fin de texte
    # Garde les guillemets et tirets ensemble
    pattern = r'(?<=[.!?])\s+(?=[A-ZÀÂÆÇÈÉÊËÎÏÔÙÛÜŸŒ«—])'
    raw = re.split(pattern, text)
    sents = []
    for s in raw:
        s = s.strip()
        if len(s.split()) >= 3:
            sents.append(s)
    return sents


def extract_window_at_position(sentences: list, position: float,
                                min_w: int = TARGET_MIN,
                                max_w: int = TARGET_MAX) -> str:
    """
    Extrait une fenêtre de min_w-max_w mots centrée sur position (0.0-1.0).
    Respecte les frontières de phrase.
    """
    total_sents = len(sentences)
    if total_sents < 10:
        return None

    center_idx = int(position * total_sents)
    center_idx = max(5, min(center_idx, total_sents - 5))

    # Expansion depuis le centre
    start = center_idx
    end = center_idx
    word_count = len(sentences[center_idx].split())

    # Expansion alternée gauche/droite
    left, right = center_idx - 1, center_idx + 1
    while word_count < min_w:
        added = False
        if left >= 0:
            word_count += len(sentences[left].split())
            start = left
            left -= 1
            added = True
        if word_count >= min_w:
            break
        if right < total_sents:
            word_count += len(sentences[right].split())
            end = right
            right += 1
            added = True
        if not added:
            break

    # Trim si trop long
    while word_count > max_w and (end - start) > 3:
        if abs(start - center_idx) > abs(end - center_idx):
            word_count -= len(sentences[start].split())
            start += 1
        else:
            word_count -= len(sentences[end].split())
            end -= 1

    result = " ".join(sentences[start:end+1])
    wc = len(result.split())

    if wc < min_w:
        # Fallback : prendre une fenêtre glissante fixe
        fallback_start = max(0, center_idx - 15)
        fallback_end = min(total_sents - 1, center_idx + 15)
        result = " ".join(sentences[fallback_start:fallback_end+1])

    return result


def check_no_overlap(new_text: str, existing_texts: list, min_unique: float = 0.7) -> bool:
    """
    Vérifie que la nouvelle scène ne chevauche pas trop les existantes.
    Principe : au moins min_unique des mots doivent être uniques vs chaque scène existante.
    """
    new_words = set(new_text.lower().split())
    for existing in existing_texts:
        existing_words = set(existing.lower().split())
        if not new_words or not existing_words:
            continue
        overlap = len(new_words & existing_words) / max(len(new_words), 1)
        if overlap > (1 - min_unique):
            return False
    return True


def load_existing_scenes(extract_dir: Path, work_id: str) -> list:
    """Charge les textes des scènes déjà extraites pour vérification overlap."""
    existing = []
    for stype in ["APEX", "NEUTRE", "SEUIL"]:
        fp = extract_dir / f"{work_id}_{stype}.txt"
        if fp.exists():
            try:
                existing.append(fp.read_text(encoding="utf-8").strip())
            except Exception:
                pass
    return existing


def process_work(work_id: str, gutenberg_id: int,
                 cache_dir: Path, extract_dir: Path) -> dict:
    """
    Pour une œuvre donnée : extrait S4-S10 depuis gutenberg_cache.
    """
    # Chercher le fichier cache
    cache_file = None
    for pattern in [f"{work_id}_{gutenberg_id}.txt",
                    f"{work_id}*.txt"]:
        matches = list(cache_dir.glob(pattern))
        if matches:
            cache_file = matches[0]
            break

    if not cache_file or not cache_file.exists():
        log.warning(f"Cache introuvable: {work_id} (gutenberg {gutenberg_id})")
        return {"work_id": work_id, "status": "NO_CACHE", "extracted": []}

    # Lire et nettoyer
    try:
        raw = cache_file.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            raw = cache_file.read_text(encoding="latin-1")
        except Exception as e:
            log.error(f"Lecture impossible {work_id}: {e}")
            return {"work_id": work_id, "status": "READ_ERROR", "extracted": []}

    text = normalize_text(clean_gutenberg_header(raw))
    sentences = split_into_sentences(text)

    log.info(f"{work_id}: {len(text.split())} mots, {len(sentences)} phrases segmentées")

    if len(sentences) < 20:
        log.warning(f"{work_id}: texte trop court après nettoyage ({len(sentences)} phrases)")
        return {"work_id": work_id, "status": "TOO_SHORT", "extracted": []}

    # Charger scènes existantes (pour contrôle overlap)
    existing_texts = load_existing_scenes(extract_dir, work_id)
    extracted_in_session = list(existing_texts)

    results = []
    for scene_type, position in SCENE_POSITIONS.items():
        # Vérifier si déjà extrait
        out_file = extract_dir / f"{work_id}_{scene_type}.txt"
        if out_file.exists():
            log.info(f"  {scene_type}: déjà existant — skip")
            results.append({"scene": scene_type, "status": "EXISTS"})
            extracted_in_session.append(out_file.read_text(encoding="utf-8").strip())
            continue

        # Extraction
        window = extract_window_at_position(sentences, position)
        if not window or len(window.split()) < 300:
            log.warning(f"  {scene_type}: extraction échouée (trop court)")
            results.append({"scene": scene_type, "status": "EXTRACT_FAILED"})
            continue

        # Vérification overlap
        if not check_no_overlap(window, extracted_in_session):
            log.warning(f"  {scene_type}: overlap trop important — ajustement position")
            # Essayer position décalée de ±0.05
            adjusted = position + 0.07
            window = extract_window_at_position(sentences, min(adjusted, 0.95))
            if not window or not check_no_overlap(window, extracted_in_session):
                log.warning(f"  {scene_type}: overlap persistant — skip")
                results.append({"scene": scene_type, "status": "OVERLAP_SKIP"})
                continue

        # Sauvegarder
        wc = len(window.split())
        sha = hashlib.sha256(window.encode("utf-8")).hexdigest()

        out_file.write_text(window, encoding="utf-8")
        sha_file = extract_dir / f"{work_id}_{scene_type}.sha256"
        sha_file.write_text(sha, encoding="utf-8")

        extracted_in_session.append(window)
        log.info(f"  {scene_type}: {wc} mots | pos={position:.0%} | SHA={sha[:12]}")
        results.append({
            "scene": scene_type,
            "status": "OK",
            "word_count": wc,
            "position": position,
            "sha256": sha,
        })

    return {
        "work_id": work_id,
        "status": "PROCESSED",
        "total_scenes": len([r for r in results if r["status"] in ("OK", "EXISTS")]),
        "extracted": results,
    }


def main():
    manifest_path = Path("ssot/corpus_manifest.json")
    cache_dir = Path("gutenberg_cache")
    extract_dir = Path("extracts/romans")
    report_dir = Path("results_v3")

    if not manifest_path.exists():
        log.error(f"Manifest introuvable: {manifest_path}")
        return

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    extract_dir.mkdir(parents=True, exist_ok=True)
    report_dir.mkdir(parents=True, exist_ok=True)

    log.info("OMEGA Extract Selector v3.0")
    log.info(f"Cible : 7 nouvelles scènes/œuvre (S4-S10)")
    log.info(f"Romans : {len(manifest['romans'])}")

    report = {
        "run_date": datetime.now().isoformat(),
        "version": "3.0.0",
        "strategy": "DECILE_POSITION_7_SCENES",
        "works": [],
    }

    total_new = 0
    for entry in manifest["romans"]:
        wid = entry.get("work_id")
        gid = GUTENBERG_MAP.get(wid)
        if gid is None:
            log.warning(f"Pas de Gutenberg ID pour {wid}")
            continue

        result = process_work(wid, gid, cache_dir, extract_dir)
        report["works"].append(result)
        new = len([r for r in result.get("extracted", []) if r.get("status") == "OK"])
        total_new += new
        log.info(f"{wid}: {result['total_scenes']} scènes totales | +{new} nouvelles")

    report["total_new_extracts"] = total_new
    report["total_works"] = len(manifest["romans"])

    sha = hashlib.sha256(
        json.dumps(report, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()
    report["sha256"] = sha

    report_path = report_dir / "EXTRACT_REPORT_v3.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    log.info(f"\n{'='*60}")
    log.info(f"TERMINÉ — {total_new} nouveaux extraits produits")
    log.info(f"Rapport: {report_path}")
    log.info(f"SHA256: {sha[:24]}")
    log.info(f"{'='*60}")


if __name__ == "__main__":
    main()
