// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS CANONICALIZE MODULE
//   Version: 1.1.0-FUSION
//
//   Transforms GenesisRequest into canonical form for deterministic hashing.
//
//   CRITICAL: Metadata timestamps are NOT included in hash-canonical form
//             to ensure GENESIS-I03 (same seed = same plan)
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::GenesisRequest;
use crate::genesis::modules::genesis::crypto::CanonicalString;
use crate::genesis::modules::genesis::errors::{GenesisError, GenesisResult};
use serde_json::Value;
use std::collections::BTreeMap;

/// Canonical form of GenesisRequest for hashing
/// 
/// All strings are NFKC-normalized and trimmed.
/// Metadata timestamps are excluded (determinism).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CanonicalRequest {
    pub saga_id: CanonicalString,
    pub seed: u64,
    pub schema_version: CanonicalString,
    pub canon_read_scope: Vec<CanonicalString>,
    pub voice_profile_ref: CanonicalString,
    pub target_canonical: String,
    pub constraints_canonical: String,
    pub arc_canonical: String,
    pub continuity_canonical: String,
}

/// Recursively sort JSON object keys for canonical serialization
fn sort_json_keys(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut sorted = BTreeMap::new();
            for (k, v) in map.iter() {
                sorted.insert(k.clone(), sort_json_keys(v));
            }
            let mut out = serde_json::Map::new();
            for (k, v) in sorted {
                out.insert(k, v);
            }
            Value::Object(out)
        }
        Value::Array(arr) => Value::Array(arr.iter().map(sort_json_keys).collect()),
        _ => value.clone(),
    }
}

/// Serialize value to canonical JSON (sorted keys, no extra whitespace)
fn canonical_json(value: &Value) -> GenesisResult<String> {
    let sorted = sort_json_keys(value);
    serde_json::to_string(&sorted).map_err(|e| GenesisError::SerializationError {
        code: "GENESIS-E-CANON-001",
        format: "JSON".into(),
        reason: e.to_string(),
    })
}

/// Convert GenesisRequest to canonical form
/// 
/// # NFKC Normalization
/// 
/// All string fields are normalized using Unicode NFKC form:
/// - "café" and "cafe\u{0301}" become identical
/// - Fullwidth characters are normalized
/// - Whitespace is trimmed
/// 
/// # Determinism
/// 
/// - Metadata timestamps are excluded
/// - JSON keys are sorted recursively
/// - All ordering is stable (BTreeMap)
pub fn canonicalize_request(req: &GenesisRequest) -> GenesisResult<CanonicalRequest> {
    // Target
    let target_value = serde_json::to_value(&req.target).map_err(|e| {
        GenesisError::SerializationError {
            code: "GENESIS-E-CANON-002",
            format: "target".into(),
            reason: e.to_string(),
        }
    })?;
    let target_canonical = canonical_json(&target_value)?;

    // Constraints (already BTreeMap)
    let constraints_value = serde_json::to_value(&req.constraints).map_err(|e| {
        GenesisError::SerializationError {
            code: "GENESIS-E-CANON-003",
            format: "constraints".into(),
            reason: e.to_string(),
        }
    })?;
    let constraints_canonical = canonical_json(&constraints_value)?;

    // Arc
    let arc_value = serde_json::to_value(&req.arc_spec).map_err(|e| {
        GenesisError::SerializationError {
            code: "GENESIS-E-CANON-004",
            format: "arc_spec".into(),
            reason: e.to_string(),
        }
    })?;
    let arc_canonical = canonical_json(&arc_value)?;

    // Continuity claims (sort by claim_id for determinism)
    let mut sorted_claims = req.continuity_claims.clone();
    sorted_claims.sort_by(|a, b| a.claim_id.cmp(&b.claim_id));
    let continuity_value = serde_json::to_value(&sorted_claims).map_err(|e| {
        GenesisError::SerializationError {
            code: "GENESIS-E-CANON-005",
            format: "continuity_claims".into(),
            reason: e.to_string(),
        }
    })?;
    let continuity_canonical = canonical_json(&continuity_value)?;

    // Canon read scope (sorted + normalized)
    let mut canon_scope: Vec<CanonicalString> = req
        .canon_read_scope
        .iter()
        .map(|s| CanonicalString::new(s))
        .collect();
    canon_scope.sort_by(|a, b| a.as_str().cmp(b.as_str()));

    Ok(CanonicalRequest {
        saga_id: CanonicalString::new(&req.saga_id),
        seed: req.seed,
        schema_version: CanonicalString::new(&req.metadata.schema_version),
        canon_read_scope: canon_scope,
        voice_profile_ref: CanonicalString::new(&req.voice_profile_ref),
        target_canonical,
        constraints_canonical,
        arc_canonical,
        continuity_canonical,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
//   TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::genesis::interfaces::genesis::*;
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
            constraints: {
                let mut m = BTreeMap::new();
                m.insert("pov".into(), Value::String("third_limited".into()));
                m
            },
            canon_read_scope: vec!["CHAR:VICK".into(), "LOC:PARIS".into()],
            voice_profile_ref: "VOICE:MAIN".into(),
            arc_spec: ArcSpec {
                title: "Test Arc".into(),
                premise: "A test premise".into(),
                act_count: 3,
                major_turns: vec!["Turn 1".into()],
                stakes: "High stakes".into(),
            },
            continuity_claims: vec![ContinuityClaim {
                claim_id: "CC:001".into(),
                entity_id: "CHAR:VICK".into(),
                key: "age".into(),
                expected: serde_json::json!(47),
                severity: "P0-CRITICAL".into(),
                note: "Age must be 47".into(),
            }],
            metadata: GenesisMetadata {
                schema_version: "GENESIS/1.1.0".into(),
                created_utc: "2026-01-01T00:00:00Z".into(),
                updated_utc: "2026-01-01T00:00:00Z".into(),
            },
        }
    }

    #[test]
    fn canonicalize_deterministic() {
        let req = make_test_request();
        let c1 = canonicalize_request(&req).unwrap();
        let c2 = canonicalize_request(&req).unwrap();
        assert_eq!(c1, c2);
    }

    #[test]
    fn canonicalize_scope_sorted() {
        let mut req = make_test_request();
        req.canon_read_scope = vec!["LOC:PARIS".into(), "CHAR:VICK".into()];
        let c = canonicalize_request(&req).unwrap();
        // Should be sorted: CHAR:VICK < LOC:PARIS
        assert_eq!(c.canon_read_scope[0].as_str(), "CHAR:VICK");
        assert_eq!(c.canon_read_scope[1].as_str(), "LOC:PARIS");
    }

    #[test]
    fn canonicalize_nfkc_applied() {
        let mut req = make_test_request();
        req.saga_id = "  SAGA:TEST  ".into(); // with spaces
        let c = canonicalize_request(&req).unwrap();
        assert_eq!(c.saga_id.as_str(), "SAGA:TEST");
    }

    #[test]
    fn json_keys_sorted() {
        let mut map = serde_json::Map::new();
        map.insert("z".into(), Value::String("last".into()));
        map.insert("a".into(), Value::String("first".into()));
        let value = Value::Object(map);
        
        let canonical = canonical_json(&value).unwrap();
        // "a" should come before "z"
        assert!(canonical.find("\"a\"").unwrap() < canonical.find("\"z\"").unwrap());
    }
}
