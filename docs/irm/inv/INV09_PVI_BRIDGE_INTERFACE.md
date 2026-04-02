# INV-09 : PVI BRIDGE INTERFACE
**Date** : 2026-04-02 | **Source** : scripts/pvi/pvi_module_autonome.py (lect. manuelle)

---

## VARIABLES PVI EXTRAITES (8 variables + 4 dérivées)

| Variable | Nom complet | Source | Formule/Extraction |
|----------|-------------|--------|-------------------|
| FL | Fluidity Level | pvi_nlp_scorer.extract_FL() | Ratio subordination + complexité syntaxique |
| MS | Monotonie Structurelle | pvi_nlp_scorer.extract_MS() | Mesure de régularité/répétition |
| LP | Lexical Precision | pvi_nlp_scorer.extract_LP() | Richesse et précision lexicale |
| DR | Dialogue Ratio | pvi_nlp_scorer.extract_DR() | Ratio dialogue dans le texte |
| S | Sensory local | pvi_nlp_scorer.extract_S_local() | Densité sensorielle locale |
| I | Intention proxy | pvi_nlp_scorer.extract_I_proxy_v2() | Proxy d'intentionnalité narrative (levier dominant 88% du delta) |
| T | Tension proxy | pvi_nlp_scorer.extract_T_v3() | v3: sensoriel+situationnel+relationnel+narratif |
| Omega | Résolution narrative | Mode assisté (questions) ou estimation | 4 questions structurelles (0-1) |
| U | Unicité | Mode assisté | Protagoniste distinguable en 10 mots (0-1) |

## FORMULES EXACTES (pvi_module_autonome.py:119-137)

```python
E_emo = 0.40 * I + 0.28 * T_proxy + 0.17 * S + 0.15 * I * T_proxy
E_cog = 0.40 * FL + 0.25 * FL * (1 - MS) + 0.20 * DR + 0.15 * LP
CE    = E_emo / E_cog  # Cognitive-Emotional ratio

Arc_rev = 0.50 (n_rev<2) | 1.00 (n_rev<=3) | 1.20 (n_rev>3)

R_exp = 1.2 * T_proxy + 1.5 * I + 1.0 * Arc_rev - 2.5
R     = sigmoid(R_exp)

W_exp = 1.8 * I + 2.0 * Omega + 0.8 * U - 2.8
W     = sigmoid(W_exp)

penalty = max(0, 1 - 2.0 * FL * (1 - Omega))
PVI     = CE * Arc_rev * R * W * penalty
SP      = PVI * 20  # Sales Potential
```

## FORMAT D'ENTRÉE

```
--input : chemin vers epub/txt
--lang  : 'fr' | 'en'
--assisted : mode interactif (questions Omega + U)
```

Le module charge le texte, extrait des fenêtres, calcule les features NLP via pvi_nlp_scorer.py,
puis applique les coefficients culturels depuis `coefficients_v2_FR.json` / `coefficients_v2_EN.json`.

## FORMAT DE SORTIE

```json
{
  "I": 0.xxxx, "T_proxy": 0.xxxx, "FL": 0.xxxx, "MS": 0.xxxx,
  "LP": 0.xxxx, "DR": 0.xxxx, "S_local": 0.xxxx,
  "Omega": 0.xxxx, "U": 0.xxxx, "N_rev": N,
  "E_emo": 0.xxxx, "E_cog": 0.xxxx, "CE": 0.xxxx,
  "Arc_rev": 0.xx, "R": 0.xxxx, "W": 0.xxxx,
  "PVI": 0.xxxx, "SP": 0.xx
}
```

## INTERFACE TYPESCRIPT PROPOSÉE

### PVIBridgeInput

```typescript
export interface PVIBridgeInput {
  /** Path to the prose text file or raw text content */
  readonly prose: string;
  /** Input type */
  readonly input_type: 'path' | 'text';
  /** Language */
  readonly language: 'fr' | 'en';
  /** Number of revisions (for Arc_rev calculation) */
  readonly n_revisions?: number;  // default: 1
  /** Omega score if pre-computed (0-1). If absent, defaults to 0.5 */
  readonly omega?: number;
  /** Uniqueness score if pre-computed (0-1). If absent, defaults to 0.5 */
  readonly u?: number;
}
```

### PVIBridgeOutput

```typescript
export interface PVIBridgeOutput {
  /** Raw PVI score */
  readonly pvi_score: number;
  /** Sales Potential = PVI × 20 */
  readonly sales_potential: number;
  /** All 8 base variables */
  readonly variables: {
    readonly FL: number;
    readonly MS: number;
    readonly LP: number;
    readonly DR: number;
    readonly S_local: number;
    readonly I: number;
    readonly T_proxy: number;
    readonly Omega: number;
    readonly U: number;
  };
  /** Derived scores */
  readonly derived: {
    readonly E_emo: number;
    readonly E_cog: number;
    readonly CE: number;
    readonly Arc_rev: number;
    readonly R: number;
    readonly W: number;
  };
  /** Zone OMEGA qualification */
  readonly zone_omega: boolean;  // pvi >= 1.59 AND quality_composite >= 87
  readonly distance_to_zone: number;
  /** Dominant lever for improvement */
  readonly dominant_lever: string;  // "I" (88% du delta)
}
```

### Architecture proposée

**Option A : Bridge Python via child_process** (recommandé pour phase initiale)
```
src/coupling/pvi-bridge.ts
  → Appelle Python311 pvi_module_autonome.py --input <temp_file> --lang <lang> --json
  → Parse stdout JSON → PVIBridgeOutput
```

**Option B : Réécriture TypeScript** (recommandé pour production)
```
Les formules (E_emo, E_cog, CE, R, W, PVI) sont arithmétiques simples (sigmoid, ratio).
La partie COMPLEXE est l'extraction NLP (extract_FL, extract_I, extract_T) qui dépend de spaCy.
→ Les features NLP pourraient être calculées par text-features.ts + depth-features.ts
→ Mapping : FL ≈ f_subordination_depth, DR ≈ dialogue_ratio, etc.
```

**Mapping features existantes → PVI variables :**

| PVI variable | Candidate feature existante | Qualité du proxy |
|-------------|---------------------------|-----------------|
| FL | f_subordination_depth + f_clause_per_sentence | BON |
| MS | f33* (repetition features) | PARTIEL |
| LP | f29d_ttr_score + f16a_bigram_rarity | BON |
| DR | dialogue_ratio (dans text-features) | EXACT |
| S | f25a_description + sensory count | BON |
| I | interiority axis (LLM) | PARTIEL (LLM vs CALC) |
| T | tension_14d axis | BON |

---

*repo_live_confirmed: true — pvi_module_autonome.py lu manuellement (160 lignes)*
