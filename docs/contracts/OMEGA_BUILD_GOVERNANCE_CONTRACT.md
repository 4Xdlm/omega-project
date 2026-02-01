# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — BUILD ↔ GOUVERNANCE CONTRACT
#   Document Contractuel Liant — Non-Contestable
#
#   Version: 1.0
#   Date: 2026-02-01
#   Status: ACTIVE
#   Binding: YES
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

---

## 1. OBJET DU CONTRAT

Ce document définit **la frontière juridique, technique et décisionnelle** entre :

* **ROADMAP A — BUILD / CERTIFICATION** (Scellée)
* **ROADMAP B — GOUVERNANCE / EXPLOITATION** (Active)

Il empêche :

* La confusion des rôles
* La réécriture de la vérité
* Les corrections silencieuses

---

## 2. DÉFINITIONS (STRICTES)

| Terme | Définition |
|-------|------------|
| **BUILD** | Ensemble des phases produisant une **vérité certifiée** |
| **GOUVERNANCE** | Ensemble des phases **observant** cette vérité dans le temps |
| **VÉRITÉ** | Résultat certifié par ORACLE + DECISION_ENGINE |
| **INVARIANT** | Propriété non modifiable après SEAL |
| **OVERRIDE** | Décision humaine exceptionnelle, tracée, bornée |
| **DRIFT** | Écart détecté entre comportement actuel et certifié |

---

## 3. CONTRAT D'ENTRÉE (BUILD → GOUVERNANCE)

BUILD garantit à GOUVERNANCE :

| Élément | Garantie | Preuve |
|---------|----------|--------|
| ORACLE | Déterministe, hashé | Tests Phase C |
| DECISION_ENGINE | Traçable, reproductible | INV-DECISION-* |
| INVARIANTS | Figés | Manifests SHA256 |
| WAIVERS | Fermés ou expirés | Vérification factuelle |
| ARTEFACTS | Hashés, append-only | *_MANIFEST.sha256 |
| VÉRITÉ | Stable | Tags Git SEALED |

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Si un de ces points est FAUX → GOUVERNANCE REFUSE DE S'ACTIVER                      ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 4. FRONTIÈRE D'AUTORITÉ (NON NÉGOCIABLE)

| Action | BUILD | GOUVERNANCE |
|--------|-------|-------------|
| Créer la vérité | ✅ | ❌ |
| Modifier la vérité | ❌ | ❌ |
| Observer | ❌ | ✅ |
| Détecter dérive | ❌ | ✅ |
| Corriger | ❌ | ❌ |
| Alerter humain | ❌ | ✅ |
| Override humain | ❌ | ✅ (sous conditions) |
| Rollback | ❌ | ✅ |

---

## 5. INTERDICTIONS ABSOLUES

GOUVERNANCE **N'A PAS LE DROIT** de :

| Interdit | Sanction |
|----------|----------|
| Recalculer un ORACLE | INCIDENT MAJEUR |
| Modifier un INVARIANT | INCIDENT MAJEUR |
| Réinterpréter un verdict BUILD | INCIDENT MAJEUR |
| "Optimiser" un comportement certifié | INCIDENT MAJEUR |
| Corriger sans trace | INCIDENT MAJEUR |

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   TOUTE VIOLATION = INCIDENT MAJEUR → ROLLBACK OBLIGATOIRE                            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. RÈGLE D'ESCALADE

```
Drift détecté
     ↓
Rapport automatique (DRIFT_REPORT.json)
     ↓
Décision humaine (OBLIGATOIRE)
     ↓
(OPTIONNEL) Override tracé (OVERRIDE_<id>.json)
     ↓
Retour à l'observation
```

**JAMAIS** de boucle automatique corrective.

---

## 7. OVERRIDE HUMAIN — CADRE CONTRACTUEL

Un override est valide **UNIQUEMENT SI** :

| Condition | Obligatoire |
|-----------|-------------|
| Justification écrite | ✅ OUI |
| Signature humaine | ✅ OUI |
| Expiration définie | ✅ OUI |
| Hashé | ✅ OUI |
| Référencé dans manifest | ✅ OUI |

**Sans ces 5 points → Override NUL et NON AVENU**

Format obligatoire :

```json
{
  "override_id": "OVERRIDE_<timestamp>_<hash>",
  "justification": "...",
  "signature": "<architecte>",
  "expires_at": "<ISO8601>",
  "hash": "<SHA256>",
  "manifest_ref": "OVERRIDE_MANIFEST.sha256"
}
```

---

## 8. RÉSILIATION DU CONTRAT

Le contrat est **ROMPU** si :

| Violation | Conséquence |
|-----------|-------------|
| BUILD modifié après SEAL | Recertification obligatoire |
| GOUVERNANCE agit comme BUILD | Arrêt immédiat GOUVERNANCE |
| Vérité recalculée sans recertification | Système INVALIDE |

---

## 9. STATUT FINAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   BUILD = SOURCE DE VÉRITÉ                                                            ║
║   GOUVERNANCE = GARANT DE STABILITÉ                                                   ║
║                                                                                       ║
║   CE CONTRAT PRÉVAUT SUR TOUT AUTRE DOCUMENT.                                         ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 10. SIGNATURES

| Rôle | Entité | Date |
|------|--------|------|
| Architecte Suprême | Francky | 2026-02-01 |
| IA Principal | Claude | 2026-02-01 |
| Auditeur | ChatGPT | 2026-02-01 |

---

## 11. RÉFÉRENCES

| Document | Rôle |
|----------|------|
| OMEGA_SUPREME_ROADMAP_v2.0.md | ROADMAP A (BUILD) |
| OMEGA_GOVERNANCE_ROADMAP_v1.0.md | ROADMAP B (GOUVERNANCE) |
| OMEGA_AUTHORITY_MODEL.md | Schéma d'autorité |
| SESSION_SAVE_2026-02-01_PHASE_C_SEALED.md | Dernière certification |

---

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA_BUILD_GOVERNANCE_CONTRACT v1.0                                                ║
║                                                                                       ║
║   Status: ACTIVE — BINDING — NON-CONTESTABLE                                          ║
║   Date: 2026-02-01                                                                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT OMEGA_BUILD_GOVERNANCE_CONTRACT v1.0**
