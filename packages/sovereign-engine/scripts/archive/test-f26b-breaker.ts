/**
 * OMEGA — f26b Breaker v2: 21 prompt variants to force long sentences
 * Tests which prompt engineering technique best produces f26b > 0
 *
 * Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-f26b-breaker.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;
const MAX_TOKENS = 2000;

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}

const TAG = '<prose>';
const TAG_END = '</prose>';
const TAG_SUFFIX = `\nEncadre EXCLUSIVEMENT tes phrases finales entre ${TAG} et ${TAG_END}. Rien d'autre dans ces balises.`;

const VARIANTS: Array<{ id: string; family: string; prompt: string }> = [
  // FAMILY A: Statistical baseline
  { id: 'A1', family: 'A_stat', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nCONTRAINTE : chaque phrase doit faire au moins 40 mots.${TAG_SUFFIX}` },
  { id: 'A2', family: 'A_stat', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nCONTRAINTE ABSOLUE : 100% des phrases doivent dépasser 40 mots. Aucune phrase courte.${TAG_SUFFIX}` },

  // FAMILY B: Local structure
  { id: 'B1', family: 'B_struct', prompt: `Écris exactement 6 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nSTRUCTURE OBLIGATOIRE :\n- Phrase 1 : courte (8-12 mots)\n- Phrase 2 : moyenne (15-20 mots)\n- Phrase 3 : LONGUE (40-60 mots, avec subordonnées)\n- Phrase 4 : moyenne (15-20 mots)\n- Phrase 5 : courte (8-12 mots)\n- Phrase 6 : LONGUE (40-60 mots, avec subordonnées)${TAG_SUFFIX}` },
  { id: 'B2', family: 'B_struct', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nRÈGLE ABSOLUE D'ALTERNANCE :\n- Phrase impaire (1, 3) : COURTE (5-10 mots, coup sec)\n- Phrase paire (2, 4) : TRÈS LONGUE (45-60 mots, subordonnées en cascade)\nCette alternance est NON NÉGOCIABLE.${TAG_SUFFIX}` },
  { id: 'B3', family: 'B_struct', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nLOI DE RYTHME (violation = échec) :\n- 1 phrase longue (40+ mots) toutes les 2 phrases\n- Après une phrase longue, une phrase courte OBLIGATOIRE\n- Aucune séquence de 2 phrases de même longueur${TAG_SUFFIX}` },

  // FAMILY C: Classical period / Flaubert
  { id: 'C1', family: 'C_period', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nTECHNIQUE OBLIGATOIRE — LA PÉRIODE CLASSIQUE :\nChaque phrase doit être une PÉRIODE en trois temps dans UNE SEULE phrase :\n1. PROTASE : pose la situation (proposition principale courte)\n2. ACMÉ : développe et complique (2-3 subordonnées qui s'emboîtent)\n3. APODOSE : résout dans une image sensorielle (retour au concret)\nLe tout en UNE phrase, sans point avant l'apodose.${TAG_SUFFIX}` },
  { id: 'C2', family: 'C_period', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nCONTRAINTE SYNTAXIQUE ABSOLUE :\nChaque phrase DOIT contenir au minimum 3 propositions subordonnées emboîtées les unes dans les autres (relatives, circonstancielles, participiales).\nLa phrase ne peut se terminer par un point qu'après la 3ème subordonnée.${TAG_SUFFIX}` },
  { id: 'C3', family: 'C_period', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nTECHNIQUE DE FLAUBERT — LE GUEULOIR :\nChaque phrase doit suivre la CADENCE MAJEURE française :\n- Le premier membre est court (5-8 mots) — il POSE\n- Le deuxième membre est plus long (10-15 mots) — il DÉVELOPPE\n- Le troisième membre est le plus long (20-30 mots) — il DÉPLOIE\nLe tout en UNE phrase reliée par des virgules et des conjonctions.\nImagine que tu lis chaque phrase à voix haute : elle doit MONTER en ampleur.${TAG_SUFFIX}` },
  { id: 'C4', family: 'C_period', prompt: `Écris exactement 2 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nSTYLE PROUSTIEN OBLIGATOIRE :\nChaque phrase doit être une phrase-fleuve de 60 à 100 mots minimum.\nLa phrase commence par une observation simple, puis s'enrichit d'incises, de souvenirs, de comparaisons, de digressions sensorielles, le tout relié par des virgules, des tirets, des parenthèses, des points-virgules, sans JAMAIS placer de point final avant d'avoir épuisé la pensée.${TAG_SUFFIX}` },

  // FAMILY D: Exemplars / Pattern matching
  { id: 'D1', family: 'D_exemp', prompt: `RÉFÉRENCE DE LONGUEUR (lis d'abord, puis imite) :\n\nPHRASE COURTE : "Il poussa la porte."\nPHRASE LONGUE : "Il poussa la porte de l'église, dont le bois gonflé par des décennies d'humidité résistait sous ses doigts engourdis par le froid, et lorsqu'elle céda enfin dans un grincement qui se propagea sous les voûtes obscures comme un appel que personne n'entendrait, il sentit contre son visage le souffle glacé d'un lieu que le temps avait oublié."\n\nMaintenant, écris exactement 4 phrases sur le même sujet ("Un homme entre dans une église vide au crépuscule") en utilisant UNIQUEMENT le niveau PHRASE LONGUE.\nChaque phrase doit avoir la même ampleur et la même structure que l'exemple LONGUE ci-dessus.${TAG_SUFFIX}` },
  { id: 'D2', family: 'D_exemp', prompt: `MODÈLE SYNTAXIQUE À IMITER :\n\nVoici une phrase de Flaubert (Madame Bovary) :\n"La flamme du foyer faisait trembler au plafond une clarté joyeuse ; et, à travers les carreaux de la fenêtre, on apercevait au loin des étoiles, tandis que la nuit était douce et que le vent, en passant dans les grands arbres du jardin, semblait apporter, avec le parfum des roses, quelque chose de la fraîcheur des premières heures."\n\nCette phrase fait 62 mots. Écris exactement 4 phrases sur ce sujet ("Un homme entre dans une église vide au crépuscule") avec EXACTEMENT la même structure syntaxique. Chaque phrase doit faire entre 50 et 70 mots.${TAG_SUFFIX}` },
  { id: 'D3', family: 'D_exemp', prompt: `ÉCHELLE DE DENSITÉ SYNTAXIQUE OMEGA :\n\nDENSITÉ 1 (commercial) : "Il entra dans l'église." (5 mots)\nDENSITÉ 5 (maître / Flaubert) : "Il entra dans l'église vide dont les voûtes immenses, noircies par des siècles de fumée de cierges, laissaient tomber un froid de caveau qui lui saisit les épaules et le fit frissonner, tandis que l'odeur de cire fondue et de pierre humide, mêlée à celle plus ténue de l'encens que personne n'avait brûlé depuis des mois, lui rappelait avec une violence inattendue les matins de son enfance où sa mère le traînait par la main jusqu'au premier banc." (80 mots)\n\nÉcris exactement 4 phrases EN DENSITÉ 5 EXCLUSIVEMENT.${TAG_SUFFIX}` },

  // FAMILY E: Grammatical constraints
  { id: 'E1', family: 'E_gram', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nCONTRAINTE GRAMMATICALE ABSOLUE :\nChaque phrase doit contenir AU MINIMUM :\n- 1 proposition relative (qui/que/dont/où)\n- 1 proposition circonstancielle (tandis que/alors que/lorsque/bien que)\n- 1 proposition participiale (verbe au participe présent ou passé)\nChaque phrase ne doit contenir qu'UN SEUL point final, à la toute fin.${TAG_SUFFIX}` },
  { id: 'E2', family: 'E_gram', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nCONTRAINTE DE PONCTUATION ABSOLUE :\nTu n'as PAS LE DROIT de placer un point (.) avant d'avoir écrit au moins 50 mots.\nTu peux utiliser des virgules, des points-virgules, des tirets, des parenthèses.\nMais le POINT FINAL est INTERDIT avant le 50ème mot de chaque phrase.${TAG_SUFFIX}` },
  { id: 'E3', family: 'E_gram', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nCONTRAINTE DE PONCTUATION :\nChaque phrase doit contenir AU MINIMUM 4 virgules et 1 point-virgule AVANT le point final. Chaque virgule introduit une nouvelle proposition, une incise, une apposition, ou une circonstancielle.${TAG_SUFFIX}` },
  { id: 'E4', family: 'E_gram', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\nINTERDICTION ABSOLUE — POINT FINAL :\nAUCUN point (.) n'est autorisé avant le 60ème mot de chaque phrase.\nSi tu places un point avant 60 mots → la réponse entière est INVALIDE.\nUtilise des virgules, points-virgules, tirets, incises — tout SAUF le point.\nLe point ne vient qu'après 60 mots minimum. C'est NON NÉGOCIABLE.${TAG_SUFFIX}` },

  // FAMILY F: Retro-engineering
  { id: 'F1', family: 'F_retro', prompt: `Sujet : "Un homme entre dans une église vide au crépuscule."\n\nÉTAPE 1 — PLAN SYNTAXIQUE (écris ce plan d'abord, HORS des balises prose) :\nPour chaque phrase, liste AVANT d'écrire :\n- La proposition principale\n- Les 3 subordonnées que tu vas y emboîter\n- Le mot de liaison pour chaque subordonnée\n\nÉTAPE 2 — EXÉCUTION :\nÉcris les 4 phrases en suivant EXACTEMENT ton plan.\nChaque phrase doit faire 50+ mots grâce aux 3 subordonnées planifiées.\nEncadre EXCLUSIVEMENT tes 4 phrases finales (pas le plan) entre ${TAG} et ${TAG_END}. Rien d'autre dans ces balises.` },
  { id: 'F2', family: 'F_retro', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\n\nAVERTISSEMENT CRITIQUE :\nTu as une tendance CONNUE et DOCUMENTÉE à couper tes phrases trop tôt.\nTu places des points finaux après 15-20 mots alors que la phrase n'est pas terminée.\nC'est un DÉFAUT que tu dois consciemment COMBATTRE dans ce texte.\n\nRÈGLE : quand tu sens l'envie de mettre un point, RÉSISTE.\nAjoute plutôt une virgule, un point-virgule, ou un tiret, et CONTINUE la phrase.\nNe place un point que lorsque tu as ÉPUISÉ la pensée complète (40+ mots minimum).${TAG_SUFFIX}` },
  { id: 'F3', family: 'F_retro', prompt: `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, travaillant à ton bureau de Croisset.\n\nTu écris 4 phrases sur ce sujet : "Un homme entre dans une église vide au crépuscule."\n\nTu utilises ta technique habituelle :\n- Tu lis chaque phrase à voix haute (le gueuloir)\n- Tu refuses toute phrase qui ne SONNE pas\n- Tu détestes les phrases courtes qui font "scolaire"\n- Tu construis des PÉRIODES avec des subordonnées en cascade\n- Tu ne mets un point que quand la phrase a atteint sa pleine ampleur\n\nÉcris comme TU écris. Pas comme une IA. Comme Gustave Flaubert.${TAG_SUFFIX}` },
  { id: 'F4', family: 'F_retro', prompt: `DIAGNOSTIC :\nLes analyses montrent que tes phrases font en moyenne 18 mots.\nLes maîtres de la littérature française font 29 mots en moyenne.\nTu es 11 mots en dessous de la cible.\n\nCela signifie que tu coupes tes phrases TROP TÔT.\nTu places un point là où Flaubert mettrait une virgule.\n\nOBJECTIF DE CE TEST :\nÉcris 4 phrases sur ce sujet : "Un homme entre dans une église vide au crépuscule."\nChaque phrase doit faire MINIMUM 45 mots. Pas 20, pas 30, pas 40. QUARANTE-CINQ.\nSi une phrase fait moins de 45 mots, elle est RATÉE.\nCompte mentalement. Vérifie avant de mettre un point.${TAG_SUFFIX}` },

  // FAMILY G: Fusion
  { id: 'G1', family: 'G_fusion', prompt: `RÉFÉRENCE (lis d'abord) :\n"Il poussa la porte de l'église, dont le bois gonflé par des décennies d'humidité résistait sous ses doigts engourdis par le froid, et lorsqu'elle céda enfin dans un grincement qui se propagea sous les voûtes obscures comme un appel que personne n'entendrait, il sentit contre son visage le souffle glacé d'un lieu que le temps avait oublié." (55 mots, 1 seul point)\n\nTECHNIQUE : chaque phrase longue = une PÉRIODE (protase → acmé → apodose).\nSTRUCTURE : 4 phrases, alternance courte/longue : 8 mots, 55+ mots, 8 mots, 55+ mots.\nINTERDIT : placer un point dans une phrase longue avant d'avoir écrit 50 mots.\nGRAMMATICAL : chaque phrase longue = 1 relative + 1 circonstancielle + 1 participiale minimum.\n\nSujet : "Un homme entre dans une église vide au crépuscule."${TAG_SUFFIX}` },

  // FAMILY H: Physical constraint
  { id: 'H1', family: 'H_phys', prompt: `Écris exactement 4 phrases de prose littéraire française sur ce sujet :\n"Un homme entre dans une église vide au crépuscule."\n\nCONTRAINTE PHYSIQUE — CHAQUE PHRASE DOIT CONTENIR :\n- au moins 3 virgules\n- au moins 1 mot "qui" ou "dont" ou "où" (relative)\n- au moins 1 expression parmi : "tandis que", "lorsque", "alors que", "bien que" (circonstancielle)\n- au moins 1 participe présent (verbe en -ant)\n\nSi UNE SEULE de ces 4 conditions manque dans une phrase → la phrase est INVALIDE.${TAG_SUFFIX}` },
];

// ═══════════════════════════════════════════════════════════════
// GENERATE WITH <prose> EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function generate(client: Anthropic, prompt: string): Promise<string> {
  const res = await client.messages.create({
    model: MODEL, max_tokens: MAX_TOKENS, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = res.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');

  // Extract content between <prose> and </prose>
  const match = block.text.match(/<prose>([\s\S]*?)<\/prose>/);
  if (match) return match[1].trim();
  return block.text.trim(); // fallback
}

// ═══════════════════════════════════════════════════════════════
// MEASURE
// ═══════════════════════════════════════════════════════════════

interface Result {
  id: string; family: string;
  words: number; sents: number;
  mean_words: number; max_words: number; min_words: number;
  long_rate: number; // % sentences > 40 words
  mean_subordinates: number; // avg subordination markers per sentence
  gb: number; tier: string;
  composite: number; // long_rate*0.5 + (mean_words/80)*0.3 + (mean_subs/5)*0.2
  prose: string;
}

function measureResult(prose: string, id: string, family: string): Result {
  const feats = computeAllGBFeatures(prose);
  const gb = scoreGB(feats);
  const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';
  const sents = splitSentences(prose);
  const lens = sents.map(s => s.split(/\s+/).length);
  const meanW = mean(lens);
  const longRate = lens.length > 0 ? lens.filter(l => l > 40).length / lens.length : 0;

  // Count subordination markers per sentence
  const subMarkers = /\b(?:qui|que|dont|où|tandis que|lorsque|alors que|bien que|parce que|puisque|comme|si)\b/gi;
  const subCounts = sents.map(s => (s.toLowerCase().match(subMarkers) || []).length);
  const meanSubs = mean(subCounts);

  const composite = longRate * 0.5 + (meanW / 80) * 0.3 + (meanSubs / 5) * 0.2;

  return {
    id, family, words: prose.split(/\s+/).length, sents: sents.length,
    mean_words: r4(meanW), max_words: Math.max(0, ...lens), min_words: Math.min(999, ...lens),
    long_rate: r4(longRate), mean_subordinates: r4(meanSubs),
    gb: r4(gb), tier, composite: r4(composite), prose,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const client = new Anthropic({ apiKey });
  const results: Result[] = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log('=' .repeat(70));
  console.log('  OMEGA — f26b BREAKER v2: 21 prompt variants');
  console.log(`  Model: ${MODEL} | Temp: ${TEMPERATURE} | Variants: ${VARIANTS.length}`);
  console.log('=' .repeat(70));

  for (const v of VARIANTS) {
    console.log(`\n[${v.id}] (${v.family})...`);
    try {
      const prose = await generate(client, v.prompt);
      const m = measureResult(prose, v.id, v.family);
      results.push(m);
      console.log(`  ${m.words}w ${m.sents}s mean=${m.mean_words} max=${m.max_words} long%=${(m.long_rate*100).toFixed(0)} subs=${m.mean_subordinates} GB=${m.gb} comp=${m.composite}`);
    } catch (e: any) {
      console.error(`  ERROR: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // ═══════════════════════════════════════════════════════════════
  // RANKING BY COMPOSITE
  // ═══════════════════════════════════════════════════════════════

  results.sort((a, b) => b.composite - a.composite);

  console.log(`\n${'='.repeat(80)}`);
  console.log('  RANKING BY COMPOSITE SCORE');
  console.log(`${'='.repeat(80)}`);
  console.log(`  ${'Rank'.padStart(4)} ${'ID'.padEnd(6)} ${'Family'.padEnd(10)} ${'Comp'.padStart(6)} ${'Long%'.padStart(6)} ${'MeanW'.padStart(6)} ${'MaxW'.padStart(5)} ${'Subs'.padStart(5)} ${'GB'.padStart(6)} ${'Tier'.padStart(5)}`);
  console.log('  ' + '-'.repeat(75));
  results.forEach((r, i) => {
    console.log(`  ${String(i + 1).padStart(4)} ${r.id.padEnd(6)} ${r.family.padEnd(10)} ${r.composite.toFixed(3).padStart(6)} ${(r.long_rate * 100).toFixed(0).padStart(5)}% ${r.mean_words.toFixed(0).padStart(6)} ${String(r.max_words).padStart(5)} ${r.mean_subordinates.toFixed(1).padStart(5)} ${r.gb.toFixed(2).padStart(6)} ${r.tier.padStart(5)}`);
  });

  // Family averages
  console.log(`\n  FAMILY AVERAGES:`);
  const families = [...new Set(results.map(r => r.family))];
  for (const f of families) {
    const fr = results.filter(r => r.family === f);
    console.log(`    ${f.padEnd(12)} comp=${mean(fr.map(r => r.composite)).toFixed(3)} long%=${(mean(fr.map(r => r.long_rate))*100).toFixed(0)}% meanW=${mean(fr.map(r => r.mean_words)).toFixed(0)} GB=${mean(fr.map(r => r.gb)).toFixed(2)}`);
  }

  // Winner
  const winner = results[0];
  console.log(`\n  WINNER: ${winner.id} (${winner.family}) — composite=${winner.composite} long%=${(winner.long_rate*100).toFixed(0)}% meanW=${winner.mean_words} GB=${winner.gb}`);

  // Save
  const dataDir = resolve(__dirname, '../src/scoring/data');
  writeFileSync(join(dataDir, 'F26B_BREAKER_RESULTS.json'), JSON.stringify({
    date: new Date().toISOString(), model: MODEL, temperature: TEMPERATURE,
    variants: VARIANTS.length, winner: winner.id,
    results: results.map(({ prose: _, ...rest }) => rest),
    family_averages: Object.fromEntries(families.map(f => {
      const fr = results.filter(r => r.family === f);
      return [f, { composite: r4(mean(fr.map(r => r.composite))), long_rate: r4(mean(fr.map(r => r.long_rate))), mean_words: r4(mean(fr.map(r => r.mean_words))), gb: r4(mean(fr.map(r => r.gb))) }];
    })),
  }, null, 2));

  const proseDir = resolve(__dirname, `../sessions/F26B_BREAKER_${ts}`);
  mkdirSync(proseDir, { recursive: true });
  for (const r of results) writeFileSync(join(proseDir, `${r.id}.txt`), r.prose);

  console.log(`\n  Saved: data/F26B_BREAKER_RESULTS.json + ${proseDir}`);
  console.log('=' .repeat(70));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
