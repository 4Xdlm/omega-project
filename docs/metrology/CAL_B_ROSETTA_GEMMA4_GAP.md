# CAL-B — Rosetta S0 pour gemma4 : sonde de pilotabilité + plan d'adaptation

**Date** : 2026-06-04 · **Branche** : phase-r-dispatcher-v33 · Décision : « lance b » (autonomie).
**Contexte** : étalonneur EMP-19 a révélé `GENERATION_CALIBRATION_GAP` — Rosetta S0 calibré pour `claude-sonnet-4`, PAS pour le générateur local actuel `gemma4:31b`.

## Constat sur l'infra existante
`packages/sovereign-engine/scripts/rosetta-s0-calibration.ts` est **hardcodé** : `import Anthropic from '@anthropic-ai/sdk'`, `const MODEL='claude-sonnet-4-20250514'`, `ANTHROPIC_API_KEY` requis, 450+ tests LLM sur 8 phases. **Ne peut PAS calibrer gemma4 sans adaptation** (provider Anthropic → Ollama). C'est un chantier dédié (multi-heures + adaptateur).

## Sonde focalisée livrée (`CAL_B_PILOTABILITY_PROBE.json`)
À défaut du S0 complet, sonde minimale : gemma4 génère 2 passages même thème sous directives de style OPPOSÉES, mesure de différenciation du rythme.

| Style demandé | f1 longueur phrase | densité virgule | n phrases |
|---|---|---|---|
| ACTION (phrases courtes) | **3.3 mots** | 0.000 | 41 |
| INTROSPECTION (phrases longues) | **35.5 mots** | 0.075 | 6 |

**Ratio intro/action = 10.6×** → `PILOTABLE_RHYTHM`.

## Verdict
**gemma4 est FORTEMENT pilotable sur l'axe rythme** (longueur de phrase, subordination, ponctuation). Il **répond dramatiquement** aux directives de style. → bon pronostic de transfert des directives Rosetta vers gemma4 pour les features PILOTABLES.

**MAIS** : ceci ne remplace PAS le S0 complet. Rosetta classe chaque feature en PILOTABLE / ILLUSION / INDIRECT / CONTOURNABLE / IRRÉDUCTIBLE **par LLM** — cette classification peut différer entre claude-sonnet et gemma4 (une feature pilotable chez l'un peut être illusion chez l'autre). Tant que le S0 gemma4 n'est pas exécuté, les directives bridge calibrées claude-sonnet restent **potentiellement stale** pour les features non-rythme.

## Plan d'adaptation (chantier dédié, attente GO)
1. Créer `rosetta-s0-ollama.ts` : remplacer le client Anthropic par un provider Ollama (`http://localhost:11434/api/generate`, model param), garder les 8 phases + l'extraction de features (`computeTextFeatures`).
2. Exécuter sur gemma4:31b → produire `rosetta_gemma4-31b_v1.json` (matrice pilotabilité par feature, nommée par modèle, comme `rosetta_claude-sonnet-4_v1.json`).
3. Régénérer `ROSETTA_BRIDGE_MATRIX.json` à partir du S0 gemma4 (ou dispatcher par modèle générateur).
4. Mettre le registre EMP-19 `generation_roles` à jour : statut → CALIBRATED pour gemma4.

## VERDICT
- Statut : PASS (sonde) · `gemma4 = PILOTABLE_RHYTHM` confirmé ; S0 complet = PRÉPARÉ, chantier dédié.
- Forces : signal réel de pilotabilité gemma4 (ratio 10.6×) sans fabriquer un faux S0 ; plan d'adaptation précis.
- Faiblesses : (1) sonde = 1 axe (rythme), pas les 19 features ; (2) S0 complet non exécuté (adaptateur Ollama requis) ; (3) GAP génération reste ouvert jusqu'au S0 gemma4.
- Action requise : décision Architecte — créer l'adaptateur Ollama + lancer S0 gemma4 (session dédiée).
- Artefacts : `scripts/metrology/cal_b_gemma_pilotability_probe.py`, `CAL_B_PILOTABILITY_PROBE.json`.
