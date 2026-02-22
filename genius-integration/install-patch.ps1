# ═══════════════════════════════════════════════════════════════════════════
# OMEGA — GENIUS Sovereign Integration Patch
# Step 4b: Adapter + Dual Mode
# ═══════════════════════════════════════════════════════════════════════════

$SE_ROOT = "C:\Users\elric\omega-project\packages\sovereign-engine"
$PATCH_ROOT = "C:\Users\elric\omega-project\genius-integration\sovereign-engine-patch"

# 1. Backup originals
Write-Host "=== BACKUP ===" -ForegroundColor Cyan
Copy-Item "$SE_ROOT\src\genius\genius-metrics.ts" "$SE_ROOT\src\genius\genius-metrics.ts.bak" -Force
Write-Host "  Backed up genius-metrics.ts → .bak"

# 2. Copy new adapter
Write-Host "=== PATCH ===" -ForegroundColor Cyan
Copy-Item "$PATCH_ROOT\src\genius\omega-p0-adapter.ts" "$SE_ROOT\src\genius\omega-p0-adapter.ts" -Force
Write-Host "  Added omega-p0-adapter.ts"

# 3. Copy modified genius-metrics.ts
Copy-Item "$PATCH_ROOT\src\genius\genius-metrics.ts" "$SE_ROOT\src\genius\genius-metrics.ts" -Force
Write-Host "  Patched genius-metrics.ts"

# 4. Add dependency (manual check)
Write-Host ""
Write-Host "=== MANUAL STEP ===" -ForegroundColor Yellow
Write-Host "Add to $SE_ROOT\package.json dependencies:"
Write-Host '  "@omega/phonetic-stack": "file:../../omega-p0"'
Write-Host ""

# 5. Install
Write-Host "=== INSTALL ===" -ForegroundColor Cyan
Set-Location $SE_ROOT
npm install
Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Run 'npm test' to verify no regression."
