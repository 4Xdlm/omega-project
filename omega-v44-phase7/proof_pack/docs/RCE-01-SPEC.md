# RCE-01 Premium Environment Specification

**Version**: 1.2
**Standard**: NASA-Grade L4 / DO-178C Level A
**Status**: SEALED

---

## Overview

RCE-01 (Render Certified Environment - 01) is the ONLY certified environment for pixel-perfect deterministic rendering in OMEGA Phase 7.

## Environment Stack

```
┌─────────────────────────────────────────┐
│           RCE-01 Docker Image           │
├─────────────────────────────────────────┤
│  Node.js 20.11.0 (locked)               │
│  Playwright (latest with Chromium)      │
│  Chromium (headless, GPU disabled)      │
├─────────────────────────────────────────┤
│  Calibration Parameters (injected)      │
│  Render Profile (validated)             │
├─────────────────────────────────────────┤
│  Base: node:20.11.0-slim                │
└─────────────────────────────────────────┘
```

## Docker Build Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `ANISO_MIN` | float | Minimum anisotropy (-0.3 default) |
| `ANISO_MAX` | float | Maximum anisotropy (0.3 default) |
| `OPACITY_BASE` | float | Base opacity (0.7 default) |
| `OPACITY_Z_COEF` | float | Z-axis opacity coefficient (0.3 default) |
| `OXYGEN_AMP_MAX` | float | Max O₂ amplitude (0.05 default) |
| `RENDER_TIMEOUT` | int | Render timeout in ms (50 default) |

## Build Process

```dockerfile
# Validation: All args MUST be provided
RUN test -n "$ANISO_MIN" || (echo "ERROR: ANISO_MIN required" && exit 1)
RUN test -n "$ANISO_MAX" || (echo "ERROR: ANISO_MAX required" && exit 1)
# ... (all args validated)

# Dependencies: Strict lockfile
RUN npm ci

# Playwright: Install Chromium with dependencies
RUN npx playwright install chromium --with-deps

# SBOM: Generate software bill of materials
RUN npm list --json > /app/SBOM.json
```

## Chromium Configuration

```javascript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-web-security',
    '--single-process',
  ],
});
```

## Render Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| Viewport | 512×512 | Standard output size |
| Device Scale | 1 | No DPI scaling |
| Color Space | sRGB | Web standard |
| Antialiasing | chromium-default | Deterministic |
| GPU | disabled | Reproducibility |
| Fonts | none | No text in output |

## Artifacts Generated

| File | Description |
|------|-------------|
| `image.digest` | Docker image SHA256 digest |
| `package-lock.json.sha256` | Lockfile hash |
| `SBOM.json` | Software bill of materials |
| `RCE-01.json` | Post-injection render profile |

## Verification Commands

```powershell
# Build RCE-01
./scripts/build-rce01.ps1

# Verify image digest
docker inspect --format='{{.Id}}' omega-rce01:latest

# Run render
./scripts/run-rce01-render.ps1

# Full validation
./scripts/OMEGA_PHASE7_RUN.ps1
```

## Determinism Guarantee

Within RCE-01:
- Same `trunk_signature` input
- Same `RCE-01.json` profile
- Same Docker image digest
- → **Identical `trunk.png.sha256` output**

This is verified by test TR-01 (100 runs).

---

*Specification Version: 1.2 | SEALED*
