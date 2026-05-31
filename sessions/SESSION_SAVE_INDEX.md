# OMEGA — SESSION SAVE INDEX (topologie des emplacements)

> Index des emplacements de session-saves. **N'altère aucun contenu** (EMP-15 : index seulement, pas de merge).
> Statuts : **ACTIVE** (canonique, SSOT) · **MUSEUM** (muséé, NON_SOURCE_OF_TRUTH_RUNTIME) · **STALE** (export périmé).

## Emplacements

| emplacement | nb | statut | note |
|---|---|---|---|
| `sessions/` (racine du dossier) | ~90 | **ACTIVE** | session-saves canoniques — SSOT runtime. Non touchés par la réorg musée. |
| `docs/archive/museum/SESSION_SAVES_legacy/root_session_saves/` | 3 | **MUSEUM** | ex-racine du dépôt, muséés 2026-05-31 (C3). |
| `docs/archive/museum/STALE_EXPORTS/deposit_2026-02-23/public/sessions/` | 75 | **STALE** | doublons exacts de `sessions/` (hash-vérifié C2). |

## Session-saves muséés depuis la racine (C3, 2026-05-31)

| date | titre | chemin musée | statut |
|---|---|---|---|
| 2026-02-05 | CERTIFICATION_COMPLETE | `docs/archive/museum/SESSION_SAVES_legacy/root_session_saves/SESSION_SAVE_20260205_CERTIFICATION_COMPLETE.md` | MUSEUM |
| 2026-02-18 | (session 2026-02-18) | `…/root_session_saves/SESSION_SAVE_2026-02-18.md` | MUSEUM |
| 2026-03-06 | U-META-03_U-VOICE-05_BUILD_UPDATE | `…/root_session_saves/SESSION_SAVE_2026-03-06_U-META-03_U-VOICE-05_BUILD_UPDATE.md` | MUSEUM |

## Scans forensiques relocalisés (C4 — SSOT audit, PAS musée)

| scan | nouveau chemin | statut |
|---|---|---|
| `SESSION_SAVE_2026-02-03_FORENSIC_SCAN_x1000.md` | `docs/audit/forensic/` | ACTIVE (audit) |
| `SESSION_SAVE_2026-02-04_FORENSIC_CORRECTIONS_BATCH_1_2.md` | `docs/audit/forensic/` | ACTIVE (audit) |

Ce sont des **preuves d'audit** (pas des session-saves) → relocalisés sous `docs/audit/forensic/` (reste dans le SSOT, non muséés). Cf. `docs/audit/forensic/README.md`.

---
*Le contenu actif reste dans `sessions/`. Les emplacements MUSEUM/STALE sont hors SSOT (cf. `docs/archive/museum/README_MUSEUM.md`).*
