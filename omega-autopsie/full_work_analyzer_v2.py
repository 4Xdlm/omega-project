#!/usr/bin/env python3
"""
OMEGA — Full Work Analyzer v2
Analyse les 30 oeuvres completes du corpus Francky.

Stratégie :
- Texte complet → autopsie_v4 (features F1-F23)
- FR : 40 scènes de 300 mots extraites aléatoirement (corpus enrichi)
- EN/IT : 15 scènes de 300 mots
- Tableau de classement inter-oeuvres sur F21/F22/F23/F19/F1
- Sauvegarde JSON par oeuvre + ranking global

Usage: python full_work_analyzer_v2.py
"""

import os, sys, json, hashlib, re, random, logging, importlib.util
from pathlib import Path
from datetime import datetime
from collections import Counter

# ─── CONFIG ────────────────────────────────────────────────────────────────
PDF_DIR    = Path(r"C:\Users\elric\Downloads\livre")
OUTPUT_DIR = Path("results_fullwork_v2")
SCENES_DIR = Path("scenes_fullwork")
OUTPUT_DIR.mkdir(exist_ok=True)
SCENES_DIR.mkdir(exist_ok=True)

# Mots par scène
SCENE_WORDS = 300
# Scènes extraites par langue
SCENES_FR = 40
SCENES_EN = 15
SCENES_IT = 15

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("fullwork_v2.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("fullwork_v2")

# ─── CATALOGUE DES 30 OEUVRES ───────────────────────────────────────────────
# lang: fr/en/it (langue du PDF — pas de l'original)
# lang_original: langue de composition originale
# scenes: FR=40, EN/IT=15

WORKS = [
    # ══════════════════════════════════════════════════
    # FRANÇAIS — priorité haute — 40 scènes chacun
    # ══════════════════════════════════════════════════
    {
        "file": "CarrŠre, Emmanuel - L'Adversaire.pdf",
        "author": "carrere", "title": "L'Adversaire",
        "lang": "fr", "lang_original": "fr",
        "year": 2000, "category": "roman",
        "fallback_files": ["Carrère, Emmanuel - L'Adversaire.pdf"],
    },
    {
        "file": "LAmant_-_Marguerite_Duras.pdf",
        "author": "duras", "title": "L'Amant",
        "lang": "fr", "lang_original": "fr",
        "year": 1984, "category": "roman",
    },
    {
        "file": "Dora_Bruder_-_Modiano_Patrick.pdf",
        "author": "modiano", "title": "Dora Bruder",
        "lang": "fr", "lang_original": "fr",
        "year": 1997, "category": "roman",
    },
    {
        "file": "Les_Annees_-_Annie_Ernaux.pdf",
        "author": "ernaux", "title": "Les Années",
        "lang": "fr", "lang_original": "fr",
        "year": 2008, "category": "roman",
    },
    {
        "file": "Letranger_French_Edition_-_Albert_Camus.pdf",
        "author": "camus", "title": "L'Étranger",
        "lang": "fr", "lang_original": "fr",
        "year": 1942, "category": "roman",
    },
    {
        "file": "LInsoutenable_Legerete_de_letre_French_Edition_-_Milan_Kundera.pdf",
        "author": "kundera", "title": "L'Insoutenable Légèreté de l'Être",
        "lang": "fr", "lang_original": "cs",
        "year": 1984, "category": "roman",
    },
    {
        "file": "La_Chambre_de_Giovanni_French_Edition_-_James_Baldwin.pdf",
        "author": "baldwin", "title": "La Chambre de Giovanni",
        "lang": "fr", "lang_original": "en",
        "year": 1956, "category": "roman",
    },
    {
        "file": "Lamie_prodigieuse_-_Elena_Ferrante.pdf",
        "author": "ferrante", "title": "L'Amie Prodigieuse",
        "lang": "fr", "lang_original": "it",
        "year": 2011, "category": "roman",
    },
    {
        "file": "Le_nom_de_la_rose_French_Edition_-_Umberto_Eco.pdf",
        "author": "eco", "title": "Le Nom de la Rose",
        "lang": "fr", "lang_original": "it",
        "year": 1980, "category": "roman",
    },
    {
        "file": "Les_Vestiges_du_Jour_French_Edition_-_Ishiguro_Kazuo.pdf",
        "author": "ishiguro", "title": "Les Vestiges du Jour",
        "lang": "fr", "lang_original": "en",
        "year": 1989, "category": "roman",
    },
    {
        "file": "le-bruit-et-la-fureur.pdf",
        "author": "faulkner", "title": "Le Bruit et la Fureur",
        "lang": "fr", "lang_original": "en",
        "year": 1929, "category": "roman",
    },
    {
        "file": "Molloy_-_Samuel_Beckett.pdf",
        "author": "beckett", "title": "Molloy",
        "lang": "fr", "lang_original": "fr",
        "year": 1951, "category": "roman",
    },
    {
        "file": "pedro_paramo.pdf",
        "author": "rulfo", "title": "Pedro Páramo",
        "lang": "fr", "lang_original": "es",
        "year": 1955, "category": "roman",
    },
    {
        "file": "Cent_ans_de_solitude__Gabriel_Garcia_Marquez.pdf",
        "author": "marquez", "title": "Cent Ans de Solitude",
        "lang": "fr", "lang_original": "es",
        "year": 1967, "category": "roman",
    },
    {
        "file": "Toni-Morrison.-Beloved.pdf",
        "author": "morrison", "title": "Beloved",
        "lang": "fr", "lang_original": "en",
        "year": 1987, "category": "roman",
    },
    {
        "file": "la-route-de-cormac-mccarthy.pdf",
        "author": "mccarthy_fr", "title": "La Route",
        "lang": "fr", "lang_original": "en",
        "year": 2006, "category": "roman",
        "fallback_files": ["la route .pdf"],
    },
    # ══════════════════════════════════════════════════
    # ANGLAIS — 15 scènes chacun
    # ══════════════════════════════════════════════════
    {
        "file": "Blood_Meridian_-_Cormac_McCarthy.pdf",
        "author": "mccarthy_en", "title": "Blood Meridian",
        "lang": "en", "lang_original": "en",
        "year": 1985, "category": "roman",
    },
    {
        "file": "2666_-_Roberto_Bolano.pdf",
        "author": "bolano", "title": "2666",
        "lang": "en", "lang_original": "es",
        "year": 2004, "category": "roman",
    },
    {
        "file": "Fury_-_Salman_Rushdie.pdf",
        "author": "rushdie", "title": "Fury",
        "lang": "en", "lang_original": "en",
        "year": 2001, "category": "roman",
    },
    {
        "file": "Good_Bones_-_Margaret_Atwood.pdf",
        "author": "atwood", "title": "Good Bones",
        "lang": "en", "lang_original": "en",
        "year": 1992, "category": "nouvelles",
    },
    {
        "file": "Mrs_Dalloway_-_Virginia_Woolf.pdf",
        "author": "woolf", "title": "Mrs Dalloway",
        "lang": "en", "lang_original": "en",
        "year": 1925, "category": "roman",
    },
    {
        "file": "Lolita__Vladimir_Nabokov.pdf",
        "author": "nabokov", "title": "Lolita",
        "lang": "en", "lang_original": "en",
        "year": 1955, "category": "roman",
    },
    {
        "file": "Molloy-Malone-Dies-The-Unnamable.pdf",
        "author": "beckett_en", "title": "Molloy/Malone Dies/The Unnamable",
        "lang": "en", "lang_original": "en",
        "year": 1958, "category": "roman",
    },
    {
        "file": "Underworld_-_Don_Delillo.pdf",
        "author": "delillo", "title": "Underworld",
        "lang": "en", "lang_original": "en",
        "year": 1997, "category": "roman",
    },
    {
        "file": "V_-_Thomas_Pynchon.pdf",
        "author": "pynchon", "title": "V.",
        "lang": "en", "lang_original": "en",
        "year": 1963, "category": "roman",
    },
    {
        "file": "the_hobbit_an_unexpected_journey_-_J_R_R_Tolkien.pdf",
        "author": "tolkien", "title": "The Hobbit",
        "lang": "en", "lang_original": "en",
        "year": 1937, "category": "roman",
    },
    # ══════════════════════════════════════════════════
    # ANGLAIS — aventure/fantasy (ref non-literaire)
    # ══════════════════════════════════════════════════
    {
        "file": "Duke_Elric_-_Michael_Moorcock.pdf",
        "author": "moorcock_duke", "title": "Duke Elric",
        "lang": "en", "lang_original": "en",
        "year": 2005, "category": "fantasy",
    },
    {
        "file": "The_Stealer_of_Souls_-_Michael_Moorcock.pdf",
        "author": "moorcock_souls", "title": "The Stealer of Souls",
        "lang": "en", "lang_original": "en",
        "year": 1963, "category": "fantasy",
    },
    {
        "file": "The_Queens_Necklace_-_Italo_Calvino.pdf",
        "author": "calvino", "title": "The Queen's Necklace",
        "lang": "en", "lang_original": "it",
        "year": 1952, "category": "roman",
    },
]

# ─── EXTRACTION PDF ─────────────────────────────────────────────────────────
def extract_pdf(pdf_path: Path) -> str:
    try:
        import fitz  # pymupdf
        doc = fitz.open(str(pdf_path))
        parts = []
        for page in doc:
            t = page.get_text()
            if t and t.strip():
                parts.append(t)
        doc.close()
        return "\n".join(parts)
    except Exception as e:
        log.error(f"  pymupdf failed: {e}")
        return ""

def find_pdf(work: dict) -> Path | None:
    """Cherche le PDF dans PDF_DIR avec fallbacks."""
    candidates = [work["file"]] + work.get("fallback_files", [])
    for fname in candidates:
        p = PDF_DIR / fname
        if p.exists():
            return p
    # Recherche floue sur le nom d'auteur
    author_hint = work["author"].split("_")[0].lower()
    for p in PDF_DIR.glob("*.pdf"):
        if author_hint in p.name.lower():
            log.warning(f"  Fallback flou: {p.name}")
            return p
    return None

def clean_text(raw: str) -> str:
    """Nettoie les artefacts PDF sans toucher à la prose."""
    lines = raw.split("\n")
    # Compter les lignes répétitives (headers/footers)
    counts = Counter(l.strip() for l in lines if 3 < len(l.strip()) < 80)
    repeated = {l for l, c in counts.items() if c > 8}
    # Retirer numéros de page isolés et lignes répétitives
    cleaned = []
    for l in lines:
        s = l.strip()
        if re.match(r"^\d{1,4}$", s):
            continue
        if s in repeated:
            continue
        cleaned.append(l)
    text = "\n".join(cleaned)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# ─── EXTRACTION DE SCÈNES ───────────────────────────────────────────────────
def extract_scenes(text: str, n_scenes: int, words_per_scene: int = SCENE_WORDS) -> list[str]:
    """
    Extrait n_scenes scènes de words_per_scene mots chacune.
    Stratégie : découpage en segments, sélection aléatoire stratifiée.
    Évite début (préface) et fin (index) — garde le coeur du texte.
    """
    words = text.split()
    total = len(words)

    # Ignorer les 5% du début (couverture/préface) et 3% de la fin (index)
    start_cut = int(total * 0.05)
    end_cut   = int(total * 0.97)
    core_words = words[start_cut:end_cut]
    core_total = len(core_words)

    if core_total < words_per_scene * 2:
        # Texte trop court — retourner ce qu'on peut
        return [" ".join(core_words[:words_per_scene])] if core_words else []

    # Découper en segments non-chevauchants
    step = max(words_per_scene, core_total // (n_scenes * 2))
    segments = []
    pos = 0
    while pos + words_per_scene <= core_total:
        seg = " ".join(core_words[pos:pos + words_per_scene])
        segments.append((pos, seg))
        pos += step

    if not segments:
        return []

    # Sélection stratifiée : diviser en n_scenes tranches, 1 aléatoire par tranche
    random.seed(42)  # Déterministe
    tranche_size = max(1, len(segments) // n_scenes)
    selected = []
    for i in range(n_scenes):
        tranche_start = i * tranche_size
        tranche_end   = min(tranche_start + tranche_size, len(segments))
        if tranche_start >= len(segments):
            break
        idx = random.randint(tranche_start, tranche_end - 1)
        selected.append(segments[idx][1])

    return selected

# ─── CHARGEMENT AUTOPSIE V4 ─────────────────────────────────────────────────
_autopsie_module = None

def load_autopsie():
    global _autopsie_module
    if _autopsie_module is not None:
        return _autopsie_module
    # Chercher autopsie_v4.py dans le dossier courant
    candidates = [
        Path("autopsie_v4.py"),
        Path("../autopsie_v4.py"),
    ]
    for p in candidates:
        if p.exists():
            spec = importlib.util.spec_from_file_location("autopsie_v4", str(p))
            mod  = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            _autopsie_module = mod
            log.info(f"  autopsie_v4 chargé depuis: {p.resolve()}")
            return mod
    log.error("  autopsie_v4.py introuvable — vérifier le dossier courant")
    return None

def analyze_text(text: str, work_id: str, lang: str, lang_original: str) -> dict:
    """Lance autopsie_v4.analyze() sur un texte."""
    mod = load_autopsie()
    if mod is None:
        return {}
    meta = {
        "work_id": work_id,
        "lang_original": lang_original,
        "author": work_id.split("_")[0],
    }
    try:
        return mod.analyze(text, work_id, meta)
    except Exception as e:
        log.error(f"  analyze() error pour {work_id}: {e}")
        import traceback; traceback.print_exc()
        return {}

# ─── ANALYSE D'UNE OEUVRE ───────────────────────────────────────────────────
def process_work(work: dict) -> dict | None:
    author = work["author"]
    title  = work["title"]
    lang   = work["lang"]
    lang_o = work["lang_original"]
    n_sc   = SCENES_FR if lang == "fr" else SCENES_EN

    log.info(f"\n{'─'*60}")
    log.info(f"  {title} — {author} [{lang.upper()}] → {n_sc} scènes")

    # 1. Trouver PDF
    pdf_path = find_pdf(work)
    if pdf_path is None:
        log.error(f"  PDF introuvable pour {title}")
        return None

    log.info(f"  PDF: {pdf_path.name} ({pdf_path.stat().st_size//1024:,} KB)")

    # 2. Extraire texte
    raw = extract_pdf(pdf_path)
    if not raw:
        log.error(f"  Extraction vide")
        return None

    text = clean_text(raw)
    word_count = len(text.split())
    log.info(f"  Texte: {word_count:,} mots | {len(text):,} chars")

    # Seuil minimum : 5000 mots (roman court = ~30k, nouvelle = ~5k)
    if word_count < 5000:
        log.warning(f"  AVERTISSEMENT: {word_count} mots — PDF peut être incomplet ou scanné")
        if word_count < 1000:
            log.error(f"  SKIP: trop peu de texte")
            return None

    # 3. Analyse FULL WORK
    log.info(f"  Analyse full-work en cours...")
    full_result = analyze_text(text, f"{author}_FULL", lang, lang_o)
    features = full_result.get("features", {})

    # 4. Extraction des scènes
    log.info(f"  Extraction {n_sc} scènes de {SCENE_WORDS} mots...")
    scenes = extract_scenes(text, n_sc, SCENE_WORDS)
    log.info(f"  Scènes extraites: {len(scenes)}")

    # 5. Analyse de chaque scène
    scene_results = []
    for i, scene_text in enumerate(scenes):
        sr = analyze_text(scene_text, f"{author}_scene_{i:03d}", lang, lang_o)
        if sr:
            scene_results.append({
                "scene_id": i,
                "word_count": len(scene_text.split()),
                "features": sr.get("features", {}),
            })

    log.info(f"  Scènes analysées: {len(scene_results)}/{len(scenes)}")

    # 6. Moyennes scènes
    scene_averages = compute_scene_averages(scene_results)

    # 7. Assemblage résultat
    result = {
        "meta": {
            "author":       author,
            "title":        title,
            "lang":         lang,
            "lang_original": lang_o,
            "year":         work.get("year"),
            "category":     work.get("category", "roman"),
            "pdf_file":     pdf_path.name,
            "word_count":   word_count,
            "scenes_count": len(scene_results),
            "analyzed_at":  datetime.now().isoformat(),
            "text_sha":     hashlib.sha256(text.encode()).hexdigest()[:16],
        },
        "full_work_features": features,
        "scene_averages":     scene_averages,
        "scene_count":        len(scene_results),
    }

    # 8. Sauvegarde JSON
    out_path = OUTPUT_DIR / f"{author}_FULL.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    sha = hashlib.sha256(out_path.read_bytes()).hexdigest()[:12]
    log.info(f"  Sauvegardé: {out_path.name} | SHA: {sha}")

    # 9. Sauvegarde scènes TXT (pour corpus futur)
    scenes_out = SCENES_DIR / author
    scenes_out.mkdir(exist_ok=True)
    for i, st in enumerate(scenes):
        (scenes_out / f"scene_{i:03d}.txt").write_text(st, encoding="utf-8")
    log.info(f"  Scènes TXT: {scenes_out}")

    return result

def compute_scene_averages(scene_results: list) -> dict:
    """Moyenne des features numériques sur toutes les scènes."""
    if not scene_results:
        return {}
    all_feats = {}
    for sr in scene_results:
        for k, v in sr.get("features", {}).items():
            if isinstance(v, (int, float)):
                all_feats.setdefault(k, []).append(v)
    return {k: round(sum(v)/len(v), 6) for k, v in all_feats.items() if v}

# ─── TABLEAU DE CLASSEMENT ──────────────────────────────────────────────────
RANKING_FEATURES = [
    ("f21e_ritual_index",          "Rituel F21 (Van Peer)"),
    ("f22f_literary_index",        "Littéraire F22 (M&K)"),
    ("f23d_literary_causal_score", "Causal implicite F23"),
    ("f19e_window_median",         "Entropie locale F19"),
    ("f1_mean",                    "Longueur phrase"),
    ("f1a_rhythm_variance",        "Variance rythme"),
    ("f5a_verb_density",           "Densité verbale"),
    ("f16b_hapax_rate",            "Richesse lexicale"),
    ("f15a_local_repetition_rate", "Répétition locale"),
    ("f19a_approx_entropy",        "Entropie globale"),
]

def print_ranking(results: list):
    if not results:
        return

    print("\n" + "="*120)
    print("OMEGA — CLASSEMENT PROSE — FULL WORK + SCÈNES")
    print("="*120)

    # Trier par langue puis titre
    fr_results = [r for r in results if r["meta"]["lang"] == "fr"]
    en_results = [r for r in results if r["meta"]["lang"] != "fr"]

    for group_label, group in [("FRANÇAIS", fr_results), ("ANGLAIS/AUTRE", en_results)]:
        if not group:
            continue
        print(f"\n{'─'*120}")
        print(f"  {group_label}")
        print(f"{'─'*120}")

        # Header
        header = f"{'Feature':<32}"
        for r in group:
            t = r["meta"]["title"][:12]
            header += f"  {t:<13}"
        print(header)
        print("─"*120)

        for feat_id, feat_label in RANKING_FEATURES:
            line = f"{feat_label:<32}"
            for r in group:
                # Priorité: full_work_features, sinon scene_averages
                val = r.get("full_work_features", {}).get(feat_id)
                if val is None:
                    val = r.get("scene_averages", {}).get(feat_id)
                if val is None:
                    line += f"  {'N/A':<13}"
                elif isinstance(val, float):
                    line += f"  {val:<13.4f}"
                else:
                    line += f"  {str(val)[:12]:<13}"
            print(line)

    # Top performers
    print("\n" + "="*120)
    print("TOP PERFORMERS PAR FEATURE (toutes oeuvres)")
    print("="*120)

    numeric_feats = [
        ("f21e_ritual_index",          "Rituel incantoire (F21)"),
        ("f22f_literary_index",        "Index littéraire (F22)"),
        ("f23d_literary_causal_score", "Causalité implicite (F23)"),
        ("f19e_window_median",         "Entropie locale (F19)"),
        ("f1a_rhythm_variance",        "Variance rythmique"),
        ("f16b_hapax_rate",            "Richesse lexicale (hapax)"),
        ("f15a_local_repetition_rate", "Répétition locale"),
    ]
    titles = {r["meta"]["author"]: r["meta"]["title"] for r in results}

    for feat_id, label in numeric_feats:
        scores = {}
        for r in results:
            v = r.get("full_work_features", {}).get(feat_id)
            if v is None:
                v = r.get("scene_averages", {}).get(feat_id)
            if isinstance(v, (int, float)):
                scores[r["meta"]["author"]] = v
        if scores:
            ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            top3 = " > ".join(f"{titles[a]} ({v:.3f})" for a, v in ranked[:3])
            print(f"  {label:<35}: {top3}")

    print()

def save_ranking(results: list):
    ranking_path = OUTPUT_DIR / "FULLWORK_RANKING_v2.json"
    data = {
        "generated_at": datetime.now().isoformat(),
        "total_works":  len(results),
        "works": [
            {
                "author":  r["meta"]["author"],
                "title":   r["meta"]["title"],
                "lang":    r["meta"]["lang"],
                "words":   r["meta"]["word_count"],
                "scenes":  r["meta"]["scenes_count"],
                "top_features": {
                    feat_id: (
                        r.get("full_work_features", {}).get(feat_id)
                        or r.get("scene_averages", {}).get(feat_id)
                    )
                    for feat_id, _ in RANKING_FEATURES
                }
            }
            for r in results
        ]
    }
    with open(ranking_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    sha = hashlib.sha256(ranking_path.read_bytes()).hexdigest()
    log.info(f"\nRanking global: {ranking_path}")
    log.info(f"Ranking SHA256: {sha}")
    return sha

# ─── MAIN ────────────────────────────────────────────────────────────────────
def main():
    log.info("="*60)
    log.info("OMEGA — Full Work Analyzer v2")
    log.info(f"PDF DIR: {PDF_DIR}")
    log.info(f"Oeuvres: {len(WORKS)}")
    log.info(f"Scènes FR: {SCENES_FR} | EN: {SCENES_EN} | Mots/scène: {SCENE_WORDS}")
    log.info("="*60)

    if not PDF_DIR.exists():
        log.error(f"Dossier introuvable: {PDF_DIR}")
        sys.exit(1)

    results = []
    failed  = []

    for i, work in enumerate(WORKS, 1):
        log.info(f"\n[{i}/{len(WORKS)}] {work['title']}")
        try:
            result = process_work(work)
            if result:
                results.append(result)
            else:
                failed.append(work["title"])
        except Exception as e:
            log.error(f"  EXCEPTION: {e}")
            import traceback; traceback.print_exc()
            failed.append(work["title"])

    # Classement
    print_ranking(results)

    # Sauvegarde ranking
    if results:
        sha = save_ranking(results)

    # Bilan
    log.info("\n" + "="*60)
    log.info(f"TERMINÉ")
    log.info(f"  Analysées : {len(results)}/{len(WORKS)}")
    log.info(f"  Échouées  : {len(failed)}")
    if failed:
        for f in failed:
            log.info(f"    ✗ {f}")
    log.info("="*60)

if __name__ == "__main__":
    main()
