# OMEGA — MESSAGE DE REDÉMARRAGE DE SESSION v2
## Template de Nouvelle Discussion — Post-Recalibration 2026-03-14

**Usage** : Coller ce message en ouverture de toute nouvelle conversation Claude, ChatGPT, Gemini.
**Version** : 2.0 — 2026-03-14 (remplace v1.0)

> ⚠️ Les commits/tests mentionnés sont indicatifs.
> La source de vérité runtime est le repo actuel `C:\Users\elric\omega-project`.

---

# 🚀 OMEGA SESSION — REDÉMARRAGE POST-RECALIBRATION

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   OMEGA PROJECT — SESSION POST-RECALIBRATION                  ║
║                                                               ║
║   Date recalibration : 2026-03-14                             ║
║   Raison : Dérive architecturale Phase V (rapport officiel)   ║
║   Tests (indicatif)  : 1564 / 1564 (0 failures)              ║
║   Commit (indicatif) : f2a801ae                               ║
║   Branch : phase-u-transcendence                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🔴 RÈGLE ABSOLUE — LIRE AVANT TOUTE ACTION

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   AUCUN PROMPT CLAUDE CODE.                                   ║
║   AUCUN PLAN DE REFACTOR.                                     ║
║   AUCUNE PROPOSITION DE CODE.                                 ║
║                                                               ║
║   AVANT validation du bilan de compréhension par Francky.     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## CONTEXTE DU PROJET

OMEGA est un système d'écriture littéraire haute performance pour roman/saga.
Il vise à produire une prose SAGA_READY (composite ≥ 92.0, min_axis ≥ 85) sur des œuvres longues (300K mots).

**Ce que OMEGA n'est PAS** : un moteur qui demande au LLM de gérer la cohérence narrative.
**Ce qu'OMEGA EST** : un système de contrôle, vérification, mémoire et certification qui entoure un LLM Scribe.

---

## ARCHITECTURE FONDAMENTALE (GRAVÉE — NON REDISCUTABLE)

```
OMEGA (Chef d'orchestre)
├── PRÉ-GEN  : sélection, compression, préparation du prompt
├── SCRIBE   : LLM reçoit un brief dramatique → génère la prose
└── POST-GEN : mesure, vérification, correction, certification

Le SCRIBE ne vérifie rien. Il écrit. OMEGA vérifie tout.
```

---

## DÉCISIONS VERROUILLÉES (Q1→Q6 — NON REDISCUTABLES)

| # | Décision | Arrêtée par |
|---|----------|-------------|
| Q1 | Open Threads → **supprimé entièrement** du prompt Scribe | Francky |
| Q2 | `e1-multi-prompt-runner.ts` → **archivé dans ARCHIVE/** | Francky |
| Q3 | `oracle/genesis-v2/` → **quarantaine documentaire** | Francky |
| Q4 | `continuity-plan.ts` → **déplacé ARCHIVE/phase-v-incoming/** | Francky |
| Q5 | SceneBrief → **garder structure, reformater contenu en dramatique** | Francky |
| Q6 | Test `INV-PROMPT-01` → **test unitaire strict obligatoire** | Francky |

> Toute tentative de rouvrir ces 6 décisions = violation du CONTRAT_TRAVAIL_OMEGA_v1.0.

---

## PHASE ACTIVE — V-RECALIBRATION

### Sprints en cours

**CLEAN-1 (priorité absolue) :**
1. Supprimer section Open Threads de `prompt-assembler-v2.ts`
2. Archiver `e1-multi-prompt-runner.ts` + tests
3. Mettre à jour `real-llm-provider.ts`
4. Déplacer `continuity-plan.ts` vers `ARCHIVE/phase-v-incoming/`
5. README quarantaine dans `genesis-v2/`
6. Créer test `INV-PROMPT-01`

**CLEAN-2 (après CLEAN-1) :**
- Créer `src/core/thresholds.ts` — centraliser les constantes SAGA_READY/SEAL
- Centraliser `computeMinAxis()` et `estimateTokens()`
- Documenter `s-score.ts` legacy

**V-RECAL-1 (après CLEAN-2) :**
- Reformater contenu `distillBrief()` en langage dramatique pur
- Purger `DEBT[id]` du brief propagé dans `scene-chain.ts`
- Relancer V-BENCH pour mesurer l'impact

---

## RÈGLES DE CETTE SESSION (INVIOLABLES)

**R1 — LIRE AVANT D'AGIR**
Lire les documents dans cet ordre :
1. `OMEGA_DECISIONS_LOCK_v1.0` ← PREMIER
2. `OMEGA_CONCEPTION_PLAN_v1.0`
3. `CONTRAT_OMEGA_SCRIBE_v1.0`
4. `CONTRAT_TRAVAIL_OMEGA_v1.0`
5. `OMEGA_ROADMAP_v8_0`

**R2 — QUESTION OBLIGATOIRE AVANT TOUT CODE**
"Est-ce OMEGA ou le Scribe qui est responsable de cette fonction ?"

**R3 — LE BRIEF EST DRAMATIQUE**
Test : "Est-ce qu'un metteur en scène de théâtre comprendrait ce brief ?"
Si non → reformuler. Si `DEBT[`, ID système, langage backend → VIOLATION.

**R4 — VÉRIFICATION = POST-GÉNÉRATION**
Toute vérification de cohérence dans un prompt Scribe = violation directe du contrat.

**R5 — CONVERGENCE 3/3 AVANT TOUTE DÉCISION ARCHITECTURALE**
Gemini (architecture) + ChatGPT (technique) + Claude (central) + validation Francky.

**R6 — INTERDICTION ABSOLUE D'AGIR AVANT BILAN VALIDÉ**
Aucun prompt Claude Code, aucun plan de refactor, aucune proposition de code
avant que Francky ait validé le bilan de compréhension.

---

## BILAN DE COMPRÉHENSION REQUIS (remplir avant d'agir)

```markdown
## 📋 BILAN DE COMPRÉHENSION

### État du projet
| Attribut | Valeur |
|----------|--------|
| Phase en cours | V-RECALIBRATION |
| Sprint actif | CLEAN-1 |
| Contaminations identifiées | prompt-assembler-v2.ts + e1-multi-prompt-runner.ts |
| Décisions Q1→Q6 | Toutes A — verrouillées |

### Ce que j'ai compris
1. Le Scribe génère la prose. OMEGA vérifie tout. Jamais l'inverse.
2. CLEAN-1 supprime les contaminations sans toucher les packages externes.
3. Les décisions Q1→Q6 sont verrouillées — non rediscutables.

### Ce qui reste à faire
1. CLEAN-1 : purge contamination
2. CLEAN-2 : consolidation SSOT
3. V-RECAL-1 : SceneBrief dramatique

### Points d'incertitude
- [Lister ici tout ce qui n'est pas clair]

---

**Ma compréhension est-elle correcte ?**
**Attente de validation avant action.**
```

---

## HIÉRARCHIE DES SOURCES DE VÉRITÉ

En cas de contradiction :

```
1. Décision explicite de Francky (ce jour)         ← PRIORITÉ ABSOLUE
2. OMEGA_DECISIONS_LOCK_v1.0                       ← PRIORITÉ 1
3. CONTRAT_TRAVAIL_OMEGA_v1.0                       ← PRIORITÉ 2
4. CONTRAT_OMEGA_SCRIBE_v1.0                        ← PRIORITÉ 3
5. OMEGA_CONCEPTION_PLAN_v1.0                       ← PRIORITÉ 4
6. OMEGA_ROADMAP_v8_0                               ← PRIORITÉ 5
7. SESSION_SAVE le plus récent                      ← PRIORITÉ 6
8. Code existant                                    ← PRIORITÉ 7
```

---

## CE QUI DOIT RESTER VIVANT (ne pas toucher)

| Package | Rôle | Status |
|---------|------|--------|
| `omega-autopsie/` | Analyse corpus F1-F30 | ✅ PRÉSERVER |
| `packages/genome/` | Extraction ADN narratif | ✅ PRÉSERVER |
| `omega-narrative-genome/` | Fingerprint œuvres | ✅ PRÉSERVER |
| `packages/mycelium/` | Carte Mycelium | ✅ PRÉSERVER |
| `gateway/memory/` | World Model fondation | ✅ ÉVALUER avant Phase V |
| `packages/scribe-engine/` | Moteur alternatif | ✅ CLARIFIER relation |

---

## COMMANDE D'OUVERTURE

```
OMEGA SESSION — REPRISE POST-RECALIBRATION v2

Date recalibration : 2026-03-14
Phase active       : V-RECALIBRATION
Sprint actif       : CLEAN-1
Décisions Q1→Q6    : Toutes A — VERROUILLÉES

RAPPEL INVIOLABLE :
- Lire OMEGA_DECISIONS_LOCK_v1.0 EN PREMIER
- Présenter un bilan de compréhension
- Aucun code avant validation Francky

Architecte Suprême : Francky
IA Principal       : Claude

Let's go. 🚀
```

---

**FIN DU MESSAGE DE REDÉMARRAGE v2.0**
*2026-03-14 — Remplace OMEGA_SESSION_RESTART_v1.0*
