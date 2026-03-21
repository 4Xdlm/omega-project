"""Phase R-1/R-2: Build CORPUS_INVENTORY.json and CORPUS_TIERS_DRAFT.json."""
import os, json, re

TXT_DIR = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\txt"
GUTENBERG_DIR = r"C:\Users\elric\omega-project\omega-autopsie\gutenberg_cache"
OUT_DIR = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r"

# Known canonical authors for tier classification
TIER_S = {
    # Nobel laureates + universal canon
    "victor hugo", "emile zola", "gustave flaubert", "albert camus", "jean paul sartre",
    "marcel proust", "samuel beckett", "toni morrison", "gabriel garcia marquez",
    "william faulkner", "ernest hemingway", "john steinbeck", "vladimir nabokov",
    "marguerite yourcenar", "patrick modiano", "annie ernaux", "jean marie gustave le clezio",
    "j m g le clezio", "le clezio", "jmg le clezio", "wg sebald", "w g sebald",
    "peter handke", "chinua achebe", "haruki murakami", "donna tartt",
    "milan kundera", "fiodor dostoievski", "dostoievski", "dostoevsky",
    "virginia woolf", "italo calvino", "umberto eco", "cormac mccarthy",
    "thomas pynchon", "don delillo", "salman rushdie", "kazuo ishiguro",
    "simone de beauvoir", "marguerite duras", "claude simon", "nathalie sarraute",
    "alain robbe grillet", "georges perec", "louis ferdinand celine", "celine",
    "roberto bolano", "elena ferrante", "stieg larsson",
}

TIER_A = {
    # Major prizes (Goncourt, Pulitzer fiction, Booker) + strong canon
    "andre malraux", "julien gracq", "patrick chamoiseau", "marie ndiaye",
    "amelie nothomb", "fred vargas", "michel houellebecq", "emmanuel carrere",
    "pascal quignard", "pierre corneille", "edouard louis",
    "chimamanda ngozi adichie", "gillian flynn", "ian mcewan",
    "edith wharton", "henry james", "kate chopin", "dh lawrence", "d h lawrence",
    "theodore dreiser", "sinclair lewis", "james baldwin", "lionel shriver",
    "simone weil", "alfred doblin", "ogai mori",
    "jodi picoult", "andy weir", "guillaume musso",
    "jacques ranciere", "jean echenoz", "lolita pille",
    "robin hobb", "sarah j maas", "diana gabaldon", "rebecca yarros",
    "pierre bottero", "naomi novik",
}

TIER_B = {
    # Quality literature, serious publishers
    "shannon messenger", "jennifer lynn barnes", "tamsyn muir",
    "danielle steel", "linda stasi", "marion todd",
    "florent oiseau", "sophie gliocas", "katherine girard",
    "pierre pevel", "marc j gregson", "jen calonita",
    "arttu tuominen",
}

def guess_author(filename):
    """Try to extract author from filename."""
    name = filename.replace('.txt', '')
    # Remove pdf_ prefix
    name = re.sub(r'^(pdf_|epub_|pdf2_)', '', name)
    # Remove gutenberg ID suffix
    name = re.sub(r'_\d{3,}$', '', name)
    # Try to get author from common patterns
    # Most filenames are: title_author.txt or author_title.txt
    parts = name.split('_')
    return name  # Return full cleaned name for manual inspection

def detect_source(filename):
    if filename.startswith('pdf_'):
        return 'pdf'
    elif filename.startswith('epub_'):
        return 'epub'
    else:
        # Check if it exists in gutenberg cache
        gut_path = os.path.join(GUTENBERG_DIR, filename)
        if os.path.exists(gut_path):
            return 'gutenberg'
        return 'epub'  # Default for epub files without prefix

def detect_language(filename, text_sample=""):
    """Rough language detection from filename."""
    fn = filename.lower()
    if 'french_edition' in fn or 'french' in fn:
        return 'fr'
    if 'spanish_edition' in fn or 'spanish' in fn:
        return 'es'
    if 'italian_edition' in fn or 'italian' in fn:
        return 'it'
    # French indicators in filename
    fr_words = ['les_', 'le_', 'la_', 'des_', 'du_', 'une_', 'un_', 'au_', 'aux_',
                'dans_', 'sur_', 'pour_', 'avec_', 'entre_', 'sous_']
    es_words = ['el_', 'la_', 'los_', 'las_', 'del_', 'una_', 'por_', 'con_']

    fr_count = sum(1 for w in fr_words if w in fn)
    es_count = sum(1 for w in es_words if w in fn)

    # Known French authors
    fr_authors = ['hugo', 'zola', 'flaubert', 'camus', 'sartre', 'proust', 'modiano',
                  'ernaux', 'houellebecq', 'carrere', 'quignard', 'yourcenar', 'duras',
                  'malraux', 'corneille', 'chamoiseau', 'ndiaye', 'nothomb', 'vargas',
                  'musso', 'echenoz', 'gracq', 'perec', 'simon', 'sarraute', 'robbe_grillet',
                  'celine', 'bottero', 'pevel', 'handke']
    for a in fr_authors:
        if a in fn:
            return 'fr'

    if fr_count > es_count:
        return 'fr'
    if es_count > fr_count:
        return 'es'

    return 'en'

def classify_tier(filename):
    """Suggest tier based on author recognition."""
    fn = filename.lower().replace('.txt', '')
    fn = re.sub(r'^(pdf_|epub_|pdf2_)', '', fn)
    fn_clean = fn.replace('_', ' ')

    for author in TIER_S:
        # Check if author name appears in filename
        author_parts = author.split()
        if all(part in fn_clean for part in author_parts):
            return 'S', f"Canon mondial / Nobel — {author}"

    for author in TIER_A:
        author_parts = author.split()
        if all(part in fn_clean for part in author_parts):
            return 'A', f"Prix majeur / classique reconnu — {author}"

    for author in TIER_B:
        author_parts = author.split()
        if all(part in fn_clean for part in author_parts):
            return 'B', f"Littérature de qualité — {author}"

    # Heuristics for lower tiers
    low_signals = ['mafia', 'hucow', 'hotwife', 'milked', 'cheating', 'dirty_daddy',
                   'ghetto', 'bully', 'omega_for_rent', 'secret_twins']
    for sig in low_signals:
        if sig in fn:
            return 'D', f"Contenu formulaïque — signal: {sig}"

    romance_signals = ['alien_french', 'guerrier_alien', 'bikers_law', 'grossesse_mafia',
                       'contrat_avec_un_milliardaire', 'claimed_by', 'bound_by_the_don',
                       'seduite_par', 'yakuza']
    for sig in romance_signals:
        if sig in fn:
            return 'C', f"Romance/genre commercial — signal: {sig}"

    return '?', "Classification manuelle requise"


# Build inventory
inventory = []
tiers_draft = []

txt_files = sorted(os.listdir(TXT_DIR))
print(f"Processing {len(txt_files)} files...")

for filename in txt_files:
    if not filename.endswith('.txt'):
        continue

    filepath = os.path.join(TXT_DIR, filename)
    try:
        size = os.path.getsize(filepath)
        # Estimate words from file size (approx 5.5 chars per word for mixed languages)
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            # Read first 10000 chars for language detection
            sample = f.read(10000)
            # Count words by seeking to end
            f.seek(0, 2)
            file_size = f.tell()

        # Count words properly
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
        words = len(text.split())

        source = detect_source(filename)
        lang = detect_language(filename, sample)

        inventory.append({
            "filename": filename,
            "source": source,
            "words": words,
            "language": lang,
            "size_bytes": size
        })

        # Tier classification
        tier, reason = classify_tier(filename)
        # Try to extract author/title
        fn_clean = filename.replace('.txt', '')
        fn_clean = re.sub(r'^(pdf_|epub_|pdf2_)', '', fn_clean)

        tiers_draft.append({
            "filename": filename,
            "author_guess": fn_clean,
            "language": lang,
            "words": words,
            "tier_suggestion": tier,
            "tier_reason": reason,
            "tier_final": None
        })

    except Exception as e:
        print(f"[ERROR] {filename}: {e}")

# Save inventory
inv_path = os.path.join(OUT_DIR, "CORPUS_INVENTORY.json")
with open(inv_path, 'w', encoding='utf-8') as f:
    json.dump(inventory, f, indent=2, ensure_ascii=False)

# Save tiers draft
tiers_path = os.path.join(OUT_DIR, "CORPUS_TIERS_DRAFT.json")
with open(tiers_path, 'w', encoding='utf-8') as f:
    json.dump(tiers_draft, f, indent=2, ensure_ascii=False)

# Stats
total_words = sum(e["words"] for e in inventory)
by_source = {}
by_lang = {}
by_tier = {}
for e in inventory:
    by_source[e["source"]] = by_source.get(e["source"], 0) + 1
    by_lang[e["language"]] = by_lang.get(e["language"], 0) + 1
for e in tiers_draft:
    by_tier[e["tier_suggestion"]] = by_tier.get(e["tier_suggestion"], 0) + 1

print(f"\n{'='*60}")
print(f"CORPUS INVENTORY: {len(inventory)} oeuvres")
print(f"Total words: {total_words:,}")
print(f"\nBy source: {json.dumps(by_source, indent=2)}")
print(f"\nBy language: {json.dumps(by_lang, indent=2)}")
print(f"\nBy tier suggestion: {json.dumps(by_tier, indent=2)}")
print(f"\nInventory saved: {inv_path}")
print(f"Tiers draft saved: {tiers_path}")
print(f"{'='*60}")
