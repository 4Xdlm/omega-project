/**
 * OMEGA Text Features — F24-F38 ported from Python (v5_features.py)
 * Phase R5 — Pure TypeScript, no spaCy dependency.
 *
 * These features are text-based (regex, counts, ratios).
 * They produce the SAME values as the Python implementation (±5% tolerance).
 */

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[.!?…»])\s+/);
  return raw.map(s => s.trim()).filter(s => s.length > 5);
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function stdev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  const variance = vals.reduce((sum, v) => sum + (v - m) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function countOccurrences(text: string, marker: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(marker, pos)) !== -1) {
    count++;
    pos += marker.length;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════════════
// F24 — CONTRAST BUDGET
// ═══════════════════════════════════════════════════════════════════════

function computeF24(sents: string[]): Record<string, number> {
  if (sents.length < 10) {
    return {
      f24a_banal_rate: 0, f24b_apex_rate: 0,
      f24c_contrast_delta: 0, f24d_apex_isolation: 0,
      f24e_contrast_score: 0,
    };
  }

  const lens = sents.map(s => s.split(/\s+/).length);
  const sorted = [...lens].sort((a, b) => a - b);
  const n = sorted.length;
  const p25 = sorted[Math.floor(n / 4)];
  const p75 = sorted[Math.floor(3 * n / 4)];

  const banalLens = lens.filter(l => l <= p25);
  const apexLens = lens.filter(l => l >= p75);
  const banalRate = banalLens.length / n;
  const apexRate = apexLens.length / n;
  const meanBanal = banalLens.length > 0 ? mean(banalLens) : 0;
  const meanApex = apexLens.length > 0 ? mean(apexLens) : 0;
  const contrast = meanApex - meanBanal;

  const apexPositions = lens.map((l, i) => l >= p75 ? i : -1).filter(i => i >= 0);
  let apexIsolation: number;
  if (apexPositions.length >= 2) {
    const gaps = [];
    for (let i = 0; i < apexPositions.length - 1; i++) {
      gaps.push(apexPositions[i + 1] - apexPositions[i]);
    }
    apexIsolation = mean(gaps);
  } else {
    apexIsolation = n;
  }

  const balanceScore = Math.max(0, 1.0 - Math.abs(banalRate - 0.25) * 2);
  const contrastScore = Math.min(1.0, contrast / 15.0);
  const isolationScore = Math.max(0, 1.0 - Math.abs(apexIsolation - 6.0) / 10.0);
  let score = round(balanceScore * 0.3 + contrastScore * 0.5 + isolationScore * 0.2, 5);
  score = Math.max(0, Math.min(1, score));

  return {
    f24a_banal_rate: round(banalRate, 5),
    f24b_apex_rate: round(apexRate, 5),
    f24c_contrast_delta: round(contrast, 3),
    f24d_apex_isolation: round(apexIsolation, 2),
    f24e_contrast_score: score,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F25 — DESCRIPTION SCENE INDEX
// ═══════════════════════════════════════════════════════════════════════

const SENSORY: Record<string, string[]> = {
  visuel: ['lumiere', 'ombre', 'couleur', 'brillant', 'sombre', 'clair', 'lueur', 'reflet',
           'light', 'shadow', 'gleam', 'glow', 'dark', 'bright', 'shimmer',
           'luz', 'sombra', 'color', 'brillante', 'oscuro', 'claro', 'resplandor'],
  auditif: ['bruit', 'son', 'silence', 'murmure', 'voix', 'echo', 'craquement', 'souffle',
            'noise', 'sound', 'whisper', 'creak', 'rumble', 'hum',
            'ruido', 'sonido', 'silencio', 'murmullo', 'voz', 'eco'],
  tactile: ['froid', 'chaud', 'doux', 'rugeux', 'humide', 'sec', 'peau', 'cold', 'warm',
            'smooth', 'rough', 'damp', 'dry', 'skin',
            'frio', 'caliente', 'suave', 'aspero', 'humedo', 'seco', 'piel'],
  olfactif: ['odeur', 'parfum', 'senteur', 'fumee', 'smell', 'scent', 'fragrance', 'smoke', 'stench',
             'olor', 'perfume', 'aroma', 'humo'],
  gustatif: ['gout', 'amer', 'sucre', 'sale', 'taste', 'bitter', 'sweet', 'salty', 'sour',
             'sabor', 'amargo', 'dulce', 'salado'],
};

const ADJ_MARKERS = ['eux', 'euse', 'ique', 'able', 'ible', 'ant', 'ent', 'al', 'el', 'ous', 'ful', 'less', 'ive',
                     'oso', 'osa', 'ado', 'ada', 'ido', 'ida'];
const ADV_MARKERS = ['ment', 'ement', 'amment', 'ly', 'ally', 'mente'];
const ACTION_VERBS = ['marcha', 'couri', 'dit', 'repondi', 'prit', 'saisi', 'ouvri', 'ferma',
                      'walked', 'ran', 'said', 'took', 'opened', 'closed', 'grabbed', 'threw',
                      'camino', 'corrio', 'dijo', 'tomo', 'abrio', 'cerro'];
const SUSPENSION = ['etait', 'semblait', 'paraissait', 'demeurait', 'restait', 'planait', 'flottait',
                    'regnait', 'was', 'seemed', 'appeared', 'remained', 'hovered', 'lay',
                    'era', 'parecia', 'permanecia', 'quedaba', 'flotaba'];
const SPATIAL = ['loin', 'pres', 'derriere', 'devant', 'sous', 'au-dessus', 'au-dela', 'au fond',
                 'en bas', 'en haut', 'far', 'near', 'behind', 'beneath', 'above', 'beyond', 'horizon',
                 'lejos', 'cerca', 'detras', 'delante', 'debajo', 'encima'];
const ABSTRACT_NOUNS = ['silence', 'lumiere', 'obscurite', 'douleur', 'joie', 'tristesse', 'solitude',
                        'memoire', 'temps', 'espace', 'light', 'darkness', 'pain', 'joy', 'sadness',
                        'memory', 'time', 'space', 'death', 'life', 'soul', 'fear', 'hope',
                        'silencio', 'luz', 'oscuridad', 'dolor', 'alegria', 'tristeza', 'soledad',
                        'memoria', 'tiempo', 'espacio', 'muerte', 'vida', 'alma', 'miedo'];
const CONCRETE = ['pierre', 'bois', 'metal', 'fer', 'verre', 'tissu', 'cuir', 'terre', 'eau', 'feu', 'cendre',
                  'os', 'stone', 'wood', 'metal', 'glass', 'leather', 'earth', 'water', 'fire', 'ash', 'bone',
                  'piedra', 'madera', 'hierro', 'vidrio', 'cuero', 'tierra', 'agua', 'fuego', 'ceniza', 'hueso'];

function computeF25(text: string, sents: string[]): Record<string, number> {
  const txtLower = text.toLowerCase();
  const words = text.split(/\s+/);
  const nWords = Math.max(words.length, 1);
  const nSents = Math.max(sents.length, 1);

  let sensoryScore = 0;
  for (const markers of Object.values(SENSORY)) {
    if (markers.some(m => txtLower.includes(m))) sensoryScore++;
  }

  const adjCount = words.filter(w => ADJ_MARKERS.some(m => w.toLowerCase().endsWith(m))).length;
  const advCount = words.filter(w => ADV_MARKERS.some(m => w.toLowerCase().endsWith(m))).length;
  const actionCount = Math.max(words.filter(w => ACTION_VERBS.some(v => w.toLowerCase().includes(v))).length, 1);
  const descDensity = Math.min(round((adjCount + advCount) / actionCount, 4), 10.0);

  const suspCount = words.filter(w => SUSPENSION.includes(w.toLowerCase())).length;
  const timeSuspension = round(suspCount / nSents, 5);

  const spatialDepth = round(Math.min(SPATIAL.filter(m => txtLower.includes(m)).length / 10.0, 1.0), 4);

  const abstractCount = words.filter(w => ABSTRACT_NOUNS.includes(w.toLowerCase())).length;
  const nominalization = round(abstractCount / nWords, 5);

  const objectDensity = round(words.filter(w => CONCRETE.includes(w.toLowerCase())).length / nWords, 5);

  const descScore = round(
    Math.min(descDensity / 5.0, 1.0) * 0.25 +
    sensoryScore / 5.0 * 0.30 +
    Math.min(timeSuspension * 5, 1.0) * 0.15 +
    spatialDepth * 0.15 +
    Math.min(nominalization * 100, 1.0) * 0.10 +
    Math.min(objectDensity * 100, 1.0) * 0.05, 5);

  return {
    f25a_description_density: descDensity,
    f25b_sensory_coverage: sensoryScore,
    f25c_time_suspension: timeSuspension,
    f25d_spatial_depth: spatialDepth,
    f25e_nominalization: nominalization,
    f25f_object_density: objectDensity,
    f25g_description_score: descScore,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F26 — PERIODE SYNTAXIQUE
// ═══════════════════════════════════════════════════════════════════════

const ALL_SUB = new Set([
  'que', 'qui', 'dont', 'ou', 'lequel', 'laquelle', 'lesquels', 'lesquelles',
  'quand', 'comme', 'si', 'puisque', 'parce', 'bien', 'quoique', 'malgre',
  'tandis', 'alors', 'lorsque', 'des', 'avant', 'apres', 'pendant', 'jusqu',
  'that', 'which', 'who', 'whom', 'whose', 'where', 'when', 'although',
  'because', 'since', 'while', 'until', 'unless', 'whether', 'after',
  'before', 'though', 'even', 'whereas', 'provided',
  'quien', 'cual', 'donde', 'cuando', 'aunque', 'porque', 'mientras',
  'hasta', 'sino', 'puesto', 'como', 'pues', 'ya',
]);

function computeF26(sents: string[]): Record<string, number> {
  if (sents.length === 0) {
    return { f26a_mean_sub_markers: 0, f26b_long_sent_rate: 0, f26c_period_score: 0 };
  }

  const subCounts: number[] = [];
  const sentLens: number[] = [];
  for (const s of sents) {
    const words = s.toLowerCase().split(/\s+/);
    const subN = words.filter(w => ALL_SUB.has(w.replace(/[.,;:!?]/g, ''))).length;
    subCounts.push(subN);
    sentLens.push(words.length);
  }

  const meanSub = round(mean(subCounts), 4);
  const longRate = round(sentLens.filter(l => l > 40).length / sentLens.length, 4);
  const subScore = Math.min(meanSub / 6.0, 1.0);
  const periodScore = round(subScore * 0.6 + longRate * 0.4, 5);

  return {
    f26a_mean_sub_markers: meanSub,
    f26b_long_sent_rate: longRate,
    f26c_period_score: periodScore,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F27 — MODALITE EPISTEMIQUE
// ═══════════════════════════════════════════════════════════════════════

const EPISTEMIC_ALL = [
  'semblait', 'paraissait', 'apparemment', 'peut-etre', 'probablement',
  'sans doute', 'il me semblait', 'comme si', 'on eut dit', 'dirait-on',
  'quelque chose', 'une sorte', 'une espece', 'je croyais', 'il croyait',
  'il lui semblait', "avait l'air", "avait l'impression",
  'seemed', 'appeared', 'apparently', 'perhaps', 'probably', 'possibly',
  'as if', 'as though', 'something like', 'a kind of', 'sort of', 'might',
  'could', 'would have', 'had seemed', 'it seemed',
  'parecia', 'aparentemente', 'quizas', 'tal vez', 'probablemente',
  'como si', 'una especie de', 'algo asi', 'acaso', 'sin duda',
];

const CONDITIONAL_FR = ['aurait', 'aurait ete', 'eut', 'eut ete', 'serait', 'fut', 'voudrait'];
const PASSE_SIMPLE = ['fut', 'eut', 'dit', 'prit', 'vit', 'alla', 'revint', 'sembla', 'parut'];
const NEG_COMPLEX = ['ne...que', 'nul', 'aucun', 'jamais', 'guere', 'ni...ni', 'point',
                     'nullement', 'en aucune facon', 'rien de', 'pas un seul'];

function computeF27(text: string, sents: string[]): Record<string, number> {
  const txtLower = text.toLowerCase();
  const nSents = Math.max(sents.length, 1);

  const epCount = EPISTEMIC_ALL.reduce((sum, m) => sum + countOccurrences(txtLower, m), 0);
  const epistemicRate = round(epCount / nSents * 100, 4);

  const condCount = CONDITIONAL_FR.reduce((sum, m) => sum + countOccurrences(txtLower, m), 0);
  const psCount = Math.max(PASSE_SIMPLE.reduce((sum, m) => sum + countOccurrences(txtLower, m), 0), 1);
  const conditionalRate = round(condCount / psCount, 4);

  const negCount = NEG_COMPLEX.reduce((sum, m) => sum + countOccurrences(txtLower, m), 0);
  const negationRate = round(negCount / nSents * 100, 4);

  const epScore = Math.min(epistemicRate / 20.0, 1.0);
  const condScore = Math.min(conditionalRate / 2.0, 1.0);
  const negScore = Math.min(negationRate / 10.0, 1.0);
  const modalScore = round(epScore * 0.5 + condScore * 0.3 + negScore * 0.2, 5);

  return {
    f27a_epistemic_rate: epistemicRate,
    f27b_conditional_rate: conditionalRate,
    f27c_negation_rate: negationRate,
    f27d_modal_score: modalScore,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F28 — STYLE INDIRECT LIBRE
// ═══════════════════════════════════════════════════════════════════════

const SIL_MARKERS = [
  'apres tout', 'bien sur', 'evidemment', 'comment donc', "n'etait-ce pas",
  'car enfin', 'mais non', 'mais si', 'que diable', 'sapre',
  'certainement', 'decidement', 'vraiment', 'quelle idee', 'quel imbecile',
  'after all', 'of course', 'certainly', 'how odd', 'no doubt',
  'why not', 'what a', 'surely', 'indeed', 'obviously', 'well then',
  'despues de todo', 'por supuesto', 'ciertamente', 'sin duda',
  'como no', 'claro', 'desde luego', 'evidentemente',
];

const IRONY_MARKERS = ['on eut dit', "c'etait bien la", 'voila qui', "comme c'est", 'comme il convient',
                       'naturellement', 'il va sans dire', "cela s'entend", 'bien entendu'];

function computeF28(text: string, sents: string[]): Record<string, number> {
  const txtLower = text.toLowerCase();
  const nSents = Math.max(sents.length, 1);

  const silCount = SIL_MARKERS.filter(m => txtLower.includes(m)).length;
  const silRate = round(silCount / nSents * 100, 4);

  const ironyDensity = round(
    IRONY_MARKERS.reduce((sum, m) => sum + countOccurrences(txtLower, m), 0) / nSents * 100, 4);

  const sentsLower = sents.map(s => s.toLowerCase());
  const interiorCount = sentsLower.filter(
    s => s.endsWith('?') && ['ait', 'ait-il', 'ait-elle', 'etait'].some(m => s.includes(m))
  ).length;
  const interiorRate = round(interiorCount / nSents, 4);

  const silScore = round(
    Math.min(silRate / 20.0, 1.0) * 0.4 +
    Math.min(ironyDensity / 5.0, 1.0) * 0.35 +
    Math.min(interiorRate * 5, 1.0) * 0.25, 5);

  return {
    f28a_sil_rate: silRate,
    f28b_irony_density: ironyDensity,
    f28c_interior_rate: interiorRate,
    f28d_sil_score: silScore,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F29 — TTR LEXICAL RICHNESS
// ═══════════════════════════════════════════════════════════════════════

function computeF29(text: string): Record<string, number> {
  const WINDOW = 100;
  const words = text.split(/\s+/)
    .map(w => w.toLowerCase().replace(/[.,;:!?"'()\[\]]/g, ''))
    .filter(w => w.length > 1);
  const n = words.length;

  if (n < WINDOW) {
    return { f29a_ttr_global: 0, f29b_ttr_window: 0, f29c_ttr_stdev: 0, f29d_ttr_score: 0 };
  }

  const ttrGlobal = round(new Set(words).size / n, 4);

  const windowTtrs: number[] = [];
  for (let i = 0; i <= n - WINDOW; i += 50) {
    const w = words.slice(i, i + WINDOW);
    windowTtrs.push(new Set(w).size / WINDOW);
  }

  const ttrWindow = round(mean(windowTtrs), 4);
  const ttrStdev = round(stdev(windowTtrs), 4);
  const ttrScore = round(Math.min(ttrWindow / 0.80, 1.0) * 0.7 + Math.min(ttrStdev * 5, 1.0) * 0.3, 5);

  return {
    f29a_ttr_global: ttrGlobal,
    f29b_ttr_window: ttrWindow,
    f29c_ttr_stdev: ttrStdev,
    f29d_ttr_score: ttrScore,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F30 — TENSE SIGNATURE
// ═══════════════════════════════════════════════════════════════════════

const PS_ENDS = ['a', 'it', 'ut', 'int', 'urent', 'irent', 'erent', 'nt'];
const IMP_ENDS = ['ait', 'aient', 'ais'];
const PR_ENDS = ['e', 'es', 'ent', 'er'];

function computeF30(text: string): Record<string, number> {
  const words = text.split(/\s+/);
  const longWords = words
    .filter(w => w.length > 3)
    .map(w => w.toLowerCase().replace(/[.,;:!?"']/g, ''));

  const psCount = longWords.filter(w => PS_ENDS.some(e => w.endsWith(e))).length;
  const impCount = longWords.filter(w => IMP_ENDS.some(e => w.endsWith(e))).length;
  const prCount = longWords.filter(w => PR_ENDS.some(e => w.endsWith(e))).length;
  const total = Math.max(psCount + impCount + prCount, 1);

  const psRate = round(psCount / total, 4);
  const impRate = round(impCount / total, 4);
  const prRate = round(prCount / total, 4);
  const psImpRatio = round(Math.log1p(psCount / Math.max(impCount, 1)), 4);

  return {
    f30a_passe_simple_rate: psRate,
    f30b_imparfait_rate: impRate,
    f30c_present_rate: prRate,
    f30d_ps_imp_ratio: psImpRatio,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F33 — PUNCTUATION RATIO
// ═══════════════════════════════════════════════════════════════════════

function computeF33(text: string): Record<string, number> {
  const dots = (text.match(/[.!?]/g) || []).length;
  const commas = (text.match(/[,;]/g) || []).length;
  const ratio = round(dots / Math.max(commas, 1), 4);

  return {
    f33a_dots_count: dots,
    f33b_commas_count: commas,
    f33c_dot_comma_ratio: ratio,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F34 — PARAGRAPH DENSITY
// ═══════════════════════════════════════════════════════════════════════

function computeF34(text: string): Record<string, number> {
  const paras = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  const nWords = Math.max(text.split(/\s+/).length, 1);
  const density = round(paras.length / nWords * 1000, 2);

  return {
    f34a_paragraph_count: paras.length,
    f34b_para_per_1000w: density,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F35 — HOOK STRENGTH
// ═══════════════════════════════════════════════════════════════════════

function computeF35(text: string): Record<string, number> {
  const words = text.split(/\s+/);
  const hookText = words.slice(0, 100).join(' ');
  const sents = splitSentences(hookText);
  if (sents.length === 0) {
    return { f35a_hook_tension: 0, f35c_hook_score: 0 };
  }

  const hasQuestion = sents.some(s => s.trim().endsWith('?'));
  const hasExcl = sents.some(s => s.trim().endsWith('!'));
  const meanLen = mean(sents.map(s => s.split(/\s+/).length));
  const tension = Math.min(1.0, 20.0 / Math.max(meanLen, 1));
  const score = round(tension * 0.5 + (hasQuestion ? 0.3 : 0) + (hasExcl ? 0.2 : 0), 4);

  return {
    f35a_hook_tension: round(tension, 4),
    f35c_hook_score: score,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F36 — CLIFFHANGER STRENGTH
// ═══════════════════════════════════════════════════════════════════════

function computeF36(text: string): Record<string, number> {
  const words = text.split(/\s+/);
  const cliffText = words.slice(-100).join(' ');
  const sents = splitSentences(cliffText);
  if (sents.length === 0) {
    return { f36a_cliff_tension: 0, f36c_cliff_score: 0 };
  }

  const lastSent = sents[sents.length - 1].trim();
  const endsEllipsis = lastSent.endsWith('...') || lastSent.endsWith('…');
  const lastChar = lastSent[lastSent.length - 1] || '';
  const endsIncomplete = !['.', '!', '?', '…'].includes(lastChar);
  const meanLen = mean(sents.map(s => s.split(/\s+/).length));
  const tension = Math.min(1.0, 20.0 / Math.max(meanLen, 1));
  const score = round(tension * 0.5 + (endsEllipsis ? 0.3 : 0) + (endsIncomplete ? 0.2 : 0), 4);

  return {
    f36a_cliff_tension: round(tension, 4),
    f36c_cliff_score: score,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F38 — TYPOGRAPHIC SPEED
// ═══════════════════════════════════════════════════════════════════════

function computeF38(text: string): Record<string, number> {
  const paras = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  if (paras.length === 0) {
    return { f38a_short_para_rate: 0, f38b_punct_density: 0, f38c_speed_score: 0 };
  }

  const paraLens = paras.map(p => p.split(/\s+/).length);
  const shortRate = round(paraLens.filter(l => l < 30).length / paras.length, 4);
  const nWords = Math.max(text.split(/\s+/).length, 1);
  const punctDensity = round(
    ((text.match(/[.!?,;]/g) || []).length) / nWords, 4);
  const speed = round(shortRate * 0.6 + Math.min(punctDensity * 5, 1.0) * 0.4, 4);

  return {
    f38a_short_para_rate: shortRate,
    f38b_punct_density: punctDensity,
    f38c_speed_score: speed,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F5 — VERB DENSITY (heuristic, no spaCy)
// ═══════════════════════════════════════════════════════════════════════

const VERB_ENDINGS_FR = ['ait', 'aient', 'ais', 'ons', 'ez', 'ant', 'era', 'ira',
                         'rait', 'raient', 'erait', 'irait'];
const VERB_ENDINGS_EN = ['ed', 'ing'];
const VERB_ENDINGS_ES = ['aba', 'aban', 'ando', 'endo', 'aron', 'ieron'];
const COMMON_VERBS = new Set([
  'est', 'etait', 'avait', 'fut', 'dit', 'fit', 'prit', 'alla', 'vint', 'resta',
  'semblait', 'paraissait', 'pouvait', 'devait', 'fallait', 'savait', 'voyait',
  'is', 'was', 'were', 'had', 'did', 'said', 'took', 'came', 'went', 'saw',
  'made', 'got', 'knew', 'thought', 'found', 'told', 'asked', 'seemed',
  'es', 'era', 'fue', 'dijo', 'hizo', 'tomo', 'vio', 'sabia', 'podia',
]);

function computeF5(text: string): Record<string, number> {
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const nWords = Math.max(words.length, 1);
  const allEndings = [...VERB_ENDINGS_FR, ...VERB_ENDINGS_EN, ...VERB_ENDINGS_ES];

  let verbCount = 0;
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[.,;:!?"'()]/g, '');
    if (COMMON_VERBS.has(lower)) {
      verbCount++;
    } else if (lower.length > 4 && allEndings.some(e => lower.endsWith(e))) {
      verbCount++;
    }
  }

  const verbDensity = round(verbCount / nWords, 4);
  const adjCount = words.filter(w => ADJ_MARKERS.some(m => w.toLowerCase().endsWith(m))).length;
  const verbAdjRatio = round(verbCount / Math.max(adjCount, 1), 4);

  return {
    f5a_verb_density: verbDensity,
    f5b_verb_adj_ratio: verbAdjRatio,
    f5_verb_count: verbCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// F1 — BASIC RHYTHM (no spaCy needed)
// ═══════════════════════════════════════════════════════════════════════

function computeF1Basic(sents: string[]): Record<string, number> {
  if (sents.length === 0) {
    return { f1_mean: 0, f1a_rhythm_variance: 0, f1_sentence_count: 0 };
  }
  const lens = sents.map(s => s.split(/\s+/).length);
  return {
    f1_mean: round(mean(lens), 4),
    f1a_rhythm_variance: round(stdev(lens), 4),
    f1_sentence_count: sents.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Computes all text-based features (F24-F38 + basic F1) from raw text.
 * No spaCy dependency. Pure TypeScript.
 *
 * @param text - The raw text to analyze
 * @returns Record of feature name to numeric value
 */
export function computeTextFeatures(text: string): Record<string, number> {
  const sents = splitSentences(text);
  const features: Record<string, number> = {};

  Object.assign(features, computeF1Basic(sents));
  Object.assign(features, computeF5(text));
  Object.assign(features, computeF24(sents));
  Object.assign(features, computeF25(text, sents));
  Object.assign(features, computeF26(sents));
  Object.assign(features, computeF27(text, sents));
  Object.assign(features, computeF28(text, sents));
  Object.assign(features, computeF29(text));
  Object.assign(features, computeF30(text));
  Object.assign(features, computeF33(text));
  Object.assign(features, computeF34(text));
  Object.assign(features, computeF35(text));
  Object.assign(features, computeF36(text));
  Object.assign(features, computeF38(text));

  return features;
}

export { splitSentences };
