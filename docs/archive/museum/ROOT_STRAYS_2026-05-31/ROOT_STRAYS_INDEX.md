# ROOT STRAYS INDEX — 2026-05-31 (C5)

> Mapping ancien chemin → nouveau → raison → source courante. NON_SOURCE_OF_TRUTH_RUNTIME pour les items MUSEUM.

## MUSÉÉS (docs/archive/museum/ROOT_STRAYS_2026-05-31/)

| ancien chemin (racine) | nouveau chemin | raison | source courante |
|---|---|---|---|
| `OMEGA_PIERRE_DE_ROSETTE_v1.0.md` | `ROSETTA_legacy/` | version superseded | `OMEGA_PIERRE_DE_ROSETTE_v2.1.md` (racine, ACTIVE) |
| `OMEGA_PIERRE_DE_ROSETTE_v1.1.md` | `ROSETTA_legacy/` | version superseded | idem v2.1 |
| `OMEGA_PIERRE_DE_ROSETTE_v2.0.md` | `ROSETTA_legacy/` | version superseded | idem v2.1 |
| `OMEGA_MASTER_PLAN_v2.md` | `MASTER_PLANS_legacy/` | « Plan Max » NON-CANONIQUE (CLAUDE.md) | CLAUDE.md + CODEX v1-3-1 + Trame 2000 |
| `OMEGA_MASTER_PLAN_v2.1.md` | `MASTER_PLANS_legacy/` | idem | idem |
| `OMEGA_MASTER_PLAN_ANNEXES.md` | `MASTER_PLANS_legacy/` | annexes plan non-canonique | idem |
| `00_INDEX_MASTER_PHASE28.md` | `MASTER_PLANS_legacy/` | index plan phase 28 clos | `docs/INDEX/OMEGA_DOCS_INDEX.md` |
| `PHASE_18_CERTIFICATION_FINAL.md` | `CERTS_PHASE_legacy/` | certif phase close | `certificates/` courants |
| `PHASE_28_CLOSURE_CERTIFICATE.md` | `CERTS_PHASE_legacy/` | certif phase close | `certificates/` |
| `FINAL_REPORT_PHASE32.md` | `CERTS_PHASE_legacy/` | rapport phase close | `nexus/proof/` récents |
| `HASH_MANIFEST_PHASE_18.md` | `CERTS_PHASE_legacy/` | manifest phase 18 | `evidence/` courants |
| `docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-1.md` | `CODEX_legacy/` | **0 référence** ; superseded | `docs/CODEX_…_v1-3-1.md` (canonique) |

## RELOCALISÉS dans le SSOT (PAS musée)

| ancien chemin (racine) | nouveau chemin | raison |
|---|---|---|
| `PROMPT_CLAUDE_CODE_SPRINT9/9_v3/10/11/12/13/14.md` (7) | `tools/prompts_history/` | historique de prompts → outils |
| `EVIDENCE_G1B/HARDENING/P1_LLM/QB/SH2.md` (5) | `nexus/proof/` | preuves → registre de preuves SSOT |

## DÉVIATIONS vs directive C5 (consignées pour arbitrage)

- **CODEX v1-2 et v1-3 NON déplacés** : `v1-2` est cité par **CLAUDE.md (canonique)** + `docs/NCR_V3_4_SEAL_DRIFT.md` + `OMEGA_PREFLIGHT_LOOKUP.md` ; `v1-3` cité par `ADR_CODEX_LAW_ID_COLLISION`. Les muséer briserait des liens SSOT (NON_SOURCE_OF_TRUTH pointé depuis le SSOT). **Retenus comme ancres historiques citées.** → Si l'Architecte veut les muséer, prévoir un sprint de migration de liens (CLAUDE.md/NCR/ADR) d'abord. Seul **v1-1** (0 référence) a été muséé.
- **docs/INDEX dédup = NO-OP** : aucun `docs/index/` (minuscule) tracké au niveau git (seul `docs/INDEX/` existe, 7 fichiers). Pas de doublon de casse à fusionner. Point d'entrée déjà en place : `docs/INDEX/OMEGA_DOCS_INDEX.md`.
- **Prompts `~16` → 7 réels** : seuls 7 fichiers matchent `PROMPT_CLAUDE_CODE_*.md` à la racine (l'estimation « ~16 » incluait probablement `INSTRUCTION_CLAUDE_CODE_*` et autres, non déplacés — hors pattern, à confirmer).
- **Strays `.txt` non déplacés** : ~120 logs racine (`test-*.txt`, `live*-log.txt`, `git_*.txt`, `vitest_*.txt`…) **hors scope C5** (non nommés par la directive) → laissés en place.
