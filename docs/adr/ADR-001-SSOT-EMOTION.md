# ADR-001: SSOT Emotion Architecture

## Status: ACCEPTED

## Context
sovereign-engine reimplemented trajectory building locally, losing XYZ space,
canonical table physics, and 6 physical laws. 12% exploitation of omega-forge.

## Decision
- omega-forge = SSOT for ALL emotion computation
- sovereign-engine = pure consumer (no local emotion algorithms)
- ForgeEmotionBrief = single rich payload computed once by omega-forge
- @omega/signal-registry = governance of all inter-engine signals

## Consequences
- Sovereign deletes local buildScenePrescribedTrajectory
- All emotion data flows through ForgeEmotionBrief
- Consumer Gate validates required signals before pipeline starts
- GATE-4 CI prevents shadow reimplementations

## Invariants
SSOT-EMO-01, SSOT-EMO-02, BRIEF-01..03, LANG-01, EXH-01, REG-01..05

## Signatures
- Claude (IA Principal): APPROVED
- ChatGPT (Audit): APPROVED
- Francky (Architecte Suprême): APPROVED
