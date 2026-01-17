# OMEGA RESTORE PROCEDURE

## Prerequisites

- Node.js 18+
- Git
- unzip (or equivalent)

## Option A: From Git Archive (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/4Xdlm/omega-project.git
cd omega-project

# 2. Checkout certified version
git checkout v3.160.0-CHAPTER-6-GENESIS

# 3. Generate archive (identical to certified)
git archive --format=zip --prefix=omega-v3.160.0/ -o omega-v3.160.0.zip HEAD

# 4. Verify hash
sha256sum omega-v3.160.0.zip
# Expected: 35522a4fba5501f700927b44ac2ca4d30d4c12174c02c1df965dff3834485605

# 5. Install dependencies
npm install

# 6. Run tests
npm test  # Must show: 1389 passed
```

## Option B: From Existing Archive (Offline)

```bash
# 1. Verify integrity
sha256sum omega-v3.160.0.zip
# Must match: 35522a4fba5501f700927b44ac2ca4d30d4c12174c02c1df965dff3834485605

# 2. Extract
unzip omega-v3.160.0.zip
cd omega-v3.160.0

# 3. Install dependencies
npm install

# 4. Verify
npm test  # Must show: 1389 passed
```

## Option C: Direct Git Clone (Online)

```bash
# 1. Clone
git clone https://github.com/4Xdlm/omega-project.git
cd omega-project

# 2. Checkout certified tag
git checkout v3.160.0-CHAPTER-6-GENESIS

# 3. Install & verify
npm install
npm test  # Must show: 1389 passed
```

## Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Archive hash | `sha256sum omega-v3.160.0.zip` | 35522a4f... |
| Tests pass | `npm test` | 1389 passed |
| FROZEN modules present | `ls packages/genome packages/mycelium` | Both exist |
| STATE_OF_TRUTH readable | `cat nexus/proof/chapter6/STATE_OF_TRUTH.md` | Document displays |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hash mismatch | Re-download or regenerate archive from tag |
| Tests fail | Verify Node.js version (18+), clean install |
| Missing modules | Ensure complete extraction, no partial download |

## Contact

- Repository: https://github.com/4Xdlm/omega-project
- Authority: STATE_OF_TRUTH.md
