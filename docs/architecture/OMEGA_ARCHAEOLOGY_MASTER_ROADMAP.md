# 🏛️ OMEGA — ROADMAP ARCHÉOLOGIQUE TOTALE (Master Plan, 6 phases)

**Auteur** : Claude Code · **Date** : 2026-05-31 · **HEAD** : `66445855` · **Statut** : PLAN (à exécuter phase par phase sur GO Architecte).
**Origine** : fusion instructions Architecte + visions Gemini (5 phases) + ChatGPT (Phase 0→5) + corrections empiriques Claude (3 incarnations déjà trouvées, contradictions doc↔code, collision de noms).

> **Mission** : reconstruire le **plan architectural véridique d'OMEGA** — chaque module, sous-module, fonction, sous-fonction, branchement, module de traduction/contrôle, version, date, emplacement (respecté ou mal placé) — par fouilles exhaustives **avant** toute fusion/archivage/suppression. *« Pas une maison à 2 salles de bain dont une avec juste un lavabo. »*

## Vérités-cadres (Architecte, non négociables)
1. **Emballement IA = doublons** : les IA ont dupliqué des fonctions ≥2 fois sans nettoyer. → tout doublon est suspect d'hallucination, pas d'intention.
2. **14D au garage** : module émotionnel 14D remisé car **formule mathématique déduite mais empiriquement improuvable** (incompatible DO-178C). NE PAS réanimer. Vérifier confinement.
3. **Vocation de Scribe** : conçu **à part** d'OMEGA comme **compilateur de la fusion des features d'écriture + analyses d'auteurs renommés + ingénierie de production de best-sellers**. Vérifier si cette essence a survécu aux refontes.

## Règles directrices (toutes phases)
- **READ-ONLY** strict (sauf Phase 4 = scripts de bench, gatés). Zéro patch fonctionnel, zéro suppression, zéro fusion, zéro archivage avant Phase 5.
- **Tout est contrôlé** : aucun dossier racine non classé, aucun module non-inspecté, aucune phrase « probablement/sûrement » sans preuve. *On découvre souvent des données qui nous parlent — encore faut-il penser à les regarder.*
- **Chaque affirmation = preuve sourcée** (fichier:ligne / commande+sortie / date git). Balisage `[MESURE]`/`[RECONSTRUCTION]`/`[HYPOTHÈSE]`.
- **Commits = DOC_ONLY via wrapper EMP-10** (sauf scripts bench Phase 4). Sync git avant chaque action (commits Architecte parallèles).
- **Agents parallèles autorisés** (Explore/general-purpose) pour les sweeps read-only ; Claude consolide + commit.

---

## PHASE 0 — Registre d'autorité & priorité des sources (1-2h)
**Pourquoi** : tout le drame de cette session = IA repartant sur une prémisse fausse (doc↔code). On fige la hiérarchie de vérité AVANT de fouiller.
**Scope** : CLAUDE.md (workspace + repo), ENGINE_STATUS.md, Codex v1-1→v1-3-1, docs/DEC*, nexus/proof/NCR*, FROZEN modules, session-saves, blueprints, outputs récents.
**Livrables** : `docs/audit/archaeo/00_AUTHORITY_REGISTER.md` + `00_SOURCE_PRIORITY.md`.
**Classification de chaque source** : CANON_RUNTIME · CANON_DOCTRINE · HISTORICAL_SNAPSHOT · DRAFT · ORPHAN · CONTRADICTED · UNKNOWN. + règle d'arbitrage (qui gagne si 2 docs se contredisent).
**PASS** : aucune source majeure non classée ; toutes contradictions notées ; règle de priorité explicite.

### Prompt Claude Code — Phase 0
```
J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000. READ-ONLY ABSOLU, zéro code/patch/décision.
Mission : établir la hiérarchie de vérité OMEGA.
1. git status --short ; git log --oneline -20 ; git describe --tags.
2. Lire + classer : CLAUDE.md (repo+workspace), ENGINE_STATUS.md, Codex (toutes versions), docs/DEC*, nexus/proof/NCR*, FROZEN/SEALED modules, session-saves récents, blueprints, outputs Tribunal/Scribe/Sovereign/Emotion14.
3. Pour CHAQUE source : statut (CANON_RUNTIME/CANON_DOCTRINE/HISTORICAL_SNAPSHOT/DRAFT/ORPHAN/CONTRADICTED/UNKNOWN), date, et toute contradiction avec une autre source.
4. Définir la RÈGLE D'ARBITRAGE (priorité runtime vs doctrine vs snapshot).
Livrables : docs/audit/archaeo/00_AUTHORITY_REGISTER.md + 00_SOURCE_PRIORITY.md.
PASS : 0 source non classée, contradictions listées, règle de priorité écrite.
```

---

## PHASE 1 — Inventaire TOTAL : moteurs, modules, lignées (4-8h, parallélisable)
**Pourquoi** : trouver TOUS les moteurs/incarnations/doublons/ancêtres, pas seulement les 3 connus.
**Scope** : `packages/` + `src/` + `gateway/` + `omega-v44*` + `omega_titanium_ultimate/` + `omega-narrative-genome/` + `OMEGA_SNAPSHOTS/` + `OMEGA_MASTER_DOSSIER*` + `OMEGA_PHASE*` + `apps/` + `omega-ui*/` + `nexus/` + `tools/` + `docs/` + session-saves + blueprints. **AUCUN dossier racine non visité.**
**Recherche** : generate/scribe/weave/weaveLLM/forge/K2/judge/oracle/scorer/R6/Dédale/truth/canon/memory/style/emotion/rewrite/pipeline/runner/14D.
**Livrables** : `01_ENGINE_INVENTORY.md` + `01_LINEAGE_MAP.md` (généalogie datée) + `01_ROOT_TREE_CLASSIFICATION.csv` (chaque dossier racine classé).
**Classifications** : ACTIVE_RUNTIME · BENCH_ONLY · ORPHAN · GARAGE · DORMANT · FROZEN · SNAPSHOT · LEGACY · DUPLICATE · UNKNOWN.
**PASS** : aucun dossier racine non classé, aucun moteur potentiel non inspecté.

### Prompt Claude Code — Phase 1 (lançable via N agents Explore en parallèle, 1 zone chacun)
```
J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000. READ-ONLY ABSOLU.
Mission : inventaire exhaustif moteurs/modules/lignées. Scope = TOUS les dossiers racine (packages/ src/ gateway/ omega-v44* titanium snapshots master_dossier* phase* apps/ ui/ nexus/ tools/ docs/ sessions).
Pour chaque dossier/module : chemin, rôle revendiqué (doc), rôle réel (code), date git 1ère apparition, dernier commit code, statut build (dans un tsconfig include ?), statut runtime (importé/lancé ?), callers, consumers, marqueurs génération/scoring présents, verdict provisoire de classe.
Classes : ACTIVE_RUNTIME/BENCH_ONLY/ORPHAN/GARAGE/DORMANT/FROZEN/SNAPSHOT/LEGACY/DUPLICATE/UNKNOWN.
Livrables : docs/audit/archaeo/01_ENGINE_INVENTORY.md + 01_LINEAGE_MAP.md (généalogie datée des moteurs d'écriture) + 01_ROOT_TREE_CLASSIFICATION.csv.
PASS : 0 dossier racine non classé, 0 moteur non inspecté, aucune supposition non prouvée.
```

---

## PHASE 2 — ADN moléculaire des modules (8-16h, parallélisable par paquet)
**Pourquoi** : fiche technique froide PAR module/sous-module — le plan millimétré demandé.
**Pour chaque module ET sous-module** : id, nom, chemin, date git, **fonction primaire + sous-fonctions (I/O de chaque)**, callers, consumers, **branchements** (qui appelle qui), **modules de traduction/adaptateurs** (Scene→ForgePacket, etc.), **modules de contrôle** (gates/oracles/validators), tests + couverture, build/runtime status, invariants, équations éventuelles (flag 14D), NCR liés, dépendances, **doublons suspects**, **emplacement architectural respecté ou MAL PLACÉ** (ex : scoring dans un package d'orchestration), preuve de vie/mort, verdict provisoire.
**Livrables** : `OMEGA_MODULE_DNA_REGISTRY.yaml` + `02_DNA_SUMMARY.md` + `02_CALL_GRAPH_ACTIVE_RUNTIME.md` (réutiliser `nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS/` : functions_map, module_deps, layering_report) + `02_TEST_COVERAGE_BY_MODULE.md`.
**Verdicts provisoires** : KEEP/FUSE/GARAGE/ARCHIVE/REWRITE/BENCH_REQUIRED/UNKNOWN_BLOCKED.
**PASS** : chaque module important a une fiche avec ≥1 preuve repo/runtime ; chaque sous-fonction a I/O ; chaque mauvais placement architectural noté.

### Prompt Claude Code — Phase 2
```
J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000. READ-ONLY ABSOLU.
Mission : fiche ADN technique par module ET sous-module (issus Phase 1). Exploiter nexus/blueprint/OMEGA_BLUEPRINT_PACK/GRAPHS (functions_map, module_deps, layering_report, types_map, tests_map) comme base.
Chaque fiche : id, chemin, date git, fonction primaire + SOUS-FONCTIONS (I/O chacune), callers, consumers, branchements, adaptateurs/modules de traduction, modules de contrôle (gates/oracles/validators), tests+couverture, build/runtime, invariants, équations (flag si 14D), NCR liés, dépendances, doublons suspects, EMPLACEMENT ARCHITECTURAL (respecté/MAL PLACÉ + pourquoi), preuve vie/mort, verdict provisoire (KEEP/FUSE/GARAGE/ARCHIVE/REWRITE/BENCH_REQUIRED/UNKNOWN_BLOCKED).
Livrables : docs/audit/archaeo/OMEGA_MODULE_DNA_REGISTRY.yaml + 02_DNA_SUMMARY.md + 02_CALL_GRAPH_ACTIVE_RUNTIME.md + 02_TEST_COVERAGE_BY_MODULE.md.
PASS : chaque module important fiché + ≥1 preuve, sous-fonctions avec I/O, mauvais placements notés.
```

---

## PHASE 3 — Tribunal doublons / garage / ancêtre / contradictions (8-12h)
**Pourquoi** : traiter les vrais pièges (emballement IA, 14D garage, 3 incarnations Scribe).
**10 cas obligatoires** : (1) **src/scribe v1.0.0 vs scribe-engine** (delta ancêtre : features d'analyse best-sellers/auteurs perdues/diluées/trahies ? pureté AS9100D/DO-178C ?) ; (2) scribe-engine vs sovereign-engine ; (3) creation-pipeline vs orchestration sovereign ; (4) **Emotion14D / Emotion V2 / Mycelium / Forge** (confinement garage + dépendances inversées cachées vers le 14D depuis la prod) ; (5) truth-gates multiples ; (6) canon modules multiples ; (7) style modules multiples ; (8) memory modules ; (9) scoring CALC/R6/S-Oracle/Dédale ; (10) session-saves vs docs actuels.
**Format par doublon** : DUP-ID, impl A/B/C, fonction revendiquée vs réelle, preuve runtime/test/doc, risque suppression/conservation, valeur unique, verdict provisoire, bench requis.
**Livrables** : `03_DUPLICATION_AND_GARAGE_TRIBUNAL.md` + `03_GARAGE_MODULES_REGISTER.md` + `03_CONTRADICTION_REGISTER.md` + `03_CANON_DRIFT_MAP.md` + (priorité) `OMEGA_SCRIBE_ANCESTOR_DELTA_AUDIT.md` (tableau capacité × {src/scribe v1 / scribe-engine / sovereign} + colonne **PERDU_DANS_REFONTE ?**).
**PASS** : aucun doublon critique sans verdict provisoire ; 14D vs prod : dépendances inversées prouvées présentes/absentes ; ancêtre comparé (features perdues listées) ; aucune archive proposée sans matrice de perte.

### Prompt Claude Code — Phase 3
```
J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000. READ-ONLY ABSOLU.
Mission : tribunal des doublons, modules garage, ancêtre, contradictions. Traiter les 10 cas obligatoires (voir roadmap §Phase 3), PRIORITÉ cas 1 (delta ancêtre src/scribe v1.0.0 vs scribe-engine : features analyse best-sellers/auteurs perdues/diluées ? pureté AS9100D respectée ?) et cas 4 (14D : chercher import/as-any/appel caché vers le 14D depuis sovereign/scribe/creation-pipeline = dépendance inversée).
Format par doublon : DUP-ID, impl A/B/C, fonction revendiquée vs réelle, preuves runtime/test/doc, risques, valeur unique, verdict provisoire, bench requis.
Livrables : docs/audit/archaeo/03_DUPLICATION_AND_GARAGE_TRIBUNAL.md + 03_GARAGE_MODULES_REGISTER.md + 03_CONTRADICTION_REGISTER.md + 03_CANON_DRIFT_MAP.md + docs/architecture/OMEGA_SCRIBE_ANCESTOR_DELTA_AUDIT.md (tableau capacité × 3 incarnations + colonne PERDU_DANS_REFONTE).
PASS : 0 doublon critique sans verdict ; confinement 14D prouvé ; features ancêtre perdues listées ; 0 archive sans matrice de perte.
```

---

## PHASE 4 — Épreuve empirique : tests & benchs (6-20h, scripts gatés)
**Pourquoi** : le code statique ment parfois — on mesure ce qui tourne et ce qui produit mieux.
**Tests** : build par paquet, test par paquet, import Node natif, gate-imports, call-graph runtime, **bench génération/qualité/scoring/déterminisme/pipeline complet**.
**Bench moteurs (le cœur)** : même brief / même seed / mêmes contraintes / même scène → (a) src/scribe v1.0.0 si exécutable, (b) scribe-engine, (c) sovereign K2, (d) prototype fusion si spécifié. Soumettre au `judgeAestheticV3` (S-Oracle V2) + oracles structurels best-sellers. Métriques : qualité littéraire, cohérence, tension, style, respect intent, subtext, canonical safety, déterminisme, coût, temps.
**Livrables** : `04_EMPIRICAL_BENCH_PLAN.md` + `04_RUNTIME_PROOF_MATRIX.md` + `04_ENGINE_COMPARISON_BENCH.md` + `04_DETERMINISM_REPORT.md` + script `scripts/bench-archaeology.ts` (+ README).
**Règle** : Ollama pour dev/tests, Anthropic API uniquement validation finale (coût — llm-cost-guard). Scripts bench = seuls « patches » autorisés, via wrapper.
**PASS** : chaque future décision aura preuve statique + runtime + test + bench (si génération/qualité) + risque + rollback.

### Prompt Claude Code — Phase 4
```
J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000. Tests/benchs autorisés ; patches interdits SAUF scripts bench dédiés (via wrapper). Zéro refactor moteur.
Mission : transformer la cartographie Phase 1-3 en preuves runtime.
1. Concevoir scripts/bench-archaeology.ts : 1 entrée stricte (IntentPack/SceneBrief) → 3-4 voies (src/scribe v1 si exécutable, scribe-engine, sovereign K2, fusion proto) → judgeAestheticV3 + oracles best-sellers.
2. Préparer mocks + README d'exécution. NE PAS lancer l'inférence LLM coûteuse sans GO (préparer Ollama).
Livrables : docs/audit/archaeo/04_EMPIRICAL_BENCH_PLAN.md + 04_RUNTIME_PROOF_MATRIX.md + 04_ENGINE_COMPARISON_BENCH.md + 04_DETERMINISM_REPORT.md + scripts/bench-archaeology.ts + README.
PASS : chaque décision future reliée à preuve statique+runtime+test+bench+risque+rollback.
```

---

## PHASE 5 — Synthèse & décision architecturale finale (3-6h, doc-only)
**Pourquoi** : à ce stade SEULEMENT on décide — sur preuves.
**Entrées** : Phases 0-4.
**Livrables** : `OMEGA_ARCHAEOLOGY_MASTER_BLUEPRINT.md` (le plan véridique reconstruit) + `OMEGA_FINAL_ARCHITECTURE_DECISION_PACK.md` + `OMEGA_CANONICAL_ENGINE_TARGET_DECISION.md` + `OMEGA_FUSION_PLAN.md` + `OMEGA_ARCHIVE_PLAN.md` + `OMEGA_RISK_REGISTER_FINAL.md`. Met à jour/clôt DEC-009 + NCR sur preuves.
**Décisions** : moteur canonique final ; quoi fusionner / garder / garer / archiver / réécrire / re-bencher ; ordre de reconstruction ; no-go ; rollback.
**PASS** : aucune décision sans preuve ; aucun module critique UNKNOWN ; aucun doublon non tranché ; aucun moteur oublié ; aucun garage confondu avec actif ; aucun patch lancé.

### Prompt Claude Code — Phase 5
```
J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000. Décision documentaire uniquement, zéro code.
Mission : produire le dossier de décision finale à partir des Phases 0-4.
Livrables : docs/architecture/OMEGA_ARCHAEOLOGY_MASTER_BLUEPRINT.md + OMEGA_FINAL_ARCHITECTURE_DECISION_PACK.md + OMEGA_CANONICAL_ENGINE_TARGET_DECISION.md + OMEGA_FUSION_PLAN.md + OMEGA_ARCHIVE_PLAN.md + OMEGA_RISK_REGISTER_FINAL.md. MAJ DEC-009 + clôture NCR sur preuves.
PASS : chaque décision reliée à une preuve ; 0 module critique UNKNOWN ; 0 doublon non tranché ; 0 moteur oublié.
```

---

## Stratégie agents parallèles
- Phase 1 : N agents Explore, **1 zone racine chacun** (packages / src+gateway / snapshots+v44+master_dossier / docs+nexus+sessions) → Claude consolide.
- Phase 2 : agents par grappe de paquets (ADN). Phase 3 : 1 agent par cas-doublon (les 10). Claude consolide + commit (DOC_ONLY, wrapper, sync à chaque fois).
- Phase 4 : exécution séquentielle (benchs = ressources GPU/Ollama, llm-cost-guard).

## Effort réaliste
Phase 0 : 1-2h · Phase 1 : 4-8h · Phase 2 : 8-16h · Phase 3 : 8-12h · Phase 4 : 6-20h · Phase 5 : 3-6h → **~30-60h** d'archéologie. *Moins long que de bâtir le moteur final sur une carte fausse.*

## Gel
Pas de fusion / suppression / archivage / DEC final **avant Phase 5**. DEC-009 reste PROPOSED (cible fusion), NCR OPEN. D'abord : retrouver le squelette vrai → organes en double → tester lesquels vivent → reconstruire proprement.
