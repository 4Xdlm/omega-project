# NCR-ACTION-BIAS

**Opened**: 2026-04-17
**Severity**: **HIGH (P0)** — promu le 2026-04-17 post-autopsie V2-B.2
**Status**: OPEN — investigation requise quelle que soit l'issue du bench V2-C
**Owner**: Francky (décision finale sur architecture scoring conditionnel)

## Promotion P0 (2026-04-17)

Auparavant MEDIUM, promu P0 suite au verdict SHADOW_CONTINUE du bench
V2-B.2 et à la décision Francky sur le plan A→B+ (DEC-20260417-004
POINT 17).

**Rationnel de la promotion** :

1. **Aucune variante de chunker** (V2-B.1, V2-B.2, V2-C) ne résout le
   bias ACTION. Le V2-C route ACTION vers `planAdaptiveChunkingV2B2`
   (gain modeste) mais ne corrige pas le scoring downstream.
2. **Cas A (V2-C PASS)** : V2-C promu en production, ACTION reste plafonné
   à ~0.88 en dispatch. Le bias devient le facteur limitant suivant.
3. **Cas B+ (V2-C FAIL)** : rollback V1 static, plus aucun levier de
   chunking → le bias scoring devient l'unique axe d'amélioration ACTION.
4. **Dans les deux cas**, NCR_ACTION_BIAS est chemin critique → P0.

## Issue

Les scènes de type ACTION/BRUTAL sous-performent systématiquement dans les
benchs de chunking adaptatif V2-B (médiane négative sur `fr_action_poursuite`
pour les 3 configurations testées : μ ∈ [-4.35, -1.81] vs μ positive sur
INTERIOR/SENSORY/CATHEDRAL).

L'origine causale n'est **pas** le chunker. Elle est un couplage mécanique
de trois capteurs CALC dans l'Oracle V3.4 :

1. **type_modifier ACTION via `f_subordination_depth` = 0.76** (vs 1.00
   NARRATION, 1.18 DESCRIPTION) — pénalise la faible subordination inhérente
   au staccato de l'action.
2. **RCI/rhythm** : pénalité `CV_sent` faible sur phrases courtes →
   "variance syntaxique insuffisante".
3. **RCI/euphony** : pénalité consonnes occlusives dures (scène action) →
   musicalité liquide absente.

Les trois features qui définissent une bonne scène d'action classique
(phrase courte + verbe dense + consonne dure) sont **automatiquement
délictuelles** pour l'Oracle calibré sur Flaubert/Duras/Proust.

## Features suspectes à investiguer

| Feature | Suspicion | Direction attendue sur ACTION |
|---------|-----------|-------------------------------|
| `f1_mean` (longueur moyenne phrase) | forte | chute mécanique (phrase courte) |
| `CV_sent` (variance rythmique) | forte | chute mécanique (staccato régulier) |
| `f5a` (densité verbes d'action) | moyenne | hausse → pénalité type_modifier |
| `f28d` / `f27d` (poids intériorité) | moyenne | chute naturelle (scène externe) |
| `f_subordination_depth` | forte | chute naturelle (staccato) |
| `euphony` (consonnes dures) | moyenne | chute naturelle (consonnes occlusives) |

## Contexte historique

- `docs/OMEGA_DOSSIER_DETECTION_TYPE.md` (mars 2026) documente que le
  détecteur de type classe presque tout en ACTION parce que la prose OMEGA
  a un profil uniformément action-like (verbes denses + phrases courtes).
- `docs/SESSION_SAVE_2026-03-24_MARATHON_BOTTLENECK.md` (mars 2026) :
  Rosetta rapport "Action pure = 93.01 en V3 mais 52.94 en R6", preuve
  que deux capteurs ne lisent pas la même physique.
- V3.4 retrain avril 2026 sur 1334 œuvres — le biais peut avoir été
  atténué, déplacé ou inchangé. **Non mesuré empiriquement.**

## Évidence du bench V2-B (2026-04-17)

Bench validate-shortlist 60 runs (3 configs × 4 scènes × 5 seeds) :

| config | fr_action_poursuite μ | σ | pire seed |
|--------|----------------------|---|-----------|
| a0.7_b0.1_g0.2 | **-4.35** | 6.64 | -16.06 (s0) |
| a0.3_b0.2_g0.2 | **-3.95** | 3.63 | -9.78 (s2) |
| a0.3_b0.3_g0.2 | **-1.81** | 1.31 | -3.67 (s0) |

Top3 (a0.3_b0.3_g0.2) minimise le dommage ACTION en redistribuant le
budget-mots hors des quartiles ACTION (via β=0.3), **pas** en améliorant
la scène d'action elle-même. C'est une optimisation d'évasion fiscale
algorithmique, pas une amélioration narrative.

## Décision

1. **Pas de modification de `src/oracle/axes/rhythm.ts` ni des
   `type_modifiers` maintenant.** Toute correction scoring nécessite une
   mesure empirique V3.4 préalable (le biais a pu être atténué par le
   retrain 1334 œuvres).
2. **Investigation reportée à V2-C** après intégration V2-B (chunking
   adaptatif top3) et bench A/B V1 vs V2-B.
3. **Implémentation potentielle** : scoring scene-aware avec architecture
   `noyau universel + modulateur par archétype`. Spec à rédiger en V2-C.

## Plan d'investigation V2-C (non démarré)

1. Mesurer les 6 features suspectes sur corpus FR ACTION pur (Zola
   Germinal extraits, Simenon — scènes d'action) vs corpus FR
   INTROSPECTION pur (Proust, Duras).
2. Vérifier si `f_subordination_depth` ACTION est toujours = 0.76 dans
   V3.4 ou si le retrain l'a modifié.
3. Si biais confirmé : rédiger spec `scene-aware-scoring-v1.md` et ADR.
4. Si biais atténué post-V3.4 : refermer NCR avec verdict RESOLVED.

## Non-décision explicite

- **NE PAS** baisser globalement les seuils rhythm/euphony (corromprait
  les scènes introspectives).
- **NE PAS** tordre le chunker V2-B pour compenser (mauvais étage causal).
- **NE PAS** supprimer l'archétype ACTION du forge-packet (le biais est
  dans l'Oracle, pas dans le packet).

## Traçabilité

- Bench de découverte : `packages/sovereign-engine/validate-shortlist-results.json`
- Rapport bench : `packages/sovereign-engine/validate-shortlist-results-report.md`
- Consensus 3-IA : Claude + Gemini + ChatGPT (2026-04-17), unanimité sur
  décision "ne pas recalibrer maintenant".
