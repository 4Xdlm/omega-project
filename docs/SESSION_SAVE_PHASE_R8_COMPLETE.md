# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — PHASE R-8 COMPLETE
# Normalisation Typologique Pondérée + Loi des LEGO
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-21
# Branche      : phase-r-metrology-rebuild
# Tag entrant  : v1.0-phase-r-sealed
# HEAD sortie  : (post R-8.6 commit)
# Standard     : NASA-Grade L4 / DO-178C Level A
# Auteur       : Claude (IA Principal)
# Validé par   : Francky (Architecte Suprême) + ChatGPT (Auditeur) + Gemini (Guardian)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. RÉSUMÉ EXÉCUTIF

Phase R-8 = Normalisation Typologique Pondérée.
7 sous-étapes (R-8.1 → R-8.6 + R-8.3b).
~25 heures de travail. ~20 000 passages analysés. 611 œuvres. 0 API.

Le scorer GB existant (Spearman 0.79) compare chaque texte à une MOYENNE GLOBALE.
R-8 devait comparer chaque texte à ce qu'un MAÎTRE ferait avec CE MIX de types.

## Ce qu'on a découvert

1. Les passages "purs" n'existent PAS à 2000 mots chez les maîtres (2/1380).
   → Solution : estimation continue pondérée (tous les passages utilisés).

2. Le modèle additif simple ne couvre que 21% des features.
   70% sont INTERACTIONNELLES.

3. Les coefficients λ améliorent de 15.5% la reconstruction.
   39/47 features bénéficient de λ.

4. Les termes γ (interactions binaires) ne fonctionnent que pour 3 features
   de subordination/période. Les 6 autres features de maîtrise (SIL, rythme,
   vitesse, épistémique) résistent — leur non-linéarité est SÉQUENTIELLE,
   pas compositionnelle.

5. Le GB utilise f26b_long_sent_rate comme PORTAIL (29% du modèle, seuil 2.4%).
   Deux features sont INVERSÉES : TTR élevé = artificiel, stabilité POV élevée = monotone.

6. Les maîtres TISSENT (desc→desc→intro, 12.1× enrichi).
   Les commerciaux MARTÈLENT (action→dialogue→action, 6× enrichi en C/D).

7. Le bonus d'assemblage est RÉEL : la variance rythmique bondit de +1.81
   chez les S quand on assemble 4 fenêtres, vs +0.18 chez les C.
   Le tout vaut plus que la somme des parties.

---

# 2. PHASES ET VERDICTS

| Phase | Quoi | Verdict | Résultat clé |
|-------|------|---------|-------------|
| R-8.1 | Constantes Ci,f par type | PASS | 5244 passages S-tier, 5 types, moyenne pondérée continue |
| R-8.2 | Validation additivité | PASS | 9 ADDITIVE, 3 SEMI, 30 INTERACTIONAL, 9 ABSOLUTE |
| R-8.3 | Coefficients λi,f | PASS fort | +15.5% global, 39/47 features, NNLS/OLS/Ridge comparés |
| R-8.3b | Résidus post-λ | PASS décisif | Gap S/CD persiste 9/9, AUGMENTE +16.6% après λ |
| R-8.4 | Interactions γij,f | PASS partiel | 3 EFFECTIVE (subordination/période), 5 NEGLIGIBLE, 1 MARGINAL |
| R-8.5 | Seuils Tk du GB | PASS | 10 Tk extraits, f26b=29% du modèle, 2 features inversées |
| R-8.6 | Loi des LEGO | PASS partiel fort | H1+H2 confirmées, H3 rejetée, bonus assemblage 7.4× |

---

# 3. L'ÉQUATION TYPOLOGIQUE HYBRIDE

## Architecture à 3 couches

### Couche 1 — Features ADDITIVES (9 features)

```
f_attendu = Σ(pi × Ci,f)
```

Features : f34b_para, f19a_entropy, f24e_contrast, f15b/f16a_bigram,
f29d_ttr, f24a/b_banal/apex, f29a_ttr_global

### Couche 2 — Features avec λ (31 features)

```
f_attendu = Σ(pi × λi,f × Ci,f)
```

Gain global : +15.5%.
Top gains : f28d_sil (+56%), f27d_modal (+50%), f27b_conditional (+48%)

### Couche 3 — Features avec γ (3 features subordination/période)

```
f_attendu = Σ(pi × λi,f × Ci,f) + Σ(pi × pj × γij,f)
```

Features : f26a_mean_sub_markers, f_subordination_depth_approx, f26c_period_score
Gain total : +23-27%.
Interaction dominante : description × introspection (γ = +3.15, +2.41)

### Couche 4 — Le GB (signal irréductible)

Les features de maîtrise restantes (SIL, rythme, vitesse, épistémique, ponctuation)
ne se réduisent PAS à des termes croisés binaires. Leur non-linéarité est
SÉQUENTIELLE (l'ORDRE compte, pas juste la proportion). Le GB les capture
via ses arbres de décision (interactions d'ordre supérieur, seuils conditionnels).

---

# 4. LES 10 SEUILS DE BASCULEMENT (Tk)

| Feature | Tk | Direction | Delta | Interprétation |
|---------|---:|-----------|------:|----------------|
| f26b_long_sent_rate | 0.024 | HIGHER | +1.11 | LE portail : >2.4% phrases longues = maître |
| ix_variance×longrate | 0.096 | HIGHER | +1.26 | Rythme varié + phrases longues = plus grand delta |
| f1a_rhythm_variance | 11.36 | HIGHER | +0.98 | Variance rythmique élevée = signature |
| f_causal_density | 0.068 | HIGHER | +0.65 | Liens causaux forts = construction narrative |
| f19a_approx_entropy | 0.637 | HIGHER | +0.54 | Vocabulaire non répétitif |
| f_pov_shift_rate | 0.348 | HIGHER | +0.46 | Glissements POV = SIL, polyphonie |
| f29d_ttr_score | 0.710 | LOWER | -0.46 | TTR TROP haut = artificiel (LLM) |
| f_pov_drift_rate | 0.113 | HIGHER | +0.42 | Dérive narrative contrôlée |
| f_pov_stability | 0.646 | LOWER | -0.36 | Stabilité TROP haute = monotone (LLM) |
| f_clause_per_sentence | 1.010 | HIGHER | +0.30 | >1 proposition/phrase = complexité |

Co-occurrences dominantes dans les arbres :
- f26b_long_sent_rate × f_pov_stability (32% des arbres)
- f26b_long_sent_rate × f29d_ttr_score (30%)
- f26b_long_sent_rate × f_pov_shift_rate (30%)

---

# 5. LA LOI DES LEGO (ASSEMBLAGE)

## Transitions enrichies chez les maîtres (S vs C/D)

| Transition | Ratio S/CD | Interprétation |
|-----------|-----------|----------------|
| introspection→description | 5.85× | Le retour au monde après la pensée |
| description→introspection | 5.07× | Le plongeon intérieur après l'ancrage |
| description→description | 3.08× | La tenue descriptive (Flaubert) |
| narration→narration | 2.91× | La continuité narrative (Zola) |
| description→narration | 2.73× | Le passage du tableau au récit |

## Transitions enrichies chez les commerciaux (C/D vs S)

| Transition | Ratio CD/S | Interprétation |
|-----------|-----------|----------------|
| action→dialogue | 4.0× | L'alternance mécanique |
| dialogue→action | 4.0× | Le ping-pong action/parole |
| action→action→action | 4.0× | Le martèlement cinétique |

## Trigrams signatures

| Trigram | Enrichissement | Signature |
|---------|---------------|-----------|
| desc→desc→intro | **12.1× en S** | Le Circuit Flaubert : installer puis plonger |
| desc→intro→desc | **8.3× en S** | Le sandwich introspectif |
| intro→desc→desc | **8.1× en S** | La pensée qui retourne au monde |
| act→dial→act | **5.9× en C/D** | La Roue du Hamster |
| act→act→act | **4.0× en C/D** | Le bloc cinétique sans repos |

## Bonus d'assemblage (bloc 2000w vs 4×500w)

| Feature | S bonus | C bonus | Ratio |
|---------|---------|---------|-------|
| f1a_rhythm_variance | **+1.81** | +0.18 | **10.3×** |
| f1_mean | +0.44 | -0.07 | ∞ (inversé) |
| f_subordination_depth | +0.011 | -0.003 | ∞ (inversé) |
| f9a_contradiction_rate | +0.014 | -0.004 | ∞ (inversé) |
| f_causal_density | +0.001 | -0.000 | ∞ (inversé) |

## Les 3 hypothèses

| Hypothèse | Verdict | Données |
|-----------|---------|---------|
| H1 : Transitions plus riches chez S | CONFIRMÉ (via enrichissement, pas via count brut) | 25 vs 24 brut mais 12.1× sur trigrams |
| H2 : Bonus d'assemblage S > C | **CONFIRMÉ** | S=+0.181 vs CD=+0.024 (7.4×) |
| H3 : LLM plus monotones | REJETÉ | S=21.5% vs C=26.1% (maîtres plus STABLES) |

---

# 6. DÉCOUVERTE FONDAMENTALE

**"On ne cherche plus des passages purs. On estime des profils latents
de type à partir de passages mixtes pondérés."**

Le passage de la logique binaire (filtrer pour la pureté) à la logique
continue (pondération proportionnelle) est le moment pivot de R-8.
Il a transformé 2 passages utilisables en 5244 passages utilisables.

**"Les propriétés distinctives de la maîtrise littéraire ne sont pas
seulement typologiques ; elles sont interactionnelles et séquentielles."**

R-8.4 a prouvé que les interactions binaires (γ) ne capturent que la
subordination/période. Le reste de la maîtrise est dans la SÉQUENCE :
l'ordre des types, le timing des transitions, la mémoire entre fenêtres.
C'est ce que le GB capture nativement avec ses arbres.

**"Le tout vaut plus que la somme des parties — MESURÉ."**

Le bonus d'assemblage de +1.81 sur la variance rythmique chez les S
(vs +0.18 chez les C) est la première preuve empirique que l'assemblage
de fenêtres crée de la valeur émergente chez les maîtres.

---

# 7. FICHIERS PRODUITS

## Scripts (omega-autopsie/corpus_r/)

| Script | Phase | Lignes |
|--------|-------|--------|
| r8_type_profiles_v2.py | R-8.1 | ~450 |
| r8_additivity_test.py | R-8.2 | ~550 |
| r8_lambda_estimation.py | R-8.3 | ~600 |
| r8_residual_analysis.py | R-8.3b | ~400 |
| r8_gamma_interactions.py | R-8.4 | ~520 |
| r8_fix_json.py | R-8.4 fix | ~100 |
| r8_tipping_points.py | R-8.5 | ~350 |
| r8_assembly_analysis.py | R-8.6 | ~500 |

## Données (omega-autopsie/results_phase_r8/)

| Fichier | Phase | Contenu |
|---------|-------|---------|
| TYPE_PROFILES_PURE.json | R-8.1 | Ci,f × 5 types × 52 features |
| R8_ADDITIVITY_TEST.json | R-8.2 | Classification 43 features + MAE par tier |
| R8_LAMBDA_ESTIMATION.json | R-8.3 | λi,f × 47 features + stabilité bootstrap |
| R8_RESIDUAL_ANALYSIS.json | R-8.3b | Gap S/CD post-λ pour 9 gamma targets |
| R8_GAMMA_INTERACTIONS.json | R-8.4 | γij,f × 9 features × 10 paires |
| R8_TIPPING_POINTS.json | R-8.5 | 10 Tk + co-occurrences + effets conditionnels |
| R8_ASSEMBLY_ANALYSIS.json | R-8.6 | Transitions + trigrams + bonus + révélation |

---

# 8. DÉCISIONS ARCHITECTURALES VERROUILLÉES

| # | Décision | Source |
|---|----------|--------|
| D1 | Estimation continue pondérée (pas filtrage binaire) | Francky + Claude |
| D2 | λ appris sur TOUTES les features (pas fixé à 1) | ChatGPT correction |
| D3 | γ UNIQUEMENT pour subordination/période (3 features) | R-8.4 empirique |
| D4 | 6 features de maîtrise restent au GB (signal séquentiel) | R-8.4 + R-8.3b |
| D5 | f26b_long_sent_rate = portail du scoring (29% modèle) | R-8.5 |
| D6 | f29d_ttr INVERSÉ : haut = artificiel | R-8.5 |
| D7 | f_pov_stability INVERSÉ : haut = monotone | R-8.5 |
| D8 | Circuit Flaubert (desc→desc→intro) = signature maître | R-8.6 |
| D9 | Bonus d'assemblage = brique officielle OMEGA | R-8.6 |
| D10 | Mode Netflix (futur) = désactiver γ + cibler additivité | Francky vision |

---

# 9. PROCHAINES ÉTAPES

## Immédiat — R-8.7 (Scorer final intégré)

Intégrer les Ci,f + λ + γ(3 features) + Tk dans le scorer TypeScript.
Le GB reste le moteur principal. L'équation typologique fournit le
CONTEXTE (la normalisation par type de passage).

## Court terme — Phase R-9 (Corpus de Puissance Lecteur)

100-200 œuvres ultra-lues (Marc Levy, Musso, King, etc.).
Tribunal de "puissance de lecture" séparé du tribunal de maîtrise.
Features : lisibilité, propulsion, friction cognitive, cadence de récompense.

## Moyen terme — Profils d'excellence orientés public

TARGET_EXCELLENCE_PROFILE : CANONICAL / PREMIUM_ACCESSIBLE / BINGEABLE /
THRILLER / COMMERCIAL_ROMANCE / HYBRID_HIGH_LOW.
Chaque profil active un corpus de référence, un tribunal, des seuils.

## Long terme — Phase P (Pilotage du Scribe)

Transformer les Tk, les trigrams et le bonus d'assemblage en
CONTRAINTES pour le prompt du Scribe Opus :
- "Tu n'as pas le droit de faire de l'Introspection sans préparation descriptive"
- "Ta variance rythmique doit se construire sur le chapitre, pas le paragraphe"
- "Maintiens ton registre — ne zappe pas"

---

# 10. MESSAGE DE REDÉMARRAGE

```
OMEGA SESSION — PHASE R-8.7 (Scorer Final Intégré)

Dernier état : SESSION_SAVE_PHASE_R8_COMPLETE
HEAD : (post R-8.6 commit)
Branche : phase-r-metrology-rebuild
Tests : à vérifier

CONTEXTE :
  Phase R-8 COMPLÈTE (R-8.1 → R-8.6)
  Ci,f + λ (+15.5%) + γ (3 features, +23-27%) + Tk (10 seuils) + Loi des LEGO
  GB existant : Spearman 0.79, 19 S/D inversions

OBJECTIF R-8.7 :
  Intégrer l'équation typologique dans le scorer TypeScript
  Le GB reste le moteur. L'équation fournit la normalisation contextuelle.

DOCUMENTS À LIRE :
  docs/SESSION_SAVE_PHASE_R8_COMPLETE.md (CE FICHIER)
  docs/OMEGA_PROTOCOLE_ANALYSE_COMPLET.md (la Bible)
  omega-autopsie/results_phase_r8/ (tous les JSON)

Architecte Suprême : Francky
IA Principal : Claude
```

---

*SESSION_SAVE — Phase R-8 Complete*
*2026-03-21 — Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky*
