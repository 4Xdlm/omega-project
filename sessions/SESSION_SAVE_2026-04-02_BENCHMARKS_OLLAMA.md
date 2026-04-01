# SESSION_SAVE — 2026-04-02 — PHASE R CLÔTURE + OLLAMA + CROSS-TEST
## OMEGA — Session Benchmarks Comparatifs & Architecture Ollama

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  Document    : SESSION_SAVE_2026-04-02_BENCHMARKS_OLLAMA.md                     ║
║  Date        : 2026-04-02                                                        ║
║  HEAD        : 03cd5e0d (cross-test commit)                                      ║
║  Branche     : phase-r-metrology-rebuild                                         ║
║  Tests       : 2022 PASS                                                         ║
║  Standard    : NASA-Grade L4 / DO-178C Level A                                   ║
║  Autorité    : Francky (Architecte Suprême)                                      ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. RÉSUMÉ EXÉCUTIF

Session de validation comparative multi-provider. 5 benchmarks exécutés et commités.
Résultat principal : le juge Ollama a un biais de +3.0 pts (complaisant). Après correction,
Anthropic Sonnet reste la référence pour les scores absolus. Le dossier "Ollama comme
remplacement total" est FERMÉ. Le provider Ollama reste utilisable pour le draft (0€)
mais pas comme juge fiable.

---

## 2. BENCHMARKS EXÉCUTÉS

### 2.1 Shadow BLOC 2 (32 runs) — CLOSÉ
- DUAL_COMBINED : r=0.939, RMSE=0.76 → INTÉGRER (monitoring)
- CI_L37 : r=0.044 → REJETÉ (sature à 100, BB-C01)
- PROFILES FR/EN : r négatif/nul → REJETÉS
- Cliff gate : 0/31 < 0.30 → INSUFFISANT, remplacé par guillotine déterministe
- Commit : e939181f + 7a1c0009

### 2.2 Genius Engine backtest (794 œuvres) — D2 FAIL
- r(G_weighted, Tier) = 0.030 sur ALL, 0.024 FR, -0.046 EN
- G est une CONSTANTE : Tier S=66.2, Tier C=66.2
- Genius Engine = MODULE DORMANT
- Commit : 6997b5c3

### 2.3 Best-of-3 Anthropic (22 runs) — PASS PARTIEL
- Composite moyen : 89.9 (baseline V5=88.9, +1.0)
- min_axis moyen : 83.8 (+8.4 vs baseline)
- SAGA_READY : 9% (seuil 20% = FAIL)
- Crashes (<70) : 0 (éliminés)
- Premier levier stable : SÉCURISATION, pas transcendance
- Commit : 345acf02

### 2.4 Best-of-3 Ollama qwen3:32b (24 runs) — PASS BRUT
- Composite moyen : 90.7
- min_axis moyen : 86.5
- SAGA_READY : 21% (PASS brut)
- Crashes : 0
- CAVEAT : juge = même modèle qui écrit
- Commit : bc1d79ec

### 2.5 Cross-test juge Ollama vs Claude (4 runs) — BIAIS +3.0
- Delta moyen composite : +3.0 (Ollama plus généreux)
- Après correction : Ollama corrigé = ~87.7 (sous baseline V5)
- SAGA corrigé : ~12% (FAIL)
- VERDICT : juge Ollama COMPLAISANT, pas fiable pour scores absolus
- Commit : 03cd5e0d

---

## 3. TABLEAU SYNTHÈSE MÉTROLOGIQUE

```
                    Anthropic BO3    Ollama BO3    Ollama corrigé (-3.0)
Composite           89.9             90.7          ~87.7
min_axis             83.8             86.5          ~83.5
SAGA                 9% FAIL          21% PASS      ~12% FAIL
Crashes              0                0             0
Coût                 ~$30             $0            $0
Biais juge           référence        +3.0 pts      —
```

---

## 4. DÉCISIONS ARCHITECTURALES SCELLÉES

### D-OLLAMA-01 : Ollama comme remplacement total = REJETÉ
Le biais juge +3.0 invalide les scores absolus Ollama. Après correction,
Ollama est ~2.2 pts sous Anthropic. Le dossier est fermé.

### D-OLLAMA-02 : Ollama comme draft provider = VALIDÉ
Le provider Ollama (ollama-provider.ts) reste utilisable en mode hybrid
(Ollama draft + Claude juge) ou pour du prototypage rapide à 0€.

### D-OLLAMA-03 : Anthropic = référence scoring
Claude Sonnet reste le seul juge fiable pour les scores de production.

### D-D1-CLOSE : Shadow judges D1 = CLOSÉ
- DUAL_COMBINED → PASS SHADOW (monitoring, intégration décisionnelle différée)
- CI_L37 → REJETÉ (dormant)
- PROFILES → REJETÉS (dormants)
- Cliff gate → guillotine déterministe active

### D-D2-CLOSE : Genius Engine D2 = FAIL TOTAL
- r≈0 vs Tier sur 794 œuvres. Module dormant.

### D-BESTOF3 : Best-of-3 = premier levier stable
- Élimine 100% des crashes
- Monte min_axis de +8.4 pts
- Ne résout PAS le plafond SAGA (9%)

---

## 5. FICHIERS CRÉÉS CETTE SESSION

### Code
- src/runtime/ollama-provider.ts — provider full Ollama (8 méthodes SovereignProvider)
- src/scoring/ci-l37.ts — module dormant (REJETÉ D1)
- src/scoring/language-profiles.ts — module dormant (REJETÉ D1)
- src/scoring/dual-scale.ts — ACTIF monitoring

### Scripts
- scripts/bench-bestof3-validation.ts — bench BO3 Anthropic
- scripts/bench-bestof3-ollama.ts — bench BO3 Ollama
- scripts/cross-test-judge.ts — cross-test juge Ollama vs Claude
- scripts/genius-backtest-corpus.ts — backtest Genius Engine

### Tests
- tests/scoring/ci-l37.test.ts, language-profiles.test.ts, dual-scale.test.ts (+11 tests)

### Docs
- docs/OMEGA_D1_CLOSEOUT_BLOC2.md — rapport D1 shadow
- docs/OMEGA_D2_CLOSEOUT_GENIUS_ENGINE.md — rapport D2 Genius

### Sessions
- sessions/SHADOW_BLOC2_COLLECT/ — données 32 runs shadow
- sessions/GENIUS_BACKTEST_BLOC4/ — données 794 œuvres
- sessions/BESTOF3_VALIDATION/ — données 22 runs Anthropic
- sessions/BESTOF3_OLLAMA_qwen3_32b/ — données 24 runs Ollama
- sessions/CROSS_TEST_JUDGE/ — données 4 runs cross-test

---

## 6. FICHIERS MODIFIÉS

- src/engine.ts — cliff gate guillotine + shadow DUAL + imports CI_L37/PROFILES retirés
- src/input/prompt-assembler-v4.ts — L37 + conflits orthogonaux
- src/generation/chunked-generator.ts — L37 dans K2 persona
- src/duel/draft-modes.ts — purge tokens morts TM-01/TM-02
- src/validation/phase-u/phase-u-exit-validator.ts — seuils centralisés
- src/validation/phase-u/polish-engine.ts — seuils centralisés
- src/assembly/best-of-n.ts — seuils centralisés
- src/oracle/s-score.ts — @deprecated LEGACY

---

## 7. DÉCOUVERTES SCELLÉES

| ID | Découverte | Source |
|----|-----------|--------|
| D-S01 | Prompt engineering a une asymptote (88.5-89.6) | 48 runs V5 |
| D-S02 | Anti-fermeture prompt = token mort universel | 72 runs |
| D-S03 | CI_L37 ne discrimine pas intra-OMEGA (sub=constante) | 32 runs shadow |
| D-S04 | Profils FR/EN anti-corrèlent avec qualité OMEGA | 32 runs shadow |
| D-S05 | Genius Engine r≈0 (phonétique ≠ qualité littéraire) | 794 œuvres |
| D-S06 | Best-of-3 élimine crashes mais ne monte pas le plafond | 22 runs |
| D-S07 | Juge Ollama complaisant +3.0 pts vs Claude | 4 runs cross |

---

## 8. ÉTAT ARCHITECTURAL FINAL

```
COMPOSANT                 STATUT
─────────────────────────────────────────
S-Oracle V2 (macro-axes)  ✅ ACTIF — juge de production
Ridge V2 (corpus)         ✅ ACTIF — juge de corpus
Best-of-N                 ✅ ACTIF — flag env OMEGA_BEST_OF_N
Conflits orthogonaux      ✅ ACTIF — élargit la variance
Cliff guillotine          ✅ ACTIF — post-duel, troncature
Provider Ollama           ✅ ACTIF — draft 0€, juge non fiable
Provider Anthropic        ✅ ACTIF — référence scoring
DUAL_COMBINED             ⏸️ MONITORING — r=0.94, différé multi-briques
CI_L37                    💀 DORMANT — sub=constante BB-C01
Language Profiles         💀 DORMANT — anti-corrélation
Genius Engine             💀 DORMANT — r≈0 vs Tier
Polish                    ❌ DÉSACTIVÉ — NO-OP prouvé Sprint 2
```

---

## 9. CLAUDE COWORK — BRIEFING MIS À JOUR

Claude Cowork a créé un MASTER_BRIEFING_OMEGA.md complet (418 lignes) dans
`C:\Users\elric\Claude-Workspace\OMEGA\context\`. Vérifié à ~95% correct.
Inclut balisage SSOT/RECONSTRUCTION/HYPOTHÈSE systématique.

Fichiers workspace Cowork mis à jour :
- CLAUDE.md — résumé exécutif Phase R
- context/omega-architecture.md — pipeline, scoring, modules
- context/frameworks-valides.md — composants actifs/rejetés
- context/omega-standards.md — scoring, corpus, gouvernance
- context/MASTER_BRIEFING_OMEGA.md — briefing 18 sections complet
- ground-rules/omega-rules.md — balisage SSOT, termes interdits

ATTENTION : Le CLAUDE.md du REPO (omega-project/CLAUDE.md) est toujours
l'ancien Phase 27-28. Non synchronisé. À mettre à jour quand Phase R closée.

---

## 10. PROCHAINES ACTIONS (PRIORITÉ)

### Immédiat
1. **Best-of-5 Anthropic** — si BO3 donne 89.9, BO5 pourrait atteindre 91+
2. **Hybrid mode validé** — Ollama draft + Claude juge = économie sur le draft

### Moyen terme
3. **Multi-briques / assemblage saga** — le vrai objectif 300K mots
   DUAL_SCALE attend des données multi-briques pour que ARC ≠ LOCAL
4. **Mise à jour CLAUDE.md du repo** — synchroniser avec Phase R

### Long terme
5. **Mur sémantique L38** — embeddings LLM (ChromaDB LOOM D4/D5)
   Seule réponse au plafond de transcendance
6. **Scorer V5 Transcendance** — features sémantiques au-delà des 42 structurelles

---

## 11. GRILLE ANTI-OUBLI

Avant chaque décision future, vérifier :
- Compatible Rosetta ? (features pilotables vs irréductibles)
- Compatible blackbox ? (attracteurs BB-01, BB-C01, BB-C02)
- Compatible L37 ? (subordination = cause, longueur = effet)
- Compatible FR/EN split ? (monocentrique vs polycentrique)
- Compatible OMEGA↔SCRIBE ? (frontière inviolable)
- Shadow-first ? (D1 : 30 runs min, r≥0.60)
- Cause réelle ou symptôme ? (M2 : AUC ≠ causalité)
- Juge fiable ? (cross-test obligatoire si changement de provider)

---

## 12. CONVERGENCE 3-IA

| Sujet | Claude | Gemini | ChatGPT | Résultat |
|-------|--------|--------|---------|----------|
| CI_L37 rejet | ✅ | ✅ | ✅ | 3/3 SCELLÉ |
| Profiles rejet | ✅ | ✅ | ✅ | 3/3 SCELLÉ |
| Genius Engine rejet | ✅ | ✅ | ✅ | 3/3 SCELLÉ |
| Best-of-3 = priorité | ✅ | ✅ | ✅ | 3/3 SCELLÉ |
| Ollama remplacement total | ❌ | ❌ | Test d'abord | 2/3 → REJETÉ après cross-test |
| Cliff gate | INSUFFISANT | Seuil à rehausser | FAIL | ChatGPT raison (FAIL) |

---

*SESSION_SAVE 2026-04-02 — NASA-Grade L4 / DO-178C Level A*
*HEAD : 03cd5e0d | Tests : 2022 PASS | Branche : phase-r-metrology-rebuild*
*Architecte Suprême : Francky | IA Principal : Claude*
