# OMEGA IRM — LIVRABLE 11 : PIPELINE ATLAS TOTAL
**Date** : 2026-04-02 | **HEAD** : e1b92dd3 | **Standard** : NASA-Grade L4

---

## PIPELINE A — LIVE (engine.ts : runSovereignForge / executePipeline)

### Chemin nominal (16 étapes)

| # | Fonction | Fichier | Type | Entrée | Sortie |
|---|----------|---------|------|--------|--------|
| 1 | generateSymbolMap | symbol/symbol-mapper.ts | LLM | ForgePacket + Provider | SymbolMap |
| 2 | bridgeSignatureFromSymbolMap | input/signature-bridge.ts | CALC | ForgePacket + SymbolMap | enrichedPacket (lexicon+motifs) |
| 3 | buildEmotionBriefFromPacket | input/emotion-brief-bridge.ts | CALC | enrichedPacket.emotion_contract | ForgeEmotionBrief |
| 4 | compilePartition (V3) / buildSovereignPrompt_V4 (V4) | compiler/prompt-compiler.ts / input/prompt-assembler-v4.ts | CALC | enrichedPacket + CDEInput + Instructions | CompiledPartition / SovereignPrompt (11 blocs ~800t) |
| 5 | generateChunkedDraft (V4) / provider.generateDraft | generation/chunked-generator.ts | LLM | Prompt + seed | initialDraft (~3000w, 4 chunks × 750w) |
| 6 | applySemanticSlicing (V4) | guards/semantic-slicer.ts | CALC | initialDraft | >=4 paragraphes |
| 7 | runPhysicsAudit | oracle/physics-audit.ts | CALC | draft + emotionBrief + canonical_table | PhysicsAuditResult (informatif) |
| 8 | generatePrescriptions | prescriptions/index.ts | CALC | physicsAudit | Prescriptions top-K |
| 9 | runSovereignLoop | pitch/sovereign-loop.ts | LLM+CALC | draft + packet + provider | SovereignLoopResult (max 2 passes: delta→pitch→patch) |
| 10 | judgeAestheticV3 (seal check) | oracle/aesthetic-oracle.ts | LLM+CALC | packet + prose + provider | MacroSScore (ECC/RCI/SII/IFI/AAI) |
| 11 | runDuel (si pas SEAL) | duel/duel-engine.ts | LLM | packet + prompt + provider + loopProse | DuelResult (3 modes + loop_refined, CV_GATE 1.05) |
| 12 | applySemanticSlicing (post-duel) | guards/semantic-slicer.ts | CALC | duel winner | >=4 paragraphes |
| 13 | runMicroSurgery (V4) | microsurgery/micro-surgeon.ts | LLM | packet + prose + archetype | MicroSurgeryResult (max 2 micro-LLM ~50t) |
| 14 | CLIFF-GATE (BB-01) | engine.ts (inline) | CALC | final prose last 100 words | Guillotine déterministe si cliff_score > 0.30 |
| 15 | judgeAestheticV3 (final) | oracle/aesthetic-oracle.ts | LLM+CALC | prose finale | MacroSScore FINAL |
| 16 | runTargetedPatch (P5, si REJECT) | polish/targeted-patch.ts | LLM | prose + weakest axis | PatchResult (chirurgical) |

**Post-pipeline** : buildQualityReport (quality/quality-bridge.ts, CALC, informatif M1-M12)

### Variantes d'entrée
- `runSovereignForge(input, provider, cdeInput?)` : depuis ForgePacketInput, avec validation
- `runSovereignForgeWithPacket(packet, provider, cdeInput?)` : packet pré-construit, pas de validation
- `runSovereignForgeBestOfN(packet, provider, n=3)` : N × pipeline complet, early exit sur SAGA_READY

### Appels LLM (happy path)
- Étape 1 : SymbolMap (1 call)
- Étape 5 : Chunked draft (4 calls × 750w)
- Étape 9 : SovereignLoop (2 passes × [delta_CALC + pitch_LLM + patch_LLM] = ~4 calls)
- Étape 10 : V3 judge (5 LLM axes : interiority, sensory, necessity, impact, emotion_coherence)
- Étape 11 : Duel (3 drafts × 1 call + 3-4 V1 judges + 3-4 V3 judges) = ~10 calls
- Étape 13 : MicroSurgery (~2 micro calls)
- Étape 15 : V3 judge final (5 LLM axes)
- Étape 16 : Targeted Patch (~2 calls)
- **Total estimé : ~30-35 appels LLM**

---

## PIPELINES D'ÉCHEC (ARBRES DE REJET)

### Gate 1 : ForgePacket Validation (engine.ts:159-162)
```
SI validation.valid === false
  → THROW Error("FORGE_PACKET validation failed: ...")
  → ARRÊT TOTAL — pas de retry
```
Source : `input/pre-write-validator.ts`

### Gate 2 : SovereignLoop verdict (engine.ts:356)
```
SI loop_result.verdict === 'SEAL'
  → judgeAestheticV3 seal check
    SI V3.verdict === 'SEAL' → RETURN SEAL (fast path, skip duel)
    SI V3.verdict !== 'SEAL' → CONTINUE vers duel (V3 a autorité sur V1)
SI loop_result.verdict === 'REJECT'
  → CONTINUE vers duel
```

### Gate 3 : CV_GATE (duel-engine.ts:30-31)
```
POUR chaque draft du duel :
  cv = computeCVSent(prose)
  SI cv > CV_GATE_REJECT (1.05 normal, 2.50 hybrid)
    → RETRY (max 2 retries)
    → SI 3 tentatives échouent → utiliser le meilleur cv
```

### Gate 4 : Duel Selection (duel-engine.ts)
```
Score = comp - 1.5 × max(0, 85 - min_axis)
→ Pénalise les axes faibles pour sélection hostile
→ Winner = max(score) parmi (loop_refined + 3 drafts)
```

### Gate 5 : CLIFF-GATE (engine.ts:440-478)
```
cliff_score = tension × 0.5 + ellipsis × 0.3 + incomplete × 0.2
SI cliff_score > 0.30
  → GUILLOTINE DÉTERMINISTE : amputer dernière phrase
  → Pas de LLM, troncature pure
```

### Gate 6 : Damage Gate (microsurgery/damage-gate.ts)
```
POUR chaque micro-intervention proposée :
  delta = slope × min(amplitude, 0.50) × archetype_factor
  SI delta > threshold[category]
    → BLOCKED (intervention rejetée, prose conservée)
  Seuils par catégorie : 0.01 (MUSICALITE) à 0.50 (TENSION)
```

### Gate 7 : Targeted Patch P5 (polish/targeted-patch.ts)
```
SI verdict !== 'SEAL' ET isTargetedPatchActive()
  → Tenter patch chirurgical sur axe le plus faible
  SI patchResult.accepted → prose patchée, re-score V3
  SI patchResult.rejected → prose originale conservée
```

### Verdict final
```
composite >= 92.0 AND min_axis >= 85.0 → SAGA_READY
composite >= 93.0 AND min_axis >= 85.0 → SEAL_ATOMIC
Sinon → REJECT
```

---

## PIPELINE B — OFFLINE (pipeline/sovereign-pipeline.ts)
Type : CALC pur, 0 API
Entrée : prose brute + config
Sortie : scores + verdict
Usage : benchmark, évaluation sans LLM

## PIPELINE C — Genesis V2 (oracle/genesis-v2/)
Type : env-gated (OMEGA_GENESIS_V2=1)
Fichiers : diffusion-runner.ts, genesis-runner.ts, paradox-gate.ts, patch-dsl.ts, transcendent-planner.ts
Usage : planification avancée

## PIPELINE D — CDE (cde/)
Type : V-PROTO
Fichiers : cde-pipeline.ts, distiller.ts, delta-extractor.ts, delta-compressor.ts, scene-chain.ts
Usage : Context Distillation Engine, distillation de SceneBrief

---

## PIPELINES HORS SOVEREIGN-ENGINE

### P-CORPUS : omega-autopsie
```
full_work_analyzer_v4.py → results_r1/ (183 fichiers)
full_work_analyzer_v5.py → results_r2/ + results_rosetta/
Pipeline : Load epub/txt → Window extraction → 42/121 features → JSON results
```

### P-ROSETTA : results_rosetta/
```
94 fichiers de résultats cross-test
Pipeline : Blackbox runs → Feature extraction → Cross-correlation
```

### P-PVI : scripts/pvi/pvi_module_autonome.py
```
Pipeline P1→P5 :
  P1 : Calcul Proximité (distance au corpus)
  P2 : Calcul Variabilité (dispersion interne)
  P3 : Calcul Intention Proxy (I)
  P4 : AUC = 0.9728 → classification
  P5 : PVI final (P=0.006, I=0.004, U=0.001)
Zone OMEGA cartographiée, levier dominant = I (88% du delta)
```

---

*Livrable généré par lecture MANUELLE de engine.ts (615 lignes), duel-engine.ts, damage-gate.ts, aesthetic-oracle.ts, types.ts*
*repo_live_confirmed: true*
