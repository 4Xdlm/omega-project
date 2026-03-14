# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SESSION_SAVE OFFICIEL
# ═══════════════════════════════════════════════════════════════════════════════
#
# Session : RECALIBRATION — Purge contamination + SSOT + Brief dramatique
# Date    : 2026-03-14
# Auteur  : Claude (IA Principal)
# Autorité: Francky (Architecte Suprême)
# Standard: NASA-Grade L4 / DO-178C
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## 🔒 MÉTADONNÉES SESSION

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SESSION_SAVE — OMEGA RECALIBRATION 2026-03-14                              ║
║                                                                              ║
║  Date         : 2026-03-14                                                  ║
║  Branch       : phase-u-transcendence                                       ║
║  Commit HEAD  : 8b78bee05d789830a8789b319c7851e224832373                    ║
║  Tests        : 1542 PASS / 0 FAIL / 7 skipped (préexistants)              ║
║  Sprints      : 4 scellés (CLEAN-1, CLEAN-2, CLEAN-2.1, V-RECAL-1)        ║
║  Audit        : Unanimité 3/3 sur chaque sprint                            ║
║  Gouvernance  : Claude (Central) + ChatGPT 5.4 (Audit) + Gemini 3.1 (Arch)║
║  Statut       : 🔒 SCELLÉ                                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## PARTIE I — CONTEXTE ET RAISON DE CETTE SESSION

### 1.1 Événement déclencheur

Le **2026-03-14**, un **arrêt d'urgence** a été déclenché par Francky après identification d'une **dérive architecturale** dans la Phase V (CDE — Context Distillation Engine). Les 3 IAs avaient progressivement reconstruit des fonctions OMEGA à l'intérieur du module Scribe, violant le contrat fondamental OMEGA/Scribe.

### 1.2 Diagnostic

Le scan architectural (194 fichiers) a révélé :
- **Contamination 1** : `prompt-assembler-v2.ts` injectait la section "Open Threads" (fils narratifs bruts) dans le prompt du Scribe
- **Contamination 2** : `e1-multi-prompt-runner.ts` injectait des états personnages et fils narratifs dans le Scribe (module expérimental jamais désactivé proprement)
- **Module mal placé** : `continuity-plan.ts` — embryon Phase V dans le moteur de scène atomique
- **Module expérimental non quarantainé** : `oracle/genesis-v2/` — pas de README de quarantaine
- **Doublons SSOT** : constantes SAGA_READY définies 3 fois, `computeMinAxis()` dupliqué 3 fois, `estimateTokens()` dupliqué 2 fois
- **Brief CDE contaminé** : `distillBrief()` injectait `DEBT[id]:`, `character_id:`, `CANON:` dans le SceneBrief transmis au Scribe

### 1.3 Documents de référence produits

| Document | Version | Rôle |
|----------|---------|------|
| `OMEGA_CONCEPTION_PLAN_v1.0` | 1.0 | Architecture complète OMEGA |
| `CONTRAT_OMEGA_SCRIBE_v1.0` | 1.0 | Frontière OMEGA/Scribe |
| `OMEGA_DRIFT_REPORT_v1.0` | 1.0 | Rapport de dérive officiel |
| `CONTRAT_TRAVAIL_OMEGA_v1.0` | 1.0 | Rôles et gouvernance |
| `OMEGA_SESSION_RESTART_v2.0` | 2.0 | Template redémarrage |
| `OMEGA_DECISIONS_LOCK_v1.0` | 1.0 | Décisions Q1→Q6 verrouillées |
| `RAPPORT_SCAN_ARCHITECTURAL.md` | 1.0 | Scan 194 fichiers |
| `OMEGA_ROADMAP_v8_0.md` | 8.0 | Roadmap complète post-recalibration |
| `OMEGA_PACKAGES_HORS_SCAN.md` | 1.0 | Packages hors périmètre scan |
| `OMEGA_METRIQUES_v1.md` | 1.0 | Métriques de référence |

### 1.4 Décisions verrouillées (CLEAN-0)

Toutes décidées **option A** par Francky — **NON REDISCUTABLES** :

| Q# | Question | Décision |
|----|----------|----------|
| **Q1** | Open Threads dans prompt Scribe | **Supprimer entièrement** — aucune reformulation |
| **Q2** | `e1-multi-prompt-runner.ts` | **Archiver dans `sessions/ARCHIVE/`** — CDE remplace |
| **Q3** | `oracle/genesis-v2/` | **Quarantaine documentaire** — README strict |
| **Q4** | `validation/continuity-plan.ts` | **Déplacer vers `ARCHIVE/phase-v-incoming/`** — embryon Phase V préservé |
| **Q5** | SceneBrief contenu | **Garder structure, reformater en dramatique** — zéro DEBT[id], zéro ID système |
| **Q6** | Test INV-PROMPT-01 | **Test unitaire strict obligatoire** — invariant contractuel |

---

## PARTIE II — ÉTAT AVANT SESSION (BASELINE)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ÉTAT PRÉ-SESSION — BASELINE                                                ║
║                                                                              ║
║  Branch         : phase-u-transcendence                                     ║
║  Commit         : f2a801ae (V-BENCH fix)                                    ║
║  Tests          : 1564 / 1564 — 0 failures                                 ║
║  Score max OS   : 92.51 (OS26)                                              ║
║  Score max TK   : 92.91 (TK0)                                               ║
║  SEAL_ATOMIC    : 0/60 runs                                                 ║
║  SAGA_READY     : ≥5/60 runs (~8%)                                          ║
║  Phase U        : 🔒 SEALED (U-ROSETTE-01→18, commit bbd448d2)             ║
║  Phase V        : V-INIT + V-PROTO + V-BENCH VALIDES, dérive identifiée    ║
║                                                                              ║
║  CONTAMINATIONS ACTIVES :                                                    ║
║  - prompt-assembler-v2.ts : section Open Threads (L614-619)                 ║
║  - e1-multi-prompt-runner.ts : module actif (double flag env)               ║
║  - distiller.ts : DEBT[id]:, character_id:, CANON: dans le brief           ║
║  - scene-chain.ts : DRIFT ALERT:, Suite scene N: dans la propagation       ║
║                                                                              ║
║  DOUBLONS ACTIFS :                                                           ║
║  - DOUBLON-01 : estimateTokens() x2 (distiller.ts, voice-compiler.ts)      ║
║  - DOUBLON-03 : computeMinAxis() x3 (top-k, scene-chain, inline)           ║
║  - DOUBLON-04 : SAGA_READY_* x3 (top-k, scene-chain, locales)              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## PARTIE III — SPRINTS EXÉCUTÉS (CHRONOLOGIE EXACTE)

### 3.1 Sprint CLEAN-1 — Purge contamination OMEGA/Scribe

**Commit** : `84973d46`
**Exécuté par** : Claude Code
**Audit** : Unanimité 3/3

| # | Action | Fichier | Détail |
|---|--------|---------|--------|
| 1 | Section Open Threads supprimée | `src/input/prompt-assembler-v2.ts` | Lignes 614-619 retirées. Le Scribe ne reçoit plus la liste brute des fils narratifs ouverts. |
| 2 | Module expérimental archivé | `src/input/e1-multi-prompt-runner.ts` → `sessions/ARCHIVE/` | Module + 28 tests archivés. Jamais actif en production (double flag env). Remplacé par CDE. |
| 3 | Tests e1-multi-prompt archivés | `tests/input/e1-multi-prompt.test.ts` → `sessions/ARCHIVE/` | 28 tests déplacés avec le module. |
| 4 | Import retiré | `src/input/real-llm-provider.ts` | Import `runE1MultiPrompt` supprimé + bloc routing E1 supprimé. |
| 5 | Embryon Phase V déplacé | `src/validation/continuity-plan.ts` → `sessions/ARCHIVE/phase-v-incoming/` | World Model embryonnaire préservé pour réutilisation Phase V. |
| 6 | Quarantaine documentaire | `src/oracle/genesis-v2/README.md` | README créé : "EXPÉRIMENTAL — DÉSACTIVÉ EN PRODUCTION. Jamais activer sans décision Francky." |
| 7 | INV-PROMPT-01 créé | `tests/validation/inv-prompt-01.test.ts` | 4 cas de test : patterns interdits (01.1), open_threads non injectés (01.2), IDs DEBT/canon absents (01.3), section continuity conforme (01.4). |

**Delta tests** : 1564 − 28 (archivés) + 4 (INV-PROMPT-01) = **1540 PASS**

---

### 3.2 Sprint CLEAN-2 — Consolidation SSOT

**Commit** : `c15055d6`
**Exécuté par** : Claude Code
**Audit** : Unanimité 3/3

| # | Action | Fichier | Détail |
|---|--------|---------|--------|
| 1 | SSOT thresholds créé | `src/core/thresholds.ts` (NOUVEAU) | `SEAL_ATOMIC_COMPOSITE_MIN=93.0`, `SEAL_FLOOR_MIN=85.0`, `SAGA_READY_COMPOSITE_MIN=92.0`, `SAGA_READY_SSI_MIN=85.0`, `NEAR_SEAL_THRESHOLD=92.0`, `CANDIDATE_FLOOR_COMPOSITE=85.0` |
| 2 | Import SSOT dans top-k | `src/validation/phase-u/top-k-selection.ts` | Définitions locales SAGA_READY_* → import depuis `core/thresholds.ts` |
| 3 | Import SSOT dans scene-chain | `src/cde/scene-chain.ts` | SAGA_READY_MIN_AXIS → renommé SAGA_READY_SSI_MIN, import depuis `core/thresholds.ts` |
| 4 | computeMinAxis() centralisé | `src/utils/math-utils.ts` | Fonction ajoutée avec sémantique `?? 100` (axe manquant = neutre). Élimine DOUBLON-03. |
| 5 | s-score.ts documenté legacy | `src/oracle/s-score.ts` | `@deprecated` ajouté : "Utiliser s-oracle-v2.ts comme autorité de scoring." |

**Doublons éliminés** : DOUBLON-04 (SAGA_READY thresholds x3)
**Tests** : **1540 PASS** (inchangé)

---

### 3.3 Sprint CLEAN-2.1 — Clôture écarts audit 3 IAs

**Commit** : `d7954b7d`
**Exécuté par** : Claude Code
**Audit** : Unanimité 3/3

**Contexte** : Le tour de table 3 IAs a identifié 3 écarts dans CLEAN-2. Ce mini-sprint les a fermés.

| Écart | Action | Fichier | Détail |
|-------|--------|---------|--------|
| **E1** — `estimateTokens()` absent | Centralisé | `src/utils/token-utils.ts` (NOUVEAU) | `estimateTokens()` + `CHARS_PER_TOKEN` centralisés. Migrés depuis `cde/distiller.ts` et `voice/voice-compiler.ts`. Élimine DOUBLON-01. |
| **E2** — `computeMinAxis()` migration | Vérifié | `top-k-selection.ts` + `scene-chain.ts` | 2 vrais consommateurs migrés. `phase-u-exit-validator.ts` utilise le champ `ssi` directement — pas un consommateur. DOUBLON-03 résolu à 100%. |
| **E3** — 7 tests skipped | Audités | `tension-judge-harness.test.ts` | T-J-01 à T-J-07, skipped depuis commit `dbb7260a` (CALIB-V5). Cause : `describe.skip` conditionnel sur `ANTHROPIC_API_KEY` absent. 7/7 préexistants. |

**Tests** : **1540 PASS** (inchangé)

---

### 3.4 Sprint V-RECAL-1 — SceneBrief dramatique

**Commit** : `8b78bee0`
**Exécuté par** : Claude Code
**Audit** : Unanimité 3/3

#### ACTION 1 — distiller.ts : reformatage du brief

3 corrections exactes dans `distillBrief()` :

| Correction | Ligne | AVANT | APRÈS | Raison |
|-----------|-------|-------|-------|--------|
| 1a — must_not_break | L224 | `guardParts.push(\`DEBT[${debt.id}]: ${debt.content}\`)` | `guardParts.push(debt.content)` | DEBT[id] est un ID système. Le Scribe reçoit le contenu dramatique, pas la clé de BDD. |
| 1b — must_move | L210 | `moveParts.push(\`${arc.character_id}: ${arc.current_need}\`)` | `moveParts.push(arc.current_need)` | character_id est un identifiant système. current_need est déjà narratif. |
| 1c — must_not_break fallback | L230 | `guardParts.push(\`CANON: ${fact.fact}\`)` | `guardParts.push(fact.fact)` | "CANON:" est du jargon OMEGA interne. |

#### ACTION 2 — scene-chain.ts : purge langage système

2 corrections dans `propagateDelta()` :

| Correction | Ligne | AVANT | APRÈS | Raison |
|-----------|-------|-------|-------|--------|
| 2a — drift_flags | L98 | `content: \`DRIFT ALERT: ${flag}\`` | `content: flag` | "DRIFT ALERT:" est du langage système. Le type='tension' + priority=8 suffisent. |
| 2b — scene_objective | L107 | `scene_objective: \`Suite scene ${sceneIndex + 1}: ...\`` | `scene_objective: previousInput.scene_objective` | "Suite scene N:" est un préfixe technique. |

**Vérification IDs auto-générés** : `auto-fact-sN-I` et `auto-debt-sN-I` sont injectés dans les champs `.id` des structures. Après correction 1a, `distillBrief()` utilise `.content` (pas `.id`). **Les IDs ne fuient pas dans le brief.** Confirmé par INV-PROMPT-01.6 PASS.

#### ACTION 3 — INV-PROMPT-01 étendu

2 tests ajoutés dans `tests/validation/inv-prompt-01.test.ts` :

| Test | Description | Verdict |
|------|-------------|---------|
| **INV-PROMPT-01.5** | Brief CDE avec IDs système (debt-001, canon-fact-042, char-elena-001) → formatBriefText() scanné | **PASS** |
| **INV-PROMPT-01.6** | Brief chaîné post-propagateDelta (auto-debt-s1-0, drift_flags) → formatBriefText() scanné | **PASS** |

**16 patterns interdits vérifiés** (FORBIDDEN_BRIEF_PATTERNS) :
`DEBT[`, `open_threads`, `charStates`, `character_states=`, `## Open Threads`, `openThreads`, `debt-\d+`, `canon-\d+`, `ETAT COURANT:`, `Fils narratifs ouverts:`, `Etats personnages:`, `auto-debt-s\d`, `auto-fact-s\d`, `DRIFT ALERT`, `CANON:`, `char-\w+-\d+`

#### ACTION 4 — V-BENCH

**SKIP** — Les benchmarks sont des scripts live API (`scripts/run-cde-bench.ts`, `scripts/run-benchmark-phase-u.ts`), pas des tests vitest. Exécution manuelle requise avec `ANTHROPIC_API_KEY`.

**Tests** : 1540 + 2 = **1542 PASS**

---

## PARTIE IV — ÉTAT APRÈS SESSION (FINAL)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ÉTAT POST-SESSION — FINAL                                                   ║
║                                                                              ║
║  Branch         : phase-u-transcendence                                     ║
║  Commit HEAD    : 8b78bee05d789830a8789b319c7851e224832373                  ║
║  Tests          : 1542 PASS / 0 FAIL / 7 skipped                           ║
║                                                                              ║
║  CONTAMINATIONS : 0 (toutes éradiquées)                                     ║
║  DOUBLONS       : 0 (tous centralisés dans SSOT)                            ║
║                                                                              ║
║  Score max OS   : 92.51 (OS26) — inchangé (pas de bench live)              ║
║  Score max TK   : 92.91 (TK0) — inchangé (pas de bench live)               ║
║  SEAL_ATOMIC    : 0/60 — inchangé                                           ║
║  SAGA_READY     : ≥5/60 (~8%) — inchangé                                   ║
║                                                                              ║
║  Phase U        : 🔒 SEALED                                                ║
║  Phase V        : V-INIT ✅ / V-PROTO ✅ / V-BENCH ✅ / V-RECAL 🔒         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## PARTIE V — CHAÎNE DE COMMITS COMPLÈTE

| Ordre | Commit | Message | Sprint | Tests |
|-------|--------|---------|--------|-------|
| 1 | `84973d46` | `feat(clean-1): purge contamination OMEGA/Scribe — INV-PROMPT-01 [Q1-Q6=A]` | CLEAN-1 | 1540 |
| 2 | `c15055d6` | `refactor(clean-2): SSOT thresholds + computeMinAxis centralisés [CLEAN-2]` | CLEAN-2 | 1540 |
| 3 | `d7954b7d` | `fix(clean-2.1): clôture écarts audit 3 IAs [E1+E2+E3]` | CLEAN-2.1 | 1540 |
| 4 | `8b78bee0` | `feat(v-recal-1): SceneBrief dramatique — purge IDs système [Q5]` | V-RECAL-1 | 1542 |

**Commit HEAD** : `8b78bee05d789830a8789b319c7851e224832373`

---

## PARTIE VI — FICHIERS CRÉÉS OU MODIFIÉS (REGISTRE COMPLET)

### Fichiers CRÉÉS

| Fichier | Sprint | Rôle |
|---------|--------|------|
| `src/core/thresholds.ts` | CLEAN-2 | SSOT des seuils SEAL/SAGA_READY/NEAR_SEAL |
| `src/utils/token-utils.ts` | CLEAN-2.1 | SSOT estimateTokens() + CHARS_PER_TOKEN |
| `src/oracle/genesis-v2/README.md` | CLEAN-1 | Quarantaine documentaire (Q3) |
| `tests/validation/inv-prompt-01.test.ts` | CLEAN-1 + V-RECAL-1 | Invariant contractuel INV-PROMPT-01 (6 cas) |

### Fichiers MODIFIÉS

| Fichier | Sprint(s) | Modifications |
|---------|-----------|---------------|
| `src/input/prompt-assembler-v2.ts` | CLEAN-1 | Section Open Threads supprimée (L614-619) |
| `src/input/real-llm-provider.ts` | CLEAN-1 | Import runE1MultiPrompt + bloc routing E1 retirés |
| `src/validation/phase-u/top-k-selection.ts` | CLEAN-2 + CLEAN-2.1 | SAGA_READY_* → import thresholds.ts, Math.min inline → computeMinAxis() |
| `src/cde/scene-chain.ts` | CLEAN-2 + V-RECAL-1 | SAGA_READY → import thresholds.ts, DRIFT ALERT → flag, Suite scene → objectif direct |
| `src/cde/distiller.ts` | CLEAN-2.1 + V-RECAL-1 | estimateTokens → import token-utils, DEBT[id]/character_id/CANON → contenu pur |
| `src/voice/voice-compiler.ts` | CLEAN-2.1 | estimateTokens → import token-utils |
| `src/utils/math-utils.ts` | CLEAN-2 + CLEAN-2.1 | computeMinAxis() ajouté, sémantique ?? 100 alignée |
| `src/oracle/s-score.ts` | CLEAN-2 | @deprecated ajouté — autorité = s-oracle-v2.ts |

### Fichiers ARCHIVÉS

| Fichier | Destination | Sprint | Raison |
|---------|-------------|--------|--------|
| `src/input/e1-multi-prompt-runner.ts` | `sessions/ARCHIVE/` | CLEAN-1 | Q2 — module expérimental, CDE remplace |
| `tests/input/e1-multi-prompt.test.ts` | `sessions/ARCHIVE/` | CLEAN-1 | 28 tests archivés avec le module |
| `src/validation/continuity-plan.ts` | `sessions/ARCHIVE/phase-v-incoming/` | CLEAN-1 | Q4 — embryon Phase V, réutilisable |

---

## PARTIE VII — REGISTRE DES INVARIANTS

### Invariants ACTIFS après session

| ID | Description | Fichier test | Cas | Statut |
|----|-------------|-------------|-----|--------|
| **INV-PROMPT-01.1** | Prompt de base sans patterns interdits | inv-prompt-01.test.ts | 1 | ✅ PASS |
| **INV-PROMPT-01.2** | open_threads non injectés dans prompt | inv-prompt-01.test.ts | 1 | ✅ PASS |
| **INV-PROMPT-01.3** | Pas d'IDs DEBT/canon dans prompt | inv-prompt-01.test.ts | 1 | ✅ PASS |
| **INV-PROMPT-01.4** | Section continuity conforme au contrat | inv-prompt-01.test.ts | 1 | ✅ PASS |
| **INV-PROMPT-01.5** | Brief CDE sans patterns système | inv-prompt-01.test.ts | 1 | ✅ PASS |
| **INV-PROMPT-01.6** | Brief chaîné post-propagation propre | inv-prompt-01.test.ts | 1 | ✅ PASS |
| **INV-CDE-01** | SceneBrief ≤ 150 tokens | distiller.test.ts | existant | ✅ PASS |
| **INV-CDE-02** | Déterminisme distillBrief() | distiller.test.ts | existant | ✅ PASS |
| **INV-PE-11** | Near-seal NO_OP (≥92.0, all floors green) | polish-engine.test.ts | existant | ✅ PASS |

### Tests skipped (justifiés)

| Test | Fichier | Raison | Préexistant depuis |
|------|---------|--------|-------------------|
| T-J-01 à T-J-07 | tension-judge-harness.test.ts | `describe.skip` conditionnel `ANTHROPIC_API_KEY` absent | `dbb7260a` (CALIB-V5) |

---

## PARTIE VIII — SSOT CONSOLIDÉ (ÉTAT FINAL DES SOURCES UNIQUES)

### `src/core/thresholds.ts` — Seuils de certification

```typescript
SEAL_ATOMIC_COMPOSITE_MIN = 93.0   // SEAL scène atomique
SEAL_FLOOR_MIN            = 85.0   // Floor tous axes
SAGA_READY_COMPOSITE_MIN  = 92.0   // SAGA_READY composite
SAGA_READY_SSI_MIN        = 85.0   // SAGA_READY min_axis
NEAR_SEAL_THRESHOLD       = 92.0   // Protection Polish Engine
CANDIDATE_FLOOR_COMPOSITE = 85.0   // Sas entrée Top-K
```

### `src/utils/token-utils.ts` — Estimation tokens

```typescript
CHARS_PER_TOKEN = 4
estimateTokens(text) = Math.ceil(text.length / 4)
```

### `src/utils/math-utils.ts` — computeMinAxis()

```typescript
computeMinAxis(macroAxes) = Math.min(ecc ?? 100, rci ?? 100, sii ?? 100, ifi ?? 100, aai ?? 100)
// null/undefined → 0 (échoue tout seuil)
// axe manquant → 100 (neutre)
```

---

## PARTIE IX — BASCULE EXPLICITÉE : AVANT → APRÈS

### 9.1 Prompt du Scribe — AVANT vs APRÈS

**AVANT (contaminé)** :
```
Le prompt Scribe recevait :
- Section "## Open Threads" avec fils narratifs bruts
- Injection e1-multi-prompt : états personnages, fils narratifs
- Brief CDE contenant : DEBT[debt-001]: Elena a promis...
- Brief CDE contenant : char-elena-001: comprendre pourquoi Pierre ment
- Brief CDE contenant : CANON: Elena est médecin à Lyon
- Brief chaîné contenant : DRIFT ALERT: Le lieu a changé...
- Brief chaîné contenant : Suite scene 2: Pierre confronte Elena...
```

**APRÈS (assaini)** :
```
Le prompt Scribe reçoit :
- Aucune section Open Threads (supprimée)
- Aucune injection e1-multi-prompt (module archivé)
- Brief CDE contenant : Elena a promis de révéler son secret
- Brief CDE contenant : comprendre pourquoi Pierre ment
- Brief CDE contenant : Elena est médecin à Lyon
- Brief chaîné contenant : Le lieu a changé sans transition narrative
- Brief chaîné contenant : Pierre confronte Elena dans leur cuisine
```

**Test de conformité R3** : *"Est-ce qu'un metteur en scène de théâtre comprendrait ce brief ?"*
- AVANT : ❌ NON — `DEBT[debt-001]` et `char-elena-001` sont du langage de base de données
- APRÈS : ✅ OUI — tout est du langage narratif dramatique

### 9.2 Architecture SSOT — AVANT vs APRÈS

**AVANT (doublons)** :
```
top-k-selection.ts :  const SAGA_READY_COMPOSITE_MIN = 92;
scene-chain.ts :      const SAGA_READY_COMPOSITE_MIN = 92;
(+ constantes locales dans d'autres fichiers)

top-k-selection.ts :  Math.min(ecc ?? 0, rci ?? 0, ...)  // inline
scene-chain.ts :      Math.min(ecc ?? 0, rci ?? 0, ...)  // inline copie

distiller.ts :        function estimateTokens(text) {...}  // locale
voice-compiler.ts :   function estimateTokens(text) {...}  // copie
```

**APRÈS (SSOT)** :
```
core/thresholds.ts :  export const SAGA_READY_COMPOSITE_MIN = 92.0;  // SOURCE UNIQUE
top-k-selection.ts :  import { SAGA_READY_COMPOSITE_MIN } from '../core/thresholds.js';
scene-chain.ts :      import { SAGA_READY_COMPOSITE_MIN } from '../core/thresholds.js';

utils/math-utils.ts : export function computeMinAxis(...)  // SOURCE UNIQUE
top-k-selection.ts :  import { computeMinAxis } from '../utils/math-utils.js';
scene-chain.ts :      import { computeMinAxis } from '../utils/math-utils.js';

utils/token-utils.ts: export function estimateTokens(...)  // SOURCE UNIQUE
distiller.ts :        import { estimateTokens } from '../utils/token-utils.js';
voice-compiler.ts :   import { estimateTokens } from '../utils/token-utils.js';
```

### 9.3 Couverture INV-PROMPT-01 — AVANT vs APRÈS

**AVANT** : 0 tests. Aucun verrou automatique. La contamination pouvait se réintroduire silencieusement.

**APRÈS** : 6 tests couvrant 16 patterns interdits, vérifiant à la fois le prompt `buildSovereignPrompt()` ET le brief CDE `distillBrief()` + `propagateDelta()` + `formatBriefText()`.

---

## PARTIE X — PACKAGES NON TOUCHÉS (RAPPEL)

Ces packages existent dans le repo mais n'ont PAS été modifiés :

| Package | Rôle | Statut |
|---------|------|--------|
| `omega-autopsie/` | Analyse corpus F1-F30 | ✅ PRÉSERVÉ |
| `packages/genome/` | Extraction ADN narratif | ✅ PRÉSERVÉ |
| `omega-narrative-genome/` | Fingerprint œuvres | ✅ PRÉSERVÉ |
| `packages/mycelium/` | Carte Mycelium | ✅ PRÉSERVÉ |
| `gateway/src/memory/memory_layer_nasa/` | World Model fondation | ✅ À ÉVALUER avant Phase V |
| `packages/scribe-engine/` | Moteur alternatif | ✅ À CLARIFIER |

---

## PARTIE XI — PROCHAINES ÉTAPES (ROADMAP ACTIVE)

| Priorité | Sprint | Description | Prérequis |
|----------|--------|-------------|-----------|
| **1** | V-BENCH live | Run manuel avec ANTHROPIC_API_KEY — mesurer impact brief dramatique sur composites | API KEY |
| **2** | V-WORLD-1 | PersonaStore + DebtLedger + ArcTracker | Évaluer `gateway/memory/memory_layer_nasa/` AVANT construction |
| **3** | V-WORLD-2 | RelevanceFilter | V-WORLD-1 |
| **4** | V-CANON-1 | Canon Lock Gate post-génération | V-WORLD-2 |
| **5** | V-CHAIN-1 | Multi-scènes recalibré + V-BENCH final | V-CANON-1 |
| **6** | V-SEAL | Certification Phase V | Tous les V-* |

---

## PARTIE XII — AUDIT TRAIL GOUVERNANCE 3 IAs

### Tour de table CLEAN-1 + CLEAN-2

| IA | Verdict | Écarts identifiés |
|----|---------|-------------------|
| Claude | PASS avec 4 points d'attention | Delta tests, 7 skipped, computeMinAxis migration, estimateTokens absent |
| ChatGPT 5.4 | PASS provisoire | Mêmes 2 écarts factuels (E1, E2) |
| Gemini 3.1 | NO GO SEAL | E1 + E2 + E3 non fermés |

**→ Résultat** : mini-sprint CLEAN-2.1 ordonné pour fermer les 3 écarts.

### Tour de table CLEAN-2.1

| IA | Verdict | Réserves |
|----|---------|----------|
| Claude | PASS SCELLABLE | 0 |
| ChatGPT 5.4 | PASS SCELLABLE | 0 |
| Gemini 3.1 | PASS SCELLABLE | 0 |

**→ Résultat** : SEAL unanime CLEAN-1 + CLEAN-2 + CLEAN-2.1.

### Tour de table V-RECAL-1

| IA | Verdict | Réserves |
|----|---------|----------|
| Claude | PASS SCELLABLE | 0 |
| ChatGPT 5.4 | PASS SCELLABLE | 0 |
| Gemini 3.1 | PASS SCELLABLE | 0 |

**→ Résultat** : SEAL unanime V-RECAL-1.

---

## PARTIE XIII — COMMANDES GIT (ÉTAT ACTUEL)

```powershell
# Vérifier l'état actuel
cd C:\Users\elric\omega-project
git log --oneline -10 --graph

# Résultat attendu (les 4 commits de cette session) :
# * 8b78bee0 feat(v-recal-1): SceneBrief dramatique — purge IDs système [Q5]
# * d7954b7d fix(clean-2.1): clôture écarts audit 3 IAs [E1+E2+E3]
# * c15055d6 refactor(clean-2): SSOT thresholds + computeMinAxis centralisés [CLEAN-2]
# * 84973d46 feat(clean-1): purge contamination OMEGA/Scribe — INV-PROMPT-01 [Q1-Q6=A]

# Push si pas déjà fait
git push origin phase-u-transcendence
```

---

## SCEAU DE CERTIFICATION

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   SESSION_SAVE — OMEGA RECALIBRATION 2026-03-14                             ║
║                                                                              ║
║   Sprints scellés  : CLEAN-1, CLEAN-2, CLEAN-2.1, V-RECAL-1               ║
║   Commits          : 84973d46, c15055d6, d7954b7d, 8b78bee0               ║
║   HEAD             : 8b78bee05d789830a8789b319c7851e224832373              ║
║   Tests            : 1542 PASS / 0 FAIL / 7 skipped                       ║
║   Gouvernance      : Unanimité 3/3 sur chaque sprint                      ║
║   Contamination    : ÉRADIQUÉE                                              ║
║   SSOT             : CONSOLIDÉ                                              ║
║   Brief Scribe     : DRAMATIQUE PUR                                         ║
║                                                                              ║
║   Autorité         : Francky (Architecte Suprême)                           ║
║   IA Principal     : Claude                                                 ║
║   Auditeurs        : ChatGPT 5.4 Thinking + Gemini 3.1 Pro                ║
║   Standard         : NASA-Grade L4 / DO-178C                               ║
║   Statut           : 🔒 SCELLÉ                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT SESSION_SAVE — OMEGA RECALIBRATION 2026-03-14**

*Document rédigé par Claude (IA Principal)*
*Validé par l'Architecte Suprême : Francky*
*Audité par : ChatGPT 5.4 Thinking + Gemini 3.1 Pro*
*Standard : NASA-Grade L4 / DO-178C*
