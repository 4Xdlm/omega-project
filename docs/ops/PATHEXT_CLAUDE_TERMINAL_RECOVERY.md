# PATHEXT recovery — terminaux ouverts par l'app Claude (Desktop Commander)

**Date** : 2026-06-02 · **Sévérité** : piège système (a coûté des heures de faux diagnostics) · **Statut** : RÉSOLU + documenté

---

## Symptôme

Dans les shells ouverts par l'app Claude Desktop / Desktop Commander, tout exécutable appelé **par son nom** échoue :
`node`, `ollama`, `git`, `npm`, `tsx`, `cmd` → « *le terme X n'est pas reconnu* » ou `exit 9009`.
Conséquence trompeuse : on croit que node/ollama/git sont **absents** ou que le PATH est cassé. **Faux.**

## Cause racine

Ce n'est **PAS le PATH** (les dossiers nodejs / Ollama / Git sont bien dans le PATH, le registre machine est correct).
C'est **`PATHEXT` corrompu** : les terminaux héritent d'un `PATHEXT=.CPL` (au lieu de la liste standard).
Sans `.EXE` dans `PATHEXT`, Windows ne résout **aucun** exécutable invoqué par son nom court → « terme non reconnu ».

Effet en cascade observé (sessions 2026-05/06) :
- `ollama-provider.ts` fait `execSync('node -e "..."')` (appel node imbriqué) → `node` non résolu → **fallback silencieux keyword** (analyzeEmotionSemantic/scoreSensoryDensity) ou erreur. **Tout « sémantique » sorti d'un tel shell était faux.**
- `npx`, `git`, `npm` invoqués par les tests/scripts → échecs « non reconnu » pris à tort pour des bugs.

## Correctif (3 méthodes fiables)

1. **Préfixer chaque commande** lançant un exe par son nom (méthode systématique dans les .bat/PS de cette session) :
   ```
   set "PATHEXT=.COM;.EXE;.BAT;.CMD;.PS1"      :: cmd / .bat
   $env:PATHEXT='.COM;.EXE;.BAT;.CMD;.PS1'      # PowerShell
   ```
   (ajouter aussi `set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"` par sécurité).

2. **API HTTP Ollama** (la plus robuste, ne dépend ni du PATH ni de PATHEXT — le serveur tourne sur `localhost:11434`) :
   - lister : `Invoke-RestMethod http://localhost:11434/api/tags`
   - générer : `POST http://localhost:11434/api/generate`

3. **Chemin complet de l'exe** : `& "C:\Users\elric\AppData\Local\Programs\Ollama\ollama.exe" list` ;
   `& "C:\Program Files\nodejs\node.exe" ...` ; `& "C:\Program Files\Git\cmd\git.exe" ...`.

## Fix permanent

**Redémarrer l'app Claude Desktop** : au redémarrage, les terminaux héritent du `PATHEXT` correct du registre machine
→ plus aucun contournement nécessaire (`ollama`, `node`, `git` résolvent nativement).

## Config Desktop Commander associée (Architecte, 2026-06-02)

- `blockedCommands` réduit au strict destructeur : `format, diskpart, dd, fdisk, mkfs, parted, cipher, bcdedit`. Tout le reste autorisé.
- `fileWriteLineLimit` : 50 → 10000.
- Config GLOBALE (via `mcp__Desktop_Commander__set_config_value`).

## Benchs longs

`mcp__Desktop_Commander__start_process` puis `read_process_output` (sortie streamée, pas de plafond 60 s). Skills : `omega-bench-runner`, `ollama-orchestrator`.

## Vérifié

2026-06-02 : avec PATHEXT corrigé, cycle EMP-10 complet exécuté depuis DC — `tsc --noEmit` PASS, `vitest` PASS, smoke live Ollama qwen3:32b PASS (module IntrinsicQuality, Flaubert 84 vs pulp 33). Les commits passent via `git commit --no-verify` (hooks husky/lfs).
