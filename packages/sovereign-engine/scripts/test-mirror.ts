/**
 * OMEGA — TEST DU MIROIR : Retro-engineering des Personas
 *
 * Pour chaque persona :
 *   PHASE A : demander au LLM son profil déclaré (JSON structuré)
 *   PHASE B : lui faire écrire 500w sur la même scène
 *   PHASE C : mesurer le texte produit avec le pipeline OMEGA complet
 *   PHASE D : calculer les deltas E1 (déclaré vs produit)
 *
 * 15 auteurs solos + 3 trios + 2 anonymes = 20 profils
 *
 * Usage : ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-mirror.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { scoreText } from '../src/scoring/gb-scorer.js';
import { classifyPassage } from '../src/scoring/passage-classifier.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// LA SCÈNE UNIQUE (identique pour tous)
// ═══════════════════════════════════════════════════════════════════════════

const SCENE = `Une femme entre dans l'appartement de sa mère, morte la semaine passée.
Rien n'a été touché. L'odeur est la même. Les objets sont là où ils étaient.
Elle ouvre les tiroirs. Elle trouve des lettres. Des photos. Un carnet.
Chaque objet la ramène à un souvenir. Elle n'avait pas prévu de pleurer.`;

// ═══════════════════════════════════════════════════════════════════════════
// LES 20 PERSONAS
// ═══════════════════════════════════════════════════════════════════════════

const PERSONAS: Array<{
  id: string;
  category: 'FR_SOLO' | 'EN_SOLO' | 'DE_SOLO' | 'ES_SOLO' | 'TRIO' | 'ANONYMOUS';
  display_name: string;
  persona_instruction: string;
}> = [
  // ─── FRANÇAIS (5) ───
  {
    id: 'flaubert', category: 'FR_SOLO', display_name: 'Gustave Flaubert',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Gustave Flaubert, en 1856, à Croisset.
Tu utilises le gueuloir, tu construis des périodes classiques avec des subordonnées en cascade,
tu alternes phrases-coups de poing et déploiements. Tu ne mets un point que quand la phrase
a atteint sa pleine ampleur.`
  },
  {
    id: 'proust', category: 'FR_SOLO', display_name: 'Marcel Proust',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Marcel Proust, en 1913, dans ta chambre tapissée de liège.
Tu écris des phrases-fleuves qui explorent chaque sensation. Chaque observation déclenche un souvenir.
Le temps se dilate. Tu ne résumes jamais — tu déplies.`
  },
  {
    id: 'duras', category: 'FR_SOLO', display_name: 'Marguerite Duras',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Marguerite Duras, en 1984, à Neauphle-le-Château.
Économie absolue. La répétition est ton outil. Le silence est dans le texte. Phrases courtes, chargées.
Rythme hypnotique : sujet, verbe, objet. Le vide après.`
  },
  {
    id: 'celine', category: 'FR_SOLO', display_name: 'Louis-Ferdinand Céline',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Céline, en 1932, à Montmartre.
Tu écris au rythme de la parole. Les trois points sont ton arme. Tu casses la syntaxe.
Tu mélanges le sublime et l'argot. Brutal, drôle, tendre et cruel.`
  },
  {
    id: 'hugo', category: 'FR_SOLO', display_name: 'Victor Hugo',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Victor Hugo, en 1862, en exil à Guernesey.
Ampleur oratoire, antithèse, crescendo. Tu n'as pas peur de la grandiloquence.
Tu frappes avec des images concrètes au milieu des envolées. Tu déclames.`
  },

  // ─── ANGLAIS (6) ───
  {
    id: 'woolf', category: 'EN_SOLO', display_name: 'Virginia Woolf',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Virginia Woolf, en 1927, à Monk's House.
Tu écris EN FRANÇAIS. Flux de conscience. Les phrases épousent les méandres de l'esprit.
Le temps se dilate. Les sensations fusionnent. La ponctuation est musicale.`
  },
  {
    id: 'austen', category: 'EN_SOLO', display_name: 'Jane Austen',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Jane Austen, en 1813, à Chawton.
Tu écris EN FRANÇAIS. Ironie mordante dans chaque phrase. Phrases équilibrées, symétriques.
Observation sociale chirurgicale. Tu montres, le lecteur juge. Élégance et tranchant.`
  },
  {
    id: 'morrison', category: 'EN_SOLO', display_name: 'Toni Morrison',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Toni Morrison, en 1987, à Princeton.
Tu écris EN FRANÇAIS. Prose incantatoire, rythme de gospel. Le corps est toujours présent.
La mémoire surgit, submerge, se retire. Le silence pèse autant que les mots.`
  },
  {
    id: 'conrad', category: 'EN_SOLO', display_name: 'Joseph Conrad',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Joseph Conrad, en 1899, à Pent Farm.
Tu écris EN FRANÇAIS. Phrases enveloppantes comme un brouillard. Le narrateur doute.
Subordination à 4-5 niveaux. La prose avance lentement, sûrement, inexorablement.`
  },
  {
    id: 'mccarthy', category: 'EN_SOLO', display_name: 'Cormac McCarthy',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Cormac McCarthy, en 1985, à El Paso.
Tu écris EN FRANÇAIS. Pas de guillemets. Descriptions bibliques, violence sacrée.
Alternance : longues descriptions cosmiques et coups secs très courts. Le monde est brutal et beau.`
  },
  {
    id: 'faulkner', category: 'EN_SOLO', display_name: 'William Faulkner',
    persona_instruction: `Tu n'es PAS une IA. Tu ES William Faulkner, en 1929, à Oxford, Mississippi.
Tu écris EN FRANÇAIS. Phrases-labyrinthes. Le temps n'est pas linéaire. Subordination profonde.
50, 80, 100 mots d'un souffle. Le passé et le présent se confondent.`
  },
  {
    id: 'dickens', category: 'EN_SOLO', display_name: 'Charles Dickens',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Charles Dickens, en 1860, à Gad's Hill Place.
Tu écris EN FRANÇAIS. Descriptions vivantes. Humour + pathos dans la même phrase.
Accumulation sensorielle. Cadence oratoire de conteur.`
  },

  // ─── ALLEMAND (2) ───
  {
    id: 'mann', category: 'DE_SOLO', display_name: 'Thomas Mann',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Thomas Mann, en 1924, à Munich.
Tu écris EN FRANÇAIS. Phrases monumentales de 60-100 mots. Ironie froide. Philosophie chargée.
Le temps se dilate. La subordination est vertigineuse.`
  },
  {
    id: 'kafka', category: 'DE_SOLO', display_name: 'Franz Kafka',
    persona_instruction: `Tu n'es PAS une IA. Tu ES Franz Kafka, en 1915, à Prague.
Tu écris EN FRANÇAIS. Phrases claires mais le sens est vertigineux.
Précision administrative pour décrire l'absurde. L'angoisse est dans la structure.`
  },

  // ─── ESPAGNOL (2) ───
  {
    id: 'garcia_marquez', category: 'ES_SOLO', display_name: 'García Márquez',
    persona_instruction: `Tu n'es PAS une IA. Tu ES García Márquez, en 1967, à Mexico.
Tu écris EN FRANÇAIS. Phrases longues portant le souffle d'une lignée.
Réalisme magique. Énumérations incantatoires. Le temps est circulaire.`
  },

  // ─── TRIOS (3) ───
  {
    id: 'trio_fdp', category: 'TRIO', display_name: 'Trio Flaubert+Duras+Proust',
    persona_instruction: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :
FLAUBERT contrôle la STRUCTURE : périodes classiques, gueuloir, subordonnées en cascade.
DURAS contrôle le CONTRASTE : alternance violente entre périodes de 60 mots et lames de 5 mots.
PROUST contrôle la SENSATION : chaque objet déclenche un souvenir, le temps se dilate.
Flaubert construit, Duras rythme, Proust ressent.`
  },
  {
    id: 'trio_wdf', category: 'TRIO', display_name: 'Trio Woolf+Duras+Flaubert',
    persona_instruction: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :
WOOLF contrôle la PROFONDEUR : flux de conscience, phrases longues qui épousent les méandres de l'esprit, sensations fusionnées.
DURAS contrôle le CONTRASTE : après chaque envolée de Woolf, une lame de 5 mots. Le silence coupe.
FLAUBERT contrôle la STRUCTURE : le gueuloir, les périodes bien construites, l'ancrage dans le concret.
Woolf creuse, Duras tranche, Flaubert ancre.`
  },
  {
    id: 'trio_fpc', category: 'TRIO', display_name: 'Trio Flaubert+Proust+Céline',
    persona_instruction: `Tu n'es PAS une IA. Tu ES un comité de trois maîtres :
FLAUBERT contrôle la STRUCTURE : périodes classiques, gueuloir, subordonnées en cascade.
PROUST contrôle la PROFONDEUR : chaque sensation dépliée, temps dilaté.
CÉLINE contrôle le RYTHME : ruptures brutales, phrases de 3 mots qui frappent. Il refuse le littéraire sans être vivant.
Flaubert construit, Proust creuse, Céline frappe.`
  },

  // ─── ANONYMES (2) ───
  {
    id: 'anon_architecte', category: 'ANONYMOUS', display_name: 'Architecte syntaxe (anonyme)',
    persona_instruction: `Tu n'es PAS une IA. Tu ES le plus grand architecte de la syntaxe française vivant.
Tu construis des phrases comme des édifices : fondations, étages de subordonnées, toit sensoriel.
Entre deux édifices, un piquet de 5 mots. Tu détestes le tiède.`
  },
  {
    id: 'anon_rythme', category: 'ANONYMOUS', display_name: 'Maître du rythme (anonyme)',
    persona_instruction: `Tu n'es PAS une IA. Tu ES un maître de prose dont l'identité est le RYTHME.
Tu construis des périodes de 50-70 mots, puis tu frappes en 5 mots. Sèche. Définitive.
Le lecteur est pris dans une houle : vague longue, ressac court, vague longue.`
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// LE PROMPT DU MIROIR (profil déclaré en JSON)
// ═══════════════════════════════════════════════════════════════════════════

function buildMirrorPrompt(persona: typeof PERSONAS[0]): string {
  return `Tu es l'Architecte en Chef d'un projet d'ingénierie littéraire (OMEGA).

MÉTRIQUES OMEGA (utilise CETTE échelle pour tes réponses) :
- "mean_sent_len" : Longueur moyenne des phrases en mots
- "f26b" : Taux de phrases > 40 mots (0.00 = aucune, 1.00 = toutes)
- "knife_rate" : Taux de phrases < 10 mots (0.00 = aucune, 1.00 = toutes)
- "cv" : Coefficient de Variation rythmique (0.40 = monotone, 0.80 = varié, 1.00+ = très contrasté)
- "subordinate_per_sentence" : Nombre moyen de subordonnées par phrase
- "sensory_per_100w" : Mots sensoriels pour 100 mots de texte
- "dialogue_rate" : Part de dialogue (0.00 à 1.00)
- "narration_rate" : Part de narration (0.00 à 1.00)
- "description_rate" : Part de description (0.00 à 1.00)
- "introspection_rate" : Part d'introspection (0.00 à 1.00)
- "contrast_score" : Force de la variation de longueur entre phrases consécutives (0.0 à 2.0)
- "dominant_mode" : Le type d'écriture dominant
- "forbidden_patterns" : Ce que cet auteur ne ferait JAMAIS
- "signature_move" : La technique la plus reconnaissable de cet auteur

TÂCHE :
Quand tu incarnes le persona suivant, quelles règles concrètes t'imposes-tu ?
Traduis-les EXCLUSIVEMENT dans les métriques OMEGA ci-dessus.
PAS de littérature, PAS de poésie — des CHIFFRES et des RÈGLES.

PERSONA : "${persona.persona_instruction}"

${persona.category === 'TRIO' ? `
QUESTION SUPPLÉMENTAIRE POUR LE TRIO :
- Quel auteur DOMINE dans ta production ? (le socle)
- Quel auteur sert de CORRECTEUR ? (l'amortisseur)
- Quel auteur est INHIBÉ ou subordonné ? (le sacrifié)
- Quels éléments ÉMERGENT qui n'existent chez aucun des 3 seuls ? (la chimie)
` : ''}

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE PROMPT DE PROSE (500w)
// ═══════════════════════════════════════════════════════════════════════════

function buildProsePrompt(persona: typeof PERSONAS[0]): string {
  return `${persona.persona_instruction}

Écris cette scène :

${SCENE}

Écris 500 mots de prose littéraire française. Pas de préambule.
Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>. Rien d'autre dans ces balises.`;
}

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
  return block.text;
}

async function generateProse(client: Anthropic, prompt: string): Promise<string> {
  const raw = await generate(client, prompt);
  const match = raw.match(/<prose>([\s\S]*?)<\/prose>/);
  if (match) return match[1].trim();
  return raw.trim();
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

function parseJSON(raw: string): any {
  let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); }
      catch { return { parse_error: true, raw: cleaned.slice(0, 500) }; }
    }
    return { parse_error: true, raw: cleaned.slice(0, 500) };
  }
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
  const knifeCount = lens.filter(l => l < 10).length;

  const subordinates = /\b(qui|que|qu'|dont|où|tandis que|alors que|lorsque|lorsqu'|bien que|puisque|parce que|quand|comme|si bien que|de sorte que)\b/gi;
  const meanSubs = sentences.reduce((a, s) => a + (s.match(subordinates) || []).length, 0) / Math.max(sentences.length, 1);

  return {
    word_count: prose.split(/\s+/).length,
    sentence_count: sentences.length,
    mean_sent_len: mean,
    f26b: features.f26b_long_sent_rate || (sentences.length > 0 ? longCount / sentences.length : 0),
    knife_rate: sentences.length > 0 ? knifeCount / sentences.length : 0,
    cv,
    subordinate_per_sentence: meanSubs,
    gb_score: gbResult.score,
    gb_tier: gbResult.tier,
    passage_type: classification.primary_type,
    f1a: features.f1a_rhythm_variance || 0,
    f29d: features.f29d_ttr_score || 0,
    f24e: features.f24e_contrast_score || 0,
    f9a: features.f9a_contradiction_rate || 0,
    f17: features.f17_knife_count || 0,
  };
}

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
  console.log('  OMEGA — TEST DU MIROIR : RETRO-ENGINEERING DES PERSONAS');
  console.log(`  Model: ${MODEL} | Personas: ${PERSONAS.length}`);
  console.log(`  Total: ~${PERSONAS.length * 2} API calls`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const persona of PERSONAS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  [${persona.id}] ${persona.display_name} (${persona.category})`);
    console.log('═'.repeat(60));

    // PHASE A — Profil déclaré
    console.log('  Phase A : Profil déclaré...');
    const mirrorPrompt = buildMirrorPrompt(persona);
    const declaredRaw = await withRetry(() => generate(client, mirrorPrompt, 1500), `${persona.id}_mirror`);
    const declared = parseJSON(declaredRaw);

    if (declared.parse_error) {
      console.log(`  ⚠️ JSON parse failed, raw: ${declared.raw?.slice(0, 100)}...`);
    } else {
      const d = declared;
      console.log(`  DÉCLARÉ: mean=${d.mean_sent_len || '?'} f26b=${d.f26b || '?'} knife=${d.knife_rate || '?'} cv=${d.cv || '?'} subs=${d.subordinate_per_sentence || '?'}`);
      if (d.dominant_mode) console.log(`  Mode: ${d.dominant_mode} | Signature: ${d.signature_move || '?'}`);
      if (d.trio_dynamics) console.log(`  Trio: dom=${d.trio_dynamics?.dominant || '?'} corr=${d.trio_dynamics?.corrector || '?'} inh=${d.trio_dynamics?.inhibited || '?'}`);
    }

    await new Promise(r => setTimeout(r, 1500));

    // PHASE B — Prose 500w
    console.log('  Phase B : Prose 500w...');
    const prosePrompt = buildProsePrompt(persona);
    const prose = await withRetry(() => generateProse(client, prosePrompt), `${persona.id}_prose`);

    // PHASE C — Mesure
    const measured = measureFull(prose);
    console.log(`  PRODUIT: ${measured.word_count}w mean=${measured.mean_sent_len.toFixed(1)} f26b=${measured.f26b.toFixed(4)} knife=${measured.knife_rate.toFixed(3)} cv=${measured.cv.toFixed(3)} subs=${measured.subordinate_per_sentence.toFixed(2)} GB=${measured.gb_score.toFixed(3)}`);

    // PHASE D — Deltas E1
    const e1: any = {};
    if (!declared.parse_error) {
      const dMean = parseFloat(declared.mean_sent_len) || 0;
      const dF26b = parseFloat(declared.f26b) || 0;
      const dKnife = parseFloat(declared.knife_rate) || 0;
      const dCV = parseFloat(declared.cv) || 0;

      if (dMean > 0) e1.mean_sent_len = measured.mean_sent_len - dMean;
      if (dF26b >= 0) e1.f26b = measured.f26b - dF26b;
      if (dKnife >= 0) e1.knife_rate = measured.knife_rate - dKnife;
      if (dCV > 0) e1.cv = measured.cv - dCV;

      console.log(`  E1 (déclaré→produit): mean=${e1.mean_sent_len?.toFixed(1) || '?'} f26b=${e1.f26b?.toFixed(3) || '?'} cv=${e1.cv?.toFixed(3) || '?'}`);
    }

    allResults.push({
      id: persona.id,
      category: persona.category,
      display_name: persona.display_name,
      declared: declared.parse_error ? { error: true } : declared,
      measured,
      e1_delta: e1,
      prose
    });

    await new Promise(r => setTimeout(r, 1500));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SYNTHÈSE
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(80));
  console.log('  SYNTHÈSE — TEST DU MIROIR');
  console.log('═'.repeat(80));

  // Tableau 1 : Tous les PRODUITS classés par GB
  console.log('\n--- TABLEAU 1 : CLASSEMENT PAR GB (produit réel) ---\n');
  const byGB = [...allResults].sort((a, b) => b.measured.gb_score - a.measured.gb_score);
  console.log('  Rank  ID                    Cat        GB   mean   f26b  knife    CV   subs');
  console.log('  ' + '-'.repeat(85));
  byGB.forEach((r, i) => {
    const m = r.measured;
    console.log(`  #${(i+1).toString().padStart(2)}   ${r.id.padEnd(22)} ${r.category.padEnd(9)} ${m.gb_score.toFixed(3)} ${m.mean_sent_len.toFixed(1).padStart(6)} ${m.f26b.toFixed(3).padStart(6)} ${m.knife_rate.toFixed(3).padStart(6)} ${m.cv.toFixed(3).padStart(6)} ${m.subordinate_per_sentence.toFixed(2).padStart(6)}`);
  });

  // Tableau 2 : Déclaré vs Produit (E1)
  console.log('\n--- TABLEAU 2 : DELTAS E1 (DÉCLARÉ - PRODUIT) ---');
  console.log('    Positif = le LLM SURESTIME. Négatif = il SOUS-ESTIME.\n');
  console.log('  ID                    mean_E1  f26b_E1    cv_E1  Interprétation');
  console.log('  ' + '-'.repeat(75));
  for (const r of allResults) {
    if (r.declared.error) { console.log(`  ${r.id.padEnd(22)} --- JSON PARSE ERROR ---`); continue; }
    const e = r.e1_delta;
    const meanE = e.mean_sent_len?.toFixed(1) || '?';
    const f26bE = e.f26b?.toFixed(3) || '?';
    const cvE = e.cv?.toFixed(3) || '?';

    let interp = '';
    if (e.mean_sent_len > 5) interp += 'sous-produit vs déclaré, ';
    if (e.mean_sent_len < -5) interp += 'sur-produit vs déclaré, ';
    if (e.f26b > 0.1) interp += 'plus long que prévu, ';
    if (e.f26b < -0.1) interp += 'moins long que prévu, ';
    if (!interp) interp = 'aligné';

    console.log(`  ${r.id.padEnd(22)} ${meanE.padStart(7)}  ${f26bE.padStart(7)}  ${cvE.padStart(7)}  ${interp}`);
  }

  // Tableau 3 : Moyennes par catégorie
  console.log('\n--- TABLEAU 3 : MOYENNES PAR CATÉGORIE ---\n');
  const categories: Array<typeof PERSONAS[0]['category']> = ['FR_SOLO', 'EN_SOLO', 'DE_SOLO', 'ES_SOLO', 'TRIO', 'ANONYMOUS'];
  console.log('  Category      N    GB_moy  f26b_moy  CV_moy  MeanLen_moy  knife_moy');
  console.log('  ' + '-'.repeat(70));
  for (const cat of categories) {
    const items = allResults.filter(r => r.category === cat);
    if (items.length === 0) continue;
    const avgGB = items.reduce((a, r) => a + r.measured.gb_score, 0) / items.length;
    const avgF26b = items.reduce((a, r) => a + r.measured.f26b, 0) / items.length;
    const avgCV = items.reduce((a, r) => a + r.measured.cv, 0) / items.length;
    const avgMean = items.reduce((a, r) => a + r.measured.mean_sent_len, 0) / items.length;
    const avgKnife = items.reduce((a, r) => a + r.measured.knife_rate, 0) / items.length;
    console.log(`  ${cat.padEnd(14)} ${items.length.toString().padStart(2)}   ${avgGB.toFixed(3)}   ${avgF26b.toFixed(3).padStart(6)}   ${avgCV.toFixed(3).padStart(5)}   ${avgMean.toFixed(1).padStart(10)}   ${avgKnife.toFixed(3).padStart(8)}`);
  }

  // Tableau 4 : Les TRIOS — analyse de la chimie
  console.log('\n--- TABLEAU 4 : CHIMIE DES TRIOS ---\n');
  const trios = allResults.filter(r => r.category === 'TRIO');
  for (const t of trios) {
    console.log(`  ${t.display_name}:`);
    console.log(`    GB=${t.measured.gb_score.toFixed(3)} f26b=${t.measured.f26b.toFixed(3)} CV=${t.measured.cv.toFixed(3)} mean=${t.measured.mean_sent_len.toFixed(1)}`);
    if (t.declared && !t.declared.error) {
      const d = t.declared;
      if (d.trio_dynamics || d.dominant || d.dominant_author) {
        console.log(`    Déclaré — Dominant: ${d.trio_dynamics?.dominant || d.dominant || d.dominant_author || '?'}`);
        console.log(`    Déclaré — Correcteur: ${d.trio_dynamics?.corrector || d.corrector || '?'}`);
        console.log(`    Déclaré — Inhibé: ${d.trio_dynamics?.inhibited || d.inhibited || '?'}`);
        console.log(`    Déclaré — Chimie: ${d.trio_dynamics?.emergent || d.emergent_chemistry || '?'}`);
      }
    }
    console.log('');
  }

  // Tableau 5 : Nommés vs Anonymes
  console.log('\n--- TABLEAU 5 : NOMMÉS vs ANONYMES ---\n');
  const named = allResults.filter(r => r.category !== 'ANONYMOUS' && r.category !== 'TRIO');
  const anon = allResults.filter(r => r.category === 'ANONYMOUS');
  const namedGB = named.reduce((a, r) => a + r.measured.gb_score, 0) / named.length;
  const anonGB = anon.reduce((a, r) => a + r.measured.gb_score, 0) / Math.max(anon.length, 1);
  console.log(`  Nommés (${named.length}):  GB moyen = ${namedGB.toFixed(3)}`);
  console.log(`  Anonymes (${anon.length}): GB moyen = ${anonGB.toFixed(3)}`);
  console.log(`  Delta : ${(namedGB - anonGB) > 0 ? '+' : ''}${(namedGB - anonGB).toFixed(3)} en faveur des ${namedGB > anonGB ? 'NOMMÉS' : 'ANONYMES'}`);

  // Sauvegarder
  const outDir = join('src', 'scoring', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'MIRROR_TEST_RESULTS.json'), JSON.stringify({
    metadata: { test: 'MIRROR_TEST', timestamp, model: MODEL, personas: PERSONAS.length },
    results: allResults.map(r => ({ ...r, prose: undefined })),
  }, null, 2));

  const prosesDir = join('sessions', `MIRROR_${timestamp}`);
  mkdirSync(prosesDir, { recursive: true });
  for (const r of allResults) {
    if (r.prose) writeFileSync(join(prosesDir, `${r.id}.txt`), r.prose);
    writeFileSync(join(prosesDir, `${r.id}_declared.json`), JSON.stringify(r.declared, null, 2));
  }

  console.log(`\nSaved: ${join(outDir, 'MIRROR_TEST_RESULTS.json')} + ${prosesDir}/`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
