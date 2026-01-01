// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS ERROR MODULE — NASA-GRADE ERROR TAXONOMY
//   Version: 1.1.0-OPUS
//   Standard: DO-178C / AS9100D / SpaceX Flight Software
//
// ═══════════════════════════════════════════════════════════════════════════════
//
//   ERROR CODE TAXONOMY:
//   
//   GENESIS-E-xxx: General errors
//   GENESIS-E-REQ-xxx: Request validation errors
//   GENESIS-E-ENTITY-xxx: EntityId validation errors
//   GENESIS-E-SEV-xxx: Severity validation errors
//   GENESIS-E-SCHEMA-xxx: Schema version errors
//   GENESIS-E-CLAIM-xxx: Continuity claim errors
//   GENESIS-E-LEN-xxx: Length specification errors
//   GENESIS-E-ARC-xxx: Arc specification errors
//   GENESIS-E-PLAN-xxx: Planning errors
//   GENESIS-E-BEAT-xxx: Beat generation errors
//   GENESIS-E-SCENE-xxx: Scene specification errors
//   GENESIS-E-PROOF-xxx: Proof/integrity errors
//   GENESIS-E-CRYPTO-xxx: Cryptographic errors
//   GENESIS-E-IO-xxx: I/O errors
//
// ═══════════════════════════════════════════════════════════════════════════════

use std::fmt;

/// Result type alias for GENESIS operations
pub type GenesisResult<T> = Result<T, GenesisError>;

/// Comprehensive error enum with typed codes and structured context
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GenesisError {
    // ─────────────────────────────────────────────────────────────────────────
    // Request validation errors
    // ─────────────────────────────────────────────────────────────────────────
    InvalidRequest {
        code: &'static str,
        field: String,
        reason: String,
    },

    MissingRequiredField {
        code: &'static str,
        field: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // EntityId validation errors
    // ─────────────────────────────────────────────────────────────────────────
    InvalidEntityId {
        code: &'static str,
        raw: String,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Severity validation errors
    // ─────────────────────────────────────────────────────────────────────────
    InvalidSeverity {
        code: &'static str,
        raw: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Schema version errors
    // ─────────────────────────────────────────────────────────────────────────
    InvalidSchemaVersion {
        code: &'static str,
        raw: String,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Continuity claim errors
    // ─────────────────────────────────────────────────────────────────────────
    DuplicateClaimId {
        code: &'static str,
        claim_id: String,
        reason: String,
    },

    InvalidClaim {
        code: &'static str,
        claim_id: String,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Length specification errors
    // ─────────────────────────────────────────────────────────────────────────
    InvalidLengthSpec {
        code: &'static str,
        min: u32,
        max: u32,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Arc specification errors
    // ─────────────────────────────────────────────────────────────────────────
    InvalidArcSpec {
        code: &'static str,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Planning errors
    // ─────────────────────────────────────────────────────────────────────────
    PlanningError {
        code: &'static str,
        phase: String,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Beat generation errors
    // ─────────────────────────────────────────────────────────────────────────
    BeatError {
        code: &'static str,
        beat_index: usize,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Scene specification errors
    // ─────────────────────────────────────────────────────────────────────────
    InvalidSceneSpec {
        code: &'static str,
        scene_index: usize,
        reason: String,
    },

    SceneCountMismatch {
        code: &'static str,
        expected: usize,
        actual: usize,
    },

    MissingBeatCoverage {
        code: &'static str,
        missing: Vec<String>,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Proof/integrity errors
    // ─────────────────────────────────────────────────────────────────────────
    ProofError {
        code: &'static str,
        reason: String,
    },

    IntegrityViolation {
        code: &'static str,
        location: String,
        expected: String,
        actual: String,
    },

    TamperDetected {
        code: &'static str,
        chain_index: usize,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Cryptographic errors
    // ─────────────────────────────────────────────────────────────────────────
    CryptoError {
        code: &'static str,
        operation: String,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // I/O errors
    // ─────────────────────────────────────────────────────────────────────────
    IoError {
        code: &'static str,
        operation: String,
        reason: String,
    },

    SerializationError {
        code: &'static str,
        format: String,
        reason: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Warning aggregation (for non-fatal issues)
    // ─────────────────────────────────────────────────────────────────────────
    WarningsAccumulated {
        warnings: Vec<GenesisWarning>,
    },
}

impl fmt::Display for GenesisError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            GenesisError::InvalidRequest { code, field, reason } => {
                write!(f, "[{}] Invalid request field '{}': {}", code, field, reason)
            }
            GenesisError::MissingRequiredField { code, field } => {
                write!(f, "[{}] Missing required field: {}", code, field)
            }
            GenesisError::InvalidEntityId { code, raw, reason } => {
                write!(f, "[{}] Invalid EntityId '{}': {}", code, raw, reason)
            }
            GenesisError::InvalidSeverity { code, raw } => {
                write!(f, "[{}] Invalid severity '{}': expected P0-CRITICAL|P1-HIGH|P2-MEDIUM|P3-LOW", code, raw)
            }
            GenesisError::InvalidSchemaVersion { code, raw, reason } => {
                write!(f, "[{}] Invalid schema version '{}': {}", code, raw, reason)
            }
            GenesisError::DuplicateClaimId { code, claim_id, reason } => {
                write!(f, "[{}] Duplicate claim_id '{}': {}", code, claim_id, reason)
            }
            GenesisError::InvalidClaim { code, claim_id, reason } => {
                write!(f, "[{}] Invalid claim '{}': {}", code, claim_id, reason)
            }
            GenesisError::InvalidLengthSpec { code, min, max, reason } => {
                write!(f, "[{}] Invalid length spec (min={}, max={}): {}", code, min, max, reason)
            }
            GenesisError::InvalidArcSpec { code, reason } => {
                write!(f, "[{}] Invalid arc spec: {}", code, reason)
            }
            GenesisError::PlanningError { code, phase, reason } => {
                write!(f, "[{}] Planning error in phase '{}': {}", code, phase, reason)
            }
            GenesisError::BeatError { code, beat_index, reason } => {
                write!(f, "[{}] Beat error at index {}: {}", code, beat_index, reason)
            }
            GenesisError::InvalidSceneSpec { code, scene_index, reason } => {
                write!(f, "[{}] Invalid scene spec at index {}: {}", code, scene_index, reason)
            }
            GenesisError::SceneCountMismatch { code, expected, actual } => {
                write!(f, "[{}] Scene count mismatch: expected {}, got {}", code, expected, actual)
            }
            GenesisError::MissingBeatCoverage { code, missing } => {
                write!(f, "[{}] Missing beat coverage: {:?}", code, missing)
            }
            GenesisError::ProofError { code, reason } => {
                write!(f, "[{}] Proof error: {}", code, reason)
            }
            GenesisError::IntegrityViolation { code, location, expected, actual } => {
                write!(f, "[{}] Integrity violation at '{}': expected '{}', got '{}'", code, location, expected, actual)
            }
            GenesisError::TamperDetected { code, chain_index, reason } => {
                write!(f, "[{}] TAMPER DETECTED at chain index {}: {}", code, chain_index, reason)
            }
            GenesisError::CryptoError { code, operation, reason } => {
                write!(f, "[{}] Crypto error during '{}': {}", code, operation, reason)
            }
            GenesisError::IoError { code, operation, reason } => {
                write!(f, "[{}] I/O error during '{}': {}", code, operation, reason)
            }
            GenesisError::SerializationError { code, format, reason } => {
                write!(f, "[{}] Serialization error ({}): {}", code, format, reason)
            }
            GenesisError::WarningsAccumulated { warnings } => {
                write!(f, "Warnings accumulated: {} total", warnings.len())
            }
        }
    }
}

impl std::error::Error for GenesisError {}

// ═══════════════════════════════════════════════════════════════════════════════
//   WARNING TYPE (non-fatal issues)
// ═══════════════════════════════════════════════════════════════════════════════

/// Warning severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum WarningSeverity {
    Low,
    Medium,
    High,
}

impl WarningSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            WarningSeverity::Low => "LOW",
            WarningSeverity::Medium => "MEDIUM",
            WarningSeverity::High => "HIGH",
        }
    }
}

impl fmt::Display for WarningSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Structured warning (deterministic)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GenesisWarning {
    pub code: String,
    pub message: String,
    pub severity: WarningSeverity,
    pub context: Vec<(String, String)>, // Ordered pairs for determinism
}

impl GenesisWarning {
    pub fn new(code: &str, message: &str, severity: WarningSeverity) -> Self {
        GenesisWarning {
            code: code.to_string(),
            message: message.to_string(),
            severity,
            context: Vec::new(),
        }
    }

    pub fn with_context(mut self, key: &str, value: &str) -> Self {
        self.context.push((key.to_string(), value.to_string()));
        self
    }
}

impl fmt::Display for GenesisWarning {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}][{}] {}", self.code, self.severity, self.message)?;
        if !self.context.is_empty() {
            write!(f, " (")?;
            for (i, (k, v)) in self.context.iter().enumerate() {
                if i > 0 { write!(f, ", ")?; }
                write!(f, "{}={}", k, v)?;
            }
            write!(f, ")")?;
        }
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   ERROR CODE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Error codes module for easy reference
pub mod codes {
    // Request validation
    pub const REQ_EMPTY_SAGA_ID: &str = "GENESIS-E-REQ-001";
    pub const REQ_EMPTY_SCHEMA: &str = "GENESIS-E-REQ-002";
    pub const REQ_ZERO_SCENES: &str = "GENESIS-E-REQ-003";
    pub const REQ_EMPTY_CANON_SCOPE: &str = "GENESIS-E-REQ-004";
    pub const REQ_EMPTY_VOICE_PROFILE: &str = "GENESIS-E-REQ-005";
    pub const REQ_EMPTY_CONTINUITY: &str = "GENESIS-E-REQ-006";
    pub const REQ_INVALID_SEED: &str = "GENESIS-E-REQ-007";

    // Entity validation
    pub const ENTITY_EMPTY: &str = "GENESIS-E-ENTITY-001";
    pub const ENTITY_FORMAT: &str = "GENESIS-E-ENTITY-002";
    pub const ENTITY_NO_SEPARATOR: &str = "GENESIS-E-ENTITY-003";
    pub const ENTITY_UNKNOWN_TYPE: &str = "GENESIS-E-ENTITY-004";
    pub const ENTITY_TOO_LONG: &str = "GENESIS-E-ENTITY-005";
    pub const ENTITY_INVALID_CHARS: &str = "GENESIS-E-ENTITY-006";

    // Proof/integrity
    pub const PROOF_CHAIN_LENGTH: &str = "GENESIS-E-PROOF-001";
    pub const PROOF_INDEX_MISMATCH: &str = "GENESIS-E-PROOF-002";
    pub const PROOF_PREV_MISMATCH: &str = "GENESIS-E-PROOF-003";
    pub const PROOF_SCENE_MISMATCH: &str = "GENESIS-E-PROOF-004";
    pub const PROOF_CHAIN_MISMATCH: &str = "GENESIS-E-PROOF-005";
    pub const PROOF_MISSING_TIP: &str = "GENESIS-E-PROOF-006";
    pub const PROOF_TIP_MISMATCH: &str = "GENESIS-E-PROOF-007";
    pub const PROOF_MISSING_PLAN_ID: &str = "GENESIS-E-PROOF-008";
    pub const PROOF_PLAN_ID_MISMATCH: &str = "GENESIS-E-PROOF-009";

    // Scene validation
    pub const SCENE_EMPTY_POV: &str = "GENESIS-E-SCENE-001";
    pub const SCENE_EMPTY_TENSE: &str = "GENESIS-E-SCENE-002";
    pub const SCENE_EMPTY_TONE: &str = "GENESIS-E-SCENE-003";
    pub const SCENE_EMPTY_SCOPE: &str = "GENESIS-E-SCENE-004";
    pub const SCENE_MISSING_GOAL: &str = "GENESIS-E-SCENE-005";
    pub const SCENE_MISSING_CONFLICT: &str = "GENESIS-E-SCENE-006";
    pub const SCENE_MISSING_OUTCOME: &str = "GENESIS-E-SCENE-007";
    pub const SCENE_MISSING_CONTINUITY: &str = "GENESIS-E-SCENE-008";
    pub const SCENE_COUNT_MISMATCH: &str = "GENESIS-E-SCENE-009";

    // Beat validation
    pub const BEAT_MISSING_SETUP: &str = "GENESIS-E-BEAT-001";
    pub const BEAT_MISSING_CONFRONTATION: &str = "GENESIS-E-BEAT-002";
    pub const BEAT_MISSING_PAYOFF: &str = "GENESIS-E-BEAT-003";
}

/// Warning codes module
pub mod warning_codes {
    pub const TIGHT_LENGTH_RANGE: &str = "GENESIS-W-001";
    pub const MANY_CONSTRAINTS: &str = "GENESIS-W-002";
    pub const LONG_CONTINUITY_LIST: &str = "GENESIS-W-003";
    pub const HIGH_SCENE_COUNT: &str = "GENESIS-W-004";
    pub const SINGLE_ACT: &str = "GENESIS-W-005";
}

// ═══════════════════════════════════════════════════════════════════════════════
//   TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_display_format() {
        let err = GenesisError::InvalidRequest {
            code: "GENESIS-E-REQ-001",
            field: "saga_id".into(),
            reason: "cannot be empty".into(),
        };
        let msg = format!("{}", err);
        assert!(msg.contains("GENESIS-E-REQ-001"));
        assert!(msg.contains("saga_id"));
    }

    #[test]
    fn warning_display_with_context() {
        let warn = GenesisWarning::new("GENESIS-W-001", "Test warning", WarningSeverity::Medium)
            .with_context("key1", "value1")
            .with_context("key2", "value2");
        
        let msg = format!("{}", warn);
        assert!(msg.contains("GENESIS-W-001"));
        assert!(msg.contains("MEDIUM"));
        assert!(msg.contains("key1=value1"));
    }

    #[test]
    fn error_deterministic_display() {
        let err = GenesisError::TamperDetected {
            code: "GENESIS-E-PROOF-003",
            chain_index: 5,
            reason: "hash mismatch".into(),
        };
        
        let msg1 = format!("{}", err);
        let msg2 = format!("{}", err);
        assert_eq!(msg1, msg2, "Error display must be deterministic");
    }
}
