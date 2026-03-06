---
name: qa_auditor
description: Blog 專案 QA 審計技能，執行 4D 測試協議，確保 Astro 靜態站建置品質。
---

# QA Auditor (Blog Edition)

改編自 PAIOP QA Auditor v2.0，針對 Astro 靜態部落格設計。

## 🎯 4D 審計框架

### D1: 邏輯測試 (Build & Type Check)
- `npm run check` — TypeScript 型別無錯誤
- `npm run build` — 建置成功無報錯
- `dist/` 目錄正確產出
- `dist/pagefind/pagefind.js` — 搜尋索引已生成

### D2: 狀態驗證 (Content & Front Matter)
- 所有文章 `pubDate` 含時區 `+08:00`
- `draft: true` 的文章未出現在 `dist/blog/` 內
- 新文章 slug 符合命名慣例 `YYYY/YYYY-XXXXXX/`

### D3: 冪等性 (Idempotency)
- 連續兩次 `npm run build`，HTML 產出的 MD5 一致
- 無隨機產出（如時間戳注入 HTML 等）

### D4: 部署驗證 (Deployment Artifacts)
- `dist/sitemap-index.xml` 或 `dist/sitemap.xml` 存在
- `dist/index.html` 存在
- 研究頁 `/research/` 路徑已從 sitemap 排除

## 🛠️ 執行方式

```bash
bash scripts/qa-check.sh
```

結果寫入 `.qa_status`，內容為：
- `PASS: 全部 N 項通過`
- `FAIL: N 項未通過，請修正後重新執行`

**`.qa_status` 顯示 PASS 才算任務完成。**

## 🚨 Zero-Trust 守則

1. 任何功能開發、文章新增、樣式修改後都必須跑 QA
2. `npm run build` 失敗時，禁止部署
3. Front matter 格式錯誤，禁止 commit
