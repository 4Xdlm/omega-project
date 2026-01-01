//! VOICE_HYBRID Canon Mapping v2.0.0
//! ═══════════════════════════════════════════════════════════════════════════════
//! 
//! Nomenclature des entity_id et keys pour l'intégration CANON
//! 
//! Entity IDs:
//! - AUTHOR:<policy_id>
//! - VOICE:PROFILE:<profile_id>
//! - VOICE:POLICY:<policy_id>:<policy_version>
//! - VOICE:RUN:<run_id>
//!
//! @certification VOICE_HYBRID v2.0.0 INDUSTRIAL

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY ID BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Entity ID pour un auteur
pub fn author_entity(policy_id: &str) -> String {
    format!("AUTHOR:{}", policy_id)
}

/// Entity ID pour un profil VOICE
pub fn voice_profile_entity(profile_id: &str) -> String {
    format!("VOICE:PROFILE:{}", profile_id)
}

/// Entity ID pour une policy VOICE
pub fn voice_policy_entity(policy_id: &str, version: &str) -> String {
    format!("VOICE:POLICY:{}:{}", policy_id, version)
}

/// Entity ID pour un run VOICE_HYBRID
pub fn voice_run_entity(run_id: &str) -> String {
    format!("VOICE:RUN:{}", run_id)
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Key: version du schema du profil
pub fn k_profile_schema() -> &'static str {
    "voice.profile.schema_version"
}

/// Key: hash du corpus
pub fn k_profile_corpus() -> &'static str {
    "voice.profile.corpus_hash"
}

/// Key: langue
pub fn k_profile_language() -> &'static str {
    "voice.profile.language"
}

/// Key: métrique spécifique
pub fn k_metric(metric_key: &str) -> String {
    format!("voice.profile.metrics.{}", metric_key)
}

/// Key: token signature
pub fn k_signature(marker: &str) -> String {
    format!("voice.signature.marker.{}", marker)
}

/// Key: policy JSON complète
pub fn k_policy_json() -> &'static str {
    "voice.policy.json"
}

/// Key: hash du guidance
pub fn k_guidance_hash() -> &'static str {
    "voice.guidance.hash"
}

/// Key: hash du record replay
pub fn k_replay_hash() -> &'static str {
    "voice.replay.record_hash"
}

/// Key: completion text (si stocké)
pub fn k_completion() -> &'static str {
    "voice.completion.text"
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entity_ids_format() {
        assert_eq!(author_entity("FRANCKY"), "AUTHOR:FRANCKY");
        assert_eq!(voice_profile_entity("PROF123"), "VOICE:PROFILE:PROF123");
        assert_eq!(voice_policy_entity("POL1", "2.0.0"), "VOICE:POLICY:POL1:2.0.0");
        assert_eq!(voice_run_entity("RUN001"), "VOICE:RUN:RUN001");
    }

    #[test]
    fn keys_format() {
        assert_eq!(k_profile_schema(), "voice.profile.schema_version");
        assert_eq!(k_metric("D1.sentence_len.avg"), "voice.profile.metrics.D1.sentence_len.avg");
        assert_eq!(k_signature("…"), "voice.signature.marker.…");
    }

    #[test]
    fn entity_ids_stable() {
        // Vérifier que les mêmes inputs produisent les mêmes outputs
        let e1 = author_entity("TEST");
        let e2 = author_entity("TEST");
        assert_eq!(e1, e2);
    }
}
