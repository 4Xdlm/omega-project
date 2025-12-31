//! OMEGA Pipeline Runner — Orchestrator
//! v2.0 — Passes réelles branchées (INTAKE + EMOTION_ANALYSIS)
//! NASA-Grade AS9100D

use crate::ai::LLMProvider;
use crate::pipeline::types::*;
use crate::pipeline::fs_utils::*;
use crate::modules::{IntakePass, AnalyzerMode, create_analyzer};
use crate::error::OmegaResult;
use std::sync::Arc;
use std::collections::BTreeMap;
use chrono::Utc;

pub struct PipelineRunner {
    pub provider: Arc<dyn LLMProvider>,
}

impl PipelineRunner {
    pub fn new(provider: Arc<dyn LLMProvider>) -> Self {
        Self { provider }
    }

    /// Exécute le pipeline complet avec toutes les passes
    pub fn run(&self, input: &str, seed: u64) -> OmegaResult<PipelineRun> {
        let run_id = format!("RUN_{}_{}", chrono::Utc::now().format("%Y%m%d_%H%M%S"), seed);
        let input_hash = sha256_str(input);

        let mut ctx = PipelineContext::new(
            run_id.clone(),
            seed,
            self.provider.id(),
            input.to_string(),
            input_hash.clone(),
        );

        // ═══════════════════════════════════════════════════════════════════
        // PASS 1: INTAKE — Normalisation input
        // ═══════════════════════════════════════════════════════════════════
        match IntakePass::execute(&mut ctx) {
            Ok(result) => {
                ctx.pass_results.push(result);
            }
            Err(e) => {
                ctx.success = false;
                ctx.audit_flags.push(format!("INTAKE_FAILED: {}", e));
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // PASS 2: EMOTION_ANALYSIS — Analyse émotionnelle FR Gold
        // ═══════════════════════════════════════════════════════════════════
        if ctx.success {
            match self.execute_emotion_pass(&mut ctx) {
                Ok(result) => {
                    ctx.pass_results.push(result);
                }
                Err(e) => {
                    ctx.success = false;
                    ctx.audit_flags.push(format!("EMOTION_ANALYSIS_FAILED: {}", e));
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // FINALIZE: Compute global hash
        // ═══════════════════════════════════════════════════════════════════
        ctx.global_hash = self.compute_global_hash(&ctx);

        Ok(PipelineRun {
            schema: "OMEGA_RUN_V1".to_string(),
            run_id,
            seed,
            provider_id: ctx.provider_id,
            input_hash,
            passes: ctx.pass_results,
            global_hash: ctx.global_hash,
            success: ctx.success,
            timestamp_iso: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Exécute la passe EMOTION_ANALYSIS avec FR_LEXICON_V1_GOLD
    fn execute_emotion_pass(&self, ctx: &mut PipelineContext) -> OmegaResult<PassResult> {
        let start = std::time::Instant::now();
        let prev_hash = ctx.last_chain_hash();

        // Récupérer le texte normalisé depuis les artifacts
        let text = ctx.artifacts.get("normalized_input")
            .and_then(|v| v.as_str())
            .unwrap_or(&ctx.input_raw);

        // Créer l'analyzer en mode déterministe (FR Gold)
        let analyzer = create_analyzer(AnalyzerMode::Deterministic, None);
        let analysis = analyzer.analyze(text)?;

        // Construire les artifacts
        let mut artifacts = BTreeMap::new();
        artifacts.insert("emotions".into(), serde_json::to_value(&analysis.emotions).unwrap_or_default());
        artifacts.insert("dominant_emotion".into(), serde_json::json!(analysis.dominant));
        artifacts.insert("total_hits".into(), serde_json::json!(analysis.total_hits));
        artifacts.insert("mode".into(), serde_json::json!(analysis.meta.mode));
        artifacts.insert("lexicon_version".into(), serde_json::json!(analysis.meta.lexicon_version));
        artifacts.insert("deterministic".into(), serde_json::json!(analysis.meta.deterministic));

        ctx.artifacts.extend(artifacts.clone());

        let input_hash = ctx.artifacts.get("normalized_input")
            .map(|v| sha256_str(&v.to_string()))
            .unwrap_or_else(|| ctx.input_hash.clone());

        let output_hash = sha256_str(&serde_json::to_string(&artifacts).unwrap_or_default());
        let chain_hash = compute_chain_hash("EMOTION_ANALYSIS", &prev_hash, &input_hash, &output_hash);

        let proof = PassProof {
            pass_id: "EMOTION_ANALYSIS".into(),
            input_hash,
            output_hash,
            chain_hash,
            prev_hash,
            timestamp_iso: Utc::now().to_rfc3339(),
            duration_ms: start.elapsed().as_millis() as u64,
        };

        Ok(PassResult {
            pass_id: "EMOTION_ANALYSIS".into(),
            success: true,
            artifacts,
            proof,
            error: None,
        })
    }

    /// Calcule le hash global du run (chaîne de tous les passes)
    fn compute_global_hash(&self, ctx: &PipelineContext) -> String {
        let mut chain = format!("{}|{}|{}", ctx.seed, ctx.input_hash, ctx.provider_id);
        
        for pass in &ctx.pass_results {
            chain.push_str(&format!("|{}", pass.proof.chain_hash));
        }
        
        sha256_str(&chain)
    }
}
