# DEC-20260602-017 — IntrinsicQualityScore (advisory + sélecteur pairwise)

**Statut** : PROPOSED (doc-only) — ratification Architecte requise avant tout code moteur (EMP-16 + EMP-10)
**Date** : 2026-06-02 · **Branche** : phase-r-dispatcher-v33 · **Auteur** : Claude Code (IA Principal)
**Preuve** : WS_D_R5_RESULTS_VERDICT.md + WS_D_R5_LARGE_VERDICT.md (chantier B, option B Architecte)
**Lié à** : DEC-016 (découplage densité / split 3 scores), DEC-015 (paliers vérité), DEC-011 (anti-circularité), DEC-013/014.

---

## 1. Contexte

R4-large : en français, aucun ANCIEN axe (necessity/show/anti_cliche/sensory) ne discrimine la qualité ; seul euphony,
surtout en EN. R5 a montré que **le problème était le DESIGN du scoring (absolu saturant + axes mécaniques), pas le LLM** :
- un **juge par paires** (choix forcé) et des **prompts absolus redessinés** (anti-saturation) discriminent la qualité FR.
- R5-large (60 livres, IC95 clusterisé PAR LIVRE) confirme un signal **RÉEL mais MODÉRÉ**, optimal à **granularité de scène (~1500 mots)**.

## 2. Preuve (R5-large, n=15/cellule, IC par livre)

| instrument | FR @1500 | FR @3000 | EN @1500 |
|---|---|---|---|
| pairwise master-win | 0.807 [0.62, 0.95] | 0.78 [0.61, 0.93] | 0.951 [0.89, 0.99] |
| absolu profondeur (AUC) | 0.844 [0.67, 0.98] | 0.778 [0.59, 0.94] | 0.978 |
| absolu style (AUC) | 0.864 [0.72, 0.98] | 0.789 [0.60, 0.94] | 0.913 |
| absolu voix (AUC) | 0.851 [0.68, 0.98] | 0.796 [0.61, 0.94] | 0.891 |

→ À **1500 mots**, les 3 dimensions FR passent le seuil (AUC ≥0.84, IC_bas 0.67-0.72). Force **modérée** (pas SEAL-grade dur), **suffisante pour advisory + sélection**.

## 3. Décision

**`IntrinsicQualityScore` est adopté en rôle ADVISORY + SÉLECTEUR, PAS en floor de production dur.**

### 3.1 Composition (advisory)
`IntrinsicQualityScore = moyenne(profondeur, style, voix)`, chaque dimension = un prompt-juge LLM (cadrage critique +
consigne anti-saturation « oser les notes basses »), **mesuré à granularité de scène (~1200-1800 mots)**. Les 3 sous-scores
sont toujours reportés séparément (audit). Prompts de référence : `scripts/metrology/wsd-r5-*` (à porter en module moteur).

### 3.2 Sélecteur pairwise (best-of-N)
Pour choisir parmi N candidats générés : **tournoi en choix forcé** (chaque candidat vs candidat, ou vs référence),
**2 ordres systématiques** (anti-biais position), agrégation par taux de victoire. Win-rate ~0.81 maître-vs-pulp → outil
de **sélection** fiable (≠ certification absolue).

### 3.3 Rôles (split DEC-016, consolidé)
- **IntrinsicQualityScore** (ce DEC) : qualité littéraire brute — ADVISORY + sélecteur. Axes : profondeur, style, voix
  (+ euphony CALC en appui, cf R4-large : seul axe legacy robuste). **PAS** : necessity (inversé/mécanique), show_dont_tell /
  anti_cliche (inertes), sensory density (texture, DEC-016).
- **ContractConformityScore** : ECC, tension_14d — conformité au contrat (génération sous contrat connu uniquement). Hors qualité intrinsèque.
- **SensoryDensityScore** : advisory (DEC-016), jamais gating.

## 4. Ce que ce DEC NE fait PAS (limites assumées, EMP-12)

- **PAS de floor de production dur** : la force FR est modérée (IC_bas ~0.62-0.72) ; un gate dur exige un durcissement (§7).
- **PAS de seuil chiffré** : aucun palier production touché (DEC-015 reste l'autorité ; re-dérivation séparée).
- **PAS d'usage hors granularité de scène** : à 600 (trop court) et 3000+ (trop long), le signal s'affaiblit (IC larges).
- **Biais EN>FR persiste** : le juge reste plus fort en anglais ; pour la prod FR, force modérée acceptée en advisory.

## 5. Plan d'implémentation (POUR TERMINAL ARCHITECTE — EMP-10, flag, shadow, ZÉRO ici)

1. Nouveau module scorer (hors moteur figé) : 3 prompts profondeur/style/voix via le provider, parse {score}, à granularité scène.
   `IntrinsicQualityScore = mean(3)`. Flag `OMEGA_INTRINSIC_QUALITY` ('0'|'shadow'|'advisory'). Défaut '0'.
2. Sélecteur pairwise : module de tournoi best-of-N (2 ordres), pour la phase de sélection des candidats de génération.
3. **Rôle advisory uniquement** : le score est reporté/loggé, NE casse aucun SEAL, n'entre PAS dans min_axis.
   (Si un jour gate dur : DEC séparé après durcissement §7.)
4. Mitigation biais position : TOUJOURS moyenner les 2 ordres en pairwise (déjà fait dans le harnais).
5. Tests : déterminisme (temp 0), non-régression (rôle advisory ne change aucun verdict prod), shadow bench génération.
6. Wrapper `commit-with-tests.ps1` (EMP-10).

## 6. Usage en génération (cohérent synthèse Phase 2)

- **Le juge devient sélectionneur** : best-of-N via pairwise → choisir la meilleure version, pas bloquer.
- **IntrinsicQualityScore advisory** : signal de progression entre passes de réécriture (atelier multi-passes).
- euphony / rythme / syntaxe (travail Flaubert) → passes de réécriture, le score advisory mesure le gain.

## 7. Évolution future (gaté) — vers un gate dur

Pour transformer l'advisory en floor dur : pousser à **n≥30 livres/cellule** (l'IC par livre se resserre), viser
AUC ≥0.80 IC_bas>0.70 sur ≥2 tailles, réduire le biais position FR, et possiblement un modèle plus fort que qwen3:32b.
DEC séparé à ce moment-là. **Pas avant.**

## 8. Gates & garde-fous

- **EMP-16** : advisory/sélecteur justifié par R5+R5-large (2 instruments, n=15, cluster). Un GATE DUR exige §7.
- **EMP-10** : code = terminal Architecte, flag, shadow, wrapper test. Rien appliqué ici.
- **DEC-011** : anti-circularité respectée (préférence de qualité intrinsèque, pas conformité dérivée de la prose).
- **DEC-015** : aucun palier production modifié.
- **Droits** : corpus sous droits = mesure interne, scores only.

## 9. Questions à l'Architecte

1. Valides-tu `IntrinsicQualityScore = mean(profondeur, style, voix)` @scène en rôle **advisory + sélecteur** (pas floor) ?
2. GO pour porter les prompts R5 en module scorer flag-gaté (`OMEGA_INTRINSIC_QUALITY='shadow'` d'abord), terminal/EMP-10 ?
3. Le durcissement vers un gate (n=30, §7) : maintenant en // ou plus tard ?
