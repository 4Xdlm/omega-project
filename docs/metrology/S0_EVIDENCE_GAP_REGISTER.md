# S0 — REGISTRE DES EVIDENCE-GAPS

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Doctrine** : EMP-12 (METRIC_HONESTY), STRUCTURED_MEMORY_PRIORITY (#4)

> Objet : statut de reproductibilité réel des chiffres [REGISTRE] fondateurs, avant toute décision. Honnêteté maximale : ni « tout va bien », ni « tout est perdu ».

---

## EG-01 — ρ=0.6138 (M0b_slim V3.4)

**Affirmation** : le plafond CALC est ρ_dispatched=0.6138 (holdout 264), modèle Ridge 5 features, corpus 1334.

**Ce qui est PRÉSENT et vérifié runtime** :
- `packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts` — coefficients **câblés**, provenance auto-documentée (calibration_id `M0b_slim_V3_4_2026-04-11`, n_train=1070, n_holdout=264, ρ=0.6138, seed=42, sha calibration + holdout_v2).
- `[WORKSPACE] outputs/corpus-analysis/M0B_SLIM_V34_COEFFICIENTS.json` — coefficients + means/std + ρ_fr=0.5362 / ρ_en=0.4366 / acc=0.5985.
- `[WORKSPACE] outputs/corpus-analysis/` — feature matrices `R2_FEATURE_MATRIX.csv` (573 KB), `R3_FEATURE_MATRIX.csv` (612 KB), `PSI_PHASE1_FEATURE_MATRIX.csv`, classification `ETAPE4_FR_CLASSIFICATION*.csv`, `OMEGA_MATH_STUDY_v1.xlsx`.

**Ce qui MANQUE / bloque la reproduction** :
1. Données en **workspace volatile** (`outputs/`), **PAS versionnées dans le repo** → fragilité (perte = perte de preuve).
2. Fichiers exacts `HOLDOUT_V2.csv` et `FEATURE_MATRIX_V3.csv` (noms doctrinaux) **non localisés** sous ces noms ; matrices équivalentes présentes (R2/R3/PSI) mais le **split holdout exact + script de retrain** ne sont pas confirmés réexécutables en l'état.
3. **NCR P1 OUVERT — `NCR_V3_4_SEAL_DRIFT`** : SHA256 du fichier sur disque (`adbf41…`) ≠ SHA256 doctrinal CLAUDE.md (`e75e3b…`). Le fichier a été modifié post-scellement OU la valeur doctrinale est erronée. Identité scellée **contestée**.

**Statut** : `PARTIELLEMENT_REPRODUCTIBLE` — VÉRIFIÉ-CÂBLÉ, données de calibration présentes (workspace), mais **non re-calculable depuis le repo seul** + drift SHA ouvert.

**Conséquence (norme S-1)** : ρ=0.6138 = **REGISTRE exploitable comme PISTE, pas comme FONDATION**. Pour le promouvoir en PROUVÉ : (a) versionner les données dans le repo, (b) ré-exécuter le retrain pour reproduire ρ, (c) clore `NCR_V3_4_SEAL_DRIFT` (recalculer le SHA canonique). **Non bloquant pour S1** (S1 mesure les embeddings vs LLM, indépendamment de M0b CALC).

---

## EG-02 — Plafond « ρ CALC ≈ 0.61 = définitif »

**Affirmation doctrinale** : le plateau CALC est scellé à 0.6138, plafond dépassé.

**Statut** : dépend entièrement d'EG-01. Le plafond est **conditionnel à la reproductibilité d'EG-01**. Marqué `REGISTRE`. Ne pas l'invoquer comme borne dure tant qu'EG-01 n'est pas `PROUVÉ`.

---

## EG-03 — Labels de tiers du corpus (881 livres)

**Deux sources de labels, vérifiées runtime** :
- `CORPUS_TIERS_V3.json` (571 entrées) : `tier_final = NULL` pour **100 %** des entrées ; seul `tier_suggestion` rempli, **dérivé par mot-clé** (`tier_reason` ex. « Contenu formulaïque — signal: ghetto », « romance Regency ») ; distribution gonflée (S=278/571 ≈ 49 % invraisemblable) ; **langue mal détectée** (titres anglais étiquetés `fr`). → **INUTILISABLE comme vérité-terrain** : ré-injecterait la maladie keyword condamnée par la campagne métrologique.
- `FULL_CORPUS_MANIFEST.json` (1334 entrées, = corpus M0b V3.4 : FR 788 / ENG 546 exact) : champ `tier` rempli (S=328, A=181, B=246, C=430, **BS=23** best-seller, D=126). Tiers de facto utilisés pour la calibration ρ=0.6138.

**Provenance RÉSOLUE (via dossiers source `Downloads/livre`, RAPPORT_CLASSIFICATION.md/V2/FINAL)** : la classification de référence a été faite par **« extraction titre/auteur depuis le nom de fichier + classification par connaissance littéraire »** = **labellisation par réputation d'auteur (jugement expert)**, organisée en dossiers `FR|ENG|ESP|IT / S·A·B·C·D·Best Seller`, ~1328 livres post-dédoublonnage. Le `tier_suggestion` keyword (« signal: ghetto ») de `CORPUS_TIERS_V3.json` était un pass auto **cruder et séparé** (`tier_final`=null, jamais retenu), **superseded** par la classification experte par dossiers.

**Conséquence (contamination LEVÉE)** : un label par **réputation d'auteur** n'est **pas circulaire avec le contenu textuel** → ρ=0.6138 (CALC prédit le tier-réputation) n'est PAS « CALC prédit une heuristique keyword ». La crainte de contamination est **levée** pour les labels par dossier. La vérité-terrain expert EXISTE et est défendable sur les extrêmes (canon).

**Résidus** : (a) label appliqué par AUTEUR (toutes les œuvres d'un auteur héritent du même tier — pas de variation intra-auteur) ; (b) réconciliation manifest M0b (1334, FR 788/ENG 546) vs dossiers FINAL (1328, FR 669/ENG 556) — compositions proches mais non identiques, à aligner ; (c) gros du corpus en **epub/pdf non extrait** (pipeline d'extraction requis S1).

**Statut** : `RÉSOLU` — provenance = jugement expert par auteur (dossiers), labels V3-keyword écartés, contamination levée. Reste : réconciliation manifest↔dossiers + extraction texte.

**Action S1 (durcie)** : ne PAS faire confiance aveugle aux tiers du manifest. Construire un **Gold-Set DÉFENDABLE** : extrêmes hand-pickés non disputables (S-tier maîtres canon : Zola/Flaubert/Proust… vs D-tier pulp avéré), langue vérifiée, zéro sortie OMEGA, split par auteur. Réserver les tiers médians A/B/C (bruit de label maximal) HORS du test AUC initial. Le manifest sert de pool de départ, pas de vérité brute.

---

## SYNTHÈSE

| ID | Sujet | Statut | Bloquant S1 ? |
|---|---|---|---|
| EG-01 | ρ=0.6138 reproductibilité | PARTIELLEMENT_REPRODUCTIBLE + NCR SHA ouvert | Non |
| EG-02 | Plafond CALC 0.61 | REGISTRE (conditionnel EG-01) | Non |
| EG-03 | Labels tiers corpus | À_AUDITER_S1 | **Oui** (vérité-terrain S1) |

**Action prioritaire avant S1** : auditer la provenance des labels de tiers (EG-03) — c'est la vérité-terrain de toute mesure de discrimination. Les autres gaps sont différables.
