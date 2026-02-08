# ═══════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — PHASE Q BLUEPRINT (JUSTESSE / PRÉCISION / NÉCESSITÉ)
#   Prompt Claude Code — Version Fusionnée & Améliorée
#
#   Date:     2026-02-08
#   HEAD:     7e1b54af
#   Source:   OMEGA_SUPREME_ROADMAP v4.0 (Phase Q = NEXT, P0)
#   Auteurs:  Claude (fusion) + ChatGPT (blueprint initial)
#   Standard: NASA-Grade L4
#
# ═══════════════════════════════════════════════════════════════════════════════════════

Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.

# ═══════════════════════════════════════════════════
#                MISSION
# ═══════════════════════════════════════════════════

Tu es CLAUDE CODE (exécutant). Tu modifies le repo local OMEGA pour implémenter
**PHASE Q — JUSTESSE / PRÉCISION / NÉCESSITÉ**.

Objectif : prouver que le système produit **la bonne chose**, pas juste "un résultat
techniquement valide". C'est la charnière entre "tout marche" et "ça produit ce qu'il faut".

Contraintes absolues :
- Déterminisme total : même input → même output → même hash
- Aucun TODO, FIXME, placeholder non testable, "à voir"
- Aucune valeur numérique magique (tout seuil = symbolique configurable OU dérivé d'une règle)
- Append-only côté ledger/sessions (jamais de réécriture silencieuse)
- Fail-closed : en cas de doute, le verdict est FAIL

# ═══════════════════════════════════════════════════
#        SOURCE DE VÉRITÉ (TRUTH INPUT)
# ═══════════════════════════════════════════════════

Roadmap normative : docs/roadmap/OMEGA_SUPREME_ROADMAP_v4.0.md
  → Phase Q = NEXT (P0 — CRITIQUE)
  → SHA-256 roadmap v3.0 (précédente) : 2DF0808FA9975D36C1D03CD82CA51FFB763D7DDA83263D8DFEE3104397609CA5

Contexte repo :
  - HEAD : 7e1b54af
  - Governance SEALED (tags phase-d→j-sealed, ROADMAP-B-COMPLETE-v1.0) — NE PAS ROUVRIR
  - Contrat BUILD↔GOVERNANCE : docs/governance/BUILD_GOVERNANCE_CONTRACT.md
  - Hardening SEALED (phases 27-29.2, 1133 tests)
  - Plugins PROVEN (Gateway + SDK, 230 tests)
  - Total tests : ~5953 (0 failures)
  - Drift SESSION_SAVE_2026-02-07 : périmé sur "NEXT" → corriger via addendum append-only

Conventions repo à respecter :
  - Packages : packages/<name>/ avec package.json @omega/<name>
  - Tests : vitest, pattern describe/it/expect
  - Types : TypeScript strict, imports @omega/*
  - Hashing : SHA-256 via @omega/canon-kernel (canonicalize + sha256)
  - Config vitest : voir packages/truth-gate/vitest.config.ts comme modèle
  - Governance source : GOVERNANCE/ avec tests dans tests/governance/
  - Artefacts : artefacts/<phase>/

# ═══════════════════════════════════════════════════
#         INVARIANTS PHASE Q (Q-INV)
# ═══════════════════════════════════════════════════

## Q-INV-01 — NO-BULLSHIT (Précision)
Toute assertion de fait dans un output DOIT être :
  - présente dans l'input (fact sourcing), OU
  - dérivée par une règle explicitée dans ORACLE_RULES
Si aucune des deux → claim "non supporté" → FAIL si count > seuil symbolique

## Q-INV-02 — NECESSITY (Nécessité)
Pour un output composé de segments S1..Sn :
  - Ablation de chaque segment Si → recalcul des propriétés attendues
  - Si suppression de Si ne change AUCUNE propriété attendue → segment inutile
  - Si ratio segments inutiles > seuil symbolique → FAIL
  (Propriétés attendues = "expected_props" dans le testset)

## Q-INV-03 — CONTRADICTION ZERO-TOLERANCE
Détection contradictions internes :
  - Négation directe d'un énoncé
  - Incompatibilité de contraintes ("toujours" vs "jamais", "X > Y" et "Y > X")
  - Affirmation puis infirmation du même fait
  → Toute contradiction détectée → FAIL immédiat

## Q-INV-04 — LOCAL STABILITY (Stabilité locale)
Petite variation d'input → variation LOCALISÉE de l'output, pas effondrement global.
Mesure : delta de segments borné par règle symbolique :
  - delta_segments ≤ STABILITY_FACTOR × changed_fields_count
  - STABILITY_FACTOR = symbole configurable (pas chiffre brut)
  - Test : varier 1 champ → mesurer segments changés → vérifier borne

## Q-INV-05 — FORMAT & NORMALIZATION
  - Rapport respecte JSON Schema (PHASE_Q_METRICS.schema.json)
  - Normalisation LF (pas CRLF)
  - JSON trié par clés (ordre lexicographique)
  - Whitespace normalisé dans candidate_output avant évaluation

## Q-INV-06 — TRACEABILITY (AJOUT — absent du blueprint ChatGPT)
  - Chaque étape d'évaluation génère une EVIDENCE
  - Evidence = { step, input_hash, output_hash, rule_applied, verdict, timestamp_deterministic }
  - Le rapport final inclut la chaîne complète d'evidences
  - Hash du rapport vérifiable par @omega/proof-pack patterns

# ═══════════════════════════════════════════════════
#     ARCHITECTURE : TRIPLE-ORACLE (INNOVATION)
# ═══════════════════════════════════════════════════

ChatGPT proposait Dual-Oracle. On passe à TRIPLE-ORACLE :

## Oracle-A : SYMBOLIC RULES (Règles déterministes)
  - Applique ORACLE_RULES.md strictement
  - Évalue : unsupported claims, contradictions, must_find/must_not_find
  - Produit : metrics + verdict + evidence chain

## Oracle-B : ADVERSARIAL + ABLATION (Stress-test)
  - Génère variantes adversariales déterministes du candidate_output
  - Génère ablations déterministes (suppression de segments)
  - Si une variante/ablation révèle un Q-INV en échec → FAIL
  - Stratégies adversariales :
    a) NEGATION : inverser des assertions
    b) PERMUTATION : réordonner des segments
    c) INJECTION : ajouter du bruit factuel
    d) TRUNCATION : couper des parties
    e) SUBSTITUTION : remplacer des valeurs

## Oracle-C : CROSS-REFERENCE (AJOUT — vérifie cohérence inter-modules)
  - Vérifie que l'output est cohérent avec les invariants OMEGA existants
  - Cross-check avec les patterns du canon-kernel si applicable
  - Vérifie non-régression par rapport aux baselines connues
  - Produit : cross-ref score + violations list

## Verdict Final
  verdict = MIN(Oracle-A, Oracle-B, Oracle-C)
  → Le pire verdict gagne (fail-closed)

# ═══════════════════════════════════════════════════
#         LIVRABLES (OBLIGATOIRES)
# ═══════════════════════════════════════════════════

## 1. Package @omega/phase-q

Créer : packages/phase-q/

```
packages/phase-q/
├── package.json           # @omega/phase-q v0.1.0, type: module
├── tsconfig.json          # strict, ESNext
├── vitest.config.ts       # pattern truth-gate
├── src/
│   ├── index.ts           # API publique
│   ├── types.ts           # Types Phase Q
│   ├── config.ts          # Symboles configurables (STABILITY_FACTOR, UNSUPPORTED_MAX, etc.)
│   ├── normalizer.ts      # Normalisation outputs (whitespace, LF, JSON sort)
│   ├── oracle-a.ts        # Oracle Symbolic Rules
│   ├── oracle-b.ts        # Oracle Adversarial + Ablation
│   ├── oracle-c.ts        # Oracle Cross-Reference
│   ├── evaluator.ts       # Pipeline principal (charge testset → 3 oracles → verdict)
│   ├── ablation.ts        # Générateur ablations déterministes
│   ├── adversarial.ts     # Générateur variations adversariales déterministes
│   ├── evidence.ts        # Générateur evidence chain
│   └── report.ts          # Génération rapport déterministe (JSON + MD)
└── tests/
    ├── oracle-a.test.ts
    ├── oracle-b.test.ts
    ├── oracle-c.test.ts
    ├── evaluator.test.ts
    ├── ablation.test.ts
    ├── adversarial.test.ts
    ├── normalizer.test.ts
    ├── evidence.test.ts
    ├── report.test.ts
    ├── determinism.test.ts # Test snapshot : 2 runs → même hash rapport
    └── invariants.test.ts  # Mapping direct Q-INV-01→06 → tests
```

## 2. Artefacts

Créer : artefacts/phase-q/

```
artefacts/phase-q/
├── PHASE_Q_TESTSET.ndjson          # Dataset évaluation (≥50 cas)
├── PHASE_Q_ORACLE_RULES.md         # Règles Oracle-A formalisées
├── PHASE_Q_METRICS.schema.json     # JSON Schema métriques + verdicts
├── PHASE_Q_CONFIG.json             # Symboles configurables (seuils)
└── reports/                        # (généré par pipeline)
    ├── PHASE_Q_REPORT.json         # Résultat complet, trié, stable
    └── PHASE_Q_REPORT.md           # Version lisible
```

## 3. Session Save (append-only)

Créer : sessions/SESSION_SAVE_2026-02-08_PHASE_Q_KICKOFF.md

Contenu obligatoire :
- TRUTH UPDATE : "Phase Q is NEXT per ROADMAP v4.0"
- DRIFT CORRECTION : "SESSION_SAVE_2026-02-07 périmé sur NEXT (F→J all SEALED)"
- SHA-256 du roadmap v4.0
- SHA-256 du testset NDJSON
- Liste invariants Q-INV-01→06
- HEAD au moment du kickoff

# ═══════════════════════════════════════════════════
#       TESTSET NDJSON — SPÉCIFICATION
# ═══════════════════════════════════════════════════

Chaque ligne = 1 JSON object, clés triées, déterministe :

```json
{
  "id": "Q-CASE-0001",
  "category": "necessity|contradiction|precision|stability|adversarial|cross-ref",
  "input": {
    "context": "...",
    "facts": ["FACT-1", "FACT-2"],
    "constraints": ["CONST-1"]
  },
  "candidate_output": "...",
  "expected": {
    "verdict": "PASS|FAIL",
    "expected_props": ["PROP-coherence", "PROP-factual"],
    "must_find": ["..."],
    "must_not_find": ["..."],
    "max_unsupported_claims": "CONFIG:UNSUPPORTED_MAX",
    "contradiction_ids": [],
    "notes": "..."
  }
}
```

Répartition minimale (≥60 cas) :

| Catégorie | Cas | Description |
|-----------|-----|-------------|
| precision | 14 | Facts non supportés, dérivations invalides |
| necessity | 14 | Segments inutiles (ablation ne change rien) |
| contradiction | 10 | Négations, incompatibilités logiques |
| stability | 10 | Variations d'input → mesure delta |
| adversarial | 8 | Injections, permutations, substitutions |
| cross-ref | 4 | Incohérence avec invariants OMEGA existants |
| TOTAL | ≥60 | |

# ═══════════════════════════════════════════════════
#       SYMBOLES CONFIGURABLES (pas de magic numbers)
# ═══════════════════════════════════════════════════

Fichier PHASE_Q_CONFIG.json :

```json
{
  "UNSUPPORTED_MAX": {
    "value": 0,
    "unit": "count",
    "rule": "Q-INV-01: zero unsupported claims in strict mode",
    "override": "WAIVER required (human-signed)"
  },
  "NECESSITY_MIN_RATIO": {
    "value": 0.85,
    "unit": "ratio",
    "rule": "Q-INV-02: at least 85% segments must be necessary",
    "derivation": "Empirical: below 0.85 indicates padding/filler"
  },
  "STABILITY_FACTOR": {
    "value": 3,
    "unit": "multiplier",
    "rule": "Q-INV-04: delta_segments <= STABILITY_FACTOR * changed_fields",
    "derivation": "Conservative bound: 3x allows reasonable propagation"
  },
  "ABLATION_STRATEGY": {
    "value": "single-segment",
    "alternatives": ["single-segment", "pair-segment", "random-k"],
    "rule": "Q-INV-02: default to single-segment for determinism"
  }
}
```

IMPORTANT : chaque valeur a `rule` + `derivation`. Pas de chiffre sans justification.

# ═══════════════════════════════════════════════════
#       PIPELINE D'EXÉCUTION
# ═══════════════════════════════════════════════════

```
1. LOAD
   ├── Charger PHASE_Q_TESTSET.ndjson
   ├── Charger PHASE_Q_CONFIG.json (symboles)
   ├── Charger PHASE_Q_ORACLE_RULES.md (parse rules)
   └── Valider schema (PHASE_Q_METRICS.schema.json)

2. EVALUATE (pour chaque case)
   ├── Normaliser candidate_output (LF, whitespace, trim)
   ├── Oracle-A (symbolic) → metrics_a + verdict_a + evidence_a
   ├── Oracle-B (adversarial) → metrics_b + verdict_b + evidence_b
   ├── Oracle-C (cross-ref) → metrics_c + verdict_c + evidence_c
   └── Fusion → verdict_final = MIN(a, b, c) + merged evidence

3. AGGREGATE
   ├── Compiler tous les verdicts
   ├── Calculer scores globaux
   ├── Détecter patterns de failure
   └── Générer evidence chain complète

4. REPORT
   ├── PHASE_Q_REPORT.json (trié, stable, hash reproductible)
   ├── PHASE_Q_REPORT.md (lisible)
   └── Vérification : 2 runs → même hash (test determinism.test.ts)

5. PROOF-PACK (optionnel mais recommandé)
   ├── Manifest SHA-256 de tous les artefacts
   ├── Root hash (Merkle) du testset
   └── Format compatible @omega/proof-pack
```

# ═══════════════════════════════════════════════════
#       TESTS VITEST — COUVERTURE
# ═══════════════════════════════════════════════════

Tests obligatoires :

| Fichier | Couverture | Tests min |
|---------|------------|-----------|
| oracle-a.test.ts | Q-INV-01 (precision), Q-INV-03 (contradictions), must_find/must_not_find | 20 |
| oracle-b.test.ts | Q-INV-02 (ablation), Q-INV-04 (stability), adversarial strategies | 20 |
| oracle-c.test.ts | Q-INV-06 cross-reference, baseline consistency | 10 |
| evaluator.test.ts | Pipeline complet, verdict fusion, edge cases | 15 |
| ablation.test.ts | Générateur déterministe, couverture segments | 10 |
| adversarial.test.ts | 5 stratégies (negation/permutation/injection/truncation/substitution) | 10 |
| normalizer.test.ts | LF, whitespace, JSON sort, idempotence | 8 |
| evidence.test.ts | Evidence chain, hash integrity, completeness | 8 |
| report.test.ts | Schema validation, format, stability | 8 |
| determinism.test.ts | 2 runs → même hash, snapshot test | 5 |
| invariants.test.ts | Mapping 1:1 Q-INV-01→06 → au moins 1 test chacun | 12 |
| **TOTAL** | | **≥126** |

Contraintes tests :
- 100% déterministes (pas de Date.now(), Math.random(), réseau)
- Pas de dépendance réseau/temps
- Chaque test autonome (pas d'ordre d'exécution)

# ═══════════════════════════════════════════════════
#       INTÉGRATION GOVERNANCE (HOOKS)
# ═══════════════════════════════════════════════════

Phase Q ne MODIFIE PAS la governance SEALED, mais s'y CONNECTE :

1. Les rapports Phase Q sont des inputs valides pour :
   - GOVERNANCE/drift/ (drift detection peut monitorer les scores Phase Q)
   - GOVERNANCE/regression/ (les rapports deviennent des baselines)

2. Le format evidence de Phase Q est compatible avec :
   - templates/drift/DRIFT_REPORT.template.json
   - GOVERNANCE/runtime/ event format

3. Les verdicts Phase Q suivent le même pattern fail-closed que governance.

Ne PAS importer directement les modules governance (couplage interdit).
Utiliser les MÊMES interfaces/types si possible (@omega/contracts-canon).

# ═══════════════════════════════════════════════════
#       CRITÈRE DE SORTIE PHASE Q
# ═══════════════════════════════════════════════════

PHASE Q = PASS uniquement si :
  □ Package @omega/phase-q compile (tsc --noEmit)
  □ Tous les tests vitest PASS (≥126 tests, 0 failures)
  □ Pipeline sur testset complet → 100% verdicts match expected
  □ Rapport stable (hash identique sur 2 runs consécutifs)
  □ Schema JSON valide
  □ Aucun TODO/FIXME dans le code
  □ Evidence chain complète pour chaque cas
  □ Session save créé avec hashes

Sinon → FAIL. Pas d'état intermédiaire.

# ═══════════════════════════════════════════════════
#       AUTO-AUDIT OBLIGATOIRE (FIN)
# ═══════════════════════════════════════════════════

À la fin de l'implémentation, produire :

```markdown
## AUTO-AUDIT PHASE Q

### Fichiers créés/modifiés
| Fichier | Action | Raison |
|---------|--------|--------|

### Tests
| Suite | Tests | PASS | FAIL |
|-------|-------|------|------|

### Preuves déterminisme
| Artefact | Hash Run 1 | Hash Run 2 | Match |
|----------|-----------|-----------|-------|

### Invariants couverts
| Invariant | Tests | Status |
|-----------|-------|--------|

### Verdict
PHASE Q : PASS / FAIL
```

# ═══════════════════════════════════════════════════
#       COMMIT & TAG
# ═══════════════════════════════════════════════════

Commit message :
```
phase-q: implement justesse/necessity triple-oracles + testset (≥60 cases, ≥126 tests)

Q-INV-01: NO-BULLSHIT (precision)
Q-INV-02: NECESSITY (ablation)
Q-INV-03: CONTRADICTION ZERO-TOLERANCE
Q-INV-04: LOCAL STABILITY
Q-INV-05: FORMAT & NORMALIZATION
Q-INV-06: TRACEABILITY (evidence chain)

Triple-Oracle: Symbolic + Adversarial + Cross-Reference
Verdict: MIN(Oracle-A, Oracle-B, Oracle-C)
```

Ne PAS push ni tag sans autorisation explicite de l'Architecte.

# ═══════════════════════════════════════════════════
#       EXÉCUTION
# ═══════════════════════════════════════════════════

1. Créer la branche : git checkout -b phase-q-justesse
2. Implémenter le package + artefacts + tests
3. Exécuter : cd packages/phase-q && npm install && npm test
4. Vérifier déterminisme : exécuter 2 fois, comparer hashes
5. Commit local
6. Produire auto-audit
7. Attendre validation Architecte
