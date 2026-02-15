@echo off
set NODE_OPTIONS=--experimental-vm-modules
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\elric\omega-project\packages\sovereign-engine
echo === TEST: analyzeEmotionFromText on FR prose ===
"C:\Program Files\nodejs\node.exe" ..\..\node_modules\tsx\dist\cli.mjs -e "import { analyzeEmotionFromText, computeArousal } from '@omega/omega-forge'; const fr = 'La chaleur de sa paume irradiait. Sa main tremblait de peur. La douleur sourde dans sa poitrine. Une confiance enracinée dans la foi.'; const result = analyzeEmotionFromText(fr); console.log('=== FR EMOTION VECTOR ==='); for (const [k,v] of Object.entries(result)) { if (v > 0) console.log(k, '=', v); } console.log('arousal =', computeArousal(result)); console.log('=== ALL VALUES ==='); console.log(JSON.stringify(result, null, 2));"
