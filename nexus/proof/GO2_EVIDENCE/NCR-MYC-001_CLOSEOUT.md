# NCR-MYC-001 — CLOSEOUT (chiffré, critères tribunal vérifiés un par un)
**Date : 2026-06-06 · Statut : FERMÉE · Preuves : runs/c8_book60k/NCR_MYC_001_CLOSEOUT.json + MYCELIUM_V2_CLEAN.json**
## Les 10 items exigés
1. **Cast avant** : Dubois×7/Fresnel×3/Garcia×973/.../Henri×5 (bruit gravé) → **après** : Garcia×973 · Gaspard×451 · **Henri×476** · Léna×551 · Yvon×823 (5 validés, RIEN d'autre).
2. **Tokens bloqués stoplist** : Acte, Clac, Chapitre, Scène (structurels — « Acte×46 » ne peut plus exister).
3. **Candidats séparés** (jamais gravés au cast) : Ker-Morvan×86 (lieu), Dubois×7, Jean×6, Ker×4, Fresnel×3 (lentille), Marc×3, Paris×3.
4. **validatedCast final** : Léna, Garcia, Gaspard, Yvon, Henri (autorité plan C7 + décision C10).
5. **Table d'alias** : Marchetti→Léna · Squarcioni→Yvon · gardien→Henri · Morel→Henri.
6. **Ledger avant/après** : carnet:46 · dette:45 · naufrage:46 · **lettre:UNCERTAIN_LATE_RECALL · registre:UNCERTAIN_LATE_RECALL** (la règle 3-états est PRINCIPIELLE — recall dans le dernier quintile sans marqueur — elle s'applique identiquement aux deux builds, pas un fit post-hoc).
7. **lettre/registre** : UNCERTAIN_LATE_RECALL — plus JAMAIS de faux UNPAID dur.
8. **Hash Mycelium V2** : 9fc4216204ddb92ca97990bb30422f3cbf73a27cd29b0f82dcb4a5ede2f4528b (depuis la V1 RÉPARÉE, castSource=VALIDATED).
9. **Reproductibilité** : build A == build B → TRUE.
10. **Sensibilité** : V0 bruitée ≠ V1 réparée (à config validée identique) → TRUE.
## Critères PASS tribunal
Acte absent du cast ✓ · Fresnel absent (séparé en candidat) ✓ · Henri rattaché au gardien (×476) ✓ · lettre/registre non faux-UNPAID ✓ · same input=same hash ✓ · source changée=hash changé ✓ · tests 224/224 ×2 ✓ · tsc 0 ✓.
## Verdict : Mycelium PRODUCTION débloqué (l'ADN ne grave plus que du validé — schéma V2 avec provenance castSource gravée dans le hash).
