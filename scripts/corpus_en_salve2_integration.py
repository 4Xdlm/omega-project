#!/usr/bin/env python3
"""
OMEGA — 2nd Batch EN Integration: Maximaliste prose to fix V1 cluster gap.
Steps: Clean, Convert, Tier, Deploy, Update CORPUS_FEATURES_MASTER.json
"""
import os, re, warnings
from pathlib import Path
warnings.filterwarnings('ignore')

SRC_DIR = Path(r"C:\Users\elric\Downloads\livre\livre anglais en plus 2 eme salve")
CORPUS_DIR = Path(r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\txt")
MASTER_JSON = Path(r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\CORPUS_FEATURES_MASTER.json")

# ─── EXCLUSIONS ──────────────────────────────────────────────────────────────
EXCLUDE = [
    "American_Hagwon_-_Min_Jin_Lee (1).pdf",        # doublon
    "Ojos_azules_-_Toni_Morrison__SPA_",             # espagnol
    "Outlander_tome_2_French_Edition_-_Diana_Gabaldon", # francais
    "TRIESTE_-_Dasa_Drndie",                         # auteur croate, traduction
    "Needles_Eye_-_Wieslaw_Mysliwski",               # auteur polonais, traduction
    "A_Mask_the_Color_of_the_Sky_-_Bassem_Khandaqji",# auteur arabe, traduction
    "The_World_of_Robert_Jordans_The_Wheel_of_Time",  # guide, pas roman
    "The_wheel_of_time_01-14_series_collection",      # omnibus massif
]

# ─── RENAME MAP ──────────────────────────────────────────────────────────────
RENAME_MAP = {
    "A_Beautiful_Loan_-_Mary_Costello": ("mary_costello", "a_beautiful_loan"),
    "A_Memory_of_Light_-_Robert_Jordan": ("robert_jordan", "a_memory_of_light"),
    "American_Hagwon_-_Min_Jin_Lee": ("min_jin_lee", "american_hagwon"),
    "Assassins_Apprentice_-_Robin_Hobb": ("robin_hobb", "assassins_apprentice"),
    "At_the_Mountains_of_Madness_-_H_P_Lovecraft": ("hp_lovecraft", "at_the_mountains_of_madness"),
    "Atlas_Shrugged_-_Ayn_Rand": ("ayn_rand", "atlas_shrugged"),
    "Black_Bag_-_Luke_Kennard": ("luke_kennard", "black_bag"),
    "Celestial_Lights_-_Cecile_Pin": ("cecile_pin", "celestial_lights"),
    "Chesapeake_-_James_A_Michener": ("james_michener", "chesapeake"),
    "Chimera_-_Alice_Thompson": ("alice_thompson", "chimera"),
    "Congo_-_Michael_Crichton": ("michael_crichton", "congo"),
    "Cthulhu_2000_-_HP_Lovecraft": ("hp_lovecraft", "cthulhu_2000"),
    "Dragons_-_R_A_Salvatore": ("ra_salvatore", "dragons"),
    "Hawaii_-_James_A_Michener": ("james_michener", "hawaii"),
    "Hyperion_Tales_-_Dan_Simmons": ("dan_simmons", "hyperion"),
    "Interview_with_the_Vampire_-_Anne_Rice": ("anne_rice", "interview_with_the_vampire"),
    "Lucien_-_JR_Thornton": ("jr_thornton", "lucien"),
    "Neverwinter_2011_-_R_A_Salvatore": ("ra_salvatore", "neverwinter"),
    "New_Spring_-_Robert_Jordan": ("robert_jordan", "new_spring"),
    "Nothing_natural_-_Jenny_diski": ("jenny_diski", "nothing_natural"),
    "Pythons_Kiss_Stories_-_Louise_Erdrich": ("louise_erdrich", "pythons_kiss"),
    "Red_Storm_Rising_-_Tom_Clancy": ("tom_clancy", "red_storm_rising"),
    "Rising_Sun_-_Michael_Crichton": ("michael_crichton", "rising_sun"),
    "The_Cardinal_of_the_Kremlin_-_Tom_Clancy_Mark_Greaney_Marc_Cameron": ("tom_clancy", "the_cardinal_of_the_kremlin"),
    "The_Creek_the_Crone_and_the_Crow_-_Leah_Weiss": ("leah_weiss", "the_creek_the_crone"),
    "The_Dragon_Reborn_-_Robert_Jordan": ("robert_jordan", "the_dragon_reborn"),
    "The_Emerald_Light_in_the_Air_-_Donald_Antrim": ("donald_antrim", "the_emerald_light_in_the_air"),
    "The_Fall_of_the_House_of_Usher_-_Edgar_Allan_Poe": ("edgar_allan_poe", "the_fall_of_the_house_of_usher"),
    "The_Fallon_Blood_-_Robert_Jordan": ("robert_jordan", "the_fallon_blood"),
    "The_Fallon_Pride_-_Robert_Jordan": ("robert_jordan", "the_fallon_pride"),
    "The_Finest_Edge_of_Twilight_-_RA_Salvatore": ("ra_salvatore", "the_finest_edge_of_twilight"),
    "The_Fountainhead_-_Ayn_Rand": ("ayn_rand", "the_fountainhead"),
    "The_Great_Hunt_-_Robert_Jordan": ("robert_jordan", "the_great_hunt"),
    "The_Legend_of_Drizzt_The_Collected_Stories_-_R_A_Salvatore": ("ra_salvatore", "the_legend_of_drizzt"),
    "The_Name_of_the_Wind_-_Patrick_Rothfuss": ("patrick_rothfuss", "the_name_of_the_wind"),
    "The_Narrative_of_Arthur_Gordon_Pym_of_Nant_-_Edgar_Allan_Poe": ("edgar_allan_poe", "the_narrative_of_arthur_gordon_pym"),
    "The_Other_Boleyn_Girl_-_Philippa_Gregory": ("philippa_gregory", "the_other_boleyn_girl"),
    "The_Reality_Dysfunction_-_Peter_F_Hamilton": ("peter_hamilton", "the_reality_dysfunction"),
    "The_Reality_Dysfunction_Part_2_-_Peter_F_Hamilton": ("peter_hamilton", "the_reality_dysfunction_part_2"),
    "The_Train_Now_Departing_-_Martha_Grimes": ("martha_grimes", "the_train_now_departing"),
    "The_Vampire_Lestat_-_Anne_Rice": ("anne_rice", "the_vampire_lestat"),
    "The_best_place_on_earth_-_Ayelet_tsabari": ("ayelet_tsabari", "the_best_place_on_earth"),
    "Titus_Groan_-_Mervyn_Peake": ("mervyn_peake", "titus_groan"),
    "To_the_Blight_-_Jordan_Robert": ("robert_jordan", "to_the_blight"),
    "Towers_of_Midnight_-_Robert_Jordan": ("robert_jordan", "towers_of_midnight"),
    "Upward_bound_-_Woody_Brown": ("woody_brown", "upward_bound"),
    "Variations_on_a_Dream_-_Angelique_Lalonde": ("angelique_lalonde", "variations_on_a_dream"),
    "Winter_Animals_-_Ashani_lewis": ("ashani_lewis", "winter_animals"),
    "Wizards_First_Rule_-_Terry_Goodkind": ("terry_goodkind", "wizards_first_rule"),
}

# ─── TIERING ─────────────────────────────────────────────────────────────────
import fnmatch

TIER_RULES = [
    # A
    ("louise_erdrich_*", "A"), ("donald_antrim_*", "A"), ("min_jin_lee_*", "A"),
    # B
    ("hp_lovecraft_*", "B"), ("edgar_allan_poe_*", "B"), ("mervyn_peake_*", "B"),
    ("dan_simmons_hyperion*", "B"), ("mary_costello_*", "B"), ("jenny_diski_*", "B"),
    ("ayelet_tsabari_*", "B"), ("angelique_lalonde_*", "B"),
    ("luke_kennard_*", "B"), ("cecile_pin_*", "B"), ("alice_thompson_*", "B"),
    # C
    ("anne_rice_*", "C"), ("diana_gabaldon_*", "C"), ("philippa_gregory_*", "C"),
    ("robin_hobb_*", "C"), ("patrick_rothfuss_*", "C"), ("peter_hamilton_*", "C"),
    ("michael_crichton_congo*", "C"), ("michael_crichton_rising*", "C"),
    ("ayn_rand_*", "C"), ("james_michener_*", "C"),
    ("leah_weiss_*", "C"), ("jr_thornton_*", "C"), ("martha_grimes_*", "C"),
    ("woody_brown_*", "C"), ("ashani_lewis_*", "C"),
    # D
    ("robert_jordan_*", "D"), ("terry_goodkind_*", "D"),
    ("ra_salvatore_*", "D"), ("tom_clancy_red_storm*", "D"),
    ("tom_clancy_the_cardinal*", "D"),
]

def assign_tier(filename):
    base = filename.replace(".txt", "")
    for pattern, tier in TIER_RULES:
        if fnmatch.fnmatch(base, pattern):
            return tier
    return "C"  # default


def should_exclude(filename):
    for pattern in EXCLUDE:
        if pattern in filename:
            return True
    return False


def strip_prefix(filename):
    return re.sub(r'^_OceanofPDF\.com_', '', filename)


def get_standard_name(filename):
    name = strip_prefix(filename)
    base, ext = os.path.splitext(name)
    if base in RENAME_MAP:
        author, title = RENAME_MAP[base]
        return f"{author}_{title}", ext.lower()
    return base.lower().replace(" ", "_"), ext.lower()


def convert_epub(path):
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
    try:
        book = epub.read_epub(str(path), options={'ignore_ncx': True})
        parts = []
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            parts.append(soup.get_text(separator='\n'))
        return '\n\n'.join(parts)
    except:
        return None


def convert_pdf(path):
    import pdfplumber
    try:
        with pdfplumber.open(str(path)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return '\n\n'.join(pages)
    except:
        return None


def main():
    import json

    print("=" * 70)
    print("OMEGA — 2nd BATCH EN INTEGRATION (Maximaliste)")
    print("=" * 70)

    all_files = os.listdir(SRC_DIR)
    print(f"\nSource files: {len(all_files)}")

    # Step 1: Filter
    excluded = []
    kept = []
    for f in sorted(all_files):
        if should_exclude(f):
            excluded.append(f)
        else:
            ext = os.path.splitext(f)[1].lower()
            if ext in ['.epub', '.pdf']:
                kept.append(f)
            else:
                excluded.append(f)

    print(f"Excluded: {len(excluded)}")
    for e in excluded:
        print(f"  - {e}")
    print(f"Kept: {len(kept)}")

    # Step 2: Convert + deploy
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    converted = []
    failed = []
    tier_counts = {"A": 0, "B": 0, "C": 0, "D": 0}

    for f in sorted(kept):
        src_path = SRC_DIR / f
        std_name, ext = get_standard_name(f)
        txt_name = std_name + ".txt"
        txt_path = CORPUS_DIR / txt_name

        if txt_path.exists():
            print(f"  SKIP (exists): {txt_name}")
            continue

        text = None
        if ext == ".epub":
            text = convert_epub(src_path)
        elif ext == ".pdf":
            text = convert_pdf(src_path)

        if text and len(text.strip()) > 500:
            tier = assign_tier(std_name)
            tier_counts[tier] += 1
            with open(txt_path, 'w', encoding='utf-8') as out:
                out.write(text)
            size_kb = len(text) / 1024
            converted.append((txt_name, tier, size_kb))
            print(f"  OK [{tier}] {txt_name} ({size_kb:.0f} KB)")
        else:
            failed.append(f)
            print(f"  FAIL: {f}")

    # Step 3: Update CORPUS_FEATURES_MASTER.json
    print(f"\n--- Updating CORPUS_FEATURES_MASTER.json ---")
    with open(MASTER_JSON, encoding='utf-8') as fj:
        master = json.load(fj)
    existing = {m['filename'] for m in master}

    added = 0
    for txt_name, tier, size_kb in converted:
        if txt_name in existing:
            continue
        fpath = CORPUS_DIR / txt_name
        try:
            with open(fpath, encoding='utf-8', errors='replace') as ftxt:
                wc = len(ftxt.read().split())
        except:
            wc = 0
        master.append({
            "filename": txt_name, "tier": tier, "language": "en",
            "word_count": wc, "passages_count": 0, "features": {}
        })
        added += 1

    with open(MASTER_JSON, 'w', encoding='utf-8') as fj:
        json.dump(master, fj, indent=2, ensure_ascii=False)

    print(f"Added {added} new entries (total: {len(master)})")

    # Summary
    print(f"\n{'=' * 70}")
    print(f"SUMMARY")
    print(f"{'=' * 70}")
    print(f"Source:     {len(all_files)}")
    print(f"Excluded:   {len(excluded)}")
    print(f"Converted:  {len(converted)}")
    print(f"Failed:     {len(failed)}")
    print(f"\nBy Tier: {tier_counts}")
    if failed:
        print(f"\nFailed: {failed}")

    # List all txt in corpus
    all_txt = sorted([f for f in os.listdir(CORPUS_DIR) if f.endswith('.txt')])
    print(f"\nTotal .txt in corpus: {len(all_txt)}")
    print(f"Total entries in MASTER: {len(master)}")


if __name__ == "__main__":
    main()
