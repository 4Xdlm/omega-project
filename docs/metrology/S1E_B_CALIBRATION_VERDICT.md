# S1E-B — VERDICT CALIBRATION + JURY (negative controls)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Test** : negative controls source-blind, sorties A/B/TIE, double ordre, gemma4 + mistral-small. 24 paires/cellule × 2 ordres × 2 cellules × 2 modèles.

## Résultats
| Modèle / cellule | paires | tie_rate | position_bias | verdict |
|---|---|---|---|---|
| **gemma4** MASTER-vs-MASTER | 24 | 0.125 | **0.524** | calibré, non biaisé |
| **gemma4** PULP-vs-PULP | 24 | **0.292** | **0.500** | calibré (hésite + sur cas proches) |
| mistral-small MASTER-vs-MASTER | 24 | 0.104 | **0.930** | ❌ biais position |
| mistral-small PULP-vs-PULP | 24 | 0.062 | **0.978** | ❌ biais position |

## CONCLUSIONS
### 1. gemma4 = JUGE CALIBRÉ (validé sur calibration)
- **Position_bias ≈ 0.50** sur les 2 cellules → aucun biais de position (contraste qwen 0.71 / mistral 0.93).
- **Sait dire TIE** : 12,5% entre maîtres, **29% entre pulps**. Le gradient est sain : il s'abstient PLUS quand les deux textes sont du même bas niveau (distinction réellement difficile) et MOINS entre maîtres. → ce n'est PAS une machine à sous.
- Donc le **1.0 de gemma sur maître-vs-pulp (S1D/S1E-A) est crédible** : confiance élevée sur les vrais écarts, abstention sur les cas proches. Mon soupçon « 0 TIE = sur-confiance » est levé (artefact des 20 premiers jugements).

### 2. JURY MULTI-LLM : NON VIABLE localement
- **qwen3 biais 0.71** (S1D) + **mistral-small biais 0.93-0.98** (ici) → **2 des 3 juges candidats sont disqualifiés pour biais de position**. Seul gemma est propre.
- Le biais de position en jugement pairwise est un **défaut connu et répandu** des LLM-juges ; gemma fait exception. → l'idée de jury complémentaire (Architecte) est correcte en théorie (Condorcet), mais **inapplicable faute d'un 2ᵉ juge local non biaisé**. Pour un vrai jury, il faudrait tester d'autres modèles (Phi-4, Command-R, Llama3.3) — la plupart échoueront probablement au même test.
- **gemma reste le seul juge validé** d'OMEGA à ce stade.

## ÉTAT GLOBAL S1 (récap)
- **Époque** : réfutée comme confond unique (gemma 1.0 + embeddings 0.79 survivent modern-vs-modern source-blind, S1E-A).
- **Calibration** : gemma PASS (non biaisé, tie sain). mistral/qwen FAIL (biais position).
- **Embeddings nomic** : 0.79 era-robust, au plafond mondial qualité (~0.75-0.80) → radar géométrique viable (OBJ4).
- **Confond restant = GENRE** : gemma sépare peut-être littéraire-vs-genre, pas qualité pure. **SAME_GENRE différé = EVIDENCE_GAP** (Gold-Set sans paires appariées-genre ; nos maîtres ne sont pas de la fiction de genre ; pas de tag genre par livre). À combler par expansion corpus (genre-tag) en V4.

## VERDICT
- **Statut** : gemma4 = **juge calibré, non biaisé, era-robuste** — le plus solide résultat OBJ1 d'OMEGA. Jury multi-LLM NON viable (qwen+mistral biaisés). Confond genre NON résolu (gap corpus).
- **Confiance** : Haute sur calibration/non-biais gemma ; Haute sur jury-non-viable ; le « gemma juge la qualité » reste **conditionné** à la levée du confond genre.
- **Forces** : gemma calibré prouvé (tie 12-29%, bias 0.50) ; jury tranché par preuve (2/3 disqualifiés) ; embeddings era-robustes.
- **Faiblesses** : (1) genre non disentangled → gemma peut-être littéraire-vs-genre ; (2) un seul juge propre = pas de redondance anti-circularité (gemma seul) ; (3) n modéré (24 paires/cellule).
- **Action** : (a) SAME_GENRE en V4 après expansion corpus genre-tagué (gap documenté) ; (b) éventuel test Phi-4/Command-R/Llama3.3 pour trouver un 2ᵉ juge non biaisé ; (c) challenger embedding bge-m3 ; (d) **décision Architecte** : adopter gemma comme juge advisory (sous réserve genre) + embeddings comme radar OBJ4 ?
