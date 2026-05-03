# NCR_GATE_IMPORTS_BUNDLER_BLINDNESS

**ID** : NCR_GATE_IMPORTS_BUNDLER_BLINDNESS
**Title** : `gate:imports` exécuté sous `npx tsx` (esbuild) ne détecte pas les bugs ESM Node natif (imports sans extension dans `dist/`)
**Status** : **STILL_OPEN** (Sprint S8 Vague 2 reconfirmation 2026-05-01 — annotation in-code OK, Test 4 implémentation non-faite)
**Severity** : P1 — gate fonctionnellement aveugle à toute une classe de bugs runtime
**Priority** : P1
**Opened** : 2026-04-27 (Tribunal 3-IA, S6.1 préamble)
**Owner** : Francky (décide périmètre S6.2) + Claude (drafter)

---

## 1. Issue

Le gate CI `gate:imports` est invoqué sous `npx tsx` (esbuild). esbuild
applique une **bundler resolution** qui :
- Tolère les imports sans extension (`from './foo'` au lieu de `from './foo.js'`)
- Résout les imports relatifs comme TypeScript module resolution
- N'applique PAS la stricte spécification ESM Node native

En production, les modules `dist/*.js` sont chargés par **Node natif** (ESM
strict). Node ESM strict :
- EXIGE l'extension `.js` sur tous les imports relatifs
- Refuse les imports sans extension avec `ERR_MODULE_NOT_FOUND`
- Applique des règles différentes pour `package.json` exports map

**Conséquence** : un module qui importe sans extension passe le gate `tsx`
mais crash en runtime Node natif. Le gate `gate:imports` actuel **ne capte
pas cette classe de bugs**.

## 2. Preuves

### 2.1 Comportement empirique tsx vs node

Hypothèse vérifiable (à confirmer en S6.2) : tout fichier `dist/*.js` qui
contient `import { x } from './foo'` (sans `.js`) sera importable via tsx
mais échouera sous `node` :

```
# Sous tsx (passe — bundler resolution)
$ npx tsx -e "import('./packages/foo/dist/index.js')"
(no error)

# Sous node strict ESM (FAIL)
$ node --input-type=module -e "import './packages/foo/dist/index.js'"
Error [ERR_MODULE_NOT_FOUND]: Cannot find module './foo' imported from ...
```

### 2.2 Code source du gate (post-S6.1)

`scripts/gate-imports.ts` contient maintenant l'avertissement explicite :
```ts
/**
 * ⚠️ LIMITATION CONNUE — NCR_GATE_IMPORTS_BUNDLER_BLINDNESS (P1 DRAFT) :
 * Ce gate s'exécute sous `npx tsx` (esbuild = bundler resolution). Il NE PEUT
 * PAS détecter les bugs ESM Node natif (imports sans extension dans dist/).
 * Voir mission S6.2 pour Test 4 (spawn `node` strict en child_process).
 */
```

### 2.3 Convergence Tribunal

Le Tribunal 3-IA (Cowork + Gemini + ChatGPT) a explicitement mentionné cette
limitation dans le verdict S6.1, recommandant une mission S6.2 pour ajouter
un Test 4 utilisant `node` natif via `child_process.spawn`.

## 3. Hypothèses mécaniques

### 3.1 H1 — esbuild moduleResolution=bundler par défaut

esbuild applique par défaut une résolution bundler-like : extensions inférées,
fallback `index.js`, etc. Cette tolérance est intentionnelle pour DX TypeScript
mais aveugle aux contraintes ESM strict.

### 3.2 H2 — Node 18+ ESM strict ne tolère plus les `index.js` implicites

Depuis Node 16+, le mode ESM (`"type": "module"` ou `.mjs`) refuse :
- Les imports relatifs sans extension
- Le fallback automatique vers `index.js` dans un dossier
- L'absence de `exports` map dans `package.json` pour les sous-paths

Si un package du repo utilise une de ces patterns, il sera importable via tsx
mais cassé en prod.

## 4. Impact

### 4.1 Faux sens de sécurité

Le verdict "GATE IMPORTS PASS" peut masquer une production cassée. C'est le
type de bug le plus dangereux en safety-critical : faux positif sur le succès.

### 4.2 Périmètre potentiel de bugs cachés

Tous les packages du workspace OMEGA pourraient contenir cette classe de bug,
en particulier :
- `@omega/canon-kernel` (cf. NCR_ESM_BUNDLER_VS_NODE_RUNTIME P1)
- Tout package avec `dist/` généré
- Tout package avec re-exports profonds

### 4.3 CI / déploiement

Un déploiement passant le gate mais cassé à l'exécution réelle sous Node = MTBF
production dégradé silencieusement.

## 5. Options de résolution (S6.2)

### Option A — Test 4 : spawn `node` strict en child_process

**Description** : ajouter un test au gate qui spawn une instance Node native
via `child_process.spawn('node', ['-e', '...'])` et tente d'importer
`packages/sovereign-engine/dist/engine.js` (le build, pas le src).

**Effort** : 1-2h dev (gate-imports.ts).
**Bénéfice** : capture les bugs ESM Node natif.

### Option B — Imposer `node` au lieu de `tsx` pour le gate

**Description** : pré-builder TS → JS, puis exécuter le gate sous `node` natif
strict.

**Effort** : 30 min config + maintenance build du gate.
**Bénéfice** : pleine détection ESM. **Coût** : ralentit le gate (build pre-step).

### Option C — Utiliser `tsx --strict` (si disponible)

**Description** : si tsx expose un mode "strict ESM emulation", l'activer.

**Statut** : à vérifier — esbuild ne semble pas exposer un tel flag à ce jour.

## 6. Recommandation

**Option A retenue pour S6.2** — Test 4 child_process. Préserve la rapidité
du gate actuel tout en ajoutant la détection ESM Node natif sur les paths
critiques (engine.ts dist).

Pas d'application immédiate (S6.1 est un hotfix scope-limité). À planifier
en sprint S6.2 dédié.

## 7. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S6.1 | **DONE** |
| 2 | Ajouter avertissement dans gate-imports.ts | Claude | S6.1 | **DONE** |
| 3 | Décision Architecte sur Option A/B/C | Francky | S6.2 | PENDING |
| 4 | Implémenter Test 4 (spawn node) | Claude | S6.2 | PENDING |
| 5 | Audit packages dist/ pour imports sans extension | Claude | S6.2 | PENDING |

## 8. Traçabilité

- **Hotfix S6.1** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`
- **Code annoté** : `scripts/gate-imports.ts` (header L.1-7)
- **NCR P0 résolu** : `NCR_GATE_IMPORTS_PATH_BUG.md`
- **NCR jumeau ESM** : `NCR_ESM_BUNDLER_VS_NODE_RUNTIME.md`
- **Mission future** : S6.2 (à planifier post-S7)

## 9. Signature

```
NCR-ID    : NCR_GATE_IMPORTS_BUNDLER_BLINDNESS
OPENED    : 2026-04-27 (Tribunal 3-IA)
STATUS    : STILL_OPEN — issue empiriquement reconfirmée 2026-05-01 (Sprint S8 Vague 2)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```

---

## 10. Reconfirmation empirique (Sprint S8 Vague 2, 2026-05-01)

### 10.1 Vérifications empiriques runtime

| Test | Commande | Résultat |
|------|----------|----------|
| EMP-1 | `Get-Content scripts/gate-imports.ts | Select-Object -First 30` | Commentaire LIMITATION CONNUE présent lignes 2-7 (S6.1 hotfix annotation) |
| EMP-2 | `Select-String "Test 4|child_process|spawn.*node"` dans gate-imports.ts | **1 seule occurrence ligne 5** — c'est le commentaire mention, **pas l'implémentation** |
| EMP-3 | `git log --all --grep "bundler|Test 4"` | **0 commit** post-S6.1 implémentant Test 4 |
| EMP-4 | `(Get-Content scripts/gate-imports.ts | Measure-Object -Line).Lines` | 127 lignes — taille inchangée vs S6.1, pas de Test 4 ajouté |

### 10.2 État du plan §7

| # | Action | Statut S6.1 | Statut 2026-05-01 |
|---|--------|-------------|-------------------|
| 1 | Drafter ce NCR | DONE | DONE |
| 2 | Ajouter avertissement dans gate-imports.ts | DONE | DONE (vérifié EMP-1) |
| 3 | Décision Architecte sur Option A/B/C | PENDING | **PENDING (4 jours sans avancée)** |
| 4 | Implémenter Test 4 (spawn node) | PENDING | **PENDING — empiriquement non fait (EMP-2)** |
| 5 | Audit packages dist/ pour imports sans extension | PENDING | **PENDING** |

### 10.3 Critères STILL_OPEN justifiés

| Critère RESOLVED | État |
|------------------|------|
| Test 4 (spawn node child_process) implémenté | ❌ Annotation seule, code absent |
| Architecte décision Option A/B/C tracée | ❌ Aucune décision tracée |
| Audit dist/ packages pour imports sans extension | ❌ Non fait |
| Régression test pour ce gap | ❌ Aucun |

→ Aucun critère RESOLVED satisfait. Status **STILL_OPEN**.

### 10.4 Observation positive

L'annotation in-code (lignes 2-7 de `gate-imports.ts`) sert de **trace
auto-documentaire active** : tout futur dev/IA lisant le script verra
explicitement la limitation. Cette mitigation partielle est un acquis
S6.1, même sans Test 4. Elle ne RÉSOUT pas le NCR mais réduit le risque
de surprise lors d'un audit futur.

### 10.5 Risques restants

- **R1 — Faux positif gate persistant** : un module avec import sans
  extension passera le gate sous tsx, crashera sous node natif. **Risque
  P1 maintenu**.
- **R2 — Décision Architecte absente** : §7 #3 PENDING depuis 4 jours
  bloque #4 (implémentation). Sans décision A/B/C, le travail ne peut
  démarrer.
- **R3 — Audit dist/ non fait** : §7 #5 — on ignore combien de modules
  sont concrètement vulnérables. Sans audit, on ne peut estimer le
  périmètre du risque.
- **R4 — NCR jumeau ESM** : `NCR_ESM_BUNDLER_VS_NODE_RUNTIME` (P1, OPEN)
  partage le même mécanisme. Coordonner les résolutions.

### 10.6 Closure officielle

```
RECONFIRMATION EMPIRIQUE NCR_GATE_IMPORTS_BUNDLER_BLINDNESS
============================================================
Date            : 2026-05-01 (Sprint S8 Vague 2)
Status final    : STILL_OPEN (transition OPEN → STILL_OPEN
                  pour lever ambiguïté DRAFT vs ouverture active)
Authority       : Claude Code (runtime arbiter Sprint S8 Vague 2)
                  + Francky décisionnaire pour §7 #3 (Option A/B/C)
Evidence anchor : EMP-1..EMP-4 — annotation in-code présente (S6.1 acquis),
                  Test 4 spawn node NON implémenté, 0 commit post-S6.1
                  adressant le gap, 127 lignes gate-imports.ts inchangées
Scope           : gate `gate:imports` aveugle aux bugs ESM Node natif —
                  issue persistante depuis 2026-04-27
Risks           : R1 faux positif P1 maintenu, R2 décision Architecte
                  PENDING, R3 audit dist/ non fait, R4 NCR jumeau ESM
                  à coordonner
Recommandation  : décision Architecte Sprint S9+ §7 #3 (Option A retenue
                  S6.1 sur Test 4 child_process) pour débloquer #4
```

---

## 11. Cross-référence Sprint S9.2 partial + S10 (2026-05-03)

### 11.1 Status NCR inchangé — STILL_OPEN

Cette NCR reste **STILL_OPEN**. Sprint S9 Étape 2 partial closure n'a
pas implémenté Test 4 (spawn node child_process). Aucun changement
de gate `gate:imports` durant S9.2.

### 11.2 Mais : empirique S9.2 valide la nécessité du gate

Sprint S9.2 a CONFIRMÉ EMPIRIQUEMENT que `gate:imports` (sous tsx)
**ne détectait PAS** les bugs ESM Node natif sur 4 packages distincts :

| Package | Bug détecté Node natif | Détecté gate:imports ? |
|---------|------------------------|----------------------|
| canon-kernel | Directory import `./types` | ❌ NON (gate sous tsx) |
| orchestrator-core | exports → TS source + type:module manquant | ❌ NON |
| signal-registry | main → TS source, pas exports | ❌ NON |
| sovereign-engine | JSON imports sans `with { type: 'json' }` | ❌ NON (encore S10) |

→ 4 root causes ESM Node natif distincts, 0 détection gate:imports.
**Validation empirique R1 § R1 — faux positif P1 confirmé répétitivement**.

### 11.3 Cross-référence Sprint S9.2 partial closure

- 3 packages désormais Node native importable (canon-kernel, orchestrator-core, signal-registry)
- Mais aucun outil CI ne valide cette compliance — si quelqu'un casse un import sans extension demain, gate:imports passera silencieusement
- Risque régression silencieuse **maintenu**

### 11.4 Cross-référence Sprint S10 (continuation)

Sprint S10 prévu doit inclure :
1. Fix 3 packages restants (sovereign-engine + omega-segment-engine + integration-nexus-dep) — voir `S10_RUNTIME_ESM_PHASE2_PLAN.md`
2. **Test 4 child_process spawn node** — implémentation finale gate:imports (Option A §6 du présent NCR)
3. Audit `dist/` exhaustif post-Sprint S10 fixes
4. Décision CI matrix multi-CWD (cross-NCR avec NCR_GATE_IMPORTS_PATH_BUG R3)

### 11.5 Doctrine

Les 4 root causes empiriques distincts détectés Sprint S9.2
**renforcent** la validité de cette NCR. Le pattern "tsc strict +
vitest bundler + tsx bundler" laisse 4 classes de bugs ESM Node natif
indétectables sans Test 4 child_process spawn node.

→ **Priorité Sprint S10** : Test 4 implémentation OBLIGATOIRE après
fixes 3 packages restants, pour valider non-régression future ESM Node
natif sur l'ensemble du graphe runtime.

```
CROSS-REF SPRINT S9.2 + S10 — NCR_GATE_IMPORTS_BUNDLER_BLINDNESS
==================================================================
Date            : 2026-05-03
Status          : STILL_OPEN (inchangé, validation empirique renforcée)
Severity        : P1 (maintenue, validation empirique S9.2 = 4 bugs distincts)
Anchors empiriques nouveaux : 4 root causes ESM Node natif détectés S9.2
                              (canon-kernel + orchestrator-core + signal-registry
                              + sovereign-engine), 0 détection gate:imports
NEXT            : Sprint S10 — fix 3 packages restants + Test 4 implémentation
Cross-refs      : S9_STEP2_PARTIAL_CLOSURE_REPORT, S10_RUNTIME_ESM_PHASE2_PLAN,
                  NCR_ESM_BUNDLER_VS_NODE_RUNTIME §12 partial FIX_VALIDATED_SCOPED
```
