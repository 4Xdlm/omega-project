# GUARDRAILS — OMEGA v4.x

## 1. STOP IMMÉDIAT si :
| Situation | Action |
|-----------|--------|
| FROZEN modifié | STOP + Revert |
| Comportement change sans test | STOP |
| PR sans preuve | STOP |
| Diff non explicable | STOP |

## 2. Refus Automatique PR si :
| Phrase détectée | Verdict |
|-----------------|---------|
| "On optimisera plus tard" | REFUSÉ |
| "C'est plus simple comme ça" | REFUSÉ |
| "Pas eu le temps pour tests" | REFUSÉ |
| "C'est évident" | REFUSÉ |

## 3. Escalade Obligatoire vers Architecte si :
- Nouveau concept central
- Nouveau format de données
- Nouvelle dépendance critique
- Toute ambiguïté stratégique

## 4. Règles Mentales (non techniques)
| Piège | Réalité |
|-------|---------|
| Fatigue | ≠ Urgence |
| Pression | ≠ Priorité |
| Complexité | ≠ Intelligence |

## 5. Principe Final
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   OMEGA n'évolue que s'il reste plus clair après qu'avant.                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
