//! VOICE_HYBRID PromptBuilder v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Construit le guidance (prompt + directives) de manière déterministe
//! 
//! @invariant PROMPT-01: Même input + même policy = même guidance_hash
//! @invariant PROMPT-02: Directives triées alphabétiquement
//! @invariant PROMPT-03: Hard constraints triées alphabétiquement
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

use sha2::{Digest, Sha256};

use crate::interfaces::voice::contract::{VoiceProfile, VoiceLock};
use crate::interfaces::voice_hybrid::contract::VoiceHybridGuidance;
use crate::interfaces::voice_hybrid::policy::{MetricTarget, SignatureMarker, VoiceHybridPolicy};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/// Calcule le hash SHA-256 et retourne en hexadécimal
fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Joint les lignes de manière canonique (pas d'espaces trailing)
fn canonical_lines(lines: Vec<String>) -> String {
    lines.into_iter()
        .map(|l| l.trim_end().to_string())
        .collect::<Vec<_>>()
        .join("\n")
}

/// Formate un f64 de manière déterministe (6 décimales)
fn fmt_f64(x: f64) -> String {
    format!("{:.6}", x)
}

/// Recherche une métrique dans le profil par clé
fn find_metric(profile: &VoiceProfile, key: &str) -> Option<f64> {
    profile.metrics.iter()
        .find(|m| m.key == key)
        .map(|m| m.value)
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Formate un marqueur de signature en règle
fn marker_to_rule(m: &SignatureMarker) -> String {
    match m.lock {
        VoiceLock::Hard => format!("HARD: include marker '{}' (required)", m.text),
        _ => format!("SOFT: prefer marker '{}'", m.text),
    }
}

/// Formate un objectif métrique en règle
fn target_to_rule(t: &MetricTarget, current: Option<f64>) -> String {
    let cur = current.map(fmt_f64).unwrap_or_else(|| "N/A".to_string());
    let tgt = fmt_f64(t.target);
    let tol = fmt_f64(t.tolerance);

    let base = format!(
        "{:?} {} target={} tol={} current={}",
        t.dimension, t.key, tgt, tol, cur
    );

    match t.lock {
        VoiceLock::Hard => format!("HARD: {}", base),
        _ => format!("SOFT: {}", base),
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/// Constructeur de guidance déterministe
/// 
/// Transforme une policy et un profil de base en guidance pour le LLM
pub struct PromptBuilder;

impl PromptBuilder {
    /// Construit le guidance à partir d'une policy et d'un profil de base
    /// 
    /// # Arguments
    /// - `policy`: Policy de style à appliquer
    /// - `base_profile`: Profil VOICE v1 du texte analysé
    /// 
    /// # Returns
    /// - `VoiceHybridGuidance` avec prompt, directives et hash
    pub fn build(policy: &VoiceHybridPolicy, base_profile: &VoiceProfile) -> VoiceHybridGuidance {
        // 1) Collecter les directives (SOFT) et contraintes (HARD)
        let mut directives: Vec<String> = Vec::new();
        let mut hard_constraints: Vec<String> = Vec::new();

        // Règles de la policy
        for r in &policy.soft_rules {
            directives.push(format!("SOFT: {}", r.trim()));
        }
        for r in &policy.hard_rules {
            hard_constraints.push(format!("HARD: {}", r.trim()));
        }

        // Objectifs métriques
        for t in &policy.metric_targets {
            let current = find_metric(base_profile, &t.key);
            let line = target_to_rule(t, current);
            
            match t.lock {
                VoiceLock::Hard => hard_constraints.push(line),
                _ => directives.push(line),
            }
        }

        // Marqueurs de signature
        for m in &policy.signature_markers {
            let line = marker_to_rule(m);
            
            match m.lock {
                VoiceLock::Hard => hard_constraints.push(line),
                _ => directives.push(line),
            }
        }

        // 2) Trier pour déterminisme
        directives.sort();
        hard_constraints.sort();

        // 3) Construire le prompt
        let mut prompt_lines: Vec<String> = Vec::new();

        // Header
        prompt_lines.push("SYSTEM: You are OMEGA VOICE_HYBRID. Follow constraints exactly.".to_string());
        prompt_lines.push(format!("POLICY_ID: {}", policy.policy_id));
        prompt_lines.push(format!("POLICY_VERSION: {}", policy.policy_version));
        prompt_lines.push(format!("LANG: {}", policy.language));
        prompt_lines.push(format!("BASE_PROFILE_ID: {}", base_profile.profile_id));
        prompt_lines.push(format!("BASE_CORPUS_HASH: {}", base_profile.corpus_hash));
        prompt_lines.push(String::new());

        // Hard constraints
        prompt_lines.push("HARD_CONSTRAINTS:".to_string());
        if hard_constraints.is_empty() {
            prompt_lines.push("- (none)".to_string());
        } else {
            for c in &hard_constraints {
                prompt_lines.push(format!("- {}", c));
            }
        }
        prompt_lines.push(String::new());

        // Directives
        prompt_lines.push("DIRECTIVES:".to_string());
        if directives.is_empty() {
            prompt_lines.push("- (none)".to_string());
        } else {
            for d in &directives {
                prompt_lines.push(format!("- {}", d));
            }
        }
        prompt_lines.push(String::new());

        // Dimension weights
        prompt_lines.push("DIMENSION_WEIGHTS:".to_string());
        if policy.dimension_weights.is_empty() {
            prompt_lines.push("- (none)".to_string());
        } else {
            // BTreeMap garantit l'ordre
            for (k, v) in &policy.dimension_weights {
                prompt_lines.push(format!("- {}={}", k, fmt_f64(*v)));
            }
        }

        let prompt = canonical_lines(prompt_lines);

        // 4) Calculer le guidance_hash
        let mut canon_lines: Vec<String> = Vec::new();
        canon_lines.push("VOICE_HYBRID_GUIDANCE_CANON_v2.0.0".to_string());
        canon_lines.push(format!("POLICY_ID={}", policy.policy_id));
        canon_lines.push(format!("POLICY_VERSION={}", policy.policy_version));
        canon_lines.push(format!("BASE_PROFILE_ID={}", base_profile.profile_id));
        canon_lines.push(format!("BASE_CORPUS_HASH={}", base_profile.corpus_hash));
        
        canon_lines.push("HARD:".to_string());
        for c in &hard_constraints {
            canon_lines.push(c.clone());
        }
        
        canon_lines.push("SOFT:".to_string());
        for d in &directives {
            canon_lines.push(d.clone());
        }
        
        canon_lines.push("PROMPT:".to_string());
        canon_lines.push(prompt.clone());

        let canon_bytes = canonical_lines(canon_lines).into_bytes();
        let guidance_hash = sha256_hex(&canon_bytes);

        VoiceHybridGuidance {
            guidance_hash,
            prompt,
            directives,
            hard_constraints,
        }
    }

    /// Vérifie si deux guidances sont identiques (via hash)
    pub fn are_identical(g1: &VoiceHybridGuidance, g2: &VoiceHybridGuidance) -> bool {
        g1.guidance_hash == g2.guidance_hash
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;
    use crate::interfaces::voice::contract::{VoiceDimension, VoiceMetric, VoiceProfile};

    fn fake_profile() -> VoiceProfile {
        VoiceProfile {
            schema_version: 1, // u32, pas String
            language: "fr".to_string(),
            profile_id: format!("VOICE_{}", "a".repeat(64)),
            corpus_hash: "b".repeat(64),
            signature_tokens: vec!["…".to_string(), "pourtant".to_string()],
            metrics: vec![
                VoiceMetric {
                    dimension: VoiceDimension::D1Rhythm,
                    key: "D1.sentence_len.avg".to_string(),
                    value: 12.0,
                    unit: "words".to_string(),
                    lock: VoiceLock::Soft,
                },
                VoiceMetric {
                    dimension: VoiceDimension::D1Rhythm,
                    key: "D1.punct_density".to_string(),
                    value: 0.10,
                    unit: "ratio".to_string(),
                    lock: VoiceLock::Soft,
                },
            ],
            notes: BTreeMap::new(),
        }
    }

    fn policy_with_rules() -> VoiceHybridPolicy {
        let mut p = VoiceHybridPolicy::minimal("AUTHOR_TEST", "fr");
        
        p.dimension_weights = BTreeMap::from([
            ("D1".to_string(), 0.4),
            ("D6".to_string(), 0.6),
        ]);

        p.metric_targets.push(MetricTarget {
            dimension: VoiceDimension::D1Rhythm,
            key: "D1.sentence_len.avg".to_string(),
            target: 14.0,
            tolerance: 2.0,
            unit: "words".to_string(),
            lock: VoiceLock::Hard,
        });

        p.signature_markers.push(SignatureMarker::hard("…"));
        p.soft_rules.push("Prefer short paragraphs".to_string());
        p.hard_rules.push("No profanity".to_string());

        p
    }

    #[test]
    fn prompt_builder_deterministic_100_runs() {
        let profile = fake_profile();
        let policy = policy_with_rules();

        let first = PromptBuilder::build(&policy, &profile);

        for _ in 0..100 {
            let g = PromptBuilder::build(&policy, &profile);
            assert_eq!(g.guidance_hash, first.guidance_hash);
            assert_eq!(g.prompt, first.prompt);
            assert_eq!(g.directives, first.directives);
            assert_eq!(g.hard_constraints, first.hard_constraints);
        }
    }

    #[test]
    fn prompt_builder_hash_64_hex() {
        let profile = fake_profile();
        let policy = VoiceHybridPolicy::minimal("TEST", "fr");

        let g = PromptBuilder::build(&policy, &profile);
        
        assert_eq!(g.guidance_hash.len(), 64);
        assert!(g.guidance_hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn prompt_builder_directives_sorted() {
        let profile = fake_profile();
        let mut policy = VoiceHybridPolicy::minimal("TEST", "fr");
        
        // Ordre inversé intentionnel
        policy.soft_rules = vec![
            "Z rule last".to_string(),
            "A rule first".to_string(),
            "M rule middle".to_string(),
        ];

        let g = PromptBuilder::build(&policy, &profile);
        
        // Vérifier que les directives sont triées
        let sorted: Vec<_> = g.directives.clone();
        let mut expected = sorted.clone();
        expected.sort();
        assert_eq!(sorted, expected, "Directives must be sorted");
    }

    #[test]
    fn prompt_builder_hard_constraints_sorted() {
        let profile = fake_profile();
        let mut policy = VoiceHybridPolicy::minimal("TEST", "fr");
        
        policy.hard_rules = vec![
            "Z hard".to_string(),
            "A hard".to_string(),
        ];

        let g = PromptBuilder::build(&policy, &profile);
        
        let sorted: Vec<_> = g.hard_constraints.clone();
        let mut expected = sorted.clone();
        expected.sort();
        assert_eq!(sorted, expected, "Hard constraints must be sorted");
    }

    #[test]
    fn prompt_builder_different_policy_different_hash() {
        let profile = fake_profile();
        
        let p1 = VoiceHybridPolicy::minimal("AUTHOR_A", "fr");
        let p2 = VoiceHybridPolicy::minimal("AUTHOR_B", "fr");

        let g1 = PromptBuilder::build(&p1, &profile);
        let g2 = PromptBuilder::build(&p2, &profile);

        assert_ne!(g1.guidance_hash, g2.guidance_hash);
    }

    #[test]
    fn prompt_builder_different_profile_different_hash() {
        let policy = VoiceHybridPolicy::minimal("TEST", "fr");
        
        let mut p1 = fake_profile();
        let mut p2 = fake_profile();
        p2.profile_id = "DIFFERENT_PROFILE".to_string();

        let g1 = PromptBuilder::build(&policy, &p1);
        let g2 = PromptBuilder::build(&policy, &p2);

        assert_ne!(g1.guidance_hash, g2.guidance_hash);
    }

    #[test]
    fn prompt_builder_contains_policy_info() {
        let profile = fake_profile();
        let policy = VoiceHybridPolicy::minimal("AUTHOR_XYZ", "fr");

        let g = PromptBuilder::build(&policy, &profile);

        assert!(g.prompt.contains("POLICY_ID: AUTHOR_XYZ"));
        assert!(g.prompt.contains("POLICY_VERSION: 2.0.0"));
        assert!(g.prompt.contains("LANG: fr"));
    }

    #[test]
    fn prompt_builder_contains_profile_info() {
        let profile = fake_profile();
        let policy = VoiceHybridPolicy::minimal("TEST", "fr");

        let g = PromptBuilder::build(&policy, &profile);

        assert!(g.prompt.contains("BASE_PROFILE_ID:"));
        assert!(g.prompt.contains("BASE_CORPUS_HASH:"));
    }

    #[test]
    fn prompt_builder_are_identical() {
        let profile = fake_profile();
        let policy = policy_with_rules();

        let g1 = PromptBuilder::build(&policy, &profile);
        let g2 = PromptBuilder::build(&policy, &profile);

        assert!(PromptBuilder::are_identical(&g1, &g2));
    }
}
