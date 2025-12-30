use crate::ai::interface::LLMProvider;
use crate::ai::models::*;
use crate::error::{OmegaError, OmegaResult};
use sha2::{Digest, Sha256};
use std::time::{Duration, Instant};
use std::thread;

#[derive(Clone)]
pub struct MockDeterministicProvider {
    pub provider_id: ProviderId,
    pub latency_ms: u64,
}

impl Default for MockDeterministicProvider {
    fn default() -> Self {
        Self { provider_id: "mock-deterministic-v1".into(), latency_ms: 10 }
    }
}

impl MockDeterministicProvider {
    pub fn new() -> Self { Self::default() }
}

fn sha256_hex(data: &[u8]) -> String {
    format!("{:x}", Sha256::digest(data))
}

fn fingerprint(req: &CompletionRequest) -> String {
    format!("seed={}|sys={}|user={}", req.seed, req.system_prompt, req.user_prompt)
}

impl LLMProvider for MockDeterministicProvider {
    fn id(&self) -> ProviderId { self.provider_id.clone() }
    
    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            id: self.provider_id.clone(),
            max_context_window: 128_000,
            supports_json_mode: true,
            supports_streaming: false,
            supports_tool_calling: false,
            supports_embeddings: true,
        }
    }
    
    fn health(&self) -> bool { true }
    
    fn embed(&self, req: EmbeddingRequest) -> OmegaResult<EmbeddingResponse> {
        let hash = sha256_hex(format!("{}|{}", req.seed, req.input).as_bytes());
        let v: Vec<f32> = (0..16).map(|i| (u32::from_str_radix(&hash[i*2..i*2+2], 16).unwrap_or(0) as f32) / 255.0).collect();
        Ok(EmbeddingResponse { provider_id: self.provider_id.clone(), vectors: v })
    }
    
    fn generate(&self, req: CompletionRequest) -> OmegaResult<CompletionResponse> {
        let start = Instant::now();
        if req.temperature != 0.0 {
            return Err(OmegaError::ProviderError("temperature must be 0.0".into()));
        }
        thread::sleep(Duration::from_millis(self.latency_ms));
        
        let fp = fingerprint(&req);
        let hash = sha256_hex(format!("{}|{}", req.seed, fp).as_bytes());
        let short = &hash[0..12];
        
        let (content, parsed) = if req.json_schema.is_some() {
            let j = serde_json::json!({"mock": true, "hash": short});
            (j.to_string(), Some(j))
        } else {
            (format!("[MOCK] seed={} hash={}", req.seed, short), None)
        };
        
        let response_hash = sha256_hex(format!("{}|{}|{}", req.seed, fp, content).as_bytes());
        
        Ok(CompletionResponse {
            provider_id: self.provider_id.clone(),
            content,
            parsed,
            usage: Usage { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            latency_ms: start.elapsed().as_millis() as u64,
            response_hash,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_determinism_same_seed() {
        let provider = MockDeterministicProvider::new();
        let req = CompletionRequest {
            run_id: "test".into(),
            seed: 42,
            system_prompt: "System".into(),
            user_prompt: "User".into(),
            temperature: 0.0,
            max_tokens: 100,
            schema_name: None,
            json_schema: None,
            constraints: Default::default(),
        };
        
        let r1 = provider.generate(req.clone()).unwrap();
        let r2 = provider.generate(req.clone()).unwrap();
        
        assert_eq!(r1.response_hash, r2.response_hash, "DETERMINISM VIOLATED!");
        assert_eq!(r1.content, r2.content, "Content mismatch!");
        println!("[PASS] Same seed = same hash: {}", r1.response_hash);
    }
    
    #[test]
    fn test_determinism_different_seeds() {
        let provider = MockDeterministicProvider::new();
        let req1 = CompletionRequest {
            run_id: "test".into(),
            seed: 42,
            system_prompt: "System".into(),
            user_prompt: "User".into(),
            temperature: 0.0,
            max_tokens: 100,
            schema_name: None,
            json_schema: None,
            constraints: Default::default(),
        };
        let mut req2 = req1.clone();
        req2.seed = 99;
        
        let r1 = provider.generate(req1).unwrap();
        let r2 = provider.generate(req2).unwrap();
        
        assert_ne!(r1.response_hash, r2.response_hash, "Different seeds should produce different hashes!");
        println!("[PASS] seed=42: {} | seed=99: {}", r1.response_hash, r2.response_hash);
    }
    
    #[test]
    fn test_temperature_guard() {
        let provider = MockDeterministicProvider::new();
        let req = CompletionRequest {
            run_id: "test".into(),
            seed: 42,
            system_prompt: "System".into(),
            user_prompt: "User".into(),
            temperature: 0.7, // NON-ZERO = ERROR
            max_tokens: 100,
            schema_name: None,
            json_schema: None,
            constraints: Default::default(),
        };
        
        let result = provider.generate(req);
        assert!(result.is_err(), "Should fail with non-zero temperature!");
        println!("[PASS] Temperature guard works!");
    }
}
