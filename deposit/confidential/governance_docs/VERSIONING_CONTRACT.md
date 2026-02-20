# VERSIONING CONTRACT

## 1. Principe

> **Backward compatible par défaut.**

Tout changement qui brise la compatibilité arrière DOIT être explicite, documenté, et accompagné d'un plan de migration.

---

## 2. Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

| Composant | Signification | Exemple |
|-----------|--------------|---------|
| MAJOR | Breaking change | 2.0.0 |
| MINOR | Nouvelle fonctionnalité compatible | 1.1.0 |
| PATCH | Bugfix compatible | 1.0.1 |

---

## 3. Règles de compatibilité

### VER-001: Schema stability
Les schemas JSON ne changent pas de manière incompatible sans MAJOR bump.

### VER-002: API stability
Les signatures de fonctions publiques sont stables dans une MAJOR version.

### VER-003: Data migration
Tout changement de format de données → script de migration obligatoire.

### VER-004: Deprecation cycle
Deprecation → Warning 2 MINOR versions → Removal à MAJOR suivant.

### VER-005: Changelog mandatory
Chaque release → CHANGELOG.md mis à jour.

---

## 4. Breaking changes

### Définition
Un breaking change est toute modification qui:
- Change une signature d'API publique
- Modifie un format de fichier
- Supprime une fonctionnalité
- Change un comportement observable

### Documentation requise

```markdown
## Breaking Change: [TITLE]

**Version**: X.0.0
**Component**: [PATH]

### Changement
[Description]

### Impact
[Qui est affecté]

### Migration
[Étapes pour migrer]

### Deadline
[Date limite pour migrer]
```

---

## 5. Matrice de compatibilité

| From/To | 1.0.x | 1.1.x | 2.0.x |
|---------|-------|-------|-------|
| 1.0.x | ✅ | ✅ | ❌ Migration |
| 1.1.x | ⚠️ Partial | ✅ | ❌ Migration |
| 2.0.x | ❌ | ❌ | ✅ |

---

## 6. Vérification

Chaque PR vérifie automatiquement:
- [ ] Pas de breaking change sur MINOR/PATCH
- [ ] CHANGELOG mis à jour
- [ ] Tests de migration si breaking

---

**Standard**: NASA-Grade L4
**Version**: 1.0.0
