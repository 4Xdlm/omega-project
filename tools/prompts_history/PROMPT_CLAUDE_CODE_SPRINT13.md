# OMEGA — PROMPT CLAUDE CODE — SPRINT 13
# VOICE GENOME (extension style_genome)
# Date: 2026-02-16 — Version DÉFINITIVE

## RÔLE
Tu es l'ingénieur système OMEGA. Exécute Sprint 13 complet (commits 13.1 → 13.4).
PASS ou FAIL. Zéro TODO, zéro `any`, zéro `@ts-ignore`.

## ÉTAT DU REPO
| Attribut | Valeur |
|----------|--------|
| Repo | `C:\Users\elric\omega-project` |
| Package | `packages/sovereign-engine` |
| HEAD | `fcc84f1a` (master) |
| Tags | `sprint-12-sealed`, `v3.0.0-art-foundations` |
| Tests baseline | 352/352 PASS |
| Sprints SEALED | 9, 10, 11, 12 |

## CONTRAINTES OMEGA (non négociables)
1. Déterminisme : même input + même config → même output
2. Zéro dette : TODO/FIXME/HACK = 0 ; @ts-ignore/@ts-nocheck = 0 ; `: any` = 0
3. `.roadmap-hash.json` : NE PAS TOUCHER
4. 1 commit = 1 unité logique, tests inclus, evidence archivée
5. FAIL-CLOSED partout

## PRÉ-VOL OBLIGATOIRE (si échec → STOP)
```bash
cd packages/sovereign-engine
git status                    # DOIT être clean
npx vitest run 2>&1           # DOIT afficher 352 passed
git rev-parse --short HEAD    # fcc84f1a
mkdir -p proofpacks/sprint-13/00-preflight
npx vitest run 2>&1 > proofpacks/sprint-13/00-preflight/baseline.txt
git log --oneline -10 > proofpacks/sprint-13/00-preflight/git_log.txt
```

---

## INVARIANTS SPRINT 13

| ID | Description |
|----|-------------|
| ART-VOICE-01 | style_genome contient 10 paramètres voix mesurables |
| ART-VOICE-02 | Voice constraint compiler traduit paramètres en instructions prompt |
| ART-VOICE-03 | voice_conformity axe mesure drift < 10% entre runs |
| ART-VOICE-04 | Non-régression totale + ProofPack |

---

## COMMIT 13.1 — Voice Genome Extension (10 paramètres)

**Message EXACT** : `feat(sovereign): voice genome extension (10 parameters) [ART-VOICE-01]`

### Fichier à créer : `src/voice/voice-genome.ts`

```typescript
export interface VoiceGenome {
  // 10 paramètres mesurables, chacun ∈ [0, 1]
  phrase_length_mean: number;      // 0 = très court (5 mots), 1 = très long (40+ mots)
  dialogue_ratio: number;          // 0 = 0% dialogue, 1 = 100% dialogue
  metaphor_density: number;        // 0 = aucune métaphore, 1 = métaphore par phrase
  language_register: number;       // 0 = familier/argot, 1 = soutenu/littéraire
  irony_level: number;             // 0 = aucune ironie, 1 = ironie constante
  ellipsis_rate: number;           // 0 = phrases complètes, 1 = ellipses fréquentes
  abstraction_ratio: number;       // 0 = concret uniquement, 1 = très abstrait
  punctuation_style: number;       // 0 = minimal (. ,), 1 = expressif (! ? ; — …)
  paragraph_rhythm: number;        // 0 = paragraphes uniformes, 1 = très variés
  opening_variety: number;         // 0 = débuts répétitifs, 1 = chaque phrase commence différemment
}

export const DEFAULT_VOICE_GENOME: VoiceGenome = {
  phrase_length_mean: 0.5,
  dialogue_ratio: 0.3,
  metaphor_density: 0.4,
  language_register: 0.7,
  irony_level: 0.2,
  ellipsis_rate: 0.3,
  abstraction_ratio: 0.4,
  punctuation_style: 0.5,
  paragraph_rhythm: 0.6,
  opening_variety: 0.7,
};

// Mesurer les paramètres voix d'une prose existante
export function measureVoice(prose: string): VoiceGenome

// Calculer le drift entre 2 genomes
export function computeVoiceDrift(target: VoiceGenome, actual: VoiceGenome): {
  drift: number;           // 0-1, distance euclidienne normalisée
  per_param: Record<keyof VoiceGenome, number>;  // drift par paramètre
  conforming: boolean;     // drift < 0.10
}
```

**`measureVoice()` — algorithme CALC déterministe :**
- `phrase_length_mean` : moyenne mots/phrase, normalisé [5..40] → [0..1]
- `dialogue_ratio` : ratio lignes contenant guillemets/tirets dialogue
- `metaphor_density` : réutiliser `detectMetaphors()` count / phrase_count (ou heuristique CALC simple)
- `language_register` : ratio mots > 3 syllabes / total (heuristique)
- `irony_level` : détection points d'exclamation après phrases négatives (heuristique simple)
- `ellipsis_rate` : ratio phrases sans verbe conjugué / total
- `abstraction_ratio` : ratio noms abstraits / noms totaux (heuristique via suffixes : -tion, -ment, -ité, -ence)
- `punctuation_style` : ratio (! ? ; — …) / total ponctuation
- `paragraph_rhythm` : coefficient de variation des longueurs de paragraphes
- `opening_variety` : ratio premiers mots uniques / nombre de phrases

### Tests : `tests/voice/voice-genome.test.ts`

4 tests :
- **VOICE-01** : `measureVoice()` retourne 10 paramètres ∈ [0,1]
- **VOICE-02** : prose courte/familière → `phrase_length_mean` bas, `language_register` bas
- **VOICE-03** : `computeVoiceDrift()` même genome → drift = 0
- **VOICE-04** : `computeVoiceDrift()` genomes très différents → drift > 0.5

### Evidence
```bash
mkdir -p proofpacks/sprint-13/13.1
npx vitest run 2>&1 > proofpacks/sprint-13/13.1/npm_test.txt
```

---

## COMMIT 13.2 — Voice Constraint Compiler

**Message EXACT** : `feat(sovereign): voice constraint compiler [ART-VOICE-02]`

### Fichier à créer : `src/voice/voice-compiler.ts`

```typescript
export interface VoiceInstruction {
  parameter: keyof VoiceGenome;
  target: number;
  instruction_fr: string;    // instruction concrète pour le LLM
  priority: 'critical' | 'high' | 'medium';
}

export function compileVoiceConstraints(
  genome: VoiceGenome,
  budget_tokens: number   // défaut 400
): {
  content: string;          // texte compilé pour injection dans le prompt
  token_count: number;
  instructions: VoiceInstruction[];
}
```

**Traduction paramètres → instructions prompt FR :**
| Paramètre | Bas (< 0.3) | Moyen (0.3-0.7) | Haut (> 0.7) |
|-----------|-------------|------------------|--------------|
| phrase_length_mean | "Phrases courtes, max 10 mots. Rythme sec." | (pas d'instruction) | "Phrases longues et sinueuses, 25+ mots, subordonnées." |
| dialogue_ratio | "Pas ou peu de dialogue. Narration pure." | (pas d'instruction) | "Beaucoup de dialogue. Répliques fréquentes." |
| metaphor_density | "Écriture littérale, pas de métaphores." | (pas d'instruction) | "Métaphores riches et fréquentes, au moins 1 par paragraphe." |
| language_register | "Registre familier, vocabulaire simple." | (pas d'instruction) | "Registre soutenu, vocabulaire recherché." |
| irony_level | "Ton sincère, direct." | (pas d'instruction) | "Ton ironique, distance, second degré." |
| ellipsis_rate | "Phrases complètes, syntaxe classique." | (pas d'instruction) | "Ellipses fréquentes. Phrases sans verbe. Fragments." |
| abstraction_ratio | "Concret uniquement. Objets, gestes, sensations." | (pas d'instruction) | "Réflexions abstraites, pensées philosophiques." |
| punctuation_style | "Ponctuation sobre : points, virgules." | (pas d'instruction) | "Ponctuation expressive : exclamations, tirets, points de suspension." |
| paragraph_rhythm | "Paragraphes de longueur régulière." | (pas d'instruction) | "Alternance brutale : paragraphe long puis 1 phrase seule." |
| opening_variety | "Accepter quelques répétitions de structure." | (pas d'instruction) | "Chaque phrase commence différemment. Jamais 2 débuts identiques." |

Seuls les paramètres hors zone neutre (< 0.3 ou > 0.7) génèrent une instruction.
Budget respecté : tronquer les instructions `medium` si dépassement.

### Tests : `tests/voice/voice-compiler.test.ts`

3 tests :
- **VCOMP-01** : genome extrême (tous à 0.1 ou 0.9) → instructions générées pour les 10 params
- **VCOMP-02** : genome neutre (tous à 0.5) → aucune instruction (zone morte)
- **VCOMP-03** : budget 200 tokens → contenu tronqué, token_count ≤ 200

### Evidence
```bash
mkdir -p proofpacks/sprint-13/13.2
npx vitest run 2>&1 > proofpacks/sprint-13/13.2/npm_test.txt
```

---

## COMMIT 13.3 — voice_conformity Axe + Drift Test

**Message EXACT** : `feat(sovereign): voice_conformity axe + drift test [ART-VOICE-03]`

### Fichiers à créer

**`src/oracle/axes/voice-conformity.ts`**
```typescript
export async function scoreVoiceConformity(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<AxisScore>
// Poids : 1.0
// Méthode : CALC (measureVoice + computeVoiceDrift)
// Score = (1 - drift) × 100, clamp [0, 100]
// Si pas de genome dans packet → score 70 (neutre)
```

Modifier `src/oracle/axes/index.ts` pour enregistrer l'axe.

**Intégration scoring :**
- Axe `voice_conformity` → macro-axe **RCI** (rejoint rhythm, signature, hook_presence)
- Poids ×1.0
- Pas de changement de poids macro (RCI reste 17%)

### Tests : `tests/oracle/axes/voice-conformity.test.ts`

3 tests :
- **VCONF-01** : prose conforme au genome → score > 80
- **VCONF-02** : prose très différente du genome → score < 50
- **VCONF-03** : drift test — même genome, même prose = même score (déterminisme)

### Evidence
```bash
mkdir -p proofpacks/sprint-13/13.3
npx vitest run 2>&1 > proofpacks/sprint-13/13.3/npm_test.txt
```

---

## COMMIT 13.4 — Tests + ProofPack Sprint 13

**Message EXACT** : `chore(proofpack): sprint 13 proofpack + seal report`

### Audits BLOQUANTS
```bash
grep -rn "TODO\|FIXME\|HACK" src/ tests/       # Attendu : 0
grep -rn ": any\b" src/                          # Attendu : 0
grep -rn "@ts-ignore\|@ts-nocheck" src/ tests/   # Attendu : 0
```

### ProofPack
```bash
mkdir -p proofpacks/sprint-13/13.4
npx vitest run 2>&1 > proofpacks/sprint-13/13.4/npm_test.txt
npx vitest run --reporter=verbose 2>&1 > proofpacks/sprint-13/13.4/gates_output.txt
```

### SEAL_REPORT : `proofpacks/sprint-13/Sprint13_SEAL_REPORT.md`

### Verdict attendu
```
📦 SPRINT 13 — VOICE GENOME
Tests: X/X PASS
Invariants: ART-VOICE-01..04 (4/4 PASS)
Audits: 0 TODO, 0 any, 0 ts-ignore
Modules: src/voice/ (voice-genome.ts, voice-compiler.ts), axes/voice-conformity.ts
VERDICT: PASS/FAIL — SPRINT 13 SEALED / NOT SEALED
```

---

## RÉSUMÉ DES TESTS ATTENDUS

| Commit | Tests ajoutés | Baseline après |
|--------|--------------|----------------|
| 13.1 | VOICE-01..04 (+4) | 356 |
| 13.2 | VCOMP-01..03 (+3) | 359 |
| 13.3 | VCONF-01..03 (+3) | 362 |
| 13.4 | +0 (seal) | 362 |
| **TOTAL** | **+10** | **≥ 362** |

## EXÉCUTION
Pré-vol, puis 13.1 → 13.4 dans l'ordre strict. Ne t'arrête pas entre les commits.
