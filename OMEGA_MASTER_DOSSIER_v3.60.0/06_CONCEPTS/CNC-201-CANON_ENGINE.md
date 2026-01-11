# ═══════════════════════════════════════════════════════════════════════════════
# CNC-201 — CANON_ENGINE
# "Le Code Pénal" — Source de Vérité Narrative
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 FICHE D'IDENTITÉ

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-201 |
| **Nom** | CANON_ENGINE |
| **Surnom** | "Le Code Pénal" |
| **Type** | Engine (Moteur de stockage) |
| **Phase** | 7B |
| **Version** | v3.5.0-CANON_ENGINE |
| **Tag Git** | v3.5.0-CANON_ENGINE |
| **Commit** | 3ced455 |
| **Tests** | 30 |
| **Invariants** | 5 |

---

## 🎯 MISSION

CANON_ENGINE est le **gardien de la vérité narrative**. Il stocke de manière append-only, immuable et versionnée tous les faits établis du récit.

### Rôle dans l'Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   CANON_LAYER  →  TRUTH_GATE  →  CANON_ENGINE  →  EMOTION_GATE  →  RIPPLE    ║
║                                       ↑                                       ║
║                               VOUS ÊTES ICI                                   ║
║                               Position: 3/5                                   ║
║                               Autorité: LÉGISLATEUR                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔐 INVARIANTS (5)

| ID | Description | Criticité | Preuve |
|----|-------------|-----------|--------|
| **INV-CANON-01** | Source unique (un seul canon actif) | CRITICAL | 2 tests |
| **INV-CANON-02** | Pas d'écrasement silencieux | CRITICAL | 3 tests |
| **INV-CANON-03** | Historicité obligatoire | HIGH | 4 tests |
| **INV-CANON-04** | Hash Merkle stable | CRITICAL | 4 tests |
| **INV-CANON-05** | Conflit = exception explicite | HIGH | 5 tests |

---

## 📜 PRINCIPES FONDAMENTAUX

### 1. Append-Only

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ❌ INTERDIT: Modifier un fait existant                                      ║
║   ❌ INTERDIT: Supprimer un fait                                              ║
║   ✅ AUTORISÉ: Ajouter un nouveau fait                                        ║
║   ✅ AUTORISÉ: Ajouter une correction (nouveau fait qui amende)               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 2. Versionnement

Chaque fait a un numéro de version auto-incrémenté:

```typescript
interface CanonFact {
  id: string;
  version: number;        // Auto-incrémenté
  content: string;
  timestamp: number;
  hash: string;           // SHA256
  previousHash: string;   // Chaîne Merkle
}
```

### 3. Chaîne Merkle

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ Fait 1 │────▶│ Fait 2 │────▶│ Fait 3 │────▶│ Fait 4 │
│ v1     │     │ v2     │     │ v3     │     │ v4     │
│ hash:A │     │ hash:B │     │ hash:C │     │ hash:D │
│ prev:∅ │     │ prev:A │     │ prev:B │     │ prev:C │
└────────┘     └────────┘     └────────┘     └────────┘
```

---

## ⚠️ CODES D'ERREUR

| Code | Description | Action |
|------|-------------|--------|
| `DUPLICATE_FACT` | Fait déjà existant (idempotence) | Ignorer silencieusement |
| `CONFLICT_DETECTED` | Conflit avec fait existant | Exception |
| `INVALID_FACT` | Fait malformé | Exception |
| `VERSION_MISMATCH` | Version incohérente | Exception |
| `ROLLBACK_FORBIDDEN` | Tentative de rollback | Exception |
| `CANON_LOCKED` | Canon en lecture seule | Exception |

---

## 💻 INTERFACE TYPESCRIPT

```typescript
interface CanonEngine {
  // Lecture
  getFact(id: string): CanonFact | null;
  getFactAtVersion(id: string, version: number): CanonFact | null;
  getAllFacts(): CanonFact[];
  getHistory(id: string): CanonFact[];
  
  // Écriture (append-only)
  addFact(content: string, metadata?: FactMetadata): CanonFact;
  amendFact(id: string, amendment: string): CanonFact;
  
  // Intégrité
  verifyChain(): boolean;
  getRootHash(): string;
  exportSnapshot(): CanonSnapshot;
}

// Usage
const canon = new CanonEngine();
canon.addFact('Alice est la protagoniste');
canon.addFact('Alice a 25 ans');

// Tentative de modification = ERREUR
canon.modifyFact('fact-1', 'Alice a 30 ans'); 
// → Error: ROLLBACK_FORBIDDEN
```

---

## 📊 EXEMPLE DE CHAÎNE

```typescript
// État initial
const facts = [
  { id: 'fact-1', content: 'Alice existe', version: 1, hash: 'abc...' },
  { id: 'fact-2', content: 'Alice a 25 ans', version: 2, hash: 'def...', prev: 'abc...' },
  { id: 'fact-3', content: 'Alice vit à Paris', version: 3, hash: 'ghi...', prev: 'def...' },
];

// Vérification d'intégrité
const isValid = canon.verifyChain(); // true

// Tentative de falsification
facts[1].content = 'Alice a 30 ans';
const isStillValid = canon.verifyChain(); // false - chaîne corrompue
```

---

## 🔗 DÉPENDANCES

### Reçoit de:
- **TRUTH_GATE**: Les assertions validées à stocker

### Transmet à:
- **EMOTION_GATE**: Les faits pour évaluation émotionnelle
- **RIPPLE_ENGINE**: Les faits pour propagation

---

## 🔑 SHA256

```
37B05EA8386326AC3C0163929BBF43B28ABDAF624084AA52CE83E6EE6AB032E1
```

---

## 📚 RÉFÉRENCES

- Phase 7B Certification: `05_CERTIFICATIONS/CERTIFICATION_PHASE_7_COMPLETE.md`
- Invariants Registry: `03_INVARIANTS/INVARIANTS_REGISTRY.md`
- Architecture: `01_ARCHITECTURE/ARCHITECTURE_GLOBAL.md`

---

**FIN DU DOCUMENT CNC-201**

*Document Version: 1.0.0*
*Phase 7B — v3.5.0-CANON_ENGINE*
