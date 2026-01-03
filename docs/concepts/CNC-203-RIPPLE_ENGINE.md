# CNC-203 — RIPPLE_ENGINE

## Métadonnées

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-203 |
| **Nom** | RIPPLE_ENGINE |
| **Statut** | 🟢 IMPLEMENTED |
| **Type** | Engine / Propagation Narrative |
| **Module** | gateway/src/gates/ripple_engine.ts |
| **Tests** | gateway/tests/ripple_engine.test.ts (22 tests) |
| **Date création** | 2026-01-03 |
| **Phase** | 7D |
| **Auteur** | Claude + Francky |

## Description

RIPPLE_ENGINE gère la **propagation des conséquences narratives**.

> "Un événement crée des ondulations qui affectent le récit."

## Concept

Comme une pierre jetée dans l'eau, chaque événement narratif génère des "ripples" (ondulations) qui se propagent aux entités connectées avec une force décroissante.

## Invariants

| ID | Description | Tests |
|----|-------------|-------|
| INV-RIPPLE-01 | Propagation déterministe | ✅ 2 tests |
| INV-RIPPLE-02 | Atténuation obligatoire | ✅ 3 tests |
| INV-RIPPLE-03 | Pas de cycle infini | ✅ 3 tests |
| INV-RIPPLE-04 | Traçabilité complète | ✅ 3 tests |
| INV-RIPPLE-05 | Respect du canon | ✅ 3 tests |

## Types de Source

| Type | Description |
|------|-------------|
| FACT_ESTABLISHED | Nouveau fait dans le canon |
| EMOTION_SHIFT | Changement émotionnel |
| CHARACTER_ACTION | Action d'un personnage |
| WORLD_EVENT | Événement du monde |
| REVELATION | Révélation narrative |

## Types d'Impact

| Type | Description |
|------|-------------|
| EMOTIONAL | Impact émotionnel |
| RELATIONAL | Impact sur les relations |
| PHYSICAL | Impact physique/monde |
| KNOWLEDGE | Impact sur la connaissance |
| BEHAVIORAL | Impact sur le comportement |

## Atténuation
```
Force(depth) = initialStrength × (1 - attenuation)^depth

Exemple (attenuation = 0.3):
  Depth 0: 1.0 (100%)
  Depth 1: 0.7 (70%)
  Depth 2: 0.49 (49%)
  Depth 3: 0.343 (34%)
```

## Usage
```typescript
import { createRippleEngine } from "./gates";

const engine = createRippleEngine();

const source = {
  id: "event-1",
  type: "CHARACTER_ACTION",
  subject: "Marie",
  description: "Marie révèle le secret",
  initialStrength: 0.9,
  potentialTargets: [
    { id: "jean", type: "CHARACTER", name: "Jean" },
    { id: "pierre", type: "CHARACTER", name: "Pierre" }
  ],
  context: "chapter-5"
};

const graph = {
  connections: new Map([
    ["jean", [{ targetId: "alice", weight: 0.8, type: "KNOWS" }]],
    ["pierre", [{ targetId: "bob", weight: 0.6, type: "FAMILY" }]]
  ])
};

const result = engine.propagate(source, graph, {
  attenuation: 0.3,
  maxDepth: 5,
  minStrength: 0.05,
  blockers: ["isolated_character"]
});

console.log(`${result.ripples.length} ripples générés`);
console.log(`Profondeur atteinte: ${result.depthReached}`);
```

## Architecture Phase 7 Complète
```
   ┌─────────────────────────────────────┐
   │         CANON_ENGINE                │  ← SOURCE DE VÉRITÉ
   │           CNC-201                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │          TRUTH_GATE                 │  ← JUGE
   │           CNC-200                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │         EMOTION_GATE                │  ← ÉVALUATEUR
   │           CNC-202                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │        RIPPLE_ENGINE                │  ← PROPAGATEUR
   │           CNC-203                   │
   │                                     │
   │  • Propage les conséquences         │
   │  • Atténue avec la distance         │
   │  • Évite les cycles                 │
   │  • Trace la causalité               │
   └─────────────────────────────────────┘
```

## Liens

- CNC-200: TRUTH_GATE (valide avant propagation)
- CNC-201: CANON_ENGINE (source des faits)
- CNC-202: EMOTION_GATE (impacts émotionnels)

---

**Document CNC-203 — Version 1.0 — Phase 7D**
