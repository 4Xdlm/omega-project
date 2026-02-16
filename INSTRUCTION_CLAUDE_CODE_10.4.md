# OMEGA — INSTRUCTION CLAUDE CODE — COMMIT 10.4
# Sprint 10 (POLISH-V2) — Paragraph-Level Patch (Quantum Suture)
# Date: 2026-02-16

## RÔLE

Tu es l'ingénieur système OMEGA. Exécute le commit 10.4 du Sprint 10 (POLISH-V2).
PASS ou FAIL — aucun entre-deux. Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT ACTUEL DU REPO

| Attribut | Valeur |
|----------|--------|
| Repo | `C:\Users\elric\omega-project` |
| Package | `packages/sovereign-engine` |
| HEAD | `0fa8ce1d` (master) |
| Tests baseline | 317/317 PASS (sovereign-engine) |
| Commit 10.1 | ✅ DONE — types + constantes |
| Commit 10.2 | ✅ DONE — surgeonPass() + rewriteSentence() |
| Commit 10.3 | ✅ DONE — reScoreGuard() |

### Ce qui existe déjà (Sprint 10) :
- `src/polish/sentence-surgeon.ts` — types + surgeonPass()
- `src/polish/re-score-guard.ts` — reScoreGuard() (167 lignes)
- `src/types.ts` — SovereignProvider avec 8 méthodes (dont rewriteSentence)
- `tests/fixtures/mock-provider.ts` — MockSovereignProvider complet

### Dépendance clé pour 10.4 :
`reScoreGuard()` de `src/polish/re-score-guard.ts` — tu DOIS l'utiliser pour valider/rejeter le patch paragraphe.

## PRÉ-VOL OBLIGATOIRE

```bash
cd packages/sovereign-engine
git status  # DOIT être clean
npx vitest run 2>&1  # DOIT afficher 317 passed (317)
```
Si ≠ 317 PASS → STOP. Ne pas continuer.

## COMMIT 10.4 — PARAGRAPH-LEVEL PATCH (QUANTUM SUTURE)

### Invariant : ART-POL-01 (micro-correction JAMAIS acceptée si score_after ≤ score_before)

### Fichier à créer : `src/polish/paragraph-patch.ts`

**Fonction EXACTE :**
```typescript
export async function patchParagraph(
  prose: string,
  paragraph_index: number,
  diagnosis: string,
  action: string,
  packet: ForgePacket,
  provider: SovereignProvider
): Promise<{ patched_prose: string; accepted: boolean }>
```

**Algorithme EXACT :**
1. Split prose en paragraphes (séparateur `\n\n`)
2. Valider que `paragraph_index` est dans les bornes (sinon → return original, accepted: false)
3. Geler tous les paragraphes sauf celui à `paragraph_index`
4. Construire prompt chirurgical pour le paragraphe ciblé :
   ```
   [DIRECTIVE OMEGA — PATCH PARAGRAPHE]
   DIAGNOSTIC : {diagnosis}
   ACTION : {action}
   PARAGRAPHE À CORRIGER :
   {paragraph}
   CONTRAINTES :
   - Ne modifier QUE ce paragraphe
   - Garder même longueur ±20%
   - Garder même ton et registre
   PARAGRAPHE CORRIGÉ :
   ```
5. Appeler `provider.rewriteSentence(paragraph, diagnosis, { prev_sentence: prev_paragraph, next_sentence: next_paragraph })` pour réécrire le paragraphe ciblé
6. Reconstituer prose avec le paragraphe réécrit
7. Appeler `reScoreGuard(original_prose, modified_prose, packet, provider)` pour vérifier
8. Si `accepted` → retourner `{ patched_prose: modified, accepted: true }`
9. Si rejeté → retourner `{ patched_prose: original_prose, accepted: false }`

**Règle** : Si une prescription Physics cible un `segment_index` spécifique, l'utiliser comme diagnostic. Si l'info n'existe pas dans le contexte, ne pas inventer.

### Tests

**Fichier à créer** : `tests/polish/paragraph-patch.test.ts`

3 tests EXACTS :
- **PARA-01** : patch paragraphe index 2 (3ème) → seul ce paragraphe est modifié, les autres identiques byte-à-byte
- **PARA-02** : paragraphes 0, 1, 3 (tous sauf index 2) sont inchangés après patch → vérification stricte (=== original)
- **PARA-03** : patch qui dégrade le score → revert, retourne prose originale, `accepted: false`

**Stratégie de test :**
- Prose mock : 4 paragraphes séparés par `\n\n`
- MockSovereignProvider retourne paragraphe modifié déterministe
- Scorer mock configurable : retourner score amélioré pour PARA-01/02, score dégradé pour PARA-03
- Vérifier que reScoreGuard est bien appelé (intégration réelle, pas mock)

### Vérification

```bash
# Tests complets
npx vitest run 2>&1

# Attendu : 317 + 3 = 320 passed (ou plus)
# Zéro fail, zéro skip

# Audits
grep -rn "TODO\|FIXME" src/ tests/
grep -rn ": any\b" src/
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/

# Preuve
mkdir -p proofpacks/sprint-10/10.4
npx vitest run 2>&1 > proofpacks/sprint-10/10.4/npm_test.txt
```

### Commit

```bash
git add src/polish/paragraph-patch.ts tests/polish/paragraph-patch.test.ts
git commit -m "feat(sovereign): paragraph-level patch (quantum suture) [ART-POL-01]"
```

⚠️ NE PAS toucher à `.roadmap-hash.json`. Si `git status` le montre modifié → `git checkout -- .roadmap-hash.json` AVANT le commit.

## CRITÈRES PASS

| # | Critère |
|---|---------|
| 1 | `patchParagraph()` exporté depuis `src/polish/paragraph-patch.ts` |
| 2 | Utilise `reScoreGuard()` pour validation (pas de scoring indépendant) |
| 3 | Seul le paragraphe ciblé est modifié, les autres gelés |
| 4 | 3 tests PARA-01..03 PASS |
| 5 | Total tests ≥ 320 PASS, 0 fail |
| 6 | Zéro TODO, zéro `any`, zéro `@ts-ignore` |
| 7 | `git status` clean après commit |
| 8 | `.roadmap-hash.json` NON modifié |

## FORMAT DE RENDU

```
📦 LIVRABLE — Commit 10.4 — Paragraph-Level Patch (Quantum Suture)
Invariant: ART-POL-01
Tests: X/X PASS (dont 3 nouveaux PARA-01..03)
Gates: PASS/FAIL
Git: feat(sovereign): paragraph-level patch (quantum suture) [ART-POL-01]
VERDICT: PASS/FAIL
```
