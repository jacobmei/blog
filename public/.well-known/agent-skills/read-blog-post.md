---
name: read-blog-post
type: http
version: 1.0.0
---

# Read Blog Post as Markdown

抓取單篇文章的 markdown 原始內容（含 frontmatter）。

## Usage

任一文章 URL（格式 `/blog/YYYY/MMDD-shortcode/`）附加 `.md` 後綴即可取得 markdown 原檔。

```
GET https://jacobmei.com/blog/2026/0415-abc123.md
Accept: text/markdown
```

或直接用原 HTML URL + `Accept: text/markdown` header，Cloudflare Worker 會做內容協商回傳 markdown。

## Response

回傳 `text/markdown; charset=utf-8`，內容結構：

```yaml
---
title: 文章標題
description: 摘要
pubDate: 2026-04-15 10:00+08:00
canonical: https://jacobmei.com/blog/2026/0415-abc123/
license: CC-BY-4.0
---

# 文章標題

（正文 markdown）
```

## Notes

- 所有文章遵循繁體中文（zh-TW）
- `pubDate` 皆含 `+08:00` 時區標註
- 圖片資源位於 `/images/posts/`
