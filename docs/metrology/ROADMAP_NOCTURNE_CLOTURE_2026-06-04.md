# Clôture roadmap nocturne — 2026-06-04 (blocs N1→N6)

**Branche** : phase-r-dispatcher-v33. Mandat : « GO tous », autonome, zéro décision en cours.
**Garde-fous tenus** : aucune modif code MOTEUR (EMP-16), tout LOAO (EMP-18), shadow réversible (N5), staging ciblé (EMP-13).

| Bloc | Objectif | Verdict | Commit |
|---|---|---|---|
| N1 | bge-m3 era-robuste ? | **ÉGALITÉ** nomic | `1d7d9be9` |
| N2 | 2ᵉ juge non biaisé ? | **AUCUN** (3/3 disqualifiés) | (doc ici) |
| N3 | corpus genre épuisé ? | **CONFIRMÉ** épuisé | (doc ici) |
| N4 | reproduire ρ=0.6138 ? | **NON** — SHA-drift confirmé, NCR DIAGNOSED | (doc ici) |
| N5 | shadow bge-m3 radar | **LIVRÉ** (17 tests, tsc 0, zéro impact verdict) | `1d7d9be9` |
| N6 | consolidation | ce doc | (commit) |

---

## N1 — bge-m3 era-robustesse (`S1E_BGEM3_ERA_RESULTS.json`)
MODERN_MASTER vs MODERN_LOW (époque neutralisée), embeddings bge-m3, LOAO + bootstrap auteur + permutation.
- **bge-m3 AUC = 0.777** [IC95 0.20–0.92], permutation p=0.004 (significatif) ; **nomic réf = 0.79**.
- **Verdict : ÉGALITÉ.** bge-m3 ne bat PAS nomic en era-robustesse ; les deux plafonnent ~0.78 (plafond mondial sur le contraste moderne dur). L'avantage de bge-m3 reste cantonné au formulaic (S1D-bge, DEC-019). nomic conservé en comparateur era.

## N2 — Chasse au 2ᵉ juge non biaisé (`N2_JUDGE_HUNT_RESULTS.json`)
Calibration negative-controls (master-master + pulp-pulp, order-swap) + cross master-vs-pulp, 3 candidats récents.

| Modèle | position_bias (NC master / NC pulp / cross) | tie_rate | master_win | Verdict |
|---|---|---|---|---|
| phi4 | 0.656 / 0.75 / 0.594 | 0.0 | 0.594 | **DISQUALIFIÉ** (biais vers A) |
| command-r7b | 0.037 / 0.056 / 0.043 | 0.16 / 0.44 | 0.565 | **DISQUALIFIÉ** (biais vers B) |
| llama3.1:8b | — / 0.6 / 0.5 | 1.0 / 0.84 | 0.25 | **DISQUALIFIÉ** (machine à TIE, anti-discriminant) |

- **Verdict : aucun 2ᵉ juge propre.** La non-viabilité du jury local s'étend à **5 modèles** (qwen3, mistral-small, phi4, command-r7b, llama3.1). **gemma4 reste le seul juge calibré non biaisé** (DEC-018). Un jury à 2 juges n'est PAS atteignable localement avec les modèles actuels.
- Mécanisme : le biais de position pairwise est un défaut LLM-juge répandu ; gemma4 = exception. Les petits modèles soit choisissent une position fixe, soit s'abstiennent systématiquement.

## N3 — Contrôle-vérité « corpus genre épuisé »
KB élargi à ~60 auteurs FR de genre célèbres, comptage sur 1011 livres FR :
- THRILLER **10 auteurs/36**, FEELGOOD **~7-8/33**, SF_FANTASY **5/24** (goulot).
- Les SF FR de référence (Barjavel, Bordage, Damasio, Wul, Ligny, Andrevon…) **ne sont PAS dans le corpus**.
- **Verdict : gel G4 CONFIRMÉ.** L'épuisement est réel (pas un artefact de KB) ; SF plafonne à 5 auteurs. La relance genre exige un corpus élargi (cf `V4_GENRE_CORPUS_REQUIREMENTS.md`).

## N4 — NCR SHA-drift ρ=0.6138 (M0b V3.4)
- **SHA-drift CONFIRMÉ** : `M0B_SLIM_V34_COEFFICIENTS.json` sur disque = `9b013db3dd71…` ≠ SHA documenté CLAUDE.md `e75e3bb07d86…`.
- **ρ=0.6138 non reproductible** : `FEATURE_MATRIX_V3.csv` + `HOLDOUT_V2.csv` ABSENTS du disque (workspace + repo) ; ρ n'est stocké comme champ dans aucun artefact présent.
- **Verdict : NCR reste `OPEN_DIAGNOSED`.** ρ=0.6138 = registre historique dont les inputs bruts ne sont pas persistés ET dont le coefficient de référence a dérivé en SHA. Recommandation (décision Architecte) : (a) re-sceller le SHA actuel comme nouvelle référence, OU (b) re-générer la calibration si le corpus 1334 + features sont retrouvés ailleurs. Aucune confiance aveugle dans 0.6138 tant que non re-prouvé.

## N5 — Module SHADOW bge-m3 radar (`bgem3-radar.ts`, livré `1d7d9be9`)
- Module standalone, flag `OMEGA_BGEM3_RADAR` (défaut '0' = no-op total), centroïdes **injectés** (artefact `data/bgem3-radar-centroids.json`, dim 1024, master n=60 / low n=90), hook shadow qui ne lève jamais, **zéro impact verdict**.
- **17 tests unitaires PASS** (cosinus, score advisory, bandes, flag no-op, shadow safe), suite intrinsic-quality **37/37**, **tsc --noEmit = 0 erreur**. Déterminisme préservé (jamais dans le chemin hashé). EMP-16 respecté (advisory, non-gating).

---

## Synthèse nocturne
**Gains nets** : N5 (module radar shadow livré, prêt à activer en télémétrie). **Vérités honnêtes établies** : N1 (bge-m3 = nomic en era, pas mieux), N2 (gemma seul juge, 5 modèles testés), N3 (gel genre confirmé corpus-limité), N4 (ρ=0.6138 non reproductible, SHA dérivé).
**Aucune sur-promesse** : 4 des 6 blocs sont des résultats négatifs/diagnostiques honnêtes — c'est le rôle du contrôle-vérité.

## Décisions ouvertes (Architecte)
1. N4 : re-sceller SHA `9b013db3…` comme nouvelle référence du coefficient V3.4, OU re-générer la calibration.
2. Activer `OMEGA_BGEM3_RADAR=shadow` en télémétrie sur un run réel (N5 prêt).
3. Genre/jury : statu quo (gemma seul juge + bge-m3 radar) jusqu'à corpus élargi.

## VERDICT global
- Statut : PASS (méthode) · 6/6 blocs exécutés, verdicts honnêtes, zéro régression, zéro modif moteur.
- Confiance : Haute.
- Action requise : 3 décisions ci-dessus (non bloquantes).
