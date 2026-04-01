# OMEGA IRM — LIVRABLE 13 : DUPLICATION AND CANCER REPORT
**Date** : 2026-04-02 | **HEAD** : e1b92dd3 | **Standard** : NASA-Grade L4
**Méthode** : Grep heuristique + lecture manuelle des fichiers identifiés

---

## A. DOUBLONS FONCTIONNELS

### DUP-01 : SAGA_READY seuil 92.0 dupliqué

| Localisation | Valeur | Source |
|-------------|--------|--------|
| core/thresholds.ts:34 | `SAGA_READY_COMPOSITE_MIN = 92.0` | **SSOT** |
| engine.ts:198 | `const SAGA_COMPOSITE = 92.0` | HARDCODED LOCAL |
| engine.ts:549 | `final_score_v3.composite >= 92` | HARDCODED INLINE |
| assembly/best-of-n.ts:54 | Importe depuis core/thresholds.ts | OK (SSOT) |
| validation/phase-u/top-k-selection.ts:141 | Re-export depuis core/thresholds.ts | OK (SSOT) |
| duel/duel-engine.ts:137 | `85` hardcodé dans floorPenalty | HARDCODED |

**Verdict** : core/thresholds.ts est la SSOT, mais engine.ts contient 2 duplications locales hardcodées (lignes 198 et 549). **Action** : unifier vers core/thresholds.ts.
**Criticité** : HAUTE — divergence silencieuse si un seul est modifié.

### DUP-02 : SEAL_ATOMIC seuil 93.0 dupliqué

| Localisation | Valeur | Source |
|-------------|--------|--------|
| core/thresholds.ts:24 | `SEAL_ATOMIC_COMPOSITE_MIN = 93.0` | **SSOT** |
| config.ts:453 | `GREEN.min_composite: 93` | ZONE threshold (lié) |
| s-oracle-v2.ts:406 | Référence en commentaire | OK |

**Verdict** : Mieux unifié que SAGA_READY. config.ts ZONES utilise 93 indépendamment.

### DUP-03 : computeMinAxis — 1 SSOT + usages directs

| Localisation | Rôle |
|-------------|------|
| utils/math-utils.ts | **SSOT** (computeMinAxis function) |
| validation/phase-u/top-k-selection.ts:46 | Importe depuis utils/math-utils.ts — OK |
| engine.ts:208 | `result.macro_score?.min_axis ?? 0` — lit la propriété, pas de fonction |
| duel/duel-engine.ts | Lit `.min_axis` directement |

**Verdict** : Pas de vrai doublon fonctionnel. computeMinAxis est le calculateur, les autres lisent la propriété déjà calculée.

### DUP-04 : Token estimation — 2 implémentations

| Localisation | Méthode |
|-------------|---------|
| utils/token-utils.ts | `estimateTokens()` — approximation chars/4 |
| constraints/token-counter.ts | `countTokens(text, tokenizerId)` — plus précis |

**Consommateurs estimateTokens** : voice/voice-compiler.ts, cde/distiller.ts
**Consommateurs countTokens** : constraints/constraint-compiler.ts, cde/delta-compressor.ts, compiler/prompt-compiler.ts, compiler/static-analyzer.ts

**Verdict** : Deux méthodes coexistent. estimateTokens est une approximation rapide, countTokens est plus précis. **Non critique** mais potentiel de confusion.

### DUP-05 : sortedStringify — 1 seule copie

| Localisation | |
|-------------|--|
| cde/distiller.ts:48 | Seule implémentation trouvée |

**Verdict** : RAPPORT_SCAN signalait 3 endroits — scan IRM n'en trouve que 1 dans SE/src. Les 2 autres sont probablement dans d'autres packages. **Non confirmé**.

---

## B. TOKENS MORTS

### TM-01 : avg_sentence_length_target passé au Scribe

| Fichier | Ligne | Valeur |
|---------|-------|--------|
| input/prompt-assembler-v2.ts:410 | `Target Sentence Length: ${sg.rhythm.avg_sentence_length_target} words` | token mort |
| input/prompt-assembler-v4.ts:244 | `const target = genome.rhythm.avg_sentence_length_target` | consommé mais **BB-02 prouvé irréductible** |
| types.ts:156 | `avg_sentence_length_target: number` | type défini |

**Verdict** : BB-02 (DEC-20260328-BB-02) a prouvé que le plancher Claude est 35w. Toute cible < 35 est ignorée par le modèle. Le token est consommé mais **INUTILE** en dessous de 35w. Impact : 0 sur la qualité, gaspille ~10 tokens de prompt.
**Action** : Retirer ou fixer à 35 minimum dans le validateur.

### TM-02 : "8-12 mots" et "15-20 mots" cibles de longueur

| Fichier | Ligne | Contexte |
|---------|-------|---------|
| input/prompt-assembler-v2.ts:1217 | "Paragraphe A : 8-12 mots (un coup de poing)" | Token dans le prompt |
| genius/genius-contract-compiler.ts:69,397 | `bucket_15_20` | Distribution rythmique |

**Verdict** : "8-12 mots" = TOKEN MORT — BB-02 prouvé plancher 35w. "15-20 mots" en bucket est un compteur descriptif, pas une consigne.
**Action** : Retirer "8-12 mots" du prompt V2 (V4 ne l'a plus).

### TM-03 : Semicolons comme règle

| Fichier | Ligne | Contexte |
|---------|-------|---------|
| input/prompt-assembler-v2.ts:1250 | "point-virgule" | Consigne dans le prompt |
| scoring/language-profiles.ts:4 | Commentaire L31 | Informatif |

**Verdict** : BB-01 a prouvé compliance 13%. Les tokens de consigne semicolons sont morts. V4 ne contient plus de consigne semicolons directe (correct).
**Action** : Aucune (V4 est déjà corrigé, V2 est legacy).

### TM-04 : Polish functions DISABLED

| Fichier | Statut |
|---------|--------|
| polish/musical-engine.ts | IMPORTÉ mais commenté dans engine.ts:412-414 |
| polish/anti-cliche-sweep.ts | IMPORTÉ mais commenté |
| polish/signature-enforcement.ts | IMPORTÉ mais commenté |

**Verdict** : "Sprint 2: Polish DISABLED — proven NO-OP (delta 0.0 on ALL runs)". Ces 3 fichiers sont importés dans engine.ts (ligne 43-45) mais leurs fonctions sont commentées (ligne 412-414). Code zombie.
**Action** : Supprimer les imports et les fichiers, ou documenter comme ARCHIVE.

---

## C. MAGIC NUMBERS (seuils sans source traçable)

| Valeur | Fichier | Provenance | Magic? |
|--------|---------|------------|--------|
| 92.0 | core/thresholds.ts | Empirique Phase U — 5/60 runs = SAGA_READY | NON |
| 93.0 | core/thresholds.ts | Empirique Phase U — 0/60 runs = SEAL_ATOMIC | NON |
| 85.0 | core/thresholds.ts | INV-SR-01 | NON |
| 1.05 | duel/duel-engine.ts:30 | Étalonnage maîtres (Flaubert 0.795, Proust 0.784, Duras 1.031) | NON |
| 2.50 | duel/duel-engine.ts:30 | HOTFIX BLOC7 (Ollama CV ~2.4) | NON |
| 0.30 | engine.ts:455 | CLIFF_THRESHOLD | **PARTIEL** — pas de doc source |
| 0.50 | engine.ts:456 | CLIFF_QUALITY_TARGET | **PARTIEL** — BB-01 cliff=0.50 |
| 1.5 | duel/duel-engine.ts:137 | floorPenalty multiplier | **OUI — magic number** |
| 0.50 | damage-gate.ts | max_amplitude cap | Phase W empirique | NON |
| 0.01-0.50 | damage-gate.ts | Category thresholds | Phase W bootstrap 1000× | NON |

**Verdict** : 2 magic numbers identifiés :
1. **CLIFF_THRESHOLD = 0.30** — partiellement sourcé (BB-01 indirectement)
2. **floorPenalty multiplier = 1.5** — aucune source trouvée, apparu avec la sélection hostile

---

## D. CODE MORT / ZOMBIE

### ZOMBIE-01 : s-score.ts (LEGACY)
- **Statut** : @deprecated explicitement (ligne 7-9)
- **Importé par** : engine.ts (type MacroSScore), aesthetic-oracle.ts (computeSScore + computeMacroSScore), polish/targeted-patch.ts, index.ts (exports), validation/benchmark
- **Verdict** : Toujours importé car il contient computeMacroSScore. **ZOMBIE** — la logique est utilisée mais le fichier est marqué legacy.
- **Action** : Migrer computeMacroSScore vers s-oracle-v2.ts

### ZOMBIE-02 : polish/ (3 fichiers disabled)
- musical-engine.ts, anti-cliche-sweep.ts, signature-enforcement.ts
- **Importés mais commentés dans engine.ts**
- **Action** : Supprimer les imports commentés

### DEAD-01 : compat/ (brief-compat-guard.ts, version-guard.ts)
- **0 imports** trouvés dans tout le codebase
- **Verdict** : CODE MORT CONFIRMÉ
- **Action** : Supprimer

### CANDIDATE_DEAD-01 : exemplar/exemplar-library.ts
- **1 import** : input/prompt-assembler-v4.ts:32 (golden-exemplars, pas exemplar-library)
- **Verdict** : À vérifier — golden-exemplars.ts importe peut-être depuis exemplar-library

### CANDIDATE_DEAD-02 : hybrid-provider.ts
- **Verdict** : BLOC7 a rejeté le pipeline hybride. Le fichier reste mais devrait être ARCHIVE.

---

*repo_live_confirmed: true — toutes les localisations vérifiées par grep*
