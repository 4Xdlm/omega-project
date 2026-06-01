# WS-D — OMEGA METROLOGY PRIME : protocole d'étalonnage absolu (« vérité ×1000 »)

**Statut** : PROTOCOLE (doc-only). Aucune modif de seuil/scorer avant exécution complète + décision Architecte.
**Date** : 2026-06-01 · **Standard** : NASA-Grade L4 / DO-178C Level A.
**Mandat Architecte** : « un protocole parfait et ultra complet pour étalonner nos mesures et avoir la vérité ×1000 ; pas une échelle peu précise sur 50 œuvres, mais calibrée au millimètre, quitte à tout recalculer ; intégrer les best-sellers pour connaître leur emplacement exact (les réétalonnages ne sont pas forcément identiques) ».
**Acquis fondateur** : [DEC-015](DEC-20260601-015-MASTER-COMPOSITE-CALIBRATION-TRUTH.md) — ancien SEAL 93 invalidé (0/95 maîtres), paliers candidats shadow, IFI axe-tueur. **Gates transverses** : provenance DEC-014 obligatoire · règle INVALID_PACKET DEC-013 · genome SEALED · aucun seuil promu sans shadow bench.

## 0. Pourquoi l'ancien calibrage est invalide (rappel)
Ancien chemin : `intuition → formule → seuil rond → dogme` (3 maîtres @500w, S=4.5, composite≥93). Prouvé arbitraire (WS-C : 0/95). Nouveau chemin : `corpus → mesure → distribution → incertitude → seuil candidat → shadow → décision`.

## Phase 0 — GEL DE L'INSTRUMENT (avant toute mesure)
Figer et hasher : version code scorer (git HEAD), coefficients (`coefficients-v3-4` sha), prompts juges (ECC/AAI/SII/IFI), modèle Ollama + température + seed, méthode packets, méthode contrats, corpus, formule composite + poids.
Livrable : `METROLOGY_00_INSTRUMENT_FREEZE.md`. **PASS** : on sait exactement quel juge mesure quoi (tout rejouable).

## Phase 1 — CORPUS VÉRITÉ STRATIFIÉ (le cœur de « au millimètre »)
5 familles (pas 3 œuvres, pas 50 — **viser ≥ 300-400 mesures**) :
- **A. Maîtres FR** (Flaubert, Hugo, Proust, Zola, Maupassant, Stendhal, Balzac, + Dumas/Yourcenar/Dostoïevski-trad…)
- **B. Maîtres EN** (Dickens, Austen, Brontë, Melville, Woolf, Joyce, McCarthy…)
- **C. Littérature moyenne publiée** (mid-list contemporaine)
- **D. Mauvaise prose / commerciale faible** (référence basse, ex. AI-slop, pulp)
- **E. BEST-SELLERS** (Harry Potter, Da Vinci Code, Gone Girl, It Ends With Us, Hunger Games, Goldfinch…) — **placement exact recherché** : un best-seller n'est pas un maître ni un déchet ; sa position propre informe les paliers commerciaux vs littéraires.
- **F. Sorties OMEGA** : goldens, high-quality rejects, K2 récents, BOOK_FULL (si prose préservée), PROD_REVELATION, M0.b.
Par œuvre : **5-10 passages** (600-2500 mots), fenêtres ARC. Métadonnées obligatoires : source, auteur, œuvre, année, langue, genre, type de scène, mots, **sha256 prose**, statut juridique/source.
Livrables : `METROLOGY_01_TRUTH_CORPUS_INDEX.csv` + `_PROVENANCE.md`. **PASS** : aucun score sans source ni hash ; aucune œuvre « parce qu'on pense que ».
> ⚠️ Droits : best-sellers/lit récente = corpus sous droits → usage **mesure interne uniquement**, jamais redistribué ; ne stocker que features/scores + hash, pas la prose intégrale si la licence l'interdit. [À VÉRIFIER par l'Architecte par titre.]

## Phase 2 — CONTRATS & PACKETS PARFAITS (anti-confond)
Pour chaque passage, **3 modes de contrat** (les réétalonnages ne sont pas identiques → on les compare) :
- **Mode A** — contrat dérivé de l'arc de l'œuvre entière (WS-C).
- **Mode B** — contrat uniforme « littéraire neutre » (même yardstick pour tous).
- **Mode C** — contrat expert par catégorie/genre (HAND scène-type).
Packets RCI : `PROBE_ONLY` (vide) / `VALID` (représentatif WS-B2) / `UPPER_BOUND` (ceiling). **Règle dure** : aucun score `PROBE_ONLY`/`INVALID_PACKET` ne calibre un seuil.
Livrables : `METROLOGY_02_CONTRACTS_INDEX.jsonl` + `_PACKET_COMPLETENESS_REPORT.md` + `_INVALID_PACKET_REGISTER.csv`. **PASS** : chaque score a contrat + packet complets, mode tracé.

## Phase 3 — MESURE BRUTE COMPLÈTE
Tous les axes (ECC, RCI, SII, IFI, AAI, composite, min_axis) × 3 modes contrat. k=1 acceptable (juge déterministe, prouvé WS-B0c) MAIS **k=3 sur l'échantillon complet + k=5 sur l'échantillon critique** pour l'étalonnage final (mesurer la variance résiduelle + capturer les parse-fails). Logger : mean/std/delta inter-run, parse_failures, fallbacks, model, temp, prompt_hash, contract_hash, packet_hash + **provenance DEC-014**.
Livrables : `METROLOGY_03_RAW_MEASURES.jsonl` + `_AXIS_DISTRIBUTIONS.csv` + `_PARSE_FAILURES.md`. **PASS** : toutes les mesures rejouables ; parse-fails quantifiés (corriger le parsing JSON Ollama AAI vu en WS-C avant l'étalonnage final).

## Phase 4 — DÉCOUPLAGE QUALITÉ INTRINSÈQUE vs CONFORMITÉ (le Graal)
Scinder ce que l'ancienne échelle mélangeait (« beau » vs « obéissant ») :
- **IntrinsicQualityScore** : axes mesurant la qualité SANS contrat (RCI rythme/euphonie, parts non-contractuelles de SII, mesures stylistiques objectives).
- **ContractConformityScore** : axes mesurant l'obéissance au contrat (ECC, IFI, tension_14d).
Diagnostic IFI inclus (Passe C / Pilier 1) : extraire les justifications LLM des IFI<50 (Dickens/Stendhal) → **biais de modernité** (exige show-don't-tell cinétique que le XIXe n'utilise pas) vs **biais de packet** (ForgeSensory vide). Comparer Mode A vs Mode B : si IFI/ECC remontent sous contrat neutre/expert → confond contrat confirmé.
Livrable : `METROLOGY_04_INTRINSIC_VS_CONFORMITY_SPLIT.md` + `IFI_AUTOPSY_REPORT.md`. **PASS** : on ne mélange plus génie et obéissance (fondamental pour DEC-009/fusion).

## Phase 5 — CALIBRATION PAR PERCENTILES (par famille ET par catégorie)
Seuils = percentiles, jamais nombres ronds. **Par famille de corpus ET par catégorie** (réétalonnages non identiques) :
- S = p90 maîtres · A = p50 maîtres · B = p25 maîtres · C = p10 maîtres.
- Calculés séparément pour : composite, IntrinsicQualityScore, ContractConformityScore, chaque axe, min_axis.
- Placement exact des best-sellers (famille E) sur l'échelle → définit la zone « commercial » vs « littéraire ».
- Comparaison : anciens seuils vs candidats, **faux rejets maîtres** vs **faux accepts mauvaise prose (famille D)**.
- Statistiques : percentiles + intervalles de confiance (bootstrap) + MAE/RMSE si comparaison historique + variance LLM.
Livrables : `METROLOGY_05_THRESHOLD_CANDIDATES.csv` + `_FALSE_ACCEPT_FALSE_REJECT.md` + `_OLD_VS_NEW_SCALE.md`. **PASS** : chaque seuil candidat a une justification statistique + IC.

## Phase 6 — SHADOW BENCH NON-RÉGRESSION
Appliquer les paliers candidats en **shadow** (double verdict prod/shadow logué, jamais appliqué) sur : goldens, high-quality rejects, BOOK_FULL, PROD_REVELATION, M0.b, K2 récents, mauvaise prose, lit moyenne, maîtres.
Livrable : `METROLOGY_06_SHADOW_BENCH_REPORT.md`. **PASS** : faux accepts/rejets connus et chiffrés ; les nouveaux seuils ne laissent pas passer la famille D ni ne rejettent les maîtres.

## Phase 7 — DÉCISION DE PROMOTION
Seulement ici, et seulement si le shadow prouve le gain : `DEC-016-METROLOGY-SCALE-RECALIBRATION.md` (anciens vs nouveaux seuils, preuve stat, risques, rollback, no-go, shadow). Implémentation gatée (terminal Architecte, EMP-10, flag, 2517 vitest verts).

## Méthode statistique (transverse)
Percentiles + bootstrap IC95 ; variance LLM mesurée (k) ; MAE/RMSE vs historique ; faux accepts (famille D au-dessus du seuil) / faux rejets (maîtres sous le seuil) ; séparation FR/EN, courte/longue fenêtre, par catégorie.

## No-go / interdits
Changer un seuil avant Phase 7 · calibrer sur packet vide · 3 œuvres · contrat dérivé de la prose scorée (circularité) · figer un floor sur un axe encore confondu (IFI/ECC) · toucher genome SEALED / DEC-009 / M4 avant WS-D complet.

## Ordre d'exécution
`WS-D0 freeze → D1 corpus (incl. best-sellers) → D2 contrats/packets → D3 mesures → D4 split + IFI autopsy → D5 seuils percentiles → D6 shadow → D7 DEC-016 promotion`. Exécution LLM = terminal Architecte (Ollama) ; préparation/CALC/analyse = autonome.

## VERDICT
- Statut : PASS (protocole complet, 7 phases, anti-confond, best-sellers intégrés, percentiles par catégorie).
- Confiance : Haute (consolide WS-A/B/C + DEC-013/014/015 ; method-before-measure).
- Forces : refonde l'instrument du sol à la stratosphère ; sépare génie/conformité ; place les best-sellers ; provenance + INVALID_PACKET ; aucun seuil sans IC + shadow.
- Faiblesses : (1) lourd (centaines de mesures LLM × 3 modes = run long, terminal Architecte, JSONL resumable) ; (2) droits sur best-sellers/lit récente à clarifier (mesure interne, hash, pas de redistribution) ; (3) le split intrinsèque/conformité (Phase 4) demande une décision de design sur l'appartenance de chaque axe.
- Risques restants : sur-ingénierie si on vise l'exhaustivité absolue — borner le corpus à ~30-40 œuvres × familles pour un premier cycle complet, puis étendre.
- Action requise : décision Architecte — démarrer par **Phase 0 (freeze) + Phase 4 Pilier 1 (autopsie IFI)** (microscope avant méga-bench), OU lancer directement D1 corpus élargi. Aucun seuil touché.
