# INV-BONUS : WEIGHT DIVERGENCE AUDIT
**Date** : 2026-04-02 | **Méthode** : Lecture manuelle de 3 fichiers

---

## TABLEAU COMPARATIF EXACT

| Source | Fichier:Ligne | ECC | RCI | SII | IFI | AAI | Somme |
|--------|-------------|-----|-----|-----|-----|-----|-------|
| **config.ts (PRODUCTION)** | config.ts:416-422 | **0.33** | **0.17** | **0.15** | **0.10** | **0.25** | **1.00** |
| **macro-axes.ts (doc)** | macro-axes.ts:9-13 | 0.33 | 0.17 | 0.15 | 0.10 | 0.25 | 1.00 |
| **weight-calibrator.ts (CALIBRATION)** | weight-calibrator.ts:68-74 | **0.30** | 0.17 | **0.18** | **0.15** | **0.20** | **1.00** |

## DIVERGENCES DÉTECTÉES

| Axe | config.ts | weight-calibrator.ts | Delta | Sévérité |
|-----|-----------|---------------------|-------|---------|
| ECC | 0.33 | 0.30 | **-0.03** | HAUTE |
| SII | 0.15 | 0.18 | **+0.03** | HAUTE |
| IFI | 0.10 | 0.15 | **+0.05** | HAUTE |
| AAI | 0.25 | 0.20 | **-0.05** | HAUTE |
| RCI | 0.17 | 0.17 | 0.00 | OK |

## ANALYSE

### Somme totale
- config.ts : 0.33 + 0.17 + 0.15 + 0.10 + 0.25 = **1.00** ✓
- weight-calibrator.ts : 0.30 + 0.17 + 0.18 + 0.15 + 0.20 = **1.00** ✓

Les deux somment à 1.00, donc pas de bug arithmétique. Mais les **valeurs diffèrent sur 4 axes sur 5**.

### Impact
Le weight-calibrator.ts déclare ses poids comme `DEFAULT_MACRO_WEIGHTS` et les commente "From current SOVEREIGN_CONFIG" (ligne 67). Ceci est **FAUX** — les valeurs ne correspondent PAS au SOVEREIGN_CONFIG actuel.

Si le calibrateur est exécuté avec ces defaults, il ajustera les poids à partir d'une baseline incorrecte.

### Qui a autorité ?
- **config.ts** = PRODUCTION (utilisé par macro-axes.ts via SOVEREIGN_CONFIG). C'est la **SSOT**.
- **weight-calibrator.ts** = Outil de calibration. Ses defaults sont des **poids historiques** qui n'ont pas été mis à jour après Sprint 11 (ajout AAI à 25%).
- **macro-axes.ts** = Documentaire (le commentaire header est concordant avec config.ts)

## VERDICT

**SSOT VIOLATION** — weight-calibrator.ts:68-74 contient des poids obsolètes qui ne reflètent pas la configuration de production.

### Correction recommandée
```typescript
// weight-calibrator.ts — mettre à jour pour refléter config.ts
export const DEFAULT_MACRO_WEIGHTS: readonly WeightConfig[] = [
  { axis: 'ecc', weight: 0.33 },  // was 0.30
  { axis: 'rci', weight: 0.17 },  // unchanged
  { axis: 'sii', weight: 0.15 },  // was 0.18
  { axis: 'ifi', weight: 0.10 },  // was 0.15
  { axis: 'aai', weight: 0.25 },  // was 0.20
];
```

Ou mieux : importer directement depuis config.ts pour éliminer la duplication.

---

*repo_live_confirmed: true — poids extraits manuellement des 3 fichiers*
