# OMEGA — Audit Code v1

# GENERATED 2026-03-24 — SESSION NUIT AUTONOME — OMEGA v1.0

Standard : NASA-Grade L4 / DO-178C Level A

---

## TODOs et FIXME

| Fichier | Ligne | Contenu | Priorite |
|---------|-------|---------|----------|
| src/oracle/s-score.ts | 24 | @deprecated LEGACY — Utiliser s-oracle-v2.ts | BASSE — deja remplace |
| src/validation/phase-u/polish-engine.ts | 122 | @deprecated Utiliser status. Conserve pour compat | BASSE — migration progressive |

**Total : 2 deprecated.** Aucun TODO, FIXME, HACK, ou XXX dans les 211 fichiers TypeScript source. Code propre.

---

## Tech Debt identifiee

| Module | Type dette | Impact | Recommandation |
|--------|-----------|--------|----------------|
| s-score.ts (oracle) | @deprecated non supprime | Confusion API | Supprimer et migrer imports vers s-oracle-v2.ts |
| polish-engine.ts | Champ deprecated conserve | Faible | Supprimer apres audit des consommateurs |
| 34 fichiers avec `any` type | Typage faible | Maintenabilite | Progressif — prioriser scoring/ et engine/ |
| Scripts bench (95 fichiers) | Accumulation | Navigation difficile | Archiver les one-shot executes |

---

## Modules PARKING

| Module | Tests | Raison suspension | Reactivation si... |
|--------|-------|-------------------|-------------------|
| partition-profiles.ts | 8 | Phase V architecture → parking Phase R | Integration pipeline V apres scellement moteur |
| scribe-orchestrator.ts | ~10 | CONTRAT_OMEGA_SCRIBE redefinit frontiere | Phase W pipeline orchestration |
| targeted-patch.ts | 11 | Phase U polish engine → parking | Reintegration post-seal |
| run-orchestrated-bench.ts | — | Bench Phase W suspendu | Phase W reprise |
| run-patch-bench.ts | — | Idem | Phase W reprise |

## Modules ACTIFS (confirmes par tests)

| Module | Tests | Role |
|--------|-------|------|
| damage-gate.ts | 11 | Gate de qualite generation |
| static-analyzer.ts | 15 | Analyse statique prompt |
| delta-compressor.ts | 10 | Compression scene-chain |
| prompt-compiler.ts | 40 | Compilateur V3 prompt |
| gb-scorer.ts | inclus 1911 | Juge GB V1 |
| multi-stage-scorer-v2.ts | inclus | Juge MS V2 |
| multi-stage-scorer-v3.ts | inclus | Juge MS V3 |
| text-features.ts | inclus | 42 features texte |
| passage-classifier.ts | inclus | Classification passage |

---

## Scripts de bench — inventaire

### Scripts actifs (moteur v3 pipeline)

| Script | Role | API calls |
|--------|------|-----------|
| test-p1-redesign-v3.ts | Moteur v3 valide | 12 |
| test-p3-regime-cible.ts | 3 scenes x 3 runs | 36 |
| test-p3-v4-confirmation.ts | Ancre renforcee | 12 |
| test-p4-continuite.ts | Inter-chapitres | 8 |
| rescore-p1-v2.ts | Re-scoring V2 (0 API) | 0 |

### Scripts de recherche (Phase R — garder pour reference)

| Script | Phase | Role |
|--------|-------|------|
| test-phase4-antidrift.ts | Phase 4a | Anti-drift + personas |
| test-phase4b-pulverize.ts | Phase 4b | 5 trios + editor + anon |
| test-phase4c-fusion-intl.ts | Phase 4c | 14 auteurs internationaux |
| test-phase5-assembly.ts | Phase 5 | 15 solos + 20 paires + 8 trios |
| test-phase5b-validate.ts | Phase 5b | 75 runs validation |
| test-mirror.ts | Miroir | 20 personas declare vs produit |
| test-r-conversion.ts | R-CONV FR | 15 runs conversion table |
| test-r-conversion-en.ts | R-CONV EN | 15 runs EN |

### Scripts candidats a l'archive

| Script | Raison | Action |
|--------|--------|--------|
| test-p1-redesign.ts | Remplace par v3 | ARCHIVER |
| test-p1-redesign-v2.ts | Remplace par v3 | ARCHIVER |
| test-p1-3000w-fdp-k2.ts | P1 original, FDP abandonne | ARCHIVER |
| test-f26b-breaker.ts | One-shot Phase 3 | GARDER (reference) |
| test-f26b-phase2.ts | One-shot Phase 3 | GARDER (reference) |
| test-f26b-phase3.ts | One-shot Phase 3 | GARDER (reference) |
| Scripts rosetta-*.ts (5) | Phase R diagnostic | ARCHIVER (resultats dans JSON) |
| Scripts run-ablation-*.ts (8) | Phase W ablation | ARCHIVER |
| Scripts analyze-ablation-*.ts (6) | Phase W analyse | ARCHIVER |

### Scripts hors-scan (anciens)

| Script | Role | Action |
|--------|------|--------|
| sessions/ARCHIVE/e1-multi-prompt-runner.ts | Phase E1 | Deja archive |
| sessions/ARCHIVE/e1-multi-prompt.test.ts | Phase E1 test | Deja archive |

---

## Optimisations possibles

| Cible | Gain estime | Effort | Priorite |
|-------|-------------|--------|----------|
| Archiver ~20 scripts one-shot | Lisibilite repo | 30 min | BASSE |
| Supprimer s-score.ts deprecated | Clarte API oracle | 10 min | BASSE |
| Typer les `any` dans scoring/ | Maintenabilite | 2-4h | MOYENNE |
| Centraliser helpers generate/withRetry/measure | DRY scripts | 1h | MOYENNE |

---

## Statistiques repo

| Metrique | Valeur |
|----------|--------|
| Fichiers TypeScript source | 211 |
| Scripts de bench | 95 |
| Tests totaux | 1911 PASS |
| TODO/FIXME | 2 (deprecated) |
| Sessions de bench | ~40 dossiers |
| JSON de donnees | 67 fichiers |

---

*Audit genere par scan automatique de src/ et scripts/*
