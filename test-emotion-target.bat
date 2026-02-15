@echo off
set NODE_OPTIONS=--experimental-vm-modules
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
"C:\Program Files\nodejs\node.exe" -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('../../golden/e2e/run_001/runs/13535cccff86620f/10-genesis/genesis-plan.json','utf8')); console.log(JSON.stringify(p.scenes[0].emotion,null,2));"
