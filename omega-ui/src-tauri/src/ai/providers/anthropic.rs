use crate::ai::models::*;
use crate::error::{OmegaError, OmegaResult};
use super::config::ProviderConfig;
use sha2::{Sha256, Digest};
use std::time::{Duration, Instant};

pub struct AnthropicProvider { api_key: String, model: String, endpoint: String, timeout: Duration, max_retries: u32 }

impl AnthropicProvider {
    pub fn try_new(config: &ProviderConfig) -> Result<Self, OmegaError> {
        let api_key = config.api_key.clone().ok_or_else(|| OmegaError::ProviderError("ANTHROPIC_MISSING_KEY".into()))?;
        if api_key.is_empty() { return Err(OmegaError::ProviderError("ANTHROPIC_EMPTY_KEY".into())); }
        Ok(Self { api_key, model: config.model.clone().unwrap_or_else(|| "claude-3-5-sonnet-20241022".into()), endpoint: config.endpoint.clone().unwrap_or_else(|| "https://api.anthropic.com/v1/messages".into()), timeout: Duration::from_millis(config.timeout_ms), max_retries: config.max_retries })
    }
    fn build_body(&self, req: &CompletionRequest) -> serde_json::Value {
        serde_json::json!({"model": self.model, "max_tokens": req.max_tokens, "system": req.system_prompt, "messages": [{"role": "user", "content": req.user_prompt}]})
    }
    fn execute(&self, body: serde_json::Value) -> Result<serde_json::Value, OmegaError> {
        let client = reqwest::blocking::Client::builder().timeout(self.timeout).build().map_err(|e| OmegaError::ProviderError(format!("CLIENT_ERR: {}", e)))?;
        for attempt in 0..=self.max_retries {
            if attempt > 0 { std::thread::sleep(Duration::from_millis(1000 * 2u64.pow(attempt - 1))); }
            match client.post(&self.endpoint).header("x-api-key", &self.api_key).header("anthropic-version", "2023-06-01").header("Content-Type", "application/json").json(&body).send() {
                Ok(resp) if resp.status().is_success() => return resp.json().map_err(|e| OmegaError::InvalidResponse(e.to_string())),
                Ok(resp) if resp.status().as_u16() == 429 => continue,
                Ok(resp) => return Err(OmegaError::ProviderError(format!("HTTP_{}: {}", resp.status().as_u16(), resp.text().unwrap_or_default()))),
                Err(e) if e.is_timeout() => continue,
                Err(e) => return Err(OmegaError::ProviderError(format!("NETWORK: {}", e))),
            }
        }
        Err(OmegaError::ProviderError("MAX_RETRIES_EXCEEDED".into()))
    }
    fn parse(&self, json: serde_json::Value, req: &CompletionRequest, latency: u64) -> OmegaResult<CompletionResponse> {
        let content = json["content"][0]["text"].as_str().ok_or_else(|| OmegaError::InvalidResponse("NO_CONTENT".into()))?.to_string();
        let u = &json["usage"];
        let pt = u["input_tokens"].as_u64().unwrap_or(0) as u32;
        let ct = u["output_tokens"].as_u64().unwrap_or(0) as u32;
        Ok(CompletionResponse { provider_id: "anthropic".into(), content: content.clone(), response_hash: format!("{:x}", Sha256::digest(format!("anthropic|{}|{}", req.seed, content).as_bytes())), usage: Usage { prompt_tokens: pt, completion_tokens: ct, total_tokens: pt + ct }, parsed: req.json_schema.as_ref().and_then(|_| serde_json::from_str(&content).ok()), latency_ms: latency })
    }
}

impl crate::ai::LLMProvider for AnthropicProvider {
    fn id(&self) -> ProviderId { "anthropic".into() }
    fn capabilities(&self) -> ProviderCapabilities { ProviderCapabilities { id: "anthropic".into(), max_context_window: 200000, supports_json_mode: true, supports_streaming: true, supports_tool_calling: true, supports_embeddings: false } }
    fn generate(&self, req: CompletionRequest) -> OmegaResult<CompletionResponse> { let start = Instant::now(); let json = self.execute(self.build_body(&req))?; self.parse(json, &req, start.elapsed().as_millis() as u64) }
    fn embed(&self, _req: EmbeddingRequest) -> OmegaResult<EmbeddingResponse> { Err(OmegaError::NotSupported("Embeddings not implemented".into())) }
    fn health(&self) -> bool { true }
}
