# Mashbean Blog

Astro 5 + TypeScript + Tailwind 的內容型部落格。
目標是維持「內容優先、可維護、可逐步擴充互動」的架構，並持續部署到 GitHub Pages。

## 1) 快速開始

```bash
npm install
npm run dev
```

- 開發網址：`http://localhost:4321`

常用指令：

```bash
npm run dev          # 本機開發
npm run check        # Astro 型別與內容檢查
npm run build        # 產生正式站點 (含 postbuild 搜尋索引)
npm run preview      # 預覽 build 結果
npm run format       # 格式化
npm run lint         # check + format:check
```

## 2) 目前資料夾結構（整理後）

```text
.
├─ .github/workflows/       # GitHub Pages CI/CD
├─ docs/                    # 設計/營運文件（保留可執行的規格）
├─ public/                  # 靜態資源（favicon、OG、文章圖片）
├─ reports/                 # 遷移報告與對照表
├─ scripts/                 # 可重複使用的維運腳本
├─ src/
│  ├─ components/           # UI 元件
│  ├─ content/blog/         # 文章來源（唯一 source of truth）
│  ├─ data/                 # 靜態資料（社群、年份敘述等）
│  ├─ layouts/              # 版型
│  ├─ pages/                # 路由頁面
│  ├─ styles/               # 全域樣式與 token
│  └─ utils/                # URL/SEO/標籤/時間等邏輯
├─ astro.config.ts
├─ tailwind.config.mjs
├─ tsconfig.json
└─ package.json
```

整理原則：
- `src/content/blog/` 是文章唯一來源。
- `dist/`、`node_modules/`、暫存與產物都不納入版本控制。
- 測試/實驗頁不放在 `public/` 根目錄，避免誤上線。

## 3) 內容與發文

新增文章：在 `src/content/blog/` 建立 `.md`。

最小 frontmatter：

```yaml
---
title: "文章標題"
description: "摘要"
pubDate: "2026-02-24T10:00:00+08:00"
tags: ["公共網路"]
---
```

可用欄位 schema 在 `src/content.config.ts`。

## 4) 路由與 SEO

- 首頁：`/`
- 文章列表（年份收合）：`/blog/`
- 標籤列表（主題收合）：`/tags/`
- 搜尋：`/search/`
- 文章：`/blog/{year}/{monthday}-{code}/`

SEO/機器可讀入口：
- `sitemap-index.xml`
- `rss.xml`
- `llms.txt`
- `content-index.json`

## 5) 部署（GitHub Pages）

部署 workflow：`/Users/mashbean/Codex/.github/workflows/deploy.yml`

必要條件：
- GitHub Pages Source 設定為 `GitHub Actions`
- push 到 `main` 觸發部署

環境變數（GitHub Actions Variables）：
- `PUBLIC_PLAUSIBLE_DOMAIN`（例如 `mashbean.net`）
- `PUBLIC_PLAUSIBLE_SCRIPT_SRC`（例如 `https://plausible.io/js/script.js`）
- `PUBLIC_SIGNER_ENS_NAME`（若啟用文章簽名驗證）

## 6) 遷移與維運腳本

- Jekyll 遷移：`npm run migrate:posts`
- 文章簽名：`npm run sign:posts`
- 最新文章封面（動物系 prompt + 自動壓縮）：`npm run cover:latest`
- 圖像批次（OpenAI）：`npm run images:batch:openai`

發布新文章建議流程：
1. 新增 `src/content/blog/*.md`
2. 執行 `npm run cover:latest`（會自動套用目前封面 prompt、生成封面、裁切為 1200x630、壓縮為 JPG 並回寫 `cover`）
3. 執行 `npm run sign:posts -- --file <你的檔名.md>`
4. 執行 `npm run check`

說明：`scripts/` 僅保留可重複執行、目前流程仍會用到的工具；一次性輸出報表與快取已排除追蹤。

## 7) 這次架構清理做了什麼

- 移除舊版未使用 `assets/`（Jekyll 殘留）
- 移除 `public/` 未使用實驗頁
- 移除 Python 快取與圖片批次報表輸出
- 更新 `.gitignore`，避免產物再次被追蹤
- 重寫 README，聚焦「可 fork、可維護、可協作」

## 8) 協作建議（你 + Codex）

- 先 `npm run check` 再 commit
- 針對 UI 變更，附 `before/after` 截圖
- PR 描述固定包含：
  - 影響頁面
  - 資料模型是否變更
  - SEO/路由是否受影響
  - 驗證步驟
