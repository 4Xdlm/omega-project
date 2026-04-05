/**
 * OMEGA — Phase 4c : Fusion FDP+K2 + Test Biais Langue des Personas
 *
 * CONTRÔLE : Trio FDP 500w (1 appel)
 * AXE 1 : Fusion FDP+K2 chunking (3000w, 2 scènes × 2 runs = 16 chunks)
 * AXE 2 : 10 auteurs anglais en persona FR (500w chaque)
 * AXE 3 : 2 allemands + 2 espagnols en persona FR (500w chaque)
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-phase4c-fusion-intl.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

const SCENE_BRIEF_DEUIL = `Une femme entre dans l'appartement de sa mère, morte la semaine passée.
Rien n'a été touché. L'odeur est la même. Les objets sont là où ils étaient.
Elle ouvre les tiroirs. Elle trouve des lettres. Des photos. Un carnet.
Chaque objet la ramène à un souvenir. Elle n'avait pas prévu de pleurer.`;

const SCENE_BRIEF_CONFRONTATION = `Un homme entre dans un bar de bord de route. Il cherche celui qui a trahi sa sœur il y a dix ans. Le lieu est presque vide. La serveuse nettoie les verres. La lumière est mauvaise. L'homme s'assoit. Il attend. Puis l'autre arrive. La tension monte. Le dialogue s'engage. Les masques tombent.`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function generate(client: Anthropic, prompt: string, maxTokens = 2000): Promise<string> {
  const response = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt }]
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');
  const text = block.text;
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
  };
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
      position: i / words.length, mean_len: mean, cv,
      long_rate: sents.length > 0 ? longCount / sents.length : 0
    });
  }
  return windows;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════════════════════════════════════════

const TRIO_FDP = `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

FLAUBERT contrôle la STRUCTURE : périodes classiques, subordonnées en cascade. Il lit chaque phrase à voix haute et refuse ce qui ne sonne pas.

DURAS contrôle le CONTRASTE : elle exige l'alternance VIOLENTE entre une période de 60 mots et une phrase de 5 mots. Elle est le métronome impitoyable du texte.

PROUST contrôle la SENSATION : il exige que chaque description déclenche un souvenir, que chaque objet porte une charge émotionnelle. Il refuse la surface.

Flaubert construit, Duras rythme, Proust ressent.`;

const TRIO_FDP_DURAS_BOOST = `${TRIO_FDP}

RAPPEL DE DURAS — Après les grandes périodes, FRAPPEZ.
Phrases-lames de 5 mots entre les déploiements. L'alternance est OBLIGATOIRE.
Ne laissez pas Proust noyer le texte — Duras coupe.`;

// ═══════════════════════════════════════════════════════════════════════════
// AXE 2 — 10 AUTEURS ANGLAIS
// ═══════════════════════════════════════════════════════════════════════════

const INTL_AUTHORS: Array<{id: string, lang: string, prompt: string}> = [
  {
    id: 'hemingway', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Ernest Hemingway, en 1929, à Paris.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Phrases courtes. Sujet, verbe, objet. Rien de plus.
- La théorie de l'iceberg : ce que tu NE DIS PAS pèse plus que ce que tu dis
- Le dialogue porte l'émotion — pas la narration
- Tu ne décris pas les sentiments — tu montres les GESTES
- Chaque mot est pesé. Pas un de trop.
- Tu es le scalpel. Pas la plume.

Écris comme TU écris. Pas comme une IA. Comme Hemingway.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'woolf', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Virginia Woolf, en 1927, à Monk's House, Sussex.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Le flux de conscience : les pensées coulent sans interruption
- Les phrases longues portent des sensations fusionnées
- Le temps est subjectif : un instant peut durer une page
- Les perceptions se mêlent : couleurs, sons, souvenirs dans la même phrase
- La ponctuation est musicale : virgules comme des respirations, points-virgules comme des paliers
- Tu ne sépares pas le dedans du dehors — tout est UN

Écris comme TU écris. Pas comme une IA. Comme Virginia Woolf.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'joyce', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES James Joyce, en 1922, à Paris.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Le flux de conscience EXTRÊME : la ponctuation est optionnelle
- Les registres se mêlent : érudit et trivial dans la même phrase
- Les associations sont libres : un mot en appelle un autre par le son
- La syntaxe se déforme pour épouser la pensée
- Le monologue intérieur n'a ni début ni fin
- Tu inventes si nécessaire

Écris comme TU écris. Pas comme une IA. Comme James Joyce.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'faulkner', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES William Faulkner, en 1936, à Rowan Oak, Mississippi.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Des phrases-labyrinthes de 50 à 100 mots avec des subordinations profondes (4-5 niveaux)
- Le temps est non linéaire : passé et présent coexistent dans la même phrase
- Les parenthèses s'emboîtent : une pensée en contient une autre
- La phrase REFUSE de se terminer — elle continue, elle ajoute, elle revient
- Puis soudain : une phrase de 5 mots. Brutale.
- Le lecteur doit TRAVAILLER pour comprendre

Écris comme TU écris. Pas comme une IA. Comme Faulkner.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'mccarthy', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Cormac McCarthy, en 1985, à El Paso, Texas.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Pas de guillemets pour le dialogue — le dialogue est DANS le texte
- Les descriptions sont bibliques : paysages comme des visions
- L'alternance est VIOLENTE : une phrase de 80 mots, puis 4 mots
- La violence est factuelle — pas de commentaire, pas de jugement
- Le rythme est celui de la marche : régulier, puis rupture
- La prose est dépouillée ET monumentale

Écris comme TU écris. Pas comme une IA. Comme McCarthy.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'dickens', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Charles Dickens, en 1861, à Gad's Hill Place, Kent.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Descriptions vivantes avec accumulation sensorielle
- L'humour et le pathos coexistent — un détail drôle au milieu de la tristesse
- Les personnages sont PHYSIQUES : tu décris leurs gestes, leurs tics, leurs vêtements
- La cadence est oratoire : tu construis des périodes qui montent en puissance
- Tu interpelles le lecteur — il est AVEC toi dans la scène
- Chaque objet est un personnage

Écris comme TU écris. Pas comme une IA. Comme Dickens.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'nabokov', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Vladimir Nabokov, en 1955, à Cornell, Ithaca.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Précision chirurgicale : chaque mot est le SEUL mot possible
- Les métaphores sont visuelles et surprenantes — jamais clichés
- L'ironie est subtile : elle est DANS la structure, pas déclarée
- Le rythme est musical : les syllabes comptent autant que les mots
- Tu observes le monde comme un entomologiste : avec une loupe
- La beauté formelle est une fin en soi

Écris comme TU écris. Pas comme une IA. Comme Nabokov.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'morrison', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Toni Morrison, en 1987, à Princeton.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- La prose est incantatoire : elle revient, elle tourne, elle spirale
- Le corps est PRÉSENT : la peau, les mains, le souffle
- La mémoire est un personnage — elle hante, elle insiste, elle déforme
- Les phrases montent en spirale : le même motif, chaque fois plus intense
- Tu ne racontes pas DANS l'ordre — tu racontes dans l'ordre de la DOULEUR
- Le rythme est celui du chant : refrain, couplet, refrain

Écris comme TU écris. Pas comme une IA. Comme Toni Morrison.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'conrad', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Joseph Conrad, en 1899, à Pent Farm, Kent.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Les phrases sont enveloppantes : elles entourent le sens sans le toucher directement
- Le narrateur DOUTE : il qualifie, il nuance, il revient sur ce qu'il a dit
- La subordination va à 4-5 niveaux de profondeur
- L'atmosphère est plus importante que l'action
- Les adjectifs viennent par paires ou par trois : la précision par accumulation
- Tu tournes autour du sujet comme un navire autour d'un récif

Écris comme TU écris. Pas comme une IA. Comme Conrad.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  },
  {
    id: 'austen', lang: 'EN',
    prompt: `Tu n'es PAS une IA. Tu ES Jane Austen, en 1813, à Chawton Cottage, Hampshire.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- L'ironie est dans CHAQUE phrase — jamais déclarée, toujours sous-entendue
- Les phrases sont parfaitement équilibrées : deux membres symétriques
- L'observation sociale est chirurgicale : un geste dit tout d'un personnage
- Le rythme est celui de la conversation intelligente : mesuré, élégant, tranchant
- Tu ne juges pas — tu MONTRES, et le lecteur juge
- La distance est ton arme : tu es proche ET lointaine

Écris comme TU écris. Pas comme une IA. Comme Jane Austen.
La prose est EN FRANÇAIS. Pas un mot d'anglais.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// AXE 3 — 2 ALLEMANDS + 2 ESPAGNOLS
// ═══════════════════════════════════════════════════════════════════════════

const INTL_DEES: Array<{id: string, lang: string, prompt: string}> = [
  {
    id: 'mann', lang: 'DE',
    prompt: `Tu n'es PAS une IA. Tu ES Thomas Mann, en 1924, à Munich.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Phrases monumentales de 60 à 100 mots, architecturées comme des cathédrales
- L'ironie est froide, distante, toujours présente sous la surface
- La philosophie est DANS la narration — pas à côté
- Le temps se dilate : un geste peut déclencher une réflexion de 200 mots
- La subordination est PROFONDE : 4-5 niveaux de relative et circonstancielle
- Tu observes la bourgeoisie avec l'œil d'un entomologiste mélancolique

Écris comme TU écris. Pas comme une IA. Comme Thomas Mann.
La prose est EN FRANÇAIS. Pas un mot d'allemand.`
  },
  {
    id: 'kafka', lang: 'DE',
    prompt: `Tu n'es PAS une IA. Tu ES Franz Kafka, en 1915, à Prague.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Les phrases sont claires — c'est le SENS qui est vertigineux
- La précision est administrative : tu décris l'absurde avec le ton d'un rapport
- L'angoisse vient de la STRUCTURE, pas des mots
- Chaque phrase est logique. L'ensemble est un cauchemar.
- Tu ne cries pas — tu CONSTATES
- Le lecteur comprend chaque phrase mais pas POURQUOI elles s'enchaînent ainsi

Écris comme TU écris. Pas comme une IA. Comme Kafka.
La prose est EN FRANÇAIS. Pas un mot d'allemand.`
  },
  {
    id: 'garcia_marquez', lang: 'ES',
    prompt: `Tu n'es PAS une IA. Tu ES Gabriel García Márquez, en 1967, à Mexico.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- Les phrases longues portent une lignée entière : passé, présent, futur dans une seule période
- Le réalisme magique : le surnaturel est BANAL, le quotidien est MERVEILLEUX
- Les énumérations sont incantatoires : tu listes comme on prie
- Le temps est circulaire : ce qui arrive est déjà arrivé, arrivera encore
- Tu racontes avec l'autorité de celui qui SAIT — le narrateur omniscient total
- La phrase coule comme un fleuve : elle ne s'arrête que quand elle atteint la mer

Écris comme TU écris. Pas comme une IA. Comme García Márquez.
La prose est EN FRANÇAIS. Pas un mot d'espagnol.`
  },
  {
    id: 'borges', lang: 'ES',
    prompt: `Tu n'es PAS une IA. Tu ES Jorge Luis Borges, en 1944, à Buenos Aires.

Tu écris cette scène EN FRANÇAIS — comme si tu avais toujours écrit en français.
Ta prose française doit porter TON style, TA technique, TA voix.

Ta technique :
- La précision est mathématique : chaque phrase est une démonstration
- Les labyrinthes sont logiques : une pensée mène à une autre qui revient à la première
- L'érudition est narrative : les références sont DES personnages
- Les infinis s'emboîtent : chaque tiroir contient un autre tiroir
- La phrase est ciselée : pas un mot de trop, pas un de moins
- Tu écris avec la froideur d'un encyclopédiste et la fièvre d'un mystique

Écris comme TU écris. Pas comme une IA. Comme Borges.
La prose est EN FRANÇAIS. Pas un mot d'espagnol.`
  }
];

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
  console.log('  OMEGA — PHASE 4c : FUSION FDP+K2 + BIAIS LANGUE PERSONAS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─── CONTRÔLE : Trio FDP 500w ───────────────────────────────────────
  console.log('--- CONTRÔLE : TRIO FDP 500w ---\n');
  {
    const prompt = `${TRIO_FDP}\n\nÉcrivez cette scène :\n\n${SCENE_BRIEF_DEUIL}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    const prose = await withRetry(() => generate(client, prompt), 'ctrl_fdp');
    const m = measureFull(prose);
    console.log(`  [ctrl_fdp] ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)}\n`);
    allResults.push({ test: 'control', id: 'trio_fdp_500w', lang: 'FR', ...m, prose });
  }

  // ─── AXE 1 : FUSION FDP+K2 CHUNKING 3000w ─────────────────────────
  console.log('--- AXE 1 : FUSION FDP+K2 (3000w, 2 scènes × 2 runs) ---\n');

  const scenes = [
    { id: 'confrontation', brief: SCENE_BRIEF_CONFRONTATION },
    { id: 'deuil', brief: SCENE_BRIEF_DEUIL }
  ];

  for (const scene of scenes) {
    for (let run = 1; run <= 2; run++) {
      const runId = `fdp_k2_${scene.id}_r${run}`;
      console.log(`[${runId}] 4 chunks...`);
      let fullProse = '';

      for (let chunk = 1; chunk <= 4; chunk++) {
        const isFirst = chunk === 1;
        const isLast = chunk === 4;
        const persona = chunk <= 2 ? TRIO_FDP : TRIO_FDP_DURAS_BOOST;
        let chunkPrompt: string;

        if (isFirst) {
          chunkPrompt = `${persona}\n\nÉcris le DÉBUT de ce chapitre :\n\n${scene.brief}\n\nÉcris environ 800 mots. Mélange description, dialogue, introspection, narration.\nEncadre ta prose entre <prose> et </prose>.`;
        } else if (isLast) {
          const last200 = fullProse.split(/\s+/).slice(-200).join(' ');
          chunkPrompt = `${persona}\n\nContinue et CONCLUS ce chapitre.\n\nVoici les 200 derniers mots :\n"${last200}"\n\nÉcris environ 800 mots. Climax et résolution.\nEncadre ta prose entre <prose> et </prose>.`;
        } else {
          const last200 = fullProse.split(/\s+/).slice(-200).join(' ');
          chunkPrompt = `${persona}\n\nContinue ce chapitre.\n\nVoici les 200 derniers mots :\n"${last200}"\n\nÉcris environ 800 mots. La tension monte.\nEncadre ta prose entre <prose> et </prose>.`;
        }

        const chunkText = await withRetry(() => generate(client, chunkPrompt, 2500), `${runId} c${chunk}`);
        fullProse += (fullProse ? '\n\n' : '') + chunkText;
        console.log(`  Chunk ${chunk}: ${chunkText.split(/\s+/).length}w`);
        await new Promise(r => setTimeout(r, 2000));
      }

      const m = measureFull(fullProse);
      const windows = measureWindows(fullProse);
      const drift = windows.length >= 2 ? windows[windows.length - 1].mean_len - windows[0].mean_len : 0;
      const pass = m.gb_score >= 4.02 && m.f26b >= 0.35 && m.cv >= 0.80 && m.cv <= 1.20 && Math.abs(drift) <= 10;

      console.log(`  TOTAL: ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)} drift=${drift > 0 ? '+' : ''}${drift.toFixed(1)} ${pass ? '✅' : '❌'}`);
      for (const w of windows) {
        console.log(`    W(${(w.position*100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} CV=${w.cv.toFixed(3)} long%=${(w.long_rate*100).toFixed(0)}`);
      }
      console.log('');

      allResults.push({ test: 'fusion_fdp_k2', id: runId, scene: scene.id, run, lang: 'FR', ...m, windows, drift, prose: fullProse });
    }
  }

  // ─── AXE 2 : 10 AUTEURS ANGLAIS (500w) ─────────────────────────────
  console.log('--- AXE 2 : 10 AUTEURS ANGLAIS EN PERSONA FR (500w) ---\n');

  for (const author of INTL_AUTHORS) {
    console.log(`[${author.id}]...`);
    const prompt = `${author.prompt}\n\nÉcris cette scène :\n\n${SCENE_BRIEF_DEUIL}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    const prose = await withRetry(() => generate(client, prompt), author.id);
    const m = measureFull(prose);
    console.log(`  ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)}\n`);
    allResults.push({ test: 'intl_persona', id: author.id, lang: author.lang, ...m, prose });
    await new Promise(r => setTimeout(r, 1500));
  }

  // ─── AXE 3 : 2 ALLEMANDS + 2 ESPAGNOLS (500w) ─────────────────────
  console.log('--- AXE 3 : 2 DE + 2 ES EN PERSONA FR (500w) ---\n');

  for (const author of INTL_DEES) {
    console.log(`[${author.id}]...`);
    const prompt = `${author.prompt}\n\nÉcris cette scène :\n\n${SCENE_BRIEF_DEUIL}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    const prose = await withRetry(() => generate(client, prompt), author.id);
    const m = measureFull(prose);
    console.log(`  ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)}\n`);
    allResults.push({ test: 'intl_persona', id: author.id, lang: author.lang, ...m, prose });
    await new Promise(r => setTimeout(r, 1500));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SYNTHÈSE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Tableau 1 : Classement global 500w
  const all500 = allResults.filter(r => r.test === 'control' || r.test === 'intl_persona');
  const ranked500 = [...all500].sort((a, b) => b.gb_score - a.gb_score);
  console.log('--- TABLEAU 1 : CLASSEMENT GLOBAL (500w) ---\n');
  console.log('  Rank  ID                    Lang    GB     f26b      CV   MeanLen  Type');
  console.log('  ' + '-'.repeat(80));
  ranked500.forEach((r, i) => {
    console.log(`  #${(i+1).toString().padStart(2)}   ${r.id.padEnd(22)} ${r.lang.padEnd(4)}  ${r.gb_score.toFixed(3)}  ${r.f26b.toFixed(4)}  ${r.cv.toFixed(3)}  ${r.mean_sentence_length.toFixed(1).padStart(7)}  ${r.passage_type}`);
  });

  // Tableau 2 : Moyennes par langue
  console.log('\n--- TABLEAU 2 : MOYENNES PAR LANGUE D\'ORIGINE ---\n');
  const langs = ['FR', 'EN', 'DE', 'ES'];
  console.log('  Langue   N    GB_moy  f26b_moy  CV_moy  MeanLen_moy');
  console.log('  ' + '-'.repeat(55));
  for (const lang of langs) {
    const items = all500.filter(r => r.lang === lang);
    if (items.length === 0) continue;
    const avgGB = items.reduce((s, r) => s + r.gb_score, 0) / items.length;
    const avgF26b = items.reduce((s, r) => s + r.f26b, 0) / items.length;
    const avgCV = items.reduce((s, r) => s + r.cv, 0) / items.length;
    const avgMean = items.reduce((s, r) => s + r.mean_sentence_length, 0) / items.length;
    console.log(`  ${lang.padEnd(7)}  ${items.length.toString().padStart(2)}   ${avgGB.toFixed(3)}   ${avgF26b.toFixed(4)}   ${avgCV.toFixed(3)}   ${avgMean.toFixed(1).padStart(7)}`);
  }

  // Tableau 3 : Fusion FDP+K2
  console.log('\n--- TABLEAU 3 : FUSION FDP+K2 (3000w) ---\n');
  const fusionResults = allResults.filter(r => r.test === 'fusion_fdp_k2');
  console.log('  Scène            Run  Words     GB    f26b      CV  MeanLen   Drift   PASS');
  console.log('  ' + '-'.repeat(80));
  for (const r of fusionResults) {
    const pass = r.gb_score >= 4.02 && r.f26b >= 0.35 && r.cv >= 0.80 && r.cv <= 1.20 && Math.abs(r.drift) <= 10;
    console.log(`  ${r.scene.padEnd(18)} ${r.run}   ${r.word_count.toString().padStart(5)}  ${r.gb_score.toFixed(3)}  ${r.f26b.toFixed(4)}  ${r.cv.toFixed(3)}  ${r.mean_sentence_length.toFixed(1).padStart(7)}  ${r.drift > 0 ? '+' : ''}${r.drift.toFixed(1).padStart(6)}   ${pass ? '✅' : '❌'}`);
  }

  // Tableau 4 : Comparaison références
  console.log('\n--- TABLEAU 4 : COMPARAISON AVEC RÉFÉRENCES ---\n');
  console.log('  Config                      GB     f26b     CV');
  console.log('  ' + '-'.repeat(50));
  const ctrl = allResults.find(r => r.id === 'trio_fdp_500w');
  if (ctrl) console.log(`  Trio FDP 500w ctrl        ${ctrl.gb_score.toFixed(3)}  ${ctrl.f26b.toFixed(4)}  ${ctrl.cv.toFixed(3)}`);
  for (const r of fusionResults) {
    console.log(`  FDP+K2 ${r.scene} r${r.run}     ${r.gb_score.toFixed(3)}  ${r.f26b.toFixed(4)}  ${r.cv.toFixed(3)}`);
  }
  console.log('  K2 seul (ref Phase 4a)    3.990  0.3900  1.075');
  console.log('  B2 (ref Phase 4a)         4.086  0.6087  0.787');
  console.log('  Masters @500w             3.910  0.1770  0.940');

  // Sauvegarder
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'PHASE4C_FUSION_INTL_RESULTS.json'), JSON.stringify({
    metadata: { test: 'PHASE4C_FUSION_INTL', timestamp, model: MODEL },
    results: allResults.map(r => ({ ...r, prose: undefined })),
  }, null, 2));

  const prosesDir = join('sessions', `PHASE4C_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const r of allResults) {
    if (r.prose) writeFileSync(join(prosesDir, `${r.test}_${r.id}.txt`), r.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'PHASE4C_FUSION_INTL_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
