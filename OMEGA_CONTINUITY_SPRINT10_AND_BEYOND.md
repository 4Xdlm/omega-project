# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — MESSAGE DE CONTINUITÉ
# Sprint 10 (contrôle fin d'exécution) + Suite Roadmap ART v1
# Date: 2026-02-16
# Architecte Suprême: Francky
# ═══════════════════════════════════════════════════════════════════════════════

---

## SITUATION ACTUELLE

| Attribut | Valeur |
|----------|--------|
| Roadmap source | OMEGA_ROADMAP_ART_v1.md |
| Sprint 9 (Semantic Cortex) | ✅ SEALED — 326/326 tests — tag `sprint-9-sealed` |
| Sprint 10 (Polish-V2) | 🔄 EN COURS D'EXÉCUTION par Claude Code |
| HEAD pré-Sprint-10 | `9b75790b` (master) |
| Prompt utilisé | `PROMPT_CLAUDE_CODE_SPRINT10.md` |
| Baseline tests | 326 PASS (266 sovereign + 22 signal-registry + 38 Sprint 9) |
| Gates | 6/6 PASS |

---

## PARTIE 1 — CONTRÔLE FIN SPRINT 10

### 1A) Vérification immédiate

À ton retour sur le repo après exécution Claude Code, exécute dans cet ordre :

```powershell
# 1. État git
cd C:\Users\elric\omega-project
git log --oneline -10

# 2. Vérifier les 7 commits Sprint 10
git log --oneline --grep="ART-POL" --grep="ART-SEM-05" --all-match

# 3. Tests complets
cd packages\sovereign-engine
npm test

# 4. Comptage tests (doit être > 326 + ~25 nouveaux Sprint 10)
# Attendu : ~350+ tests PASS

# 5. Audits qualité
grep -rn "TODO\|FIXME" src/ tests/
grep -rn ":\s*any\b" src/ tests/
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/
```

### 1B) Checklist Sprint 10 (items à cocher)

| # | Vérification | Commande/Preuve | PASS/FAIL |
|---|-------------|-----------------|-----------|
| 1 | `sentence-surgeon.ts` existe + types exportés | `Test-Path src/polish/sentence-surgeon.ts` | |
| 2 | `re-score-guard.ts` existe | `Test-Path src/polish/re-score-guard.ts` | |
| 3 | `paragraph-patch.ts` existe | `Test-Path src/polish/paragraph-patch.ts` | |
| 4 | `SovereignProvider` a `rewriteSentence()` | `grep "rewriteSentence" src/types.ts` | |
| 5 | `MockSovereignProvider` implémente `rewriteSentence` | `grep "rewriteSentence" tests/fixtures/mock-provider.ts` | |
| 6 | `polishRhythm()` est async + NE retourne PLUS prose inchangée | `grep "async.*polishRhythm" src/polish/musical-engine.ts` | |
| 7 | `sweepCliches()` est async + NE retourne PLUS prose inchangée | `grep "async.*sweepCliches" src/polish/anti-cliche-sweep.ts` | |
| 8 | `enforceSignature()` est async + NE retourne PLUS prose inchangée | `grep "async.*enforceSignature" src/polish/signature-enforcement.ts` | |
| 9 | Emotion-to-action dans constraint-compiler | `grep "mapEmotionToActions\|MONTRE-la" src/input/constraint-compiler.ts` | |
| 10 | Tous les tests PASS (0 fail, 0 skip) | `npm test` output | |
| 11 | Zéro TODO/FIXME | grep audit | |
| 12 | Zéro `any` | grep audit | |
| 13 | ProofPack Sprint 10 généré | `Test-Path proofpacks/sprint-10/` | |
| 14 | Sprint10_SEAL_REPORT existe | chercher dans proofpacks ou sessions | |

### 1C) Invariants Sprint 10 à vérifier

| ID | Attendu | Comment vérifier |
|----|---------|-----------------|
| ART-POL-01 | Micro-correction JAMAIS acceptée si score_after ≤ score_before | Tests SURG-02, GUARD-01..04, PARA-03 doivent passer |
| ART-POL-02 | Max 15 corrections/passe | Test SURG-03 |
| ART-POL-03 | Chaque correction traçable (MicroPatch) | Test SURG-05 + fichier trace_example.json |
| ART-POL-04 | `polishRhythm()` ne retourne PLUS prose inchangée | Test NOOP-01 |
| ART-POL-05 | `sweepCliches()` ne retourne PLUS prose inchangée | Test NOOP-02 |
| ART-POL-06 | `enforceSignature()` ne retourne PLUS prose inchangée | Test NOOP-03 |

### 1D) Si Sprint 10 est PASS

```powershell
# Tag de scellement
git tag -a sprint-10-sealed -m "Sprint 10 POLISH-V2 SEALED — ART-POL-01..06 PASS"
git push origin master --tags
```

### 1E) Si Sprint 10 est FAIL

Documenter précisément :
- Quel commit a échoué (10.1? 10.4? 10.6?)
- Quels tests échouent (noms exacts)
- Le code est-il partiellement commité ou non?
- Relancer Claude Code avec contexte ciblé sur le point de blocage

---

## PARTIE 2 — ROADMAP COMPLÈTE (SPRINTS 11 → 20)

### Vue d'ensemble

```
Sprint 9  — Semantic Cortex          ✅ SEALED
Sprint 10 — Polish-V2                🔄 EN COURS
Sprint 11 — Silence Oracle + Auth    ⬜ NEXT
Sprint 12 — Métaphores + V3.1        ⬜ MILESTONE: FONDATIONS ARTISTIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sprint 13 — Voice Genome             ⬜ (débloqué après Sprint 12)
Sprint 14 — Reader Phantom Light     ⬜
Sprint 15 — Phonetic Engine Light    ⬜
Sprint 16 — Temporal Architect       ⬜
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sprint 17 — Benchmark Pilote         ⬜
Sprint 18 — Calibration Humaine      ⬜
Sprint 19 — Consolidation            ⬜
Sprint 20 — Certification ART        ⬜ → Tag v3.0.0-art
```

---

### SPRINT 11 — SILENCE ORACLE + ADVERSARIAL JUDGE
**Risque** : MOYEN | **Sessions estimées** : 2-3 | **Prérequis** : Sprint 10 SEALED

**Périmètre** : show-dont-tell + anti-IA smell + macro-axe AAI

| Commit | Description | Invariant | Fichiers |
|--------|-------------|-----------|----------|
| 11.1 | Show Don't Tell Detector — 30+ patterns FR (telling → flagged) | ART-SDT-01 | `src/silence/telling-patterns.ts`, `src/silence/show-dont-tell.ts` |
| 11.2 | Authenticity Scorer — 15 patterns IA + LLM adversarial judge | ART-AUTH-01, ART-AUTH-02 | `src/authenticity/ia-smell-patterns.ts`, `src/authenticity/adversarial-judge.ts` |
| 11.3 | 2 nouveaux axes : `show_dont_tell` (×3.0, HYBRID) + `authenticity` (×2.0, HYBRID) | ART-SDT-02 | `src/oracle/axes/show-dont-tell.ts`, `src/oracle/axes/authenticity.ts` |
| 11.4 | Macro-axe AAI (Authenticity & Art Index) = weighted(show_dont_tell, authenticity) | — | `src/oracle/macro-axes.ts` |
| 11.5 | Intégration dans correction loop (prescriptions SDT + AUTH) | — | `src/prescriptions/`, loop |
| 11.6 | Tests + Gates + ProofPack Sprint 11 | ART-SDT-01..02, ART-AUTH-01..02 | proofpacks/ |

**Points d'attention** :
- 15 patterns IA-smell à implémenter (OVER_ADJECTIVATION, LIST_STRUCTURE, PERFECT_TRANSITIONS, NO_INTERRUPTION, etc.)
- LLM adversarial prompt : "Ce texte a-t-il été écrit par une IA ? Score 0-100"
- Le macro-axe AAI change le scoring V3 → V3 étendu (pas encore V3.1, c'est Sprint 12)
- Cache obligatoire pour le fraud_score LLM

---

### SPRINT 12 — MÉTAPHORES MORTES + SCORING V3.1 ★ MILESTONE
**Risque** : MOYEN | **Sessions estimées** : 2-3 | **Prérequis** : Sprint 11 SEALED

**Périmètre** : blacklist métaphores FR, metaphor_novelty axe, passage V3→V3.1

| Commit | Description | Invariant |
|--------|-------------|-----------|
| 12.1 | Dead metaphor blacklist FR (≥ 500 entrées) | ART-META-01 |
| 12.2 | `metaphor_novelty` axe LLM-judged (×1.5), cache obligatoire | ART-META-02, ART-META-03 |
| 12.3 | Scoring V3.1 : 5 macro-axes (ECC, RCI, SII, IFI, AAI), 14 axes, seuil 93 | ART-SCORE-01, ART-SCORE-02 |
| 12.4 | Recalibration complète sur 5 CAL-CASE, vérifier seuil 93 atteignable | ART-SCORE-03, ART-SCORE-04 |
| 12.5 | Non-régression totale + ProofPack V2 | — |
| 12.6 | Tag `v3.0.0-art-foundations` | — |

**MILESTONE — FONDATIONS ARTISTIQUES SEALED** :
```
Critères :
✅ Keyword matching ÉLIMINÉ (Sprint 9)
✅ 3 no-op ÉLIMINÉS (Sprint 10)
✅ Show-dont-tell détecté 80%+ (Sprint 11)
✅ IA smell détecté ≥ 10/15 patterns (Sprint 11)
✅ 500+ métaphores mortes blacklistées (Sprint 12)
✅ Scoring V3.1 : 5 macro-axes, 14 axes, seuil 93 (Sprint 12)
```

---

### SPRINT 13 — VOICE GENOME
**Risque** : FAIBLE | **Sessions** : 1-2

| Commit | Description | Invariant |
|--------|-------------|-----------|
| 13.1 | 10 paramètres voix dans style_genome | ART-VOICE-01 |
| 13.2 | Voice constraint compiler | ART-VOICE-02 |
| 13.3 | `voice_conformity` axe + drift test (5 runs) | ART-VOICE-03 |
| 13.4 | Tests + ProofPack | ART-VOICE-04 |

---

### SPRINT 14 — READER PHANTOM LIGHT
**Risque** : FAIBLE | **Sessions** : 1-2

| Commit | Description | Invariant |
|--------|-------------|-----------|
| 14.1 | PhantomState (attention, cognitive_load, fatigue) | ART-PHANTOM-01 |
| 14.2 | Phantom runner (phrase par phrase) | ART-PHANTOM-02 |
| 14.3 | 2 axes : attention_sustain + fatigue_management | ART-PHANTOM-03 |
| 14.4 | Calibration + Tests + ProofPack | ART-PHANTOM-04 |

---

### SPRINT 15 — PHONETIC ENGINE LIGHT
**Risque** : FAIBLE | **Sessions** : 1-2

| Commit | Description | Invariant |
|--------|-------------|-----------|
| 15.1 | Cacophony detector (CALC, sans phonemizer) | ART-PHON-01 |
| 15.2 | Rhythm variation v2 | ART-PHON-02 |
| 15.3 | `euphony_basic` axe | ART-PHON-03 |
| 15.4 | Tests + ProofPack | ART-PHON-04 |

---

### SPRINT 16 — TEMPORAL ARCHITECT
**Risque** : FAIBLE | **Sessions** : 1-2

| Commit | Description | Invariant |
|--------|-------------|-----------|
| 16.1 | temporal_contract dans ForgePacket | ART-TEMP-01 |
| 16.2 | Dilatation/compression scoring | ART-TEMP-02 |
| 16.3 | Emotional foreshadowing | ART-TEMP-03 |
| 16.4 | Tests + ProofPack | ART-TEMP-04 |

---

### SPRINTS 17-20 — PREUVE & CERTIFICATION

| Sprint | Objectif | Critère |
|--------|----------|---------|
| 17 | Benchmark Pilote (10 OMEGA + 10 humains, protocole blind) | Corrélation mesurée |
| 18 | Calibration (poids ajustés, seuils par genre) | Corrélation ≥ 70% |
| 19 | Consolidation (ProofPack V3, BLUEPRINT V2, audit ChatGPT) | Documentation complète |
| 20 | Certification ART (tag `v3.0.0-art`, roadmap ART v2) | 22 invariants PASS |

---

## PARTIE 3 — INVARIANTS COMPLETS (22)

| ID | Description | Sprint | Status |
|----|-------------|--------|--------|
| ART-SEM-01 | Analyse sémantique LLM obligatoire | 9 | ✅ |
| ART-SEM-02 | Cache sémantique déterministe | 9 | ✅ |
| ART-SEM-03 | Variance < 5 points | 9 | ✅ |
| ART-SEM-04 | Négation résolue | 9 | ✅ |
| ART-SEM-05 | Rétrocompatibilité API | 9 | ✅ |
| ART-POL-01 | Zéro correction dégradante | 10 | 🔄 |
| ART-POL-02 | Max 15 corrections/passe | 10 | 🔄 |
| ART-POL-03 | Traçabilité MicroPatch | 10 | 🔄 |
| ART-POL-04 | polishRhythm ACTIF | 10 | 🔄 |
| ART-POL-05 | sweepCliches ACTIF | 10 | 🔄 |
| ART-POL-06 | enforceSignature ACTIF | 10 | 🔄 |
| ART-SDT-01 | Telling détecté | 11 | ⬜ |
| ART-SDT-02 | show_dont_tell axe ×3.0 | 11 | ⬜ |
| ART-AUTH-01 | 10/15 patterns IA | 11 | ⬜ |
| ART-AUTH-02 | fraud_score reproductible | 11 | ⬜ |
| ART-META-01 | 500+ métaphores mortes | 12 | ⬜ |
| ART-META-02 | Zéro dead metaphor finale | 12 | ⬜ |
| ART-META-03 | metaphor_novelty LLM | 12 | ⬜ |
| ART-SCORE-01 | V3.1 : 5 macro-axes | 12 | ⬜ |
| ART-SCORE-02 | Seuil SEAL : 93 | 12 | ⬜ |
| ART-SCORE-03 | Planchers macro-axes | 12 | ⬜ |
| ART-SCORE-04 | 5 CAL-CASE recalibrés | 12 | ⬜ |

---

## RÉSUMÉ DÉCISIONNEL

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  1. Contrôler Sprint 10 (checklist 1B + 1C)                                  ║
║  2. Si PASS → tag sprint-10-sealed → push                                    ║
║  3. Si FAIL → identifier commit bloquant → relancer ciblé                    ║
║  4. Sprint 11 = NEXT (Silence Oracle + Adversarial Judge)                    ║
║  5. Sprint 12 = MILESTONE (Fondations Artistiques SEALED)                    ║
║  6. Sprints 13-16 = Raffinements (débloqués après Sprint 12)                ║
║  7. Sprints 17-20 = Preuve + Calibration + Certification finale             ║
║  8. Objectif final : Tag v3.0.0-art — 22 invariants — ~350+ tests           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
