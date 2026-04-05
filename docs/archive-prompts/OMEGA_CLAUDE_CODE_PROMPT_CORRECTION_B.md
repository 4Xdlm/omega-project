# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : CORRECTION B — POIDS AU LIEU DE NEUTRALISATION
# Revert Correction A + appliquer confidence R3 comme multiplicateur de poids
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# ═══════════════════════════════════════════════════════════════════════════════

## CONTEXTE

La Correction A (commit de752fbe) a implémenté :
  score = conf × raw + (1-conf) × 75

Résultat : les BONS scores courts ont été tirés vers le bas (Souvenir 90.9→87.7).
C'est l'inverse de l'objectif. La correction détruit le pouvoir discriminant.

ChatGPT a identifié le bug conceptuel :
  "faible confiance = faible AUTORITÉ du signal, PAS retour à la moyenne"

Le bon pattern : garder le raw score intact, réduire son POIDS dans le RCI.

## CE QU'IL FAUT FAIRE

### Étape 1 — REVERT la neutralisation dans rhythm.ts

Dans `src/oracle/axes/rhythm.ts`, SUPPRIMER les lignes ajoutées par la Correction A :

```typescript
// SUPPRIMER ces lignes :
const NEUTRAL_RHYTHM = 75;
// ... et la ligne qui fait :
// score = conf * score + (1 - conf) * NEUTRAL_RHYTHM;
```

Le raw score du rhythm doit redevenir EXACTEMENT ce qu'il était AVANT le commit de752fbe.

GARDER la fonction `rhythmConfidence(wordCount)` et l'export — on en a besoin.
GARDER le `conf_r3` dans le details string — c'est de la traçabilité utile.

Le score rhythm final doit être le score CALC brut, non modifié par la confiance.

### Étape 2 — Appliquer la confiance comme POIDS dans macro-axes.ts (computeRCI)

Dans `src/oracle/macro-axes.ts`, dans la fonction `computeRCI()` :

Le RCI agrège plusieurs sous-scores avec des poids. Le rhythm a un poids fixe (weight=1.0).
La modification : multiplier le poids du rhythm par la confidence R3.

```typescript
// DANS computeRCI(), après le calcul du rhythm :
import { rhythmConfidence } from './axes/rhythm.js';

// Quand on calcule le score pondéré RCI :
// AVANT : rhythm contribue avec son poids nominal
// APRÈS : rhythm contribue avec poids × confidence

const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
const conf = rhythmConfidence(wordCount);

// Modifier le poids effectif du rhythm dans le calcul RCI
// rhythm.weight * conf au lieu de rhythm.weight
```

CONCRÈTEMENT : trouver dans computeRCI() comment les sub_scores sont agrégés.
Le rhythm sub_score a un weight. Multiplier CE weight par conf.
Les autres sub-scores (signature, hook, euphony, voice_conformity) gardent leurs poids intacts.

EFFET :
- Sur 500w (conf=0.77) : rhythm pèse 77% de son poids nominal dans le RCI
- Sur 3000w (conf=1.0) : rhythm pèse 100% — aucun changement
- Le raw rhythm score reste intact (un bon rhythm court reste un bon score)
- Un mauvais rhythm court est toujours mauvais mais il BLOQUE MOINS le RCI

### Étape 3 — Rescore à froid

Modifier `scripts/rescore-vatomic-cold.ts` pour recalculer le RCI avec le nouveau poids.

Le script doit :
1. Charger les 5 textes de briques
2. Calculer le rhythm RAW (sans neutralisation — comme avant Correction A)
3. Calculer la confiance R3
4. Recalculer le RCI avec le poids rhythm ajusté
5. Recalculer le composite
6. Afficher AVANT (original VATOMIC) / APRÈS (correction B) / et aussi scores Correction A

Sauvegarder dans `VATOMIC_RESCORED_B.json`.

### Tests

Mettre à jour les tests de rhythm-confidence pour refléter que :
- La fonction rhythmConfidence existe toujours
- Le score rhythm RAW n'est PLUS modifié par la confidence
- La confidence est EXPORTÉE pour usage par computeRCI

Ajouter un test dans le fichier de tests RCI :
- `it('RCI rhythm weight is scaled by confidence for short texts')`
- `it('RCI rhythm weight is 1.0 for texts >= 3000 words')`

### Commit

```
fix(rci): confidence R3 comme multiplicateur de POIDS, pas de SCORE

Revert de la neutralisation vers 75 (Correction A — de752fbe).
Le raw rhythm score redevient le score CALC brut non modifie.

Nouvelle approche (ChatGPT insight) :
  "faible confiance = faible AUTORITE, pas retour a la moyenne"

La confidence R3 multiplie le POIDS du rhythm dans computeRCI(),
pas sa valeur. Effet :
  - Un bon rhythm court reste un bon score
  - Un mauvais rhythm court est toujours mauvais
  - Mais rhythm BLOQUE MOINS le RCI sur textes courts
  - Sur textes longs (>=3000w) : aucun changement (conf=1.0)

Rescore VATOMIC_RESCORED_B.json pour comparaison A vs B.
```

## VÉRIFICATION

1. `npm test` → tous GREEN
2. Comparer VATOMIC_RESCORED_B.json avec les scores originaux
3. Vérifier que Souvenir (91.9 original) est PROCHE ou AU-DESSUS de 92.0
4. Vérifier que le rhythm brut est identique aux scores d'avant Correction A
