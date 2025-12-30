use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type ProviderId = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    pub id: ProviderId,
    pub max_context_window: u32,
    pub supports_json_mode: bool,
    pub supports_streaming: bool,
    pub supports_tool_calling: bool,
    pub supports_embeddings: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionRequest {
    pub run_id: String,
    pub seed: u64,
    pub system_prompt: String,
    pub user_prompt: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub schema_name: Option<String>,
    pub json_schema: Option<serde_json::Value>,
    #[serde(default)]
    pub constraints: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub provider_id: ProviderId,
    pub content: String,
    pub parsed: Option<serde_json::Value>,
    pub usage: Usage,
    pub latency_ms: u64,
    pub response_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    pub run_id: String,
    pub seed: u64,
    pub input: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    pub provider_id: ProviderId,
    pub vectors: Vec<f32>,
}
