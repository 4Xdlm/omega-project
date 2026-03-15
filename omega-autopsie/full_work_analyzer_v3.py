#!/usr/bin/env python3
"""
OMEGA — Full Work Analyzer v3
Protocole complet sur 100 œuvres.

PROTOCOLE PAR ŒUVRE :
  - 10 extraits × 300 mots : 1 APEX + 1 NEUTRE + 1 SEUIL + 7 RANDOM (seed=42)
  - 2 chapitres entiers    : CHAPTER_KEY (le plus dense) + CHAPTER_RANDOM (~30%)
  - 3 scènes descriptives  : passages F25-max (description pure)
  - Features F1-F23 (autopsie_v4) + F24 Contrast Budget + F25 Description Index

CORPUS LABELS :
  FR-ORIG  : écrits en français
  TR-FR    : traduits en français
  EN-ORIG  : anglais original
  IT-ORIG  : italien original
  OTHER    : fantasy/genre

Z-SCORES : calculés par corpus séparément (pas en global cross-langue)
"""

import os, sys, json, hashlib, re, random, logging, importlib.util, math
from pathlib import Path
from datetime import datetime
from collections import Counter
from statistics import mean, stdev

# ─── CONFIG ────────────────────────────────────────────────────────────────
PDF_DIR     = Path(r"C:\Users\elric\Downloads\livre")
OUTPUT_DIR  = Path("results_v3")
SCENES_DIR  = Path("scenes_v3")
LOG_FILE    = "fullwork_v3.log"

OUTPUT_DIR.mkdir(exist_ok=True)
SCENES_DIR.mkdir(exist_ok=True)

SCENE_WORDS      = 300
CHAPTER_MIN_WORDS = 1500   # chapitre = au moins 1500 mots
CHAPTER_MAX_WORDS = 6000   # cap pour éviter les méga-chapitres
MIN_WORDS_VALID  = 3000    # seuil minimum pour qu'un PDF soit valide

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("omega_v3")

# ─── CATALOGUE COMPLET — 100 ŒUVRES ────────────────────────────────────────
# corpus: FR-ORIG | TR-FR | EN-ORIG | IT-ORIG | OTHER
# lang_original: langue de composition originale

CATALOG = [
    # ══════════════════════════════════════════════════════════════
    # FR-ORIG — écrits en français
    # ══════════════════════════════════════════════════════════════

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
    {"file": "__Cher_Monsieur_Germain_French_Edition_-_Albert_Camus.pdf",
     "author": "camus", "title": "Cher Monsieur Germain",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1957},

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
     "fallback": ["Carrère, Emmanuel - L'Adversaire.pdf",
                  "Carri_re__Emmanuel_-_L_Adversaire.pdf"]},
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
    {"file": "Four_Novels_-_Marguerite_Duras.pdf",
     "author": "duras", "title": "Four Novels",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 1965},
    {"file": "Writing_-_Marguerite_Duras.pdf",
     "author": "duras", "title": "Writing (Écrire EN)",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 1993},

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
    {"file": "Quelques_mois_dans_ma_vie_French_Edition_-_Houellebecq.pdf",
     "author": "houellebecq", "title": "Quelques Mois dans ma Vie",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 2024},

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

    # BECKETT (FR-ORIG — versions françaises écrites par Beckett lui-même)
    {"file": "Molloy_-_Samuel_Beckett.pdf",
     "author": "beckett", "title": "Molloy",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1951},

    # FLAUBERT
    {"file": "Madame_Bovary_-_Gustave_Flaubert.pdf",
     "author": "flaubert", "title": "Madame Bovary",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1857},
    {"file": "Coeur_simple_French_Edition_-_Flaubert_Gustave.pdf",
     "author": "flaubert", "title": "Un Cœur Simple",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1877},
    {"file": "Correspondance_9e_serie_1880_French_Edition_-_Flaubert_Gustave.pdf",
     "author": "flaubert", "title": "Correspondance (1880)",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1880},

    # PROUST
    {"file": "Du_cote_de_chez_Swann_-_Marcel_Proust.pdf",
     "author": "proust", "title": "Du côté de chez Swann",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1913},
    {"file": "Oeuvres_completes_de_Marcel_Proust_French_Edition_-_Marcel_Proust.pdf",
     "author": "proust", "title": "Œuvres Complètes",
     "corpus": "FR-ORIG", "lang_original": "fr", "year": 1927},

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

    # ══════════════════════════════════════════════════════════════
    # TR-FR — traduits en français
    # ══════════════════════════════════════════════════════════════

    # MCCARTHY (FR)
    {"file": "la-route-de-cormac-mccarthy.pdf",
     "author": "mccarthy", "title": "La Route (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 2006},

    # FAULKNER (FR)
    {"file": "le-bruit-et-la-fureur.pdf",
     "author": "faulkner", "title": "Le Bruit et la Fureur (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1929},

    # MORRISON (FR)
    {"file": "Toni-Morrison.-Beloved.pdf",
     "author": "morrison", "title": "Beloved (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1987},

    # MÁRQUEZ (FR)
    {"file": "Cent_ans_de_solitude__Gabriel_Garcia_Marquez.pdf",
     "author": "marquez", "title": "Cent Ans de Solitude (FR)",
     "corpus": "TR-FR", "lang_original": "es", "year": 1967},

    # RULFO (FR)
    {"file": "pedro_paramo.pdf",
     "author": "rulfo", "title": "Pedro Páramo (FR)",
     "corpus": "TR-FR", "lang_original": "es", "year": 1955},

    # KUNDERA (FR)
    {"file": "LInsoutenable_Legerete_de_letre_French_Edition_-_Milan_Kundera.pdf",
     "author": "kundera", "title": "L'Insoutenable Légèreté (FR)",
     "corpus": "TR-FR", "lang_original": "cs", "year": 1984},

    # BALDWIN (FR)
    {"file": "La_Chambre_de_Giovanni_French_Edition_-_James_Baldwin.pdf",
     "author": "baldwin", "title": "La Chambre de Giovanni (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1956},

    # FERRANTE (FR)
    {"file": "Lamie_prodigieuse_-_Elena_Ferrante.pdf",
     "author": "ferrante", "title": "L'Amie Prodigieuse (FR)",
     "corpus": "TR-FR", "lang_original": "it", "year": 2011},

    # ECO (FR)
    {"file": "Le_nom_de_la_rose_French_Edition_-_Umberto_Eco.pdf",
     "author": "eco", "title": "Le Nom de la Rose (FR)",
     "corpus": "TR-FR", "lang_original": "it", "year": 1980},

    # ISHIGURO (FR)
    {"file": "Les_Vestiges_du_Jour_French_Edition_-_Ishiguro_Kazuo.pdf",
     "author": "ishiguro", "title": "Les Vestiges du Jour (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1989},

    # BOLAÑO (FR) — 2666
    {"file": "2666_-_Roberto_Bolano.pdf",
     "author": "bolano", "title": "2666",
     "corpus": "TR-FR", "lang_original": "es", "year": 2004},

    # SIMON (EN — La Route des Flandres traduite)
    {"file": "The_Flanders_Road_-_Claude_Simon.pdf",
     "author": "simon", "title": "The Flanders Road (EN)",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 1960},
    {"file": "The_Grass_-_Claude_Simon.pdf",
     "author": "simon", "title": "The Grass (EN)",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 1958},

    # GRACQ (EN)
    {"file": "The_Opposing_Shore_-_Julien_Gracq.pdf",
     "author": "gracq", "title": "The Opposing Shore (EN)",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 1951},
    {"file": "A_Balcony_in_the_Forest_-_Julien_Gracq.pdf",
     "author": "gracq", "title": "A Balcony in the Forest (EN)",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 1958},

    # ══════════════════════════════════════════════════════════════
    # EN-ORIG — anglais original
    # ══════════════════════════════════════════════════════════════

    # MCCARTHY (EN)
    {"file": "Blood_Meridian_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "Blood Meridian",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1985},
    {"file": "The_road_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "The Road",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2006},
    {"file": "Suttree_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "Suttree",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1979},
    {"file": "The_Gardeners_Son_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "The Gardener's Son",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1977},
    {"file": "The_Stonemason_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "The Stonemason",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1994},
    {"file": "The_Sunset_Limited_-_Cormac_McCarthy.pdf",
     "author": "mccarthy", "title": "The Sunset Limited",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2006},

    # FAULKNER (EN)
    {"file": "As_I_Lay_Dying_-_William_Faulkner.pdf",
     "author": "faulkner", "title": "As I Lay Dying",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1930},

    # MORRISON (EN)
    {"file": "Song_of_Solomon_-_Toni_Morrison.pdf",
     "author": "morrison", "title": "Song of Solomon",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1977},

    # BECKETT (EN)
    {"file": "Molloy-Malone-Dies-The-Unnamable.pdf",
     "author": "beckett", "title": "Molloy/Malone Dies/The Unnamable",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1958},

    # WOOLF
    {"file": "Mrs_Dalloway_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "Mrs Dalloway",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1925},
    {"file": "Orlando_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "Orlando",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1928},
    {"file": "A_Haunted_House_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "A Haunted House",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1944},
    {"file": "A_Writers_Diary_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "A Writer's Diary",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1953},
    {"file": "Death_of_the_Moth_and_Other_Essays_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "Death of the Moth",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1942},
    {"file": "On_Being_Ill_with_Notes_from_Sick_Rooms_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "On Being Ill",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1930},
    {"file": "Street_Haunting_and_Other_Essays_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "Street Haunting",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1930},
    {"file": "Essais_choisis_French_Edition_-_Virginia_Woolf.pdf",
     "author": "woolf", "title": "Essais Choisis (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1942},

    # NABOKOV
    {"file": "Lolita__Vladimir_Nabokov.pdf",
     "author": "nabokov", "title": "Lolita",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1955},
    {"file": "Pale_Fire_-_Vladimir_Nabokov.pdf",
     "author": "nabokov", "title": "Pale Fire",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1962},
    {"file": "Bend_Sinister_-_Vladimir_Nabokov.pdf",
     "author": "nabokov", "title": "Bend Sinister",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1947},
    {"file": "Signs_and_Symbols_-_Vladimir_Nabokov.pdf",
     "author": "nabokov", "title": "Signs and Symbols",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1948},

    # DELILLO
    {"file": "Underworld_-_Don_Delillo.pdf",
     "author": "delillo", "title": "Underworld",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1997},
    {"file": "White_Noise_-_Don_Delillo.pdf",
     "author": "delillo", "title": "White Noise",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1985},
    {"file": "End_Zone_-_Don_DeLillo.pdf",
     "author": "delillo", "title": "End Zone",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1972},
    {"file": "Love-Lies-Bleeding_-_Don_DeLillo.pdf",
     "author": "delillo", "title": "Love-Lies-Bleeding",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2005},
    {"file": "The_Day_Room_-_Don_DeLillo.pdf",
     "author": "delillo", "title": "The Day Room",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1986},
    {"file": "Letoile_de_Ratner_French_Edition_-_DeLillo_Don.pdf",
     "author": "delillo", "title": "L'Étoile de Ratner (FR)",
     "corpus": "TR-FR", "lang_original": "en", "year": 1976},

    # PYNCHON
    {"file": "V_-_Thomas_Pynchon.pdf",
     "author": "pynchon", "title": "V.",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1963},

    # RUSHDIE
    {"file": "Fury_-_Salman_Rushdie.pdf",
     "author": "rushdie", "title": "Fury",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 2001},

    # ATWOOD
    {"file": "Good_Bones_-_Margaret_Atwood.pdf",
     "author": "atwood", "title": "Good Bones",
     "corpus": "EN-ORIG", "lang_original": "en", "year": 1992},

    # ══════════════════════════════════════════════════════════════
    # IT-ORIG / OTHER — autres langues
    # ══════════════════════════════════════════════════════════════

    # CALVINO
    {"file": "If_on_a_winters_night_a_traveler_-_Italo_Calvino.pdf",
     "author": "calvino", "title": "If on a Winter's Night",
     "corpus": "EN-ORIG", "lang_original": "it", "year": 1979},
    {"file": "Se_una_notte_dinverno_un_viaggiatore_-_Italo_Calvino.pdf",
     "author": "calvino", "title": "Se una Notte d'Inverno",
     "corpus": "IT-ORIG", "lang_original": "it", "year": 1979},
    {"file": "The_Queens_Necklace_-_Italo_Calvino.pdf",
     "author": "calvino", "title": "The Queen's Necklace",
     "corpus": "EN-ORIG", "lang_original": "it", "year": 1952},
    {"file": "The_Written_World_and_the_Unwritten_World_-_Italo_Calvino.pdf",
     "author": "calvino", "title": "The Written World",
     "corpus": "EN-ORIG", "lang_original": "it", "year": 1994},

    # FANTASY / GENRE — références non-littéraires
    {"file": "Duke_Elric_-_Michael_Moorcock.pdf",
     "author": "moorcock", "title": "Duke Elric",
     "corpus": "OTHER", "lang_original": "en", "year": 2005},
    {"file": "The_Stealer_of_Souls_-_Michael_Moorcock.pdf",
     "author": "moorcock", "title": "The Stealer of Souls",
     "corpus": "OTHER", "lang_original": "en", "year": 1963},
    {"file": "the_hobbit_an_unexpected_journey_-_J_R_R_Tolkien.pdf",
     "author": "tolkien", "title": "The Hobbit",
     "corpus": "OTHER", "lang_original": "en", "year": 1937},

    # CARRÈRE (EN)
    {"file": "The_Kingdom_-_Emmanuel_Carrere.pdf",
     "author": "carrere", "title": "The Kingdom (EN)",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 2014},

    # Do What They Say — Ernaux EN
    {"file": "Do_What_They_Say_or_Else_-_Annie_Ernaux.pdf",
     "author": "ernaux", "title": "Do What They Say (EN)",
     "corpus": "EN-ORIG", "lang_original": "fr", "year": 1977},
]

# ─── EXTRACTION PDF ─────────────────────────────────────────────────────────
def extract_pdf(path: Path) -> str:
    try:
        import fitz
        doc  = fitz.open(str(path))
        parts = [p.get_text() for p in doc if p.get_text().strip()]
        doc.close()
        return "\n".join(parts)
    except Exception as e:
        log.error(f"  PDF extraction error: {e}")
        return ""

def find_pdf(work: dict) -> Path | None:
    candidates = [work["file"]] + work.get("fallback", [])
    for name in candidates:
        p = PDF_DIR / name
        if p.exists():
            return p
    # Recherche floue sur l'auteur
    hint = work["author"].split("_")[0].lower()[:6]
    for p in sorted(PDF_DIR.glob("*.pdf")):
        if hint in p.name.lower():
            log.warning(f"  Fuzzy match: {p.name}")
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

# ─── CHARGEMENT AUTOPSIE V4 ─────────────────────────────────────────────────
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
    log.error("autopsie_v4.py introuvable")
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

# ─── F24 — CONTRAST BUDGET ──────────────────────────────────────────────────
def compute_f24(sents: list, features: dict) -> dict:
    """
    F24 — Contrast Budget (ChatGPT proposal, validated).
    Mesure la respiration banal/apex — levier Hemingway ↔ Duras ↔ Rushdie.

    Principe : la grandeur perçue naît du contraste entre phrases banales
    (ancrage) et phrases hautes (apex). Un texte uniforme, même dense,
    perd en impact.

    Métriques :
      f24a  banal_rate     : phrases sous P25 de densité locale
      f24b  apex_rate      : phrases au-dessus P75 de densité locale
      f24c  contrast_delta : écart moyen densité(apex) - densité(banal)
      f24d  apex_isolation : distance moyenne (en phrases) entre deux apex
      f24e  score          : composite — respiration du texte
      f24f  profile        : HEMINGWAY | DURAS | RUSHDIE | PROUST | UNIFORM
    """
    if len(sents) < 10:
        return {
            "f24a_banal_rate": None, "f24b_apex_rate": None,
            "f24c_contrast_delta": None, "f24d_apex_isolation": None,
            "f24e_contrast_score": None, "f24f_profile": "INSUFFICIENT",
        }

    # Densité locale = longueur en mots (proxy simple, cohérent avec F1)
    lens = [len(s.split()) for s in sents]
    sorted_lens = sorted(lens)
    n = len(sorted_lens)
    p25 = sorted_lens[n // 4]
    p75 = sorted_lens[3 * n // 4]

    banal_lens = [l for l in lens if l <= p25]
    apex_lens  = [l for l in lens if l >= p75]

    banal_rate  = len(banal_lens) / n
    apex_rate   = len(apex_lens)  / n
    mean_banal  = mean(banal_lens) if banal_lens else 0
    mean_apex   = mean(apex_lens)  if apex_lens  else 0
    contrast    = mean_apex - mean_banal

    # Isolation des apex : distance entre positions apex consécutives
    apex_positions = [i for i, l in enumerate(lens) if l >= p75]
    if len(apex_positions) >= 2:
        gaps = [apex_positions[i+1] - apex_positions[i]
                for i in range(len(apex_positions)-1)]
        apex_isolation = mean(gaps)
    else:
        apex_isolation = float(n)

    # Score composite (0-1) : respiration = ni trop uniforme ni trop chaotique
    # Idéal : banal_rate ~0.25, apex_rate ~0.25, contrast élevé, isolation ~4-8
    balance_score   = 1.0 - abs(banal_rate - 0.25) * 2
    contrast_score  = min(1.0, contrast / 15.0)
    isolation_score = 1.0 - abs(apex_isolation - 6.0) / 10.0
    isolation_score = max(0.0, isolation_score)
    score = round((balance_score * 0.3 + contrast_score * 0.5 + isolation_score * 0.2), 5)
    score = max(0.0, min(1.0, score))

    # Profil stylistique
    # Hemingway : phrases courtes banales + rares apex courts
    # Duras      : banal élevé + apex fragmenté
    # Rushdie    : apex fréquents + longues phrases
    # Proust     : apex très longs + isolation faible (densité continue)
    # Uniform    : peu de contraste
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
        "f24a_banal_rate":      round(banal_rate, 5),
        "f24b_apex_rate":       round(apex_rate, 5),
        "f24c_contrast_delta":  round(contrast, 3),
        "f24d_apex_isolation":  round(apex_isolation, 2),
        "f24e_contrast_score":  score,
        "f24f_profile":         profile,
        "f24_method":           "CONTRAST_BUDGET_OMEGA_V1",
    }

# ─── F25 — DESCRIPTION SCENE INDEX ─────────────────────────────────────────
def compute_f25(text: str, sents: list) -> dict:
    """
    F25 — Description Scene Index.
    Mesure la capacité à créer une image mentale.

    Heuristiques lexicales (pas de NLP lourd) pour performance sur 100 œuvres.

    f25a  description_density  : ratio adjectifs/adverbes vs verbes d'action
    f25b  sensory_coverage     : présence des 5 sens (0-5)
    f25c  time_suspension      : phrases sans verbe d'action + présent duratif
    f25d  spatial_depth        : marqueurs de profondeur spatiale
    f25e  nominalization       : ratio noms abstraits
    f25f  object_density       : noms concrets (matières/objets)
    f25g  description_score    : composite
    f25h  profile              : PICTURAL | SENSORIEL | ATMOSPHERIQUE | CINEMATIQUE | INVENTAIRE
    """
    txt_lower = text.lower()
    words     = text.split()
    n_words   = max(len(words), 1)
    n_sents   = max(len(sents), 1)

    # ── f25b Couverture sensorielle ──────────────────────────────
    SENSORY = {
        "visuel":   ["lumière", "ombre", "couleur", "brillant", "sombre", "clair",
                     "lueur", "reflet", "éclat", "scintill", "light", "shadow",
                     "gleam", "glow", "dark", "bright", "shimmer"],
        "auditif":  ["bruit", "son", "silence", "murmure", "voix", "écho",
                     "craquement", "souffle", "noise", "sound", "silence",
                     "whisper", "creak", "rumble", "hum"],
        "tactile":  ["froid", "chaud", "doux", "rugeux", "humide", "sec",
                     "peau", "toucher", "cold", "warm", "smooth", "rough",
                     "damp", "dry", "skin"],
        "olfactif": ["odeur", "parfum", "senteur", "fumée", "smell", "scent",
                     "fragrance", "smoke", "stench", "aroma"],
        "gustatif": ["goût", "amer", "sucré", "salé", "acidité", "taste",
                     "bitter", "sweet", "salty", "sour", "flavor"],
    }
    sensory_score = 0
    for sense, markers in SENSORY.items():
        if any(m in txt_lower for m in markers):
            sensory_score += 1

    # ── f25a Densité descriptive (adjectifs/adverbes vs verbes action) ──
    # Proxy : terminaisons françaises et anglaises
    ADJ_MARKERS = ["eux", "euse", "ique", "able", "ible", "ant", "ent",
                   "al", "el", "ous", "ful", "less", "ive", "ary"]
    ADV_MARKERS = ["ment", "ement", "amment", "ément", "ly", "ally"]
    ACTION_VERBS = ["marcha", "couri", "dit", "répondi", "prit", "saisi",
                    "ouvri", "ferma", "lança", "walked", "ran", "said",
                    "took", "opened", "closed", "grabbed", "threw"]

    adj_count    = sum(1 for w in words if any(w.lower().endswith(m) for m in ADJ_MARKERS))
    adv_count    = sum(1 for w in words if any(w.lower().endswith(m) for m in ADV_MARKERS))
    action_count = sum(1 for w in words if any(v in w.lower() for v in ACTION_VERBS))
    action_count = max(action_count, 1)

    description_density = round((adj_count + adv_count) / action_count, 4)
    description_density = min(description_density, 10.0)  # cap

    # ── f25c Suspension temporelle ──────────────────────────────
    SUSPENSION = ["était", "semblait", "paraissait", "demeurait", "restait",
                  "planait", "flottait", "régnait", "s'étendait",
                  "was", "seemed", "appeared", "remained", "hovered",
                  "floated", "spread", "lay", "hung"]
    susp_count     = sum(1 for w in words if w.lower() in SUSPENSION)
    time_suspension = round(susp_count / n_sents, 5)

    # ── f25d Profondeur spatiale ────────────────────────────────
    SPATIAL = ["loin", "près", "derrière", "devant", "sous", "au-dessus",
               "au-delà", "à l'horizon", "au fond", "en bas", "en haut",
               "far", "near", "behind", "beneath", "above", "beyond",
               "horizon", "depth", "height", "distance"]
    spatial_count = sum(1 for m in SPATIAL if m in txt_lower)
    spatial_depth = round(min(spatial_count / 10.0, 1.0), 4)

    # ── f25e Nominalisation (noms abstraits) ───────────────────
    ABSTRACT_NOUNS = ["silence", "lumière", "obscurité", "douleur", "joie",
                      "tristesse", "solitude", "mémoire", "temps", "espace",
                      "silence", "light", "darkness", "pain", "joy",
                      "sadness", "solitude", "memory", "time", "space",
                      "death", "life", "soul", "spirit", "fear", "hope"]
    abstract_count  = sum(1 for w in words if w.lower() in ABSTRACT_NOUNS)
    nominalization  = round(abstract_count / n_words, 5)

    # ── f25f Densité objets concrets ───────────────────────────
    CONCRETE = ["pierre", "bois", "métal", "fer", "verre", "tissu", "cuir",
                "terre", "eau", "feu", "cendre", "poussière", "os",
                "stone", "wood", "metal", "glass", "leather", "earth",
                "water", "fire", "ash", "dust", "bone", "flesh", "blood"]
    concrete_count = sum(1 for w in words if w.lower() in CONCRETE)
    object_density = round(concrete_count / n_words, 5)

    # ── f25g Score composite ────────────────────────────────────
    desc_score = (
        min(description_density / 5.0, 1.0) * 0.25 +
        sensory_score / 5.0                 * 0.30 +
        min(time_suspension * 5, 1.0)       * 0.15 +
        spatial_depth                        * 0.15 +
        min(nominalization * 100, 1.0)      * 0.10 +
        min(object_density * 100, 1.0)      * 0.05
    )
    desc_score = round(desc_score, 5)

    # ── f25h Profil ─────────────────────────────────────────────
    if sensory_score >= 4 and object_density > 0.003:
        profile = "SENSORIEL"
    elif description_density > 4 and spatial_depth > 0.5:
        profile = "PICTURAL"
    elif time_suspension > 0.08 and nominalization > 0.005:
        profile = "ATMOSPHERIQUE"
    elif action_count > adj_count + adv_count:
        profile = "CINEMATIQUE"
    elif abstract_count > concrete_count and nominalization > 0.008:
        profile = "INVENTAIRE"
    else:
        profile = "MIXTE"

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

# ─── SEGMENTATION SIMPLE ────────────────────────────────────────────────────
def split_sentences(text: str) -> list:
    """Segmentation basique — sans spaCy — pour F24/F25 standalone."""
    raw = re.split(r"(?<=[.!?…»])\s+", text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def split_chapters(text: str) -> list:
    """
    Détection de chapitres par heuristique.
    Cherche : CHAPITRE / CHAPTER / I. / 1. / — en début de ligne.
    """
    pattern = re.compile(
        r"\n\s*(?:chapitre|chapter|partie|part|section|I{1,4}V?|VI{0,4}|"
        r"X{0,3}I{0,4}V?|\d{1,3}[.)]\s|[IVX]{1,5}[.)]\s)",
        re.IGNORECASE,
    )
    splits = [m.start() for m in pattern.finditer(text)]
    if len(splits) < 2:
        # Fallback : couper par paragraphes doubles
        paras = re.split(r"\n{2,}", text)
        # Grouper les paragraphes en segments de ~2000-4000 mots
        chapters = []
        current  = []
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

# ─── PROTOCOLE D'EXTRACTION ─────────────────────────────────────────────────
def score_passage_density(text: str) -> float:
    """Score de densité stylistique — proxy pour sélectionner APEX/SEUIL."""
    words = text.split()
    if not words:
        return 0.0
    # Longueur phrase moyenne + diversité lexicale (hapax rate proxy)
    sents = split_sentences(text)
    if not sents:
        return 0.0
    mean_len   = mean(len(s.split()) for s in sents)
    word_set   = set(w.lower() for w in words if len(w) > 3)
    hapax_rate = len(word_set) / len(words)
    return mean_len * 0.4 + hapax_rate * 0.6

def extract_protocol(text: str, n_random: int = 7) -> dict:
    """
    Protocole d'extraction complet :
    - 1 APEX    : passage le plus dense (score max)
    - 1 NEUTRE  : position 50%
    - 1 SEUIL   : passage le moins dense (score min)
    - N RANDOM  : stratifiés, seed=42
    """
    words = text.split()
    total = len(words)
    if total < SCENE_WORDS * 3:
        return {"extracts": [], "chapters": [], "descriptive": []}

    # Couper en segments de SCENE_WORDS mots (pas de chevauchement)
    segments = []
    pos = 0
    while pos + SCENE_WORDS <= total:
        seg_text  = " ".join(words[pos: pos + SCENE_WORDS])
        segments.append({"pos": pos, "text": seg_text, "score": score_passage_density(seg_text)})
        pos += SCENE_WORDS

    if not segments:
        return {"extracts": [], "chapters": [], "descriptive": []}

    # Trier par score
    by_score = sorted(segments, key=lambda x: x["score"])
    apex     = by_score[-1]
    seuil    = by_score[0]

    # NEUTRE : segment le plus proche de la position 50%
    mid_pos  = total // 2
    neutre   = min(segments, key=lambda x: abs(x["pos"] - mid_pos))

    # RANDOM stratifié (seed=42, déterministe)
    random.seed(42)
    # Exclure les 5% début et 3% fin
    core_segs = [s for s in segments
                 if s["pos"] > total * 0.05 and s["pos"] < total * 0.97]
    step      = max(1, len(core_segs) // n_random)
    tranches  = [core_segs[i*step: (i+1)*step] for i in range(n_random)]
    randoms   = [random.choice(t) for t in tranches if t]

    # Extraits étiquetés
    extracts = (
        [{"type": "APEX",   "pos": apex["pos"],   "text": apex["text"],   "density_score": apex["score"]}] +
        [{"type": "NEUTRE", "pos": neutre["pos"], "text": neutre["text"], "density_score": neutre["score"]}] +
        [{"type": "SEUIL",  "pos": seuil["pos"],  "text": seuil["text"],  "density_score": seuil["score"]}] +
        [{"type": f"RANDOM_{i:02d}", "pos": r["pos"], "text": r["text"],  "density_score": r["score"]}
         for i, r in enumerate(randoms)]
    )

    # CHAPITRES
    all_chapters = split_chapters(text)
    # Filtrer par taille
    valid_chaps  = [c for c in all_chapters
                    if CHAPTER_MIN_WORDS <= len(c.split()) <= CHAPTER_MAX_WORDS]
    if not valid_chaps:
        # Prendre les 2 segments les plus grands
        valid_chaps = sorted(
            [" ".join(words[i: i+2000]) for i in range(0, min(total, 8000), 2000)],
            key=lambda x: len(x.split()), reverse=True
        )[:2]

    chapters = []
    if valid_chaps:
        # CHAPTER_KEY : chapitre le plus dense
        chap_key    = max(valid_chaps, key=lambda c: score_passage_density(c[:2000]))
        chapters.append({"type": "CHAPTER_KEY", "text": chap_key})
        # CHAPTER_RANDOM : chapitre position ~30%
        idx_30      = max(0, int(len(valid_chaps) * 0.3) - 1)
        chap_rand   = valid_chaps[idx_30]
        chapters.append({"type": "CHAPTER_RANDOM", "text": chap_rand})

    # SCÈNES DESCRIPTIVES : 3 passages F25 max
    desc_segments   = sorted(segments, key=lambda x: score_passage_density(x["text"]))
    # Prendre les 10 moins denses (candidats description) et scorer F25
    desc_candidates = desc_segments[:min(10, len(desc_segments))]
    desc_scored     = []
    for seg in desc_candidates:
        f25  = compute_f25(seg["text"], split_sentences(seg["text"]))
        desc_scored.append({"text": seg["text"], "f25_score": f25["f25g_description_score"], "f25": f25})
    desc_scored.sort(key=lambda x: x["f25_score"], reverse=True)
    descriptive = [{"type": f"DESC_{i:02d}", **d} for i, d in enumerate(desc_scored[:3])]

    return {
        "extracts":    extracts,
        "chapters":    chapters,
        "descriptive": descriptive,
    }

# ─── ANALYSE COMPLÈTE D'UNE ŒUVRE ───────────────────────────────────────────
def process_work(work: dict) -> dict | None:
    author  = work["author"]
    title   = work["title"]
    corpus  = work["corpus"]
    lang_o  = work["lang_original"]
    work_id = f"{author}_{title[:20].replace(' ', '_')}"

    log.info(f"\n{'─'*60}")
    log.info(f"  [{corpus}] {title} — {author}")

    pdf = find_pdf(work)
    if not pdf:
        log.error(f"  PDF introuvable: {work['file']}")
        return None

    log.info(f"  PDF: {pdf.name} ({pdf.stat().st_size // 1024:,} KB)")

    raw  = extract_pdf(pdf)
    if not raw:
        log.error("  Extraction vide")
        return None

    text       = clean_text(raw)
    word_count = len(text.split())
    log.info(f"  Mots: {word_count:,}")

    if word_count < MIN_WORDS_VALID:
        log.warning(f"  SKIP: {word_count} mots < {MIN_WORDS_VALID} (PDF scan ou trop court)")
        return None

    # ── Protocole d'extraction ───────────────────────────────────
    log.info("  Extraction protocole (APEX/NEUTRE/SEUIL/RANDOM/CHAPTER/DESC)...")
    protocol = extract_protocol(text)
    n_ext    = len(protocol["extracts"])
    n_chap   = len(protocol["chapters"])
    n_desc   = len(protocol["descriptive"])
    log.info(f"  Extraits: {n_ext} | Chapitres: {n_chap} | Descriptifs: {n_desc}")

    # ── Analyse autopsie_v4 sur chaque extrait ───────────────────
    log.info("  Analyse autopsie_v4...")
    extract_results = []
    for ex in protocol["extracts"]:
        r = run_autopsie(ex["text"], f"{work_id}_{ex['type']}", lang_o)
        if r:
            feats = r.get("features", {})
            # Ajouter F24 + F25
            sents = split_sentences(ex["text"])
            feats.update(compute_f24(sents, feats))
            feats.update(compute_f25(ex["text"], sents))
            extract_results.append({
                "type":    ex["type"],
                "pos":     ex["pos"],
                "density": ex["density_score"],
                "features": feats,
            })

    # ── Analyse chapitres ────────────────────────────────────────
    chapter_results = []
    for ch in protocol["chapters"]:
        r = run_autopsie(ch["text"], f"{work_id}_{ch['type']}", lang_o)
        if r:
            feats = r.get("features", {})
            sents = split_sentences(ch["text"])
            feats.update(compute_f24(sents, feats))
            feats.update(compute_f25(ch["text"], sents))
            chapter_results.append({
                "type":     ch["type"],
                "words":    len(ch["text"].split()),
                "features": feats,
            })

    # ── Analyse scènes descriptives ──────────────────────────────
    desc_results = []
    for d in protocol["descriptive"]:
        r = run_autopsie(d["text"], f"{work_id}_{d['type']}", lang_o)
        feats = r.get("features", {}) if r else {}
        feats.update(d["f25"])
        desc_results.append({
            "type":       d["type"],
            "f25_score":  d["f25_score"],
            "features":   feats,
        })

    # ── Moyennes globales ────────────────────────────────────────
    all_feat_dicts = [er["features"] for er in extract_results] + \
                     [cr["features"] for cr in chapter_results]
    averages       = compute_averages(all_feat_dicts)
    log.info(f"  Analyses complètes: extraits={len(extract_results)}, chapitres={len(chapter_results)}")

    # ── Sauvegarde ───────────────────────────────────────────────
    result = {
        "meta": {
            "work_id":      work_id,
            "author":       author,
            "title":        title,
            "corpus":       corpus,
            "lang_original": lang_o,
            "year":         work.get("year"),
            "pdf_file":     pdf.name,
            "word_count":   word_count,
            "analyzed_at":  datetime.now().isoformat(),
            "text_sha":     hashlib.sha256(text.encode()).hexdigest()[:16],
        },
        "protocol": {
            "extracts_count":    len(extract_results),
            "chapters_count":    len(chapter_results),
            "descriptive_count": len(desc_results),
        },
        "averages":     averages,
        "extracts":     extract_results,
        "chapters":     chapter_results,
        "descriptive":  desc_results,
    }

    out = OUTPUT_DIR / f"{work_id[:40]}.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    sha = hashlib.sha256(out.read_bytes()).hexdigest()[:12]
    log.info(f"  → {out.name} | SHA: {sha}")

    # Sauvegarder scènes TXT
    sc_dir = SCENES_DIR / author
    sc_dir.mkdir(exist_ok=True)
    for ex in protocol["extracts"]:
        (sc_dir / f"{title[:15]}_{ex['type']}.txt").write_text(ex["text"], encoding="utf-8")

    return result

def compute_averages(feat_dicts: list) -> dict:
    all_vals = {}
    for fd in feat_dicts:
        for k, v in fd.items():
            if isinstance(v, (int, float)) and v is not None:
                all_vals.setdefault(k, []).append(float(v))
    return {k: round(mean(v), 6) for k, v in all_vals.items() if v}

# ─── Z-SCORES PAR CORPUS ────────────────────────────────────────────────────
KEY_FEATURES = [
    "f21e_ritual_index", "f22f_literary_index",
    "f23d_literary_causal_score", "f19e_window_median",
    "f1_mean", "f1a_rhythm_variance", "f5a_verb_density",
    "f16b_hapax_rate", "f15a_local_repetition_rate",
    "f24e_contrast_score", "f25g_description_score",
]

def compute_zscores(results: list) -> dict:
    by_corpus = {}
    for r in results:
        c = r["meta"]["corpus"]
        by_corpus.setdefault(c, []).append(r)

    zscores = {}
    for corpus, group in by_corpus.items():
        zscores[corpus] = {}
        for feat in KEY_FEATURES:
            vals = [g["averages"].get(feat) for g in group
                    if g["averages"].get(feat) is not None]
            if len(vals) < 2:
                continue
            m  = mean(vals)
            sd = stdev(vals) if stdev(vals) > 0 else 1.0
            for g in group:
                v = g["averages"].get(feat)
                if v is not None:
                    wid = g["meta"]["work_id"]
                    zscores[corpus].setdefault(wid, {})[feat] = round((v - m) / sd, 4)
    return zscores

# ─── TABLEAU DE CLASSEMENT ──────────────────────────────────────────────────
def print_ranking(results: list):
    if not results:
        return

    print("\n" + "="*110)
    print("OMEGA — CLASSEMENT PROSE — PROTOCOLE COMPLET")
    print("="*110)

    order = ["FR-ORIG", "TR-FR", "EN-ORIG", "IT-ORIG", "OTHER"]
    for corpus_label in order:
        group = [r for r in results if r["meta"]["corpus"] == corpus_label]
        if not group:
            continue

        print(f"\n── {corpus_label} ({len(group)} œuvres) ──")
        # Trier par f22f_literary_index décroissant
        group.sort(key=lambda r: r["averages"].get("f22f_literary_index", 0), reverse=True)

        print(f"  {'Titre':<35} {'F21-Rituel':>10} {'F22-Litté':>10} {'F23-Causal':>10} {'F24-Contrst':>11} {'F25-Descr':>10} {'F19-Entrop':>10}")
        print("  " + "─"*100)
        for r in group:
            av = r["averages"]
            print(
                f"  {r['meta']['title'][:34]:<35}"
                f"  {str(av.get('f21e_ritual_index', 'N/A'))[:8]:>8}"
                f"  {str(av.get('f22f_literary_index', 'N/A'))[:8]:>8}"
                f"  {str(av.get('f23d_literary_causal_score', 'N/A'))[:8]:>8}"
                f"  {str(av.get('f24e_contrast_score', 'N/A'))[:9]:>9}"
                f"  {str(av.get('f25g_description_score', 'N/A'))[:8]:>8}"
                f"  {str(av.get('f19e_window_median', 'N/A'))[:8]:>8}"
            )

    # Top 3 par feature
    print("\n" + "="*110)
    print("TOP 3 PAR FEATURE — TOUTES ŒUVRES")
    print("="*110)
    feats_labels = [
        ("f21e_ritual_index",          "Rituel incantoire (F21)"),
        ("f22f_literary_index",        "Index littéraire (F22)"),
        ("f23d_literary_causal_score", "Causalité implicite (F23)"),
        ("f24e_contrast_score",        "Contrast Budget (F24)"),
        ("f25g_description_score",     "Image mentale (F25)"),
        ("f16b_hapax_rate",            "Richesse lexicale"),
        ("f1a_rhythm_variance",        "Variance rythmique"),
    ]
    titles = {r["meta"]["work_id"]: r["meta"]["title"] for r in results}
    for feat, label in feats_labels:
        vals = {r["meta"]["work_id"]: r["averages"].get(feat)
                for r in results if r["averages"].get(feat) is not None}
        if vals:
            top = sorted(vals.items(), key=lambda x: x[1], reverse=True)[:3]
            top_str = " > ".join(f"{titles.get(k, k)[:18]} ({v:.3f})" for k, v in top)
            print(f"  {label:<35}: {top_str}")
    print()

def save_ranking(results: list, zscores: dict):
    path = OUTPUT_DIR / "RANKING_V3.json"
    data = {
        "generated_at":   datetime.now().isoformat(),
        "total_analyzed": len(results),
        "protocol": {
            "extracts_per_work":  "10 (1 APEX + 1 NEUTRE + 1 SEUIL + 7 RANDOM)",
            "chapters_per_work":  "2 (CHAPTER_KEY + CHAPTER_RANDOM)",
            "desc_per_work":      "3 (F25 max)",
            "scene_words":        SCENE_WORDS,
            "features":           "F1-F23 (autopsie_v4) + F24 Contrast Budget + F25 Description",
            "normalization":      "Z-scores par corpus (FR-ORIG/TR-FR/EN-ORIG/IT-ORIG/OTHER)",
        },
        "works": [
            {
                "work_id":  r["meta"]["work_id"],
                "title":    r["meta"]["title"],
                "author":   r["meta"]["author"],
                "corpus":   r["meta"]["corpus"],
                "year":     r["meta"]["year"],
                "words":    r["meta"]["word_count"],
                "extracts": r["protocol"]["extracts_count"],
                "scores": {k: r["averages"].get(k) for k in KEY_FEATURES},
            }
            for r in results
        ],
        "zscores_by_corpus": zscores,
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    log.info(f"\nRanking: {path} | SHA: {sha}")
    return sha

# ─── MAIN ────────────────────────────────────────────────────────────────────
def main():
    log.info("="*60)
    log.info("OMEGA — Full Work Analyzer v3")
    log.info(f"Catalogue: {len(CATALOG)} œuvres")
    log.info(f"PDF DIR:   {PDF_DIR}")
    log.info(f"Protocol:  10 extraits + 2 chapitres + 3 descriptifs / œuvre")
    log.info(f"Features:  F1-F25")
    log.info("="*60)

    if not PDF_DIR.exists():
        log.error(f"Dossier introuvable: {PDF_DIR}")
        sys.exit(1)

    results = []
    failed  = []

    for i, work in enumerate(CATALOG, 1):
        log.info(f"\n[{i}/{len(CATALOG)}]")
        try:
            r = process_work(work)
            if r:
                results.append(r)
            else:
                failed.append(work["title"])
        except Exception as e:
            log.error(f"  EXCEPTION: {e}")
            import traceback; traceback.print_exc()
            failed.append(work["title"])

    # Classement
    print_ranking(results)

    # Z-scores
    zscores = compute_zscores(results)

    # Sauvegarde
    if results:
        save_ranking(results, zscores)

    # Bilan final
    log.info("\n" + "="*60)
    log.info(f"TERMINÉ")
    log.info(f"  Analysées : {len(results)}/{len(CATALOG)}")
    log.info(f"  Échouées  : {len(failed)}")
    if failed:
        for f in failed:
            log.info(f"    ✗ {f}")
    log.info("="*60)

if __name__ == "__main__":
    main()
