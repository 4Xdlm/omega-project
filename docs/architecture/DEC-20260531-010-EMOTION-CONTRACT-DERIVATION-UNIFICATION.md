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


---
## 13. ADDENDUM T0 (2026-05-31) — CAUSE RAFFINÉE (SUPERSEDE l'hypothèse §3)
Diagnostic read-only exécuté (`scripts/metrology/t0-isolate-cause.ts`, reproduit assembleForgePacket sur Le Gardien scène-0). **Résultat factuel** :
- `scene0.emotion_target = "trust"` (intensité 0.3) — scène-0 est une scène de **trust par DESIGN de l'arc** (ouverture), pas un mislabel.
- `plan.emotion_trajectory` = trust(0) → anticipation(0.167/0.333) → **fear(0.5/0.667/0.833)** → sadness(1.0). Le fear arrive PLUS TARD dans l'arc, pas en scène-0.
- **Le fallback flat-2-waypoint N'EST PAS déclenché** (1 waypoint dans la plage [0, 0.143], pas 0).
- MAIS scène-0 ne capte qu'**UN seul waypoint d'arc** (trust@pos0) → trajectoire intra-scène **PLATE `trust:1.0` sur Q1-Q4** (dominant=trust aux 4 quartiles).

**Cause réelle (corrige §3)** : ce n'est NI un mislabel trust↔fear NI le fallback empty. C'est que **toute scène captant ≤1 waypoint d'arc produit un contrat intra-scène CONSTANT (zéro variation quartile)** — viole DEC-010 §7. Le `{trust:1.0}` de scène-0 a le BON dominant (trust = arc-opening) mais une **flatness illégitime**. L'ECC 68 du bench venait de comparer une prose tonalité-fear (« horror » générique) contre ce contrat trust-plat → mismatch prose↔contrat.

**Implication pour le fix T1 (corrige §7 cible)** :
- NE PAS « forcer fear sur les scènes horreur » (corromprait scène-0 qui est correctement trust).
- LE FIX = quand une scène capte ≤1 waypoint d'arc, **dériver une micro-trajectoire intra-scène variée** (interpolation depuis le waypoint + intensité + voisinage d'arc), au lieu de tenir l'émotion unique constante sur les 4 quartiles. La scène garde son dominant d'arc ; on ajoute la variation Q1→Q4 (seuil D11.4 ≥ 0.15).
- Sous-question résiduelle : la granularité d'arc (7 waypoints / 7 scènes = ~1 par scène) est trop grossière → soit sur-échantillonner l'arc par scène, soit interpoler localement. Décision de design T1.

**Statut** : T0 CONCLUANT. Le §3 (hypothèse fallback/mislabel) est partiellement réfuté ; ce §13 fait foi. T1 (WS-A) procède sur cette cause corrigée. Évidence : `t0-isolate-cause.ts` (output reproductible).


---
## 14. ADDENDUM T1b (2026-05-31) — STOP_ARCHITECT_ARBITRATION : conflit §7 ↔ FORBID-CANON-GARAGE-001
**CONTROL_BEFORE_WRITE avant de coder T1b (unification chemin V2.3-A).** Lecture `deriveEmotionContractFromSegment` (`chunking/deriveEmotionContract.ts:136-208`) :
- Ce chemin dérive DÉJÀ `dominant` / `valence` / `arousal` PAR QUARTILE depuis le texte du segment (`extractFeatures`/`featureIntensity`/`determineDominantEmotion`, provenance `DERIVED`, variés). Le chemin V2.3-A n'est donc PAS plat sur ces signaux.
- **SEUL `target_14d` est `{}`**, et c'est **explicitement** `// GARAGE/DORMANT — non peuplé (FORBID-CANON-GARAGE-001)` + warning `EMOTION14_RUNTIME_DORMANT`. C'est une **décision de gouvernance scellée** (NCR_EMOTION14_CANON_DRIFT, P2 : le 14D keyword fut délibérément débranché — « morte ≠ débranché »).

**CONFLIT** : DEC-010 §7 exige « zéro `target_14d` vide » → impliquerait de PEUPLER target_14d sur V2.3-A → **ressusciterait le 14D garagé = viole FORBID-CANON-GARAGE-001.** La ratification §7 n'avait pas explicité ce conflit (subtil, découvert au CONTROL_BEFORE_WRITE T1b).

**Je NE code PAS T1b** (ne pas ressusciter unilatéralement un canon garagé). Options pour l'Architecte :
- **Option A** — populer target_14d V2.3-A via dérivation segment (analyzeEmotionFromText). → VIOLE FORBID-CANON-GARAGE-001 (résurrection 14D). Déconseillé sans lever explicitement le FORBID.
- **Option B (RECOMMANDÉE)** — garder target_14d garagé `{}` sur V2.3-A (honore le FORBID), et rendre le CONSOMMATEUR `tension_14d` **null-safe** : fallback sur `dominant`/`valence`/`arousal` (déjà DERIVED) quand target_14d est vide → supprime le score dégénéré/NaN (objectif §2) SANS résurrection. Modifie le consommateur (oracle/macro-axes), pas la dérivation.
- **Option C** — lever FORBID-CANON-GARAGE-001 par décision explicite (rouvre NCR_EMOTION14_CANON_DRIFT) — lourd, hors scope DEC-010.

**Verdict** : DEC-010 §7 doit être **amendé** : « zéro contrat émotionnel dégénéré » (au sens : pas de NaN/score dégénéré chez les consommateurs) plutôt que « zéro target_14d vide » littéral — réconcilie avec FORBID-CANON-GARAGE-001. **Décision Architecte requise (A/B/C).** Reco : **B**. T1b GELÉ jusqu'à arbitrage. (T1 assembleForgePacket — chemin à 14D LIVE omega-forge, PAS garagé — reste valide et fait.)


---
## 15. ADDENDUM T2 (2026-05-31) — VERDICT EMPIRIQUE : le 14D contrat EST le levier ECC (ne pas couper)
Bench ECC dédié re-run avec **flag OMEGA_EMOTION_DERIV_V2 réellement ON** (`$env:` ; le run précédent avait `set` PowerShell inopérant → tournait flag-OFF). qwen3:32b, juge temp 0, prose sovereign fixe.

| Contrat | flag-OFF | **flag-ON (T1)** | HAND (réf scène-appropriée) |
|---|---|---|---|
| FORGE sovereign | ECC 68.02 / t14d 9.22 | **ECC 70.65 / t14d 17.57** | ECC 92.42 / t14d 86.49 |
(emoCoh=100, inter=92, impact=78 partout → seul tension_14d bouge.)

**Verdict** :
1. **Le fix T1 fonctionne directionnellement** : la variation du contrat ↑ `tension_14d` 9.22→17.57 (×1.9). Mécanisme validé.
2. **Gain ECC faible (+2.6)** car scène-0 = *trust* (arc-opening) alors que la prose échantillon est *fear/tension* → le contrat ne matche pas le contenu réel. Le HAND (arc fear→sadness aligné sur la prose) atteint **92.42 via t14d=86.49**.
3. **Le 14D contrat (omega-forge) EST le levier de l'ECC** (preuve HAND) — **PAS inutile, NE PAS couper.** Ce qui est mort = le **canon Emotion14 du genome** (keyword, FROZEN, 0 import).

**DÉCISION (Architecte 2026-05-31, data-driven)** :
- **Muséer le canon Emotion14 genome** (keyword mort) — formalisation doc, genome FROZEN non touché.
- **GARDER le 14D contrat omega-forge** (levier ECC prouvé). Le fix T1 (flag) est conservé.
- **§14 RÉSOLU** : `FORBID-CANON-GARAGE-001` vise le **canon genome** uniquement ; le 14D omega-forge (prescribed trajectory) est distinct et vivant → V2.3-A peut le peupler **via omega-forge** (≠ résurrection canon) sans violer le FORBID. Option A clarifiée = légitime.

**NOUVELLE découverte (continuation WS-A)** : le gain partiel révèle un défaut PLUS PROFOND que la flatness — le contrat de scène-0 (*trust*, par l'arc) ne matche pas l'émotion réelle de la prose (*fear*). Le HAND prouve qu'un 14D **aligné sur le contenu** donne 92. → WS-A doit non seulement varier (T1) mais **aligner le 14D sur l'émotion réelle de la scène/prose** (granularité arc 7-waypoints/7-scènes trop grossière, OU désaccord planner↔contenu). Sous-tâche WS-A.2 : dérivation 14D scène-appropriée (au-delà de la variation).

**Statut** : T2 CONCLUANT. 14D contrat = GARDÉ (levier prouvé). Canon genome = à muséer. T1 = partiel validé. WS-A.2 ouvert (alignement émotion). Évidence : `docs/audit/minaxis/ecc_dedicated_bench.json` (run flag-ON).
