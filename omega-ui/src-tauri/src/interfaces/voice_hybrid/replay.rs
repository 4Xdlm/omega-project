//! VOICE_HYBRID Replay v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! @invariant HYBRID-REP-01: Record/Replay doit être 100% reproductible
//! @invariant HYBRID-REP-02: Tout record contient hashes + provider name + run_id
//! @invariant HYBRID-REP-03: Aucun secret (API keys) dans un record
//! @invariant HYBRID-REP-04: record_hash anti-tamper
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY MODE
// ═══════════════════════════════════════════════════════════════════════════════

/// Mode de fonctionnement Record/Replay
/// 
/// - Off: Mode production normal, appelle le provider si présent
/// - Record: Appelle le provider ET enregistre le résultat
/// - Replay: Relit un record existant, zéro appel réseau
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ReplayMode {
    /// Mode normal: appelle le provider si présent, pas d'enregistrement
    #[default]
    Off,
    
    /// Mode enregistrement: appelle le provider et sauvegarde le résultat
    Record,
    
    /// Mode replay: relit un enregistrement existant, zéro réseau
    Replay,
}

impl ReplayMode {
    /// Vérifie si le mode nécessite un provider
    pub fn requires_provider(&self) -> bool {
        matches!(self, ReplayMode::Off | ReplayMode::Record)
    }

    /// Vérifie si le mode nécessite un fichier record existant
    pub fn requires_record_file(&self) -> bool {
        matches!(self, ReplayMode::Replay)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY RECORD
// ═══════════════════════════════════════════════════════════════════════════════

/// Record d'une analyse VOICE_HYBRID
/// 
/// Contient toutes les informations pour reproduire exactement une analyse:
/// - Identifiants (run, policy)
/// - Hashes (guidance, input, record)
/// - Prompt et completion
/// - Métadonnées (provider, latence, etc.)
/// 
/// SÉCURITÉ: Ne contient JAMAIS de clés API ou secrets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceHybridReplayRecord {
    /// Version du schema (pour migrations futures)
    pub schema_version: u32,

    /// Identifiant du run (ex: "RUN_TEST_0001")
    pub run_id: String,

    /// Identifiant de la policy utilisée
    pub policy_id: String,

    /// Version de la policy
    pub policy_version: String,

    /// Hash du guidance (doit matcher guidance_hash du résultat)
    pub guidance_hash: String,

    /// Nom du provider utilisé (ex: "openai", "anthropic", "mock")
    pub provider: String,

    /// Hash SHA-256 de l'input canonique
    pub input_hash: String,

    /// Prompt complet envoyé au provider
    pub prompt: String,

    /// Réponse brute du provider
    pub completion: String,

    /// Hash SHA-256 du record complet (anti-tamper)
    /// Calculé sur tout le record sauf ce champ
    pub record_hash: String,

    /// Métadonnées additionnelles (latence, modèle, etc.)
    /// BTreeMap pour ordre stable
    pub meta: BTreeMap<String, String>,
}

impl VoiceHybridReplayRecord {
    /// Crée un nouveau record avec les champs obligatoires
    pub fn new(run_id: &str, provider: &str) -> Self {
        Self {
            schema_version: 1,
            run_id: run_id.to_string(),
            policy_id: "UNSET".to_string(),
            policy_version: "2.0.0".to_string(),
            guidance_hash: "UNSET".to_string(),
            provider: provider.to_string(),
            input_hash: "UNSET".to_string(),
            prompt: String::new(),
            completion: String::new(),
            record_hash: "UNSET".to_string(),
            meta: BTreeMap::new(),
        }
    }

    /// Ajoute une métadonnée
    pub fn with_meta(mut self, key: &str, value: &str) -> Self {
        self.meta.insert(key.to_string(), value.to_string());
        self
    }

    /// Valide le record (structure uniquement, pas le hash)
    pub fn validate_structure(&self) -> Result<(), String> {
        if self.schema_version != 1 {
            return Err(format!("unsupported schema_version: {}", self.schema_version));
        }
        if self.run_id.trim().is_empty() {
            return Err("run_id cannot be empty".to_string());
        }
        if self.provider.trim().is_empty() {
            return Err("provider cannot be empty".to_string());
        }
        if self.policy_version.trim().is_empty() {
            return Err("policy_version cannot be empty".to_string());
        }
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY STORE TRAIT
// ═══════════════════════════════════════════════════════════════════════════════

/// Abstraction du stockage record/replay
/// 
/// Permet différentes implémentations:
/// - JsonFileReplayStore (fichiers JSON)
/// - InMemoryReplayStore (tests)
/// - CloudReplayStore (futurs)
pub trait ReplayStore: Send + Sync {
    /// Écrit un record sur le stockage
    /// Le record_hash est calculé automatiquement
    fn write_record(&self, path: &str, rec: &VoiceHybridReplayRecord) -> Result<(), String>;

    /// Lit un record depuis le stockage
    /// Vérifie automatiquement le record_hash (anti-tamper)
    fn read_record(&self, path: &str) -> Result<VoiceHybridReplayRecord, String>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY VERIFICATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/// Résultat de la vérification d'un replay
#[derive(Debug, Clone)]
pub struct ReplayVerification {
    /// Le replay est-il valide?
    pub valid: bool,
    
    /// Raison si invalide
    pub reason: Option<String>,
    
    /// Champs qui ne correspondent pas
    pub mismatches: Vec<String>,
}

impl ReplayVerification {
    /// Crée un résultat valide
    pub fn valid() -> Self {
        Self {
            valid: true,
            reason: None,
            mismatches: Vec::new(),
        }
    }

    /// Crée un résultat invalide
    pub fn invalid(reason: &str, mismatches: Vec<String>) -> Self {
        Self {
            valid: false,
            reason: Some(reason.to_string()),
            mismatches,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replay_mode_default_is_off() {
        let mode = ReplayMode::default();
        assert_eq!(mode, ReplayMode::Off);
    }

    #[test]
    fn replay_mode_requires_provider() {
        assert!(ReplayMode::Off.requires_provider());
        assert!(ReplayMode::Record.requires_provider());
        assert!(!ReplayMode::Replay.requires_provider());
    }

    #[test]
    fn replay_mode_requires_record() {
        assert!(!ReplayMode::Off.requires_record_file());
        assert!(!ReplayMode::Record.requires_record_file());
        assert!(ReplayMode::Replay.requires_record_file());
    }

    #[test]
    fn replay_record_new() {
        let rec = VoiceHybridReplayRecord::new("RUN_001", "mock");
        assert_eq!(rec.run_id, "RUN_001");
        assert_eq!(rec.provider, "mock");
        assert_eq!(rec.schema_version, 1);
        assert_eq!(rec.record_hash, "UNSET");
    }

    #[test]
    fn replay_record_validate_ok() {
        let rec = VoiceHybridReplayRecord::new("RUN_001", "mock");
        assert!(rec.validate_structure().is_ok());
    }

    #[test]
    fn replay_record_validate_empty_run_id() {
        let rec = VoiceHybridReplayRecord::new("", "mock");
        assert!(rec.validate_structure().is_err());
    }

    #[test]
    fn replay_record_with_meta() {
        let rec = VoiceHybridReplayRecord::new("RUN_001", "mock")
            .with_meta("latency_ms", "150")
            .with_meta("model", "gpt-4");
        
        assert_eq!(rec.meta.get("latency_ms"), Some(&"150".to_string()));
        assert_eq!(rec.meta.get("model"), Some(&"gpt-4".to_string()));
    }

    #[test]
    fn replay_verification_valid() {
        let v = ReplayVerification::valid();
        assert!(v.valid);
        assert!(v.reason.is_none());
    }

    #[test]
    fn replay_verification_invalid() {
        let v = ReplayVerification::invalid("hash mismatch", vec!["record_hash".to_string()]);
        assert!(!v.valid);
        assert_eq!(v.reason, Some("hash mismatch".to_string()));
        assert_eq!(v.mismatches, vec!["record_hash"]);
    }
}
