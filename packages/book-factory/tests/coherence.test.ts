/**
 * OMEGA Book-Factory — C9 TESTS (BF-08) — contrôleur de cohérence 3 niveaux + tics.
 * Invariants 1:1, adversarial sur CAS RÉELS du run 60k, property (déterminisme LCG).
 */

import { describe, it, expect } from 'vitest';

import { scanSentencePhysics } from '../src/coherence/sentence-physics.js';
import { scanChapterCoherence } from '../src/coherence/chapter-coherence.js';
import { analyzeArcCoherence } from '../src/coherence/arc-coherence.js';
import { measureTics, computeCooldowns, TICS_EXPERIMENTAL_DEFAULTS } from '../src/coherence/tics-gate.js';

/* ── Fixture RÉELLE (run 60k ch.1, verbatim du manuscrit) ────────────────── */
const REAL_BOOTS_CASE = [
  'La pluie colle ses cheveux sur son front.',
  'Ses bottes claquent sur le carrelage humide du couloir.',
  'Elle fouille dans sa poche, sort son couteau suisse.',
  'Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte.',
].join(' ');

describe('C9.1 sentence-physics (niveau PHRASE)', () => {
  it('INV-PHYS-001 — le cas bottes/pieds-nus RÉEL du 60k déclenche FOOTWEAR_CONTRADICTION', () => {
    const r = scanSentencePhysics(REAL_BOOTS_CASE, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const foot = r.value.filter((s) => s.kind === 'FOOTWEAR_CONTRADICTION');
    expect(foot.length).toBe(1);
    expect(foot[0]?.contradiction).toContain('pieds nus');
    expect(foot[0]?.established).toContain('bottes');
  });

  it('INV-PHYS-001b — le retrait LÉGAL des bottes ne déclenche RIEN', () => {
    const legal = 'Ses bottes claquent sur le carrelage. Elle retire ses bottes près du seuil. Elle avance pieds nus sur le carrelage froid.';
    const r = scanSentencePhysics(legal, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.filter((s) => s.kind === 'FOOTWEAR_CONTRADICTION').length).toBe(0);
  });

  it('INV-PHYS-001c — la relique descriptive (« la semelle de ses bottes ») après pieds nus ne rétablit pas SHOD', () => {
    const text = 'Elle retire ses bottes. Elle avance pieds nus. La semelle de ses bottes pendait encore à la porte. Elle marche toujours pieds nus vers la cuisine.';
    const r = scanSentencePhysics(text, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.filter((s) => s.kind === 'FOOTWEAR_CONTRADICTION').length).toBe(0);
  });

  it('INV-PHYS-004 — objet sorti deux fois sans rangement = OBJECT_REDRAWN ; avec rangement = rien', () => {
    const twice = 'Elle sort son couteau de sa poche. Elle hésite un long moment devant la serrure rouillée. Elle sort son couteau et force le battant.';
    const r1 = scanSentencePhysics(twice, 2);
    expect(r1.ok && r1.value.some((s) => s.kind === 'OBJECT_REDRAWN')).toBe(true);
    const stowed = 'Elle sort son couteau de sa poche. Elle range son couteau en soupirant. Elle sort son couteau de nouveau.';
    const r2 = scanSentencePhysics(stowed, 2);
    expect(r2.ok && r2.value.filter((s) => s.kind === 'OBJECT_REDRAWN').length === 0).toBe(true);
  });

  it('INV-PHYS-005 — porte ouverte deux fois sans fermeture = DOOR_REOPENED ; fermée entre = rien', () => {
    const re = 'Elle ouvre la porte du phare. Le vent hurle dans la cage. Elle pousse la porte et entre enfin.';
    const r1 = scanSentencePhysics(re, 3);
    expect(r1.ok && r1.value.some((s) => s.kind === 'DOOR_REOPENED')).toBe(true);
    const closed = 'Elle ouvre la porte du phare. Elle referme la porte derrière elle. Plus tard elle ouvre la porte de nouveau.';
    const r2 = scanSentencePhysics(closed, 3);
    expect(r2.ok && r2.value.filter((s) => s.kind === 'DOOR_REOPENED').length === 0).toBe(true);
  });

  it('INV-PHYS-003 — tout signal porte les DEUX évidences non vides', () => {
    const r = scanSentencePhysics(REAL_BOOTS_CASE, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const s of r.value) {
      expect(s.established.length).toBeGreaterThan(0);
      expect(s.contradiction.length).toBeGreaterThan(0);
    }
  });

  it('ADV — entrées invalides = erreurs typées, jamais throw', () => {
    expect(scanSentencePhysics('', 1).ok).toBe(false);
    expect(scanSentencePhysics('Texte.', 0).ok).toBe(false);
    expect(scanSentencePhysics('Texte.', 1.5).ok).toBe(false);
  });
});

describe('C9.2 chapter-coherence (niveau CHAPITRE)', () => {
  it('INV-CHAP-001 — soir→matin sans marqueur = TIME_REGRESSION ; avec « le lendemain » = rien', () => {
    const bad = 'Le soir tombait sur le port. Garcia fumait près de la criée. Au matin, Léna relisait la lettre.';
    const r1 = scanChapterCoherence(bad, 1);
    expect(r1.ok && r1.value.some((s) => s.kind === 'TIME_REGRESSION')).toBe(true);
    const legal = 'Le soir tombait sur le port. Le lendemain, au matin, Léna relisait la lettre.';
    const r2 = scanChapterCoherence(legal, 1);
    expect(r2.ok && r2.value.filter((s) => s.kind === 'TIME_REGRESSION').length === 0).toBe(true);
  });

  it('INV-CHAP-002 — personnage sorti qui parle = GHOST_SPEAKER ; revenu = rien', () => {
    const ghost = 'Gaspard sortit en claquant la porte. Léna resta seule face à la carte. « Tu te trompes », dit Gaspard.';
    const r1 = scanChapterCoherence(ghost, 1);
    expect(r1.ok && r1.value.some((s) => s.kind === 'GHOST_SPEAKER')).toBe(true);
    const back = 'Gaspard sortit en claquant la porte. Gaspard revint une heure plus tard. « Tu te trompes », dit Gaspard.';
    const r2 = scanChapterCoherence(back, 1);
    expect(r2.ok && r2.value.filter((s) => s.kind === 'GHOST_SPEAKER').length === 0).toBe(true);
  });

  it('INV-CHAP-003 — changement de lieu sans déplacement = LOCATION_JUMP ; avec verbe = rien', () => {
    const jump = 'La cuisine sentait le café froid. La pluie battait les vitres sans répit. Les archives sentaient la poussière.';
    const r1 = scanChapterCoherence(jump, 1);
    expect(r1.ok && r1.value.some((s) => s.kind === 'LOCATION_JUMP')).toBe(true);
    const legal = 'La cuisine sentait le café froid. Elle traversa la rue sous la pluie. Les archives sentaient la poussière.';
    const r2 = scanChapterCoherence(legal, 1);
    expect(r2.ok && r2.value.filter((s) => s.kind === 'LOCATION_JUMP').length === 0).toBe(true);
  });

  it('ADV — entrées invalides = erreurs typées', () => {
    expect(scanChapterCoherence('', 1).ok).toBe(false);
    expect(scanChapterCoherence('Texte.', -1).ok).toBe(false);
  });
});

describe('C9.3 arc-coherence (niveau ARC)', () => {
  it('INV-ARC-001 — gardien nommé Thomas PUIS Henri (cas 60k) = IDENTITY_DRIFT', () => {
    const chapters = [
      { chapter: 1, prose: 'Le gardien Thomas montait chaque soir. Thomas vérifiait la lampe du phare avec soin.' },
      { chapter: 2, prose: 'On parlait encore du gardien Thomas au café. Thomas ne buvait jamais.' },
      { chapter: 9, prose: 'Le gardien Henri avait laissé un carnet. Henri notait tout, disait-on au village.' },
      { chapter: 10, prose: 'Henri, le gardien, ne dormait plus. Henri écoutait la mer toute la nuit.' },
    ];
    const r = analyzeArcCoherence(chapters, { roles: ['gardien'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const drift = r.value.identityDrifts.find((d) => d.role === 'gardien');
    expect(drift).toBeDefined();
    const names = (drift?.names ?? []).map((n) => n.name);
    expect(names).toContain('Thomas');
    expect(names).toContain('Henri');
  });

  it('INV-ARC-001b — prénoms LÉGITIMES (plan/registry) exclus de la dérive', () => {
    const chapters = [
      { chapter: 1, prose: 'Le gardien Thomas montait chaque soir. Thomas vérifiait la lampe.' },
      { chapter: 2, prose: 'Le gardien Thomas buvait au café. Thomas se taisait souvent.' },
    ];
    const r = analyzeArcCoherence(chapters, {
      roles: ['gardien'],
      legitimateNames: new Map([['gardien', ['Thomas']]]),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.identityDrifts.length).toBe(0);
  });

  it('INV-ARC-002 — seed sans révélation postérieure = UNPAID ; avec = payé au bon chapitre', () => {
    const chapters = [
      { chapter: 1, prose: 'On murmurait au village le mot naufrage sans jamais le finir. La dette restait là.' },
      { chapter: 3, prose: 'Le naufrage revenait dans toutes les bouches fermées du port.' },
      { chapter: 5, prose: 'Yvon avoua enfin : la vérité du naufrage tenait dans une nuit de novembre.' },
    ];
    const r = analyzeArcCoherence(chapters, { seeds: ['naufrage', 'dette', 'lanterne'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const naufrage = r.value.seedLedger.find((s) => s.seed === 'naufrage');
    expect(naufrage?.plantedChapter).toBe(1);
    expect(naufrage?.payoffChapter).toBe(5);
    const dette = r.value.seedLedger.find((s) => s.seed === 'dette');
    expect(dette?.plantedChapter).toBe(1);
    expect(dette?.payoffChapter).toBe('UNPAID');
    const lanterne = r.value.seedLedger.find((s) => s.seed === 'lanterne');
    expect(lanterne?.plantedChapter).toBe('ABSENT');
  });

  it('INV-ARC-003 — chapitre quasi-dupliqué classé REDITE ; chapitre neuf jamais REDITE', () => {
    const base = 'La pluie tombait sur le port désert. Léna serrait la lettre contre elle. Le phare restait éteint au bout de la jetée. Les volets claquaient dans le vent du large. Personne ne sortait plus après la tombée du jour.';
    const chapters = [
      { chapter: 1, prose: base },
      { chapter: 2, prose: `${base} Le café restait vide.` }, // quasi-copie
      { chapter: 3, prose: 'Garcia ouvrit le dossier sous la lampe verte du bureau. Les photographies montraient une coque brisée contre les récifs noirs. Il nota chaque nom dans son carnet à spirale.' },
    ];
    const r = analyzeArcCoherence(chapters);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.chapterFunctions.find((c) => c.chapter === 2)?.fn).toBe('REDITE');
    expect(r.value.chapterFunctions.find((c) => c.chapter === 3)?.fn).not.toBe('REDITE');
  });

  it('ADV — entrées invalides = erreurs typées', () => {
    expect(analyzeArcCoherence([]).ok).toBe(false);
    expect(analyzeArcCoherence([{ chapter: 0, prose: 'x' }]).ok).toBe(false);
  });
});

describe('C9.4 tics-gate (G5 durci, SHADOW)', () => {
  it('INV-TICS-001 — tic au-dessus du seuil fail-shadow = FAIL_SHADOW, jamais de rejet (rapport pur)', () => {
    const chapters = Array.from({ length: 10 }, (_, i) => ({
      chapter: i + 1,
      prose: 'Le silence qui suivit pesait sur la salle. '.repeat(2) + 'Une barque attendait près du quai gris.',
    }));
    const r = measureTics(chapters);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const tic = r.value.rows.find((row) => row.gram.includes('silence qui'));
    expect(tic).toBeDefined();
    expect(tic?.level).toBe('FAIL_SHADOW'); // 20 occ / 10 chap = 2.0 > 0.5
  });

  it('INV-TICS-002 — plancher absolu : petit livre, occurrences sous floor = aucun WARN', () => {
    const chapters = [
      { chapter: 1, prose: 'Le silence qui suivit pesait. Une barque grise attendait.' },
      { chapter: 2, prose: 'Le silence qui revint pesait. Un goéland criait au loin.' },
    ];
    const r = measureTics(chapters); // 2 occurrences < floor 8
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.rows.length).toBe(0);
  });

  it('INV-TICS-003 — cooldown : burst dans la fenêtre ⇒ interdit N chapitres, sans re-déclenchement pendant l\'interdit', () => {
    const mk = (ch: number, n: number) => ({
      chapter: ch,
      prose: `${'le silence qui pesait. '.repeat(n)}La mer montait avec lenteur.`,
    });
    const chapters = [mk(1, 2), mk(2, 2), mk(3, 0), mk(4, 0), mk(5, 0), mk(6, 0), mk(7, 0), mk(8, 0)];
    const r = computeCooldowns(chapters, { watchlist: ['le silence qui'], burstThreshold: 3, burstWindow: 3, cooldownChapters: 4 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.length).toBe(1); // un seul interdit, pas de cascade
    expect(r.value[0]?.fromChapter).toBe(3); // burst atteint au ch.2 (2+2=4 ≥ 3) → interdit dès ch.3
    expect(r.value[0]?.toChapter).toBe(6); // 4 chapitres d'interdit
  });

  it('ADV — défauts EXPERIMENTAL documentés exportés et entrée vide typée', () => {
    expect(TICS_EXPERIMENTAL_DEFAULTS.warnPerChapter).toBeCloseTo(0.3);
    expect(TICS_EXPERIMENTAL_DEFAULTS.failShadowPerChapter).toBeCloseTo(0.5);
    expect(measureTics([]).ok).toBe(false);
    expect(computeCooldowns([], { watchlist: ['x'] }).ok).toBe(false);
  });
});

describe('C9 property — déterminisme total (LCG seedé, zéro dépendance)', () => {
  function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }
  const VOCAB = ['pluie', 'silence', 'phare', 'Léna', 'Garcia', 'gardien', 'Thomas', 'Henri', 'porte', 'bottes', 'pieds', 'nus', 'soir', 'matin', 'cuisine', 'archives', 'sort', 'ouvre', 'ferme', 'retire', 'le', 'la', 'elle', 'dit', 'naufrage'];
  function randProse(rnd: () => number, sentences: number): string {
    const out: string[] = [];
    for (let i = 0; i < sentences; i++) {
      const len = 4 + Math.floor(rnd() * 10);
      const ws: string[] = [];
      for (let k = 0; k < len; k++) ws.push(VOCAB[Math.floor(rnd() * VOCAB.length)] ?? 'mer');
      out.push(`${ws.join(' ')}.`);
    }
    return out.join(' ');
  }

  it('P-COH-001 — ×30 proses aléatoires : même entrée ⇒ sortie identique, zéro throw, sur les 4 modules', () => {
    for (let trial = 0; trial < 30; trial++) {
      const rnd = lcg(1000 + trial);
      const prose = randProse(rnd, 12 + Math.floor(rnd() * 20));
      const chapters = [
        { chapter: 1, prose },
        { chapter: 2, prose: randProse(rnd, 15) },
      ];
      const a1 = JSON.stringify(scanSentencePhysics(prose, 1));
      const a2 = JSON.stringify(scanSentencePhysics(prose, 1));
      expect(a1).toBe(a2);
      const b1 = JSON.stringify(scanChapterCoherence(prose, 1));
      const b2 = JSON.stringify(scanChapterCoherence(prose, 1));
      expect(b1).toBe(b2);
      const c1 = JSON.stringify(analyzeArcCoherence(chapters, { seeds: ['naufrage'] }));
      const c2 = JSON.stringify(analyzeArcCoherence(chapters, { seeds: ['naufrage'] }));
      expect(c1).toBe(c2);
      const d1 = JSON.stringify(measureTics(chapters));
      const d2 = JSON.stringify(measureTics(chapters));
      expect(d1).toBe(d2);
    }
  });
});
