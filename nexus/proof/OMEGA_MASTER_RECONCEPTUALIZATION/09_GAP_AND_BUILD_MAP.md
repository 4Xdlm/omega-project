# 09_GAP_AND_BUILD_MAP — la mémoire transformée en plan (REUSE/ADAPT/EXTEND/CREATE par mode)

## AUTONOMOUS_BOOK
REUSE : toute la chaîne C0→C9, juges APPROVED, extension cousue. EXTEND : **casting TOTAL obligatoire au plan** (morts/absents/village/géographie/navires + DriftRules — loi issue du 88k), quotas de fonctions dramatiques par acte (anti-72%-TRANSITION), cooldown tics branché aux directives, météo TemporalClaim pilotée. CREATE : entrée « Bible remplie » (IntentPack). HOLD : nouveau run complet interdit avant plan-lock (décision tribunaux 2026-06-06).

## REWRITE_DOCTOR — ✅ ASSEMBLÉ C11 (2026-06-06, E2E PASS sur 88k)
FAIT : orchestrateur `src/doctor/` (import 4 stratégies + casting auto + audit C9 + plan MECHANICAL_SAFE/SURGICAL_LLM-gated/SIGNAL_ONLY + executor diffé + re-audit) — 11 tests ; E2E : égale puis DÉPASSE le V1 manuel (3ᵉ couture ch.47 inédite). Garde-fous : dérive confuse ⇒ SIGNAL+décision humaine (GO_B incarné). RESTE (V2) : exécution SURGICAL réelle via port LLM gated ; branchement rewritePrompt V2.3 sur les packets ; import UI ; heuristique primitif-rare (lieu-double sous seuil).

## MYCELIUM_DNA — ✅ EXPORT NARRATIF LIVRÉ C12 (2026-06-06, BF-13 prouvé)
FAIT : `src/mycelium-export/narrative-genome.ts` (NARRATIVE_GENOME_V1 : cast+ledger+fonctions+tics+contentHash/chap+admissions, hash canon-kernel) — 5 tests ; E2E 88k : reproductibilité ✓ (même hash ×2), unicité ✓ (V0≠DOCTOR_V1), chaîne 50 admissions. Artefacts : MYCELIUM_EXPORT_V0.json / _DOCTOR_V1.json / MYCELIUM_PROOF.json. RESTE (V2) : fusion avec l'ADN émotionnel (format binaire genome SEALED, Emotion14), réconciliation dna.ts (UI), visualisation UI MYCELIUM (phase 17).

## MIXER_CONTROL
REUSE : lois Rosetta (registre PILOTABLE), 16 émotions M/λ/κ, leviers sélection (pondérations hostile-selection, seuils gates, profils/amorces, contrat plan). CREATE : potards-engine = table potard→{leviers, features mesurées, bornes, rapport} (BF-10), preset « tension/peur/mystère » premiers. INTERDIT : potard→prompt-coaching (BF-15/ADR-003). Critère : bench A/B potard ON/OFF avec δ mesuré sur les features cibles.

## COAUTHOR_GPS
REUSE : radar (C4 diff + C9 + continuity-oracle + scanner) sur texte humain incrémental. CREATE : trajectory-predictor (3-5 dérivations typées : enquête/tension/émotion/thriller/noir — sur RAILS du plan, jamais décideur), gps-narratif-core (état position/trajectoire), UI WRITING STUDIO (phase 18). Dépend : C13 potards (les potards modifient la trajectoire GPS — VISION §6).

## STYLE_CONTINUATION
REUSE : VoiceGenome+compiler, Story-State figé fin-de-tome, canon-kernel anti-anachronisme. CREATE : extracteur référence→VoiceGenome (flux complet), SAGA_CONTRACT (promesses inter-tomes : seeds/dettes trans-livres), RIGHTS_MODE enum + gate machine-level (VISION §8). Critère : un interquel court sur MES œuvres (OWN_WORK) sans violation canon.

## ROADMAP CONSOLIDÉE (post-ratification BF-09..15)
```
C-mem  Livre Maître v3 = scellé (CE dossier)          [FAIT 2026-06-06]
C10    PRODUCT_MODE_ROUTER + IntentPack Bible-remplie
C11    REWRITE_DOCTOR assemblage                       ← n°1 (GO_B + tout existe)
C12    MYCELIUM_DNA export + test reproductibilité
C13    MIXER potards-engine (sélection-only)
C14    COAUTHOR_GPS (radar→trajectoires→studio)
C15    STYLE_CONTINUATION rights-gated
Transverses : plan-lock casting total · cooldown branché · campagne N2 fautes injectées · Gold-Set complet juges · seuils C9 multi-livres (EMP-16)
```
**Tout item ci-dessus cite ses ancêtres (02/05) — interdiction de les redécouvrir.**

## TRANCHE VERTICALE « retombée réflexive » (ratifiée 2026-08-02)

Une scène, la chaîne entière, avant toute généralisation. Ordre ratifié :
`A0 BASELINE_FREEZE` (**FAIT**) → `A0.5 GOVERNANCE_REGISTRATION` → `A1 READ_ONLY_AUDITS` →
`A2 TYPOGRAPHY_COMMIT` → `A3 ENGINE_CONFORMITY_COMMIT` → `B CONTRAST_AND_SPECS` →
`C VERTICAL_SLICE` → `D BLIND_HUMAN_GATE`. A2 et A3 séquentiels et isolés ; aucune construction C
avant les verdicts B ; aucune généralisation avant PASS D.

Chaîne de la tranche : PLAN (`long_tail_opportunity` sur PLAN_LOCK, `fn: TRANSITION`) → FEW-SHOT
(exemplar FR natif validé Architecte, extension `FEWSHOT_EXEMPLARS`) → GÉNÉRATION seedée gemma4:31b →
SÉLECTION composite **SHADOW sur les DEUX sélecteurs** (`r6-core.ts:187` ET `gen-v4-all.ts:82-91`,
gagnant prod inchangé) → ≤1 correction SURGICAL bornée → SCELLEMENT (typo + gate complétude) →
gate `targeted-regen-guard` → A/B aveugle lecteurs longs.

**Faits bloquants découverts au scan** :
- Le chemin SURGICAL est **mort dans `buildCanonical`** (`allowSurgical:false` en dur, build-canonical.ts:105) ;
  `seam-surgeon.operateSeam` = tests only ; `rewritePrompt V2.3` = bench-only. Ce qui VIT : `guardPatch`
  (via tic-weaver), `runDoctor`/`executeRepairs`, et les gardes anti-coaching de `scribe-bridge.ts:36-51`.
- Le seed « déterministe » de sovereign est **TEXTUEL** (`ollama-provider.ts:253`, injecté dans le prompt) ;
  le générateur officiel `chapter-generator.ts:80-93` n'a **aucun** seed.
- **Deux** sélecteurs words-dominant, pas un. Mesuré en A0 : corrélation mots↔qualité ≈ 0 (−0,060).
- Non-conformités modèle : `c7-runner.ts:158`, `go2-chain-e2e.ts:31`, `persona-calibration.ts:21`,
  `scribe-bridge.ts:79` défaut qwen3.5 contre SCRIBE-PRODUCTION-LOCK gemma4.
- 3 bugs latents : `repetition-sensor.ts:53` famille ATMOSPHERIC codée en dur sur le manuscrit COH ;
  `lang-purity.ts` entrée `whispering` dupliquée ; `gen-v4-all.ts:75` test anglais inline contredisant
  `lang-purity` sur « standing ».
