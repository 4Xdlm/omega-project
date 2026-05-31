# OMEGA — PHASE H (v1.2) — DELIVERY / OUTPUT FORMATS (MVP + HARDENED)
NASA-Grade L4 • Deterministic • Audit-Hostile • Zero Approximation

## MISSION
Implement Phase H "Delivery Engine" that packages an already-validated text into deterministic artifacts:
- TEXT
- MARKDOWN
- JSON_PACK
- PROOF_PACK
- HASH_CHAIN (hash chain only for quick audit)

Phase H MUST NOT change validatedText bytes in the BODY. Envelope (headers/footers) is separate.

## REPO
Path: C:\Users\elric\omega-project
Baseline tests: currently all PASS (3485).

## SEALED ZONES (READ ONLY — DO NOT MODIFY)
- src/canon/
- src/gates/
- src/sentinel/
- src/memory/
- src/orchestrator/
- genesis-forge/

## WORK ZONES (CREATE ONLY)
- src/delivery/
- tests/delivery/
- tests/delivery/integration/
- config/delivery/
- artefacts/delivery/        # runtime outputs only (never commit)
- manifests/                 # commit hash manifests

## ABSOLUTE PROHIBITIONS
❌ Modify anything in SEALED zones
❌ Auto-correct / content rewrite
❌ Probabilistic thresholds / ML/NLP
❌ Network calls (fetch/http/https/net)
❌ Dynamic imports (import(), dynamic require)
❌ ENV overrides for critical paths
❌ CRLF outputs, BOM outputs, path traversal filenames

## CRITICAL DEFINITIONS (AUDIT-PROOF)

### Envelope vs Body
- **BODY** = validatedText bytes EXACTLY (unchanged)
- **ENVELOPE** = headers + footers (static, configurable per profile)
- **ARTIFACT** = envelope + body (the complete file)

Example for MARKDOWN:
```
[header lines from profile]  <- ENVELOPE (not part of body)
[validatedText bytes exact]  <- BODY (byte-exact preservation)
[footer lines from profile]  <- ENVELOPE (not part of body)
```

The invariant H-INV-01 applies to BODY only, not the complete artifact.

## REQUIRED INPUT CONTRACT (Phase H)
DeliveryEngine input MUST include:
- validatedText: string (already passed Truth Gate)
- truthGateVerdict: TruthGateVerdict (from src/gates)
- proofManifest: ProofManifest (from src/gates)
- intent: NormalizedIntent (from src/orchestrator)
- generationContract: GenerationContract (from src/orchestrator)

## OUTPUT CONTRACT (Phase H)
Return DeliveryBundle:
- artifacts[] each has:
  - format: DeliveryFormat
  - filename: string (safe, no traversal)
  - content: Uint8Array (complete artifact = envelope + body)
  - bodyHash: Sha256 (hash of BODY only = validatedText bytes)
  - contentHash: Sha256 (hash of complete artifact)
  - size: number
- manifest with ordered listing (stable sort)
- bundleHash: sha256(concat ordered bodyHashes + intentHash + proofHash + profileHash)
- createdAt: ISO8601 (allowed BUT EXCLUDED from bundleHash/artifact hashes)

## TYPES TO IMPLEMENT

```typescript
// Branded types
type Brand<K, T> = K & { __brand: T };
export type ProfileId = Brand<string, 'ProfileId'>;
export type Sha256 = Brand<string, 'Sha256'>;
export type ISO8601 = Brand<string, 'ISO8601'>;

// Formats
export type DeliveryFormat = 'TEXT' | 'MARKDOWN' | 'JSON_PACK' | 'PROOF_PACK' | 'HASH_CHAIN';

// Profile
export interface DeliveryProfile {
  profileId: ProfileId;
  format: DeliveryFormat;
  extension: string;
  encoding: 'UTF-8';
  lineEnding: 'LF';
  wrapWidth?: number;
  headers?: string[];   // envelope - prepended
  footers?: string[];   // envelope - appended
}

// Artifact
export interface DeliveryArtifact {
  format: DeliveryFormat;
  filename: string;
  content: Uint8Array;      // complete artifact (envelope + body)
  bodyHash: Sha256;         // hash of BODY only (validatedText bytes)
  contentHash: Sha256;      // hash of complete artifact
  size: number;
}

// Manifest
export interface DeliveryManifest {
  intentId: string;
  intentHash: Sha256;
  profileId: ProfileId;
  profileHash: Sha256;
  proofHash: Sha256;
  artifacts: Array<{ 
    filename: string; 
    bodyHash: Sha256;       // BODY hash for audit
    contentHash: Sha256;    // complete artifact hash
    size: number;
  }>;
  bundleHash: Sha256;
  createdAt: ISO8601;       // excluded from bundleHash
}

// Bundle
export interface DeliveryBundle {
  artifacts: DeliveryArtifact[];
  manifest: DeliveryManifest;
  bundleHash: Sha256;
}

// Input
export interface DeliveryInput {
  validatedText: string;
  truthGateVerdict: any;    // from src/gates
  proofManifest: any;       // from src/gates
  intent: any;              // NormalizedIntent from src/orchestrator
  generationContract: any;  // from src/orchestrator
  profile?: ProfileId;      // default: OMEGA_STD
}
```

## DETERMINISM RULES (H)
- Encoding: UTF-8, BOM-less (NO BOM)
- Newlines: LF only (\n)
- BODY bytes (validatedText) MUST be preserved exactly:
  - No trim
  - No normalization applied to validatedText itself
- ENVELOPE (headers/footers) is separate; BODY remains byte-exact.
- File ordering ALWAYS sorted by filename (bytewise ASCII).

## CONFIG (LOCKED)
- Profiles path FIXED: config/delivery/profiles.v1.json
- Lock path FIXED: config/delivery/profiles.lock
- Lock file contains sha256(profiles.v1.json bytes exact)
- No ENV can alter those paths.

## DELIVERY FORMATS (MVP)
1) TEXT: emits validated text as .txt (body byte-exact, UTF-8 no BOM, LF, no envelope)
2) MARKDOWN: emits .md with optional static headers/footers (envelope); body is validatedText bytes exact.
3) JSON_PACK: emits a .json containing:
   - intentId, intentHash
   - proofHash, truthGate verdict summary
   - artifact list (bodyHashes, contentHashes, sizes)
   - bundleHash
4) PROOF_PACK: writes a directory tree containing:
   - validated.txt (body byte-exact)
   - delivery_manifest.json
   - truthgate_proof.json (copy)
   - intent.json (normalized)
   - contract.json (normalized)
   - hashes.txt (ordered, includes both bodyHash and contentHash)
5) HASH_CHAIN: emits hashes.txt only (quick audit)

## INVARIANTS (H-INV-01..H-INV-10)
H-INV-01 Body bytes preserved: artifact BODY bytes === ValidatedText bytes (strict)
H-INV-02 No network usage in src/delivery/**
H-INV-03 No dynamic imports in src/delivery/**
H-INV-04 Profiles locked by SHA256 (lock mismatch => FAIL)
H-INV-05 Artifact hashes stable across runs (both bodyHash and contentHash)
H-INV-06 Proof pack reconstructible (replay)
H-INV-07 Timestamp excluded from bundleHash/artifact hashes
H-INV-08 UTF-8 BOM-less strict (reject BOM)
H-INV-09 LF only (reject CRLF)
H-INV-10 No path traversal in artifact names

## FILES TO CREATE (ORDER) — Phase H (23)
1.  src/delivery/types.ts
2.  tests/delivery/types.test.ts
3.  config/delivery/profiles.schema.json
4.  config/delivery/profiles.v1.json
5.  config/delivery/profiles.lock
6.  src/delivery/profile-loader.ts
7.  tests/delivery/profile-loader.test.ts
8.  src/delivery/normalizer.ts                 # envelope-only utilities (NOT for validatedText)
9.  tests/delivery/normalizer.test.ts
10. src/delivery/renderer.ts
11. tests/delivery/renderer.test.ts
12. src/delivery/hasher.ts
13. tests/delivery/hasher.test.ts
14. src/delivery/manifest.ts
15. tests/delivery/manifest.test.ts
16. src/delivery/proof-pack.ts
17. tests/delivery/proof-pack.test.ts
18. src/delivery/delivery-engine.ts
19. tests/delivery/delivery-engine.test.ts
20. tests/delivery/integration/full-pipeline.test.ts
21. tests/delivery/integration/determinism.test.ts          # 50 runs same bundleHash
22. tests/delivery/integration/hostile-audit.test.ts        # H-T01..H-T16
23. src/delivery/index.ts

## HOSTILE TESTS (H-T01..H-T16) — MUST PASS
H-T01 Whitespace injection in validatedText body
H-T02 Newline flip (LF→CRLF) attempt in body
H-T03 Profile tamper (lock mismatch)
H-T04 Timestamp in hash injection
H-T05 Lock file mismatch detection
H-T06 Body modification attempt
H-T07 Hash collision attempt
H-T08 Invalid format request
H-T09 Missing proof input
H-T10 Proof tampering
H-T11 Network call attempt
H-T12 Dynamic import attempt
H-T13 Encoding attack (non-UTF8)
H-T14 BOM injection attack
H-T15 CRLF injection attack
H-T16 Path traversal attack (../)

## IMPLEMENTATION NOTES (STRICT)
- Use Node crypto sha256 only.
- Any file writing goes ONLY under artefacts/delivery/** at runtime.
- Never commit artefacts/**.
- Use stable sorting everywhere.
- Use Uint8Array for content; compute hash from bytes.
- TextEncoder for string→bytes, ensure no BOM.
- bodyHash = sha256(validatedText bytes)
- contentHash = sha256(complete artifact bytes including envelope)

## RUN AFTER EACH FILE
- npm test
- git diff --stat src/canon src/gates src/memory src/sentinel src/orchestrator genesis-forge  (MUST BE EMPTY)

## EXIT CRITERIA (PHASE H)
- All tests PASS
- >=150 new tests
- SEALED zones unchanged
- determinism test: 50 runs => same bundleHash
- profiles.lock verified
- Phase H ready for commit

## AFTER PHASE H COMPLETE — COMMIT H ONLY
1. Generate manifest:
   Get-FileHash -Algorithm SHA256 -Path src\delivery\*.ts | Out-File manifests\PHASE_H_SHA256_MANIFEST.txt

2. Commit Phase H:
   git add src/delivery tests/delivery config/delivery manifests/PHASE_H_SHA256_MANIFEST.txt
   git commit -m "feat(delivery): implement Phase H Delivery Engine [INV-H-*] - 150+ tests"

3. DO NOT TAG YET - Continue to Phase I
   (src/delivery/ is now FROZEN but not SEALED until final tag)

## THEN PROCEED TO PHASE I AUTOMATICALLY
