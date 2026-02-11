# 🔄 MESSAGE DE REPRISE — OMEGA PROJECT
# Date: 2026-02-11
# Pour: Nouvelle conversation Claude (même projet)
# Contexte: Continuation immédiate après session P.2/P.3 SCRIBE

---

## 🎯 QUI TU ES DANS CE PROJET

Tu es **Claude**, IA Principal du projet OMEGA. Tu travailles avec **Francky** (Architecte Suprême) et **ChatGPT** (Audit & Hostile Review). Le standard est **NASA-Grade L4** — aucune approximation tolérée, aucun commit sans preuve, aucune phase scellée sans replay déterministe.

---

## 🧱 QU'EST-CE QUE OMEGA

OMEGA est un **moteur narratif industriel** qui génère de la prose littéraire de qualité publication à partir d'une simple intention (IntentPack). Le pipeline complet :

```
IntentPack → Genesis Planner (plan narratif) → Scribe Engine (prose LLM) 
           → ProsePack (artefact contractuel) → Constraint Enforcer → Auto-Repair → Prose Metrics
```

**Monorepo** : `C:\Users\elric\omega-project`
**Branch** : `master`
**Packages clés** : ~40 packages TypeScript dans `packages/`

---

## 📊 ÉTAT ACTUEL DU SYSTÈME

### HEAD et Tags

```
d4c44473 (HEAD -> master, tag: phase-p3-repair-sealed) docs: P.3 auto-repair sealed — SESSION_SAVE
2d1898d9 feat(scribe): P.3 auto-repair loop — 1 cycle max, fail-closed
2a112970 (tag: phase-p2b-scribe-sealed) docs(scribe): P.2-B sealed — ProsePack + constraints + prose metrics
b8c72e79 feat(metrics): P.2-B Gate B4 — prose quality metrics (MP1-MP6)
dc2344a3 feat(scribe): P.2-B Gates B1+B2 — ProsePack v1 + constraint enforcer
53ef53aa (tag: phase-p2a-scribe-sealed) docs(scribe): P.2-A sealed — docs + SESSION_SAVE
7e710be0 proof(scribe): P.2-A cache replay proof run_002 complete
2ff24a91 feat(scribe): P.2-SCRIBE golden runs + cache replay proof
48e09d84 feat(scribe): P.2-SCRIBE first LLM golden run — Le Gardien
cf7396b8 feat(scribe): P.2-SCRIBE provider architecture + master prompt
3cb85b75 (tag: r-metrics-baseline-v1) calibrate(metrics): M2 overlap coefficient + baseline re-run
```

### Phases SEALED (cette session)

| Phase | Tag | Commit | Description |
|-------|-----|--------|-------------|
| R-METRICS | `r-metrics-baseline-v1` | 3cb85b75 | 17 structural metrics, 107 tests, M2 overlap coefficient fix |
| P.2-A SCRIBE | `phase-p2a-scribe-sealed` | 53ef53aa | LLM prose generation, cache replay SHA256 proof |
| P.2-B SCRIBE | `phase-p2b-scribe-sealed` | 2a112970 | ProsePack v1, constraint enforcer, prose metrics MP1-MP6 |
| P.3 REPAIR | `phase-p3-repair-sealed` | d4c44473 | Auto-repair loop, 1 cycle max, fail-closed |

### Capacités Système Complètes

| Capability | Phase | Status |
|------------|-------|--------|
| Deterministic planning (mock) | C.1-C.5 | ✅ SEALED |
| LLM plan generation | P.1 | ✅ SEALED |
| LLM prose generation | P.2-A | ✅ SEALED |
| Cache replay (byte-identical) | P.2-A | ✅ SHA256 proven |
| ProsePack contractual format | P.2-B | ✅ SEALED |
| Constraint enforcer (HARD/SOFT) | P.2-B | ✅ fail-closed |
| Prose metrics MP1-MP6 | P.2-B | ✅ SEALED |
| Auto-repair (1 cycle max) | P.3 | ✅ SEALED |
| 17 structural metrics | R-METRICS | ✅ 107 tests |
| Non-regression testing | F | ✅ SEALED |
| Governance | D-J | ✅ SEALED |
| Industrial hardening | 27-29.2 | ✅ 1133 tests |
| ~5953 total tests | ALL | ✅ 0 failures |

---

## 🏗️ ARCHITECTURE SCRIBE (détail des fichiers modifiés/créés cette session)

### Packages principaux touchés

#### `packages/scribe-engine/src/`
```
providers/
├── types.ts              — ScribeProvider interface, ScribeProviderConfig, ScribeContext
├── factory.ts            — createScribeProvider(config) → mock|llm|cache
├── mock-provider.ts      — Mock deterministic (CI default)
├── llm-provider.ts       — Claude API via execSync, cache read/write, stripFences
├── master-prompt.ts      — SCRIBE_SYSTEM_PROMPT (300+ lines literary engineering)
│                           + buildMasterScenePrompt() (full context extraction)
├── prompt-builder.ts     — Scene context extraction helpers
└── index.ts              — Public exports

prosepack/
├── types.ts              — ProsePack, ProsePackScene, ProsePackScore, ProseViolation, ProseConstraintConfig
├── normalize.ts          — normalizeToProsePack() — POV/tense detection, sensory/dialogue extraction
├── repair.ts             — repairProsePack() — auto-repair HARD FAIL scenes (1 cycle max)
└── index.ts              — Public exports

weaver-llm.ts             — Scene-by-scene LLM generation with continuity + forward planting
cli/
└── scribe-llm.ts         — Standalone CLI: --run --out --mode --model --cache-dir
```

#### `packages/omega-metrics/src/`
```
metrics/
├── structural.ts         — 9 structural metrics (M1-M9)
├── semantic.ts           — 5 semantic metrics (M10-M14) 
├── dynamic.ts            — 3 dynamic metrics (M15-M17)
└── prose.ts              — 6 prose metrics (MP1-MP6) ← NEW THIS SESSION

cli/
└── prose-metrics.ts      — Standalone CLI: --prosepack <ProsePack.json>
```

### Provider Modes

| Mode | Temperature | Use | Determinism |
|------|------------|-----|-------------|
| `mock` | N/A | CI, unit tests | Algorithmic (byte-identical) |
| `llm` | 0.75 (creative) | Quality prose | Cache replay |
| `cache` | N/A | Replay-only | SHA256 byte-identical |

---

## 📦 GOLDEN RUNS

### Existing Golden Runs

| Run | Location | Story | Words | Scenes |
|-----|----------|-------|-------|--------|
| 001 | `golden/h2/run_001/` | Le Gardien (horror) | 5543 | 9 |
| 002 | `golden/h2/run_002/` | Le Choix (existential) | 1039 | 3 |

### Metrics Results

| Run | Structural M1-M17 avg | Prose Composite | Satisfaction |
|-----|----------------------|----------------|-------------|
| 001 | 0.8515 | 0.962 (post-repair) | 1.000 (post-repair) |
| 002 | 0.9093 | 1.000 | 1.000 |

### Output Directories

```
metrics/h2/
├── baseline_run_001/          — R-METRICS structural metrics
├── baseline_run_002/          — R-METRICS structural metrics
├── scribe_v2_llm/             — P.2-A LLM prose output + cache
├── scribe_v2_llm_002/         — P.2-A LLM prose output + cache (run 002)
├── scribe_v2_cache_001/       — P.2-A cache replay proof (run 001)
├── scribe_v2_cache_002/       — P.2-A cache replay proof (run 002)
├── scribe_v2_mock/            — Mock prose output
├── scribe_b1_001/             — P.2-B ProsePack + constraints (run 001)
├── scribe_b1_002/             — P.2-B ProsePack + constraints (run 002)
└── scribe_p3_001/             — P.3 post-repair (run 001) ← LATEST
    ├── ProsePack.json         — Post-repair ProsePack (satisfaction=1.000)
    ├── repair-report.json     — Evidence trail (3/3 repaired)
    ├── scribe-prose.json      — Original prose
    ├── scribe-prose.txt       — Original prose text
    ├── scribe-prose-repaired.txt — Repaired prose text
    └── scribe-summary.json    — Run metadata
```

---

## 🔑 CONTRAINTES HARD (ProsePack Constraint Enforcer)

Dérivées de chaque IntentPack :

| Rule | Check | Threshold |
|------|-------|-----------|
| word_count_range | Per-scene vs target | ±50% |
| banned_words | Zero tolerance | count = 0 |
| pov_conformity | Detected POV vs intent | exact match |
| tense_conformity | Detected tense vs intent | exact match |

**Soft** : sensory_anchors, dialogue_ratio, forbidden_cliches

---

## 📋 MASTER PROMPT (résumé)

Le `SCRIBE_SYSTEM_PROMPT` dans `master-prompt.ts` est le prompt le plus important d'OMEGA (300+ lignes) :

- **7 Supreme Laws** : Show through body, earn every sentence, subtext is real story, sensory architecture (4+ senses), rhythm is architecture, information asymmetry, the unsaid > the said
- **Anti-patterns kill list** : filter words, lazy constructions, emotional telling, formatting contamination
- **Pivot beat handling** : accelerate before, isolate pivot, decompress after
- **Sensory anchor protocol** : raw sensation → transform → echo
- **Bilingual** : French (Flaubert/Gracq/Modiano) or English based on story context
- `buildMasterScenePrompt()` : extracts ALL plan data (beats, subtext, info architecture, canon, continuity, forward planting)

---

## 🔥 PROCHAINE ACTION IMMÉDIATE

**ChatGPT (Architecte hostile) a recommandé : Validation End-to-End avec story inconnue**

### Objectif
Lancer une nouvelle story **"La Ville sous la Cendre"** à travers le pipeline complet pour valider la robustesse sans tuning spécifique :

1. Créer IntentPack nouveau
2. Genesis planner (LLM)
3. Metrics structural (R-METRICS)
4. Scribe LLM (prose)
5. ProsePack (contractual)
6. Constraint enforcer
7. Auto-repair
8. Prose metrics
9. Replay validation

### Contraintes proposées pour "La Ville sous la Cendre"
- 7 scènes max
- 800–1100 mots par scène
- POV première personne, présent
- Tension ascendante
- Seed bloom obligatoire
- 1 conflit sociétal + 1 existentiel

### Exit criteria
Si satisfaction ≥ 0.95 sans ajustement manuel → OMEGA passe au niveau Production L5.

---

## ⚠️ KNOWN FINDINGS / TECH DEBT

| Finding | Severity | Status | Detail |
|---------|----------|--------|--------|
| LLM word_count undershoot | HARD | MITIGATED by P.3 repair | Scenes target 900-1200 get 350-540, repair fixes to 600-820 |
| Scene count 9 > max_scenes 8 | FINDING | Not yet fixed at genesis level | D3 hardening deferred |
| Tense detection false positives | FIXED | Refined French markers | Generic `ait/it` → precise `était/avait` |
| word_count_tolerance = 0.50 | CALIBRATION | Documented | Not magic constant — derived from empirical LLM behavior |

---

## 📁 DOCUMENTS DE RÉFÉRENCE

| Document | Path |
|----------|------|
| Session P.3 sealed | `sessions/SESSION_SAVE_2026-02-11_P3_REPAIR_SEALED.md` |
| Session P.2-B sealed | `sessions/SESSION_SAVE_2026-02-11_P2B_SCRIBE_SEALED.md` |
| Session P.2-A sealed | `sessions/SESSION_SAVE_2026-02-11_P2A_SCRIBE_SEALED.md` |
| Session R-METRICS | `sessions/SESSION_SAVE_2026-02-11_PHASE_R_METRICS.md` |
| P.2-A docs | `docs/phase-p2-scribe/P2A_SCRIBE_DOCS.md` |
| P.2-B docs | `docs/phase-p2-scribe/P2B_SCRIBE_DOCS.md` |
| Roadmap v4.0 | `docs/roadmap/OMEGA_SUPREME_ROADMAP_v4.0.md` |
| Sprint SH2 report | `docs/sprint-sh2/SPRINT_REPORT.md` |
| Golden run 001 intent | `golden/h2/run_001/runs/69b752ce50eaedac/00-intent/intent.json` |
| Golden run 002 intent | `golden/h2/run_002/runs/d1cb3c7ee893bb58/00-intent/intent.json` |

---

## 🔧 COMMANDES DE VÉRIFICATION RAPIDE

```powershell
# Vérifier l'état git
cd C:\Users\elric\omega-project
git log --oneline -15
git tag -l "phase-*" --sort=-creatordate | head -10
git status

# Lancer prose metrics sur un ProsePack
cd C:\Users\elric\omega-project\packages\omega-metrics
npx tsx src/cli/prose-metrics.ts --prosepack ../../metrics/h2/scribe_p3_001/ProsePack.json

# Lancer scribe en mode cache (replay)
cd C:\Users\elric\omega-project\packages\scribe-engine
npx tsx src/cli/scribe-llm.ts --run ../../golden/h2/run_001 --out ../../metrics/h2/test_replay --mode cache --cache-dir ../../metrics/h2/scribe_v2_llm/.cache

# Lancer scribe en mode LLM (nécessite ANTHROPIC_API_KEY)
npx tsx src/cli/scribe-llm.ts --run <golden_dir> --out <output_dir> --mode llm --model claude-sonnet-4-20250514
```

---

## 🚨 RÈGLES CRITIQUES

1. **Jamais de commit sans preuve** — tout claim doit être vérifiable
2. **Cache replay = source de vérité** — SHA256 identical ou FAIL
3. **HARD constraints = fail-closed** — pas de bypass, pas d'exception
4. **Max 1 repair cycle** — pas de boucle infinie
5. **Mock = CI default** — aucun test ne doit dépendre d'une clé API
6. **ChatGPT audite** — tout commit majeur est soumis à review hostile
7. **Phases scellées = immuables** — on ne modifie jamais un package SEALED

---

## 💬 INSTRUCTIONS AU NOUVEAU CLAUDE

Tu reprends exactement là où la session précédente s'est arrêtée. Le système est auto-correctif, mesuré et reproductible. La prochaine étape est un **stress test end-to-end** avec une story inconnue ("La Ville sous la Cendre") pour prouver que le pipeline fonctionne sans tuning spécifique.

Commence par :
1. Vérifier `git status` et `git log --oneline -10`
2. Créer l'IntentPack pour "La Ville sous la Cendre"
3. Lancer le pipeline complet (genesis → scribe → ProsePack → repair → metrics)
4. Si satisfaction ≥ 0.95 → tag `validation-e2e-pass`

Standard : NASA-Grade L4. Pas d'approximation. Pas de poésie dans les commits. Preuves terrain.
