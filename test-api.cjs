// Quick test: does process.execPath + API call work?
const { execSync } = require('child_process');
const nodePath = process.execPath.replace(/\\/g, '/');
console.log('Node path:', nodePath);
console.log('Testing basic execSync with node path...');

try {
  const result = execSync(`"${nodePath}" -e "console.log('CHILD OK')"`, {
    encoding: 'utf8',
    timeout: 10000,
  });
  console.log('Child result:', result.trim());
} catch (e) {
  console.error('Child FAILED:', e.message);
}

// Now test API call
console.log('Testing API call...');
const script = `
  const https = require('https');
  const data = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 50,
    temperature: 0,
    system: 'Reply with exactly: OMEGA_FR_OK',
    messages: [{ role: 'user', content: 'ping' }],
  });
  const req = https.request({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', body.substring(0, 200));
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.write(data);
  req.end();
`.replace(/\n/g, ' ');

try {
  const result = execSync(`"${nodePath}" -e "${script.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env },
  });
  console.log('API result:', result.trim());
} catch (e) {
  console.error('API FAILED:', e.stderr || e.message);
}
