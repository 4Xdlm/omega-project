# P2 — Outils CJS hors-workspace : KEEP_BY_DESIGN (anti faux-positif d'audit)

**Statut** : RÉFÉRENCE · **Date** : 2026-05-30 · **Décision** : Tribunal 2/2 + Architecte (dispatch P2)
**But** : documenter le statut intentionnel de 4 dossiers de `packages/` qui n'ont PAS de `package.json` et ne sont PAS dans les workspaces racine — afin qu'un futur audit ne les reclasse pas en "dossiers cassés / poussière".

## Constat
L'audit total 2026-05-29 a flaggé 4 dossiers "sans package.json" comme ambigus. Investigation P2 → ce sont des **outils autonomes CommonJS (.cjs) + schémas JSON, avec tests**, volontairement hors du graphe npm. **NON dust. KEEP_BY_DESIGN.**

| Dossier | Contenu | Rôle |
|---|---|---|
| `packages/hostile/` | `generators.cjs` + `hostile.test.ts` | Générateur d'entrées hostiles (fuzzing / tests adverses) |
| `packages/sbom/` | `generator.cjs` + `sbom.test.ts` | Génération SBOM (Software Bill of Materials) |
| `packages/schemas/` | `manifest.schema.json`, `sealed-zones.schema.json`, `trust.v1.schema.json` + `validator.cjs` + `validator.test.ts` | Schémas JSON canon (zones scellées, trust) + validateur |
| `packages/trust-version/` | `compat.cjs`, `detector.cjs`, `migrate.cjs` + `version.test.ts` | Compat / détection / migration de versions de confiance |

## Caractéristiques (pourquoi hors workspace est correct)
- Ce sont des **scripts CJS** (`.cjs`), pas des packages TypeScript publiés → pas besoin de `package.json`/workspace.
- Chacun a un **test** (`*.test.ts`) → l'outillage est couvert.
- Dernière activité : 2026-01-29 (stables, pas abandonnés — outillage infra qui ne bouge que si le besoin change).
- Ils relèvent de l'appareil **NASA-Grade / sécurité** (SBOM, schémas de zones scellées, trust-version, génération hostile).

## Décision
**GARDER tel quel.** Aucune suppression, aucun ajout de `package.json` (ce serait les transformer à tort en packages npm). Ce document sert d'ancre : statut = `NON_NPM_TOOLING_CJS / KEEP_BY_DESIGN`.

## Verdict
- Statut : RÉFÉRENCE (clôture du point C du dispatch P2).
- Action requise : aucune. À citer si un futur audit re-flagge ces 4 dossiers.
