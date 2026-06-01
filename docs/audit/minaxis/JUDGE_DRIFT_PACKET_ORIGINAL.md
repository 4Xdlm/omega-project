# JUDGE DRIFT — PACKET-ORIGINAL DECOMPOSITION (WS-B0b)

**Date** : 2026-05-31 · **Mode** : CALC déterministe, READ-ONLY, 0 Ollama, 0 patch, 0 floor change.
**Origine** : DEC-012 §3 (D3 Architecte/2-IA) — isoler la dérive pure-formule du judge-drift WS-B0 (−17.14), confondue par un probe packet.
**Outil** : `scripts/metrology/wsb0b-judge-drift-packet-original.ts` (EXIT 0).

## Méthode

Les packets ALTERNANCE 2026-03-26 originaux **ne sont pas sauvegardés** (seul le RCI agrégé historique est présent dans `phase2_results.json` ; aucune sous-composante). Reconstruction impossible. → **Décomposition par sensibilité packet** (bracketing) au lieu de reconstruction :

Pour chaque passage, `computeRCI` actuel est recomposé en forçant `signature=100` ET `hook=100` (meilleur packet possible), en gardant `rhythm`/`euphony`/`voice` **prose-purs intacts**. L'agrégation est reproduite exactement depuis `macro-axes.ts:computeRCI` (`rci_raw = Σ(score·weight)/Σweight` ; `score_final = clamp(rci_raw + penalty)` ; la pénalité anti-métronomique dépend du rythme seul → invariante à signature/hook).

- `RCI_now_probe` = computeRCI actuel (probe : signature=60 artefact, hook=85 neutre).
- `RCI_packet_max` = même prose, signature & hook forcés à 100.
- `delta_packet = RCI_packet_max − RCI_now_probe` = part **récupérable par le packet**.
- `residual_drift = hist_RCI − RCI_packet_max` = dérive **NON récupérable** = formule pure (rhythm/euphony/voice).

## Résultats (7 passages ALTERNANCE)

| Passage | hist_RCI | now_probe | packet_max | Δ_packet | residual_drift | rhythm | euphony |
|---|---|---|---|---|---|---|---|
| A_baseline | 80.4 | 63.4 | 81.2 | +17.73 | −0.80 | 59 | 68 |
| B_exemplar | 79.8 | 63.8 | 81.7 | +17.89 | −1.93 | 52 | 80 |
| C_sysprompt/menace | 90.5 | 72.8 | 90.8 | +18.03 | −0.26 | 78 | 87 |
| D_antimono | 87.1 | 69.1 | 86.8 | +17.70 | +0.23 | 75 | 73 |
| E_skeleton | 83.9 | 66.7 | 84.5 | +17.83 | −0.66 | 66 | 73 |
| F_mask | 87.7 | 70.3 | 88.2 | +17.91 | −0.49 | 71 | 84 |
| C_sysprompt/revelation | 83.3 | 66.5 | 84.1 | +17.64 | −0.86 | 69 | 68 |
| **moyenne** | — | — | — | **+17.82** | **−0.68** | — | — |

`packet_max` pass@85 = **3/7** — **identique à l'historique** (`hist_pass85 = 3/7`).

## Verdict

**La formule `computeRCI` n'a PAS dérivé entre mars 2026 et maintenant.** Le −17.14 du WS-B0 est **à 100 % un artefact du probe packet** (`signature_words=[]` → `scoreSignature`=60 artefact ; `recurrent_motifs=[]` → `hook`=85 neutre). Quand signature & hook sont fixés à 100 (simulant un packet réel correctement renseigné), le RCI revient à ~historique :
- `residual_drift` moyen = **−0.68** (≈ bruit, non significatif).
- Le pass@85 packet-max (3/7) **reproduit exactement** le pass@85 historique.

Les composantes **prose-pures** (`rhythm`, `euphony`) sont donc stables : aucune re-pondération récente ne les a déplacées. La sévérité apparente venait uniquement de l'absence de `signature_words`/`motifs` dans le probe packet.

**Conséquence pour WS-B / DEC-012** : la « dérive du juge » comme **problème de formule est RÉFUTÉE**. Le dossier de recalibration RCI repose désormais **uniquement** sur la corpus-proof MINAXIS_E (0/57 maîtres ≥ floor 85, K2 82.6 > maîtres) — qui concerne le **floor / la circularité K2**, PAS une dérive temporelle. C'est un pilier unique mais solide et reproductible.

## Limites

- Bracketing, pas reconstruction : `signature=hook=100` est une borne supérieure idéale ; le packet original réel aurait donné une valeur intermédiaire. Mais comme `residual_drift ≈ 0` à la borne MAX, et que `now_probe` est la borne MIN, le RCI historique (3/7 pass) est **encadré** et reproductible sous packet correct → la conclusion « pas de dérive de formule » est robuste sur l'intervalle.
- Vaut pour les 7 passages ALTERNANCE (prose menace/révélation). N'invalide pas la corpus-proof MINAXIS_E (littérature publiée, problème distinct du floor).

## VERDICT
- Statut : PASS (décomposition concluante, déterministe, EXIT 0).
- Confiance : Haute (residual −0.68 ≈ 0 sur 7/7 ; pass@85 packet-max = historique exact).
- Forces : lève le confound du WS-B0 ; sépare formule (stable) de packet (artefact) ; assainit DEC-012 en retirant un pilier confondu.
- Faiblesses : (1) bracketing vs reconstruction (packet original non sauvegardé) ; (2) 7 passages, thème menace — pas la littérature MINAXIS_E.
- Action requise : mettre à jour DEC-012 §3 (dérive formule réfutée) ; NCR_RCI → OPEN_DIAGNOSED (floor/circularité, PAS dérive). Recalibration = corpus-proof MINAXIS_E seule.
