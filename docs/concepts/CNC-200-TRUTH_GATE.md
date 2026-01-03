# CNC-200 — TRUTH_GATE

## Métadonnées

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-200 |
| **Nom** | TRUTH_GATE |
| **Statut** | 🟢 IMPLEMENTED |
| **Type** | Gate / Barrière de Vérité |
| **Module** | gateway/src/gates/truth_gate.ts |
| **Tests** | gateway/tests/truth_gate.test.ts (22 tests) |
| **Date création** | 2026-01-03 |
| **Phase** | 7A |
| **Auteur** | Claude + Francky |

## Description

TRUTH_GATE est la **barrière de vérité** qui refuse toute incohérence narrative.

> "Un bon gate dit NON souvent."

## Fonctions

| Fonction | Description |
|----------|-------------|
| `detectContradictions` | Détecte les contradictions avec le canon |
| `detectCausalityBreaks` | Détecte les effets sans cause |
| `detectUnknownReferences` | Détecte les références non établies |
| `extractFacts` | Extrait les nouveaux faits (si PASS) |

## Verdicts

| Status | Signification |
|--------|---------------|
| **PASS** | Aucune violation détectée |
| **WARN** | Violations mineures (< threshold) |
| **FAIL** | Violations bloquantes ou contradiction |

## Invariants

| ID | Description | Test |
|----|-------------|------|
| INV-TRUTH-01 | Contradiction = FAIL obligatoire | ✅ 4 tests |
| INV-TRUTH-02 | Causalité stricte (effet sans cause) | ✅ 4 tests |
| INV-TRUTH-03 | Référence inconnue = FAIL (strict) | ✅ 3 tests |
| INV-TRUTH-04 | Déterminisme (même input = même output) | ✅ 2 tests |

## Violations détectées

| Type | Sévérité | Description |
|------|----------|-------------|
| CONTRADICTION | 10 | Contredit un fait établi |
| CAUSALITY_BREAK | 6 | Effet sans cause |
| DEUS_EX_MACHINA | 7 | Solution miracle |
| UNKNOWN_REFERENCE | 5 | Référence non établie |
| TIMELINE_ERROR | 8 | Erreur chronologique |
| PLOT_ARMOR | 7 | Immunité narrative |

## Usage
```typescript
import { createTruthGate } from "./gates";

const gate = createTruthGate();
const result = await gate.execute({
  text: "Marie entra dans la pièce.",
  canon: currentCanon,
  strictMode: true,
  severityThreshold: 7
});

if (result.verdict.status === "FAIL") {
  console.error("Violations:", result.verdict.violations);
}
```

## Liens

- CNC-100: THE_SKEPTIC (utilise ses triggers)
- CNC-201: CANON_ENGINE (source de vérité)
- Phase 7B: EMOTION_GATE

---

**Document CNC-200 — Version 1.0 — Phase 7A**
