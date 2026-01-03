import fs from 'fs';
import { analyzeText } from './src/text_analyzer/index.js';

const inputFile = process.argv[2] || 'test_input.txt';
const text = fs.readFileSync(inputFile, 'utf-8');

const result = analyzeText(text, { mode: 'deterministic', source: inputFile });
fs.writeFileSync('dump_analysis.json', JSON.stringify(result, null, 2));
console.log('✓ dump_analysis.json created');
console.log(`  Emotions: ${result.total_emotion_hits}`);
console.log(`  Dominant: ${result.dominant_emotion}`);
