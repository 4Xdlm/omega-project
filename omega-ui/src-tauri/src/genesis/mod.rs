// ═══════════════════════════════════════════════════════════════════════════════
//
//   ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗
//  ██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝
//  ██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗
//  ██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║
//  ╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║
//   ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝
//
//   GENESIS v1.1.0-FUSION — Deterministic Narrative Planner
//   Standard: DO-178C / AS9100D / SpaceX Flight Software
//
//   Architects: Francky (Supreme), Claude (OPUS 4.5), ChatGPT (Review)
//   Date: 2026-01-01
//
// ═══════════════════════════════════════════════════════════════════════════════
//
//   MISSION: Plan sagas with ZERO continuity error
//
//   GUARANTEES:
//   - Same seed + request = same plan (bit-for-bit)
//   - Hash chain verifies integrity (tamper = detected)
//   - 100% SCRIBE compatible (SceneSpec validated)
//   - Beats Setup/Confrontation/Payoff guaranteed (≥3 scenes)
//
//   INVARIANTS: 20 (I01-I20)
//   TESTS: 65 (L1:25, L2:20, L3:10, L4:10)
//
// ═══════════════════════════════════════════════════════════════════════════════

pub mod interfaces {
    pub mod genesis;
}

pub mod modules {
    pub mod genesis;
}

// Re-export main types at crate root
pub use interfaces::genesis::{
    // Request types
    GenesisRequest,
    GenesisMetadata,
    PlanTarget,
    ArcSpec,
    ContinuityClaim,
    
    // Output types
    GenesisPlan,
    SceneSpec,
    LengthSpec,
    GenesisProof,
    HashLink,
    StagedFact,
    Warning,
    
    // Beat types
    Beat,
    BeatKind,
    
    // Constants
    CHAIN_ROOT_HASH,
    SCHEMA_VERSION,
};

pub use modules::genesis::{
    genesis_plan,
    verify_plan,
    GenesisError,
    GenesisResult,
    GenesisWarning,
    WarningSeverity,
};

// Tests
#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    fn make_minimal_request() -> GenesisRequest {
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
                key: "test".into(),
                expected: serde_json::json!("value"),
                severity: "P0-CRITICAL".into(),
                note: "Note".into(),
            }],
            metadata: GenesisMetadata {
                schema_version: SCHEMA_VERSION.into(),
                created_utc: "2026-01-01T00:00:00Z".into(),
                updated_utc: "2026-01-01T00:00:00Z".into(),
            },
        }
    }

    #[test]
    fn smoke_test_genesis_plan() {
        let req = make_minimal_request();
        let plan = genesis_plan(&req).unwrap();
        
        assert_eq!(plan.scene_specs.len(), 3);
        assert!(verify_plan(&plan).is_ok());
    }

    #[test]
    fn smoke_test_determinism() {
        let req = make_minimal_request();
        
        let plan1 = genesis_plan(&req).unwrap();
        let plan2 = genesis_plan(&req).unwrap();
        
        assert_eq!(plan1.plan_id, plan2.plan_id);
        assert_eq!(plan1.request_hash, plan2.request_hash);
    }
}
