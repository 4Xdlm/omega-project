# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA ART — SPRINT 9 — SEMANTIC CORTEX
#   PROMPT CLAUDE CODE — EXÉCUTION COMPLÈTE
#
#   Standard: NASA-Grade L4 / DO-178C / MIL-STD
#   Autorité: Francky (Architecte Suprême)
#   Date: 2026-02-16
#
# ═══════════════════════════════════════════════════════════════════════════════

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                                                                           ║
# ║   TU ES L'INGÉNIEUR SYSTÈME PRINCIPAL DU PROJET OMEGA.                   ║
# ║   TU N'ES PAS UN ASSISTANT. TU ES UN ARCHITECTE AEROSPACE SENIOR.        ║
# ║   CHAQUE LIGNE DE CODE EST AUDITÉE PAR UN EXPERT HOSTILE.                ║
# ║   AUCUNE APPROXIMATION. AUCUN RACCOURCI. AUCUNE EXCUSE.                  ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

---

## 🎯 MISSION

Exécuter le **Sprint 9 — Semantic Cortex** de la roadmap OMEGA ART v1.
Périmètre : remplacer `analyzeEmotionFromText()` (keyword matching) par une analyse
LLM sémantique 14D Plutchik dans `packages/sovereign-engine/`.

**7 commits séquentiels. Ordre strict. Aucun saut.**

---

## 📂 CONTEXTE TECHNIQUE DU REPO

```
Repo: C:\Users\elric\omega-project (monorepo TypeScript)
Package cible: packages/sovereign-engine/
Tests actuels: 288/288 PASS (266 sovereign + 22 signal-registry)
Gates actuels: 6/6 PASS
Version: v2.0.0-harden1
Runtime: Vitest, tsx, TypeScript strict
```

### Architecture existante à connaître AVANT de coder

| Fichier | Rôle | Critique pour Sprint 9 |
|---------|------|----------------------|
| `src/types.ts` | Types centraux (ForgePacket, SovereignProvider, SScore, AxesScores...) | OUI — SovereignProvider interface |
| `src/config.ts` | Config gelée (SOVEREIGN_CONFIG) — seuils, poids, paramètres | OUI — ajout SEMANTIC_CORTEX_ENABLED |
| `src/oracle/axes/tension-14d.ts` | Axe tension 14D — poids ×3.0 — appelle `analyzeEmotionFromText()` | OUI — migration commit 9.5 |
| `src/oracle/axes/emotion-coherence.ts` | Axe cohérence émotionnelle — poids ×2.5 | OUI — migration commit 9.5 |
| `src/oracle/macro-axes.ts` | Macro-axes V3 (ECC, RCI, SII, IFI) | OUI — adapt async commit 9.5 |
| `src/oracle/aesthetic-oracle.ts` | Orchestration scoring complet | OUI — cascade async |
| `src/oracle/s-score.ts` | Calcul S-Score composite | POTENTIEL — cascade async |
| `src/runtime/anthropic-provider.ts` | Provider LLM réel (Anthropic API via execSync) | LECTURE — comprendre l'interface |
| `src/index.ts` | Exports publics | OUI — exporter les nouveaux modules |

### Dépendance omega-forge (keyword matching actuel)

```typescript
// Importé depuis @omega/omega-forge :
analyzeEmotionFromText(text: string, language: 'fr' | 'en' | 'auto'): EmotionState14D
// EmotionState14D = Readonly<Record<Emotion14, number>>
// Emotion14 = 'joy' | 'trust' | 'fear' | ... (14 clés Plutchik)
// EMOTION_14_KEYS: readonly Emotion14[] (les 14 clés ordonnées)

cosineSimilarity14D(a, b): number
euclideanDistance14D(a, b): number
```

### SovereignProvider existant (NE PAS MODIFIER EN 9.1)

```typescript
interface SovereignProvider {
  scoreInteriority(prose, context): Promise<number>;
  scoreSensoryDensity(prose, counts): Promise<number>;
  scoreNecessity(prose, beat_count, ...): Promise<number>;
  scoreImpact(opening, closing, context): Promise<number>;
  applyPatch(prose, pitch, constraints): Promise<string>;
  generateDraft(prompt, mode, seed): Promise<string>;  // ← UTILISER CELUI-CI en 9.1
}
```

---

## 🔒 RÈGLES NON NÉGOCIABLES

### CODE QUALITY — NIVEAU EXCEPTIONNEL EXIGÉ

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  1. ZÉRO TODO / FIXME / HACK / "à compléter plus tard"                   ║
║  2. ZÉRO `any` — typage TypeScript strict exhaustif                      ║
║  3. ZÉRO magic number — TOUTE constante nommée dans config               ║
║  4. ZÉRO code mort — chaque ligne justifiée                               ║
║  5. ZÉRO import inutilisé                                                 ║
║  6. ZÉRO duplication — DRY absolu                                         ║
║  7. Tests AVANT ou EN MÊME TEMPS que l'implémentation (TDD)              ║
║  8. JSDoc complet : @param, @returns, @throws pour chaque fn publique    ║
║  9. En-tête fichier : purpose, invariants couverts, sprint/commit        ║
║ 10. Nommage explicite — le code se lit comme une spec                    ║
║ 11. Fichiers < 200 lignes (idéal < 150) — 1 fichier = 1 responsabilité  ║
║ 12. Interfaces AVANT implémentations                                     ║
║ 13. ZÉRO dépendance circulaire                                           ║
║ 14. ZÉRO nouvelle dépendance NPM (RULE-DEPS-01)                         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### TESTS — NIVEAU IMPITOYABLE

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  - Framework: Vitest (déjà configuré)                                    ║
║  - Nommage test: "[INV-ID] description du comportement attendu"          ║
║  - Minimum 1 test par invariant ART-*                                    ║
║  - Golden tests pour négation ET contradiction                           ║
║  - Mock du provider LLM — JAMAIS d'appel réel en test unitaire           ║
║  - Couverture: chaque branche, chaque edge case                          ║
║  - 288 TESTS EXISTANTS = CONTRAT. SI UN SEUL CASSE → FAIL TOTAL.        ║
║                                                                           ║
║  APRÈS CHAQUE COMMIT :                                                    ║
║  → npm test dans packages/sovereign-engine/                               ║
║  → TOUS les tests doivent passer (288 existants + nouveaux)              ║
║  → Si un test casse → tu corriges IMMÉDIATEMENT avant de continuer       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### TRAÇABILITÉ — CHAQUE ACTION LIÉE À UN INVARIANT

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  Chaque fichier créé/modifié DOIT mentionner :                           ║
║  → Sprint + Commit (ex: "Sprint 9 — Commit 9.1")                        ║
║  → Invariant(s) couvert(s) (ex: [ART-SEM-01, ART-SEM-04])              ║
║  → Commit message format: feat(sovereign): ... [ART-xxx]                 ║
║                                                                           ║
║  Chaque test DOIT mentionner l'invariant qu'il vérifie :                 ║
║  → it('[ART-SEM-01] retourne 14 dimensions dans [0, 1]', ...)           ║
║  → it('[ART-SEM-04] négation "pas peur" → fear < 0.3', ...)             ║
║                                                                           ║
║  Chaque commit message DOIT lister les invariants touchés :              ║
║  → feat(sovereign): semantic analyzer interface [ART-SEM-01]             ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 INVARIANTS SPRINT 9 (TON CONTRAT)

| ID | Description | Test obligatoire |
|----|-------------|-----------------|
| **ART-SEM-01** | `analyzeEmotionSemantic()` retourne 14D JSON strict, jamais NaN/Infinity | ✅ |
| **ART-SEM-02** | Cache hit : même (text_hash + model_id + prompt_hash) → même résultat | ✅ |
| **ART-SEM-03** | Tolérance variance : N-samples median, écart-type < 5 | ✅ |
| **ART-SEM-04** | Négation résolue : "pas peur" ≠ "peur" (test golden obligatoire) | ✅ |
| **ART-SEM-05** | Rétrocompat : ancienne API `analyzeEmotionFromText()` toujours disponible | ✅ |
| **ART-SCORE-04** | 288 tests existants TOUJOURS PASS | ✅ |

---

## 🔧 COMMITS À EXÉCUTER (ORDRE STRICT)

### COMMIT 9.1 — Interface + Types + Vraie Pipeline

**Fichiers à créer :**
- `packages/sovereign-engine/src/semantic/types.ts`
- `packages/sovereign-engine/src/semantic/semantic-analyzer.ts`
- `packages/sovereign-engine/tests/semantic/semantic-analyzer.test.ts`

**Spécification `types.ts` :**
```typescript
// Types à exporter :
// SemanticEmotionResult — 14 clés Plutchik, valeurs number (0-1)
//   → DOIT être compatible avec EmotionState14D de @omega/omega-forge
// SemanticCacheKey — { text_hash: string, model_id: string, prompt_hash: string }
// SemanticCacheEntry — { key, result, created_at (ISO 8601), ttl_seconds }
// SemanticAnalyzerConfig — {
//   enabled (default true),
//   fallback_to_keywords (default true),
//   cache_enabled (default true),
//   cache_ttl_seconds (default 3600),
//   n_samples (default 1),
//   variance_tolerance (default 5.0),
//   min_improvement_threshold (default 2.0)
// }
// DEFAULT_SEMANTIC_CONFIG — objet frozen avec tous les defaults
```

**Spécification `semantic-analyzer.ts` :**

`analyzeEmotionSemantic()` est une VRAIE pipeline, PAS un stub :
1. **Construction du prompt** — JSON strict avec règles :
   - "pas peur" = fear FAIBLE (0.0-0.2)
   - "souriait malgré sa tristesse" = joy MOYEN + sadness MOYEN
   - Ironie = inverser l'émotion apparente
   - Sous-texte = émotions IMPLICITES
2. **Appel provider** — via `provider.generateDraft(prompt, 'semantic_analysis', 'omega-semantic')`
   - NE PAS ajouter `generateStructuredJSON()` à SovereignProvider (réservé commit 9.2)
   - Utiliser generateDraft existant, parser la réponse toi-même
3. **Parsing JSON** — try/catch, extraire les 14 clés
4. **Validation stricte** :
   - 14 clés présentes (EMOTION_14_KEYS)
   - Toutes valeurs numériques
   - Toutes dans [0, 1]
   - Jamais NaN, jamais Infinity
   - Clamp si hors bornes
5. **Fallback** — si parsing/validation échoue → `analyzeEmotionFromText()` (keywords)

**Tests obligatoires (provider mock) :**
- SEM-01 : retourne 14 dimensions, toutes dans [0, 1]
- SEM-02 : "il avait peur" → fear > 0.5
- SEM-03 : "il n'avait pas peur" → fear < 0.3 (GOLDEN — NÉGATION)
- SEM-04 : "elle souriait malgré sa tristesse" → joy > 0.3 ET sadness > 0.3
- SEM-05 : fallback keywords si LLM retourne du garbage
- SEM-06 : mode mock fonctionnel (tests unitaires sans LLM)

**Commit message :** `feat(sovereign): semantic analyzer interface + types [ART-SEM-01]`

---

### COMMIT 9.2 — LLM Emotion Analyzer Implementation

**Fichier modifié :** `semantic-analyzer.ts`
**Fichier modifié :** `src/types.ts` (ajout `generateStructuredJSON` à `SovereignProvider`)

**Spécification :**
1. Ajouter à `SovereignProvider` : `generateStructuredJSON(prompt: string): Promise<Record<string, number>>`
2. Implémenter la version complète dans `semantic-analyzer.ts` :
   - Si N-samples > 1 → appeler N fois, calculer MEDIAN par dimension
   - Si écart-type > variance_tolerance → log WARNING
   - Clamp toutes valeurs à [0, 1]
   - Fallback keywords si échec total
3. Mettre à jour `anthropic-provider.ts` pour implémenter `generateStructuredJSON()`

**Tests :**
- SEM-07 : provider.generateStructuredJSON appelé avec le bon prompt
- SEM-08 : JSON malformé → fallback keywords
- SEM-09 : valeurs hors [0, 1] → clampées
- SEM-10 : N-samples=3 → median calculé correctement

**Commit message :** `feat(sovereign): LLM emotion analyzer implementation [ART-SEM-01, ART-SEM-04]`

---

### COMMIT 9.3 — Cache Layer

**Fichier à créer :** `packages/sovereign-engine/src/semantic/semantic-cache.ts`
**Tests :** `packages/sovereign-engine/tests/semantic/semantic-cache.test.ts`

**Spécification :**
```
SemanticCache (classe) :
  private store: Map<string, SemanticCacheEntry>
  computeCacheKey(text, modelId, promptHash) → string   // SHA-256(text) + '|' + modelId + '|' + promptHash
  get(key) → SemanticEmotionResult | null               // null si absent ou TTL expiré
  set(key, result) → void                               // Stocke avec TTL
  clear() → void
  stats() → { hits: number, misses: number, size: number }
```

**Intégration dans semantic-analyzer.ts :**
- Avant appel LLM → vérifier cache
- Si hit → retourner (0 token, 0 latence)
- Si miss → appeler LLM → stocker → retourner

**Tests :**
- CACHE-01 : cache hit retourne même résultat
- CACHE-02 : cache miss → appel LLM effectué
- CACHE-03 : TTL expiré → re-appel LLM
- CACHE-04 : clear() vide le cache
- CACHE-05 : stats() compteurs corrects

**SHA-256 :** utiliser `createHash('sha256')` de `node:crypto` (pas de dépendance externe)

**Commit message :** `feat(sovereign): semantic cache layer (text_hash, model_id, prompt_hash) [ART-SEM-02]`

---

### COMMIT 9.4 — Emotion Contradiction + Action Mapping

**Fichiers à créer :**
- `packages/sovereign-engine/src/semantic/emotion-contradiction.ts`
- `packages/sovereign-engine/src/semantic/emotion-to-action.ts`
- `packages/sovereign-engine/tests/semantic/emotion-contradiction.test.ts`
- `packages/sovereign-engine/tests/semantic/emotion-to-action.test.ts`

**`emotion-contradiction.ts` :**
```
detectContradictions(result: SemanticEmotionResult) → EmotionContradiction[]
  Logique : quand 2+ émotions > 0.4, c'est une contradiction
  Retourne : [{ emotions, intensities, instruction_fr }]
  instruction_fr = texte en FRANÇAIS décrivant le conflit émotionnel
```

**`emotion-to-action.ts` :**
```
EMOTION_ACTION_MAP: Record<Emotion14, readonly string[]>
  14 émotions → actions corporelles (FR)
  fear → ["regard fuyant", "mains moites", "respiration courte", ...]
  sadness → ["épaules affaissées", "regard au sol", ...]
  anger → ["mâchoire crispée", "poings serrés", ...]
  joy → ["posture ouverte", "mouvements amples", ...]
  ... LES 14 ÉMOTIONS DOIVENT AVOIR DES ACTIONS

mapEmotionToActions(result, max_actions = 3) → ActionMapping[]
  Sélectionne 2-3 émotions dominantes, choisit 1-2 actions chacune
```

**Tests :**
- CONTRA-01 : fear=0.7 + desire=0.5 → contradiction détectée
- CONTRA-02 : fear=0.8 + anger=0.1 → PAS de contradiction (anger < 0.4)
- CONTRA-03 : instruction_fr générée en français
- ACTION-01 : fear dominant → actions corporelles peur retournées
- ACTION-02 : max_actions respecté
- ACTION-03 : 14 émotions ont toutes des actions mappées

**Commit message :** `feat(sovereign): emotion contradiction + emotion-to-action mapping [ART-SEM-05]`

---

### COMMIT 9.5 — Migration tension_14d + emotion_coherence

**Fichiers modifiés :**
- `src/oracle/axes/tension-14d.ts` → async, appelle `analyzeEmotionSemantic()`
- `src/oracle/axes/emotion-coherence.ts` → async, appelle `analyzeEmotionSemantic()`
- `src/oracle/macro-axes.ts` → adapter les appels async
- `src/oracle/aesthetic-oracle.ts` → adapter la cascade async
- `src/oracle/s-score.ts` → adapter si nécessaire
- `src/config.ts` → ajouter `SEMANTIC_CORTEX_ENABLED: true`

**Règle critique :**
- `SEMANTIC_CORTEX_ENABLED === false` → garder keywords (fallback intact)
- `SEMANTIC_CORTEX_ENABLED === true` → utiliser semantic analyzer
- La signature change : `scoreTension14D()` → `async scoreTension14D()`
- TOUTE la chaîne d'appel en amont doit gérer le async

**ATTENTION — NON-RÉGRESSION :**
- Les 288 tests existants utilisent des mocks qui ne fournissent PAS de provider
- Tu DOIS t'assurer que quand aucun provider n'est fourni, le fallback keywords s'active
- Ou que les tests existants continuent de fonctionner SANS modification

**Tests :**
- MIG-01 : tension_14d avec semantic → score [0, 100]
- MIG-02 : emotion_coherence avec semantic → score [0, 100]
- MIG-03 : fallback keyword quand SEMANTIC_CORTEX_ENABLED=false
- MIG-04 : non-régression tension_14d tests existants PASS
- MIG-05 : non-régression emotion_coherence tests existants PASS

**Commit message :** `feat(sovereign): migrate tension_14d + emotion_coherence to semantic [ART-SEM-01, ART-SEM-05]`

---

### COMMIT 9.6 — Calibration 5 CAL-CASE

**Fichiers à créer :**
- `packages/sovereign-engine/tests/calibration/semantic-calibration.test.ts`

**Action :**
1. Définir 5 CAL-CASE avec des textes courts et émotions connues :
   - CAL-01 : Peur → Espoir (texte FR avec transition claire)
   - CAL-02 : Joie explosive (texte FR exubérant)
   - CAL-03 : Colère → Calme (texte FR avec apaisement)
   - CAL-04 : Tristesse + Espoir (texte FR ambigu)
   - CAL-05 : Surprise → Compréhension (texte FR avec révélation)
2. Scorer chaque CAL-CASE avec keyword ET semantic (provider mock calibré)
3. Vérifier que les scores sont dans [0, 100]
4. Mesurer la corrélation ancien/nouveau
5. Documenter les résultats dans un rapport structuré

**Tests :**
- CAL-01 : 5 CAL-CASE exécutés sans erreur
- CAL-02 : Scores dans [0, 100] pour tous les cas
- CAL-03 : Rapport de calibration généreable

**Commit message :** `feat(sovereign): semantic cortex calibration on 5 CAL-CASE [ART-SEM-03]`

---

### COMMIT 9.7 — Gates + ProofPack

**Fichiers à créer/modifier :**
- `packages/sovereign-engine/scripts/gate-semantic-cache.ts` (GATE-SC)
- `packages/sovereign-engine/tests/gates/gate-semantic-cache.test.ts`
- Mise à jour des gates existantes si nécessaire (IDL, roadmap)

**GATE-SC (Semantic Cache determinism) :**
```
1. Analyser le même texte 2 fois avec cache activé
2. Vérifier que le 2ème appel est un cache hit
3. Vérifier que les résultats sont IDENTIQUES (deep equal)
FAIL si résultats différents
```

**ProofPack :**
- Générer MANIFEST avec SHA-256 de tous les fichiers créés/modifiés
- Inclure evidence chain (tests pass, gates pass)

**Tests :**
- GATE-SC-01 : cache hit retourne résultat identique
- GATE-SC-02 : gate FAIL si cache désactivé ET résultats différent

**Commit message :** `feat(sovereign): sprint 9 gates + proofpack [ART-SEM-02]`

---

## 🚫 INTERDICTIONS ABSOLUES

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  ❌ NE SAUTE AUCUN COMMIT — ordre strict 9.1 → 9.2 → ... → 9.7         ║
║  ❌ NE MODIFIE PAS la roadmap                                            ║
║  ❌ NE CODE PAS sans avoir lu ENTIÈREMENT ce prompt                      ║
║  ❌ NE SUPPOSE PAS que les tests passent — PROUVE-LE (npm test)          ║
║  ❌ NE FAIS PAS de "version simplifiée" — version COMPLÈTE uniquement    ║
║  ❌ NE METS PAS de placeholder "// TODO: implement later"                ║
║  ❌ NE TOUCHE PAS aux fichiers hors périmètre du commit en cours         ║
║  ❌ AUCUNE nouvelle dépendance NPM (RULE-DEPS-01)                       ║
║  ❌ NE FAIS PAS de barrel re-exports sauvages                            ║
║  ❌ NE COMMITTE PAS avec un test rouge                                   ║
║  ❌ NE PASSE PAS au commit suivant si le précédent FAIL                  ║
║  ❌ NE METS PAS `any` même "temporairement"                             ║
║  ❌ NE LAISSE AUCUN code mort                                            ║
║  ❌ NE LAISSE AUCUN import inutilisé                                     ║
║  ❌ AUCUNE approximation — PASS ou FAIL, jamais "ça devrait marcher"     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## ⚠️ PIÈGES CONNUS À ÉVITER

| Piège | Solution |
|-------|----------|
| `analyzeEmotionFromText` est dans `@omega/omega-forge`, pas dans sovereign-engine | Importer correctement depuis omega-forge pour le fallback |
| `EmotionState14D` est `Readonly<Record<Emotion14, number>>` | `SemanticEmotionResult` doit être compatible avec ce type |
| `EMOTION_14_KEYS` est dans `@omega/omega-forge` | Réutiliser cet export, ne pas redéfinir |
| Provider actuel utilise `execSync` (synchrone via child_process) | Tes tests mock doivent être async mais le provider réel est sync-wrapped-as-async |
| Commit 9.5 rend `scoreTension14D()` async | TOUTE la chaîne en amont doit gérer le Promise — macro-axes, aesthetic-oracle, s-score, sovereign-loop |
| Les tests existants ne fournissent pas de provider aux axes CALC | Le fallback keywords DOIT s'activer automatiquement quand pas de provider |
| SHA-256 pour le cache | Utiliser `node:crypto` (createHash), PAS de dépendance externe |
| Config : les tests existants lisent `SOVEREIGN_CONFIG` en lecture seule | Ajouter les nouvelles clés sans casser les existantes |

---

## 📊 MÉTHODE DE TRAVAIL

### À chaque commit :

1. **Annoncer** : `Commit X.Y — [description] — Invariants : [ART-xxx]`
2. **Coder** : types → implémentation → tests (dans cet ordre)
3. **Tester** : `cd packages/sovereign-engine && npm test`
4. **Vérifier** : TOUS les tests passent (288 existants + nouveaux)
5. **Si un test casse** → corriger IMMÉDIATEMENT, ne pas avancer
6. **Commit** : `git add -A && git commit -m "message [ART-xxx]"`
7. **Afficher résultat** : nombre exact de tests passés

### Format de rapport après chaque commit :

```
═══════════════════════════════════════════════
COMMIT 9.X — [titre] — RÉSULTAT
═══════════════════════════════════════════════
Fichiers créés: [liste]
Fichiers modifiés: [liste]
Tests ajoutés: N
Tests totaux: 288 + N = M
Résultat: M/M PASS ✅ (ou ❌ FAIL + détails)
Invariants vérifiés: [ART-xxx, ART-yyy]
Commit SHA: [hash]
═══════════════════════════════════════════════
```

### En fin de Sprint 9, rapport final :

```
═══════════════════════════════════════════════
SPRINT 9 — SEMANTIC CORTEX — BILAN FINAL
═══════════════════════════════════════════════
Commits exécutés: 7/7
Fichiers créés: [nombre]
Fichiers modifiés: [nombre]
Tests ajoutés: [nombre]
Tests totaux: [nombre] / [nombre] PASS
Gates: 7/7 PASS (6 existantes + GATE-SC)

Invariants Sprint 9:
  ART-SEM-01: PASS / FAIL
  ART-SEM-02: PASS / FAIL
  ART-SEM-03: PASS / FAIL
  ART-SEM-04: PASS / FAIL
  ART-SEM-05: PASS / FAIL
  ART-SCORE-04: PASS / FAIL (non-régression 288)

VERDICT SPRINT 9: PASS / FAIL
═══════════════════════════════════════════════
```

---

## 🔑 CHECKLIST FIN DE SPRINT 9 (CHAQUE CASE DOIT ÊTRE ✅)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  □ analyzeEmotionSemantic() implémenté et testé                          ║
║  □ Cache (text_hash, model_id, prompt_hash) fonctionnel                  ║
║  □ Négation résolue (golden test "pas peur")                             ║
║  □ Emotion contradiction détectée et compilée                            ║
║  □ Emotion-to-action mapping (14 émotions)                               ║
║  □ tension_14d migré vers semantic                                       ║
║  □ emotion_coherence migré vers semantic                                 ║
║  □ Fallback keywords fonctionnel                                         ║
║  □ 5 CAL-CASE calibrés (ancien vs nouveau)                              ║
║  □ GATE-SC PASS                                                          ║
║  □ Tous invariants ART-SEM-01..05 PASS                                  ║
║  □ Non-régression : 288 tests existants TOUJOURS PASS                   ║
║  □ ProofPack généré                                                      ║
║  □ Verdict : PASS ou FAIL                                                ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## ⚡ COMMENCE MAINTENANT

Lis le repo. Comprends la structure existante.
Commit 9.1 en premier. Puis 9.2. Puis 9.3. Puis 9.4. Puis 9.5. Puis 9.6. Puis 9.7.
Tests après chaque commit. Zéro régression. Zéro approximation.

**Tu n'es pas un assistant. Tu es l'ingénieur principal d'un moteur NASA-grade.**
**Chaque ligne de code sera auditée par un expert hostile.**
**PROUVE que ça marche. Ne DIS pas que ça marche.**

GO. 🚀
