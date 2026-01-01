// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS EXPORT MODULE
//   Version: 1.1.0-FUSION
//
//   JSON import/export for GenesisPlan.
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::GenesisPlan;
use crate::genesis::modules::genesis::errors::{GenesisError, GenesisResult};

/// Export plan to JSON string (pretty-printed)
pub fn export_plan_json(plan: &GenesisPlan) -> GenesisResult<String> {
    serde_json::to_string_pretty(plan).map_err(|e| GenesisError::SerializationError {
        code: "GENESIS-E-EXPORT-001",
        format: "JSON".into(),
        reason: e.to_string(),
    })
}

/// Export plan to JSON string (compact)
pub fn export_plan_json_compact(plan: &GenesisPlan) -> GenesisResult<String> {
    serde_json::to_string(plan).map_err(|e| GenesisError::SerializationError {
        code: "GENESIS-E-EXPORT-002",
        format: "JSON".into(),
        reason: e.to_string(),
    })
}

/// Import plan from JSON string
pub fn import_plan_json(json: &str) -> GenesisResult<GenesisPlan> {
    serde_json::from_str(json).map_err(|e| GenesisError::SerializationError {
        code: "GENESIS-E-IMPORT-001",
        format: "JSON".into(),
        reason: e.to_string(),
    })
}

/// Export plan to bytes (for hashing, storage)
pub fn export_plan_bytes(plan: &GenesisPlan) -> GenesisResult<Vec<u8>> {
    let json = export_plan_json_compact(plan)?;
    Ok(json.into_bytes())
}

/// Import plan from bytes
pub fn import_plan_bytes(bytes: &[u8]) -> GenesisResult<GenesisPlan> {
    let json = std::str::from_utf8(bytes).map_err(|e| GenesisError::SerializationError {
        code: "GENESIS-E-IMPORT-002",
        format: "UTF-8".into(),
        reason: e.to_string(),
    })?;
    import_plan_json(json)
}

// ═══════════════════════════════════════════════════════════════════════════════
//   TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::genesis::interfaces::genesis::*;
    use std::collections::BTreeMap;

    fn make_test_plan() -> GenesisPlan {
        GenesisPlan {
            plan_id: "test_plan_id".into(),
            request_hash: "test_request_hash".into(),
            scene_specs: vec![SceneSpec {
                index: 0,
                pov: "third_limited".into(),
                tense: "past".into(),
                tone: "dramatic".into(),
                canon_read_scope: vec!["CHAR:VICK".into()],
                length: LengthSpec { min: 800, max: 1000 },
                instructions: "Test instructions".into(),
                beat_kind: "SETUP".into(),
                beat_label: "SETUP".into(),
            }],
            plan_proof: GenesisProof {
                seed: 42,
                canonical_request_hash: "req_hash".into(),
                scene_hash_chain: vec![HashLink {
                    index: 0,
                    scene_hash: "scene_hash".into(),
                    prev_hash: CHAIN_ROOT_HASH.into(),
                    chain_hash: "chain_hash".into(),
                }],
                manifest_sha256: {
                    let mut m = BTreeMap::new();
                    m.insert("plan_id".into(), "test_plan_id".into());
                    m.insert("scene_chain_tip".into(), "chain_hash".into());
                    m
                },
                created_utc: "2026-01-01T00:00:00Z".into(),
            },
            staged_facts: vec![],
            warnings: vec![],
        }
    }

    #[test]
    fn export_import_roundtrip() {
        let plan = make_test_plan();
        let json = export_plan_json(&plan).unwrap();
        let imported = import_plan_json(&json).unwrap();
        assert_eq!(plan, imported);
    }

    #[test]
    fn export_import_compact_roundtrip() {
        let plan = make_test_plan();
        let json = export_plan_json_compact(&plan).unwrap();
        let imported = import_plan_json(&json).unwrap();
        assert_eq!(plan, imported);
    }

    #[test]
    fn export_import_bytes_roundtrip() {
        let plan = make_test_plan();
        let bytes = export_plan_bytes(&plan).unwrap();
        let imported = import_plan_bytes(&bytes).unwrap();
        assert_eq!(plan, imported);
    }

    #[test]
    fn invalid_json_error() {
        let result = import_plan_json("{ invalid json }");
        assert!(result.is_err());
    }

    #[test]
    fn invalid_utf8_error() {
        let invalid_utf8 = vec![0xFF, 0xFE];
        let result = import_plan_bytes(&invalid_utf8);
        assert!(result.is_err());
    }
}
