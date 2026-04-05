# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : AUDIT & RECALIBRATION DU JUGE NECESSITY
# Le juge LLM confond prose littéraire dense avec du remplissage
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 1984 PASS
#
# DIAGNOSTIC PROUVÉ :
# V-ATOMIC v3 : Necessity est le sous-score le plus bas dans 4/5 briques
# Rescoring 3 variantes SII : augmenter le poids de NEC EMPIRE le score
# Conclusion : le juge Necessity est trop sévère, pas les poids
#
# Le prompt actuel (INV-JUDGE-NECESSITY-01 dans anthropic-provider.ts)
# utilise 5 critères calibrés pour de la prose utilitaire :
#   ECONOMY: "no filler, every word earns its place"
#   DENSITY: "compressed storytelling"
#   BEAT_COVERAGE: mécanique
#   GOAL_ADVANCE: calibré action, pas intériorité
#   Tout en ANGLAIS pour juger du FRANÇAIS
#
# PROBLÈME : La respiration littéraire, la dilatation temporelle,
# la construction sensorielle sont classées comme "filler".
# Flaubert obtiendrait ~65-70 avec ce prompt.
# ═══════════════════════════════════════════════════════════════════════════════

## ÉTAPE 1 — MODIFIER LE PROMPT DU JUGE NECESSITY

### Fichier : `src/runtime/anthropic-provider.ts`

Trouver la méthode `scoreNecessity` (autour de la ligne 218).

Remplacer le `systemPrompt` ET le `userPrompt` par les versions ci-dessous.

### NOUVEAU PROMPT (en français, calibré littéraire)

```typescript
async scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number> {
  // INV-JUDGE-NECESSITY-02: Literary-calibrated necessity scoring.
  // V1 (INV-JUDGE-NECESSITY-01) used utilitarian criteria:
  //   "no filler", "compressed storytelling", "every word earns its place"
  // This penalized literary respiration, sensory construction, temporal dilation.
  // Result: NEC=54-75 on dense literary prose (Flaubert would score ~65).
  //
  // V2 recalibrates for literary prose:
  //   - Respiration and atmosphere ARE necessary
  //   - Sensory density IS information
  //   - Temporal dilation IS compressed (emotionally, not factually)
  //   - Prompt in French (matching the prose language)
  //   - Reference: Flaubert/Proust/Duras = 90+ in necessity
  const systemPrompt = `Tu es un évaluateur littéraire expert en prose française. Tu évalues la NÉCESSITÉ NARRATIVE : chaque phrase sert-elle la scène ?

IMPORTANT — En littérature, la nécessité n'est PAS la concision utilitaire.
Sont NÉCESSAIRES :
- La construction d'atmosphère (lumière, sons, odeurs, textures)
- La respiration narrative (ralentissements qui créent la tension ou l'émotion)
- La dilatation temporelle (une seconde qui dure un paragraphe = densité émotionnelle)
- Les échos intérieurs (pensées, sensations, mémoire involontaire)
- Le silence narratif (ce qui n'est pas dit mais est montré par le corps)

N'est PAS nécessaire :
- La redite (même information reformulée)
- Le remplissage décoratif sans ancrage émotionnel ou sensoriel
- Les transitions mécaniques ("Puis il...", "Ensuite elle...")
- Les explications de ce qui est déjà montré
- Les descriptions qui ne servent ni l'atmosphère ni l'émotion

Référence de calibration : un passage de Madame Bovary (Flaubert) ou de L'Amant (Duras) où chaque phrase construit l'atmosphère doit obtenir 85-95.

Évalue ces 5 critères de 0 à 100 :
1. JUSTESSE : Chaque phrase apporte quelque chose (émotion, sensation, tension, image) — pas de redite
2. COUVERTURE : Les beats narratifs de la scène sont traités (${beat_count} beats attendus)
3. DENSITÉ_LITTÉRAIRE : Haute densité sensorielle et émotionnelle par phrase (pas informationnelle)
4. PROGRESSION : La scène avance (en tension, en émotion, en compréhension) — même si l'intrigue ne bouge pas
5. IRRÉDUCTIBILITÉ : Retirer une phrase abîmerait le tissu narratif

Format de sortie (strictement) :
JUSTESSE: [score]
COUVERTURE: [score]
DENSITÉ_LITTÉRAIRE: [score]
PROGRESSION: [score]
IRRÉDUCTIBILITÉ: [score]
NECESSITY: [moyenne]`;

  const contextLines: string[] = [`Nombre de beats: ${beat_count}`];
  if (scene_goal) contextLines.push(`Objectif de la scène: ${scene_goal}`);
  if (conflict_type) contextLines.push(`Type de conflit: ${conflict_type}`);
  if (beat_actions) contextLines.push(`Actions des beats: ${beat_actions}`);
  const userPrompt = `Évalue la nécessité narrative de cette prose littéraire française.\n${contextLines.join('\n')}\n\nProse :\n${prose}`;

  const necessityConfig = { ...config, judgeMaxTokens: 300 };
  const response = callClaudeSync(systemPrompt, userPrompt, necessityConfig, config.judgeStable);
  return extractScore(response);
},
```

### CE QUI CHANGE

| Aspect | Avant (V1) | Après (V2) |
|---|---|---|
| Langue | Anglais | **Français** |
| ECONOMY | "no filler, every word earns its place" | **JUSTESSE : chaque phrase apporte émotion/sensation/tension** |
| DENSITY | "compressed storytelling" | **DENSITÉ_LITTÉRAIRE : sensorielle et émotionnelle** |
| GOAL_ADVANCE | "actively advanced" | **PROGRESSION : en tension, émotion, compréhension** |
| Calibration | Aucune | **Flaubert/Duras = 85-95** |
| Liste de ce qui EST nécessaire | Absente | **Atmosphère, respiration, dilatation, échos** |
| Liste de ce qui N'EST PAS nécessaire | Absente | **Redite, remplissage, transitions mécaniques** |

### CE QUI NE CHANGE PAS

- Le nombre de critères (5)
- Le format de sortie (nom: score sur chaque ligne, moyenne à la fin)
- La fonction `extractScore` (parse le dernier nombre)
- Le `judgeMaxTokens` (300)
- Le `judgeStable` (temperature stable)

---

## ÉTAPE 2 — SCRIPT DE CALIBRATION SUR LES MAÎTRES

### Créer `scripts/audit-necessity-judge.ts`

Ce script évalue le juge Necessity sur 3 passages de maîtres
+ les 5 briques V-ATOMIC v3 + le run canonique (92.3).

Le but : vérifier que les maîtres obtiennent 85+ avec le nouveau prompt.

```typescript
// Structure du script :

// 1. PASSAGES MAÎTRES (extraits déjà disponibles dans le repo)
// Charger les textes depuis :
//   - omega-autopsie/scenes_v5/flaubert/Madame_Bovary_APEX.txt
//   - omega-autopsie/scenes_v5/flaubert/Madame_Bovary_NEUTRE.txt  
//   - sessions/VATOMIC_2026-03-25T21-13-08/brick_contemplation.txt
//   - sessions/VATOMIC_2026-03-25T21-13-08/brick_souvenir.txt
//   - sessions/VATOMIC_2026-03-25T21-13-08/brick_revelation.txt
//   - sessions/VRECAL1_ENGINE_2026-03-25T11-54-28/prose.txt (run canonique)

// Si les fichiers scenes_v5 n'existent pas, utiliser les extraits de results_v4.
// Alternative: utiliser les textes des briques V-ATOMIC (déjà des sessions/)

// 2. Pour chaque texte, appeler provider.scoreNecessity() avec un ForgePacket minimal
// (beat_count=4, scene_goal="scène littéraire", conflict_type="internal")

// 3. Afficher les résultats en tableau :
// Source          | Words | NEC_score | Verdict
// Bovary APEX     | 687   | XX        | PASS/FAIL (cible: ≥85)
// Bovary NEUTRE   | 661   | XX        | PASS/FAIL (cible: ≥80)
// V3 Contemplation| 489   | XX        | compare vs 75 (ancien)
// V3 Souvenir     | 492   | XX        | compare vs 83 (ancien)
// V3 Révélation   | 465   | XX        | compare vs 81 (ancien)
// Run canonique   | 470   | XX        | compare vs score original

// 4. Budget : 6-8 API calls (1 par texte évalué)
```

IMPORTANT : Ce script DOIT utiliser le vrai provider Anthropic (pas un dummy).
Il faut que ANTHROPIC_API_KEY soit disponible dans l'env.

Le script doit :
1. Construire un AnthropicProvider avec la config standard
2. Appeler scoreNecessity sur chaque texte
3. Afficher le score brut + les 5 sous-critères si possible (capturer la réponse complète)

Pour capturer les sous-critères, modifier temporairement le return pour loguer
la réponse complète avant d'extraire le score. Ou mieux : parser les 5 lignes
de la réponse LLM.

### Format de sortie attendu

```
═══════════════════════════════════════════════════════════════════════
  OMEGA — AUDIT DU JUGE NECESSITY V2 (calibration littéraire)
═══════════════════════════════════════════════════════════════════════

  Source              Words  JUSTESSE  COUVERT  DENSITÉ  PROGRESS  IRREDUC  NEC
  ---------------------------------------------------------------------------
  Bovary APEX          687       XX       XX       XX       XX       XX    XX
  Bovary NEUTRE        661       XX       XX       XX       XX       XX    XX
  V3 Contemplation     489       XX       XX       XX       XX       XX    XX
  V3 Souvenir          492       XX       XX       XX       XX       XX    XX
  V3 Révélation        465       XX       XX       XX       XX       XX    XX
  Run canonique        470       XX       XX       XX       XX       XX    XX

═══════════════════════════════════════════════════════════════════════
  VERDICT DE CALIBRATION
═══════════════════════════════════════════════════════════════════════
  Maîtres ≥ 85 : X/2  (cible: 2/2)
  V3 briques gain moyen : +XX (vs scores V1)
  Critère PASS : maîtres ≥ 85 ET briques V3 ≥ +5 vs V1
```

---

## ÉTAPE 3 — TESTS

### Modifier les tests existants de necessity

Les tests de necessity dans `tests/` vérifient probablement que le format
de sortie est correct et que extractScore parse bien le résultat.
Adapter les tests pour le nouveau format (noms de critères en français).

Si un test vérifie les noms "ECONOMY", "DENSITY" etc., le changer pour
"JUSTESSE", "DENSITÉ_LITTÉRAIRE" etc.

### Nouveaux tests

- `it('necessity prompt is in French')` — vérifier que systemPrompt contient "prose française"
- `it('necessity prompt mentions literary calibration')` — vérifier "Flaubert" ou "Duras" dans le prompt
- `it('necessity prompt does not use utilitarian language')` — vérifier absence de "compressed storytelling", "filler"

---

## ÉTAPE 4 — VÉRIFICATION

1. `npm test` → tous les tests GREEN
2. `npx tsc --noEmit` → 0 erreurs
3. Lancer le script d'audit : `npx tsx scripts/audit-necessity-judge.ts`
4. Vérifier que les maîtres obtiennent ≥ 85
5. Vérifier que les briques V3 gagnent au moins +5 vs les scores V1

---

## COMMIT

```
fix(sii): recalibration juge Necessity — prompt littéraire français V2

INV-JUDGE-NECESSITY-02 remplace INV-JUDGE-NECESSITY-01.

Problème identifié:
  Le juge V1 (anglais, critères utilitaires) confondait
  la respiration littéraire avec du remplissage.
  NEC=54-75 sur prose dense (Flaubert obtiendrait ~65).

Correction:
  - Prompt en FRANÇAIS (langue de la prose évaluée)
  - Critères recalibrés pour la prose littéraire :
    ECONOMY → JUSTESSE (émotion/sensation/tension, pas concision)
    DENSITY → DENSITÉ_LITTÉRAIRE (sensorielle, pas informationnelle)
    GOAL_ADVANCE → PROGRESSION (tension/émotion, pas intrigue)
  - Calibration explicite: Flaubert/Duras = 85-95
  - Liste de ce qui EST nécessaire en littérature
    (atmosphère, respiration, dilatation temporelle)
  - Liste de ce qui N'EST PAS nécessaire
    (redite, transitions mécaniques, explications)

Script d'audit: scripts/audit-necessity-judge.ts
Teste sur maîtres (Bovary) + briques V3 + run canonique.
Budget: 6-8 API calls.
```

## CE QUI NE DOIT PAS CHANGER

- Les poids SII (1.0 / 1.0 / 1.0) — INCHANGÉS
- Les autres juges (impact, interiority) — INCHANGÉS
- Le format de sortie de extractScore — INCHANGÉ
- Le scoring macro-axes.ts — INCHANGÉ
- Les seuils SAGA_READY — INCHANGÉS

## BUDGET

- 6-8 API calls pour le script d'audit (1 par texte)
- 0 API pour les tests unitaires
