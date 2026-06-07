/** OMEGA — SCAFFOLD GUARD tests (BF-08). Fixtures = cas RÉELS du manuscrit 60k. */
import { describe, it, expect } from 'vitest';
import { stripScaffold } from '../src/doctor/scaffold-guard.js';

describe('SCAFFOLD_GUARD — directives de génération laissées en prose', () => {
  it('INV-SCAF-001 — cas réel « — Acte 2 : … [synthese] » détecté et retiré', () => {
    const r = stripScaffold([{ chapter: 12, prose: "— Acte 2 : avancer l'enquête ; approfondir un personnage ; relancer la tension. [synthese]\n\nLe vent soufflait sur le port désert et glacé." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.removed.length).toBe(1);
    expect(r.value.cleaned[0]?.prose).not.toContain('Acte 2');
    expect(r.value.cleaned[0]?.prose).toContain('Le vent soufflait');
    expect(r.value.residual).toBe(0);
  });

  it('INV-SCAF-002 — DIALOGUE réel « — Une fausse piste, murmura Garcia… » JAMAIS retiré', () => {
    const r = stripScaffold([{ chapter: 4, prose: "— Une fausse piste, murmura Garcia en reprenant la lettre. Ou une mise en scène.\n\nLéna ne répondit pas." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.removed.length).toBe(0); // zéro suppression
    expect(r.value.cleaned[0]?.prose).toContain('murmura Garcia');
  });

  it('INV-SCAF-003 — prose réelle finissant sur « …une fausse piste, une » préservée', () => {
    const r = stripScaffold([{ chapter: 25, prose: "Garcia sentit la tension monter, il savait que cette réponse était une fausse piste, une" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.removed.length).toBe(0);
    expect(r.value.cleaned[0]?.prose).toContain('fausse piste');
  });

  it('INV-SCAF-004 — incise littéraire « [signée Garcia] » (majuscule+espace) JAMAIS confondue', () => {
    const r = stripScaffold([{ chapter: 7, prose: "Il relut la note [signée Garcia] et la rangea dans sa poche.\n\nLe silence retomba." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.removed.length).toBe(0); // majuscule + espace = prose, pas tag
    expect(r.value.cleaned[0]?.prose).toContain('[signée Garcia]');
  });

  it('INV-SCAF-005 — en-tête « — Incident déclencheur : … [canon-strict] » retiré', () => {
    const r = stripScaffold([{ chapter: 10, prose: "— Incident déclencheur : poser la question centrale. [canon-strict]\n\nLe vent d'ouest frappait les vitres." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.removed.length).toBe(1);
    expect(r.value.cleaned[0]?.prose.startsWith("Le vent d'ouest")).toBe(true);
    expect(r.value.residual).toBe(0);
  });

  it('INV-SCAF-006 — déterminisme ×2 + prose propre = zéro retrait', () => {
    const clean = [{ chapter: 1, prose: 'Une première phrase complète. Une seconde, propre.\n\nUn paragraphe net.' }];
    const a = stripScaffold(clean);
    expect(a.ok && a.value.removed.length === 0 && a.value.residual === 0).toBe(true);
    expect(JSON.stringify(stripScaffold(clean))).toBe(JSON.stringify(stripScaffold(clean)));
  });

  it('INV-SCAF-007 — cas réel ch.1 « — Présenter … [rythme-compresse] » (PAS de préfixe Acte) retiré par le TAG', () => {
    // C'est exactement la directive qui avait échappé : aucun préfixe « Acte »,
    // détectée UNIQUEMENT par le tag markup fermé « [rythme-compresse] ».
    const r = stripScaffold([{ chapter: 1, prose: '— Présenter Léna Marchetti et le monde ordinaire ; amorcer le ton (sobre, tendu, sensoriel). [rythme-compresse]\n\nLe sel colle à la peau, une pellicule glacée.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.removed.length).toBe(1);
    expect(r.value.removed[0]?.reason).toBe('MARKUP_TAG');
    expect(r.value.cleaned[0]?.prose.startsWith('Le sel colle')).toBe(true);
    expect(r.value.residual).toBe(0);
  });
});
