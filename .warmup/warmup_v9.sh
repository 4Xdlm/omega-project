#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo " OMEGA TITANIUM — WARM-UP v9.0 START"
echo " Date: $(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)"
echo "═══════════════════════════════════════════════════════════════"

# BLOC 1 — REDIRECTIONS (>, >>, 2>&1, |)
echo ""
echo "### BLOC 1 — REDIRECTIONS ###"
echo "test" > .warmup/redirect_test.txt
echo "append" >> .warmup/redirect_test.txt
echo "test" > .warmup/output.log 2>&1
echo "✓ Basic redirections OK"

# BLOC 2 — FIND
echo ""
echo "### BLOC 2 — FIND ###"
find . -name "*.md" -type f | head -5
find . -name "*.ts" -type f -not -path "*/node_modules/*" | head -5
find . -name "*.test.ts" -type f | wc -l
find packages/ -name "*.ts" -type f | head -10
find . -type d -name "test" | head -5
find . -maxdepth 2 -name "*.json" -type f | head -5
echo "✓ Find commands OK"

# BLOC 3 — GREP
echo ""
echo "### BLOC 3 — GREP ###"
grep "test" .warmup/redirect_test.txt
grep -n "test" .warmup/redirect_test.txt
grep -c "test" .warmup/redirect_test.txt
grep -A 1 -B 1 "test" .warmup/redirect_test.txt
grep -v "test" .warmup/redirect_test.txt
grep -E "test|append" .warmup/redirect_test.txt
grep -q "test" .warmup/redirect_test.txt && echo "found"
echo "✓ Grep commands OK"

# BLOC 4 — WC
echo ""
echo "### BLOC 4 — WC ###"
wc -l .warmup/redirect_test.txt
wc -w .warmup/redirect_test.txt
wc -c .warmup/redirect_test.txt
wc .warmup/redirect_test.txt
cat .warmup/redirect_test.txt | wc -l
echo "✓ WC commands OK"

# BLOC 5 — DIFF
echo ""
echo "### BLOC 5 — DIFF ###"
echo "line1" > .warmup/diff1.txt
echo "line2" > .warmup/diff2.txt
diff .warmup/diff1.txt .warmup/diff2.txt || true
diff -q .warmup/diff1.txt .warmup/diff2.txt || true
echo "✓ Diff commands OK"

# BLOC 6 — CAT
echo ""
echo "### BLOC 6 — CAT ###"
cat .warmup/redirect_test.txt
cat .warmup/diff1.txt .warmup/diff2.txt
cat -n .warmup/redirect_test.txt
cat .warmup/diff1.txt .warmup/diff2.txt > .warmup/combined.txt
cat << 'EOF' > .warmup/heredoc.txt
line1
line2
line3
EOF
echo "✓ Cat commands OK"

# BLOC 7 — HEAD/TAIL
echo ""
echo "### BLOC 7 — HEAD/TAIL ###"
head .warmup/redirect_test.txt
head -n 1 .warmup/redirect_test.txt
tail .warmup/redirect_test.txt
tail -n 1 .warmup/redirect_test.txt
echo "✓ Head/Tail commands OK"

# BLOC 8 — SORT/UNIQ
echo ""
echo "### BLOC 8 — SORT/UNIQ ###"
sort .warmup/redirect_test.txt
sort -r .warmup/redirect_test.txt
sort -u .warmup/redirect_test.txt
uniq .warmup/redirect_test.txt
cat .warmup/redirect_test.txt | sort | uniq
echo "✓ Sort/Uniq commands OK"

# BLOC 9 — CUT/AWK/SED
echo ""
echo "### BLOC 9 — CUT/AWK/SED ###"
echo "a:b:c" | cut -d: -f1
echo "abcdef" | cut -c1-3
echo "a b c" | awk '{print $1}'
echo "a:b:c" | awk -F: '{print $2}'
echo "hello world" | sed 's/world/universe/'
cp .warmup/redirect_test.txt .warmup/sed_test.txt
sed -i 's/test/TEST/' .warmup/sed_test.txt
sed '1d' .warmup/redirect_test.txt
echo "✓ Cut/Awk/Sed commands OK"

# BLOC 10 — TR/XARGS
echo ""
echo "### BLOC 10 — TR/XARGS ###"
echo "hello" | tr 'a-z' 'A-Z'
echo "hello123" | tr -d '0-9'
echo "hellooo" | tr -s 'o'
echo "file1 file2" | xargs echo
find .warmup -name "*.txt" | xargs wc -l
echo "✓ Tr/Xargs commands OK"

# BLOC 11 — NPM SCRIPTS (skip heavy ones for warmup)
echo ""
echo "### BLOC 11 — NPM SCRIPTS ###"
npm ls --depth=0 2>/dev/null | head -10 || echo "npm ls skipped"
echo "✓ NPM commands OK"

# BLOC 12 — NODE DIRECT
echo ""
echo "### BLOC 12 — NODE DIRECT ###"
node --version
node -e "console.log('node works')"
node -p "1+1"
echo "console.log('hello')" > .warmup/test.js && node .warmup/test.js
node -e "console.log(JSON.stringify({test:1}))"
echo "✓ Node commands OK"

# BLOC 13 — MKDIR/TOUCH/CP/MV AVANCÉS
echo ""
echo "### BLOC 13 — MKDIR/TOUCH/CP/MV ###"
mkdir -p .warmup/deep/nested/path
mkdir -p .warmup/dir1 .warmup/dir2 .warmup/dir3
touch .warmup/file1.txt .warmup/file2.txt .warmup/file3.txt
cp .warmup/redirect_test.txt .warmup/copy_test.txt
cp -r .warmup/dir1 .warmup/dir1_copy
mv .warmup/file3.txt .warmup/file3_renamed.txt
mv .warmup/file3_renamed.txt .warmup/dir1/
echo "✓ Mkdir/Touch/Cp/Mv commands OK"

# BLOC 14 — LS AVANCÉS
echo ""
echo "### BLOC 14 — LS ###"
ls -la .warmup/ | head -10
ls .warmup/*.txt | head -5
ls -lt .warmup/ | head -5
echo "✓ Ls commands OK"

# BLOC 15 — STAT/FILE/DU
echo ""
echo "### BLOC 15 — STAT/FILE/DU ###"
stat .warmup/redirect_test.txt 2>/dev/null || ls -l .warmup/redirect_test.txt
file .warmup/redirect_test.txt
du -sh .warmup/
echo "✓ Stat/File/Du commands OK"

# BLOC 16 — TAR/ZIP
echo ""
echo "### BLOC 16 — TAR/ZIP ###"
tar -cvf .warmup/test.tar .warmup/dir1/
tar -czvf .warmup/test.tar.gz .warmup/dir1/
tar -tvf .warmup/test.tar
mkdir -p .warmup/extract && tar -xzf .warmup/test.tar.gz -C .warmup/extract
zip -r .warmup/test.zip .warmup/redirect_test.txt 2>/dev/null || echo "zip command executed"
unzip -l .warmup/test.zip 2>/dev/null || echo "unzip list executed"
echo "✓ Tar/Zip commands OK"

# BLOC 17 — HASH
echo ""
echo "### BLOC 17 — HASH ###"
sha256sum .warmup/redirect_test.txt
sha256sum .warmup/*.txt 2>/dev/null | head -5
sha256sum .warmup/redirect_test.txt > .warmup/checksums.sha256
echo "✓ Hash commands OK"

# BLOC 18 — GIT
echo ""
echo "### BLOC 18 — GIT ###"
git log --oneline -5
git log --format="%h %ad %s" --date=short -3
git diff --cached --name-only || true
git ls-files | head -10
git rev-list --count HEAD
git branch -vv | head -3
echo "✓ Git commands OK"

# BLOC 19 — DATE/TIME
echo ""
echo "### BLOC 19 — DATE/TIME ###"
date
date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S
date +%Y%m%d_%H%M%S
date +%s
echo "✓ Date/Time commands OK"

# BLOC 20 — VARIABLES ET SUBSTITUTIONS
echo ""
echo "### BLOC 20 — VARIABLES ###"
MYVAR="test" && echo $MYVAR
TIMESTAMP=$(date +%Y%m%d_%H%M%S) && echo "TIMESTAMP=$TIMESTAMP"
COMMIT=$(git rev-parse --short HEAD) && echo "COMMIT=$COMMIT"
TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "no-tag") && echo "TAG=$TAG"
LINECOUNT=$(wc -l < .warmup/redirect_test.txt) && echo "Lines: $LINECOUNT"
FILECOUNT=$(find .warmup -name "*.txt" | wc -l) && echo "Files: $FILECOUNT"
echo "✓ Variables commands OK"

# BLOC 21 — PIPES COMPLEXES
echo ""
echo "### BLOC 21 — PIPES ###"
cat .warmup/redirect_test.txt | grep test || true
cat .warmup/redirect_test.txt | grep test | wc -l || echo "0"
git log --oneline | head -5
echo "test" | tee .warmup/tee_test.txt
echo "✓ Pipes commands OK"

# BLOC 22 — CONDITIONS
echo ""
echo "### BLOC 22 — CONDITIONS ###"
test -f .warmup/redirect_test.txt && echo "exists"
test -d .warmup && echo "dir exists"
[ -f .warmup/redirect_test.txt ] && echo "exists with bracket"
if [ -f .warmup/redirect_test.txt ]; then echo "found"; fi
cat .warmup/nonexistent.txt 2>/dev/null || echo "file not found, OK"
echo "✓ Conditions commands OK"

# BLOC 23 — PROCESS
echo ""
echo "### BLOC 23 — PROCESS ###"
which node
which npm
type node
echo "✓ Process commands OK"

# BLOC 24 — ENV
echo ""
echo "### BLOC 24 — ENV ###"
echo $HOME
echo $PWD
echo "✓ Env commands OK"

# BLOC 25 — TRUE/FALSE
echo ""
echo "### BLOC 25 — TRUE/FALSE ###"
true && echo "true works"
false || echo "false recovered"
echo "✓ True/False commands OK"

# BLOC 26 — BASENAME/DIRNAME
echo ""
echo "### BLOC 26 — BASENAME/DIRNAME ###"
basename /path/to/file.txt
dirname /path/to/file.txt
echo "✓ Basename/Dirname commands OK"

# BLOC 27 — PRINTF/ECHO
echo ""
echo "### BLOC 27 — PRINTF/ECHO ###"
echo -e "line1\nline2"
echo -n "no newline: " && echo "continued"
printf "Name: %s, Count: %d\n" "test" 42
echo "✓ Printf/Echo commands OK"

# BLOC 28 — SEQ
echo ""
echo "### BLOC 28 — SEQ ###"
seq 1 5
seq 5 -1 1
echo "✓ Seq commands OK"

# BLOC 29 — CLEANUP INFO
echo ""
echo "### BLOC 29 — CLEANUP INFO ###"
ls -la .warmup/ | head -15
find .warmup -type f | wc -l
echo "✓ Cleanup info OK"

# BLOC 30 — FINAL
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " WARM-UP v9.0 COMPLET — TOUTES COMMANDES VALIDÉES"
echo " Date fin: $(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)"
echo "═══════════════════════════════════════════════════════════════"
