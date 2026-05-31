# PROMPT CLAUDE CODE — OMEGA METROLOGY TOTALE (scan mathématique « SpaceX-grade »)

> À copier-coller à Claude Code. Objectif : **mesurer ABSOLUMENT TOUT ce qui est mesurable** dans OMEGA — du nombre de caractères à la latence de transmission inter-modules — et produire un dossier de métrologie chiffré, reproductible, machine-lisible. Style ingénierie aérospatiale : aucune métrique au pif, chaque chiffre = commande + sortie + horodatage.

---

```
J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.
MODE : MESURE READ-ONLY. Aucun patch fonctionnel. Scripts de mesure autorisés UNIQUEMENT sous scripts/metrology/ et committés via le wrapper EMP-10 (classe tooling). Zéro modification de code moteur. Sync git avant toute action.

MISSION : METROLOGIE TOTALE OMEGA — scan mathématique exhaustif de tout ce qui est mesurable, par fichier / fonction / module / package / repo, + métriques de liaison et de transmission inter-modules. Reproductible (chaque chiffre relié à sa commande). Sortie machine-lisible (JSON + CSV) + dashboard humain (MD).

═══════════════════════════════════════════════════════════
DOMAINES DE MESURE (mesurer TOUS, ne rien omettre)
═══════════════════════════════════════════════════════════

D1 — VOLUMÉTRIE STATIQUE (par fichier, agrégé par module/package/repo)
- nb fichiers (.ts/.test.ts/.json/.md), taille en octets, total + moyenne + médiane + écart-type.
- LOC : lignes totales / code / commentaires / vides (cloc ou tokei).
- nb CARACTÈRES : total, par fichier, moyenne/ligne, max ligne (longueur).
- nb fonctions, classes, interfaces, types, enums, exports, imports.
- longueur de fonction : LOC moyenne/médiane/max ; nb paramètres moyen/max.
- profondeur d'imbrication (nesting) max et moyenne.
- complexité cyclomatique par fonction (moyenne / médiane / p95 / max) — eslint complexity ou ts-morph.
- ratio commentaires/code ; densité de types ; nb de `as any`/`as unknown as`/`@ts-ignore`/`@ts-nocheck`.

D2 — GRAPHE DE DÉPENDANCES & LIAISONS (madge ou ts-morph)
- nb de nœuds (modules) et d'arêtes (imports) ; densité du graphe.
- fan-in (Ca, couplage afférent) et fan-out (Ce, couplage efférent) par package/module.
- instabilité I = Ce/(Ca+Ce) par module ; abstraction A ; distance à la séquence principale D = |A+I-1|.
- profondeur max du DAG ; cycles (doit être 0 — lister si >0).
- hubs / SPOF (top fan-in), feuilles, modules isolés (fan-in=fan-out=0 → orphelins).
- matrice de dépendance package×package (CSV).

D3 — TRANSMISSION INTER-MODULES (le cœur « SpaceX »)
Statique :
- pour chaque arête cross-module : nb de symboles importés, nb de sites d'appel.
- taille des CONTRATS d'interface clés sérialisés en JSON (octets + nb champs + profondeur) : IntentPack, GenesisPlan, Scene, ForgePacket, ProsePack, SovereignForgeResult, ScribeOutput, MacroSScore. (sérialiser un exemplaire représentatif → mesurer bytes/champs.)
- "débit de contrat" : taille payload × fréquence d'appel estimée.
Runtime (harness de mesure dédié, scripts/metrology/transmission-bench.ts) :
- instrumenter les frontières inter-modules (wrapper de timing autour des appels publics : runScribe, executePipeline, judgeAestheticV3, segmentPlan, weave, etc.).
- mesurer latence par appel (min/moyenne/p50/p95/max sur N itérations), en ns/µs.
- débit (appels/s), volume de données transmis (octets/appel), allocation mémoire/appel.
- chaîne complète : temps de traversée bout-en-bout du pipeline (genesis→scribe→…→evidence) décomposé par étage (waterfall de latence).
- NE PAS appeler de LLM réel pour ces mesures (utiliser mocks déterministes) sauf GO explicite (coût — llm-cost-guard).

D4 — TESTS & COUVERTURE
- nb tests par package (pass/fail/skip), durée par suite (ms), tests les plus lents (top 20).
- couverture lignes/branches/fonctions/statements (%) par package (vitest --coverage v8).
- ratio test:code (LOC tests / LOC src) ; modules à couverture <X%.

D5 — BUILD & PERF DE COMPILATION
- temps TSC par package (`tsc --noEmit`, mesuré) + total cross-package ; mémoire pic.
- nb d'erreurs/warnings TSC par package ; temps d'incrémental.
- taille des artefacts dist/ par package (octets) ; nb de fichiers générés.

D6 — TYPAGE & SÛRETÉ
- nb total + par package : `any` explicites, casts, `@ts-ignore`, non-null `!`, `// eslint-disable`.
- % de fonctions exportées typées explicitement (retour) ; nb génériques.
- strictness effective (flags tsconfig actifs par package).

D7 — GIT / CHURN / ÂGE
- par fichier/module : date création, dernier commit, nb de commits (churn), nb d'auteurs.
- hot-spots = churn × complexité cyclomatique (top 20 = zones à risque).
- âge moyen du code par package ; fichiers non touchés depuis >90j (candidats legacy).

D8 — DUPLICATION (jscpd ou équivalent)
- % de duplication intra/inter-package ; nb de clones ; plus gros clones (LOC).
- fonctions à signature identique cross-package (candidats doublons IA).

D9 — QUALITÉ PROSE (runtime, par moteur, si exécutable sans coût LLM excessif)
- par moteur (scribe-engine / sovereign K2 / src/scribe si exécutable) sur un brief identique mocké :
  - mots générés, mots/scène, caractères, ratio dialogue, longueur de phrase (moyenne/variance, f1/f1a).
  - scores S-Oracle V2 (composite + 5 macro-axes ECC/RCI/SII/IFI/AAI) + GB V1 + MS V2.
  - déterminisme : même seed → même hash SHA256 (oui/non) ; variance sur N runs.
  - vitesse de génération (mots/s), coût (tokens) si LLM, temps total.

D10 — RESSOURCES RUNTIME
- empreinte mémoire par module/pipeline (process.memoryUsage avant/après), allocations.
- temps CPU par étage ; éventuels leaks (mémoire croissante sur N itérations).

═══════════════════════════════════════════════════════════
OUTILLAGE AUTORISÉ
═══════════════════════════════════════════════════════════
- Statique : tokei/cloc, madge (graphe deps), ts-morph (AST : fonctions/complexité/types), eslint (complexity), jscpd (duplication). Installer en devDeps temporaires si absents (documenter).
- Dynamique : scripts sous scripts/metrology/*.ts (timing via performance.now()/process.hrtime.bigint(), memoryUsage). Mocks déterministes pour tout LLM.
- Git : git log --numstat, git shortlog, scripts d'agrégation churn.
- Tout script de mesure committé via commit-with-tests.ps1 (tooling), JAMAIS de modif de code moteur.

═══════════════════════════════════════════════════════════
LIVRABLES (docs/audit/metrology/)
═══════════════════════════════════════════════════════════
1. OMEGA_METROLOGY_DATASET.json — toutes les mesures brutes, machine-lisible (par fichier/module/package + agrégats repo).
2. OMEGA_METROLOGY_BY_PACKAGE.csv — 1 ligne/package × toutes les colonnes (LOC, fns, complexité, fan-in/out, I, tests, couverture, casts, churn, dist size…).
3. OMEGA_TRANSMISSION_MATRIX.csv — arêtes inter-modules : source→cible, symboles, sites d'appel, payload bytes, latence (si runtime).
4. OMEGA_METROLOGY_DASHBOARD.md — synthèse humaine : top/extrêmes (plus gros module, fonction la plus complexe, test le plus lent, fan-in max, latence d'étage la plus haute, duplication max, hot-spot #1), + waterfall de latence du pipeline complet, + 10 chiffres-clés OMEGA.
5. OMEGA_METROLOGY_METHOD.md — méthode : chaque métrique → commande exacte + version d'outil + horodatage + limites (ce qui n'a pas pu être mesuré et pourquoi).

═══════════════════════════════════════════════════════════
RÈGLES & PASS
═══════════════════════════════════════════════════════════
- Chaque chiffre = [MESURE] (commande+sortie) ; toute estimation = [HYPOTHÈSE] explicite ; tout dérivé = [RECONSTRUCTION].
- Aucune métrique inventée. Si un domaine n'est pas mesurable (ex : latence sans harness exécutable), le dire dans METHOD.md, ne pas combler.
- Déterminisme respecté ; aucun appel LLM payant sans GO.
- VERDICT final PASS/FAIL : PASS si D1-D8 complets + D9/D10 livrés ou explicitement marqués "runtime requis + GO" ; dataset JSON + CSV + dashboard produits ; chaque chiffre reproductible.
- Scope : packages/ + src/ (monolithe) + gateway/ ; exclure node_modules/dist/archives (mais COMPTER les archives à part en volumétrie brute, sans complexité).

COMMENCE par scripts/metrology/scan-static.ts (D1-D2-D6-D8) qui produit le dataset JSON, puis transmission-bench.ts (D3 runtime), puis l'agrégation CSV + dashboard. Sync git d'abord. Livre au fil de l'eau (un domaine = un commit tooling gaté).
```

---
**Note d'intégration** : ce scan = annexe métrologique de la roadmap archéologique (s'insère entre Phase 2 ADN et Phase 4 bench). Il fournit les **chiffres durs** (volumétrie, liaisons, transmission, churn) qui objectivent les verdicts de fusion/archivage. Read-only sauf scripts `scripts/metrology/` (gatés).
