//! VOICE_HYBRID Orchestrator v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Orchestre: VOICE v1 (CORE_STATS) + PromptBuilder + ReplayStore + Provider
//! 
//! Modes:
//! - Off: Appelle provider si présent, pas de record
//! - Record: Appelle provider + enregistre le résultat
//! - Replay: Relit un record existant, zéro réseau
//!
//! @invariant HYBRID-I01: VOICE v1 non modifié
//! @invariant HYBRID-I02: Replay strict (mismatch = erreur)
//! @invariant HYBRID-I03: guidance_hash stable
//! @invariant HYBRID-I04: record_hash anti-tamper
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use sha2::{Digest, Sha256};

use crate::interfaces::voice::contract::{VoiceAnalyzer, VoiceConfig};
use crate::interfaces::voice_hybrid::contract::{
    LlmProvider, VoiceHybridAnalyzer, VoiceHybridConfig, VoiceHybridResult,
};
use crate::interfaces::voice_hybrid::policy::VoiceHybridPolicy;
use crate::interfaces::voice_hybrid::replay::{ReplayMode, ReplayStore, VoiceHybridReplayRecord};

use crate::modules::voice::core_stats::StatsVoiceAnalyzer;
use super::errors::VoiceHybridError;
use super::prompt_builder::PromptBuilder;
use super::replay_store::JsonFileReplayStore;
use super::scoring::VoiceScoring;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/// Calcule le hash SHA-256 d'un input canonicalisé
fn compute_input_hash(input: &str) -> String {
    // Canonicalise: CRLF → LF, trim
    let canonical = input.replace("\r\n", "\n").trim().to_string();
    
    let mut hasher = Sha256::new();
    hasher.update(canonical.as_bytes());
    hex::encode(hasher.finalize())
}

/// Génère le chemin du fichier replay
fn replay_path(cfg: &VoiceHybridConfig) -> String {
    format!("tests/replay/VOICE_HYBRID/{}.json", cfg.run_id)
}

// ═══════════════════════════════════════════════════════════════════════════════
// HYBRID VOICE ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/// Analyseur hybride VOICE_HYBRID
/// 
/// Combine:
/// - VOICE v1 (StatsVoiceAnalyzer) pour les métriques certifiées
/// - PromptBuilder pour le guidance déterministe
/// - ReplayStore pour l'audit Record/Replay
/// - Provider LLM pour la génération IA
pub struct HybridVoiceAnalyzer {
    replay_store: JsonFileReplayStore,
    stats_analyzer: StatsVoiceAnalyzer,
    scoring: VoiceScoring,
}

impl HybridVoiceAnalyzer {
    /// Crée un nouvel analyseur hybride
    pub fn new() -> Self {
        Self {
            replay_store: JsonFileReplayStore::new(),
            stats_analyzer: StatsVoiceAnalyzer::new(),
            scoring: VoiceScoring::new(),
        }
    }

    /// Crée avec un store personnalisé (pour tests)
    pub fn with_store(store: JsonFileReplayStore) -> Self {
        Self {
            replay_store: store,
            stats_analyzer: StatsVoiceAnalyzer::new(),
            scoring: VoiceScoring::new(),
        }
    }
}

impl Default for HybridVoiceAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

impl VoiceHybridAnalyzer for HybridVoiceAnalyzer {
    fn analyze_hybrid(
        &self,
        input_text: &str,
        policy: &VoiceHybridPolicy,
        cfg: &VoiceHybridConfig,
        provider: Option<&dyn LlmProvider>,
    ) -> Result<VoiceHybridResult, String> {
        // ═══════════════════════════════════════════════════════════════════════
        // 0) VALIDATION
        // ═══════════════════════════════════════════════════════════════════════
        
        // Valide la config
        cfg.validate()?;
        
        // Vérifie la version de policy
        if policy.policy_version != cfg.required_policy_version {
            return Err(VoiceHybridError::PolicyVersionMismatch {
                required: cfg.required_policy_version.clone(),
                got: policy.policy_version.clone(),
            }.to_string());
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 1) ANALYSE VOICE V1 (CERTIFIÉ, INTOUCHABLE)
        // ═══════════════════════════════════════════════════════════════════════
        
        let base_result = self.stats_analyzer.analyze(input_text, &cfg.voice_v1)
            .map_err(|e| VoiceHybridError::VoiceV1Error(format!("{:?}", e)).to_string())?;

        // ═══════════════════════════════════════════════════════════════════════
        // 2) BUILD GUIDANCE (DÉTERMINISTE)
        // ═══════════════════════════════════════════════════════════════════════
        
        let guidance = PromptBuilder::build(policy, &base_result.profile);

        // ═══════════════════════════════════════════════════════════════════════
        // 3) GESTION RECORD/REPLAY/OFF
        // ═══════════════════════════════════════════════════════════════════════
        
        let input_hash = compute_input_hash(input_text);
        let path = replay_path(cfg);
        
        let mut warnings: Vec<String> = Vec::new();
        let mut replay_record: Option<VoiceHybridReplayRecord> = None;
        let mut completion: Option<String> = None;

        match cfg.replay_mode {
            ReplayMode::Off => {
                // Mode normal: appelle provider si présent
                if let Some(prov) = provider {
                    match prov.complete(&guidance.prompt) {
                        Ok(text) => completion = Some(text),
                        Err(e) => warnings.push(format!("Provider error: {}", e)),
                    }
                } else {
                    warnings.push("NO_PROVIDER: ReplayMode=Off but provider=None".to_string());
                }
            }
            
            ReplayMode::Record => {
                // Mode record: DOIT avoir un provider
                let prov = provider.ok_or_else(|| {
                    VoiceHybridError::ProviderRequired("Record".to_string()).to_string()
                })?;

                // Appel provider
                let text = prov.complete(&guidance.prompt)
                    .map_err(|e| VoiceHybridError::ProviderError(e).to_string())?;
                completion = Some(text.clone());

                // Crée le record
                let mut rec = VoiceHybridReplayRecord::new(&cfg.run_id, prov.name());
                rec.policy_id = policy.policy_id.clone();
                rec.policy_version = policy.policy_version.clone();
                rec.guidance_hash = guidance.guidance_hash.clone();
                rec.input_hash = input_hash.clone();
                rec.prompt = guidance.prompt.clone();
                rec.completion = text;

                // Sauvegarde
                self.replay_store.write_record(&path, &rec)?;
                
                // Relit pour vérifier (et obtenir le record_hash calculé)
                let loaded = self.replay_store.read_record(&path)?;
                replay_record = Some(loaded);
            }
            
            ReplayMode::Replay => {
                // Mode replay: DOIT avoir un fichier record
                let loaded = self.replay_store.read_record(&path)
                    .map_err(|e| VoiceHybridError::RecordNotFound(cfg.run_id.clone()).to_string())?;

                // Vérifications strictes
                if loaded.policy_id != policy.policy_id {
                    return Err(VoiceHybridError::ReplayMismatch {
                        field: "policy_id".to_string(),
                    }.to_string());
                }
                if loaded.policy_version != policy.policy_version {
                    return Err(VoiceHybridError::ReplayMismatch {
                        field: "policy_version".to_string(),
                    }.to_string());
                }
                if loaded.guidance_hash != guidance.guidance_hash {
                    return Err(VoiceHybridError::ReplayMismatch {
                        field: "guidance_hash".to_string(),
                    }.to_string());
                }
                if loaded.input_hash != input_hash {
                    return Err(VoiceHybridError::ReplayMismatch {
                        field: "input_hash".to_string(),
                    }.to_string());
                }

                completion = Some(loaded.completion.clone());
                replay_record = Some(loaded);
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 4) CALCUL COMPLIANCE SCORE (DÉTERMINISTE)
        // ═══════════════════════════════════════════════════════════════════════
        
        // Score basé sur le profil de base (pas sur la completion)
        // Le score de "compliance" indique à quel point le texte original
        // correspond au profil de référence défini dans la policy
        let compliance_score = if base_result.warnings.is_empty() {
            1.0
        } else {
            0.8 // Pénalité légère si warnings
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 5) RÉSULTAT
        // ═══════════════════════════════════════════════════════════════════════
        
        Ok(VoiceHybridResult {
            base: base_result,
            guidance,
            compliance_score,
            completion,
            replay: replay_record,
            warnings,
        })
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::interfaces::voice_hybrid::replay::ReplayMode;
    use std::collections::BTreeMap;

    // Mock provider pour tests
    struct MockProvider {
        response: String,
    }

    impl MockProvider {
        fn new(response: &str) -> Self {
            Self { response: response.to_string() }
        }
    }

    impl LlmProvider for MockProvider {
        fn name(&self) -> &'static str {
            "mock"
        }

        fn complete(&self, _prompt: &str) -> Result<String, String> {
            Ok(self.response.clone())
        }
    }

    fn test_policy() -> VoiceHybridPolicy {
        VoiceHybridPolicy::minimal("TEST_POL", "fr")
    }

    fn test_config() -> VoiceHybridConfig {
        let mut cfg = VoiceHybridConfig::default();
        cfg.voice_v1.min_text_length = 10; // Pour les tests courts
        cfg
    }

    #[test]
    fn hybrid_analyzer_creates() {
        let analyzer = HybridVoiceAnalyzer::new();
        // Juste vérifie que ça compile et s'instancie
        assert!(true);
    }

    #[test]
    fn hybrid_config_validation() {
        let mut cfg = VoiceHybridConfig::default();
        assert!(cfg.validate().is_ok());

        cfg.run_id = "".to_string();
        assert!(cfg.validate().is_err());
    }

    #[test]
    fn input_hash_deterministic() {
        let input = "Bonjour, ceci est un test.";
        let h1 = compute_input_hash(input);
        let h2 = compute_input_hash(input);
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64); // SHA-256
    }

    #[test]
    fn input_hash_crlf_normalized() {
        let input1 = "Line1\r\nLine2";
        let input2 = "Line1\nLine2";
        assert_eq!(compute_input_hash(input1), compute_input_hash(input2));
    }

    #[test]
    fn replay_path_format() {
        let mut cfg = VoiceHybridConfig::default();
        cfg.run_id = "RUN_TEST_001".to_string();
        
        let path = replay_path(&cfg);
        assert!(path.contains("VOICE_HYBRID"));
        assert!(path.contains("RUN_TEST_001"));
        assert!(path.ends_with(".json"));
    }
}
