# LFS Releases Status
Generated: 2026-01-27T16:50:00Z

## Status: MIGRATED

## Files Migrated

| File | Size | LFS Status |
|------|------|------------|
| releases/v1.7.0-INDUSTRIAL/OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.exe | 3.77 MB | ✅ In LFS |
| releases/v1.7.0-INDUSTRIAL/OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.msi | 5.55 MB | ✅ In LFS |
| releases/v1.7.0-INDUSTRIAL/SHA256SUMS.txt | text | Not LFS (text file) |

## LFS Configuration

```
*.exe filter=lfs diff=lfs merge=lfs -text
*.msi filter=lfs diff=lfs merge=lfs -text
```

## Verification Command

```bash
git lfs ls-files | grep releases
```

## Output

```
c3f0a31d51 * releases/v1.7.0-INDUSTRIAL/OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.exe
831801834d * releases/v1.7.0-INDUSTRIAL/OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.msi
```

## Commit
`2218ac6` - chore(lfs): add msi binaries to Git LFS tracking

## Notes
- .exe was already in LFS from previous cleanup (LOT-1)
- .msi added in this phase
- Combined savings: ~9.3 MB of binary data in LFS
