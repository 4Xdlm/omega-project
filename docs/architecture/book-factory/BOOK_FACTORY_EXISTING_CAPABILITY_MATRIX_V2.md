# BOOK-FACTORY — Matrice de Capacité EXISTANTE V2 (Contrôle de Vérité Fonctionnel)

**Date** : 2026-06-05 · **Statut** : ARCHÉOLOGIE FONCTIONNELLE (read-only, ZÉRO code, ZÉRO design nouveau) · **Standard** : NASA-Grade L4
**Mandat** : Architecte + Tribunal (ChatGPT NO-GO construction / Gemini traque épistémique). *Trouver les modules existants même sous d'autres noms, par FONCTION et non par mot-clé. Chaque affirmation = chemin:ligne + statut. Distinguer existe / câblé / dormant / orphelin.*
**Complète** : `BOOK_EXISTING_MODULES_INVENTORY_v1.md`. **Tranche** : la question « matrice quantum (croyances/rêves/mensonges/faits) ».

---

## 0. RÉSULTAT EN UNE PHRASE
**La fonction « quantum » existe — sous le nom de RAILS truth/interpretation + PROMOTE + Subtext dramatic-irony — mais elle est FRAGMENTÉE en 4 implémentations et MAJORITAIREMENT LATENTE/DORMANTE.** Francky a raison : ce n'est pas à recoder, c'est à **consolider et câbler**. Le vrai danger révélé par ce contrôle : le repo contient **déjà ~4-5 "truth gates" et 3 "canons" concurrents** — ajouter naïvement des modules Book-Factory = fabriquer le 5ᵉ canon = le cancer que tu veux éviter.

---

## 1. Vocabulaire de statut (la distinction exigée par le Tribunal)
`existe ≠ câblé ≠ fiable ≠ adapté au livre long`. Je classe chaque module ainsi :
- **ACTIVE-WIRED** : importé ET invoqué par le pipeline de génération courant (creation-pipeline / sovereign / scribe).
- **LIVE-LATENT** : compile + listé « LIVE » dans l'IRM, MAIS sa machinerie cœur n'est **pas invoquée** par le pipeline (typé/testé, jamais construit au runtime).
- **DORMANT** : compile, **importé par personne** dans le pipeline courant.
- **ORPHAN** : ancien, non importé, supersédé.
- **FROZEN/SEALED** : protégé doctrinalement (genome, sentinel).
- **PLANNED** : doc/spec seulement, pas de code.

> ⚠ Piège IRM confirmé : `07_MODULE_LIFECYCLE_REGISTRY.json` marque `truth-gate`, `canon-kernel` = **"LIVE"**. Vérifié : « LIVE » = *présent + compile + repo_live_confirmed*, **PAS** *câblé dans la génération*. Ne jamais conclure « utilisable » depuis l'IRM seul (EMP-15 / DOCUMENTATION_TOPOLOGY).

---

## 2. LA COUCHE ÉPISTÉMIQUE / "QUANTUM" — DISSECTION (le cœur du mandat)

La fonction « séparer vrai / cru / menti / rêvé » **existe**, éclatée en 5 sous-fonctions :

### A. Faits vs Croyances = **RAILS truth / interpretation** — CODÉ, LATENT
- `packages/canon-kernel/src/types/transactions.ts:10` → `export type RailType = 'truth' | 'interpretation';` Chaque `CanonTx` porte `rail` (`:19`) + **chaînes de hash séparées par rail** (`truth-gate/src/validators/v-hash-chain.ts:40`, `gate/types.ts:106-107` `truth_head_hash` / `interpretation_head_hash`).
- **C'EST la matrice fait/croyance.** Un fait établi vit sur le rail `truth` ; une interprétation/croyance sur le rail `interpretation`. Les deux ne peuvent se contaminer (`v-rail-separation.ts:67-93` : truth ne référence pas `interp:`, interpretation ne modifie pas `canon:`/`truth:`).
- **Statut : LIVE-LATENT.** `canon-kernel` est importé partout — mais **uniquement pour `canonicalize`/`sha256`** (hash utils). Recherche `createCanonTx|PROMOTE|rail:'truth'` hors canon-kernel/truth-gate = **VIDE** → aucun pipeline ne construit de transaction à rail. La machinerie est typée + testée, jamais invoquée.

### B. Croyance → Fait (promotion gardée) = **opération PROMOTE** — CODÉ, LATENT
- `packages/canon-kernel/src/types/operations.ts:18` → `| 'PROMOTE';  // Interpretation → Truth rail`.
- `truth-gate/src/validators/v-rail-separation.ts:42-63` : **PROMOTE ne va QUE de interpretation→truth** ET **exige ≥1 evidence_ref** (sinon `rail_violation`). EvidenceType (canon) = `file/url/hash/signature/timestamp/oracle/human/gate_approval`.
- **C'EST le mécanisme « une croyance ne devient vérité qu'avec preuve »** (anti-hallucination, exactement l'ADN OMEGA). Plus : `OpType = SET|UNSET|PATCH|LINK|UNLINK|TOMBSTONE|RESTORE|MERGE_RESOLVE|PROMOTE` (`operations.ts:9-18`) — TOMBSTONE = soft-delete (jamais hard), RESTORE = requiert gate approval, MERGE_RESOLVE = résolution de conflit. CRUD épistémique gouverné complet.
- **Statut : LIVE-LATENT** (même raison que A : jamais appelé en prod).

### C. Provenance + Confiance (asserted vs inféré) = **Lineage** — CODÉ, ORPHAN
- `src/canon/types.ts:98-106` → `LineageSource = USER_INPUT | GENESIS_FORGE | INFERENCE | IMPORT | SYSTEM` + `Lineage.confidence: 0.0-1.0` (`:141`) + `status: ACTIVE|SUPERSEDED|CONDITIONAL` (`:74-78`).
- **C'EST « affirmé (USER_INPUT) vs déduit (INFERENCE) vs systémique », avec degré de certitude et statut conditionnel.** (Note : le code dit `CONDITIONAL`, le doc v1.2 disait `DISPUTED` — le code fait foi.) Contradictions : `CONTRADICTION_DIRECT|SEMANTIC` (`:259-260`).
- **Statut : ORPHAN.** `src/canon` (impl. du CANON_SCHEMA_SPEC v1.2) — git 2026-01-28, **importé par aucun package**. C'est un 3ᵉ canon, jamais câblé.

### D. Asymétrie d'information / Ironie dramatique = **Subtext + Beat** — CODÉ, **ACTIVE-WIRED** ✅
- `packages/genesis-planner/src/types.ts:91-95` → `SubtextLayer { character_thinks, reader_knows, tension_type, implied_emotion }`.
- `:82` → `SubtextTensionType = 'dramatic_irony' | 'suspense' | 'hidden_motive' | 'unspoken_desire' | 'suppressed_emotion'`.
- `:105-106` → `Beat { information_revealed[], information_withheld[] }`.
- **C'EST « qui sait quoi / ce que le lecteur sait que le perso ignore » (ironie dramatique, mobile caché).** Et c'est **CÂBLÉ + VIVANT** : consommé par `scribe-engine/src/weaver-llm.ts:124` (`scene.subtext.reader_knows`) et `scribe-engine/src/providers/master-prompt.ts:255` (`readerKnows`), `omega-metrics/src/types.ts:139`.
- **Limite (cœur du manque livre)** : c'est **par-scène** (`character_thinks`/`reader_knows` = string unique). **Pas de graphe de connaissance PERSISTANT par personnage à travers les chapitres** (pas de `Character.knows[] au chapitre N`).

### E. Mensonge attribué & Rêve/Hallucination — PARTIEL / ABSENT
- **Mensonge** : la détection de contradiction existe (C + drift `truth-gate/src/drift/narrative-analyzer.ts`), mais **aucune attribution** « le personnage X affirme A en sachant non-A ». PARTIEL.
- **Rêve / hallucination / plan onirique** : **ABSENT** (zéro `dream-state`, zéro couche perception). PLANNED au mieux.

### Synthèse épistémique (réponse à Francky / au Tribunal)
| Fonction citée | Existe ? | Où (chemin:ligne) | Statut | Manque |
|---|---|---|---|---|
| **faits** | ✅ | canon-kernel rail `truth` | LIVE-LATENT | — |
| **croyances** | ✅ | canon-kernel rail `interpretation` + Lineage.INFERENCE | LATENT / ORPHAN | — |
| **croyance→fait gardée** | ✅ | `PROMOTE` + V-RAIL-SEPARATION (preuve obligatoire) | LIVE-LATENT | non câblé |
| **qui sait quoi (asymétrie)** | ✅ | genesis Subtext `character_thinks`/`reader_knows` + Beat reveal/withhold | **ACTIVE-WIRED** | **per-scène, pas cross-chapitre persistant** |
| **mensonge attribué** | ⚠ partiel | contradiction + drift | LATENT | pas d'attribution perso |
| **rêve / hallucination** | ❌ | — | ABSENT | tout |

➡ **Verdict quantum : TROUVÉ, FRAGMENTÉ, LATENT.** La matrice = `rails truth/interpretation` + `PROMOTE` (canon-kernel) + `Subtext dramatic-irony` (genesis). Il manque : (1) **graphe de connaissance persistant par personnage** (cross-chapitre), (2) **attribution de mensonge**, (3) **couche rêve**. À **CÂBLER + ÉTENDRE**, pas à inventer.

---

## 3. ALERTE DOUBLON (le danger que le contrôle révèle)
**~4-5 "truth gates" + 3 "canons" coexistent déjà.** Ajouter du Book-Factory sans consolider = aggraver le cancer.

| « Truth gate » | Chemin | Fait quoi | Statut |
|---|---|---|---|
| unified-truth-gate | `creation-pipeline/src/gates/unified-truth-gate.ts` (Canon Lock C.4 : prose dérive de canon+plan) | **ACTIVE-WIRED** (stage-gates) |
| scribe runTruthGate | `scribe-engine/src/gates/truth-gate.ts` (prose vs canon/plan) | ACTIVE-WIRED (rewriter:43) |
| truth-gate package (dual-rail) | `packages/truth-gate/` (V-RAIL-SEPARATION, dual-head) | **DORMANT** (importé par personne) |
| gateway truth_gate | `gateway/src/gates/truth_gate.ts` (`createTruthGate`) | DORMANT |
| src/gates truth-gate | `src/gates/truth-gate.ts` (+ `tests/.../full-pipeline`) | ORPHAN |

| « Canon » | Chemin | Fait quoi | Statut |
|---|---|---|---|
| canon-kernel | `packages/canon-kernel` (rails truth/interp + PROMOTE + ops + hash) | LIVE-LATENT (hash câblé, rails latents) |
| gateway canon_engine | `gateway/src/gates/canon_engine.ts` (FactType CHARACTER/LOCATION/… + Merkle, 30 tests) | DORMANT |
| src/canon | `src/canon/*` (CANON_SCHEMA_SPEC v1.2 : claims+lineage+confidence) | ORPHAN |
| genesis Canon | `genesis-planner/src/types.ts` (entries immuables) | ACTIVE-WIRED mais STATIQUE |

➡ **Pré-requis avant P1 : décider sur QUEL canon/truth lineage on s'aligne. Interdiction d'en créer un nouveau.** (candidat fort = `canon-kernel` : déjà LIVE, le plus riche — rails + PROMOTE — et déjà importé partout.)

---

## 4. MATRICE BOOK-FACTORY — capacité × existant × lifecycle × câblé × doublon × action

| Capacité (module proposé) | Module trouvé | Chemin:ligne | Type | Lifecycle | Câblé prod ? | Doublon ? | **ACTION** |
|---|---|---|---|---|---|---|---|
| Bible/état mutable (**story-state**) | gateway canon_engine + memory_layer_nasa ; canon-kernel rails ; src/canon | `gateway/src/gates/canon_engine.ts` ; `gateway/src/memory/memory_layer_nasa/*` ; `canon-kernel/.../transactions.ts:10` | code+test | DORMANT / LIVE-LATENT | Non (gateway) ; partiel (kernel=hash) | **OUI, x3** | **ADAPT + CONSOLIDER** sur canon-kernel ; +`payoff_graph` (neuf) |
| World Model / mémoire bornée (**context-manager**) | memory_layer_nasa (digest/snapshot/decay/tiering) | `gateway/src/memory/memory_layer_nasa/memory_digest_writer.ts`, `memory_snapshot`, `memory_tiering` | code+test | DORMANT | Non | Non | **ADAPT** (réveiller + brancher) |
| Continuité inter-chapitres (**continuity-oracle**) | canon contradiction + rails + ripple + drift | `src/canon/types.ts:259` ; `gateway/.../ripple_engine.ts` ; `truth-gate/src/drift/narrative-analyzer.ts` ; `creation-pipeline/.../unified-truth-gate.ts` | code+test | mixte (1 WIRED, reste DORMANT) | partiel | **OUI** | **ADAPT** (composer, choisir 1 base) |
| **Couche épistémique** (vrai/cru/menti) | rails truth/interp + PROMOTE ; Subtext | `canon-kernel/.../operations.ts:18` ; `genesis-planner/src/types.ts:82-106` | code+test | LATENT (rails) / **WIRED** (subtext) | rails Non / subtext **Oui** | partiel | **WIRE rails + EXTEND subtext→graphe perso cross-chapitre** |
| Asymétrie d'info / ironie dramatique | genesis Subtext+Beat | `genesis-planner/src/types.ts:91-106` ; `scribe weaver-llm.ts:124` | code+test | **ACTIVE-WIRED** | **Oui** | Non | **EXTEND** (persister par personnage sur N chapitres) |
| Planif macro livre (**book-planner**) | genesis-planner (œuvre unique) ; arcs L9 | `genesis-planner/src/planner.ts` | code | ACTIVE-WIRED (par œuvre) | Oui (1 œuvre) | Non | **CREATE** (couche 60k→N ChapterSpec) au-dessus |
| Orchestrateur livre (**book-orchestrator**) | DEC-20260325-001 Fractal (scellé) ; STEP7_LINKER (spec) ; `src/assembly` non construit | `docs/DEC-20260325-001-*` ; `docs/OMEGA_CLAUDE_CODE_STEP7_LINKER.md` | doc/spec | PLANNED | Non | Non | **CREATE aligné DEC scellé** |
| Forge 1 chapitre (brique) | creation-pipeline F0-F8 + sovereign K2/DUEL/Oracle | `creation-pipeline/src/engine.ts` | code+test | **ACTIVE-WIRED** | Oui | Non | **IGNORE** (réutiliser intact) |
| Graine→récolte intra-plan | genesis seed-bloom-tracker | `genesis-planner/src/generators/seed-bloom-tracker.ts` | code+test | ACTIVE-WIRED | Oui | Non | **EXTEND** (cross-chapitre = payoff_graph) |
| Anti-répétition sélecteur (**repeat-shadow**) | repeat-shadow.ts (forensic) | `docs/research/proposals/repeat-shadow.ts` | code (vérifié) | PROPOSED | Non | Non | **APPLY terminal** (précondition) |

**Bilan actions** : IGNORE-réutiliser ×2 · ADAPT ×3 · EXTEND ×3 · CREATE ×2 · **CONSOLIDER (anti-doublon) ×1 bloquant** · APPLY ×1.

---

## 5. Les 3 verrous du Tribunal — réponses
**Verrou 1 — lifecycle réel** (cf §1 + IRM recoupé) : canon-kernel = LIVE-LATENT (hash câblé / rails latents) ; truth-gate package = DORMANT ; gateway = DORMANT ; src/canon = ORPHAN ; genesis subtext = **ACTIVE-WIRED** ; genome/sentinel = FROZEN. *« LIVE » dans l'IRM ≠ câblé.*
**Verrou 2 — quantum par fonction** : TROUVÉ et tracé (§2). Rails truth/interpretation + PROMOTE + Subtext. Latent côté rails, vivant côté subtext. Manques : graphe perso persistant, attribution mensonge, rêve.
**Verrou 3 — capacité Book-Factory réelle** : matrice §4, par preuve. Aucune capacité n'est « from scratch » sauf book-planner macro + book-orchestrator (et ce dernier est déjà scellé en doctrine).

---

## 6. DÉCISION
- **P1 autorisé ?** → **NON, pas encore.** Un préalable bloquant est apparu : **consolidation canon/truth** (choisir 1 lineage, interdire le 5ᵉ). Le construire avant = doublon garanti.
- **ADAPT vs FRESH ?** → **ADAPT confirmé comme voie**, mais via **anti-corruption layer** (adapter minimal, tests d'intégration, ZÉRO mutation des modules existants/FROZEN). Pas « import gateway et roule ».
- **Quantum ?** → **TROUVÉ / FRAGMENTÉ / LATENT.** À câbler + étendre (graphe de connaissance par personnage), pas à inventer.

**3 validations Architecte requises avant P1** :
1. **Sur quel canon s'aligne-t-on ?** (reco : `canon-kernel` rails — le réveiller, déprécier/muséifier les 2-3 autres canons).
2. **Confirmer le statut FROZEN/câblable** de `gateway/src/{gates,memory}` et l'autorisation de réveiller le rail `canon-kernel` (LATENT→ACTIVE).
3. **Valider l'extension Subtext → graphe de connaissance persistant par personnage** comme le seul vrai neuf de la couche épistémique (+ décider si rêve/mensonge-attribué entrent dans V1 ou plus tard).

---

## VERDICT
- **Statut : PASS** (contrôle de vérité fonctionnel livré, quantum tranché par preuve). **Confiance : Haute** (chaque ligne tracée code+git+IRM recoupés).
- **Forces** : (1) répond exactement à Francky — la fonction quantum existe sous d'autres noms (rails/PROMOTE/Subtext), prouvé file:line ; (2) distingue rigoureusement existe/câblé/latent/dormant ; (3) révèle le vrai risque (4-5 truth-gates + 3 canons = doublon déjà présent) ; (4) isole le seul vrai neuf (graphe perso persistant).
- **Faiblesses** : (1) je n'ai pas lu *intégralement* chaque validateur drift/narrative-analyzer ni `memory_*` ligne à ligne — le **comportement runtime** (vs types) reste à éprouver par test avant ADAPT ; (2) le statut « LATENT » du rail canon-kernel mérite confirmation par un test d'invocation réel (chercher un appelant via app/CLI hors packages/) ; (3) la faisabilité de réveiller un sous-système d'époque ≠ prouvée (era-drift non chiffré) ; (4) « rêve » déclaré absent sur recherche par mots — un nom totalement inattendu pourrait exister (incertitude résiduelle assumée).
- **Risques restants** : consolider mal = casser un gate câblé (creation-pipeline) ; réveiller un rail latent peut révéler des bugs dormants (cf bug PROMOTE latent déjà corrigé S11.Z dans v-rail-separation).
- **Action requise** : **STOP construction.** Validation Architecte sur les 3 points §6. ZÉRO code, ZÉRO modif moteur, ZÉRO nouveau canon.
