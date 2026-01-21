# OMEGA — RULES OF EXECUTION

## Document: GOVERNANCE/RULES_OF_EXECUTION.md
## Statut: 🔒 FROZEN

---

# RÈGLES ABSOLUES

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║   1. TOUTE DÉCISION = FICHIER DANS LE REPO                                               ║
║   2. TOUTE ROADMAP = FICHIER DANS ROADMAP/                                               ║
║   3. AUCUN DOCUMENT HORS REPO N'EST UNE SOURCE DE VÉRITÉ                                 ║
║   4. UN FICHIER ROADMAP N'EST JAMAIS RÉÉCRIT, SEULEMENT:                                 ║
║      - 🔒 FROZEN                                                                          ║
║      - ou remplacé par le suivant                                                        ║
║   5. TOUTE DISCUSSION DOIT RÉFÉRENCER UN FICHIER PRÉCIS DU REPO                         ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# RÈGLE FONDAMENTALE POUR CLAUDE CODE

À coller en tête de **chaque prompt**:

```
RÈGLE FONDAMENTALE OMEGA:
- Aucune roadmap, aucun plan, aucune décision ne doit exister hors du repo.
- Tout ce que tu produis doit être un fichier du repo, à l'emplacement canonique.
- Si tu proposes une action, tu dois dire:
  - dans quel fichier ROADMAP/ elle est définie
  - ou créer ce fichier.
- Toute proposition non traçable dans le repo = INVALIDE.
- Toute ambiguïté = STOP + rapport "BLOCKED: reason"
```

---

# STATUTS OFFICIELS

| Symbole | Signification |
|---------|---------------|
| ❌ ABSENT | Pas commencé |
| 📦 PRÉSENT | Code existe |
| 🧪 COUVERT | Tests existent |
| 🔒 PROUVÉ | Gate passé, figé |

**Seul 🔒 PROUVÉ compte.**

---

# GATE SYSTEM

- **PASS** = on avance
- **FAIL** = on corrige, pas d'options

Pas de "presque". Pas de "on verra plus tard".

---

# ZONES DE PERFORMANCE

| Phase | Perf Autorisée |
|-------|----------------|
| 0 | ❌ Non |
| 1 | ✅ Design uniquement |
| 2 | ✅ Stabilité, latence |
| 3 | ✅ Cache, batch |
| 4 | ✅ CLI latence |
| 5 | ✅ SLA |
| 6+ | ✅ Selon phase |

**Règle:** Optimisation interdite si elle change les résultats sans preuve math + tests.

---

# PROOFS

Chaque phase produit un **proof pack** dans `PROOFS/`:

```
PROOFS/
├── phase0-BASELINE/
├── phase1-CONTRACT/
├── phase2-V44CORE/
├── phase3-INTEGRATION/
├── phase4-CLI/
├── phase5-FREEZE/
└── ...
```

Contenu obligatoire:
- Outputs
- Logs
- Hashes
- ROOT_HASH.txt

---

# INTERDICTIONS PERMANENTES

- ❌ Modifier sans preuve
- ❌ Refactorer sans demande explicite
- ❌ Contourner un test qui échoue
- ❌ Proposer une "amélioration" non demandée
- ❌ Discuter vision (elle est scellée)
- ❌ Ressusciter Plutchik ou modèle pré-V4.4

---

# SI PROBLÈME

1. **NE CONTOURNE PAS**
2. Documente exactement le problème
3. Produis un rapport: `BLOCKED: [description précise]`
4. **STOP** et attends instruction humaine

---

# AUTORITÉ

| Rôle | Pouvoir |
|------|---------|
| **Architecte (Francky)** | Décision finale, validation gates |
| **IA Principal (Claude)** | Exécution, documentation, preuves |
| **Consultants (ChatGPT)** | Validation externe sur demande |

---

**Ces règles sont gravées. Elles ne sont pas négociables.**
