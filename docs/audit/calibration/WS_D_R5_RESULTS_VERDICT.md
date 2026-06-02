# WS-D R5 — VERDICT : PERCÉE, OMEGA SAIT JUGER LA QUALITÉ FRANÇAISE

**Date** : 2026-06-02 · **Run** : terminal Architecte, qwen3:32b · **432 mesures** (FR+EN, 9 maîtres × 9 pulp, 1500 mots)
**Artefacts** : `WS_D_R5_FR_QUALITY.{jsonl,json}` · script `wsd-r5-fr-quality-probe.ts` · doctrine EMP-16, EMP-12.

---

## 1. Résultats

### Juge PAR PAIRES (choix forcé maître vs pulp, 2 ordres anti-biais)
| langue | taux victoire maître | IC95 | biais position |
|---|---|---|---|
| **FR** | **0.932** | [0.895, 0.969] | **0.062** ✅ (<0.10) |
| EN | 0.920 | [0.877, 0.963] | 0.160 ⚠ (master en A = 100 %, en B = 84 %) |

### Prompts ABSOLUS redessinés (profondeur / style / voix, consigne « oser les notes basses »)
| dimension | AUC FR | médiane maîtres / pulp (FR) | AUC EN |
|---|---|---|---|
| profondeur | **0.895** | 72 / 44 | 1.00 |
| style | **0.914** | 75 / 48 | 0.938 |
| voix | **0.864** | 71 / 44 | 0.932 |

**Aucune saturation** : les médianes maîtres (71-75) et pulp (44-48) sont nettement séparées — l'instruction « noter large » a brisé le plafond.

## 2. Conclusion — la cause de l'échec FR était le DESIGN, pas le LLM

- **OMEGA (qwen3:32b) SAIT discriminer la qualité littéraire française**, et fortement : 93 % de bonnes désignations en
  choix forcé (biais position bas), AUC ~0.86-0.91 en notation absolue redessinée.
- La conclusion R4-large « aucun signal qualité robuste en FR » était vraie **pour les anciens axes** (necessity, show_dont_tell,
  anti_cliche : saturés/mécaniques) et **pour le scoring absolu mal formulé**. Elle est **RÉFUTÉE** dès qu'on (a) passe en
  choix forcé OU (b) reformule le prompt absolu avec cadrage critique + consigne anti-saturation.
- **Deux instruments viables, convergents** : le pairwise (gold-standard validateur) ET un trio absolu déployable
  (profondeur+style+voix) qui donne un scalaire directement utilisable comme `IntrinsicQualityScore`.

## 3. Ce que ça change

- **Le chantier B (qualité FR) réussit sur sa première vraie tentative.** OMEGA peut avoir un juge de qualité française.
- **Candidat `IntrinsicQualityScore` = profondeur + style + voix** (3 prompts LLM, anti-saturation, AUC ~0.9 FR, médianes
  séparées). Validable par le juge pairwise (0.93). C'est concret et déployable.
- Cohérent avec tout le reste : densité/keyword/necessity = hors porte qualité ; euphony (CALC) en appui ; ECC = conformité.

## 4. Caveats de rigueur (EMP-16, EMP-12) — NE PAS sceller sur ce seul run

1. **n = 9 maîtres × 9 pulp, taille unique 1500, run unique.** Effet TRÈS large (0.93 ; AUC 0.9) — qualitativement
   différent du faux signal R4-small (qui s'effondrait) — mais à confirmer.
2. **Bootstrap NON clusterisé** (caveat ChatGPT, valide) : les 162 jugements pairwise viennent de seulement 9+9 livres
   uniques → ils ne sont pas indépendants (chaque maître apparaît dans 9 paires). L'IC95 [0.895, 0.969] est **optimiste** ;
   il faut un **bootstrap par livre** (rééchantillonner les livres, pas les paires) pour un IC honnête.
3. **Biais position EN = 0.16** (élevé) : en EN le juge sur-favorise la position A. À surveiller ; en FR c'est sain (0.062).
4. **Une seule taille (1500)** : tester aussi 600/3000/entier pour la stabilité d'échelle.
5. **Anti-circularité (DEC-011)** respectée : on mesure une préférence de qualité intrinsèque, pas une conformité dérivée de la prose.

## 5. Prochain pas (gaté)

**Option R5-large (recommandée avant ADR)** : confirmer à plus grande échelle —
- corpus élargi (≥15-20 livres/cellule, maîtres/best/pulp, FR+EN) ;
- 3 tailles (600/1500/3000) ;
- **bootstrap PAR LIVRE** (IC honnête) ;
- pairwise + les 3 prompts absolus.
Critère de scellement : FR pairwise ≥ 0.75 avec IC95-par-livre bas > 0.65, ET ≥2 dimensions absolues AUC ≥ 0.75 IC-par-livre bas > 0.65, stable sur ≥2 tailles.

**Puis ADR** : `IntrinsicQualityScore = profondeur + style + voix` (pondérations à dériver), juge pairwise/ELO comme
validateur, intégration moteur gatée (flag, shadow, EMP-10 terminal). ECC reste ContractConformity ; densité advisory ;
paliers re-ancrés (DEC-015).

## 6. Garde-fous maintenus

- **AUCUN code moteur** tant que R5-large n'a pas confirmé (EMP-16) + ADR ratifié.
- O2 reste shadow (flip interdit). Seuils prod inchangés.
- Droits : scores+sha+mots only, aucune prose committée.

---

*VERDICT : PASS (percée empirique forte). Confiance : Haute sur la DIRECTION (le LLM discrimine la qualité FR — deux
instruments convergents, effet large) ; Moyenne sur les VALEURS exactes (n modeste, IC non clusterisé, taille unique).
Action requise : R5-large (confirmation + bootstrap par livre) avant ADR IntrinsicQualityScore. Risque restant : l'IC
honnête (par livre) élargira les intervalles — mais l'effet 0.93 est trop grand pour s'effondrer comme R4-small.*
