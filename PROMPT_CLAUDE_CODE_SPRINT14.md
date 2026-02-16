# OMEGA — PROMPT CLAUDE CODE — SPRINT 14
# READER PHANTOM LIGHT
# Date: 2026-02-16 — Version DÉFINITIVE

## RÔLE
Tu es l'ingénieur système OMEGA. Exécute Sprint 14 complet (commits 14.1 → 14.4).
PASS ou FAIL. Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT DU REPO
| Attribut | Valeur |
|----------|--------|
| Repo | `C:\Users\elric\omega-project` |
| Package | `packages/sovereign-engine` |
| HEAD | `da6c1526` (master) |
| Tag | `sprint-13-sealed` |
| Tests baseline | 362/362 PASS |
| Sprints SEALED | 9, 10, 11, 12, 13 |

## CONTRAINTES OMEGA (non négociables)
1. Déterminisme : même input + même config → même output
2. Zéro dette : TODO/FIXME/HACK = 0 ; @ts-ignore/@ts-nocheck = 0 ; `: any` = 0
3. `.roadmap-hash.json` : NE PAS TOUCHER
4. 1 commit = 1 unité logique, tests inclus, evidence archivée

## PRÉ-VOL OBLIGATOIRE (si échec → STOP)
```bash
cd packages/sovereign-engine
git status
npx vitest run 2>&1           # 362 passed
git rev-parse --short HEAD    # da6c1526
mkdir -p proofpacks/sprint-14/00-preflight
npx vitest run 2>&1 > proofpacks/sprint-14/00-preflight/baseline.txt
git log --oneline -10 > proofpacks/sprint-14/00-preflight/git_log.txt
```

---

## INVARIANTS SPRINT 14

| ID | Description |
|----|-------------|
| ART-PHANTOM-01 | PhantomState modélise attention, cognitive_load, fatigue avec décroissance |
| ART-PHANTOM-02 | Phantom runner traverse texte phrase par phrase, maintient état |
| ART-PHANTOM-03 | 2 axes : attention_sustain + fatigue_management fonctionnels |
| ART-PHANTOM-04 | Calibration + non-régression + ProofPack |

---

## COMMIT 14.1 — PhantomState (attention, cognitive_load, fatigue)

**Message EXACT** : `feat(sovereign): phantom state model (attention, cognitive_load, fatigue) [ART-PHANTOM-01]`

### Fichier à créer : `src/phantom/phantom-state.ts`

```typescript
export interface PhantomState {
  attention: number;         // 0-1 (1 = très attentif)
  cognitive_load: number;    // 0-1 (1 = surchargé)
  fatigue: number;           // 0-1 (1 = épuisé)
  sentence_index: number;    // position actuelle
}

export interface PhantomConfig {
  initial_attention: number;        // défaut 0.9
  attention_decay_rate: number;     // défaut 0.02 par phrase
  attention_boost_events: number;   // boost quand événement narratif (+0.15)
  cognitive_load_per_word: number;  // défaut 0.001 par mot
  cognitive_load_decay: number;     // défaut 0.05 (récupération entre phrases)
  fatigue_rate: number;             // défaut 0.01 par phrase
  fatigue_breath_recovery: number;  // défaut 0.08 (récupération sur phrase courte/dialogue)
}

export const DEFAULT_PHANTOM_CONFIG: PhantomConfig = {
  initial_attention: 0.9,
  attention_decay_rate: 0.02,
  attention_boost_events: 0.15,
  cognitive_load_per_word: 0.001,
  cognitive_load_decay: 0.05,
  fatigue_rate: 0.01,
  fatigue_breath_recovery: 0.08,
};

// Créer état initial
export function createPhantomState(): PhantomState

// Faire avancer l'état d'une phrase
export function advancePhantom(
  state: PhantomState,
  sentence: string,
  config: PhantomConfig
): PhantomState
// Algorithme :
// 1. attention -= decay_rate
// 2. Si phrase courte (< 8 mots) ou dialogue → attention += boost * 0.5
// 3. Si phrase contient événement (verbe d'action fort) → attention += boost
// 4. cognitive_load += words * load_per_word - cognitive_load_decay
// 5. fatigue += fatigue_rate
// 6. Si phrase courte (< 8 mots) → fatigue -= breath_recovery
// 7. Clamp tout ∈ [0, 1]
// DÉTERMINISTE : pas de random, pas de LLM

// Détecter "événement narratif" (heuristique CALC)
export function isNarrativeEvent(sentence: string): boolean
// Heuristique : contient verbe d'action fort (courut, frappa, cria, saisit, tomba, etc.)
// Liste de 30+ verbes d'action FR
```

### Tests : `tests/phantom/phantom-state.test.ts`

4 tests :
- **PHANTOM-01** : état initial → attention 0.9, cognitive_load 0, fatigue 0
- **PHANTOM-02** : 20 phrases longues monotones → attention < 0.5 et fatigue > 0.15
- **PHANTOM-03** : phrase d'action ("Il saisit l'arme") → attention boost
- **PHANTOM-04** : phrase courte après fatigue → fatigue diminue (respiration)

### Evidence
```bash
mkdir -p proofpacks/sprint-14/14.1
npx vitest run 2>&1 > proofpacks/sprint-14/14.1/npm_test.txt
```

---

## COMMIT 14.2 — Phantom Runner

**Message EXACT** : `feat(sovereign): phantom runner (sentence traversal) [ART-PHANTOM-02]`

### Fichier à créer : `src/phantom/phantom-runner.ts`

```typescript
export interface PhantomTrace {
  states: PhantomState[];           // état après chaque phrase
  attention_min: number;            // minimum attention atteint
  attention_min_index: number;      // où
  fatigue_max: number;              // maximum fatigue atteint
  fatigue_max_index: number;        // où
  cognitive_peaks: number[];        // indices où cognitive_load > 0.7
  breath_points: number[];          // indices de phrases courtes (respirations)
  danger_zones: Array<{             // zones problématiques
    start: number;
    end: number;
    type: 'low_attention' | 'high_fatigue' | 'cognitive_overload';
  }>;
}

export function runPhantom(
  prose: string,
  config?: PhantomConfig
): PhantomTrace
// 1. Split prose en phrases
// 2. Pour chaque phrase : advancePhantom()
// 3. Enregistrer trace complète
// 4. Détecter danger_zones :
//    - low_attention : 5+ phrases consécutives avec attention < 0.3
//    - high_fatigue : fatigue > 0.7 pendant > 3 phrases sans respiration
//    - cognitive_overload : cognitive_load > 0.8
// DÉTERMINISTE
```

### Tests : `tests/phantom/phantom-runner.test.ts`

3 tests :
- **RUNNER-01** : prose variée (action + dialogue + description) → attention jamais < 0.2
- **RUNNER-02** : prose monotone (20 phrases longues descriptives) → danger_zone `low_attention` détectée
- **RUNNER-03** : prose avec respirations bien placées → fatigue_max < 0.6

### Evidence
```bash
mkdir -p proofpacks/sprint-14/14.2
npx vitest run 2>&1 > proofpacks/sprint-14/14.2/npm_test.txt
```

---

## COMMIT 14.3 — 2 Axes : attention_sustain + fatigue_management

**Message EXACT** : `feat(sovereign): attention_sustain + fatigue_management axes [ART-PHANTOM-03]`

### Fichiers à créer

**`src/oracle/axes/attention-sustain.ts`**
```typescript
export async function scoreAttentionSustain(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<AxisScore>
// Poids : 1.0
// Méthode : CALC (runPhantom)
// Score :
//   100 si attention jamais < 0.3 pendant > 5 phrases
//   80 si 1 danger zone low_attention
//   60 si 2 danger zones
//   40 si 3+ danger zones
//   Clamp [0, 100]
```

**`src/oracle/axes/fatigue-management.ts`**
```typescript
export async function scoreFatigueManagement(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<AxisScore>
// Poids : 1.0
// Méthode : CALC (runPhantom)
// Score :
//   100 si fatigue jamais > 0.7 sans respiration dans les 3 phrases suivantes
//   80 si 1 zone high_fatigue
//   60 si 2 zones
//   40 si 3+ zones
//   Bonus +10 si breath_points bien répartis (écart-type faible)
//   Clamp [0, 100]
```

Modifier `src/oracle/axes/index.ts` pour enregistrer les 2 axes.

**Intégration scoring :**
- `attention_sustain` → macro-axe **IFI** (rejoint sensory_density)
- `fatigue_management` → macro-axe **IFI**
- Poids ×1.0 chacun
- IFI reste 10% global

### Tests : `tests/oracle/axes/phantom-axes.test.ts`

3 tests :
- **ATTN-01** : prose variée → attention_sustain score > 80
- **FATIGUE-01** : prose monotone → fatigue_management score < 60
- **FATIGUE-02** : prose avec respirations → fatigue_management score > 80

### Evidence
```bash
mkdir -p proofpacks/sprint-14/14.3
npx vitest run 2>&1 > proofpacks/sprint-14/14.3/npm_test.txt
```

---

## COMMIT 14.4 — Calibration + Tests + ProofPack Sprint 14

**Message EXACT** : `chore(proofpack): sprint 14 proofpack + seal report`

### Audits BLOQUANTS
```bash
grep -rn "TODO\|FIXME\|HACK" src/ tests/       # 0
grep -rn ": any\b" src/                          # 0
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/   # 0
```

### ProofPack
```bash
mkdir -p proofpacks/sprint-14/14.4
npx vitest run 2>&1 > proofpacks/sprint-14/14.4/npm_test.txt
npx vitest run --reporter=verbose 2>&1 > proofpacks/sprint-14/14.4/gates_output.txt
```

### SEAL_REPORT : `proofpacks/sprint-14/Sprint14_SEAL_REPORT.md`

### Verdict attendu
```
📦 SPRINT 14 — READER PHANTOM LIGHT
Tests: X/X PASS
Invariants: ART-PHANTOM-01..04 (4/4 PASS)
Audits: 0 TODO, 0 any, 0 ts-ignore
Modules: src/phantom/ (phantom-state.ts, phantom-runner.ts), axes/attention-sustain.ts, axes/fatigue-management.ts
VERDICT: PASS/FAIL — SPRINT 14 SEALED / NOT SEALED
```

---

## RÉSUMÉ DES TESTS ATTENDUS

| Commit | Tests ajoutés | Baseline après |
|--------|--------------|----------------|
| 14.1 | PHANTOM-01..04 (+4) | 366 |
| 14.2 | RUNNER-01..03 (+3) | 369 |
| 14.3 | ATTN-01, FATIGUE-01..02 (+3) | 372 |
| 14.4 | +0 (seal) | 372 |
| **TOTAL** | **+10** | **≥ 372** |

## EXÉCUTION
Pré-vol, puis 14.1 → 14.4 dans l'ordre strict. Ne t'arrête pas entre les commits.
