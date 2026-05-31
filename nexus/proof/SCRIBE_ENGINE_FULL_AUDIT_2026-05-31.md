# AUDIT COMPLET — scribe-engine vs Codex OMEGA (2026-05-31)

**Auteur** : Claude Code · **Mode** : read-only · **Base de vérité** : Codex v1.3.1 + addendum PARTIE VII (commit `72e4215e`) · **HEAD** : `72e4215e`.
**Périmètre** : `packages/scribe-engine/` — 46 fichiers `src`, ~7129 LOC, 34 fichiers de test, 339 tests.
**Honnêteté de profondeur** : audit par **module + contrat + conformité Codex + interactions**, findings par sévérité. Pas une revue ligne-à-ligne des ~7000 LOC (signalé) ; les modules centraux (engine, rewriter, gates, oracles, weaver(s), providers, prosepack, intent-artifact) ont été lus en profondeur.

---

## 1. Architecture réelle

**Pipeline (engine.ts `runScribe`)** : S0 validateInputs → S1 segment+skeleton → S2 weave → S3 sensory → S4 `rewriteLoop` (inclut S5 7-gates + S6 6-oracles) → packaging (evidence + report).

**6 groupes de modules** :
- **Orchestration** : engine.ts (215), rewriter.ts (296), config.ts, report.ts, evidence.ts.
- **Génération prose** : DEUX chemins — `weave` (weaver.ts 189, **règle déterministe**) ET `weaveLLM` (weaver-llm.ts 247, **LLM**, via cli/scribe-llm.ts + providers/).
- **Gates (7)** : truth/necessity/banality/style/emotion/discomfort/quality — invariants `S-INV-*`.
- **Oracles (6)** : truth/necessity/style/emotion/banality/crossref.
- **Providers** : llm-provider, ollama-provider, mock-provider, atomic-cache, factory + robustesse (pr/ : budget-tracker 250, chaos-provider 230, retry-provider 225, variance-envelope 185, proofpack 336).
- **Prosepack** : normalize (395), repair (588), types — normalisation/réparation de prose.
- **Contrat** : intent-artifact.ts (NEUF), types.ts (241), skeleton, segmenter, sensory, normalizer.

**Interactions cross-package** : importe `@omega/genesis-planner` (types Plan/Scene/Intent/Canon/Constraints) et `@omega/canon-kernel` (hash/canonicalize). **NE dépend PAS de sovereign-engine** (le scoring S-Oracle V2 est séparé). `creation-pipeline` orchestre scribe (et en dépend → cycle interdit côté scribe).

---

## 2. Conformité Codex (lois SEALED)

| Loi Codex | Statut scribe | Preuve |
|---|---|---|
| **CALC = douanier** (3.x) : CALC rejette, ne coache pas | ✅ CONFORME | gates + oracles = **pur CALC** (grep : aucun `provider`/LLM dans gates/*, oracles/*). `rewriteLoop` = sélection par passage de gate (rejection sampling), pas coaching. |
| **Feedback sémantique = TOXIQUE** (3.x, ADR-003) | ✅ CONFORME | `rewriteProse(skeleton, passNumber)` régénère par **seed déterministe** (`sha256(skeleton_hash-pass-N)`), PAS en réinjectant les scores comme directives. |
| **DÉTERMINISME** (règle cardinale) | ✅ CONFORME | Zéro `Date.now`/`Math.random`/`new Date()` dans `src`. Seeds via `sha256`. Hash de prose reproductible. |
| **Émotion 14D = DORMANT** (1.7, FORBID-CANON-GARAGE) | ✅ CONFORME | scribe consomme `scene.subtext` (champs narratifs genesis), ne touche pas au vecteur 14D. |
| **Fail-closed** (validateurs) | ⚠️ PARTIEL→RÉSOLU | chemin règle (engine.ts `validateInputs`) = fail-closed (S-INV-01, vérifie constraints/genome/emotion). Chemin LLM CLI **manquait** la validation → **comblé cette session** (`loadIntentArtifact`, LAW-SCRIBE-INTENT-001). |
| **Tests obligatoires** | ✅ CONFORME | 339 tests, 34 fichiers (après réparation infra `f331046d`). |
| **Zéro `any`** (standard L4) | ✅ CONFORME | scribe `src` = **0 `as any`** (sauf 1 frontière validée dans `loadIntentArtifact`). |

---

## 3. Findings par sévérité

### 🔴 S1 (HIGH) — aucun trouvé
Aucune violation bloquante des lois scellées ni de régression. (Suspect → re-vérifié : conformité CALC/déterminisme/14D solide.)

### 🟠 S2 (MEDIUM)
- **S2-1 — Le « moteur de correction » déterministe ne corrige pas sémantiquement.** `rewriteProse` applique des **micro-tweaks déterministes** (filtrage de mots vagues type 'thing/stuff', réagencement par seed), pas une amélioration de prose réelle. La boucle `rewriteLoop` régénère N passes rule-based puis sélectionne via gates/oracles. → **Conforme à la doctrine (rejection, pas coaching) MAIS faible valeur littéraire** : la qualité réelle vient du chemin LLM (`weaveLLM`), qui **n'est PAS intégré à la boucle gates/oracles**. Le « moteur d'écriture ET correction » attendu par l'Architecte n'est donc pas pleinement réalisé : génération LLM (R6) et sélection CALC (douanier) vivent dans deux chemins disjoints.
- **S2-2 — Double chemin de génération non unifié.** engine.ts utilise `weave` (règle) ; cli/scribe-llm.ts utilise `weaveLLM` (LLM). Orchestration dupliquée, contrats divergents (le chemin LLM a son propre extract intent, désormais typé via IntentArtifact). Risque de dérive entre les deux.

### 🟡 S3 (LOW)
- **S3-1 — prosepack/repair.ts (588 LOC)** = plus gros fichier, logique de réparation dense ; vérifier couverture de test dédiée (réparation pov/tense, déjà touchée cette session).
- **S3-2 — 51 `console.*` réels dans scribe** (gouvernés par DEC-006, migration logger phasée à venir).
- **S3-3 — providers/ robustesse** (chaos/retry/variance/budget, ~890 LOC) : infra solide mais à confirmer testée + documentée (interaction avec déterminisme : chaos-provider doit être OFF en mode hashé).

### ✅ RÉSOLU cette session
Gap validation Intent (LAW-SCRIBE-INTENT-001) ; 19→0 casts ; gold-cli ; test-infra scribe (gate réparé) ; prosepack pov/tense.

---

## 4. État code vs documenté
- Pipeline S0-S6 = conforme au doc d'en-tête engine.ts. ✅
- Invariants `S-INV-01..05` présents et appliqués (validateInputs, gates). ✅
- Contrat `intent.json` = désormais documenté+typé (était implicite/`as any`). ✅ (amélioration session)
- Pas de TODO, pas de dead code détecté (noUnusedLocals actif), pas de `@ts-ignore`.

## 5. VERDICT
- Statut : **PASS** (conformité Codex solide) avec **2 findings S2 architecturaux** (correction sémantique non réalisée / double chemin).
- Confiance : Haute sur conformité (CALC/déterminisme/14D/fail-closed) ; Moyenne sur la complétude fonctionnelle du « moteur de correction » (S2-1).
- Forces : pur CALC déterministe testable, rejection-sampling doctrinal, 0 any, fail-closed restauré.
- Faiblesses : (1) la correction déterministe n'améliore pas la prose (tweaks) — l'intelligence est dans le chemin LLM non intégré à la boucle douanier ; (2) deux chemins de génération disjoints.
- Risques restants : dérive entre chemins règle/LLM ; correction perçue comme « marche » alors qu'elle ne fait que régénérer-puis-filtrer.
- Action requise : plan d'action (doc séparé `SCRIBE_ENGINE_ACTION_PLAN_2026-05-31.md`) — intégrer LLM(R6)+CALC(douanier) en une boucle unique, unifier les chemins, sans violer feedback-toxique-interdit ni déterminisme.
