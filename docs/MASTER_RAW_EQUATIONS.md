# OMEGA — EQUATIONS DE VERITE MULTI-ECHELLE
**Date** : 2026-03-27 | **Standard** : NASA-Grade L4 | **Mode** : CALCUL PUR
**Source** : 1 381 345 fenetres reelles, 23 005 chapitres, 571 livres

---

## Methode

Pour chaque feature, regression sur les 5 tailles mandatees (200, 500, 700, 1000, 2000w).
Deux modeles testes :
- **Lineaire** : y = a * size + b
- **Logarithmique** : y = a * log(size) + b

Le meilleur modele est retenu si R2 > 0.25. Sinon : NO_STABLE_EQUATION.

## Equations — Moyenne en fonction de la taille

| Feature | Modele | Equation | R2 |
|---------|--------|----------|-----|
| mean_sent_len | LINEAR | mean = 0.000065 * size + 19.314 | 0.620 |
| cv_sent | LOG | cv = 0.0259 * log(size) + 0.5355 | 0.999 |
| f1a_rhythm_variance | LINEAR | mean = 0.000891 * size + 12.770 | 0.905 |
| f1b_rhythm_ratio | LINEAR | mean = -0.000697 * size + 5.3437 | 0.964 |
| f26b_long_sent_rate | **NO_STABLE_EQUATION** | R2=0.007 | 0.007 |
| f17_knife_count | LINEAR | mean = 0.01167 * size + -0.1136 | **1.000** |
| knife_rate | LINEAR | mean = -0.000015 * size + 0.0823 | 0.325 |
| ratio_alt | **NO_STABLE_EQUATION** | R2=0.058 | 0.058 |
| f29d_ttr_score | LOG | mean = 0.0211 * log(size) + 0.5983 | 0.795 |
| f16a_bigram_rarity | LINEAR | mean = -0.000002 * size + 0.9535 | 0.955 |
| sub_per_sentence | LINEAR | mean = 0.000154 * size + 0.5933 | 0.826 |
| dialogue_ratio | LOG | mean = -0.0336 * log(size) + 0.3099 | 0.856 |
| f35c_hook_score | LOG | mean = 0.0024 * log(size) + 0.5227 | 0.816 |
| f36c_cliff_score | LOG | mean = -0.0041 * log(size) + 0.6513 | 0.489 |
| f24c_contrast_delta | LOG | mean = 1.7746 * log(size) + -2.3457 | 0.793 |
| f19a_approx_entropy | LOG | cv = -0.0261 * log(size) + 0.8187 | 0.999 |
| cv_para | **NO_STABLE_EQUATION** | Mesure uniquement sur chapitre entier | - |

## Equations — CV en fonction de la taille

| Feature | Modele | R2 | Interpretation |
|---------|--------|-----|----------------|
| mean_sent_len | LINEAR | **0.996** | CV monte lineairement (signal inter-auteurs) |
| cv_sent | LOG | **0.929** | CV baisse logarithmiquement (stabilisation) |
| f1a_rhythm_variance | LINEAR | **0.973** | CV monte lineairement (meme raison que mean_sent) |
| f26b_long_sent_rate | LOG | **0.962** | CV baisse logarithmiquement |
| ratio_alt | LOG | **0.966** | CV baisse logarithmiquement |
| f19a_approx_entropy | LOG | **0.942** | CV baisse logarithmiquement |
| dialogue_ratio | LOG | **0.951** | CV baisse logarithmiquement |
| knife_rate | LOG | **0.965** | CV baisse logarithmiquement |

## Constats cles

### 1. f26b et ratio_alt : NO_STABLE_EQUATION pour la MOYENNE
La moyenne de f26b_long_sent_rate (~0.093) et ratio_alt (~0.059) ne change PAS avec la taille.
Ce sont des proprietes INTRINSEQUES du texte, invariantes par echelle.
Leur CV baisse (meilleure mesure a grande fenetre), mais la valeur attendue est constante.

### 2. f17_knife_count : equation parfaitement lineaire (R2=1.000)
f17 est un COMPTEUR ABSOLU : il croit lineairement avec la taille de la fenetre.
A 200w : ~2.7 couteaux. A 2000w : ~23.8 couteaux. Equation : f17 = 0.01167 * size - 0.11.
**Cela confirme que f17 ne doit JAMAIS etre compare entre tailles differentes.**
Seul le knife_rate (f17/n_sentences) est comparable entre tailles.

### 3. cv_sent et f19a_approx_entropy : equations LOG quasi-parfaites
cv_sent = 0.026 * log(size) + 0.536 (R2=0.999)
f19a = -0.026 * log(size) + 0.819 (R2=0.999)
Ces features se stabilisent de facon previsible.

### 4. Deux familles de comportement CV
- **CV monte avec la taille** : mean_sent_len, f1a_rhythm_variance (le signal inter-auteurs emerge)
- **CV baisse avec la taille** : cv_sent, ratio_alt, f26b, f19a (la mesure se stabilise)
