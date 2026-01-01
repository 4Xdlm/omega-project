//! VOICE_HYBRID Policy v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! @invariant HYBRID-POL-01: Policy versionnée, sérialisable, auditable
//! @invariant HYBRID-POL-02: Toute policy doit produire un guidance_hash stable
//! @invariant HYBRID-POL-03: BTreeMap pour ordre stable des clés
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

// Re-export des types VOICE v1 nécessaires (certifiés)
pub use crate::interfaces::voice::contract::{VoiceDimension, VoiceLock};

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE_HYBRID POLICY
// ═══════════════════════════════════════════════════════════════════════════════

/// Policy de style VOICE_HYBRID
/// 
/// Une policy définit:
/// - Le style cible (pondérations par dimension)
/// - Les métriques objectives
/// - Les marqueurs de signature
/// - Les règles hard/soft
/// 
/// IMPORTANT: Utilise BTreeMap partout pour ordre déterministe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceHybridPolicy {
    /// Version de la policy (ex: "2.0.0")
    pub policy_version: String,

    /// Identifiant stable (ex: "AUTHOR_FRANCKY_V1")
    /// Format recommandé: [A-Z_]+_V[0-9]+
    pub policy_id: String,

    /// Langue cible (ex: "fr", "en")
    pub language: String,

    /// Pondérations par dimension (0.0..1.0)
    /// Clé = "D1", "D2", ..., "D8"
    /// BTreeMap pour ordre stable
    pub dimension_weights: BTreeMap<String, f64>,

    /// Objectifs métriques (clé = "D1.sentence_len.avg")
    pub metric_targets: Vec<MetricTarget>,

    /// Mots/expressions signature attendus
    pub signature_markers: Vec<SignatureMarker>,

    /// Contraintes strictes (HARD rules) - ne pas violer
    pub hard_rules: Vec<String>,

    /// Préférences souples (SOFT rules) - encouragées
    pub soft_rules: Vec<String>,

    /// Notes/audit (métadonnées)
    /// BTreeMap pour ordre stable
    pub notes: BTreeMap<String, String>,
}

impl VoiceHybridPolicy {
    /// Crée une policy minimale valide
    pub fn minimal(policy_id: &str, language: &str) -> Self {
        let mut notes = BTreeMap::new();
        notes.insert("created_by".to_string(), "OMEGA".to_string());
        notes.insert("schema_version".to_string(), "2.0.0".to_string());

        Self {
            policy_version: "2.0.0".to_string(),
            policy_id: policy_id.to_string(),
            language: language.to_string(),
            dimension_weights: BTreeMap::new(),
            metric_targets: Vec::new(),
            signature_markers: Vec::new(),
            hard_rules: Vec::new(),
            soft_rules: Vec::new(),
            notes,
        }
    }

    /// Valide la policy
    pub fn validate(&self) -> Result<(), String> {
        if self.policy_id.trim().is_empty() {
            return Err("policy_id cannot be empty".to_string());
        }
        if self.policy_version.trim().is_empty() {
            return Err("policy_version cannot be empty".to_string());
        }
        if self.language.trim().is_empty() {
            return Err("language cannot be empty".to_string());
        }

        // Valide les pondérations
        for (k, v) in &self.dimension_weights {
            if *v < 0.0 || *v > 1.0 {
                return Err(format!("dimension_weight {} for {} out of [0,1]", v, k));
            }
        }

        // Valide les targets
        for t in &self.metric_targets {
            if t.tolerance < 0.0 {
                return Err(format!("tolerance cannot be negative for {}", t.key));
            }
        }

        Ok(())
    }

    /// Calcule un hash de la policy pour comparaison rapide
    pub fn compute_hash(&self) -> String {
        use sha2::{Digest, Sha256};
        
        // Sérialise en JSON canonique
        let json = serde_json::to_string(self).unwrap_or_default();
        
        let mut hasher = Sha256::new();
        hasher.update(json.as_bytes());
        hex::encode(hasher.finalize())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC TARGET
// ═══════════════════════════════════════════════════════════════════════════════

/// Objectif métrique avec valeur cible et tolérance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricTarget {
    /// Dimension concernée (D1..D8)
    pub dimension: VoiceDimension,

    /// Clé métrique (ex: "D1.sentence_len.avg")
    pub key: String,

    /// Valeur cible
    pub target: f64,

    /// Tolérance acceptée (+/-)
    pub tolerance: f64,

    /// Unité de mesure (ex: "words", "ratio", "count")
    pub unit: String,

    /// Niveau de lock (Soft = encouragé, Hard = obligatoire)
    pub lock: VoiceLock,
}

impl MetricTarget {
    /// Vérifie si une valeur est dans la cible +/- tolérance
    pub fn is_satisfied(&self, value: f64) -> bool {
        (value - self.target).abs() <= self.tolerance
    }

    /// Calcule la distance normalisée à la cible (0 = parfait, 1 = hors tolérance)
    pub fn distance(&self, value: f64) -> f64 {
        let diff = (value - self.target).abs();
        if self.tolerance > 0.0 {
            (diff / self.tolerance).min(1.0)
        } else if diff == 0.0 {
            0.0
        } else {
            1.0
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNATURE MARKER
// ═══════════════════════════════════════════════════════════════════════════════

/// Marqueur de signature (mot ou expression caractéristique)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureMarker {
    /// Texte du marqueur (ex: "…", "donc", "pourtant")
    pub text: String,

    /// Taux minimal d'occurrence (optionnel)
    /// Ex: 0.01 = au moins 1% des mots
    pub min_rate: Option<f64>,

    /// Niveau de lock
    pub lock: VoiceLock,
}

impl SignatureMarker {
    /// Crée un marqueur SOFT simple
    pub fn soft(text: &str) -> Self {
        Self {
            text: text.to_string(),
            min_rate: None,
            lock: VoiceLock::Soft,
        }
    }

    /// Crée un marqueur HARD obligatoire
    pub fn hard(text: &str) -> Self {
        Self {
            text: text.to_string(),
            min_rate: None,
            lock: VoiceLock::Hard,
        }
    }

    /// Crée un marqueur avec taux minimal
    pub fn with_rate(text: &str, rate: f64, lock: VoiceLock) -> Self {
        Self {
            text: text.to_string(),
            min_rate: Some(rate),
            lock,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn policy_minimal_valid() {
        let p = VoiceHybridPolicy::minimal("TEST_POL", "fr");
        assert!(p.validate().is_ok());
        assert_eq!(p.policy_version, "2.0.0");
    }

    #[test]
    fn policy_empty_id_invalid() {
        let mut p = VoiceHybridPolicy::minimal("", "fr");
        assert!(p.validate().is_err());
    }

    #[test]
    fn policy_hash_deterministic() {
        let p = VoiceHybridPolicy::minimal("TEST_POL", "fr");
        let h1 = p.compute_hash();
        let h2 = p.compute_hash();
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64); // SHA-256 = 64 hex chars
    }

    #[test]
    fn metric_target_satisfaction() {
        let t = MetricTarget {
            dimension: VoiceDimension::D1Rhythm,
            key: "D1.test".to_string(),
            target: 10.0,
            tolerance: 2.0,
            unit: "count".to_string(),
            lock: VoiceLock::Soft,
        };

        assert!(t.is_satisfied(10.0));
        assert!(t.is_satisfied(11.5));
        assert!(t.is_satisfied(8.0));
        assert!(!t.is_satisfied(5.0));
        assert!(!t.is_satisfied(15.0));
    }

    #[test]
    fn metric_target_distance() {
        let t = MetricTarget {
            dimension: VoiceDimension::D1Rhythm,
            key: "D1.test".to_string(),
            target: 10.0,
            tolerance: 5.0,
            unit: "count".to_string(),
            lock: VoiceLock::Soft,
        };

        assert!((t.distance(10.0) - 0.0).abs() < 0.001);
        assert!((t.distance(12.5) - 0.5).abs() < 0.001);
        assert!((t.distance(15.0) - 1.0).abs() < 0.001);
        assert!((t.distance(20.0) - 1.0).abs() < 0.001); // Capped at 1
    }

    #[test]
    fn signature_marker_builders() {
        let s = SignatureMarker::soft("donc");
        assert!(matches!(s.lock, VoiceLock::Soft));
        assert!(s.min_rate.is_none());

        let h = SignatureMarker::hard("…");
        assert!(matches!(h.lock, VoiceLock::Hard));

        let r = SignatureMarker::with_rate("pourtant", 0.01, VoiceLock::Soft);
        assert_eq!(r.min_rate, Some(0.01));
    }
}
