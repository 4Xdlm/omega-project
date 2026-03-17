# OMEGA Phase W — DAY 2 REPORT
**Date**: 2026-03-17
**Branch**: phase-w-mixer
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## MISSION STATUS

| Mission | Description | Status |
|---------|-------------|--------|
| A | Diagnostic dictionnaires | DONE — Root cause: corpus 70% English, dictionaries 100% French |
| B | Dictionnaires corpus-driven | DONE — 100% coverage (800+800+104+109 entries) |
| C | Adapter perturbation_engine | DONE — P04 rewritten to target f27d epistemic words directly |
| D | Pilot v2 validation | DONE — 4/7 PASS, 3/7 documented |
| E | Run complet (8225) | DONE — 207s, all results saved |
| F | Dérivées partielles | DONE — partial_derivatives.json + report |
| G | Commit + rapport | DONE — this file |

---

## DIAGNOSTIC (Mission A)

**Root cause**: Le corpus Gutenberg est à ~70% anglais (top words: "the", "of", "and").
Les dictionnaires originaux étaient 100% français.

Couverture AVANT fix:
| Dictionnaire | Couverture |
|---|---|
| synonyms_rare_to_common.json | 17.0% (66/389) |
| synonyms_common_to_rare.json | 79.8% (276/346) |
| verbs_action_to_state.json | 37.7% (60/159) |
| modal_markers.json | 29.7% (30/101) |

Couverture APRÈS fix (corpus-driven):
| Dictionnaire | Couverture |
|---|---|
| synonyms_rare_to_common.json | **100.0%** (800/800) |
| synonyms_common_to_rare.json | **100.0%** (800/800) |
| verbs_action_to_state.json | **100.0%** (104/104) |
| modal_markers.json | **9.8%** des phrases (2808/28583) |

---

## PILOT v2 RESULTS (Mission D)

| Type | Feature cible | Delta @ 0.50 | Status |
|------|---------------|-------------|--------|
| P01_UNIFORMIZE_RHYTHM | f1a_rhythm_variance | -13.2% | **PASS** |
| P02_SIMPLIFY_VOCABULARY | f29b_ttr_window | +0.03% | signal (f28d +5.7%) |
| P03_COMPLEXIFY_SYNTAX | f1_mean | +7.3% | **PASS** |
| P04_REMOVE_INTERIORITY | f27d_modal_score | -28.1% | **PASS** (fixé!) |
| P05_INJECT_SYNCOPES | f1_mean | -9.8% | **PASS** |
| P06_ENRICH_VOCABULARY | f29b_ttr_window | -0.03% | signal (f21e +1.6%) |
| P07_NEUTRALIZE_TENSION | f30d_ps_imp_ratio | ~0% | faible densité verbes |

P02/P06: TTR est robust aux remplacements de mots individuels (5-25 mots sur 1000-3000).
L'effet se manifeste sur d'autres features (ritual_index, sil_score).
P07: Densité trop faible de verbes d'action dans les chapitres pilotes (0-2 modifiés sur 6 chapitres).

---

## RUN COMPLET (Mission E)

- **Volume**: 235 chapitres × 7 types × 5 amplitudes = **8225 perturbations**
- **Durée**: 207.2 secondes (0.025s/perturbation)
- **Output**: bench_results_full/bench_report.json (8225 entrées)

---

## MATRICE DES DÉRIVÉES PARTIELLES (Mission F)

### La formule physique de l'écriture littéraire

Slope = dérivée partielle du z-score catégoriel par rapport à l'amplitude.
Significativité: *** p<0.001, ** p<0.01, * p<0.05

```
                                    MUSICAL.  COMPLEX.  SENSOR.  LEXICAL  INTÉR.   TENSION
P01_UNIFORMIZE_RHYTHM                +0.009    +0.026*   -0.016   +0.026*  -0.006   +0.002
P02_SIMPLIFY_VOCABULARY              +0.000    -0.000    -0.020*  -0.003   -0.003   +0.005*
P03_COMPLEXIFY_SYNTAX                +0.012    +0.201*** -0.003   +0.128*** +0.092*** -0.466***
P04_REMOVE_INTERIORITY               -0.001    -0.012*** -0.015*  -0.034*** -1.118*** -0.000
P05_INJECT_SYNCOPES                  -0.029    -0.217*** +0.103*  -0.177*** -0.254*** -0.318***
P06_ENRICH_VOCABULARY                +0.001    -0.001    -0.022*  +0.009*** -0.009   +0.022*
P07_NEUTRALIZE_TENSION               +0.000    +0.000    -0.005** -0.001   +0.000   -0.001
```

### Top 5 Insights

1. **P04 (intériorité)** est le levier le plus puissant : slope=-1.118 sur INTÉRIORITÉ (r²=0.49).
   Retirer les marqueurs épistémiques a un effet massif, linéaire et reproductible.

2. **P03 (syntaxe)** a le plus d'effets croisés : augmente COMPLEXITÉ (+0.201), LEXICAL (+0.128),
   INTÉRIORITÉ (+0.092), et DIMINUE TENSION (-0.466). Fusionner des phrases courtes en phrases
   longues change tout le profil stylistique.

3. **P05 (syncopes)** est un destructeur universel : il diminue 5/6 catégories (COMPLEXITÉ -0.217,
   INTÉRIORITÉ -0.254, TENSION -0.318, LEXICAL -0.177) mais AUGMENTE SENSORIEL (+0.103).
   Les fragments courts ajoutent de la concrétude sensorielle.

4. **MUSICALITÉ résiste** à toutes les perturbations : aucun effet significatif sur aucun des
   7 types. Le rythme phrasal est une propriété émergente, pas réductible à un levier simple.

5. **P02/P07 sont quasi-inopérants** sur les features ciblées, mais P02 a un effet significatif
   sur SENSORIEL (-0.020) et P07 sur SENSORIEL (-0.005). Le remplacement lexical modifie
   principalement le registre sensoriel, pas la richesse lexicale mesurée par TTR.

---

## FILES CREATED/MODIFIED

| File | Action | Purpose |
|------|--------|---------|
| build_corpus_dictionaries.py | CREATED | Extracteur vocabulaire corpus-driven |
| resources/synonyms_rare_to_common.json | UPDATED | 800 paires (100% coverage) |
| resources/synonyms_common_to_rare.json | UPDATED | 800 paires (100% coverage) |
| resources/modal_markers.json | UPDATED | 109 marqueurs EN+FR |
| resources/verbs_action_to_state.json | UPDATED | 104 mappings EN+FR |
| perturbation_engine.py | MODIFIED | P04 rewritten for f27d targeting |
| compute_partial_derivatives.py | CREATED | Régression linéaire + z-scores |
| bench_results_full/ | CREATED | 8225 résultats + rapport |
| DAY2_REPORT.md | CREATED | Ce fichier |

---

## PROCHAINES ÉTAPES

1. **Enrichir P02/P06** : Utiliser un vrai thésaurus (WordNet ou synonymes phonétiques)
   pour obtenir des remplacements sémantiquement cohérents qui impactent le TTR
2. **Enrichir P07** : Ajouter les formes participiales et gérondives des verbes d'action
3. **Investiguer MUSICALITÉ** : Pourquoi le rythme phrasal est-il immunisé ?
   Piste : la variance est calculée sur des fenêtres larges, un seul changement local
   ne suffit pas à la perturber
4. **Matrice de sensibilité inverse** : Pour chaque feature, quel est le meilleur levier ?
5. **Intégrer dans sovereign-engine** : Utiliser les dérivées partielles pour calibrer
   les poids de polish/correction automatique

---

**Architect**: Francky | **IA Principal**: Claude Code
**8225 perturbations. 7×6 matrice. La physique de l'écriture est mesurable.**
