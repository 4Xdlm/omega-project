# HASH_MANIFEST_v3.60.0.md
## OMEGA Master Dossier — Hashes de Référence

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   OMEGA HASH MANIFEST v3.60.0                                                 ║
║   Date: 2026-01-11                                                            ║
║   Status: CERTIFIED                                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. ZIPs PHASES 26-28.5 (VÉRIFIÉS)

| Phase | ZIP | SHA-256 |
|-------|-----|---------|
| 26 | OMEGA_SENTINEL_SUPREME_PHASE_26_FINAL.zip | `99d44f3762538e7907980d3f44053660426eaf189cafd2bf55a0d48747c1a69e` |
| 27 | OMEGA_PHASE_27_FINAL.zip | `da7c6f2c4553d542c6c9a22daa2df71b8924f8d88486d374ed9cbf8be0f8f8a0` |
| 28 | OMEGA_GENOME_PHASE28_FINAL.zip | `6bc5433ac9d3936aa13a899afeb3387f6921c56191539a6f544a09c5f7087d86` |
| 28.5 | OMEGA_SENTINEL_SPRINT28_5.zip | `bc1dc1dd46e62fd6421412ee0e35d96f17627089cac1835312895fcce8a07982` |

---

## 2. GOLDEN HASHES (MODULES)

| Module | Version | SHA-256 |
|--------|---------|---------|
| Genome Golden Canonical | v1.2.0 | `172f970a3b2bb5713743d0cd3ecf2d7537699cba5694a3e6946b786f5e213252` |

---

## 3. MASTER DOSSIER VERSIONS

| Version | Date | SHA-256 |
|---------|------|---------|
| v3.28.0 | 2026-01-07 | `cd5c1c39ca652cff9952c4aa334a8042824645232719a22b7a1ee6b921999bab` |
| v3.60.0 | 2026-01-11 | *(voir OMEGA_MASTER_DOSSIER_v3.60.0_SHA256.txt externe)* |

**Note**: Le hash du ZIP v3.60.0 ne peut pas être stocké dans ce fichier car il est
inclus dans le ZIP lui-même (auto-référence cryptographique impossible).
Utilisez le fichier `OMEGA_MASTER_DOSSIER_v3.60.0_SHA256.txt` pour vérification.

---

## 4. PHASE 29 DOCUMENTS (MYCELIUM GATE)

| Document | SHA-256 |
|----------|---------|
| DNA_INPUT_CONTRACT.md | `1b25e14e9391b313b73674b1068c0a555d66828d8c8d2acf053ed8a5cb792207` |
| MYCELIUM_INVARIANTS.md | `1d7bc5e61262ea6d249d668a95e3819332d590e282277f036ba3976f090e001a` |
| MYCELIUM_REJECTION_CATALOG.md | `1012e38e8ef34d158e9dfbddc9331fb219f9c597447c92e9d4d777ed58a81264` |
| BOUNDARY_MYCELIUM_GENOME.md | `3af1918c329c2a958778c3b86af2d556de3d7ff42c68c64075f41da1f6dfb2a3` |
| MYCELIUM_VALIDATION_PLAN.md | `c7ef81fe462406422a5bf08c04c3dc79ae9701cba371f847bdc726775b082b29` |
| MYCELIUM_TEST_CATEGORIES.md | `5d295433f30663b2d24c103d4878da368f6f9636e52592025c9b25e3ef490844` |
| MYCELIUM_PROOF_REQUIREMENTS.md | `f3349d74e08776cec2e2e3efcef2421944536195af805180d27e75fc3d31d8ac` |

---

## 5. GIT REFERENCES

| Type | Value |
|------|-------|
| Branch | master |
| Commit (Phase 60) | ee3eac7 |
| Tag GOLD Cycle 29-42 | v3.46.0-GOLD |
| Tag GOLD Cycle 43-60 | v3.60.0-GOLD-CYCLE43 |

---

## 6. SENTINEL INTEGRATION (Sprint 28.5)

| Composant | SHA-256 |
|-----------|---------|
| Inventory (after integration) | `78f03f690883bae27983f580fab69e375aa4af05016498c7f390fb67b54bae06` |
| Corpus (after integration) | `54ad9dd80b09152bfc483dcd20cecce834d4b69e36e54ec8d75b5dc1bbf17ba4` |

---

## 7. VERIFICATION COMMANDS

### PowerShell (Windows)
```powershell
Get-FileHash -Algorithm SHA256 "<file>"
```

### Bash (Linux)
```bash
sha256sum <file>
```

---

**FIN DU MANIFEST**
