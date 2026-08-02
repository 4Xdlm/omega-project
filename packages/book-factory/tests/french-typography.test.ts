/**
 * INV-TYPO-01..05 — normalisation typographique française au scellement.
 * Exigences ratifiées : idempotence, zones protégées, conservation lexicale,
 * revert, compteurs. Plus les cas durs demandés : guillemets imbriqués,
 * apostrophes lexicales, espaces insécables.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeFrenchTypography,
  denormalizeFrenchTypography,
  typoDiff,
  wordsPreserved,
} from '../src/seal/french-typography.js';

const NNBSP = '\u202f';
const NBSP = '\u00a0';

describe('INV-TYPO-01 — idempotence', () => {
  const cases = [
    `L'homme n'a rien dit. "Vraiment ?" demanda-t-il... Et puis : rien !`,
    `- Tu viens ?\n- Non.\n`,
    `Il l'a vu ; elle aussi. « Ici » disait-il.`,
    `Aujourd'hui, c'est l'heure : partons !`,
    ``,
    `Rien à normaliser.`,
  ];
  for (const [i, src] of cases.entries()) {
    it(`stable au second passage (cas ${i})`, () => {
      const once = normalizeFrenchTypography(src).text;
      const twice = normalizeFrenchTypography(once).text;
      expect(twice).toBe(once);
    });
    it(`compteurs nuls au second passage (cas ${i})`, () => {
      const once = normalizeFrenchTypography(src).text;
      expect(normalizeFrenchTypography(once).totalApplied).toBe(0);
    });
  }
});

describe('INV-TYPO-02 — zones protégées', () => {
  it('ne touche pas une URL', () => {
    const src = `Voir https://example.com/a?b=1&c="x" pour l'info.`;
    const out = normalizeFrenchTypography(src).text;
    expect(out).toContain('https://example.com/a?b=1&c="x"');
  });

  it("ne touche pas un chemin Windows ni un nom de fichier", () => {
    const src = `Le fichier C:\\Users\\a\\b.ts et calque-detector.ts restent intacts.`;
    const out = normalizeFrenchTypography(src).text;
    expect(out).toContain('C:\\Users\\a\\b.ts');
    expect(out).toContain('calque-detector.ts');
  });

  it('ne touche pas un identifiant snake_case ni un bloc de code', () => {
    const src = "L'identifiant long_tail_opportunity et ```const a = \"x\"...```";
    const out = normalizeFrenchTypography(src).text;
    expect(out).toContain('long_tail_opportunity');
    expect(out).toContain('```const a = "x"...```');
  });

  it('compte les zones protégées', () => {
    const r = normalizeFrenchTypography('https://a.com et `code` et x_y');
    expect(r.protectedSpans).toBeGreaterThanOrEqual(3);
  });
});

describe('règles — apostrophes lexicales', () => {
  it("transforme l'apostrophe entre lettres", () => {
    const r = normalizeFrenchTypography("L'homme n'a pas aujourd'hui.");
    expect(r.text).toBe('L’homme n’a pas aujourd’hui.');
    expect(r.counts.find((c) => c.rule === 'APOSTROPHE')?.applied).toBe(3);
  });

  it("ne transforme pas une apostrophe non lexicale (guillemet simple isolé)", () => {
    const r = normalizeFrenchTypography("Il dit ' puis rien.");
    expect(r.text).toContain("' puis");
  });
});

describe('règles — guillemets', () => {
  it('apparie les guillemets droits en chevrons avec insécables', () => {
    const r = normalizeFrenchTypography('Il dit "bonjour" ainsi.');
    expect(r.text).toBe(`Il dit «${NBSP}bonjour${NBSP}» ainsi.`);
  });

  it('laisse un guillemet orphelin intact (pas de paire)', () => {
    const r = normalizeFrenchTypography('Un seul " ici.');
    expect(r.text).toContain('"');
    expect(r.counts.find((c) => c.rule === 'QUOTES_PAIRED')?.applied).toBe(0);
  });

  it("guillemets imbriqués : n'apparie que la paire externe la plus proche", () => {
    const r = normalizeFrenchTypography('Elle dit "il a dit "oui" hier" puis partit.');
    // deux paires successives sont formées ; aucun caractère perdu
    expect(r.text).not.toContain('""');
    expect(wordsPreserved('Elle dit "il a dit "oui" hier" puis partit.', r.text)).toBe(true);
  });

  it('normalise une paire déjà en chevrons sans espace', () => {
    const r = normalizeFrenchTypography('Il dit «bonjour» ainsi.');
    expect(r.text).toBe(`Il dit «${NBSP}bonjour${NBSP}» ainsi.`);
  });
});

describe('règles — espaces insécables', () => {
  it('pose une fine insécable devant ; ! ?', () => {
    const r = normalizeFrenchTypography('Quoi ? Vraiment ! Bon ; voilà.');
    expect(r.text).toBe(`Quoi${NNBSP}? Vraiment${NNBSP}! Bon${NNBSP}; voilà.`);
  });

  it('pose une fine insécable même sans espace préalable', () => {
    const r = normalizeFrenchTypography('Quoi? Vraiment!');
    expect(r.text).toBe(`Quoi${NNBSP}? Vraiment${NNBSP}!`);
  });

  it("pose une insécable devant ':' seulement s'il y avait un espace", () => {
    expect(normalizeFrenchTypography('Voici : ceci').text).toBe(`Voici${NBSP}: ceci`);
    expect(normalizeFrenchTypography('12:30').text).toBe('12:30');
  });
});

describe('règles — ellipse et tiret de dialogue', () => {
  it('convertit les points de suspension', () => {
    const r = normalizeFrenchTypography('Il hésita... puis....');
    expect(r.text).toBe('Il hésita… puis….');
    expect(r.counts.find((c) => c.rule === 'ELLIPSIS')?.applied).toBe(2);
  });

  it('convertit le tiret de dialogue en tête de ligne', () => {
    const r = normalizeFrenchTypography('- Tu viens ?\n-- Non.\nUn - au milieu.');
    expect(r.text).toContain('— Tu viens');
    expect(r.text).toContain('— Non.');
    expect(r.text).toContain('Un - au milieu.');
  });
});

describe('INV-TYPO-03 — conservation lexicale', () => {
  it('aucun mot ajouté ni perdu sur un texte composite', () => {
    const src = `L'homme dit "je pars" ; il hésita... puis : rien !\n- Vraiment ?\n`;
    const out = normalizeFrenchTypography(src).text;
    expect(wordsPreserved(src, out)).toBe(true);
  });
});

describe('INV-TYPO-04 — revert', () => {
  it('restitue les classes ASCII transformées', () => {
    const src = `L'homme dit "oui"... et : non !`;
    const out = normalizeFrenchTypography(src).text;
    const back = denormalizeFrenchTypography(out);
    expect(back).toContain("L'homme");
    expect(back).toContain('"oui"');
    expect(back).toContain('...');
    expect(back).not.toContain('’');
    expect(back).not.toContain('…');
  });
});

describe('INV-TYPO-05 — compteurs et diff', () => {
  it('rapporte une entrée par règle et un total cohérent', () => {
    const r = normalizeFrenchTypography(`L'un dit "a" ; b... - c\n`);
    expect(r.counts).toHaveLength(6);
    expect(r.totalApplied).toBe(r.counts.reduce((a, c) => a + c.applied, 0));
    expect(r.totalApplied).toBeGreaterThan(0);
  });

  it('produit un diff borné et localisé', () => {
    const src = "L'homme n'a rien.";
    const out = normalizeFrenchTypography(src).text;
    const d = typoDiff(src, out);
    expect(d.length).toBeGreaterThan(0);
    expect(d.length).toBeLessThanOrEqual(200);
    expect(d[0]?.after).toContain('’');
  });

  it('diff vide sur un texte déjà normalisé', () => {
    const once = normalizeFrenchTypography("L'homme dit \"oui\".").text;
    expect(typoDiff(once, normalizeFrenchTypography(once).text)).toHaveLength(0);
  });
});
