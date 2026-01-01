//! VOICE_HYBRID Mock Provider
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Provider LLM mock pour les tests (zéro réseau)
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use crate::interfaces::voice_hybrid::contract::LlmProvider;

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider mock qui retourne une réponse fixe
pub struct MockLlmProvider {
    /// Réponse fixe à retourner
    response: String,
    /// Doit-il échouer?
    should_fail: bool,
    /// Message d'erreur si échec
    error_message: String,
}

impl MockLlmProvider {
    /// Crée un mock qui retourne une réponse fixe
    pub fn new(response: &str) -> Self {
        Self {
            response: response.to_string(),
            should_fail: false,
            error_message: String::new(),
        }
    }

    /// Crée un mock qui échoue toujours
    pub fn failing(error_message: &str) -> Self {
        Self {
            response: String::new(),
            should_fail: true,
            error_message: error_message.to_string(),
        }
    }

    /// Crée un mock qui retourne un extrait du prompt (pour tests déterministes)
    pub fn echo() -> Self {
        Self {
            response: "ECHO".to_string(), // Placeholder, sera remplacé
            should_fail: false,
            error_message: String::new(),
        }
    }
}

impl LlmProvider for MockLlmProvider {
    fn name(&self) -> &'static str {
        "mock"
    }

    fn complete(&self, prompt: &str) -> Result<String, String> {
        if self.should_fail {
            return Err(self.error_message.clone());
        }

        // Mode echo: retourne un hash du prompt (déterministe)
        if self.response == "ECHO" {
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(prompt.as_bytes());
            let hash = hex::encode(hasher.finalize());
            return Ok(format!("MOCK_ECHO_{}", &hash[..16]));
        }

        Ok(self.response.clone())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECORDING MOCK PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

use std::sync::{Arc, RwLock};

/// Provider mock qui enregistre tous les appels
pub struct RecordingMockProvider {
    /// Réponse à retourner
    response: String,
    /// Historique des prompts reçus
    calls: Arc<RwLock<Vec<String>>>,
}

impl RecordingMockProvider {
    /// Crée un nouveau provider enregistreur
    pub fn new(response: &str) -> Self {
        Self {
            response: response.to_string(),
            calls: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Retourne le nombre d'appels
    pub fn call_count(&self) -> usize {
        self.calls.read().unwrap().len()
    }

    /// Retourne le dernier prompt reçu
    pub fn last_prompt(&self) -> Option<String> {
        self.calls.read().unwrap().last().cloned()
    }

    /// Retourne tous les prompts
    pub fn all_prompts(&self) -> Vec<String> {
        self.calls.read().unwrap().clone()
    }
}

impl LlmProvider for RecordingMockProvider {
    fn name(&self) -> &'static str {
        "recording-mock"
    }

    fn complete(&self, prompt: &str) -> Result<String, String> {
        self.calls.write().unwrap().push(prompt.to_string());
        Ok(self.response.clone())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mock_provider_returns_fixed() {
        let provider = MockLlmProvider::new("FIXED_RESPONSE");
        let result = provider.complete("any prompt").unwrap();
        assert_eq!(result, "FIXED_RESPONSE");
    }

    #[test]
    fn mock_provider_failing() {
        let provider = MockLlmProvider::failing("NETWORK_ERROR");
        let result = provider.complete("any prompt");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "NETWORK_ERROR");
    }

    #[test]
    fn mock_provider_echo_deterministic() {
        let provider = MockLlmProvider::echo();
        
        let r1 = provider.complete("prompt A").unwrap();
        let r2 = provider.complete("prompt A").unwrap();
        let r3 = provider.complete("prompt B").unwrap();
        
        assert_eq!(r1, r2, "Same prompt = same response");
        assert_ne!(r1, r3, "Different prompt = different response");
        assert!(r1.starts_with("MOCK_ECHO_"));
    }

    #[test]
    fn recording_provider_tracks_calls() {
        let provider = RecordingMockProvider::new("OK");
        
        assert_eq!(provider.call_count(), 0);
        
        provider.complete("First").unwrap();
        provider.complete("Second").unwrap();
        
        assert_eq!(provider.call_count(), 2);
        assert_eq!(provider.last_prompt(), Some("Second".to_string()));
    }

    #[test]
    fn provider_name() {
        let mock = MockLlmProvider::new("test");
        let recording = RecordingMockProvider::new("test");
        
        assert_eq!(mock.name(), "mock");
        assert_eq!(recording.name(), "recording-mock");
    }
}
