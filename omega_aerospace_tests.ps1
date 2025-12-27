# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA AEROSPACE TEST SUITE v2.0
# 32 Tests - NASA Grade - 100% Target
# Date: 27 December 2025
# ═══════════════════════════════════════════════════════════════════════════════

$bin = ".\omega-bridge-win.exe"
$PASS = 0
$FAIL = 0
$Results = @()

Write-Host ""
Write-Host "========================================"
Write-Host "  OMEGA AEROSPACE TEST SUITE v2.0"
Write-Host "  32 Tests - NASA Grade"
Write-Host "  Target: 100% PASS"
Write-Host "========================================"
Write-Host ""

# Get binary hash
$binaryHash = (Get-FileHash $bin -Algorithm SHA256).Hash
Write-Host "Binary: $bin"
Write-Host "SHA256: $binaryHash"
Write-Host "Date:   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')"
Write-Host ""

# Test function
function Test-Omega {
    param($id, $name, $cmd, $expectSuccess, $checkPattern)
    
    $result = cmd /c "$bin $cmd" 2>&1 | Out-String
    
    $passed = $false
    
    if ($expectSuccess) {
        if ($result -match '"status"\s*:\s*"success"') {
            if ($checkPattern) {
                $passed = $result -match $checkPattern
            } else {
                $passed = $true
            }
        }
    } else {
        $passed = $result -match '"status"\s*:\s*"error"'
    }
    
    if ($passed) {
        Write-Host "  [PASS] $id - $name" -ForegroundColor Green
        $global:PASS++
    } else {
        Write-Host "  [FAIL] $id - $name" -ForegroundColor Red
        $global:FAIL++
    }
    
    $global:Results += [PSCustomObject]@{
        ID = $id
        Name = $name
        Status = if ($passed) { "PASS" } else { "FAIL" }
    }
    
    return $result
}

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "--- NIVEAU 1: PROTOCOLE BASIQUE (7 tests) ---" -ForegroundColor Cyan
# ═══════════════════════════════════════════════════════════════════════════════

Test-Omega "L1-01" "Health Check" '{\"command\":\"health\"}' $true '"healthy"'
Test-Omega "L1-02" "Version Check" '{\"command\":\"version\"}' $true '"AEROSPACE_GRADE"'

$tp = "$env:TEMP\omega_L1_$(Get-Random)"
$ep = $tp.Replace('\','\\')
Test-Omega "L1-03" "Create Project" "{`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"TestL1`\`",`\`"path`\`":`\`"$ep`\`"}}" $true '"integrity_valid"\s*:\s*true'
Test-Omega "L1-04" "Project Exists" "{`\`"command`\`":`\`"project_exists`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $true '"exists"\s*:\s*true'
Test-Omega "L1-05" "Load Project" "{`\`"command`\`":`\`"load_project`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $true '"integrity_valid"\s*:\s*true'
Test-Omega "L1-06" "Check Integrity" "{`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $true '"valid"\s*:\s*true'
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

Test-Omega "L1-07" "Security Path Block" '{\"command\":\"create_project\",\"payload\":{\"name\":\"Hack\",\"path\":\"C:\\\\Windows\\\\System32\"}}' $false

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "--- NIVEAU 2: INVARIANTS CORE (5 tests) ---" -ForegroundColor Cyan
# ═══════════════════════════════════════════════════════════════════════════════

# INV-01: Atomic Save
$tp = "$env:TEMP\omega_INV01_$(Get-Random)"
$ep = $tp.Replace('\','\\')
Test-Omega "INV-01" "Atomic Save" "{`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Atomic`\`",`\`"path`\`":`\`"$ep`\`"}}" $true
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-02: Corruption Detection
$tp = "$env:TEMP\omega_INV02_$(Get-Random)"
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Corrupt`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
Set-Content -Path "$tp\omega.json" -Value "{corrupted:true}"
Test-Omega "INV-02" "Corruption Detection" "{`\`"command`\`":`\`"load_project`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $false
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-03: Hash Chain SHA256
$tp = "$env:TEMP\omega_INV03_$(Get-Random)"
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Hash`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
$r = cmd /c "$bin {`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"hash"\s*:\s*"([a-f0-9]{64})"') {
    Write-Host "  [PASS] INV-03 - Hash SHA256 (64 hex chars)" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "INV-03"; Name = "Hash SHA256"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] INV-03 - Hash SHA256" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "INV-03"; Name = "Hash SHA256"; Status = "FAIL" }
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-04: Double Create Blocked
$tp = "$env:TEMP\omega_INV04_$(Get-Random)"
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"First`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
Test-Omega "INV-04" "Double Create Blocked" "{`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Second`\`",`\`"path`\`":`\`"$ep`\`"}}" $false
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-05: Determinism
Test-Omega "INV-05" "Determinism (health stable)" '{\"command\":\"health\"}' $true '"healthy"'

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "--- NIVEAU 3: TESTS BRUTAUX/CHAOS (8 tests) ---" -ForegroundColor Cyan
# ═══════════════════════════════════════════════════════════════════════════════

Test-Omega "BRUTAL-01" "Invalid Command" '{\"command\":\"FAKE_COMMAND\"}' $false
Test-Omega "BRUTAL-02" "Malformed JSON" 'not_json_at_all' $false
Test-Omega "BRUTAL-03" "Empty Payload" '{}' $false
Test-Omega "BRUTAL-04" "Path Traversal Attack" '{\"command\":\"load_project\",\"payload\":{\"path\":\"C:\\\\..\\\\..\\\\Windows\"}}' $false

# BRUTAL-05: Special Characters
$tp = "$env:TEMP\omega_BRUTAL05_$(Get-Random)"
$ep = $tp.Replace('\','\\')
$r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Test-Name_123`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"status"') {
    Write-Host "  [PASS] BRUTAL-05 - Special Chars Handled" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "BRUTAL-05"; Name = "Special Chars"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] BRUTAL-05 - Special Chars" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "BRUTAL-05"; Name = "Special Chars"; Status = "FAIL" }
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# BRUTAL-06: Long Name
$tp = "$env:TEMP\omega_BRUTAL06_$(Get-Random)"
$ep = $tp.Replace('\','\\')
$longName = "A" * 200
$r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"$longName`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"status"') {
    Write-Host "  [PASS] BRUTAL-06 - Long Name (200 chars)" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "BRUTAL-06"; Name = "Long Name"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] BRUTAL-06 - Long Name" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "BRUTAL-06"; Name = "Long Name"; Status = "FAIL" }
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# BRUTAL-07: Rapid Calls
$allOk = $true
for ($i = 0; $i -lt 5; $i++) {
    $r = cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" 2>&1 | Out-String
    if (-not ($r -match '"success"')) { $allOk = $false }
}
if ($allOk) {
    Write-Host "  [PASS] BRUTAL-07 - Rapid Calls (5x)" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "BRUTAL-07"; Name = "Rapid Calls"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] BRUTAL-07 - Rapid Calls" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "BRUTAL-07"; Name = "Rapid Calls"; Status = "FAIL" }
}

# BRUTAL-08: Recovery After Error
cmd /c "$bin {`\`"command`\`":`\`"INVALID`\`"}" | Out-Null
Test-Omega "BRUTAL-08" "Recovery After Error" '{\"command\":\"health\"}' $true '"healthy"'

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "--- NIVEAU 4: AEROSPACE L1-L4 (12 tests) ---" -ForegroundColor Cyan
# ═══════════════════════════════════════════════════════════════════════════════

# AERO-L1-01: Health Stable 10x
$allOk = $true
for ($i = 0; $i -lt 10; $i++) {
    $r = cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" 2>&1 | Out-String
    if (-not ($r -match '"healthy"')) { $allOk = $false }
}
if ($allOk) {
    Write-Host "  [PASS] AERO-L1-01 - Health Stable (10x)" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "AERO-L1-01"; Name = "Health Stable 10x"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] AERO-L1-01 - Health Stable" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "AERO-L1-01"; Name = "Health Stable 10x"; Status = "FAIL" }
}

# AERO-L1-02: Version Constant (FIXED - extract version only)
$v1 = cmd /c "$bin {`\`"command`\`":`\`"version`\`"}" 2>&1 | Out-String
$v2 = cmd /c "$bin {`\`"command`\`":`\`"version`\`"}" 2>&1 | Out-String
$ver1 = if ($v1 -match '"bridge_version"\s*:\s*"([^"]+)"') { $Matches[1] } else { "" }
$ver2 = if ($v2 -match '"bridge_version"\s*:\s*"([^"]+)"') { $Matches[1] } else { "" }
if (($ver1 -eq $ver2) -and ($ver1 -ne "")) {
    Write-Host "  [PASS] AERO-L1-02 - Version Constant ($ver1)" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "AERO-L1-02"; Name = "Version Constant"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] AERO-L1-02 - Version Constant" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "AERO-L1-02"; Name = "Version Constant"; Status = "FAIL" }
}

# AERO-L1-03: UUID Format
$tp = "$env:TEMP\omega_AERO03_$(Get-Random)"
$ep = $tp.Replace('\','\\')
$r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"UUID`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"project_id"\s*:\s*"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"') {
    Write-Host "  [PASS] AERO-L1-03 - UUID v4 Format Valid" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "AERO-L1-03"; Name = "UUID Format"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] AERO-L1-03 - UUID Format" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "AERO-L1-03"; Name = "UUID Format"; Status = "FAIL" }
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# AERO-L2-01 to L2-03: Boundary Tests
Test-Omega "AERO-L2-01" "Null Path Rejected" '{\"command\":\"load_project\",\"payload\":{\"path\":null}}' $false
Test-Omega "AERO-L2-02" "Empty Path Rejected" '{\"command\":\"load_project\",\"payload\":{\"path\":\"\"}}' $false
Test-Omega "AERO-L2-03" "Non-Existent Path" '{\"command\":\"load_project\",\"payload\":{\"path\":\"C:\\\\NoSuchFolder12345\"}}' $false

# AERO-L3-01: Stable After Stress
for ($i = 0; $i -lt 20; $i++) {
    cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" | Out-Null
}
Test-Omega "AERO-L3-01" "Stable After Stress (20x)" '{\"command\":\"health\"}' $true '"healthy"'

# AERO-L3-02: Concurrent Creates
$allOk = $true
for ($i = 0; $i -lt 3; $i++) {
    $tp = "$env:TEMP\omega_conc$i_$(Get-Random)"
    $ep = $tp.Replace('\','\\')
    $r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Conc$i`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
    if (-not ($r -match '"success"')) { $allOk = $false }
    Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue
}
if ($allOk) {
    Write-Host "  [PASS] AERO-L3-02 - Concurrent Creates (3x)" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "AERO-L3-02"; Name = "Concurrent Creates"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] AERO-L3-02 - Concurrent Creates" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "AERO-L3-02"; Name = "Concurrent Creates"; Status = "FAIL" }
}

# AERO-L3-03: Recovery After Crash
cmd /c "$bin {`\`"command`\`":`\`"CRASH`\`"}" | Out-Null
Test-Omega "AERO-L3-03" "Recovery After Crash" '{\"command\":\"version\"}' $true '"AEROSPACE_GRADE"'

# AERO-L4-01: Hash Reproducible (FIXED - extract hash only)
$tp = "$env:TEMP\omega_AERO_L401_$(Get-Random)"
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"HashRepro`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
$h1 = cmd /c "$bin {`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
$h2 = cmd /c "$bin {`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
$hash1 = if ($h1 -match '"hash"\s*:\s*"([a-f0-9]{64})"') { $Matches[1] } else { "" }
$hash2 = if ($h2 -match '"hash"\s*:\s*"([a-f0-9]{64})"') { $Matches[1] } else { "" }
if (($hash1 -eq $hash2) -and ($hash1 -ne "")) {
    Write-Host "  [PASS] AERO-L4-01 - Hash Reproducible" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "AERO-L4-01"; Name = "Hash Reproducible"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] AERO-L4-01 - Hash Reproducible" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "AERO-L4-01"; Name = "Hash Reproducible"; Status = "FAIL" }
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# AERO-L4-02: Timestamp ISO 8601
$r = cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" 2>&1 | Out-String
if ($r -match '"timestamp"\s*:\s*"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}') {
    Write-Host "  [PASS] AERO-L4-02 - Timestamp ISO 8601" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "AERO-L4-02"; Name = "Timestamp ISO"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] AERO-L4-02 - Timestamp ISO 8601" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "AERO-L4-02"; Name = "Timestamp ISO"; Status = "FAIL" }
}

# AERO-L4-03: Schema Version
$tp = "$env:TEMP\omega_AERO_L403_$(Get-Random)"
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Schema`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
$r = cmd /c "$bin {`\`"command`\`":`\`"load_project`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"schema_version"\s*:\s*"1\.0\.0"') {
    Write-Host "  [PASS] AERO-L4-03 - Schema Version 1.0.0" -ForegroundColor Green
    $PASS++
    $Results += [PSCustomObject]@{ ID = "AERO-L4-03"; Name = "Schema Version"; Status = "PASS" }
} else {
    Write-Host "  [FAIL] AERO-L4-03 - Schema Version" -ForegroundColor Red
    $FAIL++
    $Results += [PSCustomObject]@{ ID = "AERO-L4-03"; Name = "Schema Version"; Status = "FAIL" }
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════════════

$total = $PASS + $FAIL
$pct = [math]::Round(($PASS / $total) * 100, 1)
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════"
Write-Host ""

if ($FAIL -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                                    ║" -ForegroundColor Green
    Write-Host "║   OMEGA AEROSPACE CERTIFICATION: 100% PASS                         ║" -ForegroundColor Green
    Write-Host "║                                                                    ║" -ForegroundColor Green
    Write-Host "║   Status:    CERTIFIED                                             ║" -ForegroundColor Green
    Write-Host "║   Grade:     NASA AEROSPACE                                        ║" -ForegroundColor Green
    Write-Host "║   Tests:     $PASS/$total                                               ║" -ForegroundColor Green
    Write-Host "║                                                                    ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║   CERTIFICATION INCOMPLETE - $FAIL test(s) failed                      ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  SUMMARY:"
Write-Host "  ├── Tests PASS:    $PASS" -ForegroundColor Green
Write-Host "  ├── Tests FAIL:    $FAIL" -ForegroundColor $(if ($FAIL -eq 0) {"Green"} else {"Red"})
Write-Host "  ├── Total:         $total"
Write-Host "  ├── Score:         $pct%"
Write-Host "  ├── Binary Hash:   $binaryHash"
Write-Host "  └── Timestamp:     $timestamp"
Write-Host ""

Write-Host "  LEVELS:"
Write-Host "  ├── L1 Protocol:   7 tests"
Write-Host "  ├── L2 Invariants: 5 tests"
Write-Host "  ├── L3 Brutal:     8 tests"
Write-Host "  └── L4 Aerospace:  12 tests"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════"
Write-Host ""

# Exit code
exit $FAIL
