# CHANGELOG

## [Phase 7 v1.2] - 2026-01-23 â€” UI ADN MYCELIUM (TRONC)

### Ajoute
- **RCE-01 Premium**: Environnement certifie deterministe
  - Docker image immuable (digest capture)
  - Node.js + Playwright + Chromium (versions lockees)
  - Calibration runtime (injection build args)

- **Trunk Renderer**: Rendu SVG/PNG disque anisotrope
  - O2 integre au contour (pas anneau separe)
  - H/S/L depuis noyau (pas calcul UI)
  - Zero magic numbers (params injectes)
  - Determinisme pixel-perfect prouve

- **Tests Certifies**: 40 tests PASS
  - TR-01: Determinism (100 runs)
  - TR-02: No magic numbers
  - TR-03: Extremes
  - TR-04: Orientations
  - TR-05: Schema validation
  - TR-06: Forbidden elements
  - TR-07: Schema freeze

- **Proof Pack**: Archive complete
  - 43 fichiers (sources + artifacts + docs)
  - SHA256: 356A3971CFED7C68...

### Specifications
- RENDER_CONTRACT.md
- RCE-01-SPEC.md
- ALGORITHMS.md
- TRONC-SPEC-v1.2.md
- PARAMS_SCHEMA.json

### Interdictions Definitives
- `<text>` dans SVG
- Grille visible
- Cercle O2 separe
- Calcul H/S/L cote UI
- Magic numbers en dur
- Champs additionnels render_report.json

### Artifacts Certifies
- trunk.svg (SHA256: 3685e427f534400e...)
- trunk.png (SHA256: 8524835FB8E66C9C...)
- render_report.json (schema freeze valide)

### Standard
- NASA-Grade L4 / DO-178C
- Determinisme RCE-01 Premium
- Schema contractuel fige

### Status
FROZEN â€” Aucune modification sans version majeure
