/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — VERIFY AAI BUG-01 FIX
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Appelle computeAAI (scoreAuthenticity) sur 3 textes très différents.
 * Si les 3 AAI sont identiques → le fix n'a pas marché.
 * Si les 3 AAI varient → BUG-01 résolu.
 *
 * Budget : 3-6 API calls
 * Usage : npx tsx scripts/verify-aai-fix.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { scoreAuthenticity } from '../src/authenticity/authenticity-scorer.js';
import { SemanticCache } from '../src/semantic/semantic-cache.js';

// ─── 3 textes très différents ────────────────────────────────────────────────

const TEXTS: readonly { label: string; prose: string }[] = [
  {
    label: 'A) Contemplation littéraire (humain)',
    prose: `Le silence avait une odeur de fer. Marguerite serrait les dents si fort
qu'elle sentait le goût du sang monter entre ses gencives, cuivré, familier
comme un vieux mensonge. Dehors, le vent grattait la vitre — un bruit de
chat qui veut rentrer. Elle n'ouvrit pas. Elle n'ouvrirait plus. Le radiateur
claquait toutes les sept secondes, elle comptait, parce que compter c'était
ne pas penser à l'enveloppe posée sur la table, cette enveloppe kraft
qu'elle n'avait pas ouverte et qui pesait déjà plus lourd que tout ce
qu'elle avait porté dans sa vie.`,
  },
  {
    label: 'B) Dialogue sec (neutre)',
    prose: `— T'as fini ?
— Non.
— Quand ?
— Je sais pas. Demain peut-être.
— Demain c'est trop tard.
— Alors c'est trop tard.
Il raccrocha. Le téléphone glissa de sa main et tomba sur le carrelage
avec un bruit mat. Il ne le ramassa pas.`,
  },
  {
    label: 'C) Texte IA générique (pattern IA)',
    prose: `Dans un monde en constante évolution, il est essentiel de reconnaître
l'importance de la communication interpersonnelle. En effet, les relations
humaines constituent le fondement même de notre société. Par conséquent,
il convient d'adopter une approche holistique qui prend en compte les
multiples dimensions de l'expérience humaine. En conclusion, nous pouvons
affirmer que la compréhension mutuelle est la clé d'un avenir harmonieux
et prospère pour l'ensemble de l'humanité.`,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const provider = createAnthropicProvider({
    apiKey,
    model: 'claude-sonnet-4-20250514',
    judgeStable: true,
    draftTemperature: 0.7,
    judgeTemperature: 0.1,
    judgeTopP: 0.95,
    judgeMaxTokens: 300,
  });

  // Cache frais pour chaque texte (pas de réutilisation)
  const cache = new SemanticCache();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — VERIFY AAI BUG-01 FIX');
  console.log('  3 textes → 3 appels LLM adversarial → AAI doit VARIER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const scores: { label: string; calc: number; fraud: number | null; combined: number }[] = [];

  for (const { label, prose } of TEXTS) {
    console.log(`─── ${label} ───`);
    const result = await scoreAuthenticity(prose, provider, cache);
    console.log(`  CALC score     : ${result.calc_score}`);
    console.log(`  fraud_score    : ${result.fraud_score}`);
    console.log(`  combined (AAI) : ${result.combined_score}`);
    console.log(`  pattern_hits   : [${result.pattern_hits.join(', ')}]`);
    console.log();
    scores.push({
      label,
      calc: result.calc_score,
      fraud: result.fraud_score,
      combined: result.combined_score,
    });
  }

  // ─── Verdict ──────────────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  VERDICT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const combinedScores = scores.map(s => s.combined);
  const uniqueCombined = new Set(combinedScores);
  const fraudScores = scores.map(s => s.fraud);
  const allFraudNull = fraudScores.every(f => f === null);

  if (allFraudNull) {
    console.log('  FAIL — fraud_score est null pour TOUS les textes.');
    console.log('  Le LLM adversarial ne fonctionne toujours pas.');
    console.log('  BUG-01 NON RÉSOLU.');
    process.exit(1);
  }

  if (uniqueCombined.size === 1) {
    console.log(`  FAIL — AAI identique pour les 3 textes : ${combinedScores[0]}`);
    console.log('  Le fix n\'a pas eu d\'effet.');
    console.log('  BUG-01 NON RÉSOLU.');
    process.exit(1);
  }

  console.log('  PASS — AAI varie entre les textes :');
  for (const s of scores) {
    console.log(`    ${s.label}: AAI=${s.combined} (CALC=${s.calc}, fraud=${s.fraud})`);
  }
  console.log();
  console.log(`  ${uniqueCombined.size} valeurs distinctes sur 3 textes.`);
  console.log('  BUG-01 RÉSOLU.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
