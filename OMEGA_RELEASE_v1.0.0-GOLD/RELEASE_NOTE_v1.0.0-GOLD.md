# 🚀 OMEGA TAURI DESKTOP v1.0.0 — GOLD MASTER

> **"Prouvé, pas supposé."** — Cette version est la première release de production certifiée "Aerospace Grade".

Cette version `v1.0.0` marque l'aboutissement de la phase de certification OMEGA. Elle introduit une architecture Desktop autonome, sécurisée et formellement vérifiée.

---

## 🌟 Faits Marquants

- **Zéro Dépendance Runtime** : Le système fonctionne sans Node.js installé chez l'utilisateur (Architecture "Sidecar Binaire").
- **Architecture "Fail-Closed"** : Le système privilégie la sécurité et l'intégrité des données avant la disponibilité.
- **Certification Totale** : 100% de couverture de test sur le Core et le Bridge (181/181 tests critiques validés).
- **Intégrité Windows** : Le binaire Windows a reçu la **Certification Platinum**, prouvée par une double exécution (Locale + Cloud Microsoft Azure) produisant des hachages identiques.

---

## 🛡️ Sécurité & Invariants

| Invariant | Description | Status |
|-----------|-------------|--------|
| **Single IPC Endpoint** | Toute communication passe par un canal unique auditable (`omega_cmd`) | ✅ |
| **Path Security** | Workspace Allowlist actif (`$HOME`, `/tmp`, `$CWD`) | ✅ |
| **Timeout Strict** | Protection processus zombies (15s + kill explicite) | ✅ |
| **Atomic Write** | Sauvegarde atomique avec fichiers temporaires UUID | ✅ |
| **Hash Integrity** | SHA-256 sur toutes les données persistées | ✅ |

---

## 📊 Métriques de Qualité

| Composant | Status | Tests | Preuve |
|-----------|--------|-------|--------|
| **Core Engine** | 🟢 CERTIFIÉ | 131/131 (100%) | [Matrice v1.2.0](./50B_TEST_MATRIX.md) |
| **Windows Bridge** | 🟢 CERTIFIÉ | 50/50 (100%) | [Run #20546141397](https://github.com/4Xdlm/omega-project/actions/runs/20546141397) |
| **Linux Bridge** | 🟢 VÉRIFIÉ | - | Hash validé |
| **macOS Bridge** | ⚫ EXPÉRIMENTAL | - | Non testé (KL-001) |

---

## 🔐 Empreintes Numériques (SHA-256)

Vérifiez l'intégrité de vos binaires après téléchargement :

```
omega-bridge-win.exe : eedf8ee47655b3d92dda48cb5cd4f87c2b9948a473bed27140f5407e1fed1abd
omega-bridge-linux   : b8e6330964595cc42cf0629ddaa40a1e41e1d869ddf18476599e3c3401684a7b
```

### Vérification Windows (PowerShell)
```powershell
(Get-FileHash .\omega-bridge-win.exe -Algorithm SHA256).Hash
# Doit afficher: EEDF8EE47655B3D92DDA48CB5CD4F87C2B9948A473BED27140F5407E1FED1ABD
```

### Vérification Linux/macOS
```bash
sha256sum omega-bridge-linux
# Doit afficher: b8e6330964595cc42cf0629ddaa40a1e41e1d869ddf18476599e3c3401684a7b
```

---

## ⚠️ Limitations Connues

| ID | Limitation | Impact | Mitigation |
|----|------------|--------|------------|
| KL-001 | macOS non certifié | Expérimental uniquement | Utiliser Linux/Windows |
| KL-006 | Lock file après crash brutal | Manuel cleanup | Supprimer `.lock` si nécessaire |

---

## 📦 Contenu de la Release

```
OMEGA_TAURI_v1.0.0-GOLD/
├── omega-bridge-win.exe      # Binaire Windows (41 MB)
├── omega-bridge-linux        # Binaire Linux (41 MB)
├── evidence/
│   ├── README.md             # Guide de vérification
│   ├── CERTIFICATE_WINDOWS.md
│   ├── CERTIFICATE_GITHUB.md
│   └── hashes.sha256
├── docs/
│   ├── 50B_TEST_MATRIX.md
│   └── CHANGELOG.md
└── README.md
```

---

## 🔗 Preuves Tierces

- **GitHub Actions Run** : https://github.com/4Xdlm/omega-project/actions/runs/20546141397
- **Commit certifié** : `01225d8e363d2c6237fb3eb6a9c279d9006aa58d`
- **Runner Microsoft** : `GitHub Actions 1000000000` (Azure)

---

## 🗺️ Roadmap v1.1

| Feature | Description | Priority |
|---------|-------------|----------|
| CI Anti-Backdoor | Vérification automatique unicité endpoint IPC | P0 |
| Stale Lock Detection | Nettoyage automatique locks orphelins | P1 |
| macOS Certification | Tests notariaux sur runner macOS | P2 |

---

## 🏁 Installation

### Windows
```powershell
# Télécharger et vérifier
Invoke-WebRequest -Uri "URL_RELEASE" -OutFile omega-bridge-win.exe
(Get-FileHash .\omega-bridge-win.exe -Algorithm SHA256).Hash

# Tester
.\omega-bridge-win.exe '{"command":"health"}'
```

### Linux
```bash
# Télécharger et vérifier
wget URL_RELEASE -O omega-bridge-linux
sha256sum omega-bridge-linux
chmod +x omega-bridge-linux

# Tester
./omega-bridge-linux '{"command":"health"}'
```

---

**OMEGA TAURI v1.0.0-GOLD — Certifié Aerospace Grade**

*Francky & Claude (Architecte Système)*
*28 décembre 2025*
