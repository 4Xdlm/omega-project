# 🚀 OMEGA UI BOOTSTRAP — Cockpit Minimal

**Version:** 0.1.0-bootstrap  
**Date:** 29 Décembre 2025  
**Objectif:** Premier cycle utilisateur fonctionnel, zéro design

---

## 📋 Prérequis

| Outil | Version | Vérification |
|-------|---------|--------------|
| Node.js | ≥18.0.0 | `node --version` |
| npm | ≥9.0.0 | `npm --version` |
| Rust | ≥1.70 | `rustc --version` |
| Tauri CLI | ≥2.0 | `npm run tauri --version` |

### Installation des prérequis Windows

```powershell
# 1. Node.js (si pas installé)
winget install OpenJS.NodeJS.LTS

# 2. Rust (si pas installé)
winget install Rustlang.Rust.MSVC

# 3. Redémarrer le terminal après installation Rust
```

---

## ⚡ Installation

```bash
# Depuis la racine du repo omega-project
cd ui

# Installer les dépendances
npm install

# Vérifier que tout compile
npm run typecheck
```

---

## 🎮 Commandes

| Commande | Description |
|----------|-------------|
| `npm run tauri dev` | Lancer l'app en mode développement |
| `npm run tauri build` | Compiler l'app (Windows .exe) |
| `npm run typecheck` | Vérifier les types TypeScript |
| `npm test` | Lancer les tests (à venir) |

---

## 📂 Structure

```
ui/
├── README_UI_BOOTSTRAP.md      ← Ce fichier
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
│
├── src/                        ← Code React
│   ├── main.tsx                ← Point d'entrée
│   ├── App.tsx                 ← Router principal
│   ├── App.css                 ← Styles minimaux
│   ├── components/
│   │   ├── Home.tsx            ← Écran 1: Sélection workspace
│   │   ├── RunConsole.tsx      ← Écran 2: Console live
│   │   └── Results.tsx         ← Écran 3: Résultats
│   ├── hooks/
│   │   └── useRunner.ts        ← Hook cycle exécution
│   ├── types/
│   │   └── index.ts            ← Types partagés
│   └── utils/
│       └── logger.ts           ← Logger fichier
│
├── src-tauri/                  ← Code Rust Tauri
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       └── lib.rs
│
├── scripts/
│   └── run_first_cycle.ts      ← Script cycle via Core
│
└── omega-ui-output/            ← Logs générés (créé auto)
```

---

## 🖥️ Écrans UI

### Écran 1 — Home

```
┌─────────────────────────────────────────┐
│  OMEGA UI Bootstrap                     │
│                                         │
│  [Select Workspace Folder]              │
│                                         │
│  📁 Selected: (none)                    │
│                                         │
│  [Run First Cycle] (désactivé)          │
└─────────────────────────────────────────┘
```

### Écran 2 — Run Console

```
┌─────────────────────────────────────────┐
│  Running...                  [Stop]     │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ [10:30:01] Starting cycle...     │  │
│  │ [10:30:01] Loading workspace...  │  │
│  │ [10:30:02] Validating...         │  │
│  │ [10:30:02] ✅ All checks passed  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Status: ██████████████████░░ RUNNING   │
└─────────────────────────────────────────┘
```

### Écran 3 — Results

```
┌─────────────────────────────────────────┐
│  ✅ PASS                                │
│                                         │
│  Duration: 1.234s                       │
│  Items checked: 20                      │
│                                         │
│  [Open Output Folder] [Copy Summary]    │
│                                         │
│  [← Back to Home]                       │
└─────────────────────────────────────────┘
```

---

## 📁 Outputs

Tous les logs sont sauvegardés dans `ui/omega-ui-output/` :

| Fichier | Description |
|---------|-------------|
| `YYYY-MM-DD_HH-MM-SS_run.log` | Log texte complet |
| `YYYY-MM-DD_HH-MM-SS_result.json` | Résultat structuré |

### Format result.json

```json
{
  "timestamp": "2025-12-29T10:30:02.123Z",
  "workspace": "C:/Users/user/omega-project",
  "status": "PASS",
  "duration_ms": 1234,
  "summary": {
    "tests": null,
    "invariants": 20,
    "notes": ["All invariants validated"]
  }
}
```

---

## ✅ Checklist "Ça marche"

- [ ] `npm install` OK (pas d'erreurs)
- [ ] `npm run tauri dev` lance l'app
- [ ] Bouton "Select Workspace" ouvre un dialogue
- [ ] Chemin affiché après sélection
- [ ] "Run First Cycle" exécute et affiche les logs
- [ ] Fichier `.log` créé dans `omega-ui-output/`
- [ ] Fichier `.json` créé dans `omega-ui-output/`
- [ ] Résumé affiché dans l'écran Results

---

## 🔧 Ce qui marche

- ✅ Sélection de workspace via dialogue natif
- ✅ Exécution d'un cycle de validation
- ✅ Affichage console live
- ✅ Sauvegarde logs/résultats
- ✅ Navigation Home → Run → Results

## ⚠️ Ce qui est mocké

- 🔶 Le cycle appelle `validateInvariants` du Core (fonctionnel mais basique)
- 🔶 Pas de streaming réel (batch output)

## ❌ Ce qui manque

- ❌ Design / Styling (volontairement)
- ❌ Tests unitaires UI
- ❌ Gestion erreurs avancée
- ❌ Multi-projet
- ❌ Timeline / Diff

---

## 🐛 Dépannage

### Erreur "Rust not found"

```powershell
# Installer Rust
winget install Rustlang.Rust.MSVC
# Redémarrer le terminal
```

### Erreur "tauri command not found"

```bash
npm install
# Le CLI Tauri est installé via les dépendances
```

### L'app ne se lance pas

```bash
# Vérifier les prérequis
node --version   # ≥18
rustc --version  # ≥1.70

# Réinstaller proprement
rm -rf node_modules
npm install
npm run tauri dev
```

---

## 📅 Historique

| Date | Version | Changement |
|------|---------|------------|
| 29/12/2025 | 0.1.0 | Création initiale — Bootstrap minimal |

---

**OMEGA UI Bootstrap — "Fonction oui, design zéro"**
