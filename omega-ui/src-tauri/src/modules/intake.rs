//! OMEGA Intake Pass — Input Normalization
use crate::pipeline::types::*;
use crate::pipeline::fs_utils::*;
use crate::error::OmegaResult;
use std::collections::BTreeMap;
use chrono::Utc;

pub struct IntakePass;

impl IntakePass {
    pub fn execute(ctx: &mut PipelineContext) -> OmegaResult<PassResult> {
        let start = std::time::Instant::now();
        let prev_hash = ctx.last_chain_hash();
        
        // Normalize input (trim, normalize unicode)
        let normalized = ctx.input_raw.trim().to_string();
        let normalized_hash = sha256_str(&normalized);
        
        // Store artifacts
        let mut artifacts = BTreeMap::new();
        artifacts.insert("normalized_input".into(), serde_json::json!(normalized));
        artifacts.insert("char_count".into(), serde_json::json!(normalized.chars().count()));
        artifacts.insert("word_count".into(), serde_json::json!(normalized.split_whitespace().count()));
        
        ctx.artifacts.extend(artifacts.clone());
        
        let output_hash = sha256_str(&serde_json::to_string(&artifacts).unwrap_or_default());
        let chain_hash = compute_chain_hash("INTAKE", &prev_hash, &ctx.input_hash, &output_hash);
        
        let proof = PassProof {
            pass_id: "INTAKE".into(),
            input_hash: ctx.input_hash.clone(),
            output_hash,
            chain_hash,
            prev_hash,
            timestamp_iso: Utc::now().to_rfc3339(),
            duration_ms: start.elapsed().as_millis() as u64,
        };
        
        Ok(PassResult {
            pass_id: "INTAKE".into(),
            success: true,
            artifacts,
            proof,
            error: None,
        })
    }
}
