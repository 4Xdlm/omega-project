// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS L1 UNIT TESTS
//   Version: 1.1.0-FUSION
//   Count: 25 tests
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::*;
use crate::genesis::modules::genesis::*;
use crate::genesis::modules::genesis::canonicalize::canonicalize_request;
use crate::genesis::modules::genesis::request_hash::hash_canonical_request;
use crate::genesis::modules::genesis::validation::*;
use crate::genesis::modules::genesis::crypto::*;
use std::collections::BTreeMap;

// ═══════════════════════════════════════════════════════════════════════════════
//   TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

fn make_valid_request() -> GenesisRequest {
    GenesisRequest {
        saga_id: "SAGA:RIVIERA".into(),
        seed: 42,
        target: PlanTarget {
            scenes: 3,
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
        canon_read_scope: vec!["CHAR:VICK".into(), "LOC:RIVIERAZUR".into()],
        voice_profile_ref: "VOICE:PROFILE:MAIN".into(),
        arc_spec: ArcSpec {
            title: "Tome 1: L'Éveil".into(),
            premise: "A guarded residence hides a deeper war.".into(),
            act_count: 3,
            major_turns: vec![
                "Inciting incident".into(),
                "Midpoint reversal".into(),
                "Final reveal".into(),
            ],
            stakes: "Truth, safety, identity".into(),
        },
        continuity_claims: vec![
            ContinuityClaim {
                claim_id: "CC:001".into(),
                entity_id: "CHAR:VICK".into(),
                key: "age".into(),
                expected: serde_json::json!(47),
                severity: "P0-CRITICAL".into(),
                note: "Vick stays 47 in Tome 1".into(),
            },
            ContinuityClaim {
                claim_id: "CC:002".into(),
                entity_id: "CHAR:VICK".into(),
                key: "eye_color".into(),
                expected: serde_json::json!("blue"),
                severity: "P1-HIGH".into(),
                note: "Blue eyes established".into(),
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
//   I01: REQUEST COMPLETENESS (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_01_valid_request_passes_validation() {
    let req = make_valid_request();
    assert!(validate_request(&req).is_ok());
}

#[test]
fn l1_02_empty_saga_id_rejected() {
    let mut req = make_valid_request();
    req.saga_id = "".into();
    assert!(validate_request(&req).is_err());
}

#[test]
fn l1_03_zero_scenes_rejected() {
    let mut req = make_valid_request();
    req.target.scenes = 0;
    assert!(validate_request(&req).is_err());
}

#[test]
fn l1_04_empty_canon_scope_rejected() {
    let mut req = make_valid_request();
    req.canon_read_scope.clear();
    assert!(validate_request(&req).is_err());
}

#[test]
fn l1_05_empty_continuity_rejected() {
    let mut req = make_valid_request();
    req.continuity_claims.clear();
    assert!(validate_request(&req).is_err());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I02: HASH DETERMINISM (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_06_request_hash_deterministic_100_runs() {
    let req = make_valid_request();
    let canonical = canonicalize_request(&req).unwrap();
    let first_hash = hash_canonical_request(&canonical);
    
    for i in 0..100 {
        let c = canonicalize_request(&req).unwrap();
        let h = hash_canonical_request(&c);
        assert_eq!(h, first_hash, "Run {} must match", i);
    }
}

#[test]
fn l1_07_different_seed_different_hash() {
    let mut req1 = make_valid_request();
    let mut req2 = make_valid_request();
    req2.seed = 43;
    
    let c1 = canonicalize_request(&req1).unwrap();
    let c2 = canonicalize_request(&req2).unwrap();
    
    assert_ne!(hash_canonical_request(&c1), hash_canonical_request(&c2));
}

#[test]
fn l1_08_hash_is_64_hex_chars() {
    let req = make_valid_request();
    let c = canonicalize_request(&req).unwrap();
    let hash = hash_canonical_request(&c);
    
    assert_eq!(hash.len(), 64);
    assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I04: ORDERING STABILITY (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_09_canon_scope_sorted_in_canonical() {
    let mut req = make_valid_request();
    req.canon_read_scope = vec!["LOC:PARIS".into(), "CHAR:ALICE".into(), "CHAR:BOB".into()];
    
    let c = canonicalize_request(&req).unwrap();
    
    // Should be sorted: CHAR:ALICE, CHAR:BOB, LOC:PARIS
    assert_eq!(c.canon_read_scope[0].as_str(), "CHAR:ALICE");
    assert_eq!(c.canon_read_scope[1].as_str(), "CHAR:BOB");
    assert_eq!(c.canon_read_scope[2].as_str(), "LOC:PARIS");
}

#[test]
fn l1_10_constraints_reorder_same_hash() {
    let mut req_a = make_valid_request();
    let mut req_b = make_valid_request();
    
    // Clear and re-add in different order
    req_b.constraints.clear();
    req_b.constraints.insert("tense".into(), serde_json::json!("past"));
    req_b.constraints.insert("pov".into(), serde_json::json!("third_limited"));
    
    let ha = hash_canonical_request(&canonicalize_request(&req_a).unwrap());
    let hb = hash_canonical_request(&canonicalize_request(&req_b).unwrap());
    
    assert_eq!(ha, hb, "BTreeMap ensures stable ordering");
}

#[test]
fn l1_11_whitespace_normalized() {
    let mut req1 = make_valid_request();
    let mut req2 = make_valid_request();
    
    req1.saga_id = "SAGA:TEST".into();
    req2.saga_id = "  SAGA:TEST  ".into();
    
    let c1 = canonicalize_request(&req1).unwrap();
    let c2 = canonicalize_request(&req2).unwrap();
    
    assert_eq!(c1.saga_id.as_str(), c2.saga_id.as_str());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I06, I07: SCOPE & PROFILE (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_12_voice_profile_required() {
    let mut req = make_valid_request();
    req.voice_profile_ref = "".into();
    assert!(validate_request(&req).is_err());
}

#[test]
fn l1_13_min_words_less_than_max() {
    let mut req = make_valid_request();
    req.target.min_words = 1000;
    req.target.max_words = 500;
    assert!(validate_request(&req).is_err());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I15: DOMAIN SEPARATION (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_14_domain_separation_request_vs_scene() {
    let data = b"identical data";
    let h1 = hash_domain(HashDomain::Request, data);
    let h2 = hash_domain(HashDomain::Scene, data);
    assert_ne!(h1, h2);
}

#[test]
fn l1_15_domain_separation_scene_vs_chain() {
    let data = b"test data";
    let h1 = hash_domain(HashDomain::Scene, data);
    let h2 = hash_domain(HashDomain::ChainLink, data);
    assert_ne!(h1, h2);
}

#[test]
fn l1_16_same_domain_same_hash() {
    let data = b"test data";
    let h1 = hash_domain(HashDomain::Request, data);
    let h2 = hash_domain(HashDomain::Request, data);
    assert_eq!(h1, h2);
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I16: LENGTH PREFIX (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_17_length_prefix_prevents_collision() {
    let mut h1 = LengthPrefixedHasher::new(HashDomain::Request);
    h1.update(b"ab").update(b"cd");
    let hash1 = h1.finalize_hex();
    
    let mut h2 = LengthPrefixedHasher::new(HashDomain::Request);
    h2.update(b"a").update(b"bcd");
    let hash2 = h2.finalize_hex();
    
    assert_ne!(hash1, hash2);
}

#[test]
fn l1_18_empty_vs_no_update_different() {
    let mut h1 = LengthPrefixedHasher::new(HashDomain::Request);
    h1.update(b"");
    let hash1 = h1.finalize_hex();
    
    let h2 = LengthPrefixedHasher::new(HashDomain::Request);
    let hash2 = h2.finalize_hex();
    
    assert_ne!(hash1, hash2);
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I17: NFKC (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_19_nfkc_precomposed_vs_combining() {
    let s1 = CanonicalString::new("café");
    let s2 = CanonicalString::new("cafe\u{0301}");
    assert_eq!(s1.as_str(), s2.as_str());
}

#[test]
fn l1_20_nfkc_fullwidth_normalized() {
    let s1 = CanonicalString::new("ABC");
    let s2 = CanonicalString::new("\u{FF21}\u{FF22}\u{FF23}");
    assert_eq!(s1.as_str(), s2.as_str());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I18: ENTITY ID (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_21_valid_entity_ids() {
    assert!(ValidatedEntityId::parse("CHAR:VICK").is_ok());
    assert!(ValidatedEntityId::parse("LOC:PARIS").is_ok());
    assert!(ValidatedEntityId::parse("VOICE:MAIN").is_ok());
}

#[test]
fn l1_22_invalid_entity_ids() {
    assert!(ValidatedEntityId::parse("").is_err());
    assert!(ValidatedEntityId::parse("CHAR").is_err());
    assert!(ValidatedEntityId::parse("UNKNOWN:X").is_err());
    assert!(ValidatedEntityId::parse("CHAR:_INVALID").is_err());
}

#[test]
fn l1_23_entity_id_max_length() {
    let long_ok = format!("CHAR:{}", "A".repeat(64));
    assert!(ValidatedEntityId::parse(&long_ok).is_ok());
    
    let too_long = format!("CHAR:{}", "A".repeat(65));
    assert!(ValidatedEntityId::parse(&too_long).is_err());
}

// ═══════════════════════════════════════════════════════════════════════════════
//   I19: CLAIM ID UNIQUENESS (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn l1_24_unique_claim_ids_pass() {
    let ids = vec!["CC:001", "CC:002", "CC:003"];
    assert!(check_claim_id_uniqueness(&ids).is_ok());
}

#[test]
fn l1_25_duplicate_claim_ids_fail() {
    let ids = vec!["CC:001", "CC:002", "CC:001"];
    assert!(check_claim_id_uniqueness(&ids).is_err());
}
