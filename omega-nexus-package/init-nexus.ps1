# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA NEXUS v2.2.3 — SCRIPT D'INITIALISATION
#   Crée l'arborescence complète du coffre-fort technique
#
#   Usage: .\init-nexus.ps1
#   Exécuter depuis: C:\Users\elric\omega-project\
#
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   💎 OMEGA NEXUS v2.2.3 — NUCLEAR PROOF INITIALIZATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1: Création des 26 dossiers
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[1/4] Création de l'arborescence..." -ForegroundColor Yellow

$dirs = @(
    # GENESIS
    "nexus/genesis",
    
    # RAW
    "nexus/raw/sessions",
    "nexus/raw/logs/tests",
    "nexus/raw/logs/build",
    "nexus/raw/reports/coverage",
    "nexus/raw/imports",
    "nexus/raw/archives",
    "nexus/raw/telemetry/ctx",
    
    # LEDGER
    "nexus/ledger/entities",
    "nexus/ledger/events",
    "nexus/ledger/links",
    "nexus/ledger/registry",
    
    # TOOLING
    "nexus/tooling/scripts",
    "nexus/tooling/schemas",
    "nexus/tooling/templates",
    
    # PROOF
    "nexus/proof/snapshots/manifests",
    "nexus/proof/snapshots/archives",
    "nexus/proof/states",
    "nexus/proof/seals",
    "nexus/proof/certificates",
    "nexus/proof/completeness",
    
    # ATLAS
    "nexus/atlas/biography",
    "nexus/atlas/museum",
    "nexus/atlas/visions",
    "nexus/atlas/lessons",
    
    # INTEL
    "nexus/intel/by_type",
    
    # OUTPUT
    "nexus/output"
)

$created = 0
foreach ($d in $dirs) {
    $result = New-Item -ItemType Directory -Path $d -Force -ErrorAction SilentlyContinue
    if ($result) { $created++ }
}

Write-Host "   ✅ $created dossiers créés" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2: Copie des fichiers Genesis
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[2/4] Installation des fichiers Genesis..." -ForegroundColor Yellow

# Vérifier si les fichiers genesis sont dans le package
$genesisSource = ".\genesis"
if (Test-Path $genesisSource) {
    Copy-Item "$genesisSource\THE_OATH.md" "nexus\genesis\" -Force
    Copy-Item "$genesisSource\LAWS.yaml" "nexus\genesis\" -Force
    Copy-Item "$genesisSource\IDENTITY.yaml" "nexus\genesis\" -Force
    Write-Host "   ✅ Fichiers Genesis copiés" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Dossier genesis/ non trouvé - créer manuellement" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3: Création du Registry initial
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[3/4] Initialisation du Registry..." -ForegroundColor Yellow

# Obtenir la date UTC actuelle
$utcNow = (Get-Date).ToUniversalTime()
$dateYYYYMMDD = $utcNow.ToString("yyyyMMdd")
$timestampISO = $utcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")

$registryContent = @"
# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA NEXUS v2.2.3 — DAILY REGISTRY
# Initialized: $timestampISO
# ═══════════════════════════════════════════════════════════════════════════════

date: "$dateYYYYMMDD"
updated: "$timestampISO"

counters:
  ENT: 0
  EVT: 0
  LINK: 0
  SEAL: 0
  SES: 0
  STATE: 0
  COMP: 0
  MANIFEST: 0
  TESTLOG: 0
  BUILDLOG: 0
  COV: 0
  CERT: 0
"@

$registryPath = "nexus\ledger\registry\REG-$dateYYYYMMDD.yaml"
$registryContent | Out-File -FilePath $registryPath -Encoding UTF8
Write-Host "   ✅ Registry créé: $registryPath" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4: Création du fichier .gitignore pour Nexus
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "[4/4] Configuration Git..." -ForegroundColor Yellow

$gitignoreContent = @"
# OMEGA NEXUS - Fichiers à ignorer

# Locks temporaires
nexus/ledger/registry/LOCK-*.json

# Output (jetable)
nexus/output/*
!nexus/output/.gitkeep

# Atlas généré (optionnel - peut être régénéré)
# nexus/atlas/*
# !nexus/atlas/ATLAS-META.json

# Node modules dans tooling
nexus/tooling/node_modules/

# Logs de debug
*.log
"@

$gitignoreContent | Out-File -FilePath "nexus\.gitignore" -Encoding UTF8

# Créer .gitkeep pour output
"" | Out-File -FilePath "nexus\output\.gitkeep" -Encoding UTF8

Write-Host "   ✅ .gitignore créé" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════════
# RÉSUMÉ
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ OMEGA NEXUS v2.2.3 INITIALISÉ AVEC SUCCÈS" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "   📁 Arborescence: 26 dossiers créés" -ForegroundColor White
Write-Host "   📜 Genesis: THE_OATH.md, LAWS.yaml, IDENTITY.yaml" -ForegroundColor White
Write-Host "   📋 Registry: REG-$dateYYYYMMDD.yaml" -ForegroundColor White
Write-Host ""
Write-Host "   PROCHAINE ÉTAPE:" -ForegroundColor Cyan
Write-Host "   → Ouvrir une nouvelle discussion Claude" -ForegroundColor White
Write-Host "   → Coller le prompt OMEGA_CONCEPTION_PROMPT.md" -ForegroundColor White
Write-Host "   → Uploader les fichiers du package" -ForegroundColor White
Write-Host "   → Commencer Phase 81.2 (Core Scripts)" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
