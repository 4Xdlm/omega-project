# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA PHASE E — CONTINUATION PROMPT
#   Storage (Phase 4) + Query/API (Phase 6)
#   
#   Date: 2026-01-28
#   Status: CONTINUATION FROM CORE
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

---

# 🎯 CONTEXTE

Tu as complété **Phase E Core** avec succès :
- ✅ E1 - Schema Model (74 tests)
- ✅ E2 - Catalog Integrity (39 tests)  
- ✅ E5 - Conflict Detection (21 tests)
- ✅ 134 tests canon PASS
- ✅ 2659 tests total PASS

**Modules Core existants** dans `src/canon/`:
- config-symbol.ts
- types.ts
- id-factory.ts
- semantic-equals.ts
- predicate-catalog.ts
- lineage.ts
- guard.ts
- index.ts

---

# 🚀 MISSION CONTINUATION

Implémenter les modules **Storage** et **Query/API** :

## Phase 4 — STORAGE

### segment-writer.ts

```typescript
/**
 * Écriture de claims dans des segments append-only.
 * 
 * INVARIANTS:
 * - INV-E-01: APPEND_ONLY - Jamais de delete/update
 * - INV-E-SEGMENT-SIZE: Respect de SEGMENT_MAX_BYTES
 * - INV-E-SEGMENT-ROTATE: Rotation automatique si limite atteinte
 * 
 * INTERFACE:
 */
interface SegmentWriter {
  /** Ajoute un claim au segment courant */
  append(claim: CanonClaim): Promise<void>;
  
  /** Force rotation vers nouveau segment */
  rotate(): Promise<void>;
  
  /** Retourne le segment courant */
  getCurrentSegmentId(): string;
  
  /** Flush buffer vers disque */
  flush(): Promise<void>;
  
  /** Close writer proprement */
  close(): Promise<void>;
}

// Utiliser ConfigSymbol pour:
// - SEGMENT_MAX_BYTES
// - SEGMENT_TARGET_BYTES
// - SEGMENT_ROTATE_STRATEGY
// - SEGMENT_PREFIX
// - SEGMENT_EXTENSION
```

### segment-manifest.ts

```typescript
/**
 * Manifest tracking des segments.
 * 
 * INVARIANTS:
 * - INV-E-MANIFEST-01: Hash manifest = hash(concat(segment_hashes))
 * - INV-E-MANIFEST-02: Ordre des segments préservé
 * 
 * INTERFACE:
 */
interface SegmentManifest {
  segments: SegmentEntry[];
  version: number;
  lastModified: MonoNs;
  manifestHash: string;
}

interface SegmentEntry {
  id: string;
  path: string;
  firstClaimId: ClaimId;
  lastClaimId: ClaimId;
  claimCount: number;
  byteSize: number;
  hash: string;
  createdAt: MonoNs;
}

// Fonctions:
function loadManifest(dir: string): Promise<SegmentManifest>;
function saveManifest(dir: string, manifest: SegmentManifest): Promise<void>;
function verifyManifest(manifest: SegmentManifest): boolean;
function addSegmentToManifest(manifest: SegmentManifest, entry: SegmentEntry): SegmentManifest;
```

### index-builder.ts

```typescript
/**
 * Construction d'index pour query rapide.
 * 
 * INVARIANTS:
 * - INV-E-INDEX-01: Index rebuilt = même résultat (déterministe)
 * - INV-E-INDEX-02: Index couvre tous les claims
 * 
 * INDEX TYPES:
 * - bySubject: Map<EntityId, ClaimId[]>
 * - byPredicate: Map<PredicateType, ClaimId[]>
 * - byStatus: Map<ClaimStatus, ClaimId[]>
 * - byEntity: Map<EntityId, ClaimId[]> (object refs)
 */
interface CanonIndex {
  bySubject: Map<string, ClaimId[]>;
  byPredicate: Map<string, ClaimId[]>;
  byStatus: Map<string, ClaimId[]>;
  byObjectEntity: Map<string, ClaimId[]>;
  claimCount: number;
  indexHash: string;
  builtAt: MonoNs;
}

function buildIndex(claims: CanonClaim[]): CanonIndex;
function rebuildIndex(dir: string): Promise<CanonIndex>;
function saveIndex(dir: string, index: CanonIndex): Promise<void>;
function loadIndex(dir: string): Promise<CanonIndex>;
function mergeIndexes(a: CanonIndex, b: CanonIndex): CanonIndex;
```

## Phase 6 — QUERY & API

### query.ts

```typescript
/**
 * Query engine pour CANON.
 * 
 * INVARIANTS:
 * - INV-E-QUERY-01: Query déterministe (même query = même résultat)
 * - INV-E-QUERY-02: Query sur index, pas full scan (perf)
 * 
 * PERF TARGETS (ConfigSymbol):
 * - P95_GETBYID_TARGET_MS
 * - P95_QUERY_TARGET_MS
 */
interface QueryOptions {
  subject?: EntityId;
  predicate?: PredicateType;
  status?: ClaimStatus;
  objectEntity?: EntityId;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'id';
  orderDir?: 'asc' | 'desc';
}

interface QueryResult {
  claims: CanonClaim[];
  total: number;
  hasMore: boolean;
  queryHash: string;
  durationMs: number;
}

function query(index: CanonIndex, store: ClaimStore, options: QueryOptions): Promise<QueryResult>;
function getById(store: ClaimStore, id: ClaimId): Promise<CanonClaim | null>;
function getByHash(store: ClaimStore, hash: ChainHash): Promise<CanonClaim | null>;
function getClaimsForSubject(index: CanonIndex, store: ClaimStore, subject: EntityId): Promise<CanonClaim[]>;
function getActiveClaimsForSubject(index: CanonIndex, store: ClaimStore, subject: EntityId): Promise<CanonClaim[]>;
```

### canon-api.ts

```typescript
/**
 * Façade API publique pour CANON.
 * 
 * INVARIANTS:
 * - Toutes les opérations passent par Guard (conflict detection)
 * - Toutes les opérations sont loggées
 * - Toutes les opérations retournent Result<T, CanonError>
 */
interface CanonAPI {
  /** Initialize CANON storage */
  init(config: CanonConfig): Promise<void>;
  
  /** Create a new claim (with guard check) */
  createClaim(params: CreateClaimParams): Promise<Result<CanonClaim, CanonError>>;
  
  /** Get claim by ID */
  getClaim(id: ClaimId): Promise<CanonClaim | null>;
  
  /** Query claims */
  query(options: QueryOptions): Promise<QueryResult>;
  
  /** Get all claims for a subject */
  getClaimsForSubject(subject: EntityId): Promise<CanonClaim[]>;
  
  /** Check for contradictions before insert */
  checkConflicts(claim: CanonClaim): Promise<ConflictResult[]>;
  
  /** Verify chain integrity */
  verifyIntegrity(): Promise<ChainVerificationResult>;
  
  /** Get storage statistics */
  getStats(): Promise<CanonStats>;
  
  /** Close and cleanup */
  close(): Promise<void>;
}

interface CanonConfig {
  storageDir: string;
  configResolver?: ConfigResolver;
  guardEnabled?: boolean;
}

interface CanonStats {
  claimCount: number;
  segmentCount: number;
  totalBytes: number;
  indexSize: number;
  lastClaimAt: MonoNs | null;
  chainValid: boolean;
}

// Factory
function createCanonAPI(config: CanonConfig): Promise<CanonAPI>;
```

---

# 📋 TESTS REQUIS

## Tests Storage (E3, E4)

```typescript
// tests/canon/segment-writer.test.ts
describe('SegmentWriter', () => {
  it('E3-APPEND-01: append adds claim to segment', async () => {});
  it('E3-APPEND-02: append preserves order', async () => {});
  it('E3-ROTATE-01: rotates when size limit reached', async () => {});
  it('E3-ROTATE-02: rotation creates new segment file', async () => {});
  it('E3-FLUSH-01: flush writes buffer to disk', async () => {});
  it('E3-CLOSE-01: close flushes and releases resources', async () => {});
  it('E3-DET-01: same claims produce same segment hash', async () => {});
});

// tests/canon/segment-manifest.test.ts
describe('SegmentManifest', () => {
  it('E3-MANIFEST-01: loadManifest reads manifest file', async () => {});
  it('E3-MANIFEST-02: saveManifest writes manifest file', async () => {});
  it('E3-MANIFEST-03: verifyManifest detects corruption', async () => {});
  it('E3-MANIFEST-04: addSegment updates manifest hash', async () => {});
});

// tests/canon/index-builder.test.ts
describe('IndexBuilder', () => {
  it('E4-INDEX-01: buildIndex creates all index maps', async () => {});
  it('E4-INDEX-02: index covers all claims', async () => {});
  it('E4-INDEX-03: rebuild produces identical index', async () => {});
  it('E4-INDEX-04: mergeIndexes combines correctly', async () => {});
  it('E4-INDEX-05: index hash is deterministic', async () => {});
});
```

## Tests Query & API (E6)

```typescript
// tests/canon/query.test.ts
describe('Query', () => {
  it('E6-QUERY-01: query by subject returns correct claims', async () => {});
  it('E6-QUERY-02: query by predicate returns correct claims', async () => {});
  it('E6-QUERY-03: query with limit/offset paginates', async () => {});
  it('E6-QUERY-04: getById returns claim or null', async () => {});
  it('E6-QUERY-05: getActiveClaimsForSubject filters by status', async () => {});
  it('E6-QUERY-06: query is deterministic', async () => {});
  it('E6-PERF-01: getById under P95 target', async () => {});
  it('E6-PERF-02: query under P95 target', async () => {});
});

// tests/canon/canon-api.test.ts
describe('CanonAPI', () => {
  it('E6-API-01: init creates storage directory', async () => {});
  it('E6-API-02: createClaim adds claim with guard', async () => {});
  it('E6-API-03: createClaim detects conflicts', async () => {});
  it('E6-API-04: getClaim returns correct claim', async () => {});
  it('E6-API-05: query delegates to query engine', async () => {});
  it('E6-API-06: verifyIntegrity checks chain', async () => {});
  it('E6-API-07: getStats returns accurate stats', async () => {});
  it('E6-API-08: close releases resources', async () => {});
});
```

---

# 🚨 INTERDICTIONS

| ID | Interdit | Conséquence |
|----|----------|-------------|
| INT-E-01 | Modifier claim existant | FAIL immédiat |
| INT-E-02 | Supprimer claim | FAIL immédiat |
| INT-E-03 | Ignorer conflit Guard | FAIL immédiat |
| INT-E-07 | Utiliser `!==` pour sémantique | Utiliser `semanticEquals()` |
| INT-E-08 | Accepter NaN | Utiliser `containsNaN()` check |

---

# ✅ GATES DE SORTIE

## Gate E3 — Storage Write

```
□ segment-writer.ts implémenté
□ segment-manifest.ts implémenté
□ Tests E3-* tous PASS
□ Rotation automatique fonctionne
□ Determinisme vérifié (même claims = même hash)
```

## Gate E4 — Index

```
□ index-builder.ts implémenté
□ Tests E4-* tous PASS
□ Index couvre tous les claims
□ Rebuild produit index identique
```

## Gate E6 — Query & API

```
□ query.ts implémenté
□ canon-api.ts implémenté
□ Tests E6-* tous PASS
□ Performance targets atteints
□ Integration avec Guard validée
```

## Gate E-PERF — Performance

```
□ P95 getById < P95_GETBYID_TARGET_MS
□ P95 query < P95_QUERY_TARGET_MS
□ Benchmark avec PERF_SEED_CLAIMS_COUNT claims
```

---

# 🔄 SÉQUENCE D'EXÉCUTION

```
1. Lire CANON_SCHEMA_SPEC_v1.2.md sections 8, 9, 10
2. Implémenter segment-writer.ts + tests
3. Implémenter segment-manifest.ts + tests  
4. Implémenter index-builder.ts + tests
5. CHECKPOINT: npm test (tous les tests doivent passer)
6. Implémenter query.ts + tests
7. Implémenter canon-api.ts + tests
8. CHECKPOINT: npm test (tous les tests doivent passer)
9. Benchmark performance
10. Mettre à jour src/canon/index.ts avec nouveaux exports
11. RAPPORT FINAL avec hashes et métriques
```

---

# 📊 RAPPORT ATTENDU

```
## PHASE E STORAGE/QUERY — RAPPORT FINAL

### ARTEFACTS CRÉÉS
| Fichier | Hash (16 chars) |
|---------|-----------------|
| src/canon/segment-writer.ts | ... |
| src/canon/segment-manifest.ts | ... |
| src/canon/index-builder.ts | ... |
| src/canon/query.ts | ... |
| src/canon/canon-api.ts | ... |

### TESTS
| Suite | Total | Pass | Fail |
|-------|-------|------|------|
| canon | X | X | 0 |
| Full repo | X | X | 0 |

### GATES
| Gate | Status |
|------|--------|
| E3 - Storage Write | ✅ PASS |
| E4 - Index | ✅ PASS |
| E6 - Query & API | ✅ PASS |
| E-PERF - Performance | ✅ PASS |

### PERFORMANCE
| Metric | Target | Actual |
|--------|--------|--------|
| P95 getById | Xms | Xms |
| P95 query | Xms | Xms |
```

---

# 🚀 COMMENCE MAINTENANT

Execute la séquence ci-dessus. Aucun écart autorisé.
