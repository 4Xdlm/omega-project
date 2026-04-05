# P0 + P1 — CHECKLIST D'EXÉCUTION
**Date** : 2026-04-02 | **Effort total** : ~14h
**Standard** : NASA-Grade L4 | **PASS/FAIL** : npm test GREEN

---

## P0 — ASSAINISSEMENT IMMÉDIAT (40 min)

### ⬜ P0-01 : Unifier SAGA_READY import (5 min)

**Localisation** :
- `packages/sovereign-engine/src/engine.ts:198` (const SAGA_COMPOSITE = 92.0)
- `packages/sovereign-engine/src/engine.ts:549` (>= 92)
- **SSOT** : `packages/sovereign-engine/src/core/thresholds.ts:34` (SAGA_READY_COMPOSITE_MIN)

**Action** :
1. Remplacer hardcoded 92.0 en ligne 198 par import depuis core/thresholds.ts
2. Remplacer hardcoded 92 en ligne 549 par import
3. Test : `npm test -- engine.test.ts` doit PASS

**Verification** :
```bash
grep -n "SAGA_COMPOSITE\|>= 92" packages/sovereign-engine/src/engine.ts
# Doit show 0 (après correction) ou refs vers constant
```

---

### ⬜ P0-02 : Unifier SEAL_FLOOR import (2 min)

**Localisation** :
- `packages/sovereign-engine/src/duel/duel-engine.ts:137` (85 hardcodé floorPenalty)
- **SSOT** : `packages/sovereign-engine/src/core/thresholds.ts` (SEAL_FLOOR si existe)

**Question** : SEAL_FLOOR est-il défini dans core/thresholds.ts?
**Vérification** :
```bash
grep -n "SEAL_FLOOR\|85" packages/sovereign-engine/src/core/thresholds.ts
grep -n "85\|floorPenalty" packages/sovereign-engine/src/duel/duel-engine.ts
```

**Action si SEAL_FLOOR existe** :
1. Import dans duel-engine.ts
2. Remplacer 85 hardcodé

**Action si SEAL_FLOOR n'existe pas** :
1. Créer constante `SEAL_FLOOR_DUEL = 85` dans core/thresholds.ts
2. Import + remplacer

---

### ⬜ P0-03 : Supprimer compat/ (2 min)

**Localisation** :
- `packages/sovereign-engine/src/compat/` (répertoire entier)

**Vérification imports** :
```bash
grep -r "@omega/.*compat" packages/ --include="*.ts" --include="*.json" | grep -v node_modules
grep -r "from.*compat\|import.*compat" packages/sovereign-engine/src --include="*.ts"
# Doit montrer 0 résultats
```

**Action si 0 imports** :
1. Archiver : `mkdir -p archives/compat-backup && mv packages/sovereign-engine/src/compat archives/compat-backup/`
2. ou supprimer : `rm -rf packages/sovereign-engine/src/compat/`
3. Vérifier npm test GREEN

**Risque** : Faible (0 deps confirmés par IRM).

---

### ⬜ P0-04 : Supprimer imports polish commentés (2 min)

**Localisation** :
- `packages/sovereign-engine/src/engine.ts:43-45` (polishRhythm, sweepCliches, enforceSignature)
- `packages/sovereign-engine/src/engine.ts:409-414` (commenté "Sprint 2: Polish DISABLED")

**Vérification** :
```bash
grep -n "import.*polish\|polishRhythm\|sweepCliches\|enforceSignature" packages/sovereign-engine/src/engine.ts
```

**Action** :
1. Supprimer les 3 imports des lignes 43-45
2. Vérifier aucun usage actif (déjà commenté en 409-414)
3. npm test GREEN

---

### ⬜ P0-05 : Ajouter validation avg_sent_target >= 35 (5 min)

**Localisation** :
- `packages/sovereign-engine/src/input/pre-write-validator.ts:207`
- `packages/sovereign-engine/src/types.ts:156` (avg_sentence_length_target: number)

**Contexte** : BB-02 prouve plancher = 35w. Toute valeur < 35 ignorée par Claude.

**Action** :
1. Ouvrir pre-write-validator.ts
2. Localiser fonction validation avg_sentence_length_target
3. Changer condition de `> 0` à `>= 35`
4. Test : validation doit rejeter valeurs < 35

**Test case** :
```typescript
// avant
avg_sentence_length_target: 18  // PASS (incorrect)

// après
avg_sentence_length_target: 18  // FAIL (validateur)
avg_sentence_length_target: 35  // PASS
```

---

### ⬜ P0-06 : Documenter CLIFF_THRESHOLD = 0.30 (5 min)

**Localisation** :
- `packages/sovereign-engine/src/engine.ts:455` (CLIFF_THRESHOLD = 0.30)

**Action** :
1. Créer fichier : `docs/ADR/ADR-20260402-CLIFF_THRESHOLD.md`
2. Contenu :
   - Historique (d'où vient 0.30?)
   - Utilisation (où utilisé en production?)
   - Décision d'implémenter / pas modifier
3. Ajouter lien dans docs/LAWS_REGISTRY.md

**Template ADR** :
```markdown
# ADR-20260402 : CLIFF_THRESHOLD = 0.30

## Decision
Le seuil CLIFF_THRESHOLD est fixé à 0.30 (30%).

## Context
[À remplir]

## Consequences
- Valeurs composite < 0.30 → score cliffspin 0
- Non modifiable sans impact validation

## Date
2026-04-02
```

---

### ⬜ P0-07 : Documenter floorPenalty = 1.5 (5 min)

**Localisation** :
- `packages/sovereign-engine/src/duel/duel-engine.ts:137` (floorPenalty = 1.5)

**Action** :
1. Créer fichier : `docs/ADR/ADR-20260402-FLOOR_PENALTY.md`
2. Contexte : Duel floor penalty lors selection best duel
3. Impact : Multiplicateur 1.5x sur floor threshold

---

### ⬜ P0-08 : Créer L35b (résoudre collision) (5 min)

**Contexte** : Une collision de loi identifiée. L35 existe?

**Action** :
1. Vérifier existence `docs/LAWS_SEALED/L35*`
2. SI L35 existe : créer L35b (numérotation) ou corriger collision
3. SI L35 n'existe pas : créer L35
4. Ajouter dans LAW_REGISTRY

**Format** :
```
L35(b) : [Description loi]
Signé : Francky
Date : 2026-04-02
Status : SEALED
```

---

### ⬜ P0-09 : Aligner weight-calibrator.ts sur macro-axes.ts (F1) (5 min)

**Localisation** :
- `packages/sovereign-engine/src/calibration/weight-calibrator.ts:68-74` (poids divergents)
- **SSOT** : `packages/sovereign-engine/src/core/config.ts:416-422` ou `macro-axes.ts:9-13`

**Découverte IRM** :
| Axe | config.ts | weight-calibrator.ts |
|-----|-----------|---------------------|
| ECC | 0.33 | 0.30 |
| SII | 0.15 | 0.18 |
| IFI | 0.10 | 0.15 |
| AAI | 0.25 | 0.20 |

**Action** :
1. Localiser `DEFAULT_MACRO_WEIGHTS` dans weight-calibrator.ts
2. Remplacer par valeurs config.ts actuelles (0.33, 0.17, 0.15, 0.10, 0.25)
3. Ou mieux : import depuis config.ts/macro-axes.ts
4. npm test GREEN (calibrator doit se réinitialiser)

**Risque** : MOYEN — recalibration depuis ancien baseline produit weights obsolètes. Correction CRITIQUE.

---

### ⬜ P0-10 : Archiver hybrid-provider.ts + nettoyer env var (5 min)

**Localisation** :
- `packages/sovereign-engine/src/runtime/hybrid-provider.ts` (ou duel/)
- Env vars : `OMEGA_HYBRID_MODE`, `LLM_PROVIDER_HYBRID` (si utilisées)

**Vérification** :
```bash
grep -r "hybrid-provider\|HYBRID_MODE" packages/sovereign-engine/src --include="*.ts"
grep "HYBRID" packages/sovereign-engine/.env*
```

**Action si 0 usage** :
1. Archiver : `mkdir -p archives/runtime && mv packages/sovereign-engine/src/runtime/hybrid-provider.ts archives/runtime/`
2. Nettoyer env vars
3. npm test GREEN

---

## P1 — NETTOYAGE STRUCTURAL (12h)

### Code cleanup (1.5h)

#### ⬜ P1-01 : Migrer computeMacroSScore (30 min)

**Localisation** :
- `packages/sovereign-engine/src/oracle/s-score.ts` (deprecated, mais computeMacroSScore y vit)
- Importé par : `aesthetic-oracle.ts:35`, autres

**Action** :
1. Localiser `computeMacroSScore` dans s-score.ts
2. Copier fonction vers `oracle/s-oracle-v2.ts` (SSOT)
3. Mettre à jour imports dans aesthetic-oracle.ts, etc.
4. Tester : `npm test -- oracle.test.ts`

---

#### ⬜ P1-02 : Supprimer s-score.ts après migration (15 min)

**Dépendance** : P1-01 COMPLET

**Action** :
1. Vérifier zéro imports depuis s-score.ts : `grep -r "from.*s-score" packages/`
2. Archiver : `mkdir -p archives/oracle && mv packages/sovereign-engine/src/oracle/s-score.ts archives/oracle/`
3. npm test GREEN

---

#### ⬜ P1-03 : Archiver polish NO-OP (15 min)

**Localisation** :
- `packages/sovereign-engine/src/polish/` (3+ fichiers : polishRhythm.ts, sweepCliches.ts, enforceSignature.ts, etc.)

**Vérification** :
```bash
grep -r "polish" packages/sovereign-engine/src --include="*.ts" | grep -v "test\|comment"
# Doit show 0 usage actif (déjà commenté en engine.ts)
```

**Action** :
1. Archiver répertoire : `mkdir -p archives/polish && mv packages/sovereign-engine/src/polish archives/`
2. npm test GREEN

---

#### ⬜ P1-04 : Archiver prompt-assembler-v2.ts (15 min)

**Localisation** :
- `packages/sovereign-engine/src/input/prompt-assembler-v2.ts` (LEGACY, V4 + V5 actifs)

**Vérification imports** :
```bash
grep -r "prompt-assembler-v2\|assembler-v2" packages/ --include="*.ts"
# Doit show 0 ou seulement comment
```

**Action si 0 usage** :
1. Archiver : `mkdir -p archives/compiler && mv packages/sovereign-engine/src/input/prompt-assembler-v2.ts archives/compiler/`
2. npm test GREEN

---

#### ⬜ P1-05 : Archiver ollama-provider.ts (10 min)

**Localisation** :
- `packages/sovereign-engine/src/runtime/providers/ollama-provider.ts` (abandonné)

**Action** :
1. Vérifier 0 imports
2. Archiver
3. npm test GREEN

---

### Investigations (10.5h, can parallelize)

#### ⬜ P1-06 : INV-01 — Audit f26b sur 50 arbres (2h)

**Status** : PARTIELLEMENT RÉSOLU (Tree 0 verified)
**Reste** : 49 arbres à scanner

**Objectif** : Vérifier direction f26b (HIGH = positif vs négatif) sur corpus complet.

**Script à créer** :
```bash
# scripts/inv01_f26b_audit.py
# Charger GB_V1_MODEL.json
# Itérer sur 50 arbres
# Extract f26b coefficient pour chaque
# Vérifier direction (>0 ou <0)
# Produire rapport : inv01_f26b_results.json
```

**Livrables** :
- `scripts/inv01_f26b_audit.py` (script)
- `nexus/proof/INV01_F26B_AUDIT_COMPLETE.json` (50 arbres analyzed)
- `nexus/proof/INV01_F26B_AUDIT.md` (rapport)

**Verdict requis** : Tous 50 arbres consistent direction? OUI → PASS, NON → analyse divergences.

---

#### ⬜ P1-07 : INV-02 — Cross-validation 3 scorers (2h)

**Status** : ABSENT (données insuffisantes)

**Setup** :
1. Sélectionner 20 textes diversifiés (5 types × 2 langues × 2 tailles) depuis corpus
2. Scorer chaque avec : GB V1, Ridge V2, V3 macro-axes, multi-stage-scorer
3. Mesurer :
   - Concordance verdicts (PASS/FAIL)
   - Correlation composites
   - Divergences par axe

**Script** :
```bash
# packages/sovereign-engine/scripts/inv02_scorer_bench.ts
# 20 textes × 4 scorers = 80 runs
# Produire : scorer_concordance_bench.json
```

**Verdict requis** : Concordance >= 80% → PASS.

---

#### ⬜ P1-08 : INV-03 — Budget token réel (1h)

**Status** : NON MESURÉ

**Protocole** :
1. Logger 5 runs (production pipelines)
2. Capture : tokens IN, tokens OUT, appels LLM, coût $ (30-35 appels par run)
3. Produire : COST_MODEL_BY_PIPELINE.json

**Données à collecter** :
```json
{
  "run_id": "xxx",
  "tokens_in": N,
  "tokens_out": N,
  "total_tokens": N,
  "llm_calls": 30-35,
  "cost_usd": N,
  "latency_sec": N
}
```

**Livrable** : `nexus/proof/COST_MODEL_BY_PIPELINE.json` + `INV03_BUDGET_AUDIT.md`

---

#### ⬜ P1-09 : INV-04 — Deep scan gateway/ (DONE)

**Status** : COMPLÉTÉ par P1-05 (gateway isolation verified)

**Artefact** : `docs/irm/inv/P1_GATEWAY_FULL_SCAN.md` (exists)

---

#### ⬜ P1-10 : INV-05 — Couverture test par module (30 min)

**Status** : NON MESURÉE

**Tâche** :
1. Analyser 219 fichiers .test.ts
2. Mapper à modules (sovereign-engine/src/*, integration-nexus/*, etc.)
3. Compter tests par module
4. Produire : TEST_COVERAGE_BY_MODULE.json

```json
{
  "module": "oracle",
  "test_files": 12,
  "test_count": 156,
  "coverage_pct": 78
}
```

**Livrable** : `nexus/proof/INV05_TEST_COVERAGE_BY_MODULE.json`

---

#### ⬜ P1-11 : INV-06 — Graphe dépendances inter-packages (1h)

**Status** : ABSENT

**Tâche** :
1. Parse 45 package.json dans packages/
2. Extraire dépendances @omega/* internes
3. Construire graphe : package A → package B
4. Identifier cycles, fan-in > 5, fan-out > 10

```json
{
  "package": "sovereign-engine",
  "fan_in": 12,
  "fan_out": 8,
  "dependencies": ["@omega/core", "@omega/plugins"]
}
```

**Livrable** : `nexus/proof/INV06_PACKAGE_DEPENDENCY_GRAPH.json`

---

#### ⬜ P1-12 : INV-07 — Slopes Phase W (DONE)

**Status** : COMPLÉTÉ par audit IRM

**Artefact** : `docs/irm/inv/INV07_SLOPES_VERIFICATION.md` (exists, PASS)

---

#### ⬜ P1-13 : INV-08 — Audit obsolescence 74 JSON (1h)

**Status** : ABSENT

**Tâche** :
1. Localiser 74 fichiers .json dans sovereign-engine/scoring/data/
2. Pour chaque : est-il importé? Est-il "live" ou artefact historique?
3. Produire : JSON_SCORING_DATA_AUDIT.json

```json
{
  "file": "GB_V1_MODEL.json",
  "imported_by": ["oracle/s-oracle-v2.ts"],
  "status": "ACTIVE",
  "size_kb": 262,
  "last_modified": "2026-03-15"
}
```

**Livrable** : `nexus/proof/INV08_JSON_SCORING_DATA_AUDIT.json` + recommandations archivage

---

#### ⬜ P1-14 : INV-09 — PVI interface TypeScript (DONE)

**Status** : CONÇUE (voir INV09_PVI_BRIDGE_INTERFACE.md)

**Artefact** : Interface + mapping features proposée. Code TypeScript reste optionnel pour P2.

---

#### ⬜ P1-15 : INV-10 — Score régression par module (1h)

**Status** : ABSENT

**Tâche** :
1. Pour chaque module : calculer risque = f(fan-in, fan-out, criticité, staleness)
2. Produire : REGRESSION_RISK_MATRIX.json

```json
{
  "module": "oracle",
  "fan_in": 12,
  "fan_out": 8,
  "criticality": "HIGH",
  "staleness_days": 15,
  "regression_risk_score": 7.2
}
```

**Livrable** : `nexus/proof/INV10_REGRESSION_RISK_MATRIX.json`

---

### Final outputs (1h)

#### ⬜ P1-16 : Générer COST_MODEL_BY_PIPELINE.json (1h)

**Dépendance** : P1-08 (INV-03 budget data)

**Synthèse** : Fusionner 5 runs en modèle coût.

```json
{
  "version": "1.0",
  "date": "2026-04-02",
  "avg_cost_usd_per_run": N.NN,
  "avg_tokens_total": N,
  "avg_llm_calls": 30,
  "latency_sec_avg": N,
  "components": {
    "k2_chunked": { "calls": 4, "cost": X },
    "duel": { "calls": 10, "cost": Y }
  }
}
```

**Livrable** : `outputs/COST_MODEL_BY_PIPELINE.json`

---

#### ⬜ P1-17 : Générer REGRESSION_RISK_MATRIX.json (1h)

**Dépendance** : P1-15 (INV-10)

**Format** : Même que INV-10, mais agrégé + recommandations.

```json
{
  "version": "1.0",
  "date": "2026-04-02",
  "modules": [ { "module": "oracle", "risk": 7.2 } ],
  "high_risk_threshold": 7.0,
  "recommendation": "Monitor oracle closely during P2"
}
```

**Livrable** : `outputs/REGRESSION_RISK_MATRIX.json`

---

## VALIDATION FINALE P0+P1

### Checklist npm test

```bash
# À la fin de chaque P0/P1 section
npm test

# Accepter PASS seulement :
# ✓ All tests passed
# 0 failures
# 2038+ tests
```

### Git commits

**Recommandation** : Committer après chaque P0-XX complété.

```bash
git add packages/sovereign-engine/src/...
git commit -m "feat(p0): P0-01 unify SAGA_READY threshold - unified import core/thresholds"
```

---

## ESTIMATION FINALE

| Phase | Séries | Effort | Parallèle |
|-------|--------|--------|-----------|
| **P0** | 10 items | 40 min | Non (séquentiel) |
| **P1 code** | 5 items | 1.5h | Oui (après P0) |
| **P1 investigations** | 10 items | 10.5h | **OUI (parallèle)** |
| **P1 outputs** | 2 items | 1h | Dépend investigationsi |
| **TOTAL P0+P1** | 27 items | **~13h** | **P0 séquentiel, P1 code + inv parallèle** |

**Chemin critique** : P0 (0.67h) → P1 code (1.5h) → P1 outputs (1h) = 3.17h min serial.
**Avec parallélisation P1 investigations** : P0 + (P1 code || P1 inv) + P1 outputs = ~2h wall-clock (6h si 3 devs).

**Recommandation P0 DEADLINE** : Fin J1 pour démarrer P1 J2.
**Recommandation P1 DEADLINE** : Fin S1 (7 jours) pour démarrer P2-01.

---

## POINTS DE VALIDATION CLÉS

| Checkpoint | Condition | Action si FAIL |
|-----------|-----------|---------|
| **P0 GREEN** | npm test PASS | Diagnostic: quelle ligne failée? Revert + debug |
| **P0-09 (weight-calibrator)** | Poids alignés config.ts | STOP: F1 est breaking change, demander Francky |
| **P1-01 DONE** | computeMacroSScore migré | Vérifier 0 usage ancien s-score.ts |
| **P1 INV DONE** | Tous rapports json générés | Vérifier entrées P2-01 |
| **npm test GREEN** | Tests passent toujours | Revert + fix |

---

**Checklist P0+P1 complète**
**Date** : 2026-04-02
**Effort estimé** : 13h serial, 2-3h wall-clock si parallèle
**Deadline** : P0 J1, P1 S1 (par 2026-04-09)
