# ═══════════════════════════════════════════════════════════════════════════════════════════
# OMEGA — INSTRUCTIONS DE LANCEMENT CLAUDE CODE
# Phase 61 — Orchestrator Core
# ═══════════════════════════════════════════════════════════════════════════════════════════

## MESSAGE À COPIER-COLLER DANS CLAUDE CODE

Copie EXACTEMENT ce message pour lancer Claude Code :

---

```
# OMEGA SESSION — PHASE 61 — TITANIUM v9.1 ULTIMATE

## ÉTAT REPO (VÉRIFIÉ)
- Master HEAD: ad83887 (warm-up v9 commité)
- Dernier GOLD: v3.60.0-GOLD-CYCLE43
- Warm-up: EXÉCUTÉ ET TRACÉ (ne pas re-run)
- Branche travail: cycle-61
- Prochain tag: v3.64.0

## OBJECTIF
Implémenter Phase 61 — ORCHESTRATOR CORE
- Package: packages/orchestrator-core/
- Tests minimum: 50 (35 unit + 15 integration)
- Déterminisme total (clock/rng/id injectables)

## CONTRAINTES ABSOLUES
1. UI INTERDITE jusqu'à UI_START_ORDER
2. Sanctuaires READ-ONLY (sentinel/genome/mycelium/gateway)
3. Aucun hash inventé — tout calculé localement
4. git status clean après commit
5. STOP après phase + attendre validation

## LIVRABLES ATTENDUS
- packages/orchestrator-core/ (code + tests)
- evidence/phase61_0/ (env.txt, commands.txt, tests.log, tests.sha256)
- certificates/phase61_0/ (DESIGN, CERT, HASHES)
- history/HISTORY_PHASE_61_0.md
- archives/phase61_0/*.zip
- Tag v3.64.0

## PROCÉDURE
1. Checkout cycle-61
2. Capturer env.txt
3. Implémenter code + tests
4. Exécuter tests (50+ required)
5. Vérifier déterminisme (2 runs identiques)
6. Générer certificats + history
7. Créer archive ZIP
8. Commit + tag + push
9. Post-check sanctuaires
10. STOP et attendre validation

## PROMPT COMPLET
Le prompt TITANIUM v9.1 ULTIMATE complet est dans le fichier:
PROMPT_PHASE61_TITANIUM_v9.1_ULTIMATE.md

Lis-le intégralement avant de commencer.

## GO
Exécute PHASE 61 maintenant.
```

---

## FICHIERS À AVOIR SOUS LA MAIN

1. `PROMPT_PHASE61_TITANIUM_v9.1_ULTIMATE.md` — Le prompt complet (Section 0-9)
2. `POLICY_v9.1_ULTIMATE.yml` — La policy machine-readable
3. `PLAN_TRAVAIL_PHASES_61-80.yml` — Definition of Done par phase

## VÉRIFICATIONS PRÉ-LANCEMENT

Avant de lancer Claude Code, vérifie :

```powershell
# 1. Tu es dans le bon repo
cd C:\Users\elric\omega-project

# 2. Tu es sur cycle-61 (ou master)
git branch --show-current

# 3. Le warm-up existe
Test-Path evidence\warmup\WARMUP_v9.log

# 4. git status est relativement clean
git status --porcelain
```

## EN CAS DE PROBLÈME

Si Claude Code bloque :

1. **Commande interdite** → Vérifier POLICY_v9.1_ULTIMATE.yml section "forbidden"
2. **Test failing** → Demander le log exact, diagnostiquer
3. **Sanctuary modified** → ABORT immédiat, `git checkout -- packages/sentinel packages/genome packages/mycelium gateway`
4. **git status dirty** → Identifier les fichiers, `.gitignore` si approprié

## APRÈS PHASE 61

Une fois Phase 61 certifiée et validée :

1. Vérifier le ZIP dans archives/phase61_0/
2. Vérifier le tag v3.64.0 existe
3. Relire CERT_PHASE_61_0.md
4. Si OK → autoriser Phase 62

Message pour Phase 62 :

```
Phase 61 VALIDÉE. Proceed to Phase 62 — ARTIFACT REGISTRY.
Même contraintes, tag v3.65.0, tests minimum 30.
```

## RAPPELS CRITIQUES

- **UI = INTERDIT** (pas de Tauri, pas de React, pas de frontend)
- **Sanctuaires = INTOUCHABLES** (sentinel, genome, mycelium, gateway)
- **Déterminisme = OBLIGATOIRE** (clock injectable, pas de Date.now())
- **Preuves = TOUT TRACER** (commands.txt, tests.log, hashes)
- **Phase par phase** (STOP après chaque, validation requise)

---

**FIN DES INSTRUCTIONS**
