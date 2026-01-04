# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA PROJECT — EVIDENCE PACK TESTS (Pester 3.x compatible)
# Phase 12 — Industrial Deployment
# Standard: NASA-Grade L4 / DO-178C Level A
# ═══════════════════════════════════════════════════════════════════════════════
#
# INVARIANTS TESTED:
# - INV-DEP-03: Evidence pack complet (tous les fichiers attendus)
#
# USAGE:
#   Invoke-Pester -Script .\deployment\tests\evidence_pack.pester.ps1
#
# ═══════════════════════════════════════════════════════════════════════════════

Describe "INV-DEP-03: Evidence Pack Completeness" {
    
    $script:projectRoot = Get-Location
    
    if (-not (Test-Path "OMEGA_PHASE12")) {
        $parent = Split-Path $script:projectRoot -Parent
        if (Test-Path (Join-Path $parent "OMEGA_PHASE12")) {
            $script:projectRoot = $parent
        }
    }
    
    $script:evidenceDir = Join-Path $script:projectRoot "evidence\PHASE_12_EVIDENCE"
    
    Context "Script validity" {
        
        It "evidence_pack.ps1 exists" {
            $scriptPath = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\evidence_pack.ps1"
            (Test-Path $scriptPath) | Should Be $true
        }
        
        It "evidence_pack.ps1 has valid PowerShell syntax" {
            $scriptPath = Join-Path $script:projectRoot "OMEGA_PHASE12\deployment\scripts\evidence_pack.ps1"
            
            if (Test-Path $scriptPath) {
                $errors = $null
                [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$null, [ref]$errors)
                $errors.Count | Should Be 0
            }
        }
    }
    
    Context "Evidence files structure definition" {
        
        It "defines 7 required evidence files" {
            $requiredFiles = @(
                "tests.log",
                "manifest.files.sha256",
                "manifest.merkle.json",
                "manifest.root.sha256",
                "diff_core_vs_phase11.txt",
                "git_status.txt",
                "meta.txt"
            )
            $requiredFiles.Count | Should Be 7
        }
        
        It "includes manifest files in required list" {
            $requiredFiles = @(
                "manifest.files.sha256",
                "manifest.merkle.json",
                "manifest.root.sha256"
            )
            $requiredFiles.Count | Should Be 3
        }
    }
}
