# NCR — V3.4 SEAL DRIFT (coefficients-v3-4.ts SHA256 mismatch)

**Status** : `OPEN_P1_DEFERRED`
**Severity** : `P1`
**Created** : 2026-05-27 (V2.1.1 P0 audit)
**Updated** : 2026-05-28 (Codex v1.2 sealed — référencé LAW-SCORING-V34)
**Domain** : scoring / metrology

---

## 1. Issue

`SHA256(coefficients-v3-4.ts)` diverge entre source canonique CLAUDE.md (doctrinal) et fichier empirique sur disque.

| Source | SHA256 |
|---|---|
| **CLAUDE.md doctrinal (R-METROLOGY section)** | `e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c` |
| **Empirique 2026-05-27** (verif `sha256sum`) | `adbf41024d2886bf1c7f50a723eb69e6a9bc8389b1130b7d13406370a0ba441e` |
| **Empirique 2026-05-28** (verif `sha256sum`) | `adbf41024d2886bf1c7f50a723eb69e6a9bc8389b1130b7d13406370a0ba441e` (unchanged) |

**Drift** : SHA256 ≠ → soit le fichier a été modifié post-scellement (probable), soit la valeur doctrinale CLAUDE.md a été enregistrée incorrectement, soit valeur calculée avec algo différent (BOM, line endings).

## 2. Découverte

- **Sprint V2.1.1 P0 audit** (2026-05-27, Claude Code) — recensement assets validés vs reality empirique → mismatch SHA256 détecté
- **Documenté dans** [[v2-1-1-investigation-complete-pacte-stase-2026-05-27]] memory entry
- **Référencé dans CODEX v1.2 §1.3** (Noyau structurel robuste CALC V3.4) avec drift notice

## 3. Impact opérationnel

- ✅ **Performance scoring** ρ=0.6138 reste prouvé empirique (lecture header `coefficients-v3-4.ts:19` confirme `ρ_dispatched=0.6138`)
- ✅ **5 features canoniques** (f24c, f33b, f1a, f33c, f12) restent valides
- ⚠️ **Doctrine "fichier SEALED non touché"** est techniquement contredite par mismatch SHA256
- ⚠️ **Tout commit code scoring (V3.5+) doit résoudre le drift AVANT scellement nouveau**

## 4. Hypothèses cause (à valider Sprint V3.5+ forensic)

### H1 — Modification post-scellement mineure non documentée
`git log -p coefficients-v3-4.ts` doit révéler commit(s) entre seal doctrinal et état actuel.

### H2 — Erreur transcription SHA256 dans CLAUDE.md doctrinal
Possible : hash a été noté à la main, typo ou mismatch de calcul.

### H3 — Différence calcul (BOM, line endings, encoding)
Possible si CLAUDE.md doctrinal sha calculé sur Windows-side (CRLF) vs Linux-side (LF).

## 5. Investigation prescrite (Sprint V3.5+)

```powershell
cd C:\Users\elric\omega-project
# 1. Historique git du fichier
git log --oneline -- packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts | head -10

# 2. Diff par rapport au premier commit (état sealed initial)
git show HEAD~50:packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts | sha256sum

# 3. Test alternative hash (BOM-stripped)
(Get-Content -Raw -Encoding UTF8 .\packages\sovereign-engine\src\scoring\dispatcher\coefficients-v3-4.ts).TrimStart([char]0xFEFF) | Set-Content -NoNewline -Encoding utf8NoBOM tmp_no_bom.ts
sha256sum tmp_no_bom.ts
```

Effort estimé : 30 min - 1h forensic.

## 6. Critères PASS résolution

- [ ] Cause root identifiée (H1, H2 ou H3)
- [ ] Si H1 (modification non documentée) : décider si modification doit être revertée OU CLAUDE.md doctrinal mis à jour avec nouveau SHA256
- [ ] Si H2 (typo) : corriger CLAUDE.md doctrinal avec SHA256 empirique
- [ ] Si H3 (encoding) : documenter méthode canonique de calcul SHA256 dans CODEX v1.X
- [ ] Cas tous PASS : NCR fermé + commit sealed avec SHA256 cohérent

## 7. Décisions OMEGA

1. **NCR OPEN_P1_DEFERRED** : non bloquant sprints V2.1.X (chunking adaptatif indépendant)
2. **Bloquant** : tout commit code modifiant `coefficients-v3-4.ts` ou tout claim "V3.4 SEALED"
3. **CODEX v1.2 documente le drift** explicitement (§1.3) pour transparence
4. **Forensic Sprint V3.5+** dédié (1h max)

## 8. Liens

- [CLAUDE.md doctrinal](../CLAUDE.md) (Section R-METROLOGY mentionne SHA256 attendu)
- [CODEX v1.2 §1.3](CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md) — Noyau CALC V3.4 + drift notice
- [LAWS_REGISTRY.yaml LAW-SCORING-V34](governance/codex/OMEGA_LAWS_REGISTRY.yaml)
- [NCR_INDEX.yaml NCR_V3_4_SEAL_DRIFT](governance/codex/OMEGA_NCR_INDEX.yaml)

## 9. Verdict NCR

- **Statut** : `OPEN_P1_DEFERRED`
- **Confiance** : Haute (SHA256 vérifié empirique 2 fois 2026-05-27 + 2026-05-28, identique = pas de modification entre temps)
- **Forces** : Drift documenté transparemment, pas masqué
- **Faiblesses** : Cause root non identifiée (forensic différé)
- **Risques** : Si Sprint V3.5+ révèle modification non autorisée → audit doctrinal V-01 nécessaire
- **Action requise** : Sprint V3.5+ forensic (30 min - 1h)

---

_NCR V3.4 SEAL DRIFT produit par Claude (Cowork) — 2026-05-28 — Doctrine OMEGA v3.159.0 — Référencé par CODEX v1.2 LAW-SCORING-V34_
