# 00 — VERIFICATION LOG (claims porteurs re-vérifiés par l'instrument)

Per EMP-02 (Claude Code = seul arbitre runtime empirique) et règle « zéro conclusion fondée sur mémoire/sous-agent seul », les affirmations qui supportent les verdicts majeurs ont été re-vérifiées par grep/read direct de l'instrument principal le 2026-06-06.

| # | Claim porteur | Commande/preuve directe | Résultat | Verdict supporté |
|---|---|---|---|---|
| V1 | Aucun code `packages/**` n'importe `gateway/` | `Grep "from ['\"].*gateway/" path=packages glob=*.ts` | **No files found** | `gateway/` (canon_engine, memory_layer_nasa "World Model", ripple) = ORPHAN vis-à-vis des packages |
| V2 | Le substrat de délestage (tiering/decay/digest/hybrid) est exclu de l'API publique du memory layer | `Grep "memory_tiering\|memory_decay\|memory_digest\|memory_hybrid" path=gateway/src/memory/memory_layer_nasa/index.ts` | **No matches** | Le délestage/compression est CODÉ mais non exporté → non consommable → ORPHAN |
| V3 | La boucle de génération réelle n'instancie pas l'adaptateur épistémique (pas d'auto-recall) | `Grep "BookCanonAdapter\|adapter\|knows\|reveals" path=packages/book-factory/src/book-orchestrator.ts` | **No matches** | « La Bible ne peut pas oublier d'être consultée » = NON réalisé dans la boucle prod |
| V4 | `BIB_WORLD/CHARACTER/STYLE/PLOT` n'existe qu'en doctrine, zéro code | `grep BIB_WORLD/BIB_PLOT --include=*.ts/*.js/*.py` (hors node_modules, hors FORENSIC_V3) | **0 fichier** ; seule occurrence = `docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3-3.md:1384` | BIB_* = SPEC_ONLY |
| V5 | L'orphelinat de canon_engine est déjà acté par une NCR existante | `ls nexus/proof/ \| grep CANON_ENGINE` | `NCR_CANON_ENGINE_JUNCTION_ORPHAN.md` présent | Orphelinat = déjà documenté dans le repo, pas une nouveauté de ce forensic |
| V6 | Aucun mécanisme « auto-recall » nommé en code | `grep auto-recall\|auto_recall\|autoRecall --include=*.ts/*.py` | **0 hit** | Auto-recall sur mention = NOT_FOUND en code |
| V7 | `memory/ [ACTIF — World Model]` est bien la source du label « World Model » | `Read docs/OMEGA_CARTE_REPO_v1.md` ligne 112 | `├── memory/ [ACTIF — World Model]` ; doc daté 2026-03-24 | Le label « ACTIF » est un statut DOC daté, contredit par V1 (zéro importeur) → doc dit ACTIF, code dit ORPHAN |

## Conséquence méthodologique
Le seul désaccord doc↔code détecté et tranché par l'instrument : `OMEGA_CARTE_REPO_v1.md:112` marque le World Model « ACTIF » alors que le code prouve ORPHAN (V1+V2). **Le code fait foi** (Golden Rule #9 REPO=TRUTH ; le doc est un snapshot 2026-03-24). Voir `00_SOURCE_PRIORITY.md`.
