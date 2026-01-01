//! VOICE_HYBRID Errors v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Erreurs typées pour le module VOICE_HYBRID
//! Suit le pattern thiserror pour compatibilité Rust idiomatique
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use thiserror::Error;

/// Erreurs du module VOICE_HYBRID
#[derive(Debug, Error)]
pub enum VoiceHybridError {
    // ─────────────────────────────────────────────────────────────────────────
    // ERREURS I/O
    // ─────────────────────────────────────────────────────────────────────────
    
    /// Erreur d'entrée/sortie fichier
    #[error("HYBRID-E001: io error: {0}")]
    Io(String),

    /// Erreur de sérialisation/désérialisation JSON
    #[error("HYBRID-E002: json error: {0}")]
    Json(String),

    /// Chemin de fichier invalide
    #[error("HYBRID-E003: invalid path: {0}")]
    InvalidPath(String),

    // ─────────────────────────────────────────────────────────────────────────
    // ERREURS RECORD/REPLAY
    // ─────────────────────────────────────────────────────────────────────────

    /// Hash du record ne correspond pas (tampering détecté)
    #[error("HYBRID-E010: record hash mismatch: expected={expected} got={got}")]
    RecordHashMismatch { expected: String, got: String },

    /// Version de schema non supportée
    #[error("HYBRID-E011: unsupported schema version: {0}")]
    UnsupportedSchema(u32),

    /// Record introuvable pour le run_id
    #[error("HYBRID-E012: record not found for run_id: {0}")]
    RecordNotFound(String),

    /// Mismatch lors du replay (policy/guidance/input différents)
    #[error("HYBRID-E013: replay mismatch: {field} differs")]
    ReplayMismatch { field: String },

    // ─────────────────────────────────────────────────────────────────────────
    // ERREURS POLICY
    // ─────────────────────────────────────────────────────────────────────────

    /// Version de policy non supportée
    #[error("HYBRID-E020: policy version mismatch: required={required} got={got}")]
    PolicyVersionMismatch { required: String, got: String },

    /// Policy invalide
    #[error("HYBRID-E021: invalid policy: {0}")]
    InvalidPolicy(String),

    // ─────────────────────────────────────────────────────────────────────────
    // ERREURS PROVIDER
    // ─────────────────────────────────────────────────────────────────────────

    /// Provider requis mais non fourni
    #[error("HYBRID-E030: provider required for mode {0}")]
    ProviderRequired(String),

    /// Erreur du provider LLM
    #[error("HYBRID-E031: provider error: {0}")]
    ProviderError(String),

    // ─────────────────────────────────────────────────────────────────────────
    // ERREURS CANON
    // ─────────────────────────────────────────────────────────────────────────

    /// Erreur lors de l'écriture CANON
    #[error("HYBRID-E040: canon write error: {0}")]
    CanonWriteError(String),

    /// Violation de lock CANON
    #[error("HYBRID-E041: canon lock violation: entity={entity} key={key}")]
    CanonLockViolation { entity: String, key: String },

    // ─────────────────────────────────────────────────────────────────────────
    // ERREURS INVARIANTS
    // ─────────────────────────────────────────────────────────────────────────

    /// Violation d'un invariant
    #[error("HYBRID-E050: invariant violation: {0}")]
    InvariantViolation(String),

    /// Configuration invalide
    #[error("HYBRID-E051: invalid config: {0}")]
    InvalidConfig(String),

    // ─────────────────────────────────────────────────────────────────────────
    // ERREURS VOICE V1
    // ─────────────────────────────────────────────────────────────────────────

    /// Erreur propagée depuis VOICE v1
    #[error("HYBRID-E060: voice v1 error: {0}")]
    VoiceV1Error(String),
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSIONS
// ═══════════════════════════════════════════════════════════════════════════════

impl From<std::io::Error> for VoiceHybridError {
    fn from(e: std::io::Error) -> Self {
        VoiceHybridError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for VoiceHybridError {
    fn from(e: serde_json::Error) -> Self {
        VoiceHybridError::Json(e.to_string())
    }
}

// Conversion en String pour compatibilité avec les traits existants
impl From<VoiceHybridError> for String {
    fn from(e: VoiceHybridError) -> Self {
        e.to_string()
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

impl VoiceHybridError {
    /// Retourne le code d'erreur
    pub fn code(&self) -> &'static str {
        match self {
            VoiceHybridError::Io(_) => "HYBRID-E001",
            VoiceHybridError::Json(_) => "HYBRID-E002",
            VoiceHybridError::InvalidPath(_) => "HYBRID-E003",
            VoiceHybridError::RecordHashMismatch { .. } => "HYBRID-E010",
            VoiceHybridError::UnsupportedSchema(_) => "HYBRID-E011",
            VoiceHybridError::RecordNotFound(_) => "HYBRID-E012",
            VoiceHybridError::ReplayMismatch { .. } => "HYBRID-E013",
            VoiceHybridError::PolicyVersionMismatch { .. } => "HYBRID-E020",
            VoiceHybridError::InvalidPolicy(_) => "HYBRID-E021",
            VoiceHybridError::ProviderRequired(_) => "HYBRID-E030",
            VoiceHybridError::ProviderError(_) => "HYBRID-E031",
            VoiceHybridError::CanonWriteError(_) => "HYBRID-E040",
            VoiceHybridError::CanonLockViolation { .. } => "HYBRID-E041",
            VoiceHybridError::InvariantViolation(_) => "HYBRID-E050",
            VoiceHybridError::InvalidConfig(_) => "HYBRID-E051",
            VoiceHybridError::VoiceV1Error(_) => "HYBRID-E060",
        }
    }

    /// L'erreur est-elle récupérable?
    pub fn is_recoverable(&self) -> bool {
        match self {
            VoiceHybridError::Io(_) => true,
            VoiceHybridError::RecordNotFound(_) => true,
            VoiceHybridError::ProviderError(_) => true,
            _ => false,
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
    fn error_codes_unique() {
        let errors = vec![
            VoiceHybridError::Io("test".to_string()),
            VoiceHybridError::Json("test".to_string()),
            VoiceHybridError::InvalidPath("test".to_string()),
            VoiceHybridError::RecordHashMismatch { expected: "a".to_string(), got: "b".to_string() },
            VoiceHybridError::UnsupportedSchema(99),
            VoiceHybridError::RecordNotFound("test".to_string()),
            VoiceHybridError::ReplayMismatch { field: "test".to_string() },
            VoiceHybridError::PolicyVersionMismatch { required: "2.0".to_string(), got: "1.0".to_string() },
            VoiceHybridError::InvalidPolicy("test".to_string()),
            VoiceHybridError::ProviderRequired("test".to_string()),
            VoiceHybridError::ProviderError("test".to_string()),
            VoiceHybridError::CanonWriteError("test".to_string()),
            VoiceHybridError::CanonLockViolation { entity: "e".to_string(), key: "k".to_string() },
            VoiceHybridError::InvariantViolation("test".to_string()),
            VoiceHybridError::InvalidConfig("test".to_string()),
            VoiceHybridError::VoiceV1Error("test".to_string()),
        ];

        let codes: Vec<_> = errors.iter().map(|e| e.code()).collect();
        let unique: std::collections::HashSet<_> = codes.iter().collect();
        
        assert_eq!(codes.len(), unique.len(), "All error codes must be unique");
    }

    #[test]
    fn error_display_contains_code() {
        let e = VoiceHybridError::Io("disk full".to_string());
        let s = e.to_string();
        assert!(s.contains("HYBRID-E001"));
        assert!(s.contains("disk full"));
    }

    #[test]
    fn error_from_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let hybrid_err: VoiceHybridError = io_err.into();
        assert_eq!(hybrid_err.code(), "HYBRID-E001");
    }

    #[test]
    fn error_recoverable() {
        assert!(VoiceHybridError::Io("test".to_string()).is_recoverable());
        assert!(VoiceHybridError::RecordNotFound("test".to_string()).is_recoverable());
        assert!(!VoiceHybridError::InvalidPolicy("test".to_string()).is_recoverable());
    }
}
