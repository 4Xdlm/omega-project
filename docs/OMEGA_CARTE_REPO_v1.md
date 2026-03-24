# OMEGA — Carte Complete du Repo v1

# GENERATED 2026-03-24 — SESSION NUIT AUTONOME — OMEGA v1.0

Standard : NASA-Grade L4 / DO-178C Level A

---

## Arbre principal avec annotations

```
omega-project/
├── CLAUDE.md                              [ACTIF — operations manual v3.155]
├── CHANGELOG.md                           [ACTIF — historique]
├── CERTIFICATION.md                       [ACTIF — certification]
├── FROZEN_MODULES.md                      [ACTIF — liste modules geles]
│
├── packages/
│   ├── sovereign-engine/                  [ACTIF — MOTEUR PRINCIPAL]
│   │   ├── src/
│   │   │   ├── scoring/                   [ACTIF — GB V1 + MS V2 + V3]
│   │   │   │   ├── gb-scorer.ts           [ACTIF — 42 features + 50 arbres]
│   │   │   │   ├── gb-inference.ts        [ACTIF — foret gradient boosting]
│   │   │   │   ├── text-features.ts       [ACTIF — F1-F38 features]
│   │   │   │   ├── depth-features.ts      [ACTIF — profondeur syntaxique]
│   │   │   │   ├── semantic-depth-features.ts [ACTIF — profondeur semantique]
│   │   │   │   ├── multi-stage-scorer-v2.ts [ACTIF — juge V2 longue forme]
│   │   │   │   ├── multi-stage-scorer-v3.ts [ACTIF — juge V3]
│   │   │   │   ├── multi-stage-scorer.ts  [ACTIF — V1 multi-stage]
│   │   │   │   ├── passage-classifier.ts  [ACTIF — classification passage]
│   │   │   │   ├── passage-type-detector.ts [ACTIF — detection type]
│   │   │   │   ├── normalizer.ts          [ACTIF — normalisation]
│   │   │   │   └── data/                  [ACTIF — 67 JSON mesures + modele]
│   │   │   │
│   │   │   ├── compiler/                  [ACTIF — compilation prompt]
│   │   │   │   ├── prompt-compiler.ts     [ACTIF — 40 tests]
│   │   │   │   ├── static-analyzer.ts     [ACTIF — 15 tests]
│   │   │   │   ├── partition-profiles.ts  [PARKING — 8 tests]
│   │   │   │   ├── budget-manager.ts      [ACTIF — gestion tokens]
│   │   │   │   └── constraint-pool.ts     [ACTIF — contraintes]
│   │   │   │
│   │   │   ├── input/                     [ACTIF — assemblage prompt]
│   │   │   │   ├── prompt-assembler-v2.ts [ACTIF]
│   │   │   │   ├── prompt-assembler-v4.ts [ACTIF]
│   │   │   │   └── forge-packet-assembler.ts [ACTIF]
│   │   │   │
│   │   │   ├── microsurgery/              [ACTIF — gates]
│   │   │   │   └── damage-gate.ts         [ACTIF — 11 tests]
│   │   │   │
│   │   │   ├── cde/                       [ACTIF — scene chain]
│   │   │   │   ├── delta-compressor.ts    [ACTIF — 10 tests]
│   │   │   │   ├── cde-pipeline.ts        [ACTIF]
│   │   │   │   └── scene-chain.ts         [ACTIF]
│   │   │   │
│   │   │   ├── oracle/                    [ACTIF — axes esthetiques]
│   │   │   │   ├── s-oracle-v2.ts         [ACTIF — S-score v2]
│   │   │   │   ├── s-score.ts             [DEPRECATED — utiliser v2]
│   │   │   │   └── [autres oracles]       [ACTIF]
│   │   │   │
│   │   │   ├── validation/                [ACTIF — gates + phase-u]
│   │   │   │   ├── damage-gate.ts         [ACTIF]
│   │   │   │   ├── phase-u/               [PARKING — polish engine]
│   │   │   │   └── validation-runner.ts   [ACTIF]
│   │   │   │
│   │   │   ├── genius/                    [ACTIF — genius engine]
│   │   │   ├── calibration/               [ACTIF — calibration]
│   │   │   ├── benchmark/                 [ACTIF — bench protocol]
│   │   │   ├── authenticity/              [ACTIF — anti-IA detection]
│   │   │   ├── semantic/                  [ACTIF — analyse semantique]
│   │   │   ├── voice/                     [ACTIF — voix compiler]
│   │   │   ├── temporal/                  [ACTIF — temporalite]
│   │   │   ├── polish/                    [PARKING — targeted-patch]
│   │   │   ├── delta/                     [ACTIF — delta-* computeurs]
│   │   │   ├── guards/                    [ACTIF — paragraph-guard]
│   │   │   ├── filter/                    [ACTIF — banality-budget]
│   │   │   ├── silence/                   [ACTIF — show-dont-tell]
│   │   │   ├── metaphor/                  [ACTIF — detection metaphore]
│   │   │   ├── symbol/                    [ACTIF — symbol-mapper]
│   │   │   └── runtime/                   [ACTIF — providers + utilities]
│   │   │
│   │   ├── scripts/                       [ACTIF — 95 scripts bench]
│   │   │   ├── test-p1-redesign-v3.ts     [ACTIF — moteur v3]
│   │   │   ├── test-p3-*.ts               [ACTIF — regime cible]
│   │   │   ├── test-p4-continuite.ts      [ACTIF — inter-chapitres]
│   │   │   ├── rescore-p1-v2.ts           [ACTIF — re-scoring V2]
│   │   │   ├── test-phase4*.ts            [REFERENCE — Phase 4 personas]
│   │   │   ├── test-phase5*.ts            [REFERENCE — Phase 5 assembly]
│   │   │   ├── test-mirror.ts             [REFERENCE — miroir]
│   │   │   ├── test-r-conversion*.ts      [REFERENCE — R-CONVERSION]
│   │   │   └── [~60 scripts historiques]  [ARCHIVE candidats]
│   │   │
│   │   └── sessions/                      [ACTIF — ~40 dossiers resultats]
│   │       ├── P1_2026-03-24T18-09-28/    [ACTIF — proses P1]
│   │       ├── P1_REDESIGN_V3_*/          [ACTIF — proses moteur v3]
│   │       ├── P3_*/                      [ACTIF — proses regime cible]
│   │       ├── P4_*/                      [ACTIF — proses continuite]
│   │       ├── MIRROR_*/                  [REFERENCE — proses miroir]
│   │       ├── PHASE5_*/                  [REFERENCE — proses assembly]
│   │       ├── BenchW_*/                  [ARCHIVE — bench Phase W]
│   │       ├── DualBench_*/               [ARCHIVE — bench dual]
│   │       └── ARCHIVE/                   [ARCHIVE — anciens scripts]
│   │
│   ├── genome/                            [SEALED — Phase 28 — ADN narratif]
│   ├── sentinel-judge/                    [ACTIF — Sentinel Judge]
│   ├── hardening/                         [ACTIF — security utilities]
│   ├── search/                            [ACTIF — search engine]
│   ├── integration-nexus-dep/             [ACTIF — pipeline router]
│   └── omega-segment-engine/              [ACTIF — segmentation]
│
├── gateway/                               [ACTIF — memory + creation layer]
│   └── src/
│       ├── memory/                        [ACTIF — World Model]
│       └── creation/                      [ACTIF — pipeline auteur]
│
├── omega-autopsie/                        [ACTIF — analyseur corpus Python]
│   └── full_work_analyzer_v4.py           [ACTIF — 30 features F1-F30]
│
├── nexus/proof/                           [ACTIF — phase reports]
├── certificates/                          [ACTIF — test certificates]
├── evidence/                              [ACTIF — logs + hashes]
├── archives/                              [ARCHIVE — ZIP snapshots]
│
├── GOVERNANCE/                            [ACTIF — governance framework]
│   ├── DECISIONS/                         [ACTIF — decisions architecturales]
│   ├── VISION_FINALE_SCELLEE.md           [ACTIF — vision scellee]
│   └── runtime/                           [ACTIF — drift rules, charter]
│
├── docs/                                  [ACTIF — ~230 documents]
│   ├── [voir OMEGA_INDEX_MASTER_v2.md pour inventaire complet]
│   └── consultation/                      [ACTIF — docx bilan/glossaire/schemas]
│
├── EXPORT_FULL_PACK/                      [ARCHIVE — certificats phases 30-60]
├── OMEGA_MASTER_DOSSIER_v3.21.0_PERFECT/  [ARCHIVE — dossier master v3.21]
├── OMEGA_MASTER_DOSSIER_v3.61.0/          [ARCHIVE — dossier master v3.61]
└── OMEGA_MASTER_DOSSIER_v3.83.0/          [ARCHIVE — dossier master v3.83]
```

---

## Statistiques globales

| Categorie | Fichiers | Statut |
|-----------|----------|--------|
| Source TypeScript (src/) | 211 | ACTIF |
| Scripts bench (scripts/) | 95 | 15 ACTIFS, 20 REFERENCE, 60 ARCHIVE candidats |
| JSON donnees (scoring/data/) | 67 | ACTIF |
| Documents markdown (docs/) | ~230 | ~50 ACTIFS, reste ARCHIVE/CONSULTATION |
| Sessions bench (sessions/) | ~40 dirs | 6 ACTIFS, reste ARCHIVE candidats |
| Certificats (certificates/) | ~30 phases | ARCHIVE reference |
| Tests | 1911 | PASS |

---

## Fichiers candidats a l'archive

| Categorie | Nombre | Action recommandee |
|-----------|--------|-------------------|
| BenchW_* sessions (Phase W) | 16 dirs | Compresser en ZIP unique |
| DualBench_* sessions | 6 dirs | Compresser en ZIP unique |
| F26B_* sessions | 3 dirs | Garder (reference Phase 3) |
| Scripts rosetta-*.ts | 5 | Deplacer vers sessions/ARCHIVE/ |
| Scripts run-ablation-*.ts | 8 | Deplacer vers sessions/ARCHIVE/ |
| OMEGA_MASTER_DOSSIER_* | 3 dirs | Garder 1 seul (v3.83), archiver les autres |

---

## Packages hors-scan

Les packages suivants existent mais n'ont pas ete audites dans cette session :
- packages/scribe-engine/ — moteur alternatif (frontiere CONTRAT_OMEGA_SCRIBE)
- packages/hardening/ — security utilities
- packages/search/ — search engine
- packages/integration-nexus-dep/ — pipeline router
- packages/omega-segment-engine/ — segmentation

Recommandation : auditer ces packages dans une session dediee.

---

*Carte generee par scan automatique du repo omega-project/*
