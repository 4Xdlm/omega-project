# JUDGE DRIFT TEST (WS-B0) — re-score ALTERNANCE 2026-03-26 avec le juge actuel

**Date** : 2026-05-31 · **Mode** : READ-ONLY (0 patch / 0 recalibration / 0 floor / 0 Ollama — RCI = CALC).
**Outil** : `scripts/metrology/judge-drift-test.ts` (réutilise `computeRCI` actuel + packet probe permissif).
**Question** : le juge mesure-t-il encore comme à l'époque ? (même prose, score mars vs maintenant)

## Résultat
| Passage | scène | hist_RCI (2026-03-26) | now_RCI | ΔRCI | cv then→now | rhythm | euphony | sig | hook |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|
| A_baseline | menace | 80.35 | 63.4 | −16.9 | 1.524→1.52 | 59 | 68 | 60 | 85 |
| B_exemplar | menace | 79.77 | 63.8 | −16.0 | 1.30→1.30 | 52 | 80 | 60 | 85 |
| C_sysprompt | menace | 90.54 | 72.8 | −17.8 | 0.883→0.88 | 78 | 87 | 60 | 85 |
| D_antimono | menace | 87.07 | 69.1 | −17.9 | 0.82→0.82 | 75 | 73 | 60 | 85 |
| E_skeleton | menace | 83.88 | 66.7 | −17.2 | 1.478→1.48 | 66 | 73 | 60 | 85 |
| F_mask | menace | 87.70 | 70.3 | −17.4 | 0.88→0.88 | 71 | 84 | 60 | 85 |
| C_sysprompt | revelation | 83.28 | 66.5 | −16.8 | 1.351→1.35 | 69 | 68 | 60 | 85 |

**Stats** : n=7 · **mean ΔRCI = −17.14** · MAE = 17.14 · RMSE = 17.15 · **hist_pass85 = 3/7 → now_pass85 = 0/7**.

## Verdict : BIASED_SHIFT (dérive systématique du juge) — HIGH confidence
- Les 7 passages chutent de **−16 à −18 points** ; **RMSE ≈ MAE** → **biais uniforme**, pas de la variance aléatoire → le juge s'est **déplacé**, il n'est pas devenu bruité.
- Le `cv` (entrée rythme, longueur de phrase) est **identique** then/now → la prose et le parsing sont les mêmes ; la chute vient de la **notation**, pas de l'entrée.
- Les **3 passages qui scellaient en mars (RCI ≥ 85) échouent tous aujourd'hui (0/7)** → le juge actuel ne peut PAS reproduire ses propres seals de mars sur une prose identique.

## Décomposition de la cause (honnête)
La chute −17 est un **mélange**, à part en deux :
1. **Artefact de contrat (signature=60, hook=85 constants)** : le re-score utilise un packet probe permissif (`signature_words=[]`) → `signature` plafonné à 60, `hook` neutre 85. Le packet ALTERNANCE original avait probablement des `signature_words` peuplés → signature plus haut → RCI historique plus haut. **Confond partiel** (même cause que NCR_RCI_SENSOR_DEFECT, artefact `signature_words=[]`).
2. **Dérive de formule rythme plausible** : le pic CV recalibré à **0.60 « tuné K2 »** pénalise les passages à cv élevé (A_baseline cv 1.52 → rhythm 59 ; B_exemplar cv 1.30 → rhythm 52), alors que la prose ALTERNANCE de mars (cv 0.8–1.5) scorait 80–90.

**Pur-prose (packet-indépendant)** : rhythm 52–78, euphony 68–87 sur ces cv. **Non isolable à 100%** sans le packet ALTERNANCE original (à récupérer pour un test propre).

## Conséquence (lien workstreams)
- **Renforce NCR_RCI_SENSOR_DEFECT** : non seulement le floor 85 est inatteignable par la littérature (0/57, MINAXIS_E), mais le juge a **dérivé de ~17 points** sur les propres sorties d'OMEGA depuis mars → la métrique RCI a été **déplacée par les re-pondérations successives** (signature artefact + pic CV 0.60 + euphony×0.5).
- **Classé WS-B0** (baseline de dérive) → alimente WS-B (recalibration RCI corpus-proof) avec une **magnitude chiffrée** (~−17).
- **Limite** : confond signature-packet à isoler (re-run avec packet ALTERNANCE d'origine ou signature_words peuplés). Recommandation : ouvrir une sous-tâche WS-B0.1 pour la version packet-fidèle.

## VERDICT
- Statut : PASS · Confiance : Haute (biais uniforme reproductible, cv identique) ; le partage formule/artefact reste à isoler.
- Action requise : intégrer la magnitude −17 dans WS-B (recalibration) ; ne PAS toucher le floor/formule sans corpus-proof + décision Architecte. Read-only respecté.
