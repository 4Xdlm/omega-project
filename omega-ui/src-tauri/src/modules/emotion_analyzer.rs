//! OMEGA Sprint C — Emotion Analyzer
//! Interface unifiée pour Lexicon / AI / Hybrid
//! v2.0 — Branché sur FR_LEXICON_V1_GOLD (118 keywords)

use serde::{Deserialize, Serialize};
use crate::error::OmegaResult;
use crate::ai::LLMProvider;
use super::analyzer_mode::AnalyzerMode;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

/// Résultat d'une analyse émotionnelle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionResult {
    pub emotion: String,
    pub score: f64,
    pub confidence: f64,
    pub source: EmotionSource,
    pub keywords: Vec<String>,
    pub lexicon_score: Option<f64>,
    pub ai_adjustment: Option<f64>,
}

/// Source de l'analyse
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EmotionSource {
    Lexicon,
    AI,
    Hybrid,
}

/// Métadonnées de l'analyse
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisMeta {
    pub mode: String,
    pub provider: Option<String>,
    pub ai_calls: u32,
    pub ai_usage: Option<AIUsage>,
    pub fallback_used: bool,
    pub deterministic: bool,
    pub lexicon_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Résultat complet d'analyse
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub emotions: Vec<EmotionResult>,
    pub dominant: Option<String>,
    pub total_hits: usize,
    pub meta: AnalysisMeta,
}

/// Seuil pour déclencher l'IA en mode Hybrid
const HYBRID_AMBIGUITY_THRESHOLD: f64 = 0.15;
const HYBRID_LOW_CONFIDENCE: f64 = 0.3;

/// Génère un ID unique basé sur timestamp
fn generate_run_id() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    format!("run_{}_{}", now.as_secs(), now.subsec_nanos())
}

/// Trait pour tous les analyzers
pub trait EmotionAnalyzer: Send + Sync {
    fn analyze(&self, text: &str) -> OmegaResult<AnalysisResult>;
    fn mode(&self) -> AnalyzerMode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEXICON ANALYZER (DETERMINISTIC) — BRANCHÉ SUR FR_LEXICON_V1_GOLD
// ═══════════════════════════════════════════════════════════════════════════════

pub struct LexiconAnalyzer;

impl LexiconAnalyzer {
    pub fn new() -> Self { Self }

    /// Analyse avec FR_LEXICON_V1_GOLD (118 keywords, aerospace-grade)
    pub fn analyze_with_lexicon(text: &str) -> Vec<EmotionResult> {
        use crate::lexicon_fr_gold::{analyze_gold, AnalyzerConfig, LEXICON_VERSION};
        
        let config = AnalyzerConfig::default();
        let gold_result = analyze_gold(text, None, &config);
        
        // Convertir les résultats FR Gold vers notre format
        gold_result.emotions.into_iter()
            .filter(|e| e.occurrences > 0)
            .map(|e| {
                EmotionResult {
                    emotion: e.emotion,
                    score: e.intensity,
                    confidence: if e.occurrences > 3 { 0.9 } else if e.occurrences > 1 { 0.7 } else { 0.5 },
                    source: EmotionSource::Lexicon,
                    keywords: e.keywords,
                    lexicon_score: Some(e.intensity),
                    ai_adjustment: None,
                }
            }).collect()
    }
    
    /// Retourne la version du lexicon utilisé
    pub fn lexicon_version() -> &'static str {
        crate::lexicon_fr_gold::LEXICON_VERSION
    }
}

impl EmotionAnalyzer for LexiconAnalyzer {
    fn analyze(&self, text: &str) -> OmegaResult<AnalysisResult> {
        let emotions = Self::analyze_with_lexicon(text);
        let total_hits: usize = emotions.iter().map(|e| e.keywords.len()).sum();
        let dominant = emotions.first().map(|e| e.emotion.clone());

        Ok(AnalysisResult {
            emotions,
            dominant,
            total_hits,
            meta: AnalysisMeta {
                mode: "deterministic".into(),
                provider: None,
                ai_calls: 0,
                ai_usage: None,
                fallback_used: false,
                deterministic: true,
                lexicon_version: Some(Self::lexicon_version().to_string()),
            },
        })
    }

    fn mode(&self) -> AnalyzerMode { AnalyzerMode::Deterministic }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI ANALYZER (BOOST)
// ═══════════════════════════════════════════════════════════════════════════════

pub struct AIAnalyzer {
    provider: Arc<dyn LLMProvider>,
}

impl AIAnalyzer {
    pub fn new(provider: Arc<dyn LLMProvider>) -> Self {
        Self { provider }
    }

    pub fn call_ai(&self, text: &str, lexicon_baseline: &[EmotionResult]) -> OmegaResult<(Vec<EmotionResult>, AIUsage)> {
        let baseline_json = serde_json::to_string(lexicon_baseline).unwrap_or_default();

        let request = crate::ai::models::CompletionRequest {
            run_id: generate_run_id(),
            seed: 42,
            system_prompt: "Tu es un expert en analyse émotionnelle littéraire. Analyse le texte et ajuste les scores émotionnels.".into(),
            user_prompt: format!(
                "Texte à analyser:\n{}\n\nBaseline Lexicon:\n{}\n\nRetourne un JSON avec les émotions ajustées.",
                &text[..text.len().min(2000)],
                baseline_json
            ),
            temperature: 0.3,
            max_tokens: 1000,
            schema_name: None,
            json_schema: Some(serde_json::json!({
                "type": "object",
                "properties": {
                    "emotions": {"type": "array"}
                }
            })),
            constraints: Default::default(),
        };

        let response = self.provider.generate(request)?;

        let usage = AIUsage {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
        };

        let ai_emotions = Self::parse_ai_response(&response.content, lexicon_baseline);

        Ok((ai_emotions, usage))
    }

    fn parse_ai_response(content: &str, baseline: &[EmotionResult]) -> Vec<EmotionResult> {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(content) {
            if let Some(emotions) = parsed.get("emotions").and_then(|e| e.as_array()) {
                return emotions.iter().filter_map(|e| {
                    let emotion = e.get("emotion")?.as_str()?;
                    let score = e.get("score")?.as_f64()?;
                    let baseline_score = baseline.iter()
                        .find(|b| b.emotion == emotion)
                        .map(|b| b.score);

                    Some(EmotionResult {
                        emotion: emotion.to_string(),
                        score,
                        confidence: 0.85,
                        source: EmotionSource::AI,
                        keywords: vec![],
                        lexicon_score: baseline_score,
                        ai_adjustment: baseline_score.map(|b| score - b),
                    })
                }).collect();
            }
        }

        baseline.iter().cloned().map(|mut e| {
            e.source = EmotionSource::AI;
            e
        }).collect()
    }
}

impl EmotionAnalyzer for AIAnalyzer {
    fn analyze(&self, text: &str) -> OmegaResult<AnalysisResult> {
        let baseline = LexiconAnalyzer::analyze_with_lexicon(text);
        let (emotions, usage) = self.call_ai(text, &baseline)?;
        let total_hits = emotions.len();
        let dominant = emotions.first().map(|e| e.emotion.clone());

        Ok(AnalysisResult {
            emotions,
            dominant,
            total_hits,
            meta: AnalysisMeta {
                mode: "boost".into(),
                provider: Some(self.provider.id()),
                ai_calls: 1,
                ai_usage: Some(usage),
                fallback_used: false,
                deterministic: false,
                lexicon_version: Some(LexiconAnalyzer::lexicon_version().to_string()),
            },
        })
    }

    fn mode(&self) -> AnalyzerMode { AnalyzerMode::Boost }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HYBRID ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

pub struct HybridAnalyzer {
    provider: Arc<dyn LLMProvider>,
}

impl HybridAnalyzer {
    pub fn new(provider: Arc<dyn LLMProvider>) -> Self {
        Self { provider }
    }

    fn needs_ai_clarification(emotions: &[EmotionResult]) -> bool {
        if emotions.is_empty() { return false; }

        if emotions.len() >= 2 {
            let diff = emotions[0].score - emotions[1].score;
            if diff.abs() < HYBRID_AMBIGUITY_THRESHOLD { return true; }
        }

        if emotions.iter().any(|e| e.confidence < HYBRID_LOW_CONFIDENCE) { return true; }

        false
    }
}

impl EmotionAnalyzer for HybridAnalyzer {
    fn analyze(&self, text: &str) -> OmegaResult<AnalysisResult> {
        let lexicon_emotions = LexiconAnalyzer::analyze_with_lexicon(text);

        if !Self::needs_ai_clarification(&lexicon_emotions) {
            let total_hits: usize = lexicon_emotions.iter().map(|e| e.keywords.len()).sum();
            let dominant = lexicon_emotions.first().map(|e| e.emotion.clone());

            return Ok(AnalysisResult {
                emotions: lexicon_emotions,
                dominant,
                total_hits,
                meta: AnalysisMeta {
                    mode: "hybrid".into(),
                    provider: None,
                    ai_calls: 0,
                    ai_usage: None,
                    fallback_used: false,
                    deterministic: true,
                    lexicon_version: Some(LexiconAnalyzer::lexicon_version().to_string()),
                },
            });
        }

        let ai_analyzer = AIAnalyzer::new(Arc::clone(&self.provider));
        match ai_analyzer.call_ai(text, &lexicon_emotions) {
            Ok((ai_emotions, usage)) => {
                let merged: Vec<EmotionResult> = ai_emotions.into_iter().map(|mut e| {
                    e.source = EmotionSource::Hybrid;
                    e
                }).collect();

                let total_hits = merged.len();
                let dominant = merged.first().map(|e| e.emotion.clone());

                Ok(AnalysisResult {
                    emotions: merged,
                    dominant,
                    total_hits,
                    meta: AnalysisMeta {
                        mode: "hybrid".into(),
                        provider: Some(self.provider.id()),
                        ai_calls: 1,
                        ai_usage: Some(usage),
                        fallback_used: false,
                        deterministic: false,
                        lexicon_version: Some(LexiconAnalyzer::lexicon_version().to_string()),
                    },
                })
            }
            Err(_) => {
                let total_hits: usize = lexicon_emotions.iter().map(|e| e.keywords.len()).sum();
                let dominant = lexicon_emotions.first().map(|e| e.emotion.clone());

                Ok(AnalysisResult {
                    emotions: lexicon_emotions,
                    dominant,
                    total_hits,
                    meta: AnalysisMeta {
                        mode: "hybrid".into(),
                        provider: None,
                        ai_calls: 0,
                        ai_usage: None,
                        fallback_used: true,
                        deterministic: true,
                        lexicon_version: Some(LexiconAnalyzer::lexicon_version().to_string()),
                    },
                })
            }
        }
    }

    fn mode(&self) -> AnalyzerMode { AnalyzerMode::Hybrid }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

pub fn create_analyzer(mode: AnalyzerMode, provider: Option<Arc<dyn LLMProvider>>) -> Box<dyn EmotionAnalyzer> {
    match mode {
        AnalyzerMode::Deterministic => Box::new(LexiconAnalyzer::new()),
        AnalyzerMode::Hybrid => {
            let p = provider.unwrap_or_else(|| Arc::new(crate::ai::FallbackProvider::from_env()));
            Box::new(HybridAnalyzer::new(p))
        }
        AnalyzerMode::Boost => {
            let p = provider.unwrap_or_else(|| Arc::new(crate::ai::FallbackProvider::from_env()));
            Box::new(AIAnalyzer::new(p))
        }
    }
}

