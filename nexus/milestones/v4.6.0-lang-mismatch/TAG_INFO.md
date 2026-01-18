# OMEGA v4.6.0-lang-mismatch

## Tag Info
- Tag: v4.6.0-lang-mismatch
- TagRef: refs/tags/v4.6.0-lang-mismatch
- CapabilityCommit: 12dd3809741b8dd6421f4bc1ef44b3494b962d91
- Date: 2026-01-18T02:20:00+01:00

## Capabilities
- warnings: adds LANG_MISMATCH (heuristic)
- qualityScore: -0.40 penalty if LANG_MISMATCH triggered
- Applies to JSON + Markdown outputs

## Verification
- nexus/user_imputs/test_es.txt --lang de => LANG_MISMATCH, qualityScore ~0.6
- nexus/user_imputs/test_de_emotional.txt --lang de => no warning, qualityScore 1.0

## Metrics
- Tests: 1389 passed
- FROZEN: packages/genome + packages/mycelium untouched
