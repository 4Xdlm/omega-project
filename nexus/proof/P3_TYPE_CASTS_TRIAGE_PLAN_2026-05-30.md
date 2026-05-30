# P3 — Dette de casts de type : triage + plan phasé (PASS_PARTIAL)

**Date** : 2026-05-30 · **Statut** : EN COURS (proof livré, bulk planifié) · **Réf** : audit total 2026-05-29 (F1/F2), EMP-14
**Décision** : campagne de refactor typé prudente, package par package — PAS un blitz (EMP-14 : qualité > vitesse, pas de refactor production à l'aveugle).

## Vérité honnête (re-mesuré post-P2)
L'audit annonçait « 86 as any + 126 as unknown as ». Décomposition réelle (prod, hors tests) :
- **85 casts en `src/` = vraie dette de production** (à corriger).
- **41 casts en `scripts/` = frontières LÉGITIMES** (bench/diagnostic : `(await res.json() as any).choices[0]` réponse API JSON, accès dynamique par clé, narrowing `'x' in (val as any)`). → **KEEP + documenter**, ce n'est pas de la dette.
- (Les 153 `as any` en `.test.ts` = doublures de test, hors scope production.)

## Distribution de la dette src (85)
| Package | casts src | Risque |
|---|---|---|
| sovereign-engine | 45 | ÉLEVÉ (cœur production, 46% du code) |
| scribe-engine | 19 | Moyen |
| omega-metrics | 7 | Faible |
| omega-runner | 5 | Faible |
| creation-pipeline, emotion-gate, gold-cli, omega-aggregate-dna, omega-release, search, sentinel-judge, signal-registry | 1 chacun | Faible |

## Proof livré (méthode validée)
**truth-gate : 5 → 0** (commit `6a872277`). Pattern « bypass readonly » → construction immuable par spread conditionnel. TSC 0, 217 tests PASS, zéro changement de contrat. C'est le patron pour les casts de type « mutation post-création ».

## Patterns identifiés (≠ traitements)
1. **Bypass readonly / mutation post-création** (truth-gate) → fix = construction immuable. **SÛR.**
2. **Accès dynamique à champ non déclaré** (`(intent as any).constraints`, `(scene.subtext as any)?.character_thinks` — scribe-engine) → exige d'aligner le TYPE réel (le champ existe-t-il vraiment ? shape divergente ?). **Peut cacher un vrai écart → investigation par cast.**
3. **Cast de valeur vers type étroit** (`analysis.pov_detected as any`) → vérifier enum/union. **Moyen.**
4. **Frontière JSON/dynamique en script** → **LÉGITIME, garder.**

## Plan phasé (par package, wrapper EMP-10, TSC+tests verts à chaque pas)
- **Phase 1 (fait)** : truth-gate (−5). ✅
- **Phase 2 (faible risque)** : omega-metrics (7), omega-runner (5), + 8 singletons → ~20 casts, packages isolés.
- **Phase 3 (moyen)** : scribe-engine (19) → exige d'investiguer les shapes (intent/subtext/analysis), 1 commit par fichier/cluster.
- **Phase 4 (élevé, cœur production)** : sovereign-engine (45) → passe dédiée, idéalement avec mini-ADR si un contrat de type doit changer. Chaque cast classé fix/keep+justifié. **Ne PAS toucher en masse sans TSC+tests+bench non-régression.**
- **Phase 5** : documenter les 41 casts `scripts/` comme `LEGIT_BOUNDARY_CAST` (anti faux-positif futur).

## Verdict P3
- Statut : **PASS_PARTIAL** — méthode prouvée (truth-gate), vérité corrigée (85 dette réelle vs 41 légitimes vs ~150 tests hors-scope), plan phasé établi.
- Faiblesses : (1) le gros (sovereign-engine 45) reste à faire — c'est du refactor de cœur production, délibérément non blitzé ; (2) chaque cast scribe-engine peut cacher un écart de shape à investiguer.
- Action requise : exécuter Phases 2→4 en sous-sprints prudents. Pas d'urgence : zéro de ces casts ne casse la compilation (TSC déjà 0).
