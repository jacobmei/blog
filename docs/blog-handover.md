# Blog 重構交接文件

更新日期：2026-02-22

## 1) 本次重構目標

將專案收斂為以 Astro 為唯一正式站點來源，移除 Jekyll 舊站與匯入中繼資料，降低維護成本與誤用風險。

## 2) 重構後的核心目錄（應維持）

- `src/`：站點程式碼與內容來源
- `src/content/blog/`：唯一文章來源（正式）
- `public/`：靜態資產
- `scripts/`：匯入、轉換、建置輔助腳本
- `docs/`：技術文件與交接文檔
- `package.json`：專案腳本與依賴

## 3) 本次已刪除項目

以下內容已確認為舊架構或冗餘資料：

- `_posts/`（Jekyll 舊文章來源）
- `_legacy_posts_backup/`（舊備份，與現行內容重複）
- `_includes/`（Jekyll include 模板）
- `_data/`（Jekyll data）
- `matters_export/`（匯入中繼產物）
- `snapshot_export/`（匯入中繼產物）
- `_config.yml`（Jekyll 設定）
- `index.html`、`posts.md`、`about.md`、`tags.md`、`subscribe.md`（Jekyll 路由檔）

## 4) 現行架構原則

- 單一內容來源：只使用 `src/content/blog/*.md`
- 單一路由系統：只使用 `src/pages/**/*.astro`
- 舊站資料不再混用，避免兩套來源造成內容分岔

## 5) 日常維運流程

### 本機開發

```bash
npm run dev
```

### 型別/內容檢查

```bash
npm run check
```

### 正式建置

```bash
npm run build
```

## 6) 發文與內容維護

1. 新文章直接新增至 `src/content/blog/`。
2. frontmatter 依現有 Astro 格式（`title`、`pubDate`、`tags`、`category` 等）。
3. 文章封面請放在 `public/images/...`，並於 frontmatter 使用相對路徑。

## 7) 歷史資料回復方式

若需取回本次刪除的舊檔案，可透過 Git 歷史回復：

```bash
git log -- <path>
git checkout <commit> -- <path>
```

建議僅在「資料稽核」或「歷史比對」時回復，不要再次作為正式來源。

## 8) 交接重點（給下一位維護者）

- 先看 `src/content/blog/` 與 `src/pages/`，不要從根目錄舊習慣找 `_posts`。
- 匯入腳本仍保留於 `scripts/`，但輸出資料夾屬中繼產物，不應進版控。
- 任何新功能若涉及內容來源，請遵守「單一來源」原則，避免再引入雙軌架構。
