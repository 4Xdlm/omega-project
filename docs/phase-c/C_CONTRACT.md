# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA PHASE C — CONTRACT SPECIFICATION
#   SENTINEL_JUDGE — Système de Décision Souverain
#
#   Version: 1.1.0
#   Date: 2026-01-26
#   Status: DRAFT → AUTHORITATIVE après validation Architecte
#
#   Standard: NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# 📋 TABLE OF CONTENTS

1. Purpose
2. Scope & Nomenclature
3. Input Gates
4. Output Artifacts
5. Verdicts
6. Volatile Fields Exclusion
7. PolicyRef & PolicyBundle
8. ForgeAdapter (Phase B Liaison)
9. Invariants
10. Calibration Binding
11. Determinism Requirements
12. Schema References
13. Revision History

---

# 1. PURPOSE

SENTINEL_JUDGE = **juge souverain** du système OMEGA.

**Rôle** : Aucune donnée "signifiante" n'entre dans CANON, MEMORY ou ne devient artefact promu sans :
- Décision **explicite**
- Preuve **vérifiable**
- Trace **append-only**

**Ce que SENTINEL_JUDGE fait** :
- Juge des claims (assertions à valider)
- Produit des verdicts (ACCEPT/REJECT/DEFER/APPEAL)
- Maintient une chaîne de jugements append-only

**Ce que SENTINEL_JUDGE NE fait PAS** :
- Créer du contenu (pas de génération)
- Modifier CANON ou MEMORY (lecture seule + verdict)
- Stocker des états mutables

---

# 2. SCOPE & NOMENCLATURE

## 2.1 Distinction avec SENTINEL_CORE

| Module | Path | Rôle | Invariants |
|--------|------|------|------------|
| **SENTINEL_CORE** | `packages/sentinel/` | Validation inputs, foundation | INV-SENT-* (87 existants) |
| **SENTINEL_JUDGE** | `packages/sentinel-judge/` | Système de décision Phase C | INV-C-* (nouveaux) |

**Règle** : SENTINEL_JUDGE peut utiliser SENTINEL_CORE comme dépendance. L'inverse est INTERDIT.

## 2.2 Appellation dans la documentation

- Phase C s'appelle officiellement : **"DECISION / SENTINEL_JUDGE"**
- Jamais "SENTINEL" tout court (ambiguïté)
- Abréviation acceptable : "SJ" ou "C-JUDGE"

---

# 3. INPUT GATES

## 3.1 DecisionRequest Structure

```typescript
interface DecisionRequest {
  // === IDENTIFICATION ===
  traceId: string;                    // Unique, format: "C-{timestamp}-{uuid4}"
  submittedBy: string;                // Module ID (ex: "FORGE_ADAPTER", "MANUAL")
  submittedAt: string;                // ISO 8601 (VOLATILE - exclu du hash)
  
  // === CLAIM ===
  claim: Claim;
  
  // === CONTEXT ===
  contextRefs: ContextRef[];
  
  // === EVIDENCE ===
  evidencePack: EvidencePack;
  
  // === POLICIES ===
  policyBundle: PolicyBundle;
}

interface Claim {
  type: ClaimType;
  payload: Record<string, unknown>;
  payloadHash: string;                // SHA-256 of canonical JSON payload
}

type ClaimType = 
  | "ARTIFACT_CERTIFICATION"          // Certifier artefact Phase B
  | "EVIDENCE_VALIDATION"             // Valider un paquet de preuves
  | "SEGMENT_ACCEPTANCE"              // Accepter segment généré Forge
  | "FACT_PROMOTION"                  // Promouvoir fait vers CANON
  | "MEMORY_ENTRY"                    // Écrire en MEMORY
  | "CUSTOM";                         // Extensible

interface ContextRef {
  refType: "PHASE_A" | "PHASE_B" | "CANON" | "MEMORY" | "ARTIFACT";
  path: string;
  sha256: string;
  version?: string;
}

interface EvidencePack {
  inputsDigest: string;               // SHA-256 of all inputs (sorted)
  proofs: Proof[];
  missing: MissingEvidence[];
}

interface Proof {
  proofType: string;                  // ex: "HASH_CHAIN", "J1_VERDICT", "GATE_PASS"
  source: string;                     // ex: "genesis-forge/J1_JUDGE"
  sourceVersion: string;
  hash: string;
  verdict: "PASS" | "FAIL" | "WARN" | "SKIP";
  metrics?: Record<string, unknown>;  // Optionnel, pas de magic numbers
}

interface MissingEvidence {
  evidenceType: string;
  reason: string;
  blocksVerdict: boolean;
}
```

## 3.2 Gate Classification & Failure Policy

### Gate Classes

| GateClass | Description |
|-----------|-------------|
| **REQUIRED** | Gate MUST pass for execution to proceed |
| **OPTIONAL** | Gate failure produces WARNING, does not block |

### Failure Policies

| FailPolicy | When Applied | Effect |
|------------|--------------|--------|
| **REJECT** | Integrity violation, invalid data | Verdict = REJECT |
| **DEFER** | Missing data, uncalibrated threshold | Verdict = DEFER |
| **APPEAL** | Conflict detected | Verdict = APPEAL |

### Default Policy

**MissingEvidencePolicy: DEFER** — If evidence is missing but request is otherwise valid, verdict = DEFER with requiredActions listing what's needed.

## 3.3 Gate Definitions

| Gate | Check | GateClass | FailPolicy | Error Code |
|------|-------|-----------|------------|------------|
| GATE_C_01 | traceId matches pattern "C-{timestamp}-{uuid4}" | REQUIRED | REJECT | ERR-C-GATE-01 |
| GATE_C_02 | claim.payloadHash === SHA256(canonical(claim.payload)) | REQUIRED | REJECT | ERR-C-GATE-02 |
| GATE_C_03 | All contextRefs have valid sha256 | REQUIRED | REJECT | ERR-C-GATE-03 |
| GATE_C_04 | evidencePack.inputsDigest is valid | REQUIRED | REJECT | ERR-C-GATE-04 |
| GATE_C_05 | policyBundle contains at least one PolicyRef | REQUIRED | REJECT | ERR-C-GATE-05 |
| GATE_C_06 | All PolicyRef.sourceSha256 are valid | REQUIRED | REJECT | ERR-C-GATE-06 |
| GATE_C_07 | No magic numbers in request | REQUIRED | REJECT | ERR-C-GATE-07 |
| GATE_C_08 | evidencePack.missing with blocksVerdict=true | OPTIONAL | DEFER | ERR-C-GATE-08 |
| GATE_C_09 | Uncalibrated threshold detected | OPTIONAL | DEFER | ERR-C-GATE-09 |

## 3.4 Gate Composition Rule

```typescript
type GateClass = "REQUIRED" | "OPTIONAL";
type FailPolicy = "REJECT" | "DEFER" | "APPEAL";

interface GateDefinition {
  id: string;
  check: (request: DecisionRequest) => boolean;
  gateClass: GateClass;
  failPolicy: FailPolicy;
  errorCode: string;
}

function evaluateGates(request: DecisionRequest): GateResult {
  const failures: GateFailure[] = [];
  
  // Step 1: Evaluate REQUIRED gates
  for (const gate of REQUIRED_GATES) {
    const result = gate.check(request);
    if (!result) {
      // REQUIRED gate failure = immediate stop
      return { 
        proceed: false, 
        suggestedVerdict: gate.failPolicy,  // REJECT
        errorCode: gate.errorCode,
        failures: [{ gate, reason: gate.errorCode }]
      };
    }
  }
  
  // Step 2: Evaluate OPTIONAL gates
  for (const gate of OPTIONAL_GATES) {
    const result = gate.check(request);
    if (!result) {
      failures.push({ gate, reason: gate.errorCode });
    }
  }
  
  // Step 3: Determine suggested verdict from optional failures
  if (failures.some(f => f.gate.failPolicy === "DEFER")) {
    return { proceed: true, suggestedVerdict: "DEFER", failures };
  }
  if (failures.some(f => f.gate.failPolicy === "APPEAL")) {
    return { proceed: true, suggestedVerdict: "APPEAL", failures };
  }
  
  return { proceed: true, suggestedVerdict: null, failures };
}
```

---

# 4. OUTPUT ARTIFACTS

## 4.1 Directory Structure

```
nexus/proof/phase_c/
├── requests/
│   └── {traceId}/
│       ├── DECISION_REQUEST.json
│       ├── EVIDENCE_PACK.json
│       └── POLICY_BUNDLE.json
├── judgements/
│   └── {traceId}/
│       ├── JUDGEMENT.json
│       └── JUDGEMENT_CHAIN.log      ← Append-only
├── appeals/
│   └── {traceId}/
│       ├── APPEAL_REQUEST.json
│       └── APPEAL_JUDGEMENT.json
├── C_JUDGEMENT_CHAIN.log            ← Global append-only chain
└── C_MANIFEST.sha256                ← SHA256 of all artifacts (sorted)
```

## 4.2 Judgement Structure

```typescript
interface Judgement {
  // === IDENTIFICATION ===
  judgementId: string;                // Unique, format: "J-{timestamp}-{uuid4}"
  traceId: string;                    // Links to DecisionRequest
  
  // === VERDICT ===
  verdict: Verdict;
  
  // === REASONS ===
  reasons: ReasonCode[];              // Codes stables, pas de texte libre
  
  // === ACTIONS ===
  requiredActions: RequiredAction[];
  
  // === EVIDENCE REFS ===
  evidenceRefs: string[];             // SHA256 des preuves utilisées
  
  // === CHAIN ===
  prevJudgementHash: string;          // Previous judgement in chain (or "GENESIS")
  judgementHash: string;              // SHA256 of this judgement (excluding this field)
  
  // === METADATA (VOLATILE) ===
  executedAt: string;                 // ISO 8601 (VOLATILE - exclu du hash)
  executionDurationMs: number;        // VOLATILE - exclu du hash
}

type Verdict = "ACCEPT" | "REJECT" | "DEFER" | "APPEAL";

interface ReasonCode {
  code: string;                       // ex: "RC-001", "INV-C-01-VIOLATION"
  severity: "BLOCKER" | "MAJOR" | "MINOR";
  invariantRef?: string;              // ex: "INV-C-01"
}

interface RequiredAction {
  actionType: string;                 // ex: "PROVIDE_EVIDENCE", "RECALIBRATE", "ESCALATE"
  description: string;
  targetModule?: string;
}
```

---

# 5. VERDICTS

## 5.1 Verdict Definitions

| Verdict | Condition | Effect |
|---------|-----------|--------|
| **ACCEPT** | Toutes preuves complètes + tous invariants satisfaits + toutes policies PASS | Claim validé, peut être promu |
| **REJECT** | Invariant violé OU preuve invalide OU signature incohérente OU policy BLOCKER fail | Claim rejeté, trace conservée |
| **DEFER** | Preuve manquante OU calibration manquante OU seuil non défini | Attente d'information complémentaire |
| **APPEAL** | Conflit entre preuves OU conflit avec jugement antérieur | Escalade pour résolution |

## 5.2 Verdict Determination Algorithm

```typescript
function determineVerdict(
  request: DecisionRequest, 
  gateResult: GateResult
): Verdict {
  // Step 0: Apply gate-suggested verdict if any
  if (gateResult.suggestedVerdict) {
    return gateResult.suggestedVerdict;
  }
  
  // Step 1: Check for BLOCKER violations
  for (const policy of request.policyBundle.policies) {
    const result = evaluatePolicy(policy, request);
    if (result.status === "FAIL" && policy.severity === "BLOCKER") {
      return "REJECT";
    }
  }
  
  // Step 2: Check for missing evidence that blocks
  for (const missing of request.evidencePack.missing) {
    if (missing.blocksVerdict) {
      return "DEFER";
    }
  }
  
  // Step 3: Check for uncalibrated thresholds
  if (hasUncalibratedThresholds(request)) {
    return "DEFER";
  }
  
  // Step 4: Check for conflicts
  if (hasConflictingEvidence(request) || hasConflictWithPriorJudgement(request)) {
    return "APPEAL";
  }
  
  // Step 5: All checks pass
  return "ACCEPT";
}
```

---

# 6. VOLATILE FIELDS EXCLUSION

## 6.1 Problem Statement

Certains champs varient entre exécutions même pour inputs identiques. Ils doivent être exclus du hash pour garantir le déterminisme.

## 6.2 Classification

### VOLATILE (Exclus du hash)

| Field | Type | Location | Reason |
|-------|------|----------|--------|
| `submittedAt` | string | DecisionRequest | Timestamp varie |
| `executedAt` | string | Judgement | Timestamp varie |
| `executionDurationMs` | number | Judgement | Durée varie |

### DETERMINISTIC (Inclus dans le hash)

| Field | Type | Location | Reason |
|-------|------|----------|--------|
| `traceId` | string | DecisionRequest | Identité du dossier |
| `judgementId` | string | Judgement | Identité du jugement |
| `verdict` | Verdict | Judgement | Décision core |
| `reasons` | ReasonCode[] | Judgement | Justification |
| `prevJudgementHash` | string | Judgement | Chaînage |
| `claim.*` | * | DecisionRequest | Contenu de la demande |
| `evidencePack.*` | * | DecisionRequest | Preuves |
| `policyBundle.*` | * | DecisionRequest | Règles |

## 6.3 Hash Computation

```typescript
function computeJudgementHash(judgement: Judgement): string {
  const forHash = {
    judgementId: judgement.judgementId,
    traceId: judgement.traceId,
    verdict: judgement.verdict,
    reasons: judgement.reasons,
    requiredActions: judgement.requiredActions,
    evidenceRefs: judgement.evidenceRefs,
    prevJudgementHash: judgement.prevJudgementHash
    // EXCLUDED: executedAt, executionDurationMs, judgementHash
  };
  return sha256(canonicalJson(forHash));
}
```

---

# 7. POLICYREF & POLICYBUNDLE

## 7.1 PolicyRef Structure

```typescript
interface PolicyRef {
  invariantId: string;                // ex: "INV-C-01"
  sourcePath: string;                 // ex: "docs/INVARIANTS.md"
  sourceSha256: string;               // SHA256 du fichier source
  versionTag: string;                 // ex: "v3.34.0"
  scope: PolicyScope;
  severity: PolicySeverity;
}

type PolicyScope = 
  | "CANON"                           // Policies pour promotion CANON
  | "MEMORY"                          // Policies pour écriture MEMORY
  | "ARTIFACT"                        // Policies pour certification artefacts
  | "PROMOTION"                       // Policies pour promotion générale
  | "ALL";                            // S'applique partout

type PolicySeverity = 
  | "BLOCKER"                         // Violation = REJECT
  | "MAJOR"                           // Violation = APPEAL ou DEFER
  | "MINOR";                          // Violation = WARNING dans reasons
```

## 7.2 PolicyBundle Structure

```typescript
interface PolicyBundle {
  bundleId: string;                   // Unique identifier
  bundleVersion: string;              // ex: "1.0.0"
  bundleSha256: string;               // SHA256 of sorted policies
  policies: PolicyRef[];
  calibrationRef?: CalibrationRef;    // Optional link to calibration
}

interface CalibrationRef {
  path: string;                       // ex: "tools/calibration/C_SENTINEL_calibration.json"
  sha256: string;
  version: string;
}
```

## 7.3 PolicyRef Validation Rules

```
RULE_P_01: invariantId must match pattern "INV-{MODULE}-{NUMBER}"
RULE_P_02: sourcePath must exist and be readable
RULE_P_03: sourceSha256 must match actual SHA256 of sourcePath
RULE_P_04: sourceSha256 cannot be "REQUIRED" or empty
RULE_P_05: versionTag must be non-empty
RULE_P_06: scope must be valid PolicyScope
RULE_P_07: severity must be valid PolicySeverity
```

**SENTINEL_JUDGE MUST REJECT any PolicyRef that fails any rule.**

---

# 8. FORGEADAPTER (PHASE B LIAISON)

## 8.1 Purpose

ForgeAdapter permet à SENTINEL_JUDGE d'utiliser les capacités de GENESIS FORGE (Phase B scellée) pour évaluer des preuves émotionnelles.

## 8.2 Import Strategy

```typescript
// Path relatif depuis packages/sentinel-judge/src/
import { 
  EmotionBridge,
  J1EmotionBindingJudge,
  analyzeEmotion,
  type EmotionAnalysisResult,
  type J1Result
} from "../../../../genesis-forge/src/genesis/index.js";
```

## 8.3 Version Binding

| Module | Version | Path | Status |
|--------|---------|------|--------|
| genesis-forge | v1.2.1 | `genesis-forge/` | Phase B SEALED |
| EmotionBridge | — | `src/genesis/core/emotion_bridge.ts` | READ-ONLY |
| J1EmotionBindingJudge | — | `src/genesis/judges/j1_emotion_binding.ts` | READ-ONLY |

## 8.4 Invariants ForgeAdapter

```
INV-C-FA-01: ForgeAdapter MUST NOT mutate any state in genesis-forge
INV-C-FA-02: ForgeAdapter MUST NOT call any write/save functions
INV-C-FA-03: ForgeAdapter MUST use EmotionBridge(false) to disable cache
INV-C-FA-04: ForgeAdapter MUST apply volatile field sanitization (§6)
INV-C-FA-05: If required export does not exist in Phase B → DEFER (no hack)
```

## 8.5 Available Exports (from Phase B API Probe)

| Export | Type | Available |
|--------|------|-----------|
| `EmotionBridge` | class | ✅ YES |
| `analyzeEmotion` | function | ✅ YES |
| `J1EmotionBindingJudge` | class | ✅ YES |
| `judgeEmotionBinding` | function | ✅ YES |
| `cosineSimilarity14D` | function | ✅ YES |
| `euclideanDistance14D` | function | ✅ YES |

---

# 9. INVARIANTS

## 9.1 Core Invariants (INV-C-*)

| ID | Description | Check | Severity |
|----|-------------|-------|----------|
| **INV-C-01** | Zéro hypothèse implicite : toute décision cite ses règles + preuves | reasons[] non vide, evidenceRefs[] non vide | BLOCKER |
| **INV-C-02** | Append-only : aucune suppression/modification de jugement | Journal append-only, hash chain intègre | BLOCKER |
| **INV-C-03** | Déterminisme : mêmes inputs → même verdict + même judgementHash | RUN1 == RUN2 byte-identical | BLOCKER |
| **INV-C-04** | Non-régression : ACCEPT ne devient pas implicitement faux | APPEAL explicite requis pour contredire | BLOCKER |
| **INV-C-05** | Numbers policy : tout seuil = symbole τ_* via calibration | Aucun magic number | BLOCKER |
| **INV-C-06** | Trace complète : chaque jugement rejouable par auditeur | Artefacts complets | BLOCKER |
| **INV-C-07** | Anti-dérive confort : décision augmentant confort → justification métrique | Metric ref obligatoire | MAJOR |

## 9.2 Gate Invariants (INV-C-GATE-*)

| ID | Description | GateClass | FailPolicy |
|----|-------------|-----------|------------|
| **INV-C-GATE-01** | REQUIRED gates must all pass for proceed=true | REQUIRED | REJECT |
| **INV-C-GATE-02** | Failed gate produces specific error code | REQUIRED | REJECT |
| **INV-C-GATE-03** | Gate failure is logged and traceable | REQUIRED | REJECT |
| **INV-C-GATE-04** | OPTIONAL gate failures suggest verdict but don't block | OPTIONAL | DEFER/APPEAL |

## 9.3 ForgeAdapter Invariants (INV-C-FA-*)

| ID | Description | Check |
|----|-------------|-------|
| **INV-C-FA-01** | No mutation of genesis-forge state | Code review + test |
| **INV-C-FA-02** | No write/save calls | Static analysis |
| **INV-C-FA-03** | Cache disabled | EmotionBridge(false) |
| **INV-C-FA-04** | Volatile field sanitization | Unit test |
| **INV-C-FA-05** | Missing export → DEFER | Graceful handling test |

## 9.4 Chain Invariants (INV-C-CHAIN-*)

| ID | Description | Check |
|----|-------------|-------|
| **INV-C-CHAIN-01** | prevJudgementHash links to existing judgement (or "GENESIS") | Chain verification |
| **INV-C-CHAIN-02** | judgementHash is correctly computed | Recomputation test |
| **INV-C-CHAIN-03** | Chain is append-only (no gaps, no rewrites) | Integrity check |

---

# 10. CALIBRATION BINDING

## 10.1 Rule

**NO MAGIC NUMBERS.** All numeric thresholds come from calibration or are explicit symbols.

## 10.2 Symbolic Thresholds

| Symbol | Description | Usage |
|--------|-------------|-------|
| `τ_CONFIDENCE_MIN` | Minimum confidence for ACCEPT | Evidence evaluation |
| `τ_EVIDENCE_COMPLETENESS_MIN` | Minimum completeness ratio | Missing evidence check |
| `τ_MISSING_COUNT_GT` | Max missing evidence before DEFER | DEFER trigger |
| `τ_CONFLICT_THRESHOLD` | Threshold for conflict detection | APPEAL trigger |

## 10.3 Resolution Mechanism

```typescript
interface CalibrationResolver {
  resolve(symbol: string): number | null;
  isCalibrated(symbol: string): boolean;
  getCalibrationSource(): CalibrationRef;
}

// If symbol is not calibrated → DEFER verdict
// No default values allowed in Phase C.1
```

## 10.4 Calibration File Reference

Source: `tools/calibration/C_SENTINEL_calibration.json`

---

# 11. DETERMINISM REQUIREMENTS

## 11.1 Byte-Identical Output Requirement

**INV-C-03** requires that for identical inputs, SENTINEL_JUDGE produces **byte-identical** outputs (excluding volatile fields).

## 11.2 Determinism Components

| Component | Requirement |
|-----------|-------------|
| **JSON Serialization** | Canonical JSON with sorted keys |
| **Hash Computation** | SHA-256, deterministic input ordering |
| **Volatile Exclusion** | `submittedAt`, `executedAt`, `executionDurationMs` excluded |
| **Sorting** | Arrays sorted by stable criteria before hashing |

## 11.3 Canonical JSON Specification

```typescript
function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Sort object keys
      return Object.keys(value).sort().reduce((sorted, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {} as Record<string, unknown>);
    }
    return value;
  });
}
```

## 11.4 Verification Protocol

```
RUN1:
  input = DecisionRequest
  output1 = judge(input)
  hash1 = computeJudgementHash(output1)

RUN2:
  input = DecisionRequest (identical)
  output2 = judge(input)
  hash2 = computeJudgementHash(output2)

ASSERTION:
  hash1 === hash2  // MUST be true
  canonicalJson(output1_deterministic) === canonicalJson(output2_deterministic)
```

---

# 12. SCHEMA REFERENCES

Schemas are defined in `docs/phase-c/schema/`:

| Schema | Path | Description |
|--------|------|-------------|
| PolicyRef | `policy_ref.schema.json` | Single policy reference |
| PolicyBundle | `policy_bundle.schema.json` | Bundle of policies |
| DecisionRequest | `decision_request.schema.json` | Input to SENTINEL_JUDGE |
| EvidencePack | `evidence_pack.schema.json` | Evidence container |
| Judgement | `judgement.schema.json` | Output from SENTINEL_JUDGE |

---

# 13. REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-26 | Initial contract (DRAFT) |
| 1.1.0 | 2026-01-26 | Added GateClass/FailPolicy (§3.2-3.4), Determinism Requirements (§11), Schema refs |

---

# 📜 SEAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  C_CONTRACT v1.1.0                                                                                    ║
║  Date: 2026-01-26                                                                                     ║
║  Status: DRAFT → AUTHORITATIVE after Architect validation                                             ║
║                                                                                                       ║
║  Phase C = DECISION / SENTINEL_JUDGE                                                                  ║
║  Standard: NASA-Grade L4 / DO-178C Level A                                                            ║
║                                                                                                       ║
║  Changes v1.1.0:                                                                                      ║
║  - GateClass (REQUIRED/OPTIONAL) + FailPolicy (REJECT/DEFER/APPEAL)                                   ║
║  - MissingEvidencePolicy: DEFER                                                                       ║
║  - Determinism Requirements (§11) with byte-identical specification                                   ║
║  - Schema references updated                                                                          ║
║                                                                                                       ║
║  Any implementation not conforming to this contract is INVALID.                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```
