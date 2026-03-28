#!/usr/bin/env python3
"""
OMEGA — Update CORPUS_FEATURES_MASTER.json with 263 new EN files.
Assigns tier + language based on filename patterns.
"""
import json, os, re, fnmatch

BASE = "C:/Users/elric/omega-project"
TXT_DIR = f"{BASE}/omega-autopsie/corpus_r/txt"
MASTER = f"{BASE}/omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json"

# Tiering rules: list of (glob_pattern, tier)
TIER_RULES = [
    # TIER S
    ("ernest_hemingway_*", "S"), ("raymond_carver_*", "S"), ("cormac_mccarthy_*", "S"),
    ("chuck_palahniuk_fight_club*", "S"), ("kurt_vonnegut_*", "S"), ("jd_salinger_*", "S"),
    ("george_orwell_1984*", "S"), ("george_orwell_down_and_out*", "S"),
    ("jack_london_*", "S"), ("dashiell_hammett_*", "S"), ("raymond_chandler_*", "S"),
    ("flannery_oconnor_*", "S"), ("tobias_wolff_*", "S"), ("denis_johnson_*", "S"),
    ("amy_hempel_*", "S"), ("richard_ford_*", "S"), ("william_faulkner_*", "S"),
    ("henry_james_*", "S"), ("virginia_woolf_*", "S"), ("thomas_pynchon_*", "S"),
    ("toni_morrison_*", "S"), ("james_baldwin_*", "S"), ("saul_bellow_*", "S"),
    ("philip_roth_*", "S"), ("don_delillo_*", "S"), ("john_updike_rabbit*", "S"),
    ("david_foster_wallace_*", "S"), ("thomas_wolfe_*", "S"), ("ralph_ellison_*", "S"),
    ("william_styron_sophies*", "S"),  # Sophie's Choice = S
    ("f_scott_fitzgerald_*", "S"), ("john_steinbeck_*", "S"),
    ("harper_lee_*", "S"), ("mark_twain_*", "S"), ("edith_wharton_*", "S"),
    ("willa_cather_*", "S"), ("carson_mccullers_*", "S"), ("shirley_jackson_*", "S"),
    ("marilynne_robinson_*", "S"), ("donna_tartt_*", "S"), ("ian_mcewan_*", "S"),
    ("kazuo_ishiguro_*", "S"), ("hilary_mantel_*", "S"),
    ("john_updike_the_coup*", "S"),  # The Coup acceptable as S

    # TIER A
    ("graham_greene_*", "A"), ("em_forster_*", "A"), ("anthony_trollope_*", "A"),
    ("george_eliot_*", "A"), ("charlotte_bronte_*", "A"), ("emily_bronte_*", "A"),
    ("thomas_hardy_*", "A"), ("joseph_conrad_*", "A"), ("dh_lawrence_*", "A"),
    ("nathaniel_hawthorne_*", "A"), ("herman_melville_*", "A"),
    ("louisa_may_alcott_*", "A"), ("oscar_wilde_*", "A"), ("robert_louis_stevenson_*", "A"),
    ("zadie_smith_*", "A"), ("jonathan_franzen_*", "A"), ("michael_chabon_*", "A"),
    ("jeffrey_eugenides_*", "A"), ("chimamanda_adichie_*", "A"),
    ("jack_kerouac_*", "A"), ("george_orwell_animal*", "A"),

    # TIER B
    ("hg_wells_*", "B"), ("bram_stoker_*", "B"), ("mary_shelley_*", "B"),
    ("rudyard_kipling_*", "B"), ("william_burroughs_*", "B"),
    ("sinclair_lewis_*", "B"), ("theodore_dreiser_*", "B"), ("upton_sinclair_*", "B"),
    ("daphne_du_maurier_*", "B"), ("pg_wodehouse_*", "B"),
    ("john_le_carre_*", "B"), ("margaret_atwood_*", "B"), ("neil_gaiman_*", "B"),
    ("ursula_le_guin_*", "B"), ("agatha_christie_*", "B"), ("arthur_c_clarke_*", "B"),
    ("terry_pratchett_*", "B"), ("douglas_adams_*", "B"),
    ("stephen_king_*", "B"), ("ken_follett_*", "B"),
    ("chuck_palahniuk_choke*", "B"), ("chuck_palahniuk_not_forever*", "B"),
    ("chuck_palahniuk_the_invention*", "B"),
    ("isaac_asimov_*", "B"),

    # TIER C
    ("john_grisham_*", "C"), ("michael_crichton_*", "C"), ("robin_cook_*", "C"),
    ("sidney_sheldon_*", "C"), ("robert_ludlum_*", "C"), ("suzanne_collins_*", "C"),
    ("veronica_roth_*", "C"), ("rick_riordan_*", "C"), ("jk_rowling_*", "C"),
    ("colleen_hoover_*", "C"), ("karin_slaughter_*", "C"), ("lisa_gardner_*", "C"),
    ("patricia_cornwell_*", "C"), ("andy_weir_*", "C"), ("brandon_sanderson_*", "C"),
    ("orson_scott_card_*", "C"),
    # Stephen King minor works -> C
    ("stephen_king_carrie*", "C"), ("stephen_king_cujo*", "C"),
    ("stephen_king_before_the_play*", "C"),

    # TIER D
    ("stephenie_meyer_*", "D"), ("el_james_*", "D"), ("dan_brown_*", "D"),
    ("james_patterson_*", "D"), ("nicholas_sparks_*", "D"), ("danielle_steel_*", "D"),
    ("clive_cussler_*", "D"), ("tom_clancy_*", "D"), ("janet_evanovich_*", "D"),
    ("nora_roberts_*", "D"), ("dean_koontz_*", "D"), ("wilbur_smith_*", "D"),
    ("lee_child_*", "D"), ("rl_stine_*", "D"),
]


def assign_tier(filename):
    """Match filename against tier rules. First match wins (most specific first)."""
    base = filename.replace(".txt", "")
    for pattern, tier in TIER_RULES:
        if fnmatch.fnmatch(base, pattern):
            return tier
    return None


def main():
    # Load existing master
    with open(MASTER, encoding='utf-8') as f:
        master = json.load(f)

    existing = {m['filename'] for m in master}
    print(f"Existing entries in MASTER: {len(existing)}")

    # List all txt files
    all_txt = sorted([f for f in os.listdir(TXT_DIR) if f.endswith('.txt')])
    print(f"Total .txt files in corpus: {len(all_txt)}")

    # Find new files
    new_files = [f for f in all_txt if f not in existing]
    print(f"New files to add: {len(new_files)}")

    # Assign tiers
    added = 0
    warnings = []
    tier_counts = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}

    for fn in new_files:
        tier = assign_tier(fn)
        if tier is None:
            tier = "C"
            warnings.append(fn)

        # Get word count
        fpath = os.path.join(TXT_DIR, fn)
        try:
            with open(fpath, encoding='utf-8', errors='replace') as f:
                wc = len(f.read().split())
        except:
            wc = 0

        entry = {
            "filename": fn,
            "tier": tier,
            "language": "en",
            "word_count": wc,
            "passages_count": 0,
            "features": {}
        }
        master.append(entry)
        tier_counts[tier] += 1
        added += 1

    # Save
    with open(MASTER, 'w', encoding='utf-8') as f:
        json.dump(master, f, indent=2, ensure_ascii=False)

    print(f"\nAdded {added} new entries to CORPUS_FEATURES_MASTER.json")
    print(f"New total: {len(master)}")
    print(f"\nNew files by tier:")
    for t in ["S", "A", "B", "C", "D"]:
        print(f"  Tier {t}: {tier_counts[t]}")

    if warnings:
        print(f"\nWARNING: {len(warnings)} files matched no pattern (defaulted to C):")
        for w in warnings:
            print(f"  - {w}")

    # Verify total
    all_entries = {m['filename'] for m in master}
    missing = [f for f in all_txt if f not in all_entries]
    if missing:
        print(f"\nERROR: {len(missing)} .txt files still not in master:")
        for m in missing[:10]:
            print(f"  - {m}")
    else:
        print(f"\nOK: All {len(all_txt)} .txt files have entries in master")


if __name__ == "__main__":
    main()
