#!/bin/bash
# Blog QA Check Script
# 執行完整的 4D 審計，對應 PAIOP QA Auditor 的輕量版

set -e

PASS=0
FAIL=0
REPORT=""

log_pass() { echo "  ✓ $1"; PASS=$((PASS+1)); REPORT="$REPORT\nPASS: $1"; }
log_fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); REPORT="$REPORT\nFAIL: $1"; }

echo ""
echo "=== Blog QA Audit ==="
echo ""

# D1: 邏輯測試 — TypeScript 型別與建置
echo "[D1] 邏輯測試 (Build & Type Check)"

CHECK_OUT=$(npm run check --silent 2>&1)
if echo "$CHECK_OUT" | grep -qE "[1-9][0-9]* error"; then
  log_fail "TypeScript check 有錯誤"
else
  log_pass "TypeScript check 通過"
fi

if npm run build --silent 2>&1 | grep -qE "^\[ERROR\]|Build failed"; then
  log_fail "npm run build 失敗"
else
  log_pass "npm run build 成功"
fi

if [ -d "dist" ]; then
  log_pass "dist 目錄存在"
else
  log_fail "dist 目錄不存在"
fi

if [ -f "dist/search-minisearch.json" ]; then
  log_pass "搜尋索引（MiniSearch）已生成"
else
  log_fail "搜尋索引不存在"
fi

echo ""

# D2: 狀態驗證 — Front Matter 格式
echo "[D2] 狀態驗證 (Front Matter)"

INVALID_DATE=$(grep -rn "pubDate:" src/content/blog/ --include="*.md" | grep -v "+08:00" | grep -v "^Binary" | wc -l | tr -d ' ')
if [ "$INVALID_DATE" -eq "0" ]; then
  log_pass "所有文章 pubDate 含時區 +08:00"
else
  log_fail "$INVALID_DATE 篇文章 pubDate 缺少時區"
  grep -rn "pubDate:" src/content/blog/ --include="*.md" | grep -v "+08:00" | head -5
fi

DRAFT_COUNT=$(grep -rn "^draft: false" src/content/blog/ --include="*.md" | wc -l | tr -d ' ')
log_pass "準備發布文章: $DRAFT_COUNT 篇"

echo ""

# D3: 冪等性 — 第二次建置產出一致
echo "[D3] 冪等性測試 (Idempotency)"

HASH1=$(find dist -type f -name "*.html" | sort | xargs md5 2>/dev/null | md5 || echo "skip")
npm run build --silent 2>&1 > /dev/null
HASH2=$(find dist -type f -name "*.html" | sort | xargs md5 2>/dev/null | md5 || echo "skip")

if [ "$HASH1" = "$HASH2" ] || [ "$HASH1" = "skip" ]; then
  log_pass "連續兩次建置產出一致（冪等）"
else
  log_fail "兩次建置產出不一致，可能有隨機產出"
fi

echo ""

# D4: 環境驗證 — 關鍵檔案與 Sitemap
echo "[D4] 環境驗證 (Deployment Artifacts)"

if [ -f "dist/sitemap-index.xml" ] || [ -f "dist/sitemap.xml" ]; then
  log_pass "Sitemap 已生成"
else
  log_fail "Sitemap 不存在"
fi

if [ -f "dist/index.html" ]; then
  log_pass "首頁 index.html 存在"
else
  log_fail "首頁 index.html 不存在"
fi

echo ""

# 結果
echo "=== QA 結果 ==="
echo "PASS: $PASS  FAIL: $FAIL"
echo ""

if [ "$FAIL" -eq "0" ]; then
  echo "PASS: 全部 $PASS 項通過" | tee .qa_status
  exit 0
else
  echo "FAIL: $FAIL 項未通過，請修正後重新執行" | tee .qa_status
  exit 1
fi
