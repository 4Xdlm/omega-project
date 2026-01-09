#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * OMEGA POLICY ENGINE v2.0 TITANIUM
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 
 * Mini Policy Engine pour OMEGA Project
 * Décide: ALLOW / DENY / DENY_CRITICAL
 * Crée automatiquement les NCR en cas de DENY
 * 
 * Usage:
 *   node policy-check.js --cmd "git push origin master"
 *   node policy-check.js --check sanctuary
 *   node policy-check.js --phase phase32_0 --check artifacts
 *   node policy-check.js --phase phase32_0 --check all
 * 
 * Exit codes:
 *   0 = ALLOW
 *   2 = DENY
 *   3 = DENY_CRITICAL
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  policyFile: "POLICY.yml",
  ncrLogFile: "history/NCR_LOG.md",
  pushPendingFile: "history/PUSH_PENDING.md",
  verbose: process.argv.includes("--verbose") || process.argv.includes("-v"),
  autoNcr: !process.argv.includes("--no-ncr"),
  isGoldMaster: false, // Set dynamically based on phase
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════════════════

function log(msg) {
  if (CONFIG.verbose) console.error(`[INFO] ${msg}`);
}

function warn(msg) {
  console.error(`[WARN] ${msg}`);
}

function die(decision, reason, code) {
  console.log(decision);
  console.error(`Reason: ${reason}`);
  process.exit(code);
}

function readText(filepath) {
  return fs.readFileSync(filepath, "utf8");
}

function writeText(filepath, content) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, content, "utf8");
}

function appendText(filepath, content) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(filepath, content, "utf8");
}

function run(cmd) {
  try {
    return cp.execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8");
  } catch (e) {
    return null;
  }
}

function normalizeCmd(s) {
  return (s || "").trim().replace(/\s+/g, " ");
}

function startsWithAny(str, prefixes) {
  return prefixes.some(p => str.startsWith(p));
}

function equalsAny(str, list) {
  return list.includes(str);
}

function containsAny(str, patterns) {
  return patterns.some(p => str.includes(p));
}

function getTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function getDateStamp() {
  return new Date().toISOString().substring(0, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// YAML PARSER (simple, built-in)
// ═══════════════════════════════════════════════════════════════════════════════════════════

function tryRequireYaml() {
  try { return require("yaml"); } catch {}
  try { return require("js-yaml"); } catch {}
  return null;
}

function parseYamlSimple(content) {
  // Très basique - pour les cas où aucune lib YAML n'est disponible
  // Ne gère que les structures simples
  const lines = content.split("\n");
  const result = {};
  let currentKey = null;
  let currentList = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    // Liste item
    if (trimmed.startsWith("- ")) {
      if (currentList !== null) {
        currentList.push(trimmed.substring(2).replace(/^["']|["']$/g, ""));
      }
      continue;
    }
    
    // Key: value ou Key:
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim();
      
      if (value === "" || value === "|") {
        // C'est soit un objet soit une liste
        currentKey = key;
        currentList = [];
        result[key] = currentList;
      } else {
        result[key] = value.replace(/^["']|["']$/g, "");
        currentList = null;
      }
    }
  }
  
  return result;
}

function loadPolicy(policyPath) {
  if (!fs.existsSync(policyPath)) {
    die("DENY_CRITICAL", `POLICY.yml not found at: ${policyPath}`, 3);
  }
  
  const raw = readText(policyPath);
  const yamlLib = tryRequireYaml();
  
  if (yamlLib) {
    log("Using YAML library for parsing");
    if (yamlLib.parse) return yamlLib.parse(raw);
    if (yamlLib.load) return yamlLib.load(raw);
  }
  
  // Fallback: simple parsing
  warn("No YAML library found, using simple parser (install 'yaml' or 'js-yaml' for full support)");
  return parseYamlSimple(raw);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// NCR MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════════════════

let ncrCounter = 0;

function getNextNcrId() {
  // Lire le fichier NCR pour trouver le dernier ID
  const ncrPath = path.resolve(process.cwd(), CONFIG.ncrLogFile);
  if (fs.existsSync(ncrPath)) {
    const content = readText(ncrPath);
    const matches = content.match(/NCR-(\d+)/g);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const lastNum = parseInt(lastMatch.replace("NCR-", ""), 10);
      return `NCR-${String(lastNum + 1).padStart(3, "0")}`;
    }
  }
  return "NCR-001";
}

function createNcr(severity, reason, cmd, phase) {
  if (!CONFIG.autoNcr) return null;
  
  const ncrId = getNextNcrId();
  const timestamp = getTimestamp();
  const commit = run("git rev-parse --short HEAD")?.trim() || "unknown";
  
  const ncrEntry = `
## ${ncrId}
| Field | Value |
|-------|-------|
| Date | ${timestamp} |
| Phase | ${phase || "N/A"} |
| Severity | ${severity} |
| Command | \`${cmd || "N/A"}\` |
| Reason | ${reason} |
| Commit | ${commit} |
| Status | OPEN |

---
`;

  const ncrPath = path.resolve(process.cwd(), CONFIG.ncrLogFile);
  
  // Créer le fichier s'il n'existe pas
  if (!fs.existsSync(ncrPath)) {
    const header = `# OMEGA — NCR LOG (Non-Conformance Reports)

> Ce fichier est **APPEND-ONLY**. Ne jamais supprimer d'entrées.

---
`;
    writeText(ncrPath, header);
  }
  
  appendText(ncrPath, ncrEntry);
  log(`NCR created: ${ncrId}`);
  
  return ncrId;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// SANCTUARY CHECK
// ═══════════════════════════════════════════════════════════════════════════════════════════

function globPathsToGitArgs(globs) {
  const cleaned = [];
  for (const g of globs) {
    const base = g.replace(/\/\*\*$/, "").replace(/\*\*$/, "");
    if (base) cleaned.push(base);
  }
  return cleaned;
}

function checkSanctuaries(policy) {
  const baseTag = policy?.sanctuary_base_tag;
  if (!baseTag) {
    return { ok: true, note: "No sanctuary_base_tag set in policy." };
  }
  
  const sanctuaries = policy?.sanctuaries || [];
  if (sanctuaries.length === 0) {
    return { ok: true, note: "No sanctuaries declared." };
  }
  
  const args = globPathsToGitArgs(sanctuaries);
  if (args.length === 0) {
    return { ok: true, note: "No valid sanctuary paths." };
  }
  
  // Vérifier si le tag existe
  const tagExists = run(`git tag -l "${baseTag}"`);
  if (!tagExists || tagExists.trim() === "") {
    return { ok: false, reason: `Base tag '${baseTag}' does not exist`, cmd: `git tag -l "${baseTag}"` };
  }
  
  // Comparer baseTag..HEAD pour ces paths
  const pathArgs = args.map(a => `"${a}"`).join(" ");
  const cmd = `git diff --name-only ${baseTag}..HEAD -- ${pathArgs}`;
  const out = run(cmd);
  
  if (out === null) {
    return { ok: false, reason: "Git diff command failed", cmd };
  }
  
  const modified = out.trim();
  if (modified.length > 0) {
    return { 
      ok: false, 
      reason: "Sanctuary files modified since base tag",
      modified: modified.split("\n"),
      cmd 
    };
  }
  
  return { ok: true, note: `Sanctuaries unchanged since ${baseTag}` };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ARTIFACTS CHECK
// ═══════════════════════════════════════════════════════════════════════════════════════════

function renderTemplate(template, phase) {
  const phaseUpper = phase.replace("phase", "PHASE_").toUpperCase();
  return template
    .replace(/{phase}/g, phase)
    .replace(/{phase_upper}/g, phaseUpper);
}

function checkArtifacts(policy, phase) {
  if (!phase) {
    return { ok: true, note: "No phase specified for artifact check." };
  }
  
  const requirements = policy?.phase_requirements;
  if (!requirements) {
    return { ok: true, note: "No phase requirements defined in policy." };
  }
  
  const requiredFiles = requirements.required_files || [];
  const missing = [];
  
  for (const template of requiredFiles) {
    const relPath = renderTemplate(template, phase);
    const absPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(absPath)) {
      missing.push(relPath);
    }
  }
  
  // Check ZIP directory
  if (requirements.zip_required) {
    const zipPath = renderTemplate(requirements.zip_path_pattern || "archives/{phase}/", phase);
    const absZipPath = path.resolve(process.cwd(), zipPath);
    if (!fs.existsSync(absZipPath)) {
      missing.push(zipPath);
    }
  }
  
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  
  return { ok: true, note: "All required artifacts present." };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// COMMAND CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════════════════

function classifyCommand(policy, cmdRaw, phase) {
  const cmd = normalizeCmd(cmdRaw);
  
  if (!cmd) {
    return { decision: "DENY", code: 2, reason: "Empty command" };
  }
  
  const commands = policy?.commands || {};
  const unknownPolicy = policy?.unknown_policy || { default: "DENY" };
  
  // Check if in GOLD MASTER phase
  const isGold = phase && (phase.includes("42") || policy?.gold_master?.phase === phase);
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // 1. Check FORBIDDEN first (highest priority)
  // ─────────────────────────────────────────────────────────────────────────────────────────
  const forbiddenPrefix = commands.forbidden_prefix || [];
  if (startsWithAny(cmd, forbiddenPrefix)) {
    return { 
      decision: "DENY_CRITICAL", 
      code: 3, 
      reason: `Forbidden command prefix detected` 
    };
  }
  
  // Check GOLD MASTER specific forbidden
  if (isGold) {
    const forbiddenGold = commands.forbidden_gold_master || [];
    if (startsWithAny(cmd, forbiddenGold) || equalsAny(cmd, forbiddenGold)) {
      return {
        decision: "DENY_CRITICAL",
        code: 3,
        reason: "Command forbidden in GOLD MASTER phase"
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // 2. Check SAFE EXACT
  // ─────────────────────────────────────────────────────────────────────────────────────────
  const safeExact = commands.safe_exact || [];
  if (equalsAny(cmd, safeExact)) {
    return { decision: "ALLOW", code: 0, reason: "Safe exact command" };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // 3. Check SAFE PREFIX
  // ─────────────────────────────────────────────────────────────────────────────────────────
  const safePrefix = commands.safe_prefix || [];
  if (startsWithAny(cmd, safePrefix)) {
    return { decision: "ALLOW", code: 0, reason: "Safe prefix command" };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // 4. Check UNKNOWN policy
  // ─────────────────────────────────────────────────────────────────────────────────────────
  
  // Check for DENY_CRITICAL patterns
  const criticalPatterns = unknownPolicy.deny_critical_if_contains || [];
  if (containsAny(cmd, criticalPatterns)) {
    return {
      decision: "DENY_CRITICAL",
      code: 3,
      reason: "Unknown command contains critical risk pattern"
    };
  }
  
  // Check for DENY patterns
  const denyPatterns = unknownPolicy.deny_if_contains || [];
  if (containsAny(cmd, denyPatterns)) {
    return {
      decision: "DENY",
      code: 2,
      reason: "Unknown command contains risk pattern"
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // 5. Apply DEFAULT
  // ─────────────────────────────────────────────────────────────────────────────────────────
  const defaultDecision = unknownPolicy.default || "DENY";
  
  if (defaultDecision === "ALLOW") {
    return { decision: "ALLOW", code: 0, reason: "Unknown command (default allow - not recommended)" };
  }
  
  return { 
    decision: "DENY", 
    code: 2, 
    reason: "Unknown command (conservative deny)" 
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const args = {
    phase: null,
    cmd: null,
    check: null,  // "sanctuary" | "artifacts" | "all"
    verbose: false,
    noNcr: false,
    help: false,
  };
  
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--phase" || a === "-p") args.phase = argv[++i];
    else if (a === "--cmd" || a === "-c") args.cmd = argv[++i];
    else if (a === "--check") args.check = argv[++i];
    else if (a === "--verbose" || a === "-v") args.verbose = true;
    else if (a === "--no-ncr") args.noNcr = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  
  return args;
}

function printHelp() {
  console.log(`
OMEGA Policy Engine v2.0 TITANIUM

Usage:
  node policy-check.js [options]

Options:
  --cmd, -c <command>     Check if command is allowed
  --phase, -p <phase>     Specify phase (e.g., phase32_0)
  --check <mode>          Run check: sanctuary, artifacts, all
  --verbose, -v           Show detailed output
  --no-ncr                Don't auto-create NCR on DENY
  --help, -h              Show this help

Examples:
  node policy-check.js --cmd "git push origin master"
  node policy-check.js --check sanctuary
  node policy-check.js --phase phase32_0 --check artifacts
  node policy-check.js --phase phase32_0 --check all --cmd "npm test"

Exit codes:
  0 = ALLOW
  2 = DENY
  3 = DENY_CRITICAL
`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════════════════

(function main() {
  const args = parseArgs(process.argv);
  
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  
  CONFIG.verbose = args.verbose;
  CONFIG.autoNcr = !args.noNcr;
  
  // Load policy
  const policyPath = path.resolve(process.cwd(), CONFIG.policyFile);
  const policy = loadPolicy(policyPath);
  log(`Policy loaded: ${policyPath}`);
  
  // Determine check mode
  const checkMode = args.check || (args.cmd ? null : "all");
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // SANCTUARY CHECK
  // ─────────────────────────────────────────────────────────────────────────────────────────
  if (checkMode === "all" || checkMode === "sanctuary") {
    log("Checking sanctuaries...");
    const sanctResult = checkSanctuaries(policy);
    
    if (!sanctResult.ok) {
      const ncrId = createNcr("CRITICAL", sanctResult.reason, sanctResult.cmd, args.phase);
      console.log("DENY_CRITICAL");
      console.error(`Reason: ${sanctResult.reason}`);
      if (sanctResult.modified) {
        console.error("Modified files:");
        sanctResult.modified.forEach(f => console.error(`  - ${f}`));
      }
      if (ncrId) console.error(`NCR created: ${ncrId}`);
      process.exit(3);
    }
    
    log(sanctResult.note);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // ARTIFACTS CHECK
  // ─────────────────────────────────────────────────────────────────────────────────────────
  if ((checkMode === "all" || checkMode === "artifacts") && args.phase) {
    log(`Checking artifacts for ${args.phase}...`);
    const artifactResult = checkArtifacts(policy, args.phase);
    
    if (!artifactResult.ok) {
      const reason = `Missing phase artifacts: ${artifactResult.missing.join(", ")}`;
      const ncrId = createNcr("MEDIUM", reason, null, args.phase);
      console.log("DENY");
      console.error(`Reason: ${reason}`);
      console.error("Missing files:");
      artifactResult.missing.forEach(f => console.error(`  - ${f}`));
      if (ncrId) console.error(`NCR created: ${ncrId}`);
      process.exit(2);
    }
    
    log(artifactResult.note);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // COMMAND CHECK
  // ─────────────────────────────────────────────────────────────────────────────────────────
  if (args.cmd) {
    log(`Checking command: ${args.cmd}`);
    const result = classifyCommand(policy, args.cmd, args.phase);
    
    if (result.decision !== "ALLOW") {
      const severity = result.decision === "DENY_CRITICAL" ? "CRITICAL" : "MEDIUM";
      const ncrId = createNcr(severity, result.reason, args.cmd, args.phase);
      if (ncrId) console.error(`NCR created: ${ncrId}`);
    }
    
    console.log(result.decision);
    console.error(`Reason: ${result.reason}`);
    process.exit(result.code);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────────────────
  // SUCCESS (checks only, no command)
  // ─────────────────────────────────────────────────────────────────────────────────────────
  console.log("ALLOW");
  console.error("Reason: All checks passed");
  process.exit(0);
})();
