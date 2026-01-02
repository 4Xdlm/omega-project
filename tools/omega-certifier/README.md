# OMEGA CERTIFIER v2.0.0

> Certification automatique NASA-Grade — **CONFORME AU PROTOCOLE AÉROSPATIAL**

## 🔧 CORRECTIONS v2.0.0 (audit ChatGPT)

| # | Problème v1.0 | Correction v2.0 |
|---|---------------|-----------------|
| 1 | Certificat généré même si FAILED | ❌ FAILED → FAILURE_REPORT.md (pas de certificat) |
| 2 | Hash incluait timestamp/user/machine | ✅ Hash scellant = données reproductibles uniquement |
| 3 | JSON "canonique" ne triait pas les clés | ✅ Tri récursif des clés avant hashing |
| 4 | Parsing console Vitest fragile | ✅ `vitest --reporter=json` + hash du JSON |
| 5 | Seed affichée mais pas injectée | ✅ `$env:OMEGA_SEED` injecté avant chaque run |
| 6 | Claims "true" par défaut sans preuve | ✅ Claims = "UNKNOWN" si auto-généré, L4 = manifest obligatoire |

---

## 🚀 Installation Rapide

```powershell
# Extraire le ZIP dans tools/
Expand-Archive -Path OMEGA_CERTIFIER_v2_0_0.zip -DestinationPath .\tools\omega-certifier
```

---

## 📋 Utilisation

### Mode Automatique (L4 strict)

```powershell
.\tools\omega-certifier\ocert.ps1
```

### Mode Manuel

```powershell
.\tools\omega-certifier\omega_certify.ps1 `
    -ModulePath "." `
    -Profile L4 `
    -Seed 42 `
    -Runs 5 `
    -OutDir "./certificates"
```

---

## 🔐 RÈGLES STRICTES v2.0

### Règle 1: FAILED = PAS DE CERTIFICAT

```
SI verdict = FAILED
    → Génère: FAILURE_REPORT.json + FAILURE_REPORT.md + PROOF/*
    → NE génère PAS: CERTIFICATE.json, CERTIFICATE.md

SI verdict = PASSED
    → Génère: CERTIFICATE.json + CERTIFICATE.md + PASSPORT.json + PROOF/*
```

### Règle 2: L4 + UNSTABLE = FAILED

```
SI profile = L4 ET is_stable = false
    → verdict = FAILED (pas de certificat)
    → Raison: "L4 requires stable results. Flaky tests detected."
```

### Règle 3: L4 EXIGE module.omega.json

```
SI profile = L4 ET module.omega.json ABSENT
    → REFUS IMMÉDIAT
    → Erreur: "Profil L4 exige un module.omega.json officiel"
```

### Règle 4: Hash Scellant Reproductible

Le `RootHash` est calculé à partir de données **100% reproductibles**:

```
RootHash = SHA256(
    manifest_hash +      # Trié canoniquement
    source_hash +        # Fichiers src/**/*
    fixtures_hash +      # Fichiers fixtures/**/*
    seed +               # Ex: "42"
    profile +            # Ex: "L4"
    runs +               # Ex: 5
    env_hash +           # node_version, npm_version, os, arch, git_commit, git_dirty
    test_result_hash     # Résultats triés canoniquement
)
```

**EXCLUS du hash scellant**: timestamp, user, machine (dans le rapport mais pas le hash)

### Règle 5: Seed Réellement Injectée

```powershell
# Avant chaque run Vitest, le certifier fait:
$env:OMEGA_SEED = "42"
$env:OMEGA_RUN_INDEX = 1

# Vos tests DOIVENT utiliser cette seed pour être déterministes
```

### Règle 6: Claims = UNKNOWN si Auto-Généré

```json
// Si module.omega.json absent, claims par défaut:
{
  "claims": {
    "deterministic": "UNKNOWN",
    "pure": "UNKNOWN",
    "stateless": "UNKNOWN",
    "serializable_io": "UNKNOWN"
  },
  "warning": "Auto-generated manifest. Claims not verified."
}
```

---

## 📁 Sorties Générées

### Si PASSED

```
certificates/MODULE_NAME/DATE/
├── CERTIFICATE.json    # Certificat machine-readable
├── CERTIFICATE.md      # Certificat human-readable
├── PASSPORT.json       # Recette de reproduction
├── hashes.sha256       # Hashes de tous les fichiers
└── PROOF/
    ├── environment.json
    ├── environment_hash_input.json  # Ce qui est hashé
    ├── manifest.canonical.json
    ├── test-summary.json
    ├── test-summary.canonical.json
    └── vitest-run*.json             # Rapports JSON Vitest
```

### Si FAILED

```
certificates/MODULE_NAME/DATE/
├── FAILURE_REPORT.json   # Rapport d'échec
├── FAILURE_REPORT.md     # Rapport human-readable
├── PASSPORT.json         # Recette (pour reproduire l'échec)
├── hashes.sha256
└── PROOF/
    └── ...
```

---

## 📝 Créer un module.omega.json

Pour certification L4, créez ce fichier à la racine de votre module:

```json
{
  "$schema": "./schemas/module.omega.schema.json",
  "meta": {
    "name": "MON_MODULE",
    "version": "1.0.0",
    "description": "Description du module",
    "maintainer": "Team"
  },
  "technical": {
    "entryPoint": "src/index.ts",
    "language": "typescript"
  },
  "contract": {
    "type": "OMEGA_MODULE_L4",
    "claims": {
      "deterministic": true,
      "pure": true,
      "stateless": true,
      "serializable_io": true
    }
  },
  "verification": {
    "fixtures_path": "./fixtures",
    "specific_tests": "./tests/**/*.test.ts"
  }
}
```

---

## ✅ Checklist Conformité Protocol

- [ ] `module.omega.json` présent (obligatoire L4)
- [ ] Claims vérifiés (pas "UNKNOWN")
- [ ] Tests utilisent `$env:OMEGA_SEED` pour le RNG
- [ ] Pas de code flaky
- [ ] `npm test` = `vitest run`

---

## 🔄 Intégration CI/CD

### GitHub Actions

```yaml
- name: OMEGA Certification L4
  shell: pwsh
  run: |
    .\tools\omega-certifier\omega_certify.ps1 `
      -ModulePath "." `
      -Profile L4 `
      -Seed 42 `
      -Runs 5
      
- name: Upload on Success
  if: success()
  uses: actions/upload-artifact@v3
  with:
    name: omega-certificate
    path: certificates/

- name: Upload on Failure
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: omega-failure-report
    path: certificates/
```

---

## 🛑 Troubleshooting

### "Profil L4 exige un module.omega.json officiel"

```
Créez un fichier module.omega.json avec vos claims vérifiés.
OU utilisez -Profile L3 (moins strict).
```

### "L4 + UNSTABLE = FAIL"

```
Vos tests sont flaky (résultats différents entre runs).
Corrigez les tests non-déterministes avant de re-certifier.
Assurez-vous d'utiliser $env:OMEGA_SEED pour tout RNG.
```

### Hash différent à chaque run

```
Vérifiez que vous n'avez pas de code qui utilise:
- Date.now() sans mock
- Math.random() sans seed
- process.hrtime() pour des IDs

Utilisez $env:OMEGA_SEED pour initialiser votre RNG.
```

---

## 📊 Comparaison v1.0 vs v2.0

| Aspect | v1.0 | v2.0 |
|--------|------|------|
| FAILED → Certificat | ❌ Oui (bug) | ✅ Non (FAILURE_REPORT) |
| Hash reproductible | ❌ Non (timestamp) | ✅ Oui |
| JSON canonique | ❌ Non trié | ✅ Tri récursif |
| Vitest reporter | ❌ Console parsing | ✅ JSON reporter |
| Seed injection | ❌ Affichage seul | ✅ $env:OMEGA_SEED |
| L4 sans manifest | ❌ Claims=true | ✅ REFUS |

---

## 📜 Licence

OMEGA Certifier v2.0.0 — Proprietary
(c) 2026 Francky (Architecte OMEGA)

---

*OMEGA AEROSPACE CERTIFICATION — NASA-Grade — Protocol Compliant v2.0*
