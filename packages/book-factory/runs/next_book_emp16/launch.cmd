@echo off
cd /d C:\Users\elric\omega-project\packages\book-factory
set C7_MODE=full
set C7_MODEL=gemma4:31b
set C7_OUT=runs/next_book_emp16
set C7_MAX_CH=50
set C7_CHAPTERS=50
set C7_WORDS=88000
set C7_EXTEND=1
set C7_DIRECTIVE_PACKS=runs/next_book/DIRECTIVE_PACKS.json
npx vite-node -c vitest.config.ts src/c7/c7-runner.ts > runs\next_book_emp16\run.log 2>&1
