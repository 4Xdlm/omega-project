# ═══════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — MÉTHODE DE TRAVAIL OPTIMALE
#   Best Practices Claude ↔ Francky
#
# ═══════════════════════════════════════════════════════════════════════════════════════════

**Document**: OMEGA_WORKFLOW_BEST_PRACTICES  
**Date**: 05 janvier 2026  
**Version**: v1.0  
**Status**: RÉFÉRENCE PERMANENTE  

---

# 🎯 MÉTHODE OPTIMALE VALIDÉE

## Principe

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   1. Claude développe et teste dans son environnement Linux                           ║
║   2. Claude crée un ZIP COMPLET avec tout le code                                     ║
║   3. Claude envoie le ZIP dans Downloads de Francky                                   ║
║   4. Claude fournit un script PowerShell COMPLET                                      ║
║   5. Francky exécute le script → tout s'installe et teste automatiquement            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 📦 ÉTAPE 1 — CRÉATION DU ZIP

Claude doit :

```bash
# Créer le ZIP sans node_modules
cd /home/claude
zip -r NOM_LIVRABLE.zip DOSSIER_PROJET/ -x "*/node_modules/*"

# Vérifier le hash
sha256sum NOM_LIVRABLE.zip

# Copier vers outputs pour téléchargement
cp NOM_LIVRABLE.zip /mnt/user-data/outputs/

# Présenter le fichier à Francky
present_files(["/mnt/user-data/outputs/NOM_LIVRABLE.zip"])
```

---

# 💻 ÉTAPE 2 — SCRIPT POWERSHELL COMPLET

Claude fournit UN SEUL bloc PowerShell que Francky peut copier-coller :

```powershell
# ═══════════════════════════════════════════════════════════════════════════
# OMEGA — Installation et Test Automatique
# ═══════════════════════════════════════════════════════════════════════════

# 1. Extraire le ZIP depuis Downloads
Expand-Archive -Path "C:\Users\elric\Downloads\NOM_LIVRABLE.zip" -DestinationPath "C:\Users\elric\omega-project\" -Force

# 2. Aller dans le dossier
cd C:\Users\elric\omega-project\NOM_DOSSIER

# 3. Installer les dépendances
npm install

# 4. Lancer les tests
npm test

# 5. (Optionnel) Vérifier le hash du ZIP
Get-FileHash -Algorithm SHA256 "C:\Users\elric\Downloads\NOM_LIVRABLE.zip"
# Attendu: HASH_ATTENDU
```

---

# ✅ CHECKLIST LIVRAISON

Avant d'envoyer à Francky, Claude vérifie :

- [ ] ZIP créé sans node_modules
- [ ] Hash SHA-256 calculé
- [ ] ZIP copié dans /mnt/user-data/outputs/
- [ ] present_files() appelé
- [ ] Script PowerShell COMPLET fourni
- [ ] Résultat attendu indiqué (ex: "226 passed")

---

# 🚫 À ÉVITER

| ❌ Ne pas faire | ✅ Faire à la place |
|-----------------|---------------------|
| Envoyer fichiers un par un | ZIP complet |
| Commandes partielles | Script PowerShell complet |
| Oublier le hash | Toujours inclure SHA-256 |
| Supposer le chemin | Utiliser `C:\Users\elric\...` |
| Inclure node_modules | Exclure avec `-x` |

---

# 📋 TEMPLATE STANDARD

```markdown
## 📦 LIVRABLE

**Fichier**: NOM_LIVRABLE.zip
**SHA-256**: `hash_complet_ici`
**Tests attendus**: X passed (X)

## 💻 INSTALLATION

\`\`\`powershell
# Extraire
Expand-Archive -Path "C:\Users\elric\Downloads\NOM_LIVRABLE.zip" -DestinationPath "C:\Users\elric\omega-project\" -Force

# Installer et tester
cd C:\Users\elric\omega-project\NOM_DOSSIER
npm install
npm test
\`\`\`

## ✅ RÉSULTAT ATTENDU

\`\`\`
Test Files  X passed (X)
     Tests  Y passed (Y)
\`\`\`
```

---

# 🏆 POURQUOI CETTE MÉTHODE

| Avantage | Explication |
|----------|-------------|
| **Atomique** | Un ZIP = un état complet, pas de fichiers manquants |
| **Reproductible** | Même ZIP = même résultat partout |
| **Vérifiable** | Hash permet de confirmer l'intégrité |
| **Simple** | Un copier-coller PowerShell suffit |
| **Traçable** | Archive permanente avec hash |

---

# 📁 CHEMINS STANDARDS OMEGA

| Élément | Chemin |
|---------|--------|
| Downloads Francky | `C:\Users\elric\Downloads\` |
| Projet OMEGA | `C:\Users\elric\omega-project\` |
| Claude outputs | `/mnt/user-data/outputs/` |
| Claude workspace | `/home/claude/` |

---

**FIN DU DOCUMENT — MÉTHODE DE TRAVAIL OPTIMALE**

*Ce document est la référence pour toutes les futures livraisons OMEGA.*
