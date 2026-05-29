/**
 * V2.3-A P4 DIAG — isole le macro-axe qui produit NaN (canonicalize FATAL). OPT-IN.
 * Génère 1 prose qwen, appelle ECC/RCI/SII/IFI/AAI individuellement, scanne le NaN + son chemin.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveEmotionContractFromSegment } from '../src/chunking/deriveEmotionContract.js';
import { buildForgePacketFromSegment } from '../src/chunking/deriveForgePacket.js';
import { forgePacketToSceneBrief } from '../src/generation/forge-to-brief.js';
import { buildRewritePrompt, REWRITE_GENERATION_MODE } from '../src/chunking/rewritePrompt.js';
import { scalpelSegments } from '../src/chunking/abRouting.js';
import { createOllamaProvider } from '../src/runtime/ollama-provider.js';
import { computeECC, computeRCI, computeSII, computeIFI, computeAAI } from '../src/oracle/macro-axes.js';

const CORPUS = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/v2_1_1/corpus_text';
const SEL = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B2_book_selection.json';

function findNaN(obj: unknown, path: string, hits: string[]): void {
  if (typeof obj === 'number') { if (!Number.isFinite(obj)) hits.push(`${path}=${obj}`); return; }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) findNaN(v, `${path}.${k}`, hits);
  }
}

async function main(): Promise<void> {
  if (process.env.OMEGA_V2_3_CHUNK_COUPLING !== '1') { console.log('OPT-IN OFF (set OMEGA_V2_3_CHUNK_COUPLING=1)'); return; }
  const books = (JSON.parse(readFileSync(SEL, 'utf8')) as { books: string[] }).books;
  const raw = readFileSync(join(CORPUS, books[0]!), 'utf8').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2000).join(' ');
  const seg = scalpelSegments(raw)[0]!;
  const cand = deriveEmotionContractFromSegment(seg);
  const fp = buildForgePacketFromSegment(seg, cand);
  const brief = forgePacketToSceneBrief(fp.packet);
  const rp = buildRewritePrompt({ scene_brief: brief, source_segment: seg, source_segment_hash: cand.segment_hash, emotion_contract: cand.contract, rewrite_mode: 'rewrite' });
  const provider = createOllamaProvider({ model: 'qwen3:32b', baseUrl: 'http://localhost:11434', draftTemperature: 0.6, judgeTemperature: 0.3, draftMaxTokens: 1200, repeatPenalty: 1.4, frequencyPenalty: 0.6, repeatLastN: 256 });
  console.log('Génération 1 prose...');
  const prose = await provider.generateDraft(rp.prompt, REWRITE_GENERATION_MODE, 'diag');
  console.log(`prose ${prose.split(/\s+/).length} mots. Scoring axes individuels...`);

  const axes: Record<string, unknown> = {};
  axes['ECC'] = await computeECC(fp.packet, prose, provider);
  axes['RCI'] = await computeRCI(fp.packet, prose, provider);
  axes['SII'] = await computeSII(fp.packet, prose, provider);
  axes['IFI'] = await computeIFI(fp.packet, prose, provider);
  axes['AAI'] = await computeAAI(fp.packet, prose, provider);

  const hits: string[] = [];
  for (const [name, ax] of Object.entries(axes)) {
    const h: string[] = [];
    findNaN(ax, name, h);
    if (h.length) { console.log(`*** NaN dans ${name}: ${h.join(', ')}`); hits.push(...h); }
    else console.log(`OK ${name}.score=${(ax as { score?: number }).score}`);
  }
  writeFileSync('C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_3_DIAG_score.json', JSON.stringify({ nan_hits: hits, axes }, null, 2), 'utf8');
  console.log(hits.length ? `\nNaN TROUVÉ: ${hits.join(' | ')}` : '\nAUCUN NaN — le souci est ailleurs (composite/min_axis).');
}
main().catch((e) => { console.error('DIAG FATAL:', e); process.exit(1); });
