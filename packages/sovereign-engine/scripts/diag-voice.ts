import { measureVoice, DEFAULT_VOICE_GENOME, computeVoiceDrift, NON_APPLICABLE_VOICE_PARAMS } from '../src/voice/voice-genome.js';
import * as fs from 'node:fs';

// Prose synthétique représentative — RHYTHM PRESCRIPTION active
// 25% phrases ≤5 mots, 25% ≥28 mots, 50% médian, ~600 mots, FR littéraire
const PROSE = `
Claire s'immobilisa.

La fenêtre tremblait dans son cadre, portée par un vent qui n'existait pas à cette heure, pas dans cette saison, pas dans cette maison qu'elle connaissait pourtant dans ses moindres recoins depuis l'enfance, depuis les étés où son père l'emmenait dans le grenier chercher les vieilles boîtes en métal qui sentaient le tabac et la naphtaline.

Rien ne bougea.

Elle posa la main sur le bois froid du couloir, sentit sous ses doigts la texture familière du vernis écaillé, cette rugosité qu'elle avait apprise enfant en faisant glisser son ongle le long de la plinthe, et attendit que son souffle revienne à quelque chose de normal, de contrôlé, de silencieux.

Dehors : le jardin.

La silhouette qu'elle avait cru voir entre les arbres n'était plus là — ou peut-être n'avait-elle jamais été là, peut-être n'était-ce qu'une ombre projetée par le réverbère de la rue et amplifiée par sa propre anxiété, par ces trois semaines de nuits trop courtes et de journées trop longues à surveiller les fenêtres sans savoir exactement ce qu'elle guettait.

Elle avança.

Le parquet céda sous son poids avec ce craquement précis qu'elle connaissait, le troisième latte depuis la porte, celle qu'il fallait éviter quand on voulait ne pas réveiller quelqu'un — ou ne pas se faire entendre de quelqu'un qui écoutait.

Trop tard maintenant.

Si quelqu'un était dans cette maison, ce quelqu'un savait exactement où elle se trouvait, à quelle vitesse elle marchait, dans quelle direction elle allait, et il lui semblait soudain que la seule chose sensée était de rester absolument immobile, de ne plus respirer du tout, d'attendre que l'obscurité lui révèle quelque chose ou que la peur cesse d'être supportable.

Elle attendit.

Trois secondes. Cinq. Le silence de la maison n'était pas le silence du vide mais le silence de quelque chose qui retient son souffle aussi fort qu'elle, ce silence plein et tendu qui précède non pas le calme mais son contraire, et elle sentit dans sa gorge quelque chose se contracter lentement, méthodiquement, comme si son propre corps prenait acte avant son esprit de ce qui allait arriver.

Puis : rien.

Juste le vent revenu, juste la fenêtre à nouveau dans son cadre, juste le jardin qui reprenait ses formes ordinaires sous la lumière froide du mois de novembre, et Claire resta là encore un long moment, la main sur le mur, à écouter le silence devenu normal se déposer comme une couche de quelque chose d'épais sur l'ensemble de la maison.
`.trim();

const actual = measureVoice(PROSE);
const { drift, per_param, n_applicable, excluded } = computeVoiceDrift(DEFAULT_VOICE_GENOME, actual, NON_APPLICABLE_VOICE_PARAMS);
const score = (1 - drift) * 100;

const lines: string[] = [];
lines.push('=== ACTUAL GENOME (measured on synthetic prose) ===');
for (const [k, v] of Object.entries(actual)) {
  const target = DEFAULT_VOICE_GENOME[k as keyof typeof DEFAULT_VOICE_GENOME];
  const diff = Math.abs(target - (v as number)).toFixed(3);
  const excl = NON_APPLICABLE_VOICE_PARAMS.has(k as keyof typeof DEFAULT_VOICE_GENOME) ? ' [EXCL]' : '      ';
  lines.push(`  ${k.padEnd(22)} actual=${(v as number).toFixed(3)}  target=${target.toFixed(3)}  diff=${diff}${excl}`);
}
lines.push('');
lines.push(`Drift RMS: ${(drift * 100).toFixed(2)}%  |  voice_conformity: ${score.toFixed(1)}`);
lines.push(`N_applicable: ${n_applicable}  |  Excluded: [${excluded.join(', ')}]`);

const output = lines.join('\n');
console.log(output);
fs.writeFileSync('C:/Users/elric/Downloads/diag-voice-out.txt', output, 'utf8');
