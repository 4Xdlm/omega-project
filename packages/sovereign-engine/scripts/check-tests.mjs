import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  const out = execSync('npx vitest run --reporter=json 2>/dev/null', {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
  });
  const json = JSON.parse(out);
  const summary = {
    passed: json.numPassedTests,
    failed: json.numFailedTests,
    total: json.numTotalTests,
    suitesPassed: json.numPassedTestSuites,
    suitesFailed: json.numFailedTestSuites,
  };
  writeFileSync('test-summary.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (e) {
  console.error('ERROR:', e.message);
}
