# PLAN D'ACTION — scribe-engine, moteur d'écriture + correction conforme Codex

**Auteur** : Claude Code · **Base** : audit `SCRIBE_ENGINE_FULL_AUDIT_2026-05-31.md` + Codex v1.3.1 (PARTIE VII) · **Statut** : PROPOSED (chaque phase = GO_CODE Architecte).

## 0. Vision cible
Scribe = **un seul** moteur où **la génération LLM (R6)** produit des candidats et **le CALC douanier (gates/oracles)** sélectionne par **rejection sampling** — conforme aux lois scellées : *CALC=douanier*, *feedback sémantique interdit* (régénération, pas coaching), *déterminisme* (seeds), *fail-closed*. Le tout pilotable par le contrat émotionnel et scoré par S-Oracle V2 (sovereign-engine).

## 1. Diagnostic (rappel audit)
Conformité Codex **solide** (CALC pur, déterministe, 14D dormant, fail-closed restauré, 0 any). Deux findings S2 :
- **S2-1** : la « correction » déterministe = micro-tweaks rule-based, pas une amélioration sémantique. L'intelligence (LLM `weaveLLM`) n'est PAS dans la boucle gates/oracles.
- **S2-2** : deux chemins de génération disjoints (`weave` règle / `weaveLLM` LLM).

## 2. Corrections de conformité (dette → conforme)
| # | Action | Effort | Risque |
|---|---|---|---|
| C1 | Ratifier **LAW-SCRIBE-INTENT-001** (IntentArtifact fail-closed) au Codex (déjà implémenté+testé) | LOW | nul |
| C2 | Migration logger scribe (51 console.* réels) — **phase DEC-006**, après P0 (fait), gaté | MED | bas (hors chemin hashé d'abord) |
| C3 | Documenter `chaos-provider` OFF obligatoire en mode hashé (garde déterminisme) | LOW | nul |
| C4 | Test dédié `prosepack/repair.ts` (588 LOC) si couverture insuffisante | LOW | nul |

## 3. Améliorations de perfection (architecture — le cœur)
| # | Action | Détail | Effort | Risque |
|---|---|---|---|---|
| **P1** | **Boucle unique R6 : LLM génère → CALC rejette** | Composer `weaveLLM` (N candidats, seeds divers) → 7-gates + 6-oracles (rejection) → meilleur passant. Réutiliser la doctrine R6 (ADR-003) déjà éprouvée dans sovereign-engine, PAS réinventer. Le « rewriteLoop » rule-based devient soit (a) fallback offline déterministe, soit (b) déprécié. | HIGH | MED — chemin LLM, déterminisme à préserver (seeds), tests-avant-patch |
| **P2** | **Unifier les 2 chemins** derrière une interface `ProseGenerator` (impl `RuleWeaver` déterministe / `LLMWeaver`) injectable | supprime la duplication S2-2, un seul orchestrateur dans engine.ts | MED | MED (signatures) |
| **P3** | **Correction = régénération ciblée sous gate**, JAMAIS coaching | si un gate échoue, régénérer le segment fautif (nouveau seed/variante) et re-juger — rejection, conforme « feedback toxique interdit ». PAS de réinjection de scores comme directives. | HIGH | HIGH — frontière doctrinale stricte, validation 3-IA recommandée |
| **P4** | Clarifier la frontière **scribe vs sovereign-engine** | scribe = génération+gates structurels (CALC) ; sovereign = S-Oracle V2 (scoring 5 macro-axes) + R6 rejection esthétique. Décider où vit la sélection finale (éviter double rejection divergente). ADR dédié. | MED | MED |

## 4. Modules manquants / insuffisants
- **`ProseGenerator` interface** (P2) — absente ; les 2 weavers ont des signatures ad hoc.
- **Boucle de régénération ciblée sous gate** (P3) — absente ; le rewriter actuel régénère tout from-scratch par seed (grossier).
- **Pont scribe→sovereign R6** — actuellement disjoint ; à formaliser (qui juge, qui rejette).
- **Logger injecté** (DEC-006) — non encore câblé dans scribe.

## 5. Roadmap d'exécution (phases gatées)
1. **Phase A (conformité, LOW risk)** : C1+C3+C4 + LAW ratification. Gate wrapper. *(rapide, sûr)*
2. **Phase B (logger scribe)** : C2, migration phasée DEC-006 (hors chemin hashé d'abord). Gate + (engine en dernier, vérif déterminisme).
3. **Phase C (ADR architecture)** : rédiger l'ADR « unification génération + frontière scribe/sovereign » (P2+P4) → validation Tribunal/Architecte AVANT code.
4. **Phase D (boucle R6 LLM+CALC)** : P1 implémenté derrière feature-flag, bench avant/après (golden runs), tests-avant-patch, validation 3-IA. Le plus fort impact qualité, le plus haut risque → dernier, le plus encadré.
5. **Phase E (régénération ciblée)** : P3, sous garde-fou doctrinal strict (feedback interdit), bench.

## 6. Interaction pipeline cible
```
genesis-planner (Plan/Intent/Canon/Constraints, contrat émotionnel)
      │  IntentArtifact (validé fail-closed)
      ▼
scribe-engine : ProseGenerator (LLMWeaver R6 -> N candidats)
      │            └─ CALC douanier : 7 gates + 6 oracles (rejection, déterministe)
      ▼  meilleur candidat passant (+ fallback below_threshold flag, ADR-003)
sovereign-engine : S-Oracle V2 (5 macro-axes ECC/AAI/RCI/SII/IFI) + R6 esthétique
      ▼
creation-pipeline : orchestration, evidence pack, verdict
```
Principe : **une seule autorité de rejection par étage** (structurel = scribe gates ; esthétique = sovereign R6) ; pas de double rejection contradictoire.

## VERDICT (plan)
- Statut : **PROPOSED** — exécution par phase sur GO_CODE.
- Forces : aligne scribe sur la doctrine R6 déjà éprouvée ; sépare clairement génération (LLM) et sélection (CALC douanier) ; respecte feedback-interdit + déterminisme.
- Faiblesses : (1) P1/P3 touchent le chemin LLM sensible → bench + tests-avant-patch + validation 3-IA obligatoires ; (2) la frontière scribe/sovereign (P4) est une décision d'architecture qui doit précéder le code.
- Risques : déterminisme (seeds candidats), divergence de rejection scribe/sovereign — mitigés par phasage (ADR Phase C avant code Phase D/E).
- Action requise : GO Phase A (conformité, sûr) immédiatement possible ; Phases C→E = ADR + validation avant code.
