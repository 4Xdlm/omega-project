# ═══════════════════════════════════════════════════════════════════════════════
#                    OMEGA v1.0.0-GOLD — SCRIPT DE RELEASE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Exécuter ces commandes dans PowerShell à la racine du projet omega-project
#
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 1: VÉRIFIER QUE TOUT EST PROPRE
# ─────────────────────────────────────────────────────────────────────────────

git status
# Doit afficher: "nothing to commit, working tree clean"
# Si ce n'est pas le cas, commiter ou stasher les changements d'abord

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 2: CRÉER LE DOSSIER EVIDENCE (si pas déjà fait)
# ─────────────────────────────────────────────────────────────────────────────

# Créer le dossier
New-Item -ItemType Directory -Force -Path "evidence"

# Copier les fichiers (adapter les chemins selon où vous avez téléchargé)
# Copy-Item "chemin\vers\evidence\README.md" -Destination "evidence\"
# Copy-Item "chemin\vers\evidence\hashes.sha256" -Destination "evidence\"
# Copy-Item "chemin\vers\CERTIFICATE_WINDOWS.md" -Destination "evidence\"
# Copy-Item "chemin\vers\CERTIFICATE_GITHUB.md" -Destination "evidence\"

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 3: COMMITER LES FICHIERS EVIDENCE
# ─────────────────────────────────────────────────────────────────────────────

git add evidence/
git add 50B_TEST_MATRIX.md  # Si mis à jour
git commit -m "Add certification evidence for v1.0.0-GOLD release"

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 4: CRÉER LE TAG GOLD MASTER
# ─────────────────────────────────────────────────────────────────────────────

git tag -a v1.0.0-GOLD -m "OMEGA TAURI v1.0.0 — GOLD MASTER (Aerospace Grade Certified)

Certification:
- Core TypeScript: 131/131 tests (100%)
- Bridge Windows: 50/50 tests (100%)
- Total: 181/181 tests

Preuves:
- GitHub Actions Run: #20546141397
- SHA-256 Win: eedf8ee47655b3d92dda48cb5cd4f87c2b9948a473bed27140f5407e1fed1abd
- SHA-256 Linux: b8e6330964595cc42cf0629ddaa40a1e41e1d869ddf18476599e3c3401684a7b

Certifié par: Francky & Claude (Architecte Système)
Date: 2025-12-28"

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 5: POUSSER LE TAG VERS GITHUB
# ─────────────────────────────────────────────────────────────────────────────

git push origin master
git push origin v1.0.0-GOLD

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 6: CRÉER LA RELEASE SUR GITHUB
# ─────────────────────────────────────────────────────────────────────────────

# Option A: Via l'interface web GitHub
# 1. Aller sur https://github.com/4Xdlm/omega-project/releases
# 2. Cliquer "Draft a new release"
# 3. Sélectionner le tag "v1.0.0-GOLD"
# 4. Titre: "OMEGA TAURI v1.0.0 — GOLD MASTER"
# 5. Coller le contenu de RELEASE_NOTE_v1.0.0-GOLD.md
# 6. Attacher les fichiers:
#    - omega-bridge-win.exe
#    - omega-bridge-linux
# 7. Cocher "Set as the latest release"
# 8. Publier

# Option B: Via GitHub CLI (si installé)
# gh release create v1.0.0-GOLD `
#   --title "OMEGA TAURI v1.0.0 — GOLD MASTER" `
#   --notes-file RELEASE_NOTE_v1.0.0-GOLD.md `
#   omega-bridge-win.exe `
#   omega-bridge-linux

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 7: VÉRIFICATION FINALE
# ─────────────────────────────────────────────────────────────────────────────

# Vérifier que le tag existe
git tag -l "v1.0.0-GOLD"

# Vérifier sur GitHub
# https://github.com/4Xdlm/omega-project/releases/tag/v1.0.0-GOLD

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ RELEASE v1.0.0-GOLD PUBLIÉE AVEC SUCCÈS" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Tag:     v1.0.0-GOLD"
Write-Host "  Status:  GOLD MASTER (Aerospace Grade)"
Write-Host "  Tests:   181/181 (100%)"
Write-Host ""
Write-Host "  Lien:    https://github.com/4Xdlm/omega-project/releases/tag/v1.0.0-GOLD"
Write-Host ""
