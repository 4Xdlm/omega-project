# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : CONFIDENCE SCALING RCI (Correction A)
# Appliquer l'atténuation de confiance R3 au scoring rhythm pour textes courts
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 1966 PASS
#
# IMPORTANT : Correction A UNIQUEMENT. Pas de modification du peak CV.
# ═══════════════════════════════════════════════════════════════════════════════

## CONTEXTE

Le scorer rhythm dans `src/oracle/axes/rhythm.ts` calcule un score CALC pur
basé sur le CV des longueurs de phrases. Ce scorer a été calibré sur le corpus
des maîtres (181 œuvres, Phase R) à l'échelle de l'œuvre entière (30K-170K mots).

PROBLÈME : Sur des briques de 400-600 mots, le CV est beaucoup plus volatile.
La Refondation R3 (OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json) a déjà mesuré
cette volatilité et produit une table de confidence par feature × taille :

```
confidence(f1a_rhythm_variance, n_words):
  300w  → 0.65
  600w  → ~0.80  (interpolé)
  1500w → 0.95
  3000w → 1.0
```

Formule R3 : confidence(f, n) = max(0, min(1, 1 - CV(f, n)))

RÉSULTAT : Sur 5 briques V-ATOMIC (387-611w), le rhythm score s'effondre
(54-83) alors que les maîtres eux-mêmes auraient un CV volatile à cette échelle.
Le scorer punit la volatilité statistique, pas la mauvaise qualité.

## CE QU'IL FAUT FAIRE

### Modifier `src/oracle/axes/rhythm.ts`

Ajouter une atténuation de confiance basée sur le nombre de mots du texte.

Quand la confiance est < 1.0, le score rhythm est tiré vers une valeur
neutre (75/100 = score corpus moyen pour de la bonne prose littéraire).

Formule :

```typescript
// Confidence scaling basée sur la Refondation R3
function rhythmConfidence(wordCount: number): number {
  // Données empiriques R3 : confidence(f1a) par taille
  // Interpolation logarithmique entre les points mesurés
  if (wordCount >= 3000) return 1.0;
  if (wordCount <= 100) return 0.30;
  
  // Points d'ancrage R3 : (300, 0.65), (600, 0.80), (1500, 0.95), (3000, 1.0)
  const points: [number, number][] = [
    [100, 0.30],
    [300, 0.65],
    [600, 0.80],
    [1500, 0.95],
    [3000, 1.0],
  ];
  
  // Interpolation linéaire entre les points les plus proches
  for (let i = 0; i < points.length - 1; i++) {
    const [w0, c0] = points[i];
    const [w1, c1] = points[i + 1];
    if (wordCount >= w0 && wordCount <= w1) {
      const t = (wordCount - w0) / (w1 - w0);
      return c0 + t * (c1 - c0);
    }
  }
  return 1.0;
}

const NEUTRAL_RHYTHM = 75; // Score corpus moyen pour prose littéraire de qualité

// Appliquer à la fin du calcul, AVANT le return :
const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
const conf = rhythmConfidence(wordCount);
const adjustedScore = conf * score + (1 - conf) * NEUTRAL_RHYTHM;
score = Math.max(0, Math.min(100, adjustedScore));
```

Le `prose` est déjà disponible dans la fonction `scoreRhythm`.

### EXACTEMENT ce qui change dans le code

1. Ajouter la fonction `rhythmConfidence(wordCount)` dans le même fichier
2. Ajouter la constante `NEUTRAL_RHYTHM = 75`
3. Après le calcul du `score` (après toutes les composantes 1-6), avant le `Math.max(0, Math.min(100, score))` final, appliquer :
   ```typescript
   // R3 Confidence Scaling — atténuation pour textes courts
   const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
   const conf = rhythmConfidence(wordCount);
   score = conf * score + (1 - conf) * NEUTRAL_RHYTHM;
   ```
4. Ajouter `conf` dans le `details` string pour traçabilité :
   ```typescript
   const details = `CV_sent=${sentenceCV.toFixed(2)}, ... conf_r3=${conf.toFixed(2)}`;
   ```

### NE PAS MODIFIER

- Le peak CV (0.75) — il reste correct
- La zone optimale [0.30, 1.30] — elle reste telle quelle
- Les autres sous-scores de RCI (signature, hook, euphony, voice_conformity)
- Les autres axes (ECC, SII, IFI, AAI)
- Tout autre fichier que rhythm.ts

### Créer le script de rescoring à froid

Créer `scripts/rescore-vatomic-cold.ts` qui :

1. Charge les 5 textes de briques depuis `sessions/VATOMIC_*/brick_*.txt`
   (ou depuis le dernier dossier VATOMIC_*)
2. Pour chaque brique, reconstruit un ForgePacket minimal (comme dans test-vrecal1-b0-pilot.ts)
3. Calcule les 5 macro-axes avec computeECC/RCI/SII/IFI/AAI
4. Calcule le MacroSScore
5. Affiche AVANT (scores originaux de VATOMIC_RESULTS.json) et APRÈS (nouveaux scores)
6. Sauvegarde dans `VATOMIC_RESCORED_A.json`

IMPORTANT : Le rescoring utilise le dummyProvider avec les mêmes fallbacks CALC
que le script B0 pilot SAUF pour les axes qui ont déjà des scores LLM.
En fait, puisqu'on ne peut pas rescorer les juges LLM à froid sans API,
on ne rescore QUE le rhythm (CALC pur) et on recalcule le RCI et le composite.

Approche simplifiée :
- Lire les scores originaux de VATOMIC_RESULTS.json
- Pour chaque brique, relire le texte et recalculer UNIQUEMENT le score rhythm
- Recalculer RCI avec le nouveau rhythm
- Recalculer le composite avec les autres axes inchangés
- Comparer avant/après

### Tests

Ajouter dans `tests/generation/chunked-generator.test.ts` ou un nouveau fichier :

```
it('rhythmConfidence retourne 1.0 pour wordCount >= 3000')
it('rhythmConfidence retourne 0.65 pour wordCount = 300')
it('rhythmConfidence retourne ~0.80 pour wordCount = 600')
it('rhythmConfidence retourne 0.30 pour wordCount <= 100')
it('rhythmConfidence interpole entre les points R3')
it('le score rhythm est atténué vers 75 pour textes courts')
it('le score rhythm est inchangé pour textes >= 3000 mots')
```

### Commit

```
feat(rci): R3 confidence scaling sur rhythm pour textes courts

Phase R3 a mesuré confidence(f1a, n_words) sur 181 œuvres.
Sur des briques de 400-600w, le CV est statistiquement volatile.
Le scorer rhythm punissait cette volatilité au lieu de la qualité.

Correction : atténuation vers score neutre (75) proportionnelle
à la confiance R3. Formule : score = conf × raw + (1-conf) × 75

Points d'ancrage R3 : 300w→0.65, 600w→0.80, 1500w→0.95, 3000w→1.0
Aucun changement sur le peak CV (0.75) ni la zone optimale.

Script rescore-vatomic-cold.ts pour validation à froid (0 API).
Tests: rhythmConfidence + atténuation vérifiés.
```

### Vérification

1. `npm test` → tous les tests existants GREEN + nouveaux tests
2. `npx tsc --noEmit` → 0 erreurs
3. `npx tsx scripts/rescore-vatomic-cold.ts` → affiche les scores avant/après

## BUDGET

- 0 API — tout est CALC
- Modification d'un seul fichier (rhythm.ts) + 1 script + quelques tests
