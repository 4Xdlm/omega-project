# DEC-20260531-010 — EMOTION CONTRACT DERIVATION UNIFICATION (ADR)

**Status** : **RATIFIED** (Architecte Francky, 2026-05-31 ; vérification 100% + timeline intégrée) · **Severity** : HIGH
**Doctrine** : NO CODE BEFORE ADR · PROVE IT · AUDIT BEFORE ACTION · FROZEN MODULES RESPECT · NO RECALIBRATION WITHOUT CORPUS PROOF · DÉTERMINISME.
**Mode** : doc-only. Cet ADR définit le comportement cible + la timeline AVANT tout fix code.
**Vérification** : chaque assertion ci-dessous a été confirmée Windows-side (file:line) le 2026-05-31.

## 1. Problem statement
La dérivation du contrat émotionnel (`target_14d` / `target_omega` par quartile) est cassée de **deux façons distinctes** selon le chemin, produisant des `EmotionContract` invalides que le juge ECC pénalise (à juste titre). Une **règle de dérivation unique** est requise avant tout fix, sans fallback silencieux.

## 2. Preuve — défaut A : chemin V2.3-A segment → `target_14d = {}`
`deriveEmotionContractFromSegment` (`packages/sovereign-engine/src/chunking/deriveEmotionContract.ts:182,299`) émet `target_14d: {}` (vide) — GARAGE/DORMANT (FORBID-CANON-GARAGE-001). `target_omega` jamais peuplé. → contrat **creux** ; l'axe tension_14d lit `{}` → score dégénéré / NaN. [VÉRIFIÉ file:line]

## 3. Preuve — défaut B : chemin assembleForgePacket → `target_14d = {trust:1.0}` (MÉCANISME)
Bench overnight ECC (`docs/audit/minaxis/ECC_DEDICATED_BENCH.md`, commits `1283a9d7`/`10ee2a99`) : `assembleForgePacket("Le Gardien", horror)` émet `target_14d = {trust:1.0}` **constant sur les 4 quartiles**. Prose IDENTIQUE : contrat HAND-built → ECC 92.4 (sov) ; contrat FORGE → ECC 68.0 ; écart porté à 100% par `tension_14d` (9.22 → 86.49) ; `emotion_coherence=100` → **prose cohérente, contrat cassé.**

**Mécanisme causal vérifié** (`forge-packet-assembler.ts:217-266` `buildScenePrescribedTrajectoryLocal`) :
1. Les waypoints viennent de `plan.emotion_trajectory` filtré par `position ∈ [sceneStartPct, sceneEndPct]`. **Si aucun waypoint dans la plage → FALLBACK : 2 waypoints IDENTIQUES** (`scene.emotion_target` à start ET end) → **trajectoire PLATE, zéro variation Q1→Q4.**
2. `buildScenePrescribedTrajectory(..., DEFAULT_CANONICAL_TABLE, ...)` mappe le label émotion → vecteur 14D. Le `{trust:1.0}` résulte de (a) la trajectoire plate (fallback) + (b) la résolution du label vers trust (scene_target ou mapping table).
➡️ **Double cause** : (a) fallback flat-2-waypoint quand le filtre position renvoie vide ; (b) label→14D résolvant trust pour une scène censée être fear. Le Golden « Le Gardien » contient pourtant `arc_emotion: fear` → la dérivation perd/écrase l'émotion réelle.

## 4. Impact ECC
ECC (axe le plus lourd, 33%) s'effondre 92→68 sur tout chemin `assembleForgePacket`. Le capteur ECC est **SAIN** (mesure correctement un contrat dégénéré) → NCR_ECC_CONTRACT_SENSOR = `OPEN_DIAGNOSED / ROOT_CAUSE_UPSTREAM_CONTRACT`. **Ne PAS toucher le capteur ECC.**

## 5. Impact DEC-009 / M4
`assembleForgePacket` est le **chemin cible de la fusion DEC-009**. Le pipeline fusionné hériterait d'un ECC structurellement bas → seal inatteignable, M4 biaisé. **Ce défaut bloque la fusion** : DEC-009/M4 gelé jusqu'à résolution (WS-A).

## 6. Non-goals
- PAS de modif/recalibration du capteur ECC. PAS de recalibration RCI (WS-B distinct).
- PAS de modif `genome` SEALED (Emotion14 canon, V-01). PAS de changement DEC-009/fusion ici.
- PAS de fallback silencieux (`{}` ou one-hot constant) — interdit.

## 7. Comportement cible (la règle unique de dérivation) — DÉCIDÉ
- **Une seule fonction de dérivation** `(scene, genre, intent/arc) → trajectoire 14D par quartile`, partagée par les 2 chemins (V2.3-A segment ET assembleForgePacket). Zéro duplication divergente.
- **Zéro `target_14d` vide** : tout contrat émis = vecteur 14D peuplé, normalisé (somme = 1.0).
- **Zéro one-hot constant** : interdit `{trust:1.0}` ou tout one-hot plat sur les quartiles.
- **Fin du fallback flat-2-waypoint** : si `plan.emotion_trajectory` ne couvre pas la scène, dériver une trajectoire VARIÉE depuis `emotion_target` + intensité + arc (pas 2 points identiques).
- **Label→14D scène-approprié** : une scène fear/horreur dérive fear/anticipation/surprise dominants (jamais trust par défaut). Vérifier `DEFAULT_CANONICAL_TABLE` + la résolution `scene.emotion_target`.
- **Variation par quartile** : trajectoire Q1≠Q4 (distance cosine > seuil à définir).
- **`target_omega`** : décidé en §11.

## 8. Tests requis AVANT tout code (gate)
1. Scène horreur (« Le Gardien ») → `target_14d` dominé par fear/anticipation, PAS trust=1.0.
2. Variation inter-quartile mesurable (distance cosine Q1↔Q4 > seuil §11).
3. ECC remonte sur prose appropriée (re-bench ECC : contrat dérivé ≈ contrat hand-built).
4. Zéro NaN / zéro `{}` / zéro one-hot constant sur les 2 chemins.
5. **Anti-divergence** : un test prouve que V2.3-A et assembleForgePacket appellent LA MÊME fonction de dérivation.
6. Non-régression V2.3-A (chemin segment intact ; boundary_hash stable).
7. Déterminisme (même entrée → même contrat, hash stable).
8. Non-régression composite global (les autres axes ECC/SII/IFI/AAI inchangés sur un set témoin).

## 9. Rollback plan
Fix derrière flag `OMEGA_EMOTION_DERIV_V2=false` par défaut. Double-run (ancien vs nouveau contrat) loggé. Régression ECC OU rupture V2.3-A OU NaN → flag off + NCR + revert ciblé. Aucun déploiement prod sans bench non-régression vert + re-bench ECC ≥ hand-built baseline.

## 10. Open questions (raffinées post-vérification)
- Le `scene.emotion_target` de Le Gardien scène-0 est-il littéralement « trust » (Scene mal étiquetée) OU le `DEFAULT_CANONICAL_TABLE` mappe-t-il « fear » vers un vecteur trust-dominant (bug table) ? → à isoler en T-A.1 (le fix diffère selon le cas).
- La dérivation prend-elle le `genre`/label seul, ou l'`intent`/`arc` complet (recommandé : arc, plus riche) ?
- omega-forge (Plutchik) = SSOT de la dérivation, ou couche dédiée au-dessus ?
- Seuil de « variation par quartile » (éviter constante ET chaos).

## 11. DÉCISIONS DE RATIFICATION (open questions tranchées)
- **D11.1 — Primauté 14D** : `target_14d` (14 émotions) = axe CANONIQUE de la dérivation du contrat (c'est ce que ECC/tension_14d consomme et ce qu'omega-forge produit). `target_omega` (XYZ) = vue DÉRIVÉE (calculée via `toOmegaState(state_14d)`), jamais l'inverse. → la dérivation produit le 14D ; omega est secondaire.
- **D11.2 — Source = arc, pas label seul** : la dérivation prend l'`intent`/`arc` complet (trajectoire émotionnelle riche), le `emotion_target` de scène n'étant qu'un fallback — qui doit lui-même produire une trajectoire VARIÉE (fin du flat-2-waypoint).
- **D11.3 — omega-forge = SSOT du mapping label→14D** ; le BUG est dans le builder local sovereign (`buildScenePrescribedTrajectoryLocal` fallback) + la résolution de label, PAS dans la table omega-forge (à confirmer T-A.1). Ne pas dupliquer une table concurrente.
- **D11.4 — Seuil variation quartile** : initial = distance cosine Q1↔Q4 ≥ 0.15 (tunable par bench, pas figé cosmétiquement).

## 12. OMEGA PERFECTION TIMELINE (intégrée à la ratification)
**Principe d'ordre (non négociable)** : **carburant (contrat 14D) → thermomètre (RCI) → re-validation → mesure (M4) → fusion.** On ne juge pas les moteurs avant que le juge soit fiable ; le juge n'est fiable que si le contrat qu'il évalue est valide. Inverser = mesurer avec une règle tordue sur du carburant frelaté (erreur unanime 3-IA). Une seule voie parallèle est BLOQUANTE (dette typage sovereign avant promotion prod).

### Chemin critique (séquentiel)
| Phase | Action | Gate de sortie | Durée | Pourquoi cet ordre |
|---|---|---|---|---|
| **T0 (T-A.1)** | Isoler la cause exacte du `{trust:1.0}` : scene_target littéral « trust » (mislabel Scene) VS `DEFAULT_CANONICAL_TABLE` mappe « fear »→trust (bug table) | cause nommée file:line | **1-2 h** (read-only) | le fix diffère selon la cause ; coder à l'aveugle = NO CODE BEFORE PROOF |
| **T1 (WS-A)** | Fix dérivation 14D unifiée (DEC-010 §7) : fonction unique, fin du fallback plat, label scène-approprié, derrière flag `OMEGA_EMOTION_DERIV_V2` | tests §8 (1-8) verts | **1-2 j** | c'est le CARBURANT ; toute génération + la fusion en dépendent ; débloque ECC |
| **T2** | Re-bench ECC post-fix (chemin assembleForgePacket) | ECC FORGE ≈ HAND (~92) | **2-4 h** Ollama | prouver le carburant réparé AVANT de toucher le juge |
| **T3 (WS-B)** | Recalibration RCI corpus-proof : artefact `signature_words=[]`, biais `euphony×0.5`, floor data-driven, pic CV re-tuné sur LITTÉRATURE (pas K2) ; via dispatcher Phase R + kill-switch ; intègre drift −17 (WS-B0) + 0/57 (MINAXIS_E) | floor littérature sain + non-régression composite + kill-switch | **2-3 sprints** (le plus délicat) | recalibrer le thermomètre une fois le contrat sain ; recalibrer sur un pipeline au contrat cassé = recalibrer sur du bruit |
| **T4** | Re-validation du scorer : re-run WS-B0 (drift) + MINAXIS_E (littérature) + ALTERNANCE seals | juge reproduit des seals sensés + littérature floor sain | **~1 j** | avant M4, prouver juge+contrat sains ENSEMBLE |
| **T5** | M4 bench corpus élargi (gate DEC-009) : sovereign vs scribe, ≥6 briefs × genres, test stat formel, sur juge+contrat validés | preuve de supériorité OUI/NON | **jours GPU** (~2h/run ×N) | le verdict de fusion n'a de sens qu'avec juge+contrat sains (sinon biais K2 + ECC cassé) |
| **T6** | DEC-009 fusion exécution (M1-M5) SI M4 prouve la supériorité : migration par capacité, flags, double-run, produit jamais cassé | pipeline re-routé, bench supérieur, evidence pack, ENGINE_STATUS à jour | **pluri-sprint** | le plus risqué ; conditionné par tout l'amont + P-A |

### Voies parallèles (hygiène — découplées, intercalables)
| Voie | Action | Couplage | Quand | Note |
|---|---|---|---|---|
| **P-A — Dette typage sovereign (P3 casts)** | 201 `as`-casts + 391 `any` + 353 non-null `!` dans sovereign-engine | **BLOQUANTE avant T6** | parallèle T1→T5 | si sovereign devient le cœur prod (fusion), la dette de typage entre en prod (finding F1) → nettoyer AVANT promotion. Seule voie parallèle gatant la fusion. |
| **P-B — Logger unification (DEC-006)** | logger canonique orchestrator-core | faible | slot libre | indépendant ; déterministe par défaut |
| **P-C — Conformité scribe** | maintenir/auditer le chemin prod câblé (creation-pipeline→runScribe) | moyen | continu jusqu'à T6 | scribe reste le moteur prod tant que la fusion n'a pas re-routé ; ne pas le casser |
| **P-D — NCRs ouverts** | RCI (→résolu par T3), ECC (→résolu par T1/T2), autres | — | au fil | clore avec evidence à chaque phase |
| **P-E — ADR architecture Phase C** | frontière scribe/sovereign post-fusion | dépend de T5 | après T5 | ne peut se cadrer qu'une fois la décision DEC-009 prise (M4) |

### Ce qui mène OMEGA à la perfection (résumé exécutable)
1. **T0→T2** : réparer le carburant (contrat 14D) — débloque ECC + la fusion.
2. **T3→T4** : réparer + re-valider le thermomètre (RCI) — fin de la circularité K2, floor honnête.
3. **T5** : mesurer (M4) sur juge+contrat sains — verdict DEC-009 enfin valide.
4. **T6** : fusionner (si M4 prouve) — APRÈS P-A (dette typage sovereign nettoyée).
5. **P-B/C/D/E** : hygiène intercalée, sans jamais casser le produit ni inverser l'ordre.
**Gate transverse** : aucune phase sans gate vert ; déterminisme + frozen + EMP-10/13 partout ; un seul acteur sur le repo ; mount lecture-seule git (commits Windows-side / terminal Architecte).

---
**VERDICT** : **RATIFIED** (Architecte, 2026-05-31). Vérification 100% faite (assertions confirmées file:line ; mécanisme causal du `{trust:1.0}` identifié = fallback flat-2-waypoint + label→14D ; §8 enrichi anti-divergence + non-régression composite ; §10 open questions raffinées ; §11 décisions tranchées ; §12 timeline intégrée). Ouvre **WS-A** (T0→T1) en priorité #1. NCR_ECC_CONTRACT_SENSOR reste OPEN jusqu'au fix + re-bench (T2). Lié à NCR_RCI_SENSOR_DEFECT (WS-B, T3). Prochaine action exécutable : **T0 (isoler la cause scene_target vs table)**, read-only.
