pub mod config;
pub mod openai;
pub mod anthropic;

#[cfg(test)]
mod tests;

use std::sync::Arc;
use crate::ai::LLMProvider;
use crate::ai::MockDeterministicProvider;
use crate::error::OmegaError;
use config::{ProviderConfig, ProviderType};

pub fn get_provider(config: &ProviderConfig) -> Result<Arc<dyn LLMProvider>, OmegaError> {
    match config.provider {
        ProviderType::Mock => Ok(Arc::new(MockDeterministicProvider::new())),
        ProviderType::OpenAI => openai::OpenAIProvider::try_new(config).map(|p| Arc::new(p) as Arc<dyn LLMProvider>).or_else(|_| Ok(Arc::new(MockDeterministicProvider::new()))),
        ProviderType::Anthropic => anthropic::AnthropicProvider::try_new(config).map(|p| Arc::new(p) as Arc<dyn LLMProvider>).or_else(|_| Ok(Arc::new(MockDeterministicProvider::new()))),
    }
}

pub fn get_provider_with_fallback(config: &ProviderConfig) -> Arc<dyn LLMProvider> {
    get_provider(config).unwrap_or_else(|_| Arc::new(MockDeterministicProvider::new()))
}
