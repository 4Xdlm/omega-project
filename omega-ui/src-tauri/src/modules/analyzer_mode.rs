//! OMEGA Sprint C — Analyzer Modes
//! 3 modes d'analyse certifiés

use serde::{Deserialize, Serialize};

/// Mode d'analyse émotionnelle
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum AnalyzerMode {
    /// Lexicon only - 100% déterministe, 0 appel IA
    #[default]
    Deterministic,
    
    /// Lexicon + IA si ambiguïté/seuil
    Hybrid,
    
    /// IA always-on, Lexicon en baseline
    Boost,
}

impl std::fmt::Display for AnalyzerMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Deterministic => write!(f, "deterministic"),
            Self::Hybrid => write!(f, "hybrid"),
            Self::Boost => write!(f, "boost"),
        }
    }
}

impl AnalyzerMode {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "hybrid" => Self::Hybrid,
            "boost" => Self::Boost,
            _ => Self::Deterministic,
        }
    }
    
    pub fn uses_ai(&self) -> bool {
        matches!(self, Self::Hybrid | Self::Boost)
    }
    
    pub fn is_deterministic(&self) -> bool {
        matches!(self, Self::Deterministic)
    }
}
