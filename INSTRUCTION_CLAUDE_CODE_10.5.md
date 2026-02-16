# OMEGA — INSTRUCTION CLAUDE CODE — COMMIT 10.5
# Sprint 10 (POLISH-V2) — Emotion-to-Action Integration
# Date: 2026-02-16

## RÔLE

Tu es l'ingénieur système OMEGA. Exécute le commit 10.5 du Sprint 10 (POLISH-V2).
PASS ou FAIL. Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT ACTUEL DU REPO

| Attribut | Valeur |
|----------|--------|
| HEAD | `a2294738` (master) |
| Tests baseline | 320/320 PASS (sovereign-engine) |
| Commits 10.1-10.4 | ✅ DONE |

### Fichiers Sprint 9 à réutiliser :
- `src/semantic/emotion-to-action.ts` — contient `mapEmotionToActions()`
- `src/semantic/emotion-contradiction.ts` — contient `detectContradictions()`

### Fichier à modifier :
- `src/input/constraint-compiler.ts` — compilateur de contraintes existant

## PRÉ-VOL OBLIGATOIRE

```bash
cd packages/sovereign-engine
git status  # DOIT être clean
npx vitest run 2>&1  # DOIT afficher 320 passed (320)
```
Si ≠ 320 PASS → STOP.

## COMMIT 10.5 — EMOTION-TO-ACTION INTEGRATION

### Invariant : ART-SEM-05 (rétrocompatibilité + enrichissement)

### Fichier modifié : `src/input/constraint-compiler.ts`

**Modifications EXACTES (3 ajouts, aucune suppression) :**

1. **Après `compilePhysicsSection()`**, injecter les actions corporelles :
   - Importer `mapEmotionToActions` depuis `../semantic/emotion-to-action`
   - Extraire les émotions dominantes du packet (si disponibles dans `packet.emotion_brief` ou structure similaire)
   - Appeler `mapEmotionToActions(emotions)` pour obtenir les actions corporelles
   - Ajouter au prompt compilé : `"Au lieu de NOMMER l'émotion, MONTRE-la via ces actions : {actions}"`

2. **Injecter les instructions de contradiction** si détectées :
   - Importer `detectContradictions` depuis `../semantic/emotion-contradiction`
   - Si des contradictions existent dans le packet → ajouter au prompt : instructions spécifiques de gestion
   - Si aucune contradiction → ne rien ajouter (pas de bruit)

3. **Respecter le budget 800 tokens** :
   - Les ajouts (actions + contradictions) ne doivent PAS faire dépasser le budget token du prompt
   - Si le budget est dépassé → tronquer les actions (garder les 3 plus pertinentes)
   - Le budget est vérifié APRÈS compilation complète

**ATTENTION** : ne pas casser les 13 tests existants dans `tests/constraints/constraint-compiler.test.ts`. Les nouveaux éléments sont ADDITIFS — ils enrichissent le prompt sans modifier le comportement existant.

### Tests

**Fichier à créer** : `tests/constraints/constraint-compiler-emotion.test.ts`

3 tests EXACTS :
- **COMPILE-NEW-01** : prompt compilé contient des actions corporelles quand emotions présentes dans packet
- **COMPILE-NEW-02** : prompt contient instructions contradiction quand contradictions détectées
- **COMPILE-NEW-03** : budget 800 tokens respecté MÊME avec actions + contradictions ajoutées (test de calcul, pas LLM)

**Stratégie de test :**
- Utiliser mock packet avec `emotion_brief` contenant émotions
- Vérifier que le prompt final contient les chaînes attendues
- Vérifier que la longueur du prompt ne dépasse pas le budget

### Vérification

```bash
npx vitest run 2>&1
# Attendu : 320 + 3 = 323 passed, 0 fail
# Les 13 tests constraint-compiler existants DOIVENT toujours PASS

grep -rn "TODO\|FIXME" src/ tests/
grep -rn ": any\b" src/
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/

mkdir -p proofpacks/sprint-10/10.5
npx vitest run 2>&1 > proofpacks/sprint-10/10.5/npm_test.txt
```

### Commit

```bash
git add src/input/constraint-compiler.ts tests/constraints/constraint-compiler-emotion.test.ts
git commit -m "feat(sovereign): emotion-to-action mapping in constraint compiler [ART-SEM-05]"
```

⚠️ NE PAS toucher à `.roadmap-hash.json`. Revert si modifié.

## CRITÈRES PASS

| # | Critère |
|---|---------|
| 1 | `mapEmotionToActions()` intégré dans constraint-compiler |
| 2 | `detectContradictions()` intégré (conditionnel) |
| 3 | Budget 800 tokens respecté |
| 4 | 13 tests existants constraint-compiler TOUJOURS PASS |
| 5 | 3 tests COMPILE-NEW-01..03 PASS |
| 6 | Total tests ≥ 323 PASS, 0 fail |
| 7 | Zéro TODO/any/ts-ignore |
| 8 | `git status` clean, `.roadmap-hash.json` intact |

## FORMAT DE RENDU

```
📦 LIVRABLE — Commit 10.5 — Emotion-to-Action Integration
Invariant: ART-SEM-05
Tests: X/X PASS (dont 3 nouveaux COMPILE-NEW-01..03)
Gates: PASS/FAIL
Git: feat(sovereign): emotion-to-action mapping in constraint compiler [ART-SEM-05]
VERDICT: PASS/FAIL
```
