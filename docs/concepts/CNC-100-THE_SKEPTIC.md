# CNC-100 — THE_SKEPTIC

## Métadonnées

| Attribut | Valeur |
|----------|--------|
| **ID** | CNC-100 |
| **Nom** | THE_SKEPTIC |
| **Statut** | 🟢 IMPLEMENTED |
| **Type** | Contre-pouvoir / Détecteur |
| **Module** | gateway/src/profiles.ts |
| **Date création** | 2026-01-03 |
| **Auteur** | Claude + Francky |

## Description

THE_SKEPTIC n'est PAS un simple profil lecteur.
C'est une **fonction de vérité** qui:
- Détecte le "ça passe mais c'est faux"
- Refuse le confort narratif
- Pointe les contradictions exactes
- Ne pardonne RIEN

## Position dans le Pipeline
```
ORACLE → THE_SKEPTIC → QUALITY_GATES
         (contre-pouvoir)
```

## Invariants

| ID | Description | Test |
|----|-------------|------|
| INV-SKEP-01 | Aucun passage accepté sans justification | profiles.test.ts |
| INV-SKEP-02 | Détection de confort narratif obligatoire | profiles.test.ts |
| INV-SKEP-03 | Mémoire parfaite des causes/effets | profiles.test.ts |
| INV-SKEP-04 | Zéro tolérance aux Deus Ex Machina | profiles.test.ts |

## Triggers

- `DEUS_EX_MACHINA` — Solution miracle non méritée
- `CHARACTER_STUPIDITY` — Personnage agit bêtement pour le script
- `PHYSICS_VIOLATION` — Règles du monde violées
- `TIMELINE_ERROR` — Erreur chronologique
- `PLOT_ARMOR` — Immunité narrative injustifiée

## Liens

- QUALITY_GATES (validation)
- POLISH++ (contre-proposition)
- ORACLE (remise en question)
- EDITOR_GHOST (jugement)

---

**Document CNC-100 — Version 1.0 — FROZEN**
