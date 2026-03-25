# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : SPRINT NETTOYAGE + FIABILISATION
# Étapes 2 à 6 — Bugs, incohérences, juges, Voice Genome
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 1984 PASS
#
# CONTEXTE :
# L'inventaire exhaustif (127 observations) a révélé 5 bugs, 7 contradictions,
# et plusieurs pistes à fort ROI. Ce sprint nettoie et fiabilise SANS toucher
# à la logique de génération (pas de modification du moteur/Duel/prompts Scribe).
#
# ORDRE : Exécuter dans l'ordre 2→3→4→5→6. Tests entre chaque étape.
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2 — AUDIT BUG-01 : AAI INVARIANT À 95.6
# ═══════════════════════════════════════════════════════════════════════════════

## Problème

AAI (Artistic Authenticity Index) retourne 95.6 sur 5 briques V-ATOMIC
radicalement différentes (contemplation, confrontation, souvenir, menace,
révélation). Un axe qui ne discrimine pas est un axe mort qui gonfle
artificiellement le composite.

## Mission

1. Ouvrir `src/oracle/macro-axes.ts`, trouver `computeAAI()`
2. Tracer le calcul exact : quels sub_scores ? quels poids ?
3. Les sub_scores sont : show_dont_tell (w=0.60) + authenticity (w=0.40)
   Vérifier si ces deux retournent des valeurs quasi-identiques partout.

4. Ouvrir les fichiers d'axes correspondants :
   - `src/oracle/axes/show-dont-tell.ts`
   - `src/oracle/axes/authenticity.ts`

5. Pour chaque axe :
   - Quel est le method (CALC / LLM / HYBRID) ?
   - Si HYBRID : quel est le prompt LLM ? Le provider est-il le vrai ou un dummy ?
   - Y a-t-il un fallback/default qui retourne une valeur fixe ?
   - Y a-t-il un cache qui retourne toujours la même chose ?

6. TESTER empiriquement : créer un mini-test qui appelle computeAAI()
   avec 3 proses RADICALEMENT différentes (une contemplation calme,
   une confrontation violente, un dialogue sec) et vérifier si AAI varie.

   Si AAI ne varie pas → identifier le composant figé.
   Si AAI varie dans le test → le bug est dans le path d'exécution V-ATOMIC
   (peut-être un dummyProvider qui retourne toujours la même chose).

## Livrable

Créer `docs/AUDIT_AAI_BUG01.md` avec :
- Le diagnostic exact (quel composant est invariant et pourquoi)
- La recommandation de fix (si applicable)
- Les valeurs mesurées sur les 3 proses de test

## Tests

- `it('AAI varies for different prose types')` — DOIT PASSER si le fix est correct

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 — RÉCONCILIER LES SEUILS DIVERGENTS
# ═══════════════════════════════════════════════════════════════════════════════

## Problème

L'inventaire a trouvé 4 divergences de seuils :

| Source A | Source B | Nature |
|---|---|---|
| s-oracle-v2.ts (seuil 92) | config.ts (SOVEREIGN_THRESHOLD=93) | Seuil REJECT |
| macro-axes.ts header (ECC=60%) | MACRO_WEIGHTS actuels (ECC=33%) | Header obsolète |
| Orchestrateur rhythm weight=1.5 | SOVEREIGN_CONFIG.WEIGHTS.rhythm=1.0 | Poids divergent |
| ZONES.GREEN.min_axis=80 | SEAL_FLOOR_MIN=85 | Floor divergent |

## Mission

Pour chaque divergence :

### 3a. Seuil REJECT 92 vs 93

1. Chercher dans `src/oracle/s-oracle-v2.ts` le seuil de REJECT (probablement `< 92`)
2. Chercher dans `src/config.ts` la constante `SOVEREIGN_THRESHOLD` (probablement `93`)
3. DÉCISION : Le seuil SAGA_READY est 92. Le SOVEREIGN_THRESHOLD à 93 est le seuil
   SEAL_ATOMIC (un grade au-dessus). Vérifier si c'est bien ça.
   Si les deux sont censés être le même seuil → aligner sur 92 (SAGA_READY).
   Si ce sont deux seuils différents → documenter la distinction dans un commentaire.

### 3b. Header macro-axes.ts obsolète

1. Trouver le commentaire en tête de `src/oracle/macro-axes.ts` qui dit "ECC 60%"
2. Remplacer par les poids RÉELS actuels :
   ```
   // Poids actuels (post-Phase W):
   // ECC=0.33, RCI=0.17, SII=0.15, IFI=0.10, AAI=0.25
   // Total = 1.00
   ```

### 3c. Poids rhythm divergent

1. Chercher `rhythm` et `weight` dans tous les fichiers pour trouver la divergence
2. Le poids du rhythm dans RCI est maintenant `rhythm.weight * rhythmConfidence(wc)`
   (Correction B, commit 440e9afd). Vérifier qu'il n'y a pas un AUTRE endroit
   qui utilise un poids 1.5 pour le rhythm.

### 3d. Floor divergent 80 vs 85

1. Chercher `ZONES.GREEN.min_axis` et `SEAL_FLOOR_MIN` dans config.ts
2. Documenter la distinction :
   - 80 = floor opérationnel (le pipeline continue de tourner)
   - 85 = floor SAGA_READY (le seuil de certification)
   Si c'est bien ça → ajouter un commentaire explicatif.
   Si c'est une vraie incohérence → aligner.

## Livrable

- Fichiers modifiés avec commentaires explicatifs
- Aucune modification de LOGIQUE — seulement documentation et alignement

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4 — CÂBLER VOICE GENOME (RCI +5 POTENTIEL)
# ═══════════════════════════════════════════════════════════════════════════════

## Problème

`voice_conformity` dans RCI a weight=0 car `style_genome.voice` n'est jamais
peuplé dans le ForgePacket. Le sous-score retourne toujours 70 (neutre).
Potentiel : RCI +3 à +5 si câblé correctement.

## Mission

1. Ouvrir `src/oracle/axes/voice-conformity.ts`
   - Comprendre ce qu'attend le module comme input
   - Quel est le format de `style_genome.voice` ?
   - Comment le score est-il calculé ?

2. Ouvrir `src/types.ts`
   - Trouver l'interface ForgePacket → style_genome → voice
   - Quel type a le champ voice ?

3. Ouvrir `src/input/forge-packet-assembler.ts` (ou équivalent)
   - Trouver où le ForgePacket est construit
   - Vérifier pourquoi `voice` n'est jamais peuplé

4. ÉVALUER la faisabilité :
   - Si le voice genome est un vecteur de 10 paramètres normalisés (0-1),
     on peut le peupler avec les valeurs du PF_PERSONA
   - Si c'est un format complexe qui nécessite un calcul LLM → reporter
   - Si c'est juste un objet manquant → le câbler

5. SI FAISABLE (câblage simple) :
   - Peupler `style_genome.voice` avec les paramètres correspondant au
     profil PF (Proust+Flaubert). Utiliser les données ROM documentées :
     * phrase_length_mean ≈ 0.29 (normalisé)
     * paragraph_rhythm ≈ 0.60
     * metaphor_density ≈ 0.40
     * dialogue_ratio ≈ 0.10
     * etc.
   - Remonter le weight de voice_conformity de 0 à une valeur testable (0.3)
   - TESTER l'effet sur le RCI des briques existantes

6. SI PAS FAISABLE rapidement → documenter pourquoi et créer un ticket

## Livrable

- Si câblé : voice_conformity active avec weight > 0, test montrant l'effet
- Si reporté : `docs/TICKET_VOICE_GENOME_WIRING.md` avec le diagnostic

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5 — UPGRADE scoreInteriority (V0 → V1 rubric)
# ═══════════════════════════════════════════════════════════════════════════════

## Problème

scoreInteriority est le SEUL juge LLM qui n'a PAS de rubric multi-critères.
Son prompt est minimal : "Rate interiority depth (0-100)".
Risque : variance élevée, pas de discrimination.
Les deux autres juges LLM (Necessity V2, Impact V1) ont des rubrics à 5 critères.

## Mission

1. Ouvrir `src/runtime/anthropic-provider.ts`
2. Trouver la méthode `scoreInteriority`
3. Lire le prompt actuel

4. Créer un prompt V1 rubric en FRANÇAIS, aligné avec la doctrine OMEGA :

```
Tu es un évaluateur littéraire expert en prose française.
Tu évalues la PROFONDEUR D'INTÉRIORITÉ : le texte fait-il vivre
la conscience du personnage de l'intérieur ?

Évalue ces 5 critères de 0 à 100 :
1. INCARNATION : Les pensées sont-elles logées dans le corps
   (sensations, gestes, perceptions) plutôt que déclarées abstraitement ?
2. FLUX_CONSCIENCE : Y a-t-il un flux de pensée organique
   (associations, digressions, retours) ou un monologue mécanique ?
3. FILTRE_PERCEPTIF : Le monde est-il perçu à travers le prisme
   du personnage (sa mémoire, ses obsessions, ses angles morts) ?
4. SILENCE_NARRATIF : Ce qui n'est PAS dit est-il aussi important
   que ce qui est dit (non-dits, ellipses, sous-entendus) ?
5. PROFONDEUR_TEMPS : Le temps intérieur (mémoire, anticipation,
   dilatation) est-il différent du temps de l'action ?

Format de sortie (strictement) :
INCARNATION: [score]
FLUX_CONSCIENCE: [score]
FILTRE_PERCEPTIF: [score]
SILENCE_NARRATIF: [score]
PROFONDEUR_TEMPS: [score]
INTERIORITY: [moyenne]
```

5. Remplacer le prompt V0 par le prompt V1
6. Mettre à jour l'invariant : `INV-JUDGE-INTERIORITY-01`

## Tests

- Adapter les tests existants de interiority pour le nouveau format
- `it('interiority prompt is in French')`
- `it('interiority prompt has 5 criteria')`

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6 — NETTOYAGE HEADER macro-axes.ts
# ═══════════════════════════════════════════════════════════════════════════════

## Problème

Le header de `src/oracle/macro-axes.ts` contient des commentaires obsolètes
qui ne reflètent plus la réalité des poids et de l'architecture.

## Mission

1. Trouver le bloc de commentaires en tête du fichier
2. Le remplacer par un résumé EXACT de l'état actuel :

```typescript
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — MACRO AXES SCORING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 5 macro-axes : ECC, RCI, SII, IFI, AAI
 *
 * Poids actuels (vérifié 2026-03-25) :
 *   ECC (Emotional Coherence & Craft)  : 0.33 (33%)
 *   RCI (Rhythmic Craft Index)         : 0.17 (17%)
 *   SII (Signature Integrity Index)    : 0.15 (15%)
 *   IFI (Immersion Force Index)        : 0.10 (10%)
 *   AAI (Artistic Authenticity Index)  : 0.25 (25%)
 *   Total                              : 1.00
 *
 * Seuils :
 *   SAGA_READY : composite >= 92.0 AND min_axis >= 85.0
 *   SEAL_ATOMIC : composite >= 93.0 AND min_axis >= 85.0
 *
 * Corrections actives :
 *   INV-RCI-CONF-01 : rhythm weight *= rhythmConfidence(wordCount)
 *   SII-FIX-01 : metaphor_novelty weight 1.5 → 1.0
 *   INV-EUPHONY-WEIGHT-01 : euphony weight 1.0 → 0.5
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */
```

Ceci est un REMPLACEMENT du header existant, pas un ajout.

# ═══════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION GLOBALE
# ═══════════════════════════════════════════════════════════════════════════════

Après TOUTES les étapes :

1. `npm test` → TOUS les tests GREEN (1984+ PASS)
2. `npx tsc --noEmit` → 0 nouvelles erreurs
3. Vérifier qu'aucun fichier de GÉNÉRATION n'a été modifié :
   - chunked-generator.ts → INCHANGÉ
   - duel-engine.ts → INCHANGÉ
   - prompt-assembler-v4.ts → INCHANGÉ
   - golden-exemplars.ts → INCHANGÉ

# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT
# ═══════════════════════════════════════════════════════════════════════════════

UN SEUL COMMIT pour toutes les étapes :

```
fix(scoring): sprint nettoyage — AAI audit + seuils + Voice Genome + Interiority V1

ÉTAPE 2 — BUG-01 AAI invariant:
  Diagnostic: [résumé du diagnostic]
  Fix: [résumé du fix si applicable]

ÉTAPE 3 — Seuils réconciliés:
  s-oracle-v2 vs config.ts: [résultat]
  Header macro-axes.ts: aligné sur poids réels
  Rhythm weight: [résultat]
  Floor 80 vs 85: [résultat]

ÉTAPE 4 — Voice Genome:
  [câblé OU reporté avec raison]

ÉTAPE 5 — Interiority V1:
  INV-JUDGE-INTERIORITY-01: prompt FR 5 critères
  Incarnation, Flux, Filtre, Silence, Profondeur

ÉTAPE 6 — Header macro-axes.ts nettoyé

Tests: [N] PASS, 0 FAIL
```

# ═══════════════════════════════════════════════════════════════════════════════
# CE QUI NE DOIT PAS CHANGER
# ═══════════════════════════════════════════════════════════════════════════════

- Moteur de génération (chunked-generator.ts)
- Pipeline Duel (duel-engine.ts)
- Prompts Scribe (prompt-assembler-v4.ts)
- Exemplars (golden-exemplars.ts)
- Poids SII (restent 1.0/1.0/1.0)
- Juge Necessity V2 (déjà corrigé)
- Juge Impact V1 (fonctionnel)
- CV Gate (fonctionnel)
- RHYTHM_ANCHOR (fonctionnel)
