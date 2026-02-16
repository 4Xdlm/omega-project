# OMEGA — INSTRUCTION CLAUDE CODE — COMMIT 10.3
# Sprint 10 (POLISH-V2) — Re-Score Guard
# Date: 2026-02-16

## RÔLE

Tu es l'ingénieur système OMEGA. Exécute le commit 10.3 du Sprint 10 (POLISH-V2).
PASS ou FAIL — aucun entre-deux. Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT ACTUEL DU REPO

| Attribut | Valeur |
|----------|--------|
| Repo | `C:\Users\elric\omega-project` |
| Package | `packages/sovereign-engine` |
| HEAD | `af335ecc` (master) |
| Tests baseline | 313/313 PASS |
| Commit 10.1 | ✅ DONE — types + constantes |
| Commit 10.2 | ✅ DONE — surgeonPass() + rewriteSentence() |

### Ce qui existe déjà (Sprint 10) :
- `src/polish/sentence-surgeon.ts` — types (MicroPatch, SurgeonConfig, SurgeonResult) + surgeonPass()
- `src/types.ts` — SovereignProvider avec 8 méthodes (dont rewriteSentence)
- `tests/fixtures/mock-provider.ts` — MockSovereignProvider complet
- Config existante : `SOVEREIGN_CONFIG` avec planchers par axe — RÉUTILISER, ne pas inventer

## PRÉ-VOL OBLIGATOIRE

```bash
cd packages/sovereign-engine
git status  # DOIT être clean
npx vitest run 2>&1  # DOIT afficher 313 passed (313)
```
Si ≠ 313 PASS → STOP. Ne pas continuer.

## COMMIT 10.3 — RE-SCORE GUARD

### Invariant : ART-POL-01 (micro-correction JAMAIS acceptée si score_after ≤ score_before)

### Fichier à créer : `src/polish/re-score-guard.ts`

**Fonction EXACTE :**
```typescript
export async function reScoreGuard(
  original_prose: string,
  modified_prose: string,
  packet: ForgePacket,
  provider: SovereignProvider
): Promise<{
  accepted: boolean;
  score_before: number;
  score_after: number;
  details: string;
}>
```

**Algorithme EXACT :**
1. Scorer `original_prose` sur TOUS les axes (V3 complet — utiliser le scoring existant dans le repo)
2. Scorer `modified_prose` sur TOUS les axes
3. Comparer :
   a. `composite_after > composite_before + min_improvement` → condition 1
   b. AUCUN axe ne descend sous son plancher → condition 2
   c. Les DEUX conditions vraies → `accepted: true`
   d. Sinon → `accepted: false`
4. `details` : chaîne descriptive avec composite before/after + axes qui ont baissé + axes sous plancher

**Règle cardinale : une correction qui améliore un axe mais en détruit un autre = REJET.**

**Config :**
- `min_improvement` : réutiliser `DEFAULT_MIN_IMPROVEMENT` de `sentence-surgeon.ts` (2.0) ou constante dédiée documentée
- Planchers : réutiliser ceux existants dans `SOVEREIGN_CONFIG` — NE PAS inventer de valeurs

### Tests

**Fichier à créer** : `tests/polish/re-score-guard.test.ts`

4 tests EXACTS :
- **GUARD-01** : correction qui améliore composite ET respecte tous planchers → `accepted: true`
- **GUARD-02** : correction qui dégrade 1 axe → `accepted: false`
- **GUARD-03** : correction neutre (delta < min_improvement) → `accepted: false`
- **GUARD-04** : améliore composite MAIS casse un plancher → `accepted: false`

**Stratégie de test :**
- Utiliser `MockSovereignProvider` avec scorer mock configurable
- Le scorer mock doit retourner des scores déterministes permettant de simuler les 4 cas
- Chaque test vérifie `accepted`, `score_before`, `score_after`, et que `details` est non-vide

### Vérification

```bash
# Tests complets
npx vitest run 2>&1

# Attendu : 313 + 4 = 317 passed (ou plus)
# Zéro fail, zéro skip

# Audits
grep -rn "TODO\|FIXME" src/ tests/
grep -rn ": any\b" src/
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/

# Preuve
mkdir -p proofpacks/sprint-10/10.3
npx vitest run 2>&1 > proofpacks/sprint-10/10.3/npm_test.txt
```

### Commit

```bash
git add src/polish/re-score-guard.ts tests/polish/re-score-guard.test.ts
git commit -m "feat(sovereign): re-score guard (zero regression) [ART-POL-01]"
```

⚠️ NE PAS toucher à `.roadmap-hash.json`. Si `git status` le montre modifié → `git checkout -- .roadmap-hash.json` AVANT le commit.

## CRITÈRES PASS

| # | Critère |
|---|---------|
| 1 | `reScoreGuard()` exporté depuis `src/polish/re-score-guard.ts` |
| 2 | Utilise les planchers existants de SOVEREIGN_CONFIG |
| 3 | 4 tests GUARD-01..04 PASS |
| 4 | Total tests ≥ 317 PASS, 0 fail |
| 5 | Zéro TODO, zéro `any`, zéro `@ts-ignore` |
| 6 | `git status` clean après commit |
| 7 | `.roadmap-hash.json` NON modifié |

## FORMAT DE RENDU

```
📦 LIVRABLE — Commit 10.3 — Re-Score Guard
Invariant: ART-POL-01
Tests: X/X PASS (dont 4 nouveaux GUARD-01..04)
Gates: PASS/FAIL
Git: feat(sovereign): re-score guard (zero regression) [ART-POL-01]
VERDICT: PASS/FAIL
```
