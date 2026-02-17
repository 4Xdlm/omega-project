# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — TEMPLATE SEAL COMPLETE (Fin de Sprint)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Version: 1.0
# Rule: RULE-SEAL-01 (fail-closed)
# Date: 2026-02-17
# Status: RÉFÉRENCE PERMANENTE
#
# Ce template est OBLIGATOIRE en fin de chaque sprint.
# Un sprint sans ce bloc = sprint NON SEALED.
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## MODE D'EMPLOI

À la fin de **chaque sprint** (autonome ou assisté), l'IA DOIT :

1. **Remplir** ce template avec les valeurs réelles
2. **Générer** les fichiers proofpack sur disque
3. **Vérifier** Test-Path = True True
4. **Mettre à jour** SEAL_LOCK.json
5. **Coller** le bloc SEAL COMPLETE dans le chat

**Si une seule condition manque → SEAL INVALID → pipeline STOP.**

---

## TEMPLATE (copier-coller et remplir)

```markdown
# ═══ SEAL COMPLETE — Sprint [N] ═══

## 1. IDENTITÉ
| Attribut | Valeur |
|----------|--------|
| Sprint | [N] — [NOM] |
| Tag | sprint-[N]-sealed |
| HEAD | [HASH_8_CHARS] |
| Date | [YYYY-MM-DD] |

## 2. TESTS (preuve 1/3)
| Attribut | Valeur |
|----------|--------|
| Avant | [X] tests |
| Après | [Y] tests |
| Ajoutés | +[Y-X] |
| Régressions | 0 |
| Résultat | **[Y]/[Y] PASS** |

## 3. TAG GIT (preuve 2/3)
| Attribut | Valeur |
|----------|--------|
| Tag local | ✅ sprint-[N]-sealed |
| Tag remote | ✅ pushed |
| Commit | [HASH] |

## 4. PROOFPACK DISQUE (preuve 3/3)
| Fichier | Test-Path |
|---------|-----------|
| `proofpacks/sprint-[N]/Sprint[N]_SEAL_REPORT.md` | ✅ True |
| `proofpacks/sprint-[N]/[N].6/npm_test.txt` | ✅ True |

## 5. SEAL_LOCK.json UPDATED
| Champ | Valeur |
|-------|--------|
| seal_target.id | [N] |
| seal_target.tag | sprint-[N]-sealed |
| seal_target.commit | [HASH_8_CHARS] |

## 6. INVARIANTS
| ID | Description | Status |
|----|-------------|--------|
| [ART-XXX-01] | [desc] | PASS |
| [ART-XXX-02] | [desc] | PASS |

## 7. VERDICT
**SEAL: VALID ✅**
```

---

## RÈGLES STRICTES

### Ce qui BLOQUE le seal (fail-closed)

| Condition | Si absent |
|-----------|-----------|
| Tests 100% PASS | ❌ SEAL INVALID |
| Tag git local + remote | ❌ SEAL INVALID |
| SEAL_REPORT.md sur disque | ❌ SEAL INVALID |
| npm_test.txt sur disque | ❌ SEAL INVALID |
| SEAL_LOCK.json mis à jour | ❌ SEAL INVALID |
| Marker "Verdict: PASS" dans SEAL_REPORT | ❌ SEAL INVALID |
| Marker "passed" dans npm_test.txt | ❌ SEAL INVALID |

### Ce qui est TOLÉRÉ

| Situation | Action |
|-----------|--------|
| Ancien tags rejetés (already exists) | ✅ Ignoré |
| Closure dossier différent (20.6 vs 20.7) | ✅ OK si SEAL_LOCK.json mis à jour |
| Format runner changé | ⚠️ Mettre à jour minimal_markers dans SEAL_LOCK.json |

---

## ANTI-PATTERN : CE QUI NE DOIT PLUS ARRIVER

| Situation | Pourquoi c'est un problème |
|-----------|---------------------------|
| "Le module TypeScript existe" mais pas le fichier disque | Le gate passe en mémoire mais pas en réalité |
| Sprint autonome sans génération proofpack | Le cerveau y croit, le disque non |
| "on le fera plus tard" | RULE-SEAL-01 = fail-closed = maintenant ou jamais |
| Paths hardcodés sans SEAL_LOCK.json | Dérive silencieuse du naming |

---

**FIN DU TEMPLATE — OMEGA SEAL COMPLETE v1.0**
