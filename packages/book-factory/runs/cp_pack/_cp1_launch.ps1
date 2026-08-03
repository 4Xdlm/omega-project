Set-Location C:\Users\elric\omega-project\packages\book-factory
$env:CP1_MODEL = "gemma4:31b"
$env:CP1_CANDIDATES = "7"
npx tsx src/c7/cp1-generate-pack.ts *>> runs\cp_pack\_CP1_RUN.log
