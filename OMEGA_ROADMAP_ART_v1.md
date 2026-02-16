# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA ART — ROADMAP TECHNIQUE COMPLÈTE
#   "Écriture 100× supérieure — faire disparaître l'auteur humain"
#
#   Date: 2026-02-16
#   Architecte Suprême: Francky
#   IA Principal: Claude (Anthropic)
#   Audit Hostile: ChatGPT
#   Vision: Gemini (filtré par Claude)
#   Standard: NASA-Grade L4 / DO-178C / MIL-STD
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

STATUS: PRÊT À EXÉCUTER
VERSION: 1.0
CONTEXTE: Phase ART — Transcendance Artistique (NEXT)
PARENT: OMEGA_SUPREME_ROADMAP v5.0
PRÉREQUIS: Roadmap OMNIPOTENT v1.1 COMPLETE + Hardening Sprints 7-8 COMPLETE
TESTS ACTUELS: 288/288 PASS (266 sovereign + 22 signal-registry)
GATES ACTUELS: 6/6 PASS (no-shadow, no-todo, active, roadmap, idl, proofpack)
VERSION REPO: v2.0.0-harden1
SCORING: V3 (4 macro-axes, 10 axes, seuil 92)
SCORING CIBLE: V3.1 (5 macro-axes, 14 axes, seuil 93)

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    RÈGLE CARDINALE — VERROUILLAGE ROADMAP
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   RULE-ROADMAP-01 — OBLIGATION DE SUIVI (NON NÉGOCIABLE)                             ║
║                                                                                       ║
║   Tant que cette roadmap n'est pas terminée (Sprint 9 → Sprint 20) :                ║
║                                                                                       ║
║   1. À CHAQUE DÉBUT DE PHASE/COMMIT :                                                ║
║      → L'IA consulte ce document                                                     ║
║      → L'IA affiche l'avancement actuel (où on en est)                               ║
║      → L'IA identifie le prochain commit à exécuter                                  ║
║                                                                                       ║
║   2. AUCUNE DÉVIATION AUTORISÉE :                                                    ║
║      → On suit les sprints dans l'ordre (9 → 10 → ... → 20)                         ║
║      → On suit les commits dans l'ordre (9.1 → 9.2 → ... → 9.N)                    ║
║      → Aucun saut, aucun raccourci, aucune "optimisation" du plan                   ║
║                                                                                       ║
║   3. BILAN OBLIGATOIRE À CHAQUE REPRISE DE SESSION :                                 ║
║      → Lire ce document EN PREMIER                                                   ║
║      → Afficher : Sprint X — Commit Y.Z — Status [DONE/EN COURS/TODO]               ║
║      → Afficher la checklist de fin de sprint si on termine un sprint                ║
║                                                                                       ║
║   4. MODIFICATION DE LA ROADMAP :                                                    ║
║      → Uniquement sur décision explicite de l'Architecte Suprême                     ║
║      → Toute modification = nouvelle version (v1.1, v2.0, etc.)                      ║
║      → L'IA ne peut PAS modifier ce plan de sa propre initiative                     ║
║                                                                                       ║
║   VIOLATION = CORRUPTION SILENCIEUSE DU PROJET                                       ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

## Format de suivi obligatoire (à chaque début de travail)

```markdown
## 📍 AVANCEMENT ROADMAP ART

| Sprint | Commit | Description | Status |
|--------|--------|-------------|--------|
| 9 | 9.1 | analyzeEmotionSemantic() interface + types | ⬜ TODO |
| 9 | 9.2 | LLM emotion analyzer implementation | ⬜ TODO |
| 9 | 9.3 | Cache layer (text_hash, model_id, prompt_hash) | ⬜ TODO |
| 9 | 9.4 | Emotion contradiction compiler | ⬜ TODO |
| 9 | 9.5 | Migration tension_14d + emotion_coherence | ⬜ TODO |
| 9 | 9.6 | Calibration 5 CAL-CASE + corrélation ancien/nouveau | ⬜ TODO |
| 9 | 9.7 | Gates + ProofPack | ⬜ TODO |
| 10 | 10.1 | sentence-surgeon interface + types | ⬜ TODO |
| 10 | 10.2 | Micro-rewrite engine (LLM micro-calls) | ⬜ TODO |
| 10 | 10.3 | Re-score guard (revert si régression) | ⬜ TODO |
| 10 | 10.4 | Paragraph-level patch (Quantum Suture) | ⬜ TODO |
| 10 | 10.5 | Emotion-to-action mapping dictionary | ⬜ TODO |
| 10 | 10.6 | Remplacement des 3 no-op | ⬜ TODO |
| 10 | 10.7 | Tests + Gates + ProofPack | ⬜ TODO |
| 11 | 11.1 | show_dont_tell detector (patterns + LLM) | ⬜ TODO |
| 11 | 11.2 | authenticity scorer (anti-IA smell) | ⬜ TODO |
| 11 | 11.3 | 2 nouveaux axes (show_dont_tell, authenticity) | ⬜ TODO |
| 11 | 11.4 | Macro-axe AAI (Authenticity & Art Index) | ⬜ TODO |
| 11 | 11.5 | Intégration dans correction loop | ⬜ TODO |
| 11 | 11.6 | Tests + Gates + ProofPack | ⬜ TODO |
| 12 | 12.1 | Dead metaphor blacklist FR (500+) | ⬜ TODO |
| 12 | 12.2 | metaphor_novelty axe (LLM-judged) | ⬜ TODO |
| 12 | 12.3 | Scoring V3.1 (5 macro-axes, 14 axes, seuil 93) | ⬜ TODO |
| 12 | 12.4 | Recalibration complète sur 5 CAL-CASE | ⬜ TODO |
| 12 | 12.5 | Non-régression totale + ProofPack V2 | ⬜ TODO |
| 12 | 12.6 | Tag v3.0.0-art-foundations | ⬜ TODO |
| — | — | MILESTONE: FONDATIONS ARTISTIQUES SEALED | ⬜ TODO |
| 13 | 13.1-13.4 | Voice Genome (extension style_genome) | ⬜ TODO |
| 14 | 14.1-14.4 | Reader Phantom Light (3 dimensions) | ⬜ TODO |
| 15 | 15.1-15.4 | Phonetic Engine Light (cacophonie) | ⬜ TODO |
| 16 | 16.1-16.4 | Temporal Architect | ⬜ TODO |
| — | — | MILESTONE: PERCEPTION & RAFFINEMENTS SEALED | ⬜ TODO |
| 17 | 17.1-17.3 | Benchmark Pilote (10+10 textes, blind) | ⬜ TODO |
| 18 | 18.1-18.3 | Calibration basée benchmark | ⬜ TODO |
| 19 | 19.1-19.3 | Consolidation + Audit | ⬜ TODO |
| 20 | 20.1-20.3 | Certification + Tag v3.0.0-art | ⬜ TODO |

Prochain : Sprint 9 — Commit 9.1
```

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE 0 — POURQUOI CE DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## Problème identifié (Analyse Comparative Claude × ChatGPT × Gemini — 2026-02-16)

Le sovereign-engine est NASA-grade en PIPELINE mais pas en ART.
7 trous béants identifiés dans le code source :

| # | Trou | Impact | Preuve |
|---|------|--------|--------|
| 1 | `analyzeEmotionFromText()` = keyword matching | 63.3% du scoring repose sur du comptage de mots. "Il n'avait pas peur" score positivement sur fear. | Code source omega-forge |
| 2 | `polishRhythm()` = NO-OP | Retourne prose inchangée. Détecte mais ne corrige pas. | Code source sovereign-engine |
| 3 | `sweepCliches()` = NO-OP | Retourne prose inchangée. | Code source sovereign-engine |
| 4 | `enforceSignature()` = NO-OP | Retourne prose inchangée. | Code source sovereign-engine |
| 5 | 4 axes auto-évalués par le LLM qui a écrit le texte | L'étudiant corrige sa propre copie. Biais systématique. | Architecture oracle/axes/ |
| 6 | Aucune mesure du "show don't tell" | LE critère n°1 de la prose littéraire non mesuré. | Absence de module |
| 7 | Aucune détection "IA smell" | Le texte "sent l'IA" — phrases trop symétriques, métaphores trop propres. | Absence de module |

## Décisions verrouillées (Francky + Claude + ChatGPT — 2026-02-16)

| Décision | Choix | Tranché par |
|----------|-------|-------------|
| Remplacement keyword matching | LLM-based structured JSON (pas embeddings séparés) | Claude + ChatGPT |
| Polish no-op | Réécriture réelle via micro-appels LLM | Unanime |
| ECC V4 hégémonique (physics 40%) | REJETÉ — d'abord l'œil juste, ensuite le fouet | Claude + ChatGPT |
| Genesis Self-Feeding Loop | REJETÉ — viole BUILD/GOVERNANCE, risque surapprentissage | Claude + ChatGPT |
| 27 axes / 7 macro-axes | REJETÉ — trop d'axes. 14 axes / 5 macro-axes = réaliste | Claude (auto-correction) |
| Multi-agent spécialisés | REJETÉ — coût ×4, gain non prouvé | Claude + ChatGPT |
| Scoring V3.1 | 5 macro-axes, 14 axes, seuil 93 | Unanime |
| Adversarial Judge | Module anti-IA smell obligatoire | ChatGPT + Claude |
| Benchmark humain | Pilote d'abord (10+10 textes, 3 lecteurs) | Unanime |
| Physics compliance activation | Progressive APRÈS calibration, pas hégémonique | Unanime |
| Cache Semantic Cortex | Obligatoire : (text_hash, model_id, prompt_hash) | ChatGPT |
| Tolérance de correction | Correction acceptée SEULEMENT si gain ≥ seuil configurable | ChatGPT |

## Documents de référence

| Document | Rôle |
|----------|------|
| OMEGA_PLAN_EXTRATERRESTRE.md | Vision initiale Claude (7 modules, 27 axes) |
| OMEGA_ANALYSE_COMPARATIVE_TOTALE.md | Tri final : 7 retenues, 7 adaptées, 9 jetées |
| BLUEPRINT_ENGINE_WRITING_x_EMOTION.md | État technique complet du moteur actuel |
| OMEGA_ROADMAP_OMNIPOTENT_v1.md | Roadmap prédécesseur (Sprints 1-8) |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE I — ARCHITECTURE CIBLE
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

## Nouveaux modules et fichiers

```
omega-project/packages/
├── sovereign-engine/                    ← EXISTANT — MODIFIÉ
│   ├── src/
│   │   ├── semantic/                    ← NOUVEAU DOSSIER
│   │   │   ├── semantic-analyzer.ts     ← analyzeEmotionSemantic() via LLM
│   │   │   ├── semantic-cache.ts        ← Cache (text_hash, model_id, prompt_hash)
│   │   │   ├── emotion-contradiction.ts ← Détection émotions mixtes
│   │   │   ├── emotion-to-action.ts     ← Mapping émotion → comportements concrets
│   │   │   └── types.ts                 ← SemanticEmotionResult, CacheKey, etc.
│   │   │
│   │   ├── polish/                      ← EXISTANT — REMPLACÉ (no-op → réel)
│   │   │   ├── sentence-surgeon.ts      ← NOUVEAU — micro-réécriture phrase par phrase
│   │   │   ├── paragraph-patch.ts       ← NOUVEAU — patch ciblé paragraphe
│   │   │   ├── re-score-guard.ts        ← NOUVEAU — vérification avant acceptation
│   │   │   ├── micro-patch-engine.ts    ← NOUVEAU — orchestration corrections
│   │   │   ├── musical-engine.ts        ← MODIFIÉ (no-op → correction réelle)
│   │   │   ├── anti-cliche-sweep.ts     ← MODIFIÉ (no-op → correction réelle)
│   │   │   └── signature-enforcement.ts ← MODIFIÉ (no-op → correction réelle)
│   │   │
│   │   ├── silence/                     ← NOUVEAU DOSSIER
│   │   │   ├── show-dont-tell.ts        ← Détection telling vs showing
│   │   │   ├── telling-patterns.ts      ← Patterns CALC de telling (FR)
│   │   │   └── types.ts                 ← TellingViolation, ShowDontTellResult
│   │   │
│   │   ├── authenticity/                ← NOUVEAU DOSSIER
│   │   │   ├── ia-smell-detector.ts     ← Détection patterns IA (CALC)
│   │   │   ├── ia-smell-patterns.ts     ← 15+ patterns IA détectables
│   │   │   ├── adversarial-judge.ts     ← LLM adversarial (fraud_score)
│   │   │   └── types.ts                 ← IASmellResult, FraudScore
│   │   │
│   │   ├── metaphor/                    ← NOUVEAU DOSSIER
│   │   │   ├── dead-metaphor-blacklist.ts ← 500+ métaphores mortes FR
│   │   │   ├── metaphor-detector.ts     ← Détection métaphores dans la prose
│   │   │   ├── novelty-scorer.ts        ← Score originalité (LLM-judged)
│   │   │   └── types.ts                 ← MetaphorHit, NoveltyScore
│   │   │
│   │   ├── oracle/
│   │   │   ├── axes/
│   │   │   │   ├── show-dont-tell.ts    ← NOUVEAU AXE (×3.0)
│   │   │   │   ├── authenticity.ts      ← NOUVEAU AXE (×2.0)
│   │   │   │   ├── metaphor-novelty.ts  ← NOUVEAU AXE (×1.5)
│   │   │   │   └── restraint.ts         ← NOUVEAU AXE (×1.0)
│   │   │   └── macro-axes.ts           ← MODIFIÉ (V3 → V3.1, +AAI)
│   │   │
│   │   ├── input/
│   │   │   └── constraint-compiler.ts   ← MODIFIÉ (contradiction + action mapping)
│   │   │
│   │   └── config.ts                    ← MODIFIÉ (nouveaux poids, seuils, features)
│   │
│   └── __tests__/
│       ├── semantic/                    ← NOUVEAUX TESTS
│       ├── polish/                      ← NOUVEAUX TESTS
│       ├── silence/                     ← NOUVEAUX TESTS
│       ├── authenticity/                ← NOUVEAUX TESTS
│       └── metaphor/                    ← NOUVEAUX TESTS
```

## 22 Invariants ART

| ID | Description | Gate | Sprint |
|----|-------------|------|--------|
| **ART-SEM-01** | `analyzeEmotionSemantic()` retourne 14D JSON strict, jamais NaN/Infinity | Test | 9 |
| **ART-SEM-02** | Cache hit : même (text_hash + model_id + prompt_hash) → même résultat | GATE-SC | 9 |
| **ART-SEM-03** | Tolérance variance : N-samples median, écart-type < 5 points | Test | 9 |
| **ART-SEM-04** | Négation résolue : "pas peur" ≠ "peur" (golden test) | Test | 9 |
| **ART-SEM-05** | Rétrocompatibilité : `analyzeEmotionFromText()` toujours disponible | Test | 9 |
| **ART-POL-01** | Micro-correction JAMAIS acceptée si score_after ≤ score_before | Test | 10 |
| **ART-POL-02** | Max 15 micro-corrections par passe, 1 passe max | Config | 10 |
| **ART-POL-03** | Chaque correction traçable : (sentence_idx, original, rewritten, reason, delta) | Test | 10 |
| **ART-POL-04** | `polishRhythm()` ne retourne PLUS prose inchangée | Test | 10 |
| **ART-POL-05** | `sweepCliches()` ne retourne PLUS prose inchangée | Test | 10 |
| **ART-POL-06** | `enforceSignature()` ne retourne PLUS prose inchangée | Test | 10 |
| **ART-SDT-01** | Telling détecté : "il était triste" → flagged | Test | 11 |
| **ART-SDT-02** | `show_dont_tell` axe poids ×3.0, méthode HYBRID | Config | 11 |
| **ART-AUTH-01** | `authenticity` détecte ≥ 10/15 patterns IA connus | Test | 11 |
| **ART-AUTH-02** | `fraud_score` 0-100 via LLM adversarial, reproductible (cache) | Test | 11 |
| **ART-META-01** | Blacklist contient ≥ 500 métaphores mortes FR | Test | 12 |
| **ART-META-02** | Zéro dead metaphor dans prose finale (post-correction) | Test | 12 |
| **ART-META-03** | `metaphor_novelty` axe LLM-judged, cache obligatoire | Test | 12 |
| **ART-SCORE-01** | Scoring V3.1 : 5 macro-axes (ECC, RCI, SII, IFI, AAI) | Config | 12 |
| **ART-SCORE-02** | Seuil SEAL : 93 (monté de 92) | Config | 12 |
| **ART-SCORE-03** | Planchers : ECC ≥ 88, RCI ≥ 85, SII ≥ 85, IFI ≥ 85, AAI ≥ 85 | Config | 12 |
| **ART-SCORE-04** | Non-régression : tous tests existants (288) TOUJOURS PASS | Test | Tous |

## 7 Gates

| Gate | Quoi | Quand |
|------|------|-------|
| GATE-NS | No shadow imports | Chaque commit |
| GATE-NT | No TODO/FIXME/HACK | Chaque commit |
| GATE-A | Meta-gate active | Chaque commit |
| GATE-RM | Roadmap checkpoint | Chaque commit |
| GATE-IDL | Registry = IDL codegen | Chaque commit |
| GATE-PP | ProofPack complet | Chaque commit |
| **GATE-SC** | **Semantic Cache determinism** | **Chaque commit** ← NOUVEAU |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE II — SPRINTS DÉTAILLÉS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 9 — SEMANTIC CORTEX : REMPLACEMENT KEYWORD MATCHING
#  Périmètre : remplacer analyzeEmotionFromText() par analyse LLM sémantique
#  Risque : ÉLEVÉ (touche 63.3% du scoring)
#  Critère de sortie : corrélation nouveau/ancien mesurée, 5 CAL-CASE scorés,
#                       cache déterministe, négation résolue
# ─────────────────────────────────────────────────────────────────────────────

## Commit 9.1 — Interface + Types Semantic Analyzer

### Fichiers à créer

**`packages/sovereign-engine/src/semantic/types.ts`**
```typescript
interface SemanticEmotionResult {
  joy: number;           // 0-1
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  anger: number;
  anticipation: number;
  love: number;
  submission: number;
  awe: number;
  disapproval: number;
  remorse: number;
  contempt: number;
}

interface SemanticCacheKey {
  text_hash: string;     // SHA-256 du texte analysé
  model_id: string;      // Ex: 'claude-sonnet-4-20250514'
  prompt_hash: string;   // SHA-256 du prompt d'analyse
}

interface SemanticAnalyzerConfig {
  enabled: boolean;                  // DEFAULT: true
  fallback_to_keywords: boolean;     // DEFAULT: true
  cache_enabled: boolean;            // DEFAULT: true
  cache_ttl_seconds: number;         // DEFAULT: 3600
  n_samples: number;                 // DEFAULT: 1 (fast), 3 (stable)
  variance_tolerance: number;        // DEFAULT: 5.0
  min_improvement_threshold: number; // DEFAULT: 2.0
}
```

**`packages/sovereign-engine/src/semantic/semantic-analyzer.ts`**
```
Interface publique :
  analyzeEmotionSemantic(
    text: string,
    language: 'fr' | 'en',
    provider: SovereignProvider,
    config?: SemanticAnalyzerConfig
  ) → Promise<SemanticEmotionResult>

  Prompt LLM (JSON strict) :
    "Analyse les émotions dans ce texte.
     Retourne UNIQUEMENT un JSON avec 14 clés Plutchik (0.0-1.0).
     ATTENTION :
     - 'il n'avait pas peur' = fear FAIBLE (0.0-0.2), PAS fort
     - 'elle souriait malgré sa tristesse' = joy MOYEN + sadness MOYEN
     - Ironie = inverser l'émotion apparente
     Texte: {text}"

  Validation : 14 clés présentes, valeurs numériques [0,1], pas de NaN
  Fallback : si parsing échoue → analyzeEmotionFromText() (keywords)
```

### Tests : SEM-01..06
### Commit message
```
feat(sovereign): semantic analyzer interface + types [ART-SEM-01]
```

---

## Commit 9.2 — LLM Emotion Analyzer Implementation

### Implémentation complète :
1. Construction prompt avec texte
2. Appel LLM via `provider.generateStructuredJSON(prompt)`
3. Parsing JSON strict (try/catch)
4. Validation 14 clés, valeurs [0, 1], clamp
5. Si N-samples > 1 : N appels, MEDIAN par dimension
6. Si écart-type > variance_tolerance → WARNING
7. Fallback keywords si échec total

### Tests : SEM-07..10
### Commit message
```
feat(sovereign): LLM emotion analyzer implementation [ART-SEM-01, ART-SEM-04]
```

---

## Commit 9.3 — Cache Layer

### Fichier : `packages/sovereign-engine/src/semantic/semantic-cache.ts`

```
SemanticCache :
  computeCacheKey(text, modelId, promptHash) → string   // SHA-256
  get(key) → SemanticEmotionResult | null               // null si TTL expiré
  set(key, result) → void
  clear() → void
  stats() → { hits, misses, size }
```

### Tests : CACHE-01..05
### Commit message
```
feat(sovereign): semantic cache layer [ART-SEM-02]
```

---

## Commit 9.4 — Emotion Contradiction + Action Mapping

### `packages/sovereign-engine/src/semantic/emotion-contradiction.ts`
```
detectContradictions(result: SemanticEmotionResult) → EmotionContradiction[]
  // 2+ émotions > 0.4 = contradiction
  // Génère instruction_fr pour le compiler
```

### `packages/sovereign-engine/src/semantic/emotion-to-action.ts`
```
EMOTION_ACTION_MAP: Record<string, string[]>
  fear → ["regard fuyant", "mains moites", "respiration courte", ...]
  sadness → ["épaules affaissées", "regard au sol", "voix monotone", ...]
  anger → ["mâchoire crispée", "poings serrés", "voix tendue", ...]
  joy → ["posture ouverte", "mouvements amples", "voix claire", ...]
  // 14 émotions mappées

mapEmotionToActions(result, max_actions=3) → ActionMapping[]
```

### Tests : CONTRA-01..03, ACTION-01..03
### Commit message
```
feat(sovereign): emotion contradiction + action mapping [ART-SEM-05]
```

---

## Commit 9.5 — Migration tension_14d + emotion_coherence

### Fichiers modifiés :
- `oracle/axes/tension-14d.ts` : `analyzeEmotionFromText()` → `analyzeEmotionSemantic()`
- `oracle/axes/emotion-coherence.ts` : même migration
- `oracle/macro-axes.ts` : adapter appels async
- Config flag : `SEMANTIC_CORTEX_ENABLED` (DEFAULT: true)
- Fallback : si false → garder keywords

### Tests : MIG-01..05 (non-régression obligatoire)
### Commit message
```
feat(sovereign): migrate tension_14d + emotion_coherence to semantic [ART-SEM-01,05]
```

---

## Commit 9.6 — Calibration 5 CAL-CASE

### Action :
1. 5 CAL-CASE ancien scoring (keywords)
2. 5 CAL-CASE nouveau scoring (semantic)
3. Rapport : CALIBRATION_SEMANTIC_CORTEX.md

### Commit message
```
feat(sovereign): semantic cortex calibration on 5 CAL-CASE [ART-SEM-03]
```

---

## Commit 9.7 — Gates + ProofPack Sprint 9

### Ajout GATE-SC (Semantic Cache determinism)
### ProofPack (MANIFEST + HASHES + EVIDENCE)

### Checklist fin de Sprint 9
```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║  SPRINT 9 — SEMANTIC CORTEX v1 — CHECKLIST                                          ║
║                                                                                       ║
║  □ analyzeEmotionSemantic() implémenté et testé                                      ║
║  □ Cache (text_hash, model_id, prompt_hash) fonctionnel                               ║
║  □ Négation résolue (golden test "pas peur")                                          ║
║  □ Emotion contradiction détectée et compilée                                         ║
║  □ Emotion-to-action mapping (14 émotions)                                            ║
║  □ tension_14d + emotion_coherence migrés                                             ║
║  □ Fallback keywords fonctionnel                                                      ║
║  □ 5 CAL-CASE calibrés                                                               ║
║  □ GATE-SC PASS                                                                       ║
║  □ Tous invariants ART-SEM-01..05 PASS                                               ║
║  □ Non-régression : 288 tests PASS                                                    ║
║  □ ProofPack généré                                                                   ║
║  □ Verdict : PASS ou FAIL                                                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 10 — POLISH-V2 : RÉÉCRITURE RÉELLE
#  Périmètre : remplacer les 3 no-op par de vraies corrections
#  Risque : ÉLEVÉ (touche à la prose finale)
#  Critère de sortie : 3 no-op éliminés, chaque correction re-scorée,
#                       max 15 corrections par passe
# ─────────────────────────────────────────────────────────────────────────────

## Commit 10.1 — Sentence Surgeon Interface + Types

### Types :
```typescript
interface MicroPatch {
  sentence_index: number;
  original: string;
  rewritten: string;
  reason: 'cliche' | 'rhythm' | 'redundancy' | 'vague' | 'signature' |
          'transition' | 'telling' | 'ia_smell';
  score_before: number;
  score_after: number;
  accepted: boolean;     // true SEULEMENT si score_after > score_before + threshold
  delta: number;
}

interface SurgeonConfig {
  max_corrections_per_pass: number;  // DEFAULT: 15
  max_passes: number;                // DEFAULT: 1
  min_improvement: number;           // DEFAULT: 2.0
  dry_run: boolean;                  // DEFAULT: false
}
```

## Commit 10.2 — Micro-Rewrite Engine

### Algorithme :
1. Split prose en phrases
2. Scorer les pires phrases
3. Pour les N pires (N ≤ 15) : micro-prompt → LLM → re-score → accept/revert
4. Retourner SurgeonResult avec traçabilité

## Commit 10.3 — Re-Score Guard

### Règle cardinale :
```
UNE CORRECTION QUI AMÉLIORE UN AXE MAIS EN DÉTRUIT UN AUTRE = REJETÉE.
Tous les axes doivent rester ≥ plancher.
Le composite doit augmenter ≥ min_improvement.
```

## Commit 10.4 — Paragraph-Level Patch

### Concept (ex-Quantum Suture, fusionné) :
Geler paragraphes OK → réécrire UNIQUEMENT le paragraphe en échec → re-score

## Commit 10.5 — Emotion-to-Action dans Constraint Compiler

### Modifications :
- Injecter actions corporelles dans le prompt
- Injecter instructions contradiction si détectées
- Budget 800 tokens respecté

## Commit 10.6 — Remplacement des 3 no-op

### polishRhythm() : monotonie → sentence-surgeon reason='rhythm'
### sweepCliches() : cliché détecté → sentence-surgeon reason='cliche'
### enforceSignature() : signature faible → sentence-surgeon reason='signature'

### Checklist fin de Sprint 10
```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║  SPRINT 10 — POLISH-V2 — CHECKLIST                                                  ║
║                                                                                       ║
║  □ sentence-surgeon implémenté et testé                                               ║
║  □ re-score guard : zéro correction qui dégrade                                       ║
║  □ paragraph-patch fonctionnel                                                        ║
║  □ polishRhythm() N'EST PLUS no-op                                                   ║
║  □ sweepCliches() N'EST PLUS no-op                                                    ║
║  □ enforceSignature() N'EST PLUS no-op                                                ║
║  □ Emotion-to-action dans constraint compiler                                         ║
║  □ Tous invariants ART-POL-01..06 PASS                                               ║
║  □ Non-régression : TOUS tests PASS                                                   ║
║  □ ProofPack généré                                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 11 — SILENCE ORACLE + ADVERSARIAL JUDGE
#  Périmètre : show-dont-tell + anti-IA smell + macro-axe AAI
#  Risque : MEDIUM
#  Critère de sortie : 2 nouveaux axes, AAI fonctionnel, correction loop enrichi
# ─────────────────────────────────────────────────────────────────────────────

## Commit 11.1 — Show Don't Tell Detector

### 30+ patterns FR telling :
- VERBE_ÉTAT + ÉMOTION : "il était triste"
- SENTIR + ÉMOTION : "il sentait la peur"
- ÉPROUVER/RESSENTIR + ÉMOTION
- ADV_INTENSITÉ + ADJ_ÉMOTION
- EXPLICATION_PSYCHOLOGIQUE
- False positive guard : "il était médecin" → PAS une violation

## Commit 11.2 — Authenticity Scorer (Anti-IA Smell)

### 15 patterns CALC :
1. SYMMETRY : 3+ phrases même structure S-V-O
2. PERFECT_PARAGRAPHS : tous paragraphes même longueur ±10%
3. NO_FRAGMENTS : 0 fragments de phrase
4. OVER_ADJECTIVATION : ratio adj/noms > 0.6
5. LIST_STRUCTURE : 3+ phrases même début
6. NO_INTERRUPTION : dialogues sans hésitation
7. OVER_METAPHOR : métaphores toutes filées
8. UNIFORM_REGISTER : pas de variation registre
9. NO_REPETITION : 0 répétition intentionnelle
10. PERFECT_CLOSURE : paragraphes tous "fermés"
11. EXCESS_SENSORY : >3 sens par paragraphe systématique
12. FLAT_DIALOGUE_TAGS : "dit-il" uniquement
13. NO_PARENTHETICAL : 0 incise
14. EMOTIONAL_LABELING : nommer au lieu de montrer
15. PERFECT_TRANSITIONS : transitions trop propres

### LLM adversarial : "Ce texte est-il écrit par une IA ? Score 0-100."

## Commit 11.3 — 2 Nouveaux Axes
- show_dont_tell : poids ×3.0, HYBRID
- authenticity : poids ×2.0, HYBRID

## Commit 11.4 — Macro-Axe AAI
```
AAI (Authenticity & Art Index)
  Poids global : 25%
  Plancher : 85
  Composition : show_dont_tell × 0.55 + authenticity × 0.45

Scoring V3.1 :
  ECC : 33%  (floor 88)
  RCI : 17%  (floor 85)
  SII : 15%  (floor 85)
  IFI : 10%  (floor 85)
  AAI : 25%  (floor 85)
```

## Commit 11.5 — Intégration Correction Loop
## Commit 11.6 — Tests + ProofPack

### Checklist fin de Sprint 11
```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║  SPRINT 11 — SILENCE ORACLE + ADVERSARIAL JUDGE — CHECKLIST                         ║
║                                                                                       ║
║  □ show-dont-tell : 30+ patterns FR, golden tests                                     ║
║  □ authenticity : 15 patterns IA + LLM adversarial                                    ║
║  □ 2 nouveaux axes fonctionnels                                                       ║
║  □ Macro-axe AAI (25%, plancher 85)                                                   ║
║  □ Intégration correction loop                                                        ║
║  □ Tous invariants ART-SDT + ART-AUTH PASS                                            ║
║  □ Non-régression PASS                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINT 12 — MÉTAPHORES + SCORING V3.1 FINAL + TAG
#  Périmètre : blacklist métaphores, axe novelty, scoring final, tag
#  Risque : FAIBLE
#  Critère de sortie : scoring V3.1 complet, non-régression, tag
# ─────────────────────────────────────────────────────────────────────────────

## Commit 12.1 — Dead Metaphor Blacklist FR (500+)
## Commit 12.2 — metaphor_novelty Axe (×1.5, LLM-judged)
## Commit 12.3 — Scoring V3.1 Final

```
14 AXES :
  Existants (10) : tension_14d, emotion_coherence, interiority, impact,
                   physics_compliance, rhythm, signature, hook_presence,
                   anti_cliche, necessity, sensory_density
  Nouveaux (4) : show_dont_tell, authenticity, metaphor_novelty, restraint

5 MACRO-AXES :
  ECC (33%, floor 88) | RCI (17%, floor 85) | SII (15%, floor 85)
  IFI (10%, floor 85) | AAI (25%, floor 85)

SEUIL SEAL : 93 | PITCH : 88-92 | REJECT : < 88
```

## Commit 12.4 — Recalibration 5 CAL-CASE
## Commit 12.5 — Non-Régression + ProofPack V2
## Commit 12.6 — Tag v3.0.0-art-foundations

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║  ═══════════════════════════════════════════════════════════════════════════════       ║
║  MILESTONE: FONDATIONS ARTISTIQUES SEALED                                             ║
║  ═══════════════════════════════════════════════════════════════════════════════       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINTS 13-16 — RAFFINEMENTS
#  Débloqués UNIQUEMENT après Milestone Fondations SEALED
#  Détails au niveau commit AVANT exécution
# ─────────────────────────────────────────────────────────────────────────────

## Sprint 13 — Voice Genome (extension style_genome)
| 13.1 | 10 paramètres voix dans style_genome | ART-VOICE-01 |
| 13.2 | Voice constraint compiler | ART-VOICE-02 |
| 13.3 | voice_conformity axe + drift test (5 runs) | ART-VOICE-03 |
| 13.4 | Tests + ProofPack | ART-VOICE-04 |

## Sprint 14 — Reader Phantom Light (3 dimensions)
| 14.1 | PhantomState (attention, cognitive_load, fatigue) | ART-PHANTOM-01 |
| 14.2 | Phantom runner (traverse phrase par phrase) | ART-PHANTOM-02 |
| 14.3 | 2 axes : attention_sustain, fatigue_management | ART-PHANTOM-03 |
| 14.4 | Calibration + Tests + ProofPack | ART-PHANTOM-04 |

## Sprint 15 — Phonetic Engine Light
| 15.1 | Cacophony detector (CALC, sans phonemizer) | ART-PHON-01 |
| 15.2 | Rhythm variation v2 | ART-PHON-02 |
| 15.3 | euphony_basic axe | ART-PHON-03 |
| 15.4 | Tests + ProofPack | ART-PHON-04 |

## Sprint 16 — Temporal Architect
| 16.1 | temporal_contract dans ForgePacket | ART-TEMP-01 |
| 16.2 | Dilatation/compression scoring | ART-TEMP-02 |
| 16.3 | Emotional foreshadowing | ART-TEMP-03 |
| 16.4 | Tests + ProofPack | ART-TEMP-04 |

---

# ─────────────────────────────────────────────────────────────────────────────
#  SPRINTS 17-20 — PREUVE & CALIBRATION
# ─────────────────────────────────────────────────────────────────────────────

## Sprint 17 — Benchmark Pilote
| 17.1 | Corpus 10 OMEGA + 10 humains |
| 17.2 | Protocole blind (même grille, anonymisé, ordre random) |
| 17.3 | Rapport corrélation axes ↔ perception |

## Sprint 18 — Calibration Basée Benchmark
| 18.1 | Ajustement poids basé corrélation |
| 18.2 | Activation progressive physics_compliance |
| 18.3 | Seuils par genre |

## Sprint 19 — Consolidation
| 19.1 | ProofPack V3 | 19.2 | Documentation SSOT V2 | 19.3 | Audit ChatGPT |

## Sprint 20 — Certification ART
| 20.1 | Certification finale | 20.2 | Tag v3.0.0-art | 20.3 | Roadmap ART v2 |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE III — RÈGLES TRANSVERSALES
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

| Règle | Description |
|-------|-------------|
| RULE-DEPS-01 | Zéro nouvelle dépendance NPM |
| RULE-NOOP-ZERO | Aucune fonction polish ne peut retourner prose inchangée |
| RULE-CACHE-FIRST | Tout appel LLM d'analyse DOIT passer par le cache |
| RULE-RESCORE | Toute modification prose DOIT être re-scorée avant acceptation |
| RULE-FALLBACK | Si LLM semantic échoue → fallback keywords (jamais crash) |
| RULE-REGRESSION | 288 tests existants JAMAIS cassés |
| RULE-TOLERANCE | Correction acceptée SEULEMENT si gain ≥ min_improvement_threshold |
| RULE-TRACE | Chaque micro-correction traçable (MicroPatch) |

## Budget token estimé par run

| Module | Tokens | Méthode |
|--------|--------|---------|
| Semantic Cortex (4 quartiles) | ~800 | LLM |
| Polish-V2 (15 corrections max) | ~7500 | LLM |
| Show-dont-tell + Auth + Metaphor | ~1200 | LLM |
| Existants (interiority, impact, etc.) | ~2000 | LLM |
| Draft + Correction loop | ~9000 | LLM |
| **TOTAL** | **~20 500** | +78% vs actuel |

## Sessions estimées

| Phase | Sprints | Sessions |
|-------|---------|----------|
| Fondations | 9-12 | 10-15 |
| Raffinements | 13-16 | 4-8 |
| Preuve | 17-20 | 4-8 |
| **TOTAL** | **12 sprints** | **18-31 sessions** |

---

# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#                    PARTIE IV — CRITÈRES DE SUCCÈS
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║  ROADMAP ART v1 — 10 CRITÈRES DE SUCCÈS                                              ║
║                                                                                       ║
║  1. Keyword matching ÉLIMINÉ → analyse sémantique LLM                                ║
║  2. 3 no-op polish ÉLIMINÉS → corrections réelles mesurables                          ║
║  3. Show-dont-tell détecté à 80%+ de précision                                        ║
║  4. IA smell détecté à 10/15 patterns minimum                                         ║
║  5. 500+ métaphores mortes blacklistées                                               ║
║  6. Scoring V3.1 : 5 macro-axes, 14+ axes, seuil 93                                  ║
║  7. Benchmark humain : corrélation ≥ 70%                                              ║
║  8. Non-régression : 0 test cassé sur 288 existants                                   ║
║  9. 22 invariants ART-* PASS                                                          ║
║  10. Tag v3.0.0-art certifié avec ProofPack V3                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT — OMEGA_ROADMAP_ART_v1.md**

*20 sprints, 50+ commits, 22 invariants, 7 gates, 14+ axes*
*Standard: NASA-Grade L4 / DO-178C / MIL-STD*
*Autorité: Francky (Architecte Suprême)*
*Date: 2026-02-16*
