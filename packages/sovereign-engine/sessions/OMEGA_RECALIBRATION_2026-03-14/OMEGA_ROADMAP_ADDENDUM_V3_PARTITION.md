# OMEGA ROADMAP — ADDENDUM V3 (Prompt Partition)
# Ajout à OMEGA_ROADMAP_v8_0.md
# Date : 2026-03-14
# Autorité : Francky (Architecte Suprême)
# Validé par : Unanimité 3/3 (Claude + ChatGPT + Gemini)

---

## INSERTION APRÈS : PARTIE III — PHASE DE REMISE EN ÉTAT

### Phase V-PARTITION — Prompt Partition V3 (Constraint Compiler)

#### Contexte

La recalibration 2026-03-14 a prouvé par les données :
- Delta CDE mesuré : -4.2 pts composite (one-shot 91.5 → CDE 87.3)
- Interférence QUOI/COMMENT : le brief CDE écrase les instructions PDB
- RCI structurellement fragile en base (85.8 moyen, 2/3 < floor 85)
- Fatigue séquentielle : Scene 0→1 = -3.8 pts
- Syndrome vases communicants : sauver RCI → tuer SII

Le paradigme actuel (23 sections concaténées + brief injecté dans scene.objective) a atteint sa limite physique. La Phase V-PARTITION construit le compilateur de contraintes qui remplace ce paradigme.

#### Décisions verrouillées (unanimité 3/3)

| # | Question | Décision |
|---|----------|---------|
| Q1 | Remplacement v2 | **Progressif** — flag `OMEGA_PROMPT_COMPILER_V3=1`, v2 conservé en fallback |
| Q2 | Périmètre v3.0.0 | **Cœur dynamique** (290 tokens) — v2 conservé pour sections stables |
| Q3 | Contrat d'attention | **Sandwich léger** — complet en tête, rappel minimal en fin |
| Q4 | Ordre sprints | **P1 compilateur → P2 delta compressor** |
| Q5 | Feedback loop | **v3.1.0** — pas dans le premier jet |

#### Budget tokens v3.0.0

| Niveau | Budget | Contenu |
|--------|--------|---------|
| Contrat d'attention | 30 tokens | Hiérarchie N1>N2>N3 + règle de sacrifice |
| N1 — Lois physiques | 60 tokens | Interdictions, garde-fous structurels, kill-lists |
| N2 — Trajectoire | 140 tokens | Émotions Q1→Q4, objectif scène, pente tension (shape-aware) |
| N3 — Décor | 60 tokens | Facts canoniques, mots-clés voix, continuité |
| **Total cœur compilé** | **290 tokens** | |

#### Sprints

| Sprint | Description | Taille | API | Prérequis |
|--------|-------------|--------|-----|-----------|
| **P0.5** | Mini crash suite (3 scènes pathologiques) | S | 0 | Aucun |
| **P1** | Constraint Compiler (7 étapes de compilation) | M | 0 | P0.5 |
| **P1.1** | Static Analyzer (instrumentation native + dumps diffables) | S | 0 | P1 |
| **P2** | Delta Compressor (état vectoriel ≤ 40 tokens) | S | 0 | P1.1 |
| **P3** | Cross-Axis Damage Gate (seuils par axe) | S | 0 | P2 |
| **P4** | Crash Suite complète (10 scènes) + bench V3 vs V2 | S | ~10 | P3 |

#### Fichiers nouveaux

```
src/compiler/prompt-compiler.ts        — Compilateur principal
src/compiler/constraint-pool.ts        — Collecte + classification
src/compiler/level-router.ts           — Routage N1/N2/N3
src/compiler/transducer.ts             — Transduction narrative
src/compiler/budget-manager.ts         — Budgétisation + sacrifice
src/compiler/static-analyzer.ts        — Analyseur pré-vol
src/compiler/types.ts                  — Types du compilateur
src/cde/delta-compressor.ts            — Compression vectorielle inter-scènes
src/validation/damage-gate.ts          — Garde-fou anti-régression inter-axes
tests/compiler/*.test.ts               — Tests compilateur
tests/bench/pathological-scenes.ts     — 10 scènes extrêmes
```

#### Relation avec modules existants

| Module existant | Relation |
|----------------|----------|
| `prompt-assembler-v2.ts` | Conservé en fallback. Sections stables (Voice, Kill, Mission) restent actives. Sections dynamiques (Emotion, Beats, Brief) remplacées par compilateur quand flag V3 actif. Marqué @deprecated à terme. |
| `constraint-compiler.ts` | Pattern absorbé dans l'étape 6 (transduction). Logique budgetée généralisée. |
| `distiller.ts` | distillBrief() devient fournisseur de contraintes brutes, pas formateur. |
| `cde-pipeline.ts` | Simplifié. Plus d'injection monolithique. Le compilateur fusionne brief + prompt. |
| `instruction-toggle-table.ts` | Étendu comme shape router complet (étape 3). |
| `emotion-to-action.ts` | Étendu comme bibliothèque de transduction pour toutes les données. |

#### Invariants (13)

| ID | Description | Sprint |
|----|-------------|--------|
| INV-COMP-01 | 3 niveaux + contrat d'attention dans chaque partition | P1 |
| INV-COMP-02 | Budget N1 ≤ 60 tokens (incompressible) | P1 |
| INV-COMP-03 | Budget total cœur ≤ 290 tokens | P1 |
| INV-COMP-04 | Zéro contrainte N1 sacrifiée (fail-closed) | P1 |
| INV-COMP-05 | Déterminisme : même input → même partition → même hash | P1 |
| INV-COMP-06 | Zéro vecteur brut / zéro ID système dans la sortie | P1 |
| INV-COMP-07 | Contrat d'attention en TÊTE + rappel en FIN (sandwich) | P1 |
| INV-COMP-08 | Anti-double-signal : aucune contrainte V3 dupliquée dans V2 | P1 |
| INV-SA-01 | Static Analyzer exécuté AVANT chaque appel API | P1.1 |
| INV-SA-02 | RED = blocage absolu (override dev via flag explicite) | P1.1 |
| INV-DC-01 | CompressedDelta ≤ 40 tokens | P2 |
| INV-DG-01 | Régression max : ECC ≤ 2, RCI ≤ 2, SII ≤ 2, IFI ≤ 2, AAI ≤ 1.5 | P3 |
| INV-DG-02 | Transformation rejetée par Damage Gate → rollback automatique | P3 |

#### Critères de succès v3.0.0

| Métrique | Cible | Baseline V2 |
|----------|-------|-------------|
| Composite moyen CDE | ≥ 90.0 | 87.3 |
| ECC (2 scènes) | ≥ 85.0 | 80.9 |
| RCI (2 scènes) | ≥ 85.0 | 83.4 |
| SII/IFI/AAI | ≥ 85.0 (aucune régression > 2 pts) | OK |
| Fatigue S0→S1 | ≤ -2 pts | -3.8 |
| Static Analyzer | 0 RED pré-vol | N/A |
| Tests | ≥ 1544 PASS / 0 FAIL | 1544 |

#### INTERDICTIONS pendant cette phase

- ❌ V-WORLD-1 (prématuré)
- ❌ Bench large 30+30 (pas avant P4)
- ❌ Polish retouches (Damage Gate d'abord)
- ❌ Nouvelles instructions PDB non compilées
- ❌ Ajout de sections à prompt-assembler-v2.ts

---

### Phase V-PARTITION v3.1.0 (futur — après v3.0.0 prouvé)

| Sprint | Description |
|--------|-------------|
| P5 | Compilateur absorbe TOUT le prompt (budget global ~800t) |
| P6 | Feedback Loop (scores précédents → ajustement partition) |
| P7 | Shape Genome (profil continu d'instructions par shape) |
| P8 | Prompt Budget Optimizer (ROI par section) |

---

## MISE À JOUR ROADMAP VISUELLE

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    PRÉSENT — EN COURS                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  V-INIT / V-PROTO / V-BENCH ─────────────────────────── 1564 tests      ║
║  CLEAN-1 / CLEAN-2 / CLEAN-2.1 ──────────────────────── 1540→1542      ║
║  V-RECAL-1 (brief dramatique) ────────────────────────── 1542 tests     ║
║  3a+3b+3c (brief hiérarchisé + LOT1-04 + RCI) ──────── 1544 tests      ║
║  ▶ V-PARTITION v3.0.0 (Constraint Compiler)                              ║
║    P0.5 → P1 → P1.1 → P2 → P3 → P4                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║                    FUTUR PROCHE                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  V-PARTITION v3.1.0 (absorption complète + feedback loop)               ║
║  V-WORLD-1 : PersonaStore + DebtLedger + ArcTracker                    ║
║  V-WORLD-2 : RelevanceFilter                                            ║
║  V-CANON-1 : Canon Lock Gate post-génération                            ║
║  V-CHAIN-1 : Multi-scènes recalibré + V-BENCH final                    ║
║  V-SEAL    : Certification Phase V                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                    FUTUR — PHASES W, X, VALIDATION, UI                  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

**FIN ADDENDUM ROADMAP V3**
*2026-03-14 — Unanimité 3/3*
