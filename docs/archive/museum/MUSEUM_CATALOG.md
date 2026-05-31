# OMEGA DOCUMENTATION MUSEUM — CATALOG (fait foi)

> **EMP-15** · SCELLÉ 2026-05-31 · **Ce catalogue fait foi du contenu du musée** (savoir sans rescaner).
> Rempli à chaque étape C2→C6. Statuts : `MUSEUM` (déplacé ici) · `REGISTERED_NOT_MOVED` (référencé, reste en place — vague 2) · `UNIQUE_REVIEW_REQUIRED` (contenu unique, à revoir avant traitement) · `ENCODING_DAMAGED` (mojibake/BOM).

Légende colonnes : **item** | **type** | **date origine** | **date musée** | **raison** | **source courante équivalente** | **statut**.

---

## MOVED (vague 1 — documents)

| item | type | date origine | date musée | raison | source courante équivalente | statut |
|------|------|--------------|------------|--------|------------------------------|--------|
| `STALE_EXPORTS/deposit_2026-02-23/` (178 docs : public 147 + confidential 31) | export bundle (doc) | 2026-02-23 | 2026-05-31 | doublon stale ; 75/75 sessions hash-identiques à `sessions/` racine (0 unique) | `sessions/`, `docs/` courants | **MUSEUM** |
| `SESSION_SAVES_legacy/root_session_saves/` (3 fichiers) | session-save (doc) | 2026-02-05 → 03-06 | 2026-05-31 | consolidation : session-saves traînant à la racine du dépôt | `sessions/` + `sessions/SESSION_SAVE_INDEX.md` | **MUSEUM** |
| _(C4 forensic — relocalisé SSOT `docs/audit/forensic/`, hors musée ; voir `sessions/SESSION_SAVE_INDEX.md`)_ | | | | | | |
| `ROOT_STRAYS_2026-05-31/ROSETTA_legacy/` (3) | doc version | 2026 | 2026-05-31 | Rosette v1.0/1.1/2.0 superseded | `OMEGA_PIERRE_DE_ROSETTE_v2.1.md` (racine) | **MUSEUM** |
| `ROOT_STRAYS_2026-05-31/MASTER_PLANS_legacy/` (4) | doc plan | 2026 | 2026-05-31 | « Plan Max » NON-CANONIQUE | CLAUDE.md + CODEX v1-3-1 | **MUSEUM** |
| `ROOT_STRAYS_2026-05-31/CERTS_PHASE_legacy/` (4) | certif/rapport | 2026 | 2026-05-31 | phases closes (18/28/32) | `certificates/`, `nexus/proof/` | **MUSEUM** |
| `ROOT_STRAYS_2026-05-31/CODEX_legacy/` (1 = v1-1) | doctrine version | 2026 | 2026-05-31 | CODEX v1-1, 0 réf | `docs/CODEX_…_v1-3-1.md` | **MUSEUM** |
| ROOT relocalisés SSOT : 7 `PROMPT_CLAUDE_CODE_*`→`tools/prompts_history/`, 5 `EVIDENCE_*`→`nexus/proof/` | doc | — | 2026-05-31 | strays racine | (en place, SSOT) | RELOCATED_NOT_MUSEUM |
| **Retenus (cités SSOT, NON muséés)** : CODEX v1-2, v1-3 | doctrine version | — | — | cités par CLAUDE.md/NCR/ADR → liens SSOT | restent `docs/` | RETAINED_CITED |

## REGISTERED_NOT_MOVED (vague 2 — code snapshots + autopsie)

| item | type | date origine | taille | raison | décision vague 2 | statut |
|------|------|--------------|--------|--------|-------------------|--------|
| `deposit/confidential/src_code/` | snapshot CODE (174 .ts) | 2026-02-23 | 174 fichiers | code non déplacé en vague 1 (exclu du `git mv` deposit) ; incarnation `src/` ancêtre | LFS/zip ou archive — sprint vague 2 gaté build | **REGISTERED_NOT_MOVED** |
| _(C6 snapshots — à renseigner)_ | | | | | | |

---
*Procédure d'usage : voir `README_MUSEUM.md`. Hors SSOT (NON_SOURCE_OF_TRUTH_RUNTIME).*
