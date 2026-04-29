# NCR_R6_BENCH_SOURCE_MISSING_S7P1

**ID** : NCR_R6_BENCH_SOURCE_MISSING_S7P1
**Title** : Bench source `bench-r6-hybrid.ts` validant R6 Rejection Gate Mode B (ADR DEC-20260411-003) absent du repo — décision architecturalement scellée mais empiriquement non reproductible
**Status** : **OPEN** (S7.3-bis promotion 2026-04-29 post-S7.2 PASS)
**Severity** : MEDIUM (architecture validée par tests + ADR consensus 4/4 IA, mais bench source manquant pour reproductibilité empirique)
**Priority** : **P2** (Architecte arbitrage 2026-04-28 — Option C : documenter UNKNOWN, accepter via tests + ADR)
**Opened** : 2026-04-28 (sprint S7.1, mapping bench ↔ pipeline)
**Owner** : Francky (décision finale) + Claude (instruction S7P1, drafter S7P2)
**Décision Architecte (2026-04-28)** : **OPTION C** — documenter UNKNOWN, ne pas reconstruire le bench, accepter R6 Mode B comme architecturalement validé via tests d'intégration + ADR consensus

---

## 1. Issue

Lors du sprint S7.1 (mapping bench ↔ pipeline réel post-S6), 5 des 6 décisions
Tribunal ont pu être classées avec preuve fichier+import (TRAVERSE / CONTOURNE
engine.ts). La 6ème décision — **R6 Rejection Gate Mode B**, scellée par
unanimité 4/4 IA dans l'ADR `docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md`
le 2026-04-11 — n'a pas pu être classée empiriquement.

### 1.1 Faits empiriques (S7.1)

L'ADR §header référence explicitement le bench source :
```
Bench       : bench-r6-hybrid.ts — 10 scènes × 3 modes, Ollama Qwen 3.5:35b-a3b
```

Recherches exhaustives effectuées dans le repo (commit `2c66c15e`, branche
`phase-r-dispatcher-v33`, tag de référence S6 `phase-s-s6-engine-runtime-restored-2026-04-27`) :

| Recherche | Résultat |
|-----------|----------|
| `find . -name "bench-r6-hybrid*"` | 0 fichier |
| `git log --all --diff-filter=D --name-only` filtré sur `r6.hybrid|bench.r6` | aucune suppression historique |
| `git log --all --pretty="%h %ad %s"` filtré sur 2026-04-11 | aucun commit ce jour-là |
| `grep -rln "bench-r6-hybrid\|R6_HYBRID"` packages/sovereign-engine | 0 référence (hors logs) |

Le bench source **n'a jamais été committé dans le repo**. L'ADR documente
les résultats du bench mais le script lui-même n'a pas survécu (working tree
local jamais persisté, ou rebase-away pré-merge).

### 1.2 Résultats du bench (documentés dans ADR §RÉSULTATS, NON reproductibles aujourd'hui)

| Mode | Nom | Score moyen | Passage gate | Δ vs baseline |
|------|-----|-------------|-------------|---------------|
| A | Roue Libre | 4.255 | 50% | — (baseline) |
| B | Gate Dur (rejection sampling) | 4.600 | 100% | +0.103 |
| C | Laisse Élastique (feedback sémantique) | 3.547 | 10% | -0.264 |

→ Mode B = GAGNANT (ADR §POINT 1, 2, 3, 4, 5, 6).
→ Mode C = TOXIQUE, REJETÉ DÉFINITIVEMENT.

Sans le bench source, **ces chiffres ne peuvent être recalculés** post-S6.
Toute revalidation empirique nécessiterait reconstruction du protocole
expérimental (10 scènes spécifiques, 3 modes A/B/C, gate=4.2, Ollama
Qwen 3.5:35b-a3b).

### 1.3 Ce qui EST présent dans le repo

L'architecture R6 Mode B est intégralement implémentée et wired :

| Élément | Localisation | Statut S6 |
|---------|--------------|-----------|
| Logique cœur Mode B | `packages/sovereign-engine/src/gate/r6-rejection-gate.ts` | ✅ importable |
| Scorer CALC V3.4 dédié | `packages/sovereign-engine/src/gate/r6-calc-scorer.ts` | ✅ importable |
| Adaptateur pipeline | `packages/sovereign-engine/src/gate/r6-pipeline-adapter.ts` | ✅ importable |
| Index gate | `packages/sovereign-engine/src/gate/index.ts` | ✅ importable |
| Types gate | `packages/sovereign-engine/src/gate/r6-types.ts` | ✅ importable |
| Wiring dans engine.ts | `engine.ts` l.86 (import) + l.338 (appel) | ✅ wired |
| Tests intégration | `packages/sovereign-engine/tests/gate/r6-integration.test.ts` | présent |
| Tests rejection gate | `packages/sovereign-engine/tests/gate/r6-rejection-gate.test.ts` | présent |
| ADR scellé 4/4 IA | `docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md` | présent |
| Code R6 anti-loss | commit `b05851f5` (2026-04-20) "feat(src+tests): anti-loss D1+D2 — R6 gate + V3.4 coefficients + sensors V2 + runtime ollama" | committé |

→ L'ARCHITECTURE est validée. Seule la PREUVE EMPIRIQUE du bench est manquante.

---

## 2. Preuves

### 2.1 Recherche fichier exhaustive (read-only S7.1)

```bash
# Repo root
find . -name "bench-r6-hybrid*" 2>/dev/null
# → 0 résultat

# Suppression historique
git log --all --diff-filter=D --name-only --oneline 2>/dev/null | grep -iE "r6.hybrid|bench.r6"
# → 0 résultat (le fichier n'a jamais été supprimé d'un commit)

# Commits 2026-04-11
git log --all --pretty="%h %ad %s" --date=short 2>/dev/null | grep -E "^[a-f0-9]+ 2026-04-11"
# → 0 commit ce jour-là

# Plus proche commit R6 production
git log --all --pretty="%h %ad %s" --date=short 2>/dev/null | grep -iE "R6|gate.dur|rejection"
# → b05851f5 2026-04-20 (9 jours après ADR — code landed sans le bench source)
```

### 2.2 Référence ADR (preuve d'existence ex-ante)

`docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md` lignes 1-12 :

```
# DEC-20260411-003 : R6 REJECTION SAMPLING — HYBRIDATION CALC×LLM
Date        : 2026-04-11
Statut      : 🔒 SCELLÉE — UNANIMITÉ 4/4 (Francky + Claude + ChatGPT + Gemini)
Autorité    : Francky (Architecte Suprême)
Prérequis   : M0b_slim V3.4 scellé (ρ_dispatch=0.6138), CALC plateau confirmé
Bench       : bench-r6-hybrid.ts — 10 scènes × 3 modes, Ollama Qwen 3.5:35b-a3b
```

### 2.3 Preuve ARCHITECTURE wired (S6 gate:imports PASS)

`packages/sovereign-engine/src/engine.ts` :
- ligne 86 : `import { isR6GateEnabled, runR6GateInPipeline } from './gate/r6-pipeline-adapter.js';`
- ligne 338 : `const r6Result = await runR6GateInPipeline(...)`

S6.P3 verdict : **gate:imports PASS** (244 exports + 3 functions / 258ms) — l'ensemble des modules R6 sont runtime-importable post-S6.

### 2.4 Tests présents (preuve de couverture unit/integration)

```
packages/sovereign-engine/tests/gate/r6-integration.test.ts
packages/sovereign-engine/tests/gate/r6-rejection-gate.test.ts
```

Ces tests valident la logique du gate (accept/reject, fallback A, retries
thermiques) en environnement contrôlé. Ils ne reproduisent PAS le bench
empirique 10 scènes × 3 modes — c'est un autre niveau de preuve.

---

## 3. Hypothèses mécaniques (cause de l'absence)

### 3.1 H1 — Bench externe (working tree local jamais committé)

Le bench `bench-r6-hybrid.ts` aurait été développé en local par Claude/Francky
le 2026-04-11 dans un working tree non-versionné, exécuté contre Ollama local,
et le script jamais ajouté à git. Les résultats sont remontés dans l'ADR mais
le script n'est jamais persisté repo.

**Probabilité** : HAUTE — pattern observé sur d'autres benches expérimentaux
(p.ex. dump-v3-prompt.ts, audits ad-hoc).

### 3.2 H2 — Rebase / squash perdu

Le bench aurait été committé dans une feature branch puis perdu lors d'un
rebase interactif ou squash agressif avant merge.

**Probabilité** : FAIBLE — `git log --all --diff-filter=D` montre 0 trace
de fichier nommé `bench-r6-hybrid*` jamais supprimé.

### 3.3 H3 — Bench renommé / fusionné dans script existant

Le bench aurait été renommé/fusionné dans un script existant (p.ex.
`run-benchmark-r6.ts`, `validate-hybrid.ts`, `r6-validate-v3.ts`).

**Probabilité** : MOYENNE — vérification :
- `run-benchmark-r6.ts` : MOCK mode, ne traverse pas engine.ts, pas de modes A/B/C
- `validate-hybrid.ts` : 4 runs uniquement (pas 10 scènes × 3 modes), TRAVERSE engine.ts
- `r6-validate-v3.ts` : Tribunal Académique scorer (Flaubert vs LLM), pas de modes A/B/C

→ Aucun script existant ne correspond au protocole 10×3 décrit dans l'ADR.
**H3 INVALIDÉE.**

### 3.4 H4 — Bench externe à OMEGA (scripts/ root level)

Le bench aurait été placé dans `scripts/` repo root (pas
`packages/sovereign-engine/scripts/`).

**Probabilité** : FAIBLE — vérification : `find scripts -name "*r6*"` →
0 résultat dans scripts/ repo root.
**H4 INVALIDÉE.**

---

## 4. Impact

### 4.1 Reproductibilité empirique

**Impossible** sans reconstruction du bench. Les chiffres ADR (Mode B 4.600 /
Mode A 4.255 / Mode C 3.547, gate=4.2, 100% / 50% / 10% passage) sont
historiques mais non re-mesurables sur la base actuelle.

### 4.2 Sécurité décisionnelle

**Préservée** par :
- ADR scellé unanimité 4/4 IA (Francky + Claude + ChatGPT + Gemini)
- Module wired engine.ts (l.86, l.338)
- Tests intégration `r6-integration.test.ts`
- Build cascade S6 PASS (sovereign-engine importable)

### 4.3 Risque de régression silencieuse

**Faible** mais non nul :
- Le scorer CALC V3.4 utilisé par r6-calc-scorer.ts repose sur
  `M0B_SLIM_V34_COEFFICIENTS.json` SHA256 `e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c`
  (scellé NCR_CATHEDRAL §Traçabilité)
- Si les coefficients V3.4 dérivent (drift Ridge corpus 1334), le gate
  threshold 4.2 perd son calibrage → Mode B passage gate change silencieusement
- Sans bench reproduisible, **impossible de détecter ce drift**

### 4.4 Décisions dérivées affectées

L'ADR DEC-20260411-003 §POINT 2 stipule "Le Mode C (feedback sémantique) est
REJETÉ sur base empirique [...] Δscore moyen : -0.264 (dégradation), 7/9
scènes dégradées". Cette décision **non négociable** repose sur le bench
manquant. Si elle devait être contestée, aucune preuve empirique reproductible
ne pourrait être présentée.

---

## 5. Options de résolution (arbitrage Architecte 2026-04-28)

### Option A — Reconstruire `bench-r6-hybrid.ts` (REJETÉ)

**Description** : développer un bench reproduisant le protocole ADR (10 scènes
× 3 modes A/B/C, gate=4.2, Ollama Qwen 3.5:35b-a3b ou substitut qwen3:32b).

**Effort** : 1-2h dev (logique gate déjà présente dans `r6-rejection-gate.ts`)
+ 2-3h GPU bench (10 × 3 = 30 runs Ollama).

**Bénéfice** : reproductibilité empirique restaurée, drift detectable.

**Coût** : 3-5h temps cumulé, complexité re-spec scènes (Qwen 3.5:35b-a3b
modèle inhabituel — substitut qwen3:32b à valider, pourrait changer scores).

**Décision Architecte 2026-04-28** : **REJETÉ** — coût > bénéfice tant que
les tests intégration + ADR couvrent le risque architectural.

### Option B — Accepter via tests + ADR (REJETÉ explicitement)

**Description** : marquer R6 Mode B comme "validé par tests + ADR consensus,
pas de bench source disponible". Pas de NCR ouverte.

**Coût** : 0h.

**Décision Architecte 2026-04-28** : **REJETÉ** — silence n'est pas preuve
(doctrine OMEGA E-12 "Hide uncertainty | Silence is failure"). Documenter
explicitement l'absence de bench source.

### Option C — Documenter UNKNOWN via NCR (RETENU)

**Description** : ouvrir le présent NCR (`NCR_R6_BENCH_SOURCE_MISSING_S7P1`)
documentant explicitement l'absence du bench source, mais maintenant la
décision R6 Mode B comme architecturalement validée via :
- ADR DEC-20260411-003 (consensus 4/4 IA)
- Module wired engine.ts (l.86, l.338)
- Tests intégration `r6-integration.test.ts` + `r6-rejection-gate.test.ts`
- Build cascade S6 PASS

**Coût** : 0h (NCR uniquement, pas de re-bench).

**Décision Architecte 2026-04-28** : **RETENU**.

### 5.1 Conditions de réouverture (R6 → P1/P0)

Le NCR sera promu P1/P0 si l'une des conditions suivantes survient :
1. Drift suspecté du scorer CALC V3.4 (coefficients M0B_SLIM_V34 modifiés
   sans re-validation Tribunal)
2. Régression observée en production sur Mode B (passage gate < 80%)
3. Décision dérivée de l'ADR (rejet Mode C) contestée techniquement
4. Sprint dédié à reconstruction bench R6 décidé par Architecte

---

## 6. Recommandation S7P2

**Court terme (S7.2 RÉDUIT, 2026-04-28)** :
- Pas de re-bench R6 (Option C retenue).
- Re-bench focal sur V1_SEAL + R7 + Cliff Gate (3 décisions SUSPECT_REVALIDATE
  partageant `bench-v-atomic-v5.ts`).

**Moyen terme (post-S7)** :
- Si NCR_GATING_EFFECT_SIZE_UNSTABLE résolu, ajouter une cellule R6 Mode B
  au bench composite déjà reconstruit.
- Si re-calibration M0B_SLIM_V34 envisagée, **prérequis = reconstruction
  bench-r6-hybrid.ts** (Option A) pour valider non-régression Mode B.

**Long terme (sprint S8 ou ultérieur)** :
- Inclure `bench-r6-hybrid.ts` reconstruction dans le scope d'un sprint
  dédié si l'architecture R6 doit être re-touchée.

---

## 7. Plan d'action

| # | Action | Owner | Statut |
|---|--------|-------|--------|
| 1 | Drafter ce NCR (S7.1 livrable 02) | Claude | **DONE** (2026-04-28) |
| 2 | Arbitrage Architecte Option A/B/C | Francky | **DONE** (2026-04-28, Option C retenue) |
| 3 | Promotion NCR DRAFT → OPEN après commit S7 | Claude | PENDING |
| 4 | Move NCR vers `nexus/proof/NCR_R6_BENCH_SOURCE_MISSING.md` | Claude | PENDING (Sprint S8 scellage) |
| 5 | Ajouter référence dans `00_INDEX_MASTER.md` | Claude | PENDING |
| 6 | Surveillance drift M0B_SLIM_V34 (trigger réouverture) | Claude | CONTINUOUS |

---

## 8. Traçabilité

- **ADR source** : `docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md`
- **Module R6 wired** : `packages/sovereign-engine/src/engine.ts` l.86, l.338
- **Implémentation** : `packages/sovereign-engine/src/gate/r6-rejection-gate.ts`,
  `r6-calc-scorer.ts`, `r6-pipeline-adapter.ts`, `r6-types.ts`, `index.ts`
- **Tests** : `packages/sovereign-engine/tests/gate/r6-integration.test.ts`,
  `r6-rejection-gate.test.ts`
- **Coefficients dépendants** : `M0B_SLIM_V34_COEFFICIENTS.json` SHA256
  `e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c`
- **Commit landing R6 production** : `b05851f5` (2026-04-20) "feat(src+tests):
  anti-loss D1+D2 — R6 gate + V3.4 coefficients + sensors V2 + runtime ollama"
- **Sprint origine NCR** : S7.1 mapping bench↔pipeline (livrable
  `01_BENCH_PIPELINE_MAPPING.md` §FICHE #3 R6)
- **Décision Architecte** : Francky 2026-04-28, Option C documenter UNKNOWN
- **Tag de référence S6** : `phase-s-s6-engine-runtime-restored-2026-04-27`
  → `aca0f393`

---

## 9. Signature

```
NCR-ID    : NCR_R6_BENCH_SOURCE_MISSING_S7P1
DRAFTED   : 2026-04-28 (S7.1 mapping post-S6)
OPENED    : 2026-04-29 (S7.3-bis post S7.2 PASS, decision-confirmé Option C)
RESOLVED  : DOCUMENTED_UNKNOWN (Option C)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```

**Doctrine respectée** :
- ✅ PROVE IT — recherche exhaustive documentée (§2.1)
- ✅ NCR OVER HEROICS — ouverture NCR plutôt que silence ou reconstruction non-arbitrée
- ✅ E-12 — uncertainty NOT hidden (NCR explicite)
- ✅ Read-only S7.1 — aucune modification code/test, aucun re-bench

