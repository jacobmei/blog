# Blog Architecture Map

> SSOT：此文件是 Blog 專案的架構真理來源，修改架構時必須同步更新。

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | Astro 5 (靜態輸出) |
| 樣式 | Tailwind CSS v4 (Vite plugin) |
| 語言 | TypeScript 5 |
| 搜尋 | Pagefind (postbuild 自動產生) |
| 部署 | GitHub Pages (CI/CD: `.github/workflows/deploy.yml`) |
| 網域 | jacobmei.com |

## 目錄結構

```
Blog/
├── src/
│   ├── content/
│   │   └── blog/          ← 文章 Markdown，assets/ 放圖片
│   ├── pages/
│   │   ├── index.astro    ← 首頁
│   │   ├── blog/          ← 文章列表 & [slug] 動態路由
│   │   ├── research/      ← 研究區（不進 sitemap）
│   │   ├── tags/          ← 標籤頁
│   │   ├── search.astro   ← Pagefind 搜尋頁
│   │   ├── rss.xml.ts     ← RSS feed
│   │   └── llms.txt.ts    ← LLM 爬蟲索引
│   ├── layouts/           ← 頁面佈局模板
│   ├── components/        ← UI 元件
│   ├── utils/             ← 工具函式（date, blog, paths...）
│   ├── data/              ← 靜態資料（tagCatalog, authorBio...）
│   └── site.config.ts     ← 全站設定（siteName, description...）
├── docs/                  ← 專案文件（此檔案所在）
├── scripts/               ← 工具腳本（QA、遷移、圖片生成...）
│   └── qa-check.sh        ← QA 審計腳本
├── .agent/
│   ├── skills/qa_auditor/ ← QA Auditor SKILL 定義
│   └── workflows/startup/ ← Startup workflow
├── .github/workflows/     ← CI/CD
│   ├── deploy.yml         ← 主站部署 (push to main → jacobmei.com)
│   └── deploy.project-site.yml
├── astro.config.ts        ← Astro 設定（sitemap filter、markdown plugin）
├── CLAUDE.md              ← Claude Code 指令與工程規則
└── dist/                  ← 建置產出（gitignore）
```

## 部署流程

```
git push main
    ↓
GitHub Actions (deploy.yml)
    ↓
npm install → npm run build → pagefind (postbuild)
    ↓
upload artifact → deploy to GitHub Pages
    ↓
jacobmei.com (HTTPS)
```

**觸發條件**：push 到 `main` 分支，或手動 workflow_dispatch。

## 文章路由規則

- URL 格式：`/blog/YYYY/YYYY-XXXXXX/`（6碼 nanoid slug）
- Sitemap 只收錄符合此格式的文章頁
- `/research/` 全部排除 sitemap

## 關鍵環境變數（CI/CD）

| 變數 | 值 |
|------|-----|
| `SITE_URL` | `https://jacobmei.com` |
| `BASE_PATH` | `/` |
| `PUBLIC_TIP_ENS_NAME` | `jacobmei.eth` |
| `PUBLIC_WEB3_CHAIN_ID` | `1` (Ethereum mainnet) |
| `PUBLIC_PLAUSIBLE_DOMAIN` | GitHub Repo vars |

## 已知注意事項

- `pubDate` 必須含 `+08:00` 時區，否則 CI 誤判未來日期被過濾
- `draft: true` 的文章不會出現在 build 產出
- Pagefind 索引在 `postbuild` 自動跑，build 完才有搜尋功能
