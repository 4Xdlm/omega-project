# OMEGA POLICY SYSTEM v6.0 TITANIUM

## 📋 Vue d'ensemble

Ce système hybride combine 3 composants pour une autonomie totale:

| Fichier | Rôle | Type |
|---------|------|------|
| `RUNBOOK_GOLD.md` | LOI (doctrine normative) | Humain |
| `POLICY.yml` | COMPILATION (règles exécutables) | Machine |
| `policy-check.js` | POLICE (enforcement) | Automatique |

## 🚀 Installation

### 1. Placer les fichiers

```
omega-project/
├── RUNBOOK_GOLD.md          # À la racine
├── POLICY.yml               # À la racine
├── tools/
│   └── policy-check.js      # Dans tools/
└── history/
    └── NCR_LOG.md           # Créé automatiquement
```

### 2. (Optionnel) Installer une lib YAML

```bash
npm install --save-dev yaml
# ou
npm install --save-dev js-yaml
```

> Le script fonctionne sans lib YAML (parser simplifié intégré), mais une lib est recommandée pour le parsing complet.

### 3. Calculer le hash de POLICY.yml

```bash
sha256sum POLICY.yml
# ou Windows:
Get-FileHash -Algorithm SHA256 POLICY.yml
```

Copier le hash dans `RUNBOOK_GOLD.md` à la section `POLICY_SHA256`.

## 📖 Utilisation

### Vérifier une commande

```bash
node tools/policy-check.js --cmd "git push origin master"
```

**Sorties possibles:**
- `ALLOW` (exit 0) → Exécuter la commande
- `DENY` (exit 2) → STOP + NCR créé automatiquement
- `DENY_CRITICAL` (exit 3) → STOP + NCR CRITICAL créé automatiquement

### Vérifier les sanctuaires

```bash
node tools/policy-check.js --check sanctuary
```

Vérifie qu'aucun module FROZEN/SEALED n'a été modifié depuis le tag de référence.

### Vérifier les artefacts de phase

```bash
node tools/policy-check.js --phase phase32_0 --check artifacts
```

Vérifie que tous les fichiers requis pour la phase sont présents.

### Vérification complète

```bash
node tools/policy-check.js --phase phase32_0 --check all
```

### Options

| Option | Description |
|--------|-------------|
| `--cmd, -c` | Commande à vérifier |
| `--phase, -p` | Phase concernée (ex: phase32_0) |
| `--check` | Mode: `sanctuary`, `artifacts`, `all` |
| `--verbose, -v` | Affiche les détails |
| `--no-ncr` | Ne pas créer automatiquement les NCR |
| `--help, -h` | Affiche l'aide |

## 🔄 Workflow typique

### Avant chaque commande à risque

```bash
# Vérifier d'abord
RESULT=$(node tools/policy-check.js --cmd "git commit -m 'feat: xxx'" 2>&1)
echo $RESULT

# Si ALLOW, exécuter
if [[ $RESULT == *"ALLOW"* ]]; then
  git commit -m "feat: xxx"
fi
```

### En début de phase (PRE-FLIGHT)

```bash
# Vérifier sanctuaires
node tools/policy-check.js --check sanctuary

# Installer dépendances (autorisé uniquement en PRE-FLIGHT)
npm ci
```

### En fin de phase

```bash
# Vérifier tous les artefacts
node tools/policy-check.js --phase phase32_0 --check artifacts

# Si ALLOW, la phase peut être CERTIFIED
```

## 📁 Structure des artefacts par phase

```
certificates/phaseNN_X/
├── DESIGN_PHASE_NN_X.md
├── CERT_PHASE_NN_X.md
├── CERT_SCOPE_PHASE_NN_X.txt
├── HASHES_PHASE_NN_X.sha256
└── PHASE_NN_X_FROZEN.md

evidence/phaseNN_X/
├── tests.log
└── commands.txt

history/
├── HISTORY_PHASE_NN_X.md
├── NCR_LOG.md
└── PUSH_PENDING.md (si applicable)

archives/phaseNN_X/
└── OMEGA_PHASE_NN_X_vX.XX.X_YYYYMMDD_HHmm_xxxxxxx.zip
```

## 🔒 NCR automatiques

Quand le Policy Engine retourne `DENY` ou `DENY_CRITICAL`, il crée automatiquement une entrée dans `history/NCR_LOG.md`:

```markdown
## NCR-001
| Field | Value |
|-------|-------|
| Date | 2026-01-09 23:45:00 |
| Phase | phase32_0 |
| Severity | CRITICAL |
| Command | `git reset --hard` |
| Reason | Forbidden command prefix detected |
| Commit | abc1234 |
| Status | OPEN |
```

Désactiver avec `--no-ncr`.

## 🎯 Intégration avec Claude Code

Pour que Claude Code utilise automatiquement le Policy Engine:

1. Ajouter au début des instructions:
   ```
   AVANT toute commande à risque, appeler:
   node tools/policy-check.js --cmd "<commande>"
   
   Si ALLOW → exécuter
   Si DENY → STOP + ne pas exécuter
   Si DENY_CRITICAL → STOP + ne pas exécuter
   ```

2. Claude Code exécutera les vérifications automatiquement et n'aura plus besoin de demander confirmation.

## 📊 Commandes de référence

### Commandes SAFE (toujours autorisées)

```
git status, git diff, git log, git show, git describe
ls, cat, echo, mkdir, cp, mv
npm test, npm run build, npm run lint
sha256sum, zip, unzip
```

### Commandes FORBIDDEN (jamais autorisées)

```
rm, rm -rf, rmdir, del
git reset --hard, git clean, git push --force
git pull, git merge, git stash
sudo, chmod, chown
```

### Commandes PRE-FLIGHT ONLY

```
npm install, npm ci
```

## 🏆 GOLD MASTER (Phase 42)

En Phase 42, des restrictions supplémentaires s'appliquent:
- `npm install` / `npm ci` → DENY_CRITICAL
- `git fetch` → DENY_CRITICAL
- Modification de code → DENY_CRITICAL

## 📜 Licence

OMEGA Project - NASA-Grade L4 / DO-178C Level A
