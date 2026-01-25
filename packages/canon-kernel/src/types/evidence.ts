/**
 * OMEGA Canon Kernel — Evidence Types
 * Evidence provides provenance and traceability for all operations.
 */

export type EvidenceType =
  | 'file'           // File reference
  | 'url'            // URL reference
  | 'hash'           // Content hash
  | 'signature'      // Cryptographic signature
  | 'timestamp'      // Trusted timestamp
  | 'oracle'         // Oracle attestation
  | 'human'          // Human attestation
  | 'gate_approval'; // Gate approval record

export interface EvidenceRef {
  readonly type: EvidenceType;
  readonly path: string;           // Canonical path/identifier
  readonly description: string;    // Human-readable description
  readonly hash?: string;          // Optional content hash
  readonly metadata?: Readonly<Record<string, unknown>>; // Additional metadata
}

export function createEvidenceRef(
  type: EvidenceType,
  path: string,
  description: string,
  hash?: string,
  metadata?: Record<string, unknown>
): EvidenceRef {
  return {
    type,
    path,
    description,
    ...(hash !== undefined && { hash }),
    ...(metadata !== undefined && { metadata: Object.freeze({ ...metadata }) }),
  };
}

export function sortEvidenceRefs(refs: readonly EvidenceRef[]): readonly EvidenceRef[] {
  return [...refs].sort((a, b) => a.path.localeCompare(b.path));
}
