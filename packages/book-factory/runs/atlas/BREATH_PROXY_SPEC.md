# BREATH_PROXY_SPEC — proxy de souffle (read-only, ADVISORY)

**Statut : `ADVISORY` / `NOT_GATE` / `NOT_HUMAN_TRUTH` / `NO_AUTO_PATCH`.**
**Canon V3 INTACT (`dc1616e27193` / tag `24bb55df`). Le proxy ne mute rien, ne tranche rien, ne patche rien.** Date : 2026-06-11.

Mandat convergent (Gemini + ChatGPT + Architecte) : le proxy ne juge pas le livre à la place de l'auteur ; il **classe** des candidats pour guider la régénération V6 et départager le micro-lot. Réutilisation pure des briques scellées — **zéro nouveau code redondant** (règle cardinale anti-doublon).

## 1. Briques réutilisées (omega-p0 / @omega/phonetic-stack, compilé `dist/index.js`)
Aucune réimplémentation. Le proxy appelle les fonctions scellées telles quelles :
- `analyzeEuphony` (P3) → `euphonyScore`, `hiatusCount`, `clusterCount` (musicalité + heurts).
- `analyzeRhythm` (P2) → `rhythm_score`, `npvi_weighted` (variation rythmique nPVI).
- `analyzeCalques` (P4) → `penalty` (cliché/calque).
- (disponibles, non retenus dans le composite v2 : `analyzeDensity` P5, `RepetitionSensor` — déjà la garde mécanique de la couche Docteur.)

## 2. Mesure
Pour chaque candidat : `raw(AVANT)` et `raw(APRÈS)` sur 4 composants. Composite **z-normalisé** :

```
souffle(text) = z(euphony) − z(cacophonie) + z(rhythm) − z(calque)
cacophonie    = hiatusCount + clusterCount     // COMPTE, pas densité
```

`Δsouffle = souffle(APRÈS) − souffle(AVANT)`. Plus haut = respire mieux.

## 3. ⚠ Défaut de métrologie trouvé ET corrigé (honnêteté — non caché)
**v1 du proxy était fausse** : le composite additif utilisait la **densité cacophonie /mot × 100**. Sur des passages courts (une phrase), la densité par mot explose → un seul cluster pesait des centaines de points et **écrasait** euphonie/rythme (unités). Le classement n'était piloté que par cet artefact. **C'est le piège densité/longueur déjà combattu 3 fois** dans la couche Docteur (tic-weaver, repetition-sensor, harness).
**Correctif v2** : (a) cacophonie en **COMPTE** (`hiatusCount+clusterCount`), pas en densité ; (b) **z-normalisation** par composant sur la distribution complète → aucun axe ne domine. Le classement v2 est balancé et lisible.

## 4. Conditions d'échec (limites explicites)
- **Passages courts** = bruit. Sur une phrase, euphonie/rythme/nPVI sont volatils ; les Δ d'1-2 unités ne sont pas significatifs individuellement. Le proxy est fiable en **tendance / classement relatif**, pas en valeur absolue.
- **Le souffle réel n'est pas réductible à ces 4 axes.** Le proxy ignore le sens, la nuance psychologique, l'ironie, le sous-texte — tout ce qui fait qu'une phrase « respire » vraiment. D'où `NOT_HUMAN_TRUTH`.
- **Le proxy n'est pas une gate.** Aucune décision d'application ne doit en dépendre seule. Il départage et priorise ; l'auteur (ou le juge LLM) tranche.

## 5. Sorties produites (toutes SHADOW)
- `GREEN19_LLM_JUDGE.md/.json` — verdicts gemma4 (souffle) des 19.
- `MICROLOT_TOP.md` — noyau sûr 7 = (gemma KEEP) ∩ (proxy non-dégradant) ; + 4 second-rang (divergence juge/proxy → oreille humaine).
- `ORANGE_REWRITE_RANKING.md` + `_breath_orange.json` — 163 classés par motif puis souffle.

## 6. Convergence observée (preuve que les deux signaux sont indépendants et utiles)
gemma a retenu 11/19 ; le proxy en confirme **7 acoustiquement sûrs** et **flag 4** que gemma aime mais où l'euphonie baisse (P008, A231, A007, P029). Deux instruments orthogonaux qui se recoupent : c'est exactement ce qu'on veut d'un advisory.

### VERDICT
- **Statut** : PASS (proxy read-only opérationnel, briques scellées réutilisées, artefact densité trouvé+corrigé).
- **Confiance** : Haute sur la mécanique (vraies fonctions omega-p0, z-normalisation correcte) ; Moyenne sur la portée (souffle réel ≠ 4 axes — assumé).
- **Forces** : zéro doublon ; le défaut densité a été attrapé AVANT de polluer un classement ; recoupe le juge LLM.
- **Faiblesses** : bruit sur passages courts ; 4 axes ne capturent pas le sens ; pas de validation contre un gold-set de souffle (n'existe pas).
- **Risques restants** : tentation de promouvoir le proxy en gate → INTERDIT par ce SPEC (`NOT_GATE`).
- **Action requise** : usage advisory uniquement ; l'auteur tranche le micro-lot. HOLD canon / applyTicRepair / V4_ROMAN.
