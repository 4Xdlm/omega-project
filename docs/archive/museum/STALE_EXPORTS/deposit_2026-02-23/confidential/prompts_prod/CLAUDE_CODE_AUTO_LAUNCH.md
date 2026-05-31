# OMEGA — CLAUDE CODE AUTO-LAUNCH
# Exécution automatique Phase H puis Phase I

## INSTRUCTION UNIQUE À COPIER DANS CLAUDE CODE

Copier ce texte EXACTEMENT dans Claude Code :

---

Exécute les phases H et I d'OMEGA de manière autonome et séquentielle.

**PHASE H** : Lis le fichier `docs/prompts/PHASE_H_PROMPT.md` et implémente tout ce qu'il contient.
- Crée les 23 fichiers listés dans l'ordre
- Ajoute ≥150 tests
- Après completion, exécute :
  ```
  Get-FileHash -Algorithm SHA256 -Path src\delivery\*.ts | Out-File manifests\PHASE_H_SHA256_MANIFEST.txt
  git add src/delivery tests/delivery config/delivery manifests/PHASE_H_SHA256_MANIFEST.txt
  git commit -m "feat(delivery): implement Phase H Delivery Engine [INV-H-*] - 150+ tests"
  ```

**PHASE I** : Lis le fichier `docs/prompts/PHASE_I_PROMPT.md` et implémente tout ce qu'il contient.
- Crée les 20 fichiers listés dans l'ordre
- Ajoute ≥200 tests
- Après completion, exécute :
  ```
  Get-FileHash -Algorithm SHA256 -Path src\runner\*.ts | Out-File manifests\PHASE_I_SHA256_MANIFEST.txt
  git add src/runner tests/runner bin/omega-run.mjs manifests/PHASE_I_SHA256_MANIFEST.txt
  git commit -m "feat(runner): implement Phase I Runner/Verify/Capsule [INV-I-*] - 200+ tests"
  git tag -a OMEGA_DELIVERY_PHASE_H_SEALED -m "Phase H Delivery Engine sealed"
  git tag -a OMEGA_RUNNER_PHASE_I_SEALED -m "Phase I Runner sealed"
  git push origin master --tags
  ```

**RÈGLES** :
- Ne JAMAIS modifier les zones SEALED (src/canon, src/gates, src/sentinel, src/memory, src/orchestrator, genesis-forge)
- Après Phase H, src/delivery devient FROZEN (ne plus modifier)
- Exécuter `npm test` après chaque fichier créé
- Vérifier `git diff --stat` sur les zones SEALED = vide

---
