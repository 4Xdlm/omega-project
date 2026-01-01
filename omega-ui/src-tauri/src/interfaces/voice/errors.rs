//! OMEGA VOICE — Errors (NASA-Grade AS9100D)
//! ═══════════════════════════════════════════════════════════════════════════════
//!
//! Erreurs typées pour diagnostic, audit et traçabilité.
//! Aligné sur le pattern CANON (14 variants).
//!
//! @invariant Chaque erreur doit être diagnosticable sans contexte externe
//! @certification AEROSPACE_GRADE

use thiserror::Error;

/// Erreurs VOICE typées (14 variants)
#[derive(Debug, Error, Clone, PartialEq)]
pub enum VoiceError {
    // ─────────────────────────────────────────────────────────────────────────
    // CONFIGURATION (2)
    // ─────────────────────────────────────────────────────────────────────────
    
    #[error("VOICE-E001: invalid config - {reason}")]
    InvalidConfig { reason: String },

    #[error("VOICE-E002: unsupported language '{language}' (supported: fr, en)")]
    UnsupportedLanguage { language: String },

    // ─────────────────────────────────────────────────────────────────────────
    // INPUT VALIDATION (3)
    // ─────────────────────────────────────────────────────────────────────────

    #[error("VOICE-E003: empty input - text is empty after canonicalization")]
    EmptyInput,

    #[error("VOICE-E004: text too short - need at least {min} chars, got {actual}")]
    TextTooShort { min: usize, actual: usize },

    #[error("VOICE-E005: invalid UTF-8 in input at position {position}")]
    InvalidUtf8 { position: usize },

    // ─────────────────────────────────────────────────────────────────────────
    // PROCESSING (4)
    // ─────────────────────────────────────────────────────────────────────────

    #[error("VOICE-E006: canonicalization failed - {reason}")]
    CanonicalizationFailed { reason: String },

    #[error("VOICE-E007: segmentation failed - {reason}")]
    SegmentationFailed { reason: String },

    #[error("VOICE-E008: metric computation failed for '{field}' - {reason}")]
    MetricComputationFailed { field: String, reason: String },

    #[error("VOICE-E009: numeric violation in '{field}' - {reason}")]
    NumericViolation { field: String, reason: String },

    // ─────────────────────────────────────────────────────────────────────────
    // INVARIANT VIOLATIONS (2)
    // ─────────────────────────────────────────────────────────────────────────

    #[error("VOICE-E010: invariant violation [{invariant}] - {details}")]
    InvariantViolation { invariant: String, details: String },

    #[error("VOICE-E011: corpus hash mismatch - expected {expected}, got {actual}")]
    CorpusHashMismatch { expected: String, actual: String },

    // ─────────────────────────────────────────────────────────────────────────
    // SERIALIZATION / VALIDATION (2)
    // ─────────────────────────────────────────────────────────────────────────

    #[error("VOICE-E012: serialization failed - {reason}")]
    SerializationFailed { reason: String },

    #[error("VOICE-E013: schema validation failed - {reason}")]
    SchemaValidationFailed { reason: String },

    // ─────────────────────────────────────────────────────────────────────────
    // INTERNAL (1)
    // ─────────────────────────────────────────────────────────────────────────

    #[error("VOICE-E014: internal error - {reason}")]
    Internal { reason: String },
}

impl VoiceError {
    /// Retourne le code d'erreur (ex: "VOICE-E001")
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidConfig { .. } => "VOICE-E001",
            Self::UnsupportedLanguage { .. } => "VOICE-E002",
            Self::EmptyInput => "VOICE-E003",
            Self::TextTooShort { .. } => "VOICE-E004",
            Self::InvalidUtf8 { .. } => "VOICE-E005",
            Self::CanonicalizationFailed { .. } => "VOICE-E006",
            Self::SegmentationFailed { .. } => "VOICE-E007",
            Self::MetricComputationFailed { .. } => "VOICE-E008",
            Self::NumericViolation { .. } => "VOICE-E009",
            Self::InvariantViolation { .. } => "VOICE-E010",
            Self::CorpusHashMismatch { .. } => "VOICE-E011",
            Self::SerializationFailed { .. } => "VOICE-E012",
            Self::SchemaValidationFailed { .. } => "VOICE-E013",
            Self::Internal { .. } => "VOICE-E014",
        }
    }

    /// Retourne la sévérité (pour logging)
    pub fn severity(&self) -> &'static str {
        match self {
            Self::InvalidConfig { .. } | Self::UnsupportedLanguage { .. } => "CONFIG",
            Self::EmptyInput | Self::TextTooShort { .. } | Self::InvalidUtf8 { .. } => "INPUT",
            Self::CanonicalizationFailed { .. } | Self::SegmentationFailed { .. } => "PROCESSING",
            Self::MetricComputationFailed { .. } | Self::NumericViolation { .. } => "COMPUTATION",
            Self::InvariantViolation { .. } | Self::CorpusHashMismatch { .. } => "INVARIANT",
            Self::SerializationFailed { .. } | Self::SchemaValidationFailed { .. } => "VALIDATION",
            Self::Internal { .. } => "INTERNAL",
        }
    }

    /// Est-ce une erreur récupérable?
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            Self::EmptyInput | Self::TextTooShort { .. } | Self::InvalidConfig { .. }
        )
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes_unique() {
        let errors = vec![
            VoiceError::InvalidConfig { reason: "test".into() },
            VoiceError::UnsupportedLanguage { language: "xx".into() },
            VoiceError::EmptyInput,
            VoiceError::TextTooShort { min: 50, actual: 10 },
            VoiceError::InvalidUtf8 { position: 0 },
            VoiceError::CanonicalizationFailed { reason: "test".into() },
            VoiceError::SegmentationFailed { reason: "test".into() },
            VoiceError::MetricComputationFailed { field: "D1".into(), reason: "test".into() },
            VoiceError::NumericViolation { field: "D1".into(), reason: "test".into() },
            VoiceError::InvariantViolation { invariant: "I01".into(), details: "test".into() },
            VoiceError::CorpusHashMismatch { expected: "a".into(), actual: "b".into() },
            VoiceError::SerializationFailed { reason: "test".into() },
            VoiceError::SchemaValidationFailed { reason: "test".into() },
            VoiceError::Internal { reason: "test".into() },
        ];

        let mut codes: Vec<&str> = errors.iter().map(|e| e.code()).collect();
        let len_before = codes.len();
        codes.sort();
        codes.dedup();
        
        assert_eq!(codes.len(), len_before, "Error codes must be unique");
        assert_eq!(codes.len(), 14, "Must have exactly 14 error variants");
    }

    #[test]
    fn test_error_display_contains_code() {
        let e = VoiceError::EmptyInput;
        let msg = e.to_string();
        assert!(msg.contains("VOICE-E003"), "Display should contain error code");
    }

    #[test]
    fn test_recoverable_errors() {
        assert!(VoiceError::EmptyInput.is_recoverable());
        assert!(VoiceError::TextTooShort { min: 50, actual: 10 }.is_recoverable());
        assert!(!VoiceError::Internal { reason: "test".into() }.is_recoverable());
    }
}
