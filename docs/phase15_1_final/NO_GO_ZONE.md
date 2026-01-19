# ═══════════════════════════════════════════════════════════════════════════════
#                    NO_GO_ZONE — Phase 15.1
#              Faux Positifs & Zones Protégées
# ═══════════════════════════════════════════════════════════════════════════════

## Objectif

Documenter:
1. **Faux positifs** — Ce qu'on croyait être des problèmes mais qui n'en sont pas
2. **Zones protégées** — Modules/fichiers à NE PAS TOUCHER
3. **Hypothèses rejetées** — Pistes abandonnées avec justification

---

## Compteurs

| Type | Count |
|------|-------|
| Faux positifs | 0 |
| Zones protégées | 0 |
| Hypothèses rejetées | 0 |

---

# FAUX POSITIFS

---

## Faux positif #001

| Champ | Valeur |
|-------|--------|
| **ID** | FP-001 |
| **Date identification** | 2026-01-XX |
| **Source** | OBS-PLACEHOLDER |

### Suspicion initiale

[Ce qu'on croyait être un problème]

### Investigation menée

[Comment on a vérifié — observations, tests, analyse]

### Conclusion

[Pourquoi ce n'est PAS un problème]

### Décision

❌ **NE PAS TOUCHER**

Raison: [Explication]

---

## Faux positif #002

| Champ | Valeur |
|-------|--------|
| **ID** | FP-002 |
| **Date identification** | 2026-01-XX |
| **Source** | OBS-PLACEHOLDER |

### Suspicion initiale

[Description]

### Investigation menée

[Investigation]

### Conclusion

[Conclusion]

### Décision

❌ **NE PAS TOUCHER**

Raison: [Raison]

---

<!-- TEMPLATE FAUX POSITIF -->

<!--
## Faux positif #PLACEHOLDER

| Champ | Valeur |
|-------|--------|
| **ID** | FP-PLACEHOLDER |
| **Date identification** | 2026-01-XX |
| **Source** | OBS-PLACEHOLDER |

### Suspicion initiale

[Description]

### Investigation menée

[Investigation]

### Conclusion

[Conclusion]

### Décision

❌ **NE PAS TOUCHER**

Raison: [Raison]

---
-->

---

# ZONES PROTÉGÉES

---

## Zone protégée #001

| Champ | Valeur |
|-------|--------|
| **ID** | ZP-001 |
| **Module** | [Nom module] |
| **Fichiers** | [Liste fichiers concernés] |

### Raison de protection

[Pourquoi cette zone ne doit pas être modifiée — stabilité, complexité, risque]

### Risque si modification

[Ce qui pourrait casser si on touche cette zone]

### Durée protection

- [ ] Permanente
- [ ] Jusqu'à Phase 16
- [ ] Jusqu'à décision post-terrain

---

## Zone protégée #002

| Champ | Valeur |
|-------|--------|
| **ID** | ZP-002 |
| **Module** | [Module] |
| **Fichiers** | [Fichiers] |

### Raison de protection

[Raison]

### Risque si modification

[Risque]

### Durée protection

- [ ] Permanente
- [ ] Jusqu'à Phase 16
- [ ] Jusqu'à décision post-terrain

---

<!-- TEMPLATE ZONE PROTÉGÉE -->

<!--
## Zone protégée #PLACEHOLDER

| Champ | Valeur |
|-------|--------|
| **ID** | ZP-PLACEHOLDER |
| **Module** | [Module] |
| **Fichiers** | [Fichiers] |

### Raison de protection

[Raison]

### Risque si modification

[Risque]

### Durée protection

- [ ] Permanente
- [ ] Jusqu'à Phase 16
- [ ] Jusqu'à décision post-terrain

---
-->

---

# HYPOTHÈSES REJETÉES

---

## Hypothèse rejetée #001

| Champ | Valeur |
|-------|--------|
| **ID** | HR-001 |
| **Date** | 2026-01-XX |
| **Source** | PAT-PLACEHOLDER / OBS-PLACEHOLDER |

### Hypothèse initiale

[Ce qu'on pensait être la cause d'un problème]

### Raison du rejet

[Pourquoi cette hypothèse est fausse]

### Leçon apprise

[Ce qu'on en retient pour éviter de refaire l'erreur]

---

<!-- TEMPLATE HYPOTHÈSE REJETÉE -->

<!--
## Hypothèse rejetée #PLACEHOLDER

| Champ | Valeur |
|-------|--------|
| **ID** | HR-PLACEHOLDER |
| **Date** | 2026-01-XX |
| **Source** | PAT-PLACEHOLDER / OBS-PLACEHOLDER |

### Hypothèse initiale

[Hypothèse]

### Raison du rejet

[Raison]

### Leçon apprise

[Leçon]

---
-->

---

# RÈGLE CARDINALE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   TOUT CE QUI EST DANS CE DOCUMENT = INTERDIT DE MODIFICATION                         ║
║                                                                                       ║
║   • Faux positifs → On n'y touche pas                                                 ║
║   • Zones protégées → On n'y touche pas                                               ║
║   • Hypothèses rejetées → On ne les réexplore pas                                     ║
║                                                                                       ║
║   Si doute → Ajouter une nouvelle observation, pas une modification                   ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```
