/**
 * CALIBRATION — Dump RAW values before normalize
 * Purpose: Source V2 ranges from empirical data, not magic constants
 * Cost: 0 API credits
 */
import { describe, it } from 'vitest';

// ─── Inline helpers (same as voice-genome.ts) ───
function splitSentences(prose: string): string[] {
  return prose.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
}
function estimateSyllables(word: string): number {
  const vowelGroups = word.toLowerCase().match(/[aeiouyàâäéèêëïîôùûü]+/g);
  return vowelGroups ? vowelGroups.length : 1;
}

// ─── CORPUS: 10 FR narrative + 3 dry/technical + 3 low-register ───
const CORPUS = {
  narrative: [
    `La porte claqua. Silence. Puis le bruit de ses pas sur le parquet, lent, régulier, comme une horloge détraquée. Il ne se retourna pas.\n\nL'obscurité envahissait la pièce par degrés imperceptibles. Les ombres rampaient le long des murs, dévorant les dernières traces de lumière.\n\nElle attendait. Depuis combien de temps exactement, elle ne savait plus. Les minutes s'étiraient, poisseuses, interminables.`,
    `Les pensées tourbillonnaient dans son esprit fatigué. Chaque tentative de concentration s'effondrait aussitôt, emportée par le courant incessant des souvenirs.\n\nIl contemplait le plafond fissuré avec une attention morbide. Les craquelures formaient une carte indéchiffrable, un réseau de chemins impossibles.\n\nLe silence de la chambre pesait sur ses épaules. Dehors, la ville bruissait de mille activités indifférentes à sa détresse.`,
    `Il courut. Le souffle court. Les jambes brûlantes. Derrière lui, le bruit se rapprochait.\n\nLe mur surgit devant ses yeux. Trop tard pour freiner. Il sauta, agrippa le rebord, se hissa d'un mouvement désespéré.\n\nEn bas, les chiens aboyaient avec rage. Leurs crocs luisaient sous la lune.\n\nLe toit s'étendait devant lui, plat et désert. Il reprit sa course.`,
    `Le jardin s'éveillait dans la brume matinale. Les roses portaient encore leurs perles de rosée, fragiles et translucides. Un merle chantait quelque part dans les branches du tilleul centenaire.\n\nLa lumière filtrait à travers les feuilles en motifs changeants. Le sol humide exhalait cette odeur particulière de terre mouillée qui annonçait le printemps.\n\nMarguerite traversa la pelouse pieds nus. L'herbe froide la fit frissonner. Elle s'assit sur le banc de pierre et ferma les yeux.`,
    `Le train s'éloignait. Sur le quai désert, elle restait immobile. Sa valise gisait à ses pieds comme un animal abandonné.\n\nQuelque chose venait de se briser en elle. Pas avec fracas, non. Avec la discrétion terrible des catastrophes intérieures.\n\nElle finit par bouger. Un pas. Puis un autre. Le monde reprenait forme autour d'elle, flou d'abord, puis progressivement net.\n\nIl faudrait rentrer. Défaire cette valise. Réapprendre à respirer dans un espace vidé de sa présence.`,
    `La cathédrale dominait la ville de toute sa masse sombre. Ses gargouilles grimaçaient dans la pénombre du crépuscule, sentinelles de pierre figées depuis des siècles.\n\nLe père Augustin traversa la nef d'un pas mesuré. L'écho de ses semelles résonnait entre les colonnes massives. La lumière des vitraux projetait des fragments colorés sur le dallage usé.\n\nIl s'arrêta devant l'autel. Quelque chose avait changé. Une imperceptible altération de l'air, peut-être. Ou cette odeur de cire fraîche qui ne devrait pas être là.`,
    `La mer démontée battait les falaises avec une fureur aveugle. Les vagues se fracassaient contre la roche dans un grondement sourd et continu. L'écume jaillissait à des hauteurs vertigineuses.\n\nDebout sur le promontoire, Hélène serrait son manteau contre elle. Le vent arrachait des mèches de ses cheveux, les fouettait contre son visage. Elle ne bronchait pas.\n\nQuelque part en contrebas, le phare clignotait avec une régularité mécanique. Son faisceau balayait les ténèbres, indifférent à la tempête.`,
  ],
  expressive: [
    `Non ! C'était impossible — totalement impossible ! Comment avaient-ils pu… ? Elle recula d'un pas, les yeux écarquillés. "Vous mentez !" cria-t-elle. Mais personne ne répondit.\n\nLe silence… ce silence atroce ! Il pesait sur elle comme une chape de plomb. Que faire ? Fuir ? Se battre ? Rien — il n'y avait plus rien à faire.\n\n"Écoutez-moi", murmura-t-elle enfin. Mais sa voix tremblait ; ses mains aussi.`,
    `Incroyable ! Le stade entier se leva d'un bond. Quarante mille voix hurlèrent à l'unisson — un rugissement primitif, viscéral. Le ballon avait franchi la ligne !\n\n"C'est pas possible…" souffla Marc, les larmes aux yeux. Autour de lui, des inconnus s'étreignaient ; des bières volaient ; quelqu'un pleurait de joie.\n\nEt ce bruit ! Ce vacarme assourdissant qui refusait de mourir…`,
  ],
  dry: [
    `Le rapport trimestriel indique une progression de douze pour cent du chiffre d'affaires consolidé. Les marges opérationnelles se maintiennent à un niveau satisfaisant. La direction propose une augmentation du dividende.`,
    `Le protocole prévoit une phase de préparation suivie de trois étapes de validation. Chaque étape fait intervenir un comité indépendant. Les résultats sont consignés dans un registre horodaté.`,
  ],
};

describe('CALIBRATION: RAW values before normalize — V2 range sourcing', () => {
  it('dump raw measurements per param per corpus category', () => {
    const categories = Object.entries(CORPUS);

    const allRaw: Record<string, number[]> = {
      syllableRatio: [],
      abstractRatio: [],
      expressivePunctRatio: [],
      paragraphCV: [],
      avgWordsPerSentence: [],
      avgWordsFiltered: [],
    };

    for (const [category, texts] of categories) {
      console.log(`\n══════ ${category.toUpperCase()} ══════`);

      for (let i = 0; i < texts.length; i++) {
        const prose = texts[i];
        const sentences = splitSentences(prose);
        const words = prose.split(/\s+/).filter(w => w.length > 0);
        const paragraphs = prose.split(/\n\n+/).filter(p => p.trim().length > 0);

        // RAW language_register
        const longWords = words.filter(w => estimateSyllables(w) > 3).length;
        const syllableRatio = longWords / words.length;

        // RAW abstraction_ratio
        const abstractPattern = /(tion|ment|ité|ence|ance|esse|eur|age)\b/gi;
        const abstractWords = (prose.match(abstractPattern) || []).length;
        const abstractRatio = abstractWords / words.length;

        // RAW punctuation_style
        const expressivePunct = (prose.match(/[!?;—…]/g) || []).length;
        const totalPunct = (prose.match(/[.!?,;:—…]/g) || []).length;
        const expressivePunctRatio = totalPunct > 0 ? expressivePunct / totalPunct : 0;

        // RAW paragraph_rhythm (CV)
        const paraLengths = paragraphs.map(p => p.split(/\s+/).length);
        const meanPara = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
        const variance = paraLengths.reduce((s, l) => s + (l - meanPara) ** 2, 0) / paraLengths.length;
        const cv = meanPara > 0 ? Math.sqrt(variance) / meanPara : 0;

        // RAW phrase_length_mean (all sentences)
        const avgAll = words.length / sentences.length;
        // RAW phrase_length_mean (filtered: sentences >= 3 words)
        const longSentences = sentences.filter(s => s.split(/\s+/).length >= 3);
        const avgFiltered = longSentences.length > 0
          ? longSentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / longSentences.length
          : avgAll;

        console.log(`  [${i+1}] words=${words.length}, sentences=${sentences.length}, paragraphs=${paragraphs.length}`);
        console.log(`      syllableRatio=${syllableRatio.toFixed(4)} abstractRatio=${abstractRatio.toFixed(4)} punctRatio=${expressivePunctRatio.toFixed(4)}`);
        console.log(`      paraCV=${cv.toFixed(4)} avgWords=${avgAll.toFixed(2)} avgWordsFiltered=${avgFiltered.toFixed(2)}`);

        if (category === 'narrative' || category === 'expressive') {
          allRaw.syllableRatio.push(syllableRatio);
          allRaw.abstractRatio.push(abstractRatio);
          allRaw.expressivePunctRatio.push(expressivePunctRatio);
          allRaw.paragraphCV.push(cv);
          allRaw.avgWordsPerSentence.push(avgAll);
          allRaw.avgWordsFiltered.push(avgFiltered);
        }
      }
    }

    // ─── PERCENTILE SUMMARY ───
    console.log('\n══════ PERCENTILE SUMMARY (narrative+expressive corpus) ══════');
    for (const [key, values] of Object.entries(allRaw)) {
      values.sort((a, b) => a - b);
      const n = values.length;
      const p5 = values[Math.floor(n * 0.05)] ?? values[0];
      const p25 = values[Math.floor(n * 0.25)];
      const p50 = values[Math.floor(n * 0.50)];
      const p75 = values[Math.floor(n * 0.75)];
      const p95 = values[Math.min(n - 1, Math.floor(n * 0.95))];
      const min = values[0];
      const max = values[n - 1];
      console.log(`  ${key.padEnd(25)} min=${min.toFixed(4)} P5=${p5.toFixed(4)} P25=${p25.toFixed(4)} P50=${p50.toFixed(4)} P75=${p75.toFixed(4)} P95=${p95.toFixed(4)} max=${max.toFixed(4)}`);
    }
  });
});
