# OMEGA — Prompts J→K→L→M — INDEX

## 📋 Vue d'Ensemble

| Phase | Fichier | Objectif | Tests Ajoutés |
|-------|---------|----------|---------------|
| J | PHASE_J_BUILD_DIST.md | CLI depuis dist/ compilé | ~15 |
| K | PHASE_K_PROVIDERS_LOCKED.md | Providers réels avec lock | ~40 |
| L | PHASE_L_REPLAY_ENGINE.md | Verification read-only | ~30 |
| M | PHASE_M_CAPSULE_PORTABLE.md | Capsule portable | ~25 |

## 🚀 Exécution

**Orchestrateur:** `EXEC_ALL_JKLM.md`

**Ordre strict:** J → K → L → M (aucun skip)

## 🔒 Zones Scellées (A→I)

```
src/canon/           # Phase E
src/gates/           # Phase F
src/sentinel/        # Phase C+CD
src/memory/          # Phase D
src/memory-write-runtime/
src/orchestrator/    # Phase G
src/delivery/        # Phase H
src/runner/          # Phase I
genesis-forge/       # Phase B
config/policies/     # Phase G
config/delivery/     # Phase H
```

## 📊 Progression Attendue

| Phase | Tests Baseline | Tests Ajoutés | Total Attendu |
|-------|----------------|---------------|---------------|
| Pre-J | 4398 | 0 | 4398 |
| J | 4398 | ~15 | ~4413 |
| K | ~4413 | ~40 | ~4453 |
| L | ~4453 | ~30 | ~4483 |
| M | ~4483 | ~25 | ~4508 |

## ⚠️ Corrections vs Plan ChatGPT

| Élément | ChatGPT | Corrigé |
|---------|---------|---------|
| Dossier prompts | `docs/claude/` | `docs/prompts/jklm/` |
| Phases scellées | A→G | A→I (H+I inclus) |
| src/runner/ | Modifiable | 🔒 SEALED |
| Tests baseline | Non spécifié | 4398 |
| Format prompts | Nouveau | Aligné sur Phase H/I |

## 📁 Fichiers Créés

```
docs/prompts/jklm/
├── INDEX.md                      ← Ce fichier
├── EXEC_ALL_JKLM.md              ← Orchestrateur
├── PHASE_J_BUILD_DIST.md         ← Phase J
├── PHASE_K_PROVIDERS_LOCKED.md   ← Phase K
├── PHASE_L_REPLAY_ENGINE.md      ← Phase L
└── PHASE_M_CAPSULE_PORTABLE.md   ← Phase M
```

---

**Date:** 2026-01-28  
**Standard:** NASA-Grade L4
