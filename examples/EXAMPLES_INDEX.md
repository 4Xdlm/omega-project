# OMEGA Examples

## Intents

| File | Type | Description |
|------|------|-------------|
| intents/intent_quickstart.json | Happy path | Standard 5-paragraph narrative |
| intents/intent_minimal.json | Happy path | Minimal 3-paragraph narrative |
| intents/intent_hostile.json | Hostile | Injection/XSS/path traversal attempt |

## Runs

| Directory | Intent | Seed | Status | Final Hash |
|-----------|--------|------|--------|------------|
| runs/run_quickstart/ | intent_quickstart | omega-quickstart-v1 | COMPLETE | `65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a` |
| runs/run_minimal/ | intent_minimal | omega-minimal-v1 | COMPLETE | `a42c67752537722fadfd8e604f853a4d80392181913cba0c126a837890832d6b` |
| runs/run_hostile_rejected/ | intent_hostile | omega-hostile-v1 | NOT REJECTED (NCR) | `420189e0f57b087b56916ab313294da89e9c3761ec9ad3e79db62a9f4257fcd7` |

Note: All runs complete all 6 stages. Forge verdict is "FAIL" because mock generators
produce zero-scored emotional trajectories. This is by design — see Known Limitations.
The pipeline and ProofPack integrity chain are valid regardless of forge verdict.

## Verification

All runs are verifiable via:
```bash
npx tsx packages/omega-runner/src/cli/main.ts verify --dir examples/runs/run_quickstart/runs/53729082510e692d --strict
npx tsx packages/omega-runner/src/cli/main.ts verify --dir examples/runs/run_minimal/runs/abfaf1c75efa5fe6 --strict
```

Both return exit code 0 (VERIFY PASS).

## Determinism Proof

Run `run_quickstart` was executed twice with seed `omega-quickstart-v1`.
Both runs produced identical hashes:

| Artifact | SHA-256 |
|----------|---------|
| intent.json | `f4271ca7cc414123925da0d2053b40ff0d3aa4525f3a17bfe53af04677b15884` |
| genesis-plan.json | `9b494811e3ab172cb5422bfe407d64150bfb56024bd9891b79df8802234a5ed4` |
| scribe-output.json | `5aed70a4abaedd3cc4488f46691cd220e8c7fa1a9501b1638c58338acdfe79e4` |
| styled-output.json | `1d79fb3aec63e9199345b151905bee741a0f97113dbaa5836e71f9460d078078` |
| creation-result.json | `b43a6b72cbfe7aad8ef3475a54b6997ab159332cdbdf01d0babce335024a611e` |
| forge-report.json | `633941d1e119c0d7358e031a15938fe261c3dfc6272709f6241867f0db76634e` |
| **final_hash** | **`65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a`** |
| **merkle_root** | **`db6a1a34cc18e719cfab08bba7545b273f732390ed4bd8ed54fd27df05c8492d`** |

Replay run deleted after verification. Determinism: **PROVEN**.

## Hostile Intent Files

| File | Attack | Description |
|------|--------|-------------|
| intents/hostile/atk05_extreme_paragraphs.json | ATK-05 | 999999 paragraphs |
| intents/hostile/atk06_empty_intent.json | ATK-06 | Empty JSON object |
| intents/hostile/atk07_malformed.json | ATK-07 | Invalid JSON syntax |
| intents/hostile/atk09_unicode_adversarial.json | ATK-09 | Zero-width + RTL chars |

See [ATTACK_CATALOG.md](ATTACK_CATALOG.md) for full results.
