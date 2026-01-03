# CNC-201 — CANON_ENGINE

## Métadonnées

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-201 |
| **Nom** | CANON_ENGINE |
| **Statut** | 🟢 IMPLEMENTED |
| **Type** | Source de Vérité Unique |
| **Module** | gateway/src/gates/canon_engine.ts |
| **Tests** | gateway/tests/canon_engine.test.ts (30 tests) |
| **Date création** | 2026-01-03 |
| **Phase** | 7B |
| **Auteur** | Claude + Francky |

## Description

CANON_ENGINE est la **source de vérité unique** du système OMEGA.

> "TRUTH sans CANON = police sans code pénal"

Le Canon est la LOI. Tout fait établi est immuable.

## Principes

| Principe | Description |
|----------|-------------|
| **Append-only** | On ajoute, on n'écrase jamais |
| **Immutable** | Chaque canon retourné est une nouvelle instance |
| **Versionné** | Chaque modification incrémente la version |
| **Traçable** | Historique complet de toutes les actions |
| **Verrouillable** | Un canon peut être figé définitivement |

## Invariants

| ID | Description | Tests |
|----|-------------|-------|
| INV-CANON-01 | Source unique (un seul canon actif) | ✅ 2 tests |
| INV-CANON-02 | Pas d'écrasement silencieux | ✅ 3 tests |
| INV-CANON-03 | Historicité obligatoire | ✅ 4 tests |
| INV-CANON-04 | Hash Merkle stable | ✅ 4 tests |
| INV-CANON-05 | Conflit = exception explicite | ✅ 5 tests |

## Erreurs

| Code | Description |
|------|-------------|
| DUPLICATE_FACT | Fait déjà existant |
| CONFLICT_DETECTED | Contradiction avec fait existant |
| INVALID_FACT | Fait malformé |
| VERSION_MISMATCH | Tentative de modifier ancienne version |
| ROLLBACK_FORBIDDEN | Rollback sans autorisation |
| CANON_LOCKED | Canon verrouillé |

## API
```typescript
const engine = createCanonEngine();

// Créer un canon vide
let canon = engine.create();

// Ajouter un fait
canon = engine.addFact(canon, {
  type: "CHARACTER",
  subject: "Marie",
  predicate: "protagoniste",
  establishedAt: "chapter-1",
  confidence: 1.0
});

// Vérifier un conflit
const conflict = engine.checkConflict(canon, "Marie", "morte");

// Verrouiller le canon
engine.lock(canon);

// Vérifier l'intégrité
const isValid = engine.verify(canon);
```

## Intégration avec TRUTH_GATE
```
   ┌─────────────────┐
   │  CANON_ENGINE   │ ← Source de vérité
   │                 │
   │  facts[]        │
   │  rootHash       │
   │  version        │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │   TRUTH_GATE    │ ← Juge de vérité
   │                 │
   │  Vérifie contre │
   │  le canon       │
   └─────────────────┘
```

## Liens

- CNC-200: TRUTH_GATE (consommateur du canon)
- CNC-100: THE_SKEPTIC (triggers de violation)
- Phase 7C: EMOTION_GATE

---

**Document CNC-201 — Version 1.0 — Phase 7B**
