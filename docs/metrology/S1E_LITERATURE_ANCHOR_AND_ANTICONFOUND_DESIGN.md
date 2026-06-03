# S1E — ANCRE LITTÉRATURE MONDIALE + DESIGN ANTI-CONFOUND

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Déclencheur** : Architecte (« pousse plus juste/complet pour la vérité ; contrôle si des mesures/études existent déjà dans le monde »)

> Résultat clé : l'état de l'art académique **recadre notre verdict S1D** et **fixe un plafond de vérité**. Notre gemma 0.99-1.00 est très AU-DESSUS du plafond mondial → confirmation externe que c'est un confond.

---

## 1. ÉTAT DE L'ART (mesures déjà existantes dans le monde)

### Discrimination de QUALITÉ littéraire (= OBJ1)
| Étude | Méthode | Performance |
|---|---|---|
| Underwood & Sellers — literary prestige (poésie, « reviewed in journals ») | bag-of-words + régression logistique | **~75 % accuracy** |
| van Cranenburgh & Bod 2017 — literary ratings | features textuelles | **61 % de la variance** |
| Random Forest — quality novels vs control | RF | **77 % F1** |
| *Operationalizing Canonicity* (Cultural Analytics) — **français 19e-20e** | classif. canonicité | **70-74 %** selon échelle |
| *Good Books are Complex Matters* (arXiv 2404.04022) | profils de complexité | distingue catégories qualité |
| *Single-Blind Literary Taste Test* (arXiv 2011.01624) | fragments anonymisés | méthodo alignée sur la nôtre |

→ **PLAFOND MONDIAL de discrimination QUALITÉ ≈ 0.70-0.77.** Personne ne prouve ~1.0. **Donc gemma 0.99-1.00 = confond (époque/genre/canon), pas qualité pure.** Le vrai signal qualité que l'on doit viser/attendre = **~0.75**.

### Prédiction COMMERCIALE (= OBJ1bis)
| Étude | Corpus | Performance |
|---|---|---|
| Ashok, Feng, Choi 2013 — *Success with Style* | romans | le style prédit le succès |
| Archer & Jockers — *The Bestseller Code* | 20k→5k romans + 500 NYT bestsellers | **~80 %** (juste 80% sur 30 ans) |

→ **OBJ1bis faisable à ~80 %** par features texte (ponctuation, plot, personnages, vocabulaire). Features réutilisables. Confirme la viabilité du prédicteur commercial (avec contrôle d'époque, cf. design confound).

## 2. CE QUE ÇA CHANGE POUR NOUS
1. **Recalibrage du critère S1E** : ne PAS attendre 0.99 sur l'épreuve époque-appariée. Un AUC **~0.70-0.80 avec biais de position <0.10** sur du moderne-vs-moderne = **SUCCÈS** (= niveau mondial de la vraie qualité). 0.99 = encore un confond ; 0.50 = aveugle à la qualité.
2. **Gemini a raison** : les embeddings souffrent du MÊME biais d'époque (vecteur 1850 ≠ 2024 par vocabulaire). Le 0.84 embed est aussi potentiellement une « distance d'époque ». → tester **gemma ET embeddings** sur l'épreuve appariée.
3. On n'invente rien d'exotique : on est sur une voie validée (canonicité FR, blind taste test). On peut emprunter leurs features/protocoles.

## 3. S1E — BATTERIE ANTI-CONFOUND (fusion ChatGPT + Gemini)
Objectif : prouver que le juge/embedding mesure la QUALITÉ et non époque/canon/genre/source/format.
- **Test 1 — MODERN_vs_MODERN** (prioritaire) : maîtres modernes (Ernaux, Modiano, Le Clézio, Quignard, Duras, DeLillo + holdout `livres_payants` Carrère/McCarthy/Morrison/Rulfo) vs pulp/commercial moderne (Thilliez, Musso, Bussi, Chattam…). **gemma ET embeddings.**
- **Test 2 — OLD_vs_OLD** : maîtres anciens vs populaire/genre ancien (Féval, feuilleton 19e) — neutralise l'époque dans l'autre sens.
- **Test 3 — SAME_GENRE/SAME_ERA** : littéraire vs commercial dans le même genre/époque (le plus dur).
- **Test 4 — SOURCE_BLIND** : prompts sans titre/auteur/date/genre ; extraits normalisés (guillemets, espaces, front-matter/notes retirés) — empêche de juger l'emballage.
- **Test 5 — NEGATIVE CONTROLS** : labels randomisés, même auteur/même livre, master-vs-master, pulp-vs-pulp → un bon juge doit parfois ne PAS trancher (tie).
- **Métriques** : win_rate + IC95 bootstrap par auteur + permutation + position_bias + **tie_rate** + **taxonomie d'erreurs** (erreur due à époque/genre/vocabulaire/densité/source ?) + matrice de désaccord embeddings↔juge.

## 4. CRITÈRES DE VALIDATION (recalibrés sur le plafond mondial)
- gemma « juge de qualité » VALIDÉ si : MODERN_vs_MODERN **≥ 0.75** (pas 0.99) ∧ SAME_GENRE ≥ 0.70 ∧ position_bias < 0.10 ∧ pas d'effondrement source-blind ∧ negative controls sains.
- Si MODERN_vs_MODERN s'effondre vers 0.50 → gemma = détecteur d'époque/genre, PAS juge qualité.
- Idem embeddings (même barre).

## VERDICT
- **Statut** : ancre mondiale établie ; S1D re-interprété (gemma 0.99 = confond confirmé par écart au plafond ~0.75) ; S1E redessiné + recalibré.
- **Confiance** : Haute (sources académiques convergentes).
- **Forces** : on a maintenant un **étalon externe** (qualité ~0.75, commercial ~0.80) pour juger nos propres chiffres — fini les scores « parfaits » crus sur parole.
- **Faiblesses** : (1) pool maîtres modernes petit (n faible pour modern-vs-modern) ; (2) old-pulp rare dans le corpus (Test 2 limité) ; (3) source-blinding à implémenter proprement.
- **Action** : exécuter S1E (modern-vs-modern d'abord, gemma+embeddings, source-blind), critère ~0.75. Décision pivot/juge réservée Architecte après S1E.

## Sources
- [Underwood & Sellers / prestige](https://thegradientpub.substack.com/p/ted-underwood-machine-learning-and) · [Operationalizing Canonicity (FR, Cultural Analytics)](https://culturalanalytics.org/article/88113-operationalizing-canonicity-a-quantitative-study-of-french-19th-and-20th-century-literature) · [Good Books are Complex Matters (arXiv 2404.04022)](https://arxiv.org/pdf/2404.04022) · [Single-Blind Literary Taste Test (arXiv 2011.01624)](https://arxiv.org/pdf/2011.01624) · [A Data-Oriented Model of Literary Language (arXiv 1701.03329)](https://arxiv.org/pdf/1701.03329) · [Success with Style (Ashok/Feng/Choi)](https://www.researchgate.net/publication/286941537_Success_with_style_Using_writing_style_to_predict_the_success_of_novels) · [The Bestseller Code (Archer & Jockers)](https://books.google.com/books/about/The_Bestseller_Code.html?id=4fXUDAAAQBAJ)
