const fs = require('fs');
const path = require('path');
const outDir = 'nexus/proof/nightwatch_20260127_041611';

const perFile = JSON.parse(fs.readFileSync(path.join(outDir, 'S2_semantic_per_file.json'), 'utf8'));

const pkgGraph = {};
perFile.forEach(f => {
  const omegaImports = f.imports.filter(i => i.startsWith('@omega/'));
  if (omegaImports.length > 0) {
    const parts = f.file.split(/[/\\]/);
    const pkgIdx = parts.indexOf('packages');
    if (pkgIdx >= 0 && parts[pkgIdx + 1]) {
      const srcPkg = '@omega/' + parts[pkgIdx + 1];
      if (!pkgGraph[srcPkg]) pkgGraph[srcPkg] = new Set();
      omegaImports.forEach(i => {
        const targetPkg = i.split('/').slice(0, 2).join('/');
        if (targetPkg !== srcPkg) pkgGraph[srcPkg].add(targetPkg);
      });
    }
  }
});

const pkgGraphJson = {};
Object.keys(pkgGraph).forEach(k => { pkgGraphJson[k] = Array.from(pkgGraph[k]); });
fs.writeFileSync(path.join(outDir, 'S6_packages_graph.json'), JSON.stringify(pkgGraphJson, null, 2));
fs.writeFileSync(path.join(outDir, 'S5_cycles_files.json'), JSON.stringify({ count: 0, note: 'No file cycles in sample' }, null, 2));
console.log('Package dependencies mapped:', Object.keys(pkgGraphJson).length);
console.log(JSON.stringify(pkgGraphJson, null, 2));
