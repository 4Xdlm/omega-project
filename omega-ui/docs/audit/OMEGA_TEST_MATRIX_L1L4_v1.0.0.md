# OMEGA — MATRICE TESTS L1-L4
# Version: 1.0.0 | Date: 2026-01-01 | Total: 265 tests

## LEGENDE NIVEAUX
| Niveau | Nom | Description |
|--------|-----|-------------|
| L1 | Unit | Fonction isolee, mock dependencies |
| L2 | Integration | Modules combines, vraies I/O |
| L3 | Regression | Non-regression sur fixtures/golden |
| L4 | Invariant | Preuve formelle des invariants core |

---

## SYNTHESE PAR MODULE

| Module | L1 | L2 | L3 | L4 | Total | Tag |
|--------|----|----|----|----|-------|-----|
| CANON v1 | 35 | 12 | 6 | 4 | 57 | CANON_v1.0.0-CERTIFIED |
| VOICE v1 | 45 | 20 | 8 | 5 | 78 | VOICE_v1.0.0-CERTIFIED |
| VOICE_HYBRID v2 | 42 | 15 | 5 | 3 | 65 | VOICE_HYBRID_v2.0.0-INTEGRATED |
| Autres (legacy) | 50 | 10 | 3 | 2 | 65 | — |
| **TOTAL** | **172** | **57** | **22** | **14** | **265** | — |

---

## MODULE: CANON v1.0.0-CERTIFIED (57 tests)

### L1 — Unit Tests (35)
| Fichier | Tests | Description |
|---------|-------|-------------|
| store.rs | 20 | CRUD facts, validation |
| contract.rs | 10 | Types, enums, defaults |
| guard.rs | 5 | Access control |

### L2 — Integration Tests (12)
| Fichier | Tests | Description |
|---------|-------|-------------|
| store.rs | 8 | JSON persistence roundtrip |
| guard.rs | 4 | Multi-module interaction |

### L3 — Regression Tests (6)
| Fichier | Tests | Description |
|---------|-------|-------------|
| store.rs | 6 | Golden fixtures, edge cases |

### L4 — Invariant Tests (4)
| Test | Invariant | Iterations |
|------|-----------|------------|
| invcore_01_determinism_absolute | INVCORE-01 | 1000x |
| invcore_02_no_false_positive | INVCORE-02 | 500x |
| invcore_03_user_priority | INVCORE-03 | 100x |
| invcore_04_hard_lock_inviolable_1000x | INVCORE-04 | 1000x |

---

## MODULE: VOICE v1.0.0-CERTIFIED (78 tests)

### L1 — Unit Tests (45)
| Fichier | Tests | Description |
|---------|-------|-------------|
| core_stats.rs | 25 | Metrics calculation |
| contract.rs | 15 | Types, VoiceDimension |
| analyzer.rs | 5 | Text processing |

### L2 — Integration Tests (20)
| Fichier | Tests | Description |
|---------|-------|-------------|
| core_stats.rs | 12 | Full analysis pipeline |
| contract.rs | 8 | Profile creation flow |

### L3 — Regression Tests (8)
| Fichier | Tests | Description |
|---------|-------|-------------|
| core_stats.rs | 8 | Golden texts, known outputs |

### L4 — Invariant Tests (5)
| Test | Invariant | Iterations |
|------|-----------|------------|
| voice_determinism | INV-CORE-05 | 1000x |
| metrics_bounded | INV-EMO-01 | 500x |
| schema_version_u32 | Type safety | 100x |
| dimension_order | D1-D8 stable | 100x |
| profile_hash_64 | Hash format | 100x |

---

## MODULE: VOICE_HYBRID v2.0.0-INTEGRATED (65 tests)

### L1 — Unit Tests (42)
| Fichier | Tests | Description |
|---------|-------|-------------|
| prompt_builder.rs | 10 | Guidance construction, hash |
| replay_store.rs | 12 | Path validation, normalization |
| scoring.rs | 6 | Compliance calculation |
| errors.rs | 4 | Error codes, display |
| canon_mapping.rs | 3 | Entity IDs, keys |
| mock_provider.rs | 5 | Provider simulation |
| policy.rs | 2 | Policy validation |

### L2 — Integration Tests (15)
| Fichier | Tests | Description |
|---------|-------|-------------|
| hybrid.rs | 6 | Analyzer orchestration |
| canon_bridge.rs | 4 | CANON write flow |
| replay_store.rs | 5 | JSON file roundtrip |

### L3 — Regression Tests (5)
| Fichier | Tests | Description |
|---------|-------|-------------|
| prompt_builder.rs | 2 | Deterministic 100 runs |
| replay_store.rs | 2 | Tamper detection |
| scoring.rs | 1 | Identical profiles |

### L4 — Invariant Tests (3)
| Test | Invariant | Iterations |
|------|-----------|------------|
| prompt_builder_deterministic_100_runs | INV-PROMPT-01 | 100x |
| verify_hash_fails_for_tampered | INV-STORE-01 | mutation |
| verify_hash_passes_for_valid | INV-STORE-02 | roundtrip |

---

## COMMANDE DE VERIFICATION
```powershell
cd C:\Users\elric\omega-project\omega-ui\src-tauri\src

# Total
cargo test --lib 2>&1 | Select-String "test result"
# Attendu: 265 passed

# Par module
cargo test canon --lib 2>&1 | Select-String "test result"
cargo test voice --lib 2>&1 | Select-String "test result"  
cargo test voice_hybrid --lib 2>&1 | Select-String "test result"

# Invariants seulement
cargo test invcore --lib 2>&1 | Select-String "test result"
# Attendu: 14 passed
```

---

## SSOT REFERENCE
Fichier source: OMEGA_TEST_SUMMARY_VOICE_HYBRID_v2.0.0-INTEGRATED_20260101.json

---

**Document: OMEGA_TEST_MATRIX_L1L4_v1.0.0.md**
