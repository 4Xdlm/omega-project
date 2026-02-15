@echo off
set NODE_OPTIONS=--experimental-vm-modules
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
"C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs -e "console.log('execPath:', process.execPath); const {execSync}=require('child_process'); const nodePath=process.execPath.replace(/\\\\/g,'/'); console.log('nodePath:', nodePath); try { const r=execSync('\"'+nodePath+'\" -e \"console.log(42)\"', {encoding:'utf8',timeout:5000}); console.log('result:', r.trim()); } catch(e) { console.log('ERROR:', e.message); }"
