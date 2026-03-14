# OMEGA — MESSAGE DE REDÉMARRAGE DE SESSION
## Template de Nouvelle Discussion

**Usage** : Coller ce message en ouverture de toute nouvelle conversation Claude, ChatGPT, Gemini.
**Version** : 1.0 — 2026-03-14

---

# 🚀 OMEGA SESSION — REDÉMARRAGE POST-RECALIBRATION

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   OMEGA PROJECT — SESSION POST-RECALIBRATION                  ║
║                                                               ║
║   Date recalibration : 2026-03-14                             ║
║   Raison : Dérive architecturale Phase V (rapport officiel)   ║
║   Statut tests : 1564 / 1564 (0 failures)                    ║
║   Commit actif : f2a801ae (V-BENCH fix)                       ║
║   Branch : phase-u-transcendence                              ║
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

## ARCHITECTURE FONDAMENTALE (GRAVÉE)

```
OMEGA (Chef d'orchestre)
├── PRÉ-GEN  : sélection, compression, préparation du prompt
├── SCRIBE   : LLM reçoit un brief dramatique → génère la prose
└── POST-GEN : mesure, vérification, correction, certification

Le SCRIBE ne vérifie rien. Il écrit. OMEGA vérifie tout.
```

**Document de référence** : `OMEGA_CONCEPTION_PLAN_v1.0`
**Contrat OMEGA/Scribe** : `CONTRAT_OMEGA_SCRIBE_v1.0`

---

## ÉTAT DES PHASES

| Phase | Statut | Commits | Tests |
|-------|--------|---------|-------|
| Phase U (sovereign-engine) | 🔒 SEALED | f137f235 → f2a801ae | 1564 |
| U-ROSETTE-18 (SEAL dual-path) | 🔒 SEALED | bbd448d2 | 1520 |
| V-INIT (CDE types + distiller) | ✅ VALIDE | bd7a4a9f | 1543 |
| V-PROTO (pipeline + chain) | ✅ VALIDE | d4be8c03 | 1564 |
| V-BENCH (premier run CDE) | ✅ VALIDE | f2a801ae | 1564 |
| **V-RECALIBRATION** | **🔄 EN COURS** | — | — |

---

## PHASE ACTIVE — V-RECALIBRATION

### Ce qui a été identifié

La Phase V CDE avait un problème architectural : le SceneBrief injectait du langage système (IDs de dettes, identifiants canon) dans le prompt Scribe au lieu d'un langage dramatique.

Résultat mesurable : composites 89/87 en V-BENCH vs 92+ en Phase U.

### Ce qui doit être fait

**Sprint V-RECAL-1 : Reformater le SceneBrief**
- `distillBrief()` : le CONTENU doit être dramatique, pas juridique
- `propagateDelta()` : propager les tensions, pas les IDs système
- Supprimer toute mention de `DEBT[id]` ou `CANON[id]` dans le brief

**Sprint V-RECAL-2 : Canon Lock Gate (post-génération)**
- Implémenter gate OMEGA strict post-génération
- REJECT si prose viole un CanonFact
- Pas une instruction dans le prompt — une vérification par OMEGA

**Sprint V-RECAL-3 : World Model minimal**
- Persona Store basique
- Debt Ledger persistent
- Arc Tracker minimal

---

## RÈGLES DE CETTE SESSION (INVIOLABLES)

**R1 — LIRE AVANT D'AGIR**
Avant toute proposition, lire les documents :
- `OMEGA_CONCEPTION_PLAN_v1.0`
- `CONTRAT_OMEGA_SCRIBE_v1.0`
- `CONTRAT_TRAVAIL_OMEGA_v1.0`

**R2 — QUESTION OBLIGATOIRE AVANT TOUT CODE**
"Est-ce OMEGA ou le Scribe qui est responsable de cette fonction ?"
Si la réponse n'est pas immédiate → consulter l'Architecte.

**R3 — LE BRIEF EST DRAMATIQUE**
Tout SceneBrief doit passer le test : "Est-ce qu'un metteur en scène de théâtre comprendrait ce brief ?"
Si non → reformuler.

**R4 — VÉRIFICATION = POST-GÉNÉRATION**
Toute instruction de vérification dans un prompt Scribe = violation du contrat.
La cohérence est contrôlée par OMEGA après génération.

**R5 — CONVERGENCE 3/3 AVANT IMPLÉMENTATION**
Toute décision architecturale requiert l'accord de Claude + Gemini + ChatGPT + Francky.

---

## BILAN DE COMPRÉHENSION REQUIS (IA à remplir avant d'agir)

```markdown
## 📋 BILAN DE COMPRÉHENSION

### État du projet
| Attribut | Valeur |
|----------|--------|
| Version | Phase V — V-RECALIBRATION |
| Commit actif | f2a801ae |
| Tests | 1564 / 1564 |
| Phase en cours | V-RECALIBRATION |

### Ce que j'ai compris
1. La Phase V avait un défaut architectural : le Scribe gérait la cohérence
2. OMEGA doit vérifier post-génération, pas via le prompt
3. Le SceneBrief doit être en langage dramatique

### Ce qui reste à faire
1. Reformater distillBrief() — contenu dramatique
2. Canon Lock Gate post-génération
3. World Model minimal

### Points d'incertitude
- [Lister ici tout ce qui n'est pas clair]

---
Ma compréhension est-elle correcte ?
Attente de validation avant action.
```

---

## DOCUMENTS DE RÉFÉRENCE (DANS LE PROJET)

| Document | Chemin | Rôle |
|----------|--------|------|
| Plan de conception | `/mnt/project/OMEGA_CONCEPTION_PLAN_v1.0` | Architecture complète |
| Contrat OMEGA/Scribe | `/mnt/project/CONTRAT_OMEGA_SCRIBE_v1.0` | Frontière OMEGA/Scribe |
| Rapport de dérive | `/mnt/project/OMEGA_DRIFT_REPORT_v1.0` | Historique de la dérive |
| Contrat de travail | `/mnt/project/CONTRAT_TRAVAIL_OMEGA_v1.0` | Rôles et règles |
| Roadmap Supreme v5 | `/mnt/project/OMEGA_SUPREME_ROADMAP_v5_0.md` | Roadmap globale |
| Session Save | `sessions/SESSION_SAVE_2026-03-13_V-BENCH.md` | Dernier état |

---

## REPO

```
C:\Users\elric\omega-project
Branch : phase-u-transcendence
Package : packages/sovereign-engine
```

---

## COMMANDE D'OUVERTURE

```
OMEGA SESSION — REPRISE POST-RECALIBRATION

Date recalibration : 2026-03-14
Commit actif : f2a801ae
Tests : 1564 / 1564
Objectif : V-RECALIBRATION — SceneBrief dramatique + Canon Lock Gate

RÈGLES OBLIGATOIRES :
- Lire OMEGA_CONCEPTION_PLAN_v1.0 et CONTRAT_OMEGA_SCRIBE_v1.0 EN PREMIER
- Poser la question OMEGA/Scribe avant chaque proposition
- Présenter un bilan de compréhension
- Attendre validation Francky avant action

Architecte Suprême : Francky
IA Principal : Claude

Let's go. 🚀
```

---

**FIN DU MESSAGE DE REDÉMARRAGE v1.0**
*2026-03-14 — À utiliser pour toutes les nouvelles sessions*
