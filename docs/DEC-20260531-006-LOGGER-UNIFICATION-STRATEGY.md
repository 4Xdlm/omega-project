# DEC-20260531-006: Stratégie d'unification du logging (console.* → Logger injectable)

**Status**: PROPOSED (ratification Architecte requise)
**Date**: 2026-05-31
**Participants**: Claude Code (IA Principal), Francky (Architecte, autorité finale)
**Severity**: MEDIUM

## Context

Audit nocturne 2026-05-31 (read-only) : le moteur OMEGA contient **358 appels `console.*`** dans `packages/*/src` (hors tests), dont **60 fichiers hors-CLI** (cœur lib). Répartition : sovereign-engine **150**, mycelium-bio 58, omega-governance 47, omega-metrics 26, scribe-engine 24, omega-segment-engine 14, autres < 10.

Or **DEUX implémentations `Logger` existent déjà** et divergent par contrainte technique :
- `omega-runner/src/logger/index.ts` — `createLogger(): Logger` (`debug/info/warn/error(msg)`, `getEntries()`, `toText()`). **Volontairement SANS timestamp** (commentaire : « no timestamps in hashed output ») → conforme à la **règle cardinale DÉTERMINISME** (la sortie de run est hashée SHA256). Déjà adopté par `run-create/run-forge/run-full`.
- `headless-runner/src/output.ts` — `createLogger(clock, minLevel): Logger` (`debug/info/warn/error(message, context?)`, `getEntries()`, `formatLogEntries`). **AVEC timestamp** (`clock.nowISO()`) + contexte structuré → affichage riche, mais **incompatible avec une sortie hashée**.

Ce n'est donc pas une simple duplication : deux besoins réels (déterminisme vs affichage riche). Migrer les 358 `console.*` sans stratégie risquerait (1) de casser le déterminisme du moteur (golden runs, replay SHA256) si un logger à timestamp est injecté sur le chemin chaud, (2) de casser des tests capturant stdout, (3) de figer une 3ᵉ implémentation ad hoc.

## Options

### Option A : Sweep global immédiat (console.* → un logger)
- **Description** : remplacer les 358 `console.*` par un logger en une campagne.
- **Pros** : dette éliminée d'un coup.
- **Cons** : viole DÉTERMINISME (150 sites sur le chemin moteur hashé) ; viole MINIMIZE IT ; non atomique ; risque de régression stdout/golden runs massif ; ne résout pas la divergence des 2 loggers.
- **Effort** : HIGH (et dangereux).

### Option B : Logger canonique unifié + migration phasée (CHOISI)
- **Description** : définir UN `Logger` canonique (interface superset : `debug/info/warn/error(message, context?)` + `getEntries()`), avec un **mode déterministe** (sans timestamp, pour sortie hashée) ET un mode affichage (timestamp via `Clock` injecté). Réconcilier les 2 impls existantes sous ce contrat (omega-runner = mode déterministe ; headless-runner = mode affichage). Migrer **par paquet, gaté (TSC+vitest), du moins risqué au plus risqué** ; **moteur sovereign-engine EN DERNIER**, avec vérification déterminisme (golden runs / hash inchangés) avant/après. **Conserver `console.*` légitimes** dans les points d'entrée CLI (sortie utilisateur).
- **Pros** : respecte DÉTERMINISME (mode sans timestamp sur chemin hashé) ; atomique par paquet ; réversible ; réconcilie les 2 loggers ; cohérence progressive.
- **Cons** : effort réparti sur plusieurs sessions ; injection du logger = threading de signatures (ripple par paquet).
- **Effort** : HIGH (mais sûr, incrémental).

### Option C : Statu quo (garder console.* + 2 loggers)
- **Description** : ne rien changer.
- **Pros** : zéro risque immédiat.
- **Cons** : dette persistante ; 2 loggers divergents ; pas de niveaux de log centralisés ; testabilité réduite (sortie non capturable proprement).
- **Effort** : NUL.

## Decision

**Chosen** : **Option B** (logger canonique + migration phasée).

**Rationale** : la coexistence des 2 loggers n'est pas un bug mais l'expression de deux contraintes réelles (déterminisme du run hashé vs affichage riche). Un sweep (Option A) casserait la règle cardinale DÉTERMINISME sur les 150 sites du moteur et n'est pas réversible atomiquement. Le statu quo (C) laisse une dette structurelle. B est la seule voie qui respecte DÉTERMINISME + MINIMIZE IT + atomicité, tout en convergeant. **Aucune migration n'a été exécutée cette nuit** : le sweep autonome du moteur est explicitement interdit sans sign-off déterminisme de l'Architecte.

## Points Validated
1. 358 `console.*` mesurés (hors tests), 60 fichiers hors-CLI — [MESURE 2026-05-31].
2. 2 `Logger` préexistants identifiés et lus (omega-runner sans timestamp / headless-runner avec) — [MESURE].
3. omega-runner omet les timestamps PAR DESIGN (sortie hashée) — contrainte déterminisme confirmée par commentaire source.
4. `console.*` en point d'entrée CLI = sortie utilisateur **légitime** (à conserver).
5. Le moteur sovereign-engine (150 sites) est sur le chemin déterministe → migration EN DERNIER, avec vérif golden runs.

## Plan phasé proposé (sur GO_CODE par phase)
- **P0** : choisir le paquet hôte du `Logger` canonique (candidat : `orchestrator-core`, déjà dépendance basse de headless-runner). Définir l'interface superset + mode déterministe. 1 commit + tests.
- **P1** : migrer 1 paquet leaf non-déterministe à faible volume (ex. `search` 4, `hardening` 1) comme preuve, gaté.
- **P2..Pn** : migrer paquet par paquet (governance, metrics, segment-engine…), gaté, hors moteur.
- **P-final** : sovereign-engine (150), en mode déterministe, avec comparaison golden runs / hash avant-après OBLIGATOIRE. STOP+NCR si divergence.

## Consequences
- Convergence vers un logging cohérent, à niveaux, capturable (testabilité accrue).
- Déterminisme préservé (mode sans timestamp sur chemin hashé).
- Devient plus difficile : chaque migration de paquet exige un threading d'injection (effort réparti).
- Risque accepté : aucun tant que P-final (moteur) n'est pas lancé ; ce dernier exige sign-off déterminisme.

## Corrections Applied
- Correction du cadrage initial : « 136 console.log » (1ère estimation) → **358 console.*** réels après comptage exhaustif (log+warn+error+info+debug). La tâche « logger » présentée comme cleanup est en réalité une initiative d'architecture pluri-session.
- Aucune autre correction de revue (ADR PROPOSED, en attente Tribunal/Architecte).
