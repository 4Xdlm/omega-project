//! OMEGA FallbackProvider — Resilient AI with automatic fallback
//! NASA-Grade: Si provider down → fallback → Mock local (JAMAIS d'échec total)

use crate::ai::interface::LLMProvider;
use crate::ai::models::*;
use crate::ai::mock::MockDeterministicProvider;
use crate::ai::providers::config::{ProviderConfig, ProviderType};
use crate::ai::providers::{get_provider_with_fallback};
use crate::error::OmegaResult;
use std::sync::Arc;
use std::env;

/// Provider résilient avec fallback automatique
/// Ordre: Primary → Secondary → Mock (toujours disponible)
pub struct FallbackProvider {
    primary: Option<Arc<dyn LLMProvider>>,
    secondary: Option<Arc<dyn LLMProvider>>,
    fallback: Arc<dyn LLMProvider>,
    primary_id: String,
    secondary_id: String,
}

impl FallbackProvider {
    /// Crée un FallbackProvider depuis les variables d'environnement
    /// OPENAI_API_KEY → OpenAI primary
    /// ANTHROPIC_API_KEY → Anthropic secondary
    /// Si aucune clé → Mock only (mode déterministe)
    pub fn from_env() -> Self {
        let openai_key = env::var("OPENAI_API_KEY").ok();
        let anthropic_key = env::var("ANTHROPIC_API_KEY").ok();
        
        let mut primary: Option<Arc<dyn LLMProvider>> = None;
        let mut secondary: Option<Arc<dyn LLMProvider>> = None;
        let mut primary_id = "none".to_string();
        let mut secondary_id = "none".to_string();
        
        // Primary: OpenAI si disponible
        if let Some(key) = openai_key {
            if !key.is_empty() {
                let config = ProviderConfig::openai(key);
                let provider = get_provider_with_fallback(&config);
                if provider.id() != "mock-deterministic-v1" {
                    primary = Some(provider);
                    primary_id = "openai".to_string();
                }
            }
        }
        
        // Secondary: Anthropic si disponible
        if let Some(key) = anthropic_key {
            if !key.is_empty() {
                let config = ProviderConfig::anthropic(key);
                let provider = get_provider_with_fallback(&config);
                if provider.id() != "mock-deterministic-v1" {
                    secondary = Some(provider);
                    secondary_id = "anthropic".to_string();
                }
            }
        }
        
        // Fallback: Mock (toujours disponible)
        let fallback: Arc<dyn LLMProvider> = Arc::new(MockDeterministicProvider::default());
        
        Self {
            primary,
            secondary,
            fallback,
            primary_id,
            secondary_id,
        }
    }
    
    /// Crée un FallbackProvider avec providers explicites
    pub fn new(
        primary: Option<Arc<dyn LLMProvider>>,
        secondary: Option<Arc<dyn LLMProvider>>,
    ) -> Self {
        let primary_id = primary.as_ref().map(|p| p.id()).unwrap_or_else(|| "none".into());
        let secondary_id = secondary.as_ref().map(|p| p.id()).unwrap_or_else(|| "none".into());
        
        Self {
            primary,
            secondary,
            fallback: Arc::new(MockDeterministicProvider::default()),
            primary_id,
            secondary_id,
        }
    }
    
    /// Retourne l'ID du provider qui sera utilisé
    pub fn active_provider_id(&self) -> String {
        if self.primary.is_some() {
            self.primary_id.clone()
        } else if self.secondary.is_some() {
            self.secondary_id.clone()
        } else {
            "mock-fallback".into()
        }
    }
    
    /// Vérifie si on est en mode réel (avec API) ou mock
    pub fn is_real_ai(&self) -> bool {
        self.primary.is_some() || self.secondary.is_some()
    }
}

impl LLMProvider for FallbackProvider {
    fn id(&self) -> ProviderId {
        format!("fallback[{}->{}->mock]", self.primary_id, self.secondary_id)
    }
    
    fn capabilities(&self) -> ProviderCapabilities {
        if let Some(ref p) = self.primary {
            return p.capabilities();
        }
        if let Some(ref s) = self.secondary {
            return s.capabilities();
        }
        self.fallback.capabilities()
    }
    
    fn health(&self) -> bool {
        if let Some(ref p) = self.primary {
            if p.health() { return true; }
        }
        if let Some(ref s) = self.secondary {
            if s.health() { return true; }
        }
        self.fallback.health()
    }
    
    fn generate(&self, req: CompletionRequest) -> OmegaResult<CompletionResponse> {
        // Essayer Primary
        if let Some(ref primary) = self.primary {
            match primary.generate(req.clone()) {
                Ok(resp) => return Ok(resp),
                Err(e) => {
                    eprintln!("[FALLBACK] Primary ({}) failed: {}", self.primary_id, e);
                }
            }
        }
        
        // Essayer Secondary
        if let Some(ref secondary) = self.secondary {
            match secondary.generate(req.clone()) {
                Ok(resp) => return Ok(resp),
                Err(e) => {
                    eprintln!("[FALLBACK] Secondary ({}) failed: {}", self.secondary_id, e);
                }
            }
        }
        
        // Fallback sur Mock (toujours réussit)
        eprintln!("[FALLBACK] Using mock provider (deterministic mode)");
        self.fallback.generate(req)
    }
    
    fn embed(&self, req: EmbeddingRequest) -> OmegaResult<EmbeddingResponse> {
        if let Some(ref primary) = self.primary {
            if let Ok(resp) = primary.embed(req.clone()) {
                return Ok(resp);
            }
        }
        if let Some(ref secondary) = self.secondary {
            if let Ok(resp) = secondary.embed(req.clone()) {
                return Ok(resp);
            }
        }
        self.fallback.embed(req)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_fallback_no_keys() {
        let provider = FallbackProvider::new(None, None);
        assert!(!provider.is_real_ai());
        assert_eq!(provider.active_provider_id(), "mock-fallback");
    }
    
    #[test]
    fn test_fallback_always_succeeds() {
        let provider = FallbackProvider::new(None, None);
        
        let req = CompletionRequest {
            run_id: "test".into(),
            seed: 42,
            system_prompt: "Test".into(),
            user_prompt: "Test".into(),
            temperature: 0.0,
            max_tokens: 100,
            schema_name: None,
            json_schema: None,
            constraints: Default::default(),
        };
        
        let result = provider.generate(req);
        assert!(result.is_ok(), "Fallback should ALWAYS succeed");
    }
}
