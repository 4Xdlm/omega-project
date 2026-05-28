# OMEGA CODEX — CONTROL_BEFORE_WRITE Protocol
**Version** : 1.0 SEALED | **Date** : 2026-05-28
**Status** : `ACTIVE_AFTER_SEAL`
**Doctrine** : EMP-12.1 CONTROL_BEFORE_WRITE (sous-règle EMP-12)
**Lectorat** : IA (Claude / ChatGPT / Gemini / futurs modèles)

---

## OBJET

Protocole strict de preuve auditable que l'IA a appliqué la règle Architecte *"on contrôle avant d'écrire"* AVANT toute action OMEGA significative.

Le bloc `CONTROL_BEFORE_WRITE` (CBW) est :
- **Obligatoire** avant toute écriture, patch, rapport, mesure, calibration, conclusion empirique
- **Auditable** (format strict, IDs stables référencés)
- **Bloquant** (`FAIL_BLOCKING` si absent ou verdict ≠ GO_WRITE)

---

## QUAND PRODUIRE UN BLOC CBW ?

### OUI — Produire CBW (FAIL_BLOCKING si absent)
- Avant tout commit de code production
- Avant toute calibration (weights, thresholds, hyperparamètres)
- Avant tout bench bulk ou mesure empirique nouvelle
- Avant toute nouvelle "loi" ou conclusion empirique
- Avant toute refonte architecturale (cost function, optimizer, dispatcher)
- Avant toute modification doctrine (EMP-XX, registres rejets, Codex)
- Avant tout NCR ouvert/fermé
- Avant Sprint significatif (≥3 commits OU ≥1 NCR à clore OU activation production OU ≥50 fichiers cumulés)
- Avant claim "best combo" / "gain X%" / "PASS" / "FAIL"

### NON — Pas besoin de CBW
- Question conversationnelle pure (sans action OMEGA)
- Lecture passive de fichier (sans modification ni claim)
- Réponse simple à question factuelle
- Continuation d'une action déjà couverte par CBW antérieur dans la même session (référencer le CBW précédent)

---

## FORMAT STRICT DU BLOC

```
CONTROL_BEFORE_WRITE
─────────────────────────────────────────────────────────
Domaine             : [chunking | scoring | PVI | doctrine | typescript | frontend | LLM | infra | autre]
Action proposée     : [description courte, 1-2 lignes]
Documents consultés : 
  - [fichier:lignes ou tag]
  - [fichier:lignes ou tag]
  - ...
Lois applicables    : 
  - [LAW-XXX-NNN] [STATUS]
  - [LAW-XXX-NNN] [STATUS]
Mesures historiques concernées : 
  - [MEASURE-XXX-NNN]
  - ou "Aucune"
NCRs liées          : 
  - [NCR-XXX-NNN] [STATUS]
  - ou "Aucune"
Interdictions applicables : 
  - [FORBID-XXX-NNN] : [description courte]
  - ou "Aucune"
Hallucinations à éviter : 
  - [HALLU-IA-NNN] : [description courte]
  - ou "Aucune"
Conflits détectés   : [oui : détails / non]
Verdict             : [GO_WRITE | GO_READ_MORE | STOP_ARCHITECT_ARBITRATION]
Justification verdict : [1-3 lignes expliquant pourquoi le verdict]
─────────────────────────────────────────────────────────
```

---

## VERDICTS POSSIBLES

### GO_WRITE
- Toutes les lois applicables ont été lues et vérifiées
- Aucune interdiction `FORBID-*` ne s'applique à l'action proposée
- Aucune hallucination connue `HALLU-IA-*` ne pollue le raisonnement
- Aucun conflit avec mesure historique scellée
- → **L'action peut commencer**

### GO_READ_MORE
- Le contrôle a révélé une zone d'ombre nécessitant lecture supplémentaire AVANT action
- Préciser quels documents/registres doivent être lus en priorité
- Re-produire un nouveau bloc CBW après lecture complémentaire
- → **L'action attend**

### STOP_ARCHITECT_ARBITRATION
- Loi existante directement impactée par l'action
- OU Mesure déjà documentée serait refaite sans justification nouvelle
- OU Seal en jeu (V-01 FROZEN, calibration scellée, etc.)
- OU NCR ouverte qui interdit l'action
- OU Contradiction détectée entre 2+ sources canoniques
- OU Action contredit Pilier 5 (Cimetière hallucinations)
- → **L'action requiert validation Architecte explicite avant tout démarrage**

---

## EXEMPLES PRATIQUES

### Exemple 1 — Action CHUNKING simple : GO_WRITE

**Contexte** : Vérifier la taille moyenne des chunks générés par chunkAdaptive() sur 5 livres pilot.

```
CONTROL_BEFORE_WRITE
─────────────────────────────────────────────────────────
Domaine             : chunking
Action proposée     : Mesurer taille moyenne chunks sur 5 livres pilot pour exploration baseline
Documents consultés : 
  - CODEX_OMEGA v1.2 §1.8 (LAW-CHUNK-040/041/042)
  - OMEGA_PREFLIGHT_LOOKUP.md §1 (CHUNKING)
  - packages/sovereign-engine/src/chunking/adaptive.ts:30-64
Lois applicables    : 
  - LAW-CHUNK-042 [SEALED] (scaling linéaire O(N), autorise mesure)
Mesures historiques concernées : Aucune (nouvelle mesure exploratoire baseline)
NCRs liées          : Aucune (pas de calibration)
Interdictions applicables : Aucune (pas de calibration weights, juste lecture chunk size)
Hallucinations à éviter : 
  - HALLU-IA-004 : Ne pas conclure O(N²) sans preuve nouvelle
Conflits détectés   : Non
Verdict             : GO_WRITE
Justification verdict : Lecture exploratoire baseline, aucune calibration weights, aucun claim "best combo"
─────────────────────────────────────────────────────────
```

### Exemple 2 — Action CHUNKING calibration : STOP_ARCHITECT_ARBITRATION

**Contexte** : Tester nouvelle grille weights (w1, w2, w3) pour V2.1.

```
CONTROL_BEFORE_WRITE
─────────────────────────────────────────────────────────
Domaine             : chunking
Action proposée     : Bench grid w1/w2/w3 nouvelle gamme {0.1, 0.4, 0.7}
Documents consultés : 
  - CODEX_OMEGA v1.2 §1.8 (LAW-CHUNK-040)
  - OMEGA_PREFLIGHT_LOOKUP.md §1 (CHUNKING)
Lois applicables    : 
  - LAW-CHUNK-040 [SEALED] (weights cosmétiques — boundaries identiques)
Mesures historiques concernées : 
  - V2.1.5.1 BEHAVIORAL_AUDIT (180 calls, 30 livres × 6 configs → identique 100%)
NCRs liées          : 
  - NCR_V2_1_WEIGHTS_SCORE_ONLY_NO_DECISION_EFFECT [OPEN_P0_CRITICAL]
Interdictions applicables : 
  - FORBID-CHUNK-001 : Calibrer weights seuls sans tester boundary_hash AVANT bench bulk
Hallucinations à éviter : 
  - HALLU-IA-006 : Calibration weights V2.1 = cosmétique (3 sprints gaspillés)
Conflits détectés   : OUI — action contredit LAW-CHUNK-040 SEALED + FORBID-CHUNK-001
Verdict             : STOP_ARCHITECT_ARBITRATION
Justification verdict : 
  La calibration weights est empiriquement cosmétique (HALLU-IA-006). 
  Si l'Architecte souhaite quand même tester cette grille, il doit explicitement 
  justifier pourquoi malgré LAW-CHUNK-040 + FORBID-CHUNK-001.
─────────────────────────────────────────────────────────
```

### Exemple 3 — Action SCORING : GO_READ_MORE

**Contexte** : Proposer feature CALC nouvelle pour scoring V3.5.

```
CONTROL_BEFORE_WRITE
─────────────────────────────────────────────────────────
Domaine             : scoring
Action proposée     : Évaluer feature candidate `lexical_density_v2` pour M0b V3.5
Documents consultés : 
  - CODEX_OMEGA v1.2 §1.3 (Noyau CALC V3.4)
  - OMEGA_PREFLIGHT_LOOKUP.md §2 (SCORING)
Lois applicables    : 
  - PLATEAU CALC scellé (toute feature doit prouver mécanisme NOUVEAU)
  - Kill-switch +0.02 INCHANGÉ
Mesures historiques concernées : ? (À vérifier : feature similaire déjà testée ?)
NCRs liées          : NCR_V3_4_SEAL_DRIFT (DEFERRED Sprint V3.5+)
Interdictions applicables : 
  - FORBID-SCORING-002 : Δρ ≥ +0.02 obligatoire
Hallucinations à éviter : Aucune identifiée
Conflits détectés   : Lecture incomplète — pas vérifié Registre rejets §1.4 + SENSOR_BENCH_REPORT_V2.md
Verdict             : GO_READ_MORE
Justification verdict : 
  Avant proposer feature, doit lire SENSOR_BENCH_REPORT_V2.md complet pour vérifier 
  si `lexical_density_v2` n'est pas équivalent à coverage/density/concreteness (déjà rejetés 
  pour collinéarité 0.85-0.99 le 2026-04-11). Re-produire CBW après lecture.
─────────────────────────────────────────────────────────
```

---

## ANTI-PATTERNS À ÉVITER

### Anti-pattern 1 — CBW vide ou superficiel
```
❌ MAUVAIS :
CONTROL_BEFORE_WRITE
Domaine: chunking
Documents lus: CODEX
Verdict: GO_WRITE
```
**Pourquoi mauvais** : Pas de fichier précis, pas de lois citées, pas d'interdictions vérifiées. C'est un faux contrôle.

### Anti-pattern 2 — CBW post-hoc
```
❌ MAUVAIS : Produire le CBW APRÈS avoir lancé l'action pour "couvrir"
```
**Pourquoi mauvais** : Le CBW doit précéder l'action, pas la justifier rétroactivement. Si tu réalises post-action qu'un CBW est nécessaire, **STOP l'action**, produit le CBW, et redémarre proprement.

### Anti-pattern 3 — Verdict GO_WRITE forcé malgré conflit
```
❌ MAUVAIS :
Conflits détectés : OUI — LAW-CHUNK-040 contredit l'action
Verdict : GO_WRITE
Justification : "Je pense que c'est différent cette fois"
```
**Pourquoi mauvais** : Si conflit détecté, verdict obligatoire = STOP_ARCHITECT_ARBITRATION. L'IA n'a pas autorité pour overrider une loi SEALED.

### Anti-pattern 4 — Skip CBW car "ça prend trop de temps"
```
❌ MAUVAIS : "Je vais juste tester rapidement, pas besoin de CBW formel"
```
**Pourquoi mauvais** : Cette session 2026-05-27 a documenté empiriquement que skipper CBW = ~10-12h gaspillées sur 3 sprints calibration cosmétique. CBW prend 2-5 min. ROI = 200×.

### Anti-pattern 5 — CBW couvre une action mais l'IA fait autre chose
```
❌ MAUVAIS : CBW couvre "mesurer taille chunks", puis l'IA lance un bench grid weights
```
**Pourquoi mauvais** : CBW doit couvrir EXACTEMENT l'action exécutée. Si scope élargi → nouveau CBW.

---

## INTÉGRATION WORKFLOW

### Intégration Cowork (sessions Claude assist)
- Produire le bloc CBW comme premier message visible avant toute action
- L'utilisateur (Architect) peut vérifier en un coup d'œil
- Si verdict STOP_ARCHITECT_ARBITRATION → attendre réponse explicite

### Intégration Claude Code (sessions code direct)
- Inclure le bloc CBW dans le commit message OU dans un fichier `.cbw/[timestamp].md` versionné
- Wrapper `commit-with-tests.ps1 --codex-preflight` vérifie présence du bloc
- Sans bloc → commit refusé (FAIL_BLOCKING)

### Intégration Tribunal multi-IA (ChatGPT/Gemini consults)
- Avant d'envoyer un prompt à un autre IA → l'IA Cowork doit produire son propre CBW
- L'autre IA peut produire son CBW en retour (auto-discipline)
- Convergence verdicts CBW != preuve d'absence d'hallucination (cf HALLU-IA-001 à 006)

---

## ÉVOLUTION FUTURE (Sprint S13+)

### Phase 2 — Wrapper automatique
- `commit-with-tests.ps1 --codex-preflight` parse le commit message pour bloc CBW
- Bloc manquant ou malformé → exit 1 (FAIL_BLOCKING)
- Bloc présent → log audit `evidence/cbw-audit-YYYY-MM-DD.jsonl`

### Phase 3 — Registre CBW machine-readable
- Chaque CBW exporté dans `OMEGA_CBW_AUDIT_LOG.yaml`
- Permet analyse statistique : domaines fréquents, lois invoquées, conflits détectés
- Détection patterns anti-hallucination

### Phase 4 — Intégration CI/CD
- GitHub Actions / Azure Pipelines vérifient présence CBW dans PR description
- Bloc CBW devient artefact CI standard

---

## CONCLUSION

Le bloc CBW est l'**ANTICORPS** d'OMEGA contre l'amnésie architecturale des IA.

Coût : 2-5 minutes par action significative.
Bénéfice mesuré (session 2026-05-27) : ~10-12h gaspillées si skipped → ROI 200×.

**STATUT FINAL** : `ACTIVE_AFTER_SEAL`

---

_OMEGA CODEX CONTROL_BEFORE_WRITE v1.0 SEALED — 2026-05-27 — Doctrine EMP-12.1 — Lectorat IA (humain plus tard)_
