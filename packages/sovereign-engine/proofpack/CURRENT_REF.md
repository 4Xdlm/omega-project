# Current Proofpack Reference

**Active seal** : phase-s-mini-tribunal-3.1
**Updated** : 2026-05-17
**Supersedes** : phase-s-r7 (2026-04-20, V1.1, reste immuable en archive)

## Règle

Tout test d'invariant `INV-VAL-*`, tout bench traçable, tout audit scellé doit
utiliser `phase-s-mini-tribunal-3.1/` comme source de vérité courante. Les seals
précédents `phase-s-sealed/` et `phase-s-r7/` restent accessibles pour audit
historique mais ne sont plus la référence active.

Scripts de validation et tests d'invariants lisent ce fichier pour résoudre
le sceau actif, puis chargent `proofpack/<active_seal>/HASHES.sha256`.

## Historique

- `phase-s-sealed`         : scellé 2026-04-13, V1 OMEGA, commit `0c3cbc48`
- `phase-s-r7`             : scellé 2026-04-20, V1.1 OMEGA, commit head `9a2a6f97`
- `phase-s-mini-tribunal-3.1` : scellé 2026-05-17, Mini-Tribunal Phase 3.1 TS mass-fix, commit head à venir

## Règles dures

1. `phase-s-sealed/` reste immuable à perpétuité. Aucune modification directe, aucun renommage, aucune suppression.
2. `phase-s-r7/` reste immuable à perpétuité (archive). Aucune modification directe.
3. `phase-s-mini-tribunal-3.1/` est la référence courante jusqu'à la prochaine itération.
4. Toute future itération crée un nouveau `phase-s-<id>/` + update de ce fichier. Jamais de remplacement, jamais d'écrasement.
5. `HASHES.sha256` le plus récent est référencé ici (actuellement `phase-s-mini-tribunal-3.1/HASHES.sha256`).
