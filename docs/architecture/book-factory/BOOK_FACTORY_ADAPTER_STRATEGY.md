# BOOK-FACTORY — Stratégie d'Adapter (Anti-Corruption Layer)

**Date** : 2026-06-05 · **Statut** : STRATÉGIE DESIGN (doc-only, ZÉRO code, ZÉRO mutation) · **Standard** : NASA-Grade L4
**Rôle** : définir COMMENT le Book-Factory **consomme** les substrats existants — `canon-kernel` (rails, LATENT mais prouvé 284/284) et `gateway/memory_layer_nasa` (World Model, DORMANT mais certifié) — **sans jamais les modifier**. Réponse au mandat Tribunal : *« ADAPT via Anti-Corruption Layer, pas import sauvage, pas mutation FROZEN/dormant »*.

---

## 1. Problème
Réutiliser deux sous-systèmes d'**époques différentes** sans les casser ni les figer dans le Book-Factory :
- `canon-kernel` : actuel, sain, mais ses **rails sont latents** (jamais construits en prod) ; l'API transactionnelle (CanonTx/PROMOTE) n'a **aucun appelant** → réveiller = chemin neuf.
- `gateway/memory_layer_nasa` : **certifié DO-178C** mais **Phase 8-10 (janv. 2026)**, types d'une autre génération (`MemoryEntry`, `DigestPayload`…), **non importé** par le pipeline courant → **era-drift** réel.
Importer ces modules « tels quels » dans le Book-Factory **couplerait** la logique livre à des contrats anciens et propagerait la dérive. Interdit aussi : muter ces modules (FROZEN/dormants).

## 2. Principe : Ports & Adapters (hexagonal) + ACL
Le Book-Factory définit **ses propres ports** (interfaces qu'il possède). Des **adapters** traduisent entre ces ports et les modules existants. **L'ACL absorbe la dérive d'époque** : si les types gateway changent (ou pas), seul l'adapter bouge, jamais le cœur Book-Factory.

```
  Book-Factory core (ports qu'il POSSÈDE)
        │  StoryStatePort        KnowledgePort        ContextPort
        ▼                                   ▼
  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────────┐
  │ book-canon- │   │ book-memory-     │   │ book-knowledge-      │
  │  adapter    │   │  adapter (ACL)   │   │  adapter             │
  └─────┬───────┘   └────────┬─────────┘   └──────────┬───────────┘
        ▼                    ▼                          ▼
  canon-kernel        gateway/memory_layer_nasa    genesis Subtext
  (rails truth/interp)  (digest/snapshot/tiering)   (reader_knows…)
   — LECTURE/transac     — LECTURE SEULE             — LECTURE
     via API publique      (jamais muter)              (étendre côté Book-Factory)
```

## 3. Les 3 adapters
| Adapter | Lit / utilise | Expose au Book-Factory | Règle ACL |
|---|---|---|---|
| **book-canon-adapter** | `canon-kernel` API publique (`createCanonTx`, ops, rails truth/interpretation, hash) | `StoryStatePort` (faits/croyances du livre) | construit des CanonTx ; **ne modifie pas** canon-kernel ; tout passe par l'API exportée |
| **book-memory-adapter** | `gateway/memory_layer_nasa` (`memory_store`, `memory_digest`, `memory_snapshot`, `tiering`) | `ContextPort` (digest borné ≤600 mots, snapshot/chapitre) | **lecture/écriture via l'API du module**, **zéro édition de fichier gateway** ; traduit `BookFactoryState ↔ MemoryEntry` |
| **book-knowledge-adapter** | `genesis-planner` Subtext/Beat (`reader_knows`, `information_revealed/withheld`) | `KnowledgePort` (graphe perso, cf spec dédiée) | **étend côté Book-Factory** (graphe persistant) ; ne modifie pas genesis |

## 4. Règles dures de l'ACL (gravées)
1. **Aucune mutation** des fichiers `canon-kernel`, `gateway/`, `genesis-planner`. Les adapters vivent dans un **nouveau package** Book-Factory (ex. `packages/book-factory/adapters/`).
2. **Dépendance unidirectionnelle** : Book-Factory → adapters → modules existants. Jamais l'inverse. Pas de cycle.
3. **Traduction explicite** : un mapping `BookFactoryType ↔ ExistingType` documenté par adapter (table de correspondance). Si un type gateway est inadapté, l'ACL **traduit**, il ne **contourne** pas.
4. **Version-pin** : l'adapter cible une version/commit précis des modules consommés ; tout changement = re-test d'intégration.
5. **Tests de frontière obligatoires** : chaque adapter a sa suite d'intégration (le contrat unitaire des modules est vert ; l'**intégration** ne l'est pas encore — c'est là que vivent les bugs d'era-drift).
6. **Réveil gaté** : câbler les rails canon-kernel (LATENT→ACTIVE) se fait **dans l'adapter**, avec nouveaux tests, sans toucher canon-kernel.

## 5. Ce que l'ACL achète
- **Isolation de l'era-drift** : la logique livre ne dépend jamais des types janvier de gateway ; l'adapter absorbe.
- **Réversibilité** : si un substrat se révèle inadaptable, on remplace **un adapter**, pas le cœur.
- **Respect FROZEN/dormant** : on consomme sans muséifier ni muter (EMP-15, V-01).
- **Anti-doublon** : le Book-Factory n'a **pas** son propre canon/mémoire — il branche les existants.

## VERDICT
- **Statut : STRATÉGIE LIVRÉE.** **Confiance : Haute** sur le principe (ports/adapters = standard) ; **Moyenne** sur le coût réel d'intégration (era-drift gateway non chiffré).
- **Forces** : (1) zéro mutation des modules existants/FROZEN ; (2) isole la dérive d'époque dans une couche jetable ; (3) interdit le doublon (pas de canon/mémoire Book-Factory propre) ; (4) réveil des rails confiné + testé.
- **Faiblesses** : (1) l'ACL ajoute une couche d'indirection (coût de traduction, latence) ; (2) le **vrai effort = les tests d'intégration de frontière** (non chiffré) ; (3) si gateway/memory s'avère trop daté, l'adapter mémoire peut devenir plus lourd que prévu → fallback = réimplémenter un store minimal **sur canon-kernel** (toujours pas un nouveau canon) ; (4) risque de « fuite d'abstraction » si un type existant déborde dans les ports.
- **Risques restants** : sous-estimer l'intégration = retomber dans du CREATE déguisé ; tenter de « réparer » gateway depuis l'adapter = violation V-01.
- **Action** : design seulement. Implémentation P1 **après** GO Architecte. Premier adapter à éprouver = `book-canon-adapter` (réveil rails) avec tests d'intégration, **avant** tout orchestrateur livre.
