# ═══════════════════════════════════════════════════════════════════════════════
#                              THE OMEGA OATH
#                    "Ce qui est scellé ne peut être brisé."
#                         VERSION 2.2.3 NUCLEAR PROOF
# ═══════════════════════════════════════════════════════════════════════════════

---

## LES 7 LOIS IMMORTELLES

### LAW-001: APPEND-ONLY UNIVERSEL
> Rien ne se réécrit, tout se succède via EVENT.

Chaque modification génère un nouvel EVENT. L'historique est immuable.

### LAW-002: SOURCE = NEXUS
> Le Nexus est la seule vérité. Tout le reste est dérivé.

Les vues (Atlas, Intel, Output) sont 100% générées depuis le Nexus.

### LAW-003: RIEN NE MEURT
> Aucune entité ne disparaît, elle change de lifecycle.

PROPOSED → ACTIVE → CERTIFIED ou DEPRECATED ou ABANDONED.
Jamais de suppression.

### LAW-004: ABANDON = LESSON
> Tout ABANDONED/FAILED DOIT créer une LESSON liée.

On n'abandonne jamais sans apprendre. La LESSON est obligatoire.

### LAW-005: CERTIFIED = PREUVE + TAGS
> CERTIFIED nécessite STATE + MANIFEST + tests + tags non vides.

Pas de certification sans preuves vérifiables.

### LAW-006: IA PROPOSE, HUMAIN SCELLE
> Aucune décision vraie sans validation Francky.

L'IA génère, suggère, propose. L'humain valide et scelle.

### LAW-007: HASH = RFC 8785
> Canonical JSON (JCS RFC 8785) + SHA-256.

Hashes reproductibles. Merkle avec domain separation.

---

## CONVENTIONS DE NOMMAGE

| Élément | Format | Note |
|---------|--------|------|
| Timestamp | UTC (Z) | `2026-01-12T22:59:00Z` |
| Date ID | YYYYMMDD | Extraite du timestamp UTC |
| ID | TYPE-YYYYMMDD-NNNN | 4 chiffres pour SEQ |
| Hash | sha256:... | 64 hex chars lowercase |

---

## RÈGLES CRITIQUES

1. **Date dans ID = date UTC** (pas locale)
2. **Un ID = un chemin canonique unique**
3. **Lock obligatoire pour registry** (timestamp+pid+host)
4. **Tags non vides si CERTIFIED/ABANDONED/FAILED/DEPRECATED/PAUSED**
5. **MANIFEST.files_in_scope = source de vérité Merkle**
6. **Parse selon extension** (YAML/JSON/JSONL/MD/TXT)
7. **Merkle avec domain separation** (`omega:leaf\0`, `omega:node\0`)

---

## LE SERMENT

```
Je jure de:
- Ne jamais effacer, toujours archiver
- Ne jamais supposer, toujours prouver
- Ne jamais improviser, toujours suivre la spec
- Ne jamais oublier, toujours sceller
```

---

**Signé:** Francky (Architecte Suprême)
**Date:** 2026-01-12T00:00:00Z
**Version:** OMEGA NEXUS v2.2.3 NUCLEAR PROOF

---

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   "Ce qui est scellé ne peut être brisé."                                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
