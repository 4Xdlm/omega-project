# OMEGA — Inventaire COMPLET des moteurs d'écriture (toutes versions) — 2026-05-31

**Auteur** : Claude Code · **Mode** : read-only (repo + git + blueprints + tsconfig) · **HEAD** : `b8ab4105`.
**But** : répondre à l'Architecte — *existe-t-il d'AUTRES versions du moteur (au-delà de scribe-engine / sovereign-engine) créées puis mises de côté ?* → **OUI : une 3ᵉ incarnation (ancêtre orphelin) + des archives de janvier.** Aucune option ne doit rester non contrôlée.

---

## 1. Les TROIS incarnations de la lignée « moteur d'écriture » (vivantes ou récentes)

| # | Emplacement | Identité | Créé | Statut runtime | Fichiers |
|---|---|---|---|---|---|
| **1 (ancêtre)** | **`src/scribe/` (monolithe racine)** | **« OMEGA SCRIBE v1.0.0 » — certifié NASA-GRADE AS9100D / DO-178C** (en-tête `src/scribe/runner.ts`) | **2026-01-01** | **ORPHELIN** : non inclus dans le `tsconfig` racine (qui ne build que `plugin-sdk` + `plugins/`), lancé par aucun script/app. Code gelé ~29/03. | 11 (.ts scribe) / 174 (tout `src/`) |
| **2 (production câblée)** | `packages/scribe-engine` | « governed writing engine » (réimplémentation étendue) | 2026-02-08 | **CÂBLÉ PROD** (`omega-runner → creation-pipeline → runScribe`) | 46 |
| **3 (qualité, bench-only)** | `packages/sovereign-engine` | scoring→moteur complet (K2 + S-Oracle V2 + R6 + Duel + Dédale) ; « moteur-production-v1 » selon ENGINE_STATUS | 2026-02-15 (K2 le 25/03) | **0 import librairie** ; bench-exercé | — |

**Lignée** : `src/scribe` v1.0.0 (Jan 1, certifié, ancêtre) → extraction/refonte en `scribe-engine` package (Feb 8) → `sovereign-engine` (Feb 15) qui absorbe la génération K2 (25/03). Le monolithe racine n'a jamais été supprimé (juste sorti du build).

## 2. Archives / snapshots de janvier (NE SONT PAS des moteurs vivants)
`omega-v44` (41 .ts, gelé 24/01), `omega-v44-phase7` (24 .ts), `omega_titanium_ultimate` (0 .ts, 11/01), `OMEGA_SNAPSHOTS` / `OMEGA_MASTER_DOSSIER_v3.21/3.61/3.83` (0 .ts, 24/01), `omega-narrative-genome` (16 .ts, 19/01). **0 marqueur de génération** (generateProse/weaveLLM/K2/forge/judgeAesthetic) → snapshots historiques, pas des moteurs de prose. `gateway/` (245 .ts) = Sentinel/Plugin (FROZEN), `apps/`/`omega-ui*` = UI. Aucun n'est un moteur d'écriture concurrent.

## 3. Autres composants de génération à NE PAS oublier (sous-modules, pas moteurs autonomes)
- `omega-forge` (dépendance de sovereign — composant de forge), `style-emergence-engine` (dép. creation-pipeline), `omega-segment-engine` (découpage), `genesis-planner` (plan, pas prose), `mycelium-bio` (ADN émotionnel = analyse). Ce sont des **briques**, pas des moteurs d'écriture complets parallèles.

## 4. Conséquence pour DEC-009 (fusion)
- La fusion concerne les **incarnations VIVANTES/RÉCENTES** : `scribe-engine` (#2) + `sovereign-engine` (#3). **Confirmé : ce sont les deux bons candidats.**
- **#1 (`src/scribe` v1.0.0)** = **ancêtre orphelin certifié** — superseded par #2. Il N'EST PAS un 3ᵉ candidat de fusion, MAIS :
  - c'est une **option à contrôler** (demande Architecte) : il contient le design ORIGINAL certifié AS9100D/DO-178C — potentiellement une **référence** pour la conception de la fusion (ce que le SCRIBE certifié faisait, et que les refontes ont peut-être perdu).
  - statut à trancher : **archiver explicitement** (comme `@omega/oracle`) OU **garder comme référence doctrinale**. À ne pas laisser en zone grise (orphelin non documenté = même piège que la dualité).
- Les archives janvier (omega-v44 etc.) = à laisser archivées, hors scope fusion.

## VERDICT
- Statut : **PASS** (inventaire exhaustif : 3 incarnations + archives classées).
- Confiance : Haute (tsconfig include + git dates + en-têtes de fichiers = preuves directes).
- Forces : répond OUI à la question (3ᵉ version trouvée = src/scribe v1.0.0 orphelin) ; confirme que scribe-engine + sovereign-engine sont les 2 bons candidats de fusion ; classe les archives (non-moteurs) ; aucune option laissée non contrôlée.
- Faiblesses : (1) je n'ai pas comparé ligne-à-ligne src/scribe v1.0.0 vs scribe-engine (la divergence de conception n'est pas chiffrée) ; (2) le root package.json a une anomalie de parse (Extra data ligne 70) à vérifier indépendamment.
- Action requise : intégrer #1 (src/scribe v1.0.0) à la décision (archiver ou référence). DEC-009 reste valide (fusion #2+#3) — l'ancêtre #1 ne change pas la cible mais complète l'inventaire des options.
