#!/usr/bin/env python3
"""
OMEGA PVI — Correction corpus: recalcul FL NLP pour titres à FL_proxy > 0.35
Puis recalcul E_cog et PVI pour tous les titres mis à jour.
"""

import csv
import math
import os
import sys
import statistics
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pvi_nlp_scorer import (
    load_text, extract_windows, extract_FL, find_book_file, get_nlp,
    CORPUS_DIR, CORPUS_DIR_EN
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..",
                          "docs", "physique-litteraire", "corpus-analyse")
OUTPUT_DIR = os.path.normpath(OUTPUT_DIR)

# Title -> file pattern mappings for findable books
TITLE_TO_PATTERN = {
    # FR-A
    "Les Misérables": "Les_Miserables_-_Victor_Hugo",
    "Notre-Dame de Paris": "Notre-Dame_de_Paris",
    "Le nom de la rose": "Le_nom_de_la_rose",
    "Les Particules élémentaires": "Les_Particules_elementaires",
    "La possibilité d'une île": "La_possibilite_dune_ile",
    "La Carte et le Territoire": "La_Carte_et_le_Territoire",
    "La Peste": "La_Peste_French",
    "La Chute": "La_Chute_-_Albert_Camus",
    "L'Étranger": "Letranger_French_Edition_-_Albert_Camus",
    "L'Exil et le Royaume": "LExil_et_le_Royaume",
    "La mort heureuse": "La_mort_heureuse",
    "Cinquante nuances (FR)": "Cinquante_nuances_de_grey",
    "Millénium 1 (FR)": "Les_hommes_qui_naimaient_pas_les_femmes",
    "L'Amie prodigieuse (FR)": "Lamie_prodigieuse",
    "Maison flamme/ombre (FR)": "Maison_de_la_flamme",
    "Stupeur et tremblements": "Stupeur_et_tremblements",
    "Pars vite et reviens tard": "Pars_vite_et_reviens_tard",
    "Limonov": "Limonov_French_Edition",
    "La Moustache": "La_Moustache",
    "Kolkhoze": "Kolkhoze",
    "Les Mandarins": "Les_Mandarins",
    # FR-B
    "Du côté de chez Swann": "Du_cote_de_chez_Swann",
    "Madame Bovary": "Madame_Bovary_-_Gustave_Flaubert",
    "Un cœur simple": "Coeur_simple",
    "L'Amant": "LAmant_-_Marguerite_Duras",
    "La Nausée": "La_Nausee_-_Jean-Paul_Sartre",
    "Voyage au bout de la nuit": "Voyage_au_bout_de_la_nuit",
    "Molloy": "Molloy_-_Samuel_Beckett",
    "L'Insoutenable Légèreté": "LInsoutenable_Legerete",
    "La Jalousie": "La_Jalousie_-_Alain_Robbe-Grillet",
    "Le Voyeur": "Le_Voyeur_-_Alain_Robbe-Grillet",
    "La Maison de Rendez-Vous": "La_Maison_de_Rendez",
    "Enfance": "Enfance_-_Nathalie_Sarraute",
    "Le Planétarium": "Le_planetarium",
    "Martereau": "Martereau",
    "La Route des Flandres": "La_Route_des_Flandres",
    "La Modification": "La_Modification",
    "Les Années": "Les_Annees",
    "La Place": "la_place_French",
    "L'Événement": "Levenement",
    "La femme gelée": "La_femme_gelee",
    "Mémoire de fille": "Memoire_de_fille",
    "Une femme": "Une_femme_French",
    "Ce qu'ils disent ou rien": "Ce_quils_disent",
    "Rue des Boutiques Obscures": "Rue_des_Boutiques_Obscures",
    "Dora Bruder": "Dora_Bruder",
    "La Ronde de nuit": "La_Ronde_de_nuit",
    "Encre sympathique": "Encre_sympathique",
    "La danseuse": "La_danseuse",
    "Quartier Perdu": "Quartier_Perdu",
    "Désert": "Desert_-_JMG",
    "La Quarantaine": "La_Quarantaine",
    "Ourania": "Ourania",
    "Mémoires d'Hadrien": "Memoirs_of_Hadrian",
    "L'Œuvre au noir": "LOEuvre_au_noir",
    "Alexis ou le Traité du vain combat": "Alexis_ou_le_Traite",
    "La Voie royale": "La_Voie_royale",
    "Trois Femmes puissantes": "Trois_Femmes_puissantes",
    "Texaco": "Texaco",
    "Courir": "Courir_French",
    "Absence": "Absence_-_Peter_Handke",
    "Le malheur indifférent": "Le_malheur_indifferent",
    "La Vie mode d'emploi": "La_Vie_mode_demploi",
    "En finir avec Eddy Bellegueule": "En_finir_avec_Eddy",
    "Le Rivage des Syrtes (Opposing Shore)": "The_Opposing_Shore",
    "Un balcon en forêt": "A_Balcony_in_the_Forest",
    "Tous les matins du monde": "Tous_les_matins_du_monde",
    "Terrasse à Rome": "Terrasse_a_Rome",
    "Le salon du Wurtemberg": "Le_salon_du_Wurtemberg",
    "Monts Mers et Géants": "Monts_Mers",
    # FR-C
    "Au Bonheur des Dames": "Au_Bonheur_Des_Dames",
    "L'Argent": "LArgent_-_Emile_Zola",
    "L'Œuvre": "Loeuvre_-_Emile_Zola",
    "Les Mystères de Marseille": "Les_Mysteres_de_Marseille",
    "Une page d'amour": "Une_page_damour",
    "Crime et Châtiment (FR)": "Crimes_et_chatiments",
    "La Chambre de Giovanni (FR)": "La_Chambre_de_Giovanni",
    "Kevin (FR)": "Il_faut_qu_on_parle_de_Kevin",
    "Les Vestiges du Jour (FR)": "Les_Vestiges_du_Jour",
    "Si par une nuit d'hiver un voyageur": "If_on_a_winters_night",
    # EN-A
    "Gone Girl": "Gone_Girl_-_Gillian_Flynn",
    "It Ends With Us": "It_Ends_with_Us",
    "50 Shades of Grey (EN)": "50_shades_of_grey",
    "The Secret History": "The_Secret_History_-_Donna_Tartt",
    "The Goldfinch": "The_Goldfinch",
    "The Martian": "The_Martian",
    "Fight Club": "Fight_Club",
    "Carrie": "Carrie_-_Stephen_King",
    "Harry Potter Philosopher's Stone": "Harry_Potter_and_The_Sorcerers",
    "Catching Fire": "Catching_Fire",
    "Divergent": "Divergent_-_Veronica_Roth",
    "And Then There Were None": "And_Then_There_Were_None",
    # EN-B
    "Blood Meridian": "Blood_Meridian",
    "The Road": "The_road_-_Cormac",
    "No Country for Old Men": "No_Country_for_Old_Men",
    "Suttree": "Suttree",
    "Mrs Dalloway": "Mrs_Dalloway_-_Virginia_Woolf",
    "To the Lighthouse": "To_the_lighthouse",
    "The Waves": "The_Waves",
    "White Noise": "White_Noise",
    "Underworld": "Underworld_-_Don",
    "As I Lay Dying": "As_I_Lay_Dying",
    "The Sound and the Fury": "The_Sound_and_the_Fury",
    "Gravity's Rainbow": "Gravitys_Rainbow",
    "Lolita": "Lolita__Vladimir",
    "Pale Fire": "Pale_Fire",
    "Beloved": "Toni-Morrison.-Beloved",
    "Song of Solomon": "Song_of_Solomon",
    "Infinite Jest": "Infinite_Jest",
    # EN-C
    "Atonement": "Atonement_-_Ian_McEwan",
    "1984": "1984_75th_anniversary",
    "The Great Gatsby": "The_Great_Gatsby",
    "East of Eden": "East_of_Eden",
    "The Grapes of Wrath": "The_Grapes_of_Wrath",
    "To Kill a Mockingbird": "To_kill_a_mocking_bird",
    "The Catcher in the Rye": "The_Catcher_in_the_Rye",
    "Americanah": "Americanah_-_Chimamanda",
    "The Old Man and the Sea": "The_old_man_and_the_sea",
    "Wuthering Heights": "Wuthering_Heights",
}


def recalc_ecog_pvi(row):
    """Recalculate E_cog and PVI from updated FL."""
    FL = float(row['FL'])
    MS = float(row['MS'])
    I = float(row['I'])
    T = float(row['T'])
    S = float(row['S'])
    Omega = float(row['Omega'])
    U = float(row['U'])
    DR = float(row['DR'])
    LP = float(row['LP'])
    N_rev = int(row['N_rev'])

    E_emo = 0.40*I + 0.28*T + 0.17*S + 0.15*I*T
    E_cog = 0.40*FL + 0.25*FL*(1-MS) + 0.20*DR + 0.15*LP
    CE = E_emo / E_cog if E_cog > 0.001 else 999.0

    if N_rev < 2: Arc_rev = 0.50
    elif N_rev == 2: Arc_rev = 1.00
    else: Arc_rev = 1.20

    R_exp = 1.2*T + 1.5*I + 1.0*Arc_rev - 2.5
    R = 1 / (1 + math.exp(-R_exp))
    W_exp = 1.8*I + 2.0*Omega + 0.8*U - 2.8
    W = 1 / (1 + math.exp(-W_exp))

    PVI = CE * Arc_rev * R * W
    SP = PVI * 20

    row['E_emo'] = round(E_emo, 4)
    row['E_cog'] = round(E_cog, 4)
    row['CE'] = round(CE, 4)
    row['Arc_rev'] = round(Arc_rev, 2)
    row['R'] = round(R, 4)
    row['W'] = round(W, 4)
    row['PVI'] = round(PVI, 4)
    row['SP'] = round(SP, 4)
    return row


def process_csv(csv_path, output_path, lang_default):
    """Process a corpus CSV, recalculating FL for titles with available files."""
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames + ['FL_source', 'FL_proxy_original']
        rows = list(reader)

    n_recalc = 0
    n_maintained = 0
    changes = []

    for row in rows:
        title = row['titre']
        fl_proxy = float(row['FL'])
        lang = row.get('langue', lang_default)
        if lang not in ('fr', 'en'):
            lang = lang_default

        pattern = TITLE_TO_PATTERN.get(title)
        if not pattern:
            row['FL_source'] = 'PROXY_no_pattern'
            row['FL_proxy_original'] = row['FL']
            n_maintained += 1
            continue

        filepath = find_book_file(pattern, lang)
        if not filepath:
            row['FL_source'] = 'PROXY_file_not_found'
            row['FL_proxy_original'] = row['FL']
            n_maintained += 1
            continue

        # Recalculate FL with NLP
        try:
            print(f"  FL NLP: {title[:40]:40s} ...", end=" ", flush=True)
            text = load_text(filepath)
            windows, _ = extract_windows(text)
            fl_result = extract_FL(windows, lang)
            fl_nlp = fl_result['score']

            row['FL_proxy_original'] = row['FL']
            row['FL'] = round(fl_nlp, 4)
            row['FL_source'] = 'NLP_v2'
            row = recalc_ecog_pvi(row)
            n_recalc += 1

            delta = fl_nlp - fl_proxy
            print(f"FL={fl_nlp:.4f} (was {fl_proxy:.2f}, d={delta:+.3f})")
            changes.append({
                'title': title, 'fl_proxy': fl_proxy, 'fl_nlp': fl_nlp,
                'delta': delta, 'lang': lang, 'groupe': row['groupe'],
            })
        except Exception as e:
            print(f"ERROR: {e}")
            row['FL_source'] = 'PROXY_error'
            row['FL_proxy_original'] = row['FL']
            n_maintained += 1

    # Write updated CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    return rows, changes, n_recalc, n_maintained


def main():
    print("=" * 80)
    print("OMEGA PVI — Correction corpus FL (NLP v2)")
    print("=" * 80)

    report = []
    report.append("# Rapport Corrections Corpus FL\n\n")
    report.append("**Date**: 2026-03-29\n")
    report.append("**Methode**: FL recalcule avec wordfreq top-5k + NER + len>=4\n\n")

    all_changes = []

    # Process FR
    print("\n--- FR CORPUS ---")
    fr_csv = os.path.join(OUTPUT_DIR, "pvi_corpus_FR.csv")
    fr_out = os.path.join(OUTPUT_DIR, "pvi_corpus_FR.csv")
    fr_rows, fr_changes, fr_recalc, fr_maint = process_csv(fr_csv, fr_out, 'fr')
    all_changes.extend(fr_changes)

    # Process EN
    print("\n--- EN CORPUS ---")
    en_csv = os.path.join(OUTPUT_DIR, "pvi_corpus_EN.csv")
    en_out = os.path.join(OUTPUT_DIR, "pvi_corpus_EN.csv")
    en_rows, en_changes, en_recalc, en_maint = process_csv(en_csv, en_out, 'en')
    all_changes.extend(en_changes)

    # Stats
    def grp_avg(rows, grp, field):
        vals = [float(r[field]) for r in rows if r['groupe'] == grp]
        return sum(vals)/len(vals) if vals else 0

    report.append("## Statistiques corrections\n\n")
    report.append(f"| Corpus | Recalcules NLP | Maintenus proxy |\n")
    report.append(f"|--------|---------------|----------------|\n")
    report.append(f"| FR | {fr_recalc} | {fr_maint} |\n")
    report.append(f"| EN | {en_recalc} | {en_maint} |\n\n")

    report.append("## Impact sur PVI moyens\n\n")
    report.append(f"| Groupe | PVI moyen (corrige) |\n")
    report.append(f"|--------|--------------------|\n")
    for grp in ['FR-A', 'FR-B', 'FR-C']:
        pvi = grp_avg(fr_rows, grp, 'PVI')
        report.append(f"| {grp} | {pvi:.4f} |\n")
    for grp in ['EN-A', 'EN-B', 'EN-C']:
        pvi = grp_avg(en_rows, grp, 'PVI')
        report.append(f"| {grp} | {pvi:.4f} |\n")

    fra_pvi = grp_avg(fr_rows, 'FR-A', 'PVI')
    frb_pvi = grp_avg(fr_rows, 'FR-B', 'PVI')
    ena_pvi = grp_avg(en_rows, 'EN-A', 'PVI')
    enb_pvi = grp_avg(en_rows, 'EN-B', 'PVI')

    ratio_fr = fra_pvi / frb_pvi if frb_pvi > 0 else 999
    ratio_en = ena_pvi / enb_pvi if enb_pvi > 0 else 999

    report.append(f"\n## Ratios A/B (corrige)\n")
    report.append(f"- FR: {ratio_fr:.2f}x (avant: 5.41x)\n")
    report.append(f"- EN: {ratio_en:.2f}x (avant: 4.59x)\n\n")

    # Zone OMEGA check
    report.append(f"## Zone OMEGA (corrige)\n\n")
    for label, rows in [("FR", fr_rows), ("EN", en_rows)]:
        omega = [r for r in rows
                 if float(r.get('Q_prose', 0) or 0) >= 87
                 and float(r['PVI']) >= 1.59]
        if omega:
            for r in omega:
                report.append(f"- **{label} ZONE OMEGA**: {r['titre']} "
                              f"Q={r['Q_prose']} PVI={r['PVI']}\n")
        else:
            report.append(f"- {label}: Zone OMEGA VIDE\n")

    # Changes detail
    report.append(f"\n## Detail corrections FL\n\n")
    report.append(f"| Titre | Groupe | FL_proxy | FL_NLP | Delta |\n")
    report.append(f"|-------|--------|---------|--------|-------|\n")
    for c in sorted(all_changes, key=lambda x: -abs(x['delta'])):
        report.append(f"| {c['title'][:35]} | {c['groupe']} | "
                      f"{c['fl_proxy']:.2f} | {c['fl_nlp']:.4f} | "
                      f"{c['delta']:+.4f} |\n")

    # Write report
    report_path = os.path.join(os.path.dirname(__file__),
                               "rapport_corrections_corpus.md")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.writelines(report)

    print(f"\n{'='*80}")
    print(f"FR: {fr_recalc} recalc, {fr_maint} maintained")
    print(f"EN: {en_recalc} recalc, {en_maint} maintained")
    print(f"Ratio FR A/B: {ratio_fr:.2f}x")
    print(f"Ratio EN A/B: {ratio_en:.2f}x")
    print(f"Report: {report_path}")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()
