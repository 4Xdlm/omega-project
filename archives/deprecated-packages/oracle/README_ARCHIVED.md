# @omega/oracle — ARCHIVÉ (2026-05-30)

**Statut** : ARCHIVÉ / DÉPRÉCIÉ (réversible) · **Décision** : Tribunal 2/2 unanime + Architecte (dispatch P2 audit total)
**Origine** : audit total 2026-05-29 → P2 dead-code triage.

## Raison de l'archivage
- **0 import réel** : `from '@omega/oracle'` / `require('@omega/oracle')` = **0 occurrence** dans tout le monorepo (vérifié 2026-05-30).
- Le scoring Oracle réellement utilisé en production vit dans **`packages/sovereign-engine/src/oracle/`** (macro-axes, aesthetic-oracle, axes/*). Ce package `@omega/oracle` est un **doublon dormant**, maintenu artificiellement en vie par des balayages mécaniques (dernier touch 2026-05-25 = propagation de renommage `@omega/observability`, pas un usage).
- 5305 LOC / 15 fichiers : trop volumineux pour une suppression sèche → **archivé** (réversible, conserve l'histoire et les patterns).

## Réversibilité
Pour réactiver : `git mv archives/deprecated-packages/oracle packages/oracle` + ré-ajouter `"packages/oracle"` aux `workspaces` du `package.json` racine.

## Ne pas confondre
`@omega/oracle` (ce package, archivé) ≠ `sovereign-engine/src/oracle/` (l'Oracle V3 actif : ECC/RCI/SII/IFI/AAI, judgeAestheticV3). Le second reste pleinement actif et n'est PAS affecté.
