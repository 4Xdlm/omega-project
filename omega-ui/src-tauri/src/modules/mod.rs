pub mod canon;
pub mod canon_guard;
pub mod intake;
pub mod registry;
pub mod analyzer_mode;
pub mod emotion_analyzer;

// Re-exports pour aerospace_tests
pub use canon_guard::{CanonGuardPass, get_canon_rules};
pub use intake::IntakePass;
pub use analyzer_mode::AnalyzerMode;
pub use emotion_analyzer::{EmotionAnalyzer, create_analyzer, AnalysisResult, EmotionResult};

// Re-export CANON (types viennent de interfaces)
pub use canon::CanonJsonStore;
pub use crate::interfaces::canon::{CanonFact, CanonError, FactSource, LockLevel};
pub mod voice;
pub mod voice_hybrid;
