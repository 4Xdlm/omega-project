//! OMEGA VOICE — Contract (NASA-Grade AS9100D)
//! ═══════════════════════════════════════════════════════════════════════════════
//!
//! Contrat d'interface pour l'analyse stylistique 8D.
//! Types, traits, et structures de données.
//!
//! @invariant VOICE-I01: Même input + cfg → même profile_id (déterminisme)
//! @invariant VOICE-I02: Métriques triées par clé (stable)
//! @invariant VOICE-I03: Pas de NaN/Inf dans les métriques
//! @invariant VOICE-I04: Ratios ∈ [0.0, 1.0]
//! @invariant VOICE-I05: Canonicalisation idempotente
//! @invariant VOICE-I06: signature_tokens uniques et triés
//! @invariant VOICE-I07: corpus_hash = SHA256(canonical_text)
//!
//! @version VOICE_v1.0.0
//! @certification AEROSPACE_GRADE

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use super::errors::VoiceError;

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Niveau de verrouillage d'une métrique
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum VoiceLock {
    /// Modifiable avec tolérances (métriques statistiques)
    Soft,
    /// Identité stable, inviolable (signature auteur)
    Hard,
}

impl Default for VoiceLock {
    fn default() -> Self {
        Self::Soft
    }
}

/// Les 8 dimensions de style VOICE
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash, Ord, PartialOrd)]
pub enum VoiceDimension {
    /// D1: Rythme (longueur phrases, variance, ponctuation)
    D1Rhythm,
    /// D2: Vocabulaire (richesse, complexité, rareté)
    D2Vocabulary,
    /// D3: Texture (adj/verbes, sensoriel, show/tell)
    D3Texture,
    /// D4: Tonalité (sentiment pos/neg/neu)
    D4Tonality,
    /// D5: Structure (openers, connecteurs, répétitions)
    D5Structure,
    /// D6: Signature (tokens identitaires, tics)
    D6Signature,
    /// D7: Cadence (dialogue/narration, paragraphes)
    D7Cadence,
    /// D8: Figures (questions rhétoriques, parenthèses, ellipses)
    D8Figures,
}

impl VoiceDimension {
    /// Retourne le préfixe de clé pour cette dimension
    pub fn prefix(&self) -> &'static str {
        match self {
            Self::D1Rhythm => "D1",
            Self::D2Vocabulary => "D2",
            Self::D3Texture => "D3",
            Self::D4Tonality => "D4",
            Self::D5Structure => "D5",
            Self::D6Signature => "D6",
            Self::D7Cadence => "D7",
            Self::D8Figures => "D8",
        }
    }

    /// Retourne le nom complet
    pub fn name(&self) -> &'static str {
        match self {
            Self::D1Rhythm => "Rhythm",
            Self::D2Vocabulary => "Vocabulary",
            Self::D3Texture => "Texture",
            Self::D4Tonality => "Tonality",
            Self::D5Structure => "Structure",
            Self::D6Signature => "Signature",
            Self::D7Cadence => "Cadence",
            Self::D8Figures => "Figures",
        }
    }

    /// Retourne toutes les dimensions (D1-D8)
    pub fn all() -> &'static [VoiceDimension] {
        &[
            Self::D1Rhythm,
            Self::D2Vocabulary,
            Self::D3Texture,
            Self::D4Tonality,
            Self::D5Structure,
            Self::D6Signature,
            Self::D7Cadence,
            Self::D8Figures,
        ]
    }

    /// Retourne les dimensions core (D1-D6)
    pub fn core() -> &'static [VoiceDimension] {
        &[
            Self::D1Rhythm,
            Self::D2Vocabulary,
            Self::D3Texture,
            Self::D4Tonality,
            Self::D5Structure,
            Self::D6Signature,
        ]
    }

    /// Retourne les dimensions premium (D7-D8)
    pub fn premium() -> &'static [VoiceDimension] {
        &[Self::D7Cadence, Self::D8Figures]
    }
}

/// Mode d'analyse
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum VoiceMode {
    /// Stats pures, déterministe, certifiable
    #[default]
    StatsOnly,
    /// Stats + IA contrôlée (record/replay)
    Hybrid,
}

/// Politique IA pour le mode Hybrid
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum VoiceAiPolicy {
    /// Pas d'appel IA
    #[default]
    Disabled,
    /// Appelle l'IA et enregistre la réponse
    Record,
    /// Rejoue une réponse enregistrée (déterministe)
    Replay,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Tolérances pour les métriques SOFT
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VoiceTolerances {
    /// Delta acceptable pour longueur moyenne de phrase (mots)
    pub sentence_len_avg_delta: f64,
    /// Delta acceptable pour taux de ponctuation
    pub punctuation_rate_delta: f64,
    /// Delta acceptable pour richesse lexicale
    pub lexical_richness_delta: f64,
    /// Delta acceptable pour ratio dialogue
    pub dialogue_ratio_delta: f64,
    /// Delta générique pour ratios
    pub generic_ratio_delta: f64,
}

impl Default for VoiceTolerances {
    fn default() -> Self {
        Self {
            sentence_len_avg_delta: 3.0,
            punctuation_rate_delta: 0.02,
            lexical_richness_delta: 0.05,
            dialogue_ratio_delta: 0.05,
            generic_ratio_delta: 0.03,
        }
    }
}

/// Configuration de l'analyse VOICE
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VoiceConfig {
    /// Langue du texte ("fr", "en")
    pub language: String,
    /// Activer D7 (Cadence) et D8 (Figures)
    pub enable_d7_d8: bool,
    /// Mode déterministe obligatoire pour Stats
    pub deterministic: bool,
    /// Mode d'analyse
    pub mode: VoiceMode,
    /// Politique IA (si mode Hybrid)
    pub ai_policy: VoiceAiPolicy,
    /// Tolérances pour métriques SOFT
    pub tolerances: VoiceTolerances,
    /// Nombre de tokens signature à extraire
    pub signature_top_n: usize,
    /// Longueur minimale du texte (caractères)
    pub min_text_length: usize,
}

impl Default for VoiceConfig {
    fn default() -> Self {
        Self {
            language: "fr".to_string(),
            enable_d7_d8: true,
            deterministic: true,
            mode: VoiceMode::StatsOnly,
            ai_policy: VoiceAiPolicy::Disabled,
            tolerances: VoiceTolerances::default(),
            signature_top_n: 24,
            min_text_length: 50,
        }
    }
}

impl VoiceConfig {
    /// Valide la configuration
    pub fn validate(&self) -> Result<(), VoiceError> {
        if self.language.is_empty() {
            return Err(VoiceError::InvalidConfig {
                reason: "language cannot be empty".into(),
            });
        }

        if !["fr", "en"].contains(&self.language.as_str()) {
            return Err(VoiceError::UnsupportedLanguage {
                language: self.language.clone(),
            });
        }

        if self.mode == VoiceMode::StatsOnly && !self.deterministic {
            return Err(VoiceError::InvalidConfig {
                reason: "StatsOnly mode requires deterministic=true".into(),
            });
        }

        if self.mode == VoiceMode::Hybrid && self.ai_policy == VoiceAiPolicy::Disabled {
            return Err(VoiceError::InvalidConfig {
                reason: "Hybrid mode requires ai_policy != Disabled".into(),
            });
        }

        if self.signature_top_n == 0 || self.signature_top_n > 100 {
            return Err(VoiceError::InvalidConfig {
                reason: format!("signature_top_n must be 1-100, got {}", self.signature_top_n),
            });
        }

        if self.min_text_length == 0 {
            return Err(VoiceError::InvalidConfig {
                reason: "min_text_length must be > 0".into(),
            });
        }

        Ok(())
    }

    /// Génère un fingerprint de la config pour le profile_id
    pub fn fingerprint(&self) -> String {
        format!(
            "lang={}|d7d8={}|det={}|mode={:?}|topn={}",
            self.language,
            self.enable_d7_d8,
            self.deterministic,
            self.mode,
            self.signature_top_n
        )
    }

    /// Config pour tests (min_text_length réduit)
    pub fn test_config() -> Self {
        let mut cfg = Self::default();
        cfg.min_text_length = 10;
        cfg
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÉTRIQUES
// ═══════════════════════════════════════════════════════════════════════════════

/// Une métrique individuelle
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VoiceMetric {
    /// Dimension (D1-D8)
    pub dimension: VoiceDimension,
    /// Clé unique (ex: "D1.sentence_len.avg")
    pub key: String,
    /// Valeur numérique
    pub value: f64,
    /// Unité ("words", "ratio", "chars", "entropy", "count", "sentences")
    pub unit: String,
    /// Niveau de verrouillage
    pub lock: VoiceLock,
}

impl VoiceMetric {
    /// Crée une nouvelle métrique
    pub fn new(dim: VoiceDimension, key: &str, value: f64, unit: &str, lock: VoiceLock) -> Self {
        Self {
            dimension: dim,
            key: key.to_string(),
            value,
            unit: unit.to_string(),
            lock,
        }
    }

    /// Crée une métrique SOFT
    pub fn soft(dim: VoiceDimension, key: &str, value: f64, unit: &str) -> Self {
        Self::new(dim, key, value, unit, VoiceLock::Soft)
    }

    /// Crée une métrique HARD
    pub fn hard(dim: VoiceDimension, key: &str, value: f64, unit: &str) -> Self {
        Self::new(dim, key, value, unit, VoiceLock::Hard)
    }

    /// Vérifie que la métrique est valide (VOICE-I03, VOICE-I04)
    pub fn validate(&self) -> Result<(), VoiceError> {
        // VOICE-I03: Pas de NaN
        if self.value.is_nan() {
            return Err(VoiceError::NumericViolation {
                field: self.key.clone(),
                reason: "value is NaN".into(),
            });
        }

        // VOICE-I03: Pas d'Inf
        if self.value.is_infinite() {
            return Err(VoiceError::NumericViolation {
                field: self.key.clone(),
                reason: "value is infinite".into(),
            });
        }

        // VOICE-I04: Ratios bornés [0, 1]
        if self.unit == "ratio" && !(0.0..=1.0).contains(&self.value) {
            return Err(VoiceError::NumericViolation {
                field: self.key.clone(),
                reason: format!("ratio out of [0,1]: {}", self.value),
            });
        }

        // Entropy bornée [0, 1]
        if self.unit == "entropy" && !(0.0..=1.0).contains(&self.value) {
            return Err(VoiceError::NumericViolation {
                field: self.key.clone(),
                reason: format!("entropy out of [0,1]: {}", self.value),
            });
        }

        // Valeurs non-négatives pour certaines unités
        if ["words", "chars", "sentences", "count"].contains(&self.unit.as_str())
            && self.value < 0.0
        {
            return Err(VoiceError::NumericViolation {
                field: self.key.clone(),
                reason: format!("{} cannot be negative: {}", self.unit, self.value),
            });
        }

        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL VOICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Profil de style complet
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VoiceProfile {
    /// Version du schéma (1)
    pub schema_version: u32,
    /// Langue du texte
    pub language: String,
    /// ID unique du profil (VOICE_ + 64 hex)
    pub profile_id: String,
    /// Hash du corpus canonicalisé (64 hex)
    pub corpus_hash: String,
    /// Liste des métriques (triées par clé)
    pub metrics: Vec<VoiceMetric>,
    /// Tokens signature (triés, uniques)
    pub signature_tokens: Vec<String>,
    /// Notes additionnelles
    pub notes: BTreeMap<String, String>,
}

impl VoiceProfile {
    /// Version actuelle du schéma
    pub const SCHEMA_VERSION: u32 = 1;

    /// Crée un profil vide
    pub fn empty(language: &str) -> Self {
        Self {
            schema_version: Self::SCHEMA_VERSION,
            language: language.to_string(),
            profile_id: String::new(),
            corpus_hash: String::new(),
            metrics: Vec::new(),
            signature_tokens: Vec::new(),
            notes: BTreeMap::new(),
        }
    }

    /// Valide le profil complet
    pub fn validate(&self) -> Result<(), VoiceError> {
        // Schema version
        if self.schema_version != Self::SCHEMA_VERSION {
            return Err(VoiceError::InvariantViolation {
                invariant: "schema_version".into(),
                details: format!(
                    "expected {}, got {}",
                    Self::SCHEMA_VERSION,
                    self.schema_version
                ),
            });
        }

        // Profile ID format: VOICE_ + 64 hex
        if !self.profile_id.starts_with("VOICE_") || self.profile_id.len() != 70 {
            return Err(VoiceError::InvariantViolation {
                invariant: "profile_id_format".into(),
                details: format!("expected VOICE_<64hex>, got '{}'", self.profile_id),
            });
        }

        // Vérifier hex dans profile_id
        let hex_part = &self.profile_id[6..];
        if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(VoiceError::InvariantViolation {
                invariant: "profile_id_hex".into(),
                details: format!("profile_id suffix must be hex: '{}'", hex_part),
            });
        }

        // Corpus hash format: 64 hex
        if self.corpus_hash.len() != 64 {
            return Err(VoiceError::InvariantViolation {
                invariant: "corpus_hash_format".into(),
                details: format!(
                    "expected 64 hex chars, got {}",
                    self.corpus_hash.len()
                ),
            });
        }

        // VOICE-I02: Métriques triées par clé
        let keys: Vec<&str> = self.metrics.iter().map(|m| m.key.as_str()).collect();
        let mut sorted = keys.clone();
        sorted.sort();
        if keys != sorted {
            return Err(VoiceError::InvariantViolation {
                invariant: "VOICE-I02".into(),
                details: "metrics not sorted by key".into(),
            });
        }

        // Valider chaque métrique (VOICE-I03, VOICE-I04)
        for m in &self.metrics {
            m.validate()?;
        }

        // VOICE-I06: signature_tokens triés et uniques
        let mut sig_sorted = self.signature_tokens.clone();
        sig_sorted.sort();
        if self.signature_tokens != sig_sorted {
            return Err(VoiceError::InvariantViolation {
                invariant: "VOICE-I06".into(),
                details: "signature_tokens not sorted".into(),
            });
        }

        let mut sig_dedup = sig_sorted.clone();
        sig_dedup.dedup();
        if sig_sorted != sig_dedup {
            return Err(VoiceError::InvariantViolation {
                invariant: "VOICE-I06".into(),
                details: "signature_tokens not unique".into(),
            });
        }

        Ok(())
    }

    /// Retourne le nombre de métriques par dimension
    pub fn metrics_by_dimension(&self) -> BTreeMap<VoiceDimension, usize> {
        let mut counts = BTreeMap::new();
        for m in &self.metrics {
            *counts.entry(m.dimension).or_insert(0) += 1;
        }
        counts
    }

    /// Retourne une métrique par clé
    pub fn get_metric(&self, key: &str) -> Option<&VoiceMetric> {
        self.metrics.iter().find(|m| m.key == key)
    }

    /// Retourne toutes les métriques d'une dimension
    pub fn get_metrics_for_dimension(&self, dim: VoiceDimension) -> Vec<&VoiceMetric> {
        self.metrics.iter().filter(|m| m.dimension == dim).collect()
    }

    /// Compte des métriques HARD vs SOFT
    pub fn lock_counts(&self) -> (usize, usize) {
        let hard = self.metrics.iter().filter(|m| m.lock == VoiceLock::Hard).count();
        let soft = self.metrics.len() - hard;
        (hard, soft)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÉSULTAT D'ANALYSE
// ═══════════════════════════════════════════════════════════════════════════════

/// Résultat d'analyse VOICE
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceAnalysisResult {
    /// Profil de style
    pub profile: VoiceProfile,
    /// Warnings non-bloquants
    pub warnings: Vec<String>,
    /// Temps d'analyse en millisecondes
    pub duration_ms: u64,
}

impl VoiceAnalysisResult {
    /// Crée un résultat avec profil
    pub fn new(profile: VoiceProfile) -> Self {
        Self {
            profile,
            warnings: Vec::new(),
            duration_ms: 0,
        }
    }

    /// Ajoute un warning
    pub fn warn(&mut self, msg: impl Into<String>) {
        self.warnings.push(msg.into());
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAIT ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/// Trait pour les analyseurs VOICE
pub trait VoiceAnalyzer {
    /// Analyse un texte et produit un profil
    fn analyze(&self, text: &str, cfg: &VoiceConfig) -> Result<VoiceAnalysisResult, VoiceError>;

    /// Retourne le nom de l'analyseur
    fn name(&self) -> &'static str;

    /// Retourne la version de l'analyseur
    fn version(&self) -> &'static str;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voice_config_default_is_valid() {
        let cfg = VoiceConfig::default();
        assert!(cfg.validate().is_ok());
    }

    #[test]
    fn test_voice_config_empty_language_invalid() {
        let mut cfg = VoiceConfig::default();
        cfg.language = String::new();
        assert!(cfg.validate().is_err());
    }

    #[test]
    fn test_voice_config_unsupported_language() {
        let mut cfg = VoiceConfig::default();
        cfg.language = "xx".to_string();
        let err = cfg.validate().unwrap_err();
        assert!(matches!(err, VoiceError::UnsupportedLanguage { .. }));
    }

    #[test]
    fn test_voice_config_stats_only_requires_deterministic() {
        let mut cfg = VoiceConfig::default();
        cfg.mode = VoiceMode::StatsOnly;
        cfg.deterministic = false;
        assert!(cfg.validate().is_err());
    }

    #[test]
    fn test_voice_metric_valid() {
        let m = VoiceMetric::soft(VoiceDimension::D1Rhythm, "D1.test", 0.5, "ratio");
        assert!(m.validate().is_ok());
    }

    #[test]
    fn test_voice_metric_nan_invalid() {
        let m = VoiceMetric::soft(VoiceDimension::D1Rhythm, "D1.test", f64::NAN, "ratio");
        assert!(m.validate().is_err());
    }

    #[test]
    fn test_voice_metric_inf_invalid() {
        let m = VoiceMetric::soft(VoiceDimension::D1Rhythm, "D1.test", f64::INFINITY, "ratio");
        assert!(m.validate().is_err());
    }

    #[test]
    fn test_voice_metric_ratio_out_of_bounds() {
        let m = VoiceMetric::soft(VoiceDimension::D1Rhythm, "D1.test", 1.5, "ratio");
        assert!(m.validate().is_err());
    }

    #[test]
    fn test_voice_dimension_all_count() {
        assert_eq!(VoiceDimension::all().len(), 8);
    }

    #[test]
    fn test_voice_dimension_core_premium_complete() {
        let core = VoiceDimension::core();
        let premium = VoiceDimension::premium();
        assert_eq!(core.len() + premium.len(), 8);
    }

    #[test]
    fn test_voice_profile_metrics_sorted_validation() {
        let mut profile = VoiceProfile::empty("fr");
        profile.profile_id = format!("VOICE_{}", "a".repeat(64));
        profile.corpus_hash = "b".repeat(64);
        
        // Métriques non triées
        profile.metrics = vec![
            VoiceMetric::soft(VoiceDimension::D2Vocabulary, "D2.test", 0.5, "ratio"),
            VoiceMetric::soft(VoiceDimension::D1Rhythm, "D1.test", 0.5, "ratio"),
        ];

        let err = profile.validate().unwrap_err();
        assert!(matches!(err, VoiceError::InvariantViolation { invariant, .. } if invariant == "VOICE-I02"));
    }

    #[test]
    fn test_voice_profile_signature_sorted_validation() {
        let mut profile = VoiceProfile::empty("fr");
        profile.profile_id = format!("VOICE_{}", "a".repeat(64));
        profile.corpus_hash = "b".repeat(64);
        
        // Signature non triée
        profile.signature_tokens = vec!["z".to_string(), "a".to_string()];

        let err = profile.validate().unwrap_err();
        assert!(matches!(err, VoiceError::InvariantViolation { invariant, .. } if invariant == "VOICE-I06"));
    }
}
