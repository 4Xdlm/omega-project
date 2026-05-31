# NCR-RCI-SENSOR-DEFECT

**Status**: OPEN · **Severity**: HIGH (bloque le seal SAGA_READY/SEAL_ATOMIC via min_axis) · **Date**: 2026-05-31 · **HEAD**: `a4917bba`
**Raised by**: Claude Code · **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode d'instruction**: READ-ONLY (0 patch, 0 recalibration, 0 changement de floor)
**Domaine**: `packages/sovereign-engine/src/oracle/` — axe macro **RCI** (Rhythmic Control Index) + floor 85.

---

## 1. Issue

Le **floor RCI 85** (composante du gate de certification `min_axis ≥ 85`) est **mathématiquement inatteignable** : ni par la sortie du moteur de production, ni par la littérature publiée de référence. RCI est le **min_axis dominant** des seals échoués → c'est le **bottleneck de certification**. Le capteur `computeRCI` présente un historique de re-pondérations (5 sous-axes sur 5 patchés) qui signe une **fragilité de conception** (verdict audit **B défaut métrique + C floor trop sévère + D artefact longueur**).

## 2. Preuves (mesurées cette session)

### 2.1 Reachability — littérature réelle (sonde décisive)
`computeRCI` (100 % CALC, 0 Ollama) recalculé sur **57 passages / 11 maîtres** (Flaubert, Hugo, Proust, Maupassant, Zola, Stendhal, Balzac, Dickens, Brontë, Austen, Melville — `omega-autopsie/gutenberg_cache/`, domaine public) :
- **0 / 57 passages ≥ floor 85** (médiane **68.4**, max **76.6** Melville, min 59.8).
- `RCI_ceiling` (signature=hook=100, drags structurels neutralisés) : **28/57 = 49 %** seulement.
- Réf : `docs/audit/minaxis/MINAXIS_E_LITERARY_RECOMPUTE.md` + `.csv` (HEAD `a4917bba`).

### 2.2 Reachability — sortie moteur
- Distribution RCI moteur (51 runs full-axes) : **médiane 82.4, mean 82.6 ; 73 % (37/51) < floor 85**.
- **RCI est le min_axis 63 %** des runs ; **seul axe sous-floor dans 37 %** des cas.
- La sortie moteur K2 (82.6) score **AU-DESSUS** des maîtres littéraires (68.1) sur l'axe censé mesurer la qualité rythmique → **invalidité de signal**.
- Réf : `docs/audit/minaxis/MINAXIS_FLOOR_AUDIT.md`, `MINAXIS_DISTRIBUTION.csv`.

### 2.3 Défauts de capteur (par sous-axe, `macro-axes.ts:computeRCI`)
| sous-axe | défaut | preuve |
|---|---|---|
| `rhythm` | pic CV recalibré **0.75→0.60 « pour la prose K2 2200w »** = auto-calibration sur le moteur, pas sur la littérature ; poids scalé par `rhythmConfidence(wordCount)` (artefact longueur D) | `rhythm.ts:16,50-54` ; INV-RCI-CONF-01 (macro-axes.ts:417) |
| `euphony_basic` | **biais structurel auto-documenté** : *« not Phase W calibrated… hard consonants score as cacophony… Systemic floor 68-70 on ALL scene types = structural bias, not real literary signal »* ; poids 1.0→**0.5** | `euphony-basic.ts:60-67` |
| `signature` | 40 pts conditionnés à un **hit-rate ≥30 %** de mots-signature de contrat ; prose hors-contrat clouée à 60 | `signature.ts:34-38` |
| `hook_presence` | retourne **75 neutre** si pas de hooks (cas majoritaire) ; poids abaissé à 0.20 *« to avoid dragging RCI »* (aveu) | `macro-axes.ts:393-401` |
| `voice_conformity` | **neutralisé (poids 0)**, score figé 70 ; sous-axe mort-vivant | `macro-axes.ts:408-412` |

### 2.4 Incohérence interne (precedent corpus déjà acté)
Le repo a **déjà abaissé** `SII` floor **85→80** (*« floor of 85 to BRUTAL scenes = physically impossible per corpus »*, INV-SII-FLOOR-01) et `MACRO_AXIS_FLOOR` **85→80** (*« McCarthy, Hemingway »*) sur **corpus-proof** — **mais jamais RCI** (resté 85). Le `ART_AUDIT_REPORT.md:119` documente déjà *« RCI = 76-82 (consistently < 85 floor)… the primary bottleneck »*.
Réf : `packages/sovereign-engine/src/config.ts` MACRO_FLOORS.

## 3. Biais à respecter (cadrage)
La sonde §2.1 est une **mesure de reachability**, PAS un tribunal de beauté : un RCI bas sur Hugo prouve que le couple capteur+floor ne peut pas le certifier, pas que Hugo écrit mal. Le `signature=60` est un **artefact de contrat** (corrigé par `RCI_ceiling`). Corpus FR « littéraire fluide » : l'archétype BRUTAL (McCarthy/Hemingway, sous copyright, absent) — le plus pénalisé par `euphony_basic` — n'est pas testé → défaut probablement **sous-estimé**.

## 4. Options (décision — pending Francky)

- **Option A — STATU QUO** : conserver floor 85. *Conséquence : seal quasi-impossible (0 % littérature, 27 % moteur). Rejetée par les preuves.*
- **Option B (recommandée) — RECALIBRATION SUR CORPUS-PROOF** : recalibrer RCI **uniquement** via un bench multi-corpus (cette sonde 57 passages + Phase W 413 œuvres), **par le dispatcher Phase R** (`baseline_m0b` shadow), **jamais** par patch direct des `compute*`. Leviers identifiés : (a) floor 85→? aligné sur la distribution réelle (médiane lit 68, moteur 82) ; (b) `hook_presence` 75-neutre constant ; (c) `signature` 40 pts contract-dependent ; (d) `euphony_basic` biais structurel ; (e) `rhythm` pic-CV recalibré sur littérature, pas K2.
- **Option C — FLOOR length-aware / archétype-aware** : floor RCI modulé par longueur (artefact D) et archétype (comme SII l'est déjà pour BRUTAL).
- **Option D — DÉ-PONDÉRER RCI dans le composite** : si RCI n'est pas un signal valide, réduire son poids macro (0.17) au lieu de réparer le floor.

## 5. Interdits (jusqu'à décision)
Aucune baisse de floor, aucun patch des sous-axes, aucune recalibration cosmétique **sans corpus-proof formel** (NO_RECALIBRATION_WITHOUT_CORPUS_PROOF). Toute action passe par le dispatcher Phase R + gate `commit-with-tests.ps1`.

## 6. Decision
_Pending Francky approval._

---
*Évidences : `docs/audit/minaxis/` (MINAXIS_FLOOR_AUDIT, MINAXIS_E_LITERARY_RECOMPUTE, MINAXIS_LITERARY_CALIBRATION, MINAXIS_METRIC_RISK_REGISTER, MINAXIS_DISTRIBUTION.csv). Capteur non modifié. READ-ONLY.*
