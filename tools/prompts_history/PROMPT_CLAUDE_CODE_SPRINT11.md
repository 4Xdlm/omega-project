# OMEGA — PROMPT CLAUDE CODE — SPRINT 11
# SILENCE ORACLE + ADVERSARIAL JUDGE
# Date: 2026-02-16 — Version DÉFINITIVE (fusion roadmap + ChatGPT + corrections)

## RÔLE
Tu es l'ingénieur système OMEGA. Exécute Sprint 11 complet (commits 11.1 → 11.6).
PASS ou FAIL — pas de "conditional pass". Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT DU REPO
| Attribut | Valeur |
|----------|--------|
| Repo | `C:\Users\elric\omega-project` |
| Package principal | `packages/sovereign-engine` |
| HEAD | `37fdf334` (master) |
| Tag | `sprint-10-sealed` |
| Tests baseline | 324/324 PASS (sovereign-engine) |
| Sprints SEALED | 9, 10 |

## CONTRAINTES OMEGA (non négociables)
1. Déterminisme : même input + même config → même output → même hash
2. Zéro dette : TODO/FIXME/HACK = 0 ; @ts-ignore/@ts-nocheck = 0 ; `: any` = 0 (AUCUNE exception)
3. `.roadmap-hash.json` : NE PAS TOUCHER — revert immédiat si modifié
4. 1 commit = 1 unité logique, tests inclus, evidence archivée
5. Cache OBLIGATOIRE pour toute sortie LLM (fraud_score, SDT LLM judge si utilisé)
6. FAIL-CLOSED : si provider LLM indisponible → fallback CALC déterministe, pas de crash

## PRÉ-VOL OBLIGATOIRE (si échec → STOP)
```bash
cd packages/sovereign-engine
git status                    # DOIT être clean
npx vitest run 2>&1           # DOIT afficher 324 passed
git rev-parse --short HEAD    # DOIT afficher 37fdf334 (ou hash post-push)
mkdir -p proofpacks/sprint-11/00-preflight
npx vitest run 2>&1 > proofpacks/sprint-11/00-preflight/baseline.txt
git log --oneline -10 > proofpacks/sprint-11/00-preflight/git_log.txt
```

---

## INVARIANTS SPRINT 11

| ID | Description | Test(s) couvrants |
|----|-------------|-------------------|
| ART-SDT-01 | Telling détecté à 80%+ précision (30+ patterns FR) | SDT-01..05 |
| ART-SDT-02 | Axe show_dont_tell intégré (poids ×3.0) | AXE-SDT-01 |
| ART-AUTH-01 | 15 patterns IA-smell détectables par CALC | AUTH-01, AUTH-04 |
| ART-AUTH-02 | fraud_score LLM reproductible (cache) | AUTH-02, AUTH-03 |
| ART-SCORE-01 | Macro-axe AAI calculé (25%, plancher 85) | MACRO-AAI-01..03 |

---

## COMMIT 11.1 — Show Don't Tell Detector

**Message EXACT** : `feat(sovereign): show-dont-tell detector [ART-SDT-01, ART-SDT-02]`

### Fichiers à créer

**`src/silence/telling-patterns.ts`**
```typescript
export interface TellingPattern {
  id: string;
  regex: RegExp;
  severity: 'critical' | 'high' | 'medium';
  weight: number;
  suggested_show: string;
  false_positive_guards: RegExp[];  // exceptions connues
}

export const TELLING_PATTERNS_FR: TellingPattern[]
// ≥ 30 patterns couvrant ces 8 familles :
```

**8 familles obligatoires** (compléter à 30+ patterns individuels) :
1. VERBE_ÉTAT + ÉMOTION : "il était triste/heureux/furieux/effrayé"
2. SENTIR + ÉMOTION : "il sentait la peur/joie/colère"
3. ÉPROUVER + ÉMOTION : "elle éprouvait de la tristesse"
4. RESSENTIR + ÉMOTION : "il ressentait une profonde angoisse"
5. ÊTRE_ENVAHI + ÉMOTION : "la terreur l'envahit"
6. ADV_INTENSITÉ + ADJ_ÉMOTION : "terriblement triste", "vraiment heureux" (pénalisation plus forte)
7. NOM_ÉMOTION_SUJET : "La colère montait en lui"
8. EXPLICATION_PSYCHOLOGIQUE : "parce qu'il avait peur de..."

**False positive guards OBLIGATOIRES** :
- "il était médecin" → PAS de violation (état factuel, pas émotion)
- "elle était debout" → PAS de violation
- "il était midi" → PAS de violation

**`src/silence/show-dont-tell.ts`**
```typescript
export interface TellingViolation {
  sentence_index: number;
  sentence: string;
  pattern_id: string;
  severity: 'critical' | 'high' | 'medium';
  suggested_show: string;
}

export interface TellingResult {
  violations: TellingViolation[];
  show_ratio: number;               // 0-1 (1 = tout showing)
  telling_count: number;
  total_emotional_expressions: number;
  worst_violations: TellingViolation[];  // Top 5 pires
  score: number;                     // 0-100 (100 = très show)
}

export function detectTelling(prose: string): TellingResult
```

**Algorithme scoring** :
- 0 violations critical → score 100
- 1 violation critical → 75
- 2 violations critical → 50
- 3+ → max(0, 100 - violations_critical × 20)
- + ajustement high (-5 chaque) / medium (-2 chaque)
- Déterministe, CALC uniquement (pas de LLM ici).

### Tests : `tests/silence/show-dont-tell.test.ts`

5 tests :
- **SDT-01** : "Il était triste" → violation critical détectée
- **SDT-02** : "Ses épaules s'affaissèrent" → AUCUNE violation (showing)
- **SDT-03** : "Il était médecin" → PAS de violation (false positive guard)
- **SDT-04** : show_ratio calculé correctement sur prose mixte
- **SDT-05** : ≥ 30 patterns chargés et fonctionnels (TELLING_PATTERNS_FR.length ≥ 30)

### Evidence
```bash
mkdir -p proofpacks/sprint-11/11.1
npx vitest run 2>&1 > proofpacks/sprint-11/11.1/npm_test.txt
echo "Pattern count: $(grep -c 'id:' src/silence/telling-patterns.ts)" > proofpacks/sprint-11/11.1/patterns_count.txt
```

### Vérification
```bash
npx vitest run 2>&1  # ≥ 329 passed (324 + 5)
grep -rn "TODO\|FIXME\|HACK" src/silence/ tests/silence/
grep -rn ": any\b" src/silence/
```

---

## COMMIT 11.2 — Authenticity Scorer (Anti-IA Smell)

**Message EXACT** : `feat(sovereign): authenticity scorer (anti-IA smell) [ART-AUTH-01, ART-AUTH-02]`

### Fichiers à créer

**`src/authenticity/ia-smell-patterns.ts`**
```typescript
export interface IASmellPattern {
  id: string;           // ex: 'OVER_ADJECTIVATION'
  name: string;
  detect: (prose: string) => { found: boolean; count: number; evidence: string[] };
  weight: number;       // contribution au score
}

export const IA_SMELL_PATTERNS: IASmellPattern[]
```

**15 patterns EXACTS** (CALC déterministe, pas LLM) :
| # | ID | Description |
|---|----|-------------|
| 1 | OVER_ADJECTIVATION | ratio adjectifs/noms > seuil |
| 2 | PERFECT_TRANSITIONS | "Cependant", "Ainsi", "De plus" systématiques |
| 3 | LIST_STRUCTURE | énumérations rigides / 3+ phrases même début |
| 4 | NO_INTERRUPTION | phrases toujours complètes, zéro rupture |
| 5 | GENERIC_WISDOM | morales creuses, sagesse générique |
| 6 | BALANCED_SYMMETRY | structures trop symétriques (paragraphes même longueur ±10%) |
| 7 | SAFE_VAGUENESS | "inspirant", "profond" sans concret |
| 8 | HYPER_POLITE | ton trop lisse, aucune aspérité |
| 9 | TOO_MANY_EM_DASHES | ponctuation IA typique (tirets longs répétés) |
| 10 | RHETORICAL_OVERUSE | questions rhétoriques répétées |
| 11 | TEMPLATE_OPENING | ouverture cliché |
| 12 | TEMPLATE_CLOSING | conclusion "en somme", "en définitive" |
| 13 | LOW_SPECIFICITY_NOUNS | "chose", "situation", "moment" excessifs |
| 14 | ZERO_SENSORY | aucun sensoriel concret |
| 15 | OVER_EXPLAINING | explication au lieu d'action |

Score IA-smell ∈ [0..100] : 100 = très authentique / 0 = IA évidente.

**`src/authenticity/adversarial-judge.ts`**
```typescript
export interface FraudResult {
  fraud_score: number | null;   // 0-100, 100 = certainement humain, null si provider indispo
  rationale: string;
  cached: boolean;
  method: 'llm' | 'calc_fallback';
}

export async function judgeFraudScore(
  prose: string,
  provider: SovereignProvider,
  cache: SemanticCache  // réutiliser le cache Sprint 9
): Promise<FraudResult>
```

**Prompt LLM (stable, versionné)** :
```
Tu es un expert linguistique. Ce texte a-t-il été écrit par une IA ou un humain ?
Score 0-100 (0 = certainement IA, 100 = certainement humain).
Cite les 3 phrases les plus artificielles et explique pourquoi.
Texte: {prose}
```
- **Cache key** = sha256(text + prompt_version + model_id)
- **FAIL-CLOSED** : si provider indispo → `fraud_score: null`, `method: 'calc_fallback'`, utiliser UNIQUEMENT le score CALC des 15 patterns

**`src/authenticity/authenticity-scorer.ts`** (combinaison CALC + LLM)
```typescript
export interface AuthenticityResult {
  calc_score: number;       // score 15 patterns [0-100]
  fraud_score: number | null;  // LLM [0-100] ou null
  combined_score: number;   // pondéré (CALC 60% + LLM 40%, ou CALC 100% si LLM null)
  pattern_hits: string[];   // IDs des patterns détectés
}

export async function scoreAuthenticity(
  prose: string,
  provider: SovereignProvider,
  cache: SemanticCache
): Promise<AuthenticityResult>
```

### Tests

**`tests/authenticity/ia-smell-patterns.test.ts`** :
- **AUTH-01** : texte artificiel IA → ≥ 10/15 patterns détectés
- **AUTH-04** : 15 patterns tous testés individuellement (1 test paramétrique ou 15 sous-assertions)

**`tests/authenticity/adversarial-judge-cache.test.ts`** :
- **AUTH-02** : cache → 2 appels identiques → 1 seule requête provider (mock compteur)
- **AUTH-03** : fraud_score reproductible (même texte = même score via cache)

### Evidence
```bash
mkdir -p proofpacks/sprint-11/11.2
npx vitest run 2>&1 > proofpacks/sprint-11/11.2/npm_test.txt
```

### Vérification
```bash
npx vitest run 2>&1  # ≥ 333 passed (329 + 4)
grep -rn "TODO\|FIXME\|HACK" src/authenticity/ tests/authenticity/
grep -rn ": any\b" src/authenticity/
```

---

## COMMIT 11.3 — 2 Nouveaux Axes Oracle (HYBRID)

**Message EXACT** : `feat(sovereign): new axes show_dont_tell (×3.0) + authenticity (×2.0) [ART-SDT-02, ART-AUTH-01]`

### Fichiers à créer

**`src/oracle/axes/show-dont-tell.ts`**
```typescript
export async function scoreShowDontTell(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<AxisScore>
// Poids : 3.0
// Méthode : HYBRID (CALC patterns par défaut, LLM OFF sauf feature flag)
// Score basé sur TellingResult.score de detectTelling()
```

**`src/oracle/axes/authenticity.ts`**
```typescript
export async function scoreAuthenticityAxis(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<AxisScore>
// Poids : 2.0
// Méthode : HYBRID (CALC 15 patterns + LLM adversarial cached)
// Score basé sur AuthenticityResult.combined_score
```

**Modifier `src/oracle/axes/index.ts`** (ou registre d'axes) pour enregistrer les 2 nouveaux axes.

### Tests
**`tests/oracle/axes/show-dont-tell.test.ts`** :
- **AXE-SDT-01** : retourne score [0,100], poids 3.0, méthode 'HYBRID'

**`tests/oracle/axes/authenticity.test.ts`** :
- **AXE-AUTH-01** : retourne score [0,100], poids 2.0, méthode 'HYBRID'

### Evidence
```bash
mkdir -p proofpacks/sprint-11/11.3
npx vitest run 2>&1 > proofpacks/sprint-11/11.3/npm_test.txt
```

### Vérification
```bash
npx vitest run 2>&1  # ≥ 335 passed (333 + 2)
```

---

## COMMIT 11.4 — Macro-Axe AAI (Authenticity & Art Index)

**Message EXACT** : `feat(sovereign): macro-axis AAI (Authenticity & Art Index) [ART-SCORE-01]`

### Fichier modifié : `src/oracle/macro-axes.ts`

**5ème macro-axe :**
```
AAI (Authenticity & Art Index)
  Poids global : 25%
  Plancher : 85
  Composition interne :
    show_dont_tell × 0.60 (60% de AAI) — car poids axe ×3.0 > ×2.0
    authenticity   × 0.40 (40% de AAI)
  Clamp [0..100], déterministe
```

**Redistribution poids V3 → V3.1 :**
```
  ECC : 33%  (inchangé ou ajusté)
  RCI : 17%  (inchangé ou ajusté)
  SII : 15%
  IFI : 10%
  AAI : 25%  (NOUVEAU)
  TOTAL = 100%
```

⚠️ IMPORTANT : vérifier que les poids totalisent EXACTEMENT 100%. Si le repo a déjà des poids définis, adapter la redistribution pour que la somme = 100%.

### Tests : `tests/oracle/macro-axes-aai.test.ts`

3 tests :
- **MACRO-AAI-01** : AAI calculé correctement (weighted mean SDT + AUTH)
- **MACRO-AAI-02** : plancher 85 respecté (score < 85 → flag)
- **MACRO-AAI-03** : redistribution poids totale = 100%

### Evidence
```bash
mkdir -p proofpacks/sprint-11/11.4
npx vitest run 2>&1 > proofpacks/sprint-11/11.4/npm_test.txt
```

### Vérification
```bash
npx vitest run 2>&1  # ≥ 338 passed (335 + 3)
```

---

## COMMIT 11.5 — Intégration Correction Loop (Prescriptions SDT + AUTH)

**Message EXACT** : `feat(sovereign): SDT + AUTH integrated in correction loop [ART-SDT-02, ART-AUTH-01]`

### Modifications

1. **DeltaReport** (`src/delta/delta-report.ts` ou structure existante) :
   - Inclure les résultats show-dont-tell (violations) et authenticity (pattern_hits)
   - Les TellingViolation deviennent des prescriptions avec `reason='telling'`

2. **Engine / correction loop** (`src/engine.ts` ou boucle existante) :
   - Si SDT score bas → prescriptions "remplacer tell par actions observables + sensoriel"
   - Si authenticity score bas → prescriptions "briser symétrie, ajouter micro-ruptures, réduire transitions parfaites, concrétiser"
   - Polish-V2 peut corriger avec `reason='telling'` et `reason='ia_smell'`
   - Ne jamais ajouter de bruit si score déjà haut (pas de correction si score > seuil)

3. **Respect budgets tokens existants** : toute partie LLM = cache obligatoire

### Tests

**`tests/prescriptions/sdt-auth-prescriptions.test.ts`** :
- **LOOP-SDT-01** : prose avec telling → prescription de correction générée
- **LOOP-AUTH-01** : prose avec IA smell → prescription générée

**`tests/pipeline/sprint-11-integration.test.ts`** (optionnel si la structure de test existante le permet) :
- Test d'intégration minimal vérifiant que SDT + AUTH sont branchés dans la loop

### Evidence
```bash
mkdir -p proofpacks/sprint-11/11.5
npx vitest run 2>&1 > proofpacks/sprint-11/11.5/npm_test.txt
```

### Vérification
```bash
npx vitest run 2>&1  # ≥ 340 passed (338 + 2 minimum)
```

---

## COMMIT 11.6 — Tests + Gates + ProofPack Sprint 11 + SEAL

**Message EXACT** : `chore(proofpack): sprint 11 proofpack + seal report`

### Étape 1 — Vérification invariants

| ID | Test(s) | Doit être PASS |
|----|---------|----------------|
| ART-SDT-01 | SDT-01..05 | ✅ |
| ART-SDT-02 | AXE-SDT-01, LOOP-SDT-01 | ✅ |
| ART-AUTH-01 | AUTH-01, AUTH-04, AXE-AUTH-01, LOOP-AUTH-01 | ✅ |
| ART-AUTH-02 | AUTH-02, AUTH-03 | ✅ |
| ART-SCORE-01 | MACRO-AAI-01..03 | ✅ |

### Étape 2 — Audits (BLOQUANTS, pas de dérogation)

```bash
# TODO/FIXME/HACK
grep -rn "TODO\|FIXME\|HACK" src/ tests/
# Attendu : 0

# any types (annotations, PAS commentaires)
grep -rn ": any\b" src/
# Attendu : 0

# ts-ignore
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/
# Attendu : 0
```

Si UN SEUL audit échoue → FIX AVANT le commit 11.6. Pas de "conditional pass".

### Étape 3 — ProofPack

```bash
mkdir -p proofpacks/sprint-11/11.6
npx vitest run 2>&1 > proofpacks/sprint-11/11.6/npm_test.txt
npx vitest run --reporter=verbose 2>&1 > proofpacks/sprint-11/11.6/gates_output.txt
grep -rn "TODO\|FIXME\|HACK" src/ tests/ > proofpacks/sprint-11/11.6/grep_no_todo.txt 2>&1 || echo "CLEAN" > proofpacks/sprint-11/11.6/grep_no_todo.txt
grep -rn ": any\b" src/ > proofpacks/sprint-11/11.6/grep_no_any.txt 2>&1 || echo "CLEAN" > proofpacks/sprint-11/11.6/grep_no_any.txt
```

### Étape 4 — Sprint11_SEAL_REPORT.md

Créer `proofpacks/sprint-11/Sprint11_SEAL_REPORT.md` :
```markdown
# OMEGA — Sprint 11 (SILENCE ORACLE + ADVERSARIAL JUDGE) — SEAL REPORT

## Résumé
| Attribut | Valeur |
|----------|--------|
| Sprint | 11 |
| Commits | 6 (11.1 → 11.6) |
| Tests avant | 324 |
| Tests après | X |
| Invariants | ART-SDT-01..02, ART-AUTH-01..02, ART-SCORE-01 (5/5 PASS) |
| Audits | 0 TODO, 0 any, 0 ts-ignore |
| Verdict | PASS |

## Commits
(lister hash, message, tests ajoutés pour chaque)

## Invariants
(table ID / description / tests / PASS)

## Modules créés
- src/silence/ (telling-patterns.ts, show-dont-tell.ts)
- src/authenticity/ (ia-smell-patterns.ts, adversarial-judge.ts, authenticity-scorer.ts)
- src/oracle/axes/show-dont-tell.ts
- src/oracle/axes/authenticity.ts
- Macro-axe AAI dans macro-axes.ts

## Architecture
detectTelling() ──────┐
                      ├──► AAI macro-axe (25%, plancher 85)
scoreAuthenticity() ──┘
  ├── 15 CALC patterns
  └── LLM adversarial judge (cached)
        ↓
  Prescriptions → Correction loop (reason='telling' | 'ia_smell')
```

### Commit
```bash
git add proofpacks/sprint-11/
git commit -m "chore(proofpack): sprint 11 proofpack + seal report"
```

⚠️ `.roadmap-hash.json` : NE PAS TOUCHER.

---

## RÉSUMÉ DES TESTS ATTENDUS

| Commit | Tests ajoutés | Baseline après |
|--------|--------------|----------------|
| 11.1 | SDT-01..05 (+5) | 329 |
| 11.2 | AUTH-01..04 (+4) | 333 |
| 11.3 | AXE-SDT-01, AXE-AUTH-01 (+2) | 335 |
| 11.4 | MACRO-AAI-01..03 (+3) | 338 |
| 11.5 | LOOP-SDT-01, LOOP-AUTH-01 (+2) | 340 |
| 11.6 | +0 (seal) | 340 |
| **TOTAL** | **+16** | **≥ 340** |

## CRITÈRES DE SEAL SPRINT 11

| # | Critère |
|---|---------|
| 1 | 30+ patterns SDT FR fonctionnels |
| 2 | False positive guard : "il était médecin" → pas flagged |
| 3 | 15 patterns IA-smell détectables par CALC |
| 4 | LLM adversarial judge cached (fraud_score reproductible) |
| 5 | 2 axes : show_dont_tell (×3.0), authenticity (×2.0) |
| 6 | Macro-axe AAI (25%, plancher 85) |
| 7 | Prescriptions SDT + AUTH dans correction loop |
| 8 | ≥ 340 tests PASS, 0 fail |
| 9 | 0 TODO, 0 any, 0 ts-ignore |
| 10 | ProofPack + SEAL_REPORT |
| 11 | `git status` clean |
| 12 | `.roadmap-hash.json` intact |

## FORMAT DE RENDU FINAL

```
📦 SPRINT 11 — SILENCE ORACLE + ADVERSARIAL JUDGE
Tests: X/X PASS
Invariants: ART-SDT-01..02, ART-AUTH-01..02, ART-SCORE-01 (5/5 PASS)
Audits: 0 TODO, 0 any, 0 ts-ignore
Modules: silence/, authenticity/, 2 axes, macro-axe AAI
ProofPack: proofpacks/sprint-11/
SEAL_REPORT: proofpacks/sprint-11/Sprint11_SEAL_REPORT.md
VERDICT: PASS/FAIL — SPRINT 11 SEALED / NOT SEALED
```

## EXÉCUTION
Tu exécutes maintenant le pré-vol, puis 11.1 → 11.6 dans l'ordre strict.
Aucun commit sauté. Aucun commit fusionné.
Chaque commit = tests + evidence + git add + git commit.
