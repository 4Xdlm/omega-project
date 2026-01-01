// ═══════════════════════════════════════════════════════════════════════════════
//
//   GENESIS INTERFACES MODULE
//   Version: 1.1.0-FUSION
//
// ═══════════════════════════════════════════════════════════════════════════════

pub mod contract;

// Re-export all public types
pub use contract::{
    // Request types
    GenesisRequest,
    GenesisMetadata,
    PlanTarget,
    ArcSpec,
    ContinuityClaim,
    
    // Output types
    GenesisPlan,
    SceneSpec,
    LengthSpec,
    GenesisProof,
    HashLink,
    StagedFact,
    Warning,
    
    // Beat types
    Beat,
    BeatKind,
    
    // Type aliases
    EntityId,
    
    // Constants
    CHAIN_ROOT_HASH,
    SCHEMA_VERSION,
};
