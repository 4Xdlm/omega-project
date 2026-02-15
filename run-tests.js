const { execSync } = require('child_process');
try {
  const result = execSync('npx vitest run', {
    cwd: 'C:/Users/elric/omega-project/packages/sovereign-engine',
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
  require('fs').writeFileSync('C:/Users/elric/omega-project/test-result.txt', result, 'utf8');
  console.log('PASS');
} catch (e) {
  const output = (e.stdout || '') + '\n' + (e.stderr || '');
  require('fs').writeFileSync('C:/Users/elric/omega-project/test-result.txt', output, 'utf8');
  console.log('FAIL');
}
