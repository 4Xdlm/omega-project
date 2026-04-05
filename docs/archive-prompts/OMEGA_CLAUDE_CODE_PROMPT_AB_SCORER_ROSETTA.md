# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — CLAUDE CODE MEGA-PROMPT — PHASE A+B AUTONOME
#   A : Fix V1 normalisation + revalidation scorer
#   B : Construction Rosetta Bridge (couplage S1→S2)
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   Date         : 2026-04-02
#   HEAD entrant : 95a5bf86 (tag omega-r4-revalidation-v1)
#   Branche      : phase-r-metrology-rebuild
#   Standard     : NASA-Grade L4 / DO-178C Level A
#   Autorité     : Francky (Architecte Suprême)
#   Mode         : AUTONOMIE TOTALE — Francky fait la sieste
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   CONTEXTE :
#   R4 a révélé que V1 multi-stage produit des scores non normalisés (1058-1134)
#   parce que le FeatureNormalizer R1 n'était pas activé dans le test Python.
#   V1 a besoin de features normalisées 0-100 pour fonctionner.
#   Le Spearman -0.22 mesuré est un artefact de l'absence de normalisation.
#
#   MISSION :
#   PART A (1h) : Fixer le V1, revalider avec normalisation, trancher son statut
#   PART B (2h) : Construire le Rosetta Bridge (nouveau module coupling/)
#   Total estimé : 3h en autonomie
#
#   RÈGLES :
#   - Vérifier 2 fois avant chaque modification CODE
#   - Tests GREEN à chaque étape
#   - Python 3.11 = C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe
#   - En cas de doute → [DOUTE], ne pas modifier, documenter
#
# ═══════════════════════════════════════════════════════════════════════════════

# CHEMINS CRITIQUES
REPO       = C:\Users\elric\omega-project
SE_SRC     = packages\sovereign-engine\src
SCORING    = packages\sovereign-engine\src\scoring
R1_DATA    = omega-autopsie\results_r1
R1_METRO   = omega-autopsie\results_r1\OMEGA_METROLOGIE_EMPIRIQUE_v1.json  (25 MB)
COEFFS     = packages\sovereign-engine\src\scoring\data\OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json
TIERS      = omega-autopsie\corpus_r\CORPUS_TIERS_V2.json
ROSETTA_S0 = omega-autopsie\results_rosetta\s0
ROSETTA_05 = omega-autopsie\results_rosetta\05_table_rosette.json
ROSETTA_08 = omega-autopsie\results_rosetta\08_dictionnaire_omega_llm_v1.json
PY311      = C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 0 — SNAPSHOT
# ═══════════════════════════════════════════════════════════════════════════════

1. `git rev-parse HEAD` → attendu 95a5bf86
2. `cd packages\sovereign-engine && npx vitest run` → attendu 2022 passed
3. Si FAIL → STOP TOTAL

# ═══════════════════════════════════════════════════════════════════════════════
#
#   ██████╗  █████╗ ██████╗ ████████╗     █████╗
#   ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝    ██╔══██╗
#   ██████╔╝███████║██████╔╝   ██║       ███████║
#   ██╔═══╝ ██╔══██║██╔══██╗   ██║       ██╔══██║
#   ██║     ██║  ██║██║  ██║   ██║       ██║  ██║
#   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝
#
#   FIX V1 NORMALISATION + REVALIDATION
#
# ═══════════════════════════════════════════════════════════════════════════════

# ── A-01 : COMPRENDRE LA NORMALISATION ──────────────────────────────────────

## LIRE ces fichiers AVANT de coder :

1. src/scoring/normalizer.ts — le FeatureNormalizer
   Comprendre : comment il normalise les features brutes en 0-100
   Quelle donnée il charge (R1 metrology JSON)
   Quel format il attend en entrée

2. src/scoring/multi-stage-scorer.ts — lignes 35-40
   Comprendre : le constructeur prend un metrologyPath optionnel
   Si fourni → normalise les features avant scoring
   Si absent → scoring sur features brutes (= le bug R4)

3. Le fichier R1 metrology :
   omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json (25 MB)
   LIRE les 50 premières lignes pour comprendre le format

# ── A-02 : SCRIPT PYTHON — VALIDATION V1 AVEC NORMALISATION ────────────────
# Livrable : docs/irm/R4_V1_NORMALIZED_VALIDATION.json

## Principe
Le problème R4 était : le script Python scorait avec features BRUTES.
Solution : implémenter la normalisation 0-100 en Python AVANT de scorer.

## Comment normaliser (lire normalizer.ts pour confirmer)
La normalisation 0-100 utilise les percentiles du corpus R1 :
  Pour chaque feature :
    p5 = percentile 5% du corpus (borne basse)
    p95 = percentile 95% du corpus (borne haute)
    normalized = 100 × (value - p5) / (p95 - p5)
    clamped à [0, 100]

Ces percentiles sont dans OMEGA_METROLOGIE_EMPIRIQUE_v1.json.

## Script à écrire et exécuter :

```python
# scripts/r4_v1_normalized.py
import json, os, glob, numpy as np
from scipy import stats

# 1. Charger les données
COEFFS = r"C:\Users\elric\omega-project\packages\sovereign-engine\src\scoring\data\OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json"
METRO = r"C:\Users\elric\omega-project\omega-autopsie\results_r1\OMEGA_METROLOGIE_EMPIRIQUE_v1.json"
TIERS = r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\CORPUS_TIERS_V2.json"
R1_DIR = r"C:\Users\elric\omega-project\omega-autopsie\results_r1"

print("Loading coefficients...")
with open(COEFFS) as f:
    coeffs = json.load(f)

print("Loading metrology (25 MB, may take a moment)...")
with open(METRO) as f:
    metro = json.load(f)

print("Loading tiers...")
with open(TIERS) as f:
    tiers_data = json.load(f)

# Créer le mapping filename → tier
tier_map = {}
for t in tiers_data:
    fn = t.get('filename', '')
    tier = t.get('tier_suggestion', '?')
    if tier in ('S', 'A', 'B', 'C', 'D'):
        tier_map[fn] = tier

tier_to_num = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}

# 2. Extraire les bornes de normalisation depuis la métrologie R1
# La structure de metro dépend du format — LIRE le fichier pour confirmer.
# On attend : metro[feature_name] = { percentiles: {5: val, 95: val}, ... }
# OU : metro = { features: { feature_name: { by_window: { 600: { p5, p95, ... }}}}}
# ADAPTER selon la structure réelle.

# Fonction de normalisation
def normalize_feature(value, p5, p95):
    if p95 == p5:
        return 50.0  # indéterminé
    normalized = 100.0 * (value - p5) / (p95 - p5)
    return max(0.0, min(100.0, normalized))

# IMPORTANT : la structure du JSON metro DOIT être lue pour adapter ce code.
# Si la structure est différente de ce qui est attendu → ADAPTER.
# Le format exact sera clair après lecture des premières lignes.

# 3. Charger 30 résultats R1 avec tiers connus
results = []
r1_files = sorted(glob.glob(os.path.join(R1_DIR, "*.json")))
for fp in r1_files:
    basename = os.path.basename(fp)
    if basename == 'OMEGA_METROLOGIE_EMPIRIQUE_v1.json':
        continue
    # Trouver le tier
    # Le nom dans tiers est le .txt, le nom R1 est author_title.json
    # Il faudra faire le mapping — ADAPTER selon la structure réelle
    with open(fp) as f:
        data = json.load(f)
    meta = data.get('meta', {})
    tier_key = meta.get('work_id', '')
    # Chercher le tier
    tier = None
    for t in tiers_data:
        fn = t.get('filename', '')
        if tier_key in fn or fn.replace('.txt','') in tier_key:
            tier = t.get('tier_suggestion')
            break
    if tier not in ('S', 'A', 'B', 'C', 'D'):
        continue
    
    # Extraire les features moyennées sur la fenêtre 600w
    windows_600 = [w for w in data.get('windows', []) if w.get('window_size') == 600]
    if not windows_600:
        continue
    
    # Moyenner les features sur toutes les fenêtres 600w
    all_features = {}
    for w in windows_600:
        for feat, val in w.get('features', {}).items():
            if val is not None and isinstance(val, (int, float)):
                all_features.setdefault(feat, []).append(val)
    
    mean_features = {k: np.mean(v) for k, v in all_features.items() if v}
    
    results.append({
        'work_id': tier_key,
        'tier': tier,
        'features': mean_features,
        'word_count': meta.get('word_count', 0)
    })
    
    if len(results) >= 30:
        break

print(f"Loaded {len(results)} works with tiers")

# 4. Normaliser les features 0-100
# ADAPTER cette section selon la structure réelle de metro
# Extraire les percentiles 5 et 95 pour la fenêtre 600w
# ...

# 5. Scorer V1 avec features normalisées
def score_v1(features_normalized, coeffs):
    local_weights = coeffs['weight_table'].get('LOCAL_600', {})
    arc_weights = coeffs['weight_table'].get('ARC_2500', {})
    
    local_score = 0
    local_n = 0
    for feat, entry in local_weights.items():
        if feat in features_normalized:
            w = entry.get('weight_effective', 0)
            local_score += features_normalized[feat] * w
            local_n += 1
    
    arc_score = 0
    arc_n = 0
    for feat, entry in arc_weights.items():
        if feat in features_normalized:
            w = entry.get('weight_effective', 0)
            arc_score += features_normalized[feat] * w
            arc_n += 1
    
    alpha = coeffs.get('scoring_formula', {}).get('600', {}).get('alpha_LOCAL', 0.43)
    beta = coeffs.get('scoring_formula', {}).get('600', {}).get('beta_ARC', 0.57)
    
    return alpha * local_score + beta * arc_score

# 6. Mesurer Spearman
human_tiers = [tier_to_num[r['tier']] for r in results]
v1_scores = [score_v1(r['features_normalized'], coeffs) for r in results]  # après normalisation

spearman, pval = stats.spearmanr(human_tiers, v1_scores)
print(f"\n=== RÉSULTAT V1 NORMALISÉ ===")
print(f"Spearman: {spearman:.4f} (p={pval:.4e})")
print(f"Score range: {min(v1_scores):.2f} - {max(v1_scores):.2f}")

# 7. Verdict
verdict = "VALID" if spearman > 0.30 else "WEAK" if spearman > 0.10 else "INVALID"

output = {
    "date": "2026-04-02",
    "method": "V1 multi-stage with R1 FeatureNormalizer (0-100)",
    "corpus_size": len(results),
    "spearman_raw_R4": -0.22,
    "spearman_normalized": round(spearman, 4),
    "p_value": round(pval, 6),
    "score_range": [round(min(v1_scores), 2), round(max(v1_scores), 2)],
    "verdict": verdict,
    "conclusion": f"V1 with normalisation: Spearman={spearman:.4f}. {'USABLE as CALC judge' if verdict == 'VALID' else 'NOT usable — GB V1 remains authority' if verdict == 'INVALID' else 'MARGINAL — needs more investigation'}",
    "texts": [{"work": r['work_id'], "tier": r['tier'], "score": round(s, 2)} for r, s in zip(results, v1_scores)]
}

OUT = r"C:\Users\elric\omega-project\docs\irm\R4_V1_NORMALIZED_VALIDATION.json"
with open(OUT, 'w') as f:
    json.dump(output, f, indent=2)
print(f"\nSaved to {OUT}")
```

ATTENTION : Ce script est un SQUELETTE.
La structure de OMEGA_METROLOGIE_EMPIRIQUE_v1.json DOIT être lue d'abord.
Le mapping tiers→works DOIT être adapté au format réel.
Les percentiles de normalisation DOIVENT être extraits correctement.

LIRE les fichiers, COMPRENDRE les structures, ADAPTER le script.


# ═══════════════════════════════════════════════════════════════════════════════
#
#   ██████╗  █████╗ ██████╗ ████████╗    ██████╗
#   ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝    ██╔══██╗
#   ██████╔╝███████║██████╔╝   ██║       ██████╔╝
#   ██╔═══╝ ██╔══██║██╔══██╗   ██║       ██╔══██╗
#   ██║     ██║  ██║██║  ██║   ██║       ██║  ██║
#   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝       ╚═════╝
#
#   ROSETTA BRIDGE — COUPLAGE S1→S2
#   Le module qui traduit la vérité mesurée en directives LLM
#
# ═══════════════════════════════════════════════════════════════════════════════

# ── B-01 : LIRE LES DONNÉES ROSETTA S0 ─────────────────────────────────────

## Fichiers à lire INTÉGRALEMENT (par chunks) :

1. omega-autopsie/results_rosetta/s0/s06_classification_regles.json
   → Classification de chaque feature : SOLIDE / ILLUSION / CONTOURNABLE
   → Instruction gagnante par feature
   → Taux de pilotabilité

2. omega-autopsie/results_rosetta/05_table_rosette.json (730 lignes)
   → Pour chaque type (DESCRIPTION/DIALOGUE/etc), ratio LLM vs classique par feature
   → Status : DIVERGENT / DECALE / ALIGNE

3. omega-autopsie/results_rosetta/08_dictionnaire_omega_llm_v1.json
   → Dictionnaire de traduction OMEGA ↔ LLM

4. omega-autopsie/results_rosetta/s0/s02_bench_pilotables.json
   → Résultats des tests de pilotabilité directe

5. omega-autopsie/results_rosetta/s0/s04_bench_contournables.json
   → Résultats des features contournables

NE RIEN CODER ENCORE. Juste LIRE et COMPRENDRE la structure des données.

# ── B-02 : CONSTRUIRE LA MATRICE DE CLASSIFICATION ─────────────────────────
# Livrable : src/scoring/data/ROSETTA_BRIDGE_MATRIX.json

À partir des données S0, construire UNE SEULE matrice JSON :

```json
{
  "version": "1.0",
  "date": "2026-04-02",
  "source": "Rosetta S0 + table_rosette + dictionnaire",
  "features": {
    "f29d_ttr_score": {
      "name": "Richesse lexicale",
      "category": "PILOTABLE",
      "compliance_rate": 0.80,
      "instruction": "Vocabulaire varié. MÉTRIQUE : ratio types/tokens > 0.75 par fenêtre 100 mots.",
      "instruction_variant": "C",
      "llm_vs_classique": {"DESCRIPTION": 0.97, "DIALOGUE": 1.05},
      "route": "PROMPT_DIRECT"
    },
    "f17_knife_count": {
      "name": "Mots percutants",
      "category": "ILLUSION",
      "compliance_rate": 0.0,
      "instruction": "Le LLM déclare comprendre mais ne modifie pas la feature.",
      "route": "POST_PROCESSING"
    },
    "f26b_long_sent_rate": {
      "name": "Taux phrases longues",
      "category": "INDIRECT",
      "compliance_rate": 0.0,
      "instruction": "Piloté indirectement via sub_per_sentence (L37).",
      "route": "INDIRECT_VIA_L37"
    }
  }
}
```

Catégories possibles (dérivées de S0) :
  PILOTABLE   : taux_pilotabilite > 0.5 ET categorie = "SOLIDE"
  ILLUSION    : categorie = "ILLUSION_DÉCLARATIVE" ou taux_pilotabilite = 0
  INDIRECT    : piloté via une autre feature (ex: f26b via sub L37)
  CONTOURNABLE: piloté par post-processing (semicolons via parser syntaxique)
  IRRÉDUCTIBLE: attracteur BB incompressible (ex: mean_sent plancher 35w)

Pour CHAQUE feature dans s06_classification_regles.json + les features de
la table rosette 05, créer une entrée dans la matrice.

Écrire dans src/scoring/data/ROSETTA_BRIDGE_MATRIX.json


# ── B-03 : CRÉER LE MODULE TypeScript src/coupling/rosetta-bridge.ts ────────

## Structure du répertoire

```
src/coupling/
  ├── rosetta-bridge.ts     ← LE MODULE PRINCIPAL
  ├── types.ts              ← Types du bridge
  └── index.ts              ← Exports publics
```

## Interface TypeScript (le contrat)

```typescript
// src/coupling/types.ts

export type FeatureRoute = 
  | 'PROMPT_DIRECT'      // Injecter dans le prompt V4
  | 'POST_PROCESSING'    // Traiter après génération (semicolons, etc.)
  | 'INDIRECT_VIA_L37'   // Piloté indirectement via sub_per_sentence
  | 'IRRÉDUCTIBLE'       // Attracteur BB — ne pas injecter
  | 'SHADOW'             // Mesurer seulement, pas d'action

export interface FeatureDirective {
  readonly feature: string;
  readonly name: string;
  readonly category: 'PILOTABLE' | 'ILLUSION' | 'INDIRECT' | 'CONTOURNABLE' | 'IRRÉDUCTIBLE';
  readonly route: FeatureRoute;
  readonly instruction: string;        // Instruction calibrée Rosetta S0
  readonly compliance_rate: number;    // 0.0-1.0
  readonly active: boolean;            // Faut-il l'injecter ?
}

export interface RosettaBridgeInput {
  readonly target_features: Record<string, number>;  // feature → valeur cible
  readonly archetype: string;                        // BALANCED/BRUTAL/CATHEDRAL/etc.
  readonly language: 'fr' | 'en';
}

export interface RosettaBridgeOutput {
  readonly prompt_directives: FeatureDirective[];    // Features à injecter dans le prompt
  readonly post_processing: FeatureDirective[];      // Features pour post-processing
  readonly shadow_measures: FeatureDirective[];       // Features à mesurer seulement
  readonly expected_compliance: number;               // 0.0-1.0 global
  readonly total_injectable: number;                  // Nombre de features injectables
  readonly warnings: string[];                        // Alertes (features en conflit, etc.)
}
```

## Module principal (src/coupling/rosetta-bridge.ts)

```typescript
/**
 * OMEGA Rosetta Bridge — Couplage S1→S2
 * Traduit des cibles métriques (features corpus) en directives LLM réalistes.
 *
 * Le bridge NE pilote PAS le LLM directement.
 * Il produit des DIRECTIVES que le prompt assembler peut utiliser.
 *
 * Source de vérité : ROSETTA_BRIDGE_MATRIX.json (dérivé de Rosetta S0)
 *
 * Standard : NASA-Grade L4 / DO-178C Level A
 * Date : 2026-04-02
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { RosettaBridgeInput, RosettaBridgeOutput, FeatureDirective, FeatureRoute } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MATRIX_PATH = resolve(__dirname, '../scoring/data/ROSETTA_BRIDGE_MATRIX.json');

interface MatrixEntry {
  name: string;
  category: string;
  compliance_rate: number;
  instruction: string;
  route: FeatureRoute;
  llm_vs_classique?: Record<string, number>;
}

export class RosettaBridge {
  private matrix: Record<string, MatrixEntry>;

  constructor(matrixPath?: string) {
    const raw = readFileSync(matrixPath ?? MATRIX_PATH, 'utf-8');
    const data = JSON.parse(raw);
    this.matrix = data.features ?? {};
  }

  /**
   * Translate target features into LLM directives.
   * 
   * For each target feature:
   *   PILOTABLE → generate prompt directive with calibrated instruction
   *   ILLUSION  → skip (LLM can't control it)
   *   INDIRECT  → generate indirect directive (e.g., "increase subordination" for f26b)
   *   CONTOURNABLE → route to post-processing
   *   IRRÉDUCTIBLE → skip with warning
   */
  translate(input: RosettaBridgeInput): RosettaBridgeOutput {
    const prompt_directives: FeatureDirective[] = [];
    const post_processing: FeatureDirective[] = [];
    const shadow_measures: FeatureDirective[] = [];
    const warnings: string[] = [];

    for (const [feature, targetValue] of Object.entries(input.target_features)) {
      const entry = this.matrix[feature];
      if (!entry) {
        shadow_measures.push({
          feature, name: feature, category: 'IRRÉDUCTIBLE',
          route: 'SHADOW', instruction: '', compliance_rate: 0, active: false,
        });
        continue;
      }

      const directive: FeatureDirective = {
        feature,
        name: entry.name,
        category: entry.category as FeatureDirective['category'],
        route: entry.route,
        instruction: entry.instruction,
        compliance_rate: entry.compliance_rate,
        active: entry.category === 'PILOTABLE' || entry.category === 'INDIRECT',
      };

      switch (entry.route) {
        case 'PROMPT_DIRECT':
        case 'INDIRECT_VIA_L37':
          prompt_directives.push(directive);
          break;
        case 'POST_PROCESSING':
          post_processing.push(directive);
          break;
        case 'IRRÉDUCTIBLE':
          warnings.push(`${feature}: attracteur BB — cible ${targetValue} ignorée`);
          shadow_measures.push({ ...directive, active: false });
          break;
        default:
          shadow_measures.push({ ...directive, active: false });
      }
    }

    // Sort by compliance rate (most reliable first)
    prompt_directives.sort((a, b) => b.compliance_rate - a.compliance_rate);

    const total_injectable = prompt_directives.length;
    const expected_compliance = total_injectable > 0
      ? prompt_directives.reduce((sum, d) => sum + d.compliance_rate, 0) / total_injectable
      : 0;

    return {
      prompt_directives,
      post_processing,
      shadow_measures,
      expected_compliance,
      total_injectable,
      warnings,
    };
  }

  /** Returns the full matrix for inspection. */
  getMatrix(): Record<string, MatrixEntry> {
    return { ...this.matrix };
  }

  /** Returns features by category. */
  getByCategory(category: string): string[] {
    return Object.entries(this.matrix)
      .filter(([_, e]) => e.category === category)
      .map(([feat]) => feat);
  }
}
```

NOTE : Ce code est un MODÈLE. Claude Code doit l'ADAPTER en fonction de :
  - La structure réelle du ROSETTA_BRIDGE_MATRIX.json (produit en B-02)
  - Les imports nécessaires
  - Les conventions du projet (ESM, .js extensions, etc.)


# ── B-04 : TESTS DU ROSETTA BRIDGE ─────────────────────────────────────────

Créer tests/coupling/rosetta-bridge.test.ts avec au minimum :

```typescript
import { describe, it, expect } from 'vitest';
import { RosettaBridge } from '../../src/coupling/rosetta-bridge.js';

describe('RosettaBridge', () => {
  const bridge = new RosettaBridge();

  it('should load the matrix', () => {
    const matrix = bridge.getMatrix();
    expect(Object.keys(matrix).length).toBeGreaterThan(5);
  });

  it('should classify PILOTABLE features as PROMPT_DIRECT', () => {
    const pilotables = bridge.getByCategory('PILOTABLE');
    expect(pilotables.length).toBeGreaterThan(0);
    // f29d_ttr_score est SOLIDE dans S0
    expect(pilotables).toContain('f29d_ttr_score');
  });

  it('should translate target features into directives', () => {
    const result = bridge.translate({
      target_features: {
        'f29d_ttr_score': 0.75,
        'f17_knife_count': 5,
        'f26b_long_sent_rate': 0.15,
      },
      archetype: 'BALANCED',
      language: 'fr',
    });

    expect(result.prompt_directives.length).toBeGreaterThan(0);
    expect(result.expected_compliance).toBeGreaterThan(0);
    expect(result.total_injectable).toBeGreaterThan(0);
  });

  it('should route ILLUSION features to shadow', () => {
    const result = bridge.translate({
      target_features: { 'f17_knife_count': 5 },
      archetype: 'BALANCED',
      language: 'fr',
    });

    // f17 est ILLUSION dans S0 → ne doit PAS être dans prompt_directives
    const inPrompt = result.prompt_directives.find(d => d.feature === 'f17_knife_count');
    expect(inPrompt).toBeUndefined();
  });

  it('should warn on IRRÉDUCTIBLE features', () => {
    const result = bridge.translate({
      target_features: { 'f1_mean': 18 }, // sous le plancher BB-02
      archetype: 'BALANCED',
      language: 'fr',
    });

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should sort prompt_directives by compliance rate', () => {
    const result = bridge.translate({
      target_features: {
        'f29d_ttr_score': 0.75,
        'f24e_contrast_score': 0.5,
        'f15b_redundancy_compression': 0.9,
      },
      archetype: 'BALANCED',
      language: 'fr',
    });

    for (let i = 1; i < result.prompt_directives.length; i++) {
      expect(result.prompt_directives[i - 1].compliance_rate)
        .toBeGreaterThanOrEqual(result.prompt_directives[i].compliance_rate);
    }
  });
});
```

ADAPTER les noms de features selon ce qui est réellement dans la matrice.
Les tests doivent PASSER avec les données réelles.

# ── B-05 : DOCUMENTATION D'INTÉGRATION ─────────────────────────────────────
# Livrable : docs/irm/R4_ROSETTA_BRIDGE_REPORT.md

Produire un rapport documentant :

```markdown
# Rosetta Bridge — Rapport d'Intégration

## Architecture
  src/coupling/rosetta-bridge.ts → traduit target_features en directives
  src/scoring/data/ROSETTA_BRIDGE_MATRIX.json → matrice de classification

## Statistiques de la matrice
  Total features classifiées : N
  PILOTABLE (PROMPT_DIRECT) : N
  ILLUSION (route SHADOW) : N
  INDIRECT (route INDIRECT_VIA_L37) : N
  CONTOURNABLE (POST_PROCESSING) : N
  IRRÉDUCTIBLE : N

## Top 10 features PILOTABLE (par compliance_rate)
  1. f15b_redundancy_compression → 100% compliance
  2. f24e_contrast_score → 100% compliance
  3. ...

## Comment l'utiliser dans le pipeline
  Le Rosetta Bridge ne modifie PAS engine.ts.
  Il est prévu pour être appelé par le futur prompt-assembler-v5 :
  1. ForgePacket → extraire les target_features
  2. RosettaBridge.translate(targets) → directives
  3. prompt-assembler-v5 injecte les directives calibrées dans le prompt

## Prochaine étape
  Intégrer le bridge dans le pipeline (Phase P2-03).
  Le bridge est en mode SHADOW : il produit des directives mais
  ne les injecte pas encore. L'injection sera activée quand le
  prompt-assembler-v5 sera prêt.
```


# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT INTERMÉDIAIRE (après Part A) + COMMIT FINAL (après Part B)
# ═══════════════════════════════════════════════════════════════════════════════

## Après PART A :
```powershell
Set-Location C:\Users\elric\omega-project
git add docs/irm/R4_V1_NORMALIZED_VALIDATION.json
git commit -m "docs(r4): V1 scorer normalized validation — Spearman [X.XX]"
```

## Tests avant Part B :
```powershell
cd packages\sovereign-engine; npx vitest run
```

## Après PART B :
```powershell
Set-Location C:\Users\elric\omega-project
git add -A
git commit -m "feat(coupling): Rosetta Bridge v1 — couplage S1→S2

PART A: V1 scorer avec normalisation R1 → Spearman [X.XX]
PART B: Module coupling/rosetta-bridge.ts
  - ROSETTA_BRIDGE_MATRIX.json : N features classifiées
  - rosetta-bridge.ts : translate(target_features) → directives
  - types.ts : interfaces RosettaBridgeInput/Output
  - tests: N tests passing
  - R4_ROSETTA_BRIDGE_REPORT.md : documentation intégration

Tests: 2022+ passed, 0 failed"

git tag omega-rosetta-bridge-v1
git push origin phase-r-metrology-rebuild --tags
```

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKLIST FINALE — 12 CONTRÔLES
# ═══════════════════════════════════════════════════════════════════════════════

## PART A
[ ] 1. R4_V1_NORMALIZED_VALIDATION.json produit
[ ] 2. Spearman V1 normalisé mesuré et documenté
[ ] 3. Verdict V1 : VALID / WEAK / INVALID
[ ] 4. Conclusion : qui fait autorité CALC (V1 normalisé ou GB V1)

## PART B
[ ] 5. ROSETTA_BRIDGE_MATRIX.json produit (N features classifiées)
[ ] 6. src/coupling/rosetta-bridge.ts créé
[ ] 7. src/coupling/types.ts créé
[ ] 8. src/coupling/index.ts créé
[ ] 9. tests/coupling/rosetta-bridge.test.ts créé et PASSING
[ ] 10. R4_ROSETTA_BRIDGE_REPORT.md produit
[ ] 11. Tests totaux ≥ 2022, 0 FAIL
[ ] 12. Tag omega-rosetta-bridge-v1 pushé

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLE D'OR — AUTONOMIE TOTALE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Francky fait la sieste. Claude Code exécute TOUT seul.
#
# Si un fichier n'a pas le format attendu → ADAPTER le code.
# Si une donnée manque → documenter [ABSENT] et continuer.
# Si un test échoue → fixer ou documenter [FAIL + raison].
# Si un script Python plante → lire l'erreur, corriger, relancer.
# Si doute sur une modification CODE → [DOUTE], ne pas modifier.
#
# Les livrables MESURE (Part A) sont prioritaires sur le CODE (Part B).
# Si Part A prend plus de temps que prévu → la terminer quand même.
# Si Part B ne peut pas être terminée → produire au minimum la matrice JSON.
#
# L'ordre est : A-01 → A-02 → commit A → B-01 → B-02 → B-03 → B-04 → B-05 → commit B
#
# "Ce qui n'est pas mesuré n'est pas acceptable."
# "Mieux vaut ne rien toucher que casser quelque chose."
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Autorité : Francky (Architecte Suprême)
# Francky reviendra de sa sieste et trouvera les résultats dans docs/irm/
# ═══════════════════════════════════════════════════════════════════════════════
