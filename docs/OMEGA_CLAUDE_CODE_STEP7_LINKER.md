# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : ÉTAPE 7 — LINKER (AGENT CIMENT)
# Assembler les briques SAGA_READY en chapitres
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Prérequis : V-ATOMIC v4 (3/5 SAGA_READY), sprint nettoyage terminé
#
# CONTEXTE :
# Le paradigme Fractal Assembly (DEC-20260325-001) définit :
#   - Briques = unités SCELLÉES (SHA-256, prose immutable)
#   - Ciment = transitions 50-150w entre briques
#   - Chapitre = briques + ciments, scoré au niveau chapitre
#   - Si chapitre fail → identifier la COUTURE fautive, pas la brique
#
# V-ATOMIC v4 a prouvé que 3/5 briques passent SAGA_READY.
# L'étape suivante est de les ASSEMBLER en chapitres.
# ═══════════════════════════════════════════════════════════════════════════════

## MISSION : Créer `src/assembly/linker.ts`

### Interface

```typescript
export interface LinkRequest {
  readonly brick_A_ending: string;    // 200 derniers mots de la brique A
  readonly brick_B_opening: string;   // 200 premiers mots de la brique B
  readonly brick_A_emotion: string;   // Émotion dominante fin A (ex: "sadness")
  readonly brick_B_emotion: string;   // Émotion dominante début B (ex: "anticipation")
  readonly scene_context: string;     // Contexte narratif (1-2 phrases)
  readonly language: 'fr' | 'en';
}

export interface LinkResult {
  readonly cement: string;            // Le texte de transition (50-150w)
  readonly words: number;
  readonly hash: string;              // SHA-256 du cement
  readonly api_calls: number;
}
```

### Logique du Linker

Le Linker génère une transition entre deux briques. Il reçoit :
- Les 200 derniers mots de la brique A (contexte de sortie)
- Les 200 premiers mots de la brique B (contexte d'entrée)
- Les émotions dominantes des deux côtés

Il produit un texte de 50-150 mots qui :
1. **Ferme** le mouvement émotionnel de A
2. **Ouvre** le mouvement émotionnel de B
3. **Ne répète** rien de A ni de B
4. **Respecte** le style PF (Proust+Flaubert) sans Duras (pas de coups secs dans la transition)
5. **Est invisible** — le lecteur ne doit pas sentir la couture

### Prompt du Linker

```typescript
const LINKER_SYSTEM = `Tu es un artisan de la couture narrative.
Ta mission : écrire une TRANSITION entre deux passages de prose littéraire française.

RÈGLES ABSOLUES :
- Entre 50 et 150 mots
- Tu NE RÉPÈTES rien des deux passages fournis
- Tu NE RÉSUMES PAS ce qui précède ou ce qui suit
- Tu fais SENTIR le passage d'une émotion à une autre
- Ton style est celui de Flaubert : périodes amples, respiration maîtrisée
- Pas de phrases télégraphiques — chaque phrase est complète
- Pas de transitions mécaniques ("Puis...", "Ensuite...", "Alors...")
- La couture doit être INVISIBLE — le lecteur ne doit jamais sentir qu'il change de brique

RÉFÉRENCES DE CALIBRATION :
- Un chapitre de Madame Bovary où Flaubert passe de la description du paysage
  à l'intériorité d'Emma = transition invisible de 2-3 phrases
- Le rythme de transition doit RESPIRER, pas précipiter`;

const LINKER_USER = `CONTEXTE : ${request.scene_context}

FIN DU PASSAGE A (émotion : ${request.brick_A_emotion}) :
${request.brick_A_ending}

DÉBUT DU PASSAGE B (émotion : ${request.brick_B_emotion}) :
${request.brick_B_opening}

Écris UNIQUEMENT la transition (50-150 mots). Rien d'autre.`;
```

### Validation du cement

Après génération, vérifier :
1. `words >= 50 && words <= 150` — sinon retry (max 2)
2. Aucune phrase de A ou B n'est répétée (overlap check)
3. Pas de transition mécanique ("Puis", "Ensuite", "Alors" en début de phrase)

### Script de test

Créer `scripts/test-linker.ts` qui :
1. Prend 2 briques SAGA_READY de V-ATOMIC v4 (ex: Contemplation → Souvenir)
2. Génère la transition
3. Assemble : brick_A + cement + brick_B
4. Score le chapitre assemblé avec MacroSScore
5. Vérifie la continuité P4 (ΔCV < 0.250, ΔMean < 15w)

Budget : 2-3 API calls par transition + 5 API pour le scoring chapitre

### Tests unitaires

```
it('linker generates 50-150 words')
it('linker does not repeat brick content')
it('linker does not use mechanical transitions')
it('linker hash is deterministic for same input')
```

### Commit

```
feat(assembly): linker agent — transitions 50-150w entre briques

DEC-20260325-001 Fractal Assembly : briques SCELLÉES + ciment.
Le Linker génère des transitions invisibles style Flaubert.
Prompt en français, calibré sur les transitions de Bovary.

Validation: 50-150w, pas de répétition, pas de "Puis/Ensuite".
Script test-linker.ts pour assemblage + scoring chapitre.
```
