# V4 — CONTRÔLE-VÉRITÉ DE L'EXISTANT + PERFECTIONNEMENTS

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Mandat Architecte** : « on ne prend rien sans contrôle vérité mathématique » + « réfléchis à des perfectionnements pour affiner les mesures »
**Méthode** : lecture du code réel + colonnes des matrices de features (pas de réutilisation sur la foi d'un nom).

---

## 1. AUDIT-VÉRITÉ DE L'INFRA « réutilisable » (correction de mon « 50% existe »)
| Brique | Ce qu'elle fait VRAIMENT | Réutilisable pour V4 genre/type ? |
|---|---|---|
| `style-emergence-engine` : `analyzeCadence/Lexical/Syntactic/Density/Coherence` (22 tests) | **extracteurs de features de style sur texte arbitraire** (cadence/burstiness, richesse lexicale, diversité syntaxique, densité de description, cohérence) | ✅ **OUI** — vrais extracteurs, testés |
| `corpus-analysis/R2_FEATURE_MATRIX.csv` (1334 œuvres) | **~40 features réelles déjà calculées** (rhythm_variance, verb_density, action_verb_ratio, description_density, bigram_rarity, lexical_surprise, tense_switches, contrast_delta, hapax…) + tier/lang/author | ✅ **OUI** — données prêtes, features discriminantes |
| `omega-forge/style-metrics.ts` (`computeM6/M7`) | scores d'**unicité par delta-vs-cible** (conformité de génération) | ❌ NON (deltas de génération, pas features de texte) |
| `decision-engine/classifier.ts` | classifieur d'**événements runtime** (governance) | ❌ NON (pattern de règles réutilisable au mieux, pas le classifieur) |
| `integration-nexus-dep/router` | routage générique | ⚠️ PATTERN réutilisable (router type→juge), pas turnkey |
| `omega-p0/corpus/human/*-style.txt` | 10 exemplaires style maîtres FR | ✅ référence style |

**Vérité corrigée** : les **features (extraction) et les données (1334×40) EXISTENT et sont réutilisables**. Le **classifieur de genre, le TYPE gate et le scorer genre-relatif N'EXISTENT PAS** — à bâtir sur ces features. Mon « 50% d'infra » était imprécis : ~50% côté **features/données**, ~0% côté **classification/routage de genre littéraire**.

## 2. RÈGLE (suite au contrôle) : aucune feature adoptée sans preuve de discrimination
Avant d'utiliser une des ~40 features pour classer un genre/type, **prouver empiriquement** qu'elle discrimine (mutual information / AUC par feature, VIF pour la redondance, stabilité cross-langue). Pas de feature « parce qu'elle a un joli nom ». (Hérite de la doctrine kill-switch + EMP-16.)

## 3. PERFECTIONNEMENTS pour affiner/affirmer les mesures
1. **TYPE gate par features bon marché (sans LLM)** : fiction vs non-fiction est très séparable par `dialogue_ratio`, `description_density`, densité 1ʳᵉ/3ᵉ personne, densité de dates/entités/citations → testable directement sur la matrice 1334. **Cheap, anti-erreur, vérifiable.**
2. **Classifieur de genre supervisé** sur la matrice 1334×40 (régression logistique / RF) **ET** centroïdes nomic par genre → croiser les deux (accord = confiance). Sortie **probabiliste** (pas étiquette dure), `CERTAIN/PROBABLE/HYBRID/AMBIGUOUS`.
3. **Qualité genre-relative = z-score / percentile intra-genre** de chaque axe + pairwise gemma INTRA-genre (maître-thriller vs pulp-thriller) → lève le confond genre de S1E.
4. **Sortie multi-axes** (DEC-018) : `type` · `genre{probs}` · `GlobalQuality` · `GenreRelative_percentile` · `StyleFit` · `CommercialPotential` · `Confidence`.
5. **Hybrides** : genre probabiliste → **mélange pondéré** des scorers de genre (un polar littéraire = 0.6 polar + 0.3 littéraire).
6. **Non-fiction = axes propres** (pas « exclude » brut) : clarté, structure argumentative, densité de preuve, lisibilité, autorité — route dédiée.
7. **2 étages coût/précision** : features CALC + embeddings (sans biais de position, gratuits) en **radar de 1ᵉʳ passage** ; gemma (advisory, calibré) **seulement sur les cas proches** → coût réduit + géométrie non-circulaire d'abord.
8. **Régression de confond intégrée** (S1E) : tout score genre-relatif rapporte la significativité du label qualité **net** de genre/époque/longueur.
9. **Calibration par genre** : le tie-rate de gemma diffère par genre (29% pulp vs 12% maître en S1E) → seuils calibrés par genre, pas globaux.
10. **Percentiles intra-style** (en plus de genre) : un texte « minimaliste » jugé parmi les minimalistes → StyleFit.

## 4. CE QUE ÇA CHANGE POUR L'ORDRE V4
- V4-A **TYPE gate** : bâtir sur features existantes + **prouver la séparabilité fiction/non-fiction sur la matrice 1334** (contrôle-vérité avant d'adopter).
- V4-B **genre classifier** : supervisé sur matrice + centroïdes nomic, validé par CV.
- V4-C **genre-relative scoring** : percentiles intra-genre + gemma intra-genre.
- Chaque étape : **aucune adoption sans preuve mathématique** (AUC/MI/VIF/CV).

## VERDICT
- **Statut** : contrôle-vérité fait — réutilisation recadrée honnêtement (features/données OUI, classifieur/routeur NON). 10 perfectionnements listés.
- **Confiance** : Haute (lu dans le code + colonnes réelles).
- **Forces** : on part de features RÉELLES déjà calculées (1334×40) + extracteurs testés ; règle « pas de feature sans preuve de discrimination » ; perfectionnements concrets (TYPE gate cheap, intra-genre percentile, multi-axes, 2-étages coût).
- **Faiblesses** : (1) classifieur/scorer à construire (pas turnkey) ; (2) features à valider une par une (discrimination) ; (3) non-fiction = nouvelle route à spécifier.
- **Action** : V4-A — prouver d'abord la séparabilité TYPE (fiction/non-fiction) sur la matrice 1334 (cheap, vérifiable), puis spec. Décision Architecte sur le GO.
