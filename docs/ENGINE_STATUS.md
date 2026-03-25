# OMEGA — ENGINE STATUS (SSOT Runtime)
# Dernière mise à jour : 2026-03-25
# Ce fichier fait autorité sur l'état courant du moteur.
# Tout autre document en contradiction = HISTORICAL SNAPSHOT.

## Moteur actif

```
Nom       : PF_base_Duras_correcteur_K2_v4
Tag       : moteur-production-v1
Commit    : 9e0263b4
Statut    : SCELLÉ PRODUCTION
Date seal : 2026-03-25
```

## Architecture

```
4 chunks × 750w = ~3000w cible
LLM : claude-sonnet-4-20250514, temp=0.75, max_tokens=2500/chunk

Chunk 1 : PF_PERSONA + RAPPEL_CHUNKS12 + SceneBrief
Chunk 2 : PF_PERSONA + RAPPEL_CHUNKS12 + last200w
Chunk 3 : PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w
Chunk 4 : PF_PERSONA + RAPPEL_CHUNKS34_V4 + last200w + "conclus"
```

## Juges

| Contexte | Juge | Rôle |
|----------|------|------|
| Microbench ≤600w, mean >8w | GB V1 (gb-scorer.ts) | Informatif |
| Décision longue forme | MS V2 (multi-stage-scorer-v2.ts) | Décisionnel (seuil ≥90) |
| Composite production | MacroSScore (ECC/RCI/SII/IFI/AAI) | SAGA_READY / SEAL_ATOMIC |

## Seuils contextuels (L27)

| Type de scène | Drift | CV min | f26b min | Condition |
|---------------|-------|--------|----------|-----------|
| Contemplation | ±15 | ≥ 0.80 | > 0.40 | standard |
| Dialogue | ±15 | ≥ 0.65 | > 0.40 | V2 ≥ 90 |
| Confrontation | ±35 | ≥ 0.80 | > 0.40 | V2 ≥ 90 |

## Critères continuité inter-chapitres (L28)

| Métrique | Seuil | Note |
|----------|-------|------|
| ΔV2 | < 15 | Décisionnel |
| Δf26b | < 0.150 | Décisionnel |
| ΔCV | < 0.250 | Décisionnel |
| ΔMean | < 15w | Décisionnel |
| ΔGB V1 | — | RETIRÉ (monitoring) |

## Cibles

```
SAGA_READY  : composite ≥ 92.0 AND min_axis ≥ 85.0
SEAL_ATOMIC : composite ≥ 93.0 AND min_axis ≥ 85.0
```

## Lois actives

28 lois scellées (L1-L28).
Table complète : docs/SESSION_SAVE_2026-03-25_SCELLAGE_MOTEUR.md

## Invariants actifs

| ID | Description |
|----|-------------|
| INV-PROMPT-01 | Aucun open_threads / charStates dans prompt Scribe |
| INV-CDE-01 | SceneBrief ≤ 150 tokens |
| LOI-L3 | Aucune consigne métrique chiffrée dans le prompt |
| LOI-L25 | Mini-correcteur précoce stabilise toute la trajectoire |
| LOI-L27 | Seuils contextuels selon type de scène |
| LOI-L28 | ΔGB V1 retiré du protocole P4 |

## Tests

```
Total    : 1911 PASS
Branche  : phase-r-metrology-rebuild
```

## Modules quarantaine (non supprimés, consumer actif)

| Module | Consumer actif | Action requise |
|--------|---------------|----------------|
| s-score.ts | aesthetic-oracle.ts | Migration import vers s-oracle-v2 |

## Prochaine étape

V-RECAL-1 : baseline composite MacroSScore (56 API)
