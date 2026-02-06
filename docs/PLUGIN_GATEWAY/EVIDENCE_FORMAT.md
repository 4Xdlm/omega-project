**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# EVIDENCE FORMAT — Ledger + Proof Export (PNP) — v1.0 (DRAFT-NORMATIVE)

## 1. Ledger
- Format: **NDJSON** (1 event = 1 ligne)
- Append-only (aucune réécriture)
- Canon JSON + tri déterministe à l’export.

## 2. Event minimal (concept)
Chaque event contient :
- `event_id` (ULID/UUID)
- `run_id`
- `ts`
- `kind` (REGISTER|ENABLE|DISABLE|INVOKE|RESULT|REJECT|ERROR|PROOF_EXPORT)
- `plugin_id` (si applicable)
- `request_id` (si applicable)
- `input_hash` / `output_hash` (si applicable)
- `prev_hash`
- `event_hash`
- `meta` (data-only, no secrets)

## 3. Hash-chain
- `event_hash = SHA256(canonical_json(event_without_event_hash))`
- `prev_hash = event_hash(event_{n-1})`
- Rupture de chaîne ⇒ violation (CRITICAL)

## 4. Proof export (bundle data-only)
Inclut :
- `proof_id`
- `run_id`
- `created_at`
- `head_event_hash`
- `events[]` (ou référence ledger + head hash)
- `plugin_manifest_digests[]`
- `validation_reports[]`

## 5. Contraintes
- Aucune donnée secrète.
- Aucun binaire direct; uniquement références (BinaryRefPayload).
- Vérification offline possible (hashes).

## 6. Critères d’acceptation
- Relecture offline possible.
- Vérification hash-chain possible.
- Reproduction des hashes stable (canon JSON + tri).
