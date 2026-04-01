# OMEGA IRM — LIVRABLE 15 : PHANTOM AND BACKLOG MAP
**Date** : 2026-04-02 | **HEAD** : e1b92dd3 | **Standard** : NASA-Grade L4
**Sources** : OMEGA_ROADMAP_v8_0.md, OMEGA_PHASE_R_ROADMAP_v2.md, OMEGA_PHYSIQUE_LITTERAIRE_v3.md, RAPPORT_SCAN_ARCHITECTURAL.md

---

## INVENTAIRE : ÉLÉMENTS MENTIONNÉS DANS LA DOCUMENTATION

| # | Élément | Statut | Preuve code | Source doc |
|---|---------|--------|-------------|-----------|
| 1 | sovereign-engine (Pipeline A LIVE) | EXISTE+ACTIF | engine.ts, 615 lignes | Roadmap v8 |
| 2 | Aesthetic Oracle (9 axes + 5 macro) | EXISTE+ACTIF | oracle/aesthetic-oracle.ts | Roadmap v8 |
| 3 | Duel Engine (3 modes) | EXISTE+ACTIF | duel/duel-engine.ts | Roadmap v8 |
| 4 | Micro-Surgeon + Damage Gate | EXISTE+ACTIF | microsurgery/*.ts | Phase W |
| 5 | Targeted Patch P5 | EXISTE+ACTIF | polish/targeted-patch.ts | Roadmap v8 |
| 6 | CLIFF-GATE BB-01 | EXISTE+ACTIF | engine.ts:440-478 (inline) | Decisions Lock |
| 7 | Chunked Generator V4 K2 | EXISTE+ACTIF | generation/chunked-generator.ts | Architecture Map |
| 8 | Prompt Assembler V4 | EXISTE+ACTIF | input/prompt-assembler-v4.ts | Architecture Map |
| 9 | Semantic Slicer | EXISTE+ACTIF | guards/semantic-slicer.ts | Architecture Map |
| 10 | Physics Audit | EXISTE+ACTIF | oracle/physics-audit.ts | Architecture Map |
| 11 | Text Features (42 features) | EXISTE+ACTIF | scoring/text-features.ts | Phase R |
| 12 | Depth Features (3 features) | EXISTE+ACTIF | scoring/depth-features.ts | Phase R5-bis |
| 13 | Multi-Stage Scorer | EXISTE+ACTIF | scoring/multi-stage-scorer.ts | Phase R4 |
| 14 | Coefficients Proportionnels v1 | EXISTE+ACTIF | scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json (105KB) | Phase R3 |
| 15 | Quality Profiles (6 profils) | EXISTE+ACTIF | scoring/quality-profiles.ts | Phase R4 Roadmap |
| 16 | CDE Pipeline | EXISTE+ACTIF | cde/*.ts (7 fichiers) | Architecture Map |
| 17 | ProofPack V3 | EXISTE+ACTIF | proofpack/proofpack-v3.ts | Build Governance |
| 18 | PVI Module | EXISTE+ACTIF (Python standalone) | scripts/pvi/pvi_module_autonome.py | PVI FINAL |
| 19 | full_work_analyzer | EXISTE+ACTIF (Python standalone) | omega-autopsie/full_work_analyzer_v4.py | Phase R |
| 20 | Prompt Assembler V2 | EXISTE+INUTILISÉ (V4 actif) | input/prompt-assembler-v2.ts | Legacy |
| 21 | Polish (musical, cliché, signature) | EXISTE+INUTILISÉ (NO-OP prouvé) | polish/musical-engine.ts, anti-cliche-sweep.ts, signature-enforcement.ts | Désactivé Sprint 2 |
| 22 | s-score.ts legacy | EXISTE+INUTILISÉ (deprecated) | oracle/s-score.ts | SUSPECT-03 |
| 23 | compat/ guards | EXISTE+INUTILISÉ (0 imports) | compat/brief-compat-guard.ts, version-guard.ts | R-08 Scan |
| 24 | hybrid-provider | EXISTE+INUTILISÉ (rejeté BLOC7) | runtime/hybrid-provider.ts | BLOC7 decision |
| 25 | ollama-provider | EXISTE+INUTILISÉ (hybride rejeté) | runtime/ollama-provider.ts | BLOC7 decision |
| 26 | Genesis V2 | EXISTE+EXPERIMENTAL (env-gated) | oracle/genesis-v2/*.ts (5 fichiers) | Roadmap v8 |
| 27 | CI_L37 scorer | EXISTE+INUTILISÉ (rejeté D1) | scoring/ci-l37.ts | engine.ts:33 commenté |
| 28 | Language Profiles | EXISTE+SHADOW | scoring/language-profiles.ts | BLOC 3 shadow |
| 29 | Dual-Scale | EXISTE+SHADOW | scoring/dual-scale.ts | BLOC 3 shadow |
| 30 | genome (package) | EXISTE+SEALED | packages/genome/ | Phase 28 SEALED |
| 31 | sentinel-judge (package) | EXISTE+SEALED | packages/sentinel-judge/ | Phase 27 SEALED |
| 32 | Phase W — Fractal Assembly | MENTIONNÉ+ABSENT (=PHANTOM) | Aucun code assembly/ actif | Roadmap v8 |
| 33 | Phase X — Showrunner Engine | MENTIONNÉ+ABSENT (=PHANTOM) | Aucun code showrunner/ | Roadmap v8 |
| 34 | Phase VALIDATION E1 (300K mots) | MENTIONNÉ+ABSENT (=PHANTOM) | Pas de test 300K | Roadmap v8 |
| 35 | Phase VALIDATION E2 (non-classifiable) | MENTIONNÉ+ABSENT (=PHANTOM) | Aucun test E2 | Roadmap v8 |
| 36 | Phase VALIDATION E3 (nécessité) | MENTIONNÉ+ABSENT (=PHANTOM) | Aucun test E3 | Roadmap v8 |
| 37 | Phase INTERFACE (UI Auteur) | MENTIONNÉ+ABSENT (=PHANTOM) | Aucun code UI | Roadmap v8 |
| 38 | f_semantic_density | MENTIONNÉ+ABSENT (=PHANTOM) | Pas dans text-features.ts | Physique v3 §7 |
| 39 | f_register_divergence | MENTIONNÉ+ABSENT (=PHANTOM) | Pas dans text-features.ts | Physique v3 §7 |
| 40 | f_phonetic_collision | MENTIONNÉ+ABSENT (=PHANTOM) | Pas dans text-features.ts | Physique v3 §7 |
| 41 | f_subtext_gap | MENTIONNÉ+ABSENT (=PHANTOM) | Pas dans text-features.ts | Physique v3 §7 |
| 42 | f_necessity_index | MENTIONNÉ+ABSENT (=PHANTOM) | Pas dans text-features.ts | Physique v3 §7 |
| 43 | Phase R4 — Scorer reconstruction | PRÉVU+NON IMPLÉMENTÉ | multi-stage-scorer.ts exists mais R4 "PRÊTE AU LANCEMENT" dans roadmap | Phase R Roadmap |
| 44 | Phase R5 — Bench taille réelle | PRÉVU+NON IMPLÉMENTÉ | En attente R4 | Phase R Roadmap |
| 45 | Phase R6 — Tests robustesse | PRÉVU+NON IMPLÉMENTÉ | En attente R5 | Phase R Roadmap |
| 46 | Phase S — Fork scénaristique | PRÉVU+NON IMPLÉMENTÉ | Aucun code | Phase R Roadmap |
| 47 | Scorer V5 (couche sémantique) | PRÉVU+NON IMPLÉMENTÉ | Mentionné dans Manuel v1.0 | Phase R Roadmap futur |
| 48 | Memory layer NASA | EXISTE+STATUT_INCONNU | gateway/src/memory/ | Roadmap v8 |
| 49 | Creation layer NASA | EXISTE+STATUT_INCONNU | gateway/src/creation/ | Roadmap v8 |
| 50 | scribe-engine (package) | EXISTE+REDONDANT | packages/scribe-engine/ | Roadmap v8 "À évaluer" |
| 51 | creation-pipeline (package) | EXISTE+REDONDANT | packages/creation-pipeline/ | Roadmap v8 "À évaluer" |
| 52 | omega-narrative-genome | EXISTE+STATUT_INCONNU | omega-narrative-genome/ | Roadmap v8 |
| 53 | Best-of-N assembly | EXISTE+ACTIF | assembly/best-of-n.ts, engine.ts:193 | Phase U |
| 54 | Phantom runner | EXISTE+STATUT_INCONNU | phantom/phantom-runner.ts | Non documenté |

---

## STATISTIQUES

| Catégorie | Nombre |
|-----------|--------|
| EXISTE+ACTIF | 21 |
| EXISTE+INUTILISÉ | 8 |
| EXISTE+SEALED | 2 |
| EXISTE+EXPERIMENTAL/SHADOW | 4 |
| MENTIONNÉ+ABSENT (PHANTOM) | 11 |
| PRÉVU+NON IMPLÉMENTÉ | 5 |
| EXISTE+REDONDANT | 2 |
| EXISTE+STATUT_INCONNU | 3 |

**Total éléments inventoriés** : 54

---

## TOP 5 PHANTOMS (mentionnés dans docs, absents du code)

1. **Phase W — Fractal Assembly** : Assemblage multi-scènes, continuité. Roadmap v8 le mentionne. Aucun code.
2. **5 features proposées** (f_semantic_density, f_register_divergence, f_phonetic_collision, f_subtext_gap, f_necessity_index) : Proposées dans Physique v3 §7, jamais implémentées.
3. **Phase VALIDATION E1/E2/E3** : Tests sur 300K mots, non-classifiabilité, nécessité absolue. Aucun code.
4. **Phase INTERFACE (UI Auteur)** : Aucun code frontend.
5. **Scorer V5 (couche sémantique)** : Mentionné comme roadmap future dans Manuel v1.0. Aucun code.

---

*repo_live_confirmed: true*
