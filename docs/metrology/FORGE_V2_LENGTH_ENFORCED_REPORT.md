# FORGE-v2 — Réécriture length-enforced vers le cluster maître (mesuré)

**Date** : 2026-06-04 · **Branche** : phase-r-dispatcher-v33 · Décision : « 3 et après 2 » (autonomie).
**Suite de** : N6-ATELIER (`IMPROVE_CONFOUNDED_BY_COMPRESSION` — gemma compressait 25-38%, 0/3 PASS).
**Juge** : prompt CALIBRÉ EMP-19 (sha ecfb32d6, FIX-JUGE, biais 0.55). Radar : bge-m3 LOAO. Advisory, zéro impact moteur.

## Protocole
Pour chaque chapitre OMEGA (low-like / mixed / master-like d'après N5) :
- **best-of-3** réécritures gemma4 avec **consigne de longueur STRICTE** (≥ target mots, « développe images/intériorité, ne compresse pas »), num_predict 3600.
- filtre longueur (≥90% original) → parmi valides, juge calibré **pairwise double-ordre** vs original + radar.
- **PASS** = longueur OK ET juge préfère réécriture ET radar ne baisse pas.

## Résultats (`FORGE_V2_RESULTS.json`, réécritures dans `FORGE_V2_REWRITES/`)

| Chapitre | longueur (target 1500) | n valides /3 | radar avant→après (Δ) | juge | PASS |
|---|---|---|---|---|---|
| low-like | 1983 | 3/3 | −0.0224 → −0.0185 (**+0.0039**) | RÉÉCRITURE | **✓** |
| mixed | 2156 | 3/3 | +0.0011 → −0.0017 (−0.0028) | TIE | ✗ |
| master-like | 1978 | 3/3 | +0.0119 → +0.0121 (**+0.0002**) | RÉÉCRITURE | **✓** |

Synthèse : **3/3 longueur OK · 2/3 PASS · réécriture préférée 2/3 · mean Δradar +0.00046.**

## Findings
1. **Le confound de compression de N6 est RÉSOLU.** N6 : 0/3 longueur OK (compression 25-38%). FORGE-v2 : **3/3 longueur OK** (toutes les réécritures ≥1929 mots ≥ target). La consigne explicite « minimum X mots + développe, ne compresse jamais » + best-of-3 + num_predict élevé corrige le biais de raccourcissement.
2. **La prose OMEGA PEUT être déplacée vers les maîtres à longueur constante** — 2/3 chapitres : juge calibré préfère la réécriture ET radar monte. C'est la **première preuve propre** (sans confound de compression) qu'on peut élever OMEGA vers le cluster maître.
3. **Pas universel** : le chapitre mixed résiste (juge TIE, radar −0.0028). L'expansion à longueur constante a ajouté du matériau neutre qui n'élève pas. Tous les chapitres ne répondent pas pareil à une passe unique.

## Verdict : `FORGE_LENGTH_ENFORCED_WORKS_2of3`
La forge length-enforced lève le verrou de N6 et **démontre l'élévation mesurée** (juge + radar, longueur constante) sur la majorité. Reste advisory (zéro impact moteur). Le gain radar est petit (+0.0039 max) — une passe ; itérer pourrait accumuler.

## Prochaines itérations (attente GO)
1. **Passes séparées** (1 axe à la fois) pour identifier ce qui élève vraiment (langue vs voix vs rythme vs images).
2. **Itération multi-passes** length-enforced (la prose monte-t-elle cumulativement vers la médiane maîtres +0.010 ?).
3. **n plus grand** (plus de chapitres, plus de seeds) + œil humain sur les réécritures (le radar/juge ne remplacent pas la lecture).

## VERDICT
- Statut : PASS (méthode + résultat) · `FORGE_LENGTH_ENFORCED_WORKS_2of3`
- Forces : compression N6 résolue (3/3 longueur) ; juge calibré EMP-19 ; radar LOAO ; best-of-3 ; double-ordre ; preuve propre d'élévation 2/3.
- Faiblesses : (1) n=3, 1 passe ; (2) mixed non amélioré ; (3) gain radar petit (1 passe) ; (4) pas de lecture humaine encore ; (5) expansion peut ajouter du neutre.
- Action requise : itération (passes séparées + multi-passes) — décision Architecte.
- Artefacts : `scripts/metrology/forge_length_enforced.py`, `FORGE_V2_RESULTS.json`, `FORGE_V2_REWRITES/`.
