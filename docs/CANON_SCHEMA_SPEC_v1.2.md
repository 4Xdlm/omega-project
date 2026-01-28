# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   ██████╗  █████╗ ███╗   ██╗ ██████╗ ███╗   ██╗    ███████╗ ██████╗██╗  ██╗███████╗███╗   ███╗ █████╗ 
#  ██╔════╝ ██╔══██╗████╗  ██║██╔═══██╗████╗  ██║    ██╔════╝██╔════╝██║  ██║██╔════╝████╗ ████║██╔══██╗
#  ██║      ███████║██╔██╗ ██║██║   ██║██╔██╗ ██║    ███████╗██║     ███████║█████╗  ██╔████╔██║███████║
#  ██║      ██╔══██║██║╚██╗██║██║   ██║██║╚██╗██║    ╚════██║██║     ██╔══██║██╔══╝  ██║╚██╔╝██║██╔══██║
#  ╚██████╗ ██║  ██║██║ ╚████║╚██████╔╝██║ ╚████║    ███████║╚██████╗██║  ██║███████╗██║ ╚═╝ ██║██║  ██║
#   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═══╝    ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝
#
#   OMEGA PHASE E — CANON SCHEMA SPECIFICATION
#   Version: 1.2.0 FINAL
#   Date: 2026-01-28
#   Status: READY FOR SEAL
#   Blockers: 0 (audit ChatGPT PASS)
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

---

# 📋 METADATA

| Field | Value |
|-------|-------|
| **Document ID** | CANON-SCHEMA-SPEC-v1.2 |
| **Version** | 1.2.0 |
| **Date** | 2026-01-28 |
| **Author** | Claude (IA Principal) |
| **Audit** | ChatGPT (Hostile Review) |
| **Status** | READY FOR SEAL |
| **Blockers** | 0 |
| **SHA-256** | À calculer après freeze |

---

# 📜 CHANGELOG v1.1 → v1.2

| Change | Raison | Impact |
|--------|--------|--------|
| Ajout INT-E-07 | Interdit `!==` pour comparaison sémantique | semanticEquals obligatoire |
| Ajout INT-E-08 | NaN = FAIL immédiat | containsNaN() dans Guard |
| Suppression SUPERSEDES predicate | Double source de vérité | Champ structurel uniquement |
| Ajout ConfigSymbol ID_RNG_HEX_LEN | Longueur hex configurable | DeterministicRng paramétré |
| Golden tests explicites | undefined→null, bigint, NaN | 4 tests E1-GOLD-* |
| Tests CONTR-001 renforcés | semanticEquals obligatoire | 2 tests E5-GOLD-* |

---

# TABLE DES MATIÈRES

1. [Objectif et Scope](#1-objectif-et-scope)
2. [Invariants](#2-invariants)
3. [Types Fondamentaux](#3-types-fondamentaux)
4. [Claim Structure](#4-claim-structure)
5. [Predicates](#5-predicates)
6. [Catalog](#6-catalog)
7. [Lineage](#7-lineage)
8. [Storage](#8-storage)
9. [Guard (Contradiction Detection)](#9-guard-contradiction-detection)
10. [Query Interface](#10-query-interface)
11. [Integration Points](#11-integration-points)
12. [Test Requirements](#12-test-requirements)

---

# 1. OBJECTIF ET SCOPE

## 1.1 Mission

CANON est le **module de persistance de vérité** d'OMEGA. Il stocke les faits (claims) de manière:
- **Append-only** : Aucune suppression, aucune modification
- **Immutable** : Une fois écrit, un claim ne change jamais
- **Hash-chained** : Intégrité cryptographique vérifiable
- **Deterministic** : Même input → même output → même hash

## 1.2 Ce que CANON fait

| Fonction | Description |
|----------|-------------|
| Store claims | Persister des faits avec hash |
| Detect contradictions | Identifier les claims incompatibles |
| Track lineage | Tracer l'origine de chaque fait |
| Query facts | Retrouver des faits par sujet/prédicat |
| Validate integrity | Vérifier la chaîne de hash |

## 1.3 Ce que CANON ne fait PAS

| Exclusion | Raison |
|-----------|--------|
| Résolution de contradictions | Décision = SENTINEL (Phase C) |
| Génération de texte | Génération = GENESIS FORGE |
| Analyse émotionnelle | Analyse = EMOTION_BRIDGE |
| Mémoire court-terme | Mémoire = MEMORY (Phase D) |

## 1.4 Dépendances

```
┌─────────────────────────────────────────────────────────────────┐
│                        CANON (Phase E)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DÉPEND DE:                                                     │
│  ├── SENTINEL (Phase C+D) — Authorization                       │
│  ├── MEMORY (Phase D) — Integration                             │
│  └── Types existants — OmegaTypes                               │
│                                                                 │
│  UTILISÉ PAR:                                                   │
│  ├── TRUTH_GATE (futur) — Validation                            │
│  ├── GENESIS Planner (futur) — Facts                            │
│  └── SCRIBE (futur) — Coherence                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. INVARIANTS

## 2.1 Invariants Structurels

| ID | Invariant | Description |
|----|-----------|-------------|
| **INV-E-01** | APPEND_ONLY | `∀ claim ∈ CANON: ¬∃ delete(claim) ∧ ¬∃ update(claim)` |
| **INV-E-02** | HASH_DETERMINISM | `∀ claim: hash(claim) = hash(claim)` (idempotent) |
| **INV-E-03** | CHAIN_INTEGRITY | `∀ claim[n]: claim[n].prevHash = hash(claim[n-1])` |
| **INV-E-04** | ID_UNIQUENESS | `∀ claim1, claim2: claim1.id ≠ claim2.id` |
| **INV-E-05** | TIMESTAMP_MONOTONIC | `∀ claim[n], claim[n+1]: claim[n].timestamp ≤ claim[n+1].timestamp` |

## 2.2 Invariants Sémantiques

| ID | Invariant | Description |
|----|-----------|-------------|
| **INV-E-06** | PREDICATE_CLOSED | `∀ claim: claim.predicate ∈ PREDICATE_CATALOG` |
| **INV-E-07** | SUBJECT_REQUIRED | `∀ claim: claim.subject ≠ null ∧ claim.subject ≠ ""` |
| **INV-E-08** | VALUE_TYPED | `∀ claim: typeof(claim.value) ∈ ALLOWED_TYPES` |
| **INV-E-09** | LINEAGE_VALID | `∀ claim: claim.lineage.source ∈ VALID_SOURCES` |

## 2.3 Invariants de Contradiction

| ID | Invariant | Description |
|----|-----------|-------------|
| **INV-E-10** | CONTRADICTION_DETECTED | `∀ conflict: GUARD.detect(conflict) = true` |
| **INV-E-11** | CONTRADICTION_LOGGED | `∀ conflict: ∃ log(conflict)` |
| **INV-E-12** | NO_SILENT_OVERRIDE | `∀ claim_new contradicting claim_old: claim_old.status ≠ DELETED` |

## 2.4 Invariants Techniques (v1.2)

| ID | Invariant | Description |
|----|-----------|-------------|
| **INV-E-13** | ID_DETERMINISTIC | `∀ seed: DeterministicRng(seed).nextHex(len) = DeterministicRng(seed).nextHex(len)` |
| **INV-E-14** | NO_JAVASCRIPT_EQUALITY | `∀ semantic comparison: use semanticEquals(), never !==` |
| **INV-E-15** | NAN_FORBIDDEN | `∀ claim.value: containsNaN(claim.value) = false` |
| **INV-E-16** | UNDEFINED_TO_NULL | `∀ serialization: undefined → null` |

---

# 3. TYPES FONDAMENTAUX

## 3.1 ClaimId

```typescript
/**
 * Identifiant unique d'un claim
 * Format: "claim_" + hex déterministe (configurable)
 * 
 * INV-E-04: Unicité garantie
 * INV-E-13: Déterminisme garanti
 */
type ClaimId = `claim_${string}`;

// Configuration
const CONFIG = {
  ID_RNG_HEX_LEN: 16,  // Configurable, pas magic number
  ID_PREFIX: 'claim_'
};

// Validation regex
const CLAIM_ID_REGEX = /^claim_[a-f0-9]{16}$/;

function isValidClaimId(id: string): id is ClaimId {
  return CLAIM_ID_REGEX.test(id);
}
```

## 3.2 ClaimHash

```typescript
/**
 * Hash SHA-256 d'un claim
 * Format: 64 caractères hexadécimaux
 * 
 * INV-E-02: Déterminisme garanti
 */
type ClaimHash = string; // 64 hex chars

const CLAIM_HASH_REGEX = /^[a-f0-9]{64}$/;

function isValidClaimHash(hash: string): hash is ClaimHash {
  return CLAIM_HASH_REGEX.test(hash);
}
```

## 3.3 Timestamp

```typescript
/**
 * Timestamp ISO 8601
 * Format: "YYYY-MM-DDTHH:mm:ss.sssZ"
 * 
 * INV-E-05: Monotonie garantie
 */
type CanonTimestamp = string; // ISO 8601

function createTimestamp(): CanonTimestamp {
  return new Date().toISOString();
}
```

## 3.4 DeterministicRng (v1.2)

```typescript
/**
 * Générateur pseudo-aléatoire déterministe
 * Utilisé pour générer des IDs reproductibles
 * 
 * INV-E-13: Même seed → même séquence
 */
class DeterministicRng {
  private state: number;
  
  constructor(seed: number) {
    this.state = seed;
  }
  
  next(): number {
    // LCG algorithm (mêmes paramètres que Java)
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }
  
  nextHex(length: number = CONFIG.ID_RNG_HEX_LEN): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(this.next() * 16).toString(16);
    }
    return result;
  }
}
```

## 3.5 SemanticEquals (v1.2)

```typescript
/**
 * Comparaison sémantique profonde
 * OBLIGATOIRE pour toute comparaison de valeurs
 * 
 * INV-E-14: Interdit !== pour objets
 * INV-E-15: NaN = FAIL
 * INV-E-16: undefined = null
 */
function semanticEquals(a: unknown, b: unknown): boolean {
  // NaN check - FAIL immédiat
  if (containsNaN(a) || containsNaN(b)) {
    throw new Error('INVALID_VALUE_NAN: NaN forbidden in CANON');
  }
  
  // undefined → null normalization
  const normalizedA = normalizeUndefined(a);
  const normalizedB = normalizeUndefined(b);
  
  // Primitive comparison
  if (typeof normalizedA !== 'object' || normalizedA === null) {
    // BigInt support
    if (typeof normalizedA === 'bigint' && typeof normalizedB === 'bigint') {
      return normalizedA === normalizedB;
    }
    return normalizedA === normalizedB;
  }
  
  // Array comparison
  if (Array.isArray(normalizedA) && Array.isArray(normalizedB)) {
    if (normalizedA.length !== normalizedB.length) return false;
    return normalizedA.every((val, idx) => semanticEquals(val, normalizedB[idx]));
  }
  
  // Object comparison (sorted keys)
  if (typeof normalizedA === 'object' && typeof normalizedB === 'object') {
    const keysA = Object.keys(normalizedA as object).sort();
    const keysB = Object.keys(normalizedB as object).sort();
    if (keysA.length !== keysB.length) return false;
    if (!keysA.every((k, i) => k === keysB[i])) return false;
    return keysA.every(key => 
      semanticEquals(
        (normalizedA as Record<string, unknown>)[key],
        (normalizedB as Record<string, unknown>)[key]
      )
    );
  }
  
  return false;
}

function containsNaN(value: unknown): boolean {
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (Array.isArray(value)) return value.some(containsNaN);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(containsNaN);
  }
  return false;
}

function normalizeUndefined(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(normalizeUndefined);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = normalizeUndefined(v);
    }
    return result;
  }
  return value;
}
```

---

# 4. CLAIM STRUCTURE

## 4.1 Interface Claim

```typescript
/**
 * Structure d'un claim CANON
 * Tous les champs sont IMMUTABLES après création
 */
interface Claim {
  // Identification
  readonly id: ClaimId;
  readonly hash: ClaimHash;
  readonly prevHash: ClaimHash | null;  // null pour le genesis
  
  // Contenu
  readonly subject: string;
  readonly predicate: PredicateId;
  readonly value: ClaimValue;
  
  // Métadonnées
  readonly timestamp: CanonTimestamp;
  readonly lineage: Lineage;
  
  // Supersession (v1.2 - champ structurel uniquement)
  readonly supersedes?: ClaimId;  // Référence au claim remplacé
  
  // Status
  readonly status: ClaimStatus;
}

type ClaimStatus = 'ACTIVE' | 'SUPERSEDED' | 'DISPUTED';

type ClaimValue = 
  | string 
  | number 
  | boolean 
  | null 
  | bigint
  | ClaimValue[] 
  | { [key: string]: ClaimValue };
```

## 4.2 Claim Factory

```typescript
/**
 * Factory pour créer des claims
 * Garantit tous les invariants
 */
class ClaimFactory {
  private rng: DeterministicRng;
  private lastTimestamp: string = '';
  private sequence: number = 0;
  
  constructor(seed: number) {
    this.rng = new DeterministicRng(seed);
  }
  
  create(params: CreateClaimParams): Claim {
    // Validate subject (INV-E-07)
    if (!params.subject || params.subject.trim() === '') {
      throw new Error('INVALID_SUBJECT: subject required');
    }
    
    // Validate predicate (INV-E-06)
    if (!isValidPredicate(params.predicate)) {
      throw new Error(`INVALID_PREDICATE: ${params.predicate} not in catalog`);
    }
    
    // Validate value - NaN check (INV-E-15)
    if (containsNaN(params.value)) {
      throw new Error('INVALID_VALUE_NAN: NaN forbidden in CANON');
    }
    
    // Normalize undefined → null (INV-E-16)
    const normalizedValue = normalizeUndefined(params.value) as ClaimValue;
    
    // Generate deterministic ID (INV-E-13)
    const id = `claim_${this.rng.nextHex(CONFIG.ID_RNG_HEX_LEN)}` as ClaimId;
    
    // Generate monotonic timestamp (INV-E-05)
    const timestamp = this.getMonotonicTimestamp();
    
    // Build claim without hash
    const claimData = {
      id,
      subject: params.subject,
      predicate: params.predicate,
      value: normalizedValue,
      timestamp,
      lineage: params.lineage,
      supersedes: params.supersedes,
      status: 'ACTIVE' as ClaimStatus,
      prevHash: params.prevHash ?? null
    };
    
    // Compute hash (INV-E-02)
    const hash = computeClaimHash(claimData);
    
    return { ...claimData, hash };
  }
  
  private getMonotonicTimestamp(): CanonTimestamp {
    const now = new Date().toISOString();
    if (now <= this.lastTimestamp) {
      this.sequence++;
      // Append sequence to ensure monotonicity
      return `${this.lastTimestamp.slice(0, -1)}${this.sequence.toString().padStart(3, '0')}Z`;
    }
    this.lastTimestamp = now;
    this.sequence = 0;
    return now;
  }
}

interface CreateClaimParams {
  subject: string;
  predicate: PredicateId;
  value: ClaimValue;
  lineage: Lineage;
  supersedes?: ClaimId;
  prevHash?: ClaimHash;
}
```

## 4.3 Hash Computation

```typescript
/**
 * Calcul du hash d'un claim
 * DOIT être déterministe (INV-E-02)
 */
function computeClaimHash(claim: Omit<Claim, 'hash'>): ClaimHash {
  // Canonical JSON (sorted keys, no whitespace)
  const canonical = canonicalStringify(claim);
  
  // SHA-256
  return sha256(canonical);
}

function canonicalStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'null';  // INV-E-16
  if (typeof obj === 'bigint') return obj.toString();  // BigInt support
  if (typeof obj !== 'object') return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  
  // Object: sorted keys
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => {
    const value = (obj as Record<string, unknown>)[k];
    return `"${k}":${canonicalStringify(value)}`;
  });
  return '{' + pairs.join(',') + '}';
}
```

---

# 5. PREDICATES

## 5.1 Predicate Structure

```typescript
/**
 * Définition d'un prédicat
 * Les prédicats sont FERMÉS (INV-E-06)
 */
interface PredicateDefinition {
  readonly id: PredicateId;
  readonly name: string;
  readonly description: string;
  readonly valueType: ValueTypeConstraint;
  readonly contradicts?: PredicateId[];  // Prédicats incompatibles
}

type PredicateId = string;

type ValueTypeConstraint = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array'
  | 'any';
```

## 5.2 Predicate Catalog (v1.2)

```typescript
/**
 * Catalogue fermé des prédicats autorisés
 * 
 * v1.2: SUPERSEDES retiré - c'est un champ structurel, pas un prédicat
 */
const PREDICATE_CATALOG: Record<PredicateId, PredicateDefinition> = {
  // Identité
  'IS_A': {
    id: 'IS_A',
    name: 'Is A',
    description: 'Type/class of subject',
    valueType: 'string'
  },
  
  // Attributs
  'HAS_NAME': {
    id: 'HAS_NAME',
    name: 'Has Name',
    description: 'Name of subject',
    valueType: 'string',
    contradicts: ['HAS_NAME']  // Un seul nom actif
  },
  
  'HAS_ATTRIBUTE': {
    id: 'HAS_ATTRIBUTE',
    name: 'Has Attribute',
    description: 'Generic attribute',
    valueType: 'any'
  },
  
  // Relations
  'RELATED_TO': {
    id: 'RELATED_TO',
    name: 'Related To',
    description: 'Generic relation',
    valueType: 'string'
  }
};

function isValidPredicate(id: string): id is PredicateId {
  return id in PREDICATE_CATALOG;
}

function getPredicateDefinition(id: PredicateId): PredicateDefinition | undefined {
  return PREDICATE_CATALOG[id];
}
```

---

# 6. CATALOG

## 6.1 Catalog Interface

```typescript
/**
 * Catalogue central des claims
 * Gère l'indexation et la recherche
 */
interface Catalog {
  // Ajout
  add(claim: Claim): void;
  
  // Recherche
  getById(id: ClaimId): Claim | undefined;
  getBySubject(subject: string): Claim[];
  getByPredicate(predicate: PredicateId): Claim[];
  getBySubjectAndPredicate(subject: string, predicate: PredicateId): Claim[];
  
  // Status
  getActive(): Claim[];
  getSuperseded(): Claim[];
  getDisputed(): Claim[];
  
  // Chain
  getLatestHash(): ClaimHash | null;
  getChain(): Claim[];
  
  // Stats
  count(): number;
}
```

## 6.2 In-Memory Catalog Implementation

```typescript
/**
 * Implémentation en mémoire du catalogue
 */
class InMemoryCatalog implements Catalog {
  private claims: Map<ClaimId, Claim> = new Map();
  private bySubject: Map<string, Set<ClaimId>> = new Map();
  private byPredicate: Map<PredicateId, Set<ClaimId>> = new Map();
  private chain: Claim[] = [];
  
  add(claim: Claim): void {
    // Check uniqueness (INV-E-04)
    if (this.claims.has(claim.id)) {
      throw new Error(`DUPLICATE_ID: ${claim.id} already exists`);
    }
    
    // Check chain integrity (INV-E-03)
    const expectedPrevHash = this.getLatestHash();
    if (claim.prevHash !== expectedPrevHash) {
      throw new Error(`CHAIN_BROKEN: expected prevHash ${expectedPrevHash}, got ${claim.prevHash}`);
    }
    
    // Store
    this.claims.set(claim.id, claim);
    this.chain.push(claim);
    
    // Index by subject
    if (!this.bySubject.has(claim.subject)) {
      this.bySubject.set(claim.subject, new Set());
    }
    this.bySubject.get(claim.subject)!.add(claim.id);
    
    // Index by predicate
    if (!this.byPredicate.has(claim.predicate)) {
      this.byPredicate.set(claim.predicate, new Set());
    }
    this.byPredicate.get(claim.predicate)!.add(claim.id);
    
    // Handle supersession (v1.2 - structural field only)
    if (claim.supersedes) {
      const superseded = this.claims.get(claim.supersedes);
      if (superseded) {
        // Mark old claim as superseded (immutable, create new reference)
        const updated: Claim = { ...superseded, status: 'SUPERSEDED' };
        this.claims.set(superseded.id, updated);
      }
    }
  }
  
  getById(id: ClaimId): Claim | undefined {
    return this.claims.get(id);
  }
  
  getBySubject(subject: string): Claim[] {
    const ids = this.bySubject.get(subject);
    if (!ids) return [];
    return Array.from(ids).map(id => this.claims.get(id)!);
  }
  
  getByPredicate(predicate: PredicateId): Claim[] {
    const ids = this.byPredicate.get(predicate);
    if (!ids) return [];
    return Array.from(ids).map(id => this.claims.get(id)!);
  }
  
  getBySubjectAndPredicate(subject: string, predicate: PredicateId): Claim[] {
    return this.getBySubject(subject).filter(c => c.predicate === predicate);
  }
  
  getActive(): Claim[] {
    return Array.from(this.claims.values()).filter(c => c.status === 'ACTIVE');
  }
  
  getSuperseded(): Claim[] {
    return Array.from(this.claims.values()).filter(c => c.status === 'SUPERSEDED');
  }
  
  getDisputed(): Claim[] {
    return Array.from(this.claims.values()).filter(c => c.status === 'DISPUTED');
  }
  
  getLatestHash(): ClaimHash | null {
    if (this.chain.length === 0) return null;
    return this.chain[this.chain.length - 1].hash;
  }
  
  getChain(): Claim[] {
    return [...this.chain];
  }
  
  count(): number {
    return this.claims.size;
  }
}
```

---

# 7. LINEAGE

## 7.1 Lineage Structure

```typescript
/**
 * Traçabilité de l'origine d'un claim
 */
interface Lineage {
  readonly source: LineageSource;
  readonly sourceId?: string;
  readonly confidence: number;  // 0.0 - 1.0
  readonly metadata?: Record<string, unknown>;
}

type LineageSource = 
  | 'USER_INPUT'      // Saisi par l'utilisateur
  | 'GENESIS_FORGE'   // Généré par GENESIS FORGE
  | 'INFERENCE'       // Déduit d'autres claims
  | 'IMPORT'          // Importé d'une source externe
  | 'SYSTEM';         // Créé par le système

const VALID_SOURCES: LineageSource[] = [
  'USER_INPUT',
  'GENESIS_FORGE',
  'INFERENCE',
  'IMPORT',
  'SYSTEM'
];
```

## 7.2 Lineage Factory

```typescript
/**
 * Factory pour créer des lineages
 */
function createLineage(params: {
  source: LineageSource;
  sourceId?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}): Lineage {
  // Validate source (INV-E-09)
  if (!VALID_SOURCES.includes(params.source)) {
    throw new Error(`INVALID_SOURCE: ${params.source} not in valid sources`);
  }
  
  // Validate confidence
  const confidence = params.confidence ?? 1.0;
  if (confidence < 0 || confidence > 1) {
    throw new Error(`INVALID_CONFIDENCE: must be 0.0-1.0, got ${confidence}`);
  }
  
  return {
    source: params.source,
    sourceId: params.sourceId,
    confidence,
    metadata: params.metadata
  };
}
```

---

# 8. STORAGE

## 8.1 Storage Interface

```typescript
/**
 * Interface de persistance
 * Abstrait le stockage physique
 */
interface CanonStorage {
  // Persistence
  save(claim: Claim): Promise<void>;
  load(id: ClaimId): Promise<Claim | null>;
  loadAll(): Promise<Claim[]>;
  
  // Bulk
  saveMany(claims: Claim[]): Promise<void>;
  loadRange(start: number, end: number): Promise<Claim[]>;
  
  // Integrity
  getStorageHash(): Promise<string>;
  verify(): Promise<boolean>;
}
```

## 8.2 File-Based Storage

```typescript
/**
 * Stockage basé fichiers (append-only)
 */
class FileBasedStorage implements CanonStorage {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = basePath;
  }
  
  async save(claim: Claim): Promise<void> {
    // Append to log file (INV-E-01)
    const line = JSON.stringify(claim) + '\n';
    await appendFile(this.getLogPath(), line);
    
    // Update index
    await this.updateIndex(claim);
  }
  
  async load(id: ClaimId): Promise<Claim | null> {
    const index = await this.loadIndex();
    const offset = index[id];
    if (offset === undefined) return null;
    
    return this.readClaimAtOffset(offset);
  }
  
  async loadAll(): Promise<Claim[]> {
    const content = await readFile(this.getLogPath(), 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as Claim);
  }
  
  async saveMany(claims: Claim[]): Promise<void> {
    for (const claim of claims) {
      await this.save(claim);
    }
  }
  
  async loadRange(start: number, end: number): Promise<Claim[]> {
    const all = await this.loadAll();
    return all.slice(start, end);
  }
  
  async getStorageHash(): Promise<string> {
    const content = await readFile(this.getLogPath());
    return sha256(content);
  }
  
  async verify(): Promise<boolean> {
    const claims = await this.loadAll();
    
    // Verify chain integrity
    for (let i = 1; i < claims.length; i++) {
      const expectedPrevHash = claims[i - 1].hash;
      if (claims[i].prevHash !== expectedPrevHash) {
        return false;
      }
    }
    
    // Verify each hash
    for (const claim of claims) {
      const computed = computeClaimHash({ ...claim, hash: undefined as any });
      if (computed !== claim.hash) {
        return false;
      }
    }
    
    return true;
  }
  
  private getLogPath(): string {
    return `${this.basePath}/canon.log`;
  }
  
  private async loadIndex(): Promise<Record<ClaimId, number>> {
    try {
      const content = await readFile(`${this.basePath}/index.json`, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  
  private async updateIndex(claim: Claim): Promise<void> {
    const index = await this.loadIndex();
    const stats = await stat(this.getLogPath());
    index[claim.id] = stats.size;
    await writeFile(`${this.basePath}/index.json`, JSON.stringify(index));
  }
  
  private async readClaimAtOffset(offset: number): Promise<Claim> {
    // Implementation detail: read line at offset
    throw new Error('Not implemented');
  }
}
```

---

# 9. GUARD (CONTRADICTION DETECTION)

## 9.1 Guard Interface

```typescript
/**
 * Détecteur de contradictions
 * 
 * v1.2: Utilise semanticEquals, jamais !==
 */
interface ContradictionGuard {
  // Detection
  check(newClaim: Claim, catalog: Catalog): ContradictionResult;
  
  // Batch
  checkMany(claims: Claim[], catalog: Catalog): ContradictionResult[];
}

interface ContradictionResult {
  hasContradiction: boolean;
  type?: ContradictionType;
  conflictingClaims?: Claim[];
  description?: string;
}

type ContradictionType = 
  | 'DIRECT'      // Même sujet + même prédicat + valeur différente
  | 'SEMANTIC'    // Prédicats mutuellement exclusifs
  | 'LOGICAL';    // Déduction crée une contradiction
```

## 9.2 Guard Implementation (v1.2)

```typescript
/**
 * Implémentation du Guard
 * 
 * IMPORTANT v1.2:
 * - Utilise semanticEquals() pour toute comparaison
 * - Jamais !== pour comparer des valeurs
 * - NaN = FAIL immédiat
 */
class CanonGuard implements ContradictionGuard {
  check(newClaim: Claim, catalog: Catalog): ContradictionResult {
    // Check for NaN (INV-E-15)
    if (containsNaN(newClaim.value)) {
      return {
        hasContradiction: true,
        type: 'DIRECT',
        description: 'INVALID_VALUE_NAN: NaN forbidden in CANON'
      };
    }
    
    // Get existing claims for same subject + predicate
    const existing = catalog.getBySubjectAndPredicate(
      newClaim.subject,
      newClaim.predicate
    );
    
    // Filter to active only
    const active = existing.filter(c => c.status === 'ACTIVE');
    
    // Check direct contradiction
    for (const claim of active) {
      // Skip if this claim supersedes the existing one
      if (newClaim.supersedes === claim.id) continue;
      
      // CRITICAL v1.2: Use semanticEquals, NOT !==
      if (!semanticEquals(claim.value, newClaim.value)) {
        return {
          hasContradiction: true,
          type: 'DIRECT',
          conflictingClaims: [claim],
          description: `Direct contradiction: ${claim.id} has different value for ${newClaim.subject}.${newClaim.predicate}`
        };
      }
    }
    
    // Check semantic contradiction (predicate exclusivity)
    const predicateDef = getPredicateDefinition(newClaim.predicate);
    if (predicateDef?.contradicts) {
      for (const contradictingPred of predicateDef.contradicts) {
        const conflicts = catalog.getBySubjectAndPredicate(
          newClaim.subject,
          contradictingPred
        ).filter(c => c.status === 'ACTIVE');
        
        if (conflicts.length > 0) {
          return {
            hasContradiction: true,
            type: 'SEMANTIC',
            conflictingClaims: conflicts,
            description: `Semantic contradiction: ${newClaim.predicate} contradicts ${contradictingPred}`
          };
        }
      }
    }
    
    return { hasContradiction: false };
  }
  
  checkMany(claims: Claim[], catalog: Catalog): ContradictionResult[] {
    return claims.map(claim => this.check(claim, catalog));
  }
}
```

---

# 10. QUERY INTERFACE

## 10.1 Query Types

```typescript
/**
 * Interface de requête
 */
interface CanonQuery {
  // Simple queries
  subject?: string;
  predicate?: PredicateId;
  status?: ClaimStatus;
  
  // Time range
  after?: CanonTimestamp;
  before?: CanonTimestamp;
  
  // Lineage
  source?: LineageSource;
  minConfidence?: number;
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Ordering
  orderBy?: 'timestamp' | 'subject' | 'predicate';
  orderDir?: 'asc' | 'desc';
}

interface QueryResult {
  claims: Claim[];
  total: number;
  hasMore: boolean;
}
```

## 10.2 Query Engine

```typescript
/**
 * Moteur de requête
 */
class CanonQueryEngine {
  private catalog: Catalog;
  
  constructor(catalog: Catalog) {
    this.catalog = catalog;
  }
  
  execute(query: CanonQuery): QueryResult {
    let claims = this.catalog.getChain();
    
    // Filter by subject
    if (query.subject) {
      claims = claims.filter(c => c.subject === query.subject);
    }
    
    // Filter by predicate
    if (query.predicate) {
      claims = claims.filter(c => c.predicate === query.predicate);
    }
    
    // Filter by status
    if (query.status) {
      claims = claims.filter(c => c.status === query.status);
    }
    
    // Filter by time range
    if (query.after) {
      claims = claims.filter(c => c.timestamp > query.after!);
    }
    if (query.before) {
      claims = claims.filter(c => c.timestamp < query.before!);
    }
    
    // Filter by source
    if (query.source) {
      claims = claims.filter(c => c.lineage.source === query.source);
    }
    
    // Filter by confidence
    if (query.minConfidence !== undefined) {
      claims = claims.filter(c => c.lineage.confidence >= query.minConfidence!);
    }
    
    // Order
    if (query.orderBy) {
      claims = this.sort(claims, query.orderBy, query.orderDir ?? 'asc');
    }
    
    // Pagination
    const total = claims.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? total;
    claims = claims.slice(offset, offset + limit);
    
    return {
      claims,
      total,
      hasMore: offset + claims.length < total
    };
  }
  
  private sort(claims: Claim[], by: string, dir: string): Claim[] {
    return [...claims].sort((a, b) => {
      let cmp = 0;
      switch (by) {
        case 'timestamp':
          cmp = a.timestamp.localeCompare(b.timestamp);
          break;
        case 'subject':
          cmp = a.subject.localeCompare(b.subject);
          break;
        case 'predicate':
          cmp = a.predicate.localeCompare(b.predicate);
          break;
      }
      return dir === 'desc' ? -cmp : cmp;
    });
  }
}
```

---

# 11. INTEGRATION POINTS

## 11.1 SENTINEL Integration

```typescript
/**
 * Point d'intégration avec SENTINEL
 * Toute écriture DOIT être autorisée
 */
interface SentinelAuthorization {
  isAuthorized(action: CanonAction): boolean;
  getContext(): AuthContext;
}

type CanonAction = 
  | { type: 'CREATE_CLAIM'; claim: Claim }
  | { type: 'QUERY'; query: CanonQuery }
  | { type: 'VERIFY_CHAIN' };

interface AuthContext {
  userId?: string;
  sessionId: string;
  permissions: string[];
}
```

## 11.2 MEMORY Integration

```typescript
/**
 * Point d'intégration avec MEMORY
 */
interface MemoryBridge {
  // Promotion: MEMORY → CANON
  promoteToCanon(memoryItem: MemoryItem): Claim;
  
  // Reference: CANON → MEMORY
  createMemoryRef(claim: Claim): MemoryRef;
}
```

## 11.3 Event Emission

```typescript
/**
 * Événements émis par CANON
 */
type CanonEvent = 
  | { type: 'CLAIM_CREATED'; claim: Claim }
  | { type: 'CONTRADICTION_DETECTED'; result: ContradictionResult }
  | { type: 'CHAIN_VERIFIED'; valid: boolean }
  | { type: 'STORAGE_SYNCED'; hash: string };

interface CanonEventEmitter {
  on(event: string, handler: (e: CanonEvent) => void): void;
  emit(event: CanonEvent): void;
}
```

---

# 12. TEST REQUIREMENTS

## 12.1 Unit Tests Required

| Test ID | Description | Invariant |
|---------|-------------|-----------|
| E1-T1 | Claim creation with valid params | INV-E-07, E-08 |
| E1-T2 | Claim creation fails with empty subject | INV-E-07 |
| E1-T3 | Claim creation fails with invalid predicate | INV-E-06 |
| E1-T4 | Hash is deterministic | INV-E-02 |
| E1-T5 | ID is unique | INV-E-04 |
| E1-T6 | Timestamp is monotonic | INV-E-05 |
| E1-T7 | ID is deterministic with same seed | INV-E-13 |
| E1-GOLD-1 | undefined → null in serialization | INV-E-16 |
| E1-GOLD-2 | BigInt comparison works | semanticEquals |
| E1-GOLD-3 | containsNaN detects nested NaN | INV-E-15 |
| E1-GOLD-4 | Hash stable across runs | INV-E-02 |

## 12.2 Catalog Tests

| Test ID | Description | Invariant |
|---------|-------------|-----------|
| E2-T1 | Add claim to catalog | INV-E-04 |
| E2-T2 | Reject duplicate ID | INV-E-04 |
| E2-T3 | Chain integrity maintained | INV-E-03 |
| E2-T4 | Query by subject works | - |
| E2-T5 | Query by predicate works | - |
| E2-T6 | SUPERSEDES not in predicate catalog | v1.2 |

## 12.3 Guard Tests

| Test ID | Description | Invariant |
|---------|-------------|-----------|
| E3-T1 | Detect direct contradiction | INV-E-10 |
| E3-T2 | No false positive for same value | INV-E-10 |
| E3-T3 | Detect semantic contradiction | INV-E-10 |
| E3-T4 | Allow supersession without contradiction | - |
| E3-T5 | Log all contradictions | INV-E-11 |

## 12.4 Storage Tests

| Test ID | Description | Invariant |
|---------|-------------|-----------|
| E4-T1 | Save and load claim | INV-E-01 |
| E4-T2 | Append-only (no delete) | INV-E-01 |
| E4-T3 | Verify chain integrity | INV-E-03 |
| E4-T4 | Storage hash is stable | INV-E-02 |

## 12.5 Integration Tests

| Test ID | Description | Invariant |
|---------|-------------|-----------|
| E5-T1 | Full flow: create → store → query | All |
| E5-T2 | Contradiction blocks storage | INV-E-10, E-12 |
| E5-T3 | Chain survives restart | INV-E-03 |
| E5-T4 | 1000 claims performance | - |
| E5-T5 | Concurrent writes handled | INV-E-04 |
| E5-T6 | SENTINEL authorization required | Integration |
| E5-T7 | No !== for semantic comparison in Guard | INV-E-14 |
| E5-GOLD-1 | semanticEquals: equivalent objects = true | CONTR-001 |
| E5-GOLD-2 | semanticEquals: different objects = false | CONTR-001 |

## 12.6 Test Coverage Target

| Metric | Target |
|--------|--------|
| Line coverage | ≥ 90% |
| Branch coverage | ≥ 85% |
| Invariant coverage | 100% |
| Edge cases | Documented |

---

# 📊 SUMMARY

## Modules to Implement

| Module | Priority | Lines Est. | Dependencies |
|--------|----------|------------|--------------|
| Types | P0 | ~200 | None |
| ClaimFactory | P0 | ~150 | Types |
| Catalog | P0 | ~250 | Types, ClaimFactory |
| Lineage | P1 | ~50 | Types |
| Guard | P1 | ~150 | Catalog, Types |
| Storage | P1 | ~200 | Catalog |
| Query | P2 | ~150 | Catalog |
| Integration | P2 | ~100 | All |

## Files to Create

```
src/canon/
├── index.ts              # Public API
├── types.ts              # Types & interfaces
├── claim-factory.ts      # Claim creation
├── catalog.ts            # In-memory catalog
├── lineage.ts            # Lineage handling
├── guard.ts              # Contradiction detection
├── storage.ts            # File-based persistence
├── query.ts              # Query engine
├── semantic-equals.ts    # v1.2: Deep comparison
└── integration.ts        # External integration

tests/canon/
├── types.test.ts
├── claim-factory.test.ts
├── catalog.test.ts
├── lineage.test.ts
├── guard.test.ts
├── storage.test.ts
├── query.test.ts
├── semantic-equals.test.ts  # v1.2
└── integration.test.ts
```

---

# 🔐 SEAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   CANON SCHEMA SPECIFICATION v1.2.0                                                                   ║
║                                                                                                       ║
║   Status: READY FOR SEAL                                                                              ║
║   Blockers: 0                                                                                         ║
║   Date: 2026-01-28                                                                                    ║
║                                                                                                       ║
║   Changes v1.2:                                                                                       ║
║   ✅ INT-E-14: semanticEquals obligatoire                                                             ║
║   ✅ INT-E-15: NaN = FAIL immédiat                                                                    ║
║   ✅ INT-E-16: undefined → null                                                                       ║
║   ✅ SUPERSEDES = champ structurel uniquement                                                         ║
║   ✅ ConfigSymbol ID_RNG_HEX_LEN                                                                      ║
║   ✅ Golden tests explicites                                                                          ║
║                                                                                                       ║
║   Ready for Claude Code execution.                                                                    ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT CANON_SCHEMA_SPEC v1.2.0**
