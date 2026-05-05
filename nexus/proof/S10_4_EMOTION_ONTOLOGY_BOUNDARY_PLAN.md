# Sprint S10.4 — Emotion Ontology Boundary Plan

**Sprint**   : S10.4
**Phase**    : Emotion Ontology Boundary (DOC + DOCTRINE + BRIDGE SPEC)
**Statut**   : **DRAFT**
**Effort**   : 4–8 h estimation (DOC ONLY — pas de patch code massif)
**Date**     : 2026-05-05
**Owner**    : Francky (Architect) + Claude (IA Principal)
**Doctrine** : ANCHOR_PRE_FLIGHT · NO_UNVERIFIED_EXTERNAL_ANCHORS · STRUCTURED_MEMORY_PRIORITY · NCR OVER HEROICS · MINIMIZE IT

---

## 1. Objectif

À l'issue du Tribunal 3/3 IA et du NCR `NCR_EMOTION14_CANON_DRIFT` :

- **Documenter** les 3 ontologies émotionnelles existantes (`genome`, `omega-forge`,
  `integration-nexus-dep`) + 2 redéclarations locales (`sovereign-engine`).
- **Spécifier** un `EmotionOntologyBridge` officiel (interface + invariants + tests).
- **Établir doctrinalement** la règle :
  > *« Le type nu `Emotion14` est interdit hors du module qui le définit. »*
- **PAS** de refonte v2 (différée Sprint **S12+**).
- **PAS** de renommage code immédiat (alias additifs **uniquement si safe**).

---

## 2. Scope autorisé S10.4

- Création d'un document de taxonomie officiel :
  - `docs/governance/EMOTION_ONTOLOGY_TAXONOMY.md` **ou** `nexus/proof/EMOTION_ONTOLOGY_TAXONOMY.md`
    (chemin final : décision Architecte).
- **Spec** `EmotionOntologyBridge` (interface TS + invariants + plan tests mapping) —
  **spec only, pas d'implémentation**.
- **Type aliases additifs** (additif, **non destructif**) :
  ```ts
  type CognitiveSocialEmotion14   = genome.Emotion14;
  type PlutchikForgeEmotion14     = omegaForge.Emotion14;
  type NexusEmotion14Mirror       = integrationNexusDep.Emotion14;
  ```
  (uniquement si vérifié safe dans 10.4.0 — sinon différer 10.4.2 ultérieur).
- Tests mapping bijectif / projection avec perte (existants ou nouveaux additifs,
  **sans modifier les invariants existants** `INV-GEN-12`, `INV-TRANS-04`).

---

## 3. Scope INTERDIT S10.4

| Action | Raison |
|---|---|
| Renommage destructif des types `Emotion14` → autre nom dans le code | Hors scope S10.4 (court terme additif uniquement) |
| Modification `packages/genome` | **V-01 SEALED** (FROZEN_MODULES.md:10) |
| Modification `packages/omega-forge` | Sans Mini-Tribunal IA dédié |
| Modification `packages/integration-nexus-dep` | Sans Tribunal Emotion13/14 dédié |
| Refonte Emotion Ontology v2 | **Différée S12+** (Sprint dédié) |
| Suppression redéclarations locales `sovereign-engine` | Adapter dual nécessaire pendant migration |

---

## 4. No-go conditions

| ID | Condition | Action si rencontrée |
|---|---|---|
| **NG1** | Modification du type `genome.Emotion14` | **STOP immédiat** — V-01 risque |
| **NG2** | Suppression d'`Emotion14` (union complète) dans un canon | **STOP** — rupture API |
| **NG3** | Renommage destructif touchant > 3 packages | **STOP** — Tribunal requis |
| **NG4** | Élargissement scope ontologique (Mycelium-Bio, autres ontologies) | **STOP** — scope creep |
| **NG5** | Invariants existants cassés (`INV-GEN-12` ou `INV-TRANS-04`) | **STOP** — régression |

---

## 5. Protocole sub-phases

| Sub-phase | Description | Type livrable |
|---|---|---|
| **10.4.0** | Audit cascade renommage — cartographier impact aliases additifs (build, tests, types) | DOC (rapport audit) |
| **10.4.1** | Spec `EmotionOntologyBridge` — interface + invariants + plan tests mapping | DOC (spec) |
| **10.4.2** | Aliases additifs (`type X = Y`, additif, sans rupture) — **conditionnel 10.4.0 OK** | CODE additif (1 fichier) |
| **10.4.3** | Tests mapping (bijectif `genome ↔ nexus` + projection avec perte `genome ↔ forge`) | TESTS additifs |
| **10.4.4** | NCR final + commit doctrinal (règle « type nu interdit » actée si Architecte valide) | DOC (NCR clôture conditionnelle) |
| **Mini-Tribunal IA pré-S10.4** | Si décision ambiguë sur taxonomie ou spec bridge | DOC (verdict) |

---

## 6. Critères PASS/FAIL

### PASS (S10.4 complété)
- [x] 3 canons `Emotion14` documentés (statut + structure + invariants).
- [x] Spec `EmotionOntologyBridge` rédigée (interface + invariants + plan tests).
- [x] Aliases additifs validés safe (10.4.0) **OU** différés explicitement.
- [x] Tests mapping additifs présents (bijectif + projection avec perte).
- [x] Règle doctrinale « type nu `Emotion14` interdit hors propriétaire » actée
      si Architecte valide.
- [x] **Aucun renommage destructif effectué.**

### FAIL (S10.4 invalidé)
- [ ] Un seul invariant cassé (`INV-GEN-12` ou `INV-TRANS-04`).
- [ ] V3.4 ML scoring impacté (test régression `coefficients-v3-4`).
- [ ] Scope creep (Mycelium-Bio, autres ontologies hors Emotion14).
- [ ] Modification `genome` (V-01) ou rupture API.

---

## 7. Risques restants S10.4

| ID | Risque | Mitigation |
|---|---|---|
| **R1** | Aliases additifs collision noms (existants vs proposés) | 10.4.0 audit cascade exhaustif avant 10.4.2 |
| **R2** | Tests mapping incomplets (cas non bijectifs `envy↔anger↔despair`) | 10.4.3 spec explicite des branches projection avec perte |
| **R3** | Doctrine « type nu interdit » non appliquée en code review | Lint rule additif (à spécifier 10.4.1) **ou** check-list code review |
| **R4** | Confusion taxonomie (sémantique vs package) post-commit | Décision Architecte requise **avant** 10.4.2 |

---

## 8. Plan Sprint S12+ (référence — hors scope S10.4)

- **Refonte Emotion Ontology v2** — Sprint complet dédié.
- **Tribunal IA dédié** : choix entre canon cognitif (genome), canon Plutchik (omega-forge),
  canon hybride (nouveau).
- **Migration progressive** : aliases additifs → type officiel → suppression aliases.
- **Adapter dual `sovereign-engine`** maintenu compat le temps de la migration.
- **Estimation** : 20–40 h Sprint complet.
- **Pré-requis** : NCR `NCR_EMOTION14_CANON_DRIFT` + S10.4 livrables complets.

---

## 9. Cross-references

- `nexus/proof/NCR_EMOTION14_CANON_DRIFT.md` — NCR parent (HIGH/P1, OPEN_DIAGNOSED).
- `nexus/proof/EMOTION14_CROSS_PACKAGE_USAGE_MAP.md` — audit empirique V1+V2+V3+§7.
- `FROZEN_MODULES.md:10` — V-01 source (genome SEALED 1.2.0).
- `CLAUDE.md §B` + `§D` + `§H` — doctrine v3.156.0.

---

## 10. Validation post-S10.4

À l'issue de S10.4 (toutes sub-phases complètes), produire :

- **Evidence pack** : test log + hashes + report (CLAUDE.md §C-7).
- **Tag intermédiaire** : `phase-s-s10-step4-emotion-boundary-{date}` (sur GO Architecte).
- **Mise à jour** `NCR_EMOTION14_CANON_DRIFT` :
  - Statut → `OPEN_DIAGNOSED` → `IN_PROGRESS` → `RESOLVED_PARTIAL` (court terme B+C complétés ; E reste ouvert S12+).

---

**Fin Plan S10.4. STOP. Attente directive Architecte pour démarrage Sprint S10.4 concrète.**
