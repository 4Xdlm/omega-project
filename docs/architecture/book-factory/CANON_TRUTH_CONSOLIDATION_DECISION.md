# CANON / TRUTH — Décision de Consolidation (P0.5) + Carte de Lignage

**Date** : 2026-06-05 · **Statut** : DÉCISION (doc-only, ZÉRO code, ZÉRO mutation) · **Standard** : NASA-Grade L4
**Fondé sur** : `TRUTH_RAIL_RUNTIME_PROBE_REPORT.md` (preuve runtime 284/284) + `BOOK_FACTORY_EXISTING_CAPABILITY_MATRIX_V2.md` (cartographie) + arbitrage Tribunal (Gemini + ChatGPT, convergents).
**Règle Architecte appliquée** : *« le moindre doute sur la vérité on contrôle ; on ne démarre qu'à 1000% »*. Doute « le noyau marche-t-il ? » = **résolu par test runtime** avant cette décision.

---

## 1. DÉCISION (le « choix du cœur »)
**`packages/canon-kernel` (rails `truth` / `interpretation` + `PROMOTE`) = COLONNE VERTÉBRALE CANONIQUE UNIQUE d'OMEGA.**
Justification **prouvée** (pas opinion) : (a) modèle épistémique le plus riche — séparation fait/croyance par rails + chaînes de hash distinctes + promotion gardée par preuve ; (b) **284/284 tests verts au runtime** (canon-kernel 67 + truth-gate 217) ; (c) **déjà importé partout** (dépendance existante, zéro nouveau couplage) ; (d) déterministe (hash, timestamp exclu).

**Interdits durs (gravés)** :
- ❌ **AUCUN nouveau canon.** ❌ **AUCUN nouveau truth-gate.** ❌ **AUCUN nouveau « système quantum ».**
- ❌ Aucune **mutation** des canons/gates concurrents (dormants/FROZEN) — on les **classe**, on ne les touche pas.
- ✅ Le Book-Factory **consomme** canon-kernel via un **adapter anti-corruption** (cf `BOOK_FACTORY_ADAPTER_STRATEGY.md`), il ne crée pas d'état canonique parallèle.

---

## 2. CARTE DE LIGNAGE (exhaustive, vérifiée file:line + tests + imports)

### 2.A — CANONS (4 narratifs + 1 gouvernance)
| Canon | Chemin | Rôle | Câblage prouvé | Statut | **SORT** |
|---|---|---|---|---|---|
| **canon-kernel** | `packages/canon-kernel` | dual-rail truth/interp + PROMOTE + ops + hash | importé partout **pour hash** ; rails **0 appelant** ; 67/67 tests | LIVE-LATENT | **NOYAU CIBLE — réveiller les rails** |
| gateway canon_engine | `gateway/src/gates/canon_engine.ts` | FactType CHARACTER/LOCATION/… + Merkle, 30 tests | importé gateway-only | DORMANT | **MUSEUM** (lire le modèle FactType, ne pas muter, ne pas câbler) |
| src/canon | `src/canon/*` | claims + lineage(INFERENCE…) + confidence + CONDITIONAL + guard | importé par `src/gates` + tests only | ORPHAN | **MUSEUM** (réf. lineage/confidence pour la couche perso) |
| genesis Canon | `genesis-planner/src/types.ts` | entries **immuables** (faits de départ d'une œuvre) | ACTIVE-WIRED | LIVE (statique) | **GARDER tel quel** (rôle distinct : seed facts par œuvre) |
| contracts-canon | `packages/contracts-canon` | canon des **contrats d'interface** (gouvernance) | LIVE | LIVE | **HORS-SUJET** (ne pas confondre avec canon narratif) |

### 2.B — TRUTH-GATES (5)
| Gate | Chemin | Rôle | Câblage | Statut | **SORT** |
|---|---|---|---|---|---|
| **truth-gate (package)** | `packages/truth-gate` | V-RAIL-SEPARATION + V-HASH-CHAIN + drift + ledger ; 217/217 | importé par **personne** | DORMANT (sain) | **RÉACTIVER** = gardien naturel des rails canon-kernel |
| unified-truth-gate | `creation-pipeline/src/gates/unified-truth-gate.ts` | Canon Lock C.4 (prose dérive de canon+plan) | WIRED (stage-gates) | ACTIVE-WIRED | **GARDER** (gate prod) ; rebrancher sur rails en V2, pas maintenant |
| scribe runTruthGate | `scribe-engine/src/gates/truth-gate.ts` | prose vs canon/plan | WIRED (rewriter:43) | ACTIVE-WIRED | **GARDER** |
| gateway truth_gate | `gateway/src/gates/truth_gate.ts` | createTruthGate | gateway-only | DORMANT | **MUSEUM** |
| src/gates truth-gate | `src/gates/truth-gate.ts` | + full-pipeline test | ORPHAN | ORPHAN | **MUSEUM** |

### 2.C — MÉMOIRE / WORLD-MODEL & ÉPISTÉMIQUE VIVANT
| Module | Chemin | Rôle | Statut | **SORT** |
|---|---|---|---|---|
| memory_layer_nasa | `gateway/src/memory/memory_layer_nasa/*` | store/digest/snapshot/decay/tiering (World Model) | DORMANT (certifié) | **ADAPT via ACL** (lire, jamais muter) |
| ripple_engine | `gateway/src/gates/ripple_engine.ts` | propagation conséquences | DORMANT | ADAPT-candidat (optionnel V2) |
| genesis Subtext/Beat | `genesis-planner/src/types.ts:82-106` | character_thinks/reader_knows + dramatic_irony + reveal/withhold | **ACTIVE-WIRED** (scribe) | **EXTEND** → graphe persistant par perso (seul vrai neuf, cf spec dédiée) |

---

## 3. PLAN DE CONSOLIDATION (ordonné, non destructif)
1. **Geler la doctrine** : ce document = la source de vérité du choix canonique. Toute future tentative de créer un canon/gate = STOP + référer ici.
2. **Marquer MUSEUM** (doc-only, pas de suppression) : `src/canon`, `gateway/src/gates/canon_engine.ts`, `gateway/src/gates/truth_gate.ts`, `src/gates/truth-gate.ts`. → respecte EMP-15 (DOCUMENTATION_TOPOLOGY_MUSEUM) : muséifier ≠ supprimer. **Décision de marquage = Architecte** (je ne touche pas sans GO).
3. **Réactivation rails** (futur, gaté) : câbler canon-kernel rails + truth-gate package derrière un adapter, avec **nouveaux tests d'intégration** (le contrat unitaire est vert, l'intégration ne l'est pas encore).
4. **Ne PAS toucher** les 2 gates prod câblés (`unified-truth-gate`, scribe `runTruthGate`) en V1 — risque de casse. Leur rebranchement sur rails = V2.
5. **EXTEND** Subtext → graphe de connaissance persistant par personnage (cf `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md`).

---

## 4. Arbitrage Tribunal (enregistré)
- **Convergence Gemini + ChatGPT** : canon-kernel = noyau unique ; déprécier les autres en ORPHAN/MUSEUM ; `gateway/memory` = ADAPT via Anti-Corruption Layer (jamais muter FROZEN/dormant) ; étendre Subtext = seul vrai neuf ; **mensonge attribué = V1** (vital polar/thriller), **rêve/hallucination = V2**.
- **Divergence tranchée par la doctrine Architecte (1000%)** : Gemini disait « GO P1 maintenant » ; ChatGPT disait « insère P0.5 d'abord ». → **P0.5 retenu** (preuve + specs avant code), conforme à « on ne démarre qu'à 1000% sûr ». La preuve runtime (§ rapport) valide le noyau ; les specs (graphe perso, adapter) restent à produire avant P1.

---

## 5. VERDICT
- **Statut : PASS** (décision fondée sur preuve runtime + cartographie exhaustive). **Confiance : Haute.**
- **Forces** : (1) noyau choisi **avec preuve** (284/284), pas opinion ; (2) supprime le risque de 5ᵉ canon/6ᵉ gate ; (3) non destructif (MUSEUM ≠ delete, EMP-15) ; (4) ne touche aucun gate prod câblé ; (5) enregistre l'arbitrage multi-IA + la divergence tranchée.
- **Faiblesses** : (1) le **marquage MUSEUM effectif** requiert GO Architecte (je ne déprécie rien sans validation) ; (2) l'**intégration** rails↔adapter n'est pas prouvée (seul l'unitaire l'est) → tests d'intégration obligatoires avant prod ; (3) rebrancher un jour `unified-truth-gate` sur les rails = chantier V2 non chiffré ; (4) `contracts-canon` partage le mot « canon » → risque de confusion documentaire à surveiller.
- **Risques restants** : réveiller un rail latent peut exposer des bugs d'intégration dormants (précédent S11.Z) ; muséifier un module encore référencé ailleurs casserait un build → vérifier `git check-ignore`/imports avant tout marquage.
- **Action requise** : **2 specs P0.5 restantes** (`CHARACTER_KNOWLEDGE_GRAPH_SPEC.md`, `BOOK_FACTORY_ADAPTER_STRATEGY.md`) avant GO P1. **Validation Architecte** sur : (a) canon-kernel = noyau (proposé, prouvé) ; (b) autorisation de marquage MUSEUM des canons/gates orphelins ; (c) périmètre V1 = mensonge attribué inclus / rêve reporté V2. ZÉRO code Book-Factory avant ces GO.
