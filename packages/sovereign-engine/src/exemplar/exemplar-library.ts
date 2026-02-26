/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — EXEMPLAR LIBRARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: exemplar/exemplar-library.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * INV-EXEMP-01: diversité_cosinus(E1,E2,E3) ≥ 0.25 à chaque sélection
 *   (empêche convergence monolithique)
 * INV-EXEMP-02: cosine_similarity(packet_14D, exemplar) ≥ 0.60
 *   (pertinence minimale — warning si non atteignable)
 * INV-EXEMP-03: Cache déterministe — même packet → mêmes exemplars toujours
 * INV-EXEMP-04: Governance ajout — non-duplication (sim > 0.95 → throw),
 *   hash + run_id + shape_tag obligatoires
 *
 * Source: OMEGA_CONVERGENCE_W0_LOCKED — ChatGPT v3 (doc 8) + Gemini v2 (doc 6)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'node:crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExemplarEntry {
  readonly id: string;               // UUID
  readonly run_id: string;           // run d'origine
  readonly shape: string;            // NarrativeShape
  readonly profile_14d: readonly number[];  // vecteur 14 dimensions
  readonly prose_hash: string;       // SHA-256 de la prose
  readonly composite: number;        // score composite SEAL (≥92)
  readonly annotations: readonly string[]; // [temps_dilaté, no-return, corps, sens→label]
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATH INTERNE — cosine similarity
// ═══════════════════════════════════════════════════════════════════════════════

function cosine(a: readonly number[], b: readonly number[]): number {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const nA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return nA === 0 || nB === 0 ? 0 : dot / (nA * nB);
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLAR LIBRARY — classe principale
// ═══════════════════════════════════════════════════════════════════════════════

export class ExemplarLibrary {
  private entries: ExemplarEntry[] = [];
  private cache = new Map<string, readonly string[]>(); // packet_hash → exemplar_ids

  /**
   * INV-EXEMP-04: Governance d'ajout
   *
   * Vérifie:
   * - Non-duplication: si cosine(existing, new) > 0.95 → throw
   * - hash + run_id + shape obligatoires (validé par TypeScript)
   * - Invalide le cache après ajout (déterminisme garanti)
   */
  addExemplar(entry: ExemplarEntry): void {
    // Validation champs obligatoires
    if (!entry.id || !entry.run_id || !entry.shape) {
      throw new Error('[INV-EXEMP-04] Champs obligatoires manquants: id, run_id, shape requis');
    }
    if (!entry.prose_hash) {
      throw new Error('[INV-EXEMP-04] prose_hash obligatoire');
    }
    if (!entry.profile_14d || entry.profile_14d.length !== 14) {
      throw new Error(`[INV-EXEMP-04] profile_14d doit avoir 14 dimensions, got ${entry.profile_14d?.length ?? 0}`);
    }

    // INV-EXEMP-04: non-duplication cosinus > 0.95
    for (const e of this.entries) {
      const sim = cosine(e.profile_14d, entry.profile_14d);
      if (sim > 0.95) {
        throw new Error(
          `[INV-EXEMP-04] Duplication cosinus détectée (sim=${sim.toFixed(4)} > 0.95) avec exemplar '${e.id}'`,
        );
      }
    }

    // Normalise le prose_hash (double hash pour traçabilité)
    const normalizedEntry: ExemplarEntry = {
      ...entry,
      prose_hash: sha256Hex(entry.prose_hash),
    };

    this.entries.push(normalizedEntry);
    this.cache.clear(); // invalider le cache — INV-EXEMP-03
  }

  /**
   * INV-EXEMP-01/02/03: Sélection dynamique par cosine profil 14D
   *
   * Retourne:
   * - Top-1: exemplar le plus pertinent (cosine max avec packet)
   * - Top-2 et Top-3: exemplars diversifiés (diversité cosinus ≥ 0.25)
   *
   * INV-EXEMP-02: warn si max similarity < 0.60 (enrichissement requis)
   * INV-EXEMP-03: cache déterministe par packet_hash
   *
   * @param packet_14d - Profil émotionnel 14D du packet courant
   * @param count      - Nombre d'exemplars voulu (défaut: 3)
   */
  selectForPacket(packet_14d: readonly number[], count = 3): readonly ExemplarEntry[] {
    if (this.entries.length === 0) return [];

    // INV-EXEMP-03: cache déterministe
    const packetHash = sha256Hex(packet_14d.join(',')).slice(0, 16);

    if (this.cache.has(packetHash)) {
      const ids = this.cache.get(packetHash)!;
      return ids.map((id) => this.entries.find((e) => e.id === id)!).filter(Boolean);
    }

    // Trier par similarité cosinus descendante
    const sorted = this.entries
      .map((e) => ({ entry: e, sim: cosine(packet_14d, e.profile_14d) }))
      .sort((a, b) => b.sim - a.sim);

    // INV-EXEMP-02: warn si pertinence insuffisante
    if (sorted[0] && sorted[0].sim < 0.60) {
      console.warn(
        `[INV-EXEMP-02] max similarity=${sorted[0].sim.toFixed(4)} < 0.60 — enrichir la bibliothèque SEAL`,
      );
    }

    // Top-1 pertinent
    const selected: ExemplarEntry[] = sorted.length ? [sorted[0].entry] : [];

    // Top-2 et + diversifiés: diversité cosinus ≥ 0.25 entre chaque paire
    for (let i = 1; selected.length < count && i < sorted.length; i++) {
      const candidate = sorted[i].entry;

      // INV-EXEMP-01: distance = 1 - cosine ≥ 0.25 avec tous les déjà sélectionnés
      const minDiversity = Math.min(
        ...selected.map((s) => 1 - cosine(s.profile_14d, candidate.profile_14d)),
      );

      if (minDiversity >= 0.25) {
        selected.push(candidate);
      }
    }

    // INV-EXEMP-03: stocker dans le cache
    this.cache.set(packetHash, selected.map((e) => e.id));

    return selected;
  }

  /**
   * Retourne le nombre d'exemplars dans la bibliothèque.
   */
  size(): number {
    return this.entries.length;
  }

  /**
   * Vide la bibliothèque et le cache (pour tests).
   */
  clear(): void {
    this.entries = [];
    this.cache.clear();
  }

  /**
   * Expose les entrées pour inspection (lecture seule).
   */
  getEntries(): readonly ExemplarEntry[] {
    return this.entries;
  }
}
