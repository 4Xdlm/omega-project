# ═══════════════════════════════════════════════════════════════════════════════
#
#   ███╗   ██╗ █████╗ ███╗   ███╗██╗███╗   ██╗ ██████╗      ██████╗██╗  ██╗ █████╗ ██████╗ ████████╗███████╗██████╗ 
#   ████╗  ██║██╔══██╗████╗ ████║██║████╗  ██║██╔════╝     ██╔════╝██║  ██║██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
#   ██╔██╗ ██║███████║██╔████╔██║██║██╔██╗ ██║██║  ███╗    ██║     ███████║███████║██████╔╝   ██║   █████╗  ██████╔╝
#   ██║╚██╗██║██╔══██║██║╚██╔╝██║██║██║╚██╗██║██║   ██║    ██║     ██╔══██║██╔══██║██╔══██╗   ██║   ██╔══╝  ██╔══██╗
#   ██║ ╚████║██║  ██║██║ ╚═╝ ██║██║██║ ╚████║╚██████╔╝    ╚██████╗██║  ██║██║  ██║██║  ██║   ██║   ███████╗██║  ██║
#   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
#
#   OMEGA NAMING CHARTER — CHARTE DE NOMENCLATURE OFFICIELLE
#   Document: DOC-NAMING-001
#   Standard: NASA-Grade L4 / AS9100D
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 EN-TÊTE OBLIGATOIRE

| Attribut | Valeur |
|----------|--------|
| **Date** | 2026-01-03 |
| **Heure UTC** | 04:15:00 |
| **Version OMEGA** | v3.11.0-HARDENED |
| **Hash référence** | 1a30b6e6c01cf89ae33edc2713d76d0c727c393bd7a47a8174ebd6733390fc00 |
| **Auteur** | Claude (Architecte & Documentaliste) |
| **Autorité** | Francky (Architecte Suprême) |
| **Status** | 🔒 OFFICIEL |

---

# 🔤 SECTION 1 — CONVENTIONS DE NOMMAGE

## 1.1 Fichiers Source

| Type | Convention | Exemple |
|------|------------|---------|
| TypeScript source | `snake_case.ts` | `emotion_engine.ts` |
| TypeScript test | `snake_case_test.ts` | `emotion_engine_test.ts` |
| TypeScript types | `snake_case.ts` ou `types.ts` | `types.ts` |
| Rust source | `snake_case.rs` | `lib.rs` |
| Configuration | `snake_case` ou standard | `vitest.config.ts` |

## 1.2 Modules et Packages

| Type | Convention | Exemple |
|------|------------|---------|
| Package npm | `omega-<nom-kebab>` | `omega-segment-engine` |
| Module interne | `<nom>` en kebab-case | `segment-engine` |
| Répertoire | `snake_case` ou `kebab-case` | `src-tauri` |

## 1.3 Invariants

| Pattern | Format | Exemple |
|---------|--------|---------|
| Standard | `INV-<BLOC>-XX` | `INV-CORE-01` |
| BLOC | 2-8 lettres majuscules | `CORE`, `SEC`, `PROG` |
| XX | Numéro 2 chiffres | `01`, `02`, `15` |

### Blocs officiels

| Bloc | Préfixe | Plage |
|------|---------|-------|
| Core | `INV-CORE-` | 01-99 |
| Security | `INV-SEC-` | 01-99 |
| Emotion | `INV-EMO-` | 01-99 |
| Tauri | `INV-TAURI-` | 01-99 |
| Create | `INV-CREATE-` | 01-99 |
| Scale | `INV-SCALE-` | 01-99 |
| Stream | `INV-STR-` | 01-99 |
| Progress | `INV-PROG-` | 01-99 |
| Bridge | `INV-BRIDGE-` | 01-99 |

## 1.4 Versions

| Format | Pattern | Exemple |
|--------|---------|---------|
| Standard | `vMAJOR.MINOR.PATCH` | `v1.2.3` |
| Avec tag | `vMAJOR.MINOR.PATCH-TAG` | `v3.11.0-HARDENED` |
| Tags valides | `GOLD`, `STREAM`, `SCALE`, `PROGRESS`, `CERTIFIED` | |

### Règles SemVer

| Changement | Impact |
|------------|--------|
| MAJOR | Breaking changes, API incompatible |
| MINOR | Nouvelles features, backward compatible |
| PATCH | Bug fixes, pas de nouvelles features |

## 1.5 Hashes

| Type | Format | Longueur |
|------|--------|----------|
| SHA-256 | Lowercase hex | 64 caractères |
| rootHash | `[a-f0-9]{64}` | 64 caractères |

**Exemple valide:**
```
1a30b6e6c01cf89ae33edc2713d76d0c727c393bd7a47a8174ebd6733390fc00
```

**Exemples invalides:**
```
1A30B6E6...  ← MAJUSCULES INTERDITES
1a30b6e...   ← TROP COURT
```

---

# 📁 SECTION 2 — STRUCTURE DES FICHIERS

## 2.1 Documents de Phase

| Pattern | Usage | Exemple |
|---------|-------|---------|
| `PHASE_X_<NOM>.md` | Documentation de phase | `PHASE_6_PROGRESS.md` |
| X | Numéro de phase (1 chiffre) | `6` |
| NOM | Description en SCREAMING_SNAKE | `OBSERVABILITY` |

## 2.2 Session Saves

| Pattern | Usage |
|---------|-------|
| `SESSION_SAVE_YYYY-MM-DD.md` | Sauvegarde quotidienne |
| `SESSION_SAVE_YYYY-MM-DD_vX_Y_Z.md` | Avec version |

**Exemple:**
```
SESSION_SAVE_2026-01-03_v3_3_0_PROGRESS.md
```

## 2.3 Certifications

| Pattern | Usage |
|---------|-------|
| `CERTIFICATION_vX_Y_Z.md` | Certificat officiel |
| `CERTIFICATION_vX_Y_Z_TAG.md` | Avec tag |

**Exemple:**
```
CERTIFICATION_v3_3_0_PROGRESS.md
```

## 2.4 Archives

| Règle | Description |
|-------|-------------|
| Emplacement | `/ARCHIVE/` ou `/08_ARCHIVES_REFERENCED/` |
| Nommage | Préfixe `ARCHIVED_` + nom original |
| Suppression | ❌ INTERDITE (append-only) |

---

# 🏷️ SECTION 3 — DOCUMENTS OFFICIELS

## 3.1 Structure du Master Dossier

```
OMEGA_MASTER_DOSSIER/
├── 00_INDEX_MASTER.md           # Point d'entrée unique
├── 01_ARCHITECTURE/
│   ├── ARCHITECTURE_GLOBAL.md   # Vue d'ensemble
│   └── MODULE_<NOM>.md          # Fiche par module
├── 02_PIPELINE/
│   ├── PIPELINE_OVERVIEW.md     # Vue pipeline
│   └── PHASE_<X>_<NOM>.md       # Détail par phase
├── 03_INVARIANTS/
│   ├── INVARIANTS_REGISTRY.md   # Registre complet
│   └── BLOC_<NOM>.md            # Détail par bloc
├── 04_TESTS_PROOFS/
│   ├── TESTS_MATRIX.md          # Matrice de tests
│   └── PROOF_<ID>.md            # Preuves individuelles
├── 05_CERTIFICATIONS/
│   └── CERTIFICATION_*.md       # Certificats
├── 06_NAMING_CHARTER/
│   └── OMEGA_NAMING_CHARTER.md  # Ce document
├── 07_SESSION_SAVES/
│   └── SESSION_SAVE_*.md        # Sauvegardes
├── 08_ARCHIVES_REFERENCED/
│   └── ARCHIVED_*.md            # Archives référencées
└── HASH_MANIFEST.md             # Manifest des hashes
```

## 3.2 En-tête obligatoire (template)

Chaque document DOIT commencer par:

```markdown
# ═══════════════════════════════════════════════════════════════════════════════
# TITRE DU DOCUMENT
# Document: DOC-<TYPE>-<NUM>
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 EN-TÊTE

| Attribut | Valeur |
|----------|--------|
| **Date** | YYYY-MM-DD |
| **Heure UTC** | HH:MM:SS |
| **Version OMEGA** | vX.Y.Z-TAG |
| **Hash référence** | <64 hex chars si applicable> |
| **Auteur** | Claude (Architecte & Documentaliste) |
| **Autorité** | Francky (Architecte Suprême) |
| **Status** | 🟢 DRAFT / 🟡 REVIEW / 🔒 OFFICIEL |

---
```

---

# ⚠️ SECTION 4 — RÈGLES D'INTÉGRITÉ

## 4.1 Règles absolues

| Règle | Description |
|-------|-------------|
| R1 | Un document sans en-tête = INVALIDE |
| R2 | Un invariant sans ID normalisé = INVALIDE |
| R3 | Un hash en majuscules = INVALIDE |
| R4 | Une version sans 'v' préfixe = INVALIDE |
| R5 | Un fichier archivé supprimé = VIOLATION |

## 4.2 Vérifications avant commit

```
☐ En-tête complet (date, heure, version, auteur)
☐ Tous les invariants avec ID INV-BLOC-XX
☐ Tous les hashes en lowercase 64 chars
☐ Toutes les versions en vX.Y.Z(-TAG)
☐ Structure de dossier respectée
```

---

# 📊 SECTION 5 — GLOSSAIRE

| Terme | Définition |
|-------|------------|
| **BLOC** | Catégorie d'invariants (CORE, SEC, etc.) |
| **rootHash** | Hash SHA-256 du résultat d'analyse |
| **FROZEN** | Valeur qui ne doit jamais changer (seed=42) |
| **CERTIFIED** | Validé selon le protocole NASA-Grade |
| **TAG** | Suffixe de version (GOLD, STREAM, etc.) |

---

# 🔒 SCEAU

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA NAMING CHARTER — OFFICIEL                                                     ║
║                                                                                       ║
║   Ce document définit les conventions de nommage obligatoires                         ║
║   pour tout le projet OMEGA.                                                          ║
║                                                                                       ║
║   Toute violation de cette charte invalide le document concerné.                      ║
║                                                                                       ║
║   Status: 🔒 OFFICIEL                                                                 ║
║   Approuvé par: Francky (Architecte Suprême)                                          ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT DOC-NAMING-001**

*Document généré le 2026-01-03 04:15 UTC*
*Projet OMEGA — NASA-Grade L4*
