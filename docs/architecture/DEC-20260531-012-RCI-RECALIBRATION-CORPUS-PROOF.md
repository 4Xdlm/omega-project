# DEC-20260531-012 — RCI RECALIBRATION (corpus-proof remediation design)

**Statut** : PROPOSED (doc-only, NO CODE) — décision Architecte requise sur la valeur du floor + leviers (§9).
**Date** : 2026-05-31 · **Standard** : NASA-Grade L4 / DO-178C Level A.
**Origine** : [NCR_RCI_SENSOR_DEFECT](../../nexus/proof/NCR_RCI_SENSOR_DEFECT.md) (OPEN, HIGH) + WS-B0 Judge Drift (`docs/audit/minaxis/JUDGE_DRIFT_TEST.md`, commit `ad5d8ddf`) + MINAXIS_E (`a4917bba`).
**Gate** : DOC_ONLY. Zéro patch / recalibration / changement de floor / modif `compute*`. NO RECALIBRATION WITHOUT CORPUS PROOF · NO THRESHOLD CHANGE WITHOUT BENCH.

---

## 1. Problem statement

Le floor RCI 85 (poids 17 %, sous-axe `min_axis` bloquant le seal) est empiriquement inatteignable et le capteur est suspecté calibré sur la sortie K2, pas sur la littérature. Cet ADR formalise le **design de la remédiation** (NCR_RCI Option 2) AVANT tout code : quels leviers, via quel canal gaté, avec quels garde-fous de non-régression. Il NE décide PAS la valeur du floor (Architecte, §9).

## 2. Corpus-proof (SOLIDE — CALC déterministe, 0 Ollama)

MINAXIS_E (`computeRCI` sur 57 passages / 11 maîtres publiés, `omega-autopsie/gutenberg_cache/`, HEAD `a4917bba`) :

| Mesure | Valeur |
|---|---|
| Maîtres ≥ floor 85 | **0 / 57** |
| Médiane RCI maîtres | **68.4** (max 76.6, Melville) |
| Sortie moteur K2 | **82.6** — score AU-DESSUS des maîtres (68.1) |
| `RCI_ceiling` (signature=hook=100, drags neutralisés) | **49 %** |
| Distribution moteur full-axes < 85 | 73 % (37/51), centrée 82.4 → floor 85 ≈ p72 |

**Conclusion** : le floor 85 est inatteignable par la littérature publiée → faux rejets systémiques. La circularité K2 (moteur > maîtres) prouve que le capteur récompense la conformité au style K2, pas la qualité littéraire.

## 3. Judge drift (WS-B0) — signal réel, AVEC caveat de confond

Re-score des passages ALTERNANCE 2026-03-26 (7 passages) avec `computeRCI` actuel :

| Mesure | Valeur |
|---|---|
| mean ΔRCI | **−17.14** (MAE 17.14, RMSE 17.15) |
| pass@85 historique → maintenant | **3/7 → 0/7** |

**CAVEAT HONNÊTE (à ne pas masquer)** : le « now » utilise un **packet probe permissif** → `signature` (60) et `hook` (85) sont **packet-confounded** (fixés par le probe, pas l'ALTERNANCE original). Seuls `rhythm` / `euphony` sont **prose-pure** (non confondus). Donc :
- Le ΔRCI −17 agrégé est **indicatif**, PAS une isolation pure-formule.
- Action préalable recommandée (CALC, read-only) : **re-run du judge-drift avec le packet ALTERNANCE original** (signature_words/hook reconstruits) pour isoler la dérive pure-formule de `signature`/`hook`. Tant que non fait, ne PAS attribuer les −17 entiers à une dérive de formule.

## 4. Surface de recalibration — 5 sous-axes, ré-pondérations défensives (preuve code `macro-axes.ts:computeRCI`)

| Sous-axe | État actuel | Suspicion |
|---|---|---|
| `rhythm` | scalé par confiance f(longueur), pic CV **0.60 tuné sur K2** | circularité K2 |
| `hook_presence` | poids 0.20, **75-neutre explicite** « to avoid dragging RCI » | bridage cosmétique |
| `euphony` | **1.0 → 0.5**, « not Phase W calibrated, structural bias » | biais auto-documenté |
| `voice_conformity` | poids **0** (neutralisé) | mort |
| `signature` | seuil ≥30 %, **artefact de contrat** (=60 hors contrat) | dépendant packet |

Un capteur dont 5/5 composantes ont été bridées « pour éviter de tirer le score vers le bas » est instable. La recalibration doit **dé-bricoler** ces leviers sur preuve corpus, pas ajouter un 6e correctif cosmétique.

## 5. Comportement cible

1. Le floor RCI et/ou les pondérations sous-axes doivent être **ancrés data-driven** sur un corpus mixte (littérature publiée + sortie moteur), PAS sur K2 seul.
2. Le pic CV `rhythm` (0.60) doit être **re-tuné sur la littérature** (les maîtres), pas sur K2 — c'est le cœur de la circularité.
3. Toute valeur de floor proposée doit être **justifiée** par la distribution corpus (ex. percentile littérature) — jamais « arrondie ».
4. Réconciliation des floors : `core/thresholds.ts:SEAL_FLOOR_MIN=85` (gate SEAL tous axes) vs abaissement SII/MACRO 85→80 déjà fait avec corpus-proof. RCI présente le même symptôme → cohérence à établir.

## 6. Canal de remédiation (NON négociable)

- **Via le dispatcher Phase R** (`baseline_m0b` shadow), kill-switch discipline (jamais cosmétique), **JAMAIS patch direct** sur `compute*` ni sur le floor.
- Discipline kill-switch : un changement de levier doit prouver un **gain mesurable** (réduction des faux rejets sur corpus littéraire SANS effondrer le composite global moteur), seuil pré-déclaré, pas d'ajustement post-hoc.
- KPI = **taux de faux rejets** (maîtres injustement < floor), pas le score brut.

## 7. Tests / bench requis AVANT code

1. Re-run judge-drift packet-original (isole signature/hook pure-formule) — §3.
2. Recompute RCI corpus mixte (maîtres + K2 + sortie moteur) avec le levier candidat → distribution avant/après.
3. Bench non-régression **composite global** (le levier RCI ne doit pas dégrader les autres macro-axes ni le seal des golden runs « Le Gardien »/« Le Choix »).
4. Vérifier zéro régression des 2517 tests vitest sovereign-engine (baseline).
5. Kill-switch : si le levier n'améliore pas le taux de faux rejets au-delà du seuil pré-déclaré → REJET, pas d'abaissement.

## 8. Conditions NO-GO

- Baisser le floor sans la distribution corpus qui le justifie — INTERDIT.
- Patcher `compute*` ou le floor hors dispatcher Phase R — INTERDIT.
- Re-tuner le pic CV sur K2 (perpétue la circularité) — NON.
- Ajouter un 6e correctif cosmétique « pour remonter RCI » — NON.
- Toucher ECC / genome SEALED / DEC-009 — NON.
- Attribuer −17 entiers à la formule sans le re-run packet-original (§3) — NON (honnêteté métrique).

## 9. Décision Architecte requise

- **D1** : valeur du floor RCI cible (ex. 80 aligné SII/MACRO ? percentile littérature data-driven ? maintien 85 avec leviers sous-axes ?).
- **D2** : leviers autorisés (pic CV re-tuné littérature / euphony 0.5→? / hook 75-neutre / signature contract-dependent / voice_conformity).
- **D3** : feu vert au re-run judge-drift packet-original (§3, CALC read-only) — pré-requis recommandé.
- **D4** : NCR_RCI_SENSOR_DEFECT reste OPEN jusqu'à exécution gatée ; reclasser RESOLVED-PENDING-RECALIBRATION ?

## 10. Impact

- NCR_RCI_SENSOR_DEFECT : cet ADR = formalisation de l'Option 2 (remédiation). NCR reste OPEN.
- M4 / DEC-009 : reste **GELÉ** — un bench de fusion sur un RCI calibré-K2 est circulaire (cf. plan recalibration §3). WS-B est, avec WS-A (DEC-011) et la re-validation scorer, un pré-requis de M4.
- DEC-010/011 (ECC/14D) : indépendant — RCI = « thermomètre », ECC/14D = « carburant ». Deux chantiers distincts.

---

## VERDICT
- Statut : PASS (design de remédiation formalisé ; corpus-proof solide ; canal gaté défini ; caveat de confond honnête).
- Confiance : Haute sur le défaut (0/57 CALC reproductible) ; Moyenne sur le remède exact (valeur floor = décision Architecte).
- Forces : sépare la preuve solide (0/57 corpus) du signal confondu (judge-drift −17 packet-confounded) ; nomme la circularité K2 (pic CV) comme cœur du défaut ; impose le dispatcher Phase R + kill-switch ; KPI = faux rejets, pas score brut.
- Faiblesses : (1) le judge-drift −17 n'est pas une isolation pure-formule (signature/hook confondus) → re-run packet-original requis avant toute attribution ; (2) la valeur du floor reste non tranchée (Architecte) ; (3) le re-tuning pic CV sur littérature demande un corpus d'entraînement rythme distinct — à spécifier.
- Risques restants : si D1 = abaissement floor sans re-tuning des leviers, on traite le symptôme (floor) sans la cause (circularité K2). Recommandation : leviers AVANT floor.
- Action requise : décisions D1–D4 ; puis exécution gatée via dispatcher Phase R (hors scope doc-only).
