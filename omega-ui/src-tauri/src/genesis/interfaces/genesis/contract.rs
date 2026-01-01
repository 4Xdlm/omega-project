// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS CONTRACT — PUBLIC INTERFACE (FROZEN)
//   Version: 1.1.0-FUSION
//   Standard: DO-178C / AS9100D / SpaceX Flight Software
//
// ═══════════════════════════════════════════════════════════════════════════════
//
//   ⚠️  CE FICHIER EST GELÉ — TOUTE MODIFICATION REQUIERT MAJOR VERSION BUMP
//
//   FUSION: ChatGPT structure + OPUS type safety
//
// ═══════════════════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

// ═══════════════════════════════════════════════════════════════════════════════
//   ENTITY ID (opaque, validated upstream)
// ═══════════════════════════════════════════════════════════════════════════════

/// Entity IDs are opaque strings validated by ValidatedEntityId
/// Format: TYPE:IDENTIFIER (e.g., "CHAR:VICK", "LOC:PARIS")
pub type EntityId = String;

// ═══════════════════════════════════════════════════════════════════════════════
//   GENESIS REQUEST (INPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/// GENESIS Request — Main input for planning
/// 
/// All fields are mandatory (NASA-grade: no implicit defaults)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GenesisRequest {
    /// Unique saga identifier (e.g., "SAGA:RIVIERA_TOME1")
    pub saga_id: String,
    
    /// Deterministic seed — same seed = same plan
    pub seed: u64,
    
    /// Planning target constraints
    pub target: PlanTarget,
    
    /// Additional constraints (BTreeMap for stable ordering)
    pub constraints: BTreeMap<String, Value>,
    
    /// CANON entities to read (must be non-empty)
    pub canon_read_scope: Vec<EntityId>,
    
    /// Voice profile reference (must be non-empty)
    pub voice_profile_ref: String,
    
    /// Arc specification (story structure)
    pub arc_spec: ArcSpec,
    
    /// Continuity claims to enforce (must be non-empty)
    pub continuity_claims: Vec<ContinuityClaim>,
    
    /// Request metadata
    pub metadata: GenesisMetadata,
}

/// Request metadata (timestamps, version)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GenesisMetadata {
    /// Schema version (e.g., "GENESIS/1.1.0")
    pub schema_version: String,
    
    /// Creation timestamp (ISO-8601) — injected, not wall-clock
    pub created_utc: String,
    
    /// Last update timestamp (ISO-8601)
    pub updated_utc: String,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   PLAN TARGET
// ═══════════════════════════════════════════════════════════════════════════════

/// Target constraints for planning
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PlanTarget {
    /// Desired number of scenes
    pub scenes: u32,
    
    /// Approximate average words per scene (planning hint)
    pub avg_words: u32,
    
    /// Minimum words per scene (hard constraint)
    pub min_words: u32,
    
    /// Maximum words per scene (hard constraint)
    pub max_words: u32,
    
    /// If true, enforce Setup/Confrontation/Payoff for ≥3 scenes
    pub require_beats: bool,
    
    /// Optional tone hint (e.g., "dramatic", "comedic")
    pub tone_hint: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   ARC SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Arc specification — high-level story structure
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ArcSpec {
    /// Arc title (e.g., "Tome 1: L'Éveil")
    pub title: String,
    
    /// Story premise (1-2 sentences)
    pub premise: String,
    
    /// Number of acts (typical: 3)
    pub act_count: u8,
    
    /// Major turning points (deterministic ordering)
    pub major_turns: Vec<String>,
    
    /// Stakes description
    pub stakes: String,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   CONTINUITY CLAIM
// ═══════════════════════════════════════════════════════════════════════════════

/// Continuity claim — fact to enforce across scenes
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContinuityClaim {
    /// Unique claim identifier (must be unique within request)
    pub claim_id: String,
    
    /// Entity this claim applies to
    pub entity_id: EntityId,
    
    /// Attribute key (e.g., "age", "eye_color", "status")
    pub key: String,
    
    /// Expected value (canonical JSON)
    pub expected: Value,
    
    /// Severity level (P0-CRITICAL, P1-HIGH, P2-MEDIUM, P3-LOW)
    pub severity: String,
    
    /// Human-readable note
    pub note: String,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   GENESIS PLAN (OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/// GENESIS Plan — Main output
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GenesisPlan {
    /// Unique plan identifier (derived from hashes)
    pub plan_id: String,
    
    /// Hash of canonical request (for verification)
    pub request_hash: String,
    
    /// Generated scene specifications (SCRIBE-compatible)
    pub scene_specs: Vec<SceneSpec>,
    
    /// Cryptographic proof (anti-tamper)
    pub plan_proof: GenesisProof,
    
    /// Staged facts for CANON (read-only proposals)
    pub staged_facts: Vec<StagedFact>,
    
    /// Non-fatal warnings
    pub warnings: Vec<Warning>,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   SCENE SPECIFICATION (SCRIBE-COMPATIBLE)
// ═══════════════════════════════════════════════════════════════════════════════

/// Scene specification — SCRIBE-compatible
/// 
/// GENESIS injects GOAL/CONFLICT/OUTCOME_HINT + CONTINUITY into `instructions`
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SceneSpec {
    /// Scene index (0-based)
    pub index: u32,
    
    /// Point of view (e.g., "third_limited", "first_person")
    pub pov: String,
    
    /// Tense (e.g., "past", "present")
    pub tense: String,
    
    /// Tone (e.g., "dramatic", "tense", "comedic")
    pub tone: String,
    
    /// CANON entities to read for this scene
    pub canon_read_scope: Vec<EntityId>,
    
    /// Length constraints
    pub length: LengthSpec,
    
    /// Structured planning payload (contains GOAL, CONFLICT, OUTCOME_HINT, CONTINUITY)
    pub instructions: String,
    
    /// Beat kind for this scene
    pub beat_kind: String,
    
    /// Beat label (e.g., "SETUP", "CONFRONTATION-1")
    pub beat_label: String,
}

/// Length specification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LengthSpec {
    pub min: u32,
    pub max: u32,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   GENESIS PROOF (ANTI-TAMPER)
// ═══════════════════════════════════════════════════════════════════════════════

/// Cryptographic proof for plan integrity
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GenesisProof {
    /// Seed used for generation
    pub seed: u64,
    
    /// Hash of canonical request
    pub canonical_request_hash: String,
    
    /// Hash chain for all scenes
    pub scene_hash_chain: Vec<HashLink>,
    
    /// Manifest with computed hashes
    pub manifest_sha256: BTreeMap<String, String>,
    
    /// Creation timestamp (from request metadata, not wall-clock)
    pub created_utc: String,
}

/// Single link in the hash chain
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HashLink {
    /// Scene index
    pub index: u32,
    
    /// Hash of this scene's content
    pub scene_hash: String,
    
    /// Previous link's chain_hash (or ROOT for index 0)
    pub prev_hash: String,
    
    /// Combined hash: H(prev_hash || scene_hash)
    pub chain_hash: String,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   STAGED FACT (CANON PROPOSAL)
// ═══════════════════════════════════════════════════════════════════════════════

/// Staged fact — proposed fact for CANON (never auto-committed)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StagedFact {
    /// Entity this fact applies to
    pub entity_id: EntityId,
    
    /// Attribute key
    pub key: String,
    
    /// Proposed value
    pub value: Value,
    
    /// Rationale for this proposal
    pub rationale: String,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   WARNING
// ═══════════════════════════════════════════════════════════════════════════════

/// Non-fatal warning (deterministic)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Warning {
    /// Warning code (e.g., "GENESIS-W001")
    pub code: String,
    
    /// Human-readable message
    pub message: String,
    
    /// Severity (LOW, MEDIUM, HIGH)
    pub severity: String,
    
    /// Additional context (ordered for determinism)
    pub context: BTreeMap<String, String>,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   BEAT (INTERNAL)
// ═══════════════════════════════════════════════════════════════════════════════

/// Beat kind for narrative structure
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum BeatKind {
    /// Story setup, status quo establishment
    Setup,
    /// Rising action, obstacles
    Confrontation,
    /// Resolution, climax
    Payoff,
    /// Transition between major beats
    Bridge,
}

impl BeatKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            BeatKind::Setup => "SETUP",
            BeatKind::Confrontation => "CONFRONTATION",
            BeatKind::Payoff => "PAYOFF",
            BeatKind::Bridge => "BRIDGE",
        }
    }
}

impl std::fmt::Display for BeatKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Beat structure for planning
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Beat {
    /// Beat kind
    pub kind: BeatKind,
    
    /// Beat label (e.g., "SETUP", "BRIDGE-2")
    pub label: String,
    
    /// Scene goal
    pub goal: String,
    
    /// Conflict/tension
    pub conflict: String,
    
    /// Expected outcome hint
    pub outcome_hint: String,
    
    /// Entities to focus on
    pub canon_focus: Vec<EntityId>,
}

// ═══════════════════════════════════════════════════════════════════════════════
//   CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Root hash for chain (64 zeros)
pub const CHAIN_ROOT_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";

/// Current schema version
pub const SCHEMA_VERSION: &str = "GENESIS/1.1.0";
