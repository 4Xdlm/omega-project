@echo off
cd /d C:\Users\elric\omega-project\packages\book-factory
echo PULL_START %DATE% %TIME% >> runs\fwb_driver.log
ollama pull mistral-small3.2:24b >> runs\fwb_driver.log 2>&1
echo PULLED mistral-small3.2 >> runs\fwb_driver.log
ollama pull qwen3:30b >> runs\fwb_driver.log 2>&1
echo PULLED qwen3:30b >> runs\fwb_driver.log
ollama pull deepseek-r1:32b >> runs\fwb_driver.log 2>&1
echo PULLED deepseek-r1 >> runs\fwb_driver.log
ollama pull llama3.3:70b >> runs\fwb_driver.log 2>&1
echo PULLED llama3.3 >> runs\fwb_driver.log
echo ALL_PULLS_DONE %DATE% %TIME% >> runs\fwb_driver.log

set C7_MODE=full
set C7_CHAPTERS=50
set C7_WORDS=88000
set C7_EXTEND=1
set C7_DIRECTIVE_PACKS=runs/next_book/DIRECTIVE_PACKS.json
set C7_PLAN_LOCK=runs/next_book/PLAN_LOCK.json
set C7_V2=1
set C7_MAX_CH=5

for %%M in ("mistral-small3.2:24b=fwb_mistral32" "mistral-small:24b=fwb_mistralsmall" "qwen3:30b=fwb_qwen330" "qwen3:32b=fwb_qwen3" "deepseek-r1:32b=fwb_deepseek" "gemma4:31b=fwb_gemma4" "llama3.3:70b=fwb_llama33") do (
  for /f "tokens=1,2 delims==" %%A in (%%M) do (
    set "C7_MODEL=%%A"
    set "C7_OUT=runs/%%B"
    echo BENCH_START %%A %DATE% %TIME% >> runs\fwb_driver.log
    call npx vite-node -c vitest.config.ts src/c7/c7-runner.ts >> runs\fwb_driver.log 2>&1
    echo BENCH_DONE %%A %DATE% %TIME% >> runs\fwb_driver.log
  )
)
echo ALL_MODELS_DONE %DATE% %TIME% >> runs\fwb_driver.log
