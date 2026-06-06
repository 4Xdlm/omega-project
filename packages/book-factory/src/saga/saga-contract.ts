/**
 * OMEGA Book-Factory — SAGA_CONTRACT (BF-08, BF-13) — promesses inter-tomes.
 *
 * FOUND_EXISTING : SAGA_CONTRACT spécifié MASTER_PLAN v2:827 (« cross-book
 * promises, binding ») — l'organe de l'INTERQUEL (CONCEPT-STYLE-CONTINUATION-001 :
 * « écrire un tome entre deux tomes sans jamais faire d'erreur »).
 *
 * DOCTRINE : P5 (C1) interdit de rejouer un journal sous le seed d'un autre
 * livre — le contrat est donc LE SEUL canal légal entre tomes : un document
 * EXPLICITE, hashé (binding), listant ce que le tome suivant DOIT honorer :
 *   - SEED_CARRYOVER  : graine non payée au tome N ⇒ à payer ensuite ;
 *   - CHARACTER_STATE : état figé fin de tome (alive/dead/statut) — un mort ne
 *     reparle pas au tome N+1 sans REVEAL planifié ;
 *   - FACT_BINDING    : fait canonique inviolable (lieu, événement fondateur).
 * checkContract = vérification CALC d'un manuscrit candidat contre le contrat
 * (violations typées avec evidence). Le hash du contrat est fusionnable au
 * génome (l'ADN d'une saga inclut ses promesses).
 */

import { sha256, canonicalize } from '@omega/canon-kernel';

import { err, ok, compareStrings } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export type SagaPromiseKind = 'SEED_CARRYOVER' | 'CHARACTER_STATE' | 'FACT_BINDING';
export type CharacterVital = 'ALIVE' | 'DEAD' | 'MISSING';

export type SagaPromise =
  | { readonly kind: 'SEED_CARRYOVER'; readonly seed: string; readonly plantedChapter: number; readonly detail: string }
  | { readonly kind: 'CHARACTER_STATE'; readonly name: string; readonly vital: CharacterVital; readonly detail: string }
  | { readonly kind: 'FACT_BINDING'; readonly subject: string; readonly fact: string };

export interface SagaContract {
  readonly schema: 'SAGA_CONTRACT_V1';
  readonly sagaId: string;
  readonly fromBookTitle: string;
  readonly promises: readonly SagaPromise[];
  /** Binding : sha256(canonicalize(payload sans hash)) — toute altération casse le sceau. */
  readonly contractHash: string;
}

export interface ContractViolation {
  readonly promise: SagaPromise;
  readonly kind: 'DEAD_CHARACTER_ACTS' | 'FACT_CONTRADICTED' | 'TAMPERED_CONTRACT';
  readonly evidence: string;
}

export interface ContractCheck {
  readonly violations: readonly ContractViolation[];
  readonly seedsCarried: readonly string[]; // graines du contrat PRÉSENTES dans le tome candidat
  readonly seedsStillUnpaid: readonly string[]; // toujours absentes (info, pas violation — dueBy=fin de saga)
}

export type ContractError = { readonly code: 'EMPTY_PROMISES' | 'HASH_MISMATCH'; readonly detail: string };

export interface ContractInput {
  readonly sagaId: string;
  readonly fromBookTitle: string;
  /** Graines non payées du tome (depuis le seedLedger). */
  readonly unpaidSeeds: readonly { readonly seed: string; readonly plantedChapter: number }[];
  /** États vitaux figés fin de tome (depuis le plan/registry — autorité humaine ou casting). */
  readonly characterStates: readonly { readonly name: string; readonly vital: CharacterVital; readonly detail: string }[];
  readonly facts: readonly { readonly subject: string; readonly fact: string }[];
}

/** Construit et SCELLE le contrat. Pur, déterministe (tris compareStrings). */
export function buildSagaContract(input: ContractInput): Result<SagaContract, ContractError> {
  const promises: SagaPromise[] = [
    ...[...input.unpaidSeeds]
      .sort((a, b) => compareStrings(a.seed, b.seed))
      .map((s): SagaPromise => ({ kind: 'SEED_CARRYOVER', seed: s.seed, plantedChapter: s.plantedChapter, detail: `graine « ${s.seed} » plantée ch.${s.plantedChapter}, non payée au tome 1` })),
    ...[...input.characterStates]
      .sort((a, b) => compareStrings(a.name, b.name))
      .map((c): SagaPromise => ({ kind: 'CHARACTER_STATE', name: c.name, vital: c.vital, detail: c.detail })),
    ...[...input.facts]
      .sort((a, b) => compareStrings(a.subject, b.subject))
      .map((f): SagaPromise => ({ kind: 'FACT_BINDING', subject: f.subject, fact: f.fact })),
  ];
  if (promises.length === 0) return err({ code: 'EMPTY_PROMISES', detail: 'un contrat vide ne lie rien' });
  const payload = { schema: 'SAGA_CONTRACT_V1' as const, sagaId: input.sagaId, fromBookTitle: input.fromBookTitle, promises };
  return ok({ ...payload, contractHash: String(sha256(canonicalize(payload))) });
}

/** Vérifie l'intégrité du sceau (anti-tampering) avant tout usage. */
export function verifyContractSeal(contract: SagaContract): boolean {
  const { contractHash, ...payload } = contract;
  return String(sha256(canonicalize(payload))) === contractHash;
}

/** Incises de parole — un mort qui PARLE est la violation canonique. */
const SPEAK_RE = (name: string): RegExp =>
  new RegExp(`(?:dit|lança|murmura|souffla|répondit|répliqua|reprit|demanda|cria|chuchota|ajouta)\\s+${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?!\\p{L})|${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\s+(?:dit|déclara|répondit|s'exclama)`, 'u');

/**
 * Vérifie un manuscrit candidat (tome suivant/interquel) contre le contrat.
 * CALC pur. Un contrat au sceau cassé ⇒ TAMPERED (aucune autre vérification).
 */
export function checkContract(contract: SagaContract, candidateProse: string): Result<ContractCheck, ContractError> {
  if (!verifyContractSeal(contract)) {
    return err({ code: 'HASH_MISMATCH', detail: 'sceau du contrat invalide — contrat altéré, vérification refusée' });
  }
  const text = candidateProse.normalize('NFC');
  const lower = text.toLowerCase();
  const violations: ContractViolation[] = [];
  const seedsCarried: string[] = [];
  const seedsStillUnpaid: string[] = [];

  for (const p of contract.promises) {
    switch (p.kind) {
      case 'SEED_CARRYOVER': {
        const re = new RegExp(`(?<!\\p{L})${p.seed.toLowerCase()}(?!\\p{L})`, 'u');
        if (re.test(lower)) seedsCarried.push(p.seed);
        else seedsStillUnpaid.push(p.seed);
        break;
      }
      case 'CHARACTER_STATE': {
        if (p.vital === 'DEAD' && SPEAK_RE(p.name).test(text)) {
          const m = SPEAK_RE(p.name).exec(text);
          const idx = m?.index ?? 0;
          violations.push({
            promise: p, kind: 'DEAD_CHARACTER_ACTS',
            evidence: `« ${text.slice(Math.max(0, idx - 40), idx + 60).replace(/\s+/gu, ' ')} » — ${p.name} est DEAD au contrat (${p.detail})`,
          });
        }
        break;
      }
      case 'FACT_BINDING': {
        // V1 : contradiction par NÉGATION DIRECTE du fait (proxy strict — un fait
        // contredit subtilement échappe ; documenté, ADVISORY pour le reste).
        const negRe = new RegExp(`(?:jamais|aucun|pas de)\\s+(?:\\p{L}+\\s+){0,3}${p.subject.toLowerCase().replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'u');
        if (negRe.test(lower)) {
          violations.push({ promise: p, kind: 'FACT_CONTRADICTED', evidence: `négation directe de « ${p.subject} » détectée (fait lié : ${p.fact.slice(0, 60)})` });
        }
        break;
      }
      default: {
        const never: never = p;
        throw new Error(`promesse inconnue: ${JSON.stringify(never)}`);
      }
    }
  }
  return ok({ violations, seedsCarried, seedsStillUnpaid });
}
