# OMEGA — INSTRUCTION CLAUDE CODE — COMMIT 10.6
# Sprint 10 (POLISH-V2) — Remplacement des 3 no-op
# Date: 2026-02-16

## RÔLE

Tu es l'ingénieur système OMEGA. Exécute le commit 10.6 du Sprint 10 (POLISH-V2).
PASS ou FAIL. Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ⚠️ COMMIT CRITIQUE — LE PLUS COMPLEXE DU SPRINT

Ce commit change la signature de 3 fonctions (sync → async) ET remplace leur implémentation no-op par de vraies corrections. TOUS les call-sites doivent être mis à jour. Tester exhaustivement.

## ÉTAT ACTUEL DU REPO

| Attribut | Valeur |
|----------|--------|
| HEAD | `b4e12679` (master) |
| Tests baseline | 323/323 PASS (sovereign-engine) |
| Commits 10.1-10.5 | ✅ DONE |

### Modules Sprint 10 disponibles :
- `src/polish/sentence-surgeon.ts` — `surgeonPass()` + types MicroPatch
- `src/polish/re-score-guard.ts` — `reScoreGuard()`
- `src/polish/paragraph-patch.ts` — `patchParagraph()`

### Fonctions actuelles à remplacer (TOUTES no-op, sync) :
```
src/polish/musical-engine.ts      → polishRhythm(packet, prose): string → return prose
src/polish/anti-cliche-sweep.ts   → sweepCliches(packet, prose): string → return prose
src/polish/signature-enforcement.ts → enforceSignature(packet, prose): string → return prose
```

### Tests existants à surveiller :
- `tests/polish/sweep-noop.test.ts` — teste le comportement no-op actuel. Ce fichier DOIT être adapté ou renommé car le comportement change.

## PRÉ-VOL OBLIGATOIRE

```bash
cd packages/sovereign-engine
git status  # DOIT être clean
npx vitest run 2>&1  # DOIT afficher 323 passed (323)
```
Si ≠ 323 PASS → STOP.

## COMMIT 10.6 — REMPLACEMENT DES 3 NO-OP

### Invariants : ART-POL-04, ART-POL-05, ART-POL-06

### ⚠️ CHANGEMENT DE SIGNATURE (sync → async)

Les 3 fonctions passent de :
```typescript
function polishRhythm(packet: ForgePacket, prose: string): string
```
à :
```typescript
async function polishRhythm(packet: ForgePacket, prose: string, provider: SovereignProvider): Promise<string>
```

**TOUTES les call-sites** doivent être mises à jour avec `await`. Chercher TOUS les appels dans le repo :
```bash
grep -rn "polishRhythm\|sweepCliches\|enforceSignature" src/ tests/
```
Chaque appel doit devenir `await` + recevoir le `provider` en paramètre.

### A) `src/polish/musical-engine.ts` — polishRhythm()

**Implémentation :**
1. Détecter phrases monotones : 3+ phrases consécutives de même longueur (±10%)
2. Si monotonie détectée → appeler `surgeonPass()` avec `reason='rhythm'` sur les phrases concernées
3. `surgeonPass()` utilise `reScoreGuard()` internement → aucune régression possible
4. Retourner prose modifiée (ou originale si aucune correction acceptée par le guard)

**Règle** : si aucune monotonie détectée dans la prose d'entrée, la fonction PEUT retourner prose inchangée (pas de trigger = pas de correction). Le test NOOP-01 fournira une prose AVEC monotonie.

### B) `src/polish/anti-cliche-sweep.ts` — sweepCliches()

**Implémentation :**
1. Détecter clichés via la blacklist existante (réutiliser `computeClicheDelta` ou logique similaire déjà dans le repo)
2. Pour chaque cliché détecté → appeler `surgeonPass()` avec `reason='cliche'`
3. `reScoreGuard()` vérifie avant acceptation
4. Retourner prose modifiée

### C) `src/polish/signature-enforcement.ts` — enforceSignature()

**Implémentation :**
1. Mesurer `signature_hit_rate` (réutiliser logique existante `computeStyleDelta` ou similar)
2. Si hit_rate < seuil → identifier phrases sans signature words
3. Appeler `surgeonPass()` avec `reason='signature'`
4. `reScoreGuard()` vérifie avant acceptation

### D) Adapter `tests/polish/sweep-noop.test.ts`

Ce fichier teste le comportement no-op. Options :
- **Option A (recommandée)** : Renommer en `sweep-active.test.ts` et adapter les assertions pour vérifier que les fonctions NE SONT PLUS no-op
- **Option B** : Supprimer et remplacer par les nouveaux tests

### Tests EXACTS

**Fichier à créer** : `tests/polish/polish-active.test.ts` (ou adapter existant)

5 tests :
- **NOOP-01** : `polishRhythm()` sur prose avec 4 phrases de longueur identique → prose DIFFÉRENTE (ART-POL-04)
- **NOOP-02** : `sweepCliches()` sur prose contenant un cliché connu de la blacklist → prose DIFFÉRENTE (ART-POL-05)
- **NOOP-03** : `enforceSignature()` sur prose sans aucun signature word → prose DIFFÉRENTE (ART-POL-06)
- **NOOP-04** : les 3 fonctions respectent reScoreGuard (correction rejetée = prose originale retournée)
- **NOOP-05** : non-régression — les tests existants du module polish toujours PASS

**Stratégie de test :**
- MockSovereignProvider retourne corrections déterministes
- Scorer mock retourne score amélioré pour les corrections valides
- Prose mock construite spécifiquement pour triggerer chaque détection (monotonie, cliché, signature manquante)
- Vérifier que la prose retournée ≠ prose d'entrée quand trigger présent

### Vérification

```bash
npx vitest run 2>&1
# Attendu : ≥ 323 + 5 nouveaux - 4 anciens noop (si remplacés) = ~324+
# L'important : 0 fail, 0 skip

grep -rn "TODO\|FIXME" src/ tests/
grep -rn ": any\b" src/
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/

# Vérifier qu'AUCUN call-site n'appelle les fonctions en mode sync
grep -rn "polishRhythm\|sweepCliches\|enforceSignature" src/ | grep -v "async\|await\|import\|export\|test\|//"

mkdir -p proofpacks/sprint-10/10.6
npx vitest run 2>&1 > proofpacks/sprint-10/10.6/npm_test.txt
```

### Commit

```bash
git add src/polish/musical-engine.ts src/polish/anti-cliche-sweep.ts src/polish/signature-enforcement.ts tests/polish/
# Ajouter tout fichier call-site modifié
git add -u
git commit -m "feat(sovereign): replace 3 no-op polish functions with real corrections [ART-POL-04,05,06]"
```

⚠️ NE PAS toucher à `.roadmap-hash.json`. Revert si modifié.

## CRITÈRES PASS

| # | Critère |
|---|---------|
| 1 | `polishRhythm()` async, NE retourne PLUS prose inchangée sur trigger monotonie |
| 2 | `sweepCliches()` async, NE retourne PLUS prose inchangée sur trigger cliché |
| 3 | `enforceSignature()` async, NE retourne PLUS prose inchangée sur trigger signature |
| 4 | Les 3 utilisent reScoreGuard (pas de correction sans validation) |
| 5 | TOUS les call-sites mis à jour (await + provider) |
| 6 | 5 tests NOOP-01..05 PASS |
| 7 | Total tests ≥ 324 PASS, 0 fail |
| 8 | Zéro TODO/any/ts-ignore |
| 9 | `git status` clean, `.roadmap-hash.json` intact |

## FORMAT DE RENDU

```
📦 LIVRABLE — Commit 10.6 — Remplacement 3 no-op
Invariants: ART-POL-04, ART-POL-05, ART-POL-06
Tests: X/X PASS (dont 5 nouveaux NOOP-01..05)
Gates: PASS/FAIL
Git: feat(sovereign): replace 3 no-op polish functions with real corrections [ART-POL-04,05,06]
VERDICT: PASS/FAIL
```
