# NCR_AUDIT_TODO_FALSE_ALARM : la "dette 43 TODO" est un artefact de mesure — réel = 1 (dead code)

**Status**: RESOLVED (correction d'audit + traçage du seul vrai TODO)
**Severity**: LOW · **Date**: 2026-05-30 · **Origine**: audit total 2026-05-29 (finding F3)
**Réfs**: OMEGA_AUDIT_TOTAL_2026-05-29.md, EMP-14 §16 (rigueur), gate `gate:no-todo` (R13-TODO-00)

## Issue (mécanisme)
L'audit total a annoncé "43 TODO/FIXME/HACK" (finding F3). Mesure refaite avec délimiteurs de mots + analyse du contenu :
- **31 marqueurs** avec `\b(TODO|FIXME|HACK|XXX)\b` (grep case-insensitive).
- **30 sont des FAUX POSITIFS** : variables `todo` minuscules (`scripts/bench-dedale-night.ts`), le **script de gate `gate-no-todo.ts` lui-même** (qui *interdit* les TODO — contient le mot dans sa logique/messages), données de test (`'xxx'`, `kind:'HACK'`), lexique espagnol (`'despues de todo'` text-features.ts:313), descriptions de pattern (`char-xxx-NNN`), commentaire de fix passé ("was passing [] hack").
- **1 SEUL vrai marqueur TODO en MAJUSCULES** : `packages/mod-narrative/src/emotionv2-adapter/provider.ts:205` → `// TODO: Connect to @omega/genesis-forge EmotionBridge`.

Cause du faux compte : l'audit initial utilisait `TODO|FIXME|HACK|XXX` sans délimiteurs ni casse stricte → captait des sous-chaînes et des minuscules. **Correction : F3 ramené de 43 à 1.**

## Le seul vrai TODO = dead code
`createEmotionV2Adapter()` est un **placeholder qui `throw`** ("Not yet connected to GENESIS FORGE"). Il référence `@omega/genesis-forge` **qui n'existe pas** (seul `@omega/genesis-planner` existe). Le package `mod-narrative` est **orphelin** (`@omega/mod-narrative` importé 0 fois, 231 LOC, 2 fichiers). → ce TODO n'est pas de la dette active : c'est un stub mort dans un package non câblé référençant un package fantôme.

## Angle mort du gate (finding secondaire)
`gate:no-todo` (R13-TODO-00) ne scanne que `sovereign-engine/src` (`path.resolve(__dirname,'../src')`). Les 40 autres packages ne sont PAS couverts → le gate donne une fausse impression de "zéro TODO monorepo" alors qu'il ne protège qu'un package. C'est pourquoi le TODO de mod-narrative survit. **Ne PAS étendre le scan du gate à tout le monorepo tant que mod-narrative n'est pas résolu** (sinon il bloquerait tout commit).

## Décision
- **F3 corrigé** : dette TODO réelle = 1 marqueur (pas 43), dans du dead code.
- **Le TODO de mod-narrative est désormais tracké par ce NCR** → satisfait "pas de TODO sans issue" (EMP). L'édition du commentaire pour y référencer ce NCR est **différée à P2** : mod-narrative est un orphelin candidat à suppression/consolidation (cf P2 dead-code) ; toucher le commentaire avant la décision P2 = churn inutile.
- **Gate scope gap** : noté ; extension du scan du gate à tout le monorepo = amélioration future conditionnée à la résolution des orphelins (sinon blocage).

## Verdict
- Statut : RESOLVED (audit corrigé, TODO tracé, dead-code renvoyé à P2).
- Faiblesses : (1) mon audit a sur-compté par grep imprécis — leçon EMP-14 (mesure ≠ vérité tant que non vérifiée au contenu) ; (2) le gate ne couvre qu'1/41 packages.
- Action requise : P2 statue sur mod-narrative (wire @omega/genesis-forge inexistant impossible → suppression probable du stub/package). Extension gate = backlog.
