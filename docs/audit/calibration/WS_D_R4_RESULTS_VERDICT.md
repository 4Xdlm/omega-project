# WS-D R4 — DISCRIMINATION QUALITÉ : RÉSULTATS & VERDICT

**Date** : 2026-06-02 · **Run** : terminal Architecte, qwen3:32b · **72 unités** (18 livres × 600/1500/3000/entier × 3 familles FR+EN)
**Artefacts** : `WS_D_R4_QUALITY_DISCRIM.{jsonl,json,csv}` · script `scripts/metrology/wsd-r4-quality-discrimination-bench.ts`
**Métrique** : AUC = P(score_maître > score_pulp) par axe × échelle. 0.5 = aucune séparation ; ≥0.70 = discrimine (maîtres↑) ; ≤0.30 = inversion (pulp↑).

---

## 0. CORRECTION (EMP-17, METRIC_HONESTY)

Le verdict WS_D_R3 affirmait « aucun axe ne sépare maîtres/pulp à 600 mots ». **C'était FAUX**, fondé sur un eyeball
grossier de plages qui se chevauchaient + des axes inertes. L'AUC (rang, par axe, multi-échelle) prouve le contraire :
**plusieurs axes discriminent fortement.** Je retire l'affirmation R3 §1. La conclusion correcte est ci-dessous.

## 1. AUC maîtres vs mauvaise-prose (le signal de qualité)

| axe | 600 | 1500 | 3000 | entier | lecture |
|---|---|---|---|---|---|
| **authenticity** (LLM, AAI) | **0.94** | **0.93** | **0.81** | **0.69** | **DISCRIMINANT robuste, TOUTES échelles** |
| **euphony** (CALC, RCI) | 0.61 | **0.97** | **0.97** | **0.81** | **DISCRIMINANT fort ≥1500 mots** |
| **rhythm** (CALC, RCI) | **0.81** | **0.72** | 0.69 | 0.25 | discriminant 600-3000 ; **s'inverse à l'œuvre entière** (artefact ?) |
| **AAI** (composite) | 0.94 | 0.93 | 0.81 | 0.68 | discriminant (porté par authenticity) |
| **RCI** (composite) | 0.74 | **1.00** | 0.75 | 0.67 | discriminant (porté par rhythm+euphony) |
| necessity (LLM, SII) | 0.40 | 0.40 | 0.40 | 0.39 | **INVERSÉ — note la pulp PLUS haut** (défaut) |
| metaphor_novelty (LLM, SII) | 0.60 | 0.53 | 0.36 | 0.44 | bruit (~0.5) |
| anti_cliche (CALC, SII) | 0.50 | 0.50 | 0.50 | 0.50 | **INERTE** (saturé 100) |
| show_dont_tell (LLM, AAI) | 0.50 | 0.50 | 0.50 | 0.42 | **INERTE** (saturé 100) |
| SII (composite) | 0.50 | 0.22 | 0.25 | 0.44 | **ANTI-discriminant** (pollué par necessity inversé) |

Médianes clés (1500) : authenticity maîtres 84.5 vs pulp 77 ; euphony maîtres 84 vs pulp 60 (best 54) ; necessity maîtres 87 vs **pulp 92**.

## 2. Conclusions

1. **H2 (juge aveugle) RÉFUTÉE.** OMEGA discrimine la qualité littéraire — via **authenticity (LLM)**, **euphony** et
   **rhythm (CALC structurels)**. AUC jusqu'à 0.94-1.0. Le juge n'est PAS qu'un correcteur syntaxique.
2. **H1 (granularité) PARTIELLE.** euphony se renforce avec l'échelle (0.61→0.97 de 600 à 1500+) ; rhythm faiblit puis
   s'inverse à l'œuvre entière ; authenticity reste forte partout (légère baisse à l'entier, possible effet de troncature/moyennage).
   La qualité est lisible **dès 600-1500 mots** pour authenticity/rhythm, **≥1500** pour euphony.
3. **Axes MORTS ou INVERSÉS pour la qualité** (à reclasser, jamais dans la porte qualité) :
   - **necessity = INVERSÉ** (pulp > maîtres, AUC ~0.40 stable) — récompense la nécessité de mécanique narrative (pulp = plot-driven). **Défaut de même gravité que la densité sensorielle.**
   - **show_dont_tell = INERTE** (saturé 100 partout) — ne discrimine rien.
   - **anti_cliche = INERTE** (saturé 100) — déjà connu.
   - **metaphor_novelty = bruit**.
   - **SII composite = anti-discriminant** (porté à la baisse par necessity).

## 3. Implication directe — composition de l'IntrinsicQualityScore (split R3)

La **porte de Qualité Intrinsèque** doit être bâtie sur les axes qui DISCRIMINENT :
- **authenticity** (LLM) — le plus robuste ;
- **euphony** (CALC) — fort à l'échelle scène/chapitre ;
- **rhythm** (CALC) — fort ≤3000 (investiguer l'inversion à l'entier).

Et **EXCLURE de la porte qualité** (reclasser advisory/diagnostic) : necessity (inversé → à corriger ou sortir),
show_dont_tell + anti_cliche (inertes), metaphor (bruit), + densité sensorielle (DEC-016) + ECC (ContractConformity).

→ Cela CONVERGE avec DEC-016 (split) et le confirme empiriquement : on sait désormais QUELS axes mettent dans la porte qualité.

## 4. Caveats (rigueur)

- **n petit** (6 maîtres vs 6 pulp/taille) → AUC granulaire (0.944 = 34/36). Direction forte et cohérente multi-échelle,
  mais à **confirmer sur n plus large** (R4_BOOKS_PER_CELL≥5) avant tout code (EMP-16 : 3 preuves indépendantes).
- **rhythm s'inverse à l'œuvre entière** (AUC 0.25) : probable artefact de troncature WHOLE_MAX/moyennage → investiguer.
- **necessity identique sur 600/1500/3000** par livre (ex. flaubert 94 partout) : le capteur semble peu sensible à la fenêtre
  → comprendre ce que necessity mesure réellement (et pourquoi il s'inverse).
- 1 parse-fail JSON (le_pacte_de_sang 3000, metaphor) — sous-score isolé, impact négligeable.
- Le label auto `discriminating_axes` du script conflate discrimination (>0.7) et inversion (<0.3) — lire la TABLE directionnelle, pas la liste brute. (À raffiner.)

## 5. Prochain pas gaté

- **Confirmer** authenticity/euphony/rhythm sur n large (≥5 livres/cellule) = la triple-preuve EMP-16 pour fonder l'IntrinsicQualityScore.
- **Investiguer** necessity (inversion) + rhythm@entier (artefact).
- **Puis** ADR composition IntrinsicQualityScore (= authenticity + euphony + rhythm, pondérations à dériver), gate Architecte.
- **METRIC_HONESTY** : résultat POSITIF acté — OMEGA discrimine la qualité ; reste à recomposer la porte autour des bons axes.
