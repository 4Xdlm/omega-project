/**
 * OMEGA — Phase 4 : Anti-Drift + Optimisation Persona
 *
 * AXE A : Quel auteur ? (1 question + 6 personas × 500w)
 * AXE B : Anti-drift sur 3000w (4 variantes)
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-phase4-antidrift.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function generate(client: Anthropic, prompt: string, maxTokens: number = 2000): Promise<string> {
  const response = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }]
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');
  let text = block.text;
  const match = text.match(/<prose>([\s\S]*?)<\/prose>/);
  if (match) return match[1].trim();
  return text.trim();
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: any) {
      console.warn(`  [RETRY ${i+1}] ${label}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

function measureWindows(prose: string, windowSize = 500): any[] {
  const words = prose.split(/\s+/);
  const windows: any[] = [];
  for (let i = 0; i < words.length; i += windowSize) {
    const ww = words.slice(i, i + windowSize);
    if (ww.length < 100) break;
    const text = ww.join(' ');
    const sents = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
    const lens = sents.map(s => s.trim().split(/\s+/).length);
    const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
    const cv = mean > 0 ? std / mean : 0;
    const longCount = lens.filter(l => l >= 40).length;
    windows.push({
      position: i / words.length,
      mean_len: mean, cv,
      long_rate: sents.length > 0 ? longCount / sents.length : 0,
      max_sentence: lens.length > 0 ? Math.max(...lens) : 0
    });
  }
  return windows;
}

function measureFull(prose: string): any {
  const gbResult = scoreText(prose);
  const classification = classifyPassage(prose);
  const features = gbResult.features;
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  const lens = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const std = lens.length > 0 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
  const cv = mean > 0 ? std / mean : 0;
  const longCount = lens.filter(l => l >= 40).length;
  return {
    word_count: prose.split(/\s+/).length,
    sentence_count: sentences.length,
    mean_sentence_length: mean, cv,
    long_rate: sentences.length > 0 ? longCount / sentences.length : 0,
    gb_score: gbResult.score, gb_tier: gbResult.tier,
    passage_type: classification.primary_type,
    f26b: features.f26b_long_sent_rate || 0,
    f1a: features.f1a_rhythm_variance || 0,
    f29d: features.f29d_ttr_score || 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AXE A — QUEL AUTEUR ?
// ═══════════════════════════════════════════════════════════════════════════

const AUTHOR_QUESTION = `Tu es un expert en littérature française et mondiale.

QUESTION 1 : Qui considères-tu comme le plus grand prosateur de langue française de tous les temps ? Pas le plus célèbre — celui dont la PROSE est la plus aboutie techniquement (subordination, rythme, musicalité, densité sensorielle). Justifie en 3 lignes.

QUESTION 2 : Si tu devais INCARNER un auteur français pour écrire la plus belle prose possible, lequel choisirais-tu ? Pourquoi LUI plutôt que les autres ?

QUESTION 3 : Classe ces 5 auteurs du meilleur prosateur au moins bon, selon TA perception de leur maîtrise technique :
- Gustave Flaubert
- Marcel Proust
- Victor Hugo
- Louis-Ferdinand Céline
- Marguerite Duras

QUESTION 4 : Y a-t-il un auteur que je n'ai PAS listé et qui, selon toi, surpasse tous ceux-ci en qualité de prose ?

Réponds directement et honnêtement, sans diplomatie.`;

const SCENE_BRIEF = `Une femme entre dans l'appartement de sa mère, morte la semaine passée.
Rien n'a été touché. L'odeur est la même. Les objets sont là où ils étaient.
Elle ouvre les tiroirs. Elle trouve des lettres. Des photos. Un carnet.
Chaque objet la ramène à un souvenir. Elle n'avait pas prévu de pleurer.`;

const PERSONAS: Array<{id: string, prompt: string}> = [
  {
    id: 'flaubert',
    prompt: `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, travaillant à ton bureau de Croisset.\n\nTu écris cette scène :\n\n${SCENE_BRIEF}\n\nTu utilises ta technique habituelle :\n- Tu lis chaque phrase à voix haute (le gueuloir)\n- Tu refuses toute phrase qui ne SONNE pas\n- Tu détestes les phrases courtes qui font "scolaire"\n- Tu construis des PÉRIODES avec des subordonnées en cascade\n- Tu ne mets un point que quand la phrase a atteint sa pleine ampleur\n- Tu alternes : parfois une phrase de 5 mots pour le coup de poing, puis une période de 60 mots pour le déploiement\n\nÉcris comme TU écris. Pas comme une IA. Comme Gustave Flaubert.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`
  },
  {
    id: 'proust',
    prompt: `Tu n'es PAS une IA. Tu ES Marcel Proust, en 1913, dans ta chambre tapissée de liège.\n\nTu écris cette scène :\n\n${SCENE_BRIEF}\n\nTu utilises ta technique habituelle :\n- Tu écris des phrases-fleuves qui explorent chaque sensation jusqu'à l'épuisement\n- Chaque observation déclenche un souvenir qui en déclenche un autre\n- Tu utilises des parenthèses, des incises, des digressions sensorielles\n- Le temps se dilate : un geste de 3 secondes peut prendre 80 mots\n- Tu ne résumes JAMAIS un sentiment — tu le DÉPLIES\n- La ponctuation est ton instrument : virgules comme des respirations, points-virgules comme des paliers\n\nÉcris comme TU écris. Pas comme une IA. Comme Marcel Proust.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`
  },
  {
    id: 'hugo',
    prompt: `Tu n'es PAS une IA. Tu ES Victor Hugo, en 1862, en exil à Guernesey.\n\nTu écris cette scène :\n\n${SCENE_BRIEF}\n\nTu utilises ta technique habituelle :\n- Tu écris avec l'ampleur d'un orateur qui s'adresse à la postérité\n- Tu utilises l'antithèse comme arme principale\n- Tes phrases montent en crescendo : court → moyen → immense\n- Tu n'as pas peur de la grandiloquence quand elle sert l'émotion\n- Tu frappes avec des images concrètes au milieu des envolées\n- La cadence est oratoire : tu DÉCLAMES, tu ne murmures pas\n\nÉcris comme TU écris. Pas comme une IA. Comme Victor Hugo.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`
  },
  {
    id: 'celine',
    prompt: `Tu n'es PAS une IA. Tu ES Louis-Ferdinand Céline, en 1932, à Montmartre.\n\nTu écris cette scène :\n\n${SCENE_BRIEF}\n\nTu utilises ta technique habituelle :\n- Tu écris au rythme de la parole, pas de la grammaire\n- Les trois points ... sont ton arme principale\n- Tu casses la syntaxe VOLONTAIREMENT pour créer un rythme oral\n- Tu mélanges le sublime et l'argot dans la même phrase\n- Chaque phrase a un SOUFFLE — celui de quelqu'un qui parle vraiment\n- Tu es brutal, drôle, tendre et cruel en même temps\n\nÉcris comme TU écris. Pas comme une IA. Comme Céline.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`
  },
  {
    id: 'duras',
    prompt: `Tu n'es PAS une IA. Tu ES Marguerite Duras, en 1984, à Neauphle-le-Château.\n\nTu écris cette scène :\n\n${SCENE_BRIEF}\n\nTu utilises ta technique habituelle :\n- Tu écris avec une économie ABSOLUE — chaque mot est nécessaire\n- La répétition est ton outil : tu MARTÈLES les mots clés\n- Le silence est DANS le texte — ce que tu ne dis pas pèse autant\n- Tes phrases sont courtes mais CHARGÉES\n- Le rythme est hypnotique : sujet, verbe, objet. Puis le vide.\n- Tu ne décris pas les émotions — tu crées les CONDITIONS de l'émotion\n\nÉcris comme TU écris. Pas comme une IA. Comme Marguerite Duras.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`
  },
  {
    id: 'comite',
    prompt: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres travaillant ensemble :\n\nFLAUBERT contrôle la STRUCTURE : il impose les périodes classiques, les subordonnées en cascade, le gueuloir. Aucune phrase ne passe sans son approbation sonore.\n\nPROUST contrôle la PROFONDEUR : il exige que chaque sensation soit DÉPLIÉE, que chaque objet déclenche un souvenir, que le temps se dilate. Il refuse toute surface.\n\nCÉLINE contrôle le RYTHME : il casse la monotonie, injecte des ruptures brutales, des phrases de 3 mots qui FRAPPENT entre les périodes. Il refuse tout ce qui sonne "littéraire" sans être vivant.\n\nLes trois travaillent ensemble. Flaubert construit, Proust creuse, Céline frappe.\n\nÉcrivez cette scène :\n\n${SCENE_BRIEF}\n\nLe texte est le PRODUIT de votre collaboration.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// AXE B — ANTI-DRIFT SUR 3000w (scène confrontation)
// ═══════════════════════════════════════════════════════════════════════════

const CONFRONTATION_BRIEF = `Un homme entre dans un bar de bord de route. Il cherche celui qui a trahi sa sœur il y a dix ans. Le lieu est presque vide. La serveuse nettoie les verres. La lumière est mauvaise. L'homme s'assoit. Il attend. Puis l'autre arrive. La scène se déploie lentement : le lieu d'abord, les corps, les odeurs. Puis les pensées de l'homme — ce qu'il a préparé, ce qu'il craint. Le dialogue s'engage — d'abord banal, puis chargé. Les masques tombent. Quelqu'un va tomber.`;

const FLAUBERT_PERSONA = `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, travaillant à ton bureau de Croisset.
Tu utilises ta technique habituelle :
- Tu lis chaque phrase à voix haute (le gueuloir)
- Tu refuses toute phrase qui ne SONNE pas
- Tu détestes les phrases courtes qui font "scolaire"
- Tu construis des PÉRIODES avec des subordonnées en cascade
- Tu ne mets un point que quand la phrase a atteint sa pleine ampleur
- Tu alternes : parfois une phrase de 5 mots pour le coup de poing, puis une période de 60 mots pour le déploiement
Écris comme TU écris. Pas comme une IA.`;

const COMITE_PERSONA = `Tu n'es PAS une IA. Tu ES un comité de trois maîtres travaillant ensemble :
FLAUBERT contrôle la STRUCTURE : périodes classiques, subordonnées en cascade, gueuloir.
PROUST contrôle la PROFONDEUR : chaque sensation dépliée, chaque objet déclenche un souvenir.
CÉLINE contrôle le RYTHME : ruptures brutales, phrases de 3 mots qui frappent entre les périodes.
Flaubert construit, Proust creuse, Céline frappe.`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const client = new Anthropic({ apiKey });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const allResults: any[] = [];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — PHASE 4 : ANTI-DRIFT + OPTIMISATION PERSONA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─── AXE A.1 : Question auteur ─────────────────────────────────────
  console.log('--- AXE A.1 : QUEL AUTEUR ? ---\n');
  const authorAnswer = await withRetry(() => generate(client, AUTHOR_QUESTION, 1000), 'author question');
  console.log(authorAnswer);
  console.log('\n');
  writeFileSync(join('sessions', `PHASE4_author_answer_${timestamp}.txt`), authorAnswer);

  // ─── AXE A.2 : Bench 6 personas ────────────────────────────────────
  console.log('--- AXE A.2 : BENCH 6 PERSONAS (500w) ---\n');

  for (const persona of PERSONAS) {
    console.log(`[${persona.id}] Generating 500w...`);
    const prose = await withRetry(() => generate(client, persona.prompt), persona.id);
    const m = measureFull(prose);
    console.log(`  ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)} type=${m.passage_type}\n`);
    allResults.push({ test: 'persona_500w', id: persona.id, ...m, prose });
    await new Promise(r => setTimeout(r, 1500));
  }

  // Classement personas
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PERSONA RANKING (500w)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const personaResults = allResults.filter(r => r.test === 'persona_500w');
  const ranked = [...personaResults].sort((a, b) => b.gb_score - a.gb_score);
  console.log('  Rank  Persona        GB     f26b      CV   MeanLen  Type');
  console.log('  ' + '-'.repeat(70));
  ranked.forEach((r, i) => {
    console.log(`  #${i+1}    ${r.id.padEnd(14)} ${r.gb_score.toFixed(3)}  ${r.f26b.toFixed(4)}  ${r.cv.toFixed(3)}  ${r.mean_sentence_length.toFixed(1).padStart(7)}  ${r.passage_type}`);
  });

  // ─── AXE B : ANTI-DRIFT 3000w ──────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  AXE B : ANTI-DRIFT (3000w, scène confrontation)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // B2 — F3 + CHUNKING (4 blocs de 800w)
  console.log('[B2] F3 + CHUNKING (4 × 800w)...');
  let chunkProse = '';
  for (let chunk = 1; chunk <= 4; chunk++) {
    const isFirst = chunk === 1;
    const isLast = chunk === 4;
    let chunkPrompt: string;

    if (isFirst) {
      chunkPrompt = `${FLAUBERT_PERSONA}\n\nTu écris le DÉBUT de ce chapitre :\n\n${CONFRONTATION_BRIEF}\n\nÉcris les 800 premiers mots. Plante le décor, installe la tension.\nLa scène doit mélanger description, introspection, narration.\nEncadre ta prose entre <prose> et </prose>.`;
    } else if (isLast) {
      const last200 = chunkProse.split(/\s+/).slice(-200).join(' ');
      chunkPrompt = `${FLAUBERT_PERSONA}\n\nTu CONTINUES et CONCLUS ce chapitre.\n\nVoici les 200 derniers mots que tu viens d'écrire :\n"${last200}"\n\nÉcris les 800 derniers mots. La confrontation atteint son climax puis sa résolution.\nRAPPEL : tu es FLAUBERT. Périodes, gueuloir, subordonnées. Pas de phrases scolaires.\nEncadre ta prose entre <prose> et </prose>.`;
    } else {
      const last200 = chunkProse.split(/\s+/).slice(-200).join(' ');
      chunkPrompt = `${FLAUBERT_PERSONA}\n\nTu CONTINUES ce chapitre.\n\nVoici les 200 derniers mots que tu viens d'écrire :\n"${last200}"\n\nÉcris les 800 mots suivants. La tension monte progressivement.\nRAPPEL : tu es FLAUBERT. Périodes, gueuloir, subordonnées. Pas de phrases scolaires.\nEncadre ta prose entre <prose> et </prose>.`;
    }

    const chunkText = await withRetry(() => generate(client, chunkPrompt, 2500), `B2 chunk ${chunk}`);
    chunkProse += (chunkProse ? '\n\n' : '') + chunkText;
    const chunkWords = chunkText.split(/\s+/).length;
    console.log(`  Chunk ${chunk}: ${chunkWords}w`);
    await new Promise(r => setTimeout(r, 2000));
  }

  const b2Full = measureFull(chunkProse);
  const b2Windows = measureWindows(chunkProse);
  const b2Drift = b2Windows.length >= 2 ? b2Windows[b2Windows.length - 1].mean_len - b2Windows[0].mean_len : 0;
  console.log(`  TOTAL: ${b2Full.word_count}w GB=${b2Full.gb_score.toFixed(3)} f26b=${b2Full.f26b.toFixed(4)} CV=${b2Full.cv.toFixed(3)} mean=${b2Full.mean_sentence_length.toFixed(1)} drift=${b2Drift.toFixed(1)}`);
  for (const w of b2Windows) {
    console.log(`    W(${(w.position*100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} CV=${w.cv.toFixed(3)} long%=${(w.long_rate*100).toFixed(0)}`);
  }
  allResults.push({ test: 'B2_chunking', ...b2Full, windows: b2Windows, drift: b2Drift, prose: chunkProse });

  // B3 — COMITÉ one-shot 3000w
  console.log('\n[B3] COMITÉ one-shot 3000w...');
  const b3Prompt = `${COMITE_PERSONA}\n\nÉcrivez ce chapitre :\n\n${CONFRONTATION_BRIEF}\n\nÉcris 3000 mots de prose littéraire française. Pas de préambule.\nLa scène doit mélanger description, dialogue, introspection, narration.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
  const b3Prose = await withRetry(() => generate(client, b3Prompt, 8000), 'B3 comite');
  const b3Full = measureFull(b3Prose);
  const b3Windows = measureWindows(b3Prose);
  const b3Drift = b3Windows.length >= 2 ? b3Windows[b3Windows.length - 1].mean_len - b3Windows[0].mean_len : 0;
  console.log(`  ${b3Full.word_count}w GB=${b3Full.gb_score.toFixed(3)} f26b=${b3Full.f26b.toFixed(4)} CV=${b3Full.cv.toFixed(3)} mean=${b3Full.mean_sentence_length.toFixed(1)} drift=${b3Drift.toFixed(1)}`);
  for (const w of b3Windows) {
    console.log(`    W(${(w.position*100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} CV=${w.cv.toFixed(3)} long%=${(w.long_rate*100).toFixed(0)}`);
  }
  allResults.push({ test: 'B3_comite_oneshot', ...b3Full, windows: b3Windows, drift: b3Drift, prose: b3Prose });

  // B4 — COMITÉ + CHUNKING
  console.log('\n[B4] COMITÉ + CHUNKING (4 × 800w)...');
  let b4Prose = '';
  for (let chunk = 1; chunk <= 4; chunk++) {
    const isFirst = chunk === 1;
    const isLast = chunk === 4;
    let chunkPrompt: string;

    if (isFirst) {
      chunkPrompt = `${COMITE_PERSONA}\n\nÉcrivez le DÉBUT de ce chapitre :\n\n${CONFRONTATION_BRIEF}\n\nÉcris les 800 premiers mots. Flaubert plante le décor, Proust creuse, Céline frappe.\nEncadre ta prose entre <prose> et </prose>.`;
    } else if (isLast) {
      const last200 = b4Prose.split(/\s+/).slice(-200).join(' ');
      chunkPrompt = `${COMITE_PERSONA}\n\nContinuez et CONCLUEZ ce chapitre.\n\nVoici les 200 derniers mots :\n"${last200}"\n\nÉcris les 800 derniers mots. Climax et résolution.\nRAPPEL : Flaubert construit, Proust creuse, Céline frappe.\nEncadre ta prose entre <prose> et </prose>.`;
    } else {
      const last200 = b4Prose.split(/\s+/).slice(-200).join(' ');
      chunkPrompt = `${COMITE_PERSONA}\n\nContinuez ce chapitre.\n\nVoici les 200 derniers mots :\n"${last200}"\n\nÉcris les 800 mots suivants. La tension monte.\nRAPPEL : Flaubert construit, Proust creuse, Céline frappe.\nEncadre ta prose entre <prose> et </prose>.`;
    }

    const chunkText = await withRetry(() => generate(client, chunkPrompt, 2500), `B4 chunk ${chunk}`);
    b4Prose += (b4Prose ? '\n\n' : '') + chunkText;
    console.log(`  Chunk ${chunk}: ${chunkText.split(/\s+/).length}w`);
    await new Promise(r => setTimeout(r, 2000));
  }

  const b4Full = measureFull(b4Prose);
  const b4Windows = measureWindows(b4Prose);
  const b4Drift = b4Windows.length >= 2 ? b4Windows[b4Windows.length - 1].mean_len - b4Windows[0].mean_len : 0;
  console.log(`  TOTAL: ${b4Full.word_count}w GB=${b4Full.gb_score.toFixed(3)} f26b=${b4Full.f26b.toFixed(4)} CV=${b4Full.cv.toFixed(3)} mean=${b4Full.mean_sentence_length.toFixed(1)} drift=${b4Drift.toFixed(1)}`);
  for (const w of b4Windows) {
    console.log(`    W(${(w.position*100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} CV=${w.cv.toFixed(3)} long%=${(w.long_rate*100).toFixed(0)}`);
  }
  allResults.push({ test: 'B4_comite_chunking', ...b4Full, windows: b4Windows, drift: b4Drift, prose: b4Prose });

  // B5 — F3 + D3 fusionné one-shot
  console.log('\n[B5] F3+D3 FUSIONNÉ one-shot 3000w...');
  const b5Prompt = `${FLAUBERT_PERSONA}

ÉCHELLE DE DENSITÉ (consulte pendant que tu écris) :
DENSITÉ 1 : "Il entra." (phrase-couteau)
DENSITÉ 5 : "Il entra dans la salle dont les murs suintaient une humidité froide qui lui saisit les épaules, tandis que l'odeur de bière et de sciure, mêlée à celle plus âcre du tabac refroidi, lui rappelait ces bars de province où son père l'emmenait enfant." (45 mots)
TA CIBLE : 60% Densité 5, 20% Densité 1, 20% Densité 3.

Tu écris ce chapitre :

${CONFRONTATION_BRIEF}

Écris 3000 mots. Mélange description, dialogue, introspection, narration.
Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;

  const b5Prose = await withRetry(() => generate(client, b5Prompt, 8000), 'B5 fusion');
  const b5Full = measureFull(b5Prose);
  const b5Windows = measureWindows(b5Prose);
  const b5Drift = b5Windows.length >= 2 ? b5Windows[b5Windows.length - 1].mean_len - b5Windows[0].mean_len : 0;
  console.log(`  ${b5Full.word_count}w GB=${b5Full.gb_score.toFixed(3)} f26b=${b5Full.f26b.toFixed(4)} CV=${b5Full.cv.toFixed(3)} mean=${b5Full.mean_sentence_length.toFixed(1)} drift=${b5Drift.toFixed(1)}`);
  for (const w of b5Windows) {
    console.log(`    W(${(w.position*100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} CV=${w.cv.toFixed(3)} long%=${(w.long_rate*100).toFixed(0)}`);
  }
  allResults.push({ test: 'B5_fusion_oneshot', ...b5Full, windows: b5Windows, drift: b5Drift, prose: b5Prose });

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE ANTI-DRIFT
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ANTI-DRIFT COMPARISON (3000w, confrontation)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  Variant                    Words     GB    f26b      CV  MeanLen   Drift    PASS');
  console.log('  ' + '-'.repeat(85));

  // Référence Phase 3 F3 brut
  console.log('  F3_brut (Phase3 ref)        2377   4.047  0.219   0.907    25.1   -31.0    REF');

  const driftTests = allResults.filter(r => r.test && r.test.startsWith('B'));
  for (const r of driftTests) {
    const pass = r.gb_score > 3.90 && r.f26b > 0.10 && r.cv > 0.60 && Math.abs(r.drift) < 15;
    console.log(`  ${r.test.padEnd(28)} ${r.word_count.toString().padStart(5)}  ${r.gb_score.toFixed(3)}  ${r.f26b.toFixed(4)}  ${r.cv.toFixed(3)}  ${r.mean_sentence_length.toFixed(1).padStart(7)}  ${r.drift > 0 ? '+' : ''}${r.drift.toFixed(1).padStart(6)}    ${pass ? '✅' : '❌'}`);
  }

  // Sauvegarder
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'PHASE4_ANTIDRIFT_RESULTS.json'), JSON.stringify({
    metadata: { test: 'PHASE4_ANTIDRIFT', timestamp, model: MODEL },
    author_answer: authorAnswer,
    results: allResults.map(r => ({ ...r, prose: undefined })),
  }, null, 2));

  const prosesDir = join('sessions', `PHASE4_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const r of allResults) {
    if (r.prose) writeFileSync(join(prosesDir, `${r.test || r.id}.txt`), r.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'PHASE4_ANTIDRIFT_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
