# GATE-4: No Shadow Implementations
$forbidden = @(
  'buildTrajectoryFromWaypoints',
  'buildTrajectoryCore',
  'EMOTION_KEYWORDS\s*[:=]',
  'function\s+toOmegaState',
  'function\s+fromOmegaState',
  'function\s+verifyLaw',
  'function\s+checkInertia',
  'function\s+checkFeasibility'
)

$violations = 0
foreach ($pattern in $forbidden) {
  $matches = Get-ChildItem "packages\sovereign-engine\src" -Recurse -Filter "*.ts" |
    Select-String -Pattern $pattern |
    Where-Object { $_.Line -notmatch "from\s+['""]@omega/" }
  if ($matches) {
    Write-Host "VIOLATION: $pattern"
    $matches | ForEach-Object { Write-Host "  $_" }
    $violations++
  }
}

if ($violations -gt 0) {
  Write-Error "GATE-4 FAIL: $violations shadow implementation(s)"
  exit 1
}
Write-Host "GATE-4 PASS"
