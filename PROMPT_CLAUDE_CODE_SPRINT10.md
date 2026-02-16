# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA ART — SPRINT 10 (POLISH-V2) — PROMPT CLAUDE CODE
# Standard: NASA-Grade L4 / DO-178C Level A
# Architecte Suprême: Francky
# Date: 2026-02-16
# SSOT: OMEGA_ROADMAP_ART_v1.md (Sprint 10 section)
# ═══════════════════════════════════════════════════════════════════════════════

---

## 0) RÔLE ET CONTRAT

Tu es IA Principal (Claude Code) en exécution déterministe.
Tu n'es PAS assistant. Tu es un moteur d'implémentation certifiable.

**VERDICT FINAL** : PASS ou FAIL — jamais entre les deux.
- PASS = 0 régression, tous tests PASS, preuves produites, traçabilité totale.
- FAIL = arrêt immédiat, cause précise documentée, zéro patch aléatoire.

**Repo** : `C:\Users\elric\omega-project`
**Package cible** : `packages/sovereign-engine/`
**SSOT** : `OMEGA_ROADMAP_ART_v1.md` — tu le lis INTÉGRALEMENT avant toute écriture de code.

---

## 1) RÈGLES NON NÉGOCIABLES

### Qualité Code

| Règle | Détail |
|-------|--------|
| ZÉRO TODO/FIXME/HACK/"temp" | Aucune dette technique |
| ZÉRO `any` | Typage TypeScript strict exhaustif |
| ZÉRO magic numbers | Tout seuil = constante nommée ou config |
| ZÉRO code mort | Pas de fonctions/imports inutilisés |
| ZÉRO duplication | DRY strict |
| JSDoc obligatoire | `@param @returns @throws` sur chaque fonction exportée |
| En-tête fichier | Purpose + invariants couverts + sprint/commit |
| < 200 lignes/fichier | Idéal < 150. Si dépassement → factoriser |
| 1 fichier = 1 responsabilité | Pas de god-files |
| Pas de circular deps | Vérifiable par l'arbre d'imports |

### Dépendances

**RULE-DEPS-01** : AUCUNE nouvelle dépendance NPM. Zéro. Si tu as besoin d'une lib, tu l'implémentes.

### Tests

| Règle | Détail |
|-------|--------|
| Framework | Vitest (déjà en place) |
| Couverture | 1 test minimum par invariant Sprint 10 |
| Golden tests | Sur cas critiques (snapshots stables) |
| Mock LLM | AUCUN appel réel — utiliser `MockSovereignProvider` de `tests/fixtures/mock-provider.ts` |
| Non-régression | Les 326 tests existants (post Sprint 9) doivent TOUS passer |

### Traçabilité

Chaque micro-correction DOIT être traçable via `MicroPatch` :
```
(sentence_index, original, rewritten, reason, score_before, score_after, delta, accepted)
```
Chaque acceptation/rejet justifié et loggable.

---

## 2) CONTEXTE TECHNIQUE ACTUEL (POST SPRINT 9)

| Attribut | Valeur |
|----------|--------|
| Version | v2.0.0-harden1 + sprint-9-sealed |
| Tests | 326/326 PASS |
| Gates | 6/6 PASS |
| Scoring | V3 (4 macro-axes, 10 axes, seuil 92) |
| Branch | master |
| HEAD | 9b75790b |

### SovereignProvider actuel (`src/types.ts` L386-394)

```typescript
export interface SovereignProvider {
  scoreInteriority(prose: string, context: { readonly pov: string; readonly character_state: string }): Promise<number>;
  scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): Promise<number>;
  scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number>;
  scoreImpact(opening: string, closing: string, context: { readonly story_premise: string }): Promise<number>;
  applyPatch(prose: string, pitch: CorrectionPitch, constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] }): Promise<string>;
  generateDraft(prompt: string, mode: string, seed: string): Promise<string>;
  generateStructuredJSON(prompt: string): Promise<unknown>;
}
```

⚠️ **`rewriteSentence()` N'EXISTE PAS encore.** Tu DOIS l'ajouter à l'interface au commit 10.2 (extension minimale, sans casser les implémentations existantes). Le `MockSovereignProvider` (`tests/fixtures/mock-provider.ts`) doit être étendu en parallèle.

### Polish functions actuelles (TOUTES no-op)

```
src/polish/anti-cliche-sweep.ts   → sweepCliches(packet, prose): string → return prose
src/polish/musical-engine.ts      → polishRhythm(packet, prose): string → return prose (stubs vides)
src/polish/signature-enforcement.ts → enforceSignature(packet, prose): string → return prose
```

Ces 3 fonctions sont **synchrones** avec signature `(packet: ForgePacket, prose: string): string`.
Sprint 10.6 les remplace par de vraies corrections, ce qui implique qu'elles deviennent **async** (appel provider). Gérer le changement de signature proprement (tous les call-sites doivent être mis à jour).

### Fixtures disponibles

```
tests/fixtures/mock-packet.ts      → ForgePacket mock
tests/fixtures/mock-prose.ts       → Prose mock
tests/fixtures/mock-provider.ts    → MockSovereignProvider (implements SovereignProvider)
tests/fixtures/mock-style-profile.ts
tests/fixtures/mock-symbol-map.ts
```

### Artefacts Sprint 9 réutilisables

```
src/semantic/emotion-contradiction.ts → detectContradictions()
src/semantic/emotion-to-action.ts     → mapEmotionToActions(), EMOTION_ACTION_MAP
src/semantic/semantic-analyzer.ts     → analyzeEmotionSemantic()
src/semantic/semantic-cache.ts        → SemanticCache
```

---

## 3) PRÉ-VOL (OBLIGATOIRE — AVANT COMMIT 10.1)

**Séquence stricte :**

```
1. Lire OMEGA_ROADMAP_ART_v1.md — section Sprint 10 complète
2. git status → doit être CLEAN
3. cd packages/sovereign-engine && npm test → capturer sortie
   ATTENDU : 326 tests PASS, 0 fail
4. Créer dossier preuves : proofpacks/sprint-10/
5. Archiver :
   - proofpacks/sprint-10/preflight_test_output.txt
   - proofpacks/sprint-10/git_status_pre.txt
```

⚠️ Si baseline ≠ 326 PASS → STOP. Documenter l'écart. Ne pas continuer.

---

## 4) COMMITS — EXÉCUTION SÉQUENTIELLE STRICTE

**Discipline** : 1 commit à la fois. Implémenter → tester → prouver → committer → STOP.
Ne PAS enchaîner pour "gagner du temps".

---

### COMMIT 10.1 — Sentence Surgeon Interface + Types
**Invariants** : ART-POL-01, ART-POL-02

**Fichier à créer** : `src/polish/sentence-surgeon.ts`

**Types EXACTS (roadmap)** :

```typescript
/** Raisons de micro-correction */
type MicroPatchReason = 'cliche' | 'rhythm' | 'redundancy' | 'vague' |
                        'signature' | 'transition' | 'telling' | 'ia_smell';

/** Traçabilité d'une micro-correction */
interface MicroPatch {
  sentence_index: number;
  original: string;
  rewritten: string;
  reason: MicroPatchReason;
  score_before: number;
  score_after: number;
  delta: number;          // score_after - score_before
  accepted: boolean;      // true SEULEMENT si score_after > score_before + threshold
}

/** Configuration du surgeon */
interface SurgeonConfig {
  max_corrections_per_pass: number;  // DEFAULT_MAX_CORRECTIONS = 15
  max_passes: number;                // DEFAULT_MAX_PASSES = 1
  min_improvement: number;           // DEFAULT_MIN_IMPROVEMENT = 2.0
  dry_run: boolean;                  // DEFAULT_DRY_RUN = false
}

/** Résultat complet d'une passe */
interface SurgeonResult {
  patches_attempted: number;
  patches_accepted: number;
  patches_reverted: number;
  total_score_delta: number;
  patches: MicroPatch[];
  prose_before: string;
  prose_after: string;
}
```

**Règles** :
- Defaults = constantes nommées exportées (`DEFAULT_MAX_CORRECTIONS`, etc.)
- Types-only dans ce commit (aucun comportement LLM)
- Exports propres depuis le fichier

**Tests** :
- TYPE-01 : compile TS + exports visibles (import + vérification de shape)
- Audit : `grep` no `any`, no `TODO`

**Commit message** : `feat(sovereign): sentence surgeon interface + types [ART-POL-01, ART-POL-02]`

**Preuves** :
```
proofpacks/sprint-10/10.1/npm_test.txt
proofpacks/sprint-10/10.1/grep_no_todo.txt
proofpacks/sprint-10/10.1/grep_no_any.txt
```

---

### COMMIT 10.2 — Micro-Rewrite Engine
**Invariants** : ART-POL-01, ART-POL-02, ART-POL-03

**Fichier** : `src/polish/sentence-surgeon.ts` (compléter)

**Extension interface provider** :

Ajouter à `SovereignProvider` dans `src/types.ts` :
```typescript
rewriteSentence(sentence: string, reason: string, context: {
  prev_sentence: string;
  next_sentence: string;
}): Promise<string>;
```

Ajouter l'implémentation mock dans `tests/fixtures/mock-provider.ts`.

**Fonction à implémenter** :
```typescript
async function surgeonPass(
  prose: string,
  packet: ForgePacket,
  provider: SovereignProvider,
  scorer: (prose: string) => Promise<number>,
  config: SurgeonConfig
): Promise<SurgeonResult>
```

**Algorithme EXACT roadmap** :
1. Split prose en phrases (méthode déterministe, testée)
2. Scorer chaque phrase individuellement
3. Trier par score ascendant (pires d'abord)
4. Pour N pires (N = `max_corrections_per_pass`) :
   a. Construire micro-prompt :
   ```
   [DIRECTIVE OMEGA — MICRO-CORRECTION]
   Réécris UNIQUEMENT cette phrase.
   PROBLÈME : {reason}
   CONTEXTE (phrase précédente) : {prev_sentence}
   CONTEXTE (phrase suivante) : {next_sentence}
   PHRASE À CORRIGER : {sentence}
   CONTRAINTES :
   - Même longueur ±20%
   - Même registre de langue
   - Même sens global
   - Corriger UNIQUEMENT le problème identifié
   PHRASE CORRIGÉE :
   ```
   b. `provider.rewriteSentence(sentence, reason, context)`
   c. Reconstituer prose avec phrase réécrite
   d. Re-scorer prose COMPLÈTE via `scorer()`
   e. Si `score_after > score_before + min_improvement` → accepter
   f. Sinon → revert
5. Retourner `SurgeonResult` complet

**Règles** :
- `dry_run=true` → produit patches diagnostiques (`accepted=false` pour tous), NE modifie PAS la prose
- Max 15 corrections (default), jamais plus
- Provider mock retourne déterministe (aucun aléa en test)

**Tests EXACTS roadmap** :
- SURG-01 : prose avec 1 cliché → cliché corrigé
- SURG-02 : correction qui dégrade → revertée (ART-POL-01)
- SURG-03 : max 15 corrections respecté (ART-POL-02)
- SURG-04 : dry_run → diagnostique sans modifier
- SURG-05 : traçabilité complète dans SurgeonResult (ART-POL-03)

**Commit message** : `feat(sovereign): micro-rewrite engine [ART-POL-01, ART-POL-02, ART-POL-03]`

**Preuves** :
```
proofpacks/sprint-10/10.2/npm_test.txt
proofpacks/sprint-10/10.2/trace_example.json  (SurgeonResult sérialisé depuis test)
```

---

### COMMIT 10.3 — Re-Score Guard
**Invariant** : ART-POL-01

**Fichier à créer** : `src/polish/re-score-guard.ts`

**Fonction EXACTE roadmap** :
```typescript
async function reScoreGuard(
  original_prose: string,
  modified_prose: string,
  packet: ForgePacket,
  provider: SovereignProvider
): Promise<{
  accepted: boolean;
  score_before: number;
  score_after: number;
  details: string;
}>
```

**Algorithme** :
1. Scorer `original_prose` sur TOUS les axes (V3 complet)
2. Scorer `modified_prose` sur TOUS les axes
3. Comparer :
   a. `composite_after > composite_before + min_improvement` → condition 1
   b. AUCUN axe ne descend sous son plancher → condition 2
   c. Les DEUX conditions doivent être vraies → `accepted`
   d. Sinon → `rejected`
4. `details` : composite before/after + axes qui ont baissé + axes sous plancher

**Règle cardinale** : une correction qui améliore un axe mais en détruit un autre = REJET.

**Config** :
- `min_improvement` : réutiliser la constante de SurgeonConfig si pertinent, sinon constante dédiée documentée
- Planchers : réutiliser ceux existants dans `SOVEREIGN_CONFIG` (ne pas inventer)

**Tests EXACTS roadmap** :
- GUARD-01 : correction qui améliore → accepted
- GUARD-02 : correction qui dégrade 1 axe → rejected
- GUARD-03 : correction neutre (delta < threshold) → rejected
- GUARD-04 : améliore composite mais casse un plancher → rejected

**Commit message** : `feat(sovereign): re-score guard (zero regression) [ART-POL-01]`

**Preuves** :
```
proofpacks/sprint-10/10.3/npm_test.txt
proofpacks/sprint-10/10.3/guard_details_snapshot.txt
```

---

### COMMIT 10.4 — Paragraph-Level Patch (Quantum Suture)
**Invariant** : ART-POL-01

**Fichier à créer** : `src/polish/paragraph-patch.ts`

**Fonction EXACTE roadmap** :
```typescript
async function patchParagraph(
  prose: string,
  paragraph_index: number,
  diagnosis: string,
  action: string,
  packet: ForgePacket,
  provider: SovereignProvider
): Promise<{ patched_prose: string; accepted: boolean }>
```

**Algorithme** :
1. Split prose en paragraphes
2. Geler tous sauf `paragraph_index`
3. Construire prompt chirurgical pour le paragraphe ciblé (déterministe, minimal)
4. Appeler provider (LLM) pour réécrire CE paragraphe
5. Reconstituer prose
6. Appeler `reScoreGuard()` pour vérifier
7. Si accepted → prose patchée
8. Sinon → prose originale

**Fusion Physics prescriptions** : si une prescription cible un `segment_index` spécifique (info disponible dans packet/pipeline), l'utiliser comme diagnostic. Si l'info n'existe pas, ne pas inventer.

**Tests EXACTS roadmap** :
- PARA-01 : patch paragraphe 3 → seul paragraphe 3 modifié
- PARA-02 : paragraphes 1,2,4 inchangés (gelés)
- PARA-03 : patch qui dégrade → revert

**Commit message** : `feat(sovereign): paragraph-level patch (quantum suture) [ART-POL-01]`

**Preuves** :
```
proofpacks/sprint-10/10.4/npm_test.txt
proofpacks/sprint-10/10.4/paragraph_diff_proof.txt
```

---

### COMMIT 10.5 — Emotion-to-Action Integration
**Invariant** : ART-SEM-05

**Fichier modifié** : `src/input/constraint-compiler.ts`

**Modifications EXACTES roadmap** :
1. Après `compilePhysicsSection()`, injecter actions corporelles
2. Utiliser `mapEmotionToActions()` de Sprint 9.4 (`src/semantic/emotion-to-action.ts`)
3. Ajouter au prompt : `"Au lieu de NOMMER l'émotion, MONTRE-la via ces actions : {actions}"`
4. Injecter instructions de contradiction si détectée (via `detectContradictions()` de Sprint 9.4)

**Tests EXACTS roadmap** :
- COMPILE-NEW-01 : prompt contient actions corporelles
- COMPILE-NEW-02 : prompt contient instructions contradiction si détectée
- COMPILE-NEW-03 : budget 800 tokens respecté MÊME avec ajouts (test calcul, pas LLM)

**Commit message** : `feat(sovereign): emotion-to-action mapping in constraint compiler [ART-SEM-05]`

**Preuves** :
```
proofpacks/sprint-10/10.5/npm_test.txt
proofpacks/sprint-10/10.5/prompt_snapshot.txt
proofpacks/sprint-10/10.5/token_budget_calc.txt
```

---

### COMMIT 10.6 — Remplacement des 3 no-op
**Invariants** : ART-POL-04, ART-POL-05, ART-POL-06

⚠️ **Changement de signature** : les 3 fonctions passent de synchrone à async.
Toutes les call-sites doivent être mises à jour. Signature cible :
```typescript
async function polishRhythm(packet: ForgePacket, prose: string, provider: SovereignProvider): Promise<string>
async function sweepCliches(packet: ForgePacket, prose: string, provider: SovereignProvider): Promise<string>
async function enforceSignature(packet: ForgePacket, prose: string, provider: SovereignProvider): Promise<string>
```

**A) `musical-engine.ts`** :
1. Détecter phrases monotones (3+ phrases consécutives même longueur ±10%)
2. Si monotonie → appeler sentence-surgeon `reason='rhythm'`
3. Retourner prose modifiée (ou originale si aucune correction acceptée)

**B) `anti-cliche-sweep.ts`** :
1. Détecter clichés via blacklist existante (`computeClicheDelta`)
2. Pour chaque cliché → sentence-surgeon `reason='cliche'`
3. Re-score guard AVANT acceptation
4. Retourner prose modifiée

**C) `signature-enforcement.ts`** :
1. Mesurer `signature_hit_rate` (existant via `computeStyleDelta`)
2. Si < seuil → identifier phrases sans signature words
3. Sentence-surgeon `reason='signature'`
4. Re-score guard AVANT acceptation

**RULE-NOOP-ZERO** : ces fonctions ne retournent PLUS prose inchangée dans les cas de trigger testés.
Toute modification acceptée passe par `reScoreGuard`.

**Tests EXACTS roadmap** :
- NOOP-01 : `polishRhythm()` sur prose monotone → prose DIFFÉRENTE (ART-POL-04)
- NOOP-02 : `sweepCliches()` sur prose avec cliché → prose DIFFÉRENTE (ART-POL-05)
- NOOP-03 : `enforceSignature()` sur prose sans signature → prose DIFFÉRENTE (ART-POL-06)
- NOOP-04 : les 3 fonctions respectent reScoreGuard
- NOOP-05 : non-régression tests existants polish (`tests/polish/sweep-noop.test.ts` peut être adapté/renommé)

**Commit message** : `feat(sovereign): replace 3 no-op polish functions with real corrections [ART-POL-04,05,06]`

**Preuves** :
```
proofpacks/sprint-10/10.6/npm_test.txt
proofpacks/sprint-10/10.6/diff_examples.txt
proofpacks/sprint-10/10.6/rescore_guard_evidence.txt
```

---

### COMMIT 10.7 — Tests + Gates + ProofPack Sprint 10

**Checklist fin de sprint (DOIT être prouvée)** :
- [ ] sentence-surgeon implémenté et testé
- [ ] re-score guard implémenté et testé
- [ ] paragraph-patch implémenté et testé
- [ ] `polishRhythm()` N'EST PLUS no-op
- [ ] `sweepCliches()` N'EST PLUS no-op
- [ ] `enforceSignature()` N'EST PLUS no-op
- [ ] Emotion-to-action dans constraint compiler
- [ ] Max 15 corrections/passe respecté
- [ ] Chaque correction traçable (MicroPatch)
- [ ] Aucune correction dégradante acceptée
- [ ] Tous invariants ART-POL-01..06 PASS
- [ ] Tous tests existants (baseline 326) TOUJOURS PASS
- [ ] ProofPack généré

**Actions** :
1. Vérifier/compléter gates existants pour Sprint 10 (conventions repo)
2. Générer ProofPack au format `proofpacks/` (MANIFEST.json, HASHES.sha256, EVIDENCE.md)
3. Produire `Sprint10_SEAL_REPORT.md` :
   - Liste commits + messages
   - Nombre tests total (baseline + nouveaux)
   - Invariants Sprint 10 + mapping tests
   - Hashes SHA-256 des artefacts
   - Commandes exactes pour reproduire

**Commit message** : suivre la convention existante. Chercher les commits analogues Sprint 9 :
```
chore(sovereign): tests + gates + proofpack Sprint 10 [ART-POL-01..06]
```

**Preuves** :
```
proofpacks/sprint-10/10.7/npm_test.txt
proofpacks/sprint-10/10.7/gates_output.txt
proofpacks/sprint-10/10.7/proofpack_manifest.json
proofpacks/sprint-10/10.7/sha256.txt
proofpacks/sprint-10/10.7/sprint10_seal_report.md
```

---

## 5) AUDITS AUTOMATIQUES (OBLIGATOIRES À CHAQUE COMMIT)

Après implémentation + tests, exécuter ET archiver dans `proofpacks/sprint-10/<commit>/` :

```powershell
# 1. Zéro TODO/FIXME
grep -rn "TODO\|FIXME" packages/sovereign-engine/src packages/sovereign-engine/tests

# 2. Zéro any
grep -rn ":\s*any\b" packages/sovereign-engine/src packages/sovereign-engine/tests

# 3. Zéro ts-ignore
grep -rn "@ts-ignore\|@ts-nocheck" packages/sovereign-engine/src packages/sovereign-engine/tests

# 4. Tests complets
cd packages/sovereign-engine && npm test
```

Si un audit échoue → FAIL immédiat, corriger AVANT commit.

---

## 6) DISCIPLINE DE MODIFICATION

- Tu touches UNIQUEMENT les fichiers listés par le commit en cours.
- Si une interface provider manque → extension MINIMALE STRICTE + tests + sans casser existant.
- Toute modification hors périmètre = FAIL.
- Si un call-site doit être adapté (ex: sync→async) → tu le fais et tu vérifies que les tests concernés passent.

---

## 7) LIVRABLE FINAL (APRÈS COMMIT 10.7 SEULEMENT)

```
1. ZIP du package sovereign-engine (sans node_modules) :
   → C:\Users\elric\Downloads\sovereign-engine-sprint-10.zip

2. SHA-256 du ZIP :
   → C:\Users\elric\Downloads\sovereign-engine-sprint-10.sha256

3. Script PowerShell reproductible :
```

```powershell
# ═══════════════════════════════════════════════════════════════════════════
# OMEGA SPRINT 10 — Installation et Test
# ═══════════════════════════════════════════════════════════════════════════

# 1. Extraire
Expand-Archive -Path "C:\Users\elric\Downloads\sovereign-engine-sprint-10.zip" `
  -DestinationPath "C:\Users\elric\omega-project\packages\" -Force

# 2. Installer et tester
cd C:\Users\elric\omega-project\packages\sovereign-engine
npm install
npm test

# 3. Vérifier hash
Get-FileHash -Algorithm SHA256 "C:\Users\elric\Downloads\sovereign-engine-sprint-10.zip"
```

---

## 8) FORMAT DE RENDU À CHAQUE COMMIT

```
📦 LIVRABLE — Commit 10.X — [titre court]
Invariants: ART-POL-XX
Tests: N/N PASS (dont Y nouveaux)
Gates: PASS/FAIL
Preuves: proofpacks/sprint-10/10.X/...
Git: feat(sovereign): message exact
VERDICT: PASS
```

AUCUN BLABLA. Pas d'explication, pas de philosophie, pas de storytelling.

---

## 9) INVARIANTS SPRINT 10 — RÉFÉRENCE RAPIDE

| ID | Description | Test | Commit |
|----|-------------|------|--------|
| ART-POL-01 | Micro-correction JAMAIS acceptée si `score_after ≤ score_before` | SURG-02, GUARD-01..04, PARA-03 | 10.1-10.6 |
| ART-POL-02 | Max 15 micro-corrections par passe, 1 passe max | SURG-03 | 10.1-10.2 |
| ART-POL-03 | Chaque correction traçable (MicroPatch complet) | SURG-05 | 10.2 |
| ART-POL-04 | `polishRhythm()` ne retourne PLUS prose inchangée | NOOP-01 | 10.6 |
| ART-POL-05 | `sweepCliches()` ne retourne PLUS prose inchangée | NOOP-02 | 10.6 |
| ART-POL-06 | `enforceSignature()` ne retourne PLUS prose inchangée | NOOP-03 | 10.6 |

---

## 10) PIÈGES CONNUS — ANTICIPATION

| Piège | Mitigation |
|-------|------------|
| `polishRhythm/sweepCliches/enforceSignature` sont sync, deviennent async | Mettre à jour TOUS les call-sites. Chercher avec `grep -rn "polishRhythm\|sweepCliches\|enforceSignature" src/` |
| `MockSovereignProvider` ne connaît pas `rewriteSentence` | L'ajouter au commit 10.2 avec retour déterministe |
| `tests/polish/sweep-noop.test.ts` teste le comportement no-op | Adapter/renommé au commit 10.6 (le no-op est supprimé) |
| `re-score guard` utilise le scorer V3 complet | Le mock provider doit retourner des scores cohérents pour TOUS les axes |
| Budget token contraint à 800 (commit 10.5) | Tester avec calcul, pas avec LLM réel |

---

**GO — DÉMARRER PAR PRÉ-VOL, PUIS COMMIT 10.1 UNIQUEMENT.**
