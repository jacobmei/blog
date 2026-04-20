---
name: list-posts
type: http
version: 1.0.0
---

# List All Posts

取得所有文章的結構化索引，適合 AI 代理快速掃描站點內容與挑選目標文章。

## Usage

```
GET https://jacobmei.com/content-index.json
Accept: application/json
```

## Response

JSON 陣列，每篇文章包含：

```json
{
  "url": "https://jacobmei.com/blog/2026/0415-abc123/",
  "markdownUrl": "https://jacobmei.com/blog/2026/0415-abc123.md",
  "title": "文章標題",
  "description": "摘要",
  "pubDate": "2026-04-15T10:00:00+08:00",
  "topics": ["fintech", "web3"],
  "excerpt": "開頭 200 字"
}
```

## Pagination

目前為單檔全量索引（非分頁）。若未來超過 5000 篇將切分。

## Complementary Resources

- `https://jacobmei.com/llms.txt` — 人類可讀的 bullet 式導覽
- `https://jacobmei.com/rss.xml` — 訂閱用 RSS feed
- `https://jacobmei.com/sitemap-index.xml` — 搜尋引擎 sitemap
