# WS-D R4-LARGE — VERDICT (confirmation triple-preuve, n=18 vs 18, bootstrap IC95 + permutation)

**Date** : 2026-06-02 · **Run** : terminal Architecte, qwen3:32b · **212 mesures** (53 livres × 600/1500/3000/entier × 3 familles FR+EN)
**Stats** : AUC=P(maître>pulp), bootstrap IC95 (2000 iters, PRNG déterministe), test de permutation, AUC par langue.
**Doctrine** : EMP-16 (triple-preuve), EMP-12 METRIC_HONESTY, EMP-17.

---

## 0. DOUBLE CORRECTION (METRIC_HONESTY)

- R3 affirmait « aucun axe ne sépare » → réfuté par R4-small. **Mais R4-small (n=6) sur-affirmait l'inverse** :
  « trinité authenticity+euphony+rhythm discrimine ». **À n=18 avec IC95 + permutation, cette trinité s'effondre largement.**
- C'est la **validation d'EMP-16** : ne jamais sceller sur petit échantillon. Le signal n=6 (AUC 0.94 = 34/36 paires) était fragile.
  Conclusion R4-small **rétrogradée** ; ce verdict-ci (n=18, stats) fait foi.

## 1. AUC maître vs pulp [IC95] (p permutation) + split langue

| axe | 600 | 1500 | 3000 | entier | FR(3000) | EN(3000) | statut rigoureux |
|---|---|---|---|---|---|---|---|
| **euphony** (CALC) | .51 [.31,.70] p.93 | **.72** [.53,.89] **p.019** | **.81** [.65,.94] **p.0015** | **.78** [.60,.93] **p.006** | .59 | **.94** | **SIGNIFICATIF ≥1500 (le seul solide)** |
| authenticity (LLM) | .65 p.11 | **.75** [.57,.89] **p.009** | **.72** [.53,.88] **p.024** | .62 p.22 | .58 | **.86** | modéré 1500-3000, IC_bas ~.53 |
| AAI (composite) | .65 p.12 | **.75** **p.008** | **.73** **p.020** | .63 p.18 | .60 | .86 | = authenticity |
| RCI (composite) | .52 | **.73** **p.018** | .68 p.06 | .55 | .60 | .77 | porté par euphony, 1500 seult |
| rhythm (CALC) | .52 | .59 p.35 | .57 p.49 | **.27** **p.018** | .56 | .25 | **PAS de signal ; INVERSÉ à l'entier** |
| metaphor_novelty | .62 p.21 | .50 | .65 p.14 | .66 p.10 | .66 | .70 | tendance + mais **n.s.** |
| necessity (LLM) | .47 p.79 | .47 | .47 | .41 | .48 | .41 | aucun signal (léger négatif) |
| anti_cliche (CALC) | .50 | .50 | .50 | .50 | .50 | .50 | INERTE (saturé 100) |
| show_dont_tell (LLM) | .50 | .50 | .53 | .53 | .56 | .50 | INERTE (saturé 100) |
| SII (composite) | .53 | .43 | .53 | .48 | .57 | .48 | aucun signal |

## 2. Conclusions (rigoureuses)

1. **UN SEUL discriminant robuste : `euphony`** (CALC, déterministe) — significatif à 1500 (p.019), 3000 (p.0015, AUC .81),
   entier (p.006). Reproductible (pas de LLM). C'est le pilier le plus fiable de toute l'enquête.
2. **`authenticity`/`AAI` = signal modéré** (1500-3000, p<.05, AUC ~.72-.75) mais IC_bas ~.53 → réel, pas fort, non robuste à l'entier.
3. **DRAPEAU ROUGE — la discrimination est ANGLOPHONE.** À 3000 : euphony FR **.59** / EN **.94** ; authenticity FR **.58** / EN **.86**.
   **En FRANÇAIS (langue cible d'OMEGA), aucun axe ne discrimine de façon robuste** (meilleur : euphony FR @entier .74, authenticity FR @1500 .67 — modérés, non scellables seuls).
4. **`rhythm` RÉFUTÉ** : pas de signal à 600-3000 (IC enjambe .5), et **INVERSÉ à l'œuvre entière** (AUC .27, p.018 — la pulp est
   structurellement plus régulière). Le « rhythm discrimine » de R4-small était du bruit n=6.
5. **Morts/inertes** : necessity (≈.47, aucun signal — l'« inversion » n=6 n'était pas significative), metaphor (tendance n.s.),
   anti_cliche + show_dont_tell (saturés 100), SII composite (aucun signal).

## 3. Conséquence pour l'IntrinsicQualityScore (split R3 / DEC-016)

**On NE PEUT PAS composer la porte de qualité sur « authenticity + euphony + rhythm »** (reco R4-small) : à n rigoureux,
rhythm est réfuté, authenticity est modéré/EN-dépendant, et **en français il ne reste presque rien**.

État réel :
- **euphony** = unique signal robuste, mais EN-fort / FR-modéré, et seulement ≥1500 mots → au mieux un **signal advisory pondéré**, pas un floor universel, surtout pas en FR.
- **authenticity** = secondaire modéré (EN surtout).
- **STOP composition d'ADR IntrinsicQualityScore** : le matériau empirique est trop mince et trop déséquilibré par langue.

## 4. Le vrai problème mis à nu (METRIC_HONESTY)

**OMEGA, dont la cible est la prose française, ne possède pas de capteur de qualité littéraire robuste EN FRANÇAIS.**
Le seul signal solide (euphony) est anglophone-dominant. C'est cohérent avec WS-C (0/95 maîtres ≥ SEAL) et avec le biais
FR-only inverse des keywords : le juge est calibré/efficace surtout sur l'anglais, faible sur le français littéraire.

Ce n'est ni « le juge est aveugle » (faux : euphony/authenticity discriminent en EN) ni « OMEGA reconnaît le génie »
(faux en FR). La vérité : **discrimination réelle mais partielle, anglophone, portée surtout par l'euphonie sonore.**

## 5. Options (décision Architecte / Tribunal — aucun code)

- **A** — Acter euphony comme **seul** signal de qualité semi-fiable (advisory pondéré, ≥1500 mots), authenticity en secondaire ;
  ne PAS bâtir de floor de qualité dur ; reconnaître la limite FR.
- **B** — Chantier « qualité FR » : re-prompter / créer des capteurs LLM discriminants en français (necessity à réparer ou
  remplacer ; métaphore filée ; ironie ; profondeur thématique) puis re-bencher. C'est de la recherche, pas un patch.
- **C** — Accepter doctrinalement qu'OMEGA juge la **propreté technique + conformité contrat + euphonie**, pas la « grandeur
  littéraire absolue », et calibrer les attentes/paliers en conséquence (lié DEC-015).

## 6. Caveats & gardes

- n=18/famille reste modeste ; CI95 larges. euphony @3000/entier est le résultat le plus solide (CALC + p<.01).
- 2 parse-fails JSON (metaphor) — impact négligeable.
- necessity size-invariant par livre (peu sensible à la fenêtre) — à comprendre si on veut le réparer (option B).
- **EMP-16 maintenu** : aucun code moteur ; O2 reste shadow (flip toujours interdit). Pas d'ADR composition tant que (option B) n'a pas fourni un signal FR robuste, ou que l'Architecte n'a pas tranché (A/C).
