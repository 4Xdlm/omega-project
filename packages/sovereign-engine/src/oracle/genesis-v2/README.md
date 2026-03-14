# QUARANTAINE — oracle/genesis-v2/

**Status** : EXPÉRIMENTAL — DÉSACTIVÉ EN PRODUCTION

## Activation

Ce module n'est actif QUE si `process.env.GENESIS_V2 === '1'`.
En production standard, il est désactivé.

## Contenu

- `genesis-runner.ts` : flag d'activation + configuration
- `transcendent-planner.ts` : planification narrative pré-génération (LLM Step 0)
- `diffusion-runner.ts` : correcteur post-génération par diffusion itérative
- `paradox-gate.ts` : gate post-génération basé sur le plan
- `patch-dsl.ts` : DSL de patch chirurgical

## Règle absolue

**Jamais activer en production sans décision explicite de Francky (Architecte Suprême).**

Ce module est potentiellement utile pour le World Building macro en Phase V+,
mais n'a pas été certifié. Il ne fait pas partie du pipeline sovereign certifié Phase U.

## Certification

NOT CERTIFIED — hors périmètre Phase U (1536+ tests certifiés).
