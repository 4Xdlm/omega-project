# ═══════════════════════════════════════════════════════════════════════════
# OMEGA Phase 7 — Generate Test Fixtures
#
# Standard: NASA-Grade L4 / DO-178C Level A
# Version: 1.2
#
# Generates 20+ test fixtures covering various parameter combinations.
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "OMEGA Phase 7 - Generate Test Fixtures" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FixturesDir = Join-Path $RootDir "fixtures\trunk"

# Ensure directory exists
if (-not (Test-Path $FixturesDir)) {
    New-Item -ItemType Directory -Path $FixturesDir -Force | Out-Null
}

# Fixture definitions
$Fixtures = @(
    # Basic orientations (4 unique shapes due to 180° symmetry)
    @{ id = "orientation-north"; orientation = 0; amplitude = 0.5; h = 200; s = 0.6; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "orientation-east"; orientation = 1.5707963; amplitude = 0.5; h = 200; s = 0.6; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "orientation-south"; orientation = 3.1415926; amplitude = 0.5; h = 200; s = 0.6; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "orientation-west"; orientation = 4.7123889; amplitude = 0.5; h = 200; s = 0.6; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },

    # Amplitude extremes
    @{ id = "amplitude-zero"; orientation = 0.785398; amplitude = 0; h = 180; s = 0.5; l = 0.5; persistence = 0.5; oxygenLevel = 50; oxygenAmp = 0.02; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "amplitude-max"; orientation = 0.785398; amplitude = 1; h = 180; s = 0.5; l = 0.5; persistence = 0.5; oxygenLevel = 50; oxygenAmp = 0.02; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "amplitude-quarter"; orientation = 0.785398; amplitude = 0.25; h = 180; s = 0.5; l = 0.5; persistence = 0.5; oxygenLevel = 50; oxygenAmp = 0.02; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "amplitude-three-quarter"; orientation = 0.785398; amplitude = 0.75; h = 180; s = 0.5; l = 0.5; persistence = 0.5; oxygenLevel = 50; oxygenAmp = 0.02; oxygenFreq = 6; oxygenPhase = 0 },

    # Persistence (opacity) extremes
    @{ id = "persistence-zero"; orientation = 0; amplitude = 0.5; h = 120; s = 0.7; l = 0.5; persistence = 0; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "persistence-max"; orientation = 0; amplitude = 0.5; h = 120; s = 0.7; l = 0.5; persistence = 1; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },

    # Oxygen extremes
    @{ id = "oxygen-depleted"; orientation = 0; amplitude = 0.5; h = 0; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 0; oxygenAmp = 0; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "oxygen-saturated"; orientation = 0; amplitude = 0.5; h = 240; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 100; oxygenAmp = 0.05; oxygenFreq = 6; oxygenPhase = 0 },

    # Color variations (H = hue: 0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta)
    @{ id = "color-red"; orientation = 0.5; amplitude = 0.5; h = 0; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "color-yellow"; orientation = 0.5; amplitude = 0.5; h = 60; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "color-green"; orientation = 0.5; amplitude = 0.5; h = 120; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "color-cyan"; orientation = 0.5; amplitude = 0.5; h = 180; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "color-blue"; orientation = 0.5; amplitude = 0.5; h = 240; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },
    @{ id = "color-magenta"; orientation = 0.5; amplitude = 0.5; h = 300; s = 0.8; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 },

    # Oxygen frequency variations
    @{ id = "oxygen-freq-low"; orientation = 0; amplitude = 0.5; h = 200; s = 0.6; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.04; oxygenFreq = 3; oxygenPhase = 0 },
    @{ id = "oxygen-freq-high"; orientation = 0; amplitude = 0.5; h = 200; s = 0.6; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.04; oxygenFreq = 12; oxygenPhase = 0 },

    # Combined variations
    @{ id = "combined-bright"; orientation = 2.356194; amplitude = 0.8; h = 50; s = 0.9; l = 0.7; persistence = 0.9; oxygenLevel = 80; oxygenAmp = 0.04; oxygenFreq = 8; oxygenPhase = 1.5707963 },
    @{ id = "combined-dark"; orientation = 5.497787; amplitude = 0.3; h = 270; s = 0.4; l = 0.3; persistence = 0.3; oxygenLevel = 20; oxygenAmp = 0.01; oxygenFreq = 4; oxygenPhase = 3.1415926 },

    # Default reference
    @{ id = "default"; orientation = 0.785398; amplitude = 0.5; h = 200; s = 0.6; l = 0.5; persistence = 0.7; oxygenLevel = 50; oxygenAmp = 0.03; oxygenFreq = 6; oxygenPhase = 0 }
)

Write-Host "`nGenerating $($Fixtures.Count) fixtures..."

foreach ($fixture in $Fixtures) {
    $Signature = @{
        id = $fixture.id
        orientation = $fixture.orientation
        amplitude = $fixture.amplitude
        color = @{
            h = $fixture.h
            s = $fixture.s
            l = $fixture.l
        }
        persistence = $fixture.persistence
        oxygen = @{
            level = $fixture.oxygenLevel
            amplitude = $fixture.oxygenAmp
            frequency = $fixture.oxygenFreq
            phase = $fixture.oxygenPhase
        }
        sourceHash = "sha256:fixture-$($fixture.id)"
    }

    $FilePath = Join-Path $FixturesDir "$($fixture.id).json"
    $Signature | ConvertTo-Json -Depth 10 | Out-File -FilePath $FilePath -Encoding utf8
    Write-Host "  Created: $($fixture.id).json"
}

Write-Host "`n[OK] Generated $($Fixtures.Count) test fixtures!" -ForegroundColor Green
Write-Host "  Location: $FixturesDir"
