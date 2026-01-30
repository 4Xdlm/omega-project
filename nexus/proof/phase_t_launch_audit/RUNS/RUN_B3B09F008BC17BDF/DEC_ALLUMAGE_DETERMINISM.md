# DECISION — ALLUMAGE DETERMINISM ORACLE (C + A)

STATUS: PASS
DATE: 2026-01-30T22:25:58+01:00
RUN_ID: B3B09F008BC17BDF

PROBLEM (PROVEN)
- Test runner stdout is structurally non-deterministic under parallel execution (order + interleaving).
- Evidence:
  - EVIDENCE/diff_normv2_struct_1v2.txt  SHA-256: A6FEF07F9F4CFF0562B3D9A75C0AA7BCA8683243D6D9C59F045DE3B22850256F

ROOT CAUSES PROVEN:
- RC1: Test execution order varies between runs (parallel scheduling)
  - rc1_run1_lines13-17.txt  SHA256: 2C9FA327DF3176D05DB5554F00B7287AEF2776C47399C189F70638B6A4A6C51F
  - rc1_run2_lines13-17.txt  SHA256: 5FB6F09E565F73A49D1CFB129623229271DB1D1C447814DA795886694719C191
- RC2: Benchmark floating-point values vary (timing measurements)
  - rc2_run1_bench_block.txt  SHA256: C653C3B89BCBC180A37659A32B4F5326AEECA0B5055F56A806BA279CB00401BD
  - rc2_run2_bench_block.txt  SHA256: D2CF0C70118202FC8979F8815F62A62063C63229DE35414764AD20FFC41E8667
- RCX: Stdout interleaving from parallel workers (test results + benchmark output + CI logs mixed non-deterministically)
  - diff_normv2_struct_1v2.txt  SHA256: A6FEF07F9F4CFF0562B3D9A75C0AA7BCA8683243D6D9C59F045DE3B22850256F

OFFICIAL IGNITION CRITERIA (NON-NEGOTIABLE)
ORACLE-1 (MANDATORY): Structured, sortable test report (JSON/JUnit/TAP), canonically ordered, with volatile fields removed.
- PASS: triple-run => byte-identical report => single SHA-256
- FAIL: any hash divergence

ORACLE-2 (MANDATORY): Production artefact determinism (dist/ bundles or equivalent).
- PASS: triple-run build => byte-identical artefacts => single SHA-256
- FAIL: any hash divergence

ORACLE-3 (NON-BLOCKING): stdout runner
- Archived only. Never blocks ignition.

DECISION
- stdout hashing is removed as determinism oracle.
- Ignition determinism oracle = ORACLE-1 + ORACLE-2.

END.
