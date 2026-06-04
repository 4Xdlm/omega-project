# N6-ATELIER — Peut-on déplacer la prose OMEGA vers le cluster maître ? (mesuré)

**Date** : 2026-06-04 · **Branche** : phase-r-dispatcher-v33 · Décision : « lance D » (autonomie).
**Nature** : 1 passe d'amélioration gemma4 (clean langue + montrer-pas-expliquer + voix + rythme + images, length-guarded, sans résumé) sur 3 chapitres OMEGA réels. Mesure AVANT/APRÈS : radar bge-m3 + gemma pairwise (double ordre). Advisory, zéro impact moteur.

## Résultats (`N6_ATELIER_RESULTS.json`, réécritures dans `N6_REWRITES/`)

| Chapitre | radar avant | radar après | Δ radar | mots avant→après | gemma préfère | PASS |
|---|---|---|---|---|---|---|
| low-like | −0.0224 | −0.0241 | **−0.0017** | 1500 → 927 (−38%) | RÉÉCRITURE | ✗ |
| mixed | +0.0011 | +0.0030 | **+0.0019** | 1500 → 1126 (−25%) | RÉÉCRITURE | ✗ |
| master-like | +0.0119 | +0.0145 | **+0.0026** | 1500 → 1073 (−28%) | RÉÉCRITURE | ✗ |

`PASS` = gemma préfère réécriture ET radar ne baisse pas ET longueur ±15%.

## Findings
1. **La réécriture est préférée 3/3 par gemma** (juge advisory, double ordre) — la passe améliore la qualité perçue.
2. **Le radar monte sur 2/3** (mixed +0.0019, master-like **+0.0026**) — la réécriture pousse la prose **vers le cluster maître**, le plus nettement sur le chapitre déjà master-like. Mean Δradar = +0.0009.
3. **MAIS 0/3 PASS — échec systématique sur la LONGUEUR** : gemma compresse de **25 à 38 %** à chaque fois, malgré la consigne « même longueur ±10 % ». L'amélioration est en partie **un resserrement par coupe**, pas une élévation à longueur constante.

## Verdict : `IMPROVE_PASS_CONFOUNDED_BY_COMPRESSION`
La passe naïve « améliore » la prose (préférence gemma + radar↑) **mais en la raccourcissant**. La préférence gemma est donc **confondue** : « plus court + plus serré » lit mieux. On ne peut PAS conclure à une élévation pure vers les maîtres tant que la compression n'est pas neutralisée.

Le signal positif réel : sur le chapitre master-like, le radar gagne **+0.0026** (de +0.0119 vers +0.0145, soit vers la médiane maîtres +0.010 et au-delà) — la réécriture PEUT enfoncer une bonne prose plus loin dans le territoire maître. Mais à −28 % de longueur, c'est invalide.

## Prochaine itération (V2 forge, attente GO)
1. **Length-enforced forge** : rejet+regénération si longueur < 90 % (ou consigne de cible mots stricte + vérif). Mesurer si le gain radar survit À LONGUEUR CONSTANTE.
2. **Passes séparées** (ChatGPT N6) : 1 axe à la fois (langue / explication émotionnelle / voix / rythme / images), mesurer la contribution de chacun.
3. **Best-of-N réécriture** : générer 3 réécritures, sélectionner celle qui (longueur OK ET radar↑ ET gemma préfère).

## VERDICT
- Statut : PASS (méthode, harnais de mesure fonctionnel) · Résultat : `IMPROVE_CONFOUNDED_BY_COMPRESSION`
- Forces : mesure honnête avant/après (radar + gemma double-ordre), length-guard a attrapé le piège de compression (que ChatGPT avait anticipé), signal radar→maître réel sur prose déjà bonne.
- Faiblesses : (1) compression 25-38% invalide les 3 PASS ; (2) préférence gemma confondue par raccourcissement ; (3) n=3, 1 passe, 1 modèle.
- Action requise : itération length-enforced (V2 forge) — décision Architecte.
- Artefacts : `scripts/metrology/n6_atelier.py`, `N6_ATELIER_RESULTS.json`, `N6_REWRITES/` (orig+rewrite, workspace).
