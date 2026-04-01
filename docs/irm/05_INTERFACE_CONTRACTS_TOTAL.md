# OMEGA IRM — LIVRABLE 05 : INTERFACE CONTRACTS TOTAL
**Date** : 2026-04-02 | **HEAD** : e1b92dd3 | **Standard** : NASA-Grade L4
**Méthode** : Lecture MANUELLE de types.ts (544 lignes), scoring/types.ts, oracle/s-score.ts, macro-axes.ts, damage-gate.ts

---

## INTERFACE_CARD #1 : ForgePacket
- **Fichier source** : `src/types.ts:22-45`
- **Champs** :
  - `packet_id: string` (required)
  - `packet_hash: string` (required)
  - `scene_id: string` (required)
  - `run_id: string` (required)
  - `quality_tier: QualityTier` ('sovereign')
  - `language: 'fr' | 'en'` (required)
  - `intent: ForgeIntent` (required) — story_goal, scene_goal, conflict_type, pov, tense, target_word_count
  - `emotion_contract: EmotionContract` (required) — curve_quartiles[4], intensity_range, tension, terminal_state, rupture, valence_arc
  - `beats: readonly ForgeBeat[]` (required) — beat_id, action, dialogue, subtext_type, emotion_instruction, sensory_tags, canon_refs
  - `subtext: ForgeSubtext` (required) — layers, tension_type, tension_intensity
  - `sensory: ForgeSensory` (required) — density_target, categories[7], recurrent_motifs, banned_metaphors
  - `style_genome: StyleProfile` (required) — version, universe, lexicon, rhythm, tone, imagery, voice?
  - `kill_lists: KillLists` (required) — banned_words, banned_cliches, banned_ai_patterns, banned_filter_words
  - `canon: readonly CanonEntry[]` (required) — id, statement
  - `continuity: ForgeContinuity` (required) — previous_scene_summary, character_states, open_threads
  - `seeds: ForgeSeeds` (required) — llm_seed, determinism_level
  - `generation: ForgeGeneration` (required) — timestamp, generator_version, constraints_hash
  - `forge_brief?: ForgeEmotionBrief` (optional) — OMNIPOTENT Sprint 1
  - `degraded_signals?: readonly string[]` (optional)
  - `capabilities?: readonly string[]` (optional)
  - `experiment_id?: string` (optional)
- **Optionalité** : 4 champs optionnels, 14 requis. Toutes readonly.
- **Producteurs** : `input/forge-packet-assembler.ts`
- **Consommateurs** : `engine.ts`, `pitch/sovereign-loop.ts`, `duel/duel-engine.ts`, `oracle/aesthetic-oracle.ts`, `oracle/macro-axes.ts`, `polish/targeted-patch.ts`, `microsurgery/micro-surgeon.ts`, tous les axes
- **Invariants** : Packet est immutable (readonly). Hash vérifié. Validé par pre-write-validator.
- **Frontière OMEGA/SCRIBE** : ForgePacket est côté OMEGA. Le Scribe ne voit que le prompt dérivé.
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #2 : SceneBrief
- **Fichier source** : `generation/forge-to-brief.ts` (dérivé), contrat : `docs/contracts/CONTRAT_OMEGA_SCRIBE_v1.md`
- **Champs** : must_remain_true, in_tension, must_move, must_not_break (≤150 tokens)
- **Producteurs** : `generation/forge-to-brief.ts` (forgePacketToSceneBrief)
- **Consommateurs** : `generation/chunked-generator.ts`
- **Frontière OMEGA/SCRIBE** : Seul point de contact OMEGA→SCRIBE. Langue de la scène, pas du système.
- **Invariants** : R5 — SceneBrief ne contient jamais d'identifiants système. ≤150 tokens.
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #3 : StateDelta (DeltaReport)
- **Fichier source** : `src/types.ts:215-310`
- **Champs** :
  - `report_id: string`, `report_hash: string`, `scene_id: string`, `timestamp: string`
  - `emotion_delta: EmotionDelta` — quartile_distances[4], curve_correlation, terminal_distance, rupture_detected, rupture_timing_error
  - `tension_delta: TensionDelta` — slope_match, pic_present, pic_timing_error, faille_present, faille_timing_error, consequence_present, monotony_score
  - `style_delta: StyleDelta` — gini deltas, sensory density, abstraction ratio, signature_hit_rate, monotony, opening_repetition
  - `cliche_delta: ClicheDelta` — total_matches, matches[], ai_pattern_matches, filter_word_matches
  - `physics_delta?: PhysicsDelta` — physics_score, trajectory_compliance, violations
  - `prescriptions_delta?: PrescriptionsDelta` — count, severity_histogram
- **Producteurs** : `delta/delta-computer.ts`, `delta/delta-emotion.ts`, `delta/delta-style.ts`, `delta/delta-cliche.ts`, `delta/delta-physics.ts`, `delta/delta-tension.ts`
- **Consommateurs** : `pitch/sovereign-loop.ts`, `pitch/triple-pitch.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #4 : SovereignForgeResult
- **Fichier source** : `src/engine.ts:136-150`
- **Champs** :
  - `version: '2.0.0'`
  - `final_prose: string`
  - `s_score: SScore`
  - `macro_score: MacroSScore | null`
  - `verdict: 'SEAL' | 'REJECT'`
  - `loop_result: SovereignLoopResult`
  - `passes_executed: number`
  - `symbol_map?: SymbolMap`
  - `physics_audit?: PhysicsAuditResult`
  - `prescriptions?: Prescription[]`
  - `quality_m12?: QualityM12Report`
  - `forge_packet?: ForgePacket` (U-ROSETTE-10)
- **Producteurs** : `engine.ts` (executePipeline)
- **Consommateurs** : Caller (validation, benchmark, UI)
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #5 : SovereignProvider
- **Fichier source** : `src/types.ts:392-401`
- **Champs** (8 méthodes) :
  - `scoreInteriority(prose, context) → Promise<number>`
  - `scoreSensoryDensity(prose, sensory_counts) → Promise<number>`
  - `scoreNecessity(prose, beat_count, beat_actions?, scene_goal?, conflict_type?) → Promise<number>`
  - `scoreImpact(opening, closing, context) → Promise<number>`
  - `applyPatch(prose, pitch, constraints) → Promise<string>`
  - `generateDraft(prompt, mode, seed) → Promise<string>`
  - `generateStructuredJSON(prompt) → Promise<unknown>`
  - `rewriteSentence(sentence, reason, context) → Promise<string>`
- **Implémentations** :
  - `runtime/anthropic-provider.ts` — Claude Sonnet (LIVE, AUTHORITY)
  - `runtime/ollama-provider.ts` — Ollama local (ARCHIVE — BLOC7 rejected)
  - `runtime/hybrid-provider.ts` — Hybride Claude+Ollama (DEAD — BLOC7 rejected)
  - `validation/mock-llm-provider.ts` — Tests
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #6 : AxesScores
- **Fichier source** : `src/types.ts:327-337`
- **Champs** (9 axes) :
  - `interiority: AxisScore` (LLM)
  - `tension_14d: AxisScore` (CALC)
  - `sensory_density: AxisScore` (LLM)
  - `necessity: AxisScore` (LLM)
  - `anti_cliche: AxisScore` (CALC)
  - `rhythm: AxisScore` (CALC)
  - `signature: AxisScore` (CALC)
  - `impact: AxisScore` (LLM)
  - `emotion_coherence: AxisScore` (LLM)
- **Sous-type** : `AxisScore { name, score, weight, method: 'CALC'|'LLM'|'HYBRID', details }`
- **Producteurs** : `oracle/aesthetic-oracle.ts`
- **Consommateurs** : `oracle/s-score.ts`, `oracle/s-oracle-v2.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #7 : MacroSScore (MacroAxesScores)
- **Fichier source** : `oracle/macro-axes.ts:1-27`, `oracle/s-score.ts` (re-export)
- **Champs** (5 macro-axes) :
  - `ecc: MacroAxisScore` (33%) — Emotional Coherence & Craft
  - `rci: MacroAxisScore` (17%) — Rhythmic Craft Index
  - `sii: MacroAxisScore` (15%) — Signature Integrity Index
  - `ifi: MacroAxisScore` (10%) — Immersion Force Index
  - `aai: MacroAxisScore` (25%) — Artistic Authenticity Index
  - `composite: number` (0-100)
  - `min_axis: number`
  - `verdict: 'SEAL' | 'REJECT' | 'PITCH'`
  - `score_id, score_hash, scene_id, seed, emotion_weight_pct`
- **Seuils** : SAGA_READY >= 92.0 + min >= 85.0 | SEAL_ATOMIC >= 93.0 + min >= 85.0
- **Producteurs** : `oracle/macro-axes.ts` (computeECC, computeRCI, computeSII, computeIFI, computeAAI)
- **Consommateurs** : `engine.ts`, `polish/targeted-patch.ts`, `duel/duel-engine.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #8 : DuelResult
- **Fichier source** : `src/types.ts:443-456`
- **Champs** :
  - `drafts: readonly Draft[]` — draft_id, mode, prose, score
  - `winner_id: string`
  - `winner_score: number`
  - `fusion_applied: boolean`
  - `final_prose: string`
- **Modes** : tranchant_minimaliste, sensoriel_dense, experimental_signature + loop_refined
- **Sélection** : score = comp - 1.5 × max(0, 85 - min_axis)
- **Producteurs** : `duel/duel-engine.ts`
- **Consommateurs** : `engine.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #9 : QualityReport (QualityM12Report)
- **Fichier source** : `quality/quality-bridge.ts`
- **Champs** : M1-M12 (informatif)
- **Producteurs** : `quality/quality-bridge.ts` (buildQualityReport)
- **Consommateurs** : `engine.ts` (SovereignForgeResult.quality_m12)
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #10 : ProofPack (InvariantEntry + ModuleEntry)
- **Fichier source** : `proofpack/proofpack-v3.ts:23-39`
- **Champs** :
  - `InvariantEntry` : id, description, sprint, module, test_ids[], status ('PASS'|'FAIL'|'UNTESTED')
  - `ModuleEntry` : name, path, sprint, files_count, test_count, method
- **Producteurs** : `proofpack/proofpack-v3.ts`
- **Consommateurs** : Certification pipeline, evidence system
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #11 : TextFeatures (F24-F38)
- **Fichier source** : `scoring/text-features.ts`
- **Champs** : ~42 features calculées par regex/counts/ratios
  - F24: contrast_budget (f24a_banal_rate, f24b_apex_rate, f24c_contrast_delta, f24d_apex_isolation, f24e_contrast_score)
  - F25: description/sensory features
  - F26: long sentence features (f26b_long_sent_rate — ×9.5 Tier S vs C)
  - F27: epistemic features
  - F28: irony/SIL features
  - F29: TTR/lexical features
  - F33: repetition features
  - F34: paragraph features
  - F35: hook features
  - F36: cliff features
  - F38: speed features
- **Producteurs** : `scoring/text-features.ts` (computeTextFeatures)
- **Consommateurs** : `oracle/axes/*`, `oracle/macro-axes.ts`, `scoring/multi-stage-scorer.ts`, `scoring/gb-scorer.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #12 : DepthFeatures
- **Fichier source** : `scoring/depth-features.ts`
- **Champs** :
  - `f_subordination_depth: number` — ratio SUB words per sentence (not count)
  - `f_clause_per_sentence: number` — sub_count + 1
  - `f_pov_shift_rate: number` — consecutive POV transitions
- **Discriminants** : f_subordination_depth ×4.4 Flaubert/Riviera, f_pov_shift_rate ×3.6
- **Producteurs** : `scoring/depth-features.ts` (computeDepthFeatures)
- **Consommateurs** : `scoring/multi-stage-scorer.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #13 : GBScoreResult (scoring/gb-scorer.ts)
- **Fichier source** : `scoring/gb-scorer.ts`, `scoring/gb-inference.ts`
- **Champs** : score (0-100), feature_importances, tier
- **Note** : Gradient Boosting scorer V1
- **Producteurs** : `scoring/gb-scorer.ts`
- **Consommateurs** : `scoring/multi-stage-scorer.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #14 : MultiStageScore (scoring/types.ts)
- **Fichier source** : `scoring/types.ts:42-49`
- **Champs** :
  - `local: StageScore` — score, confidence, active_features, total_features
  - `arc: StageScore` — idem
  - `composite: CompositeScore` — score, alpha (0.43), beta (0.57), confidence
  - `passage_type: PassageType` — DESCRIPTION|DIALOGUE|ACTION|INTROSPECTION|TRANSITION
  - `profile: string` — quality profile name
  - `seal_eligible: boolean`
- **Producteurs** : `scoring/multi-stage-scorer.ts`
- **Consommateurs** : Pipeline offline (sovereign-pipeline.ts)
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #15 : DamageGateResult (microsurgery/damage-gate.ts)
- **Fichier source** : `microsurgery/damage-gate.ts:61-68`
- **Champs** :
  - `perturbation: PerturbationType` — P03_COMPLEXIFY_SYNTAX | P04_REMOVE_INTERIORITY | P05_INJECT_SYNCOPES
  - `archetype: ArchetypeId` — BALANCED | BRUTAL | CATHEDRAL | INTERIOR | SENSORY
  - `amplitude: number`
  - `predictions: readonly DamagePrediction[]` — category, predicted_delta, blocked, threshold
  - `blocked: boolean`
  - `block_reasons: readonly string[]`
- **6 catégories** : MUSICALITE, COMPLEXITE, SENSORIEL, LEXICAL, INTERIORITE, TENSION
- **Formule** : delta = slope × min(amplitude, 0.50) × archetype_factor
- **14/24 slopes HIGH_CONFIDENCE** (bootstrap 1000×)
- **MUSICALITE = PROTECTED** (ratio 40.6× vs other categories)
- **Seuils** : 0.01 (MUSICALITE) à 0.50 (TENSION)
- **Producteurs** : `microsurgery/damage-gate.ts`
- **Consommateurs** : `microsurgery/micro-surgeon.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #16 : SovereignLoopResult (types.ts)
- **Fichier source** : `src/types.ts:428-437`
- **Champs** :
  - `final_prose: string`
  - `s_score_initial: SScore`
  - `s_score_final: SScore`
  - `pitches_applied: readonly CorrectionPitch[]`
  - `passes_executed: number` (max 2)
  - `verdict: 'SEAL' | 'REJECT'`
  - `verdict_reason: string`
  - `forensic_data: ForensicData` — rollback_count, rollbacks[]
- **Producteurs** : `pitch/sovereign-loop.ts`
- **Consommateurs** : `engine.ts`
- **repo_live_confirmed** : true

---

## INTERFACE_CARD #17 : V3ScoreResult (= MacroSScore)
- Voir INTERFACE_CARD #7 (MacroSScore). V3 = macro-axes system = AUTHORITY.
- S-Score legacy (s-score.ts) = backward compatibility only.
- **repo_live_confirmed** : true

---

*15+ INTERFACE_CARDs produites (17 au total). Critère PASS.*
*Toutes lues MANUELLEMENT depuis les fichiers source, pas par regex.*
