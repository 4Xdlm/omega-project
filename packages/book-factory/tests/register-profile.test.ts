/**
 * INV-PROFILE-01..06 — le cadran de registre appartient à l'utilisateur.
 * v2 (refactor 3 axes, amendement ChatGPT) : les presets sont des COMBINAISONS ;
 * l'amplitude n'est pas un rayon ; les plafonds sont des POLITIQUES étiquetées.
 */
import { describe, it, expect } from 'vitest';
import {
  REGISTER_PRESETS,
  DEFAULT_PRESET,
  TAIL40_BY_AMPLITUDE,
  SHAPE_BY_AMPLITUDE,
  DASH_SHARE_BY_REGISTER,
  resolveEnvelopes,
  diagnoseRegister,
  type RegisterPresetId,
  type RegisterConfig,
} from '../src/scribe/register-profile.js';
import { measureTailRates } from '../src/variation/long-period-template.js';

const IDS = Object.keys(REGISTER_PRESETS) as readonly RegisterPresetId[];

describe('INV-PROFILE-01 — enveloppes cohérentes et provenance à deux natures', () => {
  it('chaque enveloppe a low ≤ median ≤ high', () => {
    for (const e of [
      ...Object.values(TAIL40_BY_AMPLITUDE),
      ...Object.values(SHAPE_BY_AMPLITUDE),
      ...Object.values(DASH_SHARE_BY_REGISTER),
    ]) {
      expect(e.low).toBeLessThanOrEqual(e.median);
      expect(e.median).toBeLessThanOrEqual(e.high);
    }
  });

  it('les enveloppes sont EMPIRIQUES, le plafond est une POLITIQUE — étiquetés comme tels', () => {
    const env = resolveEnvelopes(REGISTER_PRESETS.ELITE_THRILLER_BALANCED.config);
    expect(env.provenance.envelopes).toContain('EMPIRICAL_REFERENCE');
    expect(env.provenance.ceiling).toContain('CONTROL_POLICY');
  });

  it("l'amplitude est ORDONNÉE sur tail40 médian (propriété syntaxique)", () => {
    expect(TAIL40_BY_AMPLITUDE.RESTRAINED.median).toBeLessThan(TAIL40_BY_AMPLITUDE.BALANCED.median);
    expect(TAIL40_BY_AMPLITUDE.BALANCED.median).toBeLessThan(TAIL40_BY_AMPLITUDE.HIGH.median);
  });
});

describe('INV-PROFILE-02 — les presets sont des combinaisons, pas un axe unique', () => {
  it('HIGH_AMPLITUDE reste un thriller élite — l’amplitude n’est pas un rayon', () => {
    const p = REGISTER_PRESETS.HIGH_AMPLITUDE.config;
    expect(p.market).toBe('ELITE_THRILLER');
    expect(p.amplitude).toBe('HIGH');
  });

  it('Houellebecq et Chattam partagent la MÊME amplitude avec des registres différents', () => {
    expect(REGISTER_PRESETS.LITERARY_CONTEMP.config.amplitude).toBe('HIGH');
    expect(REGISTER_PRESETS.LITERARY_CONTEMP.config.market).toBe('LITERARY_CONTEMP');
    expect(REGISTER_PRESETS.LITERARY_CONTEMP.config.dialogue).toBe('GUILLEMETS');
    expect(REGISTER_PRESETS.HIGH_AMPLITUDE.config.dialogue).toBe('DASH');
  });

  it('défaut = ELITE_THRILLER_BALANCED, et une config LIBRE hors presets est possible', () => {
    expect(DEFAULT_PRESET).toBe('ELITE_THRILLER_BALANCED');
    const libre: RegisterConfig = { market: 'BESTSELLER_LIGHT', amplitude: 'HIGH', dialogue: 'AUTO', opportunityCeiling: 0.6 };
    const env = resolveEnvelopes(libre);
    expect(env.tail40).toBe(TAIL40_BY_AMPLITUDE.HIGH);
    expect(env.dialogueDashShare).toBe(DASH_SHARE_BY_REGISTER.BESTSELLER_LIGHT);
  });
});

describe('INV-PROFILE-03 — le plafond est un plafond, jamais un quota', () => {
  it('tous les plafonds sont dans (0,1] et croissent avec l’ambition d’amplitude', () => {
    for (const id of IDS) {
      const c = REGISTER_PRESETS[id].config.opportunityCeiling;
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThanOrEqual(1);
    }
    expect(REGISTER_PRESETS.BESTSELLER_LIGHT.config.opportunityCeiling).toBeLessThan(
      REGISTER_PRESETS.HIGH_AMPLITUDE.config.opportunityCeiling,
    );
  });
});

describe('INV-PROFILE-04 — diagnostic SHADOW, dépendant du CHOIX', () => {
  function proseWithTail(nLong: number, nShort: number): string {
    const long = Array.from(
      { length: nLong },
      (_, i) => `Mot${i} ${Array.from({ length: 44 }, (_, j) => `x${j % 9}`).join(' ')}.`,
    ).join(' ');
    const short = Array.from({ length: nShort }, (_, i) => `Phrase${i} courte ici même.`).join(' ');
    return `${long} ${short}`;
  }

  it('la même prose est IN_ENVELOPE en RESTRAINED et UNDER en HIGH', () => {
    const r = measureTailRates(proseWithTail(1, 99));
    expect(diagnoseRegister(r, REGISTER_PRESETS.BESTSELLER_LIGHT.config).tail40).toBe('IN_ENVELOPE');
    expect(diagnoseRegister(r, REGISTER_PRESETS.LITERARY_CONTEMP.config).tail40).toBe('UNDER');
  });

  it('hors registre ≠ faute : le diagnostic ne porte aucun veto', () => {
    const d = diagnoseRegister(measureTailRates(proseWithTail(0, 60)), REGISTER_PRESETS.LITERARY_CONTEMP.config);
    expect(d.inRegister).toBe(false); // information, pas exception ni code d'erreur
  });
});

describe('INV-PROFILE-05 — N9 réel situé sur le cadran', () => {
  it('tail40 N9 (0,0081) : dans l’enveloppe BALANCED, sous HIGH', () => {
    const fake = { tail40: 0.0081, shapeRatio: 0.33 } as ReturnType<typeof measureTailRates>;
    expect(diagnoseRegister(fake, REGISTER_PRESETS.ELITE_THRILLER_BALANCED.config).tail40).toBe('IN_ENVELOPE');
    expect(diagnoseRegister(fake, REGISTER_PRESETS.HIGH_AMPLITUDE.config).tail40).toBe('UNDER');
  });

  it('la forme binaire de N9 (shapeRatio 0,75) est OVER pour le genre', () => {
    const fake = { tail40: 0.012, shapeRatio: 0.75 } as ReturnType<typeof measureTailRates>;
    expect(diagnoseRegister(fake, REGISTER_PRESETS.ELITE_THRILLER_BALANCED.config).shapeRatio).toBe('OVER');
  });
});

describe('INV-PROFILE-06 — aucun nombre ne fuit vers un prompt', () => {
  it("le module n'exporte aucune chaîne de directive (séparation ADR-003)", () => {
    const src = Object.values(REGISTER_PRESETS)
      .map((p) => p.intent)
      .join(' ');
    expect(src).not.toMatch(/écris|rédige|utilise \d+|phrases de \d+/iu);
  });
});
