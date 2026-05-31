# OMEGA — MINAXIS_E LITERARY SOURCES (corpus traceability)

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY (corpus-proof, 0 patch, 0 floor change)
> **Date**: 2026-05-31 · **HEAD**: `579e8cde` · **Author**: Claude Code
> **Companion of**: [`MINAXIS_E_LITERARY_RECOMPUTE.md`](MINAXIS_E_LITERARY_RECOMPUTE.md) + `.csv` + `minaxis_E_summary.json`
> **Purpose**: source provenance + public-domain (PD) justification for the RCI floor-reachability probe. Trace requirement → corpus → measurement (Golden Rule #3 TRACE IT).

---

## 0. Provenance

| Field | Value |
|---|---|
| Corpus root | `omega-autopsie/gutenberg_cache/` (224 `.txt`, Project Gutenberg, **local — 0 network at run time**) |
| Excluded | `omega-autopsie/livre_cache/` (modern / under-copyright — **NOT used**, e.g. Robbe-Grillet, Nevill) |
| Selection used | **19 works · 11 authors · 57 passages** (~1400 words each) |
| Cleaning | Gutenberg START/END header+footer stripped (`cleanGutenberg`), middle 80 % of paragraphs sampled (`extractPassages`) |
| Validation | author identity verified by content sampling, not filename alone (filenames double as PG id; see table) |
| Reproduce | `npx tsx scripts/metrology/minaxis-literary-recompute.ts` |

⚠️ **Content-not-name caveat (directive)**: the cache is known to contain mislabeled files. The 19 works below were retained because their stripped body matched the attributed author/title on sampling. Authors *present in the cache but NOT selected* are out of scope for this probe (not a quality judgement).

## 1. Selected works (the 57-passage corpus)

PG id = trailing number of the filename (Project Gutenberg ebook number). All authors below died **> 70 years** before 2026 → public domain in France (FR PD rule: 70 y post mortem) **and** in the US (pre-1929 publication). 0 copyright risk.

| Author | † (death) | PD-FR | Work | File (PG id) | Lang |
|---|---|:--:|---|---|:--:|
| Flaubert | 1880 | ✔ | Madame Bovary | `flaubert_bovary_14155.txt` | fr |
| Flaubert | 1880 | ✔ | L'Éducation sentimentale | `flaubert_education_14285.txt` | fr |
| Flaubert | 1880 | ✔ | Salammbô | `flaubert_salammbo_10884.txt` | fr |
| Hugo | 1885 | ✔ | Les Misérables | `hugo_miserables_17489.txt` | fr |
| Hugo | 1885 | ✔ | Les Travailleurs de la mer | `hugo_travailleurs_10907.txt` | fr |
| Maupassant | 1893 | ✔ | Une vie | `maupassant_une_vie_6902.txt` | fr |
| Maupassant | 1893 | ✔ | Bel-Ami | `maupassant_bel_ami_3088.txt` | fr |
| Proust | 1922 | ✔ | Du côté de chez Swann | `proust_swann_2650.txt` | fr |
| Proust | 1922 | ✔ | À l'ombre des jeunes filles en fleurs | `proust_jeunes_filles_17180.txt` | fr |
| Zola | 1902 | ✔ | Au Bonheur des Dames | `zola_bonheur_11953.txt` | fr |
| Zola | 1902 | ✔ | La Bête humaine | `zola_bete_10007.txt` | fr |
| Stendhal | 1842 | ✔ | La Chartreuse de Parme | `stendhal_chartreuse_7524.txt` | fr |
| Balzac | 1850 | ✔ | Le Lys dans la vallée | `balzac_lys_1237.txt` | fr |
| Balzac | 1850 | ✔ | Eugénie Grandet | `balzac_eugenie_1715.txt` | fr |
| Dickens | 1870 | ✔ | A Tale of Two Cities | `dickens_two_cities_98.txt` | en |
| Dickens | 1870 | ✔ | David Copperfield | `dickens_copperfield_766.txt` | en |
| Brontë (E.) | 1848 | ✔ | Wuthering Heights | `bronte_e_wuthering_768.txt` | en |
| Austen | 1817 | ✔ | Pride and Prejudice | `austen_pride_1342.txt` | en |
| Melville | 1891 | ✔ | Moby-Dick | `melville_moby_2701.txt` | en |

**Distribution**: FR = 14 works / 7 authors (Flaubert, Hugo, Maupassant, Proust, Zola, Stendhal, Balzac) · EN = 5 works / 4 authors (Dickens, Brontë, Austen, Melville). 3 passages/work × 19, minus passages outside the 500–2600-word band → **57 retained**.

## 2. Known corpus limits (carried into the verdict)

1. **No anglophone BRUTAL archetype** (McCarthy, Hemingway) — still under copyright, absent from the PD cache. This is precisely the prose `euphony_basic` penalises (hard plosives/fricatives), so the floor-reachability gap is likely **under-estimated** here (corpus skews "fluid literary").
2. **Passages, not whole works** — local rhythm/euphony only; 57 extracts ~1400 words.
3. **Author identity** verified by sampling, not a critical edition — sufficient for a metrology probe, not for scholarship.
4. The wider PD cache (224 files: Cervantes, Clarín, Baroja, Becquer, Chateaubriand, Daudet, Defoe, Alain-Fournier, Beaumarchais, Baudelaire, etc. — incl. ES) was **not** added; the 11-author FR+EN set was deemed sufficient to settle reachability (0/57 already conclusive).

## 3. Trace

`requirement` (is RCI floor 85 reachable by real literature?) → `corpus` (this file) → `tool` (`scripts/metrology/minaxis-literary-recompute.ts`) → `measurement` (`MINAXIS_E_LITERARY_RECOMPUTE.csv`, 57 rows) → `summary` (`minaxis_E_summary.json`) → `verdict` (`MINAXIS_E_LITERARY_RECOMPUTE.md` §0: **NON**, 0/57 ≥ 85).

*No engine code touched. No floor changed. Decision = Architect.*
