// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS L4 BRUTAL/ADVERSARIAL TESTS
//   Version: 1.1.0-FUSION
//   Count: 10 tests
//
//   These tests verify tamper detection, edge cases, and adversarial inputs.
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::*;
use crate::genesis::modules::genesis::*;
use crate::genesis::modules::genesis::proof::verify_plan_proof;
use std::collections::BTreeMap;

// ═══════════════════════════════════════════════════════════════════════════════
//   TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

fn make_request(scenes: u32, seed: u64) -> GenesisRequest {
    GenesisRequest {
        saga_id: "SAGA:BRUTAL".into(),
        seed,
        target: PlanTarget {
            scenes,
            avg_words: 900,
            min_words: 800,
            max_words: 1000,
            require_beats: scenes >= 3,
            tone_hint: None,
        },
        constraints: BTreeMap::new(),
        canon_read_scope: vec!["CHAR:VICK".into()],
        voice_profile_ref: "VOICE:MAIN".into(),
        arc_spec: ArcSpec {
            title: "Brutal Test".into(),
            premise: "Testing edge cases.".into(),
            act_count: 3,
            major_turns: vec!["Turn".into()],
            stakes: "Integrity".into(),
        },
        continuity_claims: vec![ContinuityClaim {
            claim_id: "CC:001".into(),
            entity_id: "CHAR:VICK".into(),
            key: "test".into(),
            expected: serde_json::json!("value"),
            severity: "P0-CRITICAL".into(),
            note: "Test".into(),
        }],
        metadata: GenesisMetadata {
            schema_version: "GENESIS/1.1.0".into(),
            created_utc: "2026-01-01T00:00:00Z".into(),
            updated_utc: "2026-01-01T00:00:00Z".into(),
        },
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   TAMPER DETECTION TESTS (4 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l4_01_tamper_single_byte_detected() {
    let req = make_request(3, 42);
    let mut plan = genesis_plan(&req).unwrap();
    
    // Tamper: change single character in instructions
    let original = plan.scene_specs[0].instructions.clone();
    if !original.is_empty() {
        let mut chars: Vec<char> = original.chars().collect();
        if chars.len() > 10 {
            chars[10] = if chars[10] == 'X' { 'Y' } else { 'X' };
        }
        plan.scene_specs[0].instructions = chars.into_iter().collect();
    }
    
    let result = verify_plan_proof(&plan);
    assert!(result.is_err(), "Single byte tamper should be detected");
}

#[test]
fn l4_02_tamper_instructions_detected() {
    let req = make_request(3, 42);
    let mut plan = genesis_plan(&req).unwrap();
    
    // Append to instructions
    plan.scene_specs[1].instructions.push_str("\n\nTAMPERED CONTENT");
    
    let result = verify_plan_proof(&plan);
    assert!(result.is_err());
    
    let err_msg = format!("{}", result.unwrap_err());
    assert!(err_msg.contains("GENESIS-E-PROOF") || err_msg.contains("tamper"));
}

#[test]
fn l4_03_tamper_chain_tip_detected() {
    let req = make_request(3, 42);
    let mut plan = genesis_plan(&req).unwrap();
    
    // Replace chain tip with fake value
    plan.plan_proof.manifest_sha256.insert(
        "scene_chain_tip".into(),
        "0000000000000000000000000000000000000000000000000000000000000000".into(),
    );
    
    let result = verify_plan_proof(&plan);
    assert!(result.is_err());
}

#[test]
fn l4_04_tamper_plan_id_detected() {
    let req = make_request(3, 42);
    let mut plan = genesis_plan(&req).unwrap();
    
    // Replace plan_id
    plan.plan_proof.manifest_sha256.insert(
        "plan_id".into(),
        "FAKE_PLAN_ID_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".into(),
    );
    
    let result = verify_plan_proof(&plan);
    assert!(result.is_err());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   REPLAY ATTACK TEST (1 test)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l4_05_replay_attack_detected() {
    // Generate two different plans
    let req1 = make_request(3, 42);
    let req2 = make_request(3, 43); // Different seed
    
    let plan1 = genesis_plan(&req1).unwrap();
    let plan2 = genesis_plan(&req2).unwrap();
    
    // Try to use plan1's proof with plan2's scenes
    let mut hybrid = plan1.clone();
    hybrid.scene_specs = plan2.scene_specs.clone();
    
    let result = verify_plan_proof(&hybrid);
    assert!(result.is_err(), "Replay attack should be detected");
}

// ═══════════════════════════════════════════════════════════════════════════════
//   EDGE CASE TESTS (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l4_06_zero_seed_valid() {
    let req = make_request(3, 0);
    let plan = genesis_plan(&req).unwrap();
    
    assert_eq!(plan.plan_proof.seed, 0);
    assert!(verify_plan_proof(&plan).is_ok());
}

#[test]
fn l4_07_max_seed_valid() {
    let req = make_request(3, u64::MAX);
    let plan = genesis_plan(&req).unwrap();
    
    assert_eq!(plan.plan_proof.seed, u64::MAX);
    assert!(verify_plan_proof(&plan).is_ok());
}

#[test]
fn l4_08_empty_optional_fields() {
    let mut req = make_request(3, 42);
    req.target.tone_hint = None;
    req.constraints.clear();
    
    let plan = genesis_plan(&req).unwrap();
    assert!(verify_plan_proof(&plan).is_ok());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   SPECIAL CHARACTERS TEST (1 test)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l4_09_special_chars_in_strings() {
    let mut req = make_request(3, 42);
    req.arc_spec.title = "Title with \"quotes\" and 'apostrophes'".into();
    req.arc_spec.premise = "Line1\nLine2\tTabbed\r\nWindows".into();
    req.continuity_claims[0].note = "Note with <brackets> & ampersand".into();
    
    let plan = genesis_plan(&req).unwrap();
    assert_eq!(plan.scene_specs.len(), 3);
    assert!(verify_plan_proof(&plan).is_ok());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   DETERMINISM TEST (1 test)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l4_10_concurrent_generation_same_seed_identical() {
    let req = make_request(5, 42);
    
    // Generate 10 times with same inputs
    let plans: Vec<GenesisPlan> = (0..10)
        .map(|_| genesis_plan(&req).unwrap())
        .collect();
    
    let first = &plans[0];
    
    for (i, plan) in plans.iter().enumerate().skip(1) {
        assert_eq!(
            plan.plan_id, first.plan_id,
            "Plan {} has different plan_id",
            i
        );
        assert_eq!(
            plan.request_hash, first.request_hash,
            "Plan {} has different request_hash",
            i
        );
        assert_eq!(
            plan.scene_specs, first.scene_specs,
            "Plan {} has different scene_specs",
            i
        );
        assert_eq!(
            plan.plan_proof.scene_hash_chain, first.plan_proof.scene_hash_chain,
            "Plan {} has different hash chain",
            i
        );
    }
}
