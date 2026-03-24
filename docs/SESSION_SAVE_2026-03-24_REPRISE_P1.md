# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — SESSION_SAVE
# Date : 2026-03-24 (session de reprise — fin de journée)
# Objet : Reprise post-marathon + Production prompt Claude Code P1
# ═══════════════════════════════════════════════════════════════════════════════
#
# Rédigé par    : Claude (IA Principal)
# Validé par    : Francky (Architecte Suprême)
# Branche       : phase-r-metrology-rebuild
# Tests système : 1911 PASS
# API consommés : 0 (session de reprise + préparation uniquement)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. OBJET DE LA SESSION

Session courte de reprise post-marathon (2026-03-24).

Aucun appel API de génération. Objectif unique :
1. Lire et valider la compréhension du contexte complet
2. Intégrer les corrections de l'Architecte (bilan corrigé)
3. Produire le prompt Claude Code P1 prêt à l'exécution

---

# 2. BILAN DE COMPRÉHENSION VALIDÉ

## État du projet au moment de la reprise

| Attribut | Valeur |
|----------|--------|
| Branch active | `phase-r-metrology-rebuild` |
| Tests | 1911 PASS |
| Dernière session | Marathon 2026-03-24 (~300 API, 11 phases) |
| Juge actif | GB V1 (gb-scorer.ts, échelle ~3.0–5.0) |
| Candidat moteur | FDP — NON SCELLÉ (test P1 requis) |

## Corrections intégrées (fournies par l'Architecte)

| # | Correction |
|---|-----------|
| 1 | Deux branches : `phase-w-mixer` (R0→R6 Rosetta 19-20 mars) / `phase-r-metrology-rebuild` (marathon 24 mars, ACTIVE) |
| 2 | Deux juges distincts : GB V1 ≠ Scorer R6 — pas comparables |
| 3 | Marathon 24 mars = suite directe Opération Rosetta 19-20 mars |
| 4 | V3 score (~88.9) et GB V1 (~3.9–4.2) = échelles différentes |
| 5 | Mixer Phase W existe (35 auteurs, 13 potards), pas encore codé |

---

# 3. LIVRABLE PRODUIT

## Fichier

`OMEGA_CLAUDE_CODE_PROMPT_P1_3000W_FDP_K2.md`

## Contenu

Prompt complet pour Claude Code visant la validation du moteur FDP en production longue (3000w).

## Spécifications

| Paramètre | Valeur |
|-----------|--------|
| Script cible | `scripts/test-p1-3000w-fdp-k2.ts` |
| Budget API | 36 appels |
| Structure | 3 configs × 3 runs × 4 chunks |
| Architecture | K2 (chunks 1-2 purs, chunks 3-4 avec injection rappel) |
| Brief de scène | Fixe sur les 9 runs |
| Juge | GB V1 existant (pas de réimplémentation) |

## Les 3 configs

| Config | Rôle | Métriques de référence (500w) |
|--------|------|-------------------------------|
| `FDP_trio_K2` | Candidat principal | GB 3.990, CV 1.091, std 0.101 |
| `proust_flaubert_K2` | Fallback | GB 3.964, std 0.049 |
| `duras_solo_K2_ctrl` | Contrôle biais GB V1 | GB 4.243, mean 3.9w |

## Critères PASS (par config, médiane 3 runs)

```
GB moyen       ≥ 3.90
CV             ∈ [0.80, 1.30]
Drift          ∈ [-10, +10]
No-collapse    chunk3-4 mean ≥ chunk1-2 mean × 0.90
```

## Décision automatique dans la synthèse

- FDP PASS → CANDIDAT VALIDÉ PRODUCTION → scellement possible
- FDP FAIL + PF PASS → fallback proust_flaubert activé
- Les deux FAIL → BLOQUANT, signaler à l'Architecte
- Duras GB ≥ 3.90 → biais GB V1 confirmé → audit P2 URGENT

---

# 4. PLAN ACTIF — P1 À P5

| ID | Action | Budget | Statut |
|----|--------|--------|--------|
| **P1** | Test long 3000w FDP+K2 | 36 API | **PROMPT PRÊT — EN ATTENTE EXÉCUTION** |
| P2 | Audit GB V1 (42 features, biais minimalisme) | 0 API | En attente résultat P1 |
| P3 | Formaliser régime cible production | 0 API | En attente résultat P1 |
| P4 | Test continuité inter-chapitres (2 × 3000w) | ~24 API | En attente P1 + P3 |
| P5 | Pistes différées (Rosetta+Persona, Polisher, etc.) | 30+ API | Après P1–P4 |

---

# 5. DÉCISIONS EN VIGUEUR (inchangées)

| Décision | Statut |
|----------|--------|
| Claude+Rosetta = moteur principal | VERROUILLÉE |
| Mistral = benchmark | VERROUILLÉE |
| GPT-4o = éliminé | VERROUILLÉE |
| Consignes métriques dans le prompt = INTERDIT | VERROUILLÉE |
| CV piloté par chunking, pas par consigne | VERROUILLÉE |
| Duras = régulateur/calibration, pas moteur principal | VERROUILLÉE |
| FDP = CANDIDAT principal production | EN ATTENTE — P1 tranche |

---

# 6. FICHIERS DE CETTE SESSION

| Fichier | Contenu |
|---------|---------|
| `OMEGA_CLAUDE_CODE_PROMPT_P1_3000W_FDP_K2.md` | Prompt Claude Code P1 complet |
| `SESSION_SAVE_2026-03-24_REPRISE_P1.md` | Ce document |

---

# 7. INSTRUCTION DE REPRISE SUIVANTE

```
OMEGA SESSION — REPRISE POST-P1

Version: HEAD (après exécution p1-3000w-fdp-k2-v1)
Dernier état: SESSION_SAVE_2026-03-24_REPRISE_P1.md
Branche: phase-r-metrology-rebuild
Tests: 1911 PASS

Objectif: Lire le résultat de P1 (scoring/data/P1_3000W_FDP_K2_RESULTS.json)
          Vérifier la décision automatique (FDP PASS / FAIL / BLOQUANT)
          Lancer P2 si Duras contrôle ≥ 3.90 en 3000w
          Lancer P3 (formalisation régime cible)

Documents clés:
  scoring/data/P1_3000W_FDP_K2_RESULTS.json  ← RÉSULTAT P1
  SESSION_SAVE_2026-03-24_MARATHON_COMPLET.md ← contexte complet
  OMEGA_TABLE_CONVERSION_R_CONVERSION.md      ← table R-CONV
```

---

*SESSION_SAVE — 2026-03-24 (reprise)*
*0 appels API de génération — 1 livrable : prompt P1*
*Standard NASA-Grade L4 / DO-178C Level A*
*"Le prompt P1 est prêt. L'exécution tranche."*
