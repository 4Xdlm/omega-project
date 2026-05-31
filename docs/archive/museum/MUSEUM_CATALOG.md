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
| `EXPORT_FULL_PACK/` | snapshot export | 2026-01-11 | 127 fichiers, 0.1 MB | bundle export gelé (1 commit) | archive/zip vague 2 | **REGISTERED_NOT_MOVED** |
| `omega-v44/` | snapshot version (30 .ts) | 2026-01-24 | 45 fichiers, 0.3 MB | snapshot moteur v44 (cf. archaeo SNAPSHOT) | vague 2 gaté build | **REGISTERED_NOT_MOVED** |
| `omega-v44-phase7/` | snapshot version (21 .ts) | 2026-01-23 | 101 fichiers, 0.6 MB | snapshot moteur v44 phase7 | vague 2 gaté build | **REGISTERED_NOT_MOVED** |
| `sprint28_5/` | snapshot sprint (34 .ts) | 2026-01-09→17 | 62 fichiers, 1.0 MB | snapshot code sprint 28.5 | vague 2 gaté build | **REGISTERED_NOT_MOVED** |
| `genius-integration/` | patch CODE (2 .ts) | 2026-02-22 | 4 fichiers | PATCH_STAGED (réf par sovereign-engine ADR/scripts, non appliqué) — cf. archaeo | NE PAS muséer tant que cité ; décision vague 2 | **REGISTERED_NOT_MOVED** |
| `omega-autopsie/` | corpus analyse (Python + 169 œuvres features) | 2026-03-02→04-21 | 27 192 fichiers, **3 558 MB (3,6 GB)** | **décision LFS/zip requise** (volume) ; consommé par 28 scripts autopsie (Phase W) — cf. `docs/audit/minaxis/MINAXIS_DATASET_TRACEABILITY.md` | **flag DÉCISION vague 2 : LFS vs zip vs externalisation** | **REGISTERED_NOT_MOVED** |

**Encoding** : sondage `.md` (≤60/dir) sur les 6 snapshots → **aucun mojibake U+FFFD / BOM détecté** (échantillon, non exhaustif). Aucun marqueur `ENCODING_DAMAGED` appliqué. Re-scanner exhaustivement avant déplacement vague 2.

---
*Procédure d'usage : voir `README_MUSEUM.md`. Hors SSOT (NON_SOURCE_OF_TRUTH_RUNTIME).*
