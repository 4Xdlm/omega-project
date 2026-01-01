//! VOICE_HYBRID Interfaces v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Module d'interfaces pour VOICE_HYBRID (surcouche IA de VOICE v1)
//! 
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

pub mod contract;
pub mod policy;
pub mod replay;

// Re-exports pour accès simplifié
pub use contract::{
    LlmProvider,
    VoiceHybridAnalyzer,
    VoiceHybridConfig,
    VoiceHybridGuidance,
    VoiceHybridResult,
    // Types VOICE v1 ré-exportés
    VoiceConfig,
    VoiceAnalysisResult,
    VoiceProfile,
    VoiceMetric,
    VoiceDimension,
    VoiceLock,
    VoiceAnalyzer,
    VoiceError,
};

pub use policy::{
    MetricTarget,
    SignatureMarker,
    VoiceHybridPolicy,
};

pub use replay::{
    ReplayMode,
    ReplayStore,
    ReplayVerification,
    VoiceHybridReplayRecord,
};
