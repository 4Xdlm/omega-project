# AUDIT — Calibration des mesures par langue

**Date** : 2026-03-23
**Verdict** : Le pipeline TS est BILINGUE par construction. Pas de correction necessaire.

## Resultat par composant

| Composant | Parametre langue | FR correct | EN correct | Verdict |
|-----------|-----------------|-----------|-----------|---------|
| text-features.ts (adversatifs) | BILINGUE (FR+EN+ES) | OUI | OUI | OK |
| text-features.ts (sensoriels) | BILINGUE (FR+EN+ES) | OUI | OUI | OK |
| text-features.ts (epistemiques) | BILINGUE (FR+EN) | OUI | OUI | OK |
| text-features.ts (ironie/SIL) | MAJORITAIREMENT FR | OUI | PARTIEL | RISQUE MINEUR |
| depth-features.ts | Language-agnostique | OUI | OUI | OK |
| semantic-depth-features.ts | STOP_FR unaccented | OUI | PARTIEL | RISQUE MINEUR |
| gb-scorer.ts | Aucun param langue | N/A | N/A | NEUTRE |
| gb-inference.ts | Aucun param langue | N/A | N/A | NEUTRE |

## Features language-neutral (PAS de risque)

- f26b_long_sent_rate : mecanique (compte phrases > 40 mots)
- f1a_rhythm_variance : mecanique (CV des longueurs)
- f1_mean : mecanique (moyenne longueur)
- f24c_contrast_delta : mecanique (ratio courtes/longues)
- f15b_redundancy : mecanique (bigrammes repetes)
- f17_knife_count : mecanique (phrases < 5 mots)
- f19a_approx_entropy : mecanique (CV normalise)

## Features bilingues (faible risque)

- f9a_contradiction_rate : adversatifs FR+EN dans la liste
- f29d_ttr_score : pas de stopwords dans le calcul TTR
- f25g_description_score : sensoriels FR+EN+ES
- f27a_epistemic_rate : epistemiques FR+EN

## Features FR-dominantes (risque mineur)

- f28b_irony_density : marqueurs FR ("on eut dit", "naturellement")
- f28d_sil_score : style indirect libre FR
- f27d_modal_score : combine epistemiques + conditionnel + negation complexe

## Impact sur le test v1

Les resultats v1 sont **VALIDES** sur les features mecaniques et bilingues.
Les features FR-dominantes (ironie, SIL, modal) sont sous-estimees pour l'anglais
mais cela ne change PAS le verdict sur le bottleneck (base sur GB, CV, f26b).

## Corrections necessaires

**AUCUNE correction bloquante.** Le pipeline est bilingue par construction.
Les features FR-dominantes sont un biais CONNU et MINEUR.
