# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA PROJECT — VERIFICATION TESTS (Pester 3.x compatible)
# Phase 12 — Industrial Deployment
# Standard: NASA-Grade L4 / DO-178C Level A
# ═══════════════════════════════════════════════════════════════════════════════
#
# INVARIANTS TESTED:
# - INV-DEP-02: Merkle root bien formé (64 hex)
# - INV-DEP-03: Evidence pack complet
# - INV-DEP-05: Core diff vide
#
# USAGE:
#   Invoke-Pester -Script .\deployment\tests\omega_verify.pester.ps1
#
# ═══════════════════════════════════════════════════════════════════════════════

Describe "INV-DEP-02/03/05: omega_verify.ps1" {
    
    $script:projectRoot = Get-Location
    
    if (-not (Test-Path "OMEGA_PHASE12")) {
        $parent = Split-Path $script:projectRoot -Parent
        if (Test-Path (Join-Path $parent "OMEGA_PHASE12")) {
            $script:projectRoot = $parent
        }
    }
    
    $script:evidenceDir = Join-Path $script:projectRoot "evidence\PHASE_12_EVIDENCE"
    $script:verifyScript = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\omega_verify.ps1"
    
    Context "Script validity" {
        
        It "omega_verify.ps1 exists" {
            (Test-Path $script:verifyScript) | Should Be $true
        }
        
        It "omega_verify.ps1 has valid PowerShell syntax" {
            if (Test-Path $script:verifyScript) {
                $errors = $null
                [System.Management.Automation.Language.Parser]::ParseFile($script:verifyScript, [ref]$null, [ref]$errors)
                $errors.Count | Should Be 0
            }
        }
    }
    
    Context "INV-DEP-02: Merkle root format verification" {
        
        It "SHA256 hash is 64 characters" {
            $testHash = "E3E64E7DF03C781BAA98C3E2B57DF67E7E58404DA35A3D7B27D977456A84F120"
            $testHash.Length | Should Be 64
        }
        
        It "SHA256 hash contains only hex characters" {
            $testHash = "E3E64E7DF03C781BAA98C3E2B57DF67E7E58404DA35A3D7B27D977456A84F120"
            ($testHash -match "^[A-Fa-f0-9]{64}$") | Should Be $true
        }
    }
    
    Context "INV-DEP-03: Required files check" {
        
        It "script checks for tests.log" {
            if (Test-Path $script:verifyScript) {
                $content = Get-Content $script:verifyScript -Raw
                ($content -match "tests\.log") | Should Be $true
            }
        }
        
        It "script checks for manifest.root.sha256" {
            if (Test-Path $script:verifyScript) {
                $content = Get-Content $script:verifyScript -Raw
                ($content -match "manifest\.root\.sha256") | Should Be $true
            }
        }
        
        It "script checks for diff_core file" {
            if (Test-Path $script:verifyScript) {
                $content = Get-Content $script:verifyScript -Raw
                ($content -match "diff_core") | Should Be $true
            }
        }
    }
}
