# NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN

**ID** : NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN
**Title** : Pattern méta — Cowork sandbox provides empirically unverified anchors (SHA, tags, test counts, paths)
**Status** : **DOCUMENTED**
**Severity** : MEDIUM
**Priority** : P2
**Opened** : 2026-05-01 (Sprint S8 Vague 2 C17)
**Owner** : Francky + Claude

---

## 1. Issue

Cowork (agent IA distinct de Claude Code, opérant en **sandbox isolé**)
fournit des prompts de planification et d'instruction pour les sprints
OMEGA. Ces prompts citent fréquemment des **anchors empiriques** spécifiques
au repo `omega-project` :

- SHA de commits (`git log`)
- Tags git (`git tag -l`)
- Compteurs de tests (`X/Y PASS`)
- Paths de fichiers
- Statuts files-existence

**Problème structurel** : Cowork n'a **pas accès runtime** au filesystem
du repo. Il ne peut pas exécuter `git`, `Test-Path`, `Get-ChildItem`,
`npm test`, ou aucune commande qui interrogerait l'état réel du repo.

**Conséquence** : tout anchor empirique cité par Cowork est soit :
- (a) Un souvenir d'une session antérieure (potentiellement obsolète)
- (b) Une inférence ou hallucination plausible
- (c) Une mémoire externe (Cowork a sa propre mémoire, mais non-synchronisée
  avec le repo)
- (d) Coïncidence correcte (l'anchor existe vraiment)

Sans vérification runtime par Claude Code (qui a accès au filesystem),
**les cas (a), (b), (c) sont indistinguables de (d)**.

## 2. Évidence empirique — pattern observé sur 2 sprints (5+ occurrences)

### EMP-1 — Sprint S7.2 (2026-04-27)

**Affirmation Cowork** : "Ollama baseline V1_SEAL re-validated empirique"

**Réalité observée par Claude Code** (commit `d2664971` 2026-04-29) :
- Le bench V1_SEAL était documenté comme tournant sur Anthropic Sonnet 4
  (pas Ollama qwen3:32b)
- Re-validation empirique nécessaire conduite **après** détection du gap

**Pattern** : assomption sur le provider sans vérification empirique du
bench source.

### EMP-2 — Sprint S8 Vague 1 C8 (NCR_DIRECTIVE_BLOAT, 2026-05-01)

**Affirmations Cowork (3 anchors)** :
1. "commit `b7dec7dd` revert directive_bloat"
2. "tag `phase-s-rd1-adopt-a-p1-sealed`"
3. "bench R-D.1 ADOPT_A référencé dans NCR"

**Réalité empirique vérifiée par Claude Code** :
1. ❌ `b7dec7dd` = "feat(bench): Anaphore Gate β" (2026-04-25), sans rapport
   avec directive_bloat. Le vrai rollback est `a156b0a3`.
2. ❌ `git tag -l "*rd1-adopt*"` retourne **vide** — le tag n'existe pas.
3. ❌ R-D.1 ADOPT_A est référencé dans 4 **autres** NCRs (commit `7e89f95f`),
   pas dans directive-bloat.

**Pattern** : fabrication / confusion d'anchors empiriques.

### EMP-3 — Sprint S8 Vague 1 C9 (NCR_M2_DEADLOCK, 2026-05-01)

**Affirmations Cowork (3 anchors)** :
1. "commit `10d9fbcf` scellage référencé"
2. "tag `phase-s-ncr-m2-closure-2026-04-20`"
3. "tests `2411/2411 PASS`"
4. "drift `18 files` toujours en attente Sprint S12"

**Réalité empirique vérifiée par Claude Code** :
1. ✅ `10d9fbcf` correct (rare cas (d) coïncidence — anchor exact)
2. ❌ Tag inexistant (`git tag -l "*ncr-m2*"` retourne vide)
3. ❌ NCR §10.4 cite "≥2424 PASS" (pas 2411). Compte non vérifiable.
4. ⚠️ Imprécis : archive réelle = **31 fichiers** (`docs/archive/drift-20260420.md`),
   pas 18.

**Pattern** : 1/4 correct, 3/4 incorrects ou imprécis.

### EMP-4 — Sprint S8 Vague 2 C8 instruction (2026-05-01)

**Affirmation Cowork** : "tests 2411/2411 PASS et drift 18 files cleared"

(Réutilisation des anchors EMP-3 dans une instruction subséquente sans
correction post-EMP-3. Pattern auto-renforcé.)

### EMP-5 — Pattern transversal détecté

Cowork **réutilise** ses propres anchors entre sprints sans mécanisme
de re-vérification. Une erreur non corrigée à un sprint N propage à
sprint N+1, N+2, etc.

## 3. Pattern méta confirmé

> **Cowork PLAN + Claude Code DETECTION RUNTIME = MULTI-IA RUNTIME ARBITER**

Cowork excelle en :
- Vision stratégique (planification de sprints multi-vagues)
- Doctrine et conventions (PROVE IT, NCR OVER HEROICS, etc.)
- Coordination 3-IA (Cowork + ChatGPT + Gemini)
- Architecture conceptuelle (gates, NCR taxonomy, scelle/seal patterns)

Cowork échoue empiriquement en :
- Citation d'anchors runtime spécifiques
- Vérification de l'état réel du repo
- Synchronisation mémoire vs filesystem

Claude Code excelle en :
- Vérification empirique runtime (`git`, `Test-Path`, `npm`, etc.)
- Détection de divergence Cowork-réel
- Arbitrage in-the-loop avec accès filesystem

→ Le bon design est : **Cowork plan + Claude Code arbitre runtime**.

## 4. Doctrine renforcée scellée Sprint S8 Vague 2

### Amendement C9 v3.1.0 (DRAFT) — MULTI-IA RUNTIME ARBITER

> Toute instruction Cowork citant un anchor empirique (SHA, tag, test
> count, path, file existence) DOIT inclure le marker `[À VÉRIFIER]`
> à côté de l'anchor.
>
> Claude Code DOIT vérifier chaque anchor marqué avant de l'inclure
> dans un NCR ou un commit message. Si la vérification échoue, l'anchor
> est noté comme "non vérifiable empiriquement" sans cosmétique.

### Amendement C10 v3.1.0 (DRAFT) — NO_UNVERIFIED_EXTERNAL_ANCHORS

> Aucune clôture NCR ne peut reposer sur un anchor non vérifié runtime.
> En particulier :
> - SHA256 doit être recalculé empiriquement, pas cité de mémoire
> - Tags doivent être confirmés via `git tag -l` (pattern strict)
> - Test counts doivent être confirmés via `npm test` ou équivalent
> - Paths doivent être confirmés via `Test-Path` ou `git ls-files`
> - File existence doit être confirmée empiriquement

### Application Sprint S8 Vague 1 (rétrospective)

Le pattern doctrinal renforcé a été appliqué de facto en Vague 1 :
- C8 anchors imprécis flaggés honnêtement dans NCR_DIRECTIVE_BLOAT §10.4
- C9 anchors imprécis flaggés honnêtement dans NCR_M2_DEADLOCK §11.3
- Refus d'embellissement par "rubber-stamping"

Le présent NCR formalise ce qui était implicite.

## 5. Actions correctives

### 5.1 Sprint S9+ — Plan Max v3.1.0 amendements

Les amendements C9 + C10 (et l'amendement C11 EVIDENCE_HASH_PRECONDITION
proposé dans `NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING` §7) doivent être
formellement scellés dans une révision du Plan Max OMEGA.

**Action 1** : Cowork prépare amendement texte v3.1.0 § C9 + C10 + C11.
**Action 2** : Architecte Francky valide ou amende.
**Action 3** : Claude Code intègre dans `CLAUDE.md` (ou doc de référence).

### 5.2 Cowork prompts futurs — protocole `ANCHOR_PRE_FLIGHT`

Tous prompts Cowork citant des anchors empiriques doivent désormais
inclure :

```
ANCHOR_PRE_FLIGHT — Cowork [BLIND TO RUNTIME]
=============================================
Anchors cités à vérifier par Claude Code :
- [À VÉRIFIER] commit <SHA suspect>
- [À VÉRIFIER] tag <name suspect>
- [À VÉRIFIER] test count X/Y
- [À VÉRIFIER] path <path>

Claude Code arbitre runtime obligatoire avant tout commit.
```

### 5.3 Pattern documenté pour formation futures sessions

Ce NCR sert de référence pédagogique pour toute future session OMEGA
impliquant Cowork. Le pattern doit être identifié au démarrage de chaque
sprint et le protocole `ANCHOR_PRE_FLIGHT` activé.

## 6. Hypothèses sur cause racine du pattern

### H1 — Architecture de mémoire Cowork

Cowork stocke ses sessions dans une mémoire externe distincte du
filesystem repo. Quand un anchor est cité, il provient de cette mémoire
qui peut :
- Être désynchronisée du filesystem actuel
- Contenir des anchors d'un état antérieur du repo
- Fusionner inconsciemment plusieurs contextes

### H2 — Inférence plausible LLM

Cowork peut générer un SHA "plausible" (8 chars hex) qui ressemble à un
vrai SHA mais est inventé. Idem pour tags ("phase-s-..." patterns).
Cette inférence est plausible mais empiriquement fausse.

### H3 — Confusion entre projets

Cowork peut conflater des éléments de plusieurs projets/repos qu'il
suit (omega-project, OMEGA, autres). Les contextes se mélangent.

**Probabilité combinée** : H1 + H2 ≈ HAUTE. H3 modérée. Toutes contribuent
au pattern observé.

## 7. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S8.V2 | **DONE** |
| 2 | Cowork prépare amendements C9+C10+C11 v3.1.0 | Cowork | S9+ | PENDING |
| 3 | Validation Architecte amendements | Francky | S9+ | PENDING |
| 4 | Intégration `CLAUDE.md` ou doc référence | Claude | S9+ | PENDING |
| 5 | Application protocole `ANCHOR_PRE_FLIGHT` Sprint S9+ | All | S9+ | PENDING |
| 6 | Audit rétrospectif des NCRs CLOSED via anchor non-vérifié | Claude | S9+ | PENDING |

## 8. Doctrine — NCR OVER HEROICS

Ce NCR illustre la doctrine OMEGA dans son sens le plus pur :

- **Pattern admis ouvertement** plutôt que caché par embellissement
- **5 occurrences documentées** plutôt que glissées sous le tapis
- **Tension Cowork-Claude Code** reconnue comme **synergie** plutôt que
  conflit (chaque agent a son rôle, le pattern multi-IA renforce la
  rigueur)

> Cowork is a planning/strategic agent, not a runtime witness.
> Claude Code is the runtime arbiter, not the strategy designer.
> Together, with discipline, they exceed either alone.

## 9. Traçabilité

- **Source** : Sprint S8 Vague 1 (5 anchors imprécis détectés C8+C9) +
  Sprint S7.2 rétrospectif (provider assumption)
- **Découvert via** : audit closure NCRs Vague 1 par Claude Code runtime
- **NCRs liés** :
  - `NCR_REGISTRY_BROKEN_FILTER` (OPEN_DIAGNOSED) — pattern méta
    parallèle (registry script broken, similar lesson)
  - `NCR_DIRECTIVE_BLOAT_ARTIFACT_MISSING` (OPEN_DIAGNOSED) — pattern
    parallèle (anchor INTERNE Claude Code introuvable, doctrine
    EVIDENCE_HASH_PRECONDITION proposée)
  - Tous les NCRs Vague 1 enrichis avec anchors corrigés (C6/C7/C8/C9)

## 10. Signature

```
NCR-ID    : NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN
OPENED    : 2026-05-01 (Sprint S8 Vague 2 C17)
STATUS    : DOCUMENTED — pattern méta admis, amendements queue Sprint S9+
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal, runtime arbiter)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
