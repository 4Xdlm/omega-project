# DET_03_SEEDED_PRNG_AUDIT.md

## SeededPRNG Usage (37 occurrences)

- `gateway\tests\hardening\hardening_checks.test.ts:143: '/src/good.ts': 'const rand = seedrandom(seed)();',`
- `OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:94: export function createSeededRandom(seed: number): () => number {`
- `OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:109: const random = createSeededRandom(seed);`
- `OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:182: const random = createSeededRandom(seed);`
- `OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:472: const random = createSeededRandom(seed);`
- `OMEGA_SENTINEL_SUPREME\sentinel\self\index.ts:78: createSeededRandom,`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:42: createSeededRandom,`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:101: describe('createSeededRandom', () => {`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:103: const random1 = createSeededRandom(42);`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:104: const random2 = createSeededRandom(42);`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:113: const random1 = createSeededRandom(42);`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:114: const random2 = createSeededRandom(43);`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:123: const random = createSeededRandom(12345);`
- `OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:136: const random = createSeededRandom(42);`
- `packages\orchestrator-core\src\util\prng.ts:44: export class SeededPRNG implements PRNG {`
- `packages\orchestrator-core\src\util\prng.ts:67: this.state = (SeededPRNG.A * this.state + SeededPRNG.C) % SeededPRNG.M;`
- `packages\orchestrator-core\src\util\prng.ts:68: return this.state / SeededPRNG.M;`
- `packages\orchestrator-core\src\util\prng.ts:110: * @returns SeededPRNG instance`
- `packages\orchestrator-core\src\util\prng.ts:113: return new SeededPRNG(seed);`
- `packages\orchestrator-core\src\util\prng.ts:119: * @returns SeededPRNG instance`
- `packages\orchestrator-core\src\util\prng.ts:124: return new SeededPRNG(isNaN(seed) ? DEFAULT_PRNG_SEED : seed);`
- `packages\orchestrator-core\src\index.ts:62: SeededPRNG,`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:94: export function createSeededRandom(seed: number): () => number {`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:109: const random = createSeededRandom(seed);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:182: const random = createSeededRandom(seed);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\self\falsify-runner.ts:472: const random = createSeededRandom(seed);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\self\index.ts:78: createSeededRandom,`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:42: createSeededRandom,`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:101: describe('createSeededRandom', () => {`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:103: const random1 = createSeededRandom(42);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:104: const random2 = createSeededRandom(42);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:113: const random1 = createSeededRandom(42);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:114: const random2 = createSeededRandom(43);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:123: const random = createSeededRandom(12345);`
- `sprint28_5\OMEGA_SENTINEL_SUPREME\sentinel\tests\falsification-runner.test.ts:136: const random = createSeededRandom(42);`
- `src\orchestrator\forge-adapter.ts:83: function createSeededRandom(seed: number): () => number {`
- `src\orchestrator\forge-adapter.ts:115: const random = createSeededRandom(seed);`

