# OMEGA — INSTRUCTION CLAUDE CODE — COMMIT 10.2
# Sprint 10 (POLISH-V2) — Micro-Rewrite Engine
# Date: 2026-02-16

## RÔLE

Tu es l'ingénieur système OMEGA. Exécute le commit 10.2 du Sprint 10 (POLISH-V2).
PASS ou FAIL — aucun entre-deux. Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT ACTUEL DU REPO

| Attribut | Valeur |
|----------|--------|
| Repo | `C:\Users\elric\omega-project` |
| Package | `packages/sovereign-engine` |
| HEAD | `0799badd` (master) |
| Tests baseline | 308/308 PASS (49 fichiers) |
| Commit 10.1 | ✅ DONE — `src/polish/sentence-surgeon.ts` (types + constantes) |

### Types déjà définis (commit 10.1) dans `src/polish/sentence-surgeon.ts` :
- `MicroPatchReason` — raison de correction
- `MicroPatch` — trace unitaire (sentence_idx, original, rewritten, reason, score_delta, accepted)
- `SurgeonConfig` — config (max_corrections_per_pass=15, max_passes=1, min_improvement=2.0, dry_run=false)
- `SurgeonResult` — résultat complet (patches, prose_before, prose_after, score_before, score_after, pass_count)

### SovereignProvider actuel (`src/types.ts`) — 7 méthodes :
```typescript
export interface SovereignProvider {
  scoreInteriority(prose: string, context: { readonly pov: string; readonly character_state: string }): Promise<number>;
  scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): Promise<number>;
  scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number>;
  scoreImpact(opening: string, closing: string, context: { readonly story_premise: string }): Promise<number>;
  applyPatch(prose: string, pitch: CorrectionPitch, constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] }): Promise<string>;
  generateDraft(prompt: string, mode: string, seed: string): Promise<string>;
  generateStructuredJSON(prompt: string): Promise<unknown>;
}
```

⚠️ `rewriteSentence()` N'EXISTE PAS ENCORE. Tu DOIS l'ajouter dans CE commit.

### Fixtures disponibles :
- `tests/fixtures/mock-packet.ts` → ForgePacket mock
- `tests/fixtures/mock-prose.ts` → Prose mock
- `tests/fixtures/mock-provider.ts` → MockSovereignProvider (implements SovereignProvider)

## PRÉ-VOL OBLIGATOIRE

Avant toute modification :
```bash
cd packages/sovereign-engine
git status  # DOIT être clean
npx vitest run 2>&1  # DOIT afficher 308 passed (308)
```
Si ≠ 308 PASS → STOP. Ne pas continuer.

## COMMIT 10.2 — MICRO-REWRITE ENGINE

### Invariants : ART-POL-01, ART-POL-02, ART-POL-03

### Étape 1 — Étendre SovereignProvider

**Fichier** : `src/types.ts`

Ajouter à l'interface `SovereignProvider` :
```typescript
rewriteSentence(sentence: string, reason: string, context: {
  prev_sentence: string;
  next_sentence: string;
}): Promise<string>;
```

### Étape 2 — Étendre MockSovereignProvider

**Fichier** : `tests/fixtures/mock-provider.ts`

Ajouter l'implémentation mock DÉTERMINISTE :
```typescript
async rewriteSentence(sentence: string, reason: string, context: {
  prev_sentence: string;
  next_sentence: string;
}): Promise<string> {
  // Retour déterministe : préfixer "[CORR:" + reason + "] " + sentence
  return `[CORR:${reason}] ${sentence}`;
}
```

### Étape 3 — Implémenter surgeonPass()

**Fichier** : `src/polish/sentence-surgeon.ts` (compléter le fichier existant)

```typescript
export async function surgeonPass(
  prose: string,
  packet: ForgePacket,
  provider: SovereignProvider,
  scorer: (prose: string) => Promise<number>,
  config: SurgeonConfig
): Promise<SurgeonResult>
```

**Algorithme EXACT** :
1. Split prose en phrases (méthode déterministe, regex sur `.!?` + gestion guillemets)
2. Scorer prose complète via `scorer()` → `score_before`
3. Pour les N pires phrases (N = `config.max_corrections_per_pass`, default 15) :
   a. Construire contexte : `{ prev_sentence, next_sentence }`
   b. Appeler `provider.rewriteSentence(sentence, reason, context)`
   c. Reconstituer prose avec phrase réécrite
   d. Re-scorer prose COMPLÈTE via `scorer()`
   e. Si `score_after > score_before + config.min_improvement` → accepter (créer MicroPatch avec `accepted: true`)
   f. Sinon → revert prose, créer MicroPatch avec `accepted: false`
4. Si `config.dry_run === true` → produire les patches diagnostiques mais NE PAS modifier la prose (tous `accepted: false`)
5. Retourner `SurgeonResult` complet

**Règles strictes** :
- JAMAIS accepter une correction si `score_after ≤ score_before` (ART-POL-01)
- Max 15 corrections par passe (ART-POL-02)
- Chaque correction tracée dans un `MicroPatch` complet (ART-POL-03)
- Le `reason` pour chaque phrase à corriger peut être déterminé par un heuristique simple (score bas → 'weak_score')

### Étape 4 — Tests

**Fichier à créer** : `tests/polish/sentence-surgeon.test.ts`

5 tests EXACTS :
- **SURG-01** : prose avec 1 phrase faible → phrase corrigée (mock provider retourne version améliorée, scorer retourne score amélioré)
- **SURG-02** : correction qui dégrade → revertée, `patch.accepted === false` (ART-POL-01)
- **SURG-03** : prose avec 20 phrases faibles → max 15 corrections appliquées (ART-POL-02)
- **SURG-04** : `dry_run: true` → tous les patches ont `accepted: false`, prose inchangée
- **SURG-05** : `SurgeonResult` contient patches complets avec tous champs (sentence_idx, original, rewritten, reason, score_delta) (ART-POL-03)

**Stratégie de test** :
- Utiliser `MockSovereignProvider` (étendu avec `rewriteSentence`)
- Scorer mock : fonction simple qui retourne un score basé sur la longueur ou un mapping connu
- Prose mock : construire des phrases déterministes avec des "faiblesses" identifiables

### Étape 5 — Vérification

```bash
# Tests complets
npx vitest run 2>&1

# Attendu : 308 + 5 = 313 passed (ou plus si sous-tests)
# Zéro fail, zéro skip

# Audits
grep -rn "TODO\|FIXME" src/ tests/
grep -rn ": any\b" src/
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/

# Preuve
mkdir -p proofpacks/sprint-10/10.2
npx vitest run 2>&1 > proofpacks/sprint-10/10.2/npm_test.txt
```

### Étape 6 — Commit

```bash
git add src/types.ts src/polish/sentence-surgeon.ts tests/polish/sentence-surgeon.test.ts tests/fixtures/mock-provider.ts
git commit -m "feat(sovereign): micro-rewrite engine [ART-POL-01, ART-POL-02, ART-POL-03]"
```

⚠️ NE PAS toucher à `.roadmap-hash.json`. Si `git status` le montre modifié → `git checkout -- .roadmap-hash.json` AVANT le commit.

## CRITÈRES PASS

| # | Critère |
|---|---------|
| 1 | `SovereignProvider` a 8 méthodes (7 + rewriteSentence) |
| 2 | `MockSovereignProvider` implémente `rewriteSentence` (déterministe) |
| 3 | `surgeonPass()` exporté et fonctionnel |
| 4 | 5 tests SURG-01..05 PASS |
| 5 | Total tests ≥ 313 PASS, 0 fail |
| 6 | Zéro TODO, zéro `any`, zéro `@ts-ignore` |
| 7 | `git status` clean après commit |
| 8 | `.roadmap-hash.json` NON modifié |

## FORMAT DE RENDU

```
📦 LIVRABLE — Commit 10.2 — Micro-Rewrite Engine
Invariants: ART-POL-01, ART-POL-02, ART-POL-03
Tests: X/X PASS (dont 5 nouveaux SURG-01..05)
Gates: PASS/FAIL
Git: feat(sovereign): micro-rewrite engine [ART-POL-01, ART-POL-02, ART-POL-03]
VERDICT: PASS/FAIL
```
