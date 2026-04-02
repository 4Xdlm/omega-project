# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — CLAUDE CODE MEGA-PROMPT — V5 + A/B TEST
#   "De correcteur intelligent à système causal piloté"
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   Date         : 2026-04-02
#   HEAD entrant : fda663ce (tag omega-rosetta-bridge-v1)
#   Branche      : phase-r-metrology-rebuild
#   Standard     : NASA-Grade L4 / DO-178C Level A
#   Autorité     : Francky (Architecte Suprême)
#   Mode         : AUTONOMIE TOTALE
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   CONTEXTE :
#   Le Rosetta Bridge existe (src/coupling/rosetta-bridge.ts).
#   V4 a déjà compileRosettaConstraints() avec 7 directives HARDCODÉES.
#   V5 = V4 + directives DYNAMIQUES du bridge (top 3 PILOTABLE seulement).
#
#   RÈGLES CHATGPT (SCELLÉES) :
#   - Ne JAMAIS injecter une feature ILLUSION (le LLM ment)
#   - Ne JAMAIS forcer une feature IRRÉDUCTIBLE (le LLM dégrade le reste)
#   - Commencer par 3 features TOP PILOTABLE (pas 7)
#   - KPI = réduction des passes de correction (pas juste le score)
#
#   MISSION :
#   1. Créer prompt-assembler-v5.ts (wrapper V4 + bridge dynamique)
#   2. A/B test V4 vs V5 sur 10 scènes (MOCK ou API si dispo)
#   3. Mesurer : composite, passes loop, drafts duel, delta
#   4. Rapport avec verdict GO/NO-GO pour activation V5
#
# ═══════════════════════════════════════════════════════════════════════════════

# CHEMINS
REPO     = C:\Users\elric\omega-project
SE_SRC   = packages\sovereign-engine\src
V4_FILE  = packages\sovereign-engine\src\input\prompt-assembler-v4.ts
BRIDGE   = packages\sovereign-engine\src\coupling\rosetta-bridge.ts
MATRIX   = packages\sovereign-engine\src\scoring\data\ROSETTA_BRIDGE_MATRIX.json

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 0 — SNAPSHOT + LECTURE OBLIGATOIRE
# ═══════════════════════════════════════════════════════════════════════════════

1. `git rev-parse HEAD` → attendu fda663ce
2. `cd packages\sovereign-engine && npx vitest run` → attendu 2031 passed
3. Si FAIL → STOP TOTAL

## LECTURE OBLIGATOIRE AVANT TOUTE ACTION :

1. src/input/prompt-assembler-v4.ts — LIRE EN ENTIER (423 lignes)
   Comprendre :
   - La fonction buildSovereignPrompt_V4() (lignes 78-115)
   - Les 11 blocs (compilePersona → compileFinalInstruction)
   - compileRosettaConstraints() (lignes 349-370) → C'EST ÇA QUE V5 REMPLACE
   - Comment isV4Active() contrôle l'activation (env var OMEGA_PROMPT_V4)

2. src/coupling/rosetta-bridge.ts — RELIRE
   Comprendre : translate() → prompt_directives + post_processing + shadow

3. src/scoring/data/ROSETTA_BRIDGE_MATRIX.json — RELIRE
   Comprendre : les 19 features, catégories, instructions, compliance_rate
   NOTER les 3 TOP PILOTABLE :
     f24e_contrast_score (100%), f15b_redundancy_compression (100%), f16a_bigram_rarity (100%)

4. src/engine.ts — LIRE les appels au prompt assembler
   Comprendre : comment V4 est appelé, quel résultat est attendu

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION V5-01 — CRÉER prompt-assembler-v5.ts
# ═══════════════════════════════════════════════════════════════════════════════

## Architecture V5

V5 N'EST PAS un remplacement de V4. C'est un WRAPPER :
  1. Appelle buildSovereignPrompt_V4() pour avoir le prompt de base
  2. REMPLACE le bloc Rosetta hardcodé par des directives dynamiques du bridge
  3. Contrôlé par env var OMEGA_PROMPT_V5=1

## Fichier : src/input/prompt-assembler-v5.ts

```typescript
/**
 * prompt-assembler-v5.ts — V5 Bridge-Driven Prompt Assembler
 *
 * V5 = V4 + Rosetta Bridge dynamique.
 * Remplace les contraintes mécaniques hardcodées (V4 bloc 10)
 * par des directives calibrées du Rosetta Bridge.
 *
 * RÈGLES SCELLÉES (convergence 3/3 IAs) :
 *   1. Ne JAMAIS injecter une feature ILLUSION
 *   2. Ne JAMAIS forcer une feature IRRÉDUCTIBLE
 *   3. Commencer par les 3 TOP PILOTABLE (phase 1)
 *   4. Mesurer le travail correctif, pas juste le score
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-02
 */

import { buildSovereignPrompt_V4, PROMPT_ASSEMBLER_V4_VERSION } from './prompt-assembler-v4.js';
import { RosettaBridge } from '../coupling/rosetta-bridge.js';
import type { ForgePacket, SovereignPrompt } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

export const PROMPT_ASSEMBLER_V5_VERSION = '5.0.0';

/** Top 3 PILOTABLE features only (Phase 1 — avoid multi-dim interference) */
const PHASE1_FEATURES = [
  'f24e_contrast_score',
  'f15b_redundancy_compression',
  'f16a_bigram_rarity',
] as const;

export function isV5Active(): boolean {
  return process.env.OMEGA_PROMPT_V5 === '1';
}

/**
 * Build V5 prompt = V4 base + Rosetta Bridge directives.
 *
 * Strategy:
 *   1. Get V4 prompt (all 11 blocs)
 *   2. Extract the Rosetta constraints bloc (V4 bloc 10)
 *   3. Replace with bridge-generated directives (TOP 3 PILOTABLE only)
 *   4. Keep everything else from V4 unchanged
 */
export function buildSovereignPrompt_V5(
  packet: ForgePacket,
  symbolMap: SymbolMap,
): SovereignPrompt {
  // 1. Get V4 base prompt
  const v4Prompt = buildSovereignPrompt_V4(packet, symbolMap);
  const v4Content = v4Prompt.sections[0]?.content ?? '';

  // 2. Get bridge directives for Phase 1 features only
  const bridge = new RosettaBridge();
  const targetFeatures: Record<string, number> = {};
  for (const feat of PHASE1_FEATURES) {
    targetFeatures[feat] = 1.0; // target = "maximize"
  }

  const bridgeResult = bridge.translate({
    target_features: targetFeatures,
    archetype: 'BALANCED', // TODO: derive from packet
    language: packet.language,
  });

  // 3. Build bridge constraint block
  const bridgeLines = [
    `Contraintes Rosetta Bridge (${bridgeResult.total_injectable} features pilotées, compliance attendue ${Math.round(bridgeResult.expected_compliance * 100)}%) :`,
  ];

  for (const directive of bridgeResult.prompt_directives) {
    bridgeLines.push(`- ${directive.name} : ${directive.instruction}`);
  }

  // Add warnings for IRRÉDUCTIBLE features
  for (const w of bridgeResult.warnings) {
    bridgeLines.push(`[INFO] ${w}`);
  }

  const bridgeBlock = bridgeLines.join('\n');

  // 4. Replace V4 Rosetta constraints with bridge-generated constraints
  // V4 bloc 10 starts with "Contraintes mécaniques (calibrées sur 450 tests)"
  const v4RosettaPattern = /Contraintes mécaniques \(calibrées sur 450 tests\)[^]*?(?=\n\nTension stylistique|$)/;
  let v5Content: string;

  if (v4RosettaPattern.test(v4Content)) {
    v5Content = v4Content.replace(v4RosettaPattern, bridgeBlock);
  } else {
    // Fallback: append bridge block if pattern not found
    console.warn('[V5] Could not find V4 Rosetta block — appending bridge directives');
    v5Content = v4Content + '\n\n' + bridgeBlock;
  }

  // 5. Rebuild prompt with V5 metadata
  const prompt_hash = sha256(canonicalize({ version: PROMPT_ASSEMBLER_V5_VERSION, content: v5Content }));

  return {
    sections: [{
      section_id: 'v5_bridge',
      title: 'PROMPT V5 (BRIDGE)',
      content: v5Content,
      priority: 'critical',
    }],
    total_length: v5Content.length,
    prompt_hash,
  };
}
```

NOTE : Ce code est un MODÈLE. Claude Code doit :
  1. LIRE le V4 pour vérifier que le pattern regex correspond
  2. ADAPTER si la structure est différente
  3. VÉRIFIER que l'import du RosettaBridge fonctionne
  4. Si le pattern ne matche pas → utiliser une autre stratégie de remplacement


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION V5-02 — CÂBLER V5 DANS engine.ts (CONDITIONNEL — env var)
# ═══════════════════════════════════════════════════════════════════════════════

## AVANT de modifier engine.ts :
1. LIRE engine.ts lignes 38-42 (imports prompt assembler)
2. LIRE engine.ts là où buildSovereignPrompt_V4 est appelé
3. Comprendre le flow : isV4Active() → V4, sinon → V2

## MODIFICATION (chirurgicale, 3 lignes) :

1. Ajouter l'import en haut :
```typescript
import { isV5Active, buildSovereignPrompt_V5 } from './input/prompt-assembler-v5.js';
```

2. Là où V4 est appelé (probablement dans executePipeline), ajouter :
```typescript
// V5 Bridge-Driven (env OMEGA_PROMPT_V5=1)
const prompt = isV5Active()
  ? buildSovereignPrompt_V5(enrichedPacket, symbolMap)
  : isV4Active()
    ? buildSovereignPrompt_V4(enrichedPacket, symbolMap)
    : buildSovereignPrompt(enrichedPacket as any);
```

⚠️ ATTENTION : engine.ts a risk=160 (CRITICAL). Modifier uniquement
les lignes nécessaires. Tests IMMÉDIATEMENT après.

## APRÈS modification :
`npx vitest run` → 2031 passed. Si FAIL → `git checkout src/engine.ts`

# ═══════════════════════════════════════════════════════════════════════════════
# ACTION V5-03 — TESTS V5
# ═══════════════════════════════════════════════════════════════════════════════

Créer tests/input/prompt-assembler-v5.test.ts :

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildSovereignPrompt_V5, isV5Active } from '../../src/input/prompt-assembler-v5.js';

describe('prompt-assembler-v5', () => {
  it('should not be active by default', () => {
    expect(isV5Active()).toBe(false);
  });

  it('should be active when OMEGA_PROMPT_V5=1', () => {
    process.env.OMEGA_PROMPT_V5 = '1';
    expect(isV5Active()).toBe(true);
    delete process.env.OMEGA_PROMPT_V5;
  });

  // Test with a MOCK packet (reuse existing test fixtures)
  // ADAPTER : trouver un fixture ForgePacket dans les tests existants
  // et l'utiliser pour tester buildSovereignPrompt_V5
});
```

ADAPTER les tests en fonction des fixtures existantes dans tests/.


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION V5-04 — A/B TEST V4 vs V5
# ═══════════════════════════════════════════════════════════════════════════════

## Stratégie A/B

Le test compare V4 (hardcodé) vs V5 (bridge dynamique) sur les MÊMES scènes.
On ne peut PAS faire de run LLM réel (pas de clé API dans Claude Code).
Donc le test est sur le PROMPT GÉNÉRÉ, pas sur la prose produite.

## Option A — Test PROMPT uniquement (FAISABLE MAINTENANT)

Comparer les prompts V4 et V5 pour les mêmes 10 ForgePackets :
1. Charger/créer 10 ForgePackets variés (5 FR + 5 EN, mix conflict_types)
2. Générer le prompt V4 pour chaque
3. Générer le prompt V5 pour chaque
4. Mesurer :
   - Taille du prompt (tokens estimés)
   - Nombre de directives injectées
   - Quelles directives sont DIFFÉRENTES entre V4 et V5
   - Le bloc Rosetta dans V5 est-il plus COURT (moins de bruit) ?

Écrire un script TypeScript (ou un test) :
```typescript
// tests/input/v4-vs-v5-comparison.test.ts
import { describe, it, expect } from 'vitest';
import { buildSovereignPrompt_V4 } from '../../src/input/prompt-assembler-v4.js';
import { buildSovereignPrompt_V5 } from '../../src/input/prompt-assembler-v5.js';
// Importer ou créer des fixtures ForgePacket
// ...

describe('V4 vs V5 A/B comparison', () => {
  // Charger 10 packets (ADAPTER selon les fixtures existantes)
  const packets = getTestPackets(10);

  for (const packet of packets) {
    it(`should produce different Rosetta blocks for ${packet.packet_id}`, () => {
      const mockSymbolMap = createMockSymbolMap();
      const v4 = buildSovereignPrompt_V4(packet, mockSymbolMap);
      
      process.env.OMEGA_PROMPT_V5 = '1';
      const v5 = buildSovereignPrompt_V5(packet, mockSymbolMap);
      delete process.env.OMEGA_PROMPT_V5;

      // V5 devrait avoir des directives bridge au lieu de hardcodé
      const v4content = v4.sections[0].content;
      const v5content = v5.sections[0].content;

      // V4 contient "calibrées sur 450 tests"
      expect(v4content).toContain('calibrées sur 450 tests');
      // V5 contient "Rosetta Bridge"
      expect(v5content).toContain('Rosetta Bridge');
      // V5 ne contient PAS "calibrées sur 450 tests"
      expect(v5content).not.toContain('calibrées sur 450 tests');
    });
  }

  it('should produce a shorter Rosetta block in V5', () => {
    const packet = packets[0];
    const mockSymbolMap = createMockSymbolMap();
    const v4 = buildSovereignPrompt_V4(packet, mockSymbolMap);

    process.env.OMEGA_PROMPT_V5 = '1';
    const v5 = buildSovereignPrompt_V5(packet, mockSymbolMap);
    delete process.env.OMEGA_PROMPT_V5;

    // V5 avec 3 features devrait être plus court que V4 avec 7 directives
    // (pas garanti mais probable)
    console.log(`V4 prompt length: ${v4.total_length} chars`);
    console.log(`V5 prompt length: ${v5.total_length} chars`);
  });
});
```

NOTE : Il faudra des fixtures ForgePacket + SymbolMap.
Chercher dans tests/ les fixtures existantes et les réutiliser.
Si aucune fixture n'existe → en créer une minimale.

## Option B — Test BENCH RÉEL (SI clé API disponible)

Si une clé API Anthropic est trouvée dans le .env :
1. Lancer 5 scènes en V4 (OMEGA_PROMPT_V4=1, OMEGA_PROMPT_V5 absent)
2. Lancer 5 mêmes scènes en V5 (OMEGA_PROMPT_V5=1)
3. Comparer :
   - composite final
   - nombre de passes Sovereign Loop (0/1/2)
   - nombre de drafts Duel (1/2/3)
   - SEAL/REJECT ratio

C'est le test IDÉAL mais il nécessite l'API. Si pas de clé → Option A seule.


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION V5-05 — RAPPORT A/B
# Livrable : docs/irm/V5_AB_TEST_REPORT.md
# ═══════════════════════════════════════════════════════════════════════════════

Produire un rapport avec :

```markdown
# V5 Bridge A/B Test Report

## Configuration
- V4 : compileRosettaConstraints hardcodé (7 directives)
- V5 : Rosetta Bridge dynamique (3 TOP PILOTABLE)

## Résultats prompt comparison
| Métrique | V4 | V5 | Delta |
|----------|----|----|-------|
| Prompt length (chars) | X | X | X |
| Rosetta block length | X | X | X |
| Directives count | 7 | 3 | -4 |
| Features PILOTABLE injectées | 7 (mix) | 3 (top) | -4 |
| Features ILLUSION injectées | 0 (V4 les évitait déjà) | 0 | 0 |

## Différences qualitatives
- V4 : directives génériques ("vocabulaire varié", "contraste")
- V5 : directives calibrées avec taux de compliance (100%, 100%, 100%)
- V5 est plus CIBLÉ (3 features à 100% compliance vs 7 features à compliance variable)

## Verdict
[GO / NO-GO / NEEDS_MORE_DATA]

## Prochaine étape si GO
1. Bench réel avec API (10 scènes V4 vs 10 scènes V5)
2. Mesurer passes Sovereign Loop + drafts Duel
3. Si ratio compensatoire baisse → V5 en production shadow
```

# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

## Tests finaux
```powershell
Set-Location C:\Users\elric\omega-project\packages\sovereign-engine
npx vitest run
```

## Commit
```
feat(v5): prompt-assembler-v5 + Rosetta Bridge integration + A/B test

V5-01: prompt-assembler-v5.ts créé (wrapper V4 + bridge dynamique)
  - 3 TOP PILOTABLE : f24e, f15b, f16a (100% compliance)
  - ILLUSION et IRRÉDUCTIBLE bloqués EN DUR
  - Activé par env OMEGA_PROMPT_V5=1
V5-02: engine.ts câblé (isV5Active → V5, isV4Active → V4, default → V2)
V5-03: Tests V5 [N tests passing]
V5-04: A/B test prompt V4 vs V5 [résultats dans rapport]
V5-05: V5_AB_TEST_REPORT.md

Tests: [N] passed, 0 failed
```

```powershell
Set-Location C:\Users\elric\omega-project
git add -A
git commit -F commit_msg.txt
git tag omega-v5-bridge-v1
git push origin phase-r-metrology-rebuild --tags
```

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKLIST FINALE — 10 CONTRÔLES
# ═══════════════════════════════════════════════════════════════════════════════

[ ] 1. src/input/prompt-assembler-v5.ts créé
[ ] 2. isV5Active() fonctionne (env OMEGA_PROMPT_V5=1)
[ ] 3. V5 injecte SEULEMENT 3 features TOP PILOTABLE
[ ] 4. V5 NE contient PAS de features ILLUSION ou IRRÉDUCTIBLE
[ ] 5. engine.ts câblé (V5 → V4 → V2 cascade)
[ ] 6. Tests V5 passing
[ ] 7. A/B comparison V4 vs V5 exécuté (prompt level)
[ ] 8. V5_AB_TEST_REPORT.md produit avec verdict
[ ] 9. Tests totaux ≥ 2031, 0 FAIL
[ ] 10. Tag omega-v5-bridge-v1 pushé

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLE D'OR
# ═══════════════════════════════════════════════════════════════════════════════
#
# engine.ts est le fichier le PLUS RISQUÉ du système (risk=160).
# La modification doit être MINIMALE : 1 import + 1 condition ternaire.
# Si le build casse → git checkout src/engine.ts IMMÉDIATEMENT.
#
# Le V5 est activé par env var. Par DÉFAUT → V4 est actif.
# Rien ne change en production tant que OMEGA_PROMPT_V5=1 n'est pas set.
#
# L'A/B test est au niveau PROMPT, pas au niveau PROSE.
# Le bench réel (avec API LLM) sera fait quand Francky fournira la clé.
#
# "Ce qui n'est pas mesuré n'est pas acceptable."
# Standard : NASA-Grade L4 / DO-178C Level A
# Autorité : Francky (Architecte Suprême)
# ═══════════════════════════════════════════════════════════════════════════════
