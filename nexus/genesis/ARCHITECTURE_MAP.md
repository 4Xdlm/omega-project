# OMEGA — ARCHITECTURE MAP

## Vue Globale
```
┌─────────────────────────────────────────────────────────────┐
│                      OMEGA PROJECT                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   GENOME    │  │  MYCELIUM   │  │  SENTINEL   │          │
│  │  FROZEN     │  │  FROZEN     │  │   Gateway   │          │
│  │   v1.2.0    │  │   v1.0.0    │  │   Active    │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│                 ┌─────────────────┐                         │
│                 │   NEXUS CORE    │                         │
│                 │  Orchestration  │                         │
│                 └─────────────────┘                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  nexus/proof/    → Certifications & Preuves                 │
│  nexus/genesis/  → Onboarding (CE DOSSIER)                  │
│  docs/           → Documentation technique                  │
└─────────────────────────────────────────────────────────────┘
```

## Responsabilités
| Module | Rôle | Status |
|--------|------|--------|
| genome | Analyse émotionnelle | FROZEN |
| mycelium | Validation layer | FROZEN |
| sentinel | Security gateway | Active |
| nexus | Orchestration | Active |

## Data Flow
```
Input → Sentinel (security) → Genome (analysis) → Mycelium (validation) → Output
```
