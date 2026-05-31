# OMEGA — MINAXIS LITERARY CALIBRATION (RCI & ECC vs real literature)

> READ-ONLY · 2026-05-31 · HEAD `d007c1db` · Le test « les chefs-d'œuvre franchissent-ils les floors ? »

## 0. Statut du test décisif — PARTIELLEMENT BLOQUÉ (honnêteté)

**Test idéal (idée Gemini)** : recalculer `computeRCI`/`computeECC` (composantes CALC) sur ~50 œuvres réelles → si une part significative score sous le floor, le floor est mathématiquement invalide.

**BLOCAGE mesuré** : `omega-autopsie/results_v4/` contient **169 œuvres réelles** (Apollinaire→Zola, McCarthy, Hemingway, Woolf, Proust, Faulkner…) **mais en FEATURES SEULEMENT — AUCUNE prose brute** (chaque fichier = JSON `meta`+`averages` (107 métriques)+`extracts`+`chapters`, **pas de champ texte**). Recomputer `computeRCI` (qui prend une `string` prose) est **impossible sans les textes originaux** (Gutenberg/Gallica) → hors scope READ-ONLY. *(Voir `MINAXIS_DATASET_TRACEABILITY.md`.)*

**Repli : calibration au NIVEAU FEATURE** (distributions réelles déjà calculées en Phase W, 413 œuvres) + **conclusions corpus déjà actées dans le repo**. Limite : les `f*`-features ne sont pas un mapping 1:1 des sous-axes `computeRCI` (échelles différentes) → **convergence d'indices, pas preuve d'identité**.

## 1. Distributions de la littérature réelle (Phase W, 413 œuvres)

| Feature (réel) | Classique | Populaire | Effet | Source |
|---|---|---|---|---|
| `f1a_rhythm_variance` (CV rythmique) | **16.68 ± 7** | **8.30 ± 3** | ×2 | `results_phase_r/R4_FEATURE_AUDIT_REPORT.md:44,78` |
| Musicalité (proxy émotion/ECC) | 13.55 ± 7.24 | 8.03 ± 2.66 | d=1.20 | `UNIVERSALITY_REPORT_FINAL.md:163-172` |
| Intériorité | 0.155 | 0.091 | d=0.70 | idem |
| `f1_mean` longueur phrase | 23.18 mots | 12.51 mots | — | idem |
| Hurst (burstiness) | **~0.69 quasi-uniforme tous tiers** (S 0.696 / C 0.694) | t=1.28 d=0.15 (négligeable) | `HURST_LOCAL_ANALYSIS.json:1-48` |

**Lecture** : la littérature réelle présente une **variance rythmique élevée et très étalée** (classique 16.7, populaire 8.3) ; la « musicalité » sépare massivement classique/populaire. Le Hurst n'est PAS discriminant (burstiness uniforme) → un capteur qui sur-pondère la burstiness mesure du bruit.

## 2. Conclusions corpus DÉJÀ actées par le repo (preuve interne)

- **RCI mis-calibré** : *« RCI = 76-82 (consistently < 85 floor) … the primary bottleneck »* — `ART_AUDIT_REPORT.md:119`. Causes nommées : hook_presence 75 neutre, signature ≥30 % dur, voice drift, euphony plafond FR ~90.
- **Floors déjà abaissés AVEC corpus-proof** : `config.ts` — `SII` **85→80** *« floor of 85 to BRUTAL scenes = physically impossible per corpus »* ; `MACRO_AXIS_FLOOR` **85→80** *« McCarthy, Hemingway »*. **RCI/ECC jamais réévalués sur le même critère.**
- **ECC prédictivité limitée** : `CALIBRATION_METRICS.json` — `mean_entropy 0.3585 (decisive)` mais `residual_pct 0.3693`, `residual_verdict: FAIL` → ECC ne prédit pas la qualité réelle à ~37 % près.

## 3. Croisement avec le dataset OMEGA (MINAXIS_DISTRIBUTION.csv)

- RCI produit par le moteur : centré **82.4**, **73 % < floor 85**. Cohérent avec le « 76-82 » documenté → **le capteur sous-produit structurellement**, exactement comme la littérature réelle (rythme étalé) ne se compresse pas dans les poids RCI.
- ECC : median 87.5 ; s'effondre (57-71) uniquement sur contrat assemblé « Le Gardien » (cf. FLOOR_AUDIT §3) → pas un effet « littérature réelle », un effet **construction de contrat**.

## 4. Verdict calibration littéraire

**Les floors RCI 85 et ECC 88 ne sont PAS justifiés par le corpus 413 œuvres** ; ce sont des **seuils aspirationnels, pas des planchers empiriques** (conclusion convergente : Phase W repo + distribution OMEGA mesurée ici). Le repo a déjà appliqué cette logique à SII/MACRO_AXIS (abaissés à 80) **mais pas à RCI** → incohérence à porter en NCR.

**LIMITE forte** : faute de prose brute (results_v4 = features), le recompute `computeRCI` direct sur œuvres réelles **reste à faire** (corpus textes requis). → **bench dédié `MINAXIS_E_LITERARY_RECOMPUTE`** : ré-importer ~20 textes réels (domaine public), exécuter `scoreRhythm`/`scoreEuphonyBasic`/`scoreSignature` CALC + (option Ollama) `scoreVoiceConformity`/ECC-shots [LLM], comparer aux floors. **Pré-requis avant toute baisse de floor (NO_RECALIBRATION_WITHOUT_CORPUS_PROOF).**

---
*Aucune recalibration effectuée. Données : Phase W (`omega-autopsie/`), `config.ts`, `MINAXIS_DISTRIBUTION.csv`.*
