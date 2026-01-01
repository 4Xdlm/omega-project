// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS L2 INTEGRATION TESTS
//   Version: 1.1.0-FUSION
//   Count: 20 tests
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::*;
use crate::genesis::modules::genesis::*;
use crate::genesis::modules::genesis::beats::generate_beats;
use crate::genesis::modules::genesis::planner::beats_to_scene_specs;
use crate::genesis::modules::genesis::proof::{build_proof, verify_plan_proof};
use crate::genesis::modules::genesis::export::{export_plan_json, import_plan_json};
use crate::genesis::modules::genesis::golden::assert_idempotent;
use std::collections::BTreeMap;

// ═══════════════════════════════════════════════════════════════════════════════
//   TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

fn make_request(scenes: u32) -> GenesisRequest {
    GenesisRequest {
        saga_id: "SAGA:TEST".into(),
        seed: 42,
        target: PlanTarget {
            scenes,
            avg_words: 900,
            min_words: 800,
            max_words: 1000,
            require_beats: true,
            tone_hint: Some("dramatic".into()),
        },
        constraints: {
            let mut m = BTreeMap::new();
            m.insert("pov".into(), serde_json::json!("third_limited"));
            m.insert("tense".into(), serde_json::json!("past"));
            m
        },
        canon_read_scope: vec!["CHAR:VICK".into(), "LOC:PARIS".into()],
        voice_profile_ref: "VOICE:MAIN".into(),
        arc_spec: ArcSpec {
            title: "Test Arc".into(),
            premise: "A test premise for integration testing.".into(),
            act_count: 3,
            major_turns: vec!["Turn 1".into(), "Turn 2".into()],
            stakes: "High stakes".into(),
        },
        continuity_claims: vec![
            ContinuityClaim {
                claim_id: "CC:001".into(),
                entity_id: "CHAR:VICK".into(),
                key: "age".into(),
                expected: serde_json::json!(47),
                severity: "P0-CRITICAL".into(),
                note: "Age is 47".into(),
            },
        ],
        metadata: GenesisMetadata {
            schema_version: "GENESIS/1.1.0".into(),
            created_utc: "2026-01-01T00:00:00Z".into(),
            updated_utc: "2026-01-01T00:00:00Z".into(),
        },
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   PLANNING TESTS (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l2_01_plan_3_scenes() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    assert_eq!(plan.scene_specs.len(), 3);
}

#[test]
fn l2_02_plan_12_scenes() {
    let req = make_request(12);
    let plan = genesis_plan(&req).unwrap();
    assert_eq!(plan.scene_specs.len(), 12);
}

#[test]
fn l2_03_plan_100_scenes() {
    let req = make_request(100);
    let plan = genesis_plan(&req).unwrap();
    assert_eq!(plan.scene_specs.len(), 100);
}

#[test]
fn l2_04_beats_setup_confrontation_payoff() {
    let req = make_request(3);
    let (beats, _) = generate_beats(&req).unwrap();
    
    assert!(beats.iter().any(|b| matches!(b.kind, BeatKind::Setup)));
    assert!(beats.iter().any(|b| matches!(b.kind, BeatKind::Confrontation)));
    assert!(beats.iter().any(|b| matches!(b.kind, BeatKind::Payoff)));
}

#[test]
fn l2_05_bridges_added_for_extra_scenes() {
    let req = make_request(6);
    let (beats, _) = generate_beats(&req).unwrap();
    
    let bridge_count = beats.iter().filter(|b| matches!(b.kind, BeatKind::Bridge)).count();
    assert!(bridge_count >= 3, "Should have at least 3 bridges for 6 scenes");
}

#[test]
fn l2_06_continuity_propagated_all_scenes() {
    let req = make_request(5);
    let plan = genesis_plan(&req).unwrap();
    
    for spec in &plan.scene_specs {
        assert!(
            spec.instructions.contains("CONTINUITY_CLAIMS:"),
            "Scene {} missing continuity block",
            spec.index
        );
        assert!(
            spec.instructions.contains("CC:001"),
            "Scene {} missing claim CC:001",
            spec.index
        );
    }
}

#[test]
fn l2_07_constraints_applied_to_scenes() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    for spec in &plan.scene_specs {
        assert_eq!(spec.pov, "third_limited");
        assert_eq!(spec.tense, "past");
    }
}

#[test]
fn l2_08_canon_scope_merged() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    for spec in &plan.scene_specs {
        assert!(spec.canon_read_scope.contains(&"CHAR:VICK".to_string()));
        assert!(spec.canon_read_scope.contains(&"LOC:PARIS".to_string()));
        assert!(!spec.canon_read_scope.is_empty());
    }
}

#[test]
fn l2_09_instructions_contain_goal_conflict_outcome() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    for spec in &plan.scene_specs {
        assert!(spec.instructions.contains("GOAL:"), "Missing GOAL in scene {}", spec.index);
        assert!(spec.instructions.contains("CONFLICT:"), "Missing CONFLICT in scene {}", spec.index);
        assert!(spec.instructions.contains("OUTCOME_HINT:"), "Missing OUTCOME_HINT in scene {}", spec.index);
    }
}

#[test]
fn l2_10_scene_spec_scribe_compatible() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    for spec in &plan.scene_specs {
        // SCRIBE requires these fields
        assert!(!spec.pov.is_empty(), "POV empty");
        assert!(!spec.tense.is_empty(), "Tense empty");
        assert!(!spec.tone.is_empty(), "Tone empty");
        assert!(!spec.canon_read_scope.is_empty(), "Canon scope empty");
        assert!(spec.length.min <= spec.length.max, "Length min > max");
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   PROOF TESTS (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l2_11_proof_valid_on_clean_plan() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    assert!(verify_plan_proof(&plan).is_ok());
}

#[test]
fn l2_12_proof_detects_scene_tamper() {
    let req = make_request(3);
    let mut plan = genesis_plan(&req).unwrap();
    
    plan.scene_specs[1].instructions.push_str("\nTAMPERED");
    
    assert!(verify_plan_proof(&plan).is_err());
}

#[test]
fn l2_13_proof_detects_chain_tamper() {
    let req = make_request(3);
    let mut plan = genesis_plan(&req).unwrap();
    
    if !plan.plan_proof.scene_hash_chain.is_empty() {
        plan.plan_proof.scene_hash_chain[0].chain_hash = "FAKE_HASH".into();
    }
    
    assert!(verify_plan_proof(&plan).is_err());
}

#[test]
fn l2_14_proof_detects_manifest_tamper() {
    let req = make_request(3);
    let mut plan = genesis_plan(&req).unwrap();
    
    plan.plan_proof.manifest_sha256.insert("scene_chain_tip".into(), "FAKE_TIP".into());
    
    assert!(verify_plan_proof(&plan).is_err());
}

#[test]
fn l2_15_export_import_roundtrip() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    let json = export_plan_json(&plan).unwrap();
    let imported = import_plan_json(&json).unwrap();
    
    assert_eq!(plan, imported);
}

#[test]
fn l2_16_export_import_idempotent() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    assert!(assert_idempotent(&plan).is_ok());
}

#[test]
fn l2_17_plan_id_deterministic() {
    let req = make_request(3);
    
    let plan1 = genesis_plan(&req).unwrap();
    let plan2 = genesis_plan(&req).unwrap();
    
    assert_eq!(plan1.plan_id, plan2.plan_id);
}

#[test]
fn l2_18_request_hash_in_proof() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    assert!(!plan.request_hash.is_empty());
    assert_eq!(plan.request_hash, plan.plan_proof.canonical_request_hash);
}

#[test]
fn l2_19_scene_hash_chain_complete() {
    let req = make_request(5);
    let plan = genesis_plan(&req).unwrap();
    
    assert_eq!(plan.plan_proof.scene_hash_chain.len(), 5);
    
    for (i, link) in plan.plan_proof.scene_hash_chain.iter().enumerate() {
        assert_eq!(link.index, i as u32);
        assert!(!link.scene_hash.is_empty());
        assert!(!link.chain_hash.is_empty());
    }
}

#[test]
fn l2_20_manifest_contains_required_keys() {
    let req = make_request(3);
    let plan = genesis_plan(&req).unwrap();
    
    assert!(plan.plan_proof.manifest_sha256.contains_key("canonical_request_hash"));
    assert!(plan.plan_proof.manifest_sha256.contains_key("scene_chain_tip"));
    assert!(plan.plan_proof.manifest_sha256.contains_key("plan_id"));
}
