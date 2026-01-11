# ═══════════════════════════════════════════════════════════════════════════════
# CNC-200 — TRUTH_GATE
# "La Police" — Barrière de Vérité Narrative
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 FICHE D'IDENTITÉ

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-200 |
| **Nom** | TRUTH_GATE |
| **Surnom** | "La Police" |
| **Type** | Gate (Barrière de validation) |
| **Phase** | 7A |
| **Version** | v3.4.0-TRUTH_GATE |
| **Tag Git** | v3.4.0-TRUTH_GATE |
| **Commit** | 859f79f |
| **Tests** | 22 |
| **Invariants** | 4 |

---

## 🎯 MISSION

TRUTH_GATE est le **gardien de la cohérence narrative**. Il juge toute nouvelle assertion contre le canon établi et refuse catégoriquement toute contradiction.

### Rôle dans l'Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   CANON_LAYER  →  TRUTH_GATE  →  CANON_ENGINE  →  EMOTION_GATE  →  RIPPLE    ║
║                       ↑                                                       ║
║               VOUS ÊTES ICI                                                   ║
║               Position: 2/5                                                   ║
║               Autorité: JUGE                                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔐 INVARIANTS (4)

| ID | Description | Criticité | Preuve |
|----|-------------|-----------|--------|
| **INV-TRUTH-01** | Contradiction détectée = FAIL obligatoire | CRITICAL | 4 tests |
| **INV-TRUTH-02** | Causalité stricte (effet sans cause = FAIL) | HIGH | 4 tests |
| **INV-TRUTH-03** | Référence inconnue = FAIL (mode strict) | HIGH | 3 tests |
| **INV-TRUTH-04** | Déterminisme (même input = même output) | CRITICAL | 2 tests |

---

## ⚠️ VIOLATIONS DÉTECTÉES

TRUTH_GATE peut détecter et signaler les violations suivantes:

| Code | Description | Sévérité |
|------|-------------|----------|
| `CONTRADICTION` | Assertion contredit un fait établi | 🔴 CRITICAL |
| `CAUSALITY_BREAK` | Effet sans cause identifiable | 🔴 CRITICAL |
| `DEUS_EX_MACHINA` | Résolution magique non préparée | 🟠 HIGH |
| `UNKNOWN_REFERENCE` | Référence à entité inconnue | 🟠 HIGH |
| `TIMELINE_ERROR` | Incohérence temporelle | 🔴 CRITICAL |
| `CHARACTER_INCONSISTENCY` | Comportement hors caractère | 🟡 MEDIUM |
| `PHYSICS_VIOLATION` | Violation des règles du monde | 🟠 HIGH |
| `PLOT_ARMOR` | Protection narrative injustifiée | 🟡 MEDIUM |
| `CANON_CONFLICT` | Conflit avec le canon établi | 🔴 CRITICAL |

---

## 🔄 FLUX DE VALIDATION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   NOUVELLE ASSERTION                                                        │
│         │                                                                   │
│         ▼                                                                   │
│   ┌─────────────┐                                                           │
│   │ TRUTH_GATE  │                                                           │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│   ┌──────┴──────┐                                                           │
│   │             │                                                           │
│   ▼             ▼                                                           │
│ ┌────┐       ┌──────┐                                                       │
│ │PASS│       │ FAIL │                                                       │
│ └──┬─┘       └──┬───┘                                                       │
│    │            │                                                           │
│    ▼            ▼                                                           │
│ CANON_ENGINE  REJET + RAPPORT                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 INTERFACE TYPESCRIPT

```typescript
interface TruthGateResult {
  status: 'PASS' | 'FAIL' | 'WARN';
  violations: TruthViolation[];
  confidence: number;  // 0-1
  deterministic: boolean;
}

interface TruthViolation {
  type: ViolationType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source: CanonReference;
  conflict: CanonReference | null;
  message: string;
  suggestion?: string;
}

// Usage
const result = truthGate.validate(assertion, canon);
if (result.status === 'FAIL') {
  // Rejet obligatoire
  throw new TruthViolationError(result.violations);
}
```

---

## 📊 EXEMPLES D'UTILISATION

### Exemple 1: Contradiction Détectée

```typescript
// Canon établi
canon.add({ id: 'fact-1', content: 'Alice a les yeux bleus' });

// Nouvelle assertion
const assertion = { content: 'Alice a les yeux verts' };

// Validation
const result = truthGate.validate(assertion, canon);
// → FAIL: CONTRADICTION detected
// → "Alice a les yeux verts" contredit "Alice a les yeux bleus"
```

### Exemple 2: Causalité Brisée

```typescript
// Canon: Aucune mention de richesse pour Bob
const assertion = { content: 'Bob achète une Ferrari' };

// Validation
const result = truthGate.validate(assertion, canon);
// → FAIL: CAUSALITY_BREAK
// → "Bob achète une Ferrari" sans source de revenus établie
```

---

## 🔗 DÉPENDANCES

### Reçoit de:
- **CANON_LAYER**: Les faits établis à valider contre

### Transmet à:
- **CANON_ENGINE**: Les assertions validées (PASS)
- **RAPPORT**: Les violations détectées (FAIL)

---

## 🔑 SHA256

```
7C3C29EE7FAF407A030B96FBBD8FDDB3B9AF257E13CC8D1AFB598AAD01D2D71B
```

---

## 📚 RÉFÉRENCES

- Phase 7A Certification: `05_CERTIFICATIONS/CERTIFICATION_PHASE_7A_TRUTH_GATE.md`
- Invariants Registry: `03_INVARIANTS/INVARIANTS_REGISTRY.md`
- Architecture: `01_ARCHITECTURE/ARCHITECTURE_GLOBAL.md`

---

**FIN DU DOCUMENT CNC-200**

*Document Version: 1.0.0*
*Phase 7A — v3.4.0-TRUTH_GATE*
