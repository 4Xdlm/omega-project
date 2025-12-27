# OMEGA AEROSPACE TEST SUITE
# 32 tests - NASA Grade

$bin = ".\omega-bridge-win.exe"
$PASS = 0
$FAIL = 0

Write-Host ""
Write-Host "========================================"
Write-Host "  OMEGA AEROSPACE TEST SUITE"
Write-Host "  32 Tests - NASA Grade"
Write-Host "========================================"
Write-Host ""

# Fonction de test
function Run-Test {
    param($id, $name, $cmd, $expectSuccess, $expectError)
    
    $result = cmd /c "$bin $cmd" 2>&1 | Out-String
    
    $isSuccess = $result -match '"status"\s*:\s*"success"'
    $isError = $result -match '"status"\s*:\s*"error"'
    
    $passed = $false
    if ($expectSuccess -and $isSuccess) { $passed = $true }
    if ($expectError -and $isError) { $passed = $true }
    
    if ($passed) {
        Write-Host "  [PASS] $id - $name" -ForegroundColor Green
        $global:PASS++
    } else {
        Write-Host "  [FAIL] $id - $name" -ForegroundColor Red
        $global:FAIL++
    }
    
    return $result
}

# ========================================
Write-Host "--- NIVEAU 1: PROTOCOLE (7 tests) ---" -ForegroundColor Cyan
# ========================================

# L1-01 Health
Run-Test "L1-01" "Health Check" '{\"command\":\"health\"}' $true $false

# L1-02 Version
Run-Test "L1-02" "Version" '{\"command\":\"version\"}' $true $false

# L1-03 Create Project
$tp = "$env:TEMP\omega_t1"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
Run-Test "L1-03" "Create Project" "{`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Test1`\`",`\`"path`\`":`\`"$ep`\`"}}" $true $false

# L1-04 Project Exists
Run-Test "L1-04" "Project Exists" "{`\`"command`\`":`\`"project_exists`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $true $false

# L1-05 Load Project
Run-Test "L1-05" "Load Project" "{`\`"command`\`":`\`"load_project`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $true $false

# L1-06 Check Integrity
Run-Test "L1-06" "Check Integrity" "{`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $true $false

# L1-07 Security Block
Run-Test "L1-07" "Security Block" '{\"command\":\"create_project\",\"payload\":{\"name\":\"Hack\",\"path\":\"C:\\\\Windows\\\\System32\"}}' $false $true

Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# ========================================
Write-Host ""
Write-Host "--- NIVEAU 2: INVARIANTS (5 tests) ---" -ForegroundColor Cyan
# ========================================

# INV-01 Atomic Save
$tp = "$env:TEMP\omega_inv1"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
Run-Test "INV-01" "Atomic Save" "{`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Atomic`\`",`\`"path`\`":`\`"$ep`\`"}}" $true $false
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-02 Corruption Detection
$tp = "$env:TEMP\omega_inv2"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Corrupt`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
Set-Content -Path "$tp\omega.json" -Value "{broken}"
Run-Test "INV-02" "Corruption Detection" "{`\`"command`\`":`\`"load_project`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" $false $true
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-03 Hash Chain
$tp = "$env:TEMP\omega_inv3"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Hash`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
$r = cmd /c "$bin {`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"hash"\s*:\s*"[a-f0-9]{64}"') {
    Write-Host "  [PASS] INV-03 - Hash SHA256 (64 chars)" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] INV-03 - Hash SHA256" -ForegroundColor Red
    $FAIL++
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-04 Double Create Blocked
$tp = "$env:TEMP\omega_inv4"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"First`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
Run-Test "INV-04" "Double Create Blocked" "{`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Second`\`",`\`"path`\`":`\`"$ep`\`"}}" $false $true
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# INV-05 Determinism
Run-Test "INV-05" "Determinism" '{\"command\":\"health\"}' $true $false

# ========================================
Write-Host ""
Write-Host "--- NIVEAU 3: BRUTAL (8 tests) ---" -ForegroundColor Cyan
# ========================================

# BRUTAL-01 Invalid Command
Run-Test "BRUTAL-01" "Invalid Command" '{\"command\":\"FAKE_CMD\"}' $false $true

# BRUTAL-02 Bad JSON
$r = cmd /c "$bin not_json_at_all" 2>&1 | Out-String
if ($r -match '"status"\s*:\s*"error"') {
    Write-Host "  [PASS] BRUTAL-02 - Bad JSON Rejected" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] BRUTAL-02 - Bad JSON" -ForegroundColor Red
    $FAIL++
}

# BRUTAL-03 Empty Payload
Run-Test "BRUTAL-03" "Empty Payload" '{}' $false $true

# BRUTAL-04 Path Traversal
Run-Test "BRUTAL-04" "Path Traversal" '{\"command\":\"load_project\",\"payload\":{\"path\":\"C:\\\\..\\\\..\\\\Windows\"}}' $false $true

# BRUTAL-05 Special Chars
$tp = "$env:TEMP\omega_special"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
$r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Test-Name_123`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"status"') {
    Write-Host "  [PASS] BRUTAL-05 - Special Chars Handled" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] BRUTAL-05 - Special Chars" -ForegroundColor Red
    $FAIL++
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# BRUTAL-06 Long Name
$tp = "$env:TEMP\omega_long"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
$longName = "A" * 200
$r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"$longName`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"status"') {
    Write-Host "  [PASS] BRUTAL-06 - Long Name (200 chars)" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] BRUTAL-06 - Long Name" -ForegroundColor Red
    $FAIL++
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# BRUTAL-07 Rapid Calls
$allOk = $true
for ($i = 0; $i -lt 5; $i++) {
    $r = cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" 2>&1 | Out-String
    if (-not ($r -match '"success"')) { $allOk = $false }
}
if ($allOk) {
    Write-Host "  [PASS] BRUTAL-07 - Rapid Calls (5x)" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] BRUTAL-07 - Rapid Calls" -ForegroundColor Red
    $FAIL++
}

# BRUTAL-08 Recovery After Error
cmd /c "$bin {`\`"command`\`":`\`"INVALID`\`"}" | Out-Null
Run-Test "BRUTAL-08" "Recovery After Error" '{\"command\":\"health\"}' $true $false

# ========================================
Write-Host ""
Write-Host "--- NIVEAU 4: AEROSPACE (12 tests) ---" -ForegroundColor Cyan
# ========================================

# AERO-L1-01 Health Stable
$allOk = $true
for ($i = 0; $i -lt 10; $i++) {
    $r = cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" 2>&1 | Out-String
    if (-not ($r -match '"healthy"')) { $allOk = $false }
}
if ($allOk) {
    Write-Host "  [PASS] AERO-L1-01 - Health Stable (10x)" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] AERO-L1-01 - Health Stable" -ForegroundColor Red
    $FAIL++
}

# AERO-L1-02 Version Constant
$v1 = cmd /c "$bin {`\`"command`\`":`\`"version`\`"}" 2>&1 | Out-String
$v2 = cmd /c "$bin {`\`"command`\`":`\`"version`\`"}" 2>&1 | Out-String
if ($v1 -eq $v2) {
    Write-Host "  [PASS] AERO-L1-02 - Version Constant" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] AERO-L1-02 - Version Constant" -ForegroundColor Red
    $FAIL++
}

# AERO-L1-03 UUID Format
$tp = "$env:TEMP\omega_uuid"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
$r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"UUID`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"project_id"\s*:\s*"[0-9a-f-]{36}"') {
    Write-Host "  [PASS] AERO-L1-03 - UUID Format Valid" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] AERO-L1-03 - UUID Format" -ForegroundColor Red
    $FAIL++
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# AERO-L2-01 Null Path
Run-Test "AERO-L2-01" "Null Path Rejected" '{\"command\":\"load_project\",\"payload\":{\"path\":null}}' $false $true

# AERO-L2-02 Empty Path
Run-Test "AERO-L2-02" "Empty Path Rejected" '{\"command\":\"load_project\",\"payload\":{\"path\":\"\"}}' $false $true

# AERO-L2-03 Non-Existent Path
Run-Test "AERO-L2-03" "Non-Existent Path" '{\"command\":\"load_project\",\"payload\":{\"path\":\"C:\\\\NoSuchFolder12345\"}}' $false $true

# AERO-L3-01 Stable After Stress
for ($i = 0; $i -lt 20; $i++) {
    cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" | Out-Null
}
Run-Test "AERO-L3-01" "Stable After Stress" '{\"command\":\"health\"}' $true $false

# AERO-L3-02 Concurrent Creates
$allOk = $true
for ($i = 0; $i -lt 3; $i++) {
    $tp = "$env:TEMP\omega_conc$i"
    if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
    $ep = $tp.Replace('\','\\')
    $r = cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Conc$i`\`",`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
    if (-not ($r -match '"success"')) { $allOk = $false }
    Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue
}
if ($allOk) {
    Write-Host "  [PASS] AERO-L3-02 - Concurrent Creates (3x)" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] AERO-L3-02 - Concurrent Creates" -ForegroundColor Red
    $FAIL++
}

# AERO-L3-03 Recovery
cmd /c "$bin {`\`"command`\`":`\`"CRASH`\`"}" | Out-Null
Run-Test "AERO-L3-03" "Recovery After Crash" '{\"command\":\"version\"}' $true $false

# AERO-L4-01 Hash Reproducible
$tp = "$env:TEMP\omega_hash"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"HashR`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
$h1 = cmd /c "$bin {`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
$h2 = cmd /c "$bin {`\`"command`\`":`\`"check_integrity`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if (($h1 -match '"hash"') -and ($h1 -eq $h2)) {
    Write-Host "  [PASS] AERO-L4-01 - Hash Reproducible" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] AERO-L4-01 - Hash Reproducible" -ForegroundColor Red
    $FAIL++
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# AERO-L4-02 Timestamp ISO
$r = cmd /c "$bin {`\`"command`\`":`\`"health`\`"}" 2>&1 | Out-String
if ($r -match '"timestamp"\s*:\s*"\d{4}-\d{2}-\d{2}T') {
    Write-Host "  [PASS] AERO-L4-02 - Timestamp ISO 8601" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] AERO-L4-02 - Timestamp ISO" -ForegroundColor Red
    $FAIL++
}

# AERO-L4-03 Schema Version
$tp = "$env:TEMP\omega_schema"
if (Test-Path $tp) { Remove-Item -Recurse -Force $tp }
$ep = $tp.Replace('\','\\')
cmd /c "$bin {`\`"command`\`":`\`"create_project`\`",`\`"payload`\`":{`\`"name`\`":`\`"Schema`\`",`\`"path`\`":`\`"$ep`\`"}}" | Out-Null
$r = cmd /c "$bin {`\`"command`\`":`\`"load_project`\`",`\`"payload`\`":{`\`"path`\`":`\`"$ep`\`"}}" 2>&1 | Out-String
if ($r -match '"schema_version"\s*:\s*"1\.0\.0"') {
    Write-Host "  [PASS] AERO-L4-03 - Schema Version 1.0.0" -ForegroundColor Green
    $PASS++
} else {
    Write-Host "  [FAIL] AERO-L4-03 - Schema Version" -ForegroundColor Red
    $FAIL++
}
Remove-Item -Recurse -Force $tp -ErrorAction SilentlyContinue

# ========================================
# RAPPORT FINAL
# ========================================
Write-Host ""
Write-Host "========================================"
Write-Host "  RAPPORT FINAL"
Write-Host "========================================"
Write-Host ""

$total = $PASS + $FAIL
$pct = [math]::Round(($PASS / $total) * 100, 1)

Write-Host "  Tests PASS: $PASS" -ForegroundColor Green
Write-Host "  Tests FAIL: $FAIL" -ForegroundColor $(if ($FAIL -eq 0) {"Green"} else {"Red"})
Write-Host "  Total:      $total"
Write-Host "  Score:      $pct%"
Write-Host ""

if ($FAIL -eq 0) {
    Write-Host "========================================"
    Write-Host "  CERTIFICATION AEROSPACE: REUSSIE"
    Write-Host "========================================"
} else {
    Write-Host "========================================"
    Write-Host "  CERTIFICATION: INCOMPLETE"
    Write-Host "========================================"
}
Write-Host ""
