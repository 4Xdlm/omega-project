# RCI FLOOR CANDIDATES — packet-fair analysis (WS-B1)

**Date** : 2026-05-31 · **Mode** : CALC, READ-ONLY, 0 Ollama, 0 patch, 0 floor change.
**Source** : `docs/audit/minaxis/MINAXIS_E_LITERARY_RECOMPUTE.csv` (57 passages, 11 maîtres, FR 42 / EN 15).
**Outil** : `scripts/metrology/wsb1-rci-floor-candidates.ts` (EXIT 0) → `RCI_FLOOR_CANDIDATES.json`.

## DÉCOUVERTE MAJEURE — la corpus-proof « 0/57 » est elle aussi packet-confondue

WS-B0b a montré que le judge-drift −17 venait d'un probe packet (signature=60, hook=85 constants). **MINAXIS_E utilise EXACTEMENT le même probe packet** (CSV : `signature`=60 et `hook`=85 constants sur les 57 passages). Donc la corpus-proof headline « 0/57 maîtres ≥ floor 85 » est **packet-confondue**, comme le −17.

Distribution **packet-fair** (`RCI_ceiling`, signature=hook=100) vs **probe** (`RCI`) :

| | probe RCI | RCI_ceiling (packet-fair) |
|---|---|---|
| médiane | 68.37 | **84.54** |
| moyenne | 68.12 | 84.40 |
| p25 | 65.44 | **81.67** |
| p10 | 63.09 | 79.41 |
| p75 | 71.13 | 87.35 |
| pass@85 | **0/57** | **28/57 (49 %)** |

→ À packet correct, **la moitié des maîtres passent le floor 85**, et la médiane maîtres (84.54) est ~au floor. Le « floor 85 mathématiquement inatteignable » n'est **PAS établi** une fois le confound retiré.

## Circularité K2 — réfutée à packet égal

| Comparaison | RCI |
|---|---|
| K2 (real packet, référence) | 82.6 |
| Maîtres CEILING (packet-fair) médiane | **84.54** |

La circularité « K2 (82.6) > maîtres (68) » comparait **K2 real-packet vs maîtres probe-packet** — comparaison injuste. À packet égal (ceiling), **maîtres 84.54 ≥ K2 82.6**. La circularité comme telle n'est pas démontrée.

## Caveat dur — le ceiling est une BORNE HAUTE

`RCI_ceiling` force signature=hook=100 (maîtres « parfaits » sur ces axes). Irréaliste pour de la littérature arbitraire sans `signature_words` par texte. Le vrai RCI maîtres ∈ **[probe 68, ceiling 84.5]**. Le ceiling sur-estime ; le probe sous-estime. → **la valeur packet-fair réelle n'est pas encore mesurée** ; il faudrait scorer les maîtres avec des `signature_words`/motifs **représentatifs par texte** (tâche data restante).

## Candidats floor (data-driven, AUCUN appliqué)

Bornés par l'incertitude packet :

| Candidat | probe | ceiling (borne haute) |
|---|---|---|
| p10 maîtres | 63.1 | 79.4 |
| **p25 maîtres** (reco Gemini) | 65.4 | **81.7** |
| p50 maîtres | 68.4 | 84.5 |

Floor candidat réaliste probable ∈ **[~76, ~82]** (entre probe-p50 corrigé et ceiling-p25), à confirmer par scoring representative-packet.

## Analyse leviers (D2)

- **rhythm** (prose-pur, vrai levier) : médiane 69.6, p10 56.9, p90 82.2, min 41.4, max 91.9. FR 70.0 / EN 68.3. C'est la composante à re-tuner sur cette distribution littéraire (pic CV), PAS sur K2.
- **euphony** (prose-pur) : médiane 78, mean 74.9. Distribution large → le ×0.5 défensif à réexaminer après re-tuning rhythm.
- **signature / hook** : **constants artefacts** (60 / 85) dans toute mesure à packet vide → ce ne sont PAS des leviers de recalibration mais un **défaut de packet de scoring** (à corriger en amont, pas par la formule).

## Verdict — le dossier RCI bascule

1. **Dérive temporelle** : RÉFUTÉE (WS-B0b).
2. **Floor impossible / K2 circulaire** : **NON établi** une fois le packet confound retiré (28/57 pass à packet-fair ; maîtres ceiling ≥ K2).
3. **Vrai défaut probable (unifiant)** : les harnais de scoring RCI (MINAXIS_E, judge-drift) utilisent des **packets dégénérés** (signature_words/hooks vides) → suppriment ~16 pts. **Même classe de bug que WS-A.2 ECC** (contrat/packet sous-peuplé). Le problème est le **packet de mesure**, pas (ou bien moins que supposé) la formule/le floor.
4. **Reste à faire avant toute décision floor** : scorer les maîtres avec des `signature_words`/motifs **représentatifs par texte** pour obtenir la vraie distribution packet-fair (entre probe et ceiling).

## VERDICT
- Statut : PASS (analyse concluante, confound packet de la corpus-proof démontré).
- Confiance : Haute (CALC reproductible sur MINAXIS_E ; ceiling 28/57 + médiane 84.54 vs K2 82.6).
- Forces : applique la leçon WS-B0b à la corpus-proof elle-même ; réfute « floor impossible » et « K2 circulaire » à packet égal ; identifie la cause unifiante (packet dégénéré, comme ECC) ; bracket honnête [probe, ceiling].
- Faiblesses : (1) ceiling = borne haute irréaliste → vraie valeur packet-fair non mesurée ; (2) il faut un scoring representative-packet des maîtres pour trancher le floor ; (3) K2 82.6 supposé real-packet — à reconfirmer.
- Risques restants : baisser le floor sur la seule base probe (0/57) serait fondé sur un artefact ; baser sur le ceiling serait optimiste. La vérité est entre les deux.
- Action requise : décision Architecte — (a) financer le scoring representative-packet des maîtres (WS-B2) avant tout floor, OU (b) acter un floor provisoire dans [76, 82] sous flag/shadow. Aucune des deux n'est appliquée ici.
