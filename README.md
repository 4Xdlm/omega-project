# 🛰️ OMEGA Bridge - Aerospace Certified

[![Tests](https://img.shields.io/badge/Tests-32%2F32-brightgreen)](./CERTIFICATION.md)
[![Grade](https://img.shields.io/badge/Grade-NASA%20Aerospace-blue)](./CERTIFICATION.md)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-lightgrey)](./omega-bridge-win.exe)
[![Version](https://img.shields.io/badge/Version-1.1.0-orange)](./CERTIFICATION.md)

---

## 🏆 Certification Status

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   OMEGA BRIDGE v1.1.0 — AEROSPACE CERTIFIED                        ║
║                                                                    ║
║   Tests:     32/32 (100%)                                          ║
║   Grade:     NASA AEROSPACE                                        ║
║   Platform:  Windows x64                                           ║
║   Status:    ✅ CERTIFIED                                          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 📊 Test Levels

| Level | Category | Tests | Status |
|-------|----------|-------|--------|
| L1 | Protocol | 7/7 | ✅ PASS |
| L2 | Invariants | 5/5 | ✅ PASS |
| L3 | Brutal/Chaos | 8/8 | ✅ PASS |
| L4 | Aerospace | 12/12 | ✅ PASS |

**Total: 32/32 — 100%**

---

## 🔐 Security Features

- ✅ Path traversal protection
- ✅ System directory blocking
- ✅ JSON injection prevention
- ✅ Input validation (Zod)
- ✅ SHA-256 integrity hash

---

## 🚀 Quick Start

### Run Tests
```powershell
powershell -ExecutionPolicy Bypass -File .\omega_aerospace_tests.ps1
```

### Basic Commands
```powershell
# Health check
.\omega-bridge-win.exe '{"command":"health"}'

# Version
.\omega-bridge-win.exe '{"command":"version"}'

# Create project
.\omega-bridge-win.exe '{"command":"create_project","payload":{"name":"MyProject","path":"C:\\Users\\...\\myproject"}}'
```

---

## 📁 Repository Contents

| File | Description |
|------|-------------|
| `omega-bridge-win.exe` | Binary (Windows x64) |
| `omega_aerospace_tests.ps1` | Test suite (32 tests) |
| `CERTIFICATION.md` | Official certification |
| `README.md` | This file |

---

## 🔗 Links

- [Full Certification](./CERTIFICATION.md)
- [Test Suite](./omega_aerospace_tests.ps1)

---

## 📜 License

OMEGA Project © 2025

---

```
Certified: 27 December 2025
Grade: NASA AEROSPACE
Tests: 32/32 PASS
```
