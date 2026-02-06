**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

# CONTRACT — Plugin Interface & Manifest — v1.0 (DRAFT-NORMATIVE)

## 0. Principe
Ce contrat définit **l’unique** interface plugin ↔ gateway. Tout plugin non conforme est rejeté.

## 1. Version contractuelle
- `OMEGA_PLUGIN_API_VERSION` : SemVer (ex: `1.0.0`)
- Un plugin doit déclarer `supported_omega_api_versions` (range SemVer).
- Rejet si incompatible.

## 2. Manifest (concept)
Champs obligatoires (niveau conceptuel, schéma JSON fourni en E2) :
- `plugin_id` (stable, slug)
- `name`, `vendor`, `description`
- `version` (SemVer)
- `api_version` (OMEGA_PLUGIN_API_VERSION du plugin)
- `supported_omega_api_versions` (range)
- `capabilities[]` (enum strict)
- `io`:
  - `inputs[]`: { `kind`, `schema_ref`, `limits` }
  - `outputs[]`: { `kind`, `schema_ref`, `limits` }
- `limits`: { max_bytes, max_ms, max_concurrency }
- `determinism`: { mode: "deterministic"|"probabilistic", notes }
- `evidence`: { log_level, redactions }
- `entrypoint`: { type: "worker", file, export }
- `signature`: (hors manifest — fourni séparément au gateway)

## 3. Capabilities (v1.0 — base)
Enum initial strict (extensible via versioning) :
- `read_text`
- `read_json`
- `read_binary_ref`
- `read_dataset_slice`
- `write_suggestion` (sortie non actuatante)
- `write_report` (sortie non actuatante)

Capabilités explicitement **interdites** v1.0 :
- `filesystem_access`
- `network_access`
- `process_spawn`
- `env_access`

## 4. Request/Response (concept)
### Request (OMEGA → Gateway → Plugin)
- `request_id` (UUID/ULID)
- `run_id` (stable par session)
- `timestamp` (ISO)
- `payload` (union typée)
- `context` (data-only, sans secrets)
- `policy` (optionnel, ex: deterministic_only)

### Response (Plugin → Gateway → OMEGA)
- `request_id` (echo)
- `status`: "ok" | "rejected" | "error" | "timeout"
- `result` (union typée, schema-validated)
- `evidence_hashes`: { input_hash, output_hash }
- `duration_ms`
- `notes` (optionnel, data-only)

## 5. Règles d’exécution (contractuelles)
- Plugin stateless: aucun état persistant.
- Plugin ne lit/écrit rien hors protocole.
- Output doit être JSON-serializable pour les rapports, ou référencer des artefacts OMEGA (BinaryRef).
- Toute violation: `status="rejected"` + event ledger.

## 6. API publique Gateway (surface minimale)
- `validateManifest(manifest): ValidationReport`
- `registerPlugin(manifest, signature): PluginId`
- `enablePlugin(pluginId): void`
- `disablePlugin(pluginId): void`
- `listPlugins(): PluginInfo[]`
- `invoke(pluginId, request): PluginResponse`
- `invokePipeline(policy, request): PipelineResponse`
- `exportProof(runId): ProofBundle`
