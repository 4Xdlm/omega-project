# NCR_GATE_NO_TODO_FALSE_POSITIVE_ES

**ID** : NCR_GATE_NO_TODO_FALSE_POSITIVE_ES
**Title** : `gate:no-todo` match `TODO` en SUBSTRING dans le mot espagnol "todo" (faux positif sur SIL_MARKERS multi-langue)
**Status** : **DRAFT_OPEN**
**Severity** : **LOW**
**Priority** : P3 (S10+)
**Opened** : 2026-05-17 (S10.3 Final Closure gate validation)
**Owner** : Francky + Claude

---

## 1. Résumé

Le script `packages/sovereign-engine/scripts/gate-no-todo.ts` cherche les marqueurs `TODO/FIXME/HACK` dans le code source pour empêcher la dette technique non documentée. Au gate `npm run gate:no-todo` 2026-05-17, **1 faux positif** détecté :

```
src/scoring/text-features.ts:313
  'despues de todo', 'por supuesto', 'ciertamente', 'sin duda',
```

Le mot espagnol `"todo"` (= "tout" en français) dans `'despues de todo'` ("après tout") matche le pattern `TODO` du gate. Ce n'est PAS un marqueur de dette technique mais un marqueur littéraire d'auto-narration espagnol (`SIL_MARKERS` multi-langue ligne 307-315).

## 2. Évidence empirique observée 2026-05-17

```ts
// [REPO] packages/sovereign-engine/src/scoring/text-features.ts:307-315
const SIL_MARKERS = [
  'apres tout', 'bien sur', 'evidemment', 'comment donc', "n'etait-ce pas",
  'car enfin', 'mais non', 'mais si', 'que diable', 'sapre',
  'certainement', 'decidement', 'vraiment', 'quelle idee', 'quel imbecile',
  'after all', 'of course', 'certainly', 'how odd', 'no doubt',
  'why not', 'what a', 'surely', 'indeed', 'obviously', 'well then',
  'despues de todo', 'por supuesto', 'ciertamente', 'sin duda',  // ← ligne 313
  'como no', 'claro', 'desde luego', 'evidentemente',
];
```

**Output gate (EXIT=1)** :
```
❌ Gate NO-TODO violated [R13-TODO-00]:
  src\scoring\text-features.ts:313
    'despues de todo', 'por supuesto', 'ciertamente', 'sin duda',
Found 1 TODO/FIXME/HACK markers.
```

## 3. Ce qui est PROUVÉ empiriquement

- 1 seul site faux positif sur tout le repo (sinon le gate aurait reporté plus)
- Le pattern `gate-no-todo.ts` matche substring `TODO` case-insensitive sans require uppercase ou colon
- Le marqueur littéraire `'despues de todo'` est intentionnel (vocabulaire multi-langue SIL = Self-Indulgent Locution)

## 4. Hypothèses sur cause racine

- **H1** : Gate pattern initialement design pour `// TODO:` ou `// FIXME:` mais implémenté en substring match sans constraints (uppercase, colon, comment marker)
- **H2** : SIL_MARKERS ajoutés ultérieurement avec content espagnol — le gate n'a pas anticipé ce match

## 5. Impact

- **Gate `:no-todo` FAIL bloquant** : empêche le tag `phase-s-s10-3-final-closure-2026-05-17` d'être empiriquement valide
- **Pas d'impact runtime** : `'despues de todo'` est utilisé correctement par `computeF28` pour détecter SIL multi-langue
- **Risque pédagogique** : tout nouveau dev qui touche ce file peut être bloqué par le gate sans comprendre que c'est un faux positif

## 6. Recommandation

**Option A — Strict gate match** (RECOMMANDÉE) : Modifier `scripts/gate-no-todo.ts` pour matcher uniquement :
- `TODO:` (avec colon)
- `// TODO ` (avec space après TODO, en commentaire)
- `// FIXME` / `// HACK` (idem)

Évite tous les faux positifs sur content multi-langue.

**Option B — Whitelist line** : Ajouter `// gate:no-todo-ignore` après la ligne 313 du fichier text-features.ts (mais ça nécessite que le gate supporte cette directive).

**Option C — Rename espagnol** : Remplacer `'despues de todo'` par `'despues-de-todo'` (avec tirets). Mais altère la sémantique du marker.

**Option D — Status quo** : Document NCR, accepter le PARTIAL_CLOSURE pour S10.3, fixer en sprint S10+ dédié.

## 7. Refs

- Site faux positif : `packages/sovereign-engine/src/scoring/text-features.ts:313`
- Gate script : `packages/sovereign-engine/scripts/gate-no-todo.ts`
- Gate fail log : `C:\Users\elric\Claude-Workspace\OMEGA\outputs\s10-3-gate-no-todo.log`
- Sprint context : S10.3 Final Closure pack 2026-05-17

---

**Doctrine** : NCR OVER HEROICS + PROVE IT (faux positif identifié empiriquement avant tag PARTIAL).
**Standard** : NASA-Grade L4 / DO-178C Level A.
