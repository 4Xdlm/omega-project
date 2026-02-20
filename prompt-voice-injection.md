# OMEGA — VOICE GENOME PROMPT INJECTION

## CONTEXT

RCI plateaus at ~79. Root cause proven: LLM generates prose WITHOUT awareness of voice genome targets. The scorer (voice_conformity) now correctly measures drift, but the generator is blind.

The prompt builder used in production is `src/input/prompt-assembler-v2.ts` → `buildStyleGenomeSection()`. It injects rhythm, lexicon, tone, imagery — but NOT the `voice` field from `StyleProfile`.

The type `StyleProfile.voice?: VoiceGenome` exists and is populated by golden-loader (previous commit 74f6d0f0).

The genius-contract-compiler.ts has a reference implementation of voice genome injection in `buildVoiceTargetSection()` — but it's NOT wired into the production pipeline (engine.ts calls buildSovereignPrompt, not compileGeniusContract).

## OBJECTIVE

Inject VoiceGenome targets into the draft generation prompt so the LLM actively aims for the stylistic profile.

## WHAT TO DO

### 1. Modify `packages/sovereign-engine/src/input/prompt-assembler-v2.ts`

In the function `buildStyleGenomeSection(packet: ForgePacket)`, AFTER the existing content for imagery, add voice genome injection when `sg.voice` is defined.

Add this block BEFORE the return statement:

```typescript
  // ═══ VOICE GENOME TARGET (10 parametres) ═══
  if (sg.voice) {
    const vg = sg.voice;
    content += `\n## Voice Genome Target (10 paramètres — PRIORITÉ HIGH)

Ces 10 paramètres QUANTITATIFS définissent la voix narrative cible.
Chaque paramètre est normalisé [0, 1]. Le scorer mesurera le drift entre votre prose et ces cibles.
Tolérance : ±10% par paramètre. Au-delà = pénalité RCI directe.

| Paramètre | Cible | Instruction |
|-----------|-------|-------------|
| Longueur phrase | ${vg.phrase_length_mean.toFixed(2)} | ${describePhraseLength(vg.phrase_length_mean)} |
| Ratio dialogue | ${vg.dialogue_ratio.toFixed(2)} | ${describeDialogueRatio(vg.dialogue_ratio)} |
| Densité métaphore | ${vg.metaphor_density.toFixed(2)} | ${describeMetaphorDensity(vg.metaphor_density)} |
| Registre langue | ${vg.language_register.toFixed(2)} | ${describeRegister(vg.language_register)} |
| Niveau ironie | ${vg.irony_level.toFixed(2)} | ${describeIrony(vg.irony_level)} |
| Taux ellipse | ${vg.ellipsis_rate.toFixed(2)} | ${describeEllipsis(vg.ellipsis_rate)} |
| Ratio abstraction | ${vg.abstraction_ratio.toFixed(2)} | ${describeAbstraction(vg.abstraction_ratio)} |
| Style ponctuation | ${vg.punctuation_style.toFixed(2)} | ${describePunctuation(vg.punctuation_style)} |
| Rythme paragraphe | ${vg.paragraph_rhythm.toFixed(2)} | ${describeParagraphRhythm(vg.paragraph_rhythm)} |
| Variété ouverture | ${vg.opening_variety.toFixed(2)} | ${describeOpeningVariety(vg.opening_variety)} |

RÈGLE : Ces valeurs sont des CIBLES MESURABLES. Le scorer calculera le drift euclidien.
Un drift global > 0.10 = voice_conformity < 85 = RCI plafonne.
`;
  }
```

### 2. Add helper functions AFTER `buildStyleGenomeSection` in the same file

These functions convert numeric [0,1] values to actionable LLM instructions:

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// VOICE GENOME DESCRIPTORS — Numeric → Actionable instruction
// ═══════════════════════════════════════════════════════════════════════════════

function describePhraseLength(v: number): string {
  if (v < 0.25) return 'Phrases très courtes (~5-12 mots). Style haché, percutant.';
  if (v < 0.50) return 'Phrases courtes à moyennes (~12-20 mots). Fluide mais concis.';
  if (v < 0.75) return 'Phrases moyennes à longues (~20-30 mots). Développées, respiration ample.';
  return 'Phrases longues (~30-40+ mots). Proustien, cascades syntaxiques.';
}

function describeDialogueRatio(v: number): string {
  if (v < 0.15) return 'Quasi aucun dialogue. Narration pure, intériorité.';
  if (v < 0.35) return 'Peu de dialogue (~20-30%). La narration domine.';
  if (v < 0.55) return 'Dialogue équilibré (~35-50%). Alternance narration/échange.';
  return 'Dialogue dominant (>50%). Théâtralité, échanges vifs.';
}

function describeMetaphorDensity(v: number): string {
  if (v < 0.25) return 'Peu de métaphores. Style sobre, factuel.';
  if (v < 0.50) return 'Métaphores modérées. Comme/tel sporadiques, images précises.';
  if (v < 0.75) return 'Métaphores fréquentes. Imagerie riche, comparaisons développées.';
  return 'Métaphores denses. Presque chaque phrase porte une image.';
}

function describeRegister(v: number): string {
  if (v < 0.25) return 'Registre familier/parlé. Oralité, expressions courantes.';
  if (v < 0.50) return 'Registre courant. Accessible, fluide, standard.';
  if (v < 0.75) return 'Registre soutenu. Vocabulaire riche, tournures élégantes.';
  return 'Registre littéraire. Lexique rare, syntaxe complexe, Goncourt.';
}

function describeIrony(v: number): string {
  if (v < 0.15) return 'Aucune ironie. Ton sincère, direct.';
  if (v < 0.35) return 'Ironie discrète. Sous-entendu occasionnel.';
  if (v < 0.60) return 'Ironie modérée. Décalage régulier, second degré.';
  return 'Ironie marquée. Distance constante, ton caustique.';
}

function describeEllipsis(v: number): string {
  if (v < 0.20) return 'Phrases complètes. Syntaxe grammaticalement pleine.';
  if (v < 0.45) return 'Ellipses modérées. Quelques fragments stylistiques.';
  return 'Ellipses fréquentes. Fragments, phrases nominales, non-dits.';
}

function describeAbstraction(v: number): string {
  if (v < 0.25) return 'Très concret. Objets, corps, sensations.';
  if (v < 0.50) return 'Équilibré concret/abstrait. Ancrage sensoriel + réflexion.';
  if (v < 0.75) return 'Tendance abstraite. Concepts, états intérieurs, généralisation.';
  return 'Très abstrait. Philosophique, conceptuel, désincarné.';
}

function describePunctuation(v: number): string {
  if (v < 0.25) return 'Ponctuation minimale. Points et virgules principalement.';
  if (v < 0.50) return 'Ponctuation standard. Variée mais sobre.';
  if (v < 0.75) return 'Ponctuation expressive. Points-virgules, tirets, points de suspension.';
  return 'Ponctuation très expressive. Tirets longs, suspensions, exclamations.';
}

function describeParagraphRhythm(v: number): string {
  if (v < 0.30) return 'Paragraphes uniformes. Longueur constante, régulier.';
  if (v < 0.60) return 'Rythme modéré. Alternance courts/longs occasionnelle.';
  return 'Rythme très varié. Courts percutants + longs contemplatifs.';
}

function describeOpeningVariety(v: number): string {
  if (v < 0.30) return 'Ouvertures répétitives tolérées. Même structure autorisée.';
  if (v < 0.60) return 'Variété modérée. Alterner sujet/verbe/complément/subordonnée.';
  return 'Haute variété. CHAQUE phrase doit commencer différemment.';
}
```

### 3. Create test file `packages/sovereign-engine/tests/input/prompt-voice-injection.test.ts`

```typescript
/**
 * OMEGA — Voice Genome Prompt Injection Tests
 * Invariant: VOICE-PROMPT-01..03
 *
 * Verifies that buildStyleGenomeSection injects voice genome targets
 * when packet.style_genome.voice is defined.
 */

import { describe, it, expect } from 'vitest';
import { buildSovereignPrompt } from '../../src/input/prompt-assembler-v2.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import type { VoiceGenome } from '../../src/voice/voice-genome.js';

const TEST_VOICE: VoiceGenome = {
  phrase_length_mean: 0.45,
  dialogue_ratio: 0.25,
  metaphor_density: 0.60,
  language_register: 0.80,
  irony_level: 0.15,
  ellipsis_rate: 0.30,
  abstraction_ratio: 0.35,
  punctuation_style: 0.55,
  paragraph_rhythm: 0.70,
  opening_variety: 0.65,
};

describe('Voice Genome Prompt Injection', () => {
  it('VOICE-PROMPT-01: injects all 10 voice genome parameters when voice defined', () => {
    const packet = createTestPacket({
      style_genome_voice: TEST_VOICE,
    });
    const prompt = buildSovereignPrompt(packet);
    const fullText = prompt.sections.map(s => s.content).join('\n');

    // All 10 params must appear with their values
    expect(fullText).toContain('Voice Genome Target');
    expect(fullText).toContain('0.45'); // phrase_length_mean
    expect(fullText).toContain('0.25'); // dialogue_ratio
    expect(fullText).toContain('0.60'); // metaphor_density
    expect(fullText).toContain('0.80'); // language_register
    expect(fullText).toContain('0.15'); // irony_level
    expect(fullText).toContain('0.30'); // ellipsis_rate
    expect(fullText).toContain('0.35'); // abstraction_ratio
    expect(fullText).toContain('0.55'); // punctuation_style
    expect(fullText).toContain('0.70'); // paragraph_rhythm
    expect(fullText).toContain('0.65'); // opening_variety
    expect(fullText).toContain('±10%');
  });

  it('VOICE-PROMPT-02: NO voice genome section when voice is undefined', () => {
    const packet = createTestPacket(); // no voice
    const prompt = buildSovereignPrompt(packet);
    const fullText = prompt.sections.map(s => s.content).join('\n');

    expect(fullText).not.toContain('Voice Genome Target');
  });

  it('VOICE-PROMPT-03: deterministic — same voice genome = same prompt hash', () => {
    const packet = createTestPacket({
      style_genome_voice: TEST_VOICE,
    });
    const prompt1 = buildSovereignPrompt(packet);
    const prompt2 = buildSovereignPrompt(packet);

    expect(prompt1.prompt_hash).toBe(prompt2.prompt_hash);
  });
});
```

NOTE: If `createTestPacket` doesn't support `style_genome_voice` option, check the existing test helper at `tests/helpers/test-packet-factory.ts` and add the option. The style_genome.voice field is optional in StyleProfile, so the test helper just needs to spread it in when building style_genome:

```typescript
// In test-packet-factory.ts, inside the style_genome object:
voice: options?.style_genome_voice,
```

### 4. Run all tests

```bash
cd packages/sovereign-engine && npx vitest run 2>&1 | tail -20
```

Expect: 805+ tests PASS (805 existing + 3 new), 0 failures.

### 5. Run live calibration (5 seeds)

Same as previous: run `scripts/calibrate.ts` with seeds 1-5, capture RCI scores.
Compare against baseline (RCI median 79.48 from previous run).

If ANTHROPIC_API_KEY is not available, skip this step and document the code change + tests as proof.

### 6. Commit

```bash
git add -A
git commit -m "feat(sovereign): inject VoiceGenome targets in draft prompt [VOICE-PROMPT] — 10 params quantitatifs + descripteurs actionnables"
git tag -a rci-voice-prompt-injection -m "Voice genome prompt injection: LLM now sees 10-param targets during generation"
```

## CRITICAL RULES

- Do NOT modify genius-contract-compiler.ts (separate module, not in pipeline)
- Do NOT modify engine.ts (no pipeline change needed)
- Do NOT modify voice-conformity.ts or macro-axes.ts (scorer layer is already correct)
- ONLY modify prompt-assembler-v2.ts (add voice genome to existing section)
- ONLY add new test file
- All 10 VoiceGenome params MUST appear in prompt with exact 2-decimal values
- Helper functions MUST be pure (same input → same string)
- Zero regression on existing 805 tests
