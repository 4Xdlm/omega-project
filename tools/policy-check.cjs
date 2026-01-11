#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════════════════
// OMEGA POLICY ENGINE v2.0 TITANIUM
// Parsing: && chains, $(...) substitutions, tar rules
// ═══════════════════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════

const SANCTUARIES = [
  'OMEGA_SENTINEL_SUPREME',
  'packages/sentinel',
  'packages/genome',
  'packages/mycelium',
  'packages/nexus'
];

const SAFE_EXACT = [
  'git status', 'git status --short', 'git status -s',
  'git diff', 'git diff --name-only', 'git diff --cached', 'git diff --cached --name-only',
  'git log', 'git log -1', 'git log --oneline', 'git log --oneline -10',
  'git show', 'git show HEAD',
  'git describe', 'git describe --tags', 'git describe --tags --abbrev=0',
  'git rev-parse HEAD', 'git rev-parse --short HEAD',
  'git branch', 'git branch -a', 'git branch -v', 'git branch --show-current',
  'git remote -v', 'git tag -l', 'git tag --list', 'git fetch',
  'pwd', 'ls', 'ls -la', 'ls -lah', 'dir', 'tree',
  'cat', 'type', 'head', 'tail', 'more', 'less', 'wc', 'wc -l',
  'sha256sum', 'md5sum', 'date', 'hostname', 'whoami', 'which', 'where',
  'node --version', 'npm --version', 'npm test', 'npm run test',
  'npm run build', 'npm run lint', 'npm ls', 'npm list',
  'zip --version', 'tar --version'
];

const SAFE_PREFIX = [
  'mkdir', 'mkdir -p', 'touch', 'cp ', 'copy ', 'mv ', 'move ',
  'zip ', 'zip -r', 'unzip', 'tar -c', 'tar -t', 'tar --create', 'tar --list',
  'grep', 'find ', 'diff ', 'tee ', 'sort ', 'uniq ', 'cut ', 'awk ', 'sed ',
  'Get-FileHash', 'sha256sum ', 'shasum ',
  'echo ', 'printf ', 'Write-Output',
  'git add certificates/', 'git add evidence/', 'git add history/',
  'git add packages/integration-nexus-dep/', 'git add docs/', 'git add README',
  'git commit ', 'git commit -m', 'git commit --dry-run',
  'git tag -a ', 'git tag --dry-run',
  'git push origin master', 'git push origin cycle-43', 'git push -u origin cycle-43',
  'git push --dry-run', 'git checkout -b cycle-', 'git checkout cycle-',
  'git fetch --tags',
  'npm run ', 'npx ', 'node ',
  'New-Item', 'Get-ChildItem', 'Copy-Item', 'Move-Item',
  'Compress-Archive', 'Expand-Archive',
  'TIMESTAMP=', 'COMMIT=', 'TAG='
];

const FORBIDDEN_PREFIX = [
  'rm ', 'rm -', 'rmdir', 'del ', 'del /', 'Remove-Item', 'unlink',
  'git reset', 'git clean', 'git push --force', 'git push -f',
  'git rebase', 'git filter-branch', 'git reflog expire', 'git gc --prune',
  'git pull', 'git merge', 'git stash',
  'git tag -d', 'git push --delete', 'git push origin :',
  'git add -A', 'git add .', 'git add --all',
  'sudo ', 'chmod ', 'chown ', 'format ', 'fdisk ', 'mkfs'
];

const SUBSTITUTION_SAFE = [
  'git rev-parse HEAD', 'git rev-parse --short HEAD',
  'git describe --tags', 'git describe --tags --abbrev=0',
  'git branch --show-current',
  'date', 'date +%Y%m%d', 'date +%Y%m%d_%H%M', 'date +%Y-%m-%d', 'date +%H%M%S',
  'pwd', 'whoami', 'hostname'
];

const PIPE_EXCEPTIONS = ['| tee ', '| grep ', '| head ', '| tail ', '| wc ', '| sort', '| uniq'];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PARSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════

function extractSubstitutions(cmd) {
  const subs = [];
  const regex = /\$\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(cmd)) !== null) {
    subs.push(match[1].trim());
  }
  return subs;
}

function splitChain(cmd) {
  // Split on && but not inside $()
  const segments = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < cmd.length; i++) {
    if (cmd[i] === '$' && cmd[i+1] === '(') {
      depth++;
      current += cmd[i];
    } else if (cmd[i] === ')' && depth > 0) {
      depth--;
      current += cmd[i];
    } else if (cmd[i] === '&' && cmd[i+1] === '&' && depth === 0) {
      segments.push(current.trim());
      current = '';
      i++; // Skip second &
    } else {
      current += cmd[i];
    }
  }
  if (current.trim()) {
    segments.push(current.trim());
  }
  return segments;
}

function checkPipe(cmd) {
  if (!cmd.includes('|')) return { hasPipe: false };
  
  for (const exc of PIPE_EXCEPTIONS) {
    if (cmd.includes(exc)) return { hasPipe: true, allowed: true };
  }
  return { hasPipe: true, allowed: false };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// SINGLE COMMAND CHECK (no chains)
// ═══════════════════════════════════════════════════════════════════════════════════════════

function checkSingleCommand(cmd) {
  const trimmed = cmd.trim();
  
  // 1. Check forbidden (DENY_CRITICAL)
  for (const prefix of FORBIDDEN_PREFIX) {
    if (trimmed.startsWith(prefix) || trimmed.includes(prefix)) {
      return { verdict: 'DENY_CRITICAL', reason: `Forbidden pattern: ${prefix}` };
    }
  }
  
  // 2. Check sanctuary modifications
  for (const sanc of SANCTUARIES) {
    if (trimmed.includes(sanc) && (
      trimmed.includes('git add') || 
      trimmed.includes('rm ') || 
      trimmed.includes('mv ') ||
      trimmed.includes('> ')
    )) {
      return { verdict: 'DENY_CRITICAL', reason: `Sanctuary modification: ${sanc}` };
    }
  }
  
  // 3. Check tar extraction without -C
  if (trimmed.match(/tar\s+(-[^c]*x|-x|--extract)/) && !trimmed.includes('-C ')) {
    return { verdict: 'DENY', reason: 'tar extraction without -C destination' };
  }
  
  // 4. Check pipe
  const pipeCheck = checkPipe(trimmed);
  if (pipeCheck.hasPipe && !pipeCheck.allowed) {
    return { verdict: 'DENY', reason: 'Pipe not in whitelist' };
  }
  
  // 5. Check substitutions
  const subs = extractSubstitutions(trimmed);
  for (const sub of subs) {
    let subSafe = false;
    for (const safe of SUBSTITUTION_SAFE) {
      if (sub === safe || sub.startsWith(safe)) {
        subSafe = true;
        break;
      }
    }
    if (!subSafe) {
      return { verdict: 'DENY', reason: `Substitution not whitelisted: $(${sub})` };
    }
  }
  
  // 6. Check safe exact
  for (const safe of SAFE_EXACT) {
    if (trimmed === safe || trimmed.startsWith(safe + ' ')) {
      return { verdict: 'ALLOW', reason: `Safe exact: ${safe}` };
    }
  }
  
  // 7. Check safe prefix
  for (const prefix of SAFE_PREFIX) {
    if (trimmed.startsWith(prefix)) {
      return { verdict: 'ALLOW', reason: `Safe prefix: ${prefix}` };
    }
  }
  
  // 8. Default: DENY unknown
  return { verdict: 'DENY', reason: 'Unknown command pattern' };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// MAIN CHECK (handles chains)
// ═══════════════════════════════════════════════════════════════════════════════════════════

function checkCommand(cmd) {
  const segments = splitChain(cmd);
  
  if (segments.length === 1) {
    return checkSingleCommand(segments[0]);
  }
  
  // Multiple segments: ALL must be ALLOW
  const results = [];
  for (const seg of segments) {
    const result = checkSingleCommand(seg);
    results.push({ segment: seg, ...result });
    
    if (result.verdict === 'DENY_CRITICAL') {
      return { 
        verdict: 'DENY_CRITICAL', 
        reason: `Chain contains critical violation: ${result.reason}`,
        details: results 
      };
    }
    if (result.verdict === 'DENY') {
      return { 
        verdict: 'DENY', 
        reason: `Chain contains denied command: ${result.reason}`,
        details: results 
      };
    }
  }
  
  return { 
    verdict: 'ALLOW', 
    reason: `All ${segments.length} segments are SAFE`,
    details: results 
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// NCR CREATION
// ═══════════════════════════════════════════════════════════════════════════════════════════

function createNCR(cmd, result) {
  const ncrDir = path.join(process.cwd(), 'history');
  const ncrFile = path.join(ncrDir, 'NCR_LOG.md');
  
  if (!fs.existsSync(ncrDir)) {
    fs.mkdirSync(ncrDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString();
  const ncrId = `NCR-${Date.now()}`;
  const severity = result.verdict === 'DENY_CRITICAL' ? 'CRITICAL' : 'MEDIUM';
  
  const entry = `
## ${ncrId}

| Field | Value |
|-------|-------|
| **Timestamp** | ${timestamp} |
| **Severity** | ${severity} |
| **Verdict** | ${result.verdict} |
| **Command** | \`${cmd}\` |
| **Reason** | ${result.reason} |

---
`;

  if (fs.existsSync(ncrFile)) {
    fs.appendFileSync(ncrFile, entry);
  } else {
    const header = `# NCR LOG — Non-Conformance Reports

> Auto-generated by policy-check.cjs
> Append-only — DO NOT EDIT

---
${entry}`;
    fs.writeFileSync(ncrFile, header);
  }
  
  return ncrId;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════════════════

function printHelp() {
  console.log(`
OMEGA Policy Engine v2.0 TITANIUM

Usage:
  node policy-check.cjs --cmd "<command>"
  node policy-check.cjs --help

Features:
  - Parses && chains (all segments must be SAFE)
  - Validates $(...) substitutions against whitelist
  - tar extraction requires -C destination
  - Auto-creates NCR on DENY/DENY_CRITICAL

Exit codes:
  0 = ALLOW
  2 = DENY (creates NCR)
  3 = DENY_CRITICAL (creates NCR)
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  
  const cmdIndex = args.indexOf('--cmd');
  if (cmdIndex === -1 || !args[cmdIndex + 1]) {
    console.error('Error: --cmd "<command>" required');
    process.exit(1);
  }
  
  const cmd = args[cmdIndex + 1];
  const result = checkCommand(cmd);
  
  // Output
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║ OMEGA POLICY ENGINE v2.0                                      ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
  console.log(`\nCommand: ${cmd}`);
  console.log(`Verdict: ${result.verdict}`);
  console.log(`Reason:  ${result.reason}`);
  
  if (result.details) {
    console.log(`\nChain analysis:`);
    result.details.forEach((d, i) => {
      console.log(`  ${i+1}. [${d.verdict}] ${d.segment}`);
    });
  }
  
  // NCR + exit code
  if (result.verdict === 'DENY' || result.verdict === 'DENY_CRITICAL') {
    const ncrId = createNCR(cmd, result);
    console.log(`\n⚠️  NCR created: ${ncrId}`);
    console.log(`\n❌ DO NOT EXECUTE\n`);
    process.exit(result.verdict === 'DENY_CRITICAL' ? 3 : 2);
  }
  
  console.log(`\n✅ SAFE TO EXECUTE\n`);
  process.exit(0);
}

main();
