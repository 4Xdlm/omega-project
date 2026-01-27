const fs = require('fs');
const path = require('path');

function findPackages(dir, packages = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '.git') continue;
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      const pkgPath = path.join(fullPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          packages.push({
            path: path.relative('.', pkgPath).replace(/\\/g, '/'),
            name: pkg.name || 'unnamed',
            version: pkg.version || '0.0.0',
            hasExports: !!pkg.exports,
            isPrivate: !!pkg.private,
            dependencies: Object.keys(pkg.dependencies || {}),
            devDependencies: Object.keys(pkg.devDependencies || {}),
            peerDependencies: Object.keys(pkg.peerDependencies || {})
          });
        } catch (e) {}
      }
      if (item.name !== 'dist' && item.name !== 'build') {
        findPackages(fullPath, packages);
      }
    }
  }
  return packages;
}

const packages = findPackages('.');
const omegaPackages = packages.filter(p =>
  p.path.startsWith('packages/') ||
  p.path.startsWith('gateway/') ||
  p.path.startsWith('nexus/')
);

// Build edges
const edges = [];
for (const pkg of omegaPackages) {
  const allDeps = [...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies];
  for (const dep of allDeps) {
    if (dep.startsWith('@omega/') || omegaPackages.some(p => p.name === dep)) {
      edges.push({
        from: pkg.name,
        to: dep,
        type: pkg.dependencies.includes(dep) ? 'dependencies' :
              pkg.devDependencies.includes(dep) ? 'devDependencies' : 'peerDependencies'
      });
    }
  }
}

const result = {
  generated: new Date().toISOString(),
  source: 'NIGHTWATCH + completion',
  stats: {
    totalPackages: omegaPackages.length,
    packagesWithExports: omegaPackages.filter(p => p.hasExports).length,
    packagesWithoutExports: omegaPackages.filter(p => !p.hasExports).length,
    internalDependencies: edges.length
  },
  nodes: omegaPackages.map(p => ({
    name: p.name,
    path: p.path,
    version: p.version,
    hasExports: p.hasExports,
    isPrivate: p.isPrivate
  })),
  edges: edges
};

fs.writeFileSync('nexus/proof/phase-c/S6_packages_graph_complete.json', JSON.stringify(result, null, 2));
console.log('Nodes:', result.stats.totalPackages);
console.log('With exports:', result.stats.packagesWithExports);
console.log('Without exports:', result.stats.packagesWithoutExports);
console.log('Internal deps:', result.stats.internalDependencies);
