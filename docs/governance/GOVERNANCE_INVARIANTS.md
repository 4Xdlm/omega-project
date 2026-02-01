# GOVERNANCE INVARIANTS

## Préambule

Ces invariants sont **NON NÉGOCIABLES**. Toute violation = incident.

---

## INV-GOV-001 — Read-only BUILD

**Énoncé**: Gouvernance ne modifie JAMAIS BUILD.

**Preuve**: Aucun commit gouvernance ne touche `src/sentinel/`, `packages/sentinel/`, ni les modules SEALED.

**Violation**: CRITICAL → Rollback immédiat.

---

## INV-GOV-002 — Append-only logs

**Énoncé**: Les logs de gouvernance ne sont JAMAIS modifiés ni supprimés.

**Implémentation**:
- Format NDJSON (une ligne = un événement)
- Chaque événement contient `log_chain_prev_hash`
- Hash de l'événement précédent forme une chaîne

**Violation**: CRITICAL → Intégrité compromise.

---

## INV-GOV-003 — Human escalation

**Énoncé**: Tout incident détecté → escalade humaine obligatoire.

**Règle**: Gouvernance ne prend JAMAIS de décision corrective seule.

**Violation**: CRITICAL → Processus invalide.

---

## INV-GOV-004 — No silent drift

**Énoncé**: Dérive détectée → rapport + alerte obligatoires.

**Règle**: Aucune dérive ne peut être ignorée ou masquée.

**Violation**: HIGH → Audit compromis.

---

## INV-GOV-005 — Hashable events

**Énoncé**: Chaque événement de gouvernance → hash SHA256.

**Format**:
```
event_hash = SHA256(JSON.stringify(event, sorted_keys))
```

**Violation**: MEDIUM → Traçabilité compromise.

---

## INV-GOV-006 — Schema compliance

**Énoncé**: Tout événement respecte son JSON Schema.

**Validation**: Ajv strict mode.

**Violation**: MEDIUM → Événement rejeté.

---

## INV-GOV-007 — Timestamp monotonic

**Énoncé**: Les timestamps sont strictement croissants dans un log.

**Règle**: `event[n].timestamp > event[n-1].timestamp`

**Violation**: HIGH → Ordre temporel compromis.

---

## INV-GOV-008 — Reference integrity

**Énoncé**: Toute référence (tag, manifest, hash) doit exister et être vérifiable.

**Validation**: Résolution git + vérification fichier.

**Violation**: HIGH → Référence cassée.

---

## INV-GOV-009 — No magic numbers

**Énoncé**: Aucune constante magique dans le code gouvernance.

**Règle**: Tous les seuils dans `GOVERNANCE_CONFIG.json`.

**Violation**: MEDIUM → Maintainabilité compromise.

---

## INV-GOV-010 — Deterministic processing

**Énoncé**: Même input → même output → même hash.

**Test**: Triple run avec vérification hash.

**Violation**: CRITICAL → Non-reproductibilité.

---

## INV-GOV-011 — Explicit state

**Énoncé**: Aucun état implicite. Tout état est sérialisé et hashé.

**Règle**: Pas de variables globales mutables.

**Violation**: MEDIUM → État fantôme.

---

## INV-GOV-012 — Fail-safe default

**Énoncé**: En cas de doute, gouvernance escalade à humain.

**Règle**: `requires_human_decision: true` par défaut pour incidents.

**Violation**: HIGH → Décision automatique non autorisée.

---

## INV-GOV-013 — Audit trail complete

**Énoncé**: Toute action gouvernance laisse une trace vérifiable.

**Format**: Événement JSON + hash + timestamp + actor.

**Violation**: HIGH → Traçabilité incomplete.

---

## INV-GOV-014 — Version compatibility

**Énoncé**: Changement de schema → migration explicite.

**Règle**: `schema_version` obligatoire, backward compatible par défaut.

**Violation**: MEDIUM → Incompatibilité silencieuse.

---

## INV-GOV-015 — Isolation sandbox

**Énoncé**: Tests gouvernance isolés du système de production.

**Règle**: Fixtures dédiées, pas de side effects.

**Violation**: LOW → Tests non fiables.

---

## Matrice de sévérité

| Sévérité | Impact | Action |
|----------|--------|--------|
| CRITICAL | Système compromis | Rollback immédiat |
| HIGH | Intégrité menacée | Incident + escalade |
| MEDIUM | Qualité dégradée | Correction planifiée |
| LOW | Amélioration | Backlog |

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
**Invariants**: 15
