/** OMEGA — C14 GPS + C15 STYLE + GUARDED + FUSION tests (BF-08, BF-11/14 incarnées). */

import { describe, it, expect } from 'vitest';

import { radar } from '../src/gps/gps-radar.js';
import { predictTrajectories } from '../src/gps/trajectory-predictor.js';
import { assertRights } from '../src/style/rights-gate.js';
import type { RightsMode, StyleOperation } from '../src/style/rights-gate.js';
import { extractStyleFingerprint } from '../src/style/style-extractor.js';
import { setMode } from '../src/router/product-mode-router.js';
import { guardedRunDoctor, guardedGps, guardedMixedSelect, guardedExportGenome } from '../src/router/guarded.js';
import { fuseGenomes, FUSED_GENOME_SCHEMA } from '../src/mycelium-export/fused-genome.js';

const SCENE_TEXT = [
  'Léna posa la lampe sur la table de la cuisine et écouta la pluie contre les volets clos du soir.',
  '« Tu aurais dû me le dire », dit Garcia, debout près de la porte, le carnet serré contre lui.',
  'Elle ne répondit pas tout de suite. Le silence pesait, épais comme la brume du large.',
  'Garcia avança d\'un pas. La question restait là, suspendue entre eux, sans réponse.',
].join(' ');

const HISTORY = [
  { chapter: 1, prose: 'Le registre disparut du bureau du maire ce soir-là, et personne n\'en parla plus au village.' },
  { chapter: 2, prose: 'La pluie tombait sur le port. Léna marchait seule le long de la jetée noire.' },
  { chapter: 3, prose: 'Garcia relisait ses notes près du feu. La nuit passait lentement sur les toits.' },
];

describe('C14 GPS — radar (BF-11 : mesure, jamais de décision)', () => {
  it('INV-GPS-001 — position : personnages en scène + locuteur + météo émotionnelle mesurée', () => {
    const r = radar({ currentText: SCENE_TEXT, currentChapter: 4, history: HISTORY, knownCharacters: ['Léna', 'Garcia', 'Yvon'], seeds: ['registre'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const names = r.value.charactersInScene.map((c) => c.name);
    expect(names).toContain('Léna');
    expect(names).toContain('Garcia');
    expect(names).not.toContain('Yvon'); // absent de la scène
    expect(r.value.charactersInScene.find((c) => c.name === 'Garcia')?.speaking).toBe(true);
    expect(r.value.emotionalWeather.MYSTERE).toBeGreaterThan(0); // « sans réponse », « silence »…
  });

  it('INV-GPS-002 — branche mourante : graine sans rappel ≥ seuil ⇒ DYING_THREAD (NARRATIVE_FLOW)', () => {
    const r = radar({ currentText: SCENE_TEXT, currentChapter: 9, history: HISTORY, knownCharacters: ['Léna'], seeds: ['registre'], dyingThreadThreshold: 5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dying = r.value.dangers.filter((d) => d.kind === 'DYING_THREAD');
    expect(dying.length).toBe(1); // registre planté ch.1, dernier rappel ch.1, courant ch.9 ⇒ 8 ≥ 5
    expect(r.value.agingSeeds[0]?.chaptersSinceRecall).toBe(8);
  });

  it('ADV — texte vide = erreur typée', () => {
    expect(radar({ currentText: '  ', currentChapter: 1, history: [], knownCharacters: [], seeds: [] }).ok).toBe(false);
  });
});

describe('C14 GPS — trajectoires (BF-11 PAR CONSTRUCTION)', () => {
  const position = (() => {
    const r = radar({ currentText: SCENE_TEXT, currentChapter: 9, history: HISTORY, knownCharacters: ['Léna', 'Garcia'], seeds: ['registre'] });
    if (!r.ok) throw new Error('fixture');
    return r.value;
  })();

  it('INV-GPS-003 — 3 à 5 routes, TRIÉES PAR TYPE (aucun ordre de préférence), chacune avec risques NON CACHÉS', () => {
    const r = predictTrajectories(position, ['registre']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.length).toBeGreaterThanOrEqual(3);
    expect(r.value.length).toBeLessThanOrEqual(5);
    const types = r.value.map((t) => t.type);
    expect([...types].sort()).toEqual(types); // ordre alphabétique = zéro préférence
    for (const t of r.value) {
      expect(t.risks.length).toBeGreaterThan(0); // les coûts ne sont JAMAIS cachés
      // Paramétré par les entités RÉELLES de la scène (who=dernier vu, other=second)
      expect(/Léna|Garcia/u.test(t.premise)).toBe(true);
    }
    expect(r.value.some((t) => t.premise.includes('Garcia'))).toBe(true);
  });

  it('INV-GPS-004 — la graine VIEILLISSANTE est prioritaire dans les routes à graine (relance de branche mourante)', () => {
    const r = predictTrajectories(position, ['naufrage', 'registre']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const enquete = r.value.find((t) => t.type === 'ENQUETE');
    expect(enquete?.premise).toContain('registre'); // la mourante (8 chap.) avant la 1ʳᵉ du plan
  });

  it('INV-GPS-005 — sans personnage en scène : REFUS typé (pas de routes sans matière)', () => {
    const empty = { ...position, charactersInScene: [] };
    const r = predictTrajectories(empty, ['registre']);
    expect(!r.ok && r.error.code === 'NO_MATERIAL').toBe(true);
  });
});

describe('C15 — rights-gate (BF-14, VISION:311 machine-level)', () => {
  it('INV-RGT-001 — table exhaustive 6 modes × 3 opérations', () => {
    const expectOk: ReadonlyArray<readonly [RightsMode, StyleOperation, boolean]> = [
      ['OWN_WORK', 'CONTINUE_WORK', true], ['PUBLIC_DOMAIN', 'GENERATE_IN_STYLE', true],
      ['LICENSED', 'CONTINUE_WORK', true], ['GENERIC_STYLE', 'GENERATE_IN_STYLE', true],
      ['GENERIC_STYLE', 'CONTINUE_WORK', false], // style générique ≠ continuer une œuvre précise
      ['ANALYSIS_ONLY', 'ANALYZE_STYLE', true], ['ANALYSIS_ONLY', 'GENERATE_IN_STYLE', false],
      ['BLOCKED', 'ANALYZE_STYLE', false], ['BLOCKED', 'CONTINUE_WORK', false],
    ];
    for (const [mode, op, okExpected] of expectOk) {
      expect(assertRights(mode, op).ok, `${mode}/${op}`).toBe(okExpected);
    }
  });

  it('INV-RGT-002 — le refus de génération est TYPÉ et cite la clause', () => {
    const r = assertRights('ANALYSIS_ONLY', 'GENERATE_IN_STYLE');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('GENERATION_BLOCKED_BY_RIGHTS');
    expect(r.error.detail).toContain('machine-level');
  });
});

describe('C15 — extracteur de fingerprint (structure VoiceGenome)', () => {
  const longSentenceText = Array.from({ length: 30 }, () =>
    'La mémoire, qui revenait par vagues lentes et concentriques chaque fois que la maison respirait, déposait dans la conscience une sédimentation d\'impressions anciennes, de regrets inachevés et de tendresses suspendues, comme si le temps lui-même hésitait à conclure.',
  ).join(' ');
  const shortSentenceText = Array.from({ length: 40 }, () =>
    'Il marche. La rue est vide. Le soleil tape. Il ne pense à rien. Un chien aboie. Il continue.',
  ).join(' ');

  it('INV-STY-001 — l\'extraction EXIGE un ticket (brand infalsifiable) et discrimine deux styles', () => {
    const ticket = assertRights('PUBLIC_DOMAIN', 'ANALYZE_STYLE');
    expect(ticket.ok).toBe(true);
    if (!ticket.ok) return;
    const a = extractStyleFingerprint(ticket.value, longSentenceText);
    const b = extractStyleFingerprint(ticket.value, shortSentenceText);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.phrase_length_mean).toBeGreaterThan(b.value.phrase_length_mean);
    expect(a.value.abstraction_ratio).toBeGreaterThan(b.value.abstraction_ratio);
    for (const v of [...Object.values(a.value), ...Object.values(b.value)]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('ADV — texte court = erreur typée ; déterminisme ×2', () => {
    const ticket = assertRights('OWN_WORK', 'ANALYZE_STYLE');
    if (!ticket.ok) return;
    expect(extractStyleFingerprint(ticket.value, 'Trop court.').ok).toBe(false);
    expect(JSON.stringify(extractStyleFingerprint(ticket.value, longSentenceText)))
      .toBe(JSON.stringify(extractStyleFingerprint(ticket.value, longSentenceText)));
  });
});

describe('GUARDED — branchement assertCapability (BF-09)', () => {
  it('INV-GRD-001 — sans session : TOUT refuse typé', async () => {
    const d = await guardedRunDoctor(undefined, '## Chapitre 1\n\nTexte. Assez long pour deux chapitres au moins ici.\n\n## Chapitre 2\n\nSuite du texte calme.');
    expect(!d.ok && d.error.code === 'NO_MODE_DECLARED').toBe(true);
    const g = guardedGps(undefined, { currentText: 'x.', currentChapter: 1, history: [], knownCharacters: [], seeds: [] }, []);
    expect(!g.ok && g.error.code === 'NO_MODE_DECLARED').toBe(true);
  });

  it('INV-GRD-002 — mauvais mode : CAPABILITY_DENIED (le GPS ne répare pas, le mixer n\'exporte pas)', async () => {
    const gps = setMode('COAUTHOR_GPS');
    if (!gps.ok) return;
    const d = await guardedRunDoctor(gps.value, '## Chapitre 1\n\nTexte.\n\n## Chapitre 2\n\nTexte.');
    expect(!d.ok && d.error.code === 'CAPABILITY_DENIED').toBe(true);
    const mixer = setMode('MIXER_CONTROL');
    if (!mixer.ok) return;
    const e = guardedExportGenome(mixer.value, { title: 't', chapters: [{ chapter: 1, prose: 'x' }], cast: [], seedLedger: [], chapterFunctions: [], tics: [] });
    expect(!e.ok && e.error.code === 'CAPABILITY_DENIED').toBe(true);
  });

  it('INV-GRD-003 — bon mode : la chaîne GPS complète passe (position + trajectoires)', () => {
    const gps = setMode('COAUTHOR_GPS');
    if (!gps.ok) return;
    const r = guardedGps(gps.value, { currentText: SCENE_TEXT, currentChapter: 9, history: HISTORY, knownCharacters: ['Léna', 'Garcia'], seeds: ['registre'] }, ['registre']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.trajectories.length).toBeGreaterThanOrEqual(3);
    const m = setMode('MIXER_CONTROL');
    if (!m.ok) return;
    const sel = guardedMixedSelect(m.value, [
      { id: 'a', prose: 'Il menace et frappe soudain la table, brusquement.', baseScore: 10, eligible: true },
      { id: 'b', prose: 'La mer est calme et douce ce matin, apaisée.', baseScore: 10, eligible: true },
    ], { TENSION: 1 });
    expect(sel.ok && sel.value.winner === 'a').toBe(true);
  });
});

describe('FUSION génome (BF-13 — composition, zéro duplication Emotion14)', () => {
  const N = 'a'.repeat(64);
  const E = 'b'.repeat(64);

  it('INV-FUS-001 — fusion complète déterministe ; un côté change ⇒ fusedHash change', () => {
    const f1 = fuseGenomes(N, E);
    const f2 = fuseGenomes(N, E);
    expect(f1.ok && f2.ok).toBe(true);
    if (!f1.ok || !f2.ok) return;
    expect(f1.value.status).toBe('COMPLETE');
    expect(f1.value.fusedHash).toBe(f2.value.fusedHash);
    const f3 = fuseGenomes(N, 'c'.repeat(64));
    if (!f3.ok || f3.value.status !== 'COMPLETE' || f1.value.status !== 'COMPLETE') return;
    expect(f3.value.fusedHash).not.toBe(f1.value.fusedHash);
  });

  it('INV-FUS-002 — sans empreinte émotionnelle : PENDING_EMOTIONAL, fusedHash NULL (jamais partiel déguisé)', () => {
    const f = fuseGenomes(N);
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.value.status).toBe('PENDING_EMOTIONAL');
    expect(f.value.fusedHash).toBeNull();
    expect(f.value.schema).toBe(FUSED_GENOME_SCHEMA);
  });

  it('ADV — hash invalide = erreur typée', () => {
    expect(fuseGenomes('pas-un-hash').ok).toBe(false);
    expect(fuseGenomes(N, 'court').ok).toBe(false);
  });
});
