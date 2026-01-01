// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS GOLDEN MODULE
//   Version: 1.1.0-FUSION
//
//   Golden file testing and idempotency verification.
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::GenesisPlan;
use crate::genesis::modules::genesis::errors::{GenesisError, GenesisResult};
use crate::genesis::modules::genesis::export::{export_plan_json, import_plan_json};

/// Verify export/import roundtrip produces identical JSON (GENESIS-I12)
/// 
/// # Idempotency Check
/// 
/// ```text
/// plan → JSON₁ → plan' → JSON₂
/// assert(JSON₁ == JSON₂)
/// ```
pub fn assert_idempotent(plan: &GenesisPlan) -> GenesisResult<()> {
    // First roundtrip
    let json1 = export_plan_json(plan)?;
    let plan2 = import_plan_json(&json1)?;
    let json2 = export_plan_json(&plan2)?;

    if json1 != json2 {
        return Err(GenesisError::ProofError {
            code: "GENESIS-E-GOLDEN-001",
            reason: "export/import not idempotent: JSON differs after roundtrip".into(),
        });
    }

    Ok(())
}

/// Perform full golden roundtrip and return re-imported plan
pub fn golden_roundtrip(plan: &GenesisPlan) -> GenesisResult<GenesisPlan> {
    let json = export_plan_json(plan)?;
    import_plan_json(&json)
}

/// Compare two plans for equality
pub fn plans_equal(a: &GenesisPlan, b: &GenesisPlan) -> bool {
    a == b
}

/// Verify plan matches expected golden JSON
pub fn verify_against_golden(plan: &GenesisPlan, expected_json: &str) -> GenesisResult<()> {
    let actual_json = export_plan_json(plan)?;
    
    // Parse both to normalize formatting
    let actual: serde_json::Value = serde_json::from_str(&actual_json).map_err(|e| {
        GenesisError::SerializationError {
            code: "GENESIS-E-GOLDEN-002",
            format: "actual JSON".into(),
            reason: e.to_string(),
        }
    })?;
    
    let expected: serde_json::Value = serde_json::from_str(expected_json).map_err(|e| {
        GenesisError::SerializationError {
            code: "GENESIS-E-GOLDEN-003",
            format: "expected JSON".into(),
            reason: e.to_string(),
        }
    })?;

    if actual != expected {
        return Err(GenesisError::ProofError {
            code: "GENESIS-E-GOLDEN-004",
            reason: "plan does not match golden file".into(),
        });
    }

    Ok(())
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
            plan_id: "test_id".into(),
            request_hash: "req_hash".into(),
            scene_specs: vec![SceneSpec {
                index: 0,
                pov: "third".into(),
                tense: "past".into(),
                tone: "dramatic".into(),
                canon_read_scope: vec!["CHAR:A".into()],
                length: LengthSpec { min: 100, max: 200 },
                instructions: "Test".into(),
                beat_kind: "SETUP".into(),
                beat_label: "S".into(),
            }],
            plan_proof: GenesisProof {
                seed: 42,
                canonical_request_hash: "hash".into(),
                scene_hash_chain: vec![],
                manifest_sha256: BTreeMap::new(),
                created_utc: "2026-01-01T00:00:00Z".into(),
            },
            staged_facts: vec![],
            warnings: vec![],
        }
    }

    #[test]
    fn genesis_i12_idempotent() {
        let plan = make_test_plan();
        assert!(assert_idempotent(&plan).is_ok());
    }

    #[test]
    fn golden_roundtrip_preserves_plan() {
        let plan = make_test_plan();
        let roundtripped = golden_roundtrip(&plan).unwrap();
        assert!(plans_equal(&plan, &roundtripped));
    }

    #[test]
    fn plans_equal_works() {
        let plan1 = make_test_plan();
        let plan2 = make_test_plan();
        assert!(plans_equal(&plan1, &plan2));
        
        let mut plan3 = make_test_plan();
        plan3.plan_id = "different".into();
        assert!(!plans_equal(&plan1, &plan3));
    }

    #[test]
    fn verify_against_golden_match() {
        let plan = make_test_plan();
        let golden = export_plan_json(&plan).unwrap();
        assert!(verify_against_golden(&plan, &golden).is_ok());
    }

    #[test]
    fn verify_against_golden_mismatch() {
        let plan = make_test_plan();
        let mut different = make_test_plan();
        different.plan_id = "different_id".into();
        let golden = export_plan_json(&different).unwrap();
        
        assert!(verify_against_golden(&plan, &golden).is_err());
    }
}
