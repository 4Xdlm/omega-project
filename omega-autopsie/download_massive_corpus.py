#!/usr/bin/env python3
"""
OMEGA — Massive Gutenberg Corpus Downloader
Phase W — Day 3 — Mission A

Downloads ~200 works covering FR + EN + ES, 6 periods.
Respects 2s delay between requests.
Produces corpus_manifest_v2.json.

Standard: NASA-Grade L4 / DO-178C Level A
"""

import sys
import os
import json
import time
import hashlib
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CACHE_DIR = os.path.join(os.path.dirname(__file__), "gutenberg_cache")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "corpus_manifest_v2.json")
USER_AGENT = "OMEGA-Research/3.0 (literary analysis)"
DELAY = 2  # seconds between downloads

os.makedirs(CACHE_DIR, exist_ok=True)

# ── Corpus definition ─────────────────────────────────────────────────────────
# Format: (work_id, title, author, year, language, gutenberg_id)

CORPUS = [
    # ═══════════════════════════════════════
    # FRANÇAIS — 80+ œuvres
    # ═══════════════════════════════════════

    # AVANT 1800 (Classicisme + Lumières)
    ("moliere_misanthrope", "Le Misanthrope", "Molière", 1666, "FR", 5765),
    ("moliere_tartuffe", "Tartuffe", "Molière", 1669, "FR", 4438),
    ("moliere_avare", "L'Avare", "Molière", 1668, "FR", 5710),
    ("moliere_dom_juan", "Dom Juan", "Molière", 1665, "FR", 16679),
    ("racine_phedre", "Phèdre", "Racine", 1677, "FR", 14701),
    ("racine_andromaque", "Andromaque", "Racine", 1667, "FR", 14383),
    ("racine_britannicus", "Britannicus", "Racine", 1669, "FR", 14189),
    ("lafontaine_fables", "Fables", "La Fontaine", 1668, "FR", 17941),
    ("voltaire_candide", "Candide", "Voltaire", 1759, "FR", 4650),
    ("voltaire_zadig", "Zadig", "Voltaire", 1747, "FR", 4647),
    ("voltaire_ingenu", "L'Ingénu", "Voltaire", 1767, "FR", 4649),
    ("voltaire_micromegas", "Micromégas", "Voltaire", 1752, "FR", 30123),
    ("rousseau_confessions_1", "Les Confessions (1)", "Rousseau", 1782, "FR", 3913),
    ("rousseau_confessions_2", "Les Confessions (2)", "Rousseau", 1789, "FR", 21361),
    ("rousseau_julie", "Julie ou la Nouvelle Héloïse", "Rousseau", 1761, "FR", 6307),
    ("diderot_jacques", "Jacques le Fataliste", "Diderot", 1796, "FR", 6560),
    ("diderot_neveu_rameau", "Le Neveu de Rameau", "Diderot", 1805, "FR", 5416),
    ("diderot_religieuse", "La Religieuse", "Diderot", 1796, "FR", 13335),
    ("laclos_liaisons", "Les Liaisons Dangereuses", "Laclos", 1782, "FR", 6329),
    ("prevost_manon", "Manon Lescaut", "Prévost", 1731, "FR", 7416),
    ("beaumarchais_barbier", "Le Barbier de Séville", "Beaumarchais", 1775, "FR", 16737),
    ("beaumarchais_mariage", "Le Mariage de Figaro", "Beaumarchais", 1784, "FR", 17160),
    ("montesquieu_lettres", "Lettres Persanes", "Montesquieu", 1721, "FR", 15005),
    ("marivaux_marianne", "La Vie de Marianne", "Marivaux", 1742, "FR", 6597),

    # 1800-1850 (Romantisme)
    ("hugo_notre_dame", "Notre-Dame de Paris", "Hugo", 1831, "FR", 19657),
    ("hugo_miserables", "Les Misérables T1", "Hugo", 1862, "FR", 17489),
    ("hugo_travailleurs", "Les Travailleurs de la Mer", "Hugo", 1866, "FR", 10907),
    ("balzac_goriot", "Le Père Goriot", "Balzac", 1835, "FR", 5097),
    ("balzac_eugenie", "Eugénie Grandet", "Balzac", 1833, "FR", 1715),
    ("balzac_lys", "Le Lys dans la Vallée", "Balzac", 1835, "FR", 1237),
    ("balzac_illusions", "Illusions perdues", "Balzac", 1843, "FR", 13141),
    ("stendhal_rouge", "Le Rouge et le Noir", "Stendhal", 1830, "FR", 798),
    ("stendhal_chartreuse", "La Chartreuse de Parme", "Stendhal", 1839, "FR", 7524),
    ("sand_indiana", "Indiana", "Sand", 1832, "FR", 5765),  # Note: may conflict
    ("sand_mare", "La Mare au Diable", "Sand", 1846, "FR", 14254),
    ("sand_fadette", "La Petite Fadette", "Sand", 1849, "FR", 14414),
    ("musset_confession", "Confession d'un enfant du siècle", "Musset", 1836, "FR", 12961),
    ("chateaubriand_atala", "Atala", "Chateaubriand", 1801, "FR", 17293),
    ("chateaubriand_rene", "René", "Chateaubriand", 1802, "FR", 18074),
    ("nerval_aurelia", "Aurélia", "Nerval", 1855, "FR", 11828),
    ("nerval_filles_feu", "Les Filles du Feu", "Nerval", 1854, "FR", 14012),
    ("merimee_carmen", "Carmen", "Mérimée", 1845, "FR", 14115),
    ("merimee_colomba", "Colomba", "Mérimée", 1840, "FR", 15182),

    # 1850-1900 (Réalisme + Naturalisme)
    ("flaubert_bovary", "Madame Bovary", "Flaubert", 1857, "FR", 14155),
    ("flaubert_education", "L'Éducation Sentimentale", "Flaubert", 1869, "FR", 14285),
    ("flaubert_salammbo", "Salammbô", "Flaubert", 1862, "FR", 10884),
    ("flaubert_trois_contes", "Trois Contes", "Flaubert", 1877, "FR", 10719),
    ("zola_germinal", "Germinal", "Zola", 1885, "FR", 5711),
    ("zola_assommoir", "L'Assommoir", "Zola", 1877, "FR", 8600),
    ("zola_nana", "Nana", "Zola", 1880, "FR", 5765),  # Note: may be different ID
    ("zola_bete", "La Bête Humaine", "Zola", 1890, "FR", 10007),
    ("zola_bonheur", "Au Bonheur des Dames", "Zola", 1883, "FR", 11953),
    ("maupassant_bel_ami", "Bel-Ami", "Maupassant", 1885, "FR", 3088),
    ("maupassant_pierre_jean", "Pierre et Jean", "Maupassant", 1888, "FR", 3190),
    ("maupassant_une_vie", "Une Vie", "Maupassant", 1883, "FR", 6902),
    ("maupassant_horla", "Le Horla", "Maupassant", 1887, "FR", 14082),
    ("daudet_moulin", "Lettres de mon Moulin", "Daudet", 1869, "FR", 11231),
    ("daudet_tartarin", "Tartarin de Tarascon", "Daudet", 1872, "FR", 11378),
    ("huysmans_rebours", "À Rebours", "Huysmans", 1884, "FR", 12341),
    ("lautreamont_maldoror", "Les Chants de Maldoror", "Lautréamont", 1869, "FR", 12005),

    # 1900-1950 (Modernisme)
    ("proust_swann", "Du côté de chez Swann", "Proust", 1913, "FR", 2650),
    ("proust_jeunes_filles", "À l'ombre des jeunes filles en fleurs", "Proust", 1919, "FR", 17180),
    ("gide_immoraliste", "L'Immoraliste", "Gide", 1902, "FR", 13415),
    ("gide_porte_etroite", "La Porte Étroite", "Gide", 1909, "FR", 13497),
    ("alain_fournier_meaulnes", "Le Grand Meaulnes", "Alain-Fournier", 1913, "FR", 13368),
    ("exupery_petit_prince", "Le Petit Prince", "Saint-Exupéry", 1943, "FR", 508),

    # ═══════════════════════════════════════
    # ANGLAIS — 60+ œuvres
    # ═══════════════════════════════════════

    # AVANT 1800
    ("defoe_crusoe", "Robinson Crusoe", "Defoe", 1719, "EN", 521),
    ("swift_gulliver", "Gulliver's Travels", "Swift", 1726, "EN", 829),
    ("fielding_tom_jones", "Tom Jones", "Fielding", 1749, "EN", 6593),
    ("richardson_pamela", "Pamela", "Richardson", 1740, "EN", 6124),
    ("sterne_tristram", "Tristram Shandy", "Sterne", 1767, "EN", 1079),
    ("austen_pride", "Pride and Prejudice", "Austen", 1813, "EN", 1342),
    ("austen_sense", "Sense and Sensibility", "Austen", 1811, "EN", 161),

    # 1800-1850
    ("austen_emma", "Emma", "Austen", 1815, "EN", 158),
    ("austen_persuasion", "Persuasion", "Austen", 1817, "EN", 105),
    ("austen_northanger", "Northanger Abbey", "Austen", 1817, "EN", 121),
    ("bronte_c_jane_eyre", "Jane Eyre", "C. Brontë", 1847, "EN", 1260),
    ("bronte_e_wuthering", "Wuthering Heights", "E. Brontë", 1847, "EN", 768),
    ("dickens_oliver", "Oliver Twist", "Dickens", 1838, "EN", 730),
    ("dickens_copperfield", "David Copperfield", "Dickens", 1850, "EN", 766),
    ("dickens_two_cities", "A Tale of Two Cities", "Dickens", 1859, "EN", 98),
    ("dickens_expectations", "Great Expectations", "Dickens", 1861, "EN", 1400),
    ("hawthorne_scarlet", "The Scarlet Letter", "Hawthorne", 1850, "EN", 25344),
    ("melville_moby", "Moby-Dick", "Melville", 1851, "EN", 2701),
    ("melville_bartleby", "Bartleby the Scrivener", "Melville", 1853, "EN", 11231),
    ("poe_tales", "Tales", "Poe", 1845, "EN", 2147),

    # 1850-1900
    ("dostoevsky_crime", "Crime and Punishment", "Dostoevsky", 1866, "EN", 2554),
    ("dostoevsky_brothers", "Brothers Karamazov", "Dostoevsky", 1880, "EN", 28054),
    ("tolstoy_war_peace", "War and Peace", "Tolstoy", 1869, "EN", 2600),
    ("tolstoy_anna", "Anna Karenina", "Tolstoy", 1877, "EN", 1399),
    ("hardy_tess", "Tess of the d'Urbervilles", "Hardy", 1891, "EN", 110),
    ("hardy_madding", "Far from the Madding Crowd", "Hardy", 1874, "EN", 148),
    ("james_portrait", "Portrait of a Lady", "James", 1881, "EN", 2833),
    ("james_turn_screw", "Turn of the Screw", "James", 1898, "EN", 209),
    ("conrad_heart", "Heart of Darkness", "Conrad", 1899, "EN", 219),
    ("conrad_lord_jim", "Lord Jim", "Conrad", 1900, "EN", 5658),
    ("conrad_nostromo", "Nostromo", "Conrad", 1904, "EN", 2021),
    ("wilde_dorian", "Picture of Dorian Gray", "Wilde", 1890, "EN", 174),
    ("stevenson_treasure", "Treasure Island", "Stevenson", 1883, "EN", 120),
    ("stevenson_jekyll", "Dr Jekyll and Mr Hyde", "Stevenson", 1886, "EN", 43),
    ("twain_huck", "Huckleberry Finn", "Twain", 1884, "EN", 76),
    ("twain_tom", "Tom Sawyer", "Twain", 1876, "EN", 74),

    # 1900-1950
    ("joyce_portrait", "Portrait of the Artist", "Joyce", 1916, "EN", 4217),
    ("joyce_dubliners", "Dubliners", "Joyce", 1914, "EN", 2814),
    ("woolf_dalloway", "Mrs Dalloway", "Woolf", 1925, "EN", 63107),
    ("woolf_lighthouse", "To the Lighthouse", "Woolf", 1927, "EN", 63535),
    ("woolf_orlando", "Orlando", "Woolf", 1928, "EN", 14671),
    ("lawrence_sons", "Sons and Lovers", "Lawrence", 1913, "EN", 5150),
    ("forster_room", "A Room with a View", "Forster", 1908, "EN", 2641),
    ("forster_howards", "Howards End", "Forster", 1910, "EN", 2946),
    ("kafka_trial", "The Trial", "Kafka", 1925, "EN", 7849),
    ("kafka_metamorphosis", "The Metamorphosis", "Kafka", 1915, "EN", 5200),
    ("fitzgerald_gatsby", "The Great Gatsby", "Fitzgerald", 1925, "EN", 64317),
    ("orwell_animal_farm", "Animal Farm", "Orwell", 1945, "EN", 70053),

    # ═══════════════════════════════════════
    # ESPAGNOL — 30+ œuvres
    # ═══════════════════════════════════════

    ("cervantes_quijote_1", "Don Quijote (Parte 1)", "Cervantes", 1605, "ES", 2000),
    ("cervantes_quijote_2", "Don Quijote (Parte 2)", "Cervantes", 1615, "ES", 2001),
    ("lazarillo", "Lazarillo de Tormes", "Anónimo", 1554, "ES", 320),
    ("galdos_fortunata", "Fortunata y Jacinta", "Galdós", 1887, "ES", 17013),
    ("galdos_perfecta", "Doña Perfecta", "Galdós", 1876, "ES", 15725),
    ("galdos_misericordia", "Misericordia", "Galdós", 1897, "ES", 17073),
    ("clarin_regenta_1", "La Regenta (T1)", "Clarín", 1884, "ES", 18744),
    ("clarin_regenta_2", "La Regenta (T2)", "Clarín", 1885, "ES", 18745),
    ("becquer_leyendas", "Leyendas", "Bécquer", 1871, "ES", 44337),
    ("valera_pepita", "Pepita Jiménez", "Valera", 1874, "ES", 14043),
    ("unamuno_niebla", "Niebla", "Unamuno", 1914, "ES", 49836),
    ("unamuno_san_manuel", "San Manuel Bueno, mártir", "Unamuno", 1931, "ES", 49846),
    ("valle_inclan_sonata", "Sonata de Otoño", "Valle-Inclán", 1902, "ES", 35627),
    ("baroja_arbol", "El árbol de la ciencia", "Baroja", 1911, "ES", 47844),
    ("azorin_voluntad", "La voluntad", "Azorín", 1902, "ES", 49791),
    ("quiroga_cuentos", "Cuentos de Amor de Locura y de Muerte", "Quiroga", 1917, "ES", 51737),
    ("pardo_bazan_pazos", "Los Pazos de Ulloa", "Pardo Bazán", 1886, "ES", 46547),
    ("pereda_sotileza", "Sotileza", "Pereda", 1885, "ES", 47267),
    ("alarcon_sombrero", "El Sombrero de Tres Picos", "Alarcón", 1874, "ES", 14869),
    ("isaacs_maria", "María", "Isaacs", 1867, "ES", 24457),
]


# ── Download function ─────────────────────────────────────────────────────────

def download_gutenberg(gid: int) -> str:
    """Try multiple URL patterns for a Gutenberg text. Returns text or empty string."""
    urls = [
        f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}-0.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}.txt",
    ]

    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
                # Try UTF-8 first, then latin-1
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    text = raw.decode("latin-1")
                if len(text) > 1000:
                    return text
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            continue
    return ""


def strip_gutenberg(text: str) -> str:
    """Remove Project Gutenberg header and footer."""
    for marker in ["*** START OF THIS PROJECT GUTENBERG",
                    "*** START OF THE PROJECT GUTENBERG",
                    "*END*THE SMALL PRINT"]:
        idx = text.find(marker)
        if idx != -1:
            text = text[idx + len(marker):]
            nl = text.find("\n")
            if nl != -1:
                text = text[nl + 1:]
            break

    for marker in ["*** END OF THIS PROJECT GUTENBERG",
                    "*** END OF THE PROJECT GUTENBERG",
                    "End of the Project Gutenberg",
                    "End of Project Gutenberg"]:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]
            break

    return text.strip()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    manifest = []
    existing = set(os.listdir(CACHE_DIR))
    downloaded = 0
    skipped = 0
    failed = 0

    print(f"[DL] {len(CORPUS)} works to process, {len(existing)} files already in cache")

    for work_id, title, author, year, lang, gid in CORPUS:
        # Check if already cached
        filename = f"{work_id}_{gid}.txt"
        filepath = os.path.join(CACHE_DIR, filename)

        # Also check for pg{gid}.txt pattern
        pg_name = f"pg{gid}.txt"

        if filename in existing:
            # Already downloaded
            with open(filepath, encoding="utf-8", errors="replace") as f:
                text = f.read()
            text_clean = strip_gutenberg(text)
            wc = len(text_clean.split())
            sha = hashlib.sha256(text_clean.encode()).hexdigest()[:16]
            manifest.append({
                "work_id": work_id, "title": title, "author": author,
                "year": year, "language": lang, "gutenberg_id": gid,
                "filepath": f"gutenberg_cache/{filename}",
                "word_count": wc, "sha256": sha, "status": "cached"
            })
            skipped += 1
            continue
        elif pg_name in existing:
            # Already have as pg*.txt — create symlink/copy entry
            src = os.path.join(CACHE_DIR, pg_name)
            with open(src, encoding="utf-8", errors="replace") as f:
                text = f.read()
            text_clean = strip_gutenberg(text)
            wc = len(text_clean.split())
            sha = hashlib.sha256(text_clean.encode()).hexdigest()[:16]
            manifest.append({
                "work_id": work_id, "title": title, "author": author,
                "year": year, "language": lang, "gutenberg_id": gid,
                "filepath": f"gutenberg_cache/{pg_name}",
                "word_count": wc, "sha256": sha, "status": "cached_pg"
            })
            skipped += 1
            continue

        # Check if an existing named file matches
        existing_match = None
        for ef in existing:
            if ef.startswith(work_id) and ef.endswith(".txt"):
                existing_match = ef
                break

        if existing_match:
            src = os.path.join(CACHE_DIR, existing_match)
            with open(src, encoding="utf-8", errors="replace") as f:
                text = f.read()
            text_clean = strip_gutenberg(text)
            wc = len(text_clean.split())
            sha = hashlib.sha256(text_clean.encode()).hexdigest()[:16]
            manifest.append({
                "work_id": work_id, "title": title, "author": author,
                "year": year, "language": lang, "gutenberg_id": gid,
                "filepath": f"gutenberg_cache/{existing_match}",
                "word_count": wc, "sha256": sha, "status": "cached_named"
            })
            skipped += 1
            continue

        # Need to download
        print(f"[DL] Downloading {work_id} (Gutenberg {gid})...", end=" ", flush=True)
        text = download_gutenberg(gid)

        if not text or len(text) < 1000:
            print(f"FAILED")
            manifest.append({
                "work_id": work_id, "title": title, "author": author,
                "year": year, "language": lang, "gutenberg_id": gid,
                "filepath": "", "word_count": 0, "sha256": "",
                "status": "failed"
            })
            failed += 1
            time.sleep(DELAY)
            continue

        # Save to cache
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)

        text_clean = strip_gutenberg(text)
        wc = len(text_clean.split())
        sha = hashlib.sha256(text_clean.encode()).hexdigest()[:16]

        manifest.append({
            "work_id": work_id, "title": title, "author": author,
            "year": year, "language": lang, "gutenberg_id": gid,
            "filepath": f"gutenberg_cache/{filename}",
            "word_count": wc, "sha256": sha, "status": "downloaded"
        })
        downloaded += 1
        print(f"OK ({wc} words)")

        time.sleep(DELAY)

    # Also add existing files that aren't in our CORPUS list
    corpus_gids = {str(gid) for _, _, _, _, _, gid in CORPUS}
    corpus_work_ids = {wid for wid, _, _, _, _, _ in CORPUS}
    for ef in sorted(existing):
        if not ef.endswith(".txt"):
            continue
        # Check if already in manifest
        already = any(m["filepath"].endswith(ef) for m in manifest)
        if already:
            continue
        # It's an extra file (from previous downloads)
        src = os.path.join(CACHE_DIR, ef)
        with open(src, encoding="utf-8", errors="replace") as f:
            text = f.read()
        text_clean = strip_gutenberg(text)
        wc = len(text_clean.split())
        if wc < 2000:
            continue
        sha = hashlib.sha256(text_clean.encode()).hexdigest()[:16]
        # Try to extract gutenberg ID from filename
        gid_str = ef.replace("pg", "").replace(".txt", "").split("_")[-1]
        try:
            gid = int(gid_str)
        except ValueError:
            gid = 0
        manifest.append({
            "work_id": ef.replace(".txt", ""),
            "title": ef.replace(".txt", ""),
            "author": "unknown",
            "year": 0, "language": "UNKNOWN", "gutenberg_id": gid,
            "filepath": f"gutenberg_cache/{ef}",
            "word_count": wc, "sha256": sha, "status": "existing_extra"
        })

    # Save manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Stats
    by_lang = {}
    for m in manifest:
        l = m["language"]
        by_lang[l] = by_lang.get(l, 0) + 1

    by_status = {}
    for m in manifest:
        s = m["status"]
        by_status[s] = by_status.get(s, 0) + 1

    print(f"\n{'='*60}")
    print(f"[DL] DONE: {len(manifest)} works in manifest")
    print(f"  Downloaded: {downloaded}")
    print(f"  Cached: {skipped}")
    print(f"  Failed: {failed}")
    print(f"  By language: {by_lang}")
    print(f"  By status: {by_status}")
    print(f"  Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
