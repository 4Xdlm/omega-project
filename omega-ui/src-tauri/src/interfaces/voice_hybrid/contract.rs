//! VOICE_HYBRID Contract v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Règle d'or: VOICE v1 (CORE_STATS) est la base immuable.
//! VOICE_HYBRID orchestre: policy + provider + record/replay.
//! 
//! @invariant HYBRID-I01: CORE_STATS unmodified (same metrics as v1.0.0)
//! @invariant HYBRID-I02: Clear separation (output distinguishes stats/AI)
//! @invariant HYBRID-I03: Graceful degradation (AI down → stats only)
//! @invariant HYBRID-I04: No corruption (certified data intact)
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use serde::{Deserialize, Serialize};

use super::policy::VoiceHybridPolicy;
use super::replay::{ReplayMode, VoiceHybridReplayRecord};

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS FROM VOICE V1 (CERTIFIED - INTOUCHABLE)
// ═══════════════════════════════════════════════════════════════════════════════

// Types VOICE v1 certifiés - on les ré-exporte pour usage dans VOICE_HYBRID
pub use crate::interfaces::voice::contract::{
    VoiceConfig,
    VoiceAnalysisResult,
    VoiceProfile,
    VoiceMetric,
    VoiceDimension,
    VoiceLock,
    VoiceMode,
    VoiceAiPolicy,
    VoiceTolerances,
    VoiceAnalyzer,
};

pub use crate::interfaces::voice::errors::VoiceError;

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE_HYBRID CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Configuration pour une analyse VOICE_HYBRID
/// 
/// HYBRID-CFG-01: Toute config doit spécifier un run_id unique pour traçabilité
/// HYBRID-CFG-02: deterministic=true obligatoire pour audit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceHybridConfig {
    /// Mode déterministe (doit rester true pour audit/replay)
    pub deterministic: bool,

    /// Config VOICE v1 (CORE_STATS) - passée telle quelle à l'analyseur v1
    pub voice_v1: VoiceConfig,

    /// Mode record/replay
    pub replay_mode: ReplayMode,

    /// Identifiant du run (ex: RUN0001) — stable, audit-friendly
    /// Format: RUN_[A-Z0-9]{8} recommandé
    pub run_id: String,

    /// Version de policy attendue (ex: "2.0.0")
    pub required_policy_version: String,

    /// Active l'écriture CANON (sinon lecture seule)
    pub canon_write_enabled: bool,
}

impl Default for VoiceHybridConfig {
    fn default() -> Self {
        Self {
            deterministic: true,
            voice_v1: VoiceConfig::default(),
            replay_mode: ReplayMode::Off,
            run_id: "RUN_DEFAULT".to_string(),
            required_policy_version: "2.0.0".to_string(),
            canon_write_enabled: false,
        }
    }
}

impl VoiceHybridConfig {
    /// Valide la config
    pub fn validate(&self) -> Result<(), String> {
        if self.run_id.trim().is_empty() {
            return Err("run_id cannot be empty".to_string());
        }
        if self.required_policy_version.trim().is_empty() {
            return Err("required_policy_version cannot be empty".to_string());
        }
        // Note: on ne valide pas voice_v1 ici - c'est la responsabilité de VOICE v1
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE_HYBRID RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/// Résultat complet d'une analyse VOICE_HYBRID
/// 
/// SÉPARATION STRICTE:
/// - `base`: Données VOICE v1 certifiées (déterministes)
/// - `guidance`: Directives pour IA (déterministes)
/// - `completion`: Sortie IA (best-effort, non certifiée)
/// - `replay`: Preuve d'audit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceHybridResult {
    /// Sortie VOICE v1 (profil + warnings) - CERTIFIÉ
    pub base: VoiceAnalysisResult,

    /// Guidance construite (prompt, directives) pour provider IA
    pub guidance: VoiceHybridGuidance,

    /// Score de conformité (0..1) déterministe
    /// 1.0 = parfaitement conforme à la policy
    pub compliance_score: f64,

    /// Texte généré par l'IA (si mode Record/Off avec provider)
    /// None si Replay ou si pas de provider
    pub completion: Option<String>,

    /// Record (si mode Record) ou Replay utilisé (si mode Replay)
    pub replay: Option<VoiceHybridReplayRecord>,

    /// Warnings VOICE_HYBRID (policy mismatch, replay mismatch, etc.)
    pub warnings: Vec<String>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDANCE (DIRECTIVES POUR IA)
// ═══════════════════════════════════════════════════════════════════════════════

/// Guidance = ensemble des directives pour le provider IA
/// 
/// HYBRID-GUID-01: Le guidance_hash est déterministe
/// HYBRID-GUID-02: Directives et contraintes sont triées pour stabilité
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceHybridGuidance {
    /// Hash du guidance (auditable, stable)
    /// SHA-256 du contenu canonique
    pub guidance_hash: String,

    /// Prompt texte final pour le provider LLM
    pub prompt: String,

    /// Liste de directives normalisées (triées, audit-friendly)
    /// Format: "SOFT: ..." ou "HARD: ..."
    pub directives: Vec<String>,

    /// Contraintes strictes (ne pas violer)
    /// Format: "HARD: ..."
    pub hard_constraints: Vec<String>,
}

impl VoiceHybridGuidance {
    /// Crée un guidance vide (utilisé comme fallback)
    pub fn empty() -> Self {
        Self {
            guidance_hash: "EMPTY".to_string(),
            prompt: String::new(),
            directives: Vec::new(),
            hard_constraints: Vec::new(),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM PROVIDER TRAIT
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider IA abstrait (OpenAI/Anthropic/Mock)
/// 
/// HYBRID-PROV-01: Interface stable, swappable, testable
/// HYBRID-PROV-02: Appel non-déterministe en Record, déterministe en Replay (via record)
pub trait LlmProvider: Send + Sync {
    /// Nom du provider (ex: "openai", "anthropic", "mock")
    fn name(&self) -> &'static str;

    /// Appel au provider
    /// En mode Record: appel réel, résultat potentiellement non-déterministe
    /// En mode Replay: ne devrait pas être appelé (on utilise le record)
    fn complete(&self, prompt: &str) -> Result<String, String>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYZER TRAIT
// ═══════════════════════════════════════════════════════════════════════════════

/// Trait principal pour l'analyse hybride
/// 
/// HYBRID-ANAL-01: Output déterministe si (ReplayMode=Replay)
/// HYBRID-ANAL-02: Séparation stricte stats certifiées / IA best-effort
pub trait VoiceHybridAnalyzer: Send + Sync {
    /// Analyse hybride complète
    /// 
    /// # Arguments
    /// - `input_text`: Texte à analyser
    /// - `policy`: Policy de style à appliquer
    /// - `cfg`: Configuration de l'analyse
    /// - `provider`: Provider IA (optionnel sauf en mode Record)
    /// 
    /// # Returns
    /// - `VoiceHybridResult` contenant stats v1 + guidance + completion
    fn analyze_hybrid(
        &self,
        input_text: &str,
        policy: &VoiceHybridPolicy,
        cfg: &VoiceHybridConfig,
        provider: Option<&dyn LlmProvider>,
    ) -> Result<VoiceHybridResult, String>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn voice_hybrid_config_default_valid() {
        let cfg = VoiceHybridConfig::default();
        assert!(cfg.validate().is_ok());
        assert!(cfg.deterministic);
        assert_eq!(cfg.replay_mode, ReplayMode::Off);
    }

    #[test]
    fn voice_hybrid_config_empty_run_id_invalid() {
        let mut cfg = VoiceHybridConfig::default();
        cfg.run_id = "".to_string();
        assert!(cfg.validate().is_err());
    }

    #[test]
    fn voice_hybrid_guidance_empty() {
        let g = VoiceHybridGuidance::empty();
        assert_eq!(g.guidance_hash, "EMPTY");
        assert!(g.prompt.is_empty());
    }
}
