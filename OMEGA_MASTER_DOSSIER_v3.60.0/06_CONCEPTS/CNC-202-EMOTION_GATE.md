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

## 🎭 MODÈLE ÉMOTIONNEL: PLUTCHIK

EMOTION_GATE utilise la roue des émotions de Plutchik:

```
                    ┌─────────────┐
                    │   JOIE      │
            ┌───────┴─────────────┴───────┐
            │                             │
      ┌─────┴─────┐               ┌───────┴─────┐
      │  CONFIANCE │               │ ANTICIPATION│
      └─────┬─────┘               └───────┬─────┘
            │                             │
┌───────────┴───┐                 ┌───────┴───────────┐
│     PEUR      │                 │     SURPRISE      │
└───────────┬───┘                 └───────┬───────────┘
            │                             │
      ┌─────┴─────┐               ┌───────┴─────┐
      │  COLÈRE   │               │   DÉGOÛT    │
      └─────┬─────┘               └───────┬─────┘
            │                             │
            └───────┬─────────────┬───────┘
                    │  TRISTESSE  │
                    └─────────────┘
```

### Paires Opposées

| Émotion | Opposé |
|---------|--------|
| joy | sadness |
| trust | disgust |
| fear | anger |
| surprise | anticipation |

---

## 📊 ÉVALUATION D'UN PERSONNAGE

```typescript
interface EmotionalState {
  character: string;
  emotions: EmotionVector;      // { joy: 0.7, fear: 0.2, ... }
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
