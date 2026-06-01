# DEC-20260601-014 — SCORE PROVENANCE PERSISTENCE

**Statut** : PROPOSED (doc-only, NO CODE) — décision/implémentation Architecte (terminal gaté).
**Date** : 2026-06-01 · **Standard** : NASA-Grade L4 / DO-178C Level A.
**Origine** : 3 evidence-gaps convergents — packet RCI non sauvegardé (WS-B1), holdout ρ introuvable, contrat ECC ALTERNANCE non sauvegardé (WS-B0c). Tous bloquent les audits then/now à 100 %.
**Gate** : DOC_ONLY.

## 1. Problème

Aujourd'hui un score (ECC/RCI/composite) est enregistré **sans son contrat/packet d'entrée**. Conséquence prouvée 3× cette session : impossible de rejouer/comparer un score historique, car l'entrée (contrat émotionnel, signature_words, hooks, version du juge) n'est pas persistée. Tout audit « le juge mesure-t-il comme avant ? » devient inconcluant (Δ confond juge + contrat + variance).

## 2. Décision cible

Chaque émission de score DOIT persister un **bloc de provenance** joint au score, suffisant pour un **replay déterministe** :

```
score_provenance = {
  score: { composite, ecc, rci, sii, ifi, aai, min_axis, sub_scores[] },
  input: {
    prose_sha256,                  // identité exacte de l'entrée
    prose_words, prose_chars,
    emotion_contract,              // curve_quartiles + tension + terminal_state (LE contrat complet)
    packet_signature_words,        // lexique signature effectif
    packet_recurrent_motifs,       // hooks
    style_profile_hash,            // reste du packet figé
    language
  },
  judge: {
    engine_version,                // git HEAD / tag
    coefficients_sha256,           // ex. coefficients-v3-4 e75e3bb0…
    model, judge_temperature, k_runs,
    scorer_formula_version         // s-score.ts version (composite weights, seal thresholds)
  },
  packet_completeness: 'FULL' | 'PROBE_ONLY' | 'INVALID_PACKET',   // règle DEC-013
  timestamp
}
```

Règles :
- `packet_completeness` calculé automatiquement : si signature_words/motifs vides → `INVALID_PACKET` (le score ne peut servir de preuve, cf. DEC-013).
- Provenance écrite à côté de CHAQUE score persisté (benches, goldens, runs prod, calibration).
- `prose_sha256` + `coefficients_sha256` + `engine_version` = clé de replay : rejouer = recharger le contrat persisté, pas en deviner un.

## 3. Bénéfice

- **Audits then/now à 100 %** : on rejoue avec LE contrat d'époque (plus de confond contrat/juge).
- Débloque WS-C (calibration vérité) : les paliers dérivés seront re-vérifiables.
- Opérationnalise INVALID_PACKET (DEC-013) : un score sans packet complet est marqué, jamais utilisé comme preuve.

## 4. Non-goals / interdits

- Ne PAS reconstruire rétroactivement les provenances manquantes (ALTERNANCE, holdout) — evidence-gap assumé, pas de fabrication de preuve a posteriori.
- Aucun changement de formule de score / seuil (orthogonal). Pure adjonction de métadonnées.
- N'altère pas le déterminisme replay SHA256 existant (l'étend).

## 5. Implémentation (gatée, terminal Architecte)

Point d'insertion : la couche qui émet les `MacroAxisScore` / le composite (s-score / oracle), + les harnais de bench. Flag d'activation, écriture append-only. Tests : un score rejoué depuis sa provenance reproduit le score original (à variance LLM près, mesurée par k). EMP-10 (vitest+tsc), shadow d'abord.

## VERDICT
- Statut : PASS (design doc-only ; répond aux 3 evidence-gaps).
- Confiance : Haute (le besoin est prouvé empiriquement 3× cette session).
- Forces : rend tout audit then/now rejouable ; opérationnalise INVALID_PACKET ; clé de replay claire (sha prose + coeffs + version).
- Faiblesses : (1) coût d'écriture/stockage par score ; (2) ne récupère pas le passé (gaps assumés) ; (3) le périmètre exact des champs « style_profile_hash » à préciser à l'implémentation.
- Risques restants : si la provenance n'est PAS rendue obligatoire, on retombe dans le gap → l'activer par défaut sur les chemins de calibration/bench au minimum.
- Action requise : décision Architecte sur l'implémentation (terminal gaté, EMP-10). Aucun code ici.
