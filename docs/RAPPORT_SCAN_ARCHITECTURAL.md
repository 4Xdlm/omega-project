# RAPPORT SCAN ARCHITECTURAL — OMEGA SOVEREIGN-ENGINE
**Date** : 2026-03-14 | **Branche** : phase-u-transcendence
**Standard** : NASA-Grade L4 / DO-178C | **Statut** : READ-ONLY SCAN

## 1. INVENTAIRE
194 fichiers .ts dans 42 répertoires sous src/.

### Répertoires principaux
| Répertoire | Fichiers | Rôle |
|------------|----------|------|
| src/oracle/ | 5 | Aesthetic Oracle, S-Score, S-Oracle-v2, LLM-Judge, Macro-Axes |
| src/oracle/axes/ | 18 | Axes individuels (banality, rhythm, metaphor-novelty, etc.) |
| src/oracle/calc-judges/ | 3 | Juges CALC (rhythm, lexical, phonetic) |
| src/validation/ | 5 | Core validation |
| src/validation/phase-u/ | 8 | Phase U exit validator, top-k, benchmark |
| src/cde/ | 6 | Context Distillation Engine |
| src/genius/ | 7 | Genius Layer |
| src/filter/ | 3 | Soul-layer, banality-budget |
| src/polish/ | 7 | Polish Engine, micro-polish, nano-polish |
| src/input/ | 7 | Forge packet, prompt assembler |
| src/scoring/ | 12+ | GB V1, Ridge V2, V3, text-features |
| src/runtime/ | 4 | Anthropic provider |
| src/voice/ | 4 | Voice conformity |
| src/metaphor/ | 5 | Détection métaphores |

## 2. PIPELINES
Pipeline A (LIVE) : 16 étapes, ~8 appels LLM
Pipeline B (OFFLINE) : CALC pur
Pipeline C (Genesis V2) : env-gated
Pipeline D (CDE) : V-PROTO

## 3. CARTE DES INTERACTIONS
SovereignProvider : 8 méthodes (generateDraft, judgeDuel, judgeQuality, judgePolish, scoreAxes, scoreMacro, computeSScore, generatePlan)
engine.ts importe : input/, oracle/, polish/, duel/, filter/, genius/, proofpack/, gates/

## 4. SUSPECTS
SUSPECT-01 : continuity-plan.ts vs CDE (chevauchement)
SUSPECT-02 : genesis-v2 path vs standard path
SUSPECT-03 : s-score.ts (LEGACY) vs s-oracle-v2.ts (AUTORITÉ)
SUSPECT-04 : prescriptions/ vs filter/soul-layer

## 5. DOUBLONS
DOUBLON-01 : estimateTokens (3 endroits)
DOUBLON-02 : sortedStringify (3 endroits)
DOUBLON-03 : computeMinAxis (3 implémentations)
DOUBLON-04 : seuils SAGA_READY (5 fichiers)

## 6. RECOMMANDATIONS
R-01 (HAUTE) : Unifier seuils SAGA_READY dans core/thresholds.ts
R-02 (HAUTE) : Clarifier frontière CDE vs continuity-plan
R-03 (HAUTE) : Centraliser computeMinAxis()
R-04-R07 (MOYENNE) : Centraliser tokens, sortedStringify, documenter legacy
R-08-R10 (BASSE) : Vérifier compat/, oracle/axes/ index, exemplar/

## 7. CARTOGRAPHIE DES RESPONSABILITÉS
| Module | Responsabilité | Entrées | Sorties |
|--------|---------------|---------|---------|
| input/ | Assemblage packet | ForgePacketInput | ForgePacket, PromptV2 |
| engine.ts | Orchestration LIVE | ForgePacket + Provider | SovereignForgeResult |
| pipeline/ | Évaluation OFFLINE | Prose + Config | Scores + Verdict |
| oracle/ | Scoring esthétique | Prose | 18 axes + S-Score + Macro-Axes |
| polish/ | Amélioration itérative | Draft + Directives | Polished prose |
| filter/ | Filtrage post-gen | Prose + KillLists | Cleaned prose |
| genius/ | Prompt engineering | Scene + Style | Engineered prompt |
| voice/ | Analyse vocale | Prose + DNA | Conformity scores |
| validation/ | Certification | ForgeResults[] | Exit report |
| cde/ | Distillation | CDEInput | SceneBrief + StateDelta |
| proofpack/ | Traçabilité | All results | Hash chains |
| genesis-v2/ | Planification | Intent | GenesisPlan |
| runtime/ | Abstraction provider | API config | Provider |
| gates/ | Quality gates | Scores | Pass/Fail |
| scoring/ | Scorers corpus | Features | Tier + Score |

## 8. COUCHES ARCHITECTURALES
VALIDATION > ORCHESTRATION > SCORING > GENERATION > ANALYSIS > INFRASTRUCTURE

## 9. MÉTRIQUES
Fichiers source .ts : 194 | Répertoires : 42 | Pipeline étapes : 16
Appels LLM (happy path) : ~8 | Axes esthétiques : 18 | Macro-axes : 5
Méthodes SovereignProvider : 8 | Pipelines distincts : 4
Doublons : 4 | Suspects : 4 | Recommandations : 10

---
*Pushé depuis project files — 2026-04-02*
*Scan original : 2026-03-14*
