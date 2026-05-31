# NCR-M0B-SCRIBE-PRODUCTION-PATH-NO-LLM

**Status**: OPEN · **Severity**: HIGH (blocks DEC-009 gate) · **Date**: 2026-05-31 · **HEAD**: `8414b30b`
**Raised by**: Claude Code (pre-build faisability verification, OMEGA_TOTAL_CONTROL_FRAMEWORK_2000)
**Mode**: READ-ONLY — no engine code touched, no bench run. STOP before harness build.

---

## 1. Issue

The directive "GO bench M0.b" prescribes the scribe intake as **`creation-pipeline → runScribe`** and states the bench compares **the same LLM** across both engines ("MODÈLE IDENTIQUE… On compare les ARCHITECTURES, pas les LLM"). Source-verified, this premise is **false for the prescribed path**:

> **The production `runScribe` path performs ZERO LLM generation. Its prose is deterministic algorithmic recombination.**

Evidence (file\:line):
- `packages/creation-pipeline/src/pipeline/stage-scribe.ts:16` — `stageScribe` calls `runScribe(plan, canon, genome, emotion, constraints, sConfig, timestamp)` — **synchronous, no provider argument**.
- `packages/scribe-engine/src/engine.ts:110-157` — `runScribe` is sync; S2 calls deterministic `weave(skeleton, genome, constraints)` (engine.ts:145), S4 calls `rewriteLoop`. **No branch to an LLM weaver.**
- `packages/scribe-engine/src/rewriter.ts:158-216` — `rewriteProse`: *"Deterministic: same skeleton + same passNumber → same output"*; it splits words and strips filler (`thing/stuff/something`), then re-hashes. **No provider, no LLM.** Gates (rewriter.ts:30-126) and oracles (128-156) are deterministic CALC.
- Repo's own audit `docs/architecture/OMEGA_ENGINE_CAPABILITY_AUDIT_E2E_2026-05-31.md:10`: *"Génération = `weave` (règle déterministe) **par défaut**, ou `weaveLLM` (via CLI scribe-llm + provider)."*
- M0.b's own roadmap definition `docs/architecture/OMEGA_NARRATIVE_ENGINE_FUSION_ROADMAP.md:9`: the bench is meant to *"fonder la destitution de **weaveLLM**"* — i.e. it should bench scribe's **`weaveLLM`** path, **not** the deterministic `weave`/`runScribe`.

**Consequence**: Running the literal protocol benches *deterministic-word-recombination scribe* against *real-qwen3:32b sovereign*, then scores both with S-Oracle V2. Sovereign wins **by construction** — a **category error**, not a measure of architectural superiority. Doctrine (roadmap M0.b / DEC-009) forbids destitution without a *valid* superiority bench; an invalid bench is worse than none. → **STOP + NCR** (REPO=TRUTH #9, NCR-OVER-HEROICS #8, E-14).

## 2. Feasible corrected path (verified)

Scribe's LLM weaver **can** run on Ollama qwen3:32b, **zero paid API, no engine-code change**, from a `scripts/` harness using public exports:
- `createScribeProvider({ mode: 'ollama', model: 'qwen3:32b', … })` — `packages/scribe-engine/src/providers/factory.ts:23-24` (the `'ollama'` mode exists; the scribe-llm CLI just never exposes it — its `--mode llm` is **Anthropic/paid**, scribe-llm.ts:81,88-91).
- `weaveLLM(skeleton, plan, constraints, genome, emotion, provider, seed, intent)` — `packages/scribe-engine/src/weaver-llm.ts:73` (real LLM prose, master prompt).
- Skeleton from `segmentPlan(plan)` + `buildSkeleton(...)` (scribe-llm.ts:96-99).

Sovereign side unchanged and already proven runnable on Ollama: `runSovereignForgeWithPacket(packet, createOllamaProvider({model:'qwen3:32b'}))` (`scripts/bench-v-atomic-v5-ollama.ts`). Scorer = `judgeAestheticV3` (S-Oracle V2, `packages/sovereign-engine/src/oracle/aesthetic-oracle.ts:82`) on both prose outputs, judge temp 0.0.

## 3. Confounds requiring an explicit decision (would taint the gate if unaddressed)

| ID | Confound | Impact on "compare architectures, same LLM" |
|----|----------|---------------------------------------------|
| **CF1** | Prescribed `runScribe` = no LLM (above). | Must substitute **`weaveLLM`** for `runScribe`. **Deviates from directive text** → needs Architect sign-off. |
| **CF2** | Scribe `weaveLLM` and sovereign use **different Ollama provider implementations** (distinct prompt builders, temperature/penalty defaults): `scribe-engine/src/providers/ollama-provider.ts` vs `sovereign-engine/src/runtime/ollama-provider.ts`. | "Same LLM" holds at the **model** level (qwen3:32b) but **not** at the harness level. Architectural-vs-LLM separation is partial. |
| **CF3** | **Intake asymmetry (fundamental, not residual).** `weaveLLM` = **generate-from-plan** (GenesisPlan+IntentPack). `buildForgePacketFromSegment` (V2.3-A, `deriveForgePacket.ts:141`) = **rewrite an existing prose SEGMENT**. The Golden is an **IntentPack** (premise+canon), not a prose segment — sovereign's V2.3-A intake has **no segment to consume** without inventing one. Generate ≠ rewrite = different tasks. | This is the core scientific risk. Two sub-decisions: **(a)** keep V2.3-A rewrite (need a segment source) or **(b)** use sovereign's generate-from-plan forge (assemble ForgePacket from the same Golden plan) for a true same-task duel. |
| **CF4** | Ollama **native `seed` is NOT passed to the API** — seed is only embedded in the prompt text (`sovereign-engine/src/runtime/ollama-provider.ts` requestBody has no `options.seed`). | "Seed fixé" is **nominal**; same seed ≠ identical output. Determinism = report mean+stdev over N≥5 and document Ollama variance (directive already anticipated this). |

## 4. Options (Decision — pending Francky)

- **Option A — weaveLLM + V2.3-A rewrite, segment supplied.** scribe=`weaveLLM`(Ollama qwen3:32b); sovereign=`buildForgePacketFromSegment` on a segment derived from the Golden (e.g. its `premise`/reference passage). Honours "V2.3-A" but keeps CF3 generate-vs-rewrite asymmetry (documented).
- **Option B — RECOMMENDED — same-task generate-from-plan duel.** Both generate from the **same Golden plan**: scribe=`weaveLLM`; sovereign=full forge from a ForgePacket assembled from that plan (the `bench-v-atomic` path), **not** `buildForgePacketFromSegment`. Cleanest "same model, same task, different architecture". Deviates from "V2.3-A" wording but matches M0.b's scientific intent. CF2/CF4 remain (documented).
- **Option C — literal directive (runScribe vs sovereign).** REJECTED by analysis: invalid superiority proof. I will **not** run this.

Secondary decision if Option A: segment source = (i) Golden premise text, (ii) a fixed neutral reference passage, or (iii) scribe's own output (creates dependency — discouraged).

## 5. Requested decision

1. Confirm scribe intake = **`weaveLLM` (Ollama qwen3:32b)**, superseding the directive's `runScribe` (CF1). 
2. Choose **Option A or B** for the sovereign intake / task-parity (CF3).
3. Acknowledge CF2 + CF4 as documented confounds (no fix without engine-code change, which is forbidden).

On GO, I build the harness under `scripts/metrology/` (EMP-10 gated), run N≥5×2 on Ollama qwen3:32b (keep_alive 24h), score with S-Oracle V2, and deliver `docs/audit/metrology/M0B_BENCH_REPORT.md` with the verdict + all confounds. Until then: **no harness, no run.**

## 6. Side note — announced skills absent

The directive lists skills `omega-bench-runner`, `ollama-orchestrator`, `llm-cost-guard`. None exist in this repo (no `.claude/skills/`, no matching dirs). I proceed from the existing Ollama bench scripts (`scripts/bench-v-atomic-v5-ollama.ts`, `packages/sovereign-engine/scripts/bench-*-ollama.ts`) as the reference instead. Flagged for traceability.

---
**Decision**: _Pending Francky approval._
