# CNC-202 — EMOTION_GATE

## Métadonnées

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-202 |
| **Nom** | EMOTION_GATE |
| **Statut** | 🟢 IMPLEMENTED |
| **Type** | Gate / Validation Émotionnelle |
| **Module** | gateway/src/gates/emotion_gate.ts |
| **Tests** | gateway/tests/emotion_gate.test.ts (23 tests) |
| **Date création** | 2026-01-03 |
| **Phase** | 7C |
| **Auteur** | Claude + Francky |

## Description

EMOTION_GATE évalue la **cohérence émotionnelle** des personnages.

> "L'émotion est SOUMISE au duo CANON + TRUTH — elle ne modifie JAMAIS le réel."

## Règle Fondamentale
```
CANON définit le réel      → SOUVERAIN
TRUTH juge le réel         → SOUVERAIN  
EMOTION évalue le ressenti → SOUMISE
```

## Invariants

| ID | Description | Tests |
|----|-------------|-------|
| INV-EMO-01 | Ne crée jamais de fait (read-only) | ✅ 2 tests |
| INV-EMO-02 | Ne contredit jamais le canon | ✅ 3 tests |
| INV-EMO-03 | Cohérence émotionnelle obligatoire | ✅ 3 tests |
| INV-EMO-04 | Dette émotionnelle traçable | ✅ 3 tests |
| INV-EMO-05 | Arc cassé = WARN ou FAIL | ✅ 3 tests |

## Émotions de Base (Plutchik)

| Émotion | Opposé | Transitions naturelles |
|---------|--------|------------------------|
| joy | sadness | trust, anticipation, surprise |
| trust | disgust | joy, anticipation, fear |
| fear | anger | surprise, sadness, trust |
| surprise | anticipation | fear, joy, anticipation |
| sadness | joy | fear, disgust, anger |
| disgust | trust | anger, sadness, fear |
| anger | fear | disgust, anticipation, sadness |
| anticipation | surprise | joy, anger, trust |

## Violations Détectées

| Type | Sévérité | Description |
|------|----------|-------------|
| OUT_OF_CHARACTER | 7 | Réaction hors caractère |
| INTENSITY_UNJUSTIFIED | 5 | Saut d'intensité non justifié |
| ARC_BROKEN | 6 | Arc émotionnel cassé |
| EMOTION_CONTRADICTION | 9 | Contredit le canon |
| MISSING_TRANSITION | 4 | Transition directe entre opposés |
| DEBT_OVERFLOW | 6 | Dette émotionnelle excessive |

## Dette Émotionnelle

- Coût de transition : 0 (même) → 0.3 (naturelle) → 0.6 (neutre) → 1.0 (opposée)
- Decay naturel : -0.1 par état
- Seuil par défaut : 0.7

## Usage
```typescript
import { createEmotionGate } from "./gates";

const gate = createEmotionGate();
const result = await gate.execute({
  text: "Marie sourit.",
  characterId: "marie",
  characterName: "Marie",
  detectedState: { emotion: "joy", intensity: 0.7 },
  existingArc: previousArc,
  canon: currentCanon,
  debtThreshold: 0.7,
  strictMode: false
});

if (result.verdict.status === "FAIL") {
  console.error("Incohérence émotionnelle:", result.verdict.violations);
}
```

## Architecture Complète Phase 7
```
   ┌─────────────────────────────────────┐
   │         CANON_ENGINE                │
   │    (Source de Vérité Unique)        │
   │           CNC-201                   │
   └──────────────┬──────────────────────┘
                  │
                  │ alimente
                  ▼
   ┌─────────────────────────────────────┐
   │          TRUTH_GATE                 │
   │     (Barrière de Vérité)            │
   │           CNC-200                   │
   └──────────────┬──────────────────────┘
                  │
                  │ contraint
                  ▼
   ┌─────────────────────────────────────┐
   │         EMOTION_GATE                │
   │    (Validation Émotionnelle)        │
   │           CNC-202                   │
   │                                     │
   │  • Ne modifie RIEN                  │
   │  • Évalue seulement                 │
   │  • SOUMISE au canon                 │
   └─────────────────────────────────────┘
```

## Liens

- CNC-200: TRUTH_GATE (souverain)
- CNC-201: CANON_ENGINE (souverain)
- CNC-100: THE_SKEPTIC (triggers partagés)
- Phase 7D: RIPPLE_ENGINE

---

**Document CNC-202 — Version 1.0 — Phase 7C**
