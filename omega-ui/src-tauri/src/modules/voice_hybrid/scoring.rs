//! VOICE_HYBRID Scoring v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Calcul du score de conformité (0.0 à 1.0) entre un texte et un profil cible
//! 
//! @invariant SCORE-01: Même input = même score (déterministe)
//! @invariant SCORE-02: Score dans [0.0, 1.0]
//! @invariant SCORE-03: Score basé uniquement sur métriques VOICE v1
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use crate::interfaces::voice::contract::{VoiceConfig, VoiceProfile, VoiceAnalyzer};
use crate::modules::voice::core_stats::StatsVoiceAnalyzer;

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Configuration du scoring
#[derive(Debug, Clone)]
pub struct ScoringConfig {
    /// Range par défaut pour normalisation des distances
    pub default_range: f64,
    
    /// Range pour les métriques de type "ratio" [0,1]
    pub ratio_range: f64,
    
    /// Range pour les métriques de type "words" 
    pub words_range: f64,
    
    /// Range pour les métriques de type "count"
    pub count_range: f64,
}

impl Default for ScoringConfig {
    fn default() -> Self {
        Self {
            default_range: 10.0,
            ratio_range: 1.0,
            words_range: 50.0,
            count_range: 100.0,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/// Calcul de score de conformité
/// 
/// Compare un texte candidat à un profil de référence
pub struct VoiceScoring {
    config: ScoringConfig,
}

impl VoiceScoring {
    /// Crée une instance avec config par défaut
    pub fn new() -> Self {
        Self {
            config: ScoringConfig::default(),
        }
    }

    /// Crée une instance avec config personnalisée
    pub fn with_config(config: ScoringConfig) -> Self {
        Self { config }
    }

    /// Retourne le range approprié pour une unité
    fn range_for_unit(&self, unit: &str) -> f64 {
        match unit {
            "ratio" | "entropy" => self.config.ratio_range,
            "words" | "chars" | "sentences" => self.config.words_range,
            "count" => self.config.count_range,
            _ => self.config.default_range,
        }
    }

    /// Calcule le score de conformité entre un texte candidat et un profil de référence
    /// 
    /// Méthode:
    /// 1. Analyse le texte candidat avec VOICE v1
    /// 2. Compare les métriques communes
    /// 3. Calcule score = 1 - moyenne(distances normalisées)
    /// 
    /// Score ∈ [0.0, 1.0] où 1.0 = parfaitement conforme
    pub fn score_against_profile(
        &self,
        candidate_text: &str,
        base_cfg: &VoiceConfig,
        reference: &VoiceProfile,
    ) -> Result<f64, String> {
        // Analyse le texte candidat avec VOICE v1
        let analyzer = StatsVoiceAnalyzer::new();
        let result = analyzer.analyze(candidate_text, base_cfg)
            .map_err(|e| format!("VOICE v1 analysis failed: {:?}", e))?;
        
        let candidate = &result.profile;

        // Compare les métriques communes
        let mut sum_distance = 0.0;
        let mut count = 0.0;

        for ref_metric in &reference.metrics {
            // Cherche la métrique correspondante dans le candidat
            if let Some(cand_metric) = candidate.metrics.iter().find(|m| m.key == ref_metric.key) {
                let range = self.range_for_unit(&ref_metric.unit);
                
                // Distance normalisée, bornée à 1.0
                let distance = ((ref_metric.value - cand_metric.value).abs() / range).min(1.0);
                
                sum_distance += distance;
                count += 1.0;
            }
        }

        // Score = 1 - moyenne des distances
        if count == 0.0 {
            // Aucune métrique commune -> score neutre
            return Ok(0.5);
        }

        let avg_distance = sum_distance / count;
        let score = (1.0 - avg_distance).max(0.0).min(1.0);
        
        Ok(score)
    }

    /// Calcule le score entre deux profils directement (sans ré-analyser)
    pub fn score_profiles(
        &self,
        candidate: &VoiceProfile,
        reference: &VoiceProfile,
    ) -> f64 {
        let mut sum_distance = 0.0;
        let mut count = 0.0;

        for ref_metric in &reference.metrics {
            if let Some(cand_metric) = candidate.metrics.iter().find(|m| m.key == ref_metric.key) {
                let range = self.range_for_unit(&ref_metric.unit);
                let distance = ((ref_metric.value - cand_metric.value).abs() / range).min(1.0);
                sum_distance += distance;
                count += 1.0;
            }
        }

        if count == 0.0 {
            return 0.5;
        }

        (1.0 - sum_distance / count).max(0.0).min(1.0)
    }
}

impl Default for VoiceScoring {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::interfaces::voice::contract::{VoiceDimension, VoiceLock, VoiceMetric};
    use std::collections::BTreeMap;

    fn make_profile_with_metrics(metrics: Vec<(String, f64, String)>) -> VoiceProfile {
        VoiceProfile {
            schema_version: 1,
            language: "fr".to_string(),
            profile_id: format!("VOICE_{}", "a".repeat(64)),
            corpus_hash: "b".repeat(64),
            metrics: metrics.into_iter().map(|(key, value, unit)| {
                VoiceMetric {
                    dimension: VoiceDimension::D1Rhythm,
                    key,
                    value,
                    unit,
                    lock: VoiceLock::Soft,
                }
            }).collect(),
            signature_tokens: vec![],
            notes: BTreeMap::new(),
        }
    }

    #[test]
    fn scoring_identical_profiles() {
        let scoring = VoiceScoring::new();
        
        let profile = make_profile_with_metrics(vec![
            ("D1.test".to_string(), 10.0, "count".to_string()),
        ]);

        let score = scoring.score_profiles(&profile, &profile);
        assert!((score - 1.0).abs() < 0.001, "Identical profiles should score 1.0");
    }

    #[test]
    fn scoring_different_profiles() {
        let scoring = VoiceScoring::new();
        
        let ref_profile = make_profile_with_metrics(vec![
            ("D1.test".to_string(), 10.0, "count".to_string()),
        ]);
        
        let cand_profile = make_profile_with_metrics(vec![
            ("D1.test".to_string(), 60.0, "count".to_string()), // Très différent
        ]);

        let score = scoring.score_profiles(&cand_profile, &ref_profile);
        assert!(score <= 0.5, "Very different profiles should score low");
    }

    #[test]
    fn scoring_no_common_metrics() {
        let scoring = VoiceScoring::new();
        
        let ref_profile = make_profile_with_metrics(vec![
            ("D1.test".to_string(), 10.0, "count".to_string()),
        ]);
        
        let cand_profile = make_profile_with_metrics(vec![
            ("D2.other".to_string(), 10.0, "count".to_string()),
        ]);

        let score = scoring.score_profiles(&cand_profile, &ref_profile);
        assert!((score - 0.5).abs() < 0.001, "No common metrics should score 0.5");
    }

    #[test]
    fn scoring_bounded_0_1() {
        let scoring = VoiceScoring::new();
        
        // Valeurs extrêmes
        let ref_profile = make_profile_with_metrics(vec![
            ("D1.test".to_string(), 0.0, "ratio".to_string()),
        ]);
        
        let cand_profile = make_profile_with_metrics(vec![
            ("D1.test".to_string(), 1000.0, "ratio".to_string()),
        ]);

        let score = scoring.score_profiles(&cand_profile, &ref_profile);
        assert!(score >= 0.0 && score <= 1.0, "Score must be in [0, 1]");
    }

    #[test]
    fn scoring_deterministic() {
        let scoring = VoiceScoring::new();
        
        let ref_profile = make_profile_with_metrics(vec![
            ("D1.a".to_string(), 10.0, "count".to_string()),
            ("D1.b".to_string(), 0.5, "ratio".to_string()),
        ]);
        
        let cand_profile = make_profile_with_metrics(vec![
            ("D1.a".to_string(), 15.0, "count".to_string()),
            ("D1.b".to_string(), 0.6, "ratio".to_string()),
        ]);

        let score1 = scoring.score_profiles(&cand_profile, &ref_profile);
        let score2 = scoring.score_profiles(&cand_profile, &ref_profile);
        
        assert_eq!(score1, score2, "Scoring must be deterministic");
    }
}
