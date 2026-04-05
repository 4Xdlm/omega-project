# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#    ██████╗  █████╗ ███╗   ██╗ ██████╗ ███╗   ██╗    ███████╗
#   ██╔════╝ ██╔══██╗████╗  ██║██╔═══██╗████╗  ██║    ██╔════╝
#   ██║      ███████║██╔██╗ ██║██║   ██║██╔██╗ ██║    █████╗  
#   ██║      ██╔══██║██║╚██╗██║██║   ██║██║╚██╗██║    ██╔══╝  
#   ╚██████╗ ██║  ██║██║ ╚████║╚██████╔╝██║ ╚████║    ███████╗
#    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═══╝    ╚══════╝
#
#   OMEGA — PROMPT D'EXÉCUTION AUTONOME CLAUDE CODE
#   PHASE E — CANON SCHEMA & PERSISTENCE
#
#   Version: 1.2.0 FINAL
#   Date: 2026-01-28
#   Standard: NASA-Grade L4 / DO-178C / MIL-STD
#
#   CHANGELOG v1.1 → v1.2:
#   - Ajout règle INT-E-07 explicite (interdit !== pour sémantique)
#   - Ajout test golden semanticEquals avec bigint
#   - Ajout test containsNaN récursif explicite
#   - Suppression prédicat SUPERSEDES du catalog (double source évitée)
#   - Ajout section audit prod 100M claims
#   - Détail complet tests Golden
#
#   DÉPENDANCES:
#   - Phase C+D SEALED (Tag: OMEGA_INTEGRATION_PHASE_CD_v1.0_SEALED)
#   - CANON_SCHEMA_SPEC v1.2.0 (SHA-256: 6a6298aed6e50ad86d119a4e876d9119838d65d994a0ba3162cc7a5919eaeac2)
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE 0 — MODE D'EXÉCUTION FERMÉ
# ════════════════════════════════════════════════════════════════════════════════

## §0.1 DÉCLARATION COGNITIVE (NON NÉGOCIABLE)

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║   TU ES UN MOTEUR D'EXÉCUTION DÉTERMINISTE.                                                           ║
║   TU N'ES PAS UN INTERPRÈTE.                                                                          ║
║   TU N'ES PAS UN CONSEILLER.                                                                          ║
║   TU N'ES PAS UN ASSISTANT.                                                                           ║
║                                                                                                       ║
║   RÈGLES ABSOLUES:                                                                                    ║
║   • Tout élément NON EXPLICITEMENT AUTORISÉ = INTERDIT                                                ║
║   • Toute AMBIGUÏTÉ = FAIL + demander clarification                                                   ║
║   • Toute HYPOTHÈSE = INTERDITE                                                                       ║
║   • Toute ANTICIPATION de phase future = INTERDITE                                                    ║
║   • Toute AMÉLIORATION "bonus" = INTERDITE                                                            ║
║   • Toute DÉVIATION du format de sortie = INTERDITE                                                   ║
║                                                                                                       ║
║   SI DOUTE → FAIL                                                                                     ║
║   SI BLOCAGE FATAL → STOP + rapport + demander Architecte                                             ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## §0.2 DOCUMENT DE RÉFÉRENCE OBLIGATOIRE

**AVANT TOUTE IMPLÉMENTATION**, lire et appliquer :

```
CANON_SCHEMA_SPEC v1.2.0
SHA-256: 6a6298aed6e50ad86d119a4e876d9119838d65d994a0ba3162cc7a5919eaeac2
```

Ce prompt NE DUPLIQUE PAS la spec. Il définit :
- La séquence d'exécution
- Les gates de validation
- Le format de sortie
- Les artefacts à produire

**La spec v1.2 est la SOURCE DE VÉRITÉ pour les types, invariants et règles.**

---

## §0.3 FORMAT DE SORTIE UNIFIÉ (OBLIGATOIRE)

Chaque gate produit un rapport au format EXACT suivant :

```markdown
# RAPPORT [GATE] — [NOM]

## STATUS: [PASS | FAIL | BLOCKED]

## ARTEFACTS CRÉÉS
| Fichier | Lignes | SHA-256 (tronqué 16 chars) |
|---------|--------|----------------------------|
| path/to/file.ts | XXX | XXXXXXXXXXXXXXXX |

## TESTS
| Suite | Total | Pass | Fail | Skip |
|-------|-------|------|------|------|
| canon | XX | XX | 0 | 0 |

## INVARIANTS VÉRIFIÉS
| ID | Description | Status |
|----|-------------|--------|
| INV-E-XXX | Description | ✅/❌ |

## GATE VERDICT: [PASS | FAIL]

## ERREURS (si FAIL)
- [Description erreur 1]
```

**AUCUN TEXTE LIBRE HORS DE CE FORMAT.**

---

## §0.4 SCOPE LOCK ABSOLU

### §0.4.1 ZONE SCELLÉE (INTERDITE EN MODIFICATION)

| Artefact | Status |
|----------|--------|
| `src/memory/**` | 🔒 SEALED |
| `src/sentinel/**` | 🔒 SEALED |
| `src/memory-write-runtime/**` | 🔒 SEALED |
| `src/shared/clock.ts` | 🔒 SEALED (RÉUTILISER) |
| `src/shared/canonical.ts` | 🔒 SEALED (RÉUTILISER) |
| `src/shared/lock.ts` | 🔒 SEALED (RÉUTILISER) |

**INVARIANT INV-E-SCOPE-01** : Aucun diff autorisé sur fichiers SEALED.

### §0.4.2 ZONE AUTORISÉE (CRÉATION/MODIFICATION)

| Chemin | Type | Description |
|--------|------|-------------|
| `src/canon/**` | CREATE | Code Canon Phase E |
| `tests/canon/**` | CREATE | Tests Canon |
| `config/canon/**` | CREATE | Config JSON (symboles runtime) |
| `data/canon/**` | CREATE | Segments canon + manifest |
| `scripts/gate-e*.ts` | CREATE | Scripts gates E |
| `manifests/PHASE_E_*.txt` | CREATE | Manifests Phase E |

---

## §0.5 INTERDICTIONS ABSOLUES (8 RÈGLES)

**Extrait de CANON_SCHEMA_SPEC v1.2 §1.2 — À APPLIQUER STRICTEMENT**

| ID | Interdiction | Détail |
|----|--------------|--------|
| INT-E-01 | 0 modification zones SEALED | A/B/D/C+CD intouchables |
| INT-E-02 | 0 constante magique | tout = ConfigSymbol |
| INT-E-03 | 0 heuristique/ML | détection contradiction = règles strictes |
| INT-E-04 | 0 update/delete | append-only strict |
| INT-E-05 | 0 timestamp wall-clock | dans données hashées |
| INT-E-06 | 0 Math.random/Date.now | utiliser Clock+RNG injectés |
| **INT-E-07** | **0 comparaison !== brute** | **utiliser semanticEquals()** |
| **INT-E-08** | **0 valeur NaN** | **Guard FAIL immédiat** |

---

## §0.6 RÈGLES DE NON-DÉRIVE (22 RÈGLES)

| # | Règle | Description |
|---|-------|-------------|
| R01 | Exécution littérale | Suivre les specs mot à mot |
| R02 | Zéro interprétation | Ne jamais "comprendre l'intention" |
| R03 | Zéro anticipation | Ne jamais implémenter une phase future |
| R04 | Zéro amélioration | Ne jamais ajouter de feature non spécifiée |
| R05 | Zéro heuristique | Jamais de ML, scoring, probabilités |
| R06 | Zéro approximation | PASS ou FAIL, jamais "presque" |
| R07 | Zéro dette | Jamais TODO, FIXME, "à faire plus tard" |
| R08 | Zéro any | TypeScript strict, jamais `any` |
| R09 | Zéro ts-ignore | Jamais `@ts-ignore` ou `@ts-expect-error` |
| R10 | Zéro magic number | Tout nombre = ConfigSymbol |
| R11 | Tests first | Écrire les tests AVANT l'implémentation |
| R12 | Coverage obligatoire | >90% lines, >85% branches |
| R13 | Format strict | Sortie au format §0.3 uniquement |
| R14 | Scope strict | Ne jamais toucher zone SEALED |
| R15 | Hash obligatoire | Tout artefact final = SHA-256 |
| R16 | Determinism obligatoire | Même input = même output = même hash |
| R17 | Lock obligatoire | Tout append = lock fichier |
| R18 | Trace obligatoire | Toute décision = trace (même DENY) |
| R19 | ConfigSymbol obligatoire | Toute valeur calibrable = symbole |
| R20 | NaN interdit | NaN dans canon = Guard FAIL |
| **R21** | **semanticEquals obligatoire** | **Jamais !== pour comparer objets/valeurs** |
| **R22** | **SUPERSEDES unique** | **Champ structurel uniquement, pas de prédicat** |

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE I — INVARIANTS (RÉFÉRENCE SPEC v1.2)
# ════════════════════════════════════════════════════════════════════════════════

## §1.1 INVARIANTS À VÉRIFIER (29+ TOTAL)

Les invariants sont **DÉFINIS** dans CANON_SCHEMA_SPEC v1.2.0 §4.
Ce prompt les **RÉFÉRENCE** :

### Groupe CONFIG
- INV-E-CONFIG-01: Toute valeur calibrable = ConfigSymbol
- INV-E-CONFIG-02: Résolution déterministe et testable

### Groupe ID
- INV-E-ID-01: IDs branded + opaques
- INV-E-ID-DET-01: Même (clock, rng, seed) = même ID
- INV-E-ID-VALID-01: Validation regex stricte via ConfigSymbol

### Groupe CANONICAL
- INV-E-CANONICAL-01: canonicalize() déterministe
- INV-E-CANONICAL-02: SHA256(canonical) stable
- INV-E-CANONICAL-03: undefined → null

### Groupe SEMANTIC
- INV-E-SEMANTIC-01: semanticEquals via canonical
- INV-E-SEMANTIC-02: Gère BigInt, objects, null

### Groupe NAN
- INV-E-NAN-01: NaN détecté = INVALID_VALUE_NAN

### Groupe PREDICATE
- INV-E-PRED-01 à 04: Catalog exhaustif + versionné

### Groupe EVIDENCE
- INV-E-EVID-01, 02: Regex strict + type valide

### Groupe LINEAGE
- INV-E-LINEAGE-01, 02: Hash parent + vérification chaîne

### Groupe SEGMENT
- INV-E-SEG-01 à 04: Append-only + rotation + manifest

### Groupe INDEX
- INV-E-IDX-01 à 03: Reconstructible + bijection + déterministe

### Groupe CONFLICT
- INV-E-CONFLICT-01: Détection CONTR-001/002/003
- INV-E-CONFLICT-02: Guard FAIL = no write
- **INV-E-CONFLICT-DET-03: semanticEquals pour comparaison (jamais !==)**

### Groupe STATUS
- INV-E-STATUS-01, 02: ACTIVE/SUPERSEDED/CONDITIONAL

### Groupe PIPELINE
- INV-E-PIPELINE-01, 02: Guard→Sentinel→Receipt bijection

### Groupe READ
- INV-E-READ-01 à 03: Index-based + déterministe

**Consulter CANON_SCHEMA_SPEC v1.2 pour définitions complètes.**

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE II — SÉQUENCE D'EXÉCUTION
# ════════════════════════════════════════════════════════════════════════════════

## §2.1 WARM-UP CHECKLIST

| # | Check | Commande | Attendu |
|---|-------|----------|---------|
| W1 | Node version | `node --version` | ≥18.0.0 |
| W2 | npm version | `npm --version` | ≥9.0.0 |
| W3 | TypeScript | `npx tsc --version` | ≥5.0.0 |
| W4 | Git clean | `git status --porcelain` | Vide ou contrôlé |
| W5 | Tag CD SEALED | `git tag -l "OMEGA_INTEGRATION_PHASE_CD*"` | Tag présent |
| W6 | Tests existants | `npm test` | PASS |
| W7 | Deps installées | `npm ci` | Exit 0 |
| W8 | Shared utils | `ls src/shared/` | clock.ts, canonical.ts, lock.ts |
| W9 | Spec v1.2 hash | Vérifier SHA-256 | 6a6298ae... |

**Si FAIL → STOP. Ne pas continuer.**

---

## §2.2 VÉRIFICATION CD SEALED

**Script** : `scripts/verify-cd-sealed.ts`

```typescript
/**
 * Vérifie que Phase C+D est SEALED avant Phase E
 */
import { execSync } from 'child_process';

const SEALED_PATHS = [
  'src/sentinel/types.ts',
  'src/sentinel/rules.ts',
  'src/sentinel/trace.ts',
  'src/sentinel/api.ts',
  'src/memory-write-runtime/adapter.ts',
  'src/shared/clock.ts',
  'src/shared/canonical.ts',
  'src/shared/lock.ts',
];

function main(): void {
  console.log('=== VERIFY CD SEALED ===');
  
  // Check tag
  const tags = execSync('git tag -l "OMEGA_INTEGRATION_PHASE_CD*"', { encoding: 'utf8' });
  if (!tags.includes('OMEGA_INTEGRATION_PHASE_CD')) {
    console.error('❌ FAIL: Phase CD tag not found');
    process.exit(1);
  }
  console.log('✅ CD tag:', tags.trim());
  
  // Check files
  for (const path of SEALED_PATHS) {
    try {
      execSync(`test -f ${path}`);
      console.log(`✅ ${path}`);
    } catch {
      console.error(`❌ ${path} missing`);
      process.exit(1);
    }
  }
  
  // Run tests
  try {
    execSync('npm test', { stdio: 'inherit' });
  } catch {
    console.error('❌ Tests failed');
    process.exit(1);
  }
  
  console.log('\n=== CD SEALED: PASS ===');
}

main();
```

---

## §2.3 SÉQUENCE GLOBALE (VERROUILLÉE)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SÉQUENCE D'EXÉCUTION PHASE E                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   PHASE 1: FONDATIONS                                                           │
│   ├── 1.1 WARM-UP ─────────────────────────────────────────────────► PASS/FAIL │
│   ├── 1.2 VERIFY CD SEALED ────────────────────────────────────────► PASS/FAIL │
│   └── 1.3 CREATE CONFIG FILES ─────────────────────────────────────► PASS/FAIL │
│                                                                                 │
│   PHASE 2: TYPES & FACTORY                                                      │
│   ├── 2.1 config-symbol.ts ────────────────────────────────────────► PASS/FAIL │
│   ├── 2.2 types.ts ────────────────────────────────────────────────► PASS/FAIL │
│   ├── 2.3 id-factory.ts ───────────────────────────────────────────► PASS/FAIL │
│   ├── 2.4 semantic-equals.ts ──────────────────────────────────────► PASS/FAIL │
│   └── 2.5 GATE E1 — SCHEMA MODEL ──────────────────────────────────► PASS/FAIL │
│                                                                                 │
│   PHASE 3: CATALOG & LINEAGE                                                    │
│   ├── 3.1 predicate-catalog.ts ────────────────────────────────────► PASS/FAIL │
│   ├── 3.2 lineage.ts ──────────────────────────────────────────────► PASS/FAIL │
│   └── 3.3 GATE E2 — CATALOG INTEGRITY ─────────────────────────────► PASS/FAIL │
│                                                                                 │
│   PHASE 4: STORAGE                                                              │
│   ├── 4.1 segment-writer.ts ───────────────────────────────────────► PASS/FAIL │
│   ├── 4.2 segment-manifest.ts ─────────────────────────────────────► PASS/FAIL │
│   ├── 4.3 GATE E3 — SEGMENT INTEGRITY ─────────────────────────────► PASS/FAIL │
│   ├── 4.4 index-builder.ts ────────────────────────────────────────► PASS/FAIL │
│   └── 4.5 GATE E4 — INDEX REBUILD ─────────────────────────────────► PASS/FAIL │
│                                                                                 │
│   PHASE 5: GUARD & QUERY                                                        │
│   ├── 5.1 guard.ts ────────────────────────────────────────────────► PASS/FAIL │
│   ├── 5.2 GATE E5 — CONFLICT DETECTION ────────────────────────────► PASS/FAIL │
│   ├── 5.3 query.ts ────────────────────────────────────────────────► PASS/FAIL │
│   └── 5.4 GATE E6 — QUERY DETERMINISM ─────────────────────────────► PASS/FAIL │
│                                                                                 │
│   PHASE 6: INTEGRATION                                                          │
│   ├── 6.1 canon-api.ts (façade) ───────────────────────────────────► PASS/FAIL │
│   ├── 6.2 GATE E7 — PIPELINE INTEGRITY ────────────────────────────► PASS/FAIL │
│   └── 6.3 GATE E-PERF — PERFORMANCE ───────────────────────────────► PASS/FAIL │
│                                                                                 │
│   PHASE 7: SEAL                                                                 │
│   ├── 7.1 SEAL E ──────────────────────────────────────────────────► SEALED    │
│   └── 7.2 RAPPORT FINAL ───────────────────────────────────────────► DONE      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**RÈGLE** : Si étape FAIL → STOP, corriger, relancer. Jamais sauter.

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE III — CONFIG FILES (RUNTIME)
# ════════════════════════════════════════════════════════════════════════════════

## §3.1 Fichiers Config (NON SCELLÉS)

**Fichier** : `config/canon/id_config.json`

```json
{
  "ID_RNG_HEX_LEN": 8,
  "ID_FORMAT_REGEX_CLM": "^CLM-[0-9a-f]+-[0-9a-f]{8}$",
  "ID_FORMAT_REGEX_ENT": "^ENT-[0-9a-f]+-[0-9a-f]{8}$",
  "ID_FORMAT_REGEX_EVD": "^EVD-[0-9a-f]+-[0-9a-f]{8}$"
}
```

**Fichier** : `config/canon/segment_config.json`

```json
{
  "SEGMENT_MAX_BYTES": 10000000,
  "SEGMENT_TARGET_BYTES": 8000000,
  "SEGMENT_ROTATE_STRATEGY": "AT_MAX",
  "SEGMENT_PREFIX": "seg-",
  "SEGMENT_EXTENSION": ".ndjson"
}
```

**Fichier** : `config/canon/perf_config.json`

```json
{
  "P95_GETBYID_TARGET_MS": 10,
  "P95_QUERY_TARGET_MS": 100,
  "PERF_SEED_CLAIMS_COUNT": 10000
}
```

**Fichier** : `config/canon/predicate_catalog.json`

```json
{
  "version": "1.0.0",
  "predicates": [
    {
      "id": "IS_A",
      "description": "Entity type classification",
      "subject_type": "ENTITY",
      "object_type": "ENTITY",
      "symmetric": false,
      "transitive": true,
      "introduced_version": 1
    },
    {
      "id": "HAS_NAME",
      "description": "Entity has name",
      "subject_type": "ENTITY",
      "object_type": "PRIMITIVE",
      "symmetric": false,
      "transitive": false,
      "introduced_version": 1
    },
    {
      "id": "HAS_ATTRIBUTE",
      "description": "Entity has attribute value",
      "subject_type": "ENTITY",
      "object_type": "PRIMITIVE",
      "symmetric": false,
      "transitive": false,
      "introduced_version": 1
    },
    {
      "id": "RELATED_TO",
      "description": "Generic relation between entities",
      "subject_type": "ENTITY",
      "object_type": "ENTITY",
      "symmetric": true,
      "transitive": false,
      "introduced_version": 1
    }
  ]
}
```

**⚠️ NOTE CRITIQUE**: Le prédicat `SUPERSEDES` est **ABSENT** du catalog.
La supersession est gérée **UNIQUEMENT** par le champ structurel `supersedes` dans `CanonClaim`.
**Raison**: Éviter double source de vérité (R22).

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE IV — MODULES PHASE 2 (TYPES & FACTORY)
# ════════════════════════════════════════════════════════════════════════════════

## §4.1 config-symbol.ts

**Spec complète** : CANON_SCHEMA_SPEC v1.2 §2

| Export | Type | Description |
|--------|------|-------------|
| `ConfigSymbol<K>` | Type | Wrapper typé pour clé config |
| `ConfigResolver` | Interface | resolve, resolveNumber, resolveString |
| `JsonConfigResolver` | Class | Implémentation JSON file |
| `createTestConfigResolver` | Function | Factory pour tests (valeurs inline) |

**Invariants** : INV-E-CONFIG-01, INV-E-CONFIG-02

---

## §4.2 types.ts

**Spec complète** : CANON_SCHEMA_SPEC v1.2 §3

| Export | Type | Description |
|--------|------|-------------|
| `ClaimId`, `EntityId`, `EvidenceId` | Brand<string> | IDs opaques |
| `PredicateType` | Brand<string> | Type prédicat catalogué |
| `CanonVersion` | Brand<number> | Version monotonique |
| `ChainHash` | Brand<string> | Hash SHA-256 |
| `MonoNs` | Brand<bigint> | Timestamp nano monotonique |
| `RefId` | Union | EvidenceId \| ClaimId |
| `ClaimStatus` | Union | ACTIVE \| SUPERSEDED \| CONDITIONAL |
| `EvidenceType` | Union | CHAPTER \| NOTE \| DECISION \| EXTERNAL \| CANON_CLAIM |
| `EvidenceRef` | Interface | { type, id, location? } |
| `CanonClaim` | Interface | Claim complet avec supersedes structurel |
| `CanonError` | Class | Erreurs typées avec codes |

**Invariants** : INV-E-NAN-01, INV-E-STATUS-01, INV-E-STATUS-02

---

## §4.3 id-factory.ts

**Spec complète** : CANON_SCHEMA_SPEC v1.2 §3.2

| Export | Type | Description |
|--------|------|-------------|
| `DeterministicRng` | Interface | nextHex(length) |
| `SeededRng` | Class | LCG implementation déterministe |
| `IdFactory` | Interface | create*Id, validate*Id |
| `DeterministicIdFactory` | Class | Clock + RNG + ConfigResolver |
| `createTestIdFactory` | Function | Factory pour tests |

**Code clé (ConfigSymbol, pas literal)** :

```typescript
constructor(clock: MonoClock, rng: DeterministicRng, config: ConfigResolver) {
  this.hexLen = config.resolveNumber('ID_RNG_HEX_LEN'); // ← Symbol, pas "8"
  this.clmRegex = new RegExp(config.resolveString('ID_FORMAT_REGEX_CLM'));
  // ...
}
```

**Invariants** : INV-E-ID-01, INV-E-ID-DET-01, INV-E-ID-VALID-01

---

## §4.4 semantic-equals.ts

**Spec complète** : CANON_SCHEMA_SPEC v1.2 §3.8

| Export | Type | Description |
|--------|------|-------------|
| `semanticEquals` | Function | Comparaison via canonicalize |
| `containsNaN` | Function | Détection NaN récursive |

**Code critique** :

```typescript
/**
 * Compare deux valeurs sémantiquement via canonical JSON.
 * INTERDIT d'utiliser !== directement (INT-E-07).
 */
export function semanticEquals(a: unknown, b: unknown): boolean {
  // Gestion bigint
  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a === b;
  }
  // Gestion null/undefined
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false;
  }
  // Comparaison via canonical
  return canonicalize(a) === canonicalize(b);
}

/**
 * Détecte NaN récursivement dans une structure.
 * NaN = INVALID_VALUE_NAN (INT-E-08).
 */
export function containsNaN(value: unknown): boolean {
  if (typeof value === 'number' && Number.isNaN(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(containsNaN);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(containsNaN);
  }
  return false;
}
```

**Invariants** : INV-E-SEMANTIC-01, INV-E-SEMANTIC-02, INV-E-NAN-01

---

## §4.5 GATE E1 — SCHEMA MODEL

### Checklist E1 (Blockers spec v1.2)

| ID | Check | Vérification |
|----|-------|--------------|
| E1-B1 | Zéro non-déterminisme | grep -r "Math.random\|crypto.randomUUID\|Date.now" src/canon/ |
| E1-B2 | Canonical + undefined→null | Golden test E1-GOLD-1 |
| E1-B3 | Types cohérents | EvidenceRef regex, RefId union |
| E1-B4 | semanticEquals utilisé | grep -r "!==" src/canon/ = 0 pour sémantique |
| E1-B5 | No magic numbers | grep -rE "[0-9]+" src/canon/ vérifié |
| E1-B6 | Supersedes unique | Champ structurel, pas prédicat |

### Tests E1

| ID | Test | Invariant |
|----|------|-----------|
| E1-T1 | ID determinism (même clock+rng seed) | INV-E-ID-DET-01 |
| E1-T2 | Config symbols resolution | INV-E-CONFIG-02 |
| E1-T3 | Canonical hash stable | INV-E-CANONICAL-01 |
| E1-T4 | undefined → null | INV-E-CANONICAL-03 |
| E1-T5 | Schema validation (valid/invalid/NaN) | INV-E-NAN-01 |
| E1-T6 | EvidenceRef regex strict | INV-E-EVID-01 |
| E1-T7 | semanticEquals bigint | INV-E-SEMANTIC-02 |
| E1-T8 | containsNaN récursif | INV-E-NAN-01 |

### Golden Tests (OBLIGATOIRES)

**E1-GOLD-1 : undefined → null**
```typescript
const obj = { a: undefined, b: 1, c: { d: undefined } };
const expected = '{"a":null,"b":1,"c":{"d":null}}';
expect(canonicalize(obj)).toBe(expected);
```

**E1-GOLD-2 : semanticEquals bigint**
```typescript
expect(semanticEquals(BigInt(123), BigInt(123))).toBe(true);
expect(semanticEquals(BigInt(123), BigInt(456))).toBe(false);
expect(semanticEquals(BigInt(123), 123)).toBe(false); // Types différents
```

**E1-GOLD-3 : containsNaN récursif**
```typescript
expect(containsNaN({ a: 1, b: { c: NaN } })).toBe(true);
expect(containsNaN({ a: 1, b: [2, NaN] })).toBe(true);
expect(containsNaN({ a: 1, b: 2 })).toBe(false);
```

**E1-GOLD-4 : Hash stable**
```typescript
const claim = { /* claim complet */ };
const hash1 = sha256(canonicalize(claim));
const hash2 = sha256(canonicalize(claim));
expect(hash1).toBe(hash2); // Toujours identique
```

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE V — MODULES PHASE 3 (CATALOG & LINEAGE)
# ════════════════════════════════════════════════════════════════════════════════

## §5.1 predicate-catalog.ts

| Export | Type | Description |
|--------|------|-------------|
| `PredicateCatalogEntry` | Interface | Définition prédicat |
| `PredicateCatalog` | Interface | Catalog versionné |
| `loadCatalog` | Function | Charge depuis config |
| `validatePredicate` | Function | Vérifie existence |
| `getCatalogHash` | Function | Hash SHA-256 du catalog |

**Invariants** : INV-E-PRED-01, INV-E-PRED-02, INV-E-PRED-03, INV-E-PRED-04

---

## §5.2 lineage.ts

| Export | Type | Description |
|--------|------|-------------|
| `computeLineageHash` | Function | Hash parent via canonical |
| `verifyLineageChain` | Function | Vérifie chaîne |
| `getParentClaim` | Function | Récupère parent |

**Règle** (spec v1.2 §3.6) :
- `lineage_hash` = SHA256(canonicalize(parent_claim)) si supersedes
- `lineage_hash` = SHA256("GENESIS") si premier claim

**Invariants** : INV-E-LINEAGE-01, INV-E-LINEAGE-02

---

## §5.3 GATE E2 — CATALOG INTEGRITY

| ID | Test | Invariant |
|----|------|-----------|
| E2-T1 | Catalog load déterministe | INV-E-PRED-03 |
| E2-T2 | Unknown predicate = FAIL | INV-E-PRED-01 |
| E2-T3 | Catalog hash stable | INV-E-PRED-03 |
| E2-T4 | Lineage hash computation | INV-E-LINEAGE-01 |
| E2-T5 | Lineage GENESIS | INV-E-LINEAGE-01 |
| E2-T6 | Pas de SUPERSEDES dans catalog | R22 |

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE VI — MODULES PHASE 4 (STORAGE)
# ════════════════════════════════════════════════════════════════════════════════

## §6.1 segment-writer.ts

| Export | Type | Description |
|--------|------|-------------|
| `SegmentWriter` | Class | Écrit claims NDJSON |
| `appendClaim` | Method | Ajoute (avec lock) |
| `shouldRotate` | Method | Test via ConfigSymbol |
| `rotate` | Method | Ferme + crée nouveau |

**Utilise** : `src/shared/lock.ts` (SEALED)

**Invariants** : INV-E-SEG-01 à 04

---

## §6.2 segment-manifest.ts

| Export | Type | Description |
|--------|------|-------------|
| `SegmentManifest` | Interface | Manifest complet |
| `SegmentInfo` | Interface | Info par segment |
| `loadManifest` | Function | Charge |
| `updateManifest` | Function | Met à jour |
| `computeManifestHash` | Function | Hash |

---

## §6.3 GATE E3 — SEGMENT INTEGRITY

| ID | Test | Invariant |
|----|------|-----------|
| E3-T1 | Rotation à SEGMENT_MAX_BYTES | INV-E-SEG-04 |
| E3-T2 | Manifest hash correct | INV-E-SEG-03 |
| E3-T3 | Segment sealed = immuable | INV-E-SEG-03 |
| E3-T4 | Ordre strict respecté | INV-E-SEG-01 |
| E3-T5 | Append fin uniquement | INV-E-SEG-02 |

---

## §6.4 index-builder.ts

| Export | Type | Description |
|--------|------|-------------|
| `ClaimIndex` | Interface | claim_id → offset |
| `buildIndex` | Function | Construit |
| `rebuildIndex` | Function | Reconstruit |
| `getClaimOffset` | Function | Lookup |

**Invariants** : INV-E-IDX-01 à 03

---

## §6.5 GATE E4 — INDEX REBUILD

| ID | Test | Invariant |
|----|------|-----------|
| E4-T1 | Index 100% reconstructible | INV-E-IDX-01 |
| E4-T2 | Bijection claim_id ↔ offset | INV-E-IDX-02 |
| E4-T3 | Rebuild déterministe | INV-E-IDX-03 |
| E4-T4 | Rebuild après corruption | INV-E-IDX-01 |

---

# ════════════════════════════════════════════════════════════════════════════════
#                    PARTIE VII — MODULES PHASE 5 (GUARD & QUERY)
# ════════════════════════════════════════════════════════════════════════════════

## §7.1 guard.ts

| Export | Type | Description |
|--------|------|-------------|
| `CanonGuard` | Class | Validation avant write |
| `validateClaim` | Method | Valide complet |
| `checkNaN` | Method | containsNaN |
| `checkConflict` | Method | CONTR-001/002/003 |
| `checkPredicate` | Method | Vérifie catalog |
| `checkEvidence` | Method | Vérifie EvidenceRef |

### Règles de Contradiction (spec v1.2 §6)

| ID | Règle | Détection |
|----|-------|-----------|
| CONTR-001 | Même (subject, predicate) + objets différents | **semanticEquals**, pas !== |
| CONTR-002 | Entité référencée manquante | Query existence |
| CONTR-003 | Boucle supersession | DAG validation |

**⚠️ CRITIQUE** : CONTR-001 utilise `semanticEquals()` (INV-E-CONFLICT-DET-03)

**Invariants** : INV-E-CONFLICT-01, INV-E-CONFLICT-02, INV-E-CONFLICT-DET-03, INV-E-NAN-01

---

## §7.2 GATE E5 — CONFLICT DETECTION

| ID | Test | Invariant |
|----|------|-----------|
| E5-T1 | CONTR-001 avec semanticEquals | INV-E-CONFLICT-DET-03 |
| E5-T2 | CONTR-001 objets équivalents = pas de conflit | INV-E-CONFLICT-DET-03 |
| E5-T3