/**
 * C3 — MemoryLayerACL : INV-MEM-ACL-001..005 (read-only par absence, era-pin,
 * déterminisme hashé, tiers, digest borné, snapshot).
 */
import { describe, expect, it } from 'vitest';

import {
  buildReferenceWorldModel,
  MemoryLayerACL,
  REFERENCE_PIN,
} from '../../src/acl/memory-layer-acl.js';
import type { EntityKey, WorldModelReadPort } from '../../src/acl/acl-types.js';

const K = (s: string): EntityKey => s as EntityKey;

function worldModel() {
  return buildReferenceWorldModel([
    { key: K('char.lena'), tier: 'HOT', payloads: ['Léna au phare', 'Léna trouve le carnet humide'] },
    { key: K('char.gaspard'), tier: 'WARM', payloads: ['Gaspard gardien depuis vingt ans'] },
    { key: K('place.ker-morvan'), tier: 'COLD', payloads: ['Village de Ker-Morvan, granit et embruns, fondé sous les tempêtes du siècle dernier'] },
  ]);
}

function attach() {
  const r = MemoryLayerACL.attach(worldModel(), REFERENCE_PIN);
  if (!r.ok) throw new Error('attach attendu');
  return r.value;
}

describe('C3 — MemoryLayerACL', () => {
  it('INV-MEM-ACL-003 era-pin : fournisseur difforme ⇒ ERA_DRIFT typé (jamais de suppose)', () => {
    const broken = { tierOf: () => 'HOT' } as unknown as WorldModelReadPort;
    const r = MemoryLayerACL.attach(broken, REFERENCE_PIN);
    expect(!r.ok && r.error.code === 'ERA_DRIFT' && r.error.missing.includes('entriesOf')).toBe(true);
  });

  it('INV-MEM-ACL-001 read-only PAR ABSENCE : le type n’expose aucune écriture (niveau type)', () => {
    const acl = attach();
    // @ts-expect-error — aucune méthode write/set/append n'existe sur MemoryLayerACL
    acl.write;
    expect(typeof (acl as unknown as Record<string, unknown>)['write']).toBe('undefined');
  });

  it('tiers : HOT visible en queryHot ; WARM seulement en queryWarm ; COLD ni l’un ni l’autre', () => {
    const acl = attach();
    const hot = acl.queryHot(K('char.lena'));
    const warmOnHot = acl.queryWarm(K('char.lena'));
    const warm = acl.queryWarm(K('char.gaspard'));
    const hotOnWarm = acl.queryHot(K('char.gaspard'));
    const coldWarm = acl.queryWarm(K('place.ker-morvan'));
    expect(hot.ok && hot.value.entries.length).toBe(2);
    expect(warmOnHot.ok && warmOnHot.value.entries.length).toBe(2); // warm ⊇ hot
    expect(warm.ok && warm.value.entries.length).toBe(1);
    expect(hotOnWarm.ok && hotOnWarm.value.entries.length).toBe(0); // warm ∉ vue hot
    expect(coldWarm.ok && coldWarm.value.entries.length).toBe(0); // cold ∉ vue court-terme
  });

  it('INV-MEM-ACL-004 déterminisme : même requête ⇒ même resultHash (×3, deux instances)', () => {
    const a = attach();
    const b = attach();
    const h1 = a.queryHot(K('char.lena'));
    const h2 = a.queryHot(K('char.lena'));
    const h3 = b.queryHot(K('char.lena'));
    expect(h1.ok && h2.ok && h3.ok && h1.value.resultHash === h2.value.resultHash && h2.value.resultHash === h3.value.resultHash).toBe(true);
  });

  it('digest COLD borné : budget respecté AU MOT, troncature DÉCLARÉE, sources tracées', () => {
    const acl = attach();
    const d = acl.queryColdDigest(K('place.ker-morvan'), 5);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.value.summary).toContain('mots élidés'); // jamais de perte silencieuse
      expect(d.value.summary.split('…')[0]?.trim().split(/\s+/u).length).toBeLessThanOrEqual(5);
      expect(d.value.sourceEntryIds.length).toBe(1);
    }
  });

  it('clé inconnue ⇒ UNKNOWN_KEY typé ; snapshot : compte exact + hash stable (×2)', () => {
    const acl = attach();
    const bad = acl.queryHot(K('char.fantome'));
    expect(!bad.ok && bad.error.code === 'UNKNOWN_KEY').toBe(true);
    const s1 = attach().snapshot();
    const s2 = attach().snapshot();
    expect(s1.entryCount).toBe(4);
    expect(s1.stateHash).toBe(s2.stateHash);
    expect(s1.snapshotId.startsWith('wmsnap_')).toBe(true);
  });
});
