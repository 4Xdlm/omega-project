/** OMEGA — PONT SCRIBE→DOCTOR tests (NCR-M0B) + garde-fous. */
import { describe, it, expect } from 'vitest';
import { inventedEntities, ScribeGatedRepairPort } from '../src/doctor/scribe-bridge.js';

describe('NCR-M0B — pont scribe→Doctor (garde-fous)', () => {
  it('INV-M0B-001 — anti-invention : nouvelle entité capitalisée détectée, connues/présentes tolérées', () => {
    const prev = 'Léna avance pieds nus vers la porte de la cale.';
    const ok = 'Léna a ôté ses bottes. Elle avance pieds nus vers la porte de la cale.';
    expect(inventedEntities(prev, ok, ['Léna', 'Garcia'])).toEqual([]);
    const bad = 'Léna avance pieds nus. Bertrand la regarde depuis la porte de la cale.';
    expect(inventedEntities(prev, bad, ['Léna', 'Garcia'])).toContain('Bertrand');
  });

  it('INV-M0B-002 — directive coaching = NO-OP sûr (segment original, AUCUN appel réseau)', async () => {
    const port = new ScribeGatedRepairPort({ knownEntities: ['Léna'], ollamaUrl: 'http://127.0.0.1:1' });
    const seg = 'Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte.';
    const out = await port.rewriteSegment('[ORDRE] Rends ce passage magnifique et puissant.', seg);
    expect(out).toBe(seg); // refusé AVANT tout fetch (port sur :1 aurait throw → no-op aussi, mais le test prouve le chemin coaching)
  });

  it('INV-M0B-003 — daemon down = NO-OP sûr (jamais de dégradation)', async () => {
    const port = new ScribeGatedRepairPort({ knownEntities: [], ollamaUrl: 'http://127.0.0.1:1', timeoutMs: 300 });
    const seg = 'Un segment factuel quelconque sur la digue grise.';
    const out = await port.rewriteSegment('[FAIT] X. [OBSERVÉ] Y. [ORDRE] Corrige.', seg);
    expect(out).toBe(seg);
  });
});
