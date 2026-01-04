# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA PROJECT — DEPLOYMENT TESTS (Pester 3.x compatible)
# Phase 12 — Industrial Deployment
# Standard: NASA-Grade L4 / DO-178C Level A
# ═══════════════════════════════════════════════════════════════════════════════
#
# INVARIANTS TESTED:
# - INV-DEP-01: Déploiement 1 commande, sans interaction
#
# USAGE:
#   Invoke-Pester -Script .\deployment\tests\omega_deploy.pester.ps1
#
# ═══════════════════════════════════════════════════════════════════════════════

Describe "INV-DEP-01: omega_deploy.ps1" {
    
    $script:projectRoot = Get-Location
    
    if (-not (Test-Path "OMEGA_PHASE12")) {
        $parent = Split-Path $script:projectRoot -Parent
        if (Test-Path (Join-Path $parent "OMEGA_PHASE12")) {
            $script:projectRoot = $parent
        }
    }
    
    Context "Script exists and is valid PowerShell" {
        
        It "omega_deploy.ps1 exists" {
            $scriptPath = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\omega_deploy.ps1"
            (Test-Path $scriptPath) | Should Be $true
        }
        
        It "omega_deploy.ps1 has valid PowerShell syntax" {
            $scriptPath = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\omega_deploy.ps1"
            
            if (Test-Path $scriptPath) {
                $errors = $null
                [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$null, [ref]$errors)
                $errors.Count | Should Be 0
            }
        }
        
        It "evidence_pack.ps1 exists" {
            $scriptPath = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\evidence_pack.ps1"
            (Test-Path $scriptPath) | Should Be $true
        }
        
        It "omega_verify.ps1 exists" {
            $scriptPath = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\omega_verify.ps1"
            (Test-Path $scriptPath) | Should Be $true
        }
        
        It "merkle_manifest.node.mjs exists" {
            $scriptPath = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\merkle_manifest.node.mjs"
            (Test-Path $scriptPath) | Should Be $true
        }
    }
}
