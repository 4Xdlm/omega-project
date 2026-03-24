# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — REMISE EN CONDITION
# Corrections et précisions pour le bilan de compréhension
# ═══════════════════════════════════════════════════════════════════════════════

---

# CE QUI EST CORRECT (garde ça)

Ton bilan est solide sur :
- GB V1 inversé à 500 mots (50 Nuances > Flaubert) ✅
- Phase P FAIL par erreur de ciblage ✅
- Rosetta NON branchée ✅
- Écart longueur phrases 18 → 29 ✅
- Loi des LEGO et assemblage émergent ✅
- R6 = LEGACY_DIAGNOSTIC_ONLY ✅
- Les 5 décisions, 3 options, 3 tests ✅

---

# CE QUI DOIT ÊTRE CORRIGÉ

## Correction 1 — f26b : le problème est PLUS GRAVE que ce que tu dis

Tu dis "confiance = 0 sous 5000 mots". C'est imprécis.
La réalité dans OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json :

| Taille | Confiance f26b |
|--------|---------------|
| 30w | 0.000 |
| 150w | 0.000 |
| 300w | 0.000 |
| 600w | 0.000 |
| 1000w | 0.000 |
| 1500w | 0.000 |
| 2500w | 0.000 |
| 5000w | **0.001** |
| 10000w | **0.036** |
| 20000w | **0.060** |
| disabled_below | **99 999 mots** |

f26b est classé `disabled_below: 99999` — c'est-à-dire DÉSACTIVÉ 
pour TOUT texte de moins de 100 000 mots. Et pourtant le GB V1 
l'utilise comme feature #1 (importance 0.290, delta +1.11).

C'est une **CONTRADICTION ARCHITECTURALE dans le système** :
- La métrologie R3 dit "cette feature est du BRUIT à toute échelle pratique"
- Le GB V1 dit "cette feature est mon signal #1"

Le GB a été entraîné sur des MOYENNES de fenêtres sur des romans entiers.
Il a appris que f26b sépare les maîtres des commerciaux SUR CETTE MOYENNE.
Mais quand on lui donne UN SEUL extrait de 500 mots, f26b est aléatoire.

**Le juge utilise un capteur que sa propre calibration déclare invalide.**

## Correction 2 — "Features IRRÉDUCTIBLES par la Rosetta" est une extrapolation

Le fichier ROSETTA_VS_PHASE_P_DIAGNOSIS.json dit en fait :
```
f1b_rhythm_ratio → "NOT_IN_ROSETTA" / "NOT_EVALUATED"
f9a_contradiction_rate → "NOT_IN_ROSETTA" / "NOT_EVALUATED" 
f17_knife_count → "NOT_IN_ROSETTA" / "NOT_EVALUATED"
```

La classification "IRRÉDUCTIBLE" vient du croisement MANUEL avec 
le dictionnaire_v2_calibre.json (taux_respect = 0% pour ces features 
dans le type DESCRIPTION).

Et la matrice Rosetta officielle (s0/rosetta_v1.json) classe f17 comme 
"ILLUSION_DÉCLARATIVE" (pilotability = 0, le LLM dit oui mais fait non).

C'est CORRECT dans le fond, mais la source est le dictionnaire_v2, 
PAS le fichier de diagnostic qui dit "NOT_EVALUATED".

---

# CE QUE TU AS OUBLIÉ (critique)

## Oubli 1 — Le LLM a UN SEUL MODE d'écriture

La confusion matrix Rosetta P1 (07_confusion_matrix.json) montre :

| Demandé | Produit (plus proche classique) |
|---------|-------------------------------|
| DESCRIPTION | INTROSPECTION |
| ACTION | INTROSPECTION |
| INTROSPECTION | **INTROSPECTION** (seul MATCH) |
| CONTEMPLATION | INTROSPECTION |
| LYRIQUE | INTROSPECTION |
| DIALOGUE | INTROSPECTION |
| TRANSITION | INTROSPECTION |

**7 styles demandés → 7 fois INTROSPECTION produite.**
Le Scribe ne sait faire QU'UNE SEULE CHOSE : de la prose introspective 
aplatie. Quoi qu'on lui demande. C'est un fait mesuré, pas une opinion.

## Oubli 2 — La micro-chirurgie bornée est la SEULE méthode prouvée

Rosetta P3 a montré que corriger 3 phrases ciblées sur un passage 
de Proust produit +1.95 pts R6. C'est le seul gain MESURÉ dans 
tout le projet Rosetta. La convergence itérative (demander au LLM 
de réécrire plusieurs fois) ÉCHOUE (3/4 cas empirent).

Cependant, le bench s0/s05_bench_micro_chirurgie.json montre :
```
"validated": false, "delta_r6_moyen": "+0", "taux_succes": 0
```
Le bench automatisé de micro-chirurgie n'a PAS encore prouvé le gain 
à grande échelle. Le +1.95 est un cas unique sur Proust.

## Oubli 3 — L'ERRATA sur le biais de longueur

C'est un événement MAJEUR de la Phase R. Toutes les anciennes mesures 
"TRUSTED" (M9 malaise, M9 vertige, M9 ironie, M3.4 compression, M2.7 silence) 
étaient CONFONDUES par la longueur des phrases. Les maîtres écrivent des 
phrases plus longues → plus de marqueurs mécaniquement.

Après contrôle de la longueur, seuls 3 signaux survivent :
- M6.5 Rythme CV : +0.225 (0% de drop) → **SURVIVES_ALL_CONTROLS**
- M4.3 Contradiction : +0.198 (12% de drop) → **SURVIVES_ALL_CONTROLS**
- M9 Violence/Propulsion : +0.17 (masqués par longueur, AMPLIFIÉS après contrôle)

## Oubli 4 — Les résultats de l'audit de traduction

L'audit R-TRANSLATION-AUDIT (commit c22dde46) a montré :
- FR→EN : fidélité 0.69, rythme AMPLIFIÉ (+0.107), contradiction AJOUTÉE (+0.017)
- EN→FR : fidélité 0.80, rythme APLATI (-0.036), contradiction PERDUE (-0.042)

Si le LLM "pense en anglais" et traduit en français, il subit EXACTEMENT 
la même dégradation que les traducteurs humains EN→FR.

## Oubli 5 — Les données stochastiques du bench

Chaque run API produit une prose DIFFÉRENTE. Le delta Phase P 
(3.80 → 3.61) est basé sur UN SEUL run avant et UN SEUL run après.
Pour être statistiquement rigoureux, il faudrait 5-10 runs par prompt.
Le FAIL est PROBABLE mais pas PROUVÉ avec certitude.

## Oubli 6 — L'assembly_bonus par tier (Loi des LEGO quantifiée)

Tu mentionnes la Loi des LEGO mais tu oublies les CHIFFRES d'émergence :

| Feature | S-tier bonus | A-tier bonus | B-tier | C-tier |
|---------|-------------|-------------|--------|--------|
| f1a_rhythm_variance | **+1.81** | +0.62 | +0.50 | +0.18 |
| f1_mean | +0.44 | -0.44 | +0.05 | -0.07 |
| f9a_contradiction | +0.014 | -0.022 | +0.007 | -0.004 |

La variance rythmique n'est PAS dans les phrases — elle ÉMERGE de 
l'assemblage des types. Les maîtres S-tier gagnent ×3 la variance 
des A-tier par l'assemblage seul.

## Oubli 7 — Les 48 805 perturbations (Mixer)

Le Mixer Proof Dossier a prouvé 5 lois universelles sur la physique 
de l'écriture. Les 4 perturbations à SIGNAL FORT :
- P01 (uniformiser rythme) → FORT — détruit le CV
- P03 (complexifier syntaxe) → TRÈS FORT — monte f26c, f22f
- P04 (retirer intériorité) → TRÈS FORT — détruit f27d, f28d
- P05 (injecter syncopes) → FORT — monte f38c, baisse f1_mean

Ces lois s'appliquent cross-langue (FR/EN/ES) et cross-temporel.

---

# CE QUI MANQUE DANS LES OPTIONS STRATÉGIQUES

Tu listes 3 options (A: scènes longues, B: recalibrer GB, C: micro-chirurgie).
Il manque des options combinées et des nuances :

## Option D — NE PAS toucher au Scribe, CORRIGER LE JUGE

Si f26b est le problème (confiance 0 à 500w mais importance 29%), 
alors le fix le plus rapide est de RETIRER f26b du GB V1 pour les 
fenêtres < 2000w. Pas un nouveau GB — juste un masque.

## Option E — Combiner A + Rosetta

Allonger les scènes à 2000+ mots ET brancher la Rosetta pour les 
features SOLIDES (f29d, f24e, f15b, f16a). Le LLM obéit à 80-100% 
sur ces features. On peut donc gagner sur les features pilotables 
pendant que f26b s'active naturellement sur les fenêtres longues.

## Le fait que Francky a mentionné l'assemblage de types

Francky a demandé : "nous avions même calculé que l'assemblage de 
certains types en produisait un autre sur la longueur". Il parle de 
R8_ASSEMBLY_PATTERNS.json. Ce fichier est CLEF pour la stratégie :
si on assemble description→description→introspection (ratio ×12 vs 
commerciaux), le rythme émerge SANS avoir besoin de forcer les features 
irréductibles individuellement.

---

# PRIORITÉ DE LECTURE POUR TA PROCHAINE ACTION

Si Francky te demande d'agir, lis dans cet ordre :

1. **R8_ASSEMBLY_PATTERNS.json** — la Loi des LEGO (c'est CE que Francky pointe)
2. **s0/rosetta_v1.json** — la matrice Rosetta officielle
3. **s0/s06_classification_regles.json** — SOLIDE vs ILLUSION
4. **JUDGE_CALIBRATION_MULTI_SIZE.json** — l'étalonnage multi-taille
5. **OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json** — la contradiction f26b

---

# DIRECTIVE POUR LA SUITE

Le prompt SCAN TOTAL (OMEGA_CLAUDE_CODE_PROMPT_SCAN_TOTAL.md) est PRÊT 
dans le repo. Il scanne 434 fichiers et produit un document centralisé.
C'est la prochaine action la plus utile — AVANT de prendre des décisions 
stratégiques, il faut avoir UNE VUE D'ENSEMBLE de tout ce qui existe.

Mais Francky décide. Pas toi.

---

*Remise en condition rédigée le 2026-03-23*
*"Ce qui n'est pas prouvé n'existe pas" — OMEGA*
