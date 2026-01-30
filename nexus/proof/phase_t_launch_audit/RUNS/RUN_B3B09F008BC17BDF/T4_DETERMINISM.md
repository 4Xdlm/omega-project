# T4_DETERMINISM
**STATUS**: FAIL
**RUN_ID**: B3B09F008BC17BDF

## SCOPE
Verify that test and build outputs are bit-for-bit reproducible across identical runs.

## ARTEFACTS
| File | Description | Path |
|------|-------------|------|
| triple_run_sha256.txt | SHA-256 hashes of all triple-run outputs | EVIDENCE/triple_run_sha256.txt |
| diff_tests_1v2_fc.txt | Binary diff run1 vs run2 tests | EVIDENCE/diff_tests_1v2_fc.txt |
| diff_tests_2v3_fc.txt | Binary diff run2 vs run3 tests | EVIDENCE/diff_tests_2v3_fc.txt |
| diff_tests_1v3_fc.txt | Binary diff run1 vs run3 tests | EVIDENCE/diff_tests_1v3_fc.txt |
| diff_build_1v2_fc.txt | Binary diff run1 vs run2 build | EVIDENCE/diff_build_1v2_fc.txt |
| timings.txt | Execution timings | EVIDENCE/timings.txt |

## FINDINGS

### F4.1 TRIPLE-RUN TEST OUTPUT HASHES (FAIL)
```
Run 1: 5A33DF8AF5F7E0FBE3EB3BE35FB72C4C503AFDB9BD292B77559946B4084C9CA4
Run 2: E30BAAEB23DC965134E7BAE40D92FC20BA9902C74D3FA1C892C24924EC2C059B
Run 3: 1D1703EC07ED4611D036BFB6F938B911BA20389009A0D4BA0F089AD6916C6DD9
```

**VERDICT**: ALL THREE HASHES DIFFER - NON-DETERMINISTIC OUTPUT
**Evidence**: EVIDENCE/triple_run_sha256.txt

### F4.2 TRIPLE-RUN BUILD OUTPUT HASHES (FAIL)
```
Run 1: 6D8D8F45021FB3515A7F8046A94C266B65C58B51C119CA02D5A1006E32A2E76C
Run 2: A42731B84D36A5C8E8025C0E1EC8284C8F6F5C62B19AB3424061D0947766BE12
Run 3: EBFBB2216F6990F7C948681A4034D76E9F089541E0EF74CA6A11F66F7FCAC4C7
```

**VERDICT**: ALL THREE HASHES DIFFER - NON-DETERMINISTIC OUTPUT
**Evidence**: EVIDENCE/triple_run_sha256.txt

### F4.3 ROOT CAUSE ANALYSIS
Diff analysis (diff_tests_1v2_fc.txt) shows byte-level differences starting at offset 0x227.
Converted hex differences indicate:
- Timestamps embedded in output (e.g., `[2026-01-30T20:45:40.826Z]`)
- Timing measurements varying between runs (e.g., `104ms` vs `123ms`)
- Test execution order variations
- ANSI escape codes with position-dependent values

**Example from test output**:
```
[2026-01-30T20:45:40.826Z] [CI] Checking phase declaration...
```
These timestamps cause hash divergence.

### F4.4 TIMING VARIANCE
| Run | Test Duration | Build Duration |
|-----|---------------|----------------|
| Run 1 | 42674ms | 1109ms |
| Run 2 | 41066ms | 1094ms |
| Run 3 | 41441ms | 1095ms |

**Variance**: ~1.6 seconds (~4%) across test runs
**Evidence**: EVIDENCE/timings.txt

### F4.5 DIFF FILE SIZE
The diff file (diff_tests_1v2_fc.txt) is 1.3MB, indicating extensive byte-level differences throughout the output.

### F4.6 DETERMINISM PARADOX
**IMPORTANT**: The application logic IS deterministic (verified by internal tests):
- "should produce identical rootHash with progress ON (20 runs)" - PASS
- "two identical runs produce identical output" - PASS
- "10 consecutive runs produce identical rootHash" - PASS

The non-determinism is in TEST OUTPUT FORMATTING (timestamps, timings), NOT in application behavior.

---

## UNPROVEN CLAIMS
- [ ] Test output is bit-for-bit reproducible - UNPROVEN (hashes differ)
- [ ] Build output is bit-for-bit reproducible - UNPROVEN (hashes differ)

---

**SECTION STATUS**: FAIL
**REASON**: Triple-run SHA-256 hashes differ across all runs for both test and build outputs. While application logic is deterministic (verified by internal tests), the test runner output contains timestamps and timing information that varies between runs, causing hash divergence.

**RECOMMENDATION**: To achieve deterministic output for audit purposes:
1. Strip timestamps from test output via reporter configuration
2. Normalize timing information
3. Use `--reporter=json` with post-processing to remove variable fields
4. Or accept that "deterministic behavior" != "deterministic test output"
