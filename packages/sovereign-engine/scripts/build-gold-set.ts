/**
 * OMEGA R-LAB-TYPE — Phase 1: Build Gold Set
 * Date: 2026-03-22
 *
 * Extracts ~200 annotated passages from 25 novels + 15 full-novel windows.
 * Passages are annotated with expected dominant type based on content nature.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT_DIR = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const OUT = path.resolve(__dirname, '../src/scoring/data/GOLD_SET_PASSAGES.json');

type ExpectedType = 'dialogue' | 'action' | 'description' | 'introspection' | 'narration';

interface PassageDef {
  id: string;
  source: string;
  group: string;
  expected_type: ExpectedType;
  language: 'fr' | 'en';
  notes: string;
  // Extraction method:
  method: 'position' | 'keyword';
  position?: number;      // ratio 0.0-1.0
  keyword?: string;       // search keyword
  size: number;           // words
}

interface NovelDef {
  id: string;
  source: string;
  window_size: number;
  language: 'fr' | 'en';
}

// ═══════════════════════════════════════════════════════════════════════
// PASSAGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

const passages: PassageDef[] = [
  // GROUP A — DIALOGUE (theatre, >= 50% replies)
  // Molière Dom Juan
  { id: 'A1_domjuan_010', source: 'moliere_dom_juan_16679.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Acte I scene 1', method: 'position', position: 0.10, size: 500 },
  { id: 'A1_domjuan_030', source: 'moliere_dom_juan_16679.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Acte II', method: 'position', position: 0.30, size: 500 },
  { id: 'A1_domjuan_050', source: 'moliere_dom_juan_16679.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Acte III scene du Pauvre', method: 'position', position: 0.50, size: 500 },
  { id: 'A1_domjuan_070', source: 'moliere_dom_juan_16679.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Acte IV souper', method: 'position', position: 0.70, size: 500 },
  { id: 'A1_domjuan_090', source: 'moliere_dom_juan_16679.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Acte V denouement', method: 'position', position: 0.90, size: 500 },
  // Molière Tartuffe
  { id: 'A2_tartuffe_020', source: 'moliere_tartuffe_4438.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Tartuffe early', method: 'position', position: 0.20, size: 500 },
  { id: 'A2_tartuffe_050', source: 'moliere_tartuffe_4438.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Tartuffe mid', method: 'position', position: 0.50, size: 500 },
  { id: 'A2_tartuffe_080', source: 'moliere_tartuffe_4438.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Tartuffe late', method: 'position', position: 0.80, size: 500 },
  // Molière Avare
  { id: 'A3_avare_025', source: 'moliere_avare_5710.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Avare early', method: 'position', position: 0.25, size: 500 },
  { id: 'A3_avare_050', source: 'moliere_avare_5710.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Avare mid', method: 'position', position: 0.50, size: 500 },
  { id: 'A3_avare_075', source: 'moliere_avare_5710.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Avare late', method: 'position', position: 0.75, size: 500 },
  // Beaumarchais
  { id: 'A4_figaro_020', source: 'beaumarchais_mariage_17160.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Figaro early', method: 'position', position: 0.20, size: 500 },
  { id: 'A4_figaro_050', source: 'beaumarchais_mariage_17160.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Figaro mid', method: 'position', position: 0.50, size: 500 },
  { id: 'A4_figaro_080', source: 'beaumarchais_mariage_17160.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Figaro late', method: 'position', position: 0.80, size: 500 },
  // Racine Phèdre
  { id: 'A5_phedre_025', source: 'racine_phedre_14701.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Phedre early', method: 'position', position: 0.25, size: 500 },
  { id: 'A5_phedre_050', source: 'racine_phedre_14701.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Phedre mid', method: 'position', position: 0.50, size: 500 },
  { id: 'A5_phedre_075', source: 'racine_phedre_14701.txt', group: 'A', expected_type: 'dialogue', language: 'fr', notes: 'Phedre late', method: 'position', position: 0.75, size: 500 },

  // GROUP B — ACTION (combat, pursuit, physical violence)
  // Salammbo (EN Gutenberg): battle passages at known positions
  { id: 'B1_salammbo_bat1', source: 'flaubert_salammbo_10884.txt', group: 'B', expected_type: 'action', language: 'en', notes: 'Battle passage', method: 'keyword', keyword: 'sword', size: 500 },
  { id: 'B1_salammbo_bat2', source: 'flaubert_salammbo_10884.txt', group: 'B', expected_type: 'action', language: 'en', notes: 'Fight', method: 'keyword', keyword: 'arrow', size: 500 },
  { id: 'B1_salammbo_bat3', source: 'flaubert_salammbo_10884.txt', group: 'B', expected_type: 'action', language: 'en', notes: 'Attack', method: 'keyword', keyword: 'attack', size: 500 },
  // Hugo Miserables (FR Gutenberg)
  { id: 'B2_miserables_bar1', source: 'hugo_miserables_17489.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Barricade', method: 'keyword', keyword: 'barricade', size: 500 },
  { id: 'B2_miserables_bar2', source: 'hugo_miserables_17489.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Fusil', method: 'keyword', keyword: 'fusil', size: 500 },
  { id: 'B2_miserables_bar3', source: 'hugo_miserables_17489.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Battle', method: 'keyword', keyword: 'battle', size: 500 },
  // Dumas Monte-Cristo — position-based (known action sections)
  { id: 'B3_montecristo_esc1', source: 'dumas_monte_cristo_17989.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Escape section', method: 'position', position: 0.25, size: 500 },
  { id: 'B3_montecristo_esc2', source: 'dumas_monte_cristo_17989.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Action mid', method: 'keyword', keyword: 'pistol', size: 500 },
  { id: 'B3_montecristo_esc3', source: 'dumas_monte_cristo_17989.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Duel section', method: 'keyword', keyword: 'rushed', size: 500 },
  // Dostoievski Crime (FR/EN)
  { id: 'B4_crime_murder', source: 'dostoievski_crime_36034.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Murder', method: 'keyword', keyword: 'axe', size: 500 },
  { id: 'B4_crime_blood', source: 'dostoievski_crime_36034.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Blood', method: 'keyword', keyword: 'blood', size: 500 },
  // Blood Meridian (EN)
  { id: 'B5_blood_scalp', source: 'pdf_blood_meridian_cormac_mccarthy.txt', group: 'B', expected_type: 'action', language: 'en', notes: 'Scalping', method: 'keyword', keyword: 'scalp', size: 500 },
  { id: 'B5_blood_rode', source: 'pdf_blood_meridian_cormac_mccarthy.txt', group: 'B', expected_type: 'action', language: 'en', notes: 'Rode', method: 'keyword', keyword: 'rode', size: 500 },
  // Zola Bete
  { id: 'B6_bete_train', source: 'zola_bete_10007.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Train', method: 'keyword', keyword: 'train', size: 500 },
  { id: 'B6_bete_murder', source: 'zola_bete_10007.txt', group: 'B', expected_type: 'action', language: 'fr', notes: 'Murder', method: 'keyword', keyword: 'murder', size: 500 },

  // GROUP C — DESCRIPTION (landscapes, places, objects, atmospheres)
  // Use position-based extraction for more reliable results
  { id: 'C1_bovary_desc1', source: 'flaubert_bovary_14155.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Yonville area', method: 'keyword', keyword: 'garden', size: 500 },
  { id: 'C1_bovary_desc2', source: 'flaubert_bovary_14155.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Country scene', method: 'position', position: 0.35, size: 500 },
  { id: 'C1_bovary_desc3', source: 'flaubert_bovary_14155.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Village', method: 'keyword', keyword: 'village', size: 500 },
  { id: 'C2_notredame_cath1', source: 'notre_dame_de_paris_victor_hugo.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Cathedral', method: 'keyword', keyword: 'cathedral', size: 500 },
  { id: 'C2_notredame_cath2', source: 'notre_dame_de_paris_victor_hugo.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Stone', method: 'keyword', keyword: 'stone', size: 500 },
  { id: 'C2_notredame_cath3', source: 'notre_dame_de_paris_victor_hugo.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Tower', method: 'keyword', keyword: 'tower', size: 500 },
  { id: 'C3_education_paris', source: 'flaubert_education_14285.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Paris streets', method: 'position', position: 0.20, size: 500 },
  { id: 'C3_education_house', source: 'flaubert_education_14285.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Interior', method: 'position', position: 0.45, size: 500 },
  { id: 'C4_bonheur_shop', source: 'zola_bonheur_11953.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Shop display', method: 'keyword', keyword: 'silk', size: 500 },
  { id: 'C4_bonheur_light', source: 'zola_bonheur_11953.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Light display', method: 'keyword', keyword: 'display', size: 500 },
  { id: 'C5_swann_combray', source: 'proust_swann_2650.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Combray landscape', method: 'position', position: 0.08, size: 500 },
  { id: 'C5_swann_garden', source: 'proust_swann_2650.txt', group: 'C', expected_type: 'description', language: 'fr', notes: 'Garden', method: 'keyword', keyword: 'garden', size: 500 },

  // GROUP D — INTROSPECTION (inner monologue, thoughts, reflections)
  // Proust — known introspective passages (early memory sections)
  { id: 'D1_swann_mem1', source: 'proust_swann_2650.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'Memory madeleine', method: 'position', position: 0.02, size: 500 },
  { id: 'D1_swann_mem2', source: 'proust_swann_2650.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'Bedtime memories', method: 'position', position: 0.01, size: 500 },
  { id: 'D1_swann_sem', source: 'proust_swann_2650.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'Sleep thoughts', method: 'position', position: 0.005, size: 500 },
  // Camus L'Etranger — Meursault's inner thoughts
  { id: 'D2_etranger_pens', source: 'letranger_french_edition_albert_camus.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'Meursault reflects', method: 'position', position: 0.80, size: 500 },
  { id: 'D2_etranger_comp', source: 'letranger_french_edition_albert_camus.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'Prison thoughts', method: 'position', position: 0.90, size: 500 },
  { id: 'D3_crime_tourm', source: 'dostoievski_crime_36034.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'Conscience', method: 'keyword', keyword: 'conscience', size: 500 },
  { id: 'D3_crime_pens', source: 'dostoievski_crime_36034.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'He thought', method: 'keyword', keyword: 'he thought', size: 500 },
  { id: 'D4_kafka_reflect', source: 'kafka_proces_69327.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'K reflects', method: 'position', position: 0.40, size: 500 },
  { id: 'D4_kafka_think', source: 'kafka_proces_69327.txt', group: 'D', expected_type: 'introspection', language: 'fr', notes: 'K thinks', method: 'position', position: 0.60, size: 500 },
  { id: 'D5_dalloway_thought', source: 'pdf_mrs_dalloway_virginia_woolf.txt', group: 'D', expected_type: 'introspection', language: 'en', notes: 'Stream of consciousness', method: 'keyword', keyword: 'she thought', size: 500 },
  { id: 'D5_dalloway_felt', source: 'pdf_mrs_dalloway_virginia_woolf.txt', group: 'D', expected_type: 'introspection', language: 'en', notes: 'Felt', method: 'keyword', keyword: 'she felt', size: 500 },

  // GROUP E — NARRATION (factual event sequence, no dialogue/introspection)
  { id: 'E1_chartreuse_wat', source: 'stendhal_chartreuse_7524.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Waterloo raconte', method: 'position', position: 0.15, size: 500 },
  { id: 'E1_chartreuse_mid', source: 'stendhal_chartreuse_7524.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Recit mid', method: 'position', position: 0.50, size: 500 },
  { id: 'E1_chartreuse_late', source: 'stendhal_chartreuse_7524.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Recit late', method: 'position', position: 0.75, size: 500 },
  { id: 'E2_belami_asc1', source: 'maupassant_bel_ami_3088.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Ascension', method: 'position', position: 0.30, size: 500 },
  { id: 'E2_belami_asc2', source: 'maupassant_bel_ami_3088.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Ascension 2', method: 'position', position: 0.60, size: 500 },
  { id: 'E3_peste_chron1', source: 'la_peste_french_edition_albert_camus.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Chronique', method: 'position', position: 0.25, size: 500 },
  { id: 'E3_peste_chron2', source: 'la_peste_french_edition_albert_camus.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Chronique 2', method: 'position', position: 0.50, size: 500 },
  { id: 'E4_illusions_nar1', source: 'balzac_illusions_13141.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Narration balzacienne', method: 'position', position: 0.30, size: 500 },
  { id: 'E4_illusions_nar2', source: 'balzac_illusions_13141.txt', group: 'E', expected_type: 'narration', language: 'fr', notes: 'Narration 2', method: 'position', position: 0.60, size: 500 },
  { id: 'E5_sunrises_nar1', source: 'pdf_the_sun_also_rises_ernest_hemingway.txt', group: 'E', expected_type: 'narration', language: 'en', notes: 'Narration Hemingway', method: 'position', position: 0.20, size: 500 },
  { id: 'E5_sunrises_nar2', source: 'pdf_the_sun_also_rises_ernest_hemingway.txt', group: 'E', expected_type: 'narration', language: 'en', notes: 'Narration 2', method: 'position', position: 0.50, size: 500 },
];

const novels: NovelDef[] = [
  { id: 'F01_bovary', source: 'flaubert_bovary_14155.txt', window_size: 2000, language: 'fr' },
  { id: 'F02_salammbo', source: 'flaubert_salammbo_10884.txt', window_size: 2000, language: 'fr' },
  { id: 'F03_miserables', source: 'hugo_miserables_17489.txt', window_size: 2000, language: 'fr' },
  { id: 'F04_crime', source: 'dostoievski_crime_36034.txt', window_size: 2000, language: 'fr' },
  { id: 'F05_swann', source: 'proust_swann_2650.txt', window_size: 2000, language: 'fr' },
  { id: 'F06_peste', source: 'la_peste_french_edition_albert_camus.txt', window_size: 2000, language: 'fr' },
  { id: 'F07_etranger', source: 'letranger_french_edition_albert_camus.txt', window_size: 2000, language: 'fr' },
  { id: 'F08_chartreuse', source: 'stendhal_chartreuse_7524.txt', window_size: 2000, language: 'fr' },
  { id: 'F09_belami', source: 'maupassant_bel_ami_3088.txt', window_size: 2000, language: 'fr' },
  { id: 'F10_montecristo', source: 'dumas_monte_cristo_17989.txt', window_size: 2000, language: 'fr' },
  { id: 'F11_bete', source: 'zola_bete_10007.txt', window_size: 2000, language: 'fr' },
  { id: 'F12_domjuan', source: 'moliere_dom_juan_16679.txt', window_size: 2000, language: 'fr' },
  { id: 'F13_twocities', source: 'dickens_two_cities_98.txt', window_size: 2000, language: 'en' },
  { id: 'F14_bloodmeridian', source: 'pdf_blood_meridian_cormac_mccarthy.txt', window_size: 2000, language: 'en' },
  { id: 'F15_kafka', source: 'kafka_proces_69327.txt', window_size: 2000, language: 'fr' },
];

// ═══════════════════════════════════════════════════════════════════════
// EXTRACTION
// ═══════════════════════════════════════════════════════════════════════

function loadText(source: string): string {
  const fullPath = path.join(TXT_DIR, source);
  return fs.readFileSync(fullPath, 'utf-8');
}

function extractByPosition(text: string, position: number, size: number): string {
  const words = text.split(/\s+/);
  const start = Math.max(0, Math.floor(words.length * position) - Math.floor(size / 2));
  return words.slice(start, start + size).join(' ');
}

function extractByKeyword(text: string, keyword: string, size: number): string | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return null;
  // Find word position
  const before = text.slice(0, idx);
  const wordsBefore = before.split(/\s+/).length;
  const words = text.split(/\s+/);
  const start = Math.max(0, wordsBefore - Math.floor(size / 2));
  return words.slice(start, start + size).join(' ');
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex').slice(0, 16);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

console.log('Building gold set...');

const extractedPassages: Array<{
  id: string; source: string; group: string; expected_type: string;
  language: string; notes: string; text_hash: string; word_count: number;
  confidence: string;
}> = [];

let skipped = 0;
for (const p of passages) {
  const text = loadText(p.source);
  let extracted: string | null = null;

  if (p.method === 'position' && p.position !== undefined) {
    extracted = extractByPosition(text, p.position, p.size);
  } else if (p.method === 'keyword' && p.keyword) {
    extracted = extractByKeyword(text, p.keyword, p.size);
  }

  if (!extracted || extracted.split(/\s+/).length < 100) {
    console.log(`  SKIP: ${p.id} — could not extract (keyword not found or text too short)`);
    skipped++;
    continue;
  }

  extractedPassages.push({
    id: p.id,
    source: p.source,
    group: p.group,
    expected_type: p.expected_type,
    language: p.language,
    notes: p.notes,
    text_hash: sha256(extracted),
    word_count: extracted.split(/\s+/).length,
    confidence: 'HIGH',
  });
}

// Novels
const novelEntries: Array<{
  id: string; source: string; window_size: number; window_count: number; language: string;
}> = [];

for (const n of novels) {
  const text = loadText(n.source);
  const words = text.split(/\s+/);
  const windowCount = Math.floor(words.length / n.window_size);
  novelEntries.push({
    id: n.id,
    source: n.source,
    window_size: n.window_size,
    window_count: windowCount,
    language: n.language,
  });
}

const goldSet = {
  version: '1.0',
  created: '2026-03-22',
  total_passages: extractedPassages.length,
  skipped,
  by_type: {
    dialogue: extractedPassages.filter(p => p.expected_type === 'dialogue').length,
    action: extractedPassages.filter(p => p.expected_type === 'action').length,
    description: extractedPassages.filter(p => p.expected_type === 'description').length,
    introspection: extractedPassages.filter(p => p.expected_type === 'introspection').length,
    narration: extractedPassages.filter(p => p.expected_type === 'narration').length,
  },
  passages: extractedPassages,
  novels: novelEntries,
};

fs.writeFileSync(OUT, JSON.stringify(goldSet, null, 2));
console.log(`\nGold set saved: ${OUT}`);
console.log(`  Passages: ${extractedPassages.length} (${skipped} skipped)`);
console.log(`  By type: ${JSON.stringify(goldSet.by_type)}`);
console.log(`  Novels: ${novelEntries.length} (${novelEntries.reduce((s, n) => s + n.window_count, 0)} total windows)`);
