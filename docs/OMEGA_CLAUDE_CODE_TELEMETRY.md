# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : TÉLÉMÉTRIE PIPELINE COMPLÈTE
# Mesurer TOUT ce qui bouge à CHAQUE étape — zéro boîte noire
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 2004 PASS
#
# EXIGENCE ARCHITECTE (non négociable) :
#   "On fait des maths et de la physique, pas de la voyance.
#    Chaque action doit être comprise et mesurée."
#
# PROBLÈME ACTUEL :
# Le pipeline produit un score final mais on ne voit PAS :
#   - Les features du draft chunké (2300w)
#   - Les features de chaque candidat Duel (4 candidats, tailles différentes)
#   - L'état avant/après MicroSurgery
#   - Le vecteur 14D réel vs cible par quartile
#   - La taille exacte à chaque étape
#   - Les raisons de sélection/rejet détaillées
#
# DÉCOUVERTE CRITIQUE :
# Le Duel compare des textes de tailles RADICALEMENT différentes :
#   - loop_refined = draft chunké complet (~2300w)
#   - 3 modes single-shot = ~400-620w chacun
# On compare des pommes et des oranges avec le même scorer.
# La télémétrie doit exposer cette asymétrie.
# ═══════════════════════════════════════════════════════════════════════════════

## MISSION : Créer un système de télémétrie injectable dans le pipeline

### Architecture

Créer `src/telemetry/pipeline-telemetry.ts`

Le module doit être un SINGLETON qui collecte les snapshots à chaque
étape du pipeline et les exporte en JSON à la fin du run.

```typescript
export interface TelemetrySnapshot {
  readonly stage: string;          // ex: "CHUNKED_DRAFT", "DUEL_CANDIDATE_0", "MICROSURGERY_POST"
  readonly timestamp: number;      // Date.now()
  readonly words: number;
  readonly prose_hash: string;     // SHA-256 tronqué (16 chars)

  // Features de texte (les plus discriminantes)
  readonly features: {
    f1_mean_sent_len: number;      // Longueur moyenne des phrases
    f1a_rhythm_variance: number;   // Variance rythmique
    f26b_long_sent_rate: number;   // % phrases > 40 mots
    cv_sent: number;               // CV des longueurs de phrases
    cv_para: number;               // CV des longueurs de paragraphes
    f17_knife_count: number;       // Phrases < 10 mots
    f19a_approx_entropy: number;   // Entropie
    paragraph_count: number;       // Nombre de paragraphes
  };

  // Scores MacroSScore (si disponibles à cette étape)
  readonly scores?: {
    composite: number;
    min_axis: number;
    ECC: number;
    RCI: number;
    SII: number;
    IFI: number;
    AAI: number;
  };

  // Vecteur émotionnel 14D (si disponible)
  readonly emotion_14d?: {
    quartile: number;              // 0-3
    target: Record<string, number>;  // Prescrit
    actual: Record<string, number>;  // Mesuré
    cosine_similarity: number;
  }[];

  // Détails spécifiques à l'étape
  readonly details?: Record<string, unknown>;
}

export interface TelemetryReport {
  readonly scene: string;
  readonly attempt: number;
  readonly snapshots: TelemetrySnapshot[];
  readonly summary: {
    total_stages: number;
    total_api_calls: number;
    duration_ms: number;
    winner_stage: string;           // Quelle étape a produit le winner
    winner_words: number;
    delta_draft_to_winner: {        // Différence entre draft et winner
      words: number;                // ex: -1800 si single-shot vs draft
      delta_cv: number;
      delta_mean_sent: number;
      delta_composite: number;
    };
  };
}
```

### Les 7 points de mesure obligatoires

Le télémètre doit capturer un snapshot à CHAQUE point suivant :

#### 1. POST-CHUNKED-DRAFT (après génération des 4 chunks)

Point d'injection : dans `runSovereignForgeWithPacket()` ou équivalent,
juste après que les 4 chunks sont assemblés en un seul texte.

Capturer :
- Texte complet (~2300w)
- Taille de chaque chunk (array [c1, c2, c3, c4])
- Features de texte (f1_mean, f1a, f26b, CV, etc.)
- PAS de score MacroSScore ici (trop coûteux en API pour le draft)

#### 2. PRE-DUEL (pour chaque candidat, AVANT le scoring MacroSScore)

Point d'injection : dans `runDuel()`, juste après que chaque candidat
est généré (loop_refined + 3 single-shot).

Capturer pour CHAQUE candidat :
- Mode (loop_refined / tranchant / sensoriel / experimental)
- Taille (words)
- CV calculé par CV_GATE
- Features de texte
- Rejeté par CV_GATE ? (oui/non, valeur CV, seuil)

#### 3. POST-DUEL (le winner sélectionné)

Point d'injection : dans `runDuel()`, après sélection du winner.

Capturer :
- Candidat winner (mode, index)
- Ses scores MacroSScore complets (composite, tous les axes)
- Ses sub-scores détaillés (tension_14d, necessity, rhythm, etc.)
- Le vecteur 14D réel vs cible PAR QUARTILE
- selection_score et raison de sélection
- TOUS les candidats rejetés avec leurs scores (pour comparaison)

#### 4. PRE-MICROSURGERY (état avant interventions)

Point d'injection : dans le MicroSurgeon, avant la première intervention.

Capturer :
- Texte winner (même que POST-DUEL, mais c'est le point de contrôle)
- Diagnostic émotionnel par quartile (similarity %)
- Hooks manquants (count/total)
- Interventions planifiées (count, types)

#### 5. POST-MICROSURGERY (état après interventions)

Point d'injection : dans le MicroSurgeon, après toutes les interventions.

Capturer :
- Texte modifié
- Delta features vs PRE-MICROSURGERY
- Interventions appliquées vs rejetées (count, raisons DAMAGE-GATE)
- Delta scores si re-scoré (optionnel — coûteux en API)

#### 6. POST-SCORING-FINAL (le score définitif)

Point d'injection : après le MacroSScore final dans le pipeline.

Capturer :
- Scores finaux (composite, axes, sub-scores)
- Vecteur 14D final par quartile
- GB V1
- Features de texte finales
- SAGA_READY : oui/non

#### 7. DELTA-SUMMARY (calculé automatiquement)

Pas un point d'injection — calculé à partir des snapshots 1 et 6.

Calculer :
- Δwords (draft → final) — CRITIQUE : expose l'asymétrie de taille
- Δcv (draft → final)
- Δmean_sent (draft → final)
- Δf26b (draft → final)
- Δcomposite (si score disponible aux deux étapes)

### Comment l'injecter dans le pipeline SANS le casser

RÈGLE ABSOLUE : Le télémètre est un OBSERVATEUR PUR. Il ne modifie
AUCUNE donnée, AUCUN score, AUCUNE décision du pipeline.

Approche recommandée : un singleton global avec méthode `record()` :

```typescript
class PipelineTelemetry {
  private snapshots: TelemetrySnapshot[] = [];
  private startTime: number = 0;

  start(scene: string, attempt: number): void {
    this.snapshots = [];
    this.startTime = Date.now();
  }

  record(snapshot: TelemetrySnapshot): void {
    this.snapshots.push(snapshot);
  }

  export(): TelemetryReport { ... }
  
  reset(): void { ... }
}

export const telemetry = new PipelineTelemetry();
```

Puis dans chaque module du pipeline, ajouter UN appel :
```typescript
import { telemetry } from '../telemetry/pipeline-telemetry.js';

// Dans chunked-generator.ts, après assemblage :
telemetry.record({
  stage: 'CHUNKED_DRAFT',
  timestamp: Date.now(),
  words: countWords(fullDraft),
  prose_hash: sha256(fullDraft).slice(0, 16),
  features: computeQuickFeatures(fullDraft),
  details: { chunks: [c1.length, c2.length, c3.length, c4.length] },
});
```

### La fonction computeQuickFeatures

Créer une version LÉGÈRE du calcul de features (pas le GB V1 complet) :

```typescript
function computeQuickFeatures(prose: string): TelemetrySnapshot['features'] {
  const sentences = prose.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const wordCounts = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  const paragraphs = prose.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paraWordCounts = paragraphs.map(p => p.split(/\s+/).filter(w => w.length > 0).length);
  
  const mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const variance = wordCounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / wordCounts.length;
  const cv_sent = mean > 0 ? Math.sqrt(variance) / mean : 0;
  
  const paraMean = paraWordCounts.reduce((a, b) => a + b, 0) / paraWordCounts.length;
  const paraVar = paraWordCounts.reduce((s, v) => s + Math.pow(v - paraMean, 2), 0) / paraWordCounts.length;
  const cv_para = paraMean > 0 ? Math.sqrt(paraVar) / paraMean : 0;
  
  return {
    f1_mean_sent_len: mean,
    f1a_rhythm_variance: variance,
    f26b_long_sent_rate: wordCounts.filter(w => w > 40).length / wordCounts.length,
    cv_sent,
    cv_para,
    f17_knife_count: wordCounts.filter(w => w < 10).length,
    f19a_approx_entropy: 0, // Simplification — l'entropie exacte est coûteuse
    paragraph_count: paragraphs.length,
  };
}
```

### Script de test avec télémétrie

Créer `scripts/test-telemetry-1brick.ts` qui :

1. Lance UNE SEULE brique (Contemplation) avec télémétrie activée
2. Exporte le rapport JSON complet
3. Affiche un résumé lisible :

```
═══════════════════════════════════════════════════════════════════════
  OMEGA — TÉLÉMÉTRIE : Contemplation (1 run)
═══════════════════════════════════════════════════════════════════════

  ÉTAPE               Words   Mean   CV_s   f26b   Comp   min
  ─────────────────────────────────────────────────────────────
  CHUNKED_DRAFT        2326   38.2   0.81   0.52   —      —
  DUEL_loop_refined    2326   38.2   0.81   0.52   90.0   82.4
  DUEL_tranchant        489   22.1   0.88   0.12   92.3   85.5
  DUEL_sensoriel        512   31.4   0.80   0.35   93.0   88.4  ← WINNER
  DUEL_experimental     478   25.3   1.01   0.18   92.4   84.5
  PRE_MICROSURGERY      512   31.4   0.80   0.35   93.0   88.4
  POST_MICROSURGERY     512   31.5   0.80   0.35   —      —
  FINAL                 475   31.5   0.80   0.35   93.2   88.4

  DELTA DRAFT→FINAL:
    Δwords = -1851 (draft 2326w → final 475w)
    Δmean  = -6.7 (38.2 → 31.5)
    Δcv    = -0.01 (0.81 → 0.80)
    Δf26b  = -0.17 (0.52 → 0.35)

  EMOTION 14D PAR QUARTILE:
    Q0: target=sadness(0.7) actual=sadness(0.45) sim=65.2%
    Q1: target=sadness(0.8) actual=sadness(0.72) sim=88.9%
    Q2: target=sadness(0.6) actual=fear(0.31)    sim=42.1%
    Q3: target=sadness(0.5) actual=sadness(0.38) sim=73.8%

  MICROSURGERY:
    Interventions planifiées: 3 (2 tension + 1 hook)
    Appliquées: 3 | Rejetées: 0
    Raisons rejet: —
═══════════════════════════════════════════════════════════════════════
```

Budget : ~16 API calls (1 brique, 1 tentative)

### EXPORT : Le rapport doit aussi être sauvegardé en JSON

Sauvegarder dans `sessions/TELEMETRY_[date]/telemetry_[scene].json`

### Points d'injection dans les fichiers existants

Les fichiers à modifier (AJOUT SEULEMENT — pas de modification de logique) :

1. `src/generation/chunked-generator.ts` → snapshot CHUNKED_DRAFT
2. `src/duel/duel-engine.ts` → snapshots DUEL_CANDIDATE_* + DUEL_WINNER
3. `src/microsurgery/micro-surgeon.ts` → snapshots PRE/POST_MICROSURGERY
4. `src/oracle/macro-axes.ts` ou `s-oracle-v2.ts` → snapshot FINAL
5. `src/oracle/axes/tension-14d.ts` → capturer le vecteur 14D réel vs cible

Pour tension_14d, le vecteur 14D est DÉJÀ calculé dans `scoreTension14D()`.
Il suffit d'exposer les `similarities[]` et les `actualState`/`targetState`
par quartile via le télémètre.

### CE QUI COMPTE LE PLUS (demande Architecte)

L'Architecte veut comprendre :
1. **Comment chaque feature change entre les étapes** → le delta-summary
2. **Comment le 14D est calculé et quelles features l'influencent** → le vecteur 14D par quartile
3. **Si les juges comprennent l'utilité d'une feature dans la formule** → les sub-scores détaillés
4. **L'asymétrie de taille entre candidats Duel** → les words par candidat

## VÉRIFICATION

1. `npm test` → 2004+ PASS
2. Le télémètre est un observateur PUR — ne modifie RIEN
3. Le script test-telemetry-1brick.ts produit un rapport lisible + JSON
4. Le JSON contient les 7 snapshots complets

## COMMIT

```
feat(telemetry): pipeline-telemetry — observabilité complète à chaque étape

7 points de mesure : CHUNKED_DRAFT, DUEL×4, PRE/POST_MICROSURGERY, FINAL
Chaque snapshot : words, features, scores, vecteur 14D, hash
Delta-summary : différence draft→final (expose asymétrie taille Duel)

Observateur PUR : ne modifie AUCUNE donnée, score, ou décision.
Export JSON + rapport lisible en console.

Demande Architecte: "On fait des maths et de la physique, pas de la voyance."
```

## CE QUI NE DOIT PAS CHANGER

- AUCUNE logique de pipeline (génération, Duel, MicroSurgery, scoring)
- AUCUN poids, seuil, formule
- AUCUN juge
- Le télémètre OBSERVE, il ne DÉCIDE pas
