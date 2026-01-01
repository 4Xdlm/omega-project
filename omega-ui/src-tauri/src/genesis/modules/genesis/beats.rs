// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS BEATS MODULE
//   Version: 1.1.0-FUSION
//
//   Generates narrative beats (Setup → Confrontation → Payoff) from request.
//
//   Based on ChatGPT structure with OPUS improvements.
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::{Beat, BeatKind, GenesisRequest};
use crate::genesis::modules::genesis::errors::{GenesisError, GenesisResult, GenesisWarning, WarningSeverity};

/// Generate beats from request
/// 
/// # Beat Structure (GENESIS-I08)
/// 
/// - 1 scene: Setup only
/// - 2 scenes: Setup + Confrontation
/// - 3+ scenes: Setup + [Bridges...] + Confrontation + [Bridges...] + Payoff
/// 
/// # Determinism
/// 
/// Same request → same beats (no randomness)
/// 
/// # Returns
/// 
/// (Vec<Beat>, Vec<GenesisWarning>)
pub fn generate_beats(req: &GenesisRequest) -> GenesisResult<(Vec<Beat>, Vec<GenesisWarning>)> {
    let scenes = req.target.scenes as usize;
    let mut warnings = Vec::new();

    if scenes == 0 {
        return Err(GenesisError::InvalidRequest {
            code: "GENESIS-E-BEAT-001",
            field: "target.scenes".into(),
            reason: "must be > 0".into(),
        });
    }

    let mut beats = Vec::with_capacity(scenes);

    // ─────────────────────────────────────────────────────────────────────────
    // Core beats based on scene count
    // ─────────────────────────────────────────────────────────────────────────

    // SETUP (always present)
    beats.push(Beat {
        kind: BeatKind::Setup,
        label: "SETUP".into(),
        goal: format!("Establish status quo for {} and introduce protagonist intent", req.arc_spec.title),
        conflict: "Introduce initial friction and constraints that will drive the story".into(),
        outcome_hint: "A clear direction is chosen, stakes are established".into(),
        canon_focus: req.canon_read_scope.clone(),
    });

    if scenes >= 2 {
        // CONFRONTATION
        beats.push(Beat {
            kind: BeatKind::Confrontation,
            label: "CONFRONTATION".into(),
            goal: "Pursue the objective under increasing pressure".into(),
            conflict: format!("Escalation toward '{}' — obstacles tighten", req.arc_spec.stakes),
            outcome_hint: "A turning point forces adaptation or reveals new information".into(),
            canon_focus: req.canon_read_scope.clone(),
        });
    }

    if scenes >= 3 {
        // PAYOFF
        beats.push(Beat {
            kind: BeatKind::Payoff,
            label: "PAYOFF".into(),
            goal: format!("Resolve the immediate arc: {}", req.arc_spec.premise),
            conflict: "Final push — costs are paid, choices have consequences".into(),
            outcome_hint: "Outcome lands with emotional impact + hook for continuation".into(),
            canon_focus: req.canon_read_scope.clone(),
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Add BRIDGES for extra scenes
    // ─────────────────────────────────────────────────────────────────────────
    
    // Insert bridges to fill remaining slots
    let mut bridge_counter = 1u32;
    while beats.len() < scenes {
        // Determine bridge focus based on position
        let focus = if bridge_counter % 2 == 1 {
            "Advance plot while developing character relationships"
        } else {
            "Add complication or reveal that raises stakes"
        };

        // Insert before PAYOFF if exists, otherwise at end
        let insert_pos = if scenes >= 3 && beats.len() >= 2 {
            beats.len() - 1 // Before PAYOFF
        } else {
            beats.len() // At end
        };

        beats.insert(
            insert_pos,
            Beat {
                kind: BeatKind::Bridge,
                label: format!("BRIDGE-{}", bridge_counter),
                goal: focus.into(),
                conflict: "Maintain momentum while deepening engagement".into(),
                outcome_hint: "Progress is made, but new challenges emerge".into(),
                canon_focus: req.canon_read_scope.clone(),
            },
        );
        bridge_counter += 1;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Generate warnings
    // ─────────────────────────────────────────────────────────────────────────

    // Tight length range warning
    if req.target.max_words.saturating_sub(req.target.min_words) < 100 {
        warnings.push(
            GenesisWarning::new(
                "GENESIS-W-001",
                "Length range is tight (<100 words); SCRIBE may produce more warnings",
                WarningSeverity::Low,
            )
            .with_context("min_words", &req.target.min_words.to_string())
            .with_context("max_words", &req.target.max_words.to_string()),
        );
    }

    // High scene count warning
    if scenes > 50 {
        warnings.push(
            GenesisWarning::new(
                "GENESIS-W-004",
                "High scene count may increase planning time",
                WarningSeverity::Medium,
            )
            .with_context("scenes", &scenes.to_string()),
        );
    }

    // Single act warning
    if req.arc_spec.act_count == 1 {
        warnings.push(GenesisWarning::new(
            "GENESIS-W-005",
            "Single-act structure is unconventional; consider 3-act for better pacing",
            WarningSeverity::Low,
        ));
    }

    Ok((beats, warnings))
}

/// Check if beats satisfy coverage requirements (GENESIS-I08)
pub fn check_beat_coverage(beats: &[Beat], require_full: bool) -> GenesisResult<()> {
    if !require_full {
        return Ok(());
    }

    let has_setup = beats.iter().any(|b| matches!(b.kind, BeatKind::Setup));
    let has_conf = beats.iter().any(|b| matches!(b.kind, BeatKind::Confrontation));
    let has_payoff = beats.iter().any(|b| matches!(b.kind, BeatKind::Payoff));

    let mut missing = Vec::new();
    if !has_setup {
        missing.push("SETUP".to_string());
    }
    if !has_conf {
        missing.push("CONFRONTATION".to_string());
    }
    if !has_payoff {
        missing.push("PAYOFF".to_string());
    }

    if !missing.is_empty() {
        return Err(GenesisError::MissingBeatCoverage {
            code: "GENESIS-E-BEAT-002",
            missing,
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
                tone_hint: None,
            },
            constraints: BTreeMap::new(),
            canon_read_scope: vec!["CHAR:VICK".into()],
            voice_profile_ref: "VOICE:MAIN".into(),
            arc_spec: ArcSpec {
                title: "Test".into(),
                premise: "Premise".into(),
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
    fn beats_1_scene_setup_only() {
        let req = make_request(1);
        let (beats, _) = generate_beats(&req).unwrap();
        assert_eq!(beats.len(), 1);
        assert!(matches!(beats[0].kind, BeatKind::Setup));
    }

    #[test]
    fn beats_2_scenes_setup_confrontation() {
        let req = make_request(2);
        let (beats, _) = generate_beats(&req).unwrap();
        assert_eq!(beats.len(), 2);
        assert!(matches!(beats[0].kind, BeatKind::Setup));
        assert!(matches!(beats[1].kind, BeatKind::Confrontation));
    }

    #[test]
    fn beats_3_scenes_full_structure() {
        let req = make_request(3);
        let (beats, _) = generate_beats(&req).unwrap();
        assert_eq!(beats.len(), 3);
        assert!(matches!(beats[0].kind, BeatKind::Setup));
        assert!(matches!(beats[1].kind, BeatKind::Confrontation));
        assert!(matches!(beats[2].kind, BeatKind::Payoff));
    }

    #[test]
    fn beats_5_scenes_with_bridges() {
        let req = make_request(5);
        let (beats, _) = generate_beats(&req).unwrap();
        assert_eq!(beats.len(), 5);
        
        // Should have Setup, Confrontation, Payoff + 2 Bridges
        let setup_count = beats.iter().filter(|b| matches!(b.kind, BeatKind::Setup)).count();
        let conf_count = beats.iter().filter(|b| matches!(b.kind, BeatKind::Confrontation)).count();
        let payoff_count = beats.iter().filter(|b| matches!(b.kind, BeatKind::Payoff)).count();
        let bridge_count = beats.iter().filter(|b| matches!(b.kind, BeatKind::Bridge)).count();
        
        assert_eq!(setup_count, 1);
        assert_eq!(conf_count, 1);
        assert_eq!(payoff_count, 1);
        assert_eq!(bridge_count, 2);
    }

    #[test]
    fn beats_12_scenes() {
        let req = make_request(12);
        let (beats, _) = generate_beats(&req).unwrap();
        assert_eq!(beats.len(), 12);
    }

    #[test]
    fn beats_0_scenes_error() {
        let req = make_request(0);
        let result = generate_beats(&req);
        assert!(result.is_err());
    }

    #[test]
    fn beat_coverage_check_pass() {
        let beats = vec![
            Beat { kind: BeatKind::Setup, label: "S".into(), goal: "".into(), conflict: "".into(), outcome_hint: "".into(), canon_focus: vec![] },
            Beat { kind: BeatKind::Confrontation, label: "C".into(), goal: "".into(), conflict: "".into(), outcome_hint: "".into(), canon_focus: vec![] },
            Beat { kind: BeatKind::Payoff, label: "P".into(), goal: "".into(), conflict: "".into(), outcome_hint: "".into(), canon_focus: vec![] },
        ];
        assert!(check_beat_coverage(&beats, true).is_ok());
    }

    #[test]
    fn beat_coverage_check_missing() {
        let beats = vec![
            Beat { kind: BeatKind::Setup, label: "S".into(), goal: "".into(), conflict: "".into(), outcome_hint: "".into(), canon_focus: vec![] },
        ];
        let result = check_beat_coverage(&beats, true);
        assert!(result.is_err());
    }

    #[test]
    fn warning_tight_length_range() {
        let mut req = make_request(3);
        req.target.min_words = 900;
        req.target.max_words = 950; // Only 50 words range
        let (_, warnings) = generate_beats(&req).unwrap();
        assert!(warnings.iter().any(|w| w.code == "GENESIS-W-001"));
    }
}
