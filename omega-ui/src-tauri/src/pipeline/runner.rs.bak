//! OMEGA Pipeline Runner — Orchestrator
use crate::ai::LLMProvider;
use crate::pipeline::types::*;
use crate::pipeline::fs_utils::*;
use crate::error::OmegaResult;
use std::sync::Arc;

pub struct PipelineRunner {
    pub provider: Arc<dyn LLMProvider>,
}

impl PipelineRunner {
    pub fn new(provider: Arc<dyn LLMProvider>) -> Self {
        Self { provider }
    }
    
    pub fn run(&self, input: &str, seed: u64) -> OmegaResult<PipelineRun> {
        let run_id = format!("RUN_{}_{}", chrono::Utc::now().format("%Y%m%d_%H%M%S"), seed);
        let input_hash = sha256_str(input);
        
        let mut ctx = PipelineContext::new(
            run_id.clone(),
            seed,
            self.provider.id(),
            input.to_string(),
            input_hash.clone(),
        );
        
        // For now, just compute global hash from input
        ctx.global_hash = sha256_str(&format!("{}|{}|{}", seed, input_hash, ctx.provider_id));
        
        Ok(PipelineRun {
            schema: "OMEGA_RUN_V1".to_string(),
            run_id,
            seed,
            provider_id: ctx.provider_id,
            input_hash,
            passes: ctx.pass_results,
            global_hash: ctx.global_hash,
            success: ctx.success,
            timestamp_iso: chrono::Utc::now().to_rfc3339(),
        })
    }
}
