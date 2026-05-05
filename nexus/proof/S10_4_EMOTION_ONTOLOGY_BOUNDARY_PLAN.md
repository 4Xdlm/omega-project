# Sprint S10.4 — Emotion Ontology Boundary Plan — **ANNULÉ post-mémoire-check**

**Sprint**         : S10.4
**Phase**          : Emotion Ontology Boundary (DOC + DOCTRINE + BRIDGE SPEC)
**Statut**         : **ANNULÉ — RETIRED γ recadrage 2026-05-05**
**Effort estimé**  : ~~4–8 h~~ → **0 h (annulé)**
**Date annulation**: 2026-05-05
**Owner**          : Francky (Architect) + Claude (IA Principal)
**Doctrine**       : Règle prioritaire #1 (vérification précédent ✅) · STRUCTURED_MEMORY_PRIORITY · NCR OVER HEROICS · MINIMIZE IT

---

## 0. Banner d'annulation

> **CE PLAN EST ANNULÉ.**
>
> Une version antérieure de ce document (commit `4a98f3fe`) cadrait Sprint S10.4
> comme une phase **active** de renommage sémantique (Option B) + spec
> `EmotionOntologyBridge` (Option C), en mode additif / non destructif.
>
> Post-recoupage mémoire OMEGA (STRUCTURED_MEMORY_PRIORITY) :
>
> - `emotion_14d` est **DEPRECATED / GARAGE** depuis R-PHYSICS
>   (kill-switch `= 0.0`, 86 tests PASS, contribution marginale 0.0 % corpus PVI v2).
> - `tension_14d` mode keyword est en mode **DUAL** (GARAGE keyword + ACTIF semantic).
> - `project_emotion_v2_architecture.md` propose une **refonte 3-vecteurs**
>   (Prosodie / Simulation / Inférence) qui remplacera l'ontologie `Emotion14`.
> - Mini-audit δ 2026-05-05 confirme : `integration-nexus-dep` est **DORMANT**
>   (0 import cross-package), pas runtime critical.
>
> → Renommer / formaliser une frontière **garage** = **dette nette** (bruit + dette).
>
> → **Sprint S10.4 actif est ANNULÉ.** Documentation only via le NCR
>   `nexus/proof/NCR_EMOTION14_CANON_DRIFT.md` (γ recadré, P2 governance, DEFERRED).

---

## 1. Ce qui devient le sort des Options B+C

| Option | Sort post-γ-recadrage |
|---|---|
| **B** — Renommage sémantique (`CognitiveSocialEmotion14`, etc.) | **DEFERRED — only if Emotion14 reactivated** (improbable post Emotion V2) |
| **C** — `EmotionOntologyBridge` officiel (spec) | **DEFERRED — only if Emotion14 reactivated** (improbable) |
| **E** — Refonte Emotion Ontology v2 | **REMPLACÉE PAR / RELIÉE À** `project_emotion_v2_architecture.md` (Sprint S12+) |

→ Les sub-phases initialement prévues (10.4.0 audit cascade, 10.4.1 spec bridge,
   10.4.2 aliases additifs, 10.4.3 tests mapping, 10.4.4 NCR final) ne sont **pas**
   exécutées.

---

## 2. Ce qui survit du plan initial (référence)

Conservé comme **archive de cadrage**, sans engagement d'exécution :

- Taxonomie sémantique proposée (`CognitiveSocialEmotion14`, `PlutchikForgeEmotion14`,
  `NexusEmotion14Mirror`, `LocalCognitiveSocialEmotion14`, `LocalPlutchikForgeEmotion14`,
  `EmotionOntologyBridge`).
- Règle doctrinale candidate : *« Le type nu `Emotion14` est interdit hors du module
  qui le définit. »*
- No-go conditions NG1–NG5.
- Critères PASS/FAIL.

→ Tous ces éléments restent **archivés** ici comme **référence historique** au cas
  où Emotion14 serait réactivé un jour. **Aucun n'est livrable actif.**

---

## 3. Ce qui ne survit PAS (annulé)

- Création / spec du fichier `EMOTION_ONTOLOGY_TAXONOMY.md` actif.
- Aliases additifs `type CognitiveSocialEmotion14 = ...` dans le code.
- Tests mapping additifs dédiés (les tests existants `INV-GEN-12`, `INV-TRANS-04` restent
  à l'identique, **rien n'est ajouté ni modifié**).
- Mini-Tribunal pré-S10.4 sur taxonomie / spec bridge.
- Tag intermédiaire `phase-s-s10-step4-emotion-boundary-{date}` (non créé).

---

## 4. Cross-references

- `nexus/proof/NCR_EMOTION14_CANON_DRIFT.md` — NCR γ recadré (GARAGE_CANON_DRIFT, P2, DEFERRED).
- `nexus/proof/EMOTION14_CROSS_PACKAGE_USAGE_MAP.md` — audit empirique V1+V2+V3+§7.
- `project_r_physics_results.md` — kill-switch `emotion_14d = 0.0` (mémoire).
- `project_emotion_v2_architecture.md` — paradigme remplaçant 3 vecteurs (mémoire).
- `FROZEN_MODULES.md:10` — V-01 source (genome SEALED 1.2.0).

---

## 5. Décision finale & retour priorité

- **PAS** de Sprint S10.4 actif.
- **RETOUR priorité Sprint S10.3** — sovereign-engine build closure :
  - `noEmitOnError: true` ciblé `sovereign-engine`,
  - `npm install` workspaces (résoudre symlinks `@omega/*`),
  - re-mesure `tsc --noEmit` empirique,
  - Mini-Tribunal IA Q1–Q6 stratégique,
  - patch par classe N1+N4 (cascade peeling).
- **Emotion V2** : décision Architecte, futur sprint dédié séparé (S12+).

---

**Fin Plan S10.4 — ANNULÉ. STOP. Retour Sprint S10.3.**
