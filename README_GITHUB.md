# OMEGA Notarial Certification - GitHub Actions

## Structure

```
omega-project/
├── .github/
│   └── workflows/
│       └── omega_notarial.yml       # GitHub Actions workflow
├── scripts/
│   └── omega_notarial_runner.ps1    # Test runner (50 tests)
├── requests/                         # JSON request templates
├── omega-bridge-win.exe             # YOUR BINARY (add this!)
└── README_GITHUB.md
```

## Setup

1. **Copy these files to your repo**
2. **Add your binary** `omega-bridge-win.exe` to the root
3. **Push to GitHub**

```powershell
git add .
git commit -m "Add OMEGA notarial certification"
git push
```

## What happens

- GitHub Actions runs on `windows-latest` (Microsoft runner = neutral third party)
- 50 aerospace-grade tests execute
- Evidence is collected and uploaded as artifact
- Build provenance attestation is generated
- Results are logged with SHA-256 hashes

## Evidence Produced

After each run, download the artifact `omega-notarial-evidence-{run_number}`:

```
evidence/
├── manifest.json        # Test run metadata
├── results.json         # 50 test results
├── run.log              # Execution log
├── requests/            # JSON inputs used
├── responses/           # JSON outputs received
├── hashes.sha256        # SHA-256 of all files
└── github_manifest.json # GitHub-specific metadata
```

## Verification

Anyone can verify:
1. The runner is Microsoft's (not yours)
2. The binary hash matches
3. All 50 tests passed
4. Timestamps are from GitHub

**This is indisputable third-party proof.**
