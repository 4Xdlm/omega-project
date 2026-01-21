# OMEGA — PHASE 2: V4.4 CORE ENGINE

## Statut: ❌ ABSENT

---

## OBJECTIF

Implémenter le **moteur mathématique V4.4** conforme à la Vision Scellée.
Zéro narration. Zéro UI. Pure physique émotionnelle.

---

## MODULES À CRÉER

```
packages/emotion-v44-core/
├── src/
│   ├── math/
│   │   ├── decay.ts           # Loi L4 (décroissance organique)
│   │   ├── persistenceZ.ts    # Axe Z (mémoire temporelle)
│   │   ├── oscillation.ts     # cos(ω×t+φ)
│   │   └── hysteresis.ts      # λ_eff = λ_base × (1 − μ × Z/C)
│   └── engine/
│       ├── step.ts            # Une step temporelle
│       ├── simulate.ts        # Simulation N steps
│       └── validate.ts        # Vérification invariants
└── tests/
    ├── decay.test.ts
    ├── persistence.test.ts
    ├── oscillation.test.ts
    ├── determinism.test.ts
    └── integration.test.ts
```

---

## LOI CENTRALE (L4)

```
I(t) = E₀ + (I₀ − E₀) × e^(−λ_eff × t) × cos(ω × t + φ)

λ_eff = λ_base × (1 − μ × Z(t)/C)
```

---

## TESTS OBLIGATOIRES

| Test | Description |
|------|-------------|
| **Determinism** | Mêmes inputs → mêmes outputs → même hash |
| **Boundedness** | 0 ≤ Y ≤ 100, -10 ≤ X ≤ +10, pas de NaN/Infinity |
| **L4 Conformité** | Décroissance organique conforme |
| **Z Persistence** | Mémoire temporelle mesurable |
| **16 Emotions** | Tous coefficients présents et corrects |

---

## GATE 2

| Critère | Requis |
|---------|--------|
| Suite tests V4.4 | 100% PASS |
| Outputs déterministes | ✅ hashés |
| Bornes respectées | ✅ |
| Invariants validés | ✅ |

**Emplacement proof:** `PROOFS/phase2-V44CORE/`

---

## PERF AUTORISÉE

✅ **Oui, uniquement:**
- Vectorisation
- Typed arrays
- Stabilité numérique (epsilon, clamp)
- Buffers

⚠️ **Condition:** Résultats identiques (hash) ou différence mathématiquement justifiée

---

## PROCHAINE PHASE

→ **PHASE 3: INTEGRATION** (si GATE 2 = PASS)
