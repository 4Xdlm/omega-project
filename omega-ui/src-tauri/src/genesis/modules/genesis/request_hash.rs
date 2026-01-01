// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS REQUEST HASH MODULE
//   Version: 1.1.0-FUSION
//
//   Computes deterministic hash of canonical request using LengthPrefixedHasher.
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::modules::genesis::canonicalize::CanonicalRequest;
use crate::genesis::modules::genesis::crypto::{HashDomain, LengthPrefixedHasher};

/// Hash a canonical request using domain-separated, length-prefixed hashing
/// 
/// # Determinism (GENESIS-I02)
/// 
/// Same CanonicalRequest → same hash, guaranteed by:
/// - NFKC-normalized strings
/// - Length-prefixed concatenation
/// - Domain separation (HashDomain::Request)
/// - Stable field ordering
/// 
/// # Fields included (in order)
/// 
/// 1. saga_id
/// 2. seed
/// 3. schema_version
/// 4. canon_read_scope (sorted)
/// 5. voice_profile_ref
/// 6. target_canonical (JSON)
/// 7. constraints_canonical (JSON)
/// 8. arc_canonical (JSON)
/// 9. continuity_canonical (JSON, sorted by claim_id)
pub fn hash_canonical_request(c: &CanonicalRequest) -> String {
    let mut h = LengthPrefixedHasher::new(HashDomain::Request);
    
    // 1. saga_id
    h.update_str(&c.saga_id);
    
    // 2. seed
    h.update_u64(c.seed);
    
    // 3. schema_version
    h.update_str(&c.schema_version);
    
    // 4. canon_read_scope (already sorted in canonicalize)
    h.update_str_list(&c.canon_read_scope);
    
    // 5. voice_profile_ref
    h.update_str(&c.voice_profile_ref);
    
    // 6. target_canonical
    h.update(c.target_canonical.as_bytes());
    
    // 7. constraints_canonical
    h.update(c.constraints_canonical.as_bytes());
    
    // 8. arc_canonical
    h.update(c.arc_canonical.as_bytes());
    
    // 9. continuity_canonical
    h.update(c.continuity_canonical.as_bytes());
    
    h.finalize_hex()
}

// ═══════════════════════════════════════════════════════════════════════════════
//   TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::genesis::interfaces::genesis::*;
    use crate::genesis::modules::genesis::canonicalize::canonicalize_request;
    use std::collections::BTreeMap;

    fn make_test_request() -> GenesisRequest {
        GenesisRequest {
            saga_id: "SAGA:TEST".into(),
            seed: 42,
            target: PlanTarget {
                scenes: 3,
                avg_words: 900,
                min_words: 800,
                max_words: 1000,
                require_beats: true,
                tone_hint: None,
            },
            constraints: BTreeMap::new(),
            canon_read_scope: vec!["CHAR:VICK".into()],
            voice_profile_ref: "VOICE:MAIN".into(),
            arc_spec: ArcSpec {
                title: "Test".into(),
                premise: "Test premise".into(),
                act_count: 3,
                major_turns: vec!["Turn".into()],
                stakes: "Stakes".into(),
            },
            continuity_claims: vec![ContinuityClaim {
                claim_id: "CC:001".into(),
                entity_id: "CHAR:VICK".into(),
                key: "age".into(),
                expected: serde_json::json!(47),
                severity: "P0-CRITICAL".into(),
                note: "Note".into(),
            }],
            metadata: GenesisMetadata {
                schema_version: "GENESIS/1.1.0".into(),
                created_utc: "2026-01-01T00:00:00Z".into(),
                updated_utc: "2026-01-01T00:00:00Z".into(),
            },
        }
    }

    #[test]
    fn genesis_i02_hash_deterministic_100_runs() {
        let req = make_test_request();
        let canonical = canonicalize_request(&req).unwrap();
        let first_hash = hash_canonical_request(&canonical);
        
        for i in 0..100 {
            let c = canonicalize_request(&req).unwrap();
            let h = hash_canonical_request(&c);
            assert_eq!(h, first_hash, "Run {} must match first hash", i);
        }
    }

    #[test]
    fn hash_length_is_64_hex_chars() {
        let req = make_test_request();
        let canonical = canonicalize_request(&req).unwrap();
        let hash = hash_canonical_request(&canonical);
        assert_eq!(hash.len(), 64, "SHA-256 hex = 64 chars");
    }

    #[test]
    fn different_seed_different_hash() {
        let mut req1 = make_test_request();
        let mut req2 = make_test_request();
        req2.seed = 43;
        
        let c1 = canonicalize_request(&req1).unwrap();
        let c2 = canonicalize_request(&req2).unwrap();
        
        let h1 = hash_canonical_request(&c1);
        let h2 = hash_canonical_request(&c2);
        
        assert_ne!(h1, h2);
    }

    #[test]
    fn different_saga_different_hash() {
        let mut req1 = make_test_request();
        let mut req2 = make_test_request();
        req2.saga_id = "SAGA:OTHER".into();
        
        let c1 = canonicalize_request(&req1).unwrap();
        let c2 = canonicalize_request(&req2).unwrap();
        
        let h1 = hash_canonical_request(&c1);
        let h2 = hash_canonical_request(&c2);
        
        assert_ne!(h1, h2);
    }
}
