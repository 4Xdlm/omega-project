// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS PROOF MODULE
//   Version: 1.1.0-FUSION
//
//   Builds and verifies cryptographic proof for plan integrity.
//
//   FUSION: ChatGPT verify_plan_proof + OPUS HashDomain separation
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::{
    GenesisPlan, GenesisProof, HashLink, SceneSpec, CHAIN_ROOT_HASH,
};
use crate::genesis::modules::genesis::crypto::{HashDomain, LengthPrefixedHasher};
use crate::genesis::modules::genesis::errors::{GenesisError, GenesisResult};
use std::collections::BTreeMap;

/// Compute hash of a single scene (domain-separated)
fn hash_scene(scene: &SceneSpec) -> GenesisResult<String> {
    let json = serde_json::to_string(scene).map_err(|e| GenesisError::SerializationError {
        code: "GENESIS-E-PROOF-001",
        format: "SceneSpec".into(),
        reason: e.to_string(),
    })?;

    let mut h = LengthPrefixedHasher::new(HashDomain::Scene);
    h.update(json.as_bytes());
    Ok(h.finalize_hex())
}

/// Compute chain link hash: H(domain || prev_hash || scene_hash)
fn compute_chain_hash(prev_hash: &str, scene_hash: &str) -> String {
    let mut h = LengthPrefixedHasher::new(HashDomain::ChainLink);
    h.update(prev_hash.as_bytes());
    h.update(scene_hash.as_bytes());
    h.finalize_hex()
}

/// Build proof for a plan
/// 
/// # Determinism (GENESIS-I03)
/// 
/// - created_utc is injected from request metadata (not wall-clock)
/// - All hashes use domain separation
/// - Chain built deterministically from scenes
/// 
/// # Hash Chain Structure
/// 
/// ```text
/// ROOT (64 zeros)
///   │
///   ├─► scene_hash[0] ─► chain_hash[0]
///   │
///   ├─► scene_hash[1] ─► chain_hash[1] = H(chain_hash[0] || scene_hash[1])
///   │
///   └─► ...
/// ```
pub fn build_proof(
    seed: u64,
    request_hash: &str,
    created_utc: &str,
    scenes: &[SceneSpec],
) -> GenesisResult<GenesisProof> {
    let mut chain = Vec::with_capacity(scenes.len());
    let mut prev = CHAIN_ROOT_HASH.to_string();

    for (i, scene) in scenes.iter().enumerate() {
        let scene_hash = hash_scene(scene)?;
        let chain_hash = compute_chain_hash(&prev, &scene_hash);

        chain.push(HashLink {
            index: i as u32,
            scene_hash: scene_hash.clone(),
            prev_hash: prev.clone(),
            chain_hash: chain_hash.clone(),
        });

        prev = chain_hash;
    }

    // Build manifest
    let mut manifest = BTreeMap::new();
    manifest.insert("canonical_request_hash".into(), request_hash.to_string());
    manifest.insert("scene_chain_tip".into(), prev.clone());

    // Plan ID = H(request_hash || chain_tip)
    let mut plan_id_hasher = LengthPrefixedHasher::new(HashDomain::Manifest);
    plan_id_hasher.update(request_hash.as_bytes());
    plan_id_hasher.update(prev.as_bytes());
    let plan_id = plan_id_hasher.finalize_hex();
    manifest.insert("plan_id".into(), plan_id);

    Ok(GenesisProof {
        seed,
        canonical_request_hash: request_hash.to_string(),
        scene_hash_chain: chain,
        manifest_sha256: manifest,
        created_utc: created_utc.to_string(),
    })
}

/// Verify plan proof integrity (GENESIS-I11)
/// 
/// # Verification Steps
/// 
/// 1. Chain length matches scene count
/// 2. Each link's index is sequential
/// 3. Each link's prev_hash matches previous chain_hash
/// 4. Each link's scene_hash matches recomputed hash
/// 5. Each link's chain_hash matches recomputed value
/// 6. Manifest tip matches final chain_hash
/// 7. Plan ID matches recomputed value
/// 
/// # Returns
/// 
/// - `Ok(())` if proof is valid
/// - `Err(GenesisError)` with specific tamper location if invalid
pub fn verify_plan_proof(plan: &GenesisPlan) -> GenesisResult<()> {
    let proof = &plan.plan_proof;
    let scenes = &plan.scene_specs;

    // 1. Chain length check
    if proof.scene_hash_chain.len() != scenes.len() {
        return Err(GenesisError::TamperDetected {
            code: "GENESIS-E-PROOF-011",
            chain_index: 0,
            reason: format!(
                "chain length mismatch: {} links vs {} scenes",
                proof.scene_hash_chain.len(),
                scenes.len()
            ),
        });
    }

    let mut prev = CHAIN_ROOT_HASH.to_string();

    for (i, scene) in scenes.iter().enumerate() {
        let link = &proof.scene_hash_chain[i];

        // 2. Index check
        if link.index != i as u32 {
            return Err(GenesisError::TamperDetected {
                code: "GENESIS-E-PROOF-012",
                chain_index: i,
                reason: format!("index mismatch: expected {}, got {}", i, link.index),
            });
        }

        // 3. Prev hash check
        if link.prev_hash != prev {
            return Err(GenesisError::TamperDetected {
                code: "GENESIS-E-PROOF-013",
                chain_index: i,
                reason: format!(
                    "prev_hash mismatch: expected {}, got {}",
                    prev, link.prev_hash
                ),
            });
        }

        // 4. Scene hash check
        let expected_scene_hash = hash_scene(scene)?;
        if link.scene_hash != expected_scene_hash {
            return Err(GenesisError::TamperDetected {
                code: "GENESIS-E-PROOF-014",
                chain_index: i,
                reason: "scene_hash mismatch (scene content tampered)".into(),
            });
        }

        // 5. Chain hash check
        let expected_chain_hash = compute_chain_hash(&prev, &expected_scene_hash);
        if link.chain_hash != expected_chain_hash {
            return Err(GenesisError::TamperDetected {
                code: "GENESIS-E-PROOF-015",
                chain_index: i,
                reason: "chain_hash mismatch".into(),
            });
        }

        prev = expected_chain_hash;
    }

    // 6. Manifest tip check
    let stored_tip = proof.manifest_sha256.get("scene_chain_tip").ok_or_else(|| {
        GenesisError::ProofError {
            code: "GENESIS-E-PROOF-016",
            reason: "manifest missing scene_chain_tip".into(),
        }
    })?;

    if stored_tip != &prev {
        return Err(GenesisError::TamperDetected {
            code: "GENESIS-E-PROOF-017",
            chain_index: scenes.len(),
            reason: "manifest tip mismatch".into(),
        });
    }

    // 7. Plan ID check
    let stored_plan_id = proof.manifest_sha256.get("plan_id").ok_or_else(|| {
        GenesisError::ProofError {
            code: "GENESIS-E-PROOF-018",
            reason: "manifest missing plan_id".into(),
        }
    })?;

    let mut plan_id_hasher = LengthPrefixedHasher::new(HashDomain::Manifest);
    plan_id_hasher.update(plan.request_hash.as_bytes());
    plan_id_hasher.update(prev.as_bytes());
    let expected_plan_id = plan_id_hasher.finalize_hex();

    if stored_plan_id != &expected_plan_id {
        return Err(GenesisError::TamperDetected {
            code: "GENESIS-E-PROOF-019",
            chain_index: scenes.len(),
            reason: "plan_id mismatch".into(),
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

    fn make_scene(index: u32) -> SceneSpec {
        SceneSpec {
            index,
            pov: "third_limited".into(),
            tense: "past".into(),
            tone: "dramatic".into(),
            canon_read_scope: vec!["CHAR:VICK".into()],
            length: LengthSpec { min: 800, max: 1000 },
            instructions: format!("Scene {} instructions", index),
            beat_kind: "SETUP".into(),
            beat_label: format!("BEAT-{}", index),
        }
    }

    #[test]
    fn build_proof_deterministic() {
        let scenes = vec![make_scene(0), make_scene(1), make_scene(2)];
        
        let proof1 = build_proof(42, "request_hash_1", "2026-01-01T00:00:00Z", &scenes).unwrap();
        let proof2 = build_proof(42, "request_hash_1", "2026-01-01T00:00:00Z", &scenes).unwrap();
        
        assert_eq!(proof1.scene_hash_chain, proof2.scene_hash_chain);
        assert_eq!(proof1.manifest_sha256, proof2.manifest_sha256);
    }

    #[test]
    fn proof_chain_length_matches_scenes() {
        let scenes = vec![make_scene(0), make_scene(1), make_scene(2)];
        let proof = build_proof(42, "req_hash", "2026-01-01T00:00:00Z", &scenes).unwrap();
        assert_eq!(proof.scene_hash_chain.len(), 3);
    }

    #[test]
    fn proof_chain_starts_from_root() {
        let scenes = vec![make_scene(0)];
        let proof = build_proof(42, "req_hash", "2026-01-01T00:00:00Z", &scenes).unwrap();
        assert_eq!(proof.scene_hash_chain[0].prev_hash, CHAIN_ROOT_HASH);
    }

    #[test]
    fn verify_proof_valid_plan() {
        let scenes = vec![make_scene(0), make_scene(1), make_scene(2)];
        let request_hash = "test_request_hash";
        let proof = build_proof(42, request_hash, "2026-01-01T00:00:00Z", &scenes).unwrap();
        
        let plan = GenesisPlan {
            plan_id: proof.manifest_sha256.get("plan_id").unwrap().clone(),
            request_hash: request_hash.into(),
            scene_specs: scenes,
            plan_proof: proof,
            staged_facts: vec![],
            warnings: vec![],
        };
        
        assert!(verify_plan_proof(&plan).is_ok());
    }

    #[test]
    fn verify_proof_detects_tampered_scene() {
        let scenes = vec![make_scene(0), make_scene(1), make_scene(2)];
        let request_hash = "test_request_hash";
        let proof = build_proof(42, request_hash, "2026-01-01T00:00:00Z", &scenes).unwrap();
        
        // Tamper with scene
        let mut tampered_scenes = scenes.clone();
        tampered_scenes[1].instructions = "TAMPERED INSTRUCTIONS".into();
        
        let plan = GenesisPlan {
            plan_id: proof.manifest_sha256.get("plan_id").unwrap().clone(),
            request_hash: request_hash.into(),
            scene_specs: tampered_scenes,
            plan_proof: proof,
            staged_facts: vec![],
            warnings: vec![],
        };
        
        let result = verify_plan_proof(&plan);
        assert!(result.is_err());
        
        let err = result.unwrap_err();
        let msg = format!("{}", err);
        assert!(msg.contains("GENESIS-E-PROOF-014") || msg.contains("tamper"));
    }

    #[test]
    fn verify_proof_detects_tampered_tip() {
        let scenes = vec![make_scene(0)];
        let request_hash = "test_request_hash";
        let mut proof = build_proof(42, request_hash, "2026-01-01T00:00:00Z", &scenes).unwrap();
        
        // Tamper with manifest tip
        proof.manifest_sha256.insert("scene_chain_tip".into(), "FAKE_TIP".into());
        
        let plan = GenesisPlan {
            plan_id: "fake_id".into(),
            request_hash: request_hash.into(),
            scene_specs: scenes,
            plan_proof: proof,
            staged_facts: vec![],
            warnings: vec![],
        };
        
        let result = verify_plan_proof(&plan);
        assert!(result.is_err());
    }

    #[test]
    fn different_seeds_same_content_same_proof() {
        // Seed only affects which content is generated, not how it's hashed
        // If scenes are identical, proofs should be identical (except seed field)
        let scenes = vec![make_scene(0)];
        
        let proof1 = build_proof(42, "req", "2026-01-01T00:00:00Z", &scenes).unwrap();
        let proof2 = build_proof(99, "req", "2026-01-01T00:00:00Z", &scenes).unwrap();
        
        assert_eq!(proof1.scene_hash_chain, proof2.scene_hash_chain);
        assert_ne!(proof1.seed, proof2.seed);
    }
}
