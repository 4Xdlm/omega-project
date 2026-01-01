//! OMEGA CANON — Contrat Stable (Interface)
//! Version: v1.0.0-CERTIFIED
//! Standard: NASA-Grade AS9100D

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use thiserror::Error;

// ═══════════════════════════════════════════════════════════════════════════════
// ERREURS TYPÉES
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Error, Debug, Clone, PartialEq)]
pub enum CanonError {
    #[error("DUPLICATE_FACT_ID: {0}")]
    DuplicateFactId(String),
    
    #[error("INVALID_ENTITY_ID: Format must be TYPE:ID, got: {0}")]
    InvalidEntityId(String),
    
    #[error("INVALID_CONFIDENCE: Must be in [0.0, 1.0], got: {0}")]
    InvalidConfidence(f32),
    
    #[error("INVALID_TIMELINE: valid_from ({from}) must be < valid_to ({to})")]
    InvalidTimeline { from: String, to: String },
    
    #[error("LOCK_VIOLATION: Cannot modify HARD locked fact {fact_id}")]
    LockViolation { fact_id: String },
    
    #[error("INVALID_ARCHITECT_TOKEN")]
    InvalidArchitectToken,
    
    #[error("CORRUPTED_SNAPSHOT: Expected {expected}, got {actual}")]
    CorruptedSnapshot { expected: String, actual: String },
    
    #[error("SERIALIZATION_ERROR: {0}")]
    SerializationError(String),
    
    #[error("FACT_NOT_FOUND: {0}")]
    FactNotFound(String),
    
    #[error("INVALID_FORMAT: {0}")]
    InvalidFormat(String),
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURES DE DONNÉES
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CanonFact {
    pub fact_id: String,
    pub entity_id: String,
    pub key: String,
    pub value: serde_json::Value,
    pub source: FactSource,
    pub confidence: f32,
    pub lock: LockLevel,
    pub hash: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid_from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid_to: Option<String>,
    pub version: u32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
pub enum FactSource {
    User,
    Import,
    Ai,
    Inferred,
    #[default]
    System,
    Architect,
}

impl std::fmt::Display for FactSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FactSource::User => write!(f, "USER"),
            FactSource::Import => write!(f, "IMPORT"),
            FactSource::Ai => write!(f, "AI"),
            FactSource::Inferred => write!(f, "INFERRED"),
            FactSource::System => write!(f, "SYSTEM"),
            FactSource::Architect => write!(f, "ARCHITECT"),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
pub enum LockLevel {
    #[default]
    None,
    Soft,
    Hard,
}

impl std::fmt::Display for LockLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LockLevel::None => write!(f, "NONE"),
            LockLevel::Soft => write!(f, "SOFT"),
            LockLevel::Hard => write!(f, "HARD"),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÉVÉNEMENTS LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonEvent {
    pub event_id: String,
    pub op: CanonOperation,
    pub fact: CanonFact,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_fact: Option<CanonFact>,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_event_hash: Option<String>,
    pub event_hash: String,
    pub seq: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum CanonOperation {
    Create,
    Update,
    Lock,
    Unlock,
    Delete,
}

impl std::fmt::Display for CanonOperation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CanonOperation::Create => write!(f, "CREATE"),
            CanonOperation::Update => write!(f, "UPDATE"),
            CanonOperation::Lock => write!(f, "LOCK"),
            CanonOperation::Unlock => write!(f, "UNLOCK"),
            CanonOperation::Delete => write!(f, "DELETE"),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonSnapshot {
    pub schema_version: u32,
    pub snapshot_id: String,
    pub created_at: String,
    pub facts: Vec<CanonFact>,
    pub metadata: BTreeMap<String, String>,
    pub snapshot_hash: String,
    pub stats: CanonStats,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CanonStats {
    pub total_facts: u32,
    pub entities_count: u32,
    pub locked_hard: u32,
    pub locked_soft: u32,
    pub ai_sourced: u32,
    pub user_sourced: u32,
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÉSULTATS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone)]
pub enum AssertResult {
    Created { fact_id: String, hash: String },
    Updated { fact_id: String, hash: String, previous_hash: String },
    Conflict { conflicts: Vec<Conflict> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub existing_fact: CanonFact,
    pub proposed_fact: CanonFact,
    pub conflict_type: ConflictType,
    pub resolution_options: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ConflictType {
    ValueMismatch,
    TimelineOverlap,
    LockViolation,
    SourceConflict,
}

#[derive(Debug, Clone, Copy, Default)]
pub enum ConflictPolicy {
    #[default]
    AskUser,
    OverrideIfHigherConfidence,
    KeepExisting,
    ArchitectOverride,
}

#[derive(Debug, Clone, Copy, Default)]
pub enum ImportPolicy {
    #[default]
    ValidateThenMerge,
    ReplaceAll,
    DryRun,
}

#[derive(Debug, Clone)]
pub struct ImportResult {
    pub imported_count: u32,
    pub updated_count: u32,
    pub skipped_count: u32,
    pub conflicts: Vec<Conflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonDiff {
    pub snapshot_a_hash: String,
    pub snapshot_b_hash: String,
    pub added: Vec<CanonFact>,
    pub removed: Vec<CanonFact>,
    pub modified: Vec<(CanonFact, CanonFact)>,
    pub unchanged_count: u32,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

pub const CANON_SCHEMA_VERSION: u32 = 1;
pub const MAX_VALUE_SIZE: usize = 5 * 1024 * 1024;
pub const ARCHITECT_TOKEN_TEST: &str = "OMEGA_ARCHITECT_TEST_TOKEN_2026";
