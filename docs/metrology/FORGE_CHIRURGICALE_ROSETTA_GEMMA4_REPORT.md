# FORGE CHIRURGICALE — 1 levier Rosetta / passe (causal isolé)

**Date** : 2026-06-04 · **Générateur** : gemma4:31b (Ollama local) · **Juge** : gemma4:31b prompt calibré `ecfb32d6` (pairwise A/B + TIE, position_bias 0.55) · **Radar** : bge-m3, centroïdes maître/pulp LOAO · **Standard** : EMP-16 (3 preuves convergentes), EMP-18 (LOAO), EMP-19 (couple modèle+prompt calibré).
**Directive Tribunal 2/2** : « forge séquentielle isolée — 1 levier = 1 passe — thermostat de masse strict — rapporter les deltas géométriques — STOP après analyse, pas de fusion combinée sans décision Architecte. »
**Mode** : advisory / mesure pure. **ZÉRO modification moteur.**

## Protocole
- 3 chapitres OMEGA réels tirés de la télémétrie shadow N5 (`N5_SHADOW_TELEMETRY.json`), choisis aux extrêmes + médiane du radar : **low-like** (radar avant −0.0224), **mixed** (+0.0011), **master-like** (+0.0119).
- 4 leviers gemma4 **actifs** (SOLIDE ∧ pilotabilité>0, `ROSETTA_BRIDGE_MATRIX_GEMMA4.json`) appliqués **un par un**, jamais combinés : `f29d_ttr` (richesse lexicale), `f24e_contrast` (contraste syntaxique), `f15b_compression` (anti-redondance), `f16a_bigram_rarity` (rareté des bigrammes). f17_knife (illusion déclarative), hook/cliff (pilot 0) **exclus**.
- **Thermostat de masse** : consigne min-mots explicite + « développe, ne résume pas » ; rejet si réécriture < 90 % de la longueur cible. Neutralise le confound de compression (cause d'échec N6).
- Pour chaque cellule : radar bge-m3 avant/après + double pairwise calibré (A/B et B/A → REWRITE / ORIGINAL / TIE).
- 12 cellules (3 × 4). Script reproductible : `scripts/metrology/forge_chirurgicale.py`. Artefacts : `FORGE_CHIRURGICALE_RESULTS.json`, `FORGE_CHIRURGICALE_RADAR_SHIFT.csv`.

## Résultat agrégé (Δradar vers le maître, positif = vers les maîtres)

| Levier | Δradar moyen | low-like | mixed | master-like | signe stable 3/3 | pairwise gagnés | PASS |
|---|---|---|---|---|---|---|---|
| **f15b_compression** | **+0.00267** | +0.00517 | −0.00362 | +0.00646 | non (2/3 +) | 0/3 | 0 |
| f29d_ttr | +0.00066 | +0.00627 | −0.00091 | −0.00339 | non (1/3 +) | 0/3 | 0 |
| f16a_bigram_rarity | +0.00006 | +0.00164 | −0.00538 | +0.00391 | non (2/3 +) | 0/3 | 0 |
| f24e_contrast | −0.00039 | +0.00098 | +0.00165 | −0.00381 | non (2/3 +) | 0/3 | 0 |

Référence d'échelle (Gold-Set, EMP-18 LOAO) : seuil maître **> +0.0044**, seuil bas **< −0.0075**, écart maître↔pulp moyen ≈ **+0.027**, position V1 OMEGA ≈ 0.52 (côté pulp).

## Lecture causale

1. **Thermostat = succès méthodologique.** 12/12 cellules `length_ok` (toutes ≥ 90 % de la cible, en pratique +30 à +50 % au-dessus de l'original). Le confound de longueur qui faussait N6 est **éliminé** : les Δradar mesurés sont des effets de style purs, pas de masse.

2. **Aucun levier ne franchit le seuil ni ne gagne au juge.** Le meilleur Δradar moyen (f15b, +0.00267) reste **sous** le seuil maître (+0.0044) et représente ~10 % de l'écart à combler vers les maîtres. **0/12 PASS** : le juge calibré ne préfère **jamais** la réécriture (11 TIE, 1 ORIGINAL). Conclusion dure : à longueur constante, une directive Rosetta isolée ne produit **aucun gain de qualité perceptible** par l'instrument.

3. **f15b_compression = seule direction prometteuse, mais non convergente.** Anti-redondance/compression est le seul levier au Δradar moyen positif **et** le meilleur sur les chapitres low (+0.0052) et master (+0.0065) — mécaniquement cohérent (retirer le remplissage pulp rapproche de la densité maître). Mais il **chute** sur le chapitre mixed (−0.0036).

4. **EMP-16 : STOP convergence.** Aucun levier n'est positif **3/3 corpus**. f15b, f16a, f24e sont 2/3 ; f29d 1/3. La règle des 3 preuves indépendantes **convergentes** échoue pour tous → **aucune modification moteur justifiée**, aucune promotion de levier en gate.

## Mécanisme — pourquoi ça marche / où ça casse / risques
- **Pourquoi (partiel)** : la compression réduit la redondance lexicale, marqueur distinctif pulp→maître dans l'espace bge-m3 (cohérent avec f15b SOLIDE 1.0 au S0 gemma4). C'est le seul des 4 axes dont le signal géométrique est positif en moyenne.
- **Où ça casse** : l'effet est (a) sous le seuil de discrimination maître, (b) instable en signe selon le chapitre, (c) invisible au juge (0 win). L'écart pulp→maître bge-m3 n'est donc **pas** principalement porté par les 4 propriétés structurelles/lexicales que ces leviers pilotent — du moins pas à l'amplitude qu'une directive de prompt peut imposer à gemma4.
- **Risques** : sur-interpréter f15b (n=3, 1 contre-exemple) ; confondre « plus dense » et « meilleur » (le juge dit non) ; empiler les leviers en espérant une somme des micro-gains alors qu'aucun n'est stable (risque de cascade N6 / Mode C toxique déjà documenté).

## VERDICT
- **Statut : FAIL** (hypothèse « un levier Rosetta isolé déplace la prose OMEGA vers les maîtres de façon stable et perceptible » — réfutée).
- **Confiance : Haute** sur le résultat null (thermostat propre, juge calibré EMP-19, radar LOAO, 12 cellules) ; **Basse** sur toute généralisation de f15b (n=3).
- **Forces** : confound longueur éliminé ; instrument calibré ; mesure causale isolée par levier ; honnêteté du null result (aucun gain inventé).
- **Faiblesses** : (1) n=3 chapitres/levier → puissance faible, sign-instabilité non départageable ; (2) 1 seul générateur (gemma4) ; (3) juge unique (pas de 2e juge non biaisé disponible — cf N2) ; (4) leviers limités aux 4 calibrés gemma (8/19 features benchées).
- **Risques restants** : la fusion combinée pourrait soit additionner des micro-gains, soit déclencher une sur-correction en cascade (précédent Mode C TOXIQUE). Les données actuelles **ne justifient pas** la fusion.
- **Action requise (Architecte)** : décision sur la suite. Recommandation : **NE PAS lancer de fusion combinée** sur cette base ; si on veut trancher f15b, le faire en protocole dimensionné (n≥6 chapitres, bootstrap par livre, 2e générateur) avant toute idée de levier. STOP conforme à la directive Tribunal — pas de combiné sans GO.
