// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS MODULE — DETERMINISTIC NARRATIVE PLANNER
//   Version: 1.1.0-FUSION
//   Standard: DO-178C / AS9100D / SpaceX Flight Software
//
// ═══════════════════════════════════════════════════════════════════════════════
//
//   ENTRY POINT: genesis_plan()
//
//   Pipeline:
//   1. Validate request (all fields, types, bounds)
//   2. Canonicalize request (NFKC, stable ordering)
//   3. Hash canonical request
//   4. Generate beats (Setup → Confrontation → Payoff)
//   5. Convert beats to SceneSpecs
//   6. Validate SceneSpecs (SCRIBE compatibility)
//   7. Build proof (hash chain)
//   8. Return GenesisPlan
//
// ═══════════════════════════════════════════════════════════════════════════════

pub mod beats;
pub mod canonicalize;
pub mod crypto;
pub mod errors;
pub mod export;
pub mod golden;
pub mod planner;
pub mod proof;
pub mod request_hash;
pub mod validation;

pub use errors::{GenesisError, GenesisResult, GenesisWarning, WarningSeverity};

use crate::genesis::interfaces::genesis::{GenesisPlan, GenesisRequest};

/// GENESIS entry point — deterministic narrative planner
/// 
/// # Guarantees (Invariants)
/// 
/// - I02: Same input → same request_hash (100 runs)
/// - I03: Same seed + request → same plan (bit-for-bit)
/// - I05: All SceneSpecs pass SCRIBE validator
/// - I08: ≥3 scenes → Setup/Confrontation/Payoff present
/// - I11: Hash chain integrity (tamper detected)
/// 
/// # Errors
/// 
/// Returns `GenesisError` with typed code on any validation failure.
/// 
/// # Example
/// 
/// ```ignore
/// let request = GenesisRequest { /* ... */ };
/// let plan = genesis_plan(&request)?;
/// assert!(proof::verify_plan_proof(&plan).is_ok());
/// ```
pub fn genesis_plan(request: &GenesisRequest) -> GenesisResult<GenesisPlan> {
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1: Validate request
    // ─────────────────────────────────────────────────────────────────────────
    validation::validate_request(request)?;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2: Canonicalize request
    // ─────────────────────────────────────────────────────────────────────────
    let canonical = canonicalize::canonicalize_request(request)?;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 3: Hash canonical request
    // ─────────────────────────────────────────────────────────────────────────
    let request_hash = request_hash::hash_canonical_request(&canonical);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: Generate beats
    // ─────────────────────────────────────────────────────────────────────────
    let (beats, warnings_beats) = beats::generate_beats(request)?;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 5: Convert beats to SceneSpecs
    // ─────────────────────────────────────────────────────────────────────────
    let (scene_specs, warnings_planner) = planner::beats_to_scene_specs(request, &beats)?;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 6: Validate SceneSpecs
    // ─────────────────────────────────────────────────────────────────────────
    validation::validate_scene_specs(request, &scene_specs, &beats)?;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 7: Build proof
    // ─────────────────────────────────────────────────────────────────────────
    let proof = proof::build_proof(
        request.seed,
        &request_hash,
        &request.metadata.created_utc,
        &scene_specs,
    )?;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 8: Assemble plan
    // ─────────────────────────────────────────────────────────────────────────
    let plan_id = proof
        .manifest_sha256
        .get("plan_id")
        .cloned()
        .unwrap_or_else(|| request_hash.clone());

    let mut warnings = Vec::new();
    warnings.extend(warnings_beats);
    warnings.extend(warnings_planner);

    Ok(GenesisPlan {
        plan_id,
        request_hash,
        scene_specs,
        plan_proof: proof,
        staged_facts: Vec::new(), // v1.1: empty, structure frozen
        warnings: warnings
            .into_iter()
            .map(|w| crate::genesis::interfaces::genesis::Warning {
                code: w.code,
                message: w.message,
                severity: w.severity.as_str().to_string(),
                context: w.context.into_iter().collect(),
            })
            .collect(),
    })
}

/// Verify a plan's proof integrity
/// 
/// Delegates to `proof::verify_plan_proof`
pub fn verify_plan(plan: &GenesisPlan) -> GenesisResult<()> {
    proof::verify_plan_proof(plan)
}
