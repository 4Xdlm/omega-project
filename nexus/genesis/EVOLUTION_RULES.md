# EVOLUTION RULES — OMEGA v4.x

## 1. Typologie des Changements

### A. Maintenance (Auto-approuvé si local)
- Bug fix
- Clarification code
- Documentation
- Tests additionnels

### B. Extension (RFC + Validation Architecte)
- Nouveau module
- Nouvelle instrumentation
- Nouveau tooling

### C. Mutation (Processus v2 STRICT)
- Changement de comportement
- Nouvelle abstraction centrale
- Remplacement flux existant

**Jamais in-place. Toujours nouveau package.**

## 2. Règle de Création Package
Créer un nouveau package SI :
- Responsabilité claire et isolable
- Aucun accès direct aux FROZEN
- API stable définie AVANT implémentation

## 3. Règle de Refus (même si "bonne idée")
Une proposition est REFUSÉE si :
| Condition | Verdict |
|-----------|---------|
| Non testable | REFUSÉ |
| Non explicable en 5 phrases | REFUSÉ |
| Couplage transversal | REFUSÉ |
| Pas de métrique succès | REFUSÉ |

## 4. Backward Compatibility
- API publique = stable par défaut
- Breaking change = nouvelle version / nouveau package
- Jamais de rupture silencieuse

## 5. Règle d'Or
```
On préfère refuser une bonne idée que d'accepter une mauvaise dette.
```
