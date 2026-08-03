/**
 * INV-PROFILE-01..05 — le cadran de registre appartient à l'utilisateur.
 * Les enveloppes sont MESURÉES (M0) ; le diagnostic est SHADOW ; aucun quota.
 */
import { describe, it, expect } from 'vitest';
import {
  REGISTER_PROFILES,
  DEFAULT_PROFILE,
  diagnoseRegister,
  type RegisterProfileId,
} from '../src/scribe/register-profile.js';
import { measureTailRates } from '../src/variation/long-period-template.js';

const IDS = Object.keys(REGISTER_PROFILES) as readonly RegisterProfileId[];

describe('INV-PROFILE-01 — enveloppes cohérentes et sourcées', () => {
  it('chaque profil a low ≤ median ≤ high et une provenance M0', () => {
    for (const id of IDS) {
      const p = REGISTER_PROFILES[id];
      for (const e of [p.tail40, p.shapeRatio, p.dialogueDashShare]) {
        expect(e.low).toBeLessThanOrEqual(e.median);
        expect(e.median).toBeLessThanOrEqual(e.high);
      }
      expect(p.provenance).toContain('M0 2026-08-03');
      expect(p.opportunityShare).toBeGreaterThan(0);
      expect(p.opportunityShare).toBeLessThanOrEqual(1);
    }
  });

  it("le cadran est ORDONNÉ : bestseller < élite < amplitude < littéraire sur tail40 médian", () => {
    const m = (id: RegisterProfileId): number => REGISTER_PROFILES[id].tail40.median;
    expect(m('BESTSELLER_LIGHT')).toBeLessThan(m('ELITE_THRILLER_BALANCED'));
    expect(m('ELITE_THRILLER_BALANCED')).toBeLessThan(m('HIGH_AMPLITUDE'));
    expect(m('HIGH_AMPLITUDE')).toBeLessThan(m('LITERARY_CONTEMP'));
  });
});

describe('INV-PROFILE-02 — le défaut est l’élite équilibrée, mais tous restent accessibles', () => {
  it('défaut = ELITE_THRILLER_BALANCED (arbitrage 2026-08-03)', () => {
    expect(DEFAULT_PROFILE).toBe('ELITE_THRILLER_BALANCED');
  });

  it('les 4 profils du cadran existent — le choix reste libre', () => {
    expect(IDS).toHaveLength(4);
  });
});

describe('INV-PROFILE-03 — diagnostic SHADOW', () => {
  function proseWithTail(nLong: number, nShort: number): string {
    const long = Array.from(
      { length: nLong },
      (_, i) => `Mot${i} ${Array.from({ length: 44 }, (_, j) => `x${j % 9}`).join(' ')}.`,
    ).join(' ');
    const short = Array.from({ length: nShort }, (_, i) => `Phrase${i} courte ici même.`).join(' ');
    return `${long} ${short}`;
  }

  it('une prose sans aucune phrase longue est UNDER pour le littéraire, pas fautive', () => {
    const d = diagnoseRegister(measureTailRates(proseWithTail(0, 100)), 'LITERARY_CONTEMP');
    expect(d.tail40).toBe('UNDER');
    // pas de veto, pas d'exception : juste une information
    expect(d.inRegister).toBe(false);
  });

  it('la même prose est IN_ENVELOPE pour le bestseller léger — le registre dépend du CHOIX', () => {
    const r = measureTailRates(proseWithTail(1, 99));
    const light = diagnoseRegister(r, 'BESTSELLER_LIGHT');
    const literary = diagnoseRegister(r, 'LITERARY_CONTEMP');
    expect(light.tail40).toBe('IN_ENVELOPE');
    expect(literary.tail40).toBe('UNDER');
  });
});

describe('INV-PROFILE-04 — N9 réel situé sur le cadran', () => {
  it('tail40 N9 (0,0081) : dans l’enveloppe élite, sous l’enveloppe littéraire', () => {
    const fake = { tail40: 0.0081, shapeRatio: 0.33 } as ReturnType<typeof measureTailRates>;
    expect(diagnoseRegister(fake, 'ELITE_THRILLER_BALANCED').tail40).toBe('IN_ENVELOPE');
    expect(diagnoseRegister(fake, 'LITERARY_CONTEMP').tail40).toBe('UNDER');
    expect(diagnoseRegister(fake, 'HIGH_AMPLITUDE').tail40).toBe('UNDER');
  });

  it('la forme binaire de N9 (shapeRatio 0,75) est OVER pour tous les profils de genre', () => {
    const fake = { tail40: 0.012, shapeRatio: 0.75 } as ReturnType<typeof measureTailRates>;
    expect(diagnoseRegister(fake, 'ELITE_THRILLER_BALANCED').shapeRatio).toBe('OVER');
    expect(diagnoseRegister(fake, 'BESTSELLER_LIGHT').shapeRatio).toBe('OVER');
  });
});

describe('INV-PROFILE-05 — aucun nombre de profil ne fuit vers un prompt', () => {
  it("le module n'exporte aucune chaîne de directive (séparation ADR-003)", () => {
    // Garde structurelle : ce module ne contient que des données et un diagnostic.
    // Si quelqu'un y ajoute un jour un texte de prompt, ce test le signalera.
    const src = Object.values(REGISTER_PROFILES)
      .map((p) => `${p.intent} ${p.provenance}`)
      .join(' ');
    expect(src).not.toMatch(/écris|rédige|utilise \d+|phrases de \d+/iu);
  });
});
