//! VOICE_HYBRID Modules v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Implémentation du module VOICE_HYBRID (surcouche IA de VOICE v1)
//! 
//! Composants:
//! - errors: Erreurs typées
//! - replay_store: Stockage Record/Replay avec hash anti-tamper
//! - prompt_builder: Construction de guidance déterministe
//! - scoring: Calcul de score de conformité
//! - hybrid: Orchestrateur principal
//! - canon_mapping: Nomenclature entity/key CANON
//! - canon_bridge: Pont vers CANON v1
//! - mock_provider: Provider LLM mock pour tests
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

pub mod errors;
pub mod replay_store;
pub mod prompt_builder;
pub mod scoring;
pub mod hybrid;
pub mod canon_mapping;
pub mod canon_bridge;
pub mod mock_provider;

// Re-exports pour accès simplifié
pub use errors::VoiceHybridError;
pub use replay_store::{JsonFileReplayStore, InMemoryReplayStore};
pub use prompt_builder::PromptBuilder;
pub use scoring::VoiceScoring;
pub use hybrid::HybridVoiceAnalyzer;
pub use canon_bridge::{VoiceCanonBridge, CanonWriter, InMemoryCanonWriter};
pub use mock_provider::{MockLlmProvider, RecordingMockProvider};
