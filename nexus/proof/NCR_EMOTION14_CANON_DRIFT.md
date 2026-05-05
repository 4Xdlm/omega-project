# NCR_EMOTION14_CANON_DRIFT

**ID**       : NCR_EMOTION14_CANON_DRIFT
**Title**    : Drift de canon `Emotion14` — 3 INTERNAL_ONLY_CANONS + 2 redéclarations locales, aucun canon central cross-package
**Status**   : **OPEN_DIAGNOSED**
**Severity** : **HIGH (P1)**
**Priority** : **P1**
**Opened**   : 2026-05-05
**Owner**    : Francky (Architect) + Claude (IA Principal)
**Tribunal** : 3/3 IA convergent (Cowork + Gemini OMEGA-PRIME + ChatGPT)
**Standard** : NASA-Grade L4 / DO-178C Level A
**Doctrine** : ANCHOR_PRE_FLIGHT · NO_UNVERIFIED_EXTERNAL_ANCHORS · STRUCTURED_MEMORY_PRIORITY · NCR OVER HEROICS · MINIMIZE IT

---

## 1. Executive summary

Trois sites distincts du repo déclarent chacun un type `Emotion14` indépendant
(`packages/genome`, `packages/omega-forge`, `packages/integration-nexus-dep`)
et deux redéclarations locales additionnelles existent dans
`packages/sovereign-engine` (adapter dual `GenomeEmotion14` / `ForgeEmotion14`).

Aucun de ces canons n'est référencé nominativement cross-package : tous sont
empiriquement classés `INTERNAL_ONLY_CANON` (genome, omega-forge),
`DUPLICATE_CANON / MIRROR` (integration-nexus-dep) ou `LOCAL_REDECLARATION`
(sovereign-engine adapter dual).

Le Tribunal 3/3 IA (Cowork + Gemini OMEGA-PRIME + ChatGPT) converge **totalement**
sur la décision suivante :

- **Court terme S10.4** : Options **B** (renommage **sémantique** non destructif) **+ C**
  (`EmotionOntologyBridge` officiel **spec only**) en **mode additif / non destructif**.
- **Long terme S12+** : Option **E** (refonte Emotion Ontology v2 — Sprint dédié).
- **Rejets** : Option **A** (réalignement sur omega-forge — invalidée sous justification
  actuelle), Option **D** (déclassement genome — interdite V-01 SEALED empirique).

---

## 2. Données empiriques V1/V2/V3 / §7 — Cross-references

Tout le détail empirique verbatim est consigné dans le livrable d'audit
préalable. Ce NCR **n'éditorialise pas** ces preuves, il en synthétise les
conclusions runtime.

Cross-références :

- `nexus/proof/EMOTION14_CROSS_PACKAGE_USAGE_MAP.md`
  - V1 (commit `9515320e`) — `integration-nexus-dep` `envy` usage verbatim
  - V2 (commit `9515320e`) — `genome` internal Emotion14 usage
  - V3 (commit `9515320e`) — V3.4 coefficients sensitivity (canon-agnostic)
  - §7 (commit `62664df0`) — anchor verification `omega-forge.Emotion14`

Synthèse runtime (sans rééditer les verbatims) :

- `genome.Emotion14` — 5 sites prod internes (`api/types.ts`, `core/emotion14.ts`,
  `core/genome.ts`, `index.ts`), tests d'invariants `INV-GEN-12` + `28.3-A/B/C`,
  zéro import nominatif cross-package.
- `omega-forge.Emotion14` — 14 dimensions Plutchik primary+complex (sans `envy`),
  exporté `packages/omega-forge/src/types.ts:22-32`, zéro import nominatif
  cross-package (≥35 imports génériques observés mais sur dérivés
  `EmotionState14D`, `EMOTION_14_KEYS`, etc.).
- `integration-nexus-dep.Emotion14` — `src/contracts/types.ts:14-42`, header
  auto-déclaré MIRROR de `@omega/genome` (FROZEN), translator `module.ts:46`
  mapping `envy → anger` (INV-TRANS-04 bijectif approché).
- `sovereign-engine` — adapter dual `GenomeEmotion14` + `ForgeEmotion14`
  (cf. EMOTION14_CROSS_PACKAGE_USAGE_MAP §7.5).
- V3.4 dispatcher (`coefficients-v3-4.ts`) — **0 token émotionnel**, ML pur,
  insensibilité totale au choix de canon.

---

## 3. Classification finale verrouillée

| Site | Statut | Source de vérité |
|---|---|---|
| `genome.Emotion14` | **`INTERNAL_ONLY_CANON`** (cognitive/social, **SEALED 1.2.0**) | `FROZEN_MODULES.md:10` + V2 |
| `omega-forge.Emotion14` | **`INTERNAL_ONLY_CANON`** (Plutchik-like primary+complex) | §7.1–§7.3 |
| `integration-nexus-dep.Emotion14` | **`DUPLICATE_CANON / MIRROR documenté`** (INV-TRANS-04) | §1.1–§1.4 |
| `sovereign-engine` | **`LOCAL_REDECLARATION`** (adapter dual) | §7.5 |

**Conséquence** : il **n'existe aucun canon central cross-package** prouvé
empiriquement pour `Emotion14`. L'architecture est en silos étanches.

---

## 4. V3.4 dispatcher = CANON-AGNOSTIC ABSOLU

Empirique V3 (`packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts`) :

- `grep "envy|guilt|shame|pride|hope|submission|awe|disapproval|remorse|contempt"` → **0 match**
- `grep -i "Emotion14|emotion"` → **0 match**
- Module ML pur, 5 features `M0b_slim`, Ridge α=1.0, seed=42, `CALIBRATION_ID = 'M0b_slim_V3_4_2026-04-11'`.

→ **Décision Emotion14 (canon central, renommage, bridge) = ZÉRO impact ML scoring.**
→ V3.4 dispatcher **ne porte aucun risque de régression** sur les options Tribunal.

---

## 5. V-01 genome SEALED — CONFIRMÉ EMPIRIQUE

Sources empiriques :

- `FROZEN_MODULES.md:10` —
  ```
  | packages/genome | 1.2.0 | SEALED | 2026-01-07 | 109 | 14 |
  ```
- `CLAUDE.md §B` — `packages/genome` étiqueté `# CLIENT — FROZEN`.
- `CLAUDE.md §D` — `packages/genome/ -> Phase 28 — SEALED` (forbidden actions).

→ **V-01 (modification module FROZEN = IMMEDIATE STOP) confirmé empirique** pour `genome`.
→ **Option D (déclassement / archivage `genome.Emotion14`) INTERDITE.**

---

## 6. Hypothèse pré-audit `RUNTIME_CANON omega-forge` — RÉFUTÉE

Préalablement, ChatGPT avait posé l'hypothèse `omega-forge.Emotion14` =
`RUNTIME_CANON` cross-package, **avec un filet pré-vérification** :
> *« PARTIAL si seulement imports génériques. Précision compte. »*

Vérification empirique §7.2 :

- ≥35 imports `from '@omega/omega-forge'` observés (`omega-runner`, `sovereign-engine`).
- **0 import nominatif `Emotion14`** depuis `@omega/omega-forge`.
- Imports observés portent sur dérivés (`EmotionState14D`, `EMOTION_14_KEYS`,
  `ForgeEmotionBrief`, `F5Config`, `CanonicalEmotionTable`,
  `DEFAULT_CANONICAL_TABLE`, `analyzeEmotionFromText`, `computeArousal`,
  `cosineSimilarity14D`, `computeForgeEmotionBrief`).

→ Hypothèse `RUNTIME_CANON` **réfutée** : `omega-forge.Emotion14` est de
**même statut empirique que `genome.Emotion14`** = `INTERNAL_ONLY_CANON`.
→ **Le filet ChatGPT s'est attrapé lui-même.** Honnêteté empirique préservée.

---

## 7. Options Tribunal — Verdict empirique post-vérification

| Option | Verdict | Justification |
|---|---|---|
| **A** — Réalignement `integration-nexus-dep` sur `omega-forge` | **INVALIDÉE sous justification actuelle** | `omega-forge` n'est pas RUNTIME_CANON prouvé empiriquement ; même statut que `genome` |
| **B** — Renommage **sémantique** (cf. §9 taxonomie) | **RECOMMANDÉE court terme S10.4** | Désamorce confusion lexicale, additif/non destructif |
| **C** — `EmotionOntologyBridge` officiel | **RECOMMANDÉE court terme S10.4** | Formalise dualité reconnue par adapter dual + translator INV-TRANS-04 |
| **D** — Archiver/déclasser `genome.Emotion14` | **INTERDITE** | V-01 SEALED **confirmé empirique** (§5) |
| **E** — Refonte Emotion Ontology v2 | **DIFFÉRÉE Sprint S12+** | Sprint dédié (estimation 20–40h), pas de patch local |

---

## 8. Verdict Tribunal final 3/3 IA

**Convergence totale** (Cowork + Gemini OMEGA-PRIME + ChatGPT) :

- **Court terme S10.4** : **B + C** en mode **additif / non destructif** (DOC ONLY, alias additifs si safe).
- **Long terme S12+** : **E** (refonte Emotion Ontology v2 — Sprint dédié, Tribunal IA dédié).
- **Interdits maintenant** :
  - **A brutal** (justification actuelle insuffisante).
  - **D** (V-01 confirmé empirique).
  - **Patch local silencieux** (NCR OVER HEROICS).

---

## 9. Taxonomie officielle — Apport ChatGPT

Renommages **sémantiques** proposés (à appliquer en S10.4.2 si Architecte valide,
**pas dans cette phase NCR**) :

| Type actuel (ambigu) | Type sémantique proposé |
|---|---|
| `genome.Emotion14` | **`CognitiveSocialEmotion14`** |
| `omega-forge.Emotion14` | **`PlutchikForgeEmotion14`** |
| `integration-nexus-dep.Emotion14` | **`NexusEmotion14Mirror`** |
| `sovereign-engine.GenomeEmotion14` | **`LocalCognitiveSocialEmotion14`** |
| `sovereign-engine.ForgeEmotion14` | **`LocalPlutchikForgeEmotion14`** |
| (nouveau) | **`EmotionOntologyBridge`** (pont officiel — spec S10.4.1) |

Décision finale taxonomie (sémantique vs package) : **réservée Architecte**.

---

## 10. Règle doctrinale nouvelle — Apport ChatGPT

**Règle proposée pour amendement doctrinal** (à acter par Architecte) :

> *« Le type nu `Emotion14` est interdit hors du module qui le définit. »*

**Effet** : empêche que la confusion lexicale revienne post-renommage.
Tout consommateur cross-package devra utiliser :
- soit le type sémantique (`CognitiveSocialEmotion14`, `PlutchikForgeEmotion14`, etc.) ;
- soit `EmotionOntologyBridge` (pont officiel).

→ Application via code review + lint rule potentiel (à spécifier S10.4.1).

---

## 11. Risques actuels (pré-S10.4)

- **R1 — Type collision** : 3 canons `Emotion14` même nom → ambiguïté lexicale dans toute lecture cross-package.
- **R2 — Redéclarations locales** : `sovereign-engine` `GenomeEmotion14` / `ForgeEmotion14`
  ne sont pas synchronisés avec leurs sources canon.
- **R3 — Mappings avec perte** : `envy → anger` (INV-TRANS-04) **non bijectif strict**
  (cf. `module.ts:84` *Bijective mapping with approximation for envy/despair*).
- **R4 — Usage nu `Emotion14`** hors propriétaire (lecture cross-package) → ambiguïté
  pour mainteneur futur.
- **R5 — Pattern méta non scellé** doctrinalement (cf. §12).

---

## 12. Pattern méta — 3e occurrence Canons Orphelins

| # | Site | Sprint | Statut |
|---|---|---|---|
| 1 | `canon-engine` | S8 | **RESOLVED** (cf. `NCR_CANON_ENGINE_JUNCTION_ORPHAN.md`) |
| 2 | `gateway/*` | NCR-013 γ | Tribunal (cf. NCR Gamma trail) |
| 3 | `genome` + `omega-forge` (Emotion14) | S10.2.2 | **NEW (ce NCR)** |

→ **3e occurrence** d'un pattern « canon orphelin / doublon non documenté ».
→ Recommandation : **NCR umbrella futur** `NCR_ORPHAN_CANON_PATTERN`
  ou **amendement doctrinal v3.157+** institutionnalisant la prévention.
  (Décision : Architecte.)

---

## 13. Plan d'action

### S10.4 — Phase NCR + cadrage + bridge spec (DOC ONLY)
- Voir livrable séparé : `nexus/proof/S10_4_EMOTION_ONTOLOGY_BOUNDARY_PLAN.md`
- Aucune modification de code Emotion14 dans cette phase.
- Spec `EmotionOntologyBridge` (interface + invariants + tests mapping).
- Aliases additifs **uniquement si safe** (10.4.2).

### S12+ — Refonte Emotion Ontology v2 (Sprint dédié)
- Tribunal IA dédié (cognitif vs Plutchik vs hybride).
- Migration progressive (alias → type officiel).
- Adapter dual `sovereign-engine` maintenu compat le temps de la migration.
- Estimation : **20–40 h** Sprint complet.

### Décision Architecte requise
- Choix taxonomie : **sémantique** (cf. §9) **vs** **package-prefixed**
  (`GenomeEmotion14` / `ForgeEmotion14` / `NexusEmotion14`).
- Acter ou non la règle « type nu interdit hors propriétaire » (§10).
- Acter ou non le NCR umbrella `NCR_ORPHAN_CANON_PATTERN` (§12).

---

## 14. Cross-references

- `nexus/proof/EMOTION14_CROSS_PACKAGE_USAGE_MAP.md` — V1 + V2 + V3 + §7 (audit empirique complet).
- `nexus/proof/NCR_CANON_ENGINE_JUNCTION_ORPHAN.md` — 1ʳᵉ occurrence pattern (RESOLVED S8).
- `FROZEN_MODULES.md:10` — V-01 source empirique (genome SEALED 1.2.0).
- `CLAUDE.md §B` + `§D` + `§H` — doctrine v3.156.0 (FROZEN, forbidden actions, Sprint S8 amendments).

---

## 15. Signature

| Champ | Valeur |
|---|---|
| **NCR-ID**    | `NCR_EMOTION14_CANON_DRIFT` |
| **OPENED**    | 2026-05-05 |
| **STATUS**    | OPEN_DIAGNOSED |
| **SEVERITY**  | HIGH / P1 |
| **TRIBUNAL**  | 3/3 IA convergent (Cowork + Gemini OMEGA-PRIME + ChatGPT) |
| **STANDARD**  | NASA-Grade L4 / DO-178C Level A |

**Fin NCR. STOP empirique post-commit. Attente directive Architecte pour Sprint S10.4.**
