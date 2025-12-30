//! OMEGA Pipeline Types — Run, Pass, Artifacts, Proofs
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub type PassId = String;
pub type ArtifactKey = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassProof {
    pub pass_id: PassId,
    pub input_hash: String,
    pub output_hash: String,
    pub chain_hash: String,
    pub prev_hash: String,
    pub timestamp_iso: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassResult {
    pub pass_id: PassId,
    pub success: bool,
    pub artifacts: BTreeMap<ArtifactKey, serde_json::Value>,
    pub proof: PassProof,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineContext {
    pub run_id: String,
    pub timestamp_utc: i64,
    pub seed: u64,
    pub provider_id: String,
    pub input_raw: String,
    pub input_hash: String,
    pub artifacts: BTreeMap<ArtifactKey, serde_json::Value>,
    pub pass_results: Vec<PassResult>,
    pub audit_flags: Vec<String>,
    pub success: bool,
    pub global_hash: String,
}

impl PipelineContext {
    pub fn new(run_id: String, seed: u64, provider_id: String, input: String, input_hash: String) -> Self {
        Self {
            run_id,
            timestamp_utc: chrono::Utc::now().timestamp(),
            seed,
            provider_id,
            input_raw: input,
            input_hash,
            artifacts: BTreeMap::new(),
            pass_results: Vec::new(),
            audit_flags: Vec::new(),
            success: true,
            global_hash: String::new(),
        }
    }
    
    pub fn last_chain_hash(&self) -> String {
        self.pass_results.last()
            .map(|r| r.proof.chain_hash.clone())
            .unwrap_or_else(|| "GENESIS_HASH".to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineRun {
    pub schema: String,
    pub run_id: String,
    pub seed: u64,
    pub provider_id: String,
    pub input_hash: String,
    pub passes: Vec<PassResult>,
    pub global_hash: String,
    pub success: bool,
    pub timestamp_iso: String,
}
