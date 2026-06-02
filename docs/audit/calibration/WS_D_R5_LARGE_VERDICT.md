# WS-D R5-LARGE — VERDICT : qualité FR CONFIRMÉE (modérée), sweet-spot 1500 mots

**Date** : 2026-06-02 · **Run** : terminal Architecte, qwen3:32b · **2340 mesures** (60 livres : 15/cellule × maîtres/pulp × FR/EN)
**Stats** : pairwise + absolu, **IC95 bootstrap CLUSTERISÉ PAR LIVRE** (corrige le caveat d'indépendance). Doctrine EMP-16, EMP-12.

---

## 1. Résultats (IC95 par livre = honnête)

### Pairwise (choix forcé maître vs pulp)
| langue | taille | master_win | IC95 par livre | biais position |
|---|---|---|---|---|
| **FR** | 1500 | **0.807** | [0.622, 0.951] | 0.147 |
| FR | 3000 | 0.780 | [0.611, 0.927] | 0.200 |
| EN | 1500 | 0.951 | [0.887, 0.991] | 0.098 |
| EN | 3000 | 0.931 | [0.860, 0.984] | 0.138 |

### Absolu FR (profondeur / style / voix) — AUC [IC95 par livre]
| taille | profondeur | style | voix |
|---|---|---|---|
| 600 | 0.809 [0.63, 0.96] | 0.773 [0.58, 0.93] | 0.740 [0.56, 0.89] |
| **1500** | **0.844 [0.67, 0.98]** | **0.864 [0.72, 0.98]** | **0.851 [0.68, 0.98]** |
| 3000 | 0.778 [0.59, 0.94] | 0.789 [0.60, 0.94] | 0.796 [0.61, 0.94] |

(EN absolu : AUC 0.83-0.98, médianes maîtres 76-92 vs pulp 45-66 — fort à toutes tailles.)

## 2. Lecture honnête (EMP-12)

- **La qualité FR est DISCRIMINÉE — confirmé à n=15 avec IC clusterisé.** Point pairwise 0.78-0.81 ; absolu AUC 0.74-0.86.
  Loin du hasard, sur deux instruments indépendants.
- **MAIS le signal est MODÉRÉ, pas le 0.93 du run n=9.** La rigueur (cluster par livre) a dégonflé l'estimé optimiste.
  Ce n'est PAS un effondrement (cf rhythm en R4) : c'est une **déflation honnête vers la vraie valeur (~0.80)**.
- **`SEALABLE=false` au sens strict** (mon critère exigeait IC_bas>0.65 sur ≥2 tailles ; seul 1500 le satisfait pour l'absolu).
  **Mais à 1500 mots — la granularité d'une scène — les 3 dimensions FR passent le seuil** (AUC 0.84-0.86, IC_bas 0.67-0.72).
- **Sweet-spot = ~1500 mots.** À 600 (trop court) et 3000 (trop long/hétérogène), les IC s'élargissent sous le seuil.
  → Le juge de qualité FR doit opérer à **granularité de scène**, pas sur micro-passages ni œuvres entières.
- **Biais de position FR 0.15-0.20** (élevé) : mitigé par la moyenne des 2 ordres (ce que fait le win_rate), mais résiduel — à surveiller.
- **EN ≫ FR persiste** (pairwise 0.93-0.95) : le modèle reste plus à l'aise en anglais, mais le FR est désormais exploitable.

## 3. Conclusion

**OMEGA peut juger la qualité littéraire française — à granularité de scène (~1500 mots), avec une force MODÉRÉE
(AUC ~0.85 absolu, win-rate ~0.81 pairwise).** Ce n'est pas assez net pour un **floor de production dur** (IC-bas ~0.62-0.67),
mais c'est largement suffisant pour les deux usages qui comptent :
1. **`IntrinsicQualityScore` ADVISORY** = profondeur + style + voix, mesuré à ~1500 mots (scène). Signal de qualité, non cassant.
2. **Sélecteur pairwise** = choisir le meilleur de N candidats (best-of-N) — un win-rate 0.81 est excellent pour la SÉLECTION,
   même s'il ne suffit pas pour une certification absolue. C'est exactement le rôle « juge = sélectionneur, pas dictateur ».

## 4. Décision (Architecte)

- **A (recommandée)** — ADR `IntrinsicQualityScore` en rôle **ADVISORY + SÉLECTEUR** (profondeur+style+voix @scène + juge
  pairwise comme sélecteur best-of-N). Déployable maintenant, cohérent avec la doctrine (le juge ne bloque pas, il guide/sélectionne).
  Pas de floor dur tant que la force n'est pas durcie.
- **B** — Durcir vers un floor : pousser n à 30+ livres/cellule (l'IC par livre se resserre avec plus d'unités indépendantes)
  pour viser IC_bas>0.65 robuste, avant un gate dur. Run plus lourd.
- **C** — Tribunal sur ce résultat (déflation honnête + sweet-spot 1500) avant A/B.

## 5. Caveats & gardes

- n=15/cellule reste modéré ; les IC par livre sont larges par nature à ce n. Le point-estimé est fiable, l'IC l'est moins.
- Biais position FR à corriger (prompt ? moyenne d'ordres déjà appliquée).
- EMP-16 : un **gate dur** exige B (n plus grand). Un rôle **advisory/sélecteur** est justifié dès maintenant par ce run.
- ZÉRO code moteur ; O2 shadow ; anti-circularité DEC-011 ; scores-only.

---

*VERDICT : PASS partiel — qualité FR confirmée RÉELLE et MODÉRÉE (pas SEAL-grade au sens strict, mais valide à 1500 mots
pour un usage advisory/sélecteur). Confiance : Haute sur l'existence du signal (2 instruments, n=15, cluster) ; Moyenne sur
la force exacte (IC larges). Action : décision A (ADR advisory+sélecteur) recommandée ; B (n=30) pour un futur gate dur.*
