# ═══════════════════════════════════════════════════════════════════════════════
#
#   SEAL CANDIDATE — 2026-01-12
#   Corrections Phase 88 (Audit)
#
#   Status: EN ATTENTE VALIDATION HUMAINE
#
# ═══════════════════════════════════════════════════════════════════════════════

## Message proposé

```
Phase 88: Corrections Audit - EVT CREATED retroactifs + ENT Phase 85
```

## Fichiers à déplacer (draft → ledger)

```
nexus/draft/events/EVT-20260112-0000-A.yaml → nexus/ledger/events/
nexus/draft/events/EVT-20260112-0000-B.yaml → nexus/ledger/events/
nexus/draft/entities/ENT-20260112-0005.yaml → nexus/ledger/entities/
nexus/draft/events/EVT-20260112-0007.yaml → nexus/ledger/events/
```

## Fichier audit à conserver

```
nexus/audit/IA_AUDIT_20260112.md (déjà en place)
```

## Commandes PowerShell (à exécuter par l'humain)

```powershell
# 1. Déplacer les fichiers DRAFT vers le ledger canonique
Move-Item -Path "C:\Users\elric\omega-project\nexus\draft\events\EVT-20260112-0000-A.yaml" -Destination "C:\Users\elric\omega-project\nexus\ledger\events\"
Move-Item -Path "C:\Users\elric\omega-project\nexus\draft\events\EVT-20260112-0000-B.yaml" -Destination "C:\Users\elric\omega-project\nexus\ledger\events\"
Move-Item -Path "C:\Users\elric\omega-project\nexus\draft\entities\ENT-20260112-0005.yaml" -Destination "C:\Users\elric\omega-project\nexus\ledger\entities\"
Move-Item -Path "C:\Users\elric\omega-project\nexus\draft\events\EVT-20260112-0007.yaml" -Destination "C:\Users\elric\omega-project\nexus\ledger\events\"

# 2. Resceller (Windows = plateforme canonique pour hash)
cd C:\Users\elric\omega-project\nexus\tooling
node scripts/cli.js seal -d C:\Users\elric\omega-project -m "Phase 88: Corrections Audit - EVT CREATED retroactifs + ENT Phase 85" --auto

# 3. Vérifier
node scripts/cli.js where -d C:\Users\elric\omega-project
node scripts/cli.js verify -d C:\Users\elric\omega-project
```

## Résultat attendu

```
Entities: 5 (était 4)
Events: 10 (était 6)
Seals: 6 (était 5)
Verify: PASS (les seals seront valides car créés sur Windows)
```

---

⚠️ CE FICHIER EST UNE PROPOSITION — NE PAS EXÉCUTER SANS VALIDATION

---

*L'IA a préparé. L'humain exécute.*
