# ═══════════════════════════════════════════════════════════════════════════════
# CNC-202 — EMOTION_GATE
# "Le Psychologue" — Évaluateur Émotionnel Read-Only
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 FICHE D'IDENTITÉ

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-202 |
| **Nom** | EMOTION_GATE |
| **Surnom** | "Le Psychologue" |
| **Type** | Gate (Évaluateur read-only) |
| **Phase** | 7C |
| **Version** | v3.6.0-EMOTION_GATE |
| **Tag Git** | v3.6.0-EMOTION_GATE |
| **Commit** | 52bf21e |
| **Tests** | 23 |
| **Invariants** | 5 |

---

## 🎯 MISSION

EMOTION_GATE est le **psychologue du récit**. Il évalue la cohérence émotionnelle des personnages et des situations SANS JAMAIS modifier la réalité. Il est **SOUMIS** au CANON et à TRUTH.

### Rôle dans l'Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   CANON_LAYER  →  TRUTH_GATE  →  CANON_ENGINE  →  EMOTION_GATE  →  RIPPLE    ║
║                                                        ↑                      ║
║                                                VOUS ÊTES ICI                  ║
║                                                Position: 4/5                  ║
║                                                Autorité: CONSEILLER           ║
║                                                Mode: READ-ONLY                ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## ⚖️ HIÉRARCHIE D'AUTORITÉ

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   CANON > TRUTH > EMOTION                                                     ║
║                                                                               ║
║   • CANON définit ce qui EST                                                  ║
║   • TRUTH vérifie la cohérence                                                ║
║   • EMOTION évalue, mais NE MODIFIE PAS                                       ║
║                                                                               ║
║   EMOTION_GATE est SUBMISSIVE — il ne peut que lire et évaluer.               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔐 INVARIANTS (5)

| ID | Description | Criticité | Preuve |
|----|-------------|-----------|--------|
| **INV-EMO-01** | Ne crée jamais de fait (read-only) | CRITICAL | Tests |
| **INV-EMO-02** | Ne contredit jamais le canon | CRITICAL | Tests |
| **INV-EMO-03** | Cohérence émotionnelle obligatoire | HIGH | Tests |
| **INV-EMO-04** | Dette émotionnelle traçable | MEDIUM | Tests |
| **INV-EMO-05** | Arc cassé = WARN ou FAIL | HIGH | Tests |

---

## 🎭 MODÈLE ÉMOTIONNEL: EMOTION v2 (14 ÉMOTIONS)

EMOTION_GATE utilise le **modèle Emotion v2** développé spécifiquement pour OMEGA:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   EMOTION v2 — MODÈLE À 14 ÉMOTIONS                                           ║
║                                                                               ║
║   PRIMAIRES (8):                                                              ║
║   ┌─────────┬─────────┬─────────┬─────────┐                                  ║
║   │  JOIE   │ COLÈRE  │  PEUR   │TRISTESSE│                                  ║
║   ├─────────┼─────────┼─────────┼─────────┤                                  ║
║   │CONFIANCE│ DÉGOÛT  │SURPRISE │ANTICIP. │                                  ║
║   └─────────┴─────────┴─────────┴─────────┘                                  ║
║                                                                               ║
║   SECONDAIRES (6):                                                            ║
║   ┌─────────┬─────────┬─────────┐                                            ║
║   │  AMOUR  │  HONTE  │ FIERTÉ  │                                            ║
║   ├─────────┼─────────┼─────────┤                                            ║
║   │ ESPOIR  │ REGRET  │NOSTALGIE│                                            ║
║   └─────────┴─────────┴─────────┘                                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Liste Complète des 14 Émotions

| ID | Émotion | Type | Opposé | Intensité Max |
|----|---------|------|--------|---------------|
| E01 | joy | Primaire | sadness | 1.0 |
| E02 | anger | Primaire | fear | 1.0 |
| E03 | fear | Primaire | anger | 1.0 |
| E04 | sadness | Primaire | joy | 1.0 |
| E05 | trust | Primaire | disgust | 1.0 |
| E06 | disgust | Primaire | trust | 1.0 |
| E07 | surprise | Primaire | anticipation | 1.0 |
| E08 | anticipation | Primaire | surprise | 1.0 |
| E09 | love | Secondaire | hate (non modélisé) | 1.0 |
| E10 | shame | Secondaire | pride | 1.0 |
| E11 | pride | Secondaire | shame | 1.0 |
| E12 | hope | Secondaire | despair (non modélisé) | 1.0 |
| E13 | regret | Secondaire | contentment (non modélisé) | 1.0 |
| E14 | nostalgia | Secondaire | — | 1.0 |

### Formules de Calcul

```typescript
interface EmotionVector {
  // Primaires (obligatoires)
  joy: number;        // 0.0 - 1.0
  anger: number;
  fear: number;
  sadness: number;
  trust: number;
  disgust: number;
  surprise: number;
  anticipation: number;
  
  // Secondaires (optionnelles)
  love?: number;
  shame?: number;
  pride?: number;
  hope?: number;
  regret?: number;
  nostalgia?: number;
}

// Cohérence émotionnelle
function calculateCoherence(state: EmotionVector): number {
  // Les opposés ne peuvent pas être tous deux à haute intensité
  const conflicts = [
    Math.min(state.joy, state.sadness),
    Math.min(state.anger, state.fear),
    Math.min(state.trust, state.disgust),
    Math.min(state.surprise, state.anticipation),
    Math.min(state.shame ?? 0, state.pride ?? 0)
  ];
  const conflictScore = conflicts.reduce((a, b) => a + b, 0) / conflicts.length;
  return 1 - conflictScore; // 1.0 = parfaitement cohérent
}

// Intensité totale normalisée
function calculateIntensity(state: EmotionVector): number {
  const values = Object.values(state).filter(v => typeof v === 'number');
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

### Paires Opposées (Emotion v2)

| Émotion | Opposé |
|---------|--------|
| joy | sadness |
| trust | disgust |
| fear | anger |
| surprise | anticipation |
| shame | pride |

---

## 📊 ÉVALUATION D'UN PERSONNAGE

```typescript
interface EmotionalState {
  character: string;
  emotions: EmotionVector;      // 14 émotions (8 primaires + 6 secondaires)
  arc: EmotionalArc;            // Trajectoire émotionnelle
  debt: EmotionalDebt[];        // Promesses non résolues
  consistency: number;          // 0-1
}

interface EmotionalArc {
  start: EmotionVector;
  current: EmotionVector;
  projected: EmotionVector;
  coherence: number;            // 0-1
}
```

---

## ⚠️ TYPES D'ÉVALUATIONS

| Type | Description | Résultat |
|------|-------------|----------|
| `COHERENT` | Émotions cohérentes avec le contexte | ✅ PASS |
| `MINOR_INCONSISTENCY` | Légère incohérence acceptable | ⚠️ WARN |
| `MAJOR_INCONSISTENCY` | Incohérence significative | ⚠️ WARN |
| `ARC_BREAK` | Rupture d'arc émotionnel | 🔴 FAIL |
| `EMOTIONAL_DEBT_UNPAID` | Dette émotionnelle non résolue | ⚠️ WARN |

---

## 💻 INTERFACE TYPESCRIPT

```typescript
interface EmotionGate {
  // Évaluation (read-only)
  evaluate(character: string, context: CanonSnapshot): EmotionalState;
  checkConsistency(state: EmotionalState): ConsistencyReport;
  projectArc(character: string, events: CanonFact[]): EmotionalArc;
  
  // Analyse
  detectDebt(character: string): EmotionalDebt[];
  suggestResolution(debt: EmotionalDebt): Suggestion[];
  
  // INTERDIT
  // createFact(): void;     // ❌ N'EXISTE PAS
  // modifyCanon(): void;    // ❌ N'EXISTE PAS
}

// Usage
const state = emotionGate.evaluate('Alice', canon.snapshot());
if (state.consistency < 0.5) {
  console.warn('Incohérence émotionnelle détectée pour Alice');
}
```

---

## 📊 EXEMPLE D'ÉVALUATION

```typescript
// Canon établi
canon.add('Alice perd son emploi');
canon.add('Alice sourit joyeusement');

// Évaluation
const state = emotionGate.evaluate('Alice', canon);

// Résultat
{
  character: 'Alice',
  emotions: { joy: 0.1, sadness: 0.8, fear: 0.5 },
  consistency: 0.3,  // FAIBLE - incohérence détectée
  issues: [
    {
      type: 'MAJOR_INCONSISTENCY',
      message: 'Sourire joyeux incohérent après perte d'emploi',
      suggestion: 'Justifier le sourire (ironie, déni) ou modifier la réaction'
    }
  ]
}
```

---

## 🔗 DÉPENDANCES

### Reçoit de:
- **CANON_ENGINE**: Les faits pour évaluation

### Transmet à:
- **RIPPLE_ENGINE**: Les évaluations pour propagation
- **RAPPORT**: Les incohérences détectées

---

## 🔑 SHA256

```
2DABB6208689380DFDB6F07F70B22C3D9F910A463226F383C2A34489FDB384F1
```

---

## 📚 RÉFÉRENCES

- Phase 7C Certification: `05_CERTIFICATIONS/CERTIFICATION_PHASE_7_GATES_TRILOGY.md`
- Invariants Registry: `03_INVARIANTS/INVARIANTS_REGISTRY.md`
- Architecture: `01_ARCHITECTURE/ARCHITECTURE_GLOBAL.md`

---

**FIN DU DOCUMENT CNC-202**

*Document Version: 1.0.0*
*Phase 7C — v3.6.0-EMOTION_GATE*
