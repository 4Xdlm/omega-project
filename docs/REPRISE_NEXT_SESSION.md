# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — MESSAGE DE REPRISE COMPLÈTE
# Session précédente : GENIUS Dual Mode Integration 4a→4e
# Date : 2026-02-21
# ═══════════════════════════════════════════════════════════════════════════════

# 🚀 OMEGA SESSION — INITIALISATION

Version: commit 4de6875d (master, pushed)
Dernier état: SESSION_SAVE_2026-02-21_INTEGRATION_DUAL_CORE.md
Objectif: continuer — Golden Corpus Benchmark (Phase 4f, post 4a→4e scellé)

RAPPEL:
- Lire les docs minutieusement AVANT d'agir
- Présenter un bilan de compréhension
- Attendre ma validation

Architecte Suprême: Francky
IA Principal: Claude

---

## 📋 CONTEXTE COMPLET — CE QUI A ÉTÉ FAIT

### omega-p0 (@omega/phonetic-stack) — Stack phonétique GENIUS

Package standalone dans `C:\Users\elric\omega-project\omega-p0\` avec :
- 9 modules phonétiques (syllable-counter-fr, prosodic-segmenter, euphony-detector,
  npvi-calculator, calque-detector, semantic-density, surprise-analyzer,
  inevitability-analyzer, genius-scorer)
- `scoreGenius(text)` → `GeniusAnalysis` avec 5 axes (D,S,I,R,V) + composite + spread
- Build ESM dans `dist/` via `tsconfig.build.json` (module: NodeNext)
- **538 tests / 538 PASS** (13 suites, 10.49s)
- Calibré sur corpus 10H+10AI : Human avg 84.2, AI avg 68.4 (Δ = +15.8)

### Poids calibrés (benchmark 2026-02-21)

| Axe | Poids | Δ Human-AI |
|-----|-------|------------|
| Resonance (R) | 0.35 | +32.4 |
| Density (D) | 0.25 | +10.5 |
| Voice (V) | 0.20 | +6.0 |
| Surprise (S) | 0.15 | +5.6 |
| Inevitability (I) | 0.05 | -4.3 |

### Intégration dans Sovereign Engine — SCELLÉE

Commit `3b10ea1a`, tag `phase-4c-genius-dual-sealed`, doc commit `4de6875d`.

Fichiers ajoutés/modifiés dans `packages/sovereign-engine/` :
- `src/genius/omega-p0-adapter.ts` — Bridge omega-p0 → SE
  - `computeOmegaP0Scores(text)` → `{G_new, axes, weights, proof}`
  - `buildDualProof(...)` → `DualProofRecord` complet
- `src/genius/genius-metrics.ts` — 7 ajouts chirurgicaux pour dual mode
  - `scorerMode?: 'legacy' | 'dual' | 'omegaP0'` (défaut: legacy)
  - En mode dual: `layer2_dual` ajouté à la sortie
- `tests/genius/genius-dual-mode.test.ts` — 8 tests intégration
- `docs/ADR-GENIUS-DUAL-MODE.md` — Architecture Decision Record
- `package.json` — dépendance `"@omega/phonetic-stack": "file:../../omega-p0"`
- **834 tests / 834 PASS** (127 suites, 2.96s)

### Modes de scoring

| Mode | G formula | Verdict source | layer2_dual |
|------|-----------|---------------|-------------|
| `legacy` (défaut) | (D×S×I×R×V)^(1/5) SE scorers | G_old | absent |
| `dual` | G_old (SE) + G_new (omega-p0) en parallèle | G_old | présent |
| `omegaP0` | 0.35R+0.25D+0.20V+0.15S+0.05I omega-p0 | G_new | absent |

### DualProofRecord (shape complète)

```typescript
{
  text_hash: string,       // SHA-256 du texte brut (64 hex)
  segments_hash: string,   // SHA-256 du texte normalisé
  G_old: number,           // Geometric mean SE
  G_new: number,           // Weighted sum omega-p0
  delta: number,           // G_new - G_old
  axes_old: {D,S,I,R,V},  // Scores SE
  axes_new: {D,S,I,R,V},  // Scores omega-p0
  verdict_old: string,     // Verdict legacy
  verdict_new: string,     // G_SEAL_ELIGIBLE / G_PITCH / G_LOW
  schema_version_old: string,  // 'GENIUS_SE_V1'
  schema_version_new: string,  // 'GENIUS_SCHEMA_V1'
  axis_def_hash_old: string,   // First 16 hex of SHA-256(axis manifest) — fingerprint volontaire
  axis_def_hash_new: string,   // First 16 hex of SHA-256(axis manifest) — détection de drift uniquement
  delta_explain: string[],     // Top 3 axes par |delta|
  decision_mode: string,       // 'legacy'|'dual'|'omegaP0'
  timestamp: string            // ISO 8601
}
```

### Sunset Contract (scellé)

| Paramètre | Valeur |
|-----------|--------|
| Dual TTL | 14 jours OU 50 runs golden (premier atteint) |
| Bascule si | median(G_new - G_old) ≥ 0 ET regressions = 0 ET determinism = PASS |
| Purge legacy | Sprint suivant la bascule — non négociable |

### Dette technique connue

- **TD-01-SUBMODULE** : omega-p0 importé via `file:../../omega-p0` = embedded git repo.
  État transitoire. Interdit en release certifiée. À normaliser avant benchmark final.
  Options : (A) git submodule add, (B) fusion dans packages/, (C) npm workspaces.

### Repro Quickstart (TD-01 workaround)

```powershell
cd C:\Users\elric\omega-project\omega-p0; npm install; npm run build; npm test
# → 538/538 PASS, dist/ à jour
cd C:\Users\elric\omega-project\packages\sovereign-engine; npm install; npm test
# → 834/834 PASS
# Vérifier que omega-p0/dist/ existe AVANT tout benchmark
```

---

## 🎯 PROCHAINE ÉTAPE : GOLDEN CORPUS BENCHMARK (Phase 4f)

### Ce qu'il faut faire

Exécuter des runs en `scorerMode: 'dual'` sur de la prose réelle (générée par
le pipeline Sovereign Engine end-to-end ou corpus littéraire existant) pour :

1. **Collecter N runs dual** (objectif : ≥50 pour sunset contract)
2. **Comparer G_old vs G_new** sur chaque texte
3. **Produire un proof pack** dans `nexus/proof/genius-dual-comparison/`
4. **Décider** : bascule omegaP0 ou maintien legacy

### Questions ouvertes pour l'Architecte

1. **Dataset** : avons-nous déjà un golden corpus prêt, ou faut-il le constituer ?
   - Option A : utiliser les textes générés par SE lors de sessions précédentes
   - Option B : constituer un corpus frais via `omnipotent-live-calibrate.ts`
   - Option C : corpus externe (littérature française)

2. **Script de benchmark** : faut-il créer un script `run-dual-benchmark.ts` qui :
   - Charge N textes
   - Exécute `computeGeniusMetrics({...scorerMode:'dual'})` sur chacun
   - Stocke les `DualProofRecord` dans un dossier
   - Calcule les statistiques (median delta, régression count, determinism check)
   - Produit un rapport verdict

3. **Seuil de décision** : le sunset contract dit median(Δ) ≥ 0, mais veut-on
   aussi un seuil de corrélation H/AI (omega-p0 sépare-t-il mieux que legacy) ?

### Default fail-closed (si Architecte ne tranche pas)

- **Dataset** : Option A d'abord (textes SE existants). Si N < 50, compléter avec Option B (`omnipotent-live-calibrate.ts`).
- **N_min** : aucune décision de bascule avant N ≥ 30 runs. Le sunset contract (50 runs / 14 jours) reste la cible.

### Recommandations consultants (session précédente)

**ChatGPT** : commit doc séparé du code (fait), reproduction quickstart (fait),
no secrets guarantee (fait), vérifier working tree clean (fait).

**Gemini** : ADR inclus au commit code (fait), tag explicite (fait),
protocole de sélection textes H vs AI pour benchmark (à définir).

---

## 📁 CHEMINS CRITIQUES

| Élément | Chemin |
|---------|--------|
| Repo root | `C:\Users\elric\omega-project\` |
| omega-p0 | `C:\Users\elric\omega-project\omega-p0\` |
| Sovereign Engine | `C:\Users\elric\omega-project\packages\sovereign-engine\` |
| Adapter | `packages/sovereign-engine/src/genius/omega-p0-adapter.ts` |
| Orchestrateur | `packages/sovereign-engine/src/genius/genius-metrics.ts` |
| Tests dual | `packages/sovereign-engine/tests/genius/genius-dual-mode.test.ts` |
| ADR | `packages/sovereign-engine/docs/ADR-GENIUS-DUAL-MODE.md` |
| SESSION_SAVE | `docs/SESSION_SAVE_2026-02-21_INTEGRATION_DUAL_CORE.md` |
| Calibration script | `packages/sovereign-engine/scripts/omnipotent-live-calibrate.ts` |
| Roadmap | `/mnt/project/OMEGA_SUPREME_ROADMAP_v5_0.md` |

## 🔢 COMPTEURS

| Métrique | Valeur |
|----------|--------|
| Tests SE | 834/834 PASS |
| Tests omega-p0 | 538/538 PASS |
| Total combiné | 1372 PASS |
| Commit code | `3b10ea1a` |
| Commit doc | `4de6875d` |
| Tag | `phase-4c-genius-dual-sealed` |
| Suites SE | 127 |
| Suites omega-p0 | 13 |

---

## 📄 DOCUMENTS PROJET À LIRE (dans /mnt/project/)

- `OMEGA_SUPREME_ROADMAP_v5_0.md` — roadmap principale
- `GENIUS_ENGINE_SPEC.md` — spécification GENIUS
- `GENIUS_PLAN_FINAL.md` — plan d'intégration
- `GENIUS_ROADMAP.md` — roadmap GENIUS spécifique
- `GENIUS_SSOT.json` — source of truth GENIUS
- `OMEGA_MASTER_PLAN_v2.md` — plan maître OMEGA

---

Let's go! 🚀
