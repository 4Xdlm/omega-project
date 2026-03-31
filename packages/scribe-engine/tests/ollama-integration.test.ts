/**
 * OMEGA — Test d'intégration Ollama Provider
 * Lance un appel réel à Ollama local pour vérifier que tout fonctionne.
 *
 * Usage : npx tsx tests/ollama-integration.test.ts
 */

import { createOllamaProvider } from '../src/providers/ollama-provider.js';
import type { OllamaProviderConfig } from '../src/providers/ollama-provider.js';
import type { ScribeContext } from '../src/providers/types.js';

const TEST_CONTEXT: ScribeContext = {
  sceneId: 'test-ollama-001',
  arcId: 'test-arc',
  skeletonHash: 'deadbeef',
  seed: 'bench-seed-42',
};

const TEST_PROMPT = `═══ SCENE ARCHITECTURE: test-ollama-001 ═══
Arc: Test d'intégration
Dramatic objective: Vérifier que le provider Ollama fonctionne
Target length: ~150 words

═══ NARRATIVE BEATS (2 moments) ═══
Beat 1/2: Un docker descend la passerelle du cargo à l'aube
Beat 2/2: Il s'arrête devant un bollard rouillé et observe le quai

Now write. Pure prose. No headers, no markers, no commentary.`;

const config: OllamaProviderConfig = {
  mode: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  temperature: 0.8,
  maxTokens: 2048,
};

async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('  OMEGA — Test Ollama Provider');
  console.log('═══════════════════════════════════════\n');

  // Test 1 : Prose generation
  console.log('TEST 1 — Prose generation (qwen3.5:35b-a3b)');
  console.log('─'.repeat(50));
  const proseProvider = createOllamaProvider(config, 'prose');
  const proseResult = proseProvider.generateSceneProse(TEST_PROMPT, TEST_CONTEXT);
  console.log(`\n📝 Résultat :`);
  console.log(`   Modèle  : ${proseResult.model}`);
  console.log(`   Mots    : ${proseResult.prose.split(/\s+/).filter(Boolean).length}`);
  console.log(`   Hash    : ${proseResult.proseHash.slice(0, 16)}...`);
  console.log(`   Cached  : ${proseResult.cached}`);
  console.log(`\n--- PROSE ---`);
  console.log(proseResult.prose.slice(0, 500) + (proseResult.prose.length > 500 ? '\n[...]' : ''));
  console.log(`--- FIN ---\n`);

  // Test 2 : Correction task (même modèle, routing différent)
  console.log('TEST 2 — Correction (routing auto-repair)');
  console.log('─'.repeat(50));
  const correctionProvider = createOllamaProvider(config, 'correction');
  const correctionPrompt = `Réécris ce paragraphe médiocre en respectant toutes les contraintes SCRIBE :

"Le port était beau au lever du soleil. Les bateaux se balançaient. Il se sentait triste."

Consignes : éliminer les clichés, densifier les sens, remplacer les émotions nommées par des perceptions corporelles.`;

  const corrResult = correctionProvider.generateSceneProse(correctionPrompt, {
    ...TEST_CONTEXT,
    sceneId: 'test-correction-001',
  });
  console.log(`\n📝 Résultat :`);
  console.log(`   Modèle  : ${corrResult.model}`);
  console.log(`   Mots    : ${corrResult.prose.split(/\s+/).filter(Boolean).length}`);
  console.log(`\n--- CORRECTION ---`);
  console.log(corrResult.prose.slice(0, 500) + (corrResult.prose.length > 500 ? '\n[...]' : ''));
  console.log(`--- FIN ---\n`);

  // Test 3 : Force model override
  console.log('TEST 3 — Force model (qwen3:32b)');
  console.log('─'.repeat(50));
  const forceConfig: OllamaProviderConfig = { ...config, forceModel: 'qwen3:32b' };
  const forceProvider = createOllamaProvider(forceConfig, 'prose');
  const forceResult = forceProvider.generateSceneProse(TEST_PROMPT, {
    ...TEST_CONTEXT,
    sceneId: 'test-force-001',
  });
  console.log(`\n📝 Résultat :`);
  console.log(`   Modèle  : ${forceResult.model}`);
  console.log(`   Mots    : ${forceResult.prose.split(/\s+/).filter(Boolean).length}`);
  console.log(`\n--- PROSE (qwen3:32b) ---`);
  console.log(forceResult.prose.slice(0, 500) + (forceResult.prose.length > 500 ? '\n[...]' : ''));
  console.log(`--- FIN ---\n`);

  // Résumé
  console.log('═══════════════════════════════════════');
  console.log('  RÉSUMÉ');
  console.log('═══════════════════════════════════════');
  const allResults = [
    { name: 'Prose (qwen3.5)', result: proseResult },
    { name: 'Correction (qwen3.5)', result: corrResult },
    { name: 'Force (qwen3:32b)', result: forceResult },
  ];
  let allPassed = true;
  for (const { name, result } of allResults) {
    const words = result.prose.split(/\s+/).filter(Boolean).length;
    const ok = words > 0;
    if (!ok) allPassed = false;
    console.log(`  ${ok ? '✅' : '❌'} ${name} → ${result.model} → ${words} mots`);
  }
  console.log(`\n  ${allPassed ? '🎉 TOUS LES TESTS PASSENT' : '⚠️  CERTAINS TESTS ONT ÉCHOUÉ'}`);
  console.log('═══════════════════════════════════════\n');
}

runTests().catch(console.error);
