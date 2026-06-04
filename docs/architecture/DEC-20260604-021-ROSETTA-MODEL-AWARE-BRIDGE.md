# DEC-20260604-021 — Rosetta Bridge model-aware (dispatch par générateur)

**Statut** : ACCEPTÉ (Tribunal 2/2 + autonomie Architecte, 2026-06-04) · **Famille** : EMP-19 (calibration per-LLM) · **Type** : coupling S1→S2 (génération, advisory — ne gate aucun verdict).

## Contexte
Le bridge Rosetta traduit des cibles métriques en directives de prompt pour le générateur. Jusqu'ici, une **matrice unique** (calibrée claude-sonnet-4) pilotait TOUT générateur. Or le S0 gemma4 (cap-400, 370 tests) prouve que la pilotabilité **diffère par modèle** (f25g SOLIDE→PROMETTEUSE ; 11 features claude non couvertes gemma). Piloter gemma4 avec le profil claude = erreur de pilotage (EMP-19).

## Décision
1. **Bridge dispatché par modèle générateur.** `ROSETTA_BRIDGE_MATRIX_BY_MODEL.json` mappe : `gemma4:31b → ROSETTA_BRIDGE_MATRIX_GEMMA4.json` (CALIBRATED), `claude-sonnet-4-20250514 → ROSETTA_BRIDGE_MATRIX.json` (ARCHIVE_EXTERNAL), `default → CALIBRATION_REQUIRED`.
2. **Factory `RosettaBridge.forModel(model)`** (src/coupling/rosetta-bridge.ts) : charge le profil du modèle ; **modèle inconnu → throw `ROSETTA_CALIBRATION_REQUIRED`** (lancer rosetta-s0-ollama.ts).
3. **Leviers gemma4 actifs = SOLIDE ∧ pilotabilité>0** uniquement : f24e_contrast, f15b_compression, f16a_bigram_rarity, f29d_ttr (route PROMPT_DIRECT).
4. **f17_knife_count = ILLUSION_DÉCLARATIVE → INTERDIT comme levier** (route SHADOW, instruction vide). f35c/f36c (pilot 0) inactifs. f25g advisory.
5. **Aucune feature déclarée pilotable si pilotabilité=0.** Aucune instruction de comptage/mathématique « illusion déclarative » dans les prompts (gaspille le contexte).

## Justification (mécanisme)
Un LLM est un moteur probabiliste : il pilote des propriétés distributionnelles (contraste, rareté lexicale) mais pas des comptages exacts (f17). La pilotabilité est **propre au couple {modèle+prompt}** — démontré par la divergence f25g gemma vs claude. Le dispatch model-aware empêche d'appliquer des directives calibrées sur un autre cerveau.

## Validation
- `ROSETTA_BRIDGE_MATRIX_GEMMA4.json` généré depuis `s06_classification_regles.json` (script `rosetta_bridge_regen_gemma4.py`, reproductible).
- Tests `rosetta-bridge.test.ts` : forModel('gemma4:31b') charge ; f24e route PROMPT_DIRECT ; f17 route SHADOW ; claude-sonnet charge ; **unknown → ROSETTA_CALIBRATION_REQUIRED**. 13/13 PASS, tsc 0, suite SE non régressée.

## Conséquences / limites
- Le profil claude-sonnet est **conservé en archive** (jamais utilisé pour gemma).
- 11 features claude non couvertes gemma → si la forge en a besoin, bencher gemma sur ces features (relancer S0).
- HOLD forge multi-passes : maintenant débloqué (bridge gemma4 prêt) → forge avec les 4 leviers actifs.

## VERDICT
- Statut : PASS · Confiance : Haute.
- Forces : dispatch model-aware ; f17 neutralisé ; divergence f25g traitée ; tests + tsc verts ; advisory (zéro gate).
- Faiblesses : (1) gemma couvre 8/19 features ; (2) câblage du bridge dans le pipeline de génération réel = étape suivante (ce DEC fournit l'outil, pas encore le branchement runtime) ; (3) hook/cliff non pilotables.
- Action requise : décider du branchement runtime (forModel dans creation-pipeline) + lancer la forge multi-passes sur les 4 leviers.
