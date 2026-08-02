# Inventaire du working tree au moment du gel A0 (exigence pre-A2).
# LECTURE SEULE : archive, ne nettoie rien. MANUSCRIT_V4_COH7.md porte le patch
# COH7 en attente de decision Architecte -> aucun fichier supprime ni ignore.
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\elric\omega-project'

$rows = @()
foreach ($line in (git status --porcelain)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $st = $line.Substring(0, 2).Trim()
    $p  = $line.Substring(3).Trim().Trim('"')
    $o  = [ordered]@{ status = $st; path = $p }
    if (Test-Path -LiteralPath $p -PathType Leaf) {
        $o['bytes']  = (Get-Item -LiteralPath $p).Length
        $o['sha256'] = (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash
    } else {
        $o['note'] = 'dir_or_missing'
    }
    $rows += [pscustomobject]$o
}

$mod   = @($rows | Where-Object { $_.status -eq 'M' })
$unt   = @($rows | Where-Object { $_.status -eq '??' })
$runs  = @($unt  | Where-Object { $_.path -like 'packages/book-factory/runs*' })
$other = @($unt  | Where-Object { $_.path -notlike 'packages/book-factory/runs*' })

$concat = ($runs | Where-Object { $_.sha256 } | Sort-Object sha256 | ForEach-Object { $_.sha256 }) -join ''
$sha = [System.Security.Cryptography.SHA256]::Create()
$digest = ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($concat)) | ForEach-Object { $_.ToString('x2') }) -join ''

$man = [ordered]@{
    spec   = 'WORKING_TREE_INVENTORY_AT_A0'
    date   = (Get-Date).ToUniversalTime().ToString('o')
    head   = (git rev-parse HEAD)
    reason = 'Exigence pre-A2 : rendre le working tree auditable SANS le nettoyer. Aucun fichier supprime ni ignore - MANUSCRIT_V4_COH7.md porte le patch COH7 en attente de decision Architecte.'
    counts = [ordered]@{
        modified_tracked        = $mod.Count
        untracked_total         = $unt.Count
        untracked_runs_artifacts = $runs.Count
        untracked_other         = $other.Count
    }
    modified_tracked      = $mod
    untracked_other       = $other
    untracked_runs_digest = $digest
    untracked_runs_paths  = @($runs | ForEach-Object { $_.path })
}

New-Item -ItemType Directory -Force -Path 'nexus\proof' | Out-Null
$man | ConvertTo-Json -Depth 6 | Out-File -FilePath 'nexus\proof\WORKING_TREE_INVENTORY_A0_2026-08-02.json' -Encoding utf8

Write-Output ("modifies (tracked) : " + $mod.Count)
Write-Output ("untracked          : " + $unt.Count + " | runs/ : " + $runs.Count + " | autres : " + $other.Count)
Write-Output ("digest agrege runs/: " + $digest.Substring(0, 32))
Write-Output '--- modifies ---'
$mod | ForEach-Object { Write-Output ("  " + $_.path + "  " + $_.sha256.Substring(0, 16)) }
