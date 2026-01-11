# OMEGA TITANIUM ULTIME v8.0

## Installation (3 étapes)

### 1. Extraire dans ton projet
```powershell
Expand-Archive -Path "C:\Users\elric\Downloads\OMEGA_TITANIUM_ULTIME_v8.0.zip" -DestinationPath "C:\Users\elric\omega-project\" -Force
```

### 2. Vérifier
```powershell
Get-ChildItem "C:\Users\elric\omega-project\POLICY.yml"
Get-ChildItem "C:\Users\elric\omega-project\tools\policy-check.cjs"
```

### 3. Lancer
1. Ouvre `PROMPT_TITANIUM_ULTIME.txt`
2. Copie TOUT le contenu
3. Colle dans Claude Code
4. Pendant le warm-up: réponds "Yes, don't ask again" à chaque question
5. Après: Claude Code travaille en autonomie jusqu'à GOLD MASTER

## Fichiers

| Fichier | Rôle |
|---------|------|
| PROMPT_TITANIUM_ULTIME.txt | Copier dans Claude Code |
| POLICY.yml | Règles machine |
| tools/policy-check.cjs | Policy Engine |

## Résultat attendu

- 21 phases (40→60)
- NEXUS DEP créé dans `packages/integration-nexus-dep/`
- Tag final: `v3.60.0-GOLD`
- 3 ZIPs GOLD MASTER
- Rapport final: `history/FINAL_REPORT_PHASE60_GOLD_MASTER.md`
