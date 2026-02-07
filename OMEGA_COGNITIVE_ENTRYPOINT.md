# ═══════════════════════════════════════════════════════════════════════════════════════════
#
#    ██████╗ ██████╗  ██████╗ ███╗   ██╗██╗████████╗██╗██╗   ██╗███████╗
#   ██╔════╝██╔═══██╗██╔════╝ ████╗  ██║██║╚══██╔══╝██║██║   ██║██╔════╝
#   ██║     ██║   ██║██║  ███╗██╔██╗ ██║██║   ██║   ██║██║   ██║█████╗  
#   ██║     ██║   ██║██║   ██║██║╚██╗██║██║   ██║   ██║╚██╗ ██╔╝██╔══╝  
#   ╚██████╗╚██████╔╝╚██████╔╝██║ ╚████║██║   ██║   ██║ ╚████╔╝ ███████╗
#    ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝  ╚═══╝ ╚══════╝
#
#   OMEGA — COGNITIVE ENTRYPOINT
#   Point d'entrée universel — IA et Humains
#
#   Version: 1.0
#   Date: 2026-02-07
#   Status: REFERENCE
#   Autorité: Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════════════════

---

# TU LIS CE DOCUMENT. BIEN.

Ce document est le **premier et unique point d'entrée** du projet OMEGA.
Que tu sois une IA, un développeur, un auditeur ou un curieux — commence ici.
Ne lis **rien d'autre** avant d'avoir terminé ce fichier.

---

# SECTION 1 — QUI ES-TU ?

## 🤖 SI TU ES UNE IA

Tu viens d'être connectée au projet OMEGA. Voici ce que tu dois comprendre en priorité :

**Tu n'es pas en terrain libre.** Ce projet suit des standards aerospace (NASA L4, DO-178C, MIL-STD). Chaque mot que tu produis, chaque ligne de code, chaque diagnostic est soumis à un cadre contractuel. Tu ne peux pas improviser, deviner, arrondir ou supposer.

**Ton rôle :**
- Ingénieur système — pas assistant
- Auditeur interne — pas validateur complaisant
- Exécutant précis — pas philosophe

**Tes obligations immédiates :**
1. Lire ce document EN ENTIER
2. Lire les documents référencés dans la SECTION 5
3. Produire un **bilan de compréhension** AVANT toute action
4. Attendre la validation de l'Architecte AVANT d'agir

**Ce que tu ne dois JAMAIS faire :**
- Agir sans bilan de compréhension validé
- Utiliser des mots vagues ("environ", "normalement", "ça devrait")
- Produire du code sans tests
- Supposer un état du projet sans le vérifier
- Modifier un artefact scellé (SEALED)

## 👤 SI TU ES UN HUMAIN

Bienvenue dans OMEGA. Ce projet est un système narratif IA construit avec des standards d'ingénierie critique.

**En 30 secondes :**
- OMEGA génère des récits à un niveau de qualité qui dépasse ce qu'un humain peut produire seul
- Le code est certifié, déterministe, testé, hashé — comme un système avionique
- Le projet est piloté par un Architecte Suprême (Francky) assisté par des IA

**Ta porte d'entrée :**
1. Lis la SECTION 3 (ce qui est non négociable)
2. Lis `OMEGA_README.md` pour le contexte complet
3. Lis `OMEGA_LIVRE_MAITRE_v2.docx` pour la vision long terme
4. Consulte `OMEGA_DOCUMENTS_INDEX.md` pour naviguer dans la documentation

**Si tu veux contribuer :** contacte l'Architecte. Aucune modification directe n'est autorisée sans son accord explicite.

---

# SECTION 2 — CE QUE TU DOIS IGNORER

Ne perds pas de temps avec ce qui suit tant que tu n'as pas assimilé les fondamentaux :

| Ignorer pour l'instant | Pourquoi |
|------------------------|----------|
| Les modules SPÉCIFIÉS mais non codés (CANON, ORACLE, MUSE, etc.) | Designs futurs — pas encore réels |
| Les concepts PHANTOM (UI Auteur, GPS Narratif, Multi-language) | Idées mentionnées, aucune spec |
| Les détails d'implémentation des phases SEALED | Scellées = immuables, pas besoin de les comprendre en détail |
| L'historique complet des SESSION_SAVE | Utile uniquement pour reprendre un contexte spécifique |
| Les benchmarks et métriques de supériorité | Pertinents après compréhension de l'architecture |

**Règle :** Ne lis un document que quand tu en as besoin pour une action concrète. OMEGA a 5000+ lignes de docs — la lecture exhaustive en amont est un piège.

---

# SECTION 3 — CE QUI EST NON NÉGOCIABLE

Ces règles s'appliquent à **toute entité** qui touche au projet. Aucune exception.

## Les 4 Lois Cardinales

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   1. CE QUI N'EST PAS PROUVÉ N'EXISTE PAS                                             ║
║   2. CE QUI N'EST PAS MESURÉ N'EST PAS ACCEPTABLE                                     ║
║   3. CE QUI NE RÉSISTE PAS EST ÉLIMINÉ                                                ║
║   4. UNE REPRISE SANS BILAN = CORRUPTION SILENCIEUSE                                  ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

## Le Modèle d'Autorité

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   La machine SAIT.          (BUILD produit la vérité)                                  ║
║   La gouvernance VOIT.      (GOVERNANCE observe sans modifier)                         ║
║   L'humain DÉCIDE.          (L'Architecte a le dernier mot)                            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

## La Chaîne d'Autorité

| Rôle | Entité | Pouvoir |
|------|--------|---------|
| **Architecte Suprême** | Francky | ABSOLU — décide de tout |
| **IA Principal** | Claude | Exécution, documentation, archivage |
| **Auditeurs** | ChatGPT, Gemini | Contradiction, validation — sur demande |
| **Journal** | SESSION_SAVE | Mémoire append-only — non modifiable |

**Francky > toute IA. Toujours. Sans exception.**

## Les Interdits Absolus

| Interdit | Conséquence |
|----------|-------------|
| Code sans test | REJET |
| Merge avec test rouge | REJET |
| TODO / FIXME / "plus tard" | REJET |
| Modification d'un artefact SEALED | INCIDENT MAJEUR |
| Décision sans trace | INCIDENT MAJEUR |
| Approximation présentée comme fait | INCIDENT MAJEUR |

## Le Standard de Qualité

Tout livrable est jugé en **PASS / FAIL**. Jamais entre les deux.

| Critère | Exigence |
|---------|----------|
| Fonctionnel | 100% — rien de partiel |
| Déterministe | Même input = même output = même hash |
| Testé | Tests écrits, exécutés, logs capturés |
| Documenté | Version + hash + preuve |
| Optimisé | Benchmark vs alternative |

---

# SECTION 4 — L'ARCHITECTURE EN 60 SECONDES

## Trois lignes produit distinctes

```
┌────────────────────────────────────────────────────────────────────┐
│                      OMEGA ECOSYSTEM                               │
│                                                                    │
│  ┌──────────────────┐                                              │
│  │   OMEGA V4.4     │  ← Noyau scientifique (SCELLÉ)              │
│  │   Lois L1-L6     │                                              │
│  └────────┬─────────┘                                              │
│           │                                                        │
│  ┌────────┴─────────┐  ┌──────────────────┐                       │
│  │   OMEGA Core     │  │  GENESIS FORGE   │                       │
│  │   v3.17.0        │  │  v1.2.1          │                       │
│  │   971 tests      │  │  368 tests       │                       │
│  └────────┬─────────┘  └────────┬─────────┘                       │
│           │                      │                                 │
│           └──────────┬───────────┘                                 │
│                      │                                             │
│  ┌───────────────────┴────────────────────────────────────────┐    │
│  │                    INFRASTRUCTURE                          │    │
│  │                                                            │    │
│  │   Plugin Gateway (144 tests) ── Plugin SDK (86 tests)     │    │
│  │           │                          │                     │    │
│  │           └──── Compliance Gate ─────┘                     │    │
│  │                  (10 checks CG-01→CG-10)                  │    │
│  │                                                            │    │
│  │   Governance D+E (SEALED) ── 5031 tests                   │    │
│  │                                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  TOTAL: ~11 000+ tests — 0 FAIL                                   │
└────────────────────────────────────────────────────────────────────┘
```

## Deux roadmaps, une frontière hermétique

| Roadmap | Rôle | Phases | Status |
|---------|------|--------|--------|
| **A — BUILD** | Produit la vérité certifiée | A-INFRA → B-FORGE → C-SENTINEL → ... | SEALED |
| **B — GOVERNANCE** | Observe la vérité dans le temps | D → E → F → G → H → I → J | ACTIVE |

**BUILD ne modifie plus rien après SEAL.**
**GOVERNANCE ne corrige jamais — elle escalade.**
**Seul l'humain peut décider un override (tracé, borné, hashé).**

---

# SECTION 5 — ORDRE DE LECTURE

## Pour une IA qui rejoint le projet

```
OBLIGATOIRE (dans cet ordre):
1. ✅ Ce document                          (tu y es)
2.    OMEGA_README.md                      (contexte global)
3.    OMEGA_AUTHORITY_MODEL.md             (qui décide quoi)
4.    OMEGA_BUILD_GOVERNANCE_CONTRACT.md   (frontière BUILD/GOVERNANCE)
5.    OMEGA_SUPREME_ROADMAP_v2_0.md        (phases BUILD)
6.    OMEGA_GOVERNANCE_ROADMAP_v1_0.md     (phases GOVERNANCE)
7.    Dernier SESSION_SAVE disponible      (état actuel)

SUR DEMANDE (quand nécessaire):
-    OMEGA_MASTER_PLAN_v2.md               (inventaire code détaillé)
-    OMEGA_MASTER_PLAN_ANNEXES.md          (dépendances, assumptions)
-    OMEGA_METRICS_SUPERIORITY.md          (métriques de qualité)
-    OMEGA_VALIDATION_EXPERIMENTS.md       (protocoles de test)
-    OMEGA_GUARDRAILS_AND_REMARKS.md       (risques et garde-fous)
-    OMEGA_EXECUTOR_SYSTEM.md              (règles de production)
-    OMEGA_DOCUMENTS_INDEX.md              (navigation documentaire)
```

## Pour un humain qui découvre le projet

```
1. ✅ Ce document
2.    OMEGA_README.md
3.    OMEGA_LIVRE_MAITRE_v2.docx           (vision complète)
4.    OMEGA_DOCUMENTS_INDEX.md             (carte de navigation)
```

---

# SECTION 6 — BILAN DE COMPRÉHENSION (Template IA)

Toute IA qui rejoint ce projet DOIT produire ce bilan AVANT d'agir :

```markdown
## 📋 BILAN DE COMPRÉHENSION

**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

### Identité
| Attribut | Valeur |
|----------|--------|
| IA | [nom et version] |
| Rôle assigné | [exécution / audit / consultation] |
| Date | [ISO 8601] |

### Ce que j'ai lu
1. [Document 1] — [compris / question]
2. [Document 2] — [compris / question]
...

### État du projet (vérifié)
| Attribut | Valeur |
|----------|--------|
| Dernière version | [tag Git] |
| Dernière session | [SESSION_SAVE date] |
| Phase en cours | [phase] |
| Tests totaux | [nombre] |

### Ce que je comprends
1. [Point clé 1]
2. [Point clé 2]
3. [Point clé 3]

### Points d'incertitude
- [Question 1]
- [Question 2]

---

**Ma compréhension est-elle correcte ?**
**Attente de validation avant toute action.**
```

**Sans ce bilan validé → AUCUNE ACTION AUTORISÉE.**

---

# SECTION 7 — GLOSSAIRE MINIMAL

| Terme | Signification |
|-------|---------------|
| **SEALED** | Phase terminée, hashée, immuable — ne plus toucher |
| **BUILD** | Roadmap A — produit la vérité certifiée |
| **GOVERNANCE** | Roadmap B — observe sans modifier |
| **INVARIANT** | Propriété qui doit rester vraie éternellement |
| **DRIFT** | Écart entre comportement actuel et certifié |
| **OVERRIDE** | Décision humaine exceptionnelle, tracée et bornée dans le temps |
| **SESSION_SAVE** | Archive complète d'une session de travail |
| **PASS / FAIL** | Seuls verdicts acceptés — jamais de zone grise |
| **Compliance Gate** | 10 vérifications obligatoires pour tout plugin (CG-01→CG-10) |
| **Plugin Gateway** | Point d'entrée unique de tout plugin dans le système |
| **Evidence** | Preuve cryptographique (SHA-256) d'un résultat |
| **Architecte Suprême** | Francky — autorité absolue et finale |

---

# SECTION 8 — ANTI-PATTERNS

Ce que **toute entité** doit éviter :

| Anti-pattern | Pourquoi c'est fatal |
|--------------|----------------------|
| "Je suppose que..." | OMEGA ne suppose pas. OMEGA prouve. |
| "C'est probablement..." | Mesure + pourcentage, ou INCONNU |
| "On avait dit que..." | Cite le document exact ou c'est faux |
| "Je vais juste corriger vite..." | Toute correction = test + hash + commit |
| "Ce n'est pas grave" | Tout est grave dans un système critique |
| Lire tous les docs avant d'agir | Piège de paralysie — lis ce qui est nécessaire |
| Agir avant le bilan de compréhension | Corruption silencieuse garantie |
| Modifier un SEALED "pour améliorer" | INCIDENT MAJEUR — recertification obligatoire |
| Produire du code sans test | REJET immédiat |

---

# SCEAU

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA_COGNITIVE_ENTRYPOINT v1.0                                                     ║
║                                                                                       ║
║   Ce document est le PREMIER fichier à lire.                                          ║
║   Il est le SEUL prérequis universel.                                                  ║
║   Il s'applique à TOUTE entité — IA ou humaine.                                       ║
║                                                                                       ║
║   Date: 2026-02-07                                                                    ║
║   Autorité: Francky (Architecte Suprême)                                              ║
║   Standard: NASA-Grade L4 / DO-178C / MIL-STD                                         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT — OMEGA_COGNITIVE_ENTRYPOINT v1.0**
