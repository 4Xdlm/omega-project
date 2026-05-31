# OMEGA — PROMPT CLAUDE CODE — SPRINT 12
# MÉTAPHORES + SCORING V3.1 FINAL + TAG v3.0.0-art-foundations
# Date: 2026-02-16 — Version DÉFINITIVE

## RÔLE
Tu es l'ingénieur système OMEGA. Exécute Sprint 12 complet (commits 12.1 → 12.6).
PASS ou FAIL — pas de "conditional pass". Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT DU REPO
| Attribut | Valeur |
|----------|--------|
| Repo | `C:\Users\elric\omega-project` |
| Package | `packages/sovereign-engine` |
| HEAD | `60d73a88` (master) |
| Tag | `sprint-11-sealed` |
| Tests baseline | 340/340 PASS |
| Sprints SEALED | 9, 10, 11 |

## CONTRAINTES OMEGA (non négociables)
1. Déterminisme : même input + même config → même output → même hash
2. Zéro dette : TODO/FIXME/HACK = 0 ; @ts-ignore/@ts-nocheck = 0 ; `: any` = 0 (AUCUNE exception)
3. `.roadmap-hash.json` : NE PAS TOUCHER — revert immédiat si modifié
4. 1 commit = 1 unité logique, tests inclus, evidence archivée
5. Cache OBLIGATOIRE pour toute sortie LLM (metaphor novelty, fraud_score)
6. FAIL-CLOSED : provider LLM indispo → fallback CALC déterministe

## PRÉ-VOL OBLIGATOIRE (si échec → STOP)
```bash
cd packages/sovereign-engine
git status                    # DOIT être clean
npx vitest run 2>&1           # DOIT afficher 340 passed
git rev-parse --short HEAD    # DOIT afficher 60d73a88
mkdir -p proofpacks/sprint-12/00-preflight
npx vitest run 2>&1 > proofpacks/sprint-12/00-preflight/baseline.txt
git log --oneline -10 > proofpacks/sprint-12/00-preflight/git_log.txt
```

---

## INVARIANTS SPRINT 12

| ID | Description |
|----|-------------|
| ART-META-01 | Blacklist contient ≥ 500 métaphores mortes FR |
| ART-META-02 | Zéro dead metaphor dans prose finale (post-correction) |
| ART-META-03 | metaphor_novelty axe LLM-judged, cache obligatoire |
| ART-SCORE-01 | Scoring V3.1 : 5 macro-axes (ECC, RCI, SII, IFI, AAI) |
| ART-SCORE-02 | Seuil SEAL : 93 (monté de 92) |
| ART-SCORE-03 | Tous macro-axes plancher ≥ 85, ECC plancher ≥ 88 |
| ART-SCORE-04 | Non-régression : tous les tests existants TOUJOURS PASS |

---

## COMMIT 12.1 — Dead Metaphor Blacklist FR (500+)

**Message EXACT** : `feat(sovereign): dead metaphor blacklist FR (500+) [ART-META-01]`

### Fichier à créer : `src/metaphor/dead-metaphor-blacklist.ts`

```typescript
export interface DeadMetaphor {
  canonical: string;        // forme canonique minuscule
  category: string;         // CORPS | NATURE | LUMIERE | COMBAT | EAU | TEMPS | ANIMAL | OBJET | ABSTRAIT
}

export const DEAD_METAPHORS_FR: DeadMetaphor[]
// ≥ 500 entrées, catégorisées

export function isDeadMetaphor(phrase: string): { found: boolean; matches: string[] }
// Normalize (minuscule, accents normalisés) puis cherche
```

**Catégories obligatoires** (répartir ≥ 500 entrées) :
- CORPS : "le cœur serré", "les larmes aux yeux", "le sang glacé", "des papillons dans le ventre", "un nœud à l'estomac", "les bras lui en tombèrent", "avoir le souffle coupé"...
- NATURE : "un silence de mort", "un froid glacial", "le vent hurlait", "une tempête de sentiments"...
- LUMIÈRE : "une lueur d'espoir", "un regard lumineux", "l'ombre d'un doute", "voir la lumière au bout du tunnel"...
- COMBAT : "une pluie de coups", "une bataille intérieure", "armé de courage"...
- EAU : "des larmes comme des perles", "noyé dans ses pensées", "un flot de paroles"...
- TEMPS : "le temps s'arrêta", "les heures s'égrenaient", "un temps de plomb"...
- ANIMAL : "rusé comme un renard", "doux comme un agneau", "une mémoire d'éléphant"...
- OBJET : "un mur de silence", "une prison dorée", "une épée de Damoclès"...
- ABSTRAIT : "un océan de tristesse", "une montagne de problèmes"...

**Matching** : `normalize(phrase).includes(normalize(entry.canonical))`
**Normalisation** : toLowerCase + NFD decompose + strip accents

### Tests : `tests/metaphor/dead-metaphor-blacklist.test.ts`

4 tests :
- **BL-01** : `DEAD_METAPHORS_FR.length >= 500`
- **BL-02** : "le cœur serré" → détecté (`found: true`)
- **BL-03** : "le cœur d'un réacteur nucléaire" → PAS détecté (pas dans blacklist — contexte technique)
- **BL-04** : normalisation accent/casse fonctionne ("Le Cœur Serré" → détecté)

### Evidence
```bash
mkdir -p proofpacks/sprint-12/12.1
npx vitest run 2>&1 > proofpacks/sprint-12/12.1/npm_test.txt
echo "Blacklist count: $(grep -c 'canonical' src/metaphor/dead-metaphor-blacklist.ts)" > proofpacks/sprint-12/12.1/blacklist_count.txt
```

---

## COMMIT 12.2 — Metaphor Novelty Axe (LLM-judged)

**Message EXACT** : `feat(sovereign): metaphor novelty axe (×1.5) [ART-META-02, ART-META-03]`

### Fichiers à créer

**`src/metaphor/metaphor-detector.ts`**
```typescript
export interface MetaphorHit {
  text: string;
  position: number;
  type: 'metaphor' | 'comparison' | 'analogy';
  is_dead: boolean;       // dans blacklist
  novelty_score: number;  // 0-100, LLM-judged ou CALC fallback
}

export async function detectMetaphors(
  prose: string,
  provider: SovereignProvider,
  cache: SemanticCache
): Promise<MetaphorHit[]>
// LLM détecte métaphores/comparaisons dans le texte
// Cache key = sha256(prose + prompt_version + model_id)
// FAIL-CLOSED : si provider down → retourner [] (pas d'erreur)
```

**`src/metaphor/novelty-scorer.ts`**
```typescript
export interface MetaphorNoveltyResult {
  dead_count: number;
  total_metaphors: number;
  dead_ratio: number;       // 0-1
  avg_novelty: number;      // 0-100
  final_score: number;      // 0-100 (100 = très original)
}

export async function scoreMetaphorNovelty(
  metaphors: MetaphorHit[],
  blacklist: DeadMetaphor[]
): Promise<MetaphorNoveltyResult>
// Score = avg_novelty × (1 - dead_ratio)
// Si aucune métaphore → score 70 (neutre, pas pénalisé)
```

**`src/oracle/axes/metaphor-novelty.ts`**
```typescript
export async function scoreMetaphorNoveltyAxis(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<AxisScore>
// Poids : 1.5
// Méthode : HYBRID (blacklist CALC + LLM novelty)
// Cache obligatoire
```

Modifier `src/oracle/axes/index.ts` pour enregistrer le nouvel axe.

### Tests

**`tests/metaphor/novelty-scorer.test.ts`** :
- **META-SCORE-01** : prose avec clichés ("le cœur serré", "les larmes aux yeux") → score bas
- **META-SCORE-02** : prose avec métaphores originales → score élevé
- **META-SCORE-03** : prose sans aucune métaphore → score 70 (neutre)

### Evidence
```bash
mkdir -p proofpacks/sprint-12/12.2
npx vitest run 2>&1 > proofpacks/sprint-12/12.2/npm_test.txt
```

---

## COMMIT 12.3 — Scoring V3.1 (5 macro-axes, 14 axes, seuil 93)

**Message EXACT** : `feat(sovereign): scoring V3.1 (5 macro-axes, 14 axes, seuil 93) [ART-SCORE-01,02,03]`

### Fichier modifié : `src/oracle/macro-axes.ts` + `src/config.ts`

**Scoring V3.1 complet :**

**14 axes :**
| # | Axe | Poids | Méthode | Macro-axe |
|---|-----|-------|---------|-----------|
| 1 | tension_14d | ×3.0 | CALC | ECC |
| 2 | emotion_coherence | ×2.5 | CALC | ECC |
| 3 | interiority | ×2.0 | LLM | ECC |
| 4 | impact | ×2.0 | LLM | ECC |
| 5 | physics_compliance | ×1.0 | CALC | ECC |
| 6 | rhythm | ×1.0 | CALC | RCI |
| 7 | signature | ×1.0 | CALC | RCI |
| 8 | hook_presence | ×1.0 | LLM | RCI |
| 9 | anti_cliche | ×1.0 | CALC | SII |
| 10 | necessity | ×1.0 | LLM | SII |
| 11 | metaphor_novelty | ×1.5 | HYBRID | SII |
| 12 | sensory_density | ×1.5 | HYBRID | IFI |
| 13 | show_dont_tell | ×3.0 | HYBRID | AAI |
| 14 | authenticity | ×2.0 | HYBRID | AAI |

**Note sur `restraint`** : la roadmap le mentionne mais il est calculé à partir du Silence Oracle (SDT inverse). Si l'axe `restraint` n'existe pas encore comme axe séparé, NE PAS le créer ici — utiliser les 14 axes ci-dessus. Si un 14ème slot est déjà pris par un axe existant, adapter.

**5 macro-axes :**
| Macro | Poids | Plancher | Axes composants |
|-------|-------|----------|-----------------|
| ECC | 33% | 88 | tension_14d, emotion_coherence, interiority, impact, physics_compliance |
| RCI | 17% | 85 | rhythm, signature, hook_presence |
| SII | 15% | 85 | anti_cliche, necessity, metaphor_novelty |
| IFI | 10% | 85 | sensory_density (+ restraint si existant) |
| AAI | 25% | 85 | show_dont_tell, authenticity |
| **TOTAL** | **100%** | | |

**Config mise à jour :**
```typescript
SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD = 93  // monté de 92
SOVEREIGN_CONFIG.MACRO_WEIGHTS = { ecc: 0.33, rci: 0.17, sii: 0.15, ifi: 0.10, aai: 0.25 }
SOVEREIGN_CONFIG.MACRO_FLOORS = { ecc: 88, rci: 85, sii: 85, ifi: 85, aai: 85 }
```

⚠️ IMPORTANT : vérifier que la mise à jour du seuil (92→93) et des poids macro NE CASSE PAS les tests existants. Si le scoring existant est trop lié aux seuils actuels, adapter les tests de calibration (pas les seuils).

### Tests : `tests/oracle/scoring-v31.test.ts`

5 tests :
- **SCORE-V31-01** : 5 macro-axes calculés correctement
- **SCORE-V31-02** : seuil 93 respecté (score < 93 → pas SEAL)
- **SCORE-V31-03** : planchers respectés (ECC < 88 → FAIL même si composite > 93)
- **SCORE-V31-04** : somme poids macro = 100% (0.33+0.17+0.15+0.10+0.25 = 1.00)
- **SCORE-V31-05** : 14 axes tous scorés (aucun undefined/NaN)

### Evidence
```bash
mkdir -p proofpacks/sprint-12/12.3
npx vitest run 2>&1 > proofpacks/sprint-12/12.3/npm_test.txt
```

---

## COMMIT 12.4 — Recalibration 5 CAL-CASE

**Message EXACT** : `feat(sovereign): V3.1 recalibration on 5 CAL-CASE [ART-SCORE-04]`

### Action
1. Relancer les 5 CAL-CASE existants (`tests/calibration/`) avec scoring V3.1 complet
2. Si des tests de calibration échouent à cause du nouveau seuil 93 → adapter les **valeurs attendues** dans les tests (pas le seuil)
3. Documenter : anciens scores V3 vs nouveaux V3.1 dans un fichier evidence
4. Vérifier que le seuil 93 est atteignable (au moins 1 CAL-CASE au-dessus)

### Tests
Les 5 CAL-CASE existants doivent PASSER. Si adaptation nécessaire, c'est un ajustement de calibration (valeurs de référence), pas un changement de logique.

### Evidence
```bash
mkdir -p proofpacks/sprint-12/12.4
npx vitest run 2>&1 > proofpacks/sprint-12/12.4/npm_test.txt
# Capturer comparaison V3 vs V3.1
echo "V3.1 recalibration complete" > proofpacks/sprint-12/12.4/recalibration_report.txt
```

---

## COMMIT 12.5 — Non-Régression + ProofPack V2

**Message EXACT** : `feat(sovereign): complete non-regression + proofpack V2 [ART-SCORE-04]`

### Actions
1. TOUS les tests existants PASS (340 baseline + nouveaux Sprint 12)
2. ProofPack V2 complet : MANIFEST.json, HASHES.sha256, EVIDENCE.md
3. Vérification qu'AUCUN invariant des sprints précédents n'est cassé :
   - ART-SEM-01..05 (Sprint 9) ✅
   - ART-POL-01..06 (Sprint 10) ✅
   - ART-SDT-01..02, ART-AUTH-01..02, ART-SCORE-01 (Sprint 11) ✅
   - ART-META-01..03, ART-SCORE-01..04 (Sprint 12) ✅

### Audits BLOQUANTS
```bash
grep -rn "TODO\|FIXME\|HACK" src/ tests/       # Attendu : 0
grep -rn ": any\b" src/                          # Attendu : 0
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/   # Attendu : 0
```
Si UN SEUL audit échoue → FIX AVANT commit.

### Evidence
```bash
mkdir -p proofpacks/sprint-12/12.5
npx vitest run 2>&1 > proofpacks/sprint-12/12.5/npm_test.txt
npx vitest run --reporter=verbose 2>&1 > proofpacks/sprint-12/12.5/gates_output.txt
grep -rn "TODO\|FIXME\|HACK" src/ tests/ > proofpacks/sprint-12/12.5/grep_no_todo.txt 2>&1 || echo "CLEAN" > proofpacks/sprint-12/12.5/grep_no_todo.txt
grep -rn ": any\b" src/ > proofpacks/sprint-12/12.5/grep_no_any.txt 2>&1 || echo "CLEAN" > proofpacks/sprint-12/12.5/grep_no_any.txt
```

### SEAL_REPORT : `proofpacks/sprint-12/Sprint12_SEAL_REPORT.md`
```markdown
# OMEGA — Sprint 12 (MÉTAPHORES + SCORING V3.1) — SEAL REPORT

## Résumé
| Attribut | Valeur |
|----------|--------|
| Sprint | 12 |
| Commits | 6 (12.1 → 12.6) |
| Tests avant | 340 |
| Tests après | X |
| Invariants | ART-META-01..03, ART-SCORE-01..04 (7/7 PASS) |
| Audits | 0 TODO, 0 any, 0 ts-ignore |
| Verdict | PASS |

## Modules créés
- src/metaphor/ (dead-metaphor-blacklist.ts, metaphor-detector.ts, novelty-scorer.ts)
- src/oracle/axes/metaphor-novelty.ts
- Scoring V3.1 : 5 macro-axes, 14 axes, seuil 93

## Architecture V3.1
14 axes → 5 macro-axes → composite → SEAL threshold 93
ECC (33%) | RCI (17%) | SII (15%) | IFI (10%) | AAI (25%)
```

---

## COMMIT 12.6 — Tag v3.0.0-art-foundations

**Message EXACT** : `chore(release): tag v3.0.0-art-foundations`

### Actions
1. Dernier `npx vitest run` → PASS
2. `git status` → clean
3. Commit ProofPack si pas encore fait
4. **NE PAS tagger dans ce commit** — retourner le verdict et laisser Francky tagger manuellement

### Verdict attendu
```
📦 SPRINT 12 — MÉTAPHORES + SCORING V3.1
Tests: X/X PASS
Invariants: ART-META-01..03, ART-SCORE-01..04 (7/7 PASS)
Audits: 0 TODO, 0 any, 0 ts-ignore
Scoring: V3.1 — 5 macro-axes, 14 axes, seuil 93
Blacklist: 500+ dead metaphors FR
ProofPack: proofpacks/sprint-12/
SEAL_REPORT: proofpacks/sprint-12/Sprint12_SEAL_REPORT.md
VERDICT: PASS/FAIL — SPRINT 12 SEALED / NOT SEALED
READY FOR TAG: v3.0.0-art-foundations
```

---

## RÉSUMÉ DES TESTS ATTENDUS

| Commit | Tests ajoutés | Baseline après |
|--------|--------------|----------------|
| 12.1 | BL-01..04 (+4) | 344 |
| 12.2 | META-SCORE-01..03 (+3) | 347 |
| 12.3 | SCORE-V31-01..05 (+5) | 352 |
| 12.4 | +0 (recalibration) | 352 |
| 12.5 | +0 (non-regression) | 352 |
| 12.6 | +0 (tag prep) | 352 |
| **TOTAL** | **+12** | **≥ 352** |

## MILESTONE
Ce sprint achève les FONDATIONS ARTISTIQUES (Sprints 9-12).
Après tag : Sprints 13-20 = raffinements (Voice Genome, Reader Phantom, Phonetic Engine, Temporal Architect, Benchmark, Calibration).

## EXÉCUTION
Tu exécutes maintenant le pré-vol, puis 12.1 → 12.6 dans l'ordre strict.
Aucun commit sauté. Aucun commit fusionné.
Si tu atteins une limite de message, indique où tu en es et on relance.
