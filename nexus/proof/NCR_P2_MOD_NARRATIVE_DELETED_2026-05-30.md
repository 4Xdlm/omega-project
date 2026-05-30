# NCR_P2_MOD_NARRATIVE_DELETED : suppression du package orphelin mod-narrative (stub mort, dépendance fantôme)

**Status**: RESOLVED (package supprimé) · **Severity**: LOW · **Date**: 2026-05-30
**Décision**: Tribunal 2/2 unanime (Gemini SUPPRIMER / ChatGPT SUPPRIMER) + Architecte carte blanche · dispatch P2 audit total
**Réfs**: NCR_AUDIT_TODO_FALSE_ALARM (le seul vrai TODO du repo vivait ici), audit total 2026-05-29

## Issue (mécanisme)
`packages/mod-narrative` (231 LOC, 2 fichiers) = **anomalie topologique** :
- **Orphelin** : `@omega/mod-narrative` importé **0 fois** dans le monorepo.
- **Stub mort** : `createEmotionV2Adapter()` (src/emotionv2-adapter/provider.ts) ne fait que `throw new Error('Not yet connected to GENESIS FORGE...')`.
- **Dépendance fantôme** : référence `@omega/genesis-forge` (3 occurrences lignes 70/202/205) — package **inexistant** (seul `@omega/genesis-planner` existe). Jamais branchable en l'état.

## Action
- Retrait de `packages/mod-narrative` des `workspaces` (package.json racine).
- `git rm -r packages/mod-narrative` (suppression totale — purge, pas archivage : trop maigre et non réversiblement utile, contrairement à @omega/oracle archivé).
- Vérifications post-suppression : `@omega/mod-narrative` = 0 réf · `@omega/genesis-forge` = 0 réf (les 3 étaient toutes internes à mod-narrative) · root TSC = 0 erreur.

## Distinction vs P2-A (oracle)
- `@omega/oracle` (5305 LOC) = **ARCHIVÉ** (réversible, masse + histoire justifient la conservation).
- `mod-narrative` (231 LOC, stub throw, dep fantôme) = **SUPPRIMÉ** (rien à conserver, anomalie pure).

## Verdict
- Statut : RESOLVED. Working tree topologiquement plus propre (un orphelin + une dépendance fantôme éliminés).
- Faiblesses : aucune (0 import, 0 régression). Le seul "vrai TODO" du repo disparaît avec le stub → NCR_AUDIT_TODO_FALSE_ALARM clos de fait.
- Action requise : aucune. Réversible via git history si jamais EmotionV2/genesis-forge devient réel.
