# 03 — CANON / TRUTH LINEAGE  *(cœur de mission)*

Lignée complète des canons/truth-gates : qui est source de vérité, qui est projection, qui est archive/dormant/doublon. Recoupé avec `docs/architecture/book-factory/CANON_TRUTH_CONSOLIDATION_DECISION.md` (Cowork/Tribunal) — et **contredit le code là où il diverge**.

## Inventaire des canons (6 narratifs + 1 gouvernance)
| # | Canon | Modèle | Source-de-vérité ou projection ? | Statut runtime |
|---|---|---|---|---|
| C1 | `gateway/canon_engine.ts` | FactType plat append-only + table antonymes + simpleHash | SoT *de son sous-système* (dormant) | **ORPHAN** (NCR existante) |
| C2 | `src/canon/` | Claims + lignée hash-chain + DISPUTED + supersession + catalogue prédicats fermé | SoT du truth-gate `src/gates` | **LIVE (couche test)** |
| C3 | `packages/canon-kernel/` + `book-factory/book-canon-adapter` | Double-rail truth/interpretation + PROMOTE + evidence | **SoT décrété du chemin neuf** | **LIVE** (kernel) / DRAFT (adapter) |
| C4 | `packages/genesis-planner` Canon | Canon d'entrée statique (validation) | Gate d'entrée, pas store | **DORMANT statique** |
| C5 | `OMEGA_PHASE18_MEMORY/canon` | Fact + snapshots + diffs + merkle + audit | Prototype | **SNAPSHOT/ORPHAN** |
| C6 | `OMEGA_PHASE20_INTEGRATION/canon-store` | « based on Phase 18 » | Prototype | **SNAPSHOT/ORPHAN** |
| G1 | `packages/contracts-canon/` | Contrats d'interface (gouvernance) | SoT contrats | **LIVE (≠ narratif)** |

## Truth-gates (≥3)
| Gate | Path | Fonction | Statut |
|---|---|---|---|
| TG-gateway | `gateway/src/gates/truth_gate.ts` | Gate vérité (CNC-200) couplé canon_engine | **ORPHAN** (sous-système dormant) |
| TG-src | `src/gates/` (F-pipeline) | extract→classify→match→verdict→manifest→quarantine | **LIVE (couche test)** |
| TG-kernel | `@omega/truth-gate` (via book-canon-adapter) | enforce promotion vers rail truth (evidence requis) | **LIVE via adapter (DRAFT)** |
| Oracle-continuité | `book-factory/continuity-oracle.ts` | truth-gate inter-chapitre (CHRONO/DEAD_ACTS/LEAK/REQUIREMENT/OVERDUE) | **DRAFT vivant** |

## Lignée prouvée (descendance)
```
CNC-201 (janv) ─► gateway/canon_engine (C1, FactType)                 [ORPHAN]
PHASE18 canon-store (C5) ─► PHASE20 canon-store (C6) ─► abandonné     [SNAPSHOT]
CANON_SCHEMA_SPEC v1.2 ─► src/canon (C2, claims+lineage)             [LIVE test]
        │ ré-architecture double-rail
        ▼
   canon-kernel (C3) ◄── « ÉPINE CANONIQUE UNIQUE » (CANON_TRUTH_CONSOLIDATION_DECISION.md:9-16)
        │ consommé via adapter
        ▼
   book-factory/book-canon-adapter + story-state   [DRAFT vivant]
```

## Recoupage avec la décision Cowork/Tribunal
- `CANON_TRUTH_CONSOLIDATION_DECISION.md:9-16,58-60` : **canon-kernel = épine unique, AUCUN nouveau canon, pas de 6e truth-gate** ; prouvé 284/284 runtime ; rails « 0 appelant » :25 (latents).
- **Cohérence avec le code** : ✅ — le grep confirme que canon-kernel est bien le seul canon narratif consommé par du code package (via book-factory). La décision NE contredit PAS le code.
- `:22-38,51` : classer C1/C2/C5/C6 + truth-gates rivaux en **MUSEUM/ORPHAN** (marquage en attente GO Architecte). **Cohérent** avec mes verdicts ORPHAN.
- Divergence interne tranchée `:60` : Gemini « GO P1 now » vs ChatGPT « insérer P0.5 d'abord » → **P0.5 retenu** (preuves+specs avant code).

## CONTRADICTION détectée (code vs doc historique)
- `DEC-20260531-007-SCRIBE-SOVEREIGN-BOUNDARY.md:13-22` supposait scribe→sovereign couplés. **Grep prouve 0 consommateur lib de sovereign** → prémisse **CONTREDITE PAR LE CODE** → doc **SUPERSEDED** par `DEC-20260531-009` (fusion). Ne PAS fonder une décision sur DEC-007.

## Verdict lignée
- **Une seule épine vivante cohérente** : canon-kernel (C3), confirmée par doctrine ET code.
- **Le modèle le plus riche** (C2 src/canon : lignée+DISPUTED+supersession) est **sous-exploité** (confiné à src/gates). Candidat fort à RÉUTILISER/PORTER vers canon-kernel.
- **5 canons rivaux** (C1, C4, C5, C6 + TG-gateway) = à marquer MUSEUM/ORPHAN (GO Architecte), JAMAIS muter (EMP-15).
