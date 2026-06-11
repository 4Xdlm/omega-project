# HASH_RECONCILIATION — vérité des empreintes V3 (autorité)

**Date : 2026-06-11. Ce fichier fait foi pour les prochains rapports. Aucune ambiguïté ne doit subsister.**

| empreinte | nature | statut |
|---|---|---|
| `dc1616e27193` | citée « canon » dans triage / BREATH_PROXY_SPEC / docs AP9 antérieurs | **PÉRIMÉE / DOCUMENTAIRE** — ne correspond à AUCUN fichier V3 sur disque (vérifié : raw, strip, CRLF, NFC). Probablement hash d'un état pré-LANG-clean propagé par copie. **Ne plus utiliser.** |
| `24bb55dfa009…` | sha256(NFC) ET `buildCanonical.finalHash` de `runs/patch_v3/MANUSCRIT_V3_PATCHED.md` | **VRAIE BASE-CIBLE** — fichier d'où viennent toutes les ancres AP, certifié buildCanonical (baseOk=true). Le tag git `v3-patched-certified` pointe ce contenu. |
| `4cc04883…` | `buildCanonical.finalHash` du candidat micro-lot (7 patchs initiaux) | hash canon du 1ᵉʳ run (avant revert A236) |
| _(voir AP_MICROLOT7_REPORT)_ | `buildCanonical.finalHash` du candidat **6 patchs** (post-revert A236) | hash canon FINAL du candidat — autorité courante |

## Décision
- Les docs antérieurs citant `dc1616e27193` ne sont PAS réécrits (record historique) mais sont **supersédés** par ce fichier.
- Tout nouveau rapport cite `24bb55dfa009` comme base et le hash 6-patchs comme candidat.
- Le raw sha256(NFC) et le `buildCanonical.finalHash` coïncident pour la base (texte déjà canonique) mais peuvent diverger pour un texte modifié (projection canonique ≠ brut) — les deux sont consignés au LEDGER.
