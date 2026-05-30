# OMEGA — CONTRÔLE TOTAL DU REPO (audit empirique millimétrique)
**Date** : 2026-05-29 · **HEAD** : `4c34d2c0` (phase-r-dispatcher-v33, synchro origin) · **Standard** : NASA-Grade L4
**Nature** : empirique exécuté + synthèse · **Périmètre** : 45 dossiers `packages/` (actifs + frozen + cœur)
**Axes** : Vérité · Interconnexion · Efficacité · Faiblesse (couvre interopérabilité/relation)

> **Balisage SSOT** : `[MESURE]` = commande exécutée + sortie ce jour · `[RECONSTRUCTION]` = dérivé par grep/script (peut inclure du bruit : tests, commentaires) · `[HYPOTHÈSE]` = interprétation à valider. Aucune affirmation sans l'un des trois.

---

## 0. CONTROL_BEFORE_WRITE (pré-vol)
- **Domaine** : audit transverse (lecture seule). **Aucune écriture de code, aucun commit de code.** Livrables = rapport + dashboard dans `outputs/`.
- **Risque de redondance** : audits antérieurs existent (γ Tribunal, β autopsie, repo map). Ce contrôle les **rafraîchit empiriquement** (mesures du jour, pas relecture) → non redondant : les chiffres datent de 2026-05-29.
- **Risque de mesure vide** : nul — on mesure l'état réel (TSC/tests/grep/graphe), pas un module non câblé.
- **Verdict pré-vol** : `GO_WRITE` (livrable doc-only).

## 1. ANCHOR_PRE_FLIGHT `[MESURE]`
| Élément | Valeur |
|---|---|
| node / npm / tsc | v24.12.0 / 11.6.2 / 5.9.3 |
| Ollama | UP (200), qwen3:32b présent |
| git-lfs | 3.7.1 présent (migration EMP-13 active) |
| Sync origin | ahead 0 / behind 0 (propre) |
| Working tree | 21 entrées **non trackées**, **100 % logs/patches** (`P311_*`, `phase-c/*.log`, 1 csv) — **zéro source modifiée** |

Verdict ANCHOR = **PASS** (pas de FAIL_BLOCKING).

---

## 2. CHIFFRES MAÎTRES `[MESURE]` (script `depgraph.js` + sweeps)
| Métrique | Valeur | Source |
|---|---|---|
| Dossiers `packages/` | 45 | `Get-ChildItem` |
| Packages npm réels (avec `package.json`) | **41** | depgraph.js |
| Dossiers SANS `package.json` | 4 : `hostile, sbom, schemas, trust-version` | depgraph.js |
| Fichiers `.ts` (hors node_modules/.d.ts) | **1 774** | depgraph.js |
| LOC TypeScript totales | **327 822** | depgraph.js |
| Fichiers de test `*.test.ts` | **660** | grep |
| Cycles de dépendances internes | **0** | depgraph.js (DFS) |
| Packages FROZEN/SEALED marqués | 2 : `@omega/genome`, `@omega/mycelium` | depgraph.js |
| TSC cross-package (41 pkgs) | **100 % PASS, 0 erreur** | tsc_sweep |
| Tests sovereign-engine | **2522 pass / 56 skip / 0 FAIL** (236 fichiers, 4,8 s) | vitest run |

---

## 3. AXE — VÉRITÉ (doc ↔ code)
**Verdict axe : PASS_PARTIAL.** La compilation et les tests confirment la solidité ; deux claims doctrinaux sont contredits par le code.

1. **`[MESURE]` Compilation** : sweep TSC sur les 41 packages → **tous exit 0, 0 erreur TS**. Le claim « NASA-Grade, TypeScript strict » tient **au niveau compilation**.
2. **`[MESURE]` Tests cœur** : sovereign-engine 2522 pass / 0 fail (mémoire annonçait 2463 → a grandi, cohérent, aucune régression). ✅
3. **`[RECONSTRUCTION]` ⚠️ Claim « zéro any » FAUX** : **86 `as any` en code de production** (239 au total dont 153 en test). Top prod : sovereign-engine 57, scribe-engine 19, truth-gate 6. → Le standard « Zéro any » (CLAUDE.md) est **aspirationnel, non tenu**. Dette de typage réelle.
4. **`[RECONSTRUCTION]` Claim « Pas de TODO sans issue »** : **43 TODO/FIXME/HACK**. À recouper avec des références d'issues (probablement plusieurs orphelins).
5. **`[HYPOTHÈSE]` Marqueur FROZEN** : la doctrine cite « sentinel FROZEN » mais vise `gateway/sentinel/`, pas `packages/sentinel-judge` (qui n'a pas le marqueur). Nuance de nommage, pas une violation.

## 4. AXE — INTERCONNEXION / INTEROPÉRABILITÉ / RELATION
**Verdict axe : PASS (structure saine) avec risques SPOF.**

1. **`[MESURE]` Graphe = DAG acyclique** : **0 cycle** sur 41 packages → architecture en couches propre, pas de dépendance circulaire. ✅ (point fort majeur)
2. **`[MESURE]` Hubs critiques (single point of failure)** :
   - `@omega/canon-kernel` → **14 dépendants** (toute modif ripple sur 14 packages)
   - `@omega/orchestrator-core` → 10 · `@omega/genesis-planner` → 6 · `@omega/scribe-engine` → 4
   - **`[HYPOTHÈSE]`** : canon-kernel est le SPOF n°1. Toute évolution doit passer par test cross-package complet (cf cascade feuille→parent déjà documentée en mémoire).
3. **`[MESURE]` 12 orphelins** (0 dép interne entrante ET sortante) : integration-nexus-dep, mod-narrative, mycelium-bio, aggregate-dna, bridge-ta-mycelium, observability, segment-engine, **oracle**, plugin-gateway, plugin-sdk, search, sentinel-judge. Certains sont des entry-points légitimes (runner, gateway), d'autres des candidats mort/isolement (voir Efficacité).
4. **`[MESURE]` 4 dossiers non câblés** (`hostile, sbom, schemas, trust-version`) sans `package.json` → ne participent pas au graphe npm. Statut ambigu à clarifier (data ? stubs ? archives ?).

## 5. AXE — EFFICACITÉ / OPTIMISATION
**Verdict axe : PASS_PARTIAL.** Concentration monolithique + un package mort.

1. **`[MESURE]` ⚠️ Concentration** : `sovereign-engine` = **151 688 LOC = 46 % du repo**. Le reste des 40 packages se partage 54 %. → monolithe de fait ; cohésion interne élevée mais surface de risque concentrée.
2. **`[MESURE]` ⚠️ Package mort `@omega/oracle`** : **0 import externe** (le scoring réel vit dans `sovereign-engine/src/oracle/`). → dead weight : soit le supprimer, soit migrer l'oracle interne vers le package dédié (réduction duplication).
3. **`[RECONSTRUCTION]` Étalement 14d** : **212 fichiers** touchent `Emotion14/14d/tension_14d`. Inclut le `tension_14d` vivant (oracle) ET le canon `target_14d` GARAGE/DORMANT. → surface large pour un concept partiellement dormant ; risque de confusion vivant/dormant (déjà tracé : NCR_EMOTION14_CANON_DRIFT).
4. **`[MESURE]` Densité de test** : 660 test files / 1774 src = ~37 % → correcte, mais inégale (sovereign-engine très couvert, périphérie à vérifier).

## 6. AXE — FAIBLESSE (bugs latents, dette, risques)
**Verdict axe : PASS_PARTIAL — dette identifiée, rien de bloquant.**

| # | Faiblesse | Mesure | Sévérité |
|---|---|---|---|
| F1 | `as unknown as` (double-cast, interdit par doctrine Gemini) | **126** occurrences | Moyenne |
| F2 | `as any` en prod (viole « zéro any ») | **86** | Moyenne |
| F3 | TODO/FIXME/HACK | **43** | Basse |
| F4 | SPOF canon-kernel (14 dépendants) | graphe | Moyenne (risque cascade) |
| F5 | Package mort `@omega/oracle` | 0 import | Basse |
| F6 | 4 dossiers sans `package.json` (statut flou) | hostile/sbom/schemas/trust-version | Basse |
| F7 | Drift working-tree : 21 logs non trackés | git status | Basse (housekeeping → `.gitignore`) |
| F8 | `eslint-disable` | 6 | Basse |
| F9 | `@ts-nocheck`/`@ts-ignore` | 1 / 1 | **Très basse (excellent)** |

---

## 7. VERDICT GLOBAL
```
Statut       : PASS_PARTIAL (repo sain, dette de typage + housekeeping identifiés)
Confiance    : Haute (mesures empiriques du jour, balisées SSOT)
Compilation  : 41/41 packages TSC PASS, 0 erreur
Tests cœur   : sovereign-engine 2522 pass / 0 fail
Architecture : DAG acyclique (0 cycle) — point fort structurel majeur
```
**Forces** : 0 cycle de dépendances ; TSC 100 % vert cross-package ; cœur testé (2522, 0 fail) ; hygiène directives masquantes quasi nulle (`@ts-nocheck`=1) ; sync origin propre ; V2.3-A clos proprement.

**Faiblesses (≥2, doctrine)** :
1. **« Zéro any » non tenu** : 86 `as any` prod + 126 `as unknown as` = dette de typage réelle, concentrée sovereign-engine/scribe-engine.
2. **Concentration monolithique** : sovereign-engine = 46 % du code → surface de risque et SPOF combinés avec canon-kernel (14 dépendants).
3. **Package mort `@omega/oracle`** + 4 dossiers non câblés = bruit structurel.

**Risques restants** : (a) une modif de canon-kernel sans test cross-package complet = cascade silencieuse ; (b) la dette `as any`/`as unknown as` masque des erreurs de type au runtime ; (c) 43 TODO non reliés à des issues.

**Actions recommandées (non exécutées — décision Architecte)** :
- P1 : `.gitignore` les 21 logs `P311_*`/`phase-c/*` (housekeeping immédiat, zéro risque).
- P2 : trancher `@omega/oracle` (supprimer OU migrer l'oracle interne) + statuer les 4 dossiers sans `package.json`.
- P3 : campagne ciblée de réduction `as unknown as` (126) puis `as any` prod (86), package par package, sous wrapper EMP-10.
- P4 : recouper les 43 TODO avec des issues, fermer les orphelins.

---
*Données brutes : `outputs/audit/dep_graph.json`, `tsc_sweep.json`, `depgraph.js`. Dashboard : `OMEGA_AUDIT_DASHBOARD.html`.*
