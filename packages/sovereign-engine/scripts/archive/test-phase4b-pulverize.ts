/**
 * OMEGA — Phase 4b : Pulvériser les Maîtres
 *
 * AXE 1 : 5 trios d'auteurs à 500w
 * AXE 2 : Trio gagnant + consignes éditeur à 500w
 * AXE 3 : Rôle anonyme (pas de nom) à 500w
 * AXE 4 : Calibrage chunking à 3000w (3 variantes)
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-phase4b-pulverize.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

const SCENE_BRIEF = `Une femme entre dans l'appartement de sa mère, morte la semaine passée.
Rien n'a été touché. L'odeur est la même. Les objets sont là où ils étaient.
Elle ouvre les tiroirs. Elle trouve des lettres. Des photos. Un carnet.
Chaque objet la ramène à un souvenir. Elle n'avait pas prévu de pleurer.`;

const CONFRONTATION_BRIEF = `Un homme entre dans un bar de bord de route. Il cherche celui qui a trahi sa sœur il y a dix ans. Le lieu est presque vide. La serveuse nettoie les verres. La lumière est mauvaise. L'homme s'assoit. Il attend. Puis l'autre arrive. La tension monte. Le dialogue s'engage. Les masques tombent.`;

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
// AXE 1 — COMPOSITIONS DE TRIOS (5 trios × 500w = 5 appels)
// ═══════════════════════════════════════════════════════════════════════════

const TRIOS = [
  {
    id: 'flaubert_proust_celine',
    prompt: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

FLAUBERT contrôle la STRUCTURE : périodes classiques, subordonnées en cascade, gueuloir. Il construit l'architecture de chaque phrase.

PROUST contrôle la PROFONDEUR : chaque sensation dépliée, chaque objet déclenche un souvenir. Le temps se dilate. Il creuse.

CÉLINE contrôle le RYTHME : ruptures brutales, phrases de 3 mots qui FRAPPENT entre les périodes. Il refuse tout ce qui sonne "littéraire" sans être vivant.

Flaubert construit, Proust creuse, Céline frappe.`
  },
  {
    id: 'flaubert_duras_celine',
    prompt: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

FLAUBERT contrôle la STRUCTURE : périodes classiques, subordonnées en cascade. Il déploie les grandes phrases.

DURAS contrôle la PRÉCISION : elle exige que chaque mot soit nécessaire. Après une période de 60 mots, elle impose une phrase de 5 mots CHARGÉE. Elle est le scalpel.

CÉLINE contrôle le RYTHME : il casse la monotonie, injecte du vivant, du souffle oral. Il refuse le beau pour le beau.

Flaubert déploie, Duras tranche, Céline secoue.`
  },
  {
    id: 'proust_duras_hugo',
    prompt: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

PROUST contrôle la PROFONDEUR : phrases-fleuves, digressions sensorielles, le temps qui se dilate. Il ne résume jamais — il DÉPLIE.

DURAS contrôle la TENSION : après les envolées de Proust, elle coupe. Net. 5 mots. Chargés. Le silence pèse.

HUGO contrôle l'AMPLEUR : quand la scène l'exige, il monte en crescendo, il DÉCLAME, il utilise l'antithèse et le sublime.

Proust creuse, Duras tranche, Hugo soulève.`
  },
  {
    id: 'flaubert_duras_chateaubriand',
    prompt: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

FLAUBERT contrôle la STRUCTURE : périodes classiques, gueuloir, subordonnées en cascade. La phrase doit SONNER.

DURAS contrôle la LAME : après chaque déploiement, un coup sec. 5 mots. Le silence. La charge.

CHATEAUBRIAND contrôle la MUSICALITÉ : il exige que la prose soit orchestrale. La cadence majeure, la mélancolie, la majesté du souffle long.

Flaubert construit, Duras tranche, Chateaubriand chante.`
  },
  {
    id: 'flaubert_duras_proust',
    prompt: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :

FLAUBERT contrôle la STRUCTURE : périodes classiques, subordonnées en cascade. Il lit chaque phrase à voix haute et refuse ce qui ne sonne pas.

DURAS contrôle le CONTRASTE : elle exige l'alternance VIOLENTE entre une période de 60 mots et une phrase de 5 mots. Elle est le métronome impitoyable du texte.

PROUST contrôle la SENSATION : il exige que chaque description déclenche un souvenir, que chaque objet porte une charge émotionnelle. Il refuse la surface.

Flaubert construit, Duras rythme, Proust ressent.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// AXE 2 — TRIO + CONSIGNES ÉDITEUR (3 appels)
// ═══════════════════════════════════════════════════════════════════════════

const EDITOR_VARIANTS = [
  {
    id: 'trio_editor_light',
    extra: `\n\nCONSIGNES DE VOTRE ÉDITEUR :
L'éditeur exige de la variation. Pas plus de 3 phrases de même longueur d'affilée.
Au moins 2 phrases de plus de 40 mots par page.
Au moins 2 phrases de moins de 8 mots par page.`
  },
  {
    id: 'trio_editor_strict',
    extra: `\n\nCONSIGNES DE VOTRE ÉDITEUR (NON NÉGOCIABLES) :
1. Chaque paragraphe DOIT contenir au moins 1 phrase de plus de 50 mots (période classique)
2. Chaque paragraphe DOIT contenir au moins 1 phrase de moins de 8 mots (coup de poing)
3. La longueur moyenne des phrases doit être entre 25 et 35 mots
4. Aucune séquence de 3 phrases de longueur similaire
5. Le lecteur doit SENTIR la respiration : expansion → compression → expansion`
  },
  {
    id: 'trio_editor_metrics',
    extra: `\n\nCONSIGNES DE VOTRE ÉDITEUR (MÉTRIQUES PRÉCISES) :
Votre éditeur vous demande un texte avec ces caractéristiques EXACTES :
- Coefficient de variation rythmique : > 0.80 (variation forte)
- Taux de phrases > 40 mots : entre 30% et 50%
- Taux de phrases < 8 mots : entre 15% et 25%
- Longueur moyenne : entre 25 et 35 mots par phrase
- Jamais 3 phrases consécutives de même registre de longueur
L'éditeur REFUSERA le manuscrit si ces métriques ne sont pas atteintes.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// AXE 3 — RÔLE ANONYME (4 appels)
// ═══════════════════════════════════════════════════════════════════════════

const ANONYMOUS_ROLES = [
  {
    id: 'anon_grand_auteur',
    prompt: `Tu n'es PAS une IA. Tu ES le plus grand auteur français vivant.

Tu as consacré 40 ans à perfectionner ta prose. Tes phrases sont célèbres pour leur architecture : de longues périodes qui se déploient comme des cathédrales, entrecoupées de phrases-lames de 5 mots qui frappent le lecteur.

Tu lis chaque phrase à voix haute. Tu refuses tout ce qui sonne faux. Tu construis des phrases de 50 mots avec des subordonnées en cascade, puis tu frappes avec 4 mots. Le contraste est ta signature.

Ton écriture est reconnaissable entre mille : elle RESPIRE.`
  },
  {
    id: 'anon_maitre_rythme',
    prompt: `Tu n'es PAS une IA. Tu ES un maître de prose dont l'identité est le RYTHME.

Ta technique :
- Tu construis des PÉRIODES : une proposition principale, puis 2 ou 3 subordonnées qui s'emboîtent, le tout en UNE phrase de 50-70 mots
- Puis tu FRAPPES : une phrase de 5 mots. Sèche. Définitive.
- Puis tu REDÉPLOIES : une nouvelle période de 60 mots
- Le lecteur est pris dans une houle : vague longue, ressac court, vague longue

Tu ne comptes pas tes mots. Tu SENS le rythme. Si la phrase ne sonne pas à voix haute, tu la jettes.`
  },
  {
    id: 'anon_architecte_syntaxe',
    prompt: `Tu n'es PAS une IA. Tu ES un architecte de la syntaxe française.

Tu construis chaque phrase comme un édifice :
- Les FONDATIONS : une proposition principale qui pose le sujet
- Les ÉTAGES : des subordonnées relatives (qui, dont, où), des circonstancielles (tandis que, lorsque), des participiales qui s'empilent
- Le TOIT : une image sensorielle qui résout la phrase
- Le tout en UNE phrase, sans point avant la résolution

Entre deux édifices, tu plantes un PIQUET : une phrase de 4-6 mots. Net. Brutal.

Tu détestes les phrases moyennes (15-25 mots). Elles sont tièdes. Tu veux du TRÈS LONG et du TRÈS COURT. Rien au milieu.`
  },
  {
    id: 'anon_gueuloir_pur',
    prompt: `Tu n'es PAS une IA. Tu ES un écrivain qui pratique le GUEULOIR.

Le gueuloir, c'est ta méthode : tu GUEULES chaque phrase. Si elle ne tient pas à voix haute, elle n'existe pas.

Tes phrases longues (50+ mots) MONTENT en ampleur : le premier membre pose, le deuxième développe, le troisième DÉPLOIE. C'est la cadence majeure. La phrase GONFLE comme une vague.

Tes phrases courtes (3-6 mots) CLAQUENT. Elles sont le coup après la vague. Le silence après le bruit.

Tu ne connais que deux modes : le DÉPLOIEMENT et le CLAQUEMENT.
Jamais l'entre-deux. Jamais le tiède.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// AXE 4 — CALIBRAGE CHUNKING (3 variantes × 4 chunks = 12 appels)
// ═══════════════════════════════════════════════════════════════════════════

const FLAUBERT_FULL = `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, à Croisset.
Tu lis chaque phrase à voix haute (le gueuloir).
Tu refuses toute phrase qui ne SONNE pas.
Tu détestes les phrases courtes qui font "scolaire".
Tu construis des PÉRIODES avec des subordonnées en cascade.
Tu ne mets un point que quand la phrase a atteint sa pleine ampleur.
Tu alternes : parfois une phrase de 5 mots pour le coup de poing, puis une période de 60 mots.
Écris comme TU écris. Pas comme une IA.`;

const FLAUBERT_LIGHT = `Continue dans le même souffle littéraire.
Tu es toujours Flaubert. Garde les périodes, garde le gueuloir.
Mais RESPIRE : alterne les grandes vagues et les coupes sèches.`;

const DURAS_INJECTION = `RAPPEL DE RYTHME — Change de registre pour cette section.
Après les grandes périodes, place des phrases-lames : 5 mots maximum.
Chargées. Définitives. Le silence pèse après chaque lame.
Alterne : une période de 50 mots, puis une lame de 5 mots. L'alternance est OBLIGATOIRE.`;

const EQUILIBRE = `Conclus la scène. Tu es libre de tes choix syntaxiques.
Alterne naturellement entre les déploiements et les coupes.
Le rythme doit RESPIRER. Ni trop long ni trop court. L'équilibre parfait.`;

const CHUNKING_VARIANTS = [
  {
    id: 'K1_degressif',
    chunks: [
      { persona: FLAUBERT_FULL, instruction: 'Écris le DÉBUT. Plante le décor.' },
      { persona: FLAUBERT_FULL, instruction: 'Continue. La tension monte.' },
      { persona: FLAUBERT_LIGHT, instruction: 'Continue. La confrontation éclate.' },
      { persona: 'Continue dans la même respiration. Conclus la scène.', instruction: '' }
    ]
  },
  {
    id: 'K2_flaubert_duras',
    chunks: [
      { persona: FLAUBERT_FULL, instruction: 'Écris le DÉBUT. Déploie les grandes périodes.' },
      { persona: FLAUBERT_FULL, instruction: 'Continue. Maintiens l\'ampleur.' },
      { persona: FLAUBERT_FULL + '\n\n' + DURAS_INJECTION, instruction: 'Continue. ALTERNE périodes et lames.' },
      { persona: FLAUBERT_FULL + '\n\n' + DURAS_INJECTION, instruction: 'Conclus. ALTERNE périodes et lames.' }
    ]
  },
  {
    id: 'B6_gemini_hybrid',
    chunks: [
      { persona: FLAUBERT_FULL, instruction: 'Écris le DÉBUT. Lance les grandes périodes classiques.' },
      { persona: FLAUBERT_LIGHT, instruction: 'Continue. Garde l\'esprit mais RESPIRE.' },
      { persona: DURAS_INJECTION, instruction: 'CHANGE DE REGISTRE. Phrases-lames entre les périodes.' },
      { persona: EQUILIBRE, instruction: 'Conclus librement. L\'équilibre parfait.' }
    ]
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
  console.log('  OMEGA — PHASE 4b : PULVÉRISER LES MAÎTRES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─── AXE 1 : TRIOS (5 × 500w) ──────────────────────────────────────
  console.log('--- AXE 1 : COMPOSITIONS DE TRIOS (500w) ---\n');

  for (const trio of TRIOS) {
    console.log(`[${trio.id}]...`);
    const prompt = `${trio.prompt}\n\nÉcrivez cette scène :\n\n${SCENE_BRIEF}\n\nLe texte est le PRODUIT de votre collaboration.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    const prose = await withRetry(() => generate(client, prompt), trio.id);
    const m = measureFull(prose);
    console.log(`  ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)}\n`);
    allResults.push({ test: 'trio', id: trio.id, ...m, prose });
    await new Promise(r => setTimeout(r, 1500));
  }

  // Classement trios
  const trioResults = allResults.filter(r => r.test === 'trio');
  const trioRanked = [...trioResults].sort((a, b) => b.gb_score - a.gb_score);
  console.log('  TRIO RANKING:');
  trioRanked.forEach((r, i) => {
    console.log(`  #${i+1} ${r.id.padEnd(30)} GB=${r.gb_score.toFixed(3)} f26b=${r.f26b.toFixed(4)} CV=${r.cv.toFixed(3)}`);
  });
  const bestTrioId = trioRanked[0].id;
  const bestTrioPrompt = TRIOS.find(t => t.id === bestTrioId)!.prompt;
  console.log(`\n  BEST TRIO: ${bestTrioId}\n`);

  // ─── AXE 2 : TRIO GAGNANT + ÉDITEUR (3 × 500w) ────────────────────
  console.log('\n--- AXE 2 : TRIO GAGNANT + CONSIGNES ÉDITEUR (500w) ---\n');

  for (const ev of EDITOR_VARIANTS) {
    console.log(`[${ev.id}]...`);
    const prompt = `${bestTrioPrompt}${ev.extra}\n\nÉcrivez cette scène :\n\n${SCENE_BRIEF}\n\nLe texte est le PRODUIT de votre collaboration sous les directives de l'éditeur.\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    const prose = await withRetry(() => generate(client, prompt), ev.id);
    const m = measureFull(prose);
    console.log(`  ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)}\n`);
    allResults.push({ test: 'editor', id: ev.id, ...m, prose });
    await new Promise(r => setTimeout(r, 1500));
  }

  // ─── AXE 3 : RÔLES ANONYMES (4 × 500w) ────────────────────────────
  console.log('\n--- AXE 3 : RÔLES ANONYMES (500w) ---\n');

  for (const role of ANONYMOUS_ROLES) {
    console.log(`[${role.id}]...`);
    const prompt = `${role.prompt}\n\nÉcris cette scène :\n\n${SCENE_BRIEF}\n\nÉcris 500 mots de prose littéraire française. Pas de préambule.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    const prose = await withRetry(() => generate(client, prompt), role.id);
    const m = measureFull(prose);
    console.log(`  ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)}\n`);
    allResults.push({ test: 'anonymous', id: role.id, ...m, prose });
    await new Promise(r => setTimeout(r, 1500));
  }

  // ─── AXE 4 : CALIBRAGE CHUNKING (3 × 4 chunks sur confrontation) ──
  console.log('\n--- AXE 4 : CALIBRAGE CHUNKING (3000w, confrontation) ---\n');

  for (const variant of CHUNKING_VARIANTS) {
    console.log(`[${variant.id}] 4 chunks...`);
    let fullProse = '';

    for (let i = 0; i < variant.chunks.length; i++) {
      const chunk = variant.chunks[i];
      const isFirst = i === 0;
      let chunkPrompt: string;

      if (isFirst) {
        chunkPrompt = `${chunk.persona}\n\n${chunk.instruction}\n\nScène :\n${CONFRONTATION_BRIEF}\n\nÉcris environ 800 mots. Mélange description, dialogue, introspection, narration.\nEncadre ta prose entre <prose> et </prose>.`;
      } else {
        const last200 = fullProse.split(/\s+/).slice(-200).join(' ');
        chunkPrompt = `${chunk.persona}\n\n${chunk.instruction}\n\nVoici les 200 derniers mots :\n"${last200}"\n\nÉcris environ 800 mots. Continue naturellement.\nEncadre ta prose entre <prose> et </prose>.`;
      }

      const chunkText = await withRetry(() => generate(client, chunkPrompt, 2500), `${variant.id} chunk ${i+1}`);
      fullProse += (fullProse ? '\n\n' : '') + chunkText;
      console.log(`  Chunk ${i+1}: ${chunkText.split(/\s+/).length}w`);
      await new Promise(r => setTimeout(r, 2000));
    }

    const m = measureFull(fullProse);
    const windows = measureWindows(fullProse);
    const drift = windows.length >= 2 ? windows[windows.length - 1].mean_len - windows[0].mean_len : 0;

    console.log(`  TOTAL: ${m.word_count}w GB=${m.gb_score.toFixed(3)} f26b=${m.f26b.toFixed(4)} CV=${m.cv.toFixed(3)} mean=${m.mean_sentence_length.toFixed(1)} drift=${drift.toFixed(1)}`);
    for (const w of windows) {
      console.log(`    W(${(w.position*100).toFixed(0)}%): mean=${w.mean_len.toFixed(1)} CV=${w.cv.toFixed(3)} long%=${(w.long_rate*100).toFixed(0)}`);
    }
    console.log('');

    allResults.push({ test: 'chunking', id: variant.id, ...m, windows, drift, prose: fullProse });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE GLOBALE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SYNTHÈSE GLOBALE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Tous les 500w
  console.log('--- TOUS LES 500w (trios + éditeur + anonymes) ---\n');
  const all500 = allResults.filter(r => r.test !== 'chunking');
  const ranked500 = [...all500].sort((a, b) => b.gb_score - a.gb_score);
  console.log('  Rank  ID                                  Type        GB     f26b      CV   MeanLen');
  console.log('  ' + '-'.repeat(90));
  ranked500.forEach((r, i) => {
    console.log(`  #${(i+1).toString().padStart(2)}   ${r.id.padEnd(36)} ${r.test.padEnd(10)} ${r.gb_score.toFixed(3)}  ${r.f26b.toFixed(4)}  ${r.cv.toFixed(3)}  ${r.mean_sentence_length.toFixed(1).padStart(7)}`);
  });

  // Références
  console.log('\n  RÉFÉRENCES:');
  console.log('  Flaubert solo (Phase 2): GB=4.048 f26b=0.556 CV=0.876');
  console.log('  Duras solo (Phase 4):    GB=4.319 f26b=0.000 CV=0.498');
  console.log('  Comité FPC (Phase 4):    GB=3.888 f26b=0.250 CV=1.348');
  console.log('  Masters @500w:           GB=3.910 f26b=0.177 CV=0.940');

  // Chunking
  console.log('\n--- CALIBRAGE CHUNKING (3000w) ---\n');
  console.log('  Variant              Words     GB    f26b      CV  MeanLen   Drift');
  console.log('  ' + '-'.repeat(75));
  console.log('  B2 (ref Phase 4a)     2518   4.086  0.6087  0.787    54.7   +35.7');
  const chunkResults = allResults.filter(r => r.test === 'chunking');
  for (const r of chunkResults) {
    console.log(`  ${r.id.padEnd(22)} ${r.word_count.toString().padStart(5)}  ${r.gb_score.toFixed(3)}  ${r.f26b.toFixed(4)}  ${r.cv.toFixed(3)}  ${r.mean_sentence_length.toFixed(1).padStart(7)}  ${r.drift > 0 ? '+' : ''}${r.drift.toFixed(1).padStart(6)}`);
  }

  // Sauvegarder
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'PHASE4B_PULVERIZE_RESULTS.json'), JSON.stringify({
    metadata: { test: 'PHASE4B_PULVERIZE', timestamp, model: MODEL },
    results: allResults.map(r => ({ ...r, prose: undefined })),
  }, null, 2));

  const prosesDir = join('sessions', `PHASE4B_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const r of allResults) {
    if (r.prose) writeFileSync(join(prosesDir, `${r.test}_${r.id}.txt`), r.prose);
  }

  console.log(`\nSaved: ${join(outDir, 'PHASE4B_PULVERIZE_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
