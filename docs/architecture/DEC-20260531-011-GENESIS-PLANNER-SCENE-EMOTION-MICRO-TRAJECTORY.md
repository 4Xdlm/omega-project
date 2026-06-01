# DEC-20260531-011 — GENESIS-PLANNER SCENE-LEVEL EMOTION MICRO-TRAJECTORY

**Statut** : PROPOSED (doc-only, NO CODE) — ratification Architecte requise (§13).
**Date** : 2026-05-31 · **Standard** : NASA-Grade L4 / DO-178C Level A.
**Origine** : continuation de [DEC-010 §16](DEC-20260531-010-EMOTION-CONTRACT-DERIVATION-UNIFICATION.md) (diagnostic WS-A.2, commit `32dfdec8`).
**Gate** : DOC_ONLY. Zéro code / patch / recalibration / modif ECC-RCI / genome SEALED / DEC-009. NO CODE BEFORE ADR.

---

## 1. Problem statement

L'ECC s'effondre sur scène-0 de « Le Gardien » (FORGE 68 vs HAND 92) non pas à cause d'un bug de dérivation dans `assembleForgePacket`, mais parce que le **planner réduit un arc émotionnel littéraire à un waypoint unique par scène**. Le contrat émotionnel par scène est donc structurellement trop pauvre (mono-émotion, plat sur 4 quartiles) pour juger une prose littéraire à sous-texte. Cet ADR déplace formellement la responsabilité de la dérivation 14D intra-scène vers `genesis-planner` et définit le comportement cible AVANT tout code.

## 2. Chaîne de preuve (intent → planner → assembleForgePacket → ECC)

Tracée fichier+ligne, vérifiée empiriquement (diagnostic CALC déterministe `scripts/metrology/wsa2-prose-emotion-diag.ts`, EXIT 0) :

1. `golden/intents/intent_pack_gardien.json` → `intent.emotion` = arc **book-level** : `trust@0.0(0.3) → anticipation@0.3 → fear@0.5 → fear@0.8 → sadness@1.0`, `arc_emotion='fear'`.
2. Planner → 7 waypoints / 7 scènes. `genesis-planner/src/generators/scene-generator.ts:104` : `emotion_target: emo.emotion`. scène-0 couvre `[0, 0.143]` → capte **1 seul waypoint = trust@0** → `scene0.emotion_target='trust'` intensité 0.3.
3. `assembleForgePacket` reflète fidèlement → `target_14d = {trust:1.0}` plat sur 4 quartiles.
4. Prose golden mesurée (analyseur keyword, fallback de `tension_14d`) : sadness/fear-dominante.

| Quartile | 14D réel mesuré (top) | cos vs FORGE(trust:1.0) | cos vs HAND(fear arc) |
|---|---|---|---|
| Q1 | sadness 1.0 / fear 0.6 / trust 0.2 | 0.164 | 0.558 |
| Q2 | sadness 1.0 / fear 0.5 / submission 0.5 | 0.000 | 0.389 |
| Q3 | fear 1.0 / sadness 0.6 / trust 0.2 | 0.169 | 0.972 |
| Q4 | joy 1.0 / sadness 0.31 / fear 0.23 | 0.000 | 0.338 |
| **AVG** | — | **0.083** (≈ t14d 9) | **0.564** (≈ t14d 86) |

## 3. Pourquoi `assembleForgePacket` N'EST PAS la cause-racine

`assembleForgePacket` est « bête et discipliné » : il reçoit `scene.emotion_target='trust'` (intensité 0.3) et l'applique uniformément sur les 4 quartiles. La platitude one-hot `trust:1.0` est l'**image correcte** d'un signal d'entrée unique et grossier. `tension_14d` donnerait même +5 de bonus monotone-vs-monotone si la prose était trust plate. Patcher `assembleForgePacket` reviendrait à compenser à l'aval un défaut de résolution amont — déplacement de bug, pas correction.

## 4. Pourquoi dériver le contrat depuis la prose scorée est INTERDIT (circularité)

`tension_14d = cosineSimilarity14D(contrat.target_14d, prose.actual_14d)` par quartile. Si l'on construit `target_14d` en lisant la prose à scorer, la similarité tend vers 1 par construction → ECC tautologiquement ≈ 100 → capteur réduit à une machine à se donner raison. **Le contrat est la CIBLE dramatique (l'intention), jamais une description de la sortie.** Toute dérivation 14D doit provenir de l'intention narrative (arc + fonction de scène + beat + genre), PAS de la prose générée.

> **Phrase scellée** : *Le contrat ne doit pas copier la prose. Il doit exprimer l'intention dramatique assez finement pour que la prose puisse être jugée sans tricher.*

## 5. Comportement cible

`genesis-planner` ne doit plus fournir seulement `scene.emotion_target` (un mot). Il doit produire une **micro-trajectoire émotionnelle intra-scène** (au minimum 4 points / quartiles, ou une trajectoire continue échantillonnable) dérivée de :

- le waypoint d'arc book-level couvrant la scène (point d'ancrage),
- les waypoints voisins (interpolation directionnelle : d'où l'on vient, où l'on va),
- la fonction narrative / beat de la scène (ouverture, montée, climax local, résolution),
- le genre / l'`arc_emotion` global.

`assembleForgePacket` **consomme** cette micro-trajectoire (il ne l'invente pas). La variation Q1≠Q4 doit dépasser le seuil de variation (cf. `tension_14d` `prescribedIsVaried > 0.15`) quand la scène le justifie, et rester plate quand la scène est légitimement mono-émotion (le bonus monotone-vs-monotone reste correct dans ce cas).

## 6. Contrat attendu pour scène-0 « Le Gardien » (PROPOSÉ — à ratifier §13)

Convergence 2-IA (Gemini + ChatGPT) + arbitre runtime (Claude) : l'ouverture (phare, mer, silence, miroir sans fond) est une **façade calme chargée de profondeur** — ni `trust:1.0` plat, ni `fear` pur dès l'ouverture.

```
surface   = trust / calme / certitude
sous-couche = mélancolie (sadness) / vertige-admiration (awe) / fear latent
direction = glissement progressif trust → awe/sadness → anticipation/fear
```

| Quartile | dominant proposé | sous-composantes |
|---|---|---|
| Q1 | trust | + sadness légère |
| Q2 | trust | + awe / anticipation |
| Q3 | awe | + sadness + fear latent |
| Q4 | anticipation | + fear léger |

(Valeurs indicatives. La règle de dérivation, pas le tableau littéral, est l'objet de l'ADR.)

## 7. Tests requis AVANT code

1. scène-0 Le Gardien → contrat NON plat : variation Q1↔Q4 (distance cosinus target ≥ 0.15) ; dominant Q1 ≠ dominant Q4.
2. Une scène légitimement mono-émotion → reste plate (pas de variation forcée) ; bonus monotone-vs-monotone préservé.
3. La micro-trajectoire est dérivée des waypoints d'arc + fonction de scène, JAMAIS de la prose (test anti-circularité : aucun argument prose dans la signature de dérivation).
4. Zéro NaN / zéro `target_14d` vide chez les consommateurs (`tension_14d`).
5. Non-régression : EmotionContract existant (chemin V2.3-A + assembleForgePacket) inchangé tant que le flag est OFF.
6. Bench non-régression ECC : le contrat enrichi fait remonter ECC sur prose appropriée SANS dériver de la prose (mesuré sur prose tierce, pas la prose scorée).

## 8. Conditions NO-GO

- Forcer scène-0 en `fear` pur — NON.
- Garder `trust:1.0` plat — NON.
- Dériver le contrat depuis la prose à scorer — **INTERDIT** (circularité).
- One-hot constant / fallback trust — NON.
- Force-fear par genre horror — NON.
- Dupliquer une table d'émotions (réutiliser `@omega/omega-forge` DEFAULT_CANONICAL_TABLE) — NON-duplication.
- Toucher ECC / RCI / genome SEALED / DEC-009 — NON.

## 9. Impact sur DEC-010

- WS-A.2 **reclassé** : de « bug assembleForgePacket » → **OPEN_DIAGNOSED — upstream genesis-planner contract granularity defect**.
- `assembleForgePacket` **innocenté** (propage fidèlement le label scène).
- T1 (bracketing flag-gated, commit `f3bdcafc`/`32dfdec8`) **conservé** : mitigation bornée valide, default OFF, ne ferme pas le défaut de granularité.
- Le 14D contrat omega-forge reste le levier ECC prouvé (DEC-010 §15) — cet ADR enrichit sa SOURCE (planner), pas sa nature.

## 10. Impact sur M4 / DEC-009

Inchangé : M4/fusion reste **GELÉ**. Un bench de fusion avec des contrats de scène mono-émotion plats juge sur un signal dégénéré. La granularité de contrat per-scène est un pré-requis de la validité de M4 (au même titre que la recalibration RCI WS-B et la re-validation scorer).

## 11. Convergence multi-IA (piste recoupée, non preuve)

Conformément à STRUCTURED_MEMORY_PRIORITY + multi-ia-validator : le consensus 2-IA est une **piste**, recoupée ici par la mesure empirique (diagnostic CALC `32dfdec8`).
- **Gemini** : Cause-1 (granularité) ; prose a raison, intent trop simpliste ; ouvrir ADR genesis-planner micro-trajectoire ; fermer provisoirement WS-A.2.
- **ChatGPT** : Cause-1 + Cause-2 partielle ; reclasser WS-A.2 OPEN_DIAGNOSED (ne pas fermer) ; ouvrir ADR ; cible stratifiée Q1≠Q4.
- **Claude (arbitre runtime)** : diagnostic empirique identique ; tranche **reclassement** (vs fermeture) ; Q1 = décision autoriale à ratifier.

## 12. Open questions (Architecte)

- **Q1 [À RATIFIER]** : la cible §6 (trust surface + sous-couche mélancolie/awe/fear) est-elle l'intention autoriale validée pour l'ouverture de Le Gardien ?
- **Q2** : la micro-trajectoire est-elle générée par **interpolation des waypoints d'arc** (déterministe, CALC) ou par une **table beat→émotion** par fonction de scène (plus riche, plus de design) ? — décision de conception à arrêter dans l'implémentation post-ratification.
- **Q3** : granularité — sur-échantillonner l'arc book-level (plus de waypoints) OU dériver localement par scène ? (impact sur le replay déterministe SHA256).
- **Q4** : faut-il un flag dédié (`OMEGA_PLANNER_MICRO_TRAJECTORY`) distinct de `OMEGA_EMOTION_DERIV_V2` ?

## 13. Ratification (Architecte)

Cet ADR est **PROPOSED**. Aucune implémentation `genesis-planner` ne démarre avant ratification explicite de l'Architecte sur Q1 (§12) et choix de conception Q2/Q3. La règle « le contrat exprime l'intention, jamais la prose » (§4) est, elle, non négociable.

---

## VERDICT
- Statut : PASS (ADR doc-only ; responsabilité déplacée avec preuve ; comportement cible + interdits définis ; zéro code).
- Confiance : Haute (chaîne intent→planner→assembler→capteur vérifiée empiriquement ; convergence 2-IA recoupée ; piège de circularité formalisé).
- Forces : innocente assembleForgePacket sur preuve ; identifie la granularité comme cause-racine ; scelle l'interdiction de circularité ; sépare la règle (non négociable) de la cible autoriale (à ratifier).
- Faiblesses : (1) la cible §6 reste une recommandation, pas une mesure — l'intention autoriale n'est pas mesurable par CALC ; (2) le diagnostic 14D utilise l'analyseur keyword (le bench prod utilise le semantic cortex) — ordre FORGE≪HAND identique, valeurs absolues à confirmer si re-run semantic [À VÉRIFIER] ; (3) le choix Q2 (interpolation vs table beat) impacte le replay déterministe — non tranché ici.
- Risques restants : si Q2 = table beat, risque de duplication de canon émotionnel — surveiller NON-duplication (réutiliser omega-forge).
- Action requise : ratification Architecte Q1 + décision conception Q2/Q3/Q4 avant tout code genesis-planner.
