# OMEGA — PHASE 4: CLI & PROOFS INDUSTRIELS

## Statut: ❌ ABSENT

---

## OBJECTIF

Rendre V4.4 **utilisable** et **auditable** via CLI reproductible.

---

## MODULES À CRÉER

```
packages/omega-cli/
├── src/
│   ├── commands/
│   │   └── emotion.ts         # omega emotion --v44
│   └── output/
│       └── proof-generator.ts # Génération proof pack
```

---

## COMMANDE CLI

```bash
omega emotion --v44 --input <fichier.txt> --output <resultat.json>
```

---

## OUTPUT JSON

```json
{
  "version": "v4.4",
  "input_hash": "sha256:...",
  "timestamp": "ISO8601",
  "emotions": [
    {
      "id": "AMOUR",
      "intensity": 0.75,
      "persistence": 0.42,
      "trajectory": [...]
    }
  ],
  "trajectory_global": [...],
  "execution_time_ms": 142,
  "output_hash": "sha256:..."
}
```

---

## LIVRABLES

| Livrable | Description |
|----------|-------------|
| CLI fonctionnel | `omega emotion --v44` |
| `cli_run.txt` | Output complet |
| `out.json` | Résultat hashé |
| README | 5 lignes "how to reproduce" |

**Emplacement proof:** `PROOFS/phase4-CLI/`

---

## GATE 4

| Critère | Requis |
|---------|--------|
| CLI exécutable | ✅ |
| Output JSON valide | ✅ |
| Hash output | ✅ |
| Reproductible | ✅ (même input → même hash) |

---

## PERF AUTORISÉE

✅ **Oui:**
- Latence CLI
- Batch mode
- Streaming output

---

## PROCHAINE PHASE

→ **PHASE 5: FREEZE** (si GATE 4 = PASS)
