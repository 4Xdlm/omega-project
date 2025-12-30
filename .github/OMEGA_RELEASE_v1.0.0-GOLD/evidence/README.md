# 🔐 OMEGA Evidence Directory

Ce dossier contient les preuves cryptographiques de certification OMEGA.

---

## 📋 Contenu

| Fichier | Description |
|---------|-------------|
| `hashes.sha256` | Empreintes SHA-256 de tous les binaires |
| `CERTIFICATE_WINDOWS.md` | Certificat de preuve Windows local |
| `CERTIFICATE_GITHUB.md` | Certificat de preuve GitHub Actions (tiers neutre) |
| `manifest.json` | Métadonnées de la release |

---

## 🔍 Comment Vérifier

### 1. Vérifier les hash des binaires

#### Windows (PowerShell)
```powershell
# Calculer le hash du binaire
$hash = (Get-FileHash .\omega-bridge-win.exe -Algorithm SHA256).Hash

# Comparer avec le hash attendu
$expected = "EEDF8EE47655B3D92DDA48CB5CD4F87C2B9948A473BED27140F5407E1FED1ABD"
if ($hash -eq $expected) { Write-Host "✅ HASH VALIDE" -ForegroundColor Green }
else { Write-Host "❌ HASH INVALIDE" -ForegroundColor Red }
```

#### Linux/macOS
```bash
# Vérifier automatiquement
sha256sum -c hashes.sha256

# Ou manuellement
sha256sum omega-bridge-linux
# Comparer avec: b8e6330964595cc42cf0629ddaa40a1e41e1d869ddf18476599e3c3401684a7b
```

### 2. Vérifier la preuve GitHub Actions

1. Ouvrir le lien : https://github.com/4Xdlm/omega-project/actions/runs/20546141397
2. Vérifier que :
   - Le workflow a été exécuté sur `windows-latest`
   - Les 50 tests sont passés
   - L'artefact `omega-notarial-evidence` est disponible
3. Télécharger l'artefact et comparer les hash

### 3. Reproduire les tests localement

```powershell
# Télécharger le runner de test
# (disponible dans le repo: tools/omega_notarial_runner.ps1)

# Exécuter la suite notariale
.\omega_notarial_runner.ps1 -BinaryPath .\omega-bridge-win.exe

# Résultat attendu: 50/50 PASS
```

---

## 🏛️ Chaîne de Confiance

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHAÎNE DE CONFIANCE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CODE SOURCE                                                 │
│     └── Commit: 01225d8e363d2c6237fb3eb6a9c279d9006aa58d       │
│                                                                 │
│  2. BUILD                                                       │
│     └── pkg (Node.js → Binaire autonome)                       │
│                                                                 │
│  3. HASH BINAIRE                                                │
│     └── SHA-256: eedf8ee47655b3d92dda48cb5cd4f87c2b9948a...    │
│                                                                 │
│  4. TEST LOCAL                                                  │
│     └── 50/50 PASS (machine développeur)                       │
│                                                                 │
│  5. TEST TIERS NEUTRE                                          │
│     └── GitHub Actions (Microsoft Azure)                       │
│     └── Run ID: 20546141397                                    │
│     └── 50/50 PASS (même hash vérifié)                         │
│                                                                 │
│  6. PUBLICATION                                                 │
│     └── Tag: v1.0.0-GOLD                                       │
│     └── Release GitHub avec artefacts                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Résumé des Preuves

| Preuve | Source | Vérifiable |
|--------|--------|------------|
| Hash binaire | Calcul local | ✅ Oui |
| Tests locaux | PowerShell runner | ✅ Oui |
| Tests GitHub | Microsoft Azure | ✅ Oui (lien public) |
| Commit source | Git history | ✅ Oui |
| Timestamp | GitHub Actions | ✅ Oui (immutable) |

---

## ❓ FAQ

### Q: Pourquoi faire confiance à GitHub Actions ?
**R:** GitHub Actions s'exécute sur l'infrastructure Microsoft Azure. Microsoft est un tiers neutre qui n'a aucun intérêt à falsifier nos résultats. Les logs sont immutables et publiquement auditables.

### Q: Comment savoir si le binaire n'a pas été modifié après les tests ?
**R:** Le hash SHA-256 est calculé avant ET après les tests. Si le hash change, les tests échouent. Le hash dans la release correspond exactement au hash testé.

### Q: Puis-je reproduire les tests moi-même ?
**R:** Oui ! Le script `omega_notarial_runner.ps1` est disponible dans le repo. Vous pouvez exécuter exactement les mêmes 50 tests sur votre machine.

---

**OMEGA v1.0.0-GOLD — Evidence Directory**
*Généré le 28 décembre 2025*
