# OMEGA — REGISTRE DES INVARIANTS v1.3.0
# 31/31 Prouvés — 01 janvier 2026

## SYNTHESE
| Bloc | Invariants | Status |
|------|------------|--------|
| CORE | 5 (INV-CORE-01 a 05) | PROUVE |
| SECURITY | 7 (INV-SEC-01 a 07) | PROUVE |
| EMOTION | 2 (INV-EMO-01 a 02) | PROUVE |
| TAURI | 5 (INV-TAURI-01 a 05) | PROUVE |
| CREATE | 1 (INV-CREATE-01) | PROUVE |
| CANON | 4 (INVCORE-01 a 04) | PROUVE [NEW] |
| VOICE_HYBRID | 7 (INV-HYBRID-01 a 04, PROMPT-01, STORE-01 a 02) | PROUVE [NEW] |
| **TOTAL** | **31/31** | **100%** |

## BLOC CANON (4) [NEW v1.3.0]
| ID | Nom | Severite | Module | Preuve |
|----|-----|----------|--------|--------|
| INVCORE-01 | Determinism Absolute | CRITICAL | canon/store.rs | invcore_01_determinism |
| INVCORE-02 | No False Positive | CRITICAL | lexicon_fr_gold.rs | invcore_02_no_false_positive |
| INVCORE-03 | User Override Priority | HIGH | canon/store.rs | invcore_03_user_priority |
| INVCORE-04 | Hard Lock Inviolable | CRITICAL | canon/store.rs | invcore_04_hard_lock_1000x |

## BLOC VOICE_HYBRID (7) [NEW v1.3.0]
| ID | Nom | Severite | Module | Preuve |
|----|-----|----------|--------|--------|
| INV-HYBRID-01 | VOICE v1 Unmodified | CRITICAL | voice_hybrid/hybrid.rs | Regression 78 tests |
| INV-HYBRID-02 | Separation Stats/AI | CRITICAL | voice_hybrid/contract.rs | Type system |
| INV-HYBRID-03 | Graceful Degradation | HIGH | voice_hybrid/hybrid.rs | mock_provider_failing |
| INV-HYBRID-04 | Anti-Corruption | CRITICAL | voice_hybrid/* | Regression CANON+VOICE |
| INV-PROMPT-01 | Guidance Hash Deterministic | CRITICAL | voice_hybrid/prompt_builder.rs | deterministic_100_runs |
| INV-STORE-01 | Record Hash Anti-Tamper | CRITICAL | voice_hybrid/replay_store.rs | verify_hash_fails_tampered |
| INV-STORE-02 | Verify On Read | HIGH | voice_hybrid/replay_store.rs | verify_hash_passes_valid |

## HISTORIQUE
| Version | Date | Invariants |
|---------|------|------------|
| 1.2.0 | 2025-12-28 | 20 |
| 1.3.0 | 2026-01-01 | 31 (+11) |

## TAGS CERTIFIES
- CANON_v1.0.0-CERTIFIED
- VOICE_v1.0.0-CERTIFIED
- VOICE_HYBRID_v2.0.0-INTEGRATED
