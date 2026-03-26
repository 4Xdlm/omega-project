# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : PLAN FACTORIEL 2×2
# Isolation des suspects : Glossaire × Voice Weight
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 2003 PASS
#
# CONTEXTE :
# V-ATOMIC v5 : 0/5 SAGA_READY (was 3/5 en v4)
# 3 variables ont changé simultanément entre v4 et v5 :
#   A. AAI réel (BUG-01 fixé) → ATTENDU, on garde
#   B. Glossaire injecté (+153 tokens au prompt) → SUSPECT
#   C. Voice Genome weight=0.3 (score fixe 70) → SUSPECT
#
# MISSION : Tester les 4 combinaisons B×C sur 2 briques
# pour isoler la cause de la chute.
#
# Budget : 4 conditions × 2 briques × ~16 API/brique = ~128 API max
# ═══════════════════════════════════════════════════════════════════════════════

## ÉTAPE 1 — Créer le script de test factoriel

Créer `scripts/test-factorial-2x2.ts`

Ce script teste 4 conditions sur 2 briques (Contemplation + Menace) :

```
Condition 1 : glossaire OFF + voice weight 0.0  → "baseline v4 + AAI réel"
Condition 2 : glossaire OFF + voice weight 0.3  → "isoler voice"
Condition 3 : glossaire ON  + voice weight 0.0  → "isoler glossaire"
Condition 4 : glossaire ON  + voice weight 0.3  → "v5 actuel"
```

### Architecture du script

Le script doit :

1. **Avant chaque condition**, modifier dynamiquement les 2 variables :

   **Variable GLOSSAIRE** : dans `src/input/prompt-assembler-v4.ts` ligne 90 :
   ```typescript
   blocks.push(compileGlossary());
   ```
   Quand OFF → commenter cette ligne (ou ne pas l'appeler).
   
   MEILLEUR APPROCHE : Utiliser une variable d'environnement ou un flag :
   ```typescript
   // Dans le script de test :
   process.env.OMEGA_GLOSSARY_ENABLED = 'false'; // ou 'true'
   ```
   Et dans prompt-assembler-v4.ts, wrapper l'appel :
   ```typescript
   if (process.env.OMEGA_GLOSSARY_ENABLED !== 'false') {
     blocks.push(compileGlossary());
   }
   ```

   **Variable VOICE WEIGHT** : dans `src/oracle/macro-axes.ts` ligne ~407 :
   ```typescript
   weight: 0.3,
   ```
   Quand 0.0 → mettre `weight: 0`.
   
   MEILLEUR APPROCHE : Variable d'environnement aussi :
   ```typescript
   process.env.OMEGA_VOICE_WEIGHT = '0'; // ou '0.3'
   ```
   Et dans macro-axes.ts :
   ```typescript
   weight: parseFloat(process.env.OMEGA_VOICE_WEIGHT ?? '0.3'),
   ```

2. **Pour chaque condition**, lancer les 2 briques (Contemplation + Menace)
   en utilisant le même pipeline que test-vatomic-5bricks.ts
   (ForgePacket → ChunkedDraft → Duel → MicroSurgery → MacroSScore)

3. **Collecter** pour chaque run : composite, min_axis, ECC, RCI, SII, IFI, AAI,
   NEC, MN, rhythm, voice_conformity, prompt_tokens, words

4. **Afficher** le tableau comparatif final

### Format de sortie attendu

```
═══════════════════════════════════════════════════════════════════════
  OMEGA — PLAN FACTORIEL 2×2 : GLOSSAIRE × VOICE WEIGHT
  2 briques × 4 conditions = 8 runs
  AAI réel activé dans toutes les conditions
═══════════════════════════════════════════════════════════════════════

  CONTEMPLATION
  ─────────────────────────────────────────────────────────
  Condition          Prompt  Comp  min   ECC   RCI   SII   AAI   NEC   rhythm  voice
  GOFF_V0 (baseline)  1456t  XX.X  XX.X  XX.X  XX.X  XX.X  XX.X  XX    XX.X    70.0
  GOFF_V03             1456t  XX.X  XX.X  XX.X  XX.X  XX.X  XX.X  XX    XX.X    70.0
  GON_V0               1609t  XX.X  XX.X  XX.X  XX.X  XX.X  XX.X  XX    XX.X    70.0
  GON_V03 (v5 actuel)  1609t  XX.X  XX.X  XX.X  XX.X  XX.X  XX.X  XX    XX.X    70.0

  MENACE
  ─────────────────────────────────────────────────────────
  [même format]

═══════════════════════════════════════════════════════════════════════
  ANALYSE D'EFFET
═══════════════════════════════════════════════════════════════════════
  Effet GLOSSAIRE (GON vs GOFF, moyenné sur voice) :
    ΔComposite = XX.X
    ΔRCI       = XX.X
    ΔNEC       = XX.X

  Effet VOICE (V03 vs V0, moyenné sur glossaire) :
    ΔComposite = XX.X
    ΔRCI       = XX.X

  Interaction (si les deux effets ne sont pas additifs) :
    ΔInteraction = XX.X

  VERDICT :
    Glossaire coupable : OUI/NON (si |ΔNEC| > 10)
    Voice coupable     : OUI/NON (si |ΔRCI| > 3)
    Recommandation     : [garder/retirer glossaire] + [garder/retirer voice]
═══════════════════════════════════════════════════════════════════════
```

## ÉTAPE 2 — Modifier les 2 fichiers pour accepter les flags

### 2a. prompt-assembler-v4.ts

Remplacer la ligne 90 :
```typescript
blocks.push(compileGlossary());
```
Par :
```typescript
// Glossary injection — controlled by env flag for A/B testing
if (process.env.OMEGA_GLOSSARY_ENABLED !== 'false') {
  blocks.push(compileGlossary());
}
```

### 2b. macro-axes.ts

Remplacer la ligne ~407 :
```typescript
weight: 0.3,
```
Par :
```typescript
weight: parseFloat(process.env.OMEGA_VOICE_WEIGHT ?? '0.3'),
```

## ÉTAPE 3 — Lancer le test

```bash
npx tsx scripts/test-factorial-2x2.ts
```

Le script doit gérer les 4 conditions en séquence, avec une pause de 5s
entre chaque condition pour éviter le rate-limiting.

## ÉTAPE 4 — NE PAS modifier les flags par défaut

IMPORTANT : Après le test, les valeurs PAR DÉFAUT doivent rester :
- Glossaire : activé par défaut (pas de changement pour les tests normaux)
- Voice weight : 0.3 par défaut (pas de changement)

Les flags env ne sont utilisés QUE par le script factoriel.

## VÉRIFICATION

1. `npm test` → 2003+ PASS (les flags env ne cassent rien)
2. Le script produit 8 résultats (4 conditions × 2 briques)
3. L'analyse d'effet identifie le(s) coupable(s)

## COMMIT

```
test(factorial): plan 2x2 glossaire × voice weight — isolation des suspects

V5 (0/5 SAGA_READY) vs V4 (3/5) : 3 variables changées simultanément.
Plan factoriel pour isoler :
  GLOSSAIRE (ON/OFF) × VOICE_WEIGHT (0.0/0.3)
  sur 2 briques (Contemplation + Menace)

Flags env ajoutés :
  OMEGA_GLOSSARY_ENABLED (default: true)
  OMEGA_VOICE_WEIGHT (default: 0.3)

prompt-assembler-v4.ts: glossary conditionnel
macro-axes.ts: voice weight paramétrable
scripts/test-factorial-2x2.ts: 4 conditions × 2 briques
```

## CE QUI NE DOIT PAS CHANGER

- BUG-01 fix (AAI réel) → RESTE ACTIF dans toutes les conditions
- Moteur de génération (chunked-generator.ts)
- Duel / CV Gate
- Juge Necessity V2
- Juge Interiority V1
- Exemplars / Ancre Bovary
