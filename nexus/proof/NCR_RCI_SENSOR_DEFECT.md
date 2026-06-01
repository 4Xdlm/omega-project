# NCR-RCI-SENSOR-DEFECT: Le floor RCI 85 n'est pas justifié — capteur probablement mal calibré

**Status**: OPEN_DIAGNOSED · **Severity**: HIGH · **Date**: 2026-05-31 · **Origine**: MIN_AXIS FLOOR AUDIT (commit `9f37b3aa`, `docs/audit/minaxis/`).
**MAJ 2026-05-31 (D4)** : OPEN → OPEN_DIAGNOSED. Cause = floor/captor K2-circular & corpus-invalid (MINAXIS_E 0/57). La « dérive du juge » (judge-drift −17.14) est **RÉFUTÉE comme dérive de formule** (WS-B0b `JUDGE_DRIFT_PACKET_ORIGINAL.md` : residual −0.68 ≈ 0, −17 = artefact probe packet signature/hook). Transition → RESOLVED-PENDING-RECALIBRATION après choix levier (pic CV littérature) + protocole Phase R. Design remédiation = DEC-20260531-012.
**MAJ 2026-05-31 (WS-B1)** : la corpus-proof « 0/57 » est elle-même **packet-confondue** (MINAXIS_E utilise signature=60/hook=85 constants). À packet-fair (RCI_ceiling) : 28/57 maîtres passent 85, médiane 84.54, et maîtres ≥ K2 (82.6) → « floor impossible » et « circularité K2 » NON établis. Cause reformulée : **packet de scoring dégénéré** (même classe que WS-A.2 ECC) > floor/circularité. Pré-requis avant décision floor : WS-B2 scoring representative-packet des maîtres. Cf `docs/audit/minaxis/RCI_FLOOR_CANDIDATES.md` + DEC-012 §12.
**Doctrine**: PROVE IT · NO RECALIBRATION WITHOUT CORPUS PROOF · NO THRESHOLD CHANGE WITHOUT BENCH.

## Issue
Le RCI (Rhythmic Control/Craft Index, poids 17 %, floor 85) est le `min_axis` bloquant le seal dans une majorité de cas, mais les preuves convergent vers un **défaut de capteur (B/C/D)**, pas un défaut de prose (A) :
- **Distribution** : 73 % des runs full-axes (37/51) sont sous le floor 85 ; distribution centrée à **82.4** → le floor 85 tombe à ~p72 de la sortie réelle du moteur. RCI seul bloqueur du seal dans 37 % des cas. (réf : `MINAXIS_FLOOR_AUDIT.md`, `MINAXIS_DISTRIBUTION.csv`).
- **Composite rapiécé (preuve code, `macro-axes.ts:computeRCI`)** : 5 sous-axes / 5 ont un historique de re-pondération défensive — rhythm scalé par confiance f(longueur) + tuné K2 ; `hook_presence` poids 0.20 + 75-neutre explicitement « to avoid dragging RCI » ; `euphony` 1.0→0.5 ; `voice_conformity` poids 0 (neutralisé) ; `signature` ≥30 %. Un capteur dont 5/5 composantes ont dû être bridées pour « éviter de tirer le score vers le bas » est un capteur instable.
- **Incohérence interne prouvée** : le repo a DÉJÀ abaissé les floors SII et MACRO_AXIS de 85→80 **avec corpus-proof** (« floor 85 = physically impossible per corpus, McCarthy/Hemingway »), mais **jamais RCI** — alors que RCI présente le même symptôme. (réf : `ART_AUDIT_REPORT.md:119` « RCI 76-82 … primary bottleneck »).
- **Floors 85/88 NON justifiés** par le corpus Phase W (413 œuvres).
- **Recompute littéraire EXÉCUTÉ (MINAXIS_E, HEAD `a4917bba`)** : `computeRCI` (100 % CALC, 0 Ollama) sur **57 passages / 11 maîtres** (Flaubert/Hugo/Proust/Maupassant/Zola/Stendhal/Balzac/Dickens/Brontë/Austen/Melville, `omega-autopsie/gutenberg_cache/`) → **0/57 ≥ floor 85** (médiane **68.4**, max **76.6** Melville). La sortie moteur K2 (**82.6**) score **AU-DESSUS** des maîtres (**68.1**). `RCI_ceiling` (signature=hook=100, drags structurels neutralisés) = **49 %** seulement. Biais auto-documentés : `euphony_basic` « not Phase W calibrated… structural bias » (poids 0.5), `signature`=60 artefact de contrat. → **floor 85 mathématiquement inatteignable par la littérature publiée** ; **corpus-proof OBTENU**. (réf : `docs/audit/minaxis/MINAXIS_E_LITERARY_RECOMPUTE.md` + `_SOURCES.md` + `.csv`).

## Mécanisme (pourquoi ça marche / quand ça échoue)
Le seal exige tous les axes ≥ floor. Si le floor RCI (85) est calibré au-dessus de ce que le moteur — voire la littérature publiée — peut atteindre, le seal devient mathématiquement inatteignable par le RCI, indépendamment de la qualité réelle du rythme. Le capteur « punit » alors une prose correcte.

## Options
1. **Statu quo** : garder floor 85. Risque : seal quasi inatteignable, faux rejets systémiques (effort nul, dette maintenue).
2. **Recalibration RCI sur corpus-proof** : **corpus-proof OBTENU** (MINAXIS_E : 0/57 maîtres ≥85) → la littérature publiée échoue bien le floor 85. Reste la **décision Architecte** sur la valeur du floor (ex. 80, aligné sur SII/MACRO) et/ou les leviers sous-axes (hook 75-neutre, signature contract-dependent, euphony biais, rhythm pic-CV K2), **via le dispatcher Phase R** (`baseline_m0b` shadow), jamais par patch direct. **Recommandé.**
3. **Refonte du composite RCI** : ré-architecturer les 5 sous-axes (dé-bricoler les pondérations défensives). Effort HIGH, risque, à éviter avant 2.

## Decision
**PENDING Architecte.** Pré-requis `MINAXIS_E_LITERARY_RECOMPUTE` **EXÉCUTÉ** (`a4917bba` : 0/57 maîtres ≥85) → **corpus-proof obtenu**. Reste : décision Architecte sur le remède (valeur du floor RCI / recalibration), à appliquer **uniquement via le dispatcher Phase R gaté**. **INTERDIT** : baisser le floor ou patcher les `compute*` sans ce passage (doctrine NO_THRESHOLD_CHANGE_WITHOUT_BENCH). Aucun patch tant que ce NCR est OPEN.

> **Réconciliation 2026-05-31** : ce fichier (underscore) est l'**UNIQUE NCR RCI autoritaire**. Le doublon `nexus/proof/NCR-RCI-SENSOR-DEFECT.md` (hyphen, commit `420e9d5a`) — né d'une collision de commits parallèles — a été **supprimé** (`git rm`) après fusion de sa preuve MINAXIS_E ici. Cf. CODEX v1-3-1 §7.6 FORBID-OPS-PARALLEL-COMMIT.

## Verdict
- Statut : OPEN · Confiance : Haute (sur le défaut de capteur), Moyenne (sur le remède exact).
- Action requise : exécuter le recompute littéraire (NCR lié) → puis décision Architecte sur floor RCI.
