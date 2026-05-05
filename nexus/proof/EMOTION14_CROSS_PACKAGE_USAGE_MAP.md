# EMOTION14 — CROSS-PACKAGE USAGE MAP

**Phase**: 1.4 — Vérifications Emotion14 V1/V2/V3 (FINAL)
**Date**: 2026-05-05
**Status**: AUDIT-ONLY — NO PATCH, NO REFACTOR, NO CANONICAL DECISION
**Doctrine**: AUDIT BEFORE ACTION · ANCHOR_PRE_FLIGHT · NO_UNVERIFIED_EXTERNAL_ANCHORS · NCR OVER HEROICS · MINIMIZE IT

> **Nuance sémantique (ChatGPT)**: pas de "drift architecturalement assumé".
> Formulation retenue: *"Le code reconnaît la dualité via adapter dual,
> mais la doctrine SSOT n'a pas scellé la frontière."*

---

## 1. V1 RESULT — `integration-nexus-dep` `envy` usage (verbatim ±3 lignes)

### 1.1 — Source declaration (`src/contracts/types.ts:34`)

```ts
// 14:  // EMOTION14 — MIRRORED FROM @omega/genome (FROZEN)
// 21:  export type Emotion14 =
// 22:    | "joy"
// ...
// 31:    | "shame"
// 32:    | "pride"
// 33:    | "envy"           ← occurrence
// 34:    | "hope";
// 37:  export const EMOTION14_LIST: readonly Emotion14[] = Object.freeze([
// 41:    "envy", "hope"     ← occurrence
// 42:  ]);
```

**Verdict**: integration-nexus-dep declares its **own** `Emotion14` union locally.
Header comment self-classifies as **MIRROR** of `@omega/genome` (FROZEN).

### 1.2 — Translator metier (`src/translators/module.ts`)

```ts
// 21-30: docstring
//   * Genome uses Emotion14 with "envy"
//   * Bio uses EmotionType with "despair"
//   * - "envy" (Genome) ↔ "despair" (Bio) are contextually distinct
//
// 46:    envy: "anger" // envy mapped to anger (closest negative active emotion)
// 84:    * INV-TRANS-04: Bijective mapping (with approximation for envy/despair)
// 144:   envy: 0   (init empty Genome distribution)
// 220:   ..., hope: 0, envy: 0
// 269:   "hope", "envy"   (Emotion14[] literal)
```

**Verdict**: `envy` est **logique métier active** (mapping `envy → anger` vers Bio).
Pas dead-code dans integration-nexus-dep.

### 1.3 — Adapters (`src/adapters/{genome,mycelium-bio}.adapter.ts`)

```ts
// genome.adapter.ts:192-195   Emotion14[] = [..., "envy", "hope"]
// mycelium-bio.adapter.ts:29  export type EmotionType = Emotion14 | "despair";
//                             // Bio uses 14 with despair instead of envy
// mycelium-bio.adapter.ts:223 [..., "envy", "hope"]
```

**Verdict**: dual ontology reconnue empiriquement par le code (Genome=envy / Bio=despair).
Adapter produit l'extension `EmotionType = Emotion14 | "despair"`.

### 1.4 — Tests (3 fichiers)

```ts
// test/contracts.test.ts:52        "envy", "hope"
// test/translators.test.ts:225,252,276,307,370   envy: 0|0.02|0.025
// test/integration.test.ts:274     // "envy" in Genome maps to "anger" in Bio
// test/integration.test.ts:276     emotion: "envy"
// test/integration.test.ts:554     ["joy", "hope", "envy"] as const
// test/integration.test.ts:563     // envy → anger
// test/integration.test.ts:571     // (not bijective for envy)
```

**Verdict**: invariant mapping `envy → anger` testé contractuellement (INV-TRANS-04).

---

## 2. V2 RESULT — `genome` internal Emotion14 usage (premières occurrences `src/`)

```
src/api/types.ts:26    export type Emotion14 =
src/api/types.ts:47      readonly distribution: Readonly<Record<Emotion14, number>>;
src/api/types.ts:54      readonly from: Emotion14;
src/api/types.ts:55      readonly to: Emotion14;
src/core/emotion14.ts:13  import type { Emotion14 } from "../api/types.js";
src/core/emotion14.ts:24  export const EMOTION14_ORDERED: readonly Emotion14[] = [
src/core/emotion14.ts:44  export function createEmptyDistribution(): Record<Emotion14, number>
src/core/emotion14.ts:45    const dist: Partial<Record<Emotion14, number>> = {};
src/core/emotion14.ts:49    return dist as Record<Emotion14, number>;
src/core/emotion14.ts:56  export function normalizeDistribution(dist: Record<Emotion14, number>):
                                            Record<Emotion14, number>
src/core/genome.ts:14     Emotion14,
src/index.ts:33           Emotion14,
```

**Tests (séparés, pour mémoire)**:
```
test/invariants/validation.test.ts: 28.3-A Emotion14 Ordre Sanctuarisé / 28.3-B Distribution / 28.3-C Valence
test/invariants/genome.test.ts:350  INV-GEN-12: Emotion14 sanctuarisé
```

**Cross-package consumer probe (additional, hors V2 stricto sensu)**:
```
grep "from ['\"]@omega/genome['\"]" — *.ts → 0 matches
```

→ **Aucun fichier `*.ts` dans le repo n'importe `Emotion14` depuis `@omega/genome`.**
La doc `docs/phase-s/CLAUDE_CODE_PROMPT_SOVEREIGN_ENGINE.md:99-100` *recommande* l'import,
mais aucun import effectif n'est constaté en code source TS.

**Verdict**: `genome.Emotion14` est utilisé en interne (5 sites prod hors tests),
exporté via `src/index.ts` mais **non consommé cross-package en code source TS**.

---

## 3. V3 RESULT — V3.4 coefficients sensitivity

### 3.1 — Fichier inspecté

`packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts`
(seule occurrence du glob `coefficients-v3-4*.ts`)

### 3.2 — Recherche tokens émotionnels

```
grep "envy|guilt|shame|pride|hope|submission|awe|disapproval|remorse|contempt"
  → No matches found

grep -i "Emotion14|emotion"
  → No matches found
```

### 3.3 — Caractérisation du fichier (header L1-48 lu)

- Module ML pur: 5 features `M0b_slim` calibrées sur 1334 œuvres (Ridge α=1.0, seed=42).
- Identité: `CALIBRATION_ID = 'M0b_slim_V3_4_2026-04-11'`, SHA256 figé.
- Invariants: `INV-NR-10`, `INV-DISP-LANG-04`, `INV-DISP-LANG-05` — **aucun renvoi à Emotion14**.

**Verdict**: V3.4 est **canon-agnostic / abstrait**.
Aucun couplage statique aux 14 émotions. Sensitivity au canon Emotion14 = **NULLE** au niveau coefficients.

---

## 4. CLASSIFICATION REVISÉE

Référentiel autorisé:

| Niveau | Statut | Source/Localisation |
|---|---|---|
| Canon réel runtime | `RUNTIME_CANON` | `omega-forge.Emotion14` (référence ChatGPT, hors scope grep ce sprint) |
| Canon adapter | `BRIDGE_CANON` | `packages/sovereign-engine/src/input/emotion-adapter.ts` (présent) |

### 4.1 — `genome.Emotion14`

**Statut retenu**: **`INTERNAL_ONLY_CANON`**

**Justification**:
- V2 démontre 5 usages de production internes (`api/types.ts`, `core/emotion14.ts`, `core/genome.ts`, `index.ts`).
- Tests d'invariants existent (INV-GEN-12, 28.3-A/B/C).
- Sondage complémentaire: zéro import `Emotion14` depuis `@omega/genome` dans le reste du repo TS.
- Donc: ni `DEAD_CANON` (interdit par la directive si V2 montre usage interne),
  ni `CROSS_PACKAGE_ORPHAN` au sens fort (le canon est *exporté* depuis `index.ts`),
  mais **non consommé** hors-package en code TS.
- → `INTERNAL_ONLY_CANON` est le statut le plus précis du référentiel autorisé.

### 4.2 — `integration-nexus-dep.Emotion14`

**Statut retenu**: **`DUPLICATE_CANON`**

**Justification**:
- Le header `src/contracts/types.ts:14` se déclare lui-même *MIRROR FROM @omega/genome (FROZEN)*.
- Union de 14 noms identique à `genome.Emotion14` (même set lexical: joy…hope, incluant `envy`).
- Aucun `import` de `@omega/genome.Emotion14` — c'est une **redéclaration locale**, pas une réutilisation.
- Le canon Bio adjacent (`mycelium-bio.adapter.ts:29`) étend en `Emotion14 | "despair"` et le translator
  `module.ts:46` opère un mapping bijectif approché `envy ↔ anger/despair`.

→ Conforme à la définition `DUPLICATE_CANON` (copie d'un autre canon).

### 4.3 — Synthèse formulation doctrinale

> Le code de `integration-nexus-dep` reconnaît la dualité Genome/Bio
> via un adapter dual (`mycelium-bio.adapter` + `module` translator),
> mais la doctrine SSOT n'a pas scellé la frontière entre les trois sites
> de déclaration de `Emotion14` (`genome`, `integration-nexus-dep`, `omega-forge`).

---

## 5. RECOMMENDATION POUR MINI-TRIBUNAL EXTERNE

Cinq options à évaluer (aucune décision prise ici):

| Option | Description | Coût | Risque rupture |
|---|---|---|---|
| **A** | Réaligner `integration-nexus-dep` sur `omega-forge` (canon runtime) | Moyen | Élevé (translators à reprendre) |
| **B** | Garder 2 canons + renommer (`GenomeEmotion14` / `ForgeEmotion14`) | Faible | Faible (pure renaming) |
| **C** | Créer bridge officiel (`EmotionOntologyBridge`) | Moyen | Faible (additif, non destructif) |
| **D** | Archiver/déclasser `genome.Emotion14` | Élevé | Très élevé (genome SEALED — V-01 risque) |
| **E** | Refonte Emotion Ontology v2 (Sprint dédié S11+/S12) | Très élevé | Modéré (planifiable) |

### 5.1 — Biais provisoire ChatGPT (à confirmer/ajuster par tribunal)

> **B + C d'abord, A plus tard si besoin.**

Rationale empirique post V1/V2/V3:
- **B** désamorce immédiatement la confusion lexicale (deux types de même nom).
- **C** documente et institutionnalise la frontière déjà reconnue par les translators existants
  (`module.ts` mapping `envy ↔ despair/anger`).
- **A** reste réversible plus tard si l'ontologie omega-forge devient l'unique canon runtime,
  mais nécessite preuve indépendante que `omega-forge.Emotion14` est canon de référence
  (cf. doctrine NO_UNVERIFIED_EXTERNAL_ANCHORS — pas vérifié dans ce sprint).
- **D** interdit tant que `genome` est SEALED (CLAUDE.md §D, FROZEN_MODULES.md).
- **E** option lourde — réservée à décision Architecte (Francky).

### 5.2 — Anchors externes à vérifier avant tribunal

Marqués `[À VÉRIFIER]` par doctrine ANCHOR_PRE_FLIGHT:

- `[À VÉRIFIER]` `omega-forge.Emotion14` — existence, structure, lieu de déclaration runtime.
- `[À VÉRIFIER]` `sovereign-engine/src/input/emotion-adapter.ts` — comportement effectif (présence file confirmée; sémantique non auditée ce sprint).
- `[À VÉRIFIER]` Affirmation "RUNTIME_CANON = omega-forge" — origine ChatGPT, pas de preuve repo collectée ici.

---

## 6. PORTÉE & LIMITES DE CE LIVRABLE

- **AUDIT-ONLY**. Aucun fichier de code modifié (cf. `git diff --name-only` post-livrable).
- **Pas de décision** A/B/C/D/E — réservée mini-tribunal externe.
- Anchors `omega-forge.*` non audités empiriquement dans ce sprint (interdit par scope).
- Statuts `RUNTIME_CANON` / `BRIDGE_CANON` cités à titre de référentiel ChatGPT non vérifié repo.

---

**Fin du livrable. STOP pour mini-tribunal externe.**
