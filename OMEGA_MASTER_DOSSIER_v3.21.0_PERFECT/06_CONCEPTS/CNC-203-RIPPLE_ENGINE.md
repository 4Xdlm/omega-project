# ═══════════════════════════════════════════════════════════════════════════════
# CNC-203 — RIPPLE_ENGINE
# "L'Effet Papillon" — Propagation Causale Déterministe
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 FICHE D'IDENTITÉ

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-203 |
| **Nom** | RIPPLE_ENGINE |
| **Surnom** | "L'Effet Papillon" |
| **Type** | Engine (Propagateur) |
| **Phase** | 7D |
| **Version** | v3.7.0-RIPPLE_ENGINE |
| **Tag Git** | v3.7.0-RIPPLE_ENGINE |
| **Commit** | 3c0218c |
| **Tests** | 22 |
| **Invariants** | 5 |

---

## 🎯 MISSION

RIPPLE_ENGINE est le **propagateur de conséquences**. Il calcule et propage les effets narratifs de chaque événement de manière déterministe et traçable.

### Rôle dans l'Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   CANON_LAYER  →  TRUTH_GATE  →  CANON_ENGINE  →  EMOTION_GATE  →  RIPPLE    ║
║                                                                       ↑       ║
║                                                               VOUS ÊTES ICI   ║
║                                                               Position: 5/5   ║
║                                                               Autorité: RÉACTEUR║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## ⚖️ HIÉRARCHIE D'AUTORITÉ

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   CANON > TRUTH > EMOTION > RIPPLE                                            ║
║                                                                               ║
║   RIPPLE_ENGINE est le DERNIER maillon de la chaîne.                          ║
║   Il réagit aux changements mais NE PEUT PAS les initier                      ║
║   sans source validée par les couches supérieures.                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔐 INVARIANTS (5)

| ID | Description | Criticité | Preuve |
|----|-------------|-----------|--------|
| **INV-RIPPLE-01** | Propagation explicite | HIGH | Tests |
| **INV-RIPPLE-02** | Pas d'effet sans cause | CRITICAL | Tests |
| **INV-RIPPLE-03** | Cascade traçable | HIGH | Tests |
| **INV-RIPPLE-04** | Profondeur limitée (soft limit) | MEDIUM | Tests |
| **INV-RIPPLE-05** | Déterminisme | CRITICAL | Tests |

---

## 🌊 MODÈLE DE PROPAGATION

### Cascade Simple

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ÉVÉNEMENT SOURCE                                                          │
│   "Alice découvre le secret de Bob"                                         │
│         │                                                                   │
│         ▼                                                                   │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │ RIPPLE 1: Confiance Alice→Bob diminue (-0.4)                    │       │
│   │ Depth: 1                                                         │       │
│   └────────────────────────────┬────────────────────────────────────┘       │
│                                │                                            │
│         ┌──────────────────────┼──────────────────────┐                     │
│         ▼                      ▼                      ▼                     │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│   │ RIPPLE 2a:    │    │ RIPPLE 2b:    │    │ RIPPLE 2c:    │              │
│   │ Alice évite   │    │ Tension       │    │ Communication │              │
│   │ Bob (scènes)  │    │ narrative ↑   │    │ brisée        │              │
│   │ Depth: 2      │    │ Depth: 2      │    │ Depth: 2      │              │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Limite de Profondeur

```typescript
const DEFAULT_MAX_DEPTH = 5;  // Soft limit
const HARD_MAX_DEPTH = 10;    // Hard limit absolu

// Au-delà, RIPPLE_ENGINE signale mais ne propage plus
```

---

## 💻 INTERFACE TYPESCRIPT

```typescript
interface RippleEvent {
  id: string;
  source: string;           // ID de l'événement source
  type: RippleType;
  depth: number;
  effects: Effect[];
  trace: RippleTrace;
}

interface RippleTrace {
  chain: string[];          // [source, ripple1, ripple2, ...]
  hashes: string[];         // SHA256 de chaque étape
  deterministic: boolean;
}

interface RippleEngine {
  // Propagation
  propagate(event: CanonFact): RippleEvent[];
  
  // Traçage
  getTrace(rippleId: string): RippleTrace;
  replayFrom(eventId: string): RippleEvent[];
  
  // Configuration
  setMaxDepth(depth: number): void;
  
  // Validation
  verifyDeterminism(event: CanonFact, runs: number): boolean;
}

// Usage
const ripples = rippleEngine.propagate(event);
for (const ripple of ripples) {
  console.log(`Depth ${ripple.depth}: ${ripple.effects.length} effets`);
}
```

---

## 📊 EXEMPLE DE CASCADE

```typescript
// Événement source
const event = canon.add({
  content: 'Alice découvre que Bob a menti sur son passé'
});

// Propagation automatique
const ripples = rippleEngine.propagate(event);

// Résultat
[
  {
    depth: 1,
    effects: [
      { type: 'TRUST_CHANGE', target: 'Alice→Bob', delta: -0.6 }
    ]
  },
  {
    depth: 2,
    effects: [
      { type: 'BEHAVIOR_CHANGE', target: 'Alice', effect: 'évite Bob' },
      { type: 'NARRATIVE_TENSION', delta: +0.3 }
    ]
  },
  {
    depth: 3,
    effects: [
      { type: 'RELATIONSHIP_STATUS', pair: 'Alice-Bob', status: 'strained' }
    ]
  }
]

// Vérification déterminisme
const isDeterministic = rippleEngine.verifyDeterminism(event, 100);
// → true (100 exécutions = mêmes résultats)
```

---

## ⚠️ TYPES D'EFFETS

| Type | Description | Propagation |
|------|-------------|-------------|
| `TRUST_CHANGE` | Modification niveau de confiance | Peut déclencher BEHAVIOR_CHANGE |
| `BEHAVIOR_CHANGE` | Changement de comportement | Peut déclencher d'autres effets |
| `NARRATIVE_TENSION` | Modification tension narrative | Terminal |
| `RELATIONSHIP_STATUS` | Modification statut relation | Peut déclencher d'autres effets |
| `KNOWLEDGE_SPREAD` | Diffusion d'information | Peut déclencher TRUST_CHANGE |
| `EMOTIONAL_SHIFT` | Changement émotionnel | Retour à EMOTION_GATE |

---

## 🔗 DÉPENDANCES

### Reçoit de:
- **CANON_ENGINE**: Les nouveaux faits à propager
- **EMOTION_GATE**: Les évaluations émotionnelles

### Transmet à:
- **MEMORY_LAYER**: Les effets pour stockage
- **RAPPORT**: Les cascades complètes

---

## 🔑 SHA256

```
C0FD01BD638D48ECB006A1DD093662FEEBE4795DA5B9D3960DED694356E1484B
```

---

## 📚 RÉFÉRENCES

- Phase 7D Certification: `05_CERTIFICATIONS/CERTIFICATION_PHASE_7_QUADRILOGY_FINAL.md`
- Invariants Registry: `03_INVARIANTS/INVARIANTS_REGISTRY.md`
- Architecture: `01_ARCHITECTURE/ARCHITECTURE_GLOBAL.md`

---

**FIN DU DOCUMENT CNC-203**

*Document Version: 1.0.0*
*Phase 7D — v3.7.0-RIPPLE_ENGINE*
