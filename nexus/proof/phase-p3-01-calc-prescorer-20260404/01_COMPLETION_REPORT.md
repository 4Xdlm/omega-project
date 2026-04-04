# P3-01 — CALC Pre-Scorer: Completion Report

**Date**: 2026-04-04
**Phase**: P3-01 (LLM Cost Reduction)
**Standard**: NASA-Grade L4 / DO-178C Level A
**Status**: PASS

---

## Objectif

Réduire le nombre d'appels LLM par run en éliminant les candidats morts
avant le scoring V3 coûteux (~7-8 appels LLM par candidat).

**Approche validée** : REJECTOR, pas sélecteur. Filtre CALC-only (0 LLM,
déterministe) appliqué entre la génération des drafts et le `Promise.all`
de `judgeAestheticV3`.

---

## Livrables

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/duel/calc-pre-scorer.ts` | CRÉÉ | Module CALC pre-scorer |
| `tests/duel/calc-pre-scorer.test.ts` | CRÉÉ | 22 tests (thresholds, core, guardrail, signature, mixed, edge) |
| `src/duel/duel-engine.ts` | MODIFIÉ | Injection pre-scorer avant Promise.all V3 |
| `src/index.ts` | MODIFIÉ | Export calcPreScore + types |
| `proofpack/phase-s-sealed/HASHES.sha256` | MODIFIÉ | Hash duel-engine.ts mis à jour |

---

## Règles implémentées (validées par Francky 2026-04-04)

### Hard Reject
- `rhythm < 45` → REJECT
- `anti_cliche < 50` → REJECT

### Red Flags
- `rhythm < 55` → 1 flag
- `euphony < 45` → 1 flag
- `anti_cliche < 70` → 1 flag

### Cumul
- `2+ red flags` → REJECT

### Guardrail
- Max 2 rejects par duel (toujours ≥2 survivants)

### Signature
- Telemetry only — non décisionnel en v1

---

## Activation

Variable d'environnement : `OMEGA_CALC_PRESCORER=1`

- Défaut : DÉSACTIVÉ (sécurité — pas encore benchmarké en production)
- Condition : nécessite `symbolMap` présent (V3 path)
- Si désactivé : comportement identique au code pre-P3

---

## Invariants

| ID | Description | Vérifié |
|----|-------------|---------|
| INV-P3-PRESCORE-01 | Rejector only — ne sélectionne jamais | ✅ Tests T12, T40 |
| INV-P3-PRESCORE-02 | ≥2 candidats survivent toujours | ✅ Tests T20-T23 |
| INV-P3-PRESCORE-03 | 0 appels LLM (CALC-only) | ✅ Aucun import provider/LLM |

---

## Tests

```
229 fichiers PASS | 1 skipped
2220 tests PASS | 7 skipped | 0 FAIL
Duration: 96.35s
```

Dont 22 nouveaux tests pour calc-pre-scorer :
- T01-T07 : Constantes (seuils SSOT)
- T10-T13 : Core behavior (structure, PROSE_GOOD survit, déterminisme)
- T20-T23 : Guardrail (max rejects, rescue, 2 candidats)
- T30-T31 : Signature (telemetry, pas décisionnel)
- T40-T42 : Mixed quality (bon survit, arithmetic, ranges)
- T50-T51 : Edge cases (single candidate, empty prose)

---

## Gain estimé

- Par candidat rejeté : ~8 appels LLM économisés
- Sur 4 candidats, si 1-2 rejetés : 8-16 appels économisés par run
- Baseline : 93.4 appels/run → cible ~75-80 appels/run (15-20% réduction)
- **Gain réel à mesurer** : P3-01c bench A/B (prochaine étape)

---

## Prochaines étapes

1. **P3-01c** : Bench A/B avec OMEGA_CALC_PRESCORER=0 vs =1 sur 5 scènes
2. **P3-02** : Réduction generateStructuredJSON (42% des appels)
3. **P3-03** : Cache cross-candidat (même packet → même analyse sémantique)

---

## VERDICT

- **Statut** : PASS
- **Confiance** : Haute
- **Forces** : Module isolé, 0 impact si désactivé, guardrail solide, 22 tests, env var toggle
- **Faiblesses** : (1) Seuils empiriques non encore calibrés sur corpus large — bench A/B nécessaire. (2) Gain réel non mesuré — estimation théorique seulement.
- **Risques** : Seuils trop agressifs pourraient rejeter des candidats qui auraient gagné le duel → atténué par guardrail ≥2 et toggle off par défaut.
- **Action requise** : P3-01c bench pour valider gain réel et calibrer seuils.
