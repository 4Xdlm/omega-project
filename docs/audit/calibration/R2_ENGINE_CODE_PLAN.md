# R2 — PLAN DE CODE MOTEUR (gaté EMP-16 triple-preuve + EMP-10)

**Statut** : PLAN (doc-only). **Aucune ligne écrite.** Chaque étape n'est codée qu'APRÈS triple-preuve 3/3 (EMP-16) et sous wrapper EMP-10 (TSC + vitest verts, flag, shadow). Philosophie : **reclasser, jamais supprimer** ; introduire une **couche de RÔLES** sans toucher aux `compute*`.

## Principe d'implémentation
On n'altère PAS les fonctions de mesure (`computeSensoryRichness`, `scoreSignature`, etc.). On ajoute une **couche de configuration de RÔLES** (GATING / COMPOSITE / ADVISORY / DIAGNOSTIC) lue par l'agrégateur, **dépendante du CONTEXTE** (calibration-littérature vs gating-génération). Tout reste calculé + loggé (provenance DEC-014).

## Fichiers concernés (lecture faite, cartographie `SENSOR_CABLE_MAP.md`)
| Fichier | Rôle actuel | Modif R2 (gatée) |
|---|---|---|
| `packages/sovereign-engine/src/config.ts` (`SOVEREIGN_CONFIG`) | poids macro, seuils, markers | **AJOUT** : `SENSOR_ROLES` (map capteur→rôle par contexte) + flag `OMEGA_SENSOR_ROLES` ('0'\|'shadow'\|'1', défaut '0') |
| **NOUVEAU** `src/oracle/sensor-roles.ts` | — | table de rôles + résolveur `roleOf(sensor, context)` ; pur, testé |
| `src/oracle/macro-axes.ts` (`computeIFI`, `computeRCI`, `computeSII`, `computeMacroSScore`) | assemble sous-axes → axe → composite + min_axis | **min_axis & composite role-aware** : min_axis = min sur axes/sous-axes en rôle GATING pour le contexte ; advisory loggés hors gate. Défaut flag OFF = comportement actuel (zéro régression) |
| `src/oracle/axes/sensory-density.ts` | focalisation HYBRID (déjà LLM bilingue) | INCHANGÉ (déjà sémantique — c'est le remplacement) |
| `src/semantic/semantic-analyzer.ts` (`analyzeEmotionSemantic`) | sémantique émotion | INCHANGÉ ; tension_14d branché dessus, fallback keyword désactivé en prod (R2.2) |
| provenance (DEC-014, à implémenter) | — | persister TOUS les sous-scores + rôle + packet_completeness |

## Ordre (chaque étape : triple-preuve 3/3 → code flag → shadow → promotion)
1. **R2.0 — couche de rôles (infra, sans effet)** : `sensor-roles.ts` + `SENSOR_ROLES` + flag défaut OFF. Tests unitaires `roleOf`. Zéro changement de score (flag OFF). → vitest 2517 verts. *(pas de preuve métrologique requise : infra inerte.)*
2. **R2.1 — IFI immersion sémantique** : preuve 3/3 (sémantique focalisation non-biaisé/non-gameable, cf `wsd-r2-semantic-rescore.ts`) → en mode 'shadow', min_axis_IFI calculé sur focalisation/attention/fatigue ; sensory_richness/corporeal → ADVISORY (toujours loggés). Double-verdict OLD/NEW. → promotion seulement si shadow bench OK (faux-rejets↓ sans faux-accepts↑).
3. **R2.2 — tension_14d sémantique pur** : preuve 3/3 (analyzeEmotionSemantic ≥ keyword, non-gameable) → désactiver fallback keyword en prod. Dépend aussi du contrat ECC réparé (DEC-011).
4. **R2.3 — anti_cliche** : preuve 3/3 (détection cliché par embeddings discrimine, ne sature pas) → anti_cliche ADVISORY + alerte sémantique.
5. **R2.4 — recalibration paliers** : APRÈS R2.1-2.3 + WS-D corpus élargi → percentiles par contexte (DEC-016).

## Garde-fous
- Flag par défaut OFF à chaque étape → production inchangée jusqu'à promotion explicite.
- Aucune suppression de `compute*` ni de capteur.
- Aucune promotion sans : triple-preuve 3/3 + shadow bench (faux-accepts/faux-rejets) + TSC/vitest verts (EMP-10) + DEC dédié.
- genome SEALED intact ; min_axis/composite gardent leur forme, seul le SET d'axes gating change selon rôle+contexte.

## Tests requis (EMP-10)
- Unitaires : `roleOf` par contexte ; min_axis role-aware (OFF == ancien comportement) ; advisory loggé non-gating.
- Non-régression : 2517 vitest sovereign-engine verts ; golden runs ("Le Gardien"/"Le Choix") inchangés flag OFF.
- Métrologie : shadow double-verdict (`wsd-shadow-double-verdict.ts`) montre l'effet attendu avant promotion.

## Risques
- (R-1) Toucher min_axis/composite = cœur du seal → tout sous flag + shadow, jamais direct.
- (R-2) Le « contexte » (calibration vs génération) doit être passé proprement au scorer → définir l'API du contexte d'abord (R2.0).
- (R-3) tension_14d sémantique dépend d'Ollama en prod → coût/latence à mesurer (le keyword était gratuit). Décision Architecte.
