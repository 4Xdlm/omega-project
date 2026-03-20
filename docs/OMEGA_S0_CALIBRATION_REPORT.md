# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — RAPPORT PHASE S0 : ÉPREUVE DE VÉRITÉ DU LANGAGE LLM
# "Sortir la vérité mathématique — millimétrée"
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-20
# Model        : claude-sonnet-4-20250514
# API calls    : 370 / 400 budget
# Tests        : 1859 GREEN (post-fix S0.1)
# Standard     : NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. RÉSUMÉ EXÉCUTIF

Phase S0 complète en 370 API calls. **Principe #6 de Francky CONFIRMÉ** : le LLM ne se
connaît pas parfaitement. Sur 8 features testées, les instructions hybrides (humain + métriques)
battent les instructions du LLM dans 4 cas sur 8. Les 4 features CORE sont toutes SOLIDES
(taux ≥ 80%). Une seule ILLUSION DÉCLARATIVE identifiée (f17_knife_count).
Un bug fix critique appliqué (f5c substring matching → exact matching, +7 tests).

---

# 2. AUDIT f5c — S0.1

| Attribut | Valeur |
|----------|--------|
| Ratio avant fix | 3.5 (ABSURDE — max théorique = 1.0) |
| Diagnostic | BUG_DOUBLE_DÉFAUT |
| Bug 1 | Substring matching : `'dit'` matchait `tradition`, `condition`, `esprit` |
| Bug 2 | Dénominateur incohérent : actionVerbCount indépendant de verbCount |
| Fix | ACTION_VERB_FORMS (70 formes exactes, Set.has()) + actionVerbCount ⊆ verbCount |
| Tests post-fix | 1859 GREEN (+7 vs 1852) |
| SHA-256 | `A1EC10A27FB9B41BFA95767C5F1C7FF87E30BC5AF2A5109D40D84AC08BA06AFD` |

---

# 3. BENCH FEATURES PILOTABLES — S0.2 (100 tests)

| Feature | Taux global | Verdict | R6 moyen |
|---------|-------------|---------|----------|
| f29d_ttr_score | **0.80** | SOLIDE | 56.1 |
| f24e_contrast_score | **1.00** | SOLIDE | 53.0 |
| f15b_redundancy_compression | **1.00** | SOLIDE | 58.8 |
| f16a_bigram_rarity | **1.00** | SOLIDE | 55.1 |

**4/4 CORE SOLIDES.** f24e, f15b, f16a à taux parfait (1.0). f29d à 0.80 — seuil juste.

---

# 4. BENCH CONTRADICTOIRE — S0.3 (240 tests)

## Principe #6 : le LLM ne se connaît pas

| Feature | Gagnant | Taux | R6 moyen gagnant | Verdict |
|---------|---------|------|-------------------|---------|
| f29d_ttr | **C (hybride)** | 0.80 | 61.37 | SOLIDE |
| f24e_contrast | **B (humain)** | 1.00 | 52.69 | SOLIDE |
| f15b_compression | **C (hybride)** | 1.00 | 58.17 | SOLIDE |
| f16a_bigram | **C (hybride)** | 1.00 | 62.47 | SOLIDE |
| f25g_description | **C (hybride)** | 0.80 | 54.10 | SOLIDE |
| f17_knife | A (LLM) | 0.20 | 55.58 | **ILLUSION** |
| f35c_hook | A (LLM) | 0.90 | 55.19 | SOLIDE |
| f36c_cliff | A (LLM) | 1.00 | 54.67 | SOLIDE |

### Découvertes majeures

1. **Variante C (hybride métriques) gagne 4/8 features** : f29d, f15b, f16a, f25g.
   Quand on donne au LLM une CIBLE CHIFFRÉE, il produit de meilleurs résultats.

2. **Variante B (humain) gagne 1/8** : f24e_contrast.
   L'instruction humaine "une phrase sur trois < 8 mots" bat l'instruction LLM vague.

3. **Variante A (LLM) gagne 3/8** : f17, f35c, f36c.
   Pour f35c et f36c, l'instruction LLM est efficace. Pour f17 : taux 0.20 = ILLUSION.

4. **f17_knife_count = ILLUSION DÉCLARATIVE** : le LLM CROIT pouvoir produire des "mots
   percutants" mais le taux de respect est 0.20. Aucune variante ne fait mieux que 0.20.
   La feature est NON PILOTABLE par instruction textuelle.

5. **Principe #6 VALIDÉ** : dans 5 cas sur 8, l'instruction du LLM est battue ou égalée
   par une formulation humaine/hybride. Le LLM ne se connaît pas parfaitement.

---

# 5. BENCH CONTOURNABLES — S0.4 (30 tests)

## f27d_modal_score (Modalisation)

| Stratégie | Mean value | R6 moyen | Description |
|-----------|-----------|----------|-------------|
| S1 (LLM P3) | 0.234 | 53.54 | Perceptions floues, métaphores instabilité |
| S2 (humain) | 0.517 | 52.43 | Vocabulaire approximation, questions implicites |
| **S3 (hybride)** | **0.594** | 50.74 | Métriques : 2 verbes perception/paragraphe |

**Gagnant : S3 (hybride).** La modalisation est CONTOURNABLE avec des métriques précises.
Progression : baseline P1 = 0.273 → S3 = 0.594 (+117%). Le profil classique INTROSPECTION
a un f27d de 0.309. S3 atteint 0.594 — SURPASSEMENT du classique.

## f5c_action_verb_ratio (Ratio verbes d'action)

| Stratégie | Mean value | R6 moyen | Description |
|-----------|-----------|----------|-------------|
| S1 (LLM P3) | 0.135 | 53.53 | Substantifs mouvement, sensations kinesthésiques |
| **S2 (humain)** | **0.426** | 45.86 | Verbes physiques explicites : saisir, bondir, frapper |
| S3 (hybride) | 0.076 | 51.90 | Métriques 1 verbe action / 3 phrases |

**Gagnant : S2 (humain).** L'instruction directe "remplacer par des verbes physiques" bat
l'approche métrique. MAIS le R6 chute à 45.86 (vs 53.53 pour S1). **Trade-off détecté** :
forcer les verbes d'action DÉGRADE la qualité globale.

---

# 6. BENCH MICRO-CHIRURGIE — S0.5

**0 tests exécutés.** Bug de script : les extracts P2 stockent `file` + `offset`, pas de
texte inline. Le script cherchait `extractData.passage || extractData.text`.

Ce n'est PAS bloquant : la micro-chirurgie est déjà validée en Rosetta P3 Bloc E
(Proust +1.95 pts R6 avec 3 phrases modifiées). Le script sera corrigé en S1.

---

# 7. CLASSIFICATION FINALE

| Catégorie | Count | Features |
|-----------|-------|----------|
| **SOLIDE** | 7 | f29d, f24e, f15b, f16a, f25g, f35c, f36c |
| PROMETTEUSE | 0 | — |
| EXPÉRIMENTALE | 0 | — |
| **ILLUSION** | 1 | f17_knife_count |

### Instructions optimisées retenues

| Feature | Gagnant | Instruction optimisée |
|---------|---------|----------------------|
| f29d_ttr | C | "Vocabulaire varié. MÉTRIQUE : ratio types/tokens > 0.75 par fenêtre 100 mots." |
| f24e_contrast | B | "Une phrase sur trois < 8 mots. Une phrase sur trois > 25 mots." |
| f15b_compression | C | "Zéro redondance. MÉTRIQUE : aucun bigramme > 2 fois dans le texte entier." |
| f16a_bigram | C | "Associations originales. MÉTRIQUE : > 90% des bigrammes uniques." |
| f25g_description | C | "Description sensorielle dense. MÉTRIQUE : ≥ 8 mots sensoriels / 100 mots." |
| f17_knife | — | **NON PILOTABLE.** Aucune instruction ne fonctionne. |
| f35c_hook | A | "Commence par une phrase d'accroche qui crée de la tension." |
| f36c_cliff | A | "Termine sur une note de suspense ou d'incomplétude." |

---

# 8. MATRICE ROSETTA v1

Fichier : `results_rosetta/s0/rosetta_claude-sonnet-4-20250514_v1.json`

3 couches implémentées :
- `declared_instruction` : ce que le LLM dit vouloir (Dictionnaire v3)
- `validated_instruction` : ce que les tests prouvent (= declared si A gagne)
- `optimized_instruction` : ce qui marche MIEUX (B ou C si elles gagnent)

---

# 9. RÉPONSE FINALE : "COMMENT LUI PARLER POUR QU'IL COMPRENNE ?"

1. **Donner des MÉTRIQUES CHIFFRÉES** (variante C). Le LLM respect mieux "ratio > 0.75"
   que "vocabulaire varié". 4/8 features gagnées par l'hybride.

2. **Donner des RÈGLES STRUCTURELLES** (variante B pour contraste). "1 phrase sur 3 < 8 mots"
   est plus efficace que "alterne phrases courtes et longues".

3. **NE PAS faire confiance aux instructions vagues du LLM** (Principe #6). "Ajoute des mots
   percutants" produit un taux de 20%. C'est une ILLUSION DÉCLARATIVE.

4. **Les accroches (f35c) et cliffhangers (f36c) marchent avec les instructions simples du LLM**.
   Pas besoin de compliquer — l'instruction A suffit.

5. **La modalisation (f27d) est CONTOURNABLE** avec des métriques précises (+117% vs baseline).

6. **Les verbes d'action (f5c) sont pilotables MAIS dégradent la qualité** (R6 -7.7 pts).
   Trade-off à surveiller.

---

# 10. RECOMMANDATIONS POUR PHASE S1

1. **Fixer S0.5** : ajouter `reExtractPassage()` au script pour charger les textes depuis
   les fichiers source via file+offset.

2. **Intégrer les 7 instructions SOLIDES** dans le prompt-assembler (avec flag contrôlé).

3. **Exclure f17_knife_count** du prompt — c'est une illusion.

4. **Implémenter le PROFILEUR V1** : composition (pondération features) + alignment
   (distance au profil classique) + feasibility (features pilotables vs bloquées).

5. **Bench contrôlé S1** : comparer baseline (sans instructions) vs prompt optimisé
   (7 instructions SOLIDES + 2 contournables).

---

# 11. FICHIERS PRODUITS

| Fichier | Phase | API |
|---------|-------|-----|
| s01_audit_f5c.json | S0.1 | 0 |
| s02_bench_pilotables.json | S0.2 | 100 |
| s03_bench_contradictoire.json | S0.3 | 240 |
| s04_bench_contournables.json | S0.4 | 30 |
| s05_bench_micro_chirurgie.json | S0.5 | 0 (bug) |
| s06_classification_regles.json | S0.6 | 0 |
| rosetta_claude-sonnet-4-20250514_v1.json | S0.7 | 0 |
| OMEGA_S0_CALIBRATION_REPORT.md | S0.8 | 0 |

---

*Rapport S0 — 2026-03-20*
*370 API calls. 7 SOLIDES. 1 ILLUSION. Principe #6 VALIDÉ.*
*"Le LLM ne se connaît pas parfaitement lui-même" — Francky*
*"Donnez-lui des MÉTRIQUES, pas des labels" — S0*
