#!/usr/bin/env python3
"""
OMEGA v5 — Configuration & Catalogues
Phase R0 — Refondation Metrologique

Changements vs v4 :
  GATE_MIN_WORDS    : 15000 → 8000
  CHAPTER_MAX_WORDS : 7000 → SUPPRIME (illimite)
  N_CHAPTERS        : 5 → ALL (tous les chapitres reels)
  N_RANDOM          : 10 → proportionnel a la taille
  ANALYSIS_WINDOWS  : 12 fenetres multi-echelle
  CATALOG_ES        : 15+ oeuvres espagnoles (Gutenberg)
  SAGAS             : identification multi-tomes
"""

import os, sys, re, logging
from pathlib import Path
import unicodedata as _ud

# ─── PATHS ────────────────────────────────────────────────────────────────
PDF_DIR      = Path(r"C:\Users\elric\Downloads\livre")
TXT_DIR      = Path(r"C:\Users\elric\omega-project\omega-autopsie\gutenberg_cache")
OUTPUT_DIR   = Path("results_v5")
SCENES_DIR   = Path("scenes_v5")
LOG_FILE     = "fullwork_v5.log"

OUTPUT_DIR.mkdir(exist_ok=True)
SCENES_DIR.mkdir(exist_ok=True)
TXT_DIR.mkdir(parents=True, exist_ok=True)

# ─── DATA GATE SEUILS ────────────────────────────────────────────────────
GATE_MIN_WORDS    = 8_000    # v5: abaisse de 15k a 8k (R0 decision Francky)
GATE_ALPHA_RATIO  = 0.60     # < 60% alpha → artefacts PDF

# ─── PROTOCOLE v5 ────────────────────────────────────────────────────────
SCENE_WORDS        = 300      # taille scene de base (conserve v4)
CHAPTER_MIN_WORDS  = 500      # v5: abaisse de 1500 a 500 (chapitres courts = OK)
# CHAPTER_MAX_WORDS : SUPPRIME — tous les chapitres, quelle que soit la taille

# ─── FENETRES MULTI-ECHELLE (12 niveaux) ─────────────────────────────────
ANALYSIS_WINDOWS = [30, 150, 300, 600, 1000, 1500, 2500, 5000, 10000, 20000]
# + "real_chapter" et "full_work" ajoutes dynamiquement

# ─── LOGGING ──────────────────────────────────────────────────────────────
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("omega_v5")

# ─── UTILS ────────────────────────────────────────────────────────────────

def windows_safe_slug(s: str, max_len: int = 40) -> str:
    s = _ud.normalize('NFD', s)
    s = ''.join(c for c in s if _ud.category(c) != 'Mn')
    s = re.sub(r'[<>:"/\\|?*\']+', '_', s)
    s = s.replace(' ', '_')
    s = re.sub(r'_+', '_', s).strip('_.')
    return s[:max_len] if s.strip('_.') else 'untitled'

def make_work_id(author: str, title: str) -> str:
    return f"{author}_{re.sub(r'[^a-zA-Z0-9]', '_', title[:20])}"


# ══════════════════════════════════════════════════════════════════════════
# CATALOGUE DOMAINE PUBLIC — FR (30 oeuvres)
# ══════════════════════════════════════════════════════════════════════════

CATALOG_PUBLIC_FR = [
    # BALZAC
    {"author": "balzac",    "title": "Le Pere Goriot",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1835,
     "gutenberg_ids": [4634, 1588]},
    {"author": "balzac",    "title": "Eugenie Grandet",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1833,
     "gutenberg_ids": [1413]},
    {"author": "balzac",    "title": "Le Chef-d'oeuvre inconnu",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1831,
     "gutenberg_ids": [23814]},
    # STENDHAL
    {"author": "stendhal",  "title": "Le Rouge et le Noir",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1830,
     "gutenberg_ids": [798, 14169]},
    {"author": "stendhal",  "title": "La Chartreuse de Parme",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1839,
     "gutenberg_ids": [29, 766]},
    # FLAUBERT
    {"author": "flaubert",  "title": "L'Education Sentimentale",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1869,
     "gutenberg_ids": [8983, 2413]},
    {"author": "flaubert",  "title": "Salammbo",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1862,
     "gutenberg_ids": [4567, 1290]},
    # HUGO
    {"author": "hugo",      "title": "Les Miserables T1",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1862,
     "gutenberg_ids": [17489, 135]},
    {"author": "hugo",      "title": "Notre-Dame de Paris",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1831,
     "gutenberg_ids": [19657, 2610]},
    # ZOLA
    {"author": "zola",      "title": "Germinal",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1885,
     "gutenberg_ids": [5711, 1373]},
    {"author": "zola",      "title": "L'Assommoir",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1877,
     "gutenberg_ids": [8600, 4367]},
    {"author": "zola",      "title": "Nana",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1880,
     "gutenberg_ids": [10012, 1979]},
    {"author": "zola",      "title": "La Bete Humaine",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1890,
     "gutenberg_ids": [4380, 1170]},
    # MAUPASSANT
    {"author": "maupassant","title": "Bel-Ami",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1885,
     "gutenberg_ids": [4684, 25608]},
    {"author": "maupassant","title": "Pierre et Jean",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1888,
     "gutenberg_ids": [924, 3770]},
    {"author": "maupassant","title": "Une Vie",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1883,
     "gutenberg_ids": [24787, 1010]},
    # HUYSMANS
    {"author": "huysmans",  "title": "A Rebours",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1884,
     "gutenberg_ids": [12341, 4551]},
    # LOTI
    {"author": "loti",      "title": "Pecheur d'Islande",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1886,
     "gutenberg_ids": [12961]},
    # GIDE
    {"author": "gide",      "title": "L'Immoraliste",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1902,
     "gutenberg_ids": [43844, 9971]},
    {"author": "gide",      "title": "La Porte Etroite",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1909,
     "gutenberg_ids": [4896, 9770]},
    {"author": "gide",      "title": "La Symphonie Pastorale",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1919,
     "gutenberg_ids": [8834]},
    # FRANCE
    {"author": "france",    "title": "L'Ile des Pingouins",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1908,
     "gutenberg_ids": [13898]},
    # MERIMEE
    {"author": "merimee",   "title": "Carmen",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1845,
     "gutenberg_ids": [2465]},
    # NERVAL
    {"author": "nerval",    "title": "Aurelia",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1855,
     "gutenberg_ids": [2602]},
    # DAUDET
    {"author": "daudet",    "title": "Lettres de mon Moulin",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1869,
     "gutenberg_ids": [3166]},
    # SAND
    {"author": "sand",      "title": "Indiana",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1832,
     "gutenberg_ids": [5765]},
    # RADIGUET
    {"author": "radiguet",  "title": "Le Diable au Corps",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1923,
     "gutenberg_ids": [9726]},
    # APOLLINAIRE
    {"author": "apollinaire","title": "Alcools",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1913,
     "gutenberg_ids": [11512]},
    # LAUTREAMONT
    {"author": "lautreamont","title": "Les Chants de Maldoror",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1869,
     "gutenberg_ids": [12005]},
    # VERNE
    {"author": "verne",     "title": "Vingt Mille Lieues",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1870,
     "gutenberg_ids": [5097, 54155]},
]

# ══════════════════════════════════════════════════════════════════════════
# CATALOGUE DOMAINE PUBLIC — EN (23 oeuvres)
# ══════════════════════════════════════════════════════════════════════════

CATALOG_PUBLIC_EN = [
    # CONRAD
    {"author": "conrad",    "title": "Heart of Darkness",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1899,
     "gutenberg_ids": [219]},
    {"author": "conrad",    "title": "Lord Jim",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1900,
     "gutenberg_ids": [5658]},
    {"author": "conrad",    "title": "Nostromo",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1904,
     "gutenberg_ids": [2021]},
    # MELVILLE
    {"author": "melville",  "title": "Moby Dick",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1851,
     "gutenberg_ids": [2701]},
    {"author": "melville",  "title": "Bartleby the Scrivener",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1853,
     "gutenberg_ids": [11231]},
    # JAMES H.
    {"author": "james_h",   "title": "The Portrait of a Lady",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1881,
     "gutenberg_ids": [432]},
    {"author": "james_h",   "title": "The Turn of the Screw",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1898,
     "gutenberg_ids": [209]},
    {"author": "james_h",   "title": "The Wings of the Dove",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1902,
     "gutenberg_ids": [1497]},
    # DICKENS
    {"author": "dickens",   "title": "Great Expectations",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1861,
     "gutenberg_ids": [1400]},
    {"author": "dickens",   "title": "Bleak House",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1853,
     "gutenberg_ids": [1023]},
    # HARDY
    {"author": "hardy",     "title": "Tess of the d'Urbervilles",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1891,
     "gutenberg_ids": [110]},
    # AUSTEN
    {"author": "austen",    "title": "Emma",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1815,
     "gutenberg_ids": [158]},
    # JOYCE
    {"author": "joyce",     "title": "Portrait of the Artist",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1916,
     "gutenberg_ids": [4217]},
    # CRANE
    {"author": "crane",     "title": "The Red Badge of Courage",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1895,
     "gutenberg_ids": [73]},
    # TWAIN
    {"author": "twain",     "title": "Huckleberry Finn",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1884,
     "gutenberg_ids": [76]},
    # WHARTON
    {"author": "wharton",   "title": "The Age of Innocence",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1920,
     "gutenberg_ids": [541]},
    {"author": "wharton",  "title": "The Custom of the Country",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1913,
     "gutenberg_ids": [4389]},
    {"author": "wharton",  "title": "The Reef",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1912,
     "gutenberg_ids": [4859]},
    # DREISER
    {"author": "dreiser",  "title": "Jennie Gerhardt",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1911,
     "gutenberg_ids": [6138]},
    {"author": "dreiser",  "title": "The Financier",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1912,
     "gutenberg_ids": [1840]},
    # LEWIS S.
    {"author": "lewis_s",  "title": "Babbitt",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1922,
     "gutenberg_ids": [1156]},
    # NORRIS
    {"author": "norris",   "title": "McTeague",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1899,
     "gutenberg_ids": [777]},
    # LONDON
    {"author": "london",   "title": "Martin Eden",
     "corpus": "PD-EN",  "lang_original": "en", "year": 1909,
     "gutenberg_ids": [763]},
]

# ══════════════════════════════════════════════════════════════════════════
# CATALOGUE DOMAINE PUBLIC — ES (17 oeuvres) — NOUVEAU v5
# Tous originaux espagnols sur Gutenberg
# ══════════════════════════════════════════════════════════════════════════

CATALOG_PUBLIC_ES = [
    # CERVANTES
    {"author": "cervantes", "title": "Don Quijote (Parte 1)",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1605,
     "gutenberg_ids": [2000]},
    # LAZARILLO
    {"author": "anonimo",   "title": "Lazarillo de Tormes",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1554,
     "gutenberg_ids": [320]},
    # CLARIN
    {"author": "clarin",    "title": "La Regenta (Tomo 1)",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1884,
     "gutenberg_ids": [18744]},
    {"author": "clarin",    "title": "La Regenta (Tomo 2)",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1885,
     "gutenberg_ids": [18745]},
    # GALDOS
    {"author": "galdos",    "title": "Fortunata y Jacinta",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1887,
     "gutenberg_ids": [17013]},
    {"author": "galdos",    "title": "Misericordia",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1897,
     "gutenberg_ids": [17073]},
    {"author": "galdos",    "title": "Dona Perfecta",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1876,
     "gutenberg_ids": [15725]},
    # UNAMUNO
    {"author": "unamuno",   "title": "Niebla",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1914,
     "gutenberg_ids": [49836]},
    {"author": "unamuno",   "title": "San Manuel Bueno, martir",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1931,
     "gutenberg_ids": [49846]},
    # BAROJA
    {"author": "baroja",    "title": "El arbol de la ciencia",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1911,
     "gutenberg_ids": [47844]},
    # AZORIN
    {"author": "azorin",    "title": "La voluntad",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1902,
     "gutenberg_ids": [49791]},
    # ALARCON
    {"author": "alarcon",   "title": "El sombrero de tres picos",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1874,
     "gutenberg_ids": [14869]},
    # BECQUER
    {"author": "becquer",   "title": "Leyendas",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1871,
     "gutenberg_ids": [44337]},
    # PARDO BAZAN
    {"author": "pardo_bazan","title": "Los Pazos de Ulloa",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1886,
     "gutenberg_ids": [46547]},
    # QUIROGA
    {"author": "quiroga",   "title": "Cuentos de amor de locura y de muerte",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1917,
     "gutenberg_ids": [51737]},
    # VALLE-INCLAN
    {"author": "valle_inclan","title": "Sonata de Primavera",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1904,
     "gutenberg_ids": [35627]},
    # BLASCO IBANEZ
    {"author": "blasco_ibanez","title": "La barraca",
     "corpus": "PD-ES",  "lang_original": "es", "year": 1898,
     "gutenberg_ids": [31037]},
]

# ══════════════════════════════════════════════════════════════════════════
# CATALOGUE PDF (conserve de v4)
# ══════════════════════════════════════════════════════════════════════════

CATALOG_PDF = [
    # ─── FR-ORIG ──────────────────────────────────────────────────────────
    # CAMUS
    {"file": "Letranger_French_Edition_-_Albert_Camus.pdf",
     "author": "camus", "title": "L'Etranger",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1942},
    {"file": "La_Peste_French_Edition_-_Albert_Camus.pdf",
     "author": "camus", "title": "La Peste",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1947},
    {"file": "La_mort_heureuse_French_Edition_-_Albert_Camus.pdf",
     "author": "camus", "title": "La Mort Heureuse",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1971},
    {"file": "LExil_et_le_Royaume_-_Albert_Camus.pdf",
     "author": "camus", "title": "L'Exil et le Royaume",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1957},
    # ERNAUX
    {"file": "la_place_French_Edition_-_annie_ernaux.pdf",
     "author": "ernaux", "title": "La Place",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1983},
    {"file": "Les_Annees_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Les Annees",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2008},
    {"file": "La_femme_gelee_French_Edition_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "La Femme Gelee",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1981},
    {"file": "Une_femme_French_Edition_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Une Femme",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1987},
    {"file": "Memoire_de_Fille_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Memoire de Fille",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2016},
    {"file": "Levenement_French_Edition_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "L'Evenement",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2000},
    {"file": "Ce_quils_disent_ou_rien_French_Edition_-_Ernaux_Annie.pdf",
     "author": "ernaux", "title": "Ce qu'ils disent ou rien",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1977},
    # MODIANO
    {"file": "Dora_Bruder_-_Modiano_Patrick.pdf",
     "author": "modiano", "title": "Dora Bruder",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1997},
    {"file": "La_Ronde_de_Nuit_-_Patrick_Modiano.pdf",
     "author": "modiano", "title": "La Ronde de Nuit",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1969},
    {"file": "Rue_des_Boutiques_Obscures_-_Patrick_Modiano.pdf",
     "author": "modiano", "title": "Rue des Boutiques Obscures",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1978},
    {"file": "La_danseuse_-_Patrick_Modiano_FR.pdf",
     "author": "modiano", "title": "La Danseuse",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2023},
    {"file": "Quartier_Perdu_French_Edition_-_Modiano_Patrick.pdf",
     "author": "modiano", "title": "Quartier Perdu",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1984},
    {"file": "Encre_sympathique_French_Edition_-_Patrick_Modiano.pdf",
     "author": "modiano", "title": "Encre Sympathique",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2019},
    # CARRERE
    {"file": "Carrère, Emmanuel - L'Adversaire.pdf",
     "author": "carrere", "title": "L'Adversaire",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2000},
    {"file": "Limonov_French_Edition_-_Emmanuel_Carrere.pdf",
     "author": "carrere", "title": "Limonov",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2011},
    {"file": "La_Moustache_-_Emmanuel_Carrere.pdf",
     "author": "carrere", "title": "La Moustache",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1986},
    {"file": "Kolkhoze_French_Edition_-_Emmanuel_Carrere.pdf",
     "author": "carrere", "title": "Kolkhoze",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2022},
    # DURAS
    {"file": "LAmant_-_Marguerite_Duras.pdf",
     "author": "duras", "title": "L'Amant",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1984},
    # HOUELLEBECQ
    {"file": "Les_Particules_elementaires_-_Michel_Houellebecq.pdf",
     "author": "houellebecq", "title": "Les Particules Elementaires",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1998},
    {"file": "La_Carte_et_le_Territoire_-_Michel_Houellebecq.pdf",
     "author": "houellebecq", "title": "La Carte et le Territoire",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2010},
    {"file": "La_possibilite_dune_ile_French_Edition_-_Michel_Houellebecq.pdf",
     "author": "houellebecq", "title": "La Possibilite d'une Ile",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2005},
    # LE CLEZIO
    {"file": "Desert_-_JMG_Le_Clezio.pdf",
     "author": "leclezio", "title": "Desert",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1980},
    {"file": "La_Quarantaine_-_JMG_Le_Clezio.pdf",
     "author": "leclezio", "title": "La Quarantaine",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1995},
    {"file": "Ourania_French_Edition_-_Le_Clezio_J_M_G.pdf",
     "author": "leclezio", "title": "Ourania",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2006},
    {"file": "Avers_-_J_M_G_Le_Clezio.pdf",
     "author": "leclezio", "title": "Avers",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2021},
    # QUIGNARD
    {"file": "Tous_les_matins_du_monde_-_Pascal_Quignard.pdf",
     "author": "quignard", "title": "Tous les Matins du Monde",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1991},
    {"file": "Le_salon_du_Wurtemberg_French_Edition_-_Quignard_Pascal.pdf",
     "author": "quignard", "title": "Le Salon du Wurtemberg",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1986},
    {"file": "Terrasse_a_Rome_French_Edition_-_Pascal_Quignard.pdf",
     "author": "quignard", "title": "Terrasse a Rome",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2000},
    # BECKETT (original FR)
    {"file": "Molloy_-_Samuel_Beckett.pdf",
     "author": "beckett", "title": "Molloy",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1951},
    # FLAUBERT
    {"file": "Madame_Bovary_-_Gustave_Flaubert.pdf",
     "author": "flaubert", "title": "Madame Bovary",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1857},
    {"file": "Coeur_simple_French_Edition_-_Flaubert_Gustave.pdf",
     "author": "flaubert", "title": "Un Coeur Simple",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1877},
    # PROUST
    {"file": "Du_cote_de_chez_Swann_-_Marcel_Proust.pdf",
     "author": "proust", "title": "Du cote de chez Swann",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1913},
    # CELINE
    {"file": "Voyage_au_bout_de_la_nuit_-_Celine_Louis-Ferdinand.pdf",
     "author": "celine", "title": "Voyage au Bout de la Nuit",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1932},
    # SIMON
    {"file": "La_Route_des_Flandres_-_Claude_Simon.pdf",
     "author": "simon", "title": "La Route des Flandres",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1960},
    # PEREC
    {"file": "La_Vie_mode_demploi_-_Georges_Perec.pdf",
     "author": "perec", "title": "La Vie Mode d'Emploi",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1978},
    # NOUVEAU ROMAN + 20eme
    {"file": "La_Jalousie_-_Alain_Robbe-Grillet.pdf",
     "author": "robbe_grillet", "title": "La Jalousie",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1957},
    {"file": "Le_Voyeur_-_Alain_Robbe-Grillet.pdf",
     "author": "robbe_grillet", "title": "Le Voyeur",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1955},
    {"file": "La_Modification_-_Michel_Butor.pdf",
     "author": "butor", "title": "La Modification",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1957},
    {"file": "Enfance_-_Nathalie_Sarraute.pdf",
     "author": "sarraute", "title": "Enfance",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1983},
    {"file": "Le_planetarium_French_Edition_-_Sarraute_Nathalie.pdf",
     "author": "sarraute", "title": "Le Planetarium",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1959},
    {"file": "Martereau_French_Edition_-_Sarraute_Nathalie.pdf",
     "author": "sarraute", "title": "Martereau",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1953},
    {"file": "Les_Mandarins_-_Simone_de_Beauvoir.pdf",
     "author": "beauvoir", "title": "Les Mandarins",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1954},
    {"file": "Alexis_ou_le_Traite_du_vain_combat__Le_Coup_de_grace_-_Marguerite_Yourcenar.pdf",
     "author": "yourcenar", "title": "Alexis / Le Coup de grace",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1929},
    {"file": "La_Nausee_-_Jean-Paul_Sartre.pdf",
     "author": "sartre", "title": "La Nausee",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1938},
    {"file": "Texaco_-_Patrick_Chamoiseau.epub",
     "author": "chamoiseau", "title": "Texaco",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1992},
    {"file": "Trois_Femmes_puissantes_French_Edition_-_Marie_NDiaye.epub",
     "author": "ndiaye", "title": "Trois Femmes puissantes",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2009},
    {"file": "Anna_soror_-_Marguerite_Yourcenar.pdf",
     "author": "yourcenar", "title": "Anna Soror",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1981},
    {"file": "Courir_French_Edition_-_Jean_echenoz.epub",
     "author": "echenoz", "title": "Courir",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2008},
    {"file": "La_Maison_de_Rendez-Vous_and_Djinn_-_Alain_Robbe-Grillet.epub",
     "author": "robbe_grillet", "title": "La Maison de Rendez-Vous",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1965},
    {"file": "la_condition_humaine_-_Andre_Malraux.epub",
     "author": "malraux", "title": "La Condition Humaine",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1933},
    {"file": "La_Voie_royale_-_Andre_Malraux.epub",
     "author": "malraux", "title": "La Voie Royale",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1930},
    {"file": "LOEuvre_au_noir_-_Marguerite_Yourcenar.epub",
     "author": "yourcenar", "title": "L'Oeuvre au Noir",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1968},
    {"file": "Quoi__LEternite_-_Marguerite_Yourcenar.epub",
     "author": "yourcenar", "title": "Quoi ? L'Eternite",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1988},

    # ─── TR-FR (traductions francaises — hors calibration constantes) ─────
    {"file": "le-bruit-et-la-fureur.pdf",
     "author": "faulkner", "title": "Le Bruit et la Fureur (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1929},
    {"file": "Toni-Morrison.-Beloved.pdf",
     "author": "morrison", "title": "Beloved (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1987},
    {"file": "Cent_ans_de_solitude__Gabriel_Garcia_Marquez.pdf",
     "author": "marquez", "title": "Cent Ans de Solitude (FR)",
     "corpus": "TR-FR", "lang_original": "es", "year": 1967},
    {"file": "pedro_paramo.pdf",
     "author": "rulfo", "title": "Pedro Paramo (FR)",
     "corpus": "TR-FR", "lang_original": "es", "year": 1955},
    {"file": "LInsoutenable_Legerete_de_letre_French_Edition_-_Milan_Kundera.pdf",
     "author": "kundera", "title": "L'Insoutenable Legerete (FR)",
     "corpus": "TR-FR", "lang_original": "cs", "year": 1984},
    {"file": "La_Chambre_de_Giovanni_French_Edition_-_James_Baldwin.pdf",
     "author": "baldwin", "title": "La Chambre de Giovanni (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1956},
    {"file": "Lamie_prodigieuse_-_Elena_Ferrante.pdf",
     "author": "ferrante", "title": "L'Amie Prodigieuse (FR)",
     "corpus": "TR-FR", "lang_original": "it", "year": 2011},
    {"file": "Le_nom_de_la_rose_French_Edition_-_Umberto_Eco.pdf",
     "author": "eco", "title": "Le Nom de la Rose (FR)",
     "corpus": "TR-FR", "lang_original": "it", "year": 1980},
    {"file": "Les_Vestiges_du_Jour_French_Edition_-_Ishiguro_Kazuo.pdf",
     "author": "ishiguro", "title": "Les Vestiges du Jour (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1989},
    {"file": "2666_-_Roberto_Bolano.pdf",
     "author": "bolano", "title": "2666 (FR)",
     "corpus": "TR-FR", "lang_original": "es", "year": 2004},
    {"file": "Le_soleil_se_leve_aussi_French_Edition_-_Hemingway_Ernest.pdf",
     "author": "hemingway", "title": "Le Soleil se leve aussi (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1926},
    {"file": "Des_Souris_et_Des_hommes_French_Edition_-_John_Steinbeck.pdf",
     "author": "steinbeck", "title": "Des Souris et des Hommes (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1937},
    {"file": "Le_vieil_homme_et_la_mer_French_Edition_-_Ernest_Hemingway.pdf",
     "author": "hemingway", "title": "Le Vieil Homme et la Mer (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1952},
    {"file": "Letoile_de_Ratner_French_Edition_-_DeLillo_Don.pdf",
     "author": "delillo", "title": "L'Etoile de Ratner (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1976},

    # ─── EN-ORIG ──────────────────────────────────────────────────────────
    {"file": "Blood_Meridian_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "Blood Meridian",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1985},
    {"file": "The_road_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "The Road",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2006},
    {"file": "Suttree_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "Suttree",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1979},
    {"file": "No_Country_for_Old_Men_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "No Country for Old Men",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2005},
    {"file": "As_I_Lay_Dying_-_William_Faulkner.pdf",
     "author": "faulkner", "title": "As I Lay Dying",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1930},
    {"file": "Song_of_Solomon_-_Toni_Morrison.pdf",
     "author": "morrison", "title": "Song of Solomon",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1977},
    {"file": "Mrs_Dalloway_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "Mrs Dalloway",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1925},
    {"file": "Orlando_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "Orlando",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1928},
    {"file": "A_Haunted_House_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "A Haunted House",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1944},
    {"file": "The_Waves_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "The Waves",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1931},
    {"file": "Lolita__Vladimir_Nabokov.pdf",
     "author": "nabokov", "title": "Lolita",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1955},
    {"file": "Pale_Fire_-_Vladimir_Nabokov.pdf",
     "author": "nabokov", "title": "Pale Fire",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1962},
    {"file": "Bend_Sinister_-_Vladimir_Nabokov.pdf",
     "author": "nabokov", "title": "Bend Sinister",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1947},
    {"file": "Underworld_-_Don_Delillo.pdf",
     "author": "delillo", "title": "Underworld",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1997},
    {"file": "White_Noise_-_Don_Delillo.pdf",
     "author": "delillo", "title": "White Noise",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1985},
    {"file": "End_Zone_-_Don_DeLillo.pdf",
     "author": "delillo", "title": "End Zone",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1972},
    {"file": "V_-_Thomas_Pynchon.pdf",
     "author": "pynchon", "title": "V.",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1963},
    {"file": "Fury_-_Salman_Rushdie.pdf",
     "author": "rushdie", "title": "Fury",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2001},
    {"file": "The_Sun_Also_Rises_-_Ernest_Hemingway.pdf",
     "author": "hemingway", "title": "The Sun Also Rises",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1926},
    {"file": "The_Garden_of_Eden_-_Ernest_Hemingway.pdf",
     "author": "hemingway", "title": "The Garden of Eden",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1986},
    {"file": "Men_Without_Women_-_Ernest_Hemingway.pdf",
     "author": "hemingway", "title": "Men Without Women",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1927},
    {"file": "An_American_Tragedy_-_Theodore_Dreiser.pdf",
     "author": "dreiser", "title": "An American Tragedy",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1925},
    {"file": "Sister_Carrie_BnN_-_Theodore_Dreiser.pdf",
     "author": "dreiser", "title": "Sister Carrie",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1900},
    {"file": "The_House_of_Mirth_-_Edith_Wharton.pdf",
     "author": "wharton", "title": "The House of Mirth",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1905},
    {"file": "Ethan_Frome_n_Selected_Stories_Barnes_n_N_-_Edith_Wharton.pdf",
     "author": "wharton", "title": "Ethan Frome",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1911},
    {"file": "Sons_and_Lovers_-_DH_Lawrence.pdf",
     "author": "lawrence", "title": "Sons and Lovers",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1913},
    {"file": "The_Ambassadors_-_Henry_James.pdf",
     "author": "james_h", "title": "The Ambassadors",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1903},
    {"file": "To_a_God_Unknown_-_John_Steinbeck.pdf",
     "author": "steinbeck", "title": "To a God Unknown",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1933},
    {"file": "Sweet_Thursday_-_John_Steinbeck.pdf",
     "author": "steinbeck", "title": "Sweet Thursday",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1954},
    {"file": "The_Awakening_and_Selected_Short_Fiction_-_Kate_Chopin.pdf",
     "author": "chopin", "title": "The Awakening",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1899},
    {"file": "Main_Street_-_Sinclair_Lewis.pdf",
     "author": "lewis_s", "title": "Main Street",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1920},

    # ─── TR-EN (traductions anglaises) ────────────────────────────────────
    {"file": "The_Opposing_Shore_-_Julien_Gracq.pdf",
     "author": "gracq", "title": "The Opposing Shore (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1951},
    {"file": "A_Balcony_in_the_Forest_-_Julien_Gracq.pdf",
     "author": "gracq", "title": "A Balcony in the Forest (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1958},
    {"file": "The_Flanders_Road_-_Claude_Simon.pdf",
     "author": "simon", "title": "The Flanders Road (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1960},
    {"file": "The_Grass_-_Claude_Simon.pdf",
     "author": "simon", "title": "The Grass (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1958},
    {"file": "If_on_a_winters_night_a_traveler_-_Italo_Calvino.pdf",
     "author": "calvino", "title": "If on a Winter's Night (EN)",
     "corpus": "TR-EN", "lang_original": "it", "year": 1979},
    {"file": "Do_What_They_Say_or_Else_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Do What They Say or Else (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1977},
    {"file": "Four_Novels_-_Marguerite_Duras.pdf",
     "author": "duras", "title": "Four Novels (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1965},
    {"file": "Memoirs_of_Hadrian_-_Marguerite_Yourcenar.epub",
     "author": "yourcenar", "title": "Memoirs of Hadrian (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1951},
    {"file": "The_Kingdom_-_Emmanuel_Carrere.pdf",
     "author": "carrere", "title": "The Kingdom (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 2014},

    # ─── BONUS ────────────────────────────────────────────────────────────
    {"file": "Burning_Bright_-_John_Steinbeck.pdf",
     "author": "steinbeck", "title": "Burning Bright",
     "corpus": "BONUS-THEATRE", "lang_original": "en", "year": 1950},
    {"file": "Battlestar_Galactica_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Battlestar Galactica",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 2006},
    {"file": "Dragons_in_the_Stars_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Dragons in the Stars",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 1992},
    {"file": "Going_Alien_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Going Alien",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 2011},
    {"file": "Neptune_Crossing_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Neptune Crossing",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 1994},
    {"file": "Panglor_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Panglor",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 1980},
]

# ══════════════════════════════════════════════════════════════════════════
# CATALOGUES FUSIONNES
# ══════════════════════════════════════════════════════════════════════════

CATALOG_PUBLIC = CATALOG_PUBLIC_FR + CATALOG_PUBLIC_EN + CATALOG_PUBLIC_ES

# ══════════════════════════════════════════════════════════════════════════
# SAGAS — identification multi-tomes
# ══════════════════════════════════════════════════════════════════════════

SAGAS = {
    "proust_recherche": {
        "name": "A la recherche du temps perdu",
        "author": "proust",
        "lang": "fr",
        "tomes": ["Du cote de chez Swann"],  # seul tome en corpus pour l'instant
        "note": "7 tomes au total — seul T1 disponible en PDF",
    },
    "zola_rougon": {
        "name": "Les Rougon-Macquart",
        "author": "zola",
        "lang": "fr",
        "tomes": ["Germinal", "L'Assommoir", "Nana", "La Bete Humaine"],
        "note": "20 tomes au total — 4 dans le corpus",
    },
    "balzac_comedie": {
        "name": "La Comedie Humaine",
        "author": "balzac",
        "lang": "fr",
        "tomes": ["Le Pere Goriot", "Eugenie Grandet", "Le Chef-d'oeuvre inconnu"],
        "note": "90+ oeuvres au total — 3 dans le corpus",
    },
    "hugo_miserables": {
        "name": "Les Miserables",
        "author": "hugo",
        "lang": "fr",
        "tomes": ["Les Miserables T1"],
        "note": "5 tomes — seul T1 telecharge",
    },
    "clarin_regenta": {
        "name": "La Regenta",
        "author": "clarin",
        "lang": "es",
        "tomes": ["La Regenta (Tomo 1)", "La Regenta (Tomo 2)"],
        "note": "2 tomes — complet",
    },
    "ferrante_napolitaine": {
        "name": "L'Amie prodigieuse (saga napolitaine)",
        "author": "ferrante",
        "lang": "it",
        "tomes": ["L'Amie Prodigieuse (FR)"],
        "note": "4 tomes — seul T1 en traduction FR",
    },
    "yourcenar_labyrinthe": {
        "name": "Le Labyrinthe du Monde",
        "author": "yourcenar",
        "lang": "fr",
        "tomes": ["Quoi ? L'Eternite"],
        "note": "3 tomes — seul T3 dans le corpus",
    },
    "galdos_fortunata": {
        "name": "Fortunata y Jacinta",
        "author": "galdos",
        "lang": "es",
        "tomes": ["Fortunata y Jacinta"],
        "note": "4 parties en 1 volume sur Gutenberg",
    },
    "maupassant_vie": {
        "name": "Oeuvres de Maupassant",
        "author": "maupassant",
        "lang": "fr",
        "tomes": ["Bel-Ami", "Pierre et Jean", "Une Vie"],
        "note": "Non saga formelle mais corpus coherent du meme auteur",
    },
    "mccarthy_border": {
        "name": "Border Trilogy / Southern Gothic",
        "author": "mccarthy",
        "lang": "en",
        "tomes": ["Blood Meridian", "The Road", "Suttree", "No Country for Old Men"],
        "note": "Non saga formelle mais corpus coherent",
    },
}

# ══════════════════════════════════════════════════════════════════════════
# KEY FEATURES (pour z-scores et ranking)
# ══════════════════════════════════════════════════════════════════════════

KEY_FEATURES = [
    "f21e_ritual_index", "f22f_literary_index",
    "f23d_literary_causal_score", "f19e_window_median",
    "f1_mean", "f1a_rhythm_variance",
    "f24e_contrast_score", "f25g_description_score",
    "f26c_period_score", "f27d_modal_score",
    "f28d_sil_score", "f29b_ttr_window", "f30d_ps_imp_ratio",
]

# ══════════════════════════════════════════════════════════════════════════
# CORPUS ORDERING (pour affichage ranking)
# ══════════════════════════════════════════════════════════════════════════

CORPUS_ORDER = [
    "FR-ORIG", "PD-FR", "TR-FR",
    "EN-ORIG", "PD-EN", "TR-EN",
    "PD-ES",
    "BONUS-THEATRE", "BONUS-GENRE", "BONUS-NF", "OTHER",
]
