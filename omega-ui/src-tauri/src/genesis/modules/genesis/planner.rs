// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS PLANNER MODULE
//   Version: 1.1.0-FUSION
//
//   Converts beats to SCRIBE-compatible SceneSpecs.
//
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::{Beat, GenesisRequest, LengthSpec, SceneSpec};
use crate::genesis::modules::genesis::errors::{GenesisResult, GenesisWarning, WarningSeverity};
use std::collections::BTreeSet;

/// Format continuity claims as structured block for instructions
fn format_continuity_block(req: &GenesisRequest) -> String {
    let mut lines = Vec::new();
    lines.push("CONTINUITY_CLAIMS:".to_string());
    
    // Sort claims by claim_id for determinism
    let mut sorted_claims = req.continuity_claims.clone();
    sorted_claims.sort_by(|a, b| a.claim_id.cmp(&b.claim_id));
    
    for claim in &sorted_claims {
        let expected_str = serde_json::to_string(&claim.expected)
            .unwrap_or_else(|_| "\"<json_error>\"".to_string());
        lines.push(format!(
            "  - [{}] {}.{} = {} ({}): {}",
            claim.severity,
            claim.entity_id,
            claim.key,
            expected_str,
            claim.claim_id,
            claim.note.replace('\n', " ")
        ));
    }
    
    lines.join("\n")
}

/// Format constraints as structured block
fn format_constraints_block(req: &GenesisRequest) -> String {
    if req.constraints.is_empty() {
        return String::new();
    }
    
    let mut lines = Vec::new();
    lines.push("CONSTRAINTS:".to_string());
    
    // BTreeMap already sorted
    for (key, value) in &req.constraints {
        let value_str = serde_json::to_string(value)
            .unwrap_or_else(|_| "\"<json_error>\"".to_string());
        lines.push(format!("  - {} = {}", key, value_str));
    }
    
    lines.join("\n")
}

/// Build structured instructions for a scene
fn build_instructions(
    beat: &Beat,
    req: &GenesisRequest,
    scene_index: usize,
) -> String {
    let mut parts = Vec::new();
    
    // Header
    parts.push(format!("═══ SCENE {} ═══", scene_index));
    parts.push(String::new());
    
    // Beat info
    parts.push(format!("BEAT_KIND: {}", beat.kind));
    parts.push(format!("BEAT_LABEL: {}", beat.label));
    parts.push(String::new());
    
    // Story context
    parts.push(format!("ARC_TITLE: {}", req.arc_spec.title));
    parts.push(format!("ARC_PREMISE: {}", req.arc_spec.premise));
    parts.push(format!("STAKES: {}", req.arc_spec.stakes));
    parts.push(String::new());
    
    // Scene goals
    parts.push(format!("GOAL: {}", beat.goal));
    parts.push(format!("CONFLICT: {}", beat.conflict));
    parts.push(format!("OUTCOME_HINT: {}", beat.outcome_hint));
    parts.push(String::new());
    
    // Constraints if any
    let constraints_block = format_constraints_block(req);
    if !constraints_block.is_empty() {
        parts.push(constraints_block);
        parts.push(String::new());
    }
    
    // Continuity claims
    parts.push(format_continuity_block(req));
    
    parts.join("\n")
}

/// Convert beats to SCRIBE-compatible SceneSpecs
/// 
/// # SCRIBE Compatibility (GENESIS-I05)
/// 
/// Each SceneSpec contains:
/// - pov (non-empty)
/// - tense (non-empty)
/// - tone (non-empty)
/// - canon_read_scope (non-empty)
/// - length (min ≤ max)
/// - instructions (contains GOAL, CONFLICT, OUTCOME_HINT, CONTINUITY_CLAIMS)
/// 
/// # Determinism
/// 
/// Same beats + request → same SceneSpecs
pub fn beats_to_scene_specs(
    req: &GenesisRequest,
    beats: &[Beat],
) -> GenesisResult<(Vec<SceneSpec>, Vec<GenesisWarning>)> {
    let mut warnings = Vec::new();

    // Extract defaults from constraints
    let pov = req
        .constraints
        .get("pov")
        .and_then(|v| v.as_str())
        .unwrap_or("third_limited")
        .to_string();

    let tense = req
        .constraints
        .get("tense")
        .and_then(|v| v.as_str())
        .unwrap_or("past")
        .to_string();

    let tone = req
        .target
        .tone_hint
        .clone()
        .or_else(|| {
            req.constraints
                .get("tone")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "dramatic".to_string());

    let length = LengthSpec {
        min: req.target.min_words,
        max: req.target.max_words,
    };

    let mut scene_specs = Vec::with_capacity(beats.len());

    for (i, beat) in beats.iter().enumerate() {
        // Merge canon scope: request scope + beat focus (deduplicated, sorted)
        let mut scope_set = BTreeSet::new();
        for entity in &req.canon_read_scope {
            scope_set.insert(entity.clone());
        }
        for entity in &beat.canon_focus {
            scope_set.insert(entity.clone());
        }
        let canon_read_scope: Vec<String> = scope_set.into_iter().collect();

        let instructions = build_instructions(beat, req, i);

        scene_specs.push(SceneSpec {
            index: i as u32,
            pov: pov.clone(),
            tense: tense.clone(),
            tone: tone.clone(),
            canon_read_scope,
            length: length.clone(),
            instructions,
            beat_kind: beat.kind.as_str().to_string(),
            beat_label: beat.label.clone(),
        });
    }

    // Warning for many scenes
    if scene_specs.len() > 100 {
        warnings.push(
            GenesisWarning::new(
                "GENESIS-W-006",
                "Large number of scenes generated; consider chunking for SCRIBE",
                WarningSeverity::Medium,
            )
            .with_context("scene_count", &scene_specs.len().to_string()),
        );
    }

    Ok((scene_specs, warnings))
}

// ═══════════════════════════════════════════════════════════════════════════════
//   TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::genesis::interfaces::genesis::*;
    use crate::genesis::modules::genesis::beats::generate_beats;
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
                tone_hint: Some("tense".into()),
            },
            constraints: {
                let mut m = BTreeMap::new();
                m.insert("pov".into(), serde_json::Value::String("first_person".into()));
                m.insert("tense".into(), serde_json::Value::String("present".into()));
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
            continuity_claims: vec![
                ContinuityClaim {
                    claim_id: "CC:001".into(),
                    entity_id: "CHAR:VICK".into(),
                    key: "age".into(),
                    expected: serde_json::json!(47),
                    severity: "P0-CRITICAL".into(),
                    note: "Age must be 47".into(),
                },
                ContinuityClaim {
                    claim_id: "CC:002".into(),
                    entity_id: "CHAR:VICK".into(),
                    key: "eye_color".into(),
                    expected: serde_json::json!("blue"),
                    severity: "P1-HIGH".into(),
                    note: "Eyes are blue".into(),
                },
            ],
            metadata: GenesisMetadata {
                schema_version: "GENESIS/1.1.0".into(),
                created_utc: "2026-01-01T00:00:00Z".into(),
                updated_utc: "2026-01-01T00:00:00Z".into(),
            },
        }
    }

    #[test]
    fn scene_specs_count_matches_beats() {
        let req = make_request(5);
        let (beats, _) = generate_beats(&req).unwrap();
        let (specs, _) = beats_to_scene_specs(&req, &beats).unwrap();
        assert_eq!(specs.len(), beats.len());
        assert_eq!(specs.len(), 5);
    }

    #[test]
    fn scene_spec_uses_constraints() {
        let req = make_request(3);
        let (beats, _) = generate_beats(&req).unwrap();
        let (specs, _) = beats_to_scene_specs(&req, &beats).unwrap();
        
        assert_eq!(specs[0].pov, "first_person");
        assert_eq!(specs[0].tense, "present");
        assert_eq!(specs[0].tone, "tense"); // from tone_hint
    }

    #[test]
    fn scene_spec_canon_scope_merged() {
        let req = make_request(3);
        let (beats, _) = generate_beats(&req).unwrap();
        let (specs, _) = beats_to_scene_specs(&req, &beats).unwrap();
        
        // Should contain both CHAR:VICK and LOC:PARIS
        assert!(specs[0].canon_read_scope.contains(&"CHAR:VICK".to_string()));
        assert!(specs[0].canon_read_scope.contains(&"LOC:PARIS".to_string()));
    }

    #[test]
    fn scene_spec_instructions_contain_required() {
        let req = make_request(3);
        let (beats, _) = generate_beats(&req).unwrap();
        let (specs, _) = beats_to_scene_specs(&req, &beats).unwrap();
        
        for spec in &specs {
            assert!(spec.instructions.contains("GOAL:"), "Missing GOAL");
            assert!(spec.instructions.contains("CONFLICT:"), "Missing CONFLICT");
            assert!(spec.instructions.contains("OUTCOME_HINT:"), "Missing OUTCOME_HINT");
            assert!(spec.instructions.contains("CONTINUITY_CLAIMS:"), "Missing CONTINUITY");
        }
    }

    #[test]
    fn scene_spec_length_from_target() {
        let req = make_request(3);
        let (beats, _) = generate_beats(&req).unwrap();
        let (specs, _) = beats_to_scene_specs(&req, &beats).unwrap();
        
        assert_eq!(specs[0].length.min, 800);
        assert_eq!(specs[0].length.max, 1000);
    }

    #[test]
    fn scene_spec_index_sequential() {
        let req = make_request(5);
        let (beats, _) = generate_beats(&req).unwrap();
        let (specs, _) = beats_to_scene_specs(&req, &beats).unwrap();
        
        for (i, spec) in specs.iter().enumerate() {
            assert_eq!(spec.index, i as u32);
        }
    }

    #[test]
    fn continuity_claims_sorted_in_instructions() {
        let req = make_request(3);
        let (beats, _) = generate_beats(&req).unwrap();
        let (specs, _) = beats_to_scene_specs(&req, &beats).unwrap();
        
        // CC:001 should appear before CC:002 (sorted)
        let instr = &specs[0].instructions;
        let pos_001 = instr.find("CC:001").unwrap();
        let pos_002 = instr.find("CC:002").unwrap();
        assert!(pos_001 < pos_002, "Claims should be sorted by claim_id");
    }
}
