use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProviderType { Mock, OpenAI, Anthropic }

impl Default for ProviderType { fn default() -> Self { ProviderType::Mock } }

impl std::fmt::Display for ProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderType::Mock => write!(f, "mock"),
            ProviderType::OpenAI => write!(f, "openai"),
            ProviderType::Anthropic => write!(f, "anthropic"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider: ProviderType,
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub endpoint: Option<String>,
    pub timeout_ms: u64,
    pub max_retries: u32,
    pub temperature: f32,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self { provider: ProviderType::Mock, api_key: None, model: None, endpoint: None, timeout_ms: 30000, max_retries: 3, temperature: 0.7 }
    }
}

impl ProviderConfig {
    pub fn from_env() -> Self {
        let provider = match env::var("OMEGA_PROVIDER").unwrap_or_default().to_lowercase().as_str() {
            "openai" => ProviderType::OpenAI, "anthropic" => ProviderType::Anthropic, _ => ProviderType::Mock,
        };
        let api_key = match provider {
            ProviderType::OpenAI => env::var("OPENAI_API_KEY").ok(),
            ProviderType::Anthropic => env::var("ANTHROPIC_API_KEY").ok(),
            ProviderType::Mock => None,
        };
        Self { provider, api_key, timeout_ms: env::var("OMEGA_TIMEOUT_MS").ok().and_then(|s| s.parse().ok()).unwrap_or(30000), ..Default::default() }
    }
    pub fn openai(api_key: String) -> Self { Self { provider: ProviderType::OpenAI, api_key: Some(api_key), model: Some("gpt-4".into()), endpoint: Some("https://api.openai.com/v1/chat/completions".into()), ..Default::default() } }
    pub fn anthropic(api_key: String) -> Self { Self { provider: ProviderType::Anthropic, api_key: Some(api_key), model: Some("claude-3-5-sonnet-20241022".into()), endpoint: Some("https://api.anthropic.com/v1/messages".into()), ..Default::default() } }
    pub fn mock() -> Self { Self { provider: ProviderType::Mock, temperature: 0.0, ..Default::default() } }
    pub fn validate(&self) -> Result<(), String> {
        match self.provider {
            ProviderType::Mock => Ok(()),
            _ => if self.api_key.as_ref().map(|k| k.is_empty()).unwrap_or(true) { Err(format!("{} requires API key", self.provider)) } else { Ok(()) }
        }
    }
}
