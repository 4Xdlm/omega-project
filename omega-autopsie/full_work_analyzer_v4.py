#!/usr/bin/env python3
"""
OMEGA — Full Work Analyzer v4 — PUISSANCE 10
Corpus étendu 150+ œuvres.

NOUVEAU v4 :
  DATA_GATES     : TRUNCATED_TEXT | OCR_REQUIRED | LANG_MISMATCH | COVERAGE_FAIL
                   Seuils : min 15k mots, alpha_ratio >= 0.60, coverage_spread >= 0.40
  DOMAINE_PUBLIC : 50 œuvres auto-téléchargées Gutenberg (.txt, pas de PDF)
  PROTOCOLE+     : 15 extraits (1 APEX + 1 NEUTRE + 1 SEUIL + 1 INCIPIT +
                   1 EXPLICIT + 1 CLIMAX + 10 RANDOM) + 5 chapitres + 3 DESC
  F26 : Période syntaxique (profondeur de subordination, Proust/Simon)
  F27 : Modalité épistémique (incertitude narrative)
  F28 : Style indirect libre (fusion narrateur/personnage)
  F29 : Densité lexicale TTR (type-token ratio fenêtres 100 mots)
  F30 : Signature temporelle (passé simple vs imparfait vs présent)

RÈGLES DATA :
  - Tout fichier < 15k mots → REJECT TRUNCATED_TEXT
  - Beckett EN (scan PDF) → REJECT OCR_REQUIRED
  - La Route FR 5280 mots → REJECT TRUNCATED_TEXT
  - Hobbit 10972 mots → REJECT TRUNCATED_TEXT
"""

import os, sys, json, hashlib, re, random, logging, importlib.util, urllib.request
import urllib.error
from pathlib  import Path
from datetime import datetime
from collections import Counter
from statistics import mean, stdev

# ─── CONFIG ────────────────────────────────────────────────────────────────
PDF_DIR      = Path(r"C:\Users\elric\Downloads\livre")
TXT_DIR      = Path(r"C:\Users\elric\omega-project\omega-autopsie\gutenberg_cache")
OUTPUT_DIR   = Path("results_v4")
SCENES_DIR   = Path("scenes_v4")
LOG_FILE     = "fullwork_v4.log"

OUTPUT_DIR.mkdir(exist_ok=True)
SCENES_DIR.mkdir(exist_ok=True)
TXT_DIR.mkdir(parents=True, exist_ok=True)

# ─── DATA GATE SEUILS ──────────────────────────────────────────────────────
GATE_MIN_WORDS    = 15_000   # < 15k mots → TRUNCATED_TEXT
GATE_ALPHA_RATIO  = 0.60     # < 60% alpha → artefacts PDF
GATE_COVERAGE     = 0.40     # les extraits doivent couvrir > 40% du texte

# ─── PROTOCOLE ─────────────────────────────────────────────────────────────
SCENE_WORDS        = 300
N_RANDOM           = 10      # v4: 10 RANDOM vs 7 en v3
N_CHAPTERS         = 5       # v4: 5 chapitres vs 2 en v3
CHAPTER_MIN_WORDS  = 1500
CHAPTER_MAX_WORDS  = 7000

# ─── LOGGING ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("omega_v4")

# ══════════════════════════════════════════════════════════════════════════════
# CATALOGUE — 50 ŒUVRES DOMAINE PUBLIC (Gutenberg)
# Champs : gutenberg_id (list de tentatives), lang_original, corpus
# ══════════════════════════════════════════════════════════════════════════════

CATALOG_PUBLIC = [

    # ─── FR DOMAINE PUBLIC ─────────────────────────────────────────────────

    # BALZAC
    {"author": "balzac",    "title": "Le Père Goriot",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1835,
     "gutenberg_ids": [4634, 1588]},

    {"author": "balzac",    "title": "Eugénie Grandet",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1833,
     "gutenberg_ids": [1413]},

    {"author": "balzac",    "title": "Le Chef-d'œuvre inconnu",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1831,
     "gutenberg_ids": [23814]},

    # STENDHAL
    {"author": "stendhal",  "title": "Le Rouge et le Noir",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1830,
     "gutenberg_ids": [798, 14169]},

    {"author": "stendhal",  "title": "La Chartreuse de Parme",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1839,
     "gutenberg_ids": [29, 766]},

    # FLAUBERT (compléments — Bovary déjà en PDF)
    {"author": "flaubert",  "title": "L'Éducation Sentimentale",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1869,
     "gutenberg_ids": [8983, 2413]},

    {"author": "flaubert",  "title": "Salammbô",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1862,
     "gutenberg_ids": [4567, 1290]},

    # HUGO
    {"author": "hugo",      "title": "Les Misérables T1",
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

    {"author": "zola",      "title": "La Bête Humaine",
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
    {"author": "huysmans",  "title": "À Rebours",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1884,
     "gutenberg_ids": [12341, 4551]},

    # LOTI
    {"author": "loti",      "title": "Pêcheur d'Islande",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1886,
     "gutenberg_ids": [12961]},

    # GIDE
    {"author": "gide",      "title": "L'Immoraliste",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1902,
     "gutenberg_ids": [43844, 9971]},

    {"author": "gide",      "title": "La Porte Étroite",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1909,
     "gutenberg_ids": [4896, 9770]},

    {"author": "gide",      "title": "La Symphonie Pastorale",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1919,
     "gutenberg_ids": [8834]},

    # FRANCE
    {"author": "france",    "title": "L'Île des Pingouins",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1908,
     "gutenberg_ids": [13898]},

    # MÉRIMÉE
    {"author": "merimee",   "title": "Carmen",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1845,
     "gutenberg_ids": [2465]},

    # NERVAL
    {"author": "nerval",    "title": "Aurélia",
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

    # LAUTRÉAMONT
    {"author": "lautreamont","title": "Les Chants de Maldoror",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1869,
     "gutenberg_ids": [12005]},

    # VERNE
    {"author": "verne",     "title": "Vingt Mille Lieues",
     "corpus": "PD-FR",  "lang_original": "fr", "year": 1870,
     "gutenberg_ids": [5097, 54155]},

    # ─── EN DOMAINE PUBLIC (G3: lang_original=en uniquement — 2026-03-02) ──────
    # SUPPRIMÉS: Tolstoy×2(ru), Dostoevsky×3(ru), Kafka×2(de), Chekhov×1(ru), Mann×1(de)

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
    # SUPPRIMÉS G3: Kafka×2(de), Chekhov×1(ru) — 2026-03-02
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

    # SUPPRIMÉ G3: Mann Buddenbrooks (de) — 2026-03-02
]

# ══════════════════════════════════════════════════════════════════════════════
# CATALOGUE — ŒUVRES EXISTANTES (v3 → v4 avec DATA GATES)
# Rejet explicite : La Route FR (5280 mots), Hobbit (10972), Beckett-EN (scan)
# ══════════════════════════════════════════════════════════════════════════════

CATALOG_PDF = [
    # CAMUS
    {"file": "Letranger_French_Edition_-_Albert_Camus.pdf",
     "author": "camus", "title": "L'Étranger",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1942},
    {"file": "La_Peste_French_Edition_-_Albert_Camus.pdf",
     "author": "camus", "title": "La Peste",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1947},
    {"file": "LExil_et_le_Royaume_-_Albert_Camus.pdf",
     "author": "camus", "title": "L'Exil et le Royaume",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1957},
    {"file": "La_mort_heureuse_French_Edition_-_Albert_Camus.pdf",
     "author": "camus", "title": "La Mort Heureuse",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1971},
    # ERNAUX
    {"file": "Les_Annees_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Les Années",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2008},
    {"file": "la_place_French_Edition_-_annie_ernaux.pdf",
     "author": "ernaux", "title": "La Place",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1983},
    {"file": "Memoire_de_fille_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Mémoire de Fille",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2016},
    {"file": "Levenement_French_Edition_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "L'Événement",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2000},
    {"file": "La_femme_gelee_French_Edition_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "La Femme Gelée",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1981},
    {"file": "Ce_quils_disent_ou_rien_French_Edition_-_Ernaux_Annie.pdf",
     "author": "ernaux", "title": "Ce qu'ils disent ou rien",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1977},
    {"file": "Une_femme_French_Edition_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Une Femme",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1988},
    # MODIANO
    {"file": "Dora_Bruder_-_Modiano_Patrick.pdf",
     "author": "modiano", "title": "Dora Bruder",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1997},
    {"file": "Rue_des_Boutiques_Obscures_-_Patrick_Modiano.pdf",
     "author": "modiano", "title": "Rue des Boutiques Obscures",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1978},
    {"file": "La_Ronde_de_nuit_-_Patrick_Modiano.pdf",
     "author": "modiano", "title": "La Ronde de Nuit",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1969},
    {"file": "La_danseuse_-_Patrick_Modiano_FR.pdf",
     "author": "modiano", "title": "La Danseuse",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2022},
    {"file": "Quartier_Perdu_French_Edition_-_Modiano_Patrick.pdf",
     "author": "modiano", "title": "Quartier Perdu",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1984},
    {"file": "Encre_sympathique_French_Edition_-_Patrick_Modiano.pdf",
     "author": "modiano", "title": "Encre Sympathique",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2019},
    # CARRÈRE
    {"file": "CarrŠre, Emmanuel - L'Adversaire.pdf",
     "author": "carrere", "title": "L'Adversaire",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2000,
     "fallback": ["Carrere__Emmanuel_-_LAdversaire.pdf"]},
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
     "author": "houellebecq", "title": "Les Particules Élémentaires",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1998},
    {"file": "La_Carte_et_le_Territoire_-_Michel_Houellebecq.pdf",
     "author": "houellebecq", "title": "La Carte et le Territoire",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2010},
    {"file": "La_possibilite_dune_ile_French_Edition_-_Michel_Houellebecq.pdf",
     "author": "houellebecq", "title": "La Possibilité d'une Île",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2005},
    # LE CLÉZIO
    {"file": "Desert_-_JMG_Le_Clezio.pdf",
     "author": "leclezio", "title": "Désert",
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
     "author": "quignard", "title": "Terrasse à Rome",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2000},
    # BECKETT FR (OK — original FR)
    {"file": "Molloy_-_Samuel_Beckett.pdf",
     "author": "beckett", "title": "Molloy",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1951},
    # FLAUBERT (PDF existants)
    {"file": "Madame_Bovary_-_Gustave_Flaubert.pdf",
     "author": "flaubert", "title": "Madame Bovary",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1857},
    {"file": "Coeur_simple_French_Edition_-_Flaubert_Gustave.pdf",
     "author": "flaubert", "title": "Un Cœur Simple",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1877},
    # PROUST
    {"file": "Du_cote_de_chez_Swann_-_Marcel_Proust.pdf",
     "author": "proust", "title": "Du côté de chez Swann",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1913},
    # CÉLINE
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
    # TR-FR
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
     "author": "rulfo", "title": "Pedro Páramo (FR)",
     "corpus": "TR-FR", "lang_original": "es", "year": 1955},
    {"file": "LInsoutenable_Legerete_de_letre_French_Edition_-_Milan_Kundera.pdf",
     "author": "kundera", "title": "L'Insoutenable Légèreté (FR)",
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
    # EN-ORIG (sélection propre)
    {"file": "Blood_Meridian_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "Blood Meridian",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1985},
    {"file": "The_road_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "The Road",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2006},
    {"file": "Suttree_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "Suttree",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1979},
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
    {"file": "V_-_Thomas_Pynchon.pdf",
     "author": "pynchon", "title": "V.",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1963},
    {"file": "Fury_-_Salman_Rushdie.pdf",
     "author": "rushdie", "title": "Fury",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2001},
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
     # G3 CORRIGÉ: original IT → TR-EN (traduction EN de Weaver) — 2026-03-02
    # ─── NOUVELLES ENTRÉES 2026-03-02 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    # FR-ORIG — NOUVEAU ROMAN + 20ème
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
     "author": "sarraute", "title": "Le Planétarium",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1959},
    {"file": "Martereau_French_Edition_-_Sarraute_Nathalie.pdf",
     "author": "sarraute", "title": "Martereau",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1953},
    {"file": "Les_Mandarins_-_Simone_de_Beauvoir.pdf",
     "author": "beauvoir", "title": "Les Mandarins",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1954},
    {"file": "Alexis_ou_le_Traite_du_vain_combat__Le_Coup_de_grace_-_Marguerite_Yourcenar.pdf",
     "author": "yourcenar", "title": "Alexis / Le Coup de grâce",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1929},
    {"file": "La_Nausee_-_Jean-Paul_Sartre.pdf",
     "author": "sartre", "title": "La Nausée",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1938},
    {"file": "Texaco_-_Patrick_Chamoiseau.epub",
     "author": "chamoiseau", "title": "Texaco",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1992},
    {"file": "Trois_Femmes_puissantes_French_Edition_-_Marie_NDiaye.epub",
     "author": "ndiaye", "title": "Trois Femmes puissantes",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2009},
    # HIGH RISK TRUNCATION — DATA GATE décidera
    {"file": "Anna_soror_-_Marguerite_Yourcenar.pdf",
     "author": "yourcenar", "title": "Anna Soror",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1981},
    {"file": "Courir_French_Edition_-_Jean_echenoz.epub",
     "author": "echenoz", "title": "Courir",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2008},
    # EPUB (medium risk — extraction à valider)
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
     "author": "yourcenar", "title": "L’Œuvre au Noir",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1968},
    {"file": "Quoi__LEternite_-_Marguerite_Yourcenar.epub",
     "author": "yourcenar", "title": "Quoi ? L’Éternité",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1988},
    # EN-ORIG NOUVEAUX
    {"file": "No_Country_for_Old_Men_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "No Country for Old Men",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2005},
    {"file": "End_Zone_-_Don_DeLillo.pdf",
     "author": "delillo", "title": "End Zone",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1972},
    # TR-FR NOUVEAU
    {"file": "Letoile_de_Ratner_French_Edition_-_DeLillo_Don.pdf",
     "author": "delillo", "title": "L'Étoile de Ratner (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1976},
    # TR-EN NOUVEAUX
    {"file": "Do_What_They_Say_or_Else_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Do What They Say or Else (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1977},
    {"file": "Four_Novels_-_Marguerite_Duras.pdf",
     "author": "duras", "title": "Four Novels (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1965},
    # ─── PATCH 2026-03-02-B — Ocean files renommés ───────────────────────────────────────────────────────────────────
    # EN-ORIG : Hemingway, Dreiser, Wharton, Lawrence, James H., Woolf, Steinbeck, Chopin, Lewis
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
    {"file": "The_Waves_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "The Waves",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1931},
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
    # TR-FR nouveaux
    {"file": "Le_soleil_se_leve_aussi_French_Edition_-_Hemingway_Ernest.pdf",
     "author": "hemingway", "title": "Le Soleil se lève aussi (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1926},
    {"file": "Des_Souris_et_Des_hommes_French_Edition_-_John_Steinbeck.pdf",
     "author": "steinbeck", "title": "Des Souris et des Hommes (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1937},
    {"file": "Le_vieil_homme_et_la_mer_French_Edition_-_Ernest_Hemingway.pdf",
     "author": "hemingway", "title": "Le Vieil Homme et la Mer (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1952},
    # TR-EN nouveaux
    {"file": "Memoirs_of_Hadrian_-_Marguerite_Yourcenar.epub",
     "author": "yourcenar", "title": "Memoirs of Hadrian (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 1951},
    {"file": "The_Kingdom_-_Emmanuel_Carrere.pdf",
     "author": "carrere", "title": "The Kingdom (EN)",
     "corpus": "TR-EN", "lang_original": "fr", "year": 2014},
    # BONUS-THEATRE
    {"file": "Burning_Bright_-_John_Steinbeck.pdf",
     "author": "steinbeck", "title": "Burning Bright",
     "corpus": "BONUS-THEATRE", "lang_original": "en", "year": 1950},
    # BONUS-GENRE — Jeffrey A. Carver (SF)
    {"file": "Battlestar_Galactica_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Battlestar Galactica",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 2006},
    {"file": "Dog_Star_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Dog Star",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 2004},
    {"file": "Dragons_in_the_Stars_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Dragons in the Stars",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 1992},
    {"file": "Going_Alien_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Going Alien",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 2011},
    {"file": "Love_Rogo_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Love Rogo",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 2015},
    {"file": "Neptune_Crossing_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Neptune Crossing",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 1994},
    {"file": "Panglor_-_Jeffrey_A_Carver.pdf",
     "author": "carver_j", "title": "Panglor",
     "corpus": "BONUS-GENRE", "lang_original": "en", "year": 1980},
    # ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    # REJETÉS EXPLICITEMENT (ne pas inclure dans CATALOG_PDF)
    # "la-route-de-cormac-mccarthy.pdf"       → REJECT: 5280 mots TRUNCATED_TEXT
    # "Molloy-Malone-Dies-The-Unnamable.pdf"  → REJECT: 0 mots  OCR_REQUIRED
    # "the_hobbit..."                          → REJECT: 10972 mots TRUNCATED_TEXT
]

# ══════════════════════════════════════════════════════════════════════════════
# DATA GATES
# ══════════════════════════════════════════════════════════════════════════════

def check_data_gates(text: str, work_id: str) -> tuple[bool, str]:
    """
    Vérifie les gates. Retourne (PASS, "") ou (FAIL, "RAISON_CODE").

    Codes :
      TRUNCATED_TEXT  : texte trop court (< GATE_MIN_WORDS)
      GARBLED_TEXT   : trop peu de caractères alpha (PDF scan / artefacts)
    """
    words = text.split()
    n_words = len(words)

    # Gate 1 — longueur minimale
    if n_words < GATE_MIN_WORDS:
        log.warning(f"  GATE FAIL [{work_id}] TRUNCATED_TEXT — {n_words} mots < {GATE_MIN_WORDS}")
        return False, f"TRUNCATED_TEXT:{n_words}"

    # Gate 2 — ratio alpha
    alpha = sum(c.isalpha() for c in text)
    total_chars = max(len(text), 1)
    ratio = alpha / total_chars
    if ratio < GATE_ALPHA_RATIO:
        log.warning(f"  GATE FAIL [{work_id}] GARBLED_TEXT — alpha_ratio={ratio:.3f} < {GATE_ALPHA_RATIO}")
        return False, f"GARBLED_TEXT:{ratio:.3f}"

    return True, ""

# ══════════════════════════════════════════════════════════════════════════════
# DOWNLOAD GUTENBERG
# ══════════════════════════════════════════════════════════════════════════════

_GUTENBERG_URLS = [
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt",
    "https://www.gutenberg.org/files/{id}/{id}-0.txt",
    "https://www.gutenberg.org/files/{id}/{id}.txt",
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}-0.txt",
]

def download_gutenberg(gids: list, cache_dir: Path, label: str) -> str:
    """
    Télécharge un texte Gutenberg depuis une liste d'IDs (tentatives).
    Met en cache localement. Retourne le texte ou "".
    """
    for gid in gids:
        cache_file = cache_dir / f"pg{gid}.txt"
        if cache_file.exists():
            raw = cache_file.read_text(encoding="utf-8", errors="replace")
            if len(raw.split()) > 1000:
                log.info(f"  Gutenberg cache hit: pg{gid}.txt")
                return clean_gutenberg(raw)

        for url_tpl in _GUTENBERG_URLS:
            url = url_tpl.format(id=gid)
            try:
                req = urllib.request.Request(url, headers={
                    "User-Agent": "OMEGA-Research/1.0 (educational corpus calibration)"
                })
                with urllib.request.urlopen(req, timeout=30) as r:
                    raw = r.read().decode("utf-8", errors="replace")
                if len(raw.split()) > 1000:
                    cache_file.write_text(raw, encoding="utf-8")
                    log.info(f"  Gutenberg download OK: {url}")
                    return clean_gutenberg(raw)
            except (urllib.error.URLError, Exception) as e:
                log.debug(f"  URL fail {url}: {e}")
                continue

    log.warning(f"  Gutenberg échec total pour {label} (IDs: {gids})")
    return ""

def clean_gutenberg(raw: str) -> str:
    """Supprime header/footer Gutenberg standard.
    
    BUG FIX v4.1: "LIVRE PREMIER"/"PARTIE PREMIÈRE" sont des titres de chapitres
    qui apparaissent en milieu de texte. max() projetait start_pos après end_pos → "".
    Solution: marqueurs Gutenberg officiels uniquement + stratégie MINIMUM.
    """
    start_markers = ["*** START OF", "***START OF"]
    end_markers   = ["*** END OF", "***END OF", "End of the Project Gutenberg",
                     "End of Project Gutenberg"]

    start_pos = 0
    for m in start_markers:
        idx = raw.find(m)
        if idx >= 0:
            end_line = raw.find("\n", idx)
            if end_line > 0:
                candidate = end_line + 1
                # MINIMUM: prendre l'occurrence la plus tôt dans le texte
                if start_pos == 0 or candidate < start_pos:
                    start_pos = candidate

    end_pos = len(raw)
    for m in end_markers:
        idx = raw.rfind(m)
        if 0 < idx < len(raw):
            end_pos = min(end_pos, idx)

    text = raw[start_pos:end_pos]
    # Nettoyage basique
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()

# ══════════════════════════════════════════════════════════════════════════════
# EXTRACTION PDF
# ══════════════════════════════════════════════════════════════════════════════

def extract_pdf(path: Path) -> str:
    try:
        import fitz
        doc   = fitz.open(str(path))
        parts = []
        for page in doc:
            t = page.get_text()
            if t.strip():
                parts.append(t)
        doc.close()
        return "\n".join(parts)
    except Exception as e:
        log.error(f"  PDF extraction error: {e}")
        return ""

def find_pdf(work: dict) -> Path | None:
    # Normaliser le nom de fichier (fix encodage Carrère / CP1252)
    import unicodedata
    def _norm(s):
        return unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode()
    candidates = [work.get("file", "")] + work.get("fallback", [])
    for name in candidates:
        if name:
            p = PDF_DIR / name
            if p.exists():
                return p
    return None

def clean_text(raw: str) -> str:
    lines  = raw.split("\n")
    counts = Counter(l.strip() for l in lines if 3 < len(l.strip()) < 80)
    skip   = {l for l, c in counts.items() if c > 8}
    out    = []
    for l in lines:
        s = l.strip()
        if re.match(r"^\d{1,4}$", s):
            continue
        if s in skip:
            continue
        out.append(l)
    text = "\n".join(out)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# ══════════════════════════════════════════════════════════════════════════════
# CHARGEMENT AUTOPSIE V4
# ══════════════════════════════════════════════════════════════════════════════

_autopsie = None

def load_autopsie():
    global _autopsie
    if _autopsie:
        return _autopsie
    for p in [Path("autopsie_v4.py"), Path("../autopsie_v4.py")]:
        if p.exists():
            spec = importlib.util.spec_from_file_location("autopsie_v4", str(p))
            mod  = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            _autopsie = mod
            log.info(f"autopsie_v4 chargé: {p.resolve()}")
            return mod
    return None

def run_autopsie(text: str, work_id: str, lang_orig: str) -> dict:
    mod = load_autopsie()
    if not mod:
        return {}
    try:
        meta = {"work_id": work_id, "lang_original": lang_orig, "author": work_id}
        return mod.analyze(text, work_id, meta)
    except Exception as e:
        log.error(f"  autopsie error [{work_id}]: {e}")
        return {}

# ══════════════════════════════════════════════════════════════════════════════
# F24 — CONTRAST BUDGET (v3 conservé)
# ══════════════════════════════════════════════════════════════════════════════

def compute_f24(sents: list, features: dict) -> dict:
    if len(sents) < 10:
        return {"f24a_banal_rate": None, "f24b_apex_rate": None,
                "f24c_contrast_delta": None, "f24d_apex_isolation": None,
                "f24e_contrast_score": None, "f24f_profile": "INSUFFICIENT"}

    lens = [len(s.split()) for s in sents]
    s_lens = sorted(lens)
    n = len(s_lens)
    p25 = s_lens[n // 4]
    p75 = s_lens[3 * n // 4]

    banal_lens = [l for l in lens if l <= p25]
    apex_lens  = [l for l in lens if l >= p75]
    banal_rate = len(banal_lens) / n
    apex_rate  = len(apex_lens)  / n
    mean_banal = mean(banal_lens) if banal_lens else 0
    mean_apex  = mean(apex_lens)  if apex_lens  else 0
    contrast   = mean_apex - mean_banal

    apex_positions = [i for i, l in enumerate(lens) if l >= p75]
    if len(apex_positions) >= 2:
        gaps = [apex_positions[i+1] - apex_positions[i] for i in range(len(apex_positions)-1)]
        apex_isolation = mean(gaps)
    else:
        apex_isolation = float(n)

    balance_score   = max(0.0, 1.0 - abs(banal_rate - 0.25) * 2)
    contrast_score  = min(1.0, contrast / 15.0)
    isolation_score = max(0.0, 1.0 - abs(apex_isolation - 6.0) / 10.0)
    score = round((balance_score * 0.3 + contrast_score * 0.5 + isolation_score * 0.2), 5)
    score = max(0.0, min(1.0, score))

    if contrast < 5:
        profile = "UNIFORM"
    elif apex_rate > 0.35 and mean_apex > 30:
        profile = "PROUST"
    elif apex_rate > 0.30 and mean_apex <= 30:
        profile = "RUSHDIE"
    elif banal_rate > 0.35 and mean_banal < 8:
        profile = "HEMINGWAY" if contrast > 10 else "DURAS"
    else:
        profile = "MIXED"

    return {
        "f24a_banal_rate":     round(banal_rate,   5),
        "f24b_apex_rate":      round(apex_rate,    5),
        "f24c_contrast_delta": round(contrast,     3),
        "f24d_apex_isolation": round(apex_isolation, 2),
        "f24e_contrast_score": score,
        "f24f_profile":        profile,
        "f24_method":          "CONTRAST_BUDGET_OMEGA_V1",
    }

# ══════════════════════════════════════════════════════════════════════════════
# F25 — DESCRIPTION SCENE INDEX (v3 conservé)
# ══════════════════════════════════════════════════════════════════════════════

def compute_f25(text: str, sents: list) -> dict:
    txt_lower = text.lower()
    words     = text.split()
    n_words   = max(len(words), 1)
    n_sents   = max(len(sents), 1)

    SENSORY = {
        "visuel":   ["lumière","ombre","couleur","brillant","sombre","clair","lueur","reflet",
                     "light","shadow","gleam","glow","dark","bright","shimmer"],
        "auditif":  ["bruit","son","silence","murmure","voix","écho","craquement","souffle",
                     "noise","sound","whisper","creak","rumble","hum"],
        "tactile":  ["froid","chaud","doux","rugeux","humide","sec","peau","cold","warm",
                     "smooth","rough","damp","dry","skin"],
        "olfactif": ["odeur","parfum","senteur","fumée","smell","scent","fragrance","smoke","stench"],
        "gustatif": ["goût","amer","sucré","salé","taste","bitter","sweet","salty","sour"],
    }
    sensory_score = sum(1 for markers in SENSORY.values() if any(m in txt_lower for m in markers))

    ADJ_MARKERS = ["eux","euse","ique","able","ible","ant","ent","al","el","ous","ful","less","ive"]
    ADV_MARKERS = ["ment","ement","amment","ément","ly","ally"]
    ACTION_VERBS = ["marcha","couri","dit","répondi","prit","saisi","ouvri","ferma",
                    "walked","ran","said","took","opened","closed","grabbed","threw"]
    adj_count    = sum(1 for w in words if any(w.lower().endswith(m) for m in ADJ_MARKERS))
    adv_count    = sum(1 for w in words if any(w.lower().endswith(m) for m in ADV_MARKERS))
    action_count = max(sum(1 for w in words if any(v in w.lower() for v in ACTION_VERBS)), 1)
    description_density = min(round((adj_count + adv_count) / action_count, 4), 10.0)

    SUSPENSION = ["était","semblait","paraissait","demeurait","restait","planait","flottait",
                  "régnait","s'étendait","was","seemed","appeared","remained","hovered","lay"]
    susp_count      = sum(1 for w in words if w.lower() in SUSPENSION)
    time_suspension = round(susp_count / n_sents, 5)

    SPATIAL = ["loin","près","derrière","devant","sous","au-dessus","au-delà","au fond",
               "en bas","en haut","far","near","behind","beneath","above","beyond","horizon"]
    spatial_depth = round(min(sum(1 for m in SPATIAL if m in txt_lower) / 10.0, 1.0), 4)

    ABSTRACT_NOUNS = ["silence","lumière","obscurité","douleur","joie","tristesse","solitude",
                      "mémoire","temps","espace","light","darkness","pain","joy","sadness",
                      "memory","time","space","death","life","soul","fear","hope"]
    abstract_count  = sum(1 for w in words if w.lower() in ABSTRACT_NOUNS)
    nominalization  = round(abstract_count / n_words, 5)

    CONCRETE = ["pierre","bois","métal","fer","verre","tissu","cuir","terre","eau","feu","cendre",
                "os","stone","wood","metal","glass","leather","earth","water","fire","ash","bone"]
    object_density = round(sum(1 for w in words if w.lower() in CONCRETE) / n_words, 5)

    desc_score = round(
        min(description_density / 5.0, 1.0) * 0.25 +
        sensory_score / 5.0                 * 0.30 +
        min(time_suspension * 5, 1.0)       * 0.15 +
        spatial_depth                        * 0.15 +
        min(nominalization * 100, 1.0)      * 0.10 +
        min(object_density * 100, 1.0)      * 0.05, 5)

    if sensory_score >= 4 and object_density > 0.003:
        profile = "SENSORIEL"
    elif description_density > 4 and spatial_depth > 0.5:
        profile = "PICTURAL"
    elif time_suspension > 0.08 and nominalization > 0.005:
        profile = "ATMOSPHERIQUE"
    elif action_count > adj_count + adv_count:
        profile = "CINEMATIQUE"
    else:
        profile = "INVENTAIRE"

    return {
        "f25a_description_density": description_density,
        "f25b_sensory_coverage":    sensory_score,
        "f25c_time_suspension":     time_suspension,
        "f25d_spatial_depth":       spatial_depth,
        "f25e_nominalization":      nominalization,
        "f25f_object_density":      object_density,
        "f25g_description_score":   desc_score,
        "f25h_profile":             profile,
        "f25_method":               "OMEGA_DESC_INDEX_V1",
    }

# ══════════════════════════════════════════════════════════════════════════════
# F26 — PÉRIODE SYNTAXIQUE
# Profondeur de subordination — signature Proust/Simon
# ══════════════════════════════════════════════════════════════════════════════

def compute_f26(sents: list) -> dict:
    """
    F26 — Période syntaxique.
    Mesure la complexité de la phrase par imbrication.

    Marqueurs de subordination FR/EN :
      f26a  mean_sub_markers   : nb marqueurs subordonnants / phrase
      f26b  long_sent_rate     : fraction de phrases > 40 mots
      f26c  period_score       : composite complexité syntaxique
      f26d  regime             : PERIODIQUE | COMPLEXE | EQUILIBRE | TELEGRAPHIQUE

    Calibration :
      Simon/Proust → period_score > 0.6
      Camus/Ernaux → period_score < 0.3
    """
    SUB_FR = ["que","qui","dont","où","lequel","laquelle","lesquels","lesquelles",
              "quand","comme","si","puisque","parce","bien","quoique","malgré",
              "tandis","alors","lorsque","dès","avant","après","pendant","jusqu"]
    SUB_EN = ["that","which","who","whom","whose","where","when","although",
              "because","since","while","until","unless","whether","after",
              "before","though","even","whereas","provided"]
    ALL_SUB = set(SUB_FR + SUB_EN)

    sub_counts  = []
    sent_lens   = []
    for s in sents:
        words = s.lower().split()
        sub_n = sum(1 for w in words if w.rstrip(".,;:!?") in ALL_SUB)
        sub_counts.append(sub_n)
        sent_lens.append(len(words))

    if not sents:
        return {"f26a_mean_sub": 0, "f26b_long_rate": 0,
                "f26c_period_score": 0, "f26d_regime": "INSUFFICIENT"}

    mean_sub   = round(mean(sub_counts), 4)
    long_rate  = round(sum(1 for l in sent_lens if l > 40) / len(sent_lens), 4)

    # Score composite
    sub_score  = min(mean_sub / 6.0, 1.0)     # Proust ~5-8 marqueurs/phrase
    len_score  = long_rate                      # Simon → 80%+ phrases longues
    period_score = round(sub_score * 0.6 + len_score * 0.4, 5)

    if period_score > 0.55:
        regime = "PERIODIQUE"   # Simon, Proust
    elif period_score > 0.35:
        regime = "COMPLEXE"     # Faulkner, Gracq
    elif period_score > 0.18:
        regime = "EQUILIBRE"    # Balzac, Flaubert, Conrad
    else:
        regime = "TELEGRAPHIQUE"  # Camus, Beckett, Hemingway

    return {
        "f26a_mean_sub_markers": mean_sub,
        "f26b_long_sent_rate":   long_rate,
        "f26c_period_score":     period_score,
        "f26d_regime":           regime,
        "f26_method":            "OMEGA_PERIOD_V1",
    }

# ══════════════════════════════════════════════════════════════════════════════
# F27 — MODALITÉ ÉPISTÉMIQUE
# Incertitude narrative — l'art de ne pas affirmer
# ══════════════════════════════════════════════════════════════════════════════

def compute_f27(text: str, sents: list) -> dict:
    """
    F27 — Modalité épistémique.
    Mesure la densité de l'incertitude narrative.
    Distingue la prose affirmative (Zola) de la prose dubitative (Modiano/Nabokov).

    Marqueurs :
      f27a  epistemic_rate    : marqueurs épistémiques / 100 phrases
      f27b  conditional_rate  : conditionnel / passé simple (ratio)
      f27c  negation_rate     : négations complexes
      f27d  modal_score       : composite incertitude
      f27e  register          : ASSERTIF | NUANCE | DUBITATIVE | HALLUCINATOIRE
    """
    txt_lower  = text.lower()
    words_lower = txt_lower.split()
    n_sents    = max(len(sents), 1)
    n_words    = max(len(words_lower), 1)

    # Marqueurs épistémiques
    EPISTEMIC_FR = ["semblait","paraissait","apparemment","peut-être","probablement",
                    "sans doute","il me semblait","comme si","on eût dit","dirait-on",
                    "quelque chose","une sorte","une espèce","je croyais","il croyait",
                    "il lui semblait","avait l'air","avait l'impression"]
    EPISTEMIC_EN = ["seemed","appeared","apparently","perhaps","probably","possibly",
                    "as if","as though","something like","a kind of","sort of","might",
                    "could","would have","had seemed","it seemed"]

    ep_fr = sum(txt_lower.count(m) for m in EPISTEMIC_FR)
    ep_en = sum(txt_lower.count(m) for m in EPISTEMIC_EN)
    epistemic_rate = round((ep_fr + ep_en) / n_sents * 100, 4)

    # Conditionnel FR (imparfait subjonctif / conditionnel passé)
    CONDITIONAL_FR = ["aurait","aurait été","eût","eût été","serait","fût","voudrait"]
    PASSE_SIMPLE   = ["fut","eut","dit","prit","vit","alla","revint","sembla","parut"]
    cond_count = sum(txt_lower.count(m) for m in CONDITIONAL_FR)
    ps_count   = max(sum(txt_lower.count(m) for m in PASSE_SIMPLE), 1)
    conditional_rate = round(cond_count / ps_count, 4)

    # Négations complexes
    NEG_COMPLEX = ["ne...que","nul","aucun","jamais","guère","ni...ni","point",
                   "nullement","en aucune façon","rien de","pas un seul"]
    neg_count   = sum(txt_lower.count(m) for m in NEG_COMPLEX)
    negation_rate = round(neg_count / n_sents * 100, 4)

    # Score composite
    ep_score   = min(epistemic_rate / 20.0, 1.0)
    cond_score = min(conditional_rate / 2.0, 1.0)
    neg_score  = min(negation_rate / 10.0, 1.0)
    modal_score = round(ep_score * 0.5 + cond_score * 0.3 + neg_score * 0.2, 5)

    if modal_score > 0.6:
        register = "HALLUCINATOIRE"  # Nabokov, Nerval
    elif modal_score > 0.35:
        register = "DUBITATIVE"      # Modiano, Proust
    elif modal_score > 0.15:
        register = "NUANCE"          # Flaubert, Balzac
    else:
        register = "ASSERTIF"        # Zola, Maupassant

    return {
        "f27a_epistemic_rate":    epistemic_rate,
        "f27b_conditional_rate":  conditional_rate,
        "f27c_negation_rate":     negation_rate,
        "f27d_modal_score":       modal_score,
        "f27e_register":          register,
        "f27_method":             "OMEGA_EPISTEMIC_V1",
    }

# ══════════════════════════════════════════════════════════════════════════════
# F28 — STYLE INDIRECT LIBRE
# Fusion narrateur / personnage — l'arme secrète de Flaubert
# ══════════════════════════════════════════════════════════════════════════════

def compute_f28(text: str, sents: list) -> dict:
    """
    F28 — Style indirect libre (SIL / Free indirect discourse).
    Mesure la fusion voix-narrateur / voix-personnage.
    Technique fondamentale depuis Flaubert.

    Marqueurs :
      - Interrogation sans verbe déclarant
      - Imparfait avec déictiques de première personne
      - "Oui, elle... Non, il..." (réponse intérieure)
      - Exclamation + imparfait
      - "après tout", "bien sûr", "évidemment" (ironie narrative)

    f28a  sil_rate      : phrases SIL / total phrases
    f28b  irony_density : marqueurs d'ironie narrative
    f28c  interior_rate : monologue intérieur implicite
    f28d  sil_score     : composite
    f28e  profile       : EXPLICIT | INDIRECT | FLAUBERTIEN | STREAM
    """
    txt_lower = text.lower()
    sents_lower = [s.lower() for s in sents]
    n_sents = max(len(sents), 1)

    # Marqueurs SIL
    SIL_MARKERS_FR = ["après tout","bien sûr","évidemment","comment donc","n'était-ce pas",
                      "car enfin","mais non","mais si","que diable","sapré",
                      "certainement","décidément","vraiment","quelle idée","quel imbécile"]
    SIL_MARKERS_EN = ["after all","of course","certainly","how odd","no doubt",
                      "why not","what a","surely","indeed","obviously","well then"]

    sil_count = sum(1 for m in SIL_MARKERS_FR + SIL_MARKERS_EN if m in txt_lower)
    sil_rate  = round(sil_count / n_sents * 100, 4)

    # Ironie narrative (fausse affirmation + conditionnel)
    IRONY = ["on eût dit","c'était bien là","voilà qui","comme c'est","comme il convient",
             "naturellement","il va sans dire","cela s'entend","bien entendu"]
    irony_density = round(sum(txt_lower.count(m) for m in IRONY) / n_sents * 100, 4)

    # Monologue intérieur implicite : phrase interrogative + imparfait
    interior_count = sum(
        1 for s in sents_lower
        if s.endswith("?") and any(m in s for m in ["ait","ait-il","ait-elle","était"])
    )
    interior_rate = round(interior_count / n_sents, 4)

    sil_score = round(
        min(sil_rate / 20.0, 1.0)    * 0.4 +
        min(irony_density / 5.0, 1.0) * 0.35 +
        min(interior_rate * 5, 1.0)   * 0.25, 5)

    if sil_score > 0.6:
        profile = "STREAM"          # Woolf, Joyce
    elif sil_score > 0.35:
        profile = "FLAUBERTIEN"     # Flaubert, Proust, Simon
    elif sil_score > 0.15:
        profile = "INDIRECT"        # Balzac, Zola, Stendhal
    else:
        profile = "EXPLICIT"        # Narration directe sans SIL

    return {
        "f28a_sil_rate":       sil_rate,
        "f28b_irony_density":  irony_density,
        "f28c_interior_rate":  interior_rate,
        "f28d_sil_score":      sil_score,
        "f28e_profile":        profile,
        "f28_method":          "OMEGA_SIL_V1",
    }

# ══════════════════════════════════════════════════════════════════════════════
# F29 — DENSITÉ LEXICALE TTR
# Type-Token Ratio sur fenêtres glissantes — richesse lexicale locale
# ══════════════════════════════════════════════════════════════════════════════

def compute_f29(text: str) -> dict:
    """
    F29 — Densité lexicale (TTR fenêtres).
    TTR global biaisé par longueur → on calcule sur fenêtres de 100 mots.

    f29a  ttr_global    : hapax / total mots (bonne pour comparer à même longueur)
    f29b  ttr_window    : médiane TTR fenêtres 100 mots
    f29c  ttr_stdev     : variance TTR (style constant vs variable)
    f29d  ttr_score     : composite richesse
    f29e  register      : REDONDANT | STANDARD | RICHE | HYPER_RICHE
    """
    WINDOW = 100
    words = [w.lower().strip(".,;:!?\"'()[]") for w in text.split() if len(w) > 1]
    n = len(words)

    if n < WINDOW:
        return {"f29a_ttr_global": 0, "f29b_ttr_window": 0, "f29c_ttr_stdev": 0,
                "f29d_ttr_score": 0, "f29e_register": "INSUFFICIENT"}

    # TTR global
    ttr_global = round(len(set(words)) / n, 4)

    # TTR fenêtres
    window_ttrs = []
    for i in range(0, n - WINDOW + 1, 50):  # overlap 50
        w = words[i: i + WINDOW]
        window_ttrs.append(len(set(w)) / WINDOW)

    ttr_window = round(mean(window_ttrs), 4)
    ttr_stdev  = round(stdev(window_ttrs) if len(window_ttrs) > 1 else 0.0, 4)

    ttr_score = round(min(ttr_window / 0.80, 1.0) * 0.7 + min(ttr_stdev * 5, 1.0) * 0.3, 5)

    if ttr_window > 0.75:
        register = "HYPER_RICHE"   # Nabokov, Perec, Huysmans
    elif ttr_window > 0.60:
        register = "RICHE"         # Proust, Flaubert, Conrad
    elif ttr_window > 0.45:
        register = "STANDARD"      # Zola, Balzac, Maupassant
    else:
        register = "REDONDANT"     # Style oral, répétitif

    return {
        "f29a_ttr_global":  ttr_global,
        "f29b_ttr_window":  ttr_window,
        "f29c_ttr_stdev":   ttr_stdev,
        "f29d_ttr_score":   ttr_score,
        "f29e_register":    register,
        "f29_method":       "OMEGA_TTR_WINDOW100_V1",
    }

# ══════════════════════════════════════════════════════════════════════════════
# F30 — SIGNATURE TEMPORELLE
# Distribution passé simple / imparfait / présent — ADN du récit FR
# ══════════════════════════════════════════════════════════════════════════════

def compute_f30(text: str) -> dict:
    """
    F30 — Signature temporelle (FR primarily).
    Le passé simple = narration distanciée (Zola, Maupassant).
    L'imparfait = durée, atmosphère (Flaubert, Proust, Modiano).
    Le présent  = immédiateté, rupture (Ernaux, Camus).

    Heuristique lexicale — pas de parsing morphologique.

    f30a  passe_simple_rate  : terminaisons passé simple (a, it, ut, nt)
    f30b  imparfait_rate     : terminaisons imparfait (ait, aient, ais)
    f30c  present_rate       : terminaisons présent (e, es, ent)
    f30d  ps_imp_ratio       : passé simple / imparfait (< 1 = style duratif)
    f30e  temporal_signature : NARRATIF | DURATIF | IMMÉDIAT | MIXTE
    """
    words = text.split()
    n = max(len(words), 1)

    # Terminaisons passé simple (FR, 3è pers sg/pl)
    PS_ENDS  = ("a","it","ut","int","urent","irent","èrent","nt")
    # Terminaisons imparfait
    IMP_ENDS = ("ait","aient","ais","aient")
    # Terminaisons présent
    PR_ENDS  = ("e","es","ent","er")

    # On filtre sur des mots > 3 lettres pour éviter les faux positifs
    long_words = [w.lower().rstrip(".,;:!?\"'") for w in words if len(w) > 3]

    ps_count  = sum(1 for w in long_words if any(w.endswith(e) for e in PS_ENDS))
    imp_count = sum(1 for w in long_words if any(w.endswith(e) for e in IMP_ENDS))
    pr_count  = sum(1 for w in long_words if any(w.endswith(e) for e in PR_ENDS))
    total = max(ps_count + imp_count + pr_count, 1)

    ps_rate  = round(ps_count  / total, 4)
    imp_rate = round(imp_count / total, 4)
    pr_rate  = round(pr_count  / total, 4)
    ps_imp_ratio = round(math.log1p(ps_count / max(imp_count, 1)), 4)  # log1p: borne explosion Indiana/EN

    # Signature
    if ps_rate > 0.40:
        signature = "NARRATIF"    # Zola, Maupassant, Balzac
    elif imp_rate > 0.40:
        signature = "DURATIF"     # Proust, Flaubert, Modiano
    elif pr_rate > 0.50:
        signature = "IMMÉDIAT"    # Ernaux, Camus, Beckett
    else:
        signature = "MIXTE"

    return {
        "f30a_passe_simple_rate":  ps_rate,
        "f30b_imparfait_rate":     imp_rate,
        "f30c_present_rate":       pr_rate,
        "f30d_ps_imp_ratio":       ps_imp_ratio,
        "f30e_temporal_signature": signature,
        "f30_method":              "OMEGA_TEMPORAL_V1",
    }

# ══════════════════════════════════════════════════════════════════════════════
# SEGMENTATION & PROTOCOL
# ══════════════════════════════════════════════════════════════════════════════

def split_sentences(text: str) -> list:
    raw = re.split(r"(?<=[.!?…»])\s+", text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def split_chapters(text: str) -> list:
    pattern = re.compile(
        r"\n\s*(?:chapitre|chapter|partie|part|section|livre|book|"
        r"I{1,4}V?|VI{0,4}|X{0,3}I{0,4}V?|\d{1,3}[.)]\s|[IVX]{1,5}[.)]\s)",
        re.IGNORECASE,
    )
    splits = [m.start() for m in pattern.finditer(text)]
    if len(splits) < 2:
        paras = re.split(r"\n{2,}", text)
        chapters, current = [], []
        for p in paras:
            current.append(p)
            if sum(len(c.split()) for c in current) >= 2000:
                chapters.append("\n\n".join(current))
                current = []
        if current:
            chapters.append("\n\n".join(current))
        return chapters

    chapters = []
    for i, pos in enumerate(splits):
        end = splits[i+1] if i+1 < len(splits) else len(text)
        chapters.append(text[pos:end])
    return chapters

def score_density(text: str) -> float:
    sents = split_sentences(text)
    if not sents:
        return 0.0
    words = text.split()
    mean_len   = mean(len(s.split()) for s in sents) if sents else 0
    word_set   = set(w.lower() for w in words if len(w) > 3)
    hapax_rate = len(word_set) / max(len(words), 1)
    return mean_len * 0.4 + hapax_rate * 0.6

def extract_climax(segments: list) -> dict:
    """
    CLIMAX : segment avec changement de densité maximal vs voisins.
    Proxy de "moment de tension maximale".
    """
    if len(segments) < 3:
        return segments[-1] if segments else {"pos": 0, "text": "", "score": 0.0}
    scores = [s["score"] for s in segments]
    deltas = [abs(scores[i+1] - scores[i-1]) for i in range(1, len(scores)-1)]
    best_i = deltas.index(max(deltas)) + 1
    return segments[best_i]

def extract_protocol(text: str) -> dict:
    """
    Protocole v4 — 15 extraits + 5 chapitres + 3 desc :
      APEX, NEUTRE, SEUIL, INCIPIT, EXPLICIT, CLIMAX, RANDOM×10
    """
    words = text.split()
    total = len(words)
    if total < SCENE_WORDS * 4:
        return {"extracts": [], "chapters": [], "descriptive": []}

    # Segments de SCENE_WORDS mots
    segments = []
    pos = 0
    while pos + SCENE_WORDS <= total:
        seg_text = " ".join(words[pos: pos + SCENE_WORDS])
        segments.append({"pos": pos, "text": seg_text, "score": score_density(seg_text)})
        pos += SCENE_WORDS

    if not segments:
        return {"extracts": [], "chapters": [], "descriptive": []}

    by_score = sorted(segments, key=lambda x: x["score"])
    apex   = by_score[-1]
    seuil  = by_score[0]
    neutre = min(segments, key=lambda x: abs(x["pos"] - total // 2))
    climax_seg = extract_climax(segments)

    # INCIPIT : 1er segment > 500 mots dans le texte (pas la couverture)
    incipit_pos = max(200, int(total * 0.02))
    incipit_text = " ".join(words[incipit_pos: incipit_pos + SCENE_WORDS])
    incipit = {"pos": incipit_pos, "text": incipit_text, "score": score_density(incipit_text)}

    # EXPLICIT : dernier segment > 500 mots avant la fin
    explicit_pos = max(0, total - SCENE_WORDS - 200)
    explicit_text = " ".join(words[explicit_pos: explicit_pos + SCENE_WORDS])
    explicit = {"pos": explicit_pos, "text": explicit_text, "score": score_density(explicit_text)}

    # RANDOM×10 stratifiés
    random.seed(42)
    core = [s for s in segments if total * 0.05 < s["pos"] < total * 0.95]
    step = max(1, len(core) // N_RANDOM)
    tranches = [core[i*step: (i+1)*step] for i in range(N_RANDOM)]
    randoms  = [random.choice(t) for t in tranches if t]

    special = [apex, neutre, seuil, incipit, explicit, climax_seg]
    special_positions = {s["pos"] for s in special}
    randoms = [r for r in randoms if r["pos"] not in special_positions]

    extracts = (
        [{"type": "APEX",    **apex}] +
        [{"type": "NEUTRE",  **neutre}] +
        [{"type": "SEUIL",   **seuil}] +
        [{"type": "INCIPIT", **incipit}] +
        [{"type": "EXPLICIT", **explicit}] +
        [{"type": "CLIMAX",  **climax_seg}] +
        [{"type": f"RANDOM_{i:02d}", **r} for i, r in enumerate(randoms)]
    )

    # CHAPITRES — jusqu'à N_CHAPTERS
    all_chaps = split_chapters(text)
    valid_chaps = [c for c in all_chaps
                   if CHAPTER_MIN_WORDS <= len(c.split()) <= CHAPTER_MAX_WORDS]
    if not valid_chaps:
        step_c = max(1, total // N_CHAPTERS)
        valid_chaps = [" ".join(words[i*step_c: min((i+1)*step_c, total)])
                       for i in range(N_CHAPTERS)]
        valid_chaps = [c for c in valid_chaps if len(c.split()) >= 500]

    chapters = []
    # CHAPTER_KEY : le plus dense
    if valid_chaps:
        key_chap = max(valid_chaps, key=lambda c: score_density(c[:2000]))
        chapters.append({"type": "CHAPTER_KEY", "text": key_chap})
        # CHAPTER_RANDOM : positions distribuées
        n_remain = min(N_CHAPTERS - 1, len(valid_chaps) - 1)
        if n_remain > 0:
            step_r = max(1, len(valid_chaps) // n_remain)
            for i in range(n_remain):
                idx = min(i * step_r, len(valid_chaps)-1)
                if valid_chaps[idx] != key_chap:
                    chapters.append({"type": f"CHAPTER_{i+1:02d}", "text": valid_chaps[idx]})

    # SCÈNES DESCRIPTIVES (3 meilleures F25)
    desc_candidates = by_score[:min(15, len(by_score))]
    desc_scored = []
    for seg in desc_candidates:
        f25 = compute_f25(seg["text"], split_sentences(seg["text"]))
        desc_scored.append({**seg, "f25_score": f25["f25g_description_score"], "f25": f25})
    desc_scored.sort(key=lambda x: x["f25_score"], reverse=True)
    descriptive = [{"type": f"DESC_{i:02d}", **d} for i, d in enumerate(desc_scored[:3])]

    return {"extracts": extracts, "chapters": chapters, "descriptive": descriptive}

# ══════════════════════════════════════════════════════════════════════════════
# ANALYSE COMPLÈTE
# ══════════════════════════════════════════════════════════════════════════════

def compute_all_new_features(text: str, sents: list, features: dict) -> dict:
    """Calcule F24-F30 et fusionne dans features."""
    out = {}
    out.update(compute_f24(sents, features))
    out.update(compute_f25(text, sents))
    out.update(compute_f26(sents))
    out.update(compute_f27(text, sents))
    out.update(compute_f28(text, sents))
    out.update(compute_f29(text))
    out.update(compute_f30(text))
    return out

def process_work(work: dict, text_override: str = "") -> dict | None:
    author  = work["author"]
    title   = work["title"]
    corpus  = work["corpus"]
    lang_o  = work["lang_original"]
    work_id = f"{author}_{re.sub(r'[^a-zA-Z0-9]', '_', title[:20])}"

    log.info(f"\n{'─'*60}")
    log.info(f"  [{corpus}] {title} — {author}")

    # Obtenir le texte (Gutenberg ou PDF)
    if text_override:
        raw = text_override
        log.info(f"  Source: Gutenberg TXT")
    else:
        pdf = find_pdf(work)
        if not pdf:
            log.error(f"  PDF introuvable: {work.get('file','?')}")
            return {"meta": {"work_id": work_id, "gate_fail": "PDF_NOT_FOUND", **work}}
        log.info(f"  PDF: {pdf.name} ({pdf.stat().st_size // 1024:,} KB)")
        raw = extract_pdf(pdf)

    if not raw:
        log.error("  Extraction vide → REJECT OCR_REQUIRED")
        return {"meta": {"work_id": work_id, "gate_fail": "OCR_REQUIRED", **work}}

    text       = clean_text(raw) if not text_override else raw
    word_count = len(text.split())
    log.info(f"  Mots: {word_count:,}")

    # DATA GATES
    gate_ok, gate_code = check_data_gates(text, work_id)
    if not gate_ok:
        return {"meta": {"work_id": work_id, "title": title, "author": author,
                         "corpus": corpus, "gate_fail": gate_code}}

    # Protocole extraction
    log.info("  Protocole APEX/NEUTRE/SEUIL/INCIPIT/EXPLICIT/CLIMAX/RANDOM×10/CHAPTERS×5...")
    protocol   = extract_protocol(text)
    n_ext      = len(protocol["extracts"])
    n_chap     = len(protocol["chapters"])
    n_desc     = len(protocol["descriptive"])
    log.info(f"  Extraits: {n_ext} | Chapitres: {n_chap} | Descriptifs: {n_desc}")

    # Analyse par extrait
    log.info("  Analyse autopsie_v4 + F24-F30...")
    extract_results = []
    for ex in protocol["extracts"]:
        r     = run_autopsie(ex["text"], f"{work_id}_{ex['type']}", lang_o)
        feats = r.get("features", {}) if r else {}
        sents = split_sentences(ex["text"])
        feats.update(compute_all_new_features(ex["text"], sents, feats))
        extract_results.append({"type": ex["type"], "pos": ex.get("pos", 0),
                                 "features": feats})

    # Analyse chapitres
    chapter_results = []
    for ch in protocol["chapters"]:
        r     = run_autopsie(ch["text"], f"{work_id}_{ch['type']}", lang_o)
        feats = r.get("features", {}) if r else {}
        sents = split_sentences(ch["text"])
        feats.update(compute_all_new_features(ch["text"], sents, feats))
        chapter_results.append({"type": ch["type"], "words": len(ch["text"].split()),
                                 "features": feats})

    # Analyse descriptive
    desc_results = []
    for d in protocol["descriptive"]:
        r     = run_autopsie(d["text"], f"{work_id}_{d['type']}", lang_o)
        feats = r.get("features", {}) if r else {}
        feats.update(d.get("f25", {}))
        desc_results.append({"type": d["type"], "f25_score": d.get("f25_score", 0),
                              "features": feats})

    # Moyennes
    all_dicts = [er["features"] for er in extract_results + chapter_results]
    averages  = {k: round(mean(v), 6) for k, v in
                 {f: [d[f] for d in all_dicts if isinstance(d.get(f), (int, float)) and d.get(f) is not None]
                  for f in set().union(*all_dicts)}.items() if v}

    log.info(f"  OK: {len(extract_results)} extraits + {len(chapter_results)} chapitres analysés")

    result = {
        "meta": {
            "work_id": work_id, "author": author, "title": title,
            "corpus": corpus, "lang_original": lang_o,
            "year": work.get("year"), "word_count": word_count,
            "analyzed_at": datetime.now().isoformat(),
            "text_sha": hashlib.sha256(text.encode()).hexdigest()[:16],
        },
        "protocol": {
            "extracts_count": len(extract_results),
            "chapters_count": len(chapter_results),
            "descriptive_count": len(desc_results),
        },
        "averages":    averages,
        "extracts":    extract_results,
        "chapters":    chapter_results,
        "descriptive": desc_results,
    }

    out_file = OUTPUT_DIR / f"{work_id[:40]}.json"
    out_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    sha = hashlib.sha256(out_file.read_bytes()).hexdigest()[:12]
    log.info(f"  → {out_file.name} | SHA: {sha}")

    # Sauvegarder extraits texte
    sc_dir = SCENES_DIR / author
    sc_dir.mkdir(exist_ok=True)
    for ex in protocol["extracts"][:6]:  # APEX/NEUTRE/SEUIL/INCIPIT/EXPLICIT/CLIMAX
        fname = f"{title[:15].replace(' ','_')}_{ex['type']}.txt"
        (sc_dir / fname).write_text(ex["text"], encoding="utf-8")

    return result

def compute_averages_group(feat_dicts: list) -> dict:
    all_vals = {}
    for fd in feat_dicts:
        for k, v in fd.items():
            if isinstance(v, (int, float)) and v is not None:
                all_vals.setdefault(k, []).append(float(v))
    return {k: round(mean(v), 6) for k, v in all_vals.items() if v}

# ══════════════════════════════════════════════════════════════════════════════
# Z-SCORES & RANKING
# ══════════════════════════════════════════════════════════════════════════════

KEY_FEATURES = [
    "f21e_ritual_index", "f22f_literary_index",
    "f23d_literary_causal_score", "f19e_window_median",
    "f1_mean", "f1a_rhythm_variance",
    "f24e_contrast_score", "f25g_description_score",
    "f26c_period_score", "f27d_modal_score",
    "f28d_sil_score", "f29b_ttr_window", "f30d_ps_imp_ratio",
]

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
    print("OMEGA v4 — CLASSEMENT PROSE — PROTOCOLE PUISSANCE 10")
    print("="*130)
    # G3 2026-03-02: IT-ORIG supprimé. BONUS-* ajoutés (inactifs calibration).
    order = ["FR-ORIG", "PD-FR", "TR-FR", "EN-ORIG", "PD-EN", "TR-EN",
             "BONUS-THEATRE", "BONUS-GENRE", "BONUS-NF", "OTHER"]
    for corpus_label in order:
        group = [r for r in results if r["meta"].get("corpus") == corpus_label]
        if not group:
            continue
        group.sort(key=lambda r: r.get("averages", {}).get("f22f_literary_index", 0), reverse=True)
        print(f"\n── {corpus_label} ({len(group)} œuvres) ──")
        hdr = f"  {'Titre':<32} {'F21':>7} {'F22':>7} {'F24':>7} {'F25':>7} {'F26':>7} {'F27':>7} {'F28':>7} {'F29-TTR':>8} {'F30':>7}"
        print(hdr)
        print("  " + "─"*115)
        for r in group:
            av = r.get("averages", {})
            def fmt(k): return f"{av.get(k,'N/A'):.3f}" if isinstance(av.get(k), float) else "N/A"
            print(
                f"  {r['meta']['title'][:31]:<32}"
                f"  {fmt('f21e_ritual_index'):>6}"
                f"  {fmt('f22f_literary_index'):>6}"
                f"  {fmt('f24e_contrast_score'):>6}"
                f"  {fmt('f25g_description_score'):>6}"
                f"  {fmt('f26c_period_score'):>6}"
                f"  {fmt('f27d_modal_score'):>6}"
                f"  {fmt('f28d_sil_score'):>6}"
                f"  {fmt('f29b_ttr_window'):>7}"
                f"  {fmt('f30d_ps_imp_ratio'):>6}"
            )

    print("\n" + "="*130)
    print("TOP 3 PAR FEATURE")
    print("="*130)
    feat_labels = [
        ("f22f_literary_index",        "Index littéraire (F22)"),
        ("f21e_ritual_index",          "Rituel incantatoire (F21)"),
        ("f24e_contrast_score",        "Contrast Budget (F24)"),
        ("f25g_description_score",     "Image mentale (F25)"),
        ("f26c_period_score",          "Période syntaxique (F26)"),
        ("f27d_modal_score",           "Modalité épistémique (F27)"),
        ("f28d_sil_score",             "Style indirect libre (F28)"),
        ("f29b_ttr_window",            "Densité lexicale TTR (F29)"),
        ("f1a_rhythm_variance",        "Variance rythmique (F1a)"),
    ]
    titles = {r["meta"]["work_id"]: r["meta"]["title"] for r in results}
    for feat, label in feat_labels:
        vals = {r["meta"]["work_id"]: r.get("averages", {}).get(feat)
                for r in results if isinstance(r.get("averages", {}).get(feat), float)}
        if vals:
            top = sorted(vals.items(), key=lambda x: x[1], reverse=True)[:3]
            top_str = " > ".join(f"{titles.get(k, k)[:18]} ({v:.3f})" for k, v in top)
            print(f"  {label:<38}: {top_str}")
    print()

def save_ranking(results: list, zscores: dict, rejected: list):
    data = {
        "generated_at":   datetime.now().isoformat(),
        "total_analyzed": len(results),
        "total_rejected": len(rejected),
        "rejected":       rejected,
        "protocol": {
            "version":           "v4",
            "extracts_per_work": "15 (APEX+NEUTRE+SEUIL+INCIPIT+EXPLICIT+CLIMAX+RANDOM×10)",
            "chapters_per_work": f"{N_CHAPTERS} (KEY + positions stratifiées)",
            "features":          "F1-F23 (autopsie_v4) + F24 + F25 + F26 + F27 + F28 + F29 + F30",
            "scene_words":       SCENE_WORDS,
            "normalization":     "Z-scores par corpus séparément",
        },
        "works": [
            {
                "work_id": r["meta"]["work_id"],
                "title":   r["meta"]["title"],
                "author":  r["meta"]["author"],
                "corpus":  r["meta"].get("corpus"),
                "year":    r["meta"].get("year"),
                "words":   r["meta"].get("word_count"),
                "scores":  {k: r.get("averages", {}).get(k) for k in KEY_FEATURES},
            }
            for r in results
        ],
        "zscores_by_corpus": zscores,
    }
    path = OUTPUT_DIR / "RANKING_V4.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    sha  = hashlib.sha256(path.read_bytes()).hexdigest()
    log.info(f"\nRANKING_V4.json | SHA: {sha}")
    return sha

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    log.info("="*70)
    log.info("OMEGA — Full Work Analyzer v4 — PUISSANCE 10")
    log.info(f"PDF Catalog:       {len(CATALOG_PDF)} œuvres")
    log.info(f"Public Domain:     {len(CATALOG_PUBLIC)} œuvres (Gutenberg)")
    log.info(f"Total cible:       {len(CATALOG_PDF) + len(CATALOG_PUBLIC)} œuvres")
    log.info(f"Protocole:         15 extraits + {N_CHAPTERS} chapitres + 3 desc / œuvre")
    log.info(f"Features:          F1-F23 + F24 + F25 + F26 + F27 + F28 + F29 + F30")
    log.info(f"Data gates:        min {GATE_MIN_WORDS:,} mots | alpha ≥ {GATE_ALPHA_RATIO}")
    log.info("="*70)

    results  = []
    rejected = []
    total    = 0

    # ── Phase 1 : PDF existants ─────────────────────────────────────────────
    log.info(f"\n{'═'*40} PHASE 1 — PDF ({len(CATALOG_PDF)} œuvres) {'═'*40}")
    for i, work in enumerate(CATALOG_PDF, 1):
        total += 1
        log.info(f"\n[PDF {i}/{len(CATALOG_PDF)}]")
        try:
            r = process_work(work)
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

    # ── Phase 2 : Domaine Public (Gutenberg) ─────────────────────────────────
    log.info(f"\n{'═'*40} PHASE 2 — GUTENBERG ({len(CATALOG_PUBLIC)} œuvres) {'═'*40}")
    for i, work in enumerate(CATALOG_PUBLIC, 1):
        total += 1
        log.info(f"\n[PD {i}/{len(CATALOG_PUBLIC)}]")
        label = f"{work['author']}_{work['title'][:15]}"
        try:
            text = download_gutenberg(work["gutenberg_ids"], TXT_DIR, label)
            if not text:
                log.warning(f"  SKIP {label}: téléchargement échoué")
                rejected.append({"title": work["title"], "reason": "GUTENBERG_DOWNLOAD_FAIL"})
                continue
            r = process_work(work, text_override=text)
            if r:
                if r.get("meta", {}).get("gate_fail"):
                    rejected.append({"title": work["title"], "reason": r["meta"]["gate_fail"]})
                else:
                    results.append(r)
        except Exception as e:
            log.error(f"  EXCEPTION: {e}")
            import traceback; traceback.print_exc()
            rejected.append({"title": work.get("title","?"), "reason": f"EXCEPTION:{e}"})

    # ── Classement & sortie ──────────────────────────────────────────────────
    print_ranking(results)
    zscores = compute_zscores(results)
    sha = save_ranking(results, zscores, rejected)

    log.info("\n" + "="*70)
    log.info("TERMINÉ")
    log.info(f"  Analysées  : {len(results)}/{total}")
    log.info(f"  Rejetées   : {len(rejected)}")
    for r in rejected:
        log.info(f"    ✗ {r['title']:40} [{r['reason']}]")
    log.info(f"  RANKING_V4 : SHA {sha[:20]}")
    log.info("="*70)

if __name__ == "__main__":
    main()
