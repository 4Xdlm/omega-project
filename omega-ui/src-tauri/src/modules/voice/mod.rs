//! OMEGA VOICE — Modules
//! NASA-Grade AS9100D

pub mod canonicalize;
pub mod core_stats;
pub mod lexicons;

#[cfg(test)]
mod protocol_tests;

pub use canonicalize::{canonicalize_text, compute_corpus_hash, build_profile_id};
pub use core_stats::StatsVoiceAnalyzer;
