//! OMEGA VOICE — Core Stats Analyzer (NASA-Grade AS9100D)
//! ═══════════════════════════════════════════════════════════════════════════════
//!
//! Analyseur statistique déterministe pour les 8 dimensions de style.
//!
//! @invariant VOICE-I01: Même input + cfg → même profile_id
//! @invariant VOICE-I02: Métriques triées par clé
//! @invariant VOICE-I03: Pas de NaN/Inf
//! @invariant VOICE-I04: Ratios ∈ [0,1]
//!
//! @version VOICE_v1.0.0
//! @certification AEROSPACE_GRADE

use std::collections::BTreeMap;
use std::time::Instant;

use crate::interfaces::voice::contract::{
    VoiceAnalysisResult, VoiceAnalyzer, VoiceConfig, VoiceDimension,
    VoiceLock, VoiceMetric, VoiceProfile,
};
use crate::interfaces::voice::errors::VoiceError;
use crate::modules::voice::canonicalize::{
    build_profile_id, canonicalize_text, compute_corpus_hash,
    split_paragraphs, split_sentences, tokenize_words,
};
use crate::modules::voice::lexicons::{
    get_sentiment, is_action_verb, is_adjective_like, is_connector,
    is_sensory, is_state_verb, is_stopword, is_verb_like,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATS VOICE ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/// Analyseur statistique pur (déterministe, certifiable)
#[derive(Debug, Default)]
pub struct StatsVoiceAnalyzer;

impl StatsVoiceAnalyzer {
    /// Crée un nouvel analyseur
    pub fn new() -> Self {
        Self
    }

    /// Analyse interne avec mesure du temps
    fn analyze_internal(
        &self,
        text: &str,
        cfg: &VoiceConfig,
    ) -> Result<VoiceAnalysisResult, VoiceError> {
        let start = Instant::now();

        // ─────────────────────────────────────────────────────────────────────
        // VALIDATION CONFIG
        // ─────────────────────────────────────────────────────────────────────
        cfg.validate()?;

        if !cfg.deterministic {
            return Err(VoiceError::InvalidConfig {
                reason: "StatsVoiceAnalyzer requires deterministic=true".into(),
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // CANONICALIZATION
        // ─────────────────────────────────────────────────────────────────────
        let canonical = canonicalize_text(text);

        if canonical.is_empty() {
            return Err(VoiceError::EmptyInput);
        }

        if canonical.len() < cfg.min_text_length {
            return Err(VoiceError::TextTooShort {
                min: cfg.min_text_length,
                actual: canonical.len(),
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // COMPUTE HASHES
        // ─────────────────────────────────────────────────────────────────────
        let corpus_hash = compute_corpus_hash(&canonical);
        let cfg_fingerprint = cfg.fingerprint();
        let profile_id = build_profile_id(&corpus_hash, &cfg_fingerprint);

        // ─────────────────────────────────────────────────────────────────────
        // EXTRACT RAW DATA
        // ─────────────────────────────────────────────────────────────────────
        let tokens = tokenize_words(&canonical);
        let sentences = split_sentences(&canonical);
        let paragraphs = split_paragraphs(&canonical);

        let n_tokens = tokens.len().max(1) as f64;
        let n_chars = canonical.chars().count().max(1) as f64;
        let n_sentences = sentences.len().max(1) as f64;

        // ─────────────────────────────────────────────────────────────────────
        // COMPUTE METRICS
        // ─────────────────────────────────────────────────────────────────────
        let mut metrics = Vec::new();
        let mut warnings = Vec::new();

        // D1 - RHYTHM
        self.compute_d1_rhythm(&sentences, &canonical, &mut metrics)?;

        // D2 - VOCABULARY
        self.compute_d2_vocabulary(&tokens, n_tokens, &mut metrics)?;

        // D3 - TEXTURE
        self.compute_d3_texture(&tokens, n_tokens, &mut metrics)?;

        // D4 - TONALITY
        self.compute_d4_tonality(&tokens, n_tokens, &mut metrics)?;

        // D5 - STRUCTURE
        self.compute_d5_structure(&tokens, &sentences, n_tokens, &mut metrics)?;

        // D6 - SIGNATURE
        let signature_tokens = self.compute_d6_signature(
            &tokens,
            n_chars,
            &canonical,
            cfg.signature_top_n,
            &mut metrics,
        )?;

        // D7 & D8 (if enabled)
        if cfg.enable_d7_d8 {
            self.compute_d7_cadence(&paragraphs, &tokens, n_tokens, &mut metrics)?;
            self.compute_d8_figures(&canonical, n_chars, &mut metrics)?;
        } else {
            warnings.push("D7/D8 disabled by config".to_string());
        }

        // ─────────────────────────────────────────────────────────────────────
        // SORT METRICS (VOICE-I02)
        // ─────────────────────────────────────────────────────────────────────
        metrics.sort_by(|a, b| a.key.cmp(&b.key));

        // ─────────────────────────────────────────────────────────────────────
        // VALIDATE METRICS (VOICE-I03, VOICE-I04)
        // ─────────────────────────────────────────────────────────────────────
        for m in &metrics {
            m.validate()?;
        }

        // ─────────────────────────────────────────────────────────────────────
        // BUILD PROFILE
        // ─────────────────────────────────────────────────────────────────────
        let mut notes = BTreeMap::new();
        notes.insert("cfg_fingerprint".to_string(), cfg_fingerprint);
        notes.insert("analyzer".to_string(), self.name().to_string());
        notes.insert("analyzer_version".to_string(), self.version().to_string());
        notes.insert(
            "canonicalization".to_string(),
            "whitespace_collapse+LF+trim".to_string(),
        );

        let profile = VoiceProfile {
            schema_version: VoiceProfile::SCHEMA_VERSION,
            language: cfg.language.clone(),
            profile_id,
            corpus_hash,
            metrics,
            signature_tokens,
            notes,
        };

        // Validate profile
        profile.validate()?;

        let duration_ms = start.elapsed().as_millis() as u64;

        Ok(VoiceAnalysisResult {
            profile,
            warnings,
            duration_ms,
        })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D1 - RHYTHM
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d1_rhythm(
        &self,
        sentences: &[String],
        text: &str,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<(), VoiceError> {
        // Sentence lengths
        let lens: Vec<f64> = sentences
            .iter()
            .map(|s| tokenize_words(s).len() as f64)
            .collect();

        let avg = mean(&lens);
        let std = stddev(&lens);

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D1Rhythm,
            "D1.sentence_len.avg",
            avg,
            "words",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D1Rhythm,
            "D1.sentence_len.std",
            std,
            "words",
        ));

        // Punctuation rates
        let n_chars = text.chars().count().max(1) as f64;
        let punct = text.chars().filter(|c| c.is_ascii_punctuation()).count() as f64;
        let excl = text.chars().filter(|c| *c == '!').count() as f64;
        let quest = text.chars().filter(|c| *c == '?').count() as f64;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D1Rhythm,
            "D1.punctuation.rate",
            clamp_ratio(punct / n_chars),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D1Rhythm,
            "D1.exclamation.rate",
            clamp_ratio(excl / n_chars),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D1Rhythm,
            "D1.question.rate",
            clamp_ratio(quest / n_chars),
            "ratio",
        ));

        // Paragraph length
        let paragraphs = split_paragraphs(text);
        let para_lens: Vec<f64> = paragraphs
            .iter()
            .map(|p| split_sentences(p).len() as f64)
            .collect();

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D1Rhythm,
            "D1.paragraph_len.avg",
            mean(&para_lens),
            "sentences",
        ));

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D2 - VOCABULARY
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d2_vocabulary(
        &self,
        tokens: &[String],
        n_tokens: f64,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<(), VoiceError> {
        use std::collections::BTreeSet;

        // Type-token ratio (lexical richness)
        let unique: BTreeSet<_> = tokens.iter().collect();
        let ttr = (unique.len() as f64) / n_tokens;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D2Vocabulary,
            "D2.type_token_ratio",
            clamp_ratio(ttr),
            "ratio",
        ));

        // Average word length
        let word_lens: Vec<f64> = tokens.iter().map(|t| t.chars().count() as f64).collect();

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D2Vocabulary,
            "D2.avg_word_len",
            mean(&word_lens),
            "chars",
        ));

        // Stopword ratio
        let stopwords = tokens.iter().filter(|t| is_stopword(t)).count() as f64;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D2Vocabulary,
            "D2.stopword_ratio",
            clamp_ratio(stopwords / n_tokens),
            "ratio",
        ));

        // Rare token ratio (heuristic: long words or with special chars)
        let rare = tokens
            .iter()
            .filter(|t| {
                t.chars().count() >= 9
                    || t.contains('\'')
                    || t.contains('\'')
                    || t.contains('-')
            })
            .count() as f64;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D2Vocabulary,
            "D2.rare_token_ratio",
            clamp_ratio(rare / n_tokens),
            "ratio",
        ));

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D3 - TEXTURE
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d3_texture(
        &self,
        tokens: &[String],
        n_tokens: f64,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<(), VoiceError> {
        let adj = tokens.iter().filter(|t| is_adjective_like(t)).count() as f64;
        let verb = tokens.iter().filter(|t| is_verb_like(t)).count() as f64;
        let sensory = tokens.iter().filter(|t| is_sensory(t)).count() as f64;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D3Texture,
            "D3.adj_ratio",
            clamp_ratio(adj / n_tokens),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D3Texture,
            "D3.verb_ratio",
            clamp_ratio(verb / n_tokens),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D3Texture,
            "D3.sensory_ratio",
            clamp_ratio(sensory / n_tokens),
            "ratio",
        ));

        // Show/tell proxy
        let action = tokens.iter().filter(|t| is_action_verb(t)).count() as f64;
        let state = tokens.iter().filter(|t| is_state_verb(t)).count() as f64;
        let denom = (action + state).max(1.0);

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D3Texture,
            "D3.show_tell_proxy",
            clamp_ratio(action / denom),
            "ratio",
        ));

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D4 - TONALITY
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d4_tonality(
        &self,
        tokens: &[String],
        n_tokens: f64,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<(), VoiceError> {
        let mut pos = 0.0;
        let mut neg = 0.0;

        for t in tokens {
            match get_sentiment(t) {
                1 => pos += 1.0,
                -1 => neg += 1.0,
                _ => {}
            }
        }

        let neu = (n_tokens - pos - neg).max(0.0);

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D4Tonality,
            "D4.neg_ratio",
            clamp_ratio(neg / n_tokens),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D4Tonality,
            "D4.neu_ratio",
            clamp_ratio(neu / n_tokens),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D4Tonality,
            "D4.pos_ratio",
            clamp_ratio(pos / n_tokens),
            "ratio",
        ));

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D5 - STRUCTURE
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d5_structure(
        &self,
        tokens: &[String],
        sentences: &[String],
        n_tokens: f64,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<(), VoiceError> {
        // Sentence opener entropy
        let mut openers: BTreeMap<String, usize> = BTreeMap::new();
        for s in sentences {
            let words = tokenize_words(s);
            if let Some(first) = words.first() {
                *openers.entry(first.clone()).or_insert(0) += 1;
            }
        }
        let entropy = compute_entropy(&openers);

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D5Structure,
            "D5.connector_ratio",
            clamp_ratio(
                tokens.iter().filter(|t| is_connector(t)).count() as f64 / n_tokens,
            ),
            "ratio",
        ));

        // 3-gram repetition rate
        let mut ngrams: BTreeMap<String, usize> = BTreeMap::new();
        if tokens.len() >= 3 {
            for i in 0..=(tokens.len() - 3) {
                let gram = format!("{} {} {}", tokens[i], tokens[i + 1], tokens[i + 2]);
                *ngrams.entry(gram).or_insert(0) += 1;
            }
        }
        let repeats = ngrams.values().filter(|&&v| v >= 2).count() as f64;
        let total_ngrams = ngrams.len().max(1) as f64;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D5Structure,
            "D5.repetition_3gram_rate",
            clamp_ratio(repeats / total_ngrams),
            "ratio",
        ));

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D5Structure,
            "D5.sentence_opener_entropy",
            clamp_ratio(entropy),
            "entropy",
        ));

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D6 - SIGNATURE
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d6_signature(
        &self,
        tokens: &[String],
        n_chars: f64,
        text: &str,
        top_n: usize,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<Vec<String>, VoiceError> {
        // Token frequency
        let mut freq: BTreeMap<String, usize> = BTreeMap::new();
        for t in tokens {
            if !is_stopword(t) {
                *freq.entry(t.clone()).or_insert(0) += 1;
            }
        }

        // Sort by frequency, then alphabetically (deterministic)
        let mut items: Vec<(String, usize)> = freq.into_iter().collect();
        items.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

        // Extract top N
        let mut signature_tokens: Vec<String> = items
            .into_iter()
            .take(top_n)
            .map(|(w, _)| w)
            .collect();

        // Sort alphabetically for VOICE-I06
        signature_tokens.sort();
        signature_tokens.dedup();

        // Ellipsis rate (HARD metric - author signature)
        let ellipsis = text.matches("...").count() as f64
            + text.chars().filter(|c| *c == '…').count() as f64;

        metrics.push(VoiceMetric::hard(
            VoiceDimension::D6Signature,
            "D6.ellipsis_rate",
            clamp_ratio(ellipsis / n_chars),
            "ratio",
        ));

        Ok(signature_tokens)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D7 - CADENCE
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d7_cadence(
        &self,
        paragraphs: &[String],
        tokens: &[String],
        n_tokens: f64,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<(), VoiceError> {
        let n_para = paragraphs.len().max(1) as f64;

        // Dialogue detection (starts with — or contains quotes)
        let dialogue = paragraphs
            .iter()
            .filter(|p| {
                p.starts_with('—')
                    || p.starts_with('-')
                    || p.contains('"')
                    || p.contains('«')
            })
            .count() as f64;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D7Cadence,
            "D7.action_beat_rate",
            clamp_ratio(
                tokens.iter().filter(|t| is_action_verb(t)).count() as f64 / n_tokens,
            ),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D7Cadence,
            "D7.dialogue_ratio",
            clamp_ratio(dialogue / n_para),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D7Cadence,
            "D7.narration_ratio",
            clamp_ratio((n_para - dialogue).max(0.0) / n_para),
            "ratio",
        ));

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // D8 - FIGURES
    // ═══════════════════════════════════════════════════════════════════════════

    fn compute_d8_figures(
        &self,
        text: &str,
        n_chars: f64,
        metrics: &mut Vec<VoiceMetric>,
    ) -> Result<(), VoiceError> {
        let quest = text.chars().filter(|c| *c == '?').count() as f64;
        let parens = text
            .chars()
            .filter(|c| *c == '(' || *c == ')')
            .count() as f64;
        let colons = text
            .chars()
            .filter(|c| *c == ':' || *c == ';')
            .count() as f64;
        let ellipsis = text.matches("...").count() as f64
            + text.chars().filter(|c| *c == '…').count() as f64;

        metrics.push(VoiceMetric::soft(
            VoiceDimension::D8Figures,
            "D8.colon_semicolon_rate",
            clamp_ratio(colons / n_chars),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D8Figures,
            "D8.ellipsis_rate",
            clamp_ratio(ellipsis / n_chars),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D8Figures,
            "D8.parenthesis_rate",
            clamp_ratio(parens / n_chars),
            "ratio",
        ));
        metrics.push(VoiceMetric::soft(
            VoiceDimension::D8Figures,
            "D8.rhetorical_q_ratio",
            clamp_ratio(quest / n_chars),
            "ratio",
        ));

        Ok(())
    }
}

impl VoiceAnalyzer for StatsVoiceAnalyzer {
    fn analyze(&self, text: &str, cfg: &VoiceConfig) -> Result<VoiceAnalysisResult, VoiceError> {
        self.analyze_internal(text, cfg)
    }

    fn name(&self) -> &'static str {
        "StatsVoiceAnalyzer"
    }

    fn version(&self) -> &'static str {
        "1.0.0"
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

fn stddev(values: &[f64]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }
    let m = mean(values);
    let variance = values.iter().map(|x| (x - m).powi(2)).sum::<f64>() / values.len() as f64;
    variance.sqrt()
}

fn clamp_ratio(v: f64) -> f64 {
    if v.is_nan() {
        0.0
    } else {
        v.clamp(0.0, 1.0)
    }
}

fn compute_entropy(counts: &BTreeMap<String, usize>) -> f64 {
    let total: usize = counts.values().sum();
    if total == 0 {
        return 0.0;
    }

    let total_f = total as f64;
    let mut h = 0.0;

    for &v in counts.values() {
        let p = v as f64 / total_f;
        if p > 0.0 {
            h -= p * p.ln();
        }
    }

    // Normalize by ln(K) to get [0, 1]
    let k = counts.len().max(1) as f64;
    if k <= 1.0 {
        return 0.0;
    }

    (h / k.ln()).clamp(0.0, 1.0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_text() -> &'static str {
        "— Bonjour… dit-il. Pourquoi ?\n\nJe regarde l'ombre, puis la lumière.\nC'est calme, magnifique."
    }

    #[test]
    fn test_analyzer_produces_valid_profile() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();

        let result = analyzer.analyze(sample_text(), &cfg).unwrap();

        // Profile should be valid
        assert!(result.profile.validate().is_ok());
    }

    #[test]
    fn test_analyzer_deterministic() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();

        let r1 = analyzer.analyze(sample_text(), &cfg).unwrap();
        let r2 = analyzer.analyze(sample_text(), &cfg).unwrap();

        assert_eq!(r1.profile.profile_id, r2.profile.profile_id);
        assert_eq!(r1.profile.corpus_hash, r2.profile.corpus_hash);
        assert_eq!(r1.profile.metrics.len(), r2.profile.metrics.len());
    }

    #[test]
    fn test_empty_input_error() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();

        let result = analyzer.analyze("", &cfg);
        assert!(matches!(result, Err(VoiceError::EmptyInput)));
    }

    #[test]
    fn test_metrics_sorted() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();

        let result = analyzer.analyze(sample_text(), &cfg).unwrap();
        let keys: Vec<&str> = result.profile.metrics.iter().map(|m| m.key.as_str()).collect();

        let mut sorted = keys.clone();
        sorted.sort();

        assert_eq!(keys, sorted);
    }

    #[test]
    fn test_no_nan_inf() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();

        let result = analyzer.analyze(sample_text(), &cfg).unwrap();

        for m in &result.profile.metrics {
            assert!(!m.value.is_nan(), "NaN in {}", m.key);
            assert!(!m.value.is_infinite(), "Inf in {}", m.key);
        }
    }

    #[test]
    fn test_ratios_bounded() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();

        let result = analyzer.analyze(sample_text(), &cfg).unwrap();

        for m in &result.profile.metrics {
            if m.unit == "ratio" {
                assert!(
                    (0.0..=1.0).contains(&m.value),
                    "Ratio {} out of [0,1]: {}",
                    m.key,
                    m.value
                );
            }
        }
    }

    #[test]
    fn test_signature_tokens_sorted_unique() {
        let analyzer = StatsVoiceAnalyzer::new();
        let cfg = VoiceConfig::test_config();

        let result = analyzer.analyze(sample_text(), &cfg).unwrap();
        let toks = &result.profile.signature_tokens;

        let mut sorted = toks.clone();
        sorted.sort();
        assert_eq!(toks, &sorted, "signature_tokens not sorted");

        let mut dedup = sorted.clone();
        dedup.dedup();
        assert_eq!(sorted, dedup, "signature_tokens not unique");
    }
}
