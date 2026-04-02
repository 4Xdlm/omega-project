# ═══════════════════════════════════════════════════════════════════════════════
#
#   SESSION_SAVE OFFICIEL — 2026-04-02
#   IRM TOTAL OMEGA + ANALYSES CROISÉES + PLAN CORRIGÉ
#   "La session où OMEGA s'est vu dans le miroir"
#
# ═══════════════════════════════════════════════════════════════════════════════

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  Document    : SESSION_SAVE_2026-04-02_IRM_TOTAL_COMPLET                     ║
║  Date        : 2026-04-02                                                    ║
║  HEAD sortant: 136fa279                                                      ║
║  Branche     : phase-r-metrology-rebuild                                     ║
║  Tests       : 2022 GREEN / 0 FAIL (0 fichier production modifié)            ║
║  Commits     : 8 commits (514a8e3c → 136fa279)                               ║
║  Tags        : omega-irm-total-v1, omega-irm-measures-v1                     ║
║  Standard    : NASA-Grade L4 / DO-178C Level A                               ║
║  Autorité    : Francky (Architecte Suprême)                                  ║
║  Transcript  : 7347 lignes                                                   ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

# PARTIE A — RÉSUMÉ EXÉCUTIF

Session fondatrice de 12+ heures. Première autopsie complète d'OMEGA : IRM
17 livrables (556 KB) + 11 investigations complémentaires (96 KB) + 4 retours
IA croisés + corrections des 3 IAs + plan d'action corrigé + prompt P0 prêt.

## La phrase de la session

> "OMEGA n'a plus un problème de performance locale. OMEGA a un problème
> de souveraineté de la vérité." — ChatGPT (doc 9), validé par 4/4 IAs

## Ce qui a changé aujourd'hui

Avant cette session : OMEGA était un système puissant mais opaque.
Après cette session : chaque vis est comptée, chaque loi est fichée,
chaque contradiction est nommée, et le plan de correction est prêt.


---

# PARTIE B — CHRONOLOGIE COMPLÈTE

## Phase 1 : Conception du plan (T0-T4)

T0 : Francky demande "le plan d'analyse le plus complet jamais écrit pour OMEGA".
  → Recherche dans le projet : 2 mega-prompts existants trouvés
    (OMEGA_CLAUDE_CODE_PROMPT_SCAN_TOTAL 446 lignes, SCAN_EXHAUSTIF 335 lignes)
  → Production IRM 26 parties (atlas directeur)

T1 : Réception 6 retours IA (ChatGPT × 3 + Gemini × 2 + Claude auto-audit)
  → Fusion en Plan de Dissection SpaceX vFINAL (10 couches × 6 phases × 16 livrables)

T2 : Errata vFINAL.1 : 3 micro-ajustements + 7 ajouts Opus 4.6
  → Staleness heatmap, token budget, cost model, regression risk,
    scorer cross-validation, PVI position, governance registry

T3 : Production prompt Claude Code vFINAL.2 (425 lignes, 6 phases)

T4 : Auto-vérification pré-vol : 11 erreurs trouvées et corrigées (E1-E11)
  → HEAD/tests dynamiques, 4 docs manquants, 45 packages (pas 44),
    74 JSON (pas 67), PVI localisé, 94 Rosetta (pas 30+), shell fix

## Phase 2 : Exécution IRM (T5-T7)

T5 : Push 4 docs gouvernance manquants dans le repo (514a8e3c)
  → CONTRAT_TRAVAIL, CONTRAT_SCRIBE, ROADMAP_v8, RAPPORT_SCAN

T6 : Commit prompt vFINAL.2 (e1b92dd3)

T7 : Exécution IRM par Claude Code (autonome, nuit)
  → 17/17 livrables dans docs/irm/ (556 KB)
  → Commit 3fd22df7, tag omega-irm-total-v1
  → Tests : 2022 GREEN, 0 fichiers production modifiés

## Phase 3 : Analyse des résultats (T8-T10)

T8 : Lecture complète des 17 livrables par Claude Opus 4.6
  → Score : 8.3/10
  → Pipeline Atlas : ~30-35 LLM calls (pas 8)
  → 3 SSOT violations, 14 seuils UNKNOWN, 9 contradictions
  → 5 DEAD, 2 ZOMBIE, 11 PHANTOMS

T9 : Consultation 4 IAs sur les résultats
  → ChatGPT doc 11 : FAIL structurel. "Tu sais mesurer, pas produire."
  → ChatGPT doc 12 : FAIL provisoire. "3 systèmes superposés non alignés."
  → ChatGPT doc 13 : "Analyse trop sage. Pipeline compense par complexité."
  → Gemini doc 14 : Failles math. Weight-calibrator divergence. f26b inversion.

T10 : Production POST-IRM plan convergent P0-P3 (54caa6ff)

## Phase 4 : Mesures complémentaires (T11-T13)

T11 : Prompt mesures complémentaires (493 lignes, 11 INV) → 4ac814e9

T12 : Exécution par Claude Code (autonome)
  → 11/11 livrables dans docs/irm/inv/ (96 KB)
  → Findings explosifs :
    INV-01 : f26b "CONFIRMED_NEGATIVE" (3 positifs, 7 négatifs, 29 complexes)
    INV-08 : 69/73 JSON ORPHANS (94.5%)
    INV-06 : 2 deps fantômes + 17 packages orphelins + hub canon-kernel fan-in=14
    INV-04 : Gateway 32 fichiers, 821 tests, SEALED, 0 lien SE

T13 : Analyse des 11 INV par Claude Opus 4.6

## Phase 5 : Débat IA + Corrections (T14-T18)

T14 : Réception 4 nouveaux retours IA sur les INV
  → ChatGPT doc 6 : "Ton repo est pollué. PVI = cœur caché. Core fragile."
  → ChatGPT doc 7 : "PASS vision, FAIL structurel partiel. 3 bombes."
  → Gemini doc 8 : "Fracture GB V1. Choc weight divergence. Nécropole JSON."
  → ChatGPT doc 9 : "PASS fort sur l'analyse. Souveraineté de la vérité."

T15 : Francky freine — "je veux être sûr de la vérité avant d'effacer quoi que ce soit"

T16 : Claude relit TOUT ligne par ligne. Découvertes CRITIQUES :
  → 21 JSON "orphelins" sont en réalité des données CALIBRATION R4
  → f26b "CONFIRMED_NEGATIVE" est un verdict TROMPEUR (74% COMPLEX, PDP requis)
  → 17 packages "orphelins" : 5 SEALED/prévus, pas tous morts
  → compat/version-guard.ts est RE-EXPORTÉ et TESTÉ (pas mort)

T17 : Production PLAN_CORRIGE_VERITE_VERIFIEE.md (c41edc2e)

T18 : Production prompt P0 assainissement avec double contrôle (136fa279)


---

# PARTIE C — COMMITS DE SESSION

| # | Hash | Message | Contenu |
|---|------|---------|---------|
| 1 | 514a8e3c | docs: push 4 gouvernance | Contrats, Roadmap v8, Rapport Scan |
| 2 | e1b92dd3 | docs: prompt IRM total vFINAL2 | 425 lignes, mode autonomie |
| 3 | 3fd22df7 | docs(irm): OMEGA IRM TOTAL v1 | 17 livrables, 556 KB, tag omega-irm-total-v1 |
| 4 | 54caa6ff | docs(irm): POST-IRM plan convergent | Plan P0-P3, 10 INV identifiées |
| 5 | 4ac814e9 | docs: prompt mesures complémentaires | 11 investigations, 493 lignes |
| 6 | 39f2302e | docs(irm): 11 mesures complémentaires | 11 livrables INV, 96 KB |
| 7 | c41edc2e | docs(irm): PLAN CORRIGÉ vérité vérifiée | Corrections 3 IAs |
| 8 | 136fa279 | docs: prompt P0 assainissement | Double contrôle, 29 KB |

---

# PARTIE D — LE GRAND DÉBAT IA (4 rounds)

## Round 1 : Les IAs analysent l'IRM (17 livrables)

### ChatGPT doc 11 — Le verdict brutal
FAIL structurel. "Tu sais mesurer. Tu ne sais pas encore produire de façon
contrôlée." Propose 2 innovations : COUPLING ENGINE et INVERSE ENGINE.
Identifie 5 anomalies critiques (fragmentation cerveau, couplage explosif,
non-alignement doc/code, pipeline vs réalité LLM, physique non couplée).
Force : le diagnostic racine est juste. Le pipeline COMPENSE par itération.

### ChatGPT doc 12 — L'analyse longue
FAIL provisoire. "Le vrai problème est entre les 3 systèmes."
Identifie S1 (mesure) + S2 (génération) + S3 (gouvernance) comme 3 blocs
forts mais mal connectés. Points forts reconnus : séparation OMEGA/SCRIBE,
instrumentation features, pensée des invariants. Faiblesses : trop couplé,
plusieurs vérités concurrentes, moitié du génie théorique non injecté.
"OMEGA est en avance sur sa propre industrialisation."

### ChatGPT doc 13 — La critique de mon analyse
"Bon retour mais trop sage. Il analyse mais ne voit pas le système."
Critique : je sous-estime le problème central (compensation multi-call),
je traite les SSOT comme un bug (pas un symptôme), et je ne formule pas
le vrai verrou ("le système sait mesurer mieux qu'il ne sait produire").
Force : cette critique est en partie juste — mon 1er retour était trop
"audit DO-178C" et pas assez "vision système".

### Gemini doc 14 — Les failles mathématiques
Failles physiques/math : inversion f26b dans GB V1, effondrement L38,
absence coefficient interaction L34, magic numbers non calibrés.
Incohérences logiques : collision poids macro-axes (FINDING NOUVEAU),
divergence seuils, contradiction BB-02. Architecture : gaspillage tokens,
organes zombies, modules fantômes, dualité comptage tokens.
Force : seul à avoir trouvé la divergence weight-calibrator.

---

## Round 2 : Les IAs analysent les 11 INV

### ChatGPT doc 6 — "Ton repo est pollué"
3 bombes : 94% JSON orphelins, PVI = cœur caché (I = 88% delta),
engine.ts = single point of failure score 160.
Innovation intéressante : PVI comme axe natif du scoring, pas plugin.
"Tu es à ça de basculer de génération stylée à machine dominante."
Limite : trop agressif sur le nettoyage ("supprimer 70%").

### ChatGPT doc 7 — L'analyse équilibrée
"PASS sur la valeur, FAIL partiel sur la consolidation."
Pose le bon diagnostic : budget réel ($0.21/run), 3 findings les plus
graves (weight divergence, f26b inversée, JSON pollués), et ce qui est
moins grave que prévu (gateway isolé by design, tokens morts négligeables V4,
slopes Phase W concordants 18/18).
"Le projet doit moins inventer et davantage fusionner."

### Gemini doc 8 — Validation chirurgicale
"Le finding le plus grave de toute la chaîne." Valide l'inversion f26b,
quantifie le choc weight divergence, confirme les 3 bombes.
"Le diagnostic est total. Plus aucune zone d'ombre n'existe."
Limite : accepte CONFIRMED_NEGATIVE sans questionner la méthodologie.

### ChatGPT doc 9 — La relecture la plus lucide
"PASS fort. Probablement le meilleur état des lieux produit sur OMEGA."
Corrige : "17 packages orphelins" → "17 isolés, pas forcément erreurs".
Rehiérarchise : weight divergence > f26b > JSON pollution.
Nomme le vrai problème : "souveraineté de la vérité".
"OMEGA fonctionne avec plusieurs réalités concurrentes non arbitrées."


---

## Round 3 : Claude corrige les IAs (après lecture ligne par ligne)

### ChatGPT doc 10 — Valide les corrections de Claude
"Ce plan corrigé est globalement meilleur que l'analyse précédente."
"Tu passes d'un système nerveux (réaction) à un système scientifique
(validation)." Accepte les 3 corrections mais ajoute 3 nuances :
1. La divergence de vérité est une faille systémique, pas un fix
2. GB V1 devrait être en "désactivation décisionnelle" même avant PDP
3. Le vrai problème est encore sous-formulé
Verdict : "PASS fort. Tu viens de passer d'un système intelligent à
un système scientifique."

---

# PARTIE E — LES 4 CORRECTIONS AUX RECOMMANDATIONS IA

## CORRECTION 1 — 69 JSON "orphelins" : 21 sont CALIBRATION R4

L'INV-08 a cherché les imports .ts actuels. Résultat : 4 actifs, 69 orphelins.
MAIS : Phase R4 (scorer reconstruction) est le PROCHAIN sprint.
J'ai lu chaque fichier "orphelin" un par un :

| Catégorie | Nombre | Exemples | Action |
|-----------|--------|----------|--------|
| RUNTIME | 4 | GB_V1_MODEL, COEFFICIENTS, R8_TIPPING, R8_TYPO | NE PAS TOUCHER |
| CALIBRATION R4 | ~21 | COMPOSITION_PROFILES, TYPE_FEATURE_IMPORTANCE, GOLD_SET_PASSAGES, CLASSIFIER_CALIBRATION_V2 | GARDER (calibration/) |
| RESEARCH | ~16 | CAUSAL_AUDIT, R_MEASURE_TOTAL, MIRROR_TEST | GARDER (calibration/) |
| BENCH HISTORIQUE | ~32 | P1_REDESIGN, PHASE4B_PULVERIZE, VATOMIC | ARCHIVER (archive/) |

CLASSIFIER_CALIBRATION_V2.json (152 KB) contient les distributions de 571 romans.
GOLD_SET_PASSAGES.json contient 64 passages de référence pour validation R5.
TYPE_FEATURE_IMPORTANCE.json contient les corrélations feature × type.
Supprimer ces fichiers = obliger R4 à les recréer.

## CORRECTION 2 — f26b "CONFIRMED_NEGATIVE" : verdict TROMPEUR

Le script INV-01 a comparé les valeurs des feuilles directes :
  3 POSITIVE + 7 NEGATIVE + 29 COMPLEX (74% indéterminés)

PROBLÈME MÉTHODOLOGIQUE FONDAMENTAL :
En gradient boosting, chaque arbre fit les RÉSIDUS des arbres précédents.
Un split "négatif" dans l'arbre 5 peut corriger un excès des arbres 0-4.
On NE PEUT PAS sommer les directions individuelles.
Seul le Partial Dependence Plot (PDP) donne la direction agrégée.

Les 4 IAs ont accepté "CONFIRMED_NEGATIVE" sans questionner la méthode.
Claude l'avait aussi accepté avant de relire le code du script.
Le verdict correct est : INCONCLUSIVE — PDP requis avant décision.

## CORRECTION 3 — 17 packages "orphelins" : 5 SEALED/prévus

genome (Phase 28 SEALED), sentinel-judge (Phase 27 SEALED),
mycelium + mycelium-bio (Loom D4 verrouillé), hardening (sécurité).
Archiver ces packages = détruire du travail scellé intentionnellement.
11 packages restent à évaluer, mais aucun n'est certain mort.

## CORRECTION 4 — compat/version-guard.ts n'est PAS mort

L'IRM et toutes les IAs disaient "compat/ = 0 imports, code mort".
Vérification repo live : version-guard.ts EST re-exporté depuis index.ts
(`export { assertVersion2 } from './compat/version-guard.js'`) et A des
tests actifs. Le supprimer casserait l'API publique du package.


---

# PARTIE F — FINDINGS CONFIRMÉS (vérité vérifiée)

## F1 — Divergence poids weight-calibrator.ts vs config.ts [CONFIRMÉ — CRITIQUE]
Production (config.ts) : ECC=0.33, RCI=0.17, SII=0.15, IFI=0.10, AAI=0.25
Calibration (weight-calibrator.ts) : ECC=0.30, RCI=0.17, SII=0.18, IFI=0.15, AAI=0.20
4 axes sur 5 divergent. Chaque recalibration passée a optimisé sur une fausse base.
Source : Gemini (doc 14) → vérifié repo live par Claude.
Lignes exactes : weight-calibrator.ts:68-74 vs config.ts:416-422.

## F2 — SSOT seuils dupliqués [CONFIRMÉ — HAUTE]
SAGA_READY 92.0 hardcodé dans engine.ts:198 et :549 (doit importer core/thresholds.ts)
SEAL_FLOOR 85.0 hardcodé dans duel-engine.ts:137 (idem)
Source : IRM L08 + L13 + L14.

## F3 — ~30-35 appels LLM par run (pas 8) [CONFIRMÉ — DOCUMENTÉ]
Chunked Gen (4) + Duel (10) + Sovereign Loop (4) + V3 judges (10) +
MicroSurgery (2) + Symbol Map (1) + Targeted Patch (2) = ~34 appels
Coût : ~$0.21/run, ~$21-100/roman 300K mots.
Source : IRM L11 Pipeline Atlas → vérifié par INV-03.

## F4 — f26b direction dans GB V1 [INCONCLUSIVE — PDP requis]
INV-01 : 3 positifs, 7 négatifs, 29 complexes (74% indéterminés).
Méthodologie du script insuffisante pour gradient boosting.
PDP (script Python 15 min) inclus dans le prompt P0-12.
NE PAS quarantiner GB V1 avant résultat du PDP.

## F5 — 69/73 JSON sans import .ts [CONFIRMÉ — mais 21 sont CALIBRATION]
4 RUNTIME + ~21 CALIBRATION R4 + ~16 RESEARCH + ~32 BENCH ARCHIVE.
NE PAS archiver les 21 fichiers de calibration.
Source : INV-08 → corrigé par lecture ligne par ligne des fichiers.

## F6 — 2 dépendances fantômes [CONFIRMÉ — MINEUR]
@omega/phonetic-stack (dans SE) + @omega/canon-engine (dans truth-gate).
Packages inexistants. Pollution package.json.

## F7 — compat/version-guard.ts VIVANT [CORRECTION — pas mort]
Exporté depuis index.ts, testé activement. NE PAS supprimer.
brief-compat-guard.ts : statut incertain, à évaluer.

## F8 — Gateway SEALED autonome [CONFIRMÉ — BY DESIGN]
34 fichiers + 16 tests, SEALED Phase 8-10, 0 import depuis SE.
Fondation World Model Phase V. Pas un bug.

## F9 — 9 contradictions doc/code [CONFIRMÉ — L14]
AAI 8%→25%, SAGA_READY dupliqué, s-score deprecated+importé,
avg_sent < 35 accepté malgré BB-02, polish NO-OP+maintenu,
hybride rejeté+code présent, PVI scellé+absent pipeline,
L35 collision, f26b direction incertaine GB/Ridge.

## F10 — 11 phantoms identifiés [CONFIRMÉ — L15]
Phase W Fractal Assembly, Phase X Showrunner, Validations E1/E2/E3,
UI Auteur, 5 features (semantic_density, register_divergence,
phonetic_collision, subtext_gap, necessity_index), Scorer V5.

## F11 — engine.ts risk score = 160 (CRITIQUE) [CONFIRMÉ — INV-10]
Fan-out=38, criticité C4. 60% plus risqué que le 2ème (types.ts=100).

## F12 — Token gaspillage V4 = 0.07% [CONFIRMÉ — NÉGLIGEABLE]
Le V4 a déjà nettoyé les tokens morts. Le problème n'est plus le prompt
mais le nombre d'appels compensatoires (ratio 1:5).


---

# PARTIE G — DIAGNOSTIC CONVERGENT FINAL

## Convergence 4/4 IAs + Claude corrigé

Toutes les IAs disent la même chose avec des mots différents :

> OMEGA mesure MIEUX qu'il ne produit.
> Le pipeline compense par ITÉRATION ce qu'il ne maîtrise pas en INJECTION.
> Le COUPLAGE S1 (mesure) → S2 (génération) est le verrou central.
> Le système fonctionne avec plusieurs réalités concurrentes non arbitrées.

## Les 3 systèmes d'OMEGA

S1 — MESURE (Phase R, corpus 881 œuvres, 94 features, 38 lois) = TRÈS SOLIDE
S2 — GÉNÉRATION (Sovereign, ~34 appels LLM, pipeline 16 étapes) = PUISSANT MAIS AVEUGLE
S3 — GOUVERNANCE (contrats, SEAL, proofpack, authority model) = MATURE

Le problème est ENTRE ces 3 systèmes, pas DANS chacun.

## Le ratio quantifié

~5 appels PRODUCTIFS (draft + symbol map) vs ~25 COMPENSATOIRES
(loop, duel, judge, patch, micro-surgery).
Ratio productif/compensatoire = 1:5.
Cible du plan : 1:5 → 1:2.

---

# PARTIE H — PLAN D'ACTION CORRIGÉ (version finale)

## P0 — Assainissement immédiat (60 min, certitude 100%)

12 actions + PDP f26b. Prompt prêt : OMEGA_CLAUDE_CODE_PROMPT_P0_ASSAINISSEMENT.md

| # | Action | Fichier | Statut |
|---|--------|---------|--------|
| P0-01 | ALIGNER weight-calibrator.ts | calibration/weight-calibrator.ts:68-74 | PRÊT |
| P0-02 | Unifier SAGA_READY | engine.ts:198,549 → core/thresholds.ts | PRÊT |
| P0-03 | Unifier SEAL_FLOOR | duel-engine.ts:137 → core/thresholds.ts | PRÊT |
| P0-04 | compat/ : GARDER version-guard, évaluer brief | compat/*.ts | CONDITIONNEL |
| P0-05 | Commenter polish imports NO-OP | engine.ts:43-45 | PRÊT |
| P0-06 | Valider avg_sent ≥ 35 (WARNING) | pre-write-validator.ts | PRÊT |
| P0-07 | ADR CLIFF_THRESHOLD 0.30 | docs/adr/ | PRÊT |
| P0-08 | ADR floorPenalty 1.5 | docs/adr/ | PRÊT |
| P0-09 | Créer L35b | docs/ | PRÊT |
| P0-10 | Archiver hybrid-provider | runtime/ | CONDITIONNEL |
| P0-11 | Supprimer 2 deps fantômes | package.json | PRÊT |
| P0-12 | PDP f26b (script Python) | docs/irm/inv/PDP_F26B_RESULT.json | PRÊT |

## P0-BIS — Réorganisation JSON 3 couches (30 min)

```
scoring/data/
  ├── (4 RUNTIME — ne pas toucher)
  ├── calibration/  (21 fichiers — R4 en a besoin)
  └── archive/      (32 fichiers — bench terminés)
```

## P1 — Nettoyage structural (12h)

Migrer computeMacroSScore, archiver zombie/legacy, scanner gateway/,
évaluer 11 packages isolés, produire COST_MODEL + RISK_MATRIX.

## P2 — Alignement S1→S2 (6 semaines)

1. Phase R4 scorer V3 reconstruction (coefficients R3, type modifiers, 6 profils)
2. Rosetta Bridge (nouveau module coupling/ — traduction S1→S2)
3. Réduction appels LLM 30→15 (conséquence du meilleur couplage)

## P3 — Mutation architecturale (3+ mois)

1. Inverse Engine (score cible → contraintes → prompt → texte)
2. Scorer V5 couche sémantique (L38, R²=-0.187 EN maximaliste)
3. Découplage types.ts (fan-in=111 → ~30 par domaine)
4. ChromaDB Loom (D4 verrouillé)
5. PVI comme axe natif du scoring (proposition ChatGPT doc 6)


---

# PARTIE I — MÉTRIQUES CRITIQUES

| Métrique | Valeur |
|----------|--------|
| Repo : fichiers .ts | 3153 |
| Repo : packages | 45 |
| SE src : fichiers | 194 dans 42 dirs |
| SE : tests | 2022 GREEN |
| SE : exports | 1578 (SE = 67%) |
| Scoring JSON | 73 (4 runtime, 21 calibration, 32 archive) |
| LLM calls/run | ~34 |
| Tokens/run | ~36 150 (27 700 in + 8 450 out) |
| Coût/run | ~$0.21 |
| Coût/roman (best-of-3) | ~$63-100 |
| Ratio productif/compensatoire | 1:5 |
| Lois documentées | 38 |
| Features | 94 (58 DRIVER, 28 NEVER_ACTIVE) |
| Seuils | 52 (11 magic numbers, 14 UNKNOWN) |
| Contradictions doc/code | 9 |
| Phantoms | 11 |
| SSOT violations | 7 (dont weight-calibrator = #1) |
| Code mort confirmé | ~800 lignes (polish NO-OP + compat/brief) |
| Gateway | 34 fichiers + 16 tests (SEALED, 0 lien SE) |
| Hub package | canon-kernel fan-in=14 |
| Risk #1 | engine.ts score=160 (CRITICAL) |
| Staleness | 89 HOT, 133 WARM, 0 COLD |

---

# PARTIE J — FICHIERS CLÉS DE SESSION

## Prompts produits
| Fichier | Lignes | Rôle |
|---------|--------|------|
| docs/OMEGA_CLAUDE_CODE_PROMPT_IRM_TOTAL_vFINAL2.md | 425 | IRM 17 livrables |
| docs/OMEGA_CLAUDE_CODE_PROMPT_MESURES_COMPLEMENTAIRES.md | 493 | 11 INV |
| docs/OMEGA_CLAUDE_CODE_PROMPT_P0_ASSAINISSEMENT.md | ~500 | P0 corrections |

## IRM Livrables (docs/irm/)
01-17 : 556 KB total. Voir PARTIE B pour le détail.

## INV Livrables (docs/irm/inv/)
INV01-10 + INVB : 96 KB total.

## Plans et analyses
| Fichier | Rôle |
|---------|------|
| docs/irm/POST_IRM_PLAN_CONVERGENT.md | Plan P0-P3 (avant corrections) |
| docs/irm/PLAN_CORRIGE_VERITE_VERIFIEE.md | Plan corrigé (vérité finale) |
| docs/SESSION_SAVE_2026-04-02_IRM_TOTAL.md | 1ère version SESSION_SAVE |
| docs/SESSION_SAVE_2026-04-02_IRM_TOTAL_COMPLET.md | Ce document |

## Chemins repo critiques
| Chemin | Rôle |
|--------|------|
| packages/sovereign-engine/src/engine.ts | Orchestrateur principal (risk=160) |
| packages/sovereign-engine/src/core/thresholds.ts | SSOT seuils |
| packages/sovereign-engine/src/oracle/macro-axes.ts | Poids PROD (ECC 0.33) |
| packages/sovereign-engine/src/calibration/weight-calibrator.ts | Poids CALIB (DIVERGENT) |
| packages/sovereign-engine/src/scoring/data/ | 73 JSON (4+21+32+16) |
| packages/sovereign-engine/src/scoring/data/GB_V1_MODEL.json | Modèle opaque 262 KB |
| scripts/pvi/pvi_module_autonome.py | PVI scellé (Python standalone) |
| gateway/src/memory/memory_layer_nasa/ | World Model futur (SEALED) |


---

# PARTIE K — LEÇONS APPRISES (nouvelles cette session)

## K1 — Les scripts d'analyse statique confondent "non importé" et "mort"
Un grep cherchant les imports .ts ne voit PAS les fichiers de données de
calibration qui seront lues par du code FUTUR. L'INV-08 a trouvé 69 orphelins
mais 21 sont essentiels pour Phase R4. Leçon : toujours croiser avec la
roadmap avant de marquer "orphan".

## K2 — On ne peut pas compter les splits d'un gradient boosting pour en déduire la direction
En gradient boosting, chaque arbre fit les résidus. La direction d'une feature
est le résultat AGRÉGÉ des 50 arbres, pas la somme des splits individuels.
Seul le PDP donne la vérité. 4 IAs ont accepté un verdict méthodologiquement
faux. Leçon : questionner la méthode, pas juste le résultat.

## K3 — "Orphelin" dans un monorepo ≠ "mort"
genome et sentinel-judge sont isolés par DESIGN (SEALED). mycelium est prévu
pour Loom. Leçon : vérifier le statut intentionnel avant de conclure.

## K4 — Le re-export depuis index.ts rend un fichier VIVANT
compat/version-guard.ts semblait mort (0 imports directs dans src/).
Mais il est re-exporté depuis index.ts = fait partie de l'API publique.
Leçon : vérifier index.ts et les exports du package, pas juste les imports.

## K5 — La divergence de calibration est plus grave que les duplications de code
Un seuil dupliqué = risque de divergence future.
Des poids de calibration divergents = biais actif sur TOUTES les optimisations
passées. La dette silencieuse est pire que la dette visible.

## K6 — ChatGPT et Gemini voient des choses différentes
ChatGPT excelle en vision système (diagnostic racine, architecture cible).
Gemini excelle en failles mathématiques (coefficients, inversions, magic numbers).
Claude excelle en vérification granulaire (ligne par ligne, fichier par fichier).
Les 3 ensemble couvrent tous les angles. Aucun seul ne suffit.

## K7 — Francky avait raison de freiner
"Je veux être sûr de la vérité avant d'effacer quoi que ce soit."
Sans ce frein, on aurait archivé 21 fichiers de calibration R4,
quarantiné GB V1 sur un verdict méthodologiquement faux,
et supprimé version-guard.ts qui fait partie de l'API publique.
La prudence de l'Architecte a évité 3 erreurs que 4 IAs n'ont pas vues.

---

# PARTIE L — PROCHAINE SESSION

## Option recommandée

1. Lancer le prompt P0 dans Claude Code (docs/OMEGA_CLAUDE_CODE_PROMPT_P0_ASSAINISSEMENT.md)
2. Lire les résultats — en particulier PDP_F26B_RESULT.json
3. Si PDP positif → GB V1 réhabilité → les IAs avaient TORT
4. Si PDP négatif → GB V1 en quarantaine décisionnelle → les IAs avaient raison
5. Vérifier les 15 contrôles de la checklist
6. Si tout GREEN → commit + tag omega-p0-assainissement-v1
7. Attaquer P1 (migrer s-score.ts, scanner gateway/, évaluer packages)

## Message de redémarrage

```
Version: HEAD post-P0 (tag omega-p0-assainissement-v1)
Dernier état: SESSION_SAVE_2026-04-02_IRM_TOTAL_COMPLET.md
Objectif: P1 nettoyage structural + début Phase R4

Rappel:
  - P0 a corrigé les SSOT violations
  - PDP_F26B_RESULT.json détermine le statut de GB V1
  - scoring/data/ réorganisé en 3 couches
  - Le verrou central = couplage S1→S2
  - Prochaine cible = Phase R4 scorer V3 reconstruction
```


---

# PARTIE M — ÉTAT DU PROJET

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  Branche      : phase-r-metrology-rebuild                                    ║
║  HEAD         : 136fa279                                                     ║
║  Tests        : 2022 GREEN / 0 FAIL                                         ║
║  Corpus       : 881 oeuvres (238 FR + 643 EN)                               ║
║  Blocs Scribe : 0-7 complets                                                ║
║  Module PVI   : SCELLÉ (2026-04-01)                                          ║
║  Architecture : Claude-pur confirmé (BLOC7)                                  ║
║  IRM          : 17 livrables + 11 INV + plan corrigé + prompt P0            ║
║                                                                              ║
║  DIAGNOSTIC CENTRAL (convergence 4/4 IAs + Claude corrigé) :                ║
║                                                                              ║
║  1. OMEGA mesure mieux qu'il ne produit.                                     ║
║  2. Le pipeline compense par itération (ratio 1:5).                          ║
║  3. Le couplage S1→S2 est le verrou central.                                 ║
║  4. La souveraineté de la vérité n'est pas encore arbitrée.                  ║
║  5. Les fondations mathématiques ont des fissures (poids, seuils).           ║
║                                                                              ║
║  CORRECTIONS APPORTÉES AUX RECOMMANDATIONS IA :                              ║
║                                                                              ║
║  1. 21 JSON calibration R4 protégés (pas archivés)                           ║
║  2. f26b verdict changé de CONFIRMED_NEGATIVE à INCONCLUSIVE                 ║
║  3. compat/version-guard.ts protégé (pas supprimé)                           ║
║  4. 5 packages SEALED protégés (pas marqués orphelins)                       ║
║                                                                              ║
║  PROCHAIN : P0 (60 min) → PDP f26b → P1 (12h) → Phase R4 (6 sem)          ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

*SESSION_SAVE COMPLET produit le 2026-04-02*
*Session marathon : 12+ heures, 7347 lignes de transcript*
*8 commits, 17 livrables IRM, 11 livrables INV, 4 corrections IA*
*Standard : NASA-Grade L4 / DO-178C Level A*
*Convergence : 4/4 IAs (Claude Opus 4.6 + ChatGPT × 2 + Gemini)*
*Autorité : Francky (Architecte Suprême)*

*"Ce qui n'est pas prouvé n'existe pas."*
*"Ce qui n'est pas mesuré n'est pas acceptable."*
*"Mieux vaut ne rien toucher que casser quelque chose."*
