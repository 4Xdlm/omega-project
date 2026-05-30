# 🌙 NUIT OMEGA — Consolidé WP2→WP8 (read-only) + P3 MASTER PLAN

**Date** : 2026-05-30 · **HEAD** : `7028de81` (sync 0/0, tree clean) · **Mode** : lecture seule intégrale, ZÉRO code production.
**Dette casts `src` repo (hors tests/scripts), recomptée cette nuit** : ~79 — sovereign 40, scribe 19, omega-metrics 7, omega-runner 5, singles 8 (+1 faux positif grep).

---

## WP2 — Contrat Intent (scribe) : frontière JSON, pas fantôme
`intent` provient de `JSON.parse(readFileSync('intent.json')) as Record<string,unknown>` (scribe-llm.ts:66, weaver-llm.ts:31). Les 7 casts `(intent as any).intent/.canon/.constraints/.genome/.emotion` lisent les blocs d'un **artefact JSON composite**. Ce n'est ni un champ halluciné ni une injection runtime : c'est une **frontière de désérialisation**.
- **Fix (SPÉCIFIÉ cette nuit)** : l'artefact `intent.json` est un **`IntentPack` sérialisé** — interface déjà existante `creation-pipeline/src/types.ts:51` : `{ intent: Intent; canon: Canon; constraints: Constraints; genome: StyleGenomeInput; emotion: EmotionTarget; metadata }`. Forme **exactement** alignée sur les 7 casts. Écrit par `omega-runner/run-create.ts:43` (`content: intentCanonical`). → Typer `intent: IntentPack` (import depuis `@omega/creation-pipeline` ou `@omega/omega-metrics` qui le redéfinit aussi en types.ts:201 — **doublon à noter**) supprime les 7 `as any`.
  - **Pré-requis GO_CODE** : vérifier que `scribe-engine` peut importer `IntentPack` **sans créer de cycle de dépendances** (DAG actuel = 0 cycle). Sinon, mirror local de l'interface. Risque **moyen** (réduit de "à tracer" → "spécifié").

## WP3 — omega-metrics (7) + omega-runner (5)
- **metrics** : `report/generator.ts:135` (`report as unknown as MetricsReport` = assertion de construction) + `score/global.ts:58,59,72,76,77` (sous-scores typés → helper générique `Record<string,number>`). Casts d'**adaptation vers helpers numériques génériques**. Réductibles en rendant les helpers génériques typés. Risque bas-moyen.
- **runner** : 5× `versions/stages_completed as unknown as Record<string,string>/string[]` pour `generateRunId`/hashing (run-invariants, runCreate/runForge/runFull). **Frontière de canonicalisation/hashing** → entrée déterministe. Légitime, **KEEP** probable (toucher = risque sur les run_id déterministes).

## WP4 — Singles (8 réels + 1 faux positif)
- ⚠️ `truth-gate:119` = **FAUX POSITIF** grep (« transaction h**as any** verdict » dans un commentaire, pas un cast). Dette singles réelle = **8**.
- `creation-pipeline/engine.ts:71` `global_profile: {} as any` = **réductible** (même pattern que engine.ts/voice-genome → placeholder typé). Candidat sûr.
- `signal-registry:22` `producer as any` (`.includes`) + `emotion-gate:228` `relatedEntities as any` (type brandé EntityId) = mineurs, fixables.
- `sentinel-judge:48` `as unknown as Partial<T>` = paquet **ACTIVE** (pas de marqueur FROZEN trouvé ; le FROZEN doctrinal vise `gateway/sentinel/` + `packages/genome`, pas `sentinel-judge`). Frontière générique, bas priorité.
- `search:261`, `omega-release:52`, `omega-aggregate-dna:74` (`null as unknown as DNA`, commenté), `gold-cli:109` = frontières/placeholders, **KEEP**.

## WP5 — Hygiène repo
- **TODO/FIXME/XXX/HACK = 0** dans tout `packages/*/src` (hors tests). Le gap de couverture `gate:no-todo` est **SANS OBJET** (rien à attraper). Le « 43 TODO » d'avril était un faux signal déjà résolu.
- **SPOF canon-kernel = 14 dépendants réels** (re-confirmé).
- **Dead-code** : déjà traité en P2 (oracle archivé, mod-narrative supprimé, 4 CJS KEEP). Aucun nouveau mort détecté côté singles.

## WP6 — Santé tests
- **56 skipped sovereign** = 2 suites **délibérément** `describe.skip` : `bench/ncr-m2-v4-fusion.test.ts` (49, bench INVALID/fermé, cf NCR) + `oracle/tension-judge-harness.test.ts` (7, harness). **Pas des échecs stale** — skips intentionnels.
- **« 8 FAIL proofpack/validation »** = référence **STALE** (workspace CLAUDE.md daté 2026-04-13). Il n'existe **pas** de package proofpack/validation dédié (ce sont des sous-dossiers `sovereign-engine/src/`). Run actuel sovereign-engine = **2522 pass / 0 fail** → les 8 FAIL ne sont **pas reproductibles** aujourd'hui (résolus au fil des sprints). Confirmation full-monorepo = run gaté séparé (non lancé en autonomie nocturne : risque tests longs/Ollama).

## WP7 — Lockfile
- `package-lock.json` présent (163 KB, 277 refs), **déjà réconcilié** récemment (commit `ccbd5eb3`, P2 hostile, 5→2 stubs bénins après archivage oracle). État known-good. Clean-clone `npm ci` complet **différé** (lourd, faible valeur, état déjà connu).
- ⚠️ Note mineure : `package.json` racine est flaggé « binary » par grep (probable BOM/encodage) — à inspecter ultérieurement, non bloquant.

---

## WP8 — P3 MASTER PLAN (backlog priorisé par risque/ROI)

| Tier | Clusters | Casts | Risque | Action recommandée |
|---|---|---|---|---|
| **T1 — Wins sûrs** | scribe **groupe B** (scene.subtext cruft) ; `creation-pipeline:71` `{} as any` ; `signal-registry:22` | ~7 | Bas | `GO_CODE` direct, gate wrapper, 1 commit/cluster |
| **T2 — Typage à instruire** | scribe **groupe A** Intent (IntentArtifact, trace producteur) ; omega-metrics (helpers génériques) ; scribe **C** prosepack pov/tense (enums) | ~20 | Moyen | trace/design avant `GO_CODE`, tests-avant-patch |
| **T3 — Frontières (KEEP/doc)** | omega-runner (hashing) ; singles search/omega-release/aggregate-dna/gold-cli/emotion-gate ; sentinel-judge ; sovereign CAT-2/3/5 ; budget-tracker | ~30+ | — | documenter légitimité, NE PAS chasser |
| **T0 — INTERDIT** | sovereign **14D** (8) ; tout FROZEN/SEALED (`genome`, `gateway/sentinel`) | 8+ | — | NE PAS TOUCHER (FORBID-CANON-GARAGE) |

**Ordre d'exécution recommandé (sur `GO_CODE`)** : T1 d'abord (scribe-B → creation-pipeline → signal-registry), puis T2 cluster par cluster (Intent après trace producteur intent.json ; metrics ; prosepack enums). T3 = documenter en « légitime ». T0 = sanctuaire.

**Cible réaliste de dette réductible** : ~T1 (7) + T2 (~20) = **~27 casts** réellement adressables ; le reste (~52) = frontières légitimes ou interdit. La cible « zéro cast » reste rejetée (dogmatique).

---

## VERDICT (nuit WP2→WP8)
- Statut : **PASS** (7 work-packets read-only livrés, zéro code production touché).
- Confiance : Haute sur classifications ; Moyenne sur WP2 (schéma intent.json non encore tracé) et WP6 (8 FAIL non confirmés hors sovereign).
- Forces : dette entièrement triée par mécanisme et par tier risque/ROI ; 2 faux signaux démasqués (TODO, truth-gate « has any », 8 FAIL stale) ; master plan prêt pour décisions `GO_CODE` ; aucune supposition non balisée.
- Faiblesses : (1) producteur `intent.json` non tracé (bloque GO_CODE groupe A) ; (2) « 8 FAIL » non confirmés ailleurs (run full-monorepo gaté requis) ; (3) WP7 clean-clone complet non exécuté (différé). 
- Risques restants : aucun (lecture seule, rien patché).
- Action requise : `GO_CODE T1` pour matérialiser les wins sûrs (scribe-B + creation-pipeline + signal-registry) ; ou `GO_CODE <cluster>` ciblé. Par défaut sans GO_CODE, je reste en read-only.
