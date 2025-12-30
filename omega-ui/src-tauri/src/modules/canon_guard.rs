//! OMEGA Canon Guard Pass — Invariant Validation (Fail-Fast)
use crate::pipeline::types::*;
use crate::pipeline::fs_utils::*;
use crate::error::{OmegaError, OmegaResult};
use std::collections::BTreeMap;
use chrono::Utc;

pub struct CanonGuardPass;

#[derive(Debug)]
pub struct CanonRule {
    pub id: &'static str,
    pub description: &'static str,
    pub check: fn(&PipelineContext) -> bool,
}

fn rule_input_not_empty(ctx: &PipelineContext) -> bool {
    !ctx.input_raw.trim().is_empty()
}

fn rule_input_max_length(ctx: &PipelineContext) -> bool {
    ctx.input_raw.len() <= 1_000_000 // 1MB max
}

fn rule_seed_valid(ctx: &PipelineContext) -> bool {
    ctx.seed > 0
}

pub fn get_canon_rules() -> Vec<CanonRule> {
    vec![
        CanonRule { id: "CANON-001", description: "Input must not be empty", check: rule_input_not_empty },
        CanonRule { id: "CANON-002", description: "Input must be under 1MB", check: rule_input_max_length },
        CanonRule { id: "CANON-003", description: "Seed must be > 0", check: rule_seed_valid },
    ]
}

impl CanonGuardPass {
    pub fn execute(ctx: &mut PipelineContext) -> OmegaResult<PassResult> {
        let start = std::time::Instant::now();
        let prev_hash = ctx.last_chain_hash();
        let input_hash = sha256_str("canon_guard_input");
        
        let rules = get_canon_rules();
        let mut violations: Vec<String> = Vec::new();
        let mut passed: Vec<String> = Vec::new();
        
        for rule in &rules {
            if (rule.check)(ctx) {
                passed.push(rule.id.to_string());
            } else {
                violations.push(format!("{}: {}", rule.id, rule.description));
            }
        }
        
        let mut artifacts = BTreeMap::new();
        artifacts.insert("rules_checked".into(), serde_json::json!(rules.len()));
        artifacts.insert("rules_passed".into(), serde_json::json!(passed));
        artifacts.insert("violations".into(), serde_json::json!(violations.clone()));
        
        ctx.artifacts.extend(artifacts.clone());
        
        let output_hash = sha256_str(&serde_json::to_string(&artifacts).unwrap_or_default());
        let chain_hash = compute_chain_hash("CANON_GUARD", &prev_hash, &input_hash, &output_hash);
        
        let proof = PassProof {
            pass_id: "CANON_GUARD".into(),
            input_hash,
            output_hash,
            chain_hash,
            prev_hash,
            timestamp_iso: Utc::now().to_rfc3339(),
            duration_ms: start.elapsed().as_millis() as u64,
        };
        
        if !violations.is_empty() {
            ctx.success = false;
            ctx.audit_flags.push("CANON_VIOLATION".into());
            return Err(OmegaError::CanonFail(violations.join("; ")));
        }
        
        Ok(PassResult {
            pass_id: "CANON_GUARD".into(),
            success: true,
            artifacts,
            proof,
            error: None,
        })
    }
}
