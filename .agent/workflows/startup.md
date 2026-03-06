---
description: 初始化 Blog 對話上下文
---

# Blog Startup Workflow

新對話開始時執行，快速同步專案現況。

## 1. 讀取架構地圖

```
讀取 docs/ARCHITECTURE_MAP.md
```

確認目錄結構、部署流程、關鍵路徑。

## 2. 確認 Git 狀態

```bash
git status && git log --oneline -5
```

了解目前有無未提交的改動、最近五筆 commit 做了什麼。

## 3. 確認建置健康

```bash
npm run check --silent 2>&1 | tail -5
```

TypeScript 是否有潛在錯誤。

## 4. 輸出摘要並提問

整理後輸出：
- 目前分支與未提交的變更
- 最近 commit 方向
- TypeScript 狀態

然後主動詢問梅大：
**「今日要進行什麼任務？是否需要先調用 `expert_prompter` 鎖定最佳 Prompt？」**
