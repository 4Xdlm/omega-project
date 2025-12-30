//! OMEGA Sprint C — Emotion Analyzer
//! Interface unifiée pour Lexicon / AI / Hybrid

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
// LEXICON ANALYZER (DETERMINISTIC)
// ═══════════════════════════════════════════════════════════════════════════════

pub struct LexiconAnalyzer;

impl LexiconAnalyzer {
    pub fn new() -> Self { Self }
    
    pub fn analyze_with_lexicon(text: &str) -> Vec<EmotionResult> {
        // Utilise le lexicon intégré dans lib.rs (get_emotion_keywords)
        // Pour l'instant on fait une analyse simple basée sur les keywords
        let keywords_map = crate::get_emotion_keywords();
        let lower_text = text.to_lowercase();
        let mut results: Vec<EmotionResult> = Vec::new();
        let mut total_hits = 0usize;
        
        for (emotion, keywords) in keywords_map.iter() {
            let mut found: Vec<String> = Vec::new();
            let mut count = 0usize;
            
            for kw in keywords {
                let c = lower_text.matches(kw).count();
                if c > 0 {
                    found.push(kw.to_string());
                    count += c;
                }
            }
            
            if count > 0 {
                total_hits += count;
                results.push(EmotionResult {
                    emotion: emotion.to_string(),
                    score: 0.0, // sera normalisé après
                    confidence: if count > 3 { 0.9 } else { 0.6 },
                    source: EmotionSource::Lexicon,
                    keywords: found,
                    lexicon_score: None,
                    ai_adjustment: None,
                });
            }
        }
        
        // Normaliser les scores
        if total_hits > 0 {
            for r in &mut results {
                let count: usize = r.keywords.iter().map(|k| lower_text.matches(k.as_str()).count()).sum();
                r.score = count as f64 / total_hits as f64;
                r.lexicon_score = Some(r.score);
            }
        }
        
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results
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
            let p = provider.unwrap_or_else(|| Arc::new(crate::ai::MockDeterministicProvider::new()));
            Box::new(HybridAnalyzer::new(p))
        }
        AnalyzerMode::Boost => {
            let p = provider.unwrap_or_else(|| Arc::new(crate::ai::MockDeterministicProvider::new()));
            Box::new(AIAnalyzer::new(p))
        }
    }
}
