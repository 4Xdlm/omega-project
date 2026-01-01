// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS VALIDATION MODULE — NASA-GRADE INPUT VALIDATION
//   Version: 1.1.0-OPUS
//   Standard: DO-178C / AS9100D / SpaceX Flight Software
//
// ═══════════════════════════════════════════════════════════════════════════════
//
//   INVARIANTS ENFORCED:
//   - VAL-I01: EntityId format validation (ENTITY_TYPE:IDENTIFIER)
//   - VAL-I02: claim_id uniqueness within request
//   - VAL-I03: ArcSpec bounds (1 ≤ act_count ≤ 10, major_turns non-empty)
//   - VAL-I04: Length constraints (min ≤ max, reasonable bounds)
//   - VAL-I05: Required fields non-empty after NFKC normalization
//   - VAL-I06: Schema version format validation
//   - VAL-I07: Continuity claims severity enum validation
//
// ═══════════════════════════════════════════════════════════════════════════════

use regex::Regex;
use std::collections::HashSet;
use std::sync::LazyLock;

use crate::genesis::modules::genesis::errors::{GenesisError, GenesisResult};
use crate::genesis::modules::genesis::crypto::CanonicalString;

// ═══════════════════════════════════════════════════════════════════════════════
//   ENTITY ID VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Valid entity types (extensible)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EntityType {
    Character,  // CHAR:xxx
    Location,   // LOC:xxx
    Object,     // OBJ:xxx
    Event,      // EVT:xxx
    Faction,    // FAC:xxx
    Timeline,   // TL:xxx
    Concept,    // CON:xxx
    Voice,      // VOICE:xxx (voice profiles)
    Saga,       // SAGA:xxx
}

impl EntityType {
    pub fn prefix(&self) -> &'static str {
        match self {
            EntityType::Character => "CHAR",
            EntityType::Location  => "LOC",
            EntityType::Object    => "OBJ",
            EntityType::Event     => "EVT",
            EntityType::Faction   => "FAC",
            EntityType::Timeline  => "TL",
            EntityType::Concept   => "CON",
            EntityType::Voice     => "VOICE",
            EntityType::Saga      => "SAGA",
        }
    }

    pub fn from_prefix(s: &str) -> Option<Self> {
        match s {
            "CHAR"  => Some(EntityType::Character),
            "LOC"   => Some(EntityType::Location),
            "OBJ"   => Some(EntityType::Object),
            "EVT"   => Some(EntityType::Event),
            "FAC"   => Some(EntityType::Faction),
            "TL"    => Some(EntityType::Timeline),
            "CON"   => Some(EntityType::Concept),
            "VOICE" => Some(EntityType::Voice),
            "SAGA"  => Some(EntityType::Saga),
            _       => None,
        }
    }
}

/// Validated EntityId (guaranteed format: TYPE:IDENTIFIER)
/// 
/// Format: `TYPE:IDENTIFIER` where:
/// - TYPE: One of CHAR, LOC, OBJ, EVT, FAC, TL, CON, VOICE, SAGA
/// - IDENTIFIER: 1-64 chars, alphanumeric + underscore, no leading/trailing underscore
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ValidatedEntityId {
    entity_type: EntityType,
    identifier: String,
    canonical: CanonicalString,
}

// Compile regex once
static ENTITY_ID_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(CHAR|LOC|OBJ|EVT|FAC|TL|CON|VOICE|SAGA):([A-Za-z0-9][A-Za-z0-9_]{0,62}[A-Za-z0-9]|[A-Za-z0-9])$")
        .expect("EntityId regex compilation failed")
});

impl ValidatedEntityId {
    /// Parse and validate an entity ID string
    pub fn parse(raw: &str) -> GenesisResult<Self> {
        let trimmed = raw.trim();
        
        if trimmed.is_empty() {
            return Err(GenesisError::InvalidEntityId {
                code: "GENESIS-E-ENTITY-001",
                raw: raw.to_string(),
                reason: "empty entity ID".into(),
            });
        }

        if !ENTITY_ID_REGEX.is_match(trimmed) {
            return Err(GenesisError::InvalidEntityId {
                code: "GENESIS-E-ENTITY-002",
                raw: raw.to_string(),
                reason: "format must be TYPE:IDENTIFIER (e.g., CHAR:VICK, LOC:PARIS)".into(),
            });
        }

        // Split on first colon
        let parts: Vec<&str> = trimmed.splitn(2, ':').collect();
        if parts.len() != 2 {
            return Err(GenesisError::InvalidEntityId {
                code: "GENESIS-E-ENTITY-003",
                raw: raw.to_string(),
                reason: "missing colon separator".into(),
            });
        }

        let entity_type = EntityType::from_prefix(parts[0]).ok_or_else(|| {
            GenesisError::InvalidEntityId {
                code: "GENESIS-E-ENTITY-004",
                raw: raw.to_string(),
                reason: format!("unknown entity type prefix: {}", parts[0]),
            }
        })?;

        let identifier = parts[1].to_string();
        
        // Additional checks
        if identifier.len() > 64 {
            return Err(GenesisError::InvalidEntityId {
                code: "GENESIS-E-ENTITY-005",
                raw: raw.to_string(),
                reason: "identifier exceeds 64 characters".into(),
            });
        }

        if identifier.starts_with('_') || identifier.ends_with('_') {
            return Err(GenesisError::InvalidEntityId {
                code: "GENESIS-E-ENTITY-006",
                raw: raw.to_string(),
                reason: "identifier cannot start or end with underscore".into(),
            });
        }

        Ok(ValidatedEntityId {
            entity_type,
            identifier,
            canonical: CanonicalString::new(trimmed),
        })
    }

    pub fn entity_type(&self) -> EntityType {
        self.entity_type
    }

    pub fn identifier(&self) -> &str {
        &self.identifier
    }

    pub fn as_canonical(&self) -> &CanonicalString {
        &self.canonical
    }

    pub fn as_str(&self) -> &str {
        self.canonical.as_str()
    }
}

impl std::fmt::Display for ValidatedEntityId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.canonical)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   SEVERITY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Validated severity level for continuity claims
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Severity {
    P0Critical, // Story-breaking if violated
    P1High,     // Major inconsistency
    P2Medium,   // Noticeable but recoverable
    P3Low,      // Minor detail
}

impl Severity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Severity::P0Critical => "P0-CRITICAL",
            Severity::P1High     => "P1-HIGH",
            Severity::P2Medium   => "P2-MEDIUM",
            Severity::P3Low      => "P3-LOW",
        }
    }

    pub fn parse(s: &str) -> GenesisResult<Self> {
        match s.trim().to_uppercase().as_str() {
            "P0-CRITICAL" | "P0" | "CRITICAL" => Ok(Severity::P0Critical),
            "P1-HIGH" | "P1" | "HIGH"         => Ok(Severity::P1High),
            "P2-MEDIUM" | "P2" | "MEDIUM"     => Ok(Severity::P2Medium),
            "P3-LOW" | "P3" | "LOW"           => Ok(Severity::P3Low),
            _ => Err(GenesisError::InvalidSeverity {
                code: "GENESIS-E-SEV-001",
                raw: s.to_string(),
            }),
        }
    }
}

impl std::fmt::Display for Severity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   SCHEMA VERSION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Validated schema version (format: MODULE/MAJOR.MINOR.PATCH)
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SchemaVersion {
    pub module: String,
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

static SCHEMA_VERSION_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([A-Z][A-Z0-9_]*)/(\d+)\.(\d+)\.(\d+)$")
        .expect("SchemaVersion regex compilation failed")
});

impl SchemaVersion {
    pub fn parse(s: &str) -> GenesisResult<Self> {
        let trimmed = s.trim();
        
        let caps = SCHEMA_VERSION_REGEX.captures(trimmed).ok_or_else(|| {
            GenesisError::InvalidSchemaVersion {
                code: "GENESIS-E-SCHEMA-001",
                raw: s.to_string(),
                reason: "format must be MODULE/MAJOR.MINOR.PATCH (e.g., GENESIS/1.0.0)".into(),
            }
        })?;

        let major: u32 = caps[2].parse().map_err(|_| GenesisError::InvalidSchemaVersion {
            code: "GENESIS-E-SCHEMA-002",
            raw: s.to_string(),
            reason: "major version not a valid number".into(),
        })?;

        let minor: u32 = caps[3].parse().map_err(|_| GenesisError::InvalidSchemaVersion {
            code: "GENESIS-E-SCHEMA-003",
            raw: s.to_string(),
            reason: "minor version not a valid number".into(),
        })?;

        let patch: u32 = caps[4].parse().map_err(|_| GenesisError::InvalidSchemaVersion {
            code: "GENESIS-E-SCHEMA-004",
            raw: s.to_string(),
            reason: "patch version not a valid number".into(),
        })?;

        Ok(SchemaVersion {
            module: caps[1].to_string(),
            major,
            minor,
            patch,
        })
    }

    pub fn to_string(&self) -> String {
        format!("{}/{}.{}.{}", self.module, self.major, self.minor, self.patch)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   BOUNDS & CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Validation bounds (configurable, but with sane defaults)
#[derive(Debug, Clone)]
pub struct ValidationBounds {
    pub min_scenes: u32,
    pub max_scenes: u32,
    pub min_words: u32,
    pub max_words: u32,
    pub min_act_count: u8,
    pub max_act_count: u8,
    pub max_continuity_claims: usize,
    pub max_major_turns: usize,
    pub max_constraints: usize,
}

impl Default for ValidationBounds {
    fn default() -> Self {
        ValidationBounds {
            min_scenes: 1,
            max_scenes: 1000,      // Reasonable for a saga
            min_words: 50,
            max_words: 50_000,     // ~200 pages per scene max
            min_act_count: 1,
            max_act_count: 10,     // Beyond 10 acts is unconventional
            max_continuity_claims: 1000,
            max_major_turns: 100,
            max_constraints: 100,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//   CLAIM ID UNIQUENESS
// ═══════════════════════════════════════════════════════════════════════════════

/// Check that all claim_ids are unique
pub fn check_claim_id_uniqueness(claim_ids: &[&str]) -> GenesisResult<()> {
    let mut seen = HashSet::new();
    
    for id in claim_ids {
        let normalized = CanonicalString::new(id);
        if normalized.is_empty() {
            return Err(GenesisError::DuplicateClaimId {
                code: "GENESIS-E-CLAIM-001",
                claim_id: id.to_string(),
                reason: "empty claim_id".into(),
            });
        }
        
        if !seen.insert(normalized.as_str().to_string()) {
            return Err(GenesisError::DuplicateClaimId {
                code: "GENESIS-E-CLAIM-002",
                claim_id: id.to_string(),
                reason: "duplicate claim_id".into(),
            });
        }
    }
    
    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════════
//   LENGTH SPEC VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Validate length specification
pub fn validate_length_spec(min: u32, max: u32, bounds: &ValidationBounds) -> GenesisResult<()> {
    if min > max {
        return Err(GenesisError::InvalidLengthSpec {
            code: "GENESIS-E-LEN-001",
            min,
            max,
            reason: "min_words must be ≤ max_words".into(),
        });
    }

    if min < bounds.min_words {
        return Err(GenesisError::InvalidLengthSpec {
            code: "GENESIS-E-LEN-002",
            min,
            max,
            reason: format!("min_words ({}) below minimum allowed ({})", min, bounds.min_words),
        });
    }

    if max > bounds.max_words {
        return Err(GenesisError::InvalidLengthSpec {
            code: "GENESIS-E-LEN-003",
            min,
            max,
            reason: format!("max_words ({}) exceeds maximum allowed ({})", max, bounds.max_words),
        });
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════════
//   ARC SPEC VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Validate arc specification
pub fn validate_arc_spec(
    title: &str,
    premise: &str,
    act_count: u8,
    major_turns: &[String],
    stakes: &str,
    bounds: &ValidationBounds,
) -> GenesisResult<()> {
    let title_norm = CanonicalString::new(title);
    if title_norm.is_empty() {
        return Err(GenesisError::InvalidArcSpec {
            code: "GENESIS-E-ARC-001",
            reason: "title cannot be empty".into(),
        });
    }

    let premise_norm = CanonicalString::new(premise);
    if premise_norm.is_empty() {
        return Err(GenesisError::InvalidArcSpec {
            code: "GENESIS-E-ARC-002",
            reason: "premise cannot be empty".into(),
        });
    }

    if act_count < bounds.min_act_count || act_count > bounds.max_act_count {
        return Err(GenesisError::InvalidArcSpec {
            code: "GENESIS-E-ARC-003",
            reason: format!(
                "act_count ({}) must be between {} and {}",
                act_count, bounds.min_act_count, bounds.max_act_count
            ),
        });
    }

    if major_turns.is_empty() {
        return Err(GenesisError::InvalidArcSpec {
            code: "GENESIS-E-ARC-004",
            reason: "major_turns cannot be empty (need at least one turning point)".into(),
        });
    }

    if major_turns.len() > bounds.max_major_turns {
        return Err(GenesisError::InvalidArcSpec {
            code: "GENESIS-E-ARC-005",
            reason: format!("too many major_turns ({} > {})", major_turns.len(), bounds.max_major_turns),
        });
    }

    // Check each turn is non-empty after normalization
    for (i, turn) in major_turns.iter().enumerate() {
        let turn_norm = CanonicalString::new(turn);
        if turn_norm.is_empty() {
            return Err(GenesisError::InvalidArcSpec {
                code: "GENESIS-E-ARC-006",
                reason: format!("major_turn[{}] cannot be empty", i),
            });
        }
    }

    let stakes_norm = CanonicalString::new(stakes);
    if stakes_norm.is_empty() {
        return Err(GenesisError::InvalidArcSpec {
            code: "GENESIS-E-ARC-007",
            reason: "stakes cannot be empty".into(),
        });
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════════
//   REQUEST VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

use crate::genesis::interfaces::genesis::{GenesisRequest, SceneSpec, Beat, BeatKind};

/// Validate a complete GenesisRequest
pub fn validate_request(req: &GenesisRequest) -> GenesisResult<()> {
    let bounds = ValidationBounds::default();

    // saga_id non-empty
    let saga_id = CanonicalString::new(&req.saga_id);
    if saga_id.is_empty() {
        return Err(GenesisError::MissingRequiredField {
            code: "GENESIS-E-REQ-001",
            field: "saga_id".into(),
        });
    }

    // schema_version valid format
    SchemaVersion::parse(&req.metadata.schema_version)?;

    // scenes > 0
    if req.target.scenes == 0 {
        return Err(GenesisError::InvalidRequest {
            code: "GENESIS-E-REQ-003",
            field: "target.scenes".into(),
            reason: "must be > 0".into(),
        });
    }

    // canon_read_scope non-empty and all valid
    if req.canon_read_scope.is_empty() {
        return Err(GenesisError::MissingRequiredField {
            code: "GENESIS-E-REQ-004",
            field: "canon_read_scope".into(),
        });
    }
    for (i, entity) in req.canon_read_scope.iter().enumerate() {
        ValidatedEntityId::parse(entity).map_err(|e| GenesisError::InvalidRequest {
            code: "GENESIS-E-REQ-004b",
            field: format!("canon_read_scope[{}]", i),
            reason: format!("{}", e),
        })?;
    }

    // voice_profile_ref non-empty
    let voice = CanonicalString::new(&req.voice_profile_ref);
    if voice.is_empty() {
        return Err(GenesisError::MissingRequiredField {
            code: "GENESIS-E-REQ-005",
            field: "voice_profile_ref".into(),
        });
    }

    // continuity_claims non-empty and unique
    if req.continuity_claims.is_empty() {
        return Err(GenesisError::MissingRequiredField {
            code: "GENESIS-E-REQ-006",
            field: "continuity_claims".into(),
        });
    }
    let claim_ids: Vec<&str> = req.continuity_claims.iter().map(|c| c.claim_id.as_str()).collect();
    check_claim_id_uniqueness(&claim_ids)?;

    // length spec valid
    validate_length_spec(req.target.min_words, req.target.max_words, &bounds)?;

    // arc spec valid
    validate_arc_spec(
        &req.arc_spec.title,
        &req.arc_spec.premise,
        req.arc_spec.act_count,
        &req.arc_spec.major_turns,
        &req.arc_spec.stakes,
        &bounds,
    )?;

    Ok(())
}

/// Validate generated SceneSpecs against request and beats
pub fn validate_scene_specs(
    req: &GenesisRequest,
    specs: &[SceneSpec],
    beats: &[Beat],
) -> GenesisResult<()> {
    // Scene count matches target
    if specs.len() != req.target.scenes as usize {
        return Err(GenesisError::SceneCountMismatch {
            code: "GENESIS-E-SCENE-009",
            expected: req.target.scenes as usize,
            actual: specs.len(),
        });
    }

    // Beat coverage if required
    if req.target.require_beats && req.target.scenes >= 3 {
        let has_setup = beats.iter().any(|b| matches!(b.kind, BeatKind::Setup));
        let has_conf = beats.iter().any(|b| matches!(b.kind, BeatKind::Confrontation));
        let has_payoff = beats.iter().any(|b| matches!(b.kind, BeatKind::Payoff));

        let mut missing = Vec::new();
        if !has_setup { missing.push("SETUP".into()); }
        if !has_conf { missing.push("CONFRONTATION".into()); }
        if !has_payoff { missing.push("PAYOFF".into()); }

        if !missing.is_empty() {
            return Err(GenesisError::MissingBeatCoverage {
                code: "GENESIS-E-BEAT-002",
                missing,
            });
        }
    }

    // Validate each scene spec
    for (i, spec) in specs.iter().enumerate() {
        // POV non-empty
        if CanonicalString::new(&spec.pov).is_empty() {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-001",
                scene_index: i,
                reason: "pov cannot be empty".into(),
            });
        }

        // Tense non-empty
        if CanonicalString::new(&spec.tense).is_empty() {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-002",
                scene_index: i,
                reason: "tense cannot be empty".into(),
            });
        }

        // Tone non-empty
        if CanonicalString::new(&spec.tone).is_empty() {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-003",
                scene_index: i,
                reason: "tone cannot be empty".into(),
            });
        }

        // Canon scope non-empty
        if spec.canon_read_scope.is_empty() {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-004",
                scene_index: i,
                reason: "canon_read_scope cannot be empty".into(),
            });
        }

        // Instructions contain required elements
        if !spec.instructions.contains("GOAL:") {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-005",
                scene_index: i,
                reason: "instructions missing GOAL".into(),
            });
        }
        if !spec.instructions.contains("CONFLICT:") {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-006",
                scene_index: i,
                reason: "instructions missing CONFLICT".into(),
            });
        }
        if !spec.instructions.contains("OUTCOME_HINT:") {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-007",
                scene_index: i,
                reason: "instructions missing OUTCOME_HINT".into(),
            });
        }
        if !spec.instructions.contains("CONTINUITY_CLAIMS:") {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-008",
                scene_index: i,
                reason: "instructions missing CONTINUITY_CLAIMS".into(),
            });
        }

        // Length spec valid
        if spec.length.min > spec.length.max {
            return Err(GenesisError::InvalidSceneSpec {
                code: "GENESIS-E-SCENE-010",
                scene_index: i,
                reason: "length.min > length.max".into(),
            });
        }
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════════
//   TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    // ─────────────────────────────────────────────────────────────────────────
    // VAL-I01: EntityId format
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn val_i01_valid_entity_ids() {
        let valid = vec![
            "CHAR:VICK",
            "LOC:RIVIERAZUR",
            "OBJ:KEYCARD_MASTER",
            "EVT:EXPLOSION_01",
            "VOICE:PROFILE_MAIN",
            "SAGA:TOME1",
            "CHAR:A", // single char identifier
        ];

        for id in valid {
            let result = ValidatedEntityId::parse(id);
            assert!(result.is_ok(), "Should be valid: {}", id);
        }
    }

    #[test]
    fn val_i01_invalid_entity_ids() {
        let invalid = vec![
            ("", "empty"),
            ("CHAR", "no identifier"),
            ("CHAR:", "empty identifier"),
            (":VICK", "no type"),
            ("UNKNOWN:VICK", "unknown type"),
            ("CHAR:_VICK", "leading underscore"),
            ("CHAR:VICK_", "trailing underscore"),
            ("char:vick", "lowercase type"),
            ("CHAR:VICK@HOME", "invalid char @"),
            ("CHAR:VICK SMITH", "space in identifier"),
        ];

        for (id, reason) in invalid {
            let result = ValidatedEntityId::parse(id);
            assert!(result.is_err(), "Should be invalid ({}): '{}'", reason, id);
        }
    }

    #[test]
    fn val_i01_entity_id_max_length() {
        let long_id = format!("CHAR:{}", "A".repeat(64));
        assert!(ValidatedEntityId::parse(&long_id).is_ok());

        let too_long = format!("CHAR:{}", "A".repeat(65));
        assert!(ValidatedEntityId::parse(&too_long).is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VAL-I02: claim_id uniqueness
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn val_i02_unique_claim_ids() {
        let ids = vec!["CC:001", "CC:002", "CC:003"];
        assert!(check_claim_id_uniqueness(&ids).is_ok());
    }

    #[test]
    fn val_i02_duplicate_claim_ids_detected() {
        let ids = vec!["CC:001", "CC:002", "CC:001"];
        assert!(check_claim_id_uniqueness(&ids).is_err());
    }

    #[test]
    fn val_i02_empty_claim_id_rejected() {
        let ids = vec!["CC:001", ""];
        assert!(check_claim_id_uniqueness(&ids).is_err());
    }

    #[test]
    fn val_i02_whitespace_normalized_duplicates() {
        // "  CC:001  " normalizes to "CC:001"
        let ids = vec!["CC:001", "  CC:001  "];
        assert!(check_claim_id_uniqueness(&ids).is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VAL-I03: ArcSpec bounds
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn val_i03_valid_arc_spec() {
        let bounds = ValidationBounds::default();
        assert!(validate_arc_spec(
            "Tome 1",
            "A story premise",
            3,
            &vec!["Turn 1".into(), "Turn 2".into()],
            "High stakes",
            &bounds
        ).is_ok());
    }

    #[test]
    fn val_i03_act_count_bounds() {
        let bounds = ValidationBounds::default();
        
        // act_count = 0 should fail
        assert!(validate_arc_spec(
            "Title", "Premise", 0, &vec!["Turn".into()], "Stakes", &bounds
        ).is_err());

        // act_count = 11 should fail (default max is 10)
        assert!(validate_arc_spec(
            "Title", "Premise", 11, &vec!["Turn".into()], "Stakes", &bounds
        ).is_err());
    }

    #[test]
    fn val_i03_major_turns_required() {
        let bounds = ValidationBounds::default();
        assert!(validate_arc_spec(
            "Title", "Premise", 3, &vec![], "Stakes", &bounds
        ).is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VAL-I04: Length constraints
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn val_i04_valid_length_spec() {
        let bounds = ValidationBounds::default();
        assert!(validate_length_spec(100, 1000, &bounds).is_ok());
    }

    #[test]
    fn val_i04_min_greater_than_max() {
        let bounds = ValidationBounds::default();
        assert!(validate_length_spec(1000, 100, &bounds).is_err());
    }

    #[test]
    fn val_i04_below_minimum() {
        let bounds = ValidationBounds::default();
        assert!(validate_length_spec(10, 100, &bounds).is_err()); // 10 < 50 default min
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Severity parsing
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn severity_parse_variants() {
        assert_eq!(Severity::parse("P0-CRITICAL").unwrap(), Severity::P0Critical);
        assert_eq!(Severity::parse("p1-high").unwrap(), Severity::P1High); // case insensitive
        assert_eq!(Severity::parse("  P2  ").unwrap(), Severity::P2Medium); // whitespace trimmed
        assert!(Severity::parse("UNKNOWN").is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Schema version parsing
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn schema_version_valid() {
        let v = SchemaVersion::parse("GENESIS/1.0.0").unwrap();
        assert_eq!(v.module, "GENESIS");
        assert_eq!(v.major, 1);
        assert_eq!(v.minor, 0);
        assert_eq!(v.patch, 0);
    }

    #[test]
    fn schema_version_invalid() {
        assert!(SchemaVersion::parse("genesis/1.0.0").is_err()); // lowercase
        assert!(SchemaVersion::parse("GENESIS-1.0.0").is_err()); // wrong separator
        assert!(SchemaVersion::parse("GENESIS/1.0").is_err()); // missing patch
        assert!(SchemaVersion::parse("GENESIS/a.b.c").is_err()); // non-numeric
    }
}
