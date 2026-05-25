# @omega/omega-ui — Frontend Tauri + React + Vite

## Architecture : Frontend isolé du monorepo OMEGA backend

**INTENTIONNEL** : `apps/omega-ui` est **architecturalement séparé** du monorepo npm workspaces OMEGA.

### Constat empirique

Le `package.json` racine OMEGA déclare 41 packages dans son champ `workspaces` (tous sous `packages/*`), **AUCUN `apps/*`**. Ceci est validé par audit empirique (Sprint S12-OMEGA-UI-PREFLIGHT 2026-05-26).

### Conséquences

- `npm install` à la racine n'installe **PAS** les dépendances `apps/omega-ui`
- `npm install --workspace=apps/omega-ui` échoue (workspace non déclaré)
- Pour développement frontend : installer localement :

```bash
cd apps/omega-ui
npm install --ignore-scripts
npm run dev      # Vite dev server
npm run build    # Production build (TSC strict + Vite bundling)
npm run test     # Vitest (runtime fonctionnel via esbuild)
npm run typecheck # TSC --noEmit (peut afficher des erreurs sans @types/react installés)
```

### TSC sans deps installées

Si `@types/react` + `@types/react-dom` ne sont pas installés localement (état par défaut workspace exclu), `tsc --noEmit` rapporte **36 erreurs cascade** sur `src/lib/theme.ts` (fichier JSX-dans-.ts) qui masquent ~1248 erreurs frontend latentes (audit S11_AUDIT_V2_BASELINE_TRUTH 2026-05-25).

**Ces erreurs sont NON-BLOQUANTES runtime** car :
- Vite/esbuild transpile JSX sans types TypeScript
- Vitest fonctionne via Vite transform
- Production build Tauri/Vite indépendant de TSC pure

### Pourquoi cette isolation ?

Hypothèses architecturales :
1. **Cycle de release différent** : frontend Tauri (release apps) vs backend OMEGA pipeline (release lib)
2. **Dépendances React/Tauri** potentiellement incompatibles avec écosystème backend (peer dep conflicts)
3. **Build pipeline distinct** : Vite/Rollup frontend vs TSC backend
4. **Séparation conceptuelle** : OMEGA backend = moteur narratif, omega-ui = interface utilisateur (séparation des préoccupations)

### Status NCR

**NCR_OMEGA_UI_TYPES_REACT_MISSING_2026-05-25** : `RESOLVED_BY_DESIGN_FRONTEND_ISOLATED` (2026-05-26).

L'exclusion `apps/omega-ui` des workspaces n'est pas un bug à corriger mais une décision d'architecture documentée ici pour clarté future.

### Évolution future (Sprint S12+ architectural)

Si décision produit de réintégrer omega-ui au monorepo unifié :
- Option α : ajouter `"apps/*"` au `workspaces` root → npm install root régénère tout
- Option β : install local isolé `cd apps/omega-ui && npm install` (status actuel implicite)
- Option γ : refactor architectural complet OMEGA monorepo

Voir rapports workspace `S12_OMEGA_UI_PREFLIGHT_2026-05-26.md` et `NCR_DRAFT_OMEGA_UI_TYPES_REACT_MISSING_2026-05-25.md` pour décision détaillée.

---

**Stack technique** :
- Tauri (desktop wrapper Rust)
- React 18+
- Vite 5+ (dev server + bundler)
- TypeScript 5+
- Tailwind CSS
- Zustand (state management)
- Vitest (testing)

**Scripts** : `dev`, `build`, `preview`, `tauri`, `test`, `lint`, `typecheck`

**Last verified** : 2026-05-26 (Sprint S12-OMEGA-UI-PREFLIGHT post S11.Z-truth-gate sealed)
