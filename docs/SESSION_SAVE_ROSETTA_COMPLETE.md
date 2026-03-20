# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — ROSETTA COMPLÈTE (P1+P2+P3) + DÉCISIONS POST-CONSULTATION
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-20
# HEAD         : rosetta-complete (tag sur 4862baf7+)
# Branche      : phase-w-mixer
# Tests        : 1852 GREEN
# Standard     : NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. RÉSUMÉ EXÉCUTIF

Trois phases de l'Opération Rosetta exécutées en ~6 heures (~88 appels API) :
- P1 : Le LLM produit TOUJOURS de l'introspection, quel que soit le style
- P2 : 8 features pilotables, 9 irréductibles, convergence itérative ÉCHOUE
- P3 : Reverse prompting, auto-classification 8 groupes, micro-chirurgie VALIDÉE

Consultation cross-IA (3 rounds) : 13 décisions verrouillées.
Principe #6 de Francky ajouté : le LLM ne se connaît pas parfaitement.

---

# 2. LES 6 PRINCIPES ROSETTA

| # | Principe | Source |
|---|---------|--------|
| 1 | Classiques = ancre, LLM = espace à cartographier | Francky + 3/3 IAs |
| 2 | Le LLM ne comprend pas les labels stylistiques, il faut des contraintes mécaniques | Rosetta P1 |
| 3 | La convergence itérative EMPIRE la prose — le premier tir est le meilleur | Rosetta P2 |
| 4 | La micro-chirurgie bornée (phrase par phrase) FONCTIONNE | Rosetta P3 |
| 5 | OMEGA garde sa langue. Le traducteur s'adapte au LLM, pas l'inverse | Francky |
| 6 | Le LLM ne se connaît pas parfaitement — ses instructions sont des hypothèses à vérifier par VARIATIONS et MÉTRIQUES | Francky |

---

# 3. DÉCISIONS VERROUILLÉES (consultation cross-IA finale)

## D1 — Prompt-assembler V1 : lot minimal

| Catégorie | Features | Action |
|-----------|----------|--------|
| **CORE V1** | f29d, f15b, f16a, f24e | Dans le prompt |
| **EXP V1.1** | f25g | Flag expérimental |
| **HORS PIPELINE** | Tout le reste | Quarantaine |

## D2 — Quarantaine

| Élément | Statut |
|---------|--------|
| Labels LLM ("Prose périodique à incises méditatives") | QUARANTAINE |
| 8 groupes auto-classifiés | QUARANTAINE |
| Stratégies substitution Bloc D | QUARANTAINE |
| Pilotability matrix complète | TRAVAIL INTERNE |
| Cas f5c ratio 0.19→3.5 | AUDIT REQUIS |

## D3 — Profileur V1 minimal

- Couche de LECTURE, pas de commande
- Lit ForgePacket.style_genome + archétype existant
- Sorties : composition, alignment_score, feasibility_score
- NE remplace PAS le moteur émotionnel

## D4 — Traducteur versionné par modèle

- OMEGA garde sa langue (nos noms, nos modules)
- Une matrice Rosetta par modèle/version : rosetta_[model]_[version]_v1.json
- Test de compatibilité avant réutilisation (20 phrases sentinelles)
- Si dérive > 30% → recalibration complète

## D5 — Pilotabilité par feature

| Catégorie | Features | Action scoring LLM |
|-----------|----------|-------------------|
| PILOTABLE | f29d, f24e, f15b, f16a, f25g, f17, f35c, f36c | pilotability=1.0 |
| CONTOURNABLE | f27d, f5c (à vérifier) | pilotability=0.5 |
| BLOQUÉE | f28d, f21c, f9a, f1b | pilotability adapté au modèle |

## D6 — Micro-chirurgie V2

- Phrase par phrase, PAS globale
- Contraintes ultra-strictes (verrous de graphe)
- Protocole à consolider sur 100 tests

## D7 — Principe #6 (Francky)

Les instructions du LLM (Dictionnaire v3) sont des HYPOTHÈSES.
Le bench de consolidation doit tester 3 variantes :
- A : Instructions exactes du LLM (baseline)
- B : Variations légères des instructions (reformulations)
- C : Instructions + contraintes métriques précises (hybride)
→ Garder ce qui produit le MEILLEUR résultat mesuré, pas ce que le LLM préférait

---

# 4. RÉSULTATS CLÉS ROSETTA

## Phase 1 — Confusion matrix

| Demandé | Produit (plus proche classique) |
|---------|-------------------------------|
| DESCRIPTION | INTROSPECTION |
| ACTION | INTROSPECTION |
| INTROSPECTION | **INTROSPECTION** (seul MATCH) |
| CONTEMPLATION | INTROSPECTION |
| LYRIQUE | INTROSPECTION |
| DIALOGUE | INTROSPECTION |
| TRANSITION | INTROSPECTION |

## Phase 2 — Features

| Feature | Taux respect | Catégorie |
|---------|-------------|-----------|
| f29d_ttr | 100% | PILOTABLE |
| f15b_compression | 100% | PILOTABLE |
| f16a_bigram | 100% | PILOTABLE |
| f24e_contrast | 88% | PILOTABLE |
| f28d_sil | 0% | BLOQUÉE |
| f27d_modal | 0-13% | CONTOURNABLE (+0.064 en P3) |
| f5c_action | 0% direct, progrès P3 | CONTOURNABLE (audit requis) |

## Phase 3 — Reverse prompting

Le LLM demande :
- INTROSPECTION : "phrases 80-150 mots, 3 niveaux d'emboîtement"
- ACTION : "pivots émotionnels, exclamations courtes"
- LYRIQUE : "accumulation cyclique, rythme incantatoire"
- CONTEMPLATION : N'a PAS reconnu ce style

Micro-chirurgie : Proust +1.95 pts R6 avec 3 phrases modifiées.

---

# 5. FICHIERS DANS LE REPO

## omega-autopsie/results_rosetta/

| Fichier | Phase |
|---------|-------|
| 01_definitions_llm.json | P1 |
| 02_prose_*.txt (×7) | P1 |
| 03_features_llm.json | P1 |
| 04_profiles_classiques.json | P1 |
| 05_table_rosette.json | P1 |
| 06_interrogation_croisee.json | P1 |
| 07_confusion_matrix.json | P1 |
| 08_dictionnaire_omega_llm_v1.json | P1 |
| 09_amelioration_tests.json | P1 |
| 10_test_flaubert.json | P1 |

## omega-autopsie/results_rosetta/phase2/

| Fichier | Phase |
|---------|-------|
| extracts/*.json (×20) | P2 |
| tests/*.json (×20) | P2 |
| convergence/*.json (×4) | P2 |
| dictionnaire_v2_calibre.json | P2 |

## omega-autopsie/results_rosetta/phase3/

| Fichier | Phase |
|---------|-------|
| bloc_a_reverse_micro.json | P3 |
| bloc_b_reverse_macro.json | P3 |
| bloc_c_auto_classification.json | P3 |
| bloc_d_recomposition.json | P3 |
| bloc_e_micro_chirurgie.json | P3 |
| dictionnaire_v3_llm_driven.json | P3 |

## Scripts

| Script | Rôle |
|--------|------|
| scripts/rosetta-orchestrator.ts | P1 pipeline |
| scripts/rosetta-measure.ts | Mesure standalone |
| scripts/rosetta-phase2.ts | P2 pipeline |
| scripts/rosetta-phase3.ts | P3 pipeline |

---

# 6. ROADMAP PROCHAINE SESSION

## Phase S0 — Bench de consolidation (Principe #6)

Pour CHAQUE feature "pilotable" (f29d, f24e, f15b, f16a) :

| Variante | Description | Tests |
|----------|-------------|-------|
| A | Instructions LLM exactes (Dictionnaire v3) | 20 par style × 5 styles |
| B | Variations légères (reformulations humaines) | 20 par style × 5 styles |
| C | Instructions + métriques chiffrées (hybride) | 20 par style × 5 styles |

Total : 300 tests minimum. Durée : ~150 appels API.

Objectif : pour chaque feature, quelle variante produit le MEILLEUR taux de respect ?

## Phase S0b — Audit f5c

Inspection HUMAINE des textes générés en P3 Bloc D.
Le ratio 0.19→3.5 est-il réel ou bug de mesure ?

## Phase S1 — Classification des règles

Basé sur S0 :
- SOLIDE : taux > 80% sur 300 tests
- PROMETTEUSE : taux 50-80%
- EXPÉRIMENTALE : taux < 50%

## Phase S2 — Matrice Rosetta versionnée

Créer : rosetta_claude-sonnet-4-20250514_v1.json
Avec : traductions, facteurs, pilotabilité, test sentinelle

## Phase S3 — Profileur V1

Implémenter le Juge 0 minimal :
composition + alignment + feasibility

## Phase S4 — Bench contrôlé

Comparer :
- Sans profileur (baseline actuelle)
- Avec profileur V1
- Avec prompt amélioré (features CORE)

---

# 7. MESSAGE DE REDÉMARRAGE

```
OMEGA SESSION — CONSOLIDATION POST-ROSETTA

Dernier état : SESSION_SAVE_ROSETTA_COMPLETE
HEAD : rosetta-complete
Branche : phase-w-mixer
Tests : 1852 GREEN

CONTEXTE :
  Rosetta P1+P2+P3 COMPLÈTES
  13 décisions verrouillées par consultation cross-IA
  6 principes Rosetta gravés
  Tag : rosetta-complete

OBJECTIF :
  Phase S0 — Bench de consolidation (300 tests)
  Tester 3 variantes d'instructions par feature pilotable
  Principe #6 : le LLM ne se connaît pas — vérifier par variations

DOCUMENTS À LIRE :
  docs/SESSION_SAVE_ROSETTA_COMPLETE.md (CE FICHIER)
  docs/OMEGA_ROSETTA_PHASE3_REPORT.md
  docs/OMEGA_ROSETTA_PHASE2_REPORT.md
  docs/OMEGA_AUDIT_INTEGRATION_GLOBALE.md
  omega-autopsie/results_rosetta/ (tous les résultats)

PRINCIPE #6 (Francky) :
  Les instructions du LLM sont des HYPOTHÈSES.
  Tester des VARIATIONS et des COMBINAISONS avec métriques.
  Garder ce qui marche le mieux, pas ce que le LLM préférait.

Architecte Suprême : Francky
IA Principal : Claude
```

---

*SESSION_SAVE — Rosetta complète — 2026-03-20*
*Standard NASA-Grade L4 / DO-178C Level A*
*6 principes. 13 décisions. 3 phases. 88 appels API.*
*"Le LLM ne se connaît pas parfaitement lui-même" — Francky*
