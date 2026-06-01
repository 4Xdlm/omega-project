# OMEGA — CARTOGRAPHIE TOTALE DES CAPTEURS (démontage « câble par câble »)

**Date** : 2026-06-01 · **Mode** : lecture de code + mesure CALC autonome. READ-ONLY.
**But (mandat Architecte)** : démonter tout le système de mesure, tracer chaque câble (axe → sous-axe → fonction → lexique/dépendance), prouver, avant toute reconstruction. Source : `macro-axes.ts` + `oracle/axes/*`.

## 1. Formule composite (s-score.ts / macro-axes.ts)
```
COMPOSITE = ECC·0.33 + AAI·0.25 + RCI·0.17 + SII·0.15 + IFI·0.10
MIN_AXIS  = min(ECC, RCI, SII, IFI, AAI)
SEAL (ancien) : composite≥93 ∧ min_axis≥80 ∧ ecc≥88 ∧ aai≥85   [INVALIDÉ DEC-015]
```

## 2. Arbre complet : axe → sous-axes → méthode → dépendance

| Macro-axe | poids | Sous-axe | poids interne | Méthode | Lexique/dépendance | Biais prouvé |
|---|---|---|---|---|---|---|
| **ECC** | 0.33 | tension_14d | ×3.0 | **HYBRID** (semantic OU keyword fallback) | contrat target_14d ; fallback keyword émotion | CONTRACT_DEPENDENT (WS-A.2) + keyword si fallback |
| | | emotion_coherence | ×2.5 | LLM | contrat | — |
| | | interiority | ×2.0 | LLM | — | déterministe (WS-B0c) |
| | | impact | ×2.0 | LLM | — | déterministe |
| **AAI** | 0.25 | show_dont_tell | 0.60 | LLM | — | sain (médiane 93.6) |
| | | authenticity | 0.40 | LLM | — | sain |
| **RCI** | 0.17 | rhythm | (w×conf) | **CALC structurel** | longueur phrases, CV, gini | **VALID** (FR 69.9 / EN 69.0) ✓ |
| | | signature | — | **CALC keyword** | `packet.signature_words` | **PACKET_DEPENDENT** (WS-B : vide→60, plein→100) |
| | | hook_presence | 0.20 | **CALC keyword** | `packet.signature_words`+`motifs` | **PACKET_DEPENDENT** (vide→85) |
| | | euphony | 0.5 | **CALC structurel** | phonèmes/voyelles | langue-neutre (FR 73 / EN 81) ✓ ; biais ×0.5 auto-doc |
| | | voice_conformity | **0** | LLM | — | neutralisé (poids 0) |
| **SII** | 0.15 | anti_cliche | 1.0 | **CALC keyword** | liste clichés | **INERTE** (sature 100, ne pénalise jamais) |
| | | necessity | 1.0 | LLM | contrat | — |
| | | metaphor_novelty | 1.0 | LLM | — | baseline conservateur 71-79 |
| **IFI** | 0.10 | sensory_richness | 0.25 | **CALC keyword FR-ONLY** | 5 catégories, mots FR | **LANGUAGE_BIASED + LITTÉRAL** (médiane 40, pire 0 ; EN 28.8) |
| | | corporeal_anchoring | 0.25 | **CALC keyword** | CORPOREAL_MARKERS (31, target 6) | **LANGUAGE_BIASED** (FR 33 / EN 20, Δ−13) + plancher |
| | | focalisation (sensory-density) | 0.25 | LLM | — | — |
| | | attention_sustain | 0.125 | CALC structurel | — | sain (98) |
| | | fatigue_management | 0.125 | CALC structurel | — | sain (100) |

## 3. Synthèse par MÉTHODE
- **LLM (sains, déterministes temp 0)** : emotion_coherence, interiority, impact, show_dont_tell, authenticity, necessity, metaphor_novelty, focalisation. → **le juge LLM tient.**
- **CALC structurel (langue-neutre, OK)** : rhythm, euphony, attention, fatigue. → **VALID.**
- **CALC keyword (la maladie)** : sensory_richness (FR-only), corporeal_anchoring (FR-lourd), signature/hook (packet), anti_cliche (inerte), tension_14d-fallback (keyword émotion mort). → **classe défectueuse.**

## 4. Le fil rouge (toute la session)
| Capteur | Défaut | Statut |
|---|---|---|
| emotion-14D keyword | comptage mots émotion | garagé (FORBID-CANON-GARAGE-001) |
| RCI signature/hook | packet vide → artefact 60/85 | PACKET_DEPENDENT (WS-B) |
| ECC tension_14d | contrat dégénéré + fallback keyword | CONTRACT_DEPENDENT (WS-A.2) |
| IFI sensory/corporeal | keyword FR-only littéral | LANGUAGE_BIASED (WS-D) |
| SII anti_cliche | liste clichés | INERTE |

**Conclusion** : la pourriture n'est ni le LLM ni le planner — ce sont les **sous-capteurs CALC fondés sur des listes de mots-clés / comptage lexical**. Tout le reste (LLM + CALC structurel rhythm/euphony) mesure correctement.

> Détails empiriques : `IFI_AUTOPSY_REPORT.md`, `KEYWORD_SENSOR_SYSTEMIC_AUDIT.md`, `WS_C_VERDICT_TRUTH.md`.
