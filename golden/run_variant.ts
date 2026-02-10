import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import https from 'node:https';
import { sha256 } from '../packages/canon-kernel/src/index.js';

const pack = JSON.parse(readFileSync('golden/intents/intent_pack_gardien_variant.json', 'utf8'));
const apiKey = process.env.ANTHROPIC_API_KEY!;
const model = 'claude-sonnet-4-20250514';

const SYSTEM = `You are OMEGA, a deterministic narrative structure engine.
You generate narrative arc structures as valid JSON arrays.
Each arc must have: arc_id, title, purpose, scenes (array).
Return ONLY valid JSON array. Temperature=0.`;

const prompt = `Generate narrative arcs for the following story:

Title: ${pack.intent.title}
Premise: ${pack.intent.premise}
Themes: ${pack.intent.themes.join(', ')}
Core Emotion: ${pack.intent.core_emotion}
Target Word Count: ${pack.intent.target_word_count}
Message: ${pack.intent.message}

Canon entries:
${pack.canon.entries.map((e: any) => `- [${e.category}] ${e.statement}`).join('\n')}

Constraints:
- POV: ${pack.constraints.pov}
- Tense: ${pack.constraints.tense}
- Min scenes: ${pack.constraints.min_scenes}
- Max scenes: ${pack.constraints.max_scenes}

Generate a JSON array of narrative arcs.`;

function callAPI(): Promise<{ text: string; usage: any }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model, max_tokens: 4096, temperature: 0, system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    }, (res) => {
      let b = ''; res.on('data', (c: Buffer) => b += c.toString());
      res.on('end', () => {
        if (res.statusCode !== 200) { reject(new Error(`API ${res.statusCode}: ${b.substring(0, 200)}`)); return; }
        const p = JSON.parse(b);
        resolve({ text: p.content[0].text, usage: p.usage });
      });
    });
    req.on('error', (e: Error) => reject(e));
    req.write(body); req.end();
  });
}

async function main() {
  console.log('[VARIANT] Calling Claude for Le Gardien variant arcs...');
  const result = await callAPI();
  const hash = sha256(result.text);
  mkdirSync('golden/run_003/llm_responses', { recursive: true });
  writeFileSync('golden/run_003/llm_responses/arcs.json', result.text, 'utf8');
  writeFileSync('golden/run_003/llm_responses/arcs.meta.json', JSON.stringify({
    hash, length: result.text.length, usage: result.usage, model,
  }, null, 2), 'utf8');
  console.log(`[VARIANT] Arcs: ${result.text.length} chars, hash: ${hash.substring(0, 16)}...`);
  console.log(`[VARIANT] Usage: ${JSON.stringify(result.usage)}`);
}

main().catch(e => { console.error('[VARIANT] FATAL:', e.message); process.exit(1); });
