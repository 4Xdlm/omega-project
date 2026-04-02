# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — CLAUDE CODE MEGA-PROMPT — P1 NETTOYAGE STRUCTURAL
#   "Vérité vérifiée — Double contrôle — Prudence maximale"
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   Date         : 2026-04-02
#   HEAD entrant : 97306add (tag omega-p0-assainissement-v1)
#   Branche      : phase-r-metrology-rebuild
#   Standard     : NASA-Grade L4 / DO-178C Level A
#   Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   MISSION : Exécuter le nettoyage structural P1.
#   5 actions CODE (migration/archivage) + 4 actions MESURE (scans/audits)
#
#   RÈGLE CARDINALE :
#   VÉRIFIER 2 FOIS AVANT CHAQUE MODIFICATION.
#     1. LIRE le fichier (lignes exactes à modifier)
#     2. CHERCHER tous les imports/exports du fichier ciblé dans tout le repo
#     3. AFFICHER avant → après
#     4. MODIFIER seulement si ZÉRO impact non prévu
#     5. RELIRE après modification
#     6. LANCER les tests après chaque action CODE
#     7. Si DOUTE → NE PAS MODIFIER, marquer [DOUTE], passer à la suite
#
#   AUCUNE modification si un import inattendu est trouvé.
#   Tests DOIVENT rester GREEN (2022 passed) après chaque étape.
#
# ═══════════════════════════════════════════════════════════════════════════════

# CHEMINS
REPO     = C:\Users\elric\omega-project
SE_SRC   = packages\sovereign-engine\src
SE_TESTS = packages\sovereign-engine\tests
PY311    = C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe


# ═══════════════════════════════════════════════════════════════════════════════
# CORRECTIONS CRITIQUES — CE QUE LES IAs ONT DIT DE FAUX
# LIRE CETTE SECTION AVANT TOUTE ACTION
# ═══════════════════════════════════════════════════════════════════════════════

## ⛔ NE PAS ARCHIVER prompt-assembler-v2.ts
Raison : TOUJOURS importé par :
  - engine.ts:40 → import { buildSovereignPrompt }
  - index.ts:94 → export { buildSovereignPrompt }
  - orchestrator/scribe-orchestrator.ts:39 → import { buildSovereignPrompt }
Le supprimer CASSERAIT le build.

## ⛔ NE PAS ARCHIVER les 3 fichiers polish (musical-engine, anti-cliche, signature)
Raison : TOUJOURS utilisés par le pipeline OFFLINE :
  - pipeline/sovereign-pipeline.ts:34 → import { applyMusicalPolishOffline }
  - pipeline/sovereign-pipeline.ts:34 → import { sweepClichesOffline }
  - pipeline/sovereign-pipeline.ts:36 → import { enforceSignatureOffline }
  - index.ts:145-147 → re-exports
Le NO-OP a été prouvé dans engine.ts (LIVE) mais ces fonctions sont
ACTIVES dans sovereign-pipeline.ts (OFFLINE benchmark).
Les supprimer CASSERAIT le pipeline offline.

## ✅ PEUT ARCHIVER ollama-provider.ts
Raison : 0 imports actifs trouvés. BLOC7 a rejeté le pipeline hybride.
MAIS : vérifier une dernière fois avant d'agir (double contrôle).

## ⚠️ s-score.ts migration = COMPLEXE
7 fichiers importent depuis s-score.ts :
  - engine.ts:52 → type MacroSScore
  - index.ts:112,192,202 → exports computeSScore, computeMacroSScore, type MacroSScore
  - types.ts:543 → export type MacroSScore
  - aesthetic-oracle.ts:35 → computeSScore + computeMacroSScore + type MacroSScore
  - targeted-patch.ts:20 → type MacroSScore
La migration doit être faite CHIRURGICALEMENT.


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 0 — SNAPSHOT ÉTAT INITIAL
# ═══════════════════════════════════════════════════════════════════════════════

1. Capturer HEAD : `git rev-parse HEAD` → attendu 97306add
2. Lancer tests : `cd packages\sovereign-engine && npx vitest run`
3. Noter le nombre exact de tests passing (attendu : 2022)
4. Si tests ne passent PAS → STOP TOTAL

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P1-01 — MIGRER MacroSScore + computeMacroSScore HORS DE s-score.ts
# Complexité : HAUTE — 7 fichiers impactés
# ═══════════════════════════════════════════════════════════════════════════════

## Contexte
s-score.ts est marqué @deprecated mais 7 fichiers l'importent.
Il contient 2 choses vivantes :
  1. Interface MacroSScore (type)
  2. Fonction computeMacroSScore (calcul)

La stratégie : déplacer MacroSScore vers un fichier dédié,
déplacer computeMacroSScore vers macro-axes.ts (son lieu naturel).

## PHASE A — Inventaire exhaustif (LIRE, PAS MODIFIER)

Lire s-score.ts en entier (158 lignes). Identifier :
  - Ligne exacte de `export interface MacroSScore`
  - Ligne exacte de `export function computeMacroSScore`
  - Ligne exacte de `export function computeSScore`
  - Tous les imports utilisés par chaque fonction

Lire chaque fichier importateur :
  1. engine.ts:52 → `import type { MacroSScore }` (TYPE seul)
  2. index.ts:112 → `export { computeSScore }`
  3. index.ts:192 → `export { computeMacroSScore }`
  4. index.ts:202 → `export type { MacroSScore }`
  5. types.ts:543 → `export type { MacroSScore }`
  6. aesthetic-oracle.ts:35 → `import { computeSScore, computeMacroSScore, type MacroSScore }`
  7. targeted-patch.ts:20 → `import type { MacroSScore }`

VÉRIFIER que la liste est EXACTE. Si un 8ème fichier importe → DOCUMENTER.

## PHASE B — Créer oracle/macro-score-types.ts (NOUVEAU FICHIER)

Créer src/oracle/macro-score-types.ts contenant :
  - L'interface MacroSScore (copiée depuis s-score.ts)
  - Les imports nécessaires (MacroAxesScores depuis macro-axes.ts)
  - Un commentaire : "Migré depuis s-score.ts le 2026-04-02 (P1-01)"

## PHASE C — Déplacer computeMacroSScore vers macro-axes.ts

Lire macro-axes.ts pour comprendre sa structure.
Ajouter computeMacroSScore EN BAS du fichier (après les exports existants).
Importer MacroSScore depuis le nouveau macro-score-types.ts.
Ajouter un commentaire : "Migré depuis s-score.ts le 2026-04-02 (P1-01)"

## PHASE D — Mettre à jour les 7 importateurs

Pour CHAQUE fichier, modifier l'import :

| Fichier | Avant | Après |
|---------|-------|-------|
| engine.ts:52 | `from './oracle/s-score.js'` | `from './oracle/macro-score-types.js'` |
| types.ts:543 | `from './oracle/s-score.js'` | `from './oracle/macro-score-types.js'` |
| targeted-patch.ts:20 | `from '../oracle/s-score.js'` | `from '../oracle/macro-score-types.js'` |
| aesthetic-oracle.ts:35 | `from './s-score.js'` | Séparer en 2 imports : `computeSScore from './s-score.js'` + `computeMacroSScore from './macro-axes.js'` + `type MacroSScore from './macro-score-types.js'` |
| index.ts:192 | `from './oracle/s-score.js'` | `from './oracle/macro-axes.js'` |
| index.ts:202 | `from './oracle/s-score.js'` | `from './oracle/macro-score-types.js'` |
| index.ts:112 | `from './oracle/s-score.js'` | GARDER (computeSScore reste dans s-score.ts) |

## PHASE E — Marquer s-score.ts comme LEGACY TERMINAL

Ajouter en tête de s-score.ts :
```typescript
/**
 * @deprecated TERMINAL — Ne contient plus que computeSScore (legacy V1).
 * MacroSScore → oracle/macro-score-types.ts
 * computeMacroSScore → oracle/macro-axes.ts
 * Migration P1-01 du 2026-04-02.
 */
```

## PHASE F — Tests
`npx vitest run` → DOIT rester 2022 passed.
Si FAIL → `git checkout .` et marquer [FAIL P1-01].


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P1-02 — ARCHIVER ollama-provider.ts
# Complexité : FAIBLE — 0 imports confirmés
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
Chercher TOUTE mention de "ollama" dans le codebase :
```python
# Utiliser le script _search.py avec pattern "ollama"
```
Résultat attendu : 0 imports actifs (non commentés).
P0 a déjà archivé hybrid-provider.ts dans runtime/archive/.
ollama-provider.ts est le 2ème fichier hybride rejeté (BLOC7).

## MODIFICATION (si 0 imports actifs confirmés) :
```powershell
Move-Item "src\runtime\ollama-provider.ts" "src\runtime\archive\ollama-provider.ts"
```

## Si un import actif est trouvé → [DOUTE — ollama gardé]
## APRÈS : Tests.

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P1-03 — DOCUMENTER LE STATUT DES FICHIERS NON ARCHIVABLES
# ═══════════════════════════════════════════════════════════════════════════════

Créer docs/adr/ADR_P1_NON_ARCHIVABLE.md documentant :

```markdown
# ADR: Fichiers évalués pour archivage — P1

## prompt-assembler-v2.ts — NON ARCHIVABLE
Raison : Toujours importé par engine.ts:40, index.ts:94, scribe-orchestrator.ts:39
Fonction utilisée : buildSovereignPrompt (pipeline V2, pas encore migré vers V4 partout)
Action future : Migrer engine.ts et scribe-orchestrator vers prompt-assembler-v4
Prérequis : Vérifier que V4 expose la même interface que buildSovereignPrompt

## polish/ (musical-engine, anti-cliche-sweep, signature-enforcement) — NON ARCHIVABLE
Raison : Utilisés par sovereign-pipeline.ts (OFFLINE benchmark)
Fonctions : applyMusicalPolishOffline, sweepClichesOffline, enforceSignatureOffline
Note : Dans engine.ts (LIVE), les appels sont commentés (NO-OP prouvé Sprint 2)
       Mais dans sovereign-pipeline.ts (OFFLINE), ils sont ACTIFS
Action future : Décider si le pipeline OFFLINE doit aussi les désactiver

## compat/version-guard.ts — NON ARCHIVABLE
Raison : Re-exporté depuis index.ts (API publique du package)
Fonction : assertVersion2

## compat/brief-compat-guard.ts — NON ARCHIVABLE (DOUTE P0)
Raison : Importé par test ssot (découvert en P0)
```

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION P1-04 — NETTOYER LES ENV VARS HYBRID RESTANTES
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier :
Chercher OMEGA_HYBRID_MODE dans tout le codebase.
Identifier les fichiers et lignes exactes.

## MODIFICATION :
Pour chaque occurrence dans du code ACTIF (pas commenté) :
  Ajouter un commentaire expliquant que hybrid est rejeté :
  `// BLOC7: hybrid mode rejeté (3/3 IAs + Francky). Env var conservée pour compatibilité.`

NE PAS supprimer le check — juste documenter pourquoi il est là.
Supprimer le check pourrait casser des configurations existantes.

## APRÈS : Tests.


# ═══════════════════════════════════════════════════════════════════════════════
# ACTIONS MESURE P1-05 à P1-09 — Lecture pure, 0 modification code
# ═══════════════════════════════════════════════════════════════════════════════

# ── P1-05 : SCAN GATEWAY PROFONDEUR ──────────────────────────────────────────
# Livrable : docs/irm/inv/P1_GATEWAY_FULL_SCAN.md

Le deep scan INV-04 existe déjà (33 KB). Le compléter avec :

1. Lire TOUS les fichiers non encore scannés de gateway/src/
   Fichiers à lire (par chunks) :
   - gateway.ts, orchestrator.ts, ledger.ts, policy.ts, profiles.ts,
     registry.ts, snapshot.ts, types.ts, index.ts
   - gates/canon_engine.ts, emotion_gate.ts, truth_gate.ts, ripple_engine.ts
   - hardening/decision_trace.ts, governance.ts, hardening_checks.ts

2. Pour chaque fichier, produire une FILE_CARD :
   ```
   path | role | exports | imports | consumers | criticality | lifecycle
   ```

3. Identifier : qui consomme gateway/ en dehors de gateway/ ?
   Chercher dans TOUT le repo les imports de "gateway/" ou "@omega/gateway".

4. Produire un VERDICT : gateway est-il utilisé par le pipeline live ?
   S'il n'est pas utilisé → confirmer "SEALED, fondation Phase V".
   S'il est utilisé → documenter le chemin d'appel.

Écrire dans docs/irm/inv/P1_GATEWAY_FULL_SCAN.md

# ── P1-06 : ÉVALUER LES 11 PACKAGES ISOLÉS ──────────────────────────────────
# Livrable : docs/irm/inv/P1_PACKAGE_EVALUATION.md

Pour CHAQUE package dans la liste des 11 "à évaluer" :
  decision-engine, headless-runner, mod-narrative, omega-aggregate-dna,
  omega-observability, omega-p0, omega-segment-engine, oracle,
  plugin-gateway, plugin-sdk, search

1. Lire le package.json (si existe)
2. Lire le README.md ou index.ts (si existe)
3. Compter les fichiers .ts
4. Chercher si QUELQU'UN dans le repo importe ce package
5. Croiser avec la roadmap (est-il mentionné dans les phases futures ?)

Produire pour chaque package :
```markdown
### [package-name]
- Fichiers .ts : N
- Importé par : [liste] ou AUCUN
- Mentionné dans roadmap : OUI/NON
- Verdict : GARDER / ARCHIVER / À ÉVALUER PLUS TARD
- Raison : [1 phrase]
```

Écrire dans docs/irm/inv/P1_PACKAGE_EVALUATION.md

# ── P1-07 : CONCORDANCE SCORERS (si données disponibles) ────────────────────
# Livrable : docs/irm/inv/P1_SCORER_CONCORDANCE.md

Chercher dans les sessions de bench :
  packages/sovereign-engine/sessions/

Pour chaque session ayant des résultats avec plusieurs scorers,
comparer les verdicts GB V1 vs V3 vs Ridge V2 (si disponibles).

Si AUCUNE session n'a les 3 scorers simultanément :
  Documenter : "[DONNÉES INSUFFISANTES — bench multi-scorer requis en R5]"
  Proposer le protocole pour R5.

Écrire dans docs/irm/inv/P1_SCORER_CONCORDANCE.md

# ── P1-08 : COST MODEL AFFINÉ ───────────────────────────────────────────────
# Livrable : docs/irm/inv/P1_COST_MODEL.json

Affiner le budget INV-03 avec les données réelles si disponibles.
Chercher dans les sessions de bench : token counts, API usage logs.

Si aucune donnée réelle → produire le modèle théorique affiné :
```json
{
  "model": "claude-sonnet-4-20250514",
  "pipeline_version": "V4 post-P0",
  "changes_from_INV03": ["P0 polish imports commentés → 0 impact sur appels",
                          "weight-calibrator aligné → 0 impact sur appels"],
  "estimated_calls_per_run": 34,
  "estimated_cost_per_run_usd": 0.21,
  "reduction_target_P2": 15,
  "reduction_target_cost_P2": 0.10,
  "note": "INV-03 estimation validée. Pas de données réelles de logs disponibles."
}
```

Écrire dans docs/irm/inv/P1_COST_MODEL.json

# ── P1-09 : REGRESSION RISK MATRIX V2 (post-P0) ────────────────────────────
# Livrable : docs/irm/inv/P1_REGRESSION_RISK_V2.json

Recalculer la matrice de risque INV-10 APRÈS les modifications P0 :
  - engine.ts a changé (imports ajoutés) → vérifier fan-out
  - duel-engine.ts a changé → vérifier fan-in/out
  - weight-calibrator.ts a changé → vérifier
  
Utiliser le même script Python que INV-10 mais sur le code POST-P0.
Comparer avec INV-10 : y a-t-il eu une amélioration ou une dégradation ?

Écrire dans docs/irm/inv/P1_REGRESSION_RISK_V2.json


# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT FINAL + VÉRIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

## Tests finaux
```powershell
Set-Location C:\Users\elric\omega-project\packages\sovereign-engine
npx vitest run
```
Résultat attendu : 2022 passed, 0 FAIL.

## Nettoyer scripts temporaires
```powershell
Remove-Item "C:\Users\elric\omega-project\docs\irm\_search.py" -ErrorAction SilentlyContinue
Remove-Item "C:\Users\elric\omega-project\docs\irm\_search2.py" -ErrorAction SilentlyContinue
```

## Commit
Message :
```
refactor(p1): nettoyage structural — migration s-score + archivage + scans

P1-01: MacroSScore → oracle/macro-score-types.ts
       computeMacroSScore → oracle/macro-axes.ts
       7 imports mis à jour. s-score.ts marqué TERMINAL.
P1-02: ollama-provider.ts → runtime/archive/ (si 0 imports)
P1-03: ADR fichiers non archivables (v2, polish, compat)
P1-04: Env vars OMEGA_HYBRID_MODE documentées
P1-05: Gateway full scan
P1-06: 11 packages évalués
P1-07: Concordance scorers (données ou protocole)
P1-08: Cost model affiné
P1-09: Regression risk matrix V2

Tests: 2022 passed, 0 failed (INCHANGÉ)
```

```powershell
Set-Location C:\Users\elric\omega-project
git add -A
git commit -F commit_msg.txt
git tag omega-p1-nettoyage-v1
git push origin phase-r-metrology-rebuild --tags
```

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKLIST FINALE — 14 CONTRÔLES
# ═══════════════════════════════════════════════════════════════════════════════

## Actions CODE
[ ] 1. MacroSScore interface dans oracle/macro-score-types.ts (nouveau fichier)
[ ] 2. computeMacroSScore dans oracle/macro-axes.ts (migré)
[ ] 3. engine.ts:52 importe depuis macro-score-types (pas s-score)
[ ] 4. aesthetic-oracle.ts:35 → 3 imports séparés (s-score, macro-axes, macro-score-types)
[ ] 5. types.ts:543 importe depuis macro-score-types (pas s-score)
[ ] 6. targeted-patch.ts importe depuis macro-score-types (pas s-score)
[ ] 7. index.ts mis à jour (3 re-exports corrigés)
[ ] 8. s-score.ts marqué TERMINAL (ne contient plus que computeSScore)
[ ] 9. ollama-provider.ts archivé (ou [DOUTE] documenté)
[ ] 10. ADR_P1_NON_ARCHIVABLE.md créé (v2, polish, compat documentés)

## Actions MESURE
[ ] 11. P1_GATEWAY_FULL_SCAN.md produit
[ ] 12. P1_PACKAGE_EVALUATION.md produit (11 packages évalués)
[ ] 13. P1_COST_MODEL.json produit
[ ] 14. P1_REGRESSION_RISK_V2.json produit

## Contrôle final
[ ] 15. Tests = 2022 passed, 0 FAIL

UN SEUL contrôle manqué → noter dans le rapport avec la raison.

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLE D'OR — EN CAS DE DOUTE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Si à TOUT moment tu n'es pas sûr :
#   1. NE MODIFIE PAS
#   2. Marque [DOUTE — raison]
#   3. Passe à l'action suivante
#   4. Francky décidera
#
# ATTENTION SPÉCIALE P1-01 (migration s-score) :
#   C'est l'action la plus risquée de P1.
#   Si un SEUL import est mal redirigé → le build CASSE.
#   Exécuter la migration en 5 sous-étapes avec test après chaque.
#   À la moindre erreur de compilation → git checkout . immédiat.
#
# "Ce qui n'est pas prouvé n'existe pas."
# "Mieux vaut ne rien toucher que casser quelque chose."
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Autorité : Francky (Architecte Suprême)
# ═══════════════════════════════════════════════════════════════════════════════
