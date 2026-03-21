"""
OMEGA Phase R — Classification automatique étendue des tiers
Passe 2 : classifier les 335 "?" avec une base de connaissances élargie
"""
import json
import re

TIERS_PATH = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\CORPUS_TIERS_DRAFT.json"
OUTPUT_PATH = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\CORPUS_TIERS_V2.json"

with open(TIERS_PATH, 'r', encoding='utf-8') as f:
    corpus = json.load(f)

# Extended knowledge base
TIER_S = {
    # Nobel + Canon mondial absolu
    'flaubert', 'proust', 'dostoievski', 'dostoevsky', 'dostoyevsky', 'dostoïevski',
    'hugo', 'camus', 'garcia_marquez', 'marquez', 'tolstoi', 'tolstoy',
    'kafka', 'joyce', 'faulkner', 'hemingway', 'homer', 'homere',
    'shakespeare', 'cervantes', 'dante', 'goethe', 'moliere',
    'baudelaire', 'rimbaud', 'verlaine', 'nerval',
    'yourcenar', 'marguerite_yourcenar',
    'stendhal', 'balzac',
    'dickens', 'bronte', 'austen',
    'zola', 'maupassant',
    'wilde', 'poe',
    'chekhov', 'tchekhov', 'gogol', 'tourgueniev', 'turgenev',
    'melville', 'twain',
    'dumas', 'voltaire', 'rousseau', 'montaigne',
    'chateaubriand', 'lamartine',
    'racine', 'corneille', 'beaumarchais',
    'defoe', 'swift',
    'hawthorne', 'thoreau', 'whitman',
    'lorca', 'garcia_lorca',
    'borges',
    'achebe', 'chinua_achebe',
    'murakami',
    'chamoiseau',
}

TIER_A = {
    # Prix majeurs, classiques reconnus, grande littérature
    'sartre', 'beauvoir', 'malraux',
    'robbe_grillet', 'robbe-grillet',
    'ndiaye', 'ndaye',
    'adichie', 'chimamanda',
    'kundera',
    'echenoz',
    'modiano',
    'duras',
    'gide',
    'mauriac',
    'bernanos',
    'green', 'julien_green',
    'gracq',
    'perec',
    'queneau',
    'ionesco',
    'beckett',
    'ranciere',
    'levi', 'primo_levi',
    'mcewan', 'ian_mcewan',
    'donna_tartt', 'tartt',
    'king', 'stephen_king',
    'gabaldon', 'diana_gabaldon',
    'picoult', 'jodi_picoult',
    'keneally', 'thomas_keneally',
    'shriver', 'lionel_shriver',
    'hardy', 'francoise_hardy',
    'pille', 'lolita_pille',
    'haw', 'penny_haw',
    'todd', 'marion_todd',
    'danielewski',
    'lewis', 'cs_lewis', 'c_s_lewis',
    'doblin', 'alfred_doblin',
    'petrosyan',
    'weir', 'andy_weir',
    'archer', 'jefferey_archer', 'jeffrey_archer',
    'almaas',
    'adelkhah',
    'musso', 'guillaume_musso',
    'hannah', 'kristin_hannah',
}

TIER_B = {
    # Littérature de qualité, publiée chez éditeur sérieux
    'calmel', 'mireille_calmel',
    'bottero', 'pierre_bottero',
    'robillard', 'anne_robillard',
    'hobb', 'robin_hobb',
    'pevel', 'pierre_pevel',
    'messenger', 'shannon_messenger',
    'maas', 'sarah_j_maas',
    'yarros', 'rebecca_yarros',
    'barnes', 'jennifer_lynn_barnes',
    'shepherd', 'peng_shepherd',
    'novik', 'naomi_novik',
    'wolff', 'tracy_wolff',
    'muir', 'tamsyn_muir',
    'moreci', 'jenna_moreci',
    'gregson', 'marc_j_gregson',
    'hashem', 'sara_hashem',
    'mars', 'lyla_mars',
    'steel', 'danielle_steel',
    'ouimet', 'josee_ouimet',
    'contreras', 'claire_contreras',
    'peyrade', 'pauline_peyrade', 'peyrad',
    'rosenfeld', 'adele_rosenfeld',
    'oiseau', 'florent_oiseau',
    'calonita', 'jen_calonita',
    'hollyman', 'steve_hollyman',
    'lyon', 'annette_lyon',
    'stasi', 'linda_stasi',
    'lampman', 'annie_lampman',
    'ryder', 'hannah_ryder',
}

# Tier C — Genre/commercial bien exécuté
TIER_C_SIGNALS = [
    'romance', 'mafia', 'billionaire', 'milliardaire', 'alien', 'werewolf',
    'omega_for', 'hotwife', 'hucow', 'biker', 'yakuza', 'grossesse',
    'dirty_daddy', 'cheating', 'my_boyfriend', 'fated_mate',
    'warriors', 'shifter', 'alpha',
]

# Tier D — Formulaïque, self-published flagrant
TIER_D_SIGNALS = [
    'ghetto', 'milked_by', 'reno_man', 'hucow_for_mafioso',
    'cheating_with_my', 'dirty_daddy',
]

def classify(entry):
    fn = entry['filename'].lower()
    author = entry.get('author_guess', '').lower()
    
    # Already classified
    if entry['tier_suggestion'] != '?':
        return entry['tier_suggestion'], entry['tier_reason']
    
    # Check D first (most specific)
    for sig in TIER_D_SIGNALS:
        if sig in fn:
            return 'D', f'Signal formulaïque: {sig}'
    
    # Check C
    for sig in TIER_C_SIGNALS:
        if sig in fn:
            return 'C', f'Signal commercial/genre: {sig}'
    
    # Check S
    for name in TIER_S:
        if name in fn or name in author:
            return 'S', f'Canon mondial — {name}'
    
    # Check A
    for name in TIER_A:
        if name in fn or name in author:
            return 'A', f'Excellence reconnue — {name}'
    
    # Check B
    for name in TIER_B:
        if name in fn or name in author:
            return 'B', f'Littérature de qualité — {name}'
    
    # Heuristics for remaining
    # Spanish/French romance patterns
    romance_patterns = [
        'seduite', 'convoitee', 'prohibido', 'culpa_mia', 'novia',
        'amor', 'coeur', 'rendez_vous', 'hearts', 'darling', 'honey',
        'bound_by', 'claimed_by', 'falling', 'heartbreak', 'liminal',
        'mon_pire', 'surtout_pas', 'ugly', 'gently_yours',
        'secret_twins', 'living_next', 'latte_darling',
        'nacidos_en_sangre', 'elite_plateada', 'perras',
        'scarlett', 'harlow', 'pietro',
    ]
    for pat in romance_patterns:
        if pat in fn:
            return 'C', f'Signal romance/genre: {pat}'
    
    # Genre fiction patterns
    genre_patterns = [
        'zombie', 'apocalypse', 'litrpg', 'industrial_mage',
        'vampire', 'dragon', 'fantasy', 'enchanter',
        'saviors_army', 'ghost_toucher', 'krampus',
        'hallowed', 'gore', 'uninvited_guest',
        'deadly_vaccine', 'recall', 'code_of_silence',
        'double_bluff', 'watch_them_fall',
        'sink_or_burn', 'cause_of_all_fear',
    ]
    for pat in genre_patterns:
        if pat in fn:
            return 'C', f'Signal genre fiction: {pat}'
    
    # Self-help / non-fiction
    nonfic_patterns = [
        'psychology', 'being_and', 'belonging', 'disorders',
        'haine_de_la_democratie', 'existentialisme', 'etre_et_le_neant',
        'mythe_de_sisyphe', 'situations_viii', 'desirer_la_violence',
        'rebellion', 'pequeno_libro', 'dejar_de_ser',
    ]
    for pat in nonfic_patterns:
        if pat in fn:
            return 'B', f'Non-fiction/essai: {pat}'
    
    # Default: still unknown
    return '?', 'Classification manuelle requise'

# Process
stats = {'S': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, '?': 0}
for entry in corpus:
    tier, reason = classify(entry)
    entry['tier_suggestion'] = tier
    entry['tier_reason'] = reason
    stats[tier] = stats.get(tier, 0) + 1

# Save
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(corpus, f, ensure_ascii=False, indent=2)

print("=" * 60)
print("CLASSIFICATION V2 — RÉSULTATS")
print("=" * 60)
for tier in ['S', 'A', 'B', 'C', 'D', '?']:
    print(f"  Tier {tier}: {stats.get(tier, 0)}")
print(f"\n  TOTAL: {len(corpus)}")
print(f"  Restent en '?': {stats.get('?', 0)}")
print(f"\n  Sauvé: {OUTPUT_PATH}")

# Show remaining ?
unknowns = [e for e in corpus if e['tier_suggestion'] == '?']
if unknowns:
    print(f"\n  Les {len(unknowns)} '?' restants:")
    for u in unknowns:
        print(f"    {u['filename'][:60]}  ({u['words']} mots, {u['language']})")
