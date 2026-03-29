#!/usr/bin/env python3
"""
OMEGA PVI — Étape 1: Inventaire et Classification du Corpus
Scanne les 3 dossiers, classifie chaque fichier, produit inventaire_corpus_classifie.csv
"""

import os
import csv
import re
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================
DIRS = [
    r"C:\Users\elric\Downloads\livre",
    r"C:\Users\elric\Downloads\livre\nouverau livre EN",
    r"C:\Users\elric\Downloads\livre\livre anglais en plus 2 eme salve",
]
EXCLUDE_DIR = r"C:\Users\elric\Downloads\livre\_EXCLU"
OUTPUT_DIR = r"C:\Users\elric\omega-project\docs\physique-litteraire\corpus-analyse"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# =============================================================================
# AUTHOR -> GROUP CLASSIFICATION DATABASE
# =============================================================================

# FR-A: Bestsellers FR (>500K ventes organiques documentées)
FR_A_AUTHORS = {
    "Michel Houellebecq", "Guillaume Musso", "Amelie Nothomb", "Fred Vargas",
    "Emmanuel Carrere", "Daniel Pennac", "Frederic Beigbeder", "Marc Levy",
    "Danielle Steel",  # FR editions count
    "Umberto Eco",  # Le nom de la rose = mega bestseller FR
    "Stieg Larsson",  # Millenium FR
    "EL James", "EL JAMES",  # 50 nuances FR
    "Colleen Hoover",  # FR editions
    "Gillian Flynn",  # FR editions
    "Sarah J Maas", "Sarah J. Maas",  # FR editions
    "Rebecca Yarros",  # Fourth Wing FR
    "Elena Ferrante",  # Amie prodigieuse FR
    "Jodi Picoult",  # Bestseller FR
    "Andy Weir",  # Projet dernière chance FR
    "chinua achebe",  # Tout s'effondre = classique africain massif
    "Victor Hugo",  # Les Misérables = bestseller historique
    "Albert Camus",  # L'Étranger = bestseller absolu FR
    "Simone de Beauvoir",  # Les Mandarins = Goncourt + bestseller
}

# FR-B: Chefs d'oeuvre FR diffusion restreinte
FR_B_AUTHORS = {
    "Marcel Proust", "Gustave Flaubert", "Marguerite Duras", "Jean-Paul Sartre",
    "Celine Louis-Ferdinand", "Louis-Ferdinand Celine",
    "Samuel Beckett",  # FR texts
    "Milan Kundera",  # FR texts
    "Alain Robbe-Grillet", "Nathalie Sarraute", "Claude Simon", "Michel Butor",
    "Julien Gracq", "Pascal Quignard", "Georges Perec", "Annie Ernaux",
    "Patrick Modiano", "JMG Le Clezio", "J M G Le Clezio", "J.M.G. Le Clézio",
    "Peter Handke",  # FR translations = literary
    "Marguerite Yourcenar",
    "Andre Malraux",
    "Marie NDiaye",
    "Patrick Chamoiseau",
    "Edouard Louis",  # Literary FR
    "Jean echenoz",
    "alfred doblin",  # Monts Mers = literary FR translation
    "Simone Weil",  # Philosophical/literary
}

# FR-Zone-C: Upmarket FR (hybride)
FR_C_AUTHORS = {
    "Lionel Shriver",  # Kevin FR = upmarket
    "Kazuo Ishiguro",  # Vestiges FR
    "Donna Tartt",  # Secret History FR
    "Haruki Murakami",
    "James Baldwin",  # Chambre Giovanni FR = upmarket
    "Fiodor Dostoievski", "Dostoievski",
    "Emile Zola", "Zola Emile",  # Classic but widely read
    "Lolita Pille",  # Antigone Reine = FR literary commercial
    "Pierre Corneille",  # Classical theatre -> EXCLUDE
    "Pierre Bottero",  # YA fantasy FR
    "Robin Hobb",  # FR fantasy
    "Italo Calvino",
}

# EN-A: Bestsellers EN (>1M copies organiques)
EN_A_AUTHORS = {
    "Stephen King", "James Patterson", "John Grisham", "Tom Clancy",
    "Dean Koontz", "Dan Brown", "Clive Cussler", "Patricia Cornwell",
    "Robin Cook", "Lee Child", "Lisa Gardner", "Karin Slaughter",
    "Nora Roberts", "Danielle Steel", "Janet Evanovich", "Sidney Sheldon",
    "Ken Follett", "Wilbur Smith", "Michael Crichton",
    "Suzanne Collins",  # Hunger Games
    "Stephanie Meyer", "Stephenie Meyer",  # Twilight
    "JK Rowling", "J K Rowling", "J.K. Rowling",  # Harry Potter
    "Veronica Roth",  # Divergent
    "EL James", "E L James",  # 50 Shades EN
    "Colleen Hoover",  # EN originals
    "Gillian Flynn",  # Gone Girl EN
    "Rick Riordan",  # Lightning Thief
    "Nicholas Sparks",  # Romance bestseller
    "Donna Tartt",  # Goldfinch = bestseller EN
    "Andy Weir",  # Martian
    "Robert Ludlum",  # Bourne
    "Dashiell Hammett",  # Maltese Falcon = classic bestseller
    "Raymond Chandler",  # Big Sleep
    "John le Carre",  # Spy novels
    "Agatha Christie",  # Mystery mega-seller
    "Bram Stoker",  # Dracula
    "Daphne du Maurier",  # My Cousin Rachel
    "Douglas Adams",  # Hitchhiker
    "Neil Gaiman",  # American Gods
    "Terry Pratchett",  # Discworld
    "Chuck Palahniuk",  # Fight Club
    "Anne Rice",  # Interview Vampire
    "Brandon Sanderson",
    "Terry Goodkind",
    "Patrick Rothfuss",
    "Orson Scott Card",  # Ender's Game
    "Dan Simmons",  # Hyperion
    "Philippa Gregory",  # Other Boleyn Girl
    "Hilary Mantel",  # Wolf Hall
    "Shirley Jackson",  # Haunting / We Have Always Lived
}

# EN-B: Chefs d'oeuvre EN diffusion restreinte
EN_B_AUTHORS = {
    "William Faulkner", "Virginia Woolf", "Cormac McCarthy",
    "Don Delillo", "Don DeLillo", "Thomas Pynchon",
    "Vladimir Nabokov", "WG Sebald", "W.G. Sebald",
    "Toni Morrison",  # Beloved/Song of Solomon = prestige
    "David Foster Wallace",  # Infinite Jest
    "William S Burroughs",  # Naked Lunch
    "Henry James",  # Portrait of a Lady etc
    "DH Lawrence", "D H Lawrence", "D.H. Lawrence",
    "Joseph Conrad",
    "Saul Bellow",  # Henderson, Herzog
    "Philip Roth",  # Human Stain, Portnoy
    "Denis Johnson",  # Jesus Son, Tree of Smoke
    "Marilynne Robinson",  # Housekeeping, Lila
    "Tobias Wolff",
    "William Styron",  # Sophie's Choice
    "Ralph Ellison",  # Invisible Man
    "Carson McCullers",  # Heart is Lonely Hunter
    "Flannery OConnor", "Flannery O'Connor",
    "Thomas Wolfe",  # Of Time and the River
    "Roberto Bolano",  # 2666
    "Mervyn Peake",  # Titus Groan
    "Willa Cather",
    "Theodore Dreiser",
    "Sinclair Lewis",
    "Edith Wharton",
    "Nathaniel Hawthorne",
}

# EN-Zone-C: Upmarket EN
EN_C_AUTHORS = {
    "Ian McEwan",  # Atonement, Saturday, On Chesil Beach
    "Chimamanda Ngozi Adichie", "Chimamnda adichie",
    "Kazuo Ishiguro",  # Never Let Me Go, Remains
    "Jeffrey Eugenides",  # Virgin Suicides, Middlesex
    "Michael Chabon",  # Kavalier & Clay
    "Jonathan Franzen",  # Freedom
    "Richard Ford",  # Sportswriter, Independence Day
    "Zadie Smith",  # White Teeth
    "George Orwell",  # 1984 = massive but literary
    "Graham Greene",  # End of Affair, Quiet American
    "Jack Kerouac",  # On the Road
    "JD Salinger", "J.D. Salinger",  # Catcher in the Rye
    "Jack London",  # Call of the Wild
    "John Updike",  # Rabbit
    "Kurt Vonnegut", "Kurt Vonnegt",  # Slaughterhouse
    "John Steinbeck",  # Grapes of Wrath, East of Eden, Of Mice
    "Ernest Hemingway",  # Old Man, Sun Also Rises
    "Harper Lee", "Haper Lee",  # To Kill a Mockingbird
    "F Scott Fitzgerald",  # Great Gatsby
    "Oscar Wilde",  # Dorian Gray
    "Emily Bronte",  # Wuthering Heights
    "Louisa May Alcott",  # Little Women
    "Thomas Hardy",  # Tess, Far from Madding
    "George Eliot",  # Middlemarch
    "H G Wells", "HG Wells",  # Time Machine, War of Worlds
    "Robert Louis Stevenson",  # Jekyll, Treasure Island
    "Herman Melville",  # Bartleby, Billy Budd
    "Mark Twain",  # Huck Finn
    "Anthony Trollope",  # Barchester
    "Rudyard Kipling",
    "Kate Chopin",
    "Upton Sinclair",
    "Edgar Allan Poe",
    "H P Lovecraft", "HP Lovecraft",
    "Mary Wollstonecraft Shelley",  # Frankenstein
    "PG Wodehouse",
    "E M Forster", "EM Forster",
    "Min Jin Lee",
    "Salman Rushdie",
    "Isaac Asimov",  # Foundation etc
    "Arthur C Clarke",
    "Ursula Le Guin",
    "Peter F Hamilton",
    "Ayn Rand",
    "James A Michener",
}

# =============================================================================
# EXCLUSION RULES
# =============================================================================
EXCLUDE_KEYWORDS_NONFICTION = [
    "Spanish_Edition", "Spanish Edition", "_SPA_",
    "Acquired_Language", "Comportamiento_Organizacional",
    "Psychology_of_Being", "Being_and_the_Meaning",
    "How_to_Write", "Commando_papa", "Profiles_of_the_future",
    "The_Roman_Republic", "Space_Shuttles", "Desirer_la_violence",
    "La_haine_de_democratie", "Lexistentialisme_est_un_humanisme",
    "El_mito_de_Sisifo", "Le_mythe_de_Sisyphe", "Reflections_on_the_Guillotine",
    "The_Complete_Notebooks", "Correspondance_French", "Quelques_mois_dans_ma_vie",
    "The_Crimes_That_Inspired", "Son_of_Trevor_Lynch",
    "Fuego_cruzado", "La_hija_Spanish", "OMEGA_", "Non_confirme",
    "La_condition_humaine",  # Malraux essay-novel but keep
    "La_Condition_ouvriere",  # Weil = philosophy, exclude
    "Belonging_to_the_World",  # non-fiction
    "The_World_of_Robert_Jordan",  # companion book
    "Reacher_the_stories_behind",  # non-fiction companion
    "The_Crimes_That_Inspired_Agatha",  # non-fiction
    "Asimovs_Treasury_of_Humor",  # non-fiction
    "OMEGA_LISTE_AUTEURS",  # metadata file
    "OMEGA_PLAN_ACTION",  # metadata file
    ".crdownload",  # incomplete download
]

# Exclude: poetry, theatre, short story collections (specific), non-adult
EXCLUDE_SPECIFIC = [
    "Les_contemplations",  # Hugo poetry
    "Les_feuilles_dautomne",  # Hugo poetry
    "La_Legende_des_siecles",  # Hugo poetry
    "Le_Roi_samuse",  # Hugo theatre
    "Ruy_Blas",  # Hugo theatre
    "Melite",  # Corneille theatre
    "Le_malentendu_suivi_de_Caligula",  # Camus theatre
    "Napoleon_Le_Petit",  # Hugo political essay
    "Happiness_vol_8",  # manga
    "La_Princesse_des_forets",  # children Tea Stilton
    "La_Reine_des_songes",  # children Tea Stilton
    "Princesse_de_la_nuit",  # children Tea Stilton
    "Princesse_des_coraux",  # children Tea Stilton
    "Princesse_du_desert",  # children Tea Stilton
    "Princesas_Olvidadas",  # children
    "Be_Afraid_-_Be_Very_Afraid",  # RL Stine children
    "Creature_Teacher",  # RL Stine children
    "I_am_your_evil_twin",  # RL Stine children
    "My_friends_call_me_monster",  # RL Stine children
    "Scary_Birthday_to_You",  # RL Stine children
    "One_Night_in_Payne_House",  # RL Stine children
    "The_13th_Warning",  # RL Stine children
    "Fear_park",  # RL Stine children
    "call_waiting",  # RL Stine children
    "Weekend_at_Poison_Lake",  # RL Stine children
    "Nightmare_Hour",  # RL Stine children
    "Christmas_Fright",  # children
    "The_Lightning_Thief",  # YA children (Riordan)
    "Gardiens_des_cites_perdues",  # YA children
    "Die_Pest",  # German edition
    "Crooner_Italian_Edition",  # Italian
    "il_denaro_Italian_Edition",  # Italian
    "Billy_Budd_marinaio",  # Italian edition
    "Donkerder",  # Dutch
    "Opstand_Dutch_Edition",  # Dutch
    "Kloof_Tussen_Twee_Werelden",  # Dutch
    "Titik_Muslihat",  # Indonesian
    "negeri_para_bedebah",  # Indonesian
    "Hogwarts_A_History",  # Fan fiction / companion
    "Pocket_Potters",  # Companion
    "From_the_Wizarding",  # Companion
    "From_the_wizarding",  # Companion
    "The_Hogwarts_Collection",  # Companion
    "Harry_Potter_and_the_Goblet_of_Fire_The_Illustrated",  # duplicate
    "Semantic_error",  # Korean manhwa
    "Rebellion_French_Edition_-_femen",  # non-fiction
    "Short_Fiction_Complete",  # anthology
    "The_Peoples_Friend_Pocket",  # magazine
    "Collected_Short_Fiction_-_Chet",  # obscure collection
    "The_Best_American_Short_Stories",  # anthology
    "Tom_Clancy_Collection",  # omnibus duplicate
    "The_Twilight_Saga_Complete",  # omnibus duplicate
    "The_Complete_Rougon-Macquart",  # omnibus
    "The_wheel_of_time_01-14",  # omnibus
    "Edith_Wharton__The_Complete",  # omnibus
    "William_Styron__The_Collected",  # omnibus
    "Three_Complete_Novels_The_House_of_Thunder",  # omnibus Koontz
    "Three_Complete_Novels_The_Servants",  # omnibus Koontz
    "The_Detective_DD_Warren_Series",  # omnibus Gardner
    "The_FBI_Profiler_Series",  # omnibus Gardner
    "Fifty_Shades_as_Told_by_Christian",  # companion/retelling
    "Brandon_Sandersons_Fantasy_Firsts",  # sampler
    "The_Sixth_Science_Fiction_Megapack",  # anthology
    "The_Space_Trilogy_Omnibus",  # omnibus
    "Enders_Game_Boxed_Set",  # omnibus
    "A_Grant_County_Collection",  # omnibus
    "Les_Contes_Interdits",  # Quebec horror collection
    "Coldfire_The_Key_To_Midnight",  # omnibus
    "Lightning_the_Face_of_Fear",  # omnibus
    "Tossing_and_Turning",  # Updike poetry
    "The_Same_Door",  # Updike short stories (keep as literary data)
]

# Spanish language markers
SPANISH_MARKERS = [
    "Spanish_Edition", "_SPA_", "Forastera_Saga", "Culpa_mia",
    "Cachondas", "Alguien_mejor", "Apartamento_16", "Apocalipsis_Spanish",
    "Nacidos_en_sangre", "Nadie_nos_vio", "Latte_Darling_Spanish",
    "Scarlett_Spanish", "Under_the_scars_Spanish", "Harlow_Spanish",
    "Elite_plateada", "Prohibido_creer", "Proximos_dias",
    "La_lista_de_Schindler_Spanish", "La_mejor_actriz",
    "La_novia_equivocada", "LOS_TIEMPOS_MALDITOS", "Los_ultimos_dias",
    "Omega_for_Rent_Spanish", "Krampus_for_cristmass_Spanish",
    "Dead_Reckoning_Spanish", "la_cancha_del_sol", "perras_de_reserva",
    "terror_in_winnipeg_Spanish", "Titeres_de_la_magia",
    "The_cruelest_season_Spanish", "La_bailarina_Spanish",
    "Leal_Spanish_Edition", "Obsidian_Spanish",
    "La_casa_de_hojas_Spanish", "Una_cabeza_llena",
    "El_Verdugo", "El_ano_en_que", "El_arte_de_morir",
    "El_cuaderno_prohibido", "El_extranjero_-_Albert_Camus",
    "El_hombre_que_rie", "El_pequeno_libro", "El_primer_hombre",
    "El_sueno_Spanish", "El_vientre_de_Paris", "Emilio_Zola_-_Por_una_noche",
    "Dios_Spanish_Edition", "Dirty_Daddy_Spanish", "Verdad_Spanish",
    "La_Taberna_Spanish", "La_Tierra_Spanish", "V_Spanish",
    "Nuestra_senora_de_paris_Spanish", "Ultimo_dia_de_un_condenado",
    "Cascara_de_Nuez_Spanish", "Lorna_Spanish",
    "Ojos_azules_-_Toni_Morrison__SPA_", "Robos_e_Imperio",
    "Las_chicas_gilmore_Spanish",
]


def clean_filename(fname):
    """Extract title and author from filename pattern: Title_-_Author.ext"""
    # Remove extension
    base = os.path.splitext(fname)[0]
    # Remove OceanofPDF prefix
    base = re.sub(r'^_OceanofPDF\.com_', '', base)
    # Remove (1) duplicates
    base = re.sub(r'\s*\(\d+\)$', '', base)

    # Try to split on " - " or "_-_"
    parts = re.split(r'\s*[-–]\s*|\s*_-_\s*', base, maxsplit=1)
    if len(parts) == 2:
        title = parts[0].strip().replace('_', ' ')
        author = parts[1].strip().replace('_', ' ')
    else:
        title = base.replace('_', ' ')
        author = "UNKNOWN"

    # Clean up
    title = re.sub(r'\s+', ' ', title).strip()
    author = re.sub(r'\s+', ' ', author).strip()
    # Remove "French Edition" etc from title
    title = re.sub(r'\s*(French|English|Spanish)\s*Edition\s*', '', title).strip()

    return title, author


def detect_language(fname, title, author):
    """Detect language from filename markers and content clues."""
    fname_lower = fname.lower()

    # Spanish
    for marker in SPANISH_MARKERS:
        if marker.lower() in fname_lower:
            return "ES"
    if "spanish_edition" in fname_lower or "_spa_" in fname_lower:
        return "ES"

    # French markers
    if "french_edition" in fname_lower or "french edition" in fname_lower:
        return "FR"

    # Known FR titles
    fr_title_markers = [
        "Du_cote_de_chez", "Madame_Bovary", "LAmant", "La_Nausee",
        "Letranger_French", "Molloy", "LInsoutenable", "Voyage_au_bout",
        "Cent_ans_de_solitude", "Les_hommes_qui", "Lamie_prodigieuse",
        "Cinquante_nuances", "La_Carte_et_le", "Les_Particules",
        "La_possibilite", "Pars_vite", "Stupeur_et_tremblements",
        "La_Jalousie", "La_Modification", "Enfance_-_Nathalie",
        "Le_planetarium", "La_Route_des_Flandres", "La_Vie_mode",
        "Dora_Bruder", "Rue_des_Boutiques", "La_Ronde_de_nuit",
        "Encre_sympathique", "Quartier_Perdu", "La_danseuse",
        "Les_Annees", "la_place_French", "Memoire_de_fille",
        "Une_femme_French", "Levenement", "Ce_quils_disent",
        "La_femme_gelee", "Coeur_simple", "Les_Mandarins",
        "Notre-Dame_de_Paris", "Les_Miserables_-_Victor",
        "La_condition_humaine", "La_Voie_royale",
        "Alexis_ou_le_Traite", "Anna_soror", "LOEuvre_au_noir",
        "Quoi__LEternite", "Le_salon_du_Wurtemberg", "Terrasse_a_Rome",
        "Tous_les_matins", "Desert_-_JMG", "Avers_-_J_M_G",
        "La_Quarantaine", "Ourania", "Kolkhoze", "La_Moustache",
        "Limonov", "Le_Voyeur", "Martereau",
        "Trois_Femmes_puissantes", "Texaco", "En_finir_avec_Eddy",
        "le-bruit-et-la-fureur",
        "Des_Souris_et_Des_hommes", "Le_vieil_homme_et_la_mer",
        "Le_soleil_se_leve_aussi", "La_Chambre_de_Giovanni",
        "Les_Vestiges_du_Jour", "La_Peste_French",
        "La_Chute", "LExil_et_le_Royaume", "La_mort_heureuse",
        "Crimes_et_chatiments", "Les_nuits_blanches",
        "Au_Bonheur_Des_Dames", "Loeuvre_-_Emile_Zola",
        "Une_page_damour", "LArgent_-_Emile_Zola",
        "Le_Capitaine_Burle", "Les_Mysteres_de_Marseille",
        "Les_Trois_Villes", "Les_soirees_de_Medan",
        "La_Grande_Chute", "Le_malheur_indifferent",
        "Letoile_de_Ratner", "Monts_Mers_et_Geants",
        "If_on_a_winters_night",  # Calvino in main dir -> likely FR context
        "pedro_paramo",
    ]
    for marker in fr_title_markers:
        if marker.lower() in fname_lower:
            return "FR"

    # EN subdirectories
    if "nouverau livre EN" in fname or "livre anglais en plus" in fname:
        return "EN"

    # Known EN authors in main dir
    en_authors_main = [
        "Virginia_Woolf", "Cormac_McCarthy", "Don_Delillo", "Thomas_Pynchon",
        "Donna_Tartt", "Hemingway", "Steinbeck", "Faulkner", "Nabokov",
        "WG_Sebald", "Toni_Morrison", "Theodore_Dreiser", "Sinclair_Lewis",
        "Edith_Wharton", "DH_Lawrence", "Claude_Simon",  # Flanders Road EN
        "Ron_Handberg", "Jeffrey_A_Carver", "Salman_Rushdie",
        "Ian_McEwan", "Chimamanda", "Lionel_Shriver",
        "Gone_Girl", "We_Need_to_Talk_About_Kevin",
        "The_Secret_History", "Blood_Meridian", "Mrs_Dalloway",
        "The_road_-_Cormac", "No_Country", "Suttree",
        "Americanah", "Atonement", "The_Sun_Also_Rises",
        "The_stranger_-_Albert_Camus", "End_Zone", "White_Noise",
        "Underworld_-_Don", "Pale_Fire", "Bend_Sinister",
        "V_-_Thomas_Pynchon", "Orlando_-_Virginia", "The_Waves",
        "A_Haunted_House", "The_Rings_of_Saturn", "Campo_Santo",
        "Vertigo_-_WG_Sebald", "Song_of_Solomon", "Lolita",
        "The_Flanders_Road", "The_Grass_-_Claude", "The_Opposing_Shore",
        "A_Balcony_in_the_Forest", "Do_What_They_Say",
        "The_Kill", "Dead_Men_Tell", "Truth_-_Emile", "Drunkard",
        "The_Joy_of_Life", "The_Attack_on_the_Mill",
        "The_Beast_Within", "Four_Novels_-_Marguerite_Duras",
        "Memoirs_of_Hadrian", "The_Kingdom_-_Emmanuel",
        "The_Hunchback", "Toilers_of_the_Sea",
        "Men_Without_Women", "The_Garden_of_Eden",
        "Burning_Bright", "Sweet_Thursday", "To_a_God_Unknown",
        "Main_Street_-_Sinclair", "Sister_Carrie",
        "Ethan_Frome", "The_House_of_Mirth",
        "An_American_Tragedy", "Sons_and_Lovers",
        "As_I_Lay_Dying", "2666", "Fury",
        "Norwegian_wood", "If_on_a_winters_night",
        "Toni-Morrison.-Beloved",
    ]
    for marker in en_authors_main:
        if marker.lower() in fname_lower:
            return "EN"

    # Self-published / romance / genre markers often EN
    en_genre_markers = [
        "Mafia", "Hucow", "Paranormal_Romanc", "LitRPG",
        "Fated_Mates", "Hotwife", "Fake_beard",
        "Zombie_Apocalypse", "Secret_Twins",
        "Mountain_Kings", "Gangalee_Girl", "Ghost_Toucher",
        "Industrial_Mage", "Living_next_to", "Saviors_Army",
        "Heartbreak_Era", "Honey_and_Harm", "Gently_Yours",
        "ESCnCTRL", "Liminal", "Recall_-_Andy",
        "Falling_to_pieces", "Hallowed_Be_Thy",
        "The_Cause_Of_All_Fear",
    ]
    for marker in en_genre_markers:
        if marker.lower() in fname_lower:
            return "EN"

    # Default: check dir
    return "UNKNOWN"


def detect_genre(fname, title, author):
    """Classify genre broadly."""
    fname_lower = fname.lower()

    # Self-published romance/erotica
    romance_markers = ["mafia", "hucow", "milked", "hotwife", "bully",
                       "daddy", "milliardaire", "billionaire", "alien_",
                       "guerrier_alien", "omega_for_rent", "fated_mates",
                       "mountain_kings", "bikers_law", "don_-_jade",
                       "cheating_with", "secret_twins", "gently_yours",
                       "contrat_avec_un_milliardaire", "honey_and_harm",
                       "heartbreak_era", "ugly_rooney", "surtout_pas_lui",
                       "our_vicious_lies", "mon_pire_date", "living_next"]
    for m in romance_markers:
        if m in fname_lower:
            return "romance-selfpub"

    # YA/Fantasy genre
    ya_markers = ["fourth_wing", "gideon_la_neuvieme", "lheritiere",
                  "maison_de_la_flamme", "les_enclaves", "les_enchanteresses",
                  "les_cartographes", "outrenoir", "the_grandest_games",
                  "indestructible_violette", "lelixir_doubli",
                  "la_huitieme_porte", "les_jeux_du_siecle"]
    for m in ya_markers:
        if m in fname_lower:
            return "fantasy-YA"

    # Horror/Genre
    horror_markers = ["zombie", "hallowed_be_thy", "ghost_toucher",
                      "deadly_vaccine", "the_cause_of_all_fear",
                      "uninvited_guest"]
    for m in horror_markers:
        if m in fname_lower:
            return "horror-genre"

    # Thriller/Crime
    thriller_authors = ["Gillian Flynn", "Stieg Larsson", "Fred Vargas",
                        "Lisa Gardner", "Karin Slaughter", "James Patterson",
                        "Patricia Cornwell", "John Grisham", "Tom Clancy",
                        "Lee Child", "Ken Follett", "Dean Koontz",
                        "Robin Cook", "Clive Cussler", "Robert Ludlum",
                        "Dashiell Hammett", "Raymond Chandler",
                        "John le Carre", "Agatha Christie", "Ron Handberg",
                        "Marion Todd", "Sidney Sheldon"]
    for a in thriller_authors:
        if a.lower().replace(' ', '_') in fname_lower or a.lower().replace(' ', ' ') in author.lower():
            return "thriller"

    # Literary fiction
    literary_authors = list(FR_B_AUTHORS) + list(EN_B_AUTHORS)
    for a in literary_authors:
        if a.lower().replace(' ', '_') in fname_lower:
            return "literary"

    # Upmarket
    upmarket_authors = list(FR_C_AUTHORS) + list(EN_C_AUTHORS)
    for a in upmarket_authors:
        if a.lower().replace(' ', '_') in fname_lower:
            return "upmarket"

    # SF/Fantasy
    sf_markers = ["battlestar", "dog_star", "dragons_in_the_stars",
                  "going_alien", "neptune_crossing", "panglor",
                  "love_rogo", "industrial_mage", "litrpg",
                  "foundation", "rendevous_with_rama", "sentinel_-_clarke",
                  "andromeda_strain", "sphere", "dinopark", "congo",
                  "rising_sun", "left_hand_of_darkness", "hyperion",
                  "reality_dysfunction", "wheel_of_time", "wizards_first",
                  "assassins_apprentice", "name_of_the_wind",
                  "at_the_mountains_of_madness", "cthulhu"]
    for m in sf_markers:
        if m in fname_lower:
            return "sf-fantasy"

    # General commercial fiction
    commercial_authors = ["Danielle Steel", "Nora Roberts", "Nicholas Sparks",
                          "Stephen King", "Michael Crichton", "Dan Brown",
                          "Wilbur Smith", "Janet Evanovich", "EL James",
                          "Colleen Hoover", "Stephanie Meyer", "JK Rowling",
                          "Suzanne Collins", "Veronica Roth", "Neil Gaiman",
                          "Terry Pratchett", "Chuck Palahniuk", "Douglas Adams",
                          "Anne Rice", "Andy Weir", "Shirley Jackson",
                          "Daphne du Maurier", "Brandon Sanderson"]
    for a in commercial_authors:
        if a.lower().replace(' ', '_') in fname_lower:
            return "commercial"

    # Classic/Upmarket
    classic_markers = ["victor_hugo", "emile_zola", "dostoievski",
                       "steinbeck", "hemingway", "fitzgerald",
                       "orwell", "hardy", "eliot", "dickens",
                       "bronte", "twain", "alcott", "kipling",
                       "forster", "trollope", "wharton", "chopin",
                       "dreiser", "london", "stevenson", "wells",
                       "melville", "hawthorne", "shelley", "stoker",
                       "salinger", "kerouac", "wilde", "conrad"]
    for m in classic_markers:
        if m in fname_lower:
            return "classic"

    return "fiction-other"


def classify_group(fname, title, author, lang, genre):
    """Assign to FR-A, FR-B, FR-C, EN-A, EN-B, EN-C based on author + genre."""

    # Normalize author for matching
    author_norm = author.lower().replace('_', ' ').replace('-', ' ').strip()
    fname_lower = fname.lower()

    def author_matches(author_set):
        for a in author_set:
            a_lower = a.lower()
            if a_lower in author_norm or a_lower.replace(' ', '_') in fname_lower:
                return True
        return False

    if lang == "FR":
        if author_matches(FR_B_AUTHORS):
            return "FR-B"
        if author_matches(FR_A_AUTHORS):
            return "FR-A"
        if author_matches(FR_C_AUTHORS):
            return "FR-C"
        # Genre-based fallback
        if genre in ("romance-selfpub", "fantasy-YA", "horror-genre"):
            return "FR-A"  # commercial
        if genre == "literary":
            return "FR-B"
        return "FR-UNCLASSIFIED"

    if lang == "EN":
        if author_matches(EN_B_AUTHORS):
            return "EN-B"
        if author_matches(EN_A_AUTHORS):
            return "EN-A"
        if author_matches(EN_C_AUTHORS):
            return "EN-C"
        # Genre-based fallback
        if genre in ("romance-selfpub", "fantasy-YA", "horror-genre", "sf-fantasy"):
            return "EN-A"  # commercial
        if genre == "literary":
            return "EN-B"
        if genre in ("thriller", "commercial"):
            return "EN-A"
        if genre in ("classic", "upmarket"):
            return "EN-C"
        return "EN-UNCLASSIFIED"

    return "EXCLUDED"


def should_exclude(fname):
    """Check if file should be excluded from analysis."""
    fname_lower = fname.lower()

    # Non-fiction / Spanish / etc
    for kw in EXCLUDE_KEYWORDS_NONFICTION:
        if kw.lower() in fname_lower:
            return True, "non-fiction/ES/metadata"

    # Spanish markers
    for marker in SPANISH_MARKERS:
        if marker.lower() in fname_lower:
            return True, "Spanish"

    # Specific exclusions
    for exc in EXCLUDE_SPECIFIC:
        if exc.lower() in fname_lower:
            return True, "specific-exclusion"

    # Duplicates: (1) suffix
    if re.search(r'\(\d+\)\.\w+$', fname):
        return True, "duplicate"

    return False, ""


# =============================================================================
# MAIN SCAN
# =============================================================================
all_files = []
seen_bases = set()  # dedup

for d in DIRS:
    if not os.path.exists(d):
        print(f"WARNING: Directory not found: {d}")
        continue
    for fname in os.listdir(d):
        fpath = os.path.join(d, fname)
        if not os.path.isfile(fpath):
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext not in ('.pdf', '.epub'):
            continue
        # Skip _EXCLU subdirectory
        if EXCLUDE_DIR.lower() in fpath.lower():
            continue

        # Dedup
        base = re.sub(r'\s*\(\d+\)', '', os.path.splitext(fname)[0])
        if base in seen_bases:
            continue
        seen_bases.add(base)

        title, author = clean_filename(fname)
        lang = detect_language(fpath, title, author)

        # Check exclusion
        excluded, reason = should_exclude(fname)

        genre = detect_genre(fname, title, author) if not excluded else "EXCLUDED"
        group = "EXCLUDED" if excluded else classify_group(fname, title, author, lang, genre)

        # Override: if language unknown and not excluded, try to classify
        if lang == "UNKNOWN" and not excluded:
            # Check if it's in a subdirectory
            if "nouverau livre EN" in fpath or "livre anglais en plus" in fpath:
                lang = "EN"
            else:
                lang = "FR"  # main dir default
            group = classify_group(fname, title, author, lang, genre)

        included = not excluded and group != "EXCLUDED" and lang != "ES"

        all_files.append({
            'fichier': fname,
            'titre': title,
            'auteur': author,
            'langue': lang,
            'genre': genre,
            'groupe': group,
            'inclus': "OUI" if included else "NON",
            'raison_exclusion': reason if excluded else "",
            'dossier': os.path.basename(d) if d != DIRS[0] else "racine",
        })

# =============================================================================
# WRITE CSV
# =============================================================================
csv_path = os.path.join(OUTPUT_DIR, "inventaire_corpus_classifie.csv")
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=[
        'fichier', 'titre', 'auteur', 'langue', 'genre', 'groupe',
        'inclus', 'raison_exclusion', 'dossier'
    ])
    writer.writeheader()
    for item in sorted(all_files, key=lambda x: (x['groupe'], x['auteur'])):
        writer.writerow(item)

# =============================================================================
# SUMMARY
# =============================================================================
included = [f for f in all_files if f['inclus'] == "OUI"]
excluded = [f for f in all_files if f['inclus'] == "NON"]

print("=" * 80)
print("INVENTAIRE CORPUS — RÉSUMÉ")
print("=" * 80)
print(f"\nTotal fichiers scannés: {len(all_files)}")
print(f"Inclus dans l'analyse:  {len(included)}")
print(f"Exclus:                 {len(excluded)}")

print("\n--- RÉPARTITION PAR GROUPE ---")
from collections import Counter
groups = Counter(f['groupe'] for f in included)
for g in sorted(groups.keys()):
    print(f"  {g:20s}: {groups[g]:3d} titres")

print("\n--- RÉPARTITION PAR LANGUE ---")
langs = Counter(f['langue'] for f in included)
for l in sorted(langs.keys()):
    print(f"  {l}: {langs[l]:3d} titres")

print("\n--- EXCLUSIONS PAR RAISON ---")
exc_reasons = Counter(f['raison_exclusion'] for f in excluded if f['raison_exclusion'])
for r, c in exc_reasons.most_common():
    print(f"  {r:30s}: {c:3d}")

print(f"\n--- VÉRIFICATION SEUILS MINIMUM ---")
fr_a = sum(1 for f in included if f['groupe'] == 'FR-A')
fr_b = sum(1 for f in included if f['groupe'] == 'FR-B')
en_a = sum(1 for f in included if f['groupe'] == 'EN-A')
en_b = sum(1 for f in included if f['groupe'] == 'EN-B')
print(f"  FR-A: {fr_a} (seuil: 15) {'OK' if fr_a >= 15 else 'INSUFFISANT'}")
print(f"  FR-B: {fr_b} (seuil: 15) {'OK' if fr_b >= 15 else 'INSUFFISANT'}")
print(f"  EN-A: {en_a} (seuil: 15) {'OK' if en_a >= 15 else 'INSUFFISANT'}")
print(f"  EN-B: {en_b} (seuil: 15) {'OK' if en_b >= 15 else 'INSUFFISANT'}")
print(f"  FR total: {fr_a + fr_b + sum(1 for f in included if f['groupe'] == 'FR-C')} (seuil: 30)")
print(f"  EN total: {en_a + en_b + sum(1 for f in included if f['groupe'] == 'EN-C')} (seuil: 30)")

print(f"\nCSV écrit: {csv_path}")

# Print titles per group for verification
for grp in ['FR-A', 'FR-B', 'FR-C', 'EN-A', 'EN-B', 'EN-C']:
    titles_in_group = [f for f in included if f['groupe'] == grp]
    print(f"\n--- {grp} ({len(titles_in_group)} titres) ---")
    for t in sorted(titles_in_group, key=lambda x: x['auteur']):
        print(f"  {t['auteur']:30s} | {t['titre'][:50]}")
